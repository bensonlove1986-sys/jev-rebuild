import React from 'react';
import './ChatHeader.css';

interface ChatHeaderProps {
  phone: string;
  onToggleCrmPanel?: () => void;
}

const ChatHeader: React.FC<ChatHeaderProps> = ({ phone, onToggleCrmPanel }) => {
  return (
    <header className="chat-header-container" style={{ height: '56px', boxSizing: 'border-box' }}>
      <div className="chat-header-content">
        <div className="chat-contact-avatar">
          <div className="whatsapp-avatar">
            <span className="whatsapp-icon">📱</span>
          </div>
        </div>
        <div className="chat-contact-info">
          <h3 className="chat-contact-name">{phone}</h3>
          <div className="chat-contact-status">
            <span className="status-indicator online"></span>
            <span className="status-text">最近活跃</span>
          </div>
        </div>
        {onToggleCrmPanel && (
          <div className="chat-header-actions">
            <button 
              className="crm-toggle-btn"
              onClick={onToggleCrmPanel}
              title="CRM 客户信息"
            >
              📊
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

export default ChatHeader;
