import React, { useRef } from 'react';

interface MessageTimelineProps {
  context: {
    customerMessages: Array<{
      id?: string;
      message_id?: string;
      text: string;
      direction?: string;
      role?: string;
      timestamp?: number;
      from?: string;
    }>;
  };
  hooks?: any;
}

const MessageTimeline: React.FC<MessageTimelineProps> = ({ context }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { customerMessages } = context;

  return (
    <div className="chat-messages">
      {customerMessages.map(msg => (
        <div 
          key={msg.id || msg.message_id || `msg-${msg.timestamp}-${msg.text?.substring(0, 5) || 'empty'}`} 
          className="chat-message"
        >
          <div className="chat-message-text">
            {String(msg.text || '')}
          </div>
        </div>
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
};

export default MessageTimeline;