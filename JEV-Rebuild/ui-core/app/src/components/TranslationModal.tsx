import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Button, Input, Spin, Space } from 'antd';
import { useOutboundTranslateStore } from '../store/outboundTranslateStore';
import { translateOperatorDraft } from '../services/translate.service';

const { TextArea } = Input;

// 语言映射
const LANGUAGE_MAP: Record<string, { name: string; flag?: string }> = {
  en: { name: '英语', flag: '🇺🇸' },
  hi: { name: '印地语', flag: '🇮🇳' },
  ar: { name: '阿拉伯语', flag: '🇸🇦' },
  fr: { name: '法语', flag: '🇫🇷' },
  es: { name: '西班牙语', flag: '🇪🇸' },
  ja: { name: '日语', flag: '🇯🇵' },
  ko: { name: '韩语', flag: '🇰🇷' },
  ur: { name: '乌尔都语', flag: '🇵🇰' },
  tr: { name: '土耳其语', flag: '🇹🇷' },
  de: { name: '德语', flag: '🇩🇪' },
};

const TranslationModal: React.FC = () => {
  const {
    open,
    customer_id,
    draftText,
    translations,
    selectedLang,
    loadingLangs,
    closeModal,
    setTranslation,
    setSelectedLang,
    setLoading,
    setDraftText,
  } = useOutboundTranslateStore();

  // 本地状态，用于编辑翻译结果
  const [editedTranslation, setEditedTranslation] = useState<string>('');
  
  // 模态框位置和大小状态
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 100, y: 100 });
  const [size, setSize] = useState<{ width: number; height: number }>({ width: 700, height: 550 });
  
  // 拖拽状态
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  
  // 调整大小状态
  const [isResizing, setIsResizing] = useState<boolean>(false);
  const [resizeStart, setResizeStart] = useState<{ x: number; y: number; width: number; height: number }>({ x: 0, y: 0, width: 0, height: 0 });
  const [resizeDirection, setResizeDirection] = useState<string>('');
  
  // 模态框引用
  const modalRef = useRef<HTMLDivElement>(null);
  
  // 最小尺寸限制 - 允许更小的尺寸
  const minSize = { width: 300, height: 250 };
  
  // 计算字体大小（基于宽度的自适应）- 支持更小字体
  const calculateFontSize = () => {
    // 扩展字体大小范围，支持更小的尺寸
    const minFontSize = 8; // 允许更小的字体
    const maxFontSize = 16;
    const minWidth = 300; // 与最小宽度匹配
    const maxWidth = 1000;
    
    // 更高效的计算方式
    if (size.width < minWidth) return minFontSize;
    if (size.width > maxWidth) return maxFontSize;
    
    // 使用整数计算，避免浮点数精度问题
    const widthRange = maxWidth - minWidth;
    const fontSizeRange = maxFontSize - minFontSize;
    const widthDelta = size.width - minWidth;
    
    // 简化的线性计算，结果取整
    return minFontSize + Math.round((widthDelta * fontSizeRange) / widthRange);
  };
  
  // 当前字体大小
  const [fontSize, setFontSize] = useState<number>(calculateFontSize());
  
  // 当大小变化时更新字体大小
  useEffect(() => {
    setFontSize(calculateFontSize());
  }, [size]);
  
  // 从localStorage加载状态
  useEffect(() => {
    const savedPosition = localStorage.getItem('translationModalPosition');
    const savedSize = localStorage.getItem('translationModalSize');
    
    if (savedPosition) {
      setPosition(JSON.parse(savedPosition));
    }
    
    if (savedSize) {
      setSize(JSON.parse(savedSize));
    }
  }, []);
  
  // 保存状态到localStorage
  useEffect(() => {
    if (open) {
      localStorage.setItem('translationModalPosition', JSON.stringify(position));
      localStorage.setItem('translationModalSize', JSON.stringify(size));
    }
  }, [position, size, open]);

  // 当选中语言变化时，更新编辑的翻译结果
  useEffect(() => {
    if (selectedLang && translations[selectedLang as keyof typeof translations]) {
      setEditedTranslation(translations[selectedLang as keyof typeof translations] || '');
    } else {
      setEditedTranslation('');
    }
  }, [selectedLang, translations]);

  // 处理语言选择
  const handleLanguageSelect = async (lang: string) => {
    setSelectedLang(lang);

    // 如果该语言还没有翻译结果，则请求翻译
    if (!translations[lang as keyof typeof translations]) {
      setLoading(lang, true);
      try {
        // 操作员的输入语言，这里固定为中文
        const operatorLang = 'zh';
        
        // 调用翻译服务 - 翻译操作员草稿：操作员语言 → 客户语言
        const translateResult = await translateOperatorDraft(draftText, lang, operatorLang);
        setTranslation(lang, translateResult.draft_text || '');
        setEditedTranslation(translateResult.draft_text || '');
      } catch (error) {
        console.error('Translation failed:', error);
        setTranslation(lang, '翻译失败，请重试');
      } finally {
        setLoading(lang, false);
      }
    }
  };

  // 处理翻译结果编辑
  const handleTranslationEdit = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditedTranslation(e.target.value);
    if (selectedLang) {
      setTranslation(selectedLang, e.target.value);
    }
  };

  // 处理一键发送
  const handleSend = async () => {
    if (!selectedLang || !customer_id) return;

    // 使用编辑后的翻译结果，即使原文本为空也允许发送
    const translatedText = editedTranslation || draftText;

    try {
      // 导入messagesStore并调用sendMessage函数发送翻译后的消息
      const { useMessagesStore } = await import('../store/messagesStore');
      const messagesStore = useMessagesStore.getState();
      
      // 生成唯一的message_id
      const message_id = crypto.randomUUID();
      // 调用真实的sendMessage API发送翻译后的消息，传递翻译结果作为第四个参数
      await messagesStore.sendMessage(customer_id, draftText, message_id, translatedText);

      // 发送成功后，保持弹窗打开，不清空状态，实现窗口持久化
      // 保存当前选择的语言到localStorage
      if (selectedLang) {
        localStorage.setItem(`customer_lang_preference:${customer_id}`, selectedLang);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };
  
  // 拖拽事件处理
  const handleDragStart = useCallback((e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    e.preventDefault();
  }, [position]);
  
  // 调整大小事件处理
  const handleResizeStart = useCallback((e: React.MouseEvent, direction: string) => {
    setIsResizing(true);
    setResizeDirection(direction);
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      width: size.width,
      height: size.height
    });
    e.preventDefault();
  }, [size]);
  
  // 合并的鼠标移动事件处理，使用requestAnimationFrame优化
  const handleMouseMove = useCallback((e: MouseEvent) => {
    // 使用requestAnimationFrame优化性能
    requestAnimationFrame(() => {
      if (isDragging) {
        // 拖拽逻辑
        setPosition({
          x: e.clientX - dragStart.x,
          y: e.clientY - dragStart.y
        });
      } else if (isResizing) {
        // 调整大小逻辑
        const deltaX = e.clientX - resizeStart.x;
        const deltaY = e.clientY - resizeStart.y;
        let newWidth = resizeStart.width;
        let newHeight = resizeStart.height;
        let newX = position.x;
        let newY = position.y;
        
        // 根据调整方向计算新的大小和位置
        switch (resizeDirection) {
          case 'top-left':
            newWidth = Math.max(minSize.width, resizeStart.width - deltaX);
            newHeight = Math.max(minSize.height, resizeStart.height - deltaY);
            newX = position.x + (resizeStart.width - newWidth);
            newY = position.y + (resizeStart.height - newHeight);
            break;
          case 'top-right':
            newWidth = Math.max(minSize.width, resizeStart.width + deltaX);
            newHeight = Math.max(minSize.height, resizeStart.height - deltaY);
            newY = position.y + (resizeStart.height - newHeight);
            break;
          case 'bottom-left':
            newWidth = Math.max(minSize.width, resizeStart.width - deltaX);
            newHeight = Math.max(minSize.height, resizeStart.height + deltaY);
            newX = position.x + (resizeStart.width - newWidth);
            break;
          case 'bottom-right':
            newWidth = Math.max(minSize.width, resizeStart.width + deltaX);
            newHeight = Math.max(minSize.height, resizeStart.height + deltaY);
            break;
          case 'top':
            newHeight = Math.max(minSize.height, resizeStart.height - deltaY);
            newY = position.y + (resizeStart.height - newHeight);
            break;
          case 'right':
            newWidth = Math.max(minSize.width, resizeStart.width + deltaX);
            break;
          case 'bottom':
            newHeight = Math.max(minSize.height, resizeStart.height + deltaY);
            break;
          case 'left':
            newWidth = Math.max(minSize.width, resizeStart.width - deltaX);
            newX = position.x + (resizeStart.width - newWidth);
            break;
          default:
            break;
        }
        
        setSize({ width: newWidth, height: newHeight });
        setPosition({ x: newX, y: newY });
      }
    });
  }, [isDragging, isResizing, dragStart, resizeStart, resizeDirection, position]);
  
  // 结束事件处理
  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
  }, []);
  
  const handleResizeEnd = useCallback(() => {
    setIsResizing(false);
    setResizeDirection('');
  }, []);
  
  // 结束所有交互
  const handleEndInteraction = useCallback(() => {
    handleDragEnd();
    handleResizeEnd();
  }, [handleDragEnd, handleResizeEnd]);
  
  // 添加全局事件监听
  useEffect(() => {
    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleEndInteraction);
      document.addEventListener('mouseleave', handleEndInteraction);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleEndInteraction);
        document.removeEventListener('mouseleave', handleEndInteraction);
      };
    }
  }, [isDragging, isResizing, handleMouseMove, handleEndInteraction]);

  // 只有当open为true时才渲染组件
  if (!open) return null;
  
  return (
    <div
      ref={modalRef}
      className="translation-modal"
      style={{
        position: 'fixed',
        top: position.y,
        left: position.x,
        width: size.width,
        height: size.height,
        zIndex: 1000,
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
        borderRadius: '12px',
        background: 'white',
        border: '1px solid rgba(0, 0, 0, 0.1)',
        overflow: 'hidden',
        transform: 'none !important',
        fontSize: `${fontSize}px`, // 应用自适应字体大小
        // 移除过渡效果，避免拖动和调整大小时的延迟
      }}
    >
      {/* 拖拽区域 - 标题栏 */}
      <div
        className="translation-modal-header"
        style={{
          padding: `${fontSize * 1.1}px ${fontSize * 1.7}px`, // 相对值
          borderBottom: '1px solid #f0f0f0',
          cursor: 'move',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: '#fafafa',
          borderRadius: `${fontSize * 0.8}px ${fontSize * 0.8}px 0 0`, // 相对值
        }}
        onMouseDown={handleDragStart}
      >
        <h3 style={{ margin: 0, fontSize: `${fontSize + 2}px`, fontWeight: '600', color: '#333' }}>文字回复翻译</h3>
        <button
          onClick={closeModal}
          style={{
            background: 'none',
            border: 'none',
            fontSize: `${fontSize + 4}px`,
            cursor: 'pointer',
            color: '#999',
            padding: `${fontSize * 0.3}px`, // 相对值
            borderRadius: `${fontSize * 0.3}px`, // 相对值
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: `${fontSize * 2}px`, // 相对值
            height: `${fontSize * 2}px`, // 相对值
          }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          ×
        </button>
      </div>
      
      {/* 内容区域 */}
      <div
        className="translation-modal-body"
        style={{
          padding: `${fontSize * 1.4}px`, // 相对值
          height: `calc(100% - ${fontSize * 4.6}px)`, // 减去标题栏高度（相对值）
          overflow: 'auto',
          display: 'flex',
          flexDirection: 'column',
          fontSize: `${fontSize}px`, // 应用自适应字体大小
        }}
      >
        {/* 原文区 */}
        <div className={`mb-${Math.round(fontSize * 0.4)} flex-shrink-0`} style={{ marginBottom: `${fontSize * 0.4}px` }}>
          <div className="flex items-center gap-2 mb-3" style={{ gap: `${fontSize * 0.15}px`, marginBottom: `${fontSize * 0.2}px` }}>
            <h3 className="font-semibold text-gray-800 m-0" style={{ fontSize: `${fontSize + 2}px` }}>原文</h3>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4" style={{ padding: `${fontSize * 0.3}px`, borderRadius: `${fontSize * 0.5}px` }}>
            <TextArea
              value={draftText}
              rows={3}
              onChange={(e) => setDraftText(e.target.value)}
              placeholder="请输入要翻译的文本"
              className="bg-transparent border-0 resize-none"
              style={{ fontSize: `${fontSize}px`, minHeight: `${fontSize * 5.7}px` }} // 相对值
              autoSize={{ minRows: 3, maxRows: 8 }}
            />
          </div>
        </div>

        {/* 语言选择区 */}
        <div className={`mb-${Math.round(fontSize * 0.4)} flex-shrink-0`} style={{ marginBottom: `${fontSize * 0.4}px` }}>
          <div className="flex items-center gap-2 mb-3" style={{ gap: `${fontSize * 0.15}px`, marginBottom: `${fontSize * 0.2}px` }}>
            <h3 className="font-semibold text-gray-800 m-0" style={{ fontSize: `${fontSize + 2}px` }}>选择目标语言</h3>
          </div>
          <div className="flex flex-wrap gap-2" style={{ gap: `${fontSize * 0.15}px` }}>
            {Object.entries(LANGUAGE_MAP).map(([lang, { name, flag }]) => (
              <Button
                key={lang}
                type={selectedLang === lang ? 'primary' : 'default'}
                onClick={() => handleLanguageSelect(lang)}
                loading={loadingLangs.includes(lang)}
                size="middle"
                className="rounded-full"
                style={{ 
                  fontSize: `${fontSize - 1}px`,
                  padding: `${fontSize * 0.3}px ${fontSize * 0.8}px`, // 相对值
                  borderRadius: `${fontSize * 1.5}px`, // 相对值
                }}
              >
                <Space size={Math.round(fontSize * 0.3)}>
                  {flag} {name}
                  {loadingLangs.includes(lang) && <Spin size="small" />}
                </Space>
              </Button>
            ))}
          </div>
        </div>

        {/* 翻译结果区 */}
        <div className={`mb-${Math.round(fontSize * 0.4)} flex-grow min-h-[${fontSize * 8.6}px]`} style={{ marginBottom: `${fontSize * 0.4}px` }}>
          <div className="flex items-center gap-2 mb-3" style={{ gap: `${fontSize * 0.15}px`, marginBottom: `${fontSize * 0.2}px` }}>
            <h3 className="font-semibold text-gray-800 m-0" style={{ fontSize: `${fontSize + 2}px` }}>翻译结果</h3>
          </div>
          <div className="border border-gray-200 rounded-lg overflow-hidden h-full" style={{ borderRadius: `${fontSize * 0.5}px` }}>
            <TextArea
              value={editedTranslation}
              onChange={handleTranslationEdit}
              rows={4}
              placeholder={selectedLang ? `正在翻译为${LANGUAGE_MAP[selectedLang]?.name}...` : '请先选择目标语言'}
              autoSize={{ minRows: 4, maxRows: 20 }}
              style={{ 
                fontSize: `${fontSize}px`, 
                minHeight: `${fontSize * 8.6}px`, // 相对值
                height: '100%' 
              }}
              className="border-0 h-full"
            />
          </div>
        </div>

        {/* 操作按钮区 */}
        <div className="flex justify-end gap-3 pt-4 flex-shrink-0 border-t border-gray-100" style={{ gap: `${fontSize * 0.2}px`, paddingTop: `${fontSize * 0.3}px` }}>
          <Button 
            onClick={closeModal} 
            className="rounded-full" 
            style={{ 
              fontSize: `${fontSize}px`,
              padding: `${fontSize * 0.3}px ${fontSize * 0.8}px`, // 相对值
              borderRadius: `${fontSize * 1.5}px`, // 相对值
            }}
          >
            取消
          </Button>
          <Button
            type="primary"
            onClick={handleSend}
            disabled={!selectedLang}
            className="rounded-full"
            style={{ 
              fontSize: `${fontSize}px`,
              padding: `${fontSize * 0.3}px ${fontSize * 0.8}px`, // 相对值
              borderRadius: `${fontSize * 1.5}px`, // 相对值
            }}
          >
            回复客户翻译
          </Button>
        </div>
      </div>
      
      {/* 调整大小手柄 - 进一步增大尺寸，便于点击 */}
      {/* 四个角 */}
      <div
        className="resize-handle top-left"
        style={{
          position: 'absolute',
          width: `${fontSize * 2}px`, // 进一步增大尺寸
          height: `${fontSize * 2}px`, // 进一步增大尺寸
          top: `${-fontSize}px`, // 调整位置
          left: `${-fontSize}px`, // 调整位置
          background: '#667eea',
          borderRadius: '50%',
          cursor: 'nwse-resize',
          zIndex: 1001,
          opacity: 0.65, // 提高透明度，更明显
        }}
        onMouseDown={(e) => handleResizeStart(e, 'top-left')}
      />
      <div
        className="resize-handle top-right"
        style={{
          position: 'absolute',
          width: `${fontSize * 2}px`, // 进一步增大尺寸
          height: `${fontSize * 2}px`, // 进一步增大尺寸
          top: `${-fontSize}px`, // 调整位置
          right: `${-fontSize}px`, // 调整位置
          background: '#667eea',
          borderRadius: '50%',
          cursor: 'nesw-resize',
          zIndex: 1001,
          opacity: 0.65, // 提高透明度，更明显
        }}
        onMouseDown={(e) => handleResizeStart(e, 'top-right')}
      />
      <div
        className="resize-handle bottom-left"
        style={{
          position: 'absolute',
          width: `${fontSize * 2}px`, // 进一步增大尺寸
          height: `${fontSize * 2}px`, // 进一步增大尺寸
          bottom: `${-fontSize}px`, // 调整位置
          left: `${-fontSize}px`, // 调整位置
          background: '#667eea',
          borderRadius: '50%',
          cursor: 'nesw-resize',
          zIndex: 1001,
          opacity: 0.65, // 提高透明度，更明显
        }}
        onMouseDown={(e) => handleResizeStart(e, 'bottom-left')}
      />
      <div
        className="resize-handle bottom-right"
        style={{
          position: 'absolute',
          width: `${fontSize * 2}px`, // 进一步增大尺寸
          height: `${fontSize * 2}px`, // 进一步增大尺寸
          bottom: `${-fontSize}px`, // 调整位置
          right: `${-fontSize}px`, // 调整位置
          background: '#667eea',
          borderRadius: '50%',
          cursor: 'nwse-resize',
          zIndex: 1001,
          opacity: 0.65, // 提高透明度，更明显
        }}
        onMouseDown={(e) => handleResizeStart(e, 'bottom-right')}
      />
      
      {/* 四条边 */}
      <div
        className="resize-handle top"
        style={{
          position: 'absolute',
          width: `${fontSize * 3}px`, // 进一步增大尺寸
          height: `${fontSize * 1}px`, // 进一步增大尺寸
          top: `${-fontSize * 0.5}px`, // 调整位置
          left: '50%',
          transform: 'translateX(-50%)',
          background: '#667eea',
          borderRadius: `${fontSize * 0.5}px`, // 调整圆角
          cursor: 'ns-resize',
          zIndex: 1001,
          opacity: 0.65, // 提高透明度，更明显
        }}
        onMouseDown={(e) => handleResizeStart(e, 'top')}
      />
      <div
        className="resize-handle right"
        style={{
          position: 'absolute',
          width: `${fontSize * 1}px`, // 进一步增大尺寸
          height: `${fontSize * 3}px`, // 进一步增大尺寸
          top: '50%',
          right: `${-fontSize * 0.5}px`, // 调整位置
          transform: 'translateY(-50%)',
          background: '#667eea',
          borderRadius: `${fontSize * 0.5}px`, // 调整圆角
          cursor: 'ew-resize',
          zIndex: 1001,
          opacity: 0.65, // 提高透明度，更明显
        }}
        onMouseDown={(e) => handleResizeStart(e, 'right')}
      />
      <div
        className="resize-handle bottom"
        style={{
          position: 'absolute',
          width: `${fontSize * 3}px`, // 进一步增大尺寸
          height: `${fontSize * 1}px`, // 进一步增大尺寸
          bottom: `${-fontSize * 0.5}px`, // 调整位置
          left: '50%',
          transform: 'translateX(-50%)',
          background: '#667eea',
          borderRadius: `${fontSize * 0.5}px`, // 调整圆角
          cursor: 'ns-resize',
          zIndex: 1001,
          opacity: 0.65, // 提高透明度，更明显
        }}
        onMouseDown={(e) => handleResizeStart(e, 'bottom')}
      />
      <div
        className="resize-handle left"
        style={{
          position: 'absolute',
          width: `${fontSize * 1}px`, // 进一步增大尺寸
          height: `${fontSize * 3}px`, // 进一步增大尺寸
          top: '50%',
          left: `${-fontSize * 0.5}px`, // 调整位置
          transform: 'translateY(-50%)',
          background: '#667eea',
          borderRadius: `${fontSize * 0.5}px`, // 调整圆角
          cursor: 'ew-resize',
          zIndex: 1001,
          opacity: 0.65, // 提高透明度，更明显
        }}
        onMouseDown={(e) => handleResizeStart(e, 'left')}
      />
    </div>
  );
};

export default TranslationModal;
