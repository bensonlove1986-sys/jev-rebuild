import React, { useRef, useEffect } from 'react';
import MessageBubble from './MessageBubble';

const MessageTimeline: React.FC<any> = ({ messages }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 空状态处理
  if (messages.length === 0) {
    return (
      <div className="chat-v3-timeline">
        <div className="chat-v3-empty-state">
          <div className="chat-v3-empty-state-card">
            <div className="chat-v3-empty-state-icon">💬</div>
            <div className="chat-v3-empty-state-text">
              暂无历史消息，请从左侧选择客户
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-v3-timeline">
      {messages.map((message, index) => (
        <MessageBubble key={message.id || message.message_id || `msg-${index}-${message.timestamp}`} message={message} />
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
};

export default MessageTimeline;