import React, { useState, useEffect, useRef } from 'react';
import { translateService } from '../../../services/translate.service';
import { translateDraftStore } from '../../../store/translateDraftStore';

interface TranslateReplyModalProps {
  isVisible: boolean;
  onClose: () => void;
  customerId: string;
  customerLanguage?: string;
  onSend: (translatedText: string, originalText: string, targetLang: string) => void;
}

const TranslateReplyModal: React.FC<TranslateReplyModalProps> = ({
  isVisible,
  onClose,
  customerId,
  customerLanguage = 'auto',
  onSend
}) => {
  // 状态管理
  const [sourceText, setSourceText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [targetLang, setTargetLang] = useState(customerLanguage);
  const [isTranslating, setIsTranslating] = useState(false);
  const [modalPosition, setModalPosition] = useState({ x: 20, y: 20 });
  const [modalSize, setModalSize] = useState({ width: 500, height: 400 });
  const [isMaximized, setIsMaximized] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0 });
  
  // 引用
  const modalRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const resizeHandleRef = useRef<HTMLDivElement>(null);
  
  // 初始化和清理
  useEffect(() => {
    if (isVisible) {
      // 加载客户草稿
      const draft = translateDraftStore.getDraft(customerId);
      if (draft) {
        setSourceText(draft.draftSourceText);
        setTranslatedText(draft.translatedText);
        setTargetLang(draft.targetLang || customerLanguage);
      } else {
        // 初始化状态
        setSourceText('');
        setTranslatedText('');
        setTargetLang(customerLanguage);
      }
    }
  }, [isVisible, customerId, customerLanguage]);
  
  // 保存草稿
  useEffect(() => {
    if (isVisible && customerId) {
      translateDraftStore.saveDraft(customerId, {
        draftSourceText: sourceText,
        translatedText: translatedText,
        targetLang: targetLang
      });
    }
  }, [sourceText, translatedText, targetLang, isVisible, customerId]);
  
  // 自动翻译
  useEffect(() => {
    if (sourceText && targetLang) {
      // 防抖翻译
      const timer = setTimeout(async () => {
        try {
          setIsTranslating(true);
          const result = await translateService.translateWithDebounce({
            text: sourceText,
            targetLang: targetLang,
            customerId: customerId
          });
          setTranslatedText(result);
        } catch (error) {
          console.error('[TRANSLATE_ERROR]', error);
        } finally {
          setIsTranslating(false);
        }
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [sourceText, targetLang, customerId]);
  
  // 处理拖动开始
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsDragging(true);
    setDragStart({
      x: e.clientX - modalPosition.x,
      y: e.clientY - modalPosition.y
    });
    e.preventDefault();
  };
  
  // 处理拖动
  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging && !isMaximized) {
      setModalPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
    
    if (isResizing) {
      const newWidth = Math.max(400, e.clientX - resizeStart.x);
      const newHeight = Math.max(300, e.clientY - resizeStart.y);
      setModalSize({ width: newWidth, height: newHeight });
    }
  };
  
  // 处理拖动结束
  const handleMouseUp = () => {
    setIsDragging(false);
    setIsResizing(false);
  };
  
  // 处理调整大小开始
  const handleResizeMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsResizing(true);
    if (modalRef.current) {
      setResizeStart({
        x: modalRef.current.offsetLeft,
        y: modalRef.current.offsetTop
      });
    }
    e.preventDefault();
  };
  
  // 处理最大化/还原
  const handleToggleMaximize = () => {
    setIsMaximized(!isMaximized);
    
    if (!isMaximized) {
      // 最大化
      setModalSize({
        width: window.innerWidth - 40,
        height: window.innerHeight - 40
      });
      setModalPosition({ x: 20, y: 20 });
    } else {
      // 还原
      setModalSize({ width: 500, height: 400 });
      setModalPosition({ x: 20, y: 20 });
    }
  };
  
  // 处理重新翻译
  const handleRetryTranslate = async () => {
    if (!sourceText) return;
    
    try {
      setIsTranslating(true);
      const result = await translateService.translateWithDebounce({
        text: sourceText,
        targetLang: targetLang,
        customerId: customerId
      });
      setTranslatedText(result);
    } catch (error) {
      console.error('[TRANSLATE_ERROR]', error);
    } finally {
      setIsTranslating(false);
    }
  };
  
  // 处理发送
  const handleSend = () => {
    if (!translatedText) return;
    
    onSend(translatedText, sourceText, targetLang);
    
    // 发送成功后清空草稿
    translateDraftStore.clearDraft(customerId);
    setSourceText('');
    setTranslatedText('');
    
    // 关闭弹窗
    onClose();
  };
  
  // 添加/移除全局事件监听器
  useEffect(() => {
    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isResizing, dragStart, resizeStart, modalPosition, modalSize, isMaximized]);
  
  if (!isVisible) return null;
  
  return (
    <div 
      ref={modalRef}
      className="translate-reply-modal"
      style={{
        position: 'fixed',
        left: modalPosition.x,
        top: modalPosition.y,
        width: modalSize.width,
        height: modalSize.height,
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 12px 24px rgba(0, 0, 0, 0.2)',
        zIndex: 1000,
        overflow: 'hidden',
        pointerEvents: 'all',
        display: 'flex',
        flexDirection: 'column',
        transition: 'all 0.3s ease'
      }}
    >
      {/* 模态窗口头部 - 可拖动 */}
      <div 
        ref={headerRef}
        className="translate-reply-modal-header"
        style={{
          backgroundColor: '#f5f5f5',
          padding: '12px 16px',
          borderBottom: '1px solid #e0e0e0',
          cursor: 'move',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          userSelect: 'none'
        }}
        onMouseDown={handleMouseDown}
      >
        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 500 }}>翻译回复</h3>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={handleToggleMaximize}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '16px',
              padding: '4px',
              borderRadius: '4px',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e0e0e0'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            {isMaximized ? '🗗' : '🗖'}
          </button>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '16px',
              padding: '4px',
              borderRadius: '4px',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e0e0e0'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            ✕
          </button>
        </div>
      </div>
      
      {/* 模态窗口内容 */}
      <div 
        className="translate-reply-modal-content"
        style={{
          flex: 1,
          padding: '16px',
          overflow: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}
      >
        {/* 原文输入区 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={{ fontSize: '14px', fontWeight: 500 }}>原文（我方中文，可编辑）</label>
          <textarea
            value={sourceText}
            onChange={(e) => setSourceText(e.target.value)}
            placeholder="请输入中文回复内容..."
            style={{
              width: '100%',
              height: '100px',
              padding: '12px',
              border: '1px solid #d9d9d9',
              borderRadius: '4px',
              fontSize: '14px',
              resize: 'vertical',
              fontFamily: 'inherit'
            }}
          />
        </div>
        
        {/* 翻译结果区 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label style={{ fontSize: '14px', fontWeight: 500 }}>翻译结果（可编辑）</label>
            <div style={{ fontSize: '12px', color: '#666' }}>
              🌐 当前目标语言：{targetLang === 'auto' ? '自动' : targetLang.toUpperCase()}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
            <textarea
              value={translatedText}
              onChange={(e) => setTranslatedText(e.target.value)}
              placeholder={isTranslating ? '翻译中...' : '翻译结果将显示在这里...'}
              style={{
                flex: 1,
                height: '100px',
                padding: '12px',
                border: '1px solid #d9d9d9',
                borderRadius: '4px',
                fontSize: '14px',
                resize: 'vertical',
                fontFamily: 'inherit',
                opacity: isTranslating ? 0.6 : 1
              }}
              disabled={isTranslating}
            />
          </div>
        </div>
      </div>
      
      {/* 模态窗口底部 */}
      <div 
        className="translate-reply-modal-footer"
        style={{
          padding: '12px 16px',
          borderTop: '1px solid #e0e0e0',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '8px',
          backgroundColor: '#fafafa'
        }}
      >
        <button
          onClick={handleRetryTranslate}
          disabled={isTranslating || !sourceText}
          style={{
            padding: '8px 16px',
            border: '1px solid #d9d9d9',
            borderRadius: '4px',
            backgroundColor: 'white',
            cursor: isTranslating || !sourceText ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            opacity: isTranslating || !sourceText ? 0.6 : 1,
            transition: 'all 0.2s'
          }}
        >
          重新翻译
        </button>
        <button
          onClick={handleSend}
          disabled={!translatedText}
          style={{
            padding: '8px 16px',
            border: 'none',
            borderRadius: '4px',
            backgroundColor: !translatedText ? '#d9d9d9' : '#1890ff',
            color: 'white',
            cursor: !translatedText ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            transition: 'all 0.2s'
          }}
        >
          发送给客户
        </button>
      </div>
      
      {/* 调整大小手柄 */}
      <div
        ref={resizeHandleRef}
        className="translate-reply-modal-resize-handle"
        style={{
          position: 'absolute',
          bottom: 0,
          right: 0,
          width: '16px',
          height: '16px',
          cursor: 'nwse-resize',
          backgroundImage: 'linear-gradient(135deg, transparent 0%, transparent 50%, #1890ff 50%, #1890ff 100%)',
          backgroundSize: '200% 200%',
          backgroundPosition: '100% 100%'
        }}
        onMouseDown={handleResizeMouseDown}
      />
    </div>
  );
};

export default TranslateReplyModal;
