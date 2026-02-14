// @deprecated
// second generation chat UI
import React from 'react';

interface MessageTimelineProps {
  context: {
    selectedCustomerId: string | null;
    customerMessages: any[];
    api_base: string;
    mode: string;
  };
  hooks: {
    onSetComposerText: (text: string) => void;
    onSend: (text: string) => void;
  };
}

const MessageTimeline: React.FC<MessageTimelineProps> = ({ context: { customerMessages } }) => {
  return (
    <div className="chat-timeline">
      {customerMessages.map((msg, index) => (
        <div key={msg.id || msg.message_id || index} className="chat-message">
          <div className="chat-message-content">
            {String(msg.text || '')}
          </div>
        </div>
      ))}
    </div>
  );
};

export default MessageTimeline;