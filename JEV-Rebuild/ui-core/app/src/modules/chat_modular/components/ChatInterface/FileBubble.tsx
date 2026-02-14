import React from 'react';
import './FileBubble.css';

interface FileBubbleProps {
  message: {
    media_path: string;
    text?: string;
    timestamp: number;
    direction: 'inbound' | 'outbound';
    status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
    error?: string;
    media_kind?: 'document' | 'spreadsheet' | 'other' | 'archive';
  };
}

const FileBubble: React.FC<FileBubbleProps> = ({ message }) => {
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  };

  const getFileIcon = (kind?: string) => {
    switch (kind) {
      case 'document':
        return '📄';
      case 'spreadsheet':
        return '📊';
      case 'archive':
        return '📦';
      default:
        return '📎';
    }
  };

  const getFileName = (mediaPath: string) => {
    // 从 media_path 中提取文件名
    const parts = mediaPath.split('/');
    return parts[parts.length - 1] || '文件';
  };

  const handleDownload = () => {
    window.open(message.media_path, '_blank');
  };

  console.log('[MEDIA_RENDER_MODE] file-download');

  return (
    <div className="file-bubble">
      <div className="file-bubble-content">
        <div className="file-icon">
          {getFileIcon(message.media_kind)}
        </div>
        <div className="file-info">
          <div className="file-name">
            {message.text || getFileName(message.media_path)}
          </div>
          <div className="file-path">
            {message.media_path}
          </div>
        </div>
      </div>
      <div className="file-bubble-actions">
        <button 
          className="file-download-btn"
          onClick={handleDownload}
        >
          [ 下载文件 ]
        </button>
      </div>
      <div className="file-bubble-meta">
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

export default FileBubble;