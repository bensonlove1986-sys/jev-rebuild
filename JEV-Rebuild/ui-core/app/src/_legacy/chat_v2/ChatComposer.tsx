// @deprecated
// second generation chat UI
import React from 'react';

interface ChatComposerProps {
  inputText: string;
  setInputText: (text: string) => void;
}

const ChatComposer: React.FC<ChatComposerProps> = ({ inputText, setInputText }) => {
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      // Send message logic is handled by parent component
    }
  };

  return (
    <div className="chat-composer">
      <textarea
        value={inputText}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder="输入消息..."
        rows={2}
      />
    </div>
  );
};

export default ChatComposer;