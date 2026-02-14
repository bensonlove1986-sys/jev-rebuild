import React, { useState, useCallback, useEffect, useRef, useMemo, memo } from 'react';
import './MessageBubble.css';
import { safeFetch } from '@/main';
import { API_BASE_URL } from '@/api/apiClient';
import { resolveUrl } from '@/utils/apiClient';
import { buildMediaUrl } from '@/utils/media_url';
import { JEV_RUNTIME } from '@/core/jev_runtime_config';
import { useChatStore } from '../../store/chatStore';
import { uiScheduler, SchedulerEventType } from '@/core/scheduler/ui_scheduler_core';
import TranslationBlock from '@/modules/translate_modular/components/TranslationBlock';
import ImageOCRBlock from '@/modules/translate_modular/components/ImageOCRBlock';
import FileBubble from './FileBubble';
import PdfPreviewBubble from './PdfPreviewBubble';
import ExcelSummaryBubble from './ExcelSummaryBubble';


// 直接在组件中定义 Message 接口，避免导入问题
interface Message {
  id?: string;
  message_id?: string;
  from: string;
  to: string;
  direction: 'inbound' | 'outbound';
  role?: 'customer' | 'assistant' | 'operator';
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  error?: string;
  timestamp: number;
  isGroup: boolean;
  kind?: 'text' | 'image' | 'media';
  type?: 'text' | 'image' | 'media';
  text?: string;
  /** ✅ 唯一图片字段 */
  media_path?: string;
  /** 🔒 只允许 OCR 使用 */
  image_raw_url?: string;
  /** 只读元数据 */
  mime?: string;
  /** 媒体类型 */
  media_kind?: 'image' | 'document' | 'spreadsheet' | 'other';
  senderName?: string;
  ProfileName?: string;
  /** 翻译结果 */
  translation?: {
    type?: 'inbound_auto';
    target: string;
    text: string;
    engine: string;
    mode: 'auto' | 'manual';
    status: 'done' | 'error' | 'loading';
  };
  /** 原文内容（内部可见） */
  originalText?: string;
  /** 发送给客户的内容 */
  translatedText?: string;
  /** 翻译信息 */
  translationInfo?: {
    targetLanguage: string;
    engine: string;
    timestamp: number;
  };


}

interface MessageBubbleProps {
  message: Message;
  onImageDoubleClick?: (imageUrl: string) => void;
  translationMode?: 'auto' | 'manual';
  onTranslationUpdate?: (messageId: string, result: any) => void;
  onOCRUpdate?: (messageId: string, result: any) => void;
  onDelete?: (messageId: string) => void;
  // 选择功能 props
  selectMode?: boolean;
  selected?: boolean;
  onSelect?: (messageId: string, selected: boolean) => void;
}

// 使用从 apiClient 导入的 API 基础 URL

// 硬性封印（在 image 消息中打印）
const printImageSourceSealed = () => {
  if ((window as any).__DEV_DEBUG__) {
    console.debug('[IMAGE_URL_SOURCE_SEALED]');
    console.debug('VERSION: V1');
    console.debug('ONLY_SOURCE: media_path');
    console.debug('NO_NORMALIZATION');
    console.debug('NO_DERIVATION');
    console.debug('APPEND_ONLY');
    console.debug('MESSAGE_ID_STRICT');
  }
};

