import React from 'react';

const MessageBubble: React.FC<any> = ({ message }) => {
  // 确定消息类型
  const getMessageType = (): string => {
    // 优先使用role字段
    if (message.role) {
      return message.role;
    }
    
    // 其次使用direction字段
    if (message.direction === 'inbound' || message.from === 'customer') {
      return 'customer';
    }
    
    if (message.direction === 'outbound' || message.from === 'operator') {
      return 'operator';
    }
    
    // 默认返回operator
    return 'operator';
  };

  const messageType = getMessageType();
  
  // 格式化时间
  const formatTime = (timestamp?: any): string => {
    if (!timestamp) return '';
    
    try {
      const date = new Date(timestamp);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (error) {
      console.warn('Failed to format time:', error);
      return '';
    }
  };

  // 获取消息类名
  const messageClassName = `chat-v3-message ${messageType}`;
  const timeClassName = 'chat-v3-message-time';

  return (
    <div className={messageClassName}>
      <div className="bubble">
        <div className="chat-v3-message-text">
          {String(message.text || '')}
        </div>
        <div className={timeClassName}>
          {formatTime(message.timestamp)}
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;