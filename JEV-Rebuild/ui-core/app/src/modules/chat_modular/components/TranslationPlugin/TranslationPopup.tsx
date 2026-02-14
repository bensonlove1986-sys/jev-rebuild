import React, { forwardRef } from 'react';
import LanguageSelector from './LanguageSelector';
import './TranslationPopup.css';

interface Language {
  code: string;
  name: string;
  nativeName: string;
}

interface TranslationPopupProps {
  size: { width: number; height: number };
  position: { x: number; y: number };
  inputText: string;
  translatedText: string;
  selectedLanguage: Language;
  isTranslating: boolean;
  error: string;
  isAnswerMode: boolean;
  isBusinessMode: boolean;
  boundChatId?: string | null;
  onLanguageSelect: (language: Language) => void;
  onSendTranslation: () => void;
  onDirectSend: () => void;
  onBusinessSend: () => void;
  onInputChange: (text: string) => void;
  onAnswerModeChange: (mode: boolean) => void;
  onBusinessModeChange: (mode: boolean) => void;
  onResizeStart: (e: React.MouseEvent) => void;
  onDragStart: (e: React.MouseEvent) => void;
  onClose: () => void;
}

const TranslationPopup = forwardRef<HTMLDivElement, TranslationPopupProps>(({
  size,
  position,
  inputText,
  translatedText,
  selectedLanguage,
  isTranslating,
  error,
  isAnswerMode,
  isBusinessMode,
  boundChatId,
  onLanguageSelect,
  onSendTranslation,
  onDirectSend,
  onBusinessSend,
  onInputChange,
  onAnswerModeChange,
  onBusinessModeChange,
  onResizeStart,
  onDragStart,
  onClose
}, ref) => {
  return (
    <div
      ref={ref}
      className="translation-popup"
      style={{
        width: `${size.width}px`,
        height: `${size.height}px`,
        left: `${position.x}px`,
        top: `${position.y}px`,
        position: 'fixed',
        zIndex: 3000,
        backgroundColor: '#fff',
        borderRadius: '8px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        /* 移除动画效果，让弹窗显示更加平稳 */
      }}
    >
      {/* 弹窗头部 */}
      <div 
        className="translation-popup-header"
        onMouseDown={onDragStart}
        style={{ cursor: 'move' }}
      >
        <h3 className="translation-popup-title">翻译助手</h3>
        {/* 发送目标显示 */}
        {boundChatId ? (
          <div style={{ 
            fontSize: '12px', 
            color: '#666', 
            marginTop: '4px',
            fontWeight: '500'
          }}>
            将发送至：{boundChatId}
          </div>
        ) : (
          <div style={{ 
            fontSize: '12px', 
            color: '#ff6b6b', 
            marginTop: '4px',
            fontWeight: '500'
          }}>
            未绑定聊天 ID
          </div>
        )}
        <div className="translation-popup-controls">
          <button
            className="translation-popup-close-btn"
            onClick={onClose}
            title="关闭"
            style={{ cursor: 'pointer' }}
          >
            ×
          </button>
        </div>
      </div>
      
      {/* 语言选择器 */}
      <div className="translation-popup-language-selector">
        <LanguageSelector
          selectedLanguage={selectedLanguage}
          onLanguageSelect={onLanguageSelect}
        />
      </div>
      
      {/* 翻译内容区域 */}
      <div className="translation-popup-content">
        {/* 原文区域 */}
        <div className="translation-section">
          <div className="translation-section-header">
            <span className="translation-section-title">原文</span>
          </div>
          <div className="translation-section-content">
            <textarea
              className="translation-input"
              value={inputText}
              onChange={(e) => onInputChange(e.target.value)}
              placeholder="请输入要翻译的文本"
              style={{
                width: '100%',
                minHeight: '80px',
                maxHeight: '200px',
                padding: '8px',
                border: '1px solid #e0e0e0',
                borderRadius: '4px',
                resize: 'vertical',
                fontFamily: 'inherit',
                fontSize: '14px',
                lineHeight: '1.4',
                overflowY: 'auto',
                backgroundColor: '#ffffff',
                color: '#333333'
              }}
              onInput={(e) => {
                // 自动调整高度
                const textarea = e.target as HTMLTextAreaElement;
                textarea.style.height = 'auto';
                textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
              }}
              onKeyDown={(e) => {
                // 按回车键时不发送信息，只换行
                if (e.key === 'Enter' && !e.ctrlKey) {
                  // 允许默认行为（换行）
                  return;
                }
                // 按 CTRL+回车键时发送信息
                if (e.key === 'Enter' && e.ctrlKey) {
                  e.preventDefault();
                  if (isBusinessMode) {
                    onBusinessSend();
                  } else {
                    onDirectSend();
                  }
                }
              }}
            />
          </div>
        </div>
        
        {/* 翻译结果区域 */}
        <div className="translation-section">
          <div className="translation-section-header">
            <span className="translation-section-title">
              翻译 ({selectedLanguage.nativeName})
            </span>
            {isTranslating && (
              <span className="translation-loading">翻译中...</span>
            )}
          </div>
          <div 
            className="translation-section-content"
            style={{
              minHeight: '80px',
              maxHeight: '200px',
              overflowY: 'auto',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word'
            }}
          >
            {error ? (
              <div className="translation-error">
                {error}
              </div>
            ) : isTranslating ? (
              <div className="translation-loading-content">
                <div className="loading-spinner"></div>
                <span>正在翻译，请稍候...</span>
              </div>
            ) : translatedText ? (
              translatedText
            ) : (
              <div className="translation-placeholder">
                翻译结果将显示在这里
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* 模式切换 */}
      <div 
        style={{
          padding: '12px 16px',
          borderTop: '1px solid #e0e0e0',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '14px', color: '#666' }}>
            {isBusinessMode ? '商业发送模式' : isAnswerMode ? '回答模式' : '翻译模式'}
          </span>
        </div>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '14px' }}>
            <input
              type="checkbox"
              checked={isAnswerMode}
              onChange={(e) => onAnswerModeChange(e.target.checked)}
              style={{ cursor: 'pointer' }}
              disabled={isBusinessMode}
            />
            <span style={{ color: isBusinessMode ? '#999' : '#666' }}>回答模式</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '14px' }}>
            <input
              type="checkbox"
              checked={isBusinessMode}
              onChange={(e) => onBusinessModeChange(e.target.checked)}
              style={{ cursor: 'pointer' }}
            />
            <span style={{ color: '#666' }}>商业发送模式</span>
          </label>
        </div>
      </div>
      
      {/* 底部操作区域 */}
      <div 
        className="translation-popup-footer"
        style={{
          padding: '12px 16px',
          borderTop: '1px solid #e0e0e0',
          backgroundColor: '#f8f9fa',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: '12px'
        }}
      >
        {isBusinessMode ? (
          <>
            <button
              style={{
                padding: '8px 16px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '6px'
              }}
              onClick={onBusinessSend}
              disabled={!inputText.trim() || isTranslating}
            >
              商业发送
            </button>
          </>
        ) : (
          <>
            <button
              style={{
                padding: '8px 16px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '6px'
              }}
              onClick={onDirectSend}
              disabled={!translatedText || isTranslating}
            >
              直接发送
            </button>
            <button
              className="translation-popup-send-btn"
              onClick={onSendTranslation}
              disabled={!translatedText || isTranslating}
            >
              使用翻译结果发送
            </button>
          </>
        )}
      </div>
      
      {/* 调整大小手柄 */}
      <div
        className="translation-popup-resize-handle"
        onMouseDown={onResizeStart}
        title="调整大小"
        style={{
          position: 'absolute',
          bottom: '0',
          right: '0',
          width: '24px',
          height: '24px',
          backgroundColor: 'rgba(0, 123, 255, 0.2)',
          borderTopLeftRadius: '8px',
          cursor: 'nwse-resize',
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'flex-end',
          padding: '6px',
          transition: 'all 0.2s ease',
          zIndex: '10'
        }}
      >
        <div
          style={{
            width: '12px',
            height: '12px',
            backgroundColor: '#007bff',
            borderRadius: '3px',
            transition: 'all 0.2s ease',
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)'
          }}
        ></div>
      </div>
    </div>
  );
});

TranslationPopup.displayName = 'TranslationPopup';

export default TranslationPopup;
