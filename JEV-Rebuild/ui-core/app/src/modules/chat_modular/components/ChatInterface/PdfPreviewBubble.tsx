import React, { useState, useRef, useEffect } from 'react';
import './PdfPreviewBubble.css';

interface PdfPreviewBubbleProps {
  message: {
    media_path: string;
    mime?: string;
    timestamp: number;
    direction: 'inbound' | 'outbound';
    status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
    error?: string;
  };
}

const PdfPreviewBubble: React.FC<PdfPreviewBubbleProps> = ({ message }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  };

  const handleIframeLoad = () => {
    setIsLoading(false);
    setLoadError(false);
  };

  const handleIframeError = () => {
    setIsLoading(false);
    setLoadError(true);
  };

  const handleDownload = () => {
    window.open(message.media_path, '_blank');
  };

  console.log('[MEDIA_RENDER_MODE] pdf-preview');

  return (
    <div className="pdf-preview-bubble">
      <div className="pdf-preview-content">
        {!loadError ? (
          <div className="pdf-preview-container">
            {isLoading && (
              <div className="pdf-preview-loading">
                <div className="loading-spinner"></div>
                <p>加载 PDF 预览...</p>
              </div>
            )}
            <iframe
              ref={iframeRef}
              src={`https://docs.google.com/gview?url=${encodeURIComponent(message.media_path)}&embedded=true`}
              className="pdf-iframe"
              frameBorder="0"
              onLoad={handleIframeLoad}
              onError={handleIframeError}
              loading="lazy"
            />
          </div>
        ) : (
          <div className="pdf-preview-error">
            <div className="error-icon">📄</div>
            <div className="error-text">PDF 预览失败</div>
          </div>
        )}
        <button 
          className="pdf-download-btn"
          onClick={handleDownload}
        >
          [ 下载文件 ]
        </button>
      </div>
      <div className="pdf-preview-meta">
        <span className="message-time">
          {formatTime(message.timestamp)}
        </span>
        {message.direction === 'outbound' && (
          <span className={`message-status message-status-${message.status}`}>
            {message.status === 'sending' && '⏳'}
            {message.status === 'sent' && '✓'}
            {message.status === 'delivered' && '✓✓'}
            {message.status === 'read' && '✓✓'}
            {message.status === 'failed' && '❌'}
          </span>
        )}
      </div>
    </div>
  );
};

export default PdfPreviewBubble;