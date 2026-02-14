import React, { forwardRef } from 'react';
import './AIDeepSeekAssistant.css';

interface ResponseStyle {
  id: string;
  name: string;
  description: string;
  prompt: string;
}

interface AIDeepSeekPopupProps {
  size: { width: number; height: number };
  position: { x: number; y: number };
  inputText: string;
  aiResponse: string;
  selectedStyle: ResponseStyle;
  responseStyles: ResponseStyle[];
  isGenerating: boolean;
  error: string;
  onStyleSelect: (style: ResponseStyle) => void;
  onSendResponse: () => void;
  onDirectSend: () => void;
  onInputChange: (text: string) => void;
  onResizeStart: (e: React.MouseEvent) => void;
  onDragStart: (e: React.MouseEvent) => void;
  onClose: () => void;
}

const AIDeepSeekPopup = forwardRef<HTMLDivElement, AIDeepSeekPopupProps>(({
  size,
  position,
  inputText,
  aiResponse,
  selectedStyle,
  responseStyles,
  isGenerating,
  error,
  onStyleSelect,
  onSendResponse,
  onDirectSend,
  onInputChange,
  onResizeStart,
  onDragStart,
  onClose
}, ref) => {
  return (
    <div
      ref={ref}
      className="ai-deepseek-popup"
      style={{
        width: `${size.width}px`,
        height: `${size.height}px`,
        left: `${position.x}px`,
        top: `${position.y}px`,
        position: 'fixed',
        zIndex: 1000
      }}
    >
      {/* 弹窗头部 */}
      <div className="ai-deepseek-popup-header" onMouseDown={onDragStart}>
        <div className="ai-deepseek-popup-title">
          <span className="ai-deepseek-icon">🤖</span>
          <span>AI DeepSeek助手</span>
        </div>
        <div className="ai-deepseek-popup-controls">
          <button className="ai-deepseek-close-btn" onClick={onClose} title="关闭">
            ×
          </button>
        </div>
      </div>
      
      {/* 回复风格选择 */}
      <div className="ai-deepseek-style-selector">
        <div className="ai-deepseek-style-title">回复风格：</div>
        <div className="ai-deepseek-style-options">
          {responseStyles.map((style) => (
            <button
              key={style.id}
              className={`ai-deepseek-style-option ${selectedStyle.id === style.id ? 'selected' : ''}`}
              onClick={() => onStyleSelect(style)}
              title={style.description}
            >
              {style.name}
            </button>
          ))}
        </div>
      </div>
      
      {/* 输入区域 */}
      <div className="ai-deepseek-input-section">
        <div className="ai-deepseek-section-title">输入内容：</div>
        <textarea
          className="ai-deepseek-input"
          value={inputText}
          onChange={(e) => onInputChange(e.target.value)}
          placeholder="请输入消息内容..."
          rows={3}
        />
      </div>
      
      {/* 输出区域 */}
      <div className="ai-deepseek-output-section">
        <div className="ai-deepseek-section-title">
          AI回复：
          {isGenerating && (
            <span className="ai-deepseek-generating">生成中...</span>
          )}
        </div>
        {error ? (
          <div className="ai-deepseek-error">
            {error}
          </div>
        ) : (
          <div className="ai-deepseek-output">
            {aiResponse || 'AI正在生成回复...'}
          </div>
        )}
      </div>
      
      {/* 按钮区域 */}
      <div className="ai-deepseek-button-section">
        <button
          className="ai-deepseek-send-btn"
          onClick={onSendResponse}
          disabled={!aiResponse || isGenerating}
          title="发送并关闭"
        >
          发送
        </button>
        <button
          className="ai-deepseek-direct-send-btn"
          onClick={onDirectSend}
          disabled={!aiResponse || isGenerating}
          title="直接发送"
        >
          直接发送
        </button>
      </div>
      
      {/* 调整大小手柄 */}
      <div 
        className="ai-deepseek-resize-handle" 
        onMouseDown={onResizeStart}
        title="调整大小"
      />
      
      {/* 调整大小指示器 */}
      <div className="ai-deepseek-resize-indicators">
        <div className="ai-deepseek-resize-indicator ai-deepseek-resize-indicator-tl" />
        <div className="ai-deepseek-resize-indicator ai-deepseek-resize-indicator-tr" />
        <div className="ai-deepseek-resize-indicator ai-deepseek-resize-indicator-bl" />
      </div>
    </div>
  );
});

AIDeepSeekPopup.displayName = 'AIDeepSeekPopup';

export default AIDeepSeekPopup;