const MessageBubble: React.FC<MessageBubbleProps> = ({ 
  message, 
  onImageDoubleClick,
  translationMode = 'manual',
  onTranslationUpdate,
  onOCRUpdate,
  onDelete,
  // 选择功能 props
  selectMode = false,
  selected = false,
  onSelect
}) => {
  // 文件指纹
  const isFirstRender = React.useRef(true);
  if (isFirstRender.current) {
    if ((window as any).__DEV_DEBUG__) {
      console.debug("[BUBBLE_FILE_FINGERPRINT]", import.meta.url);
    }
    isFirstRender.current = false;
  }
  // 打印消息关键属性，每次渲染都打印
  if ((window as any).__DEV_DEBUG__) {
    console.debug("[BUBBLE_RENDER_KEYS]", { 
      id: message?.id || message?.messageId, 
      ts: message?.ts ?? message?.timestamp, 
      textLen: typeof message?.text === "string" ? message.text.length : null, 
      hasMediaPath: !!message?.media_path 
    });
  }
  // 获取chatStore以获取翻译和OCR，使用稳定的选择器
  const getTranslation = useChatStore((state) => state.getTranslation);
  const getOCR = useChatStore((state) => state.getOCR);
  const deleteMessage = useChatStore((state) => state.deleteMessage);
  
  // 统一获取消息 ID
  const msgId = useMemo(() => {
    return message.id || message.message_id;
  }, [message.id, message.message_id]);
  // 直接订阅 store 字段，确保变化时 UI 自动重新渲染
  // 注意：这些订阅必须在组件顶层，不能在条件渲染函数中
  const messageTranslation = useChatStore(state => state.translations?.[msgId]);

  
  // 防止重复渲染 - 使用 per-render-cycle cache
  const renderedRef = useRef<Set<string>>(new Set());
  
  // 图片识别状态
  const [isRecognizing, setIsRecognizing] = useState(false);
  const [recognitionResult, setRecognitionResult] = useState<string | null>(null);
  const [recognitionError, setRecognitionError] = useState<string | null>(null);
  // 图片加载错误状态
  const [imageError, setImageError] = useState(false);
  // 图片放大状态
  const [isImageZoomed, setIsImageZoomed] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [imagePosition, setImagePosition] = useState({ x: 0, y: 0 });
  // 删除功能状态
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteSuccess, setDeleteSuccess] = useState(false);
  

  
  // 格式化时间
  const formatTime = (timestamp: number) => {
    // 验证时间戳是否有效
    if (!timestamp || isNaN(timestamp) || timestamp <= 0) {
      return '时间未知';
    }
    
    const date = new Date(timestamp);
    // 验证Date对象是否有效
    if (isNaN(date.getTime())) {
      return '时间未知';
    }
    
    // 始终显示完整的日期和时间，格式：YYYY-MM-DD HH:mm
    return date.toLocaleString('zh-CN', { 
      year: 'numeric',
      month: '2-digit', 
      day: '2-digit',
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false
    });
  };
  
  // 根据消息方向和角色获取样式类
  const getBubbleClass = useMemo(() => {
    const baseClass = 'message-bubble';
    let directionClass = message.direction === 'inbound' ? 'message-bubble-inbound' : 'message-bubble-outbound';
    
    // 添加 assistant 角色的样式类
    if (message.role === 'assistant') {
      directionClass = 'message-bubble-assistant';
    }
    
    return `${baseClass} ${directionClass}`;
  }, [message.direction, message.role]);
  
  // 获取消息 ID 的函数
  const getMessageId = useCallback(() => {
    return msgId;
  }, [msgId]);
  
  // 使用统一的 buildMediaUrl 函数构建完整媒体 URL
  const imageUrl = useMemo(() => {
    const mediaPath = message.media_path || '';
    const baseUrl = mediaPath.includes('/api/media/r2/') ? JEV_RUNTIME.REMOTE_API_BASE : API_BASE_URL;
    return buildMediaUrl(baseUrl, mediaPath);
  }, [API_BASE_URL, message.media_path, JEV_RUNTIME.REMOTE_API_BASE]);
  
  // 只在开发环境显示调试日志，使用 useMemo 缓存日志输出
  useMemo(() => {
    if ((window as any).__DEV_DEBUG__) {
      console.debug('[IMAGE_URL_CONSTRUCTION]', { API_BASE_URL, mediaPath: message.media_path, imageUrl });
    }
  }, [API_BASE_URL, message.media_path, imageUrl]);
  

  
  // 检查是否为历史测试消息
  const isInvalidMedia = useCallback((mediaPath: string): boolean => {
    return mediaPath.includes('MM9876543210');
  }, []);
  
  // RenderGate：只判断是否有 valid mediaUrl，然后渲染 <img>
  const isImageMessage = useCallback((msg: any): boolean => {
    // 强制使用：message.type === 'image' 作为唯一 image 渲染入口
    const isImageType = msg?.type === "image";
    
    // 打印 [IMAGE_RENDER_ENTRY] 日志（仅开发环境）
    const messageId = msg.id || msg.message_id;
    if ((window as any).__DEV_DEBUG__) {
      console.debug('[IMAGE_RENDER_ENTRY] messageId=' + messageId);
    }
    
    if (isImageType) {
      // 打印 [IMAGE_RENDER_CONFIRMED] 日志（仅开发环境）
      if ((window as any).__DEV_DEBUG__) {
        console.debug('[IMAGE_RENDER_CONFIRMED] messageId=' + messageId);
      }
      return true;
    }
    
    // 默认：非图片
    return false;
  }, []);
  
  // ProcessGate：对 OCR/下载/解析做去重
  const isDuplicateProcess = useCallback((msg: any): boolean => {
    // 检查是否重复处理
    const messageId = msg.id || msg.message_id;
    
    // Duplicate Gate 判断规则：仅使用 message_id 作为唯一实例判断
    if (messageId) {
      // 输出新规则日志（仅开发环境）
      if ((window as any).__DEV_DEBUG__) {
        console.debug('[IMAGE_DUPLICATE_GATE_RULE_V2]');
        console.debug('rule: message_id_only');
      }
      
      // 如果 message_id 已处理 → duplicate
      if (renderedRef.current.has(messageId)) {
        if ((window as any).__DEV_DEBUG__) {
          console.debug("[IMAGE_PROCESS_SKIP_DUPLICATE]", messageId);
        }
        return true;
      }
      // 否则 → allow process
      renderedRef.current.add(messageId);
    }
    
    return false;
  }, []);
  

  
  // 处理图片双击事件
  const handleImageDoubleClick = useCallback(() => {
    if (imageUrl) {
      if (onImageDoubleClick) {
        onImageDoubleClick(imageUrl);
      }
      // 切换图片放大状态
      toggleImageZoom();
    }
  }, [imageUrl, onImageDoubleClick]);
  
  // 使用 useRef 存储稳定的 handleKeyDown 引用
  const handleKeyDownRef = useRef<(e: KeyboardEvent) => void>();
  
  // 处理键盘事件
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!isImageZoomed) return;
    
    switch (e.key) {
      case 'Escape':
        // 直接重置状态，避免循环依赖
        setIsImageZoomed(false);
        setZoomLevel(1);
        setImagePosition({ x: 0, y: 0 });
        window.removeEventListener('keydown', handleKeyDownRef.current!);
        document.body.style.overflow = '';
        break;
      case 'ArrowUp':
        setImagePosition(prev => ({ ...prev, y: prev.y + 20 }));
        break;
      case 'ArrowDown':
        setImagePosition(prev => ({ ...prev, y: prev.y - 20 }));
        break;
      case 'ArrowLeft':
        setImagePosition(prev => ({ ...prev, x: prev.x + 20 }));
        break;
      case 'ArrowRight':
        setImagePosition(prev => ({ ...prev, x: prev.x - 20 }));
        break;
      default:
        break;
    }
  }, [isImageZoomed]);
  
  // 更新 ref 引用
  useEffect(() => {
    handleKeyDownRef.current = handleKeyDown;
  }, [handleKeyDown]);
  
  // 切换图片放大状态
  const toggleImageZoom = useCallback(() => {
    // 使用函数式更新，避免依赖 isImageZoomed
    setIsImageZoomed(prevIsZoomed => {
      if (prevIsZoomed) {
        // 重置状态
        setZoomLevel(1);
        setImagePosition({ x: 0, y: 0 });
        // 移除键盘事件监听器
        if (handleKeyDownRef.current) {
          window.removeEventListener('keydown', handleKeyDownRef.current);
        }
        document.body.style.overflow = '';
        return false;
      } else {
        // 进入放大状态
        setZoomLevel(1);
        setImagePosition({ x: 0, y: 0 });
        // 添加键盘事件监听器
        if (handleKeyDownRef.current) {
          window.addEventListener('keydown', handleKeyDownRef.current);
        }
        // 防止背景滚动
        document.body.style.overflow = 'hidden';
        return true;
      }
    });
  }, []); // 空依赖数组，避免循环依赖
  
  // 处理鼠标滚轮缩放
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (!isImageZoomed) return;
    
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoomLevel(prev => Math.max(0.1, Math.min(5, prev * delta)));
  }, [isImageZoomed]);
  
  // 处理鼠标拖动
  const [isDragging, setIsDragging] = useState(false);
  const [startPosition, setStartPosition] = useState({ x: 0, y: 0 });
  
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!isImageZoomed) return;
    setIsDragging(true);
    setStartPosition({ x: e.clientX - imagePosition.x, y: e.clientY - imagePosition.y });
  }, [isImageZoomed, imagePosition]);
  
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging || !isImageZoomed) return;
    setImagePosition({
      x: e.clientX - startPosition.x,
      y: e.clientY - startPosition.y
    });
  }, [isDragging, isImageZoomed, startPosition]);
  
  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);
  
  // 清理事件监听器
  useEffect(() => {
    return () => {
      if (handleKeyDownRef.current) {
        window.removeEventListener('keydown', handleKeyDownRef.current);
      }
      document.body.style.overflow = '';
    };
  }, []); // 空依赖数组，避免循环依赖
  
  // 处理翻译更新
  const handleTranslationUpdate = useCallback((result: any) => {
    if (msgId && onTranslationUpdate) {
      onTranslationUpdate(msgId, result);
    }
  }, [msgId, onTranslationUpdate]);
  
  // 处理 OCR 更新
  const handleOCRUpdate = useCallback((result: any) => {
    if (msgId && onOCRUpdate) {
      onOCRUpdate(msgId, result);
    }
  }, [msgId, onOCRUpdate]);
  
  // 处理删除确认
  const handleDeleteConfirm = useCallback(() => {
    setShowDeleteConfirm(true);
    setShowMoreMenu(false);
  }, []);
  
  // 处理删除执行
  const handleDeleteExecute = useCallback(async () => {
    setIsDeleting(true);
    try {
      const msgId = getMessageId();
      const chatId = message.from;
      if (msgId && chatId) {
        // 调用 chatStore 的删除方法
        deleteMessage(chatId, msgId);
        // 调用外部删除回调
        if (onDelete) {
          onDelete(msgId);
        }
        // 显示删除成功提示
        setDeleteSuccess(true);
        setTimeout(() => {
          setDeleteSuccess(false);
        }, 2000);
      }
    } catch (error) {
      console.error('删除消息失败:', error);
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  }, [message.from, deleteMessage, getMessageId, onDelete]);
  
  // 处理删除取消
  const handleDeleteCancel = useCallback(() => {
    setShowDeleteConfirm(false);
  }, []);
  

  

  
  // 切换更多菜单
  const toggleMoreMenu = useCallback(() => {
    setShowMoreMenu(prev => !prev);
  }, []);
  

  
  // 处理消息选择
  const handleSelect = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectMode && onSelect) {
      const msgId = getMessageId();
      if (msgId) {
        onSelect(msgId, !selected);
      }
    }
  }, [selectMode, selected, onSelect, getMessageId]);
  
  // 处理消息内容点击
  const handleMessageClick = useCallback((e: React.MouseEvent) => {
    if (selectMode && onSelect) {
      e.stopPropagation();
      const msgId = getMessageId();
      if (msgId) {
        onSelect(msgId, !selected);
      }
    }
  }, [selectMode, selected, onSelect, getMessageId]);
  
  // 点击外部关闭更多菜单
  const handleClickOutside = useCallback((e: MouseEvent) => {
    const target = e.target as HTMLElement;
    const messageBubble = document.querySelector(`[data-message-id="${msgId}"]`);
    if (!messageBubble) {
      return;
    }
    if (!target.closest('.message-bubble') || target.closest('.message-bubble') !== messageBubble) {
      setShowMoreMenu(false);
      setShowDeleteConfirm(false);
    }
  }, [msgId]);
  
  // 添加和清理点击外部事件监听器
  useEffect(() => {
    document.addEventListener('click', handleClickOutside);
    return () => {
      try {
        document.removeEventListener('click', handleClickOutside);
      } catch (error) {
        console.warn('[EVENT_LISTENER_CLEANUP_ERROR]', error);
      }
    };
  }, [handleClickOutside]);
  
  // 图片识别函数
  const handleImageRecognition = useCallback(async () => {
    // 使用统一的 buildMediaUrl 构建图片 URL 进行 OCR
    const mediaPath = message.media_path || '';
    const baseUrl = mediaPath.includes('/api/media/r2/') ? JEV_RUNTIME.REMOTE_API_BASE : API_BASE_URL;
    const imageUrl = buildMediaUrl(baseUrl, mediaPath);
    if (!imageUrl) {
      setRecognitionError('缺少有效的图片URL');
      return;
    }
    
    // ProcessGate：对 OCR 做去重
    if (isDuplicateProcess(message)) {
      setRecognitionError('图片已处理过，跳过 OCR');
      return;
    }
    
    try {
      setIsRecognizing(true);
      setRecognitionResult(null);
      setRecognitionError(null);
      
      // 调用 Worker 的 OCR API 路由
      const response = await safeFetch("/api/vision/ocr", {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          chat_id: message.from,
          message_id: msgId || '',
          media_path: message.media_path || '',
          provider: 'google_vision'
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        // 处理不同类型的错误
        if (response.status === 400) {
          if (data.error) {
            setRecognitionError(data.error);
          } else {
            setRecognitionError('图片处理失败');
          }
        } else {
          setRecognitionError('图片识别服务暂时不可用');
        }
        return;
      }
      
      // 提取识别结果
      if (data.ok) {
        // OCR 请求已提交，状态为处理中
        setRecognitionResult('OCR 处理中，请稍后查看结果');
        
        // 通过 Scheduler 发送 OCR 结果事件
        if (msgId) {
          uiScheduler.receiveEvent({
            type: SchedulerEventType.OCR_RESULT,
            data: {
              ...(data.ocr_result || {}),
              mediaPath: message.media_path
            },
            messageId: msgId
          });
        }
      } else {
        setRecognitionResult('未识别到文本');
      }
    } catch (error) {
      console.error('图片识别错误:', error);
      setRecognitionError('图片识别失败，请重试');
    } finally {
      setIsRecognizing(false);
    }
  }, [message, msgId, isDuplicateProcess]);
  
  // 移除可能导致渲染循环的日志

  // 渲染消息内容
  const renderMessageContent = useCallback(() => {
    // 检查是否为媒体消息且状态为pending
    if ((message as any).media_status === 'pending') {
      // 显示媒体处理中提示
      return (
        <div className="message-image-error">
          <div className="error-icon">📎</div>
          <div className="error-text">媒体处理中 / 链接缺失</div>
          <div className="error-details">id: {message.id || message.message_id || 'unknown'}</div>
        </div>
      );
    }
    
    // 检查是否为图片消息（只计算一次）
    const kind = message.kind ?? message.type;
    if (!kind) {
      console.warn("[BUBBLE_GUARD_DROP] Missing kind/type", message);
      return null;
    }
    
    const isImage = isImageMessage(message);
    
    // 图片消息
    if (isImage === true) {
      // 只在开发环境打印图片源封印
      if (import.meta.env.DEV) {
        printImageSourceSealed();
      }
      
      // 检查图片 URL 是否有效
      if (!imageUrl) {
        // 检查是否为MM开头的Twilio媒体消息
        const messageId = message.id || message.message_id;
        const isTwilioMediaMessage = messageId && typeof messageId === 'string' && messageId.startsWith('MM');
        
        if (isTwilioMediaMessage) {
          // 显示Twilio媒体消息提示，而不是图片错误提示
          return (
            <div className="message-image-error">
              <div className="error-icon">📎</div>
              <div className="error-text">媒体消息（Twilio）</div>
              <div className="error-details">ID: {messageId}</div>
            </div>
          );
        } else {
          // 显示图片错误提示，而不是返回null
          return (
            <div className="message-image-error">
              <div className="error-icon">📷</div>
              <div className="error-text">图片暂不可用（未写入R2）</div>
            </div>
          );
        }
      }
      
      // 渲染图片
      return (
        <div className="message-image-container" style={{ position: 'relative' }}>
          {imageError || isInvalidMedia(message.media_path || '') ? (
            <div className="message-image-error" style={{ 
              padding: '16px',
              textAlign: 'center',
              backgroundColor: '#f8f9fa',
              borderRadius: '12px',
              minHeight: '120px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center'
            }}>
              <div className="error-icon" style={{ fontSize: '24px', marginBottom: '8px' }}>📷</div>
              <div className="error-text" style={{ 
                fontWeight: '500', 
                marginBottom: '4px',
                color: '#333'
              }}>[IMAGE_LOAD_FAILED]</div>
              <div className="error-details" style={{ 
                    fontSize: '12px', 
                    color: '#666',
                    wordBreak: 'break-all',
                    maxWidth: '300px',
                    textAlign: 'center'
                  }}>{API_BASE_URL}</div>
            </div>
          ) : (
            <>
              <img
                src={imageUrl}
                alt="聊天图片"
                className="message-image"
                onDoubleClick={handleImageDoubleClick}
                onError={() => {
                  setImageError(true);
                }}
              />
              {/* 识别状态指示器 */}
              <div style={{
                position: 'absolute',
                top: '8px',
                right: '8px',
                zIndex: 10
              }}>
                {message.ocrStatus === 'processing' && (
                  <div style={{
                    backgroundColor: 'rgba(255, 193, 7, 0.85)',
                    color: 'white',
                    padding: '4px 8px',
                    borderRadius: '12px',
                    fontSize: '11px',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)'
                  }}>
                    <span style={{ animation: 'spin 1s linear infinite', fontSize: '10px' }}>⟳</span>
                    识别中
                  </div>
                )}
                {message.ocrStatus === 'success' && (
                  <div style={{
                    backgroundColor: 'rgba(40, 167, 69, 0.85)',
                    color: 'white',
                    padding: '4px 8px',
                    borderRadius: '12px',
                    fontSize: '11px',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)'
                  }}>
                    ✅ 识别成功
                  </div>
                )}
                {message.ocrStatus === 'error' && (
                  <div style={{
                    backgroundColor: 'rgba(220, 53, 69, 0.85)',
                    color: 'white',
                    padding: '4px 8px',
                    borderRadius: '12px',
                    fontSize: '11px',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)'
                  }}>
                    ❌ 识别失败
                  </div>
                )}
              </div>
              
              {/* 图片编号和产品信息显示 */}
              {(message.imageNumber || message.brand || message.model) && (
                <div style={{
                  position: 'absolute',
                  top: '8px',
                  left: '8px',
                  backgroundColor: 'rgba(0, 123, 255, 0.85)',
                  color: 'white',
                  padding: '6px 12px',
                  borderRadius: '16px',
                  fontSize: '12px',
                  fontWeight: '600',
                  zIndex: 10,
                  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  animation: 'fadeIn 0.3s ease-in-out'
                }}>
                  <span style={{ backgroundColor: 'rgba(255, 255, 255, 0.2)', borderRadius: '10px', padding: '2px 6px' }}>
                    #{message.imageNumber || ''}
                  </span>
                  {message.brand && (
                    <span style={{ fontSize: '11px', opacity: '0.9' }}>
                      {message.brand}
                    </span>
                  )}
                  {message.model && (
                    <span style={{ fontSize: '11px', opacity: '0.9' }}>
                      {message.model}
                    </span>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      );
    }
    
    // 检查是否为媒体消息（非图片）
    const isMediaMessage = message.media_path && !isImage;
    if (isMediaMessage) {
      // 只在开发环境显示调试日志
      if ((window as any).__DEV_DEBUG__) {
        console.debug('[MESSAGE_TIMELINE_STATUS] Media message');
      }
      
      // 优先级渲染逻辑
      // 1. PDF 自动预览
      if (message.mime === 'application/pdf') {
        return <PdfPreviewBubble message={message} />;
      }
      
      // 2. Excel 自动报价摘要
      if (message.media_kind === 'spreadsheet') {
        return <ExcelSummaryBubble message={message} />;
      }
      
      // 3. 其他媒体类型（文件下载按钮）
      return <FileBubble message={message} />;
    }
    
    // 检查是否有原文和翻译内容
    const hasOriginalText = typeof message.originalText === 'string' && message.originalText.trim() !== '';
    const hasTranslatedText = typeof message.translatedText === 'string' && message.translatedText.trim() !== '';
    

    
    // 计算派生状态
    const hasStoreTranslation = messageTranslation && messageTranslation.text && messageTranslation.text.trim() !== '';
    
    // 只在开发环境显示调试日志
    if ((window as any).__DEV_DEBUG__) {
      console.debug('[DOUBLE_CONTENT_RENDER] Checking message:', {
        messageId: message.id || message.message_id,
        hasOriginalText,
        hasTranslatedText,
        hasStoreTranslation,
        originalText: message.originalText,
        translatedText: message.translatedText,
        storeTranslation: messageTranslation?.text,
        text: message.text,
        direction: message.direction,
        type: message.type,
        kind: message.kind
      });
    }
    

    
    // 普通文本消息
    const hasText = typeof message.text === 'string' && message.text.trim() !== '';
    
    // 双重内容消息（原文 + 发送内容）
    if (hasOriginalText && (hasTranslatedText || hasText)) {
      // 只在开发环境显示调试日志
      if ((window as any).__DEV_DEBUG__) {
        console.debug('[DOUBLE_CONTENT_RENDER] Rendering double content message:', {
          messageId: message.id || message.message_id,
          originalText: message.originalText,
          translatedText: message.translatedText,
          text: message.text
        });
      }
      const content = (
        <div className="message-content-double">
          {/* 原文内容（内部可见） */}
          <div className="message-content-original">
            <div className="message-content-label">[中文（内部）]</div>
            <div className="message-content-text">{message.originalText}</div>
          </div>
          
          {/* 分隔符 */}
          <div className="message-content-separator"></div>
          
          {/* 发送给客户的内容 */}
          <div className="message-content-sent">
            <div className="message-content-label">[英文（客户可见）]</div>
            <div className="message-content-text">{message.translatedText || message.text}</div>
          </div>
        </div>
      );
      return content;
    } else if (hasOriginalText || hasTranslatedText) {
      // 只在开发环境显示调试日志
      if ((window as any).__DEV_DEBUG__) {
        console.debug('[DOUBLE_CONTENT_RENDER] Only one content present:', {
          messageId: message.id || message.message_id,
          hasOriginalText,
          hasTranslatedText,
          originalText: message.originalText,
          translatedText: message.translatedText,
          text: message.text
        });
      }
    }
    
    if (hasText) {
      const content = (
        <div className="message-content-text">
          {message.text}
        </div>
      );
      return content;
    }
    
    // 检查是否看起来像媒体消息
    const looksLikeMedia = message.type === 'image' || message.kind === 'image' || message.media_kind;
    
    // 空消息处理
    const messageId = message.id || message.message_id || 'unknown';
    if (looksLikeMedia) {
      // 看起来像媒体消息但缺少链接
      return (
        <div className="message-content-empty">
          <div className="empty-icon">📎</div>
          <div className="empty-text">媒体消息缺少链接</div>
          <div className="empty-detail">id: {messageId}</div>
        </div>
      );
    } else {
      // 文本为空且不是媒体消息
      return (
        <div className="message-content-empty">
          <div className="empty-icon">💬</div>
          <div className="empty-text">（空消息）</div>
          <div className="empty-detail">id: {messageId}</div>
        </div>
      );
    }
  }, [msgId, message, imageUrl, imageError, isImageMessage, handleImageDoubleClick, isInvalidMedia]);
  
  // 计算图片消息状态（只计算一次，全组件复用）
  const isImage = useMemo(() => isImageMessage(message), [message.type]);

  // HARD IMAGE GATE - 图片消息直接返回，不进入文本处理流程
  const isImageMessageCheck = useMemo(() => {
    // 强制使用：message.type === 'image' 作为唯一 image 渲染入口
    const isImageType = message?.type === "image";
    return isImageType;
  }, [message.type]);
  
  // 只在开发环境显示调试日志，使用 useMemo 缓存
  useMemo(() => {
    if ((window as any).__DEV_DEBUG__ && isImageMessageCheck) {
      const messageId = getMessageId();
      console.debug("[IMAGE_RENDER_GATE] Image detected, bypass text pipeline:", messageId);
      // 打印 [IMAGE_RENDER_ENTRY] 日志
      console.debug('[IMAGE_RENDER_ENTRY] messageId=' + messageId);
      // 打印 [IMAGE_URL_CONSTRUCTION] 日志
      console.debug('[IMAGE_URL_CONSTRUCTION]', { API_BASE_URL, mediaPath: message.media_path, imageUrl });
    }
  }, [isImageMessageCheck, message.media_path, imageUrl]);
  
  // 检查消息是否为空
  const isEmptyMessage = !message.text && !message.originalText && !message.translatedText && !message.media_path && !message.mediaStatus && !message.media_status;
  
  // 如果消息为空，不渲染任何内容
  if (isEmptyMessage) {
    return null;
  }

  if (isImageMessageCheck) {
    // 渲染图片
    return (
      <div className="message-bubble-wrapper">
        <div className={getBubbleClass}>
          {/* 显示发送者名称 */}
          {message.direction === 'inbound' && (
            <div className="message-sender">
              {(() => {
                let senderName = 
                  message.senderName || 
                  message.ProfileName;
                
                if (!senderName) {
                  const rawFrom = message.from || message.chat_id || '';
                  senderName = rawFrom.startsWith('whatsapp:') 
                    ? rawFrom.replace('whatsapp:', '') 
                    : rawFrom;
                }
                
                return senderName;
              })()}
            </div>
          )}
          {message.direction === 'outbound' && (
            <div className="message-sender">我</div>
          )}
          
          {/* 消息内容 */}
          <div className="message-content">
            <div className="message-image-container">
              {imageError || isInvalidMedia(message.media_path || '') || !imageUrl ? (
                <div className="message-image-error" style={{ 
                  padding: '16px',
                  textAlign: 'center',
                  backgroundColor: '#f8f9fa',
                  borderRadius: '12px',
                  minHeight: '120px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center'
                }}>
                  <div className="error-icon" style={{ fontSize: '24px', marginBottom: '8px' }}>📷</div>
                  <div className="error-text" style={{ 
                    fontWeight: '500', 
                    marginBottom: '4px',
                    color: '#333'
                  }}>图片加载中...</div>
                  <div className="error-details" style={{ 
                    fontSize: '12px', 
                    color: '#666',
                    wordBreak: 'break-all',
                    maxWidth: '300px',
                    textAlign: 'center'
                  }}>正在从R2存储加载图片</div>
                </div>
              ) : (
                <img
                  src={imageUrl}
                  alt="聊天图片"
                  className="message-image"
                  onDoubleClick={handleImageDoubleClick}
                  onError={() => {
                    setImageError(true);
                  }}
                />
              )}
            </div>
          </div>
          
          {/* 消息状态和时间 */}
          <div className="message-meta">
            <span className="message-time">{formatTime(message.timestamp)}</span>
            
            {/* 只显示发送消息的状态 */}
            {message.direction === 'outbound' && (
              <div className="message-status-container">
                <span className={`message-status message-status-${message.status}`}>
                  {message.status === 'sending' && '⏳'}
                  {message.status === 'sent' && '✓'}
                  {message.status === 'delivered' && '✓✓'}
                  {message.status === 'read' && '✓✓'}
                  {message.status === 'failed' && '❌'}
                </span>
                {message.status === 'failed' && message.error && (
                  <span className="message-error-tooltip" data-error={message.error}>
                    ℹ️
                  </span>
                )}
              </div>
            )}
          </div>
          
          {/* 图片识别相关功能 - 统一放在一个div中 */}
          {(message.type === "image" || message.media_path || message.image_raw_url || recognitionResult || recognitionError) && (
            <div className="image-recognition-controls">
              {/* 图片 OCR 块 - 只在 message.type === "image" 时渲染 */}
              {message.type === "image" && (message.mediaPath || message.media_path || message.url || message.fileUrl) && (
                <ImageOCRBlock
                  messageId={getMessageId() || ''}
                  chatId={message.chatId || message.chat_id || message.from}
                  mediaPath={message.mediaPath || message.media_path || message.url || message.fileUrl}
                  onOCRUpdate={handleOCRUpdate}
                />
              )}
              
              {/* 图片识别按钮 */}
              {message.image_raw_url && (
                <div className="image-recognition-button-wrapper">
                  <button
                    className="image-recognition-button"
                    onClick={handleImageRecognition}
                    disabled={isRecognizing}
                  >
                    {isRecognizing ? '识别中...' : '图片识别'}
                  </button>
                </div>
              )}
              
              {/* 图片识别结果 */}
              {recognitionResult && (
                <div className="image-recognition-result">
                  <div className="result-title">识别结果：</div>
                  <div className="result-content">{recognitionResult}</div>
                </div>
              )}
              
              {/* 图片识别错误 */}
              {recognitionError && (
                <div className="image-recognition-error">
                  {recognitionError}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className={`message-bubble-wrapper ${selected ? 'message-selected' : ''}`}>
        <div className={getBubbleClass} data-message-id={msgId} onClick={handleMessageClick}>
          {/* 选择框 */}
          {selectMode && (
            <div className="message-select-checkbox">
              <input 
                type="checkbox" 
                checked={selected} 
                onChange={handleSelect}
                onClick={handleSelect}
              />
            </div>
          )}
          
          {/* 显示发送者名称，包括单聊和群聊 */}
          {message.direction === 'inbound' && (
            <div className="message-sender">
              {(() => {
                // 强制手机号兜底，确保图片消息也能显示发送者名称
                let senderName = 
                  message.senderName || 
                  message.ProfileName ||
                  message.sender ||
                  message.from_name;
                
                // 如果没有发送者名称，从 from 或 chat_id 中提取手机号
                if (!senderName) {
                  const rawFrom = message.from || message.chat_id || message.customer_id || '';
                  if (rawFrom) {
                    senderName = rawFrom.startsWith('whatsapp:') 
                      ? rawFrom.replace('whatsapp:', '') 
                      : rawFrom;
                  } else {
                    senderName = '未知发送者';
                  }
                }
                
                return senderName;
              })()}
            </div>
          )}
          {/* 显示出站消息的发送者名称 */}
          {message.direction === 'outbound' && (
            <div className="message-sender">我</div>
          )}
          
          {/* 消息内容 */}
          <div className="message-content">
            {renderMessageContent()}
            
            {/* 翻译块 - 显示在气泡框内部 */}
            {message.text && message.direction === 'inbound' && (
              <TranslationBlock
                messageId={msgId || ''}
                text={message.text}
                direction={message.direction}
                translation={messageTranslation ? {
                  type: 'inbound_auto',
                  target: 'zh',
                  text: messageTranslation.text,
                  engine: messageTranslation.provider,
                  mode: 'auto',
                  status: 'done'
                } : undefined}
                translationMode={translationMode || 'manual'}
                onTranslationUpdate={handleTranslationUpdate}
              />
            )}
          </div>
          
          {/* 消息状态和时间 */}
          <div className="message-meta">
            <span className="message-time">{formatTime(message.timestamp)}</span>
            
            {/* 只显示发送消息的状态 */}
            {message.direction === 'outbound' && (
              <div className="message-status-container">
                <span className={`message-status message-status-${message.status}`}>
                  {message.status === 'sending' && '⏳'}
                  {message.status === 'sent' && '✓'}
                  {message.status === 'delivered' && '✓✓'}
                  {message.status === 'read' && '✓✓'}
                  {message.status === 'failed' && '❌'}
                </span>
                {message.status === 'failed' && message.error && (
                  <span className="message-error-tooltip" data-error={message.error}>
                    ℹ️
                  </span>
                )}
              </div>
            )}
            
            {/* 更多操作按钮 */}
            <div className="message-actions">
              <button 
                className="message-more-btn"
                onClick={toggleMoreMenu}
                aria-label="更多操作"
              >
                ⋯
              </button>
              
              {/* 更多操作菜单 */}
              {showMoreMenu && (
                <div className="message-more-menu">
                  <div 
                    className="message-menu-option delete"
                    onClick={handleDeleteConfirm}
                  >
                    删除消息
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        

        
        {/* 翻译块已移至消息气泡框内部 */}
      </div>
      

      
      {/* 删除确认对话框 */}
      {showDeleteConfirm && (
        <div className="delete-confirm-modal">
          <div className="delete-confirm-dialog">
            <div className="delete-confirm-title">确认删除</div>
            <div className="delete-confirm-message">您确定要删除这条消息吗？此操作不可撤销。</div>
            <div className="delete-confirm-actions">
              <button 
                className="delete-confirm-btn cancel"
                onClick={handleDeleteCancel}
                disabled={isDeleting}
              >
                取消
              </button>
              <button 
                className="delete-confirm-btn delete"
                onClick={handleDeleteExecute}
                disabled={isDeleting}
              >
                {isDeleting ? '删除中...' : '删除'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* 删除成功提示 */}
      {deleteSuccess && (
        <div className="delete-success-toast">
          ✅ 消息已删除
        </div>
      )}
    </>
  );
};

// 标记修复完成
if ((window as any).__DEV_DEBUG__) {
  console.debug('[IMAGE_URL_V1_PATCH_DONE]');
  console.debug('[IMAGE_PIPELINE_FIXED_L9]');
  console.debug('[IMAGE_URL_PIPELINE_FIXED_L9]');

  // 新增完成标志
  console.debug('[MEDIA_PATH_NORMALIZED_V1]');
  console.debug('[IMAGE_URL_DOUBLE_PREFIX_FIXED]');
  console.debug('[IMAGE_URL_SINGLE_PASS]');
  console.debug('[BASE_URL_APPEND_GUARD_ENABLED]');

  // 标记彻底终止 MMhttps:// 与 MM 截断循环问题
  console.debug('[MM_HTTPS_LOOP_TERMINATED]');
  console.debug('[MEDIA_PATH_PASS_THROUGH_SEALED]');

  // 标记彻底修复 MEhttps:// 与 MMhttps:// 500 错误
  console.debug('[ME_HTTPS_500_FIXED]');
  console.debug('[MM_HTTPS_500_FIXED]');
}

// 为 MessageBubble 添加 React.memo 优化性能
const MessageBubbleMemo = memo(MessageBubble, (prevProps, nextProps) => {
  // 自定义比较函数，只要消息的关键属性没变就不重渲染
  const prevMessage = prevProps.message;
  const nextMessage = nextProps.message;
  
  if (!prevMessage || !nextMessage) {
    return false;
  }
  
  // 比较关键属性，包括翻译相关属性
  const isSameMessage = (
    prevMessage.message_id === nextMessage.message_id &&
    prevMessage.id === nextMessage.id &&
    prevMessage.text === nextMessage.text &&
    prevMessage.media_path === nextMessage.media_path &&
    prevMessage.status === nextMessage.status &&
    prevMessage.direction === nextMessage.direction &&
    prevMessage.timestamp === nextMessage.timestamp &&
    prevMessage.type === nextMessage.type &&
    prevMessage.kind === nextMessage.kind &&
    // 包含翻译相关属性的比较
    prevMessage.translatedText === nextMessage.translatedText &&
    prevMessage.originalText === nextMessage.originalText
  );
  
  // 比较其他props
  const isSameProps = (
    prevProps.onImageDoubleClick === nextProps.onImageDoubleClick &&
    prevProps.translationMode === nextProps.translationMode &&
    prevProps.onTranslationUpdate === nextProps.onTranslationUpdate &&
    prevProps.onOCRUpdate === nextProps.onOCRUpdate &&
    prevProps.onDelete === nextProps.onDelete &&
    prevProps.selectMode === nextProps.selectMode &&
    prevProps.selected === nextProps.selected &&
    prevProps.onSelect === nextProps.onSelect
  );
  
  return isSameMessage && isSameProps;
});

export default MessageBubbleMemo;
