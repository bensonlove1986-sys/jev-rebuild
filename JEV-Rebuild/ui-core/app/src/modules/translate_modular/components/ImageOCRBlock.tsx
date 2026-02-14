// 图片 OCR 块组件
import React, { useState, useEffect } from 'react';
import { useChatStore } from '@/modules/chat_modular/store/chatStore';
import { sanitizeMessageId } from '@/core/utils/idSanitizer';
import { uiScheduler, SchedulerEventType } from '@/core/scheduler/ui_scheduler_core';
import { dispatch } from '@/core/scheduler/system_scheduler';

// 去重存储
const processedOcrResults = new Map<string, { timestamp: number, data: any }>();
const OCR_PROCESSED_TTL = 10 * 60 * 1000; // 10分钟TTL
import { JEV_RUNTIME } from '@/core/jev_runtime_config';
import { API_BASE_URL } from '@/api/apiClient';
import { safeFetch } from '@/main';
import './ImageOCRBlock.css';

// 新增 cleanMessageId 函数
function cleanMessageId(id: string) {
  const s = String(id ?? "");
  const m = s.match(/(MM[0-9a-f]+)/i);
  const clean = m ? m[1] : s;
  console.log("[OCR_CLEAN_ID_FIXED]", clean);
  return clean;
}

interface ImageOCRBlockProps {
  messageId: string;
  chatId: string;
  mediaPath: string;
  ocr?: {
    text: string;
    provider: string;
    confidence: number;
    ts: number;
  };
  onOCRUpdate: (result: any) => void;
}

const ImageOCRBlock: React.FC<ImageOCRBlockProps> = ({
  messageId,
  chatId,
  mediaPath,
  ocr,
  onOCRUpdate,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'processing' | 'ready'>('idle');
  const [ocrId, setOcrId] = useState<string | null>(null);
  
  // 从 chatStore 读取 OCR 结果，确保状态变化时重新渲染
  const ocrFromStore = useChatStore(state => state.ocrResults?.[messageId]);
  const currentOcr = ocrFromStore || ocr;

  // 轮询 OCR 状态
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (status === 'processing' && ocrId) {
      interval = setInterval(async () => {
        try {
          // 清洗 message_id
          const safeId = cleanMessageId(messageId);
          console.log('[OCR_SAFE_URL]', `/api/ocr/result?message_id=${safeId}`);
          const response = await safeFetch(`/api/ocr/result?message_id=${encodeURIComponent(safeId)}`);
          if (!response.ok) {
            throw new Error(`OCR result API error: ${response.status}`);
          }

          const data = await response.json();
          if (data.ok) {
            const ocrResult = {
              text: data.ocr_text,
              provider: 'google_vision',
              confidence: 0.95, // 使用默认置信度
              ts: Date.now(),
              status: 'completed' // 添加 status 字段，触发 DeepSeek 分析
            };
            
            // 去重检查
            const dedupeKey = messageId;
            const now = Date.now();
            
            // 清理过期的处理记录
            processedOcrResults.forEach((value, key) => {
              if (now - value.timestamp > OCR_PROCESSED_TTL) {
                processedOcrResults.delete(key);
              }
            });
            
            // 检查是否已处理过
            if (processedOcrResults.has(dedupeKey)) {
              console.log('[AUTO_ENGINE_DEDUPE_SKIP]', {
                chatId: messageId,
                inboundId: messageId,
                reason: 'duplicate_ocr_result'
              });
              if (interval) clearInterval(interval);
              return;
            }
            
            // 标记为已处理
            processedOcrResults.set(dedupeKey, { timestamp: now, data: ocrResult });
            
            onOCRUpdate(ocrResult);
            
            // Dispatch-First: 先通过 system_scheduler 处理 OCR 结果
            dispatch({
              type: "OCR_RESULT_RECEIVED",
              payload: {
                message_id: messageId,
                chat_id: chatId,
                result: ocrResult,
                image_url: mediaPath
              }
            });
            
            // 通过 Scheduler 发送 OCR 结果事件
          uiScheduler.receiveEvent({
            type: SchedulerEventType.OCR_RESULT,
            data: {
              ...ocrResult,
              image_url: mediaPath,
              direction: 'inbound' // 添加 direction 字段，确保正确的方向标识
            },
            messageId: messageId
          });
            
            console.log('[OCR_RESULT_APPLIED]', messageId);
            // 记录 Auto Engine 状态
            console.log('[AUTO_ENGINE_CHECK_AT_OCR]');
            setStatus('ready');
            setIsExpanded(true);
            if (interval) clearInterval(interval);
          }
        } catch (error) {
          console.error('Polling OCR result failed:', error);
          setStatus('idle');
          setError('识别失败，请重试');
          if (interval) clearInterval(interval);
        }
      }, 2000); // 每 2 秒轮询一次
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [status, ocrId, messageId, onOCRUpdate]);

  // 处理 OCR 识别
  const handleOCR = async () => {
    if (!mediaPath || isLoading) return;

    setIsLoading(true);
    setError(null);
    setStatus('processing');
    try {
      // 清洗 message_id
      const safeId = cleanMessageId(messageId);
      console.log('[OCR_TRIGGER] Starting OCR for message:', safeId);
      
      // 从 chatStore 中获取完整的 message 对象
      const chatStore = useChatStore.getState();
      let message = null;
      
      // 遍历所有聊天，查找包含当前 messageId 的消息
      for (const [chatIdKey, messages] of Object.entries(chatStore.messages)) {
        const foundMessage = messages.find((msg: any) => msg.id === messageId || msg.message_id === messageId);
        if (foundMessage) {
          message = foundMessage;
          break;
        }
      }
      
      // 按优先级从 message 对象中读取 chatId
      const chatId = message?.chatId || message?.chat_id || message?.from;
      
      // 发送前强制验证 chatId
      if (!chatId) {
        console.error('[OCR_ABORT] chatId missing');
        setError('Chat ID missing');
        setStatus('idle');
        setIsLoading(false);
        return;
      }
      
      console.log('[OCR_TRIGGER] Using chatId:', chatId);
      
      console.log('[OCR_SAFE_URL]', '/api/ocr/run');
      // 构建绝对路径的图片 URL
      let absoluteImageUrl;
      if (mediaPath.includes('/api/media/r2/')) {
        // 使用远程 Worker URL 构建媒体路径
        absoluteImageUrl = JEV_RUNTIME.REMOTE_API_BASE + mediaPath.replace('/api', '');
      } else {
        // 移除可能的重复 /api 前缀
        const cleanMediaPath = mediaPath.startsWith('/api') ? mediaPath : '/' + mediaPath;
        absoluteImageUrl = API_BASE_URL + cleanMediaPath;
      }
      console.log('[OCR_ABSOLUTE_URL]', { relative: mediaPath, absolute: absoluteImageUrl });
      
      // 确保使用正确的 snake_case 字段名
      const ocrPayload = {
        chat_id: chatId,
        message_id: safeId,
        image_url: absoluteImageUrl,
        provider: 'google_vision'
      };
      
      console.log('[OCR_PAYLOAD]', ocrPayload);
      
      // 构建完整的 OCR API URL
      const remoteWorkerUrl = 'https://jev-rebuild-worker.bensonlove1986.workers.dev';
      const ocrUrl = remoteWorkerUrl + '/api/ocr/run';
      console.log('[OCR_FETCH_URL]', `\`${ocrUrl}\``);
      
      // 使用标准 fetch 调用，确保包含正确的 Content-Type 头
      const response = await fetch(ocrUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(ocrPayload)
      });

      if (!response.ok) {
        throw new Error(`OCR API error: ${response.status}`);
      }

      const data = await response.json();
      if (data.ok) {
        setOcrId(data.ocr_id);
        console.log('[OCR_TRIGGER] OCR started successfully:', data.ocr_id);
      } else {
        throw new Error(`OCR API returned error: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('OCR failed:', error);
      setError('图片识别失败，请重试');
      setStatus('idle');
    } finally {
      setIsLoading(false);
    }
  };
  
  // 显示 OCR 结果
  if (currentOcr) {
    console.log("[OCR_TEXT_LENGTH]", currentOcr.text?.length);
    if (currentOcr.text.trim().length > 0) {
      return (
        <div className="image-ocr-block">
          <div className="ocr-header">
            <span className="ocr-label">📄 识别结果</span>
            <span className="ocr-provider">{currentOcr.provider}</span>
            <button
              className="expand-button"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? '收起' : '展开'}
            </button>
          </div>
          {isExpanded && (
            <div className="ocr-content">
              <div className="ocr-text">{currentOcr.text}</div>
              <div className="ocr-confidence">置信度: {Math.round((currentOcr.confidence || 0.95) * 100)}%</div>
            </div>
          )}
        </div>
      );
    } else {
      return (
        <div className="image-ocr-block">
          <div className="ocr-header">
            <span className="ocr-label">📄 识别结果</span>
          </div>
          <div className="ocr-content">
            <div className="ocr-text">未识别到文字</div>
            <button
              className="retry-button"
              onClick={handleOCR}
              disabled={isLoading}
            >
              重新识别
            </button>
          </div>
        </div>
      );
    }
  }

  // 显示处理中状态
  if (status === 'processing') {
    return (
      <div className="image-ocr-block processing">
        <div className="ocr-header">
          <span className="ocr-label">🧠 正在识别图片...</span>
        </div>
        <div className="ocr-processing">
          <div className="processing-spinner"></div>
          <div className="processing-text">正在分析图片内容，请稍候...</div>
        </div>
      </div>
    );
  }

  // 显示错误状态
  if (error) {
    return (
      <div className="image-ocr-block error">
        <div className="ocr-header">
          <span className="ocr-label">识别失败</span>
        </div>
        <div className="ocr-error">{error}</div>
        <button
          className="retry-button"
          onClick={handleOCR}
          disabled={isLoading}
        >
          重试
        </button>
      </div>
    );
  }

  // 显示初始状态（未识别）
  return (
    <div className="image-ocr-block">
      <div className="ocr-header">
        <span className="ocr-label">📄 识别结果</span>
      </div>
      <div className="ocr-content">
        <div className="ocr-text">未识别</div>
        <button
          className="retry-button"
          onClick={handleOCR}
          disabled={isLoading}
        >
          开始识别
        </button>
      </div>
    </div>
  );
};

// 添加比较函数，只在 messageId 或 ocr 文本变化时重新渲染
const areEqual = (prev: ImageOCRBlockProps, next: ImageOCRBlockProps) => {
  return prev.messageId === next.messageId && 
         prev.ocr?.text === next.ocr?.text;
};

export default React.memo(ImageOCRBlock, areEqual);