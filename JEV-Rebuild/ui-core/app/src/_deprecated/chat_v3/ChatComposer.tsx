import React from 'react';

const ChatComposer: React.FC<any> = ({ inputText, setInputText, onSend, disabled = false, placeholder = '输入消息...' }) => {
  // 处理输入变化
  const handleInputChange = (e: any) => {
    if (disabled) return;
    setInputText(e.target.value);
  };

  // 处理发送消息
  const handleSend = () => {
    if (disabled) return;
    const text = inputText.trim();
    if (!text) return;
    
    onSend(text);
    setInputText('');
  };

  // 处理键盘事件
  const handleKeyPress = (e: any) => {
    if (disabled) return;
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="chat-v3-composer">
      <div className="chat-v3-input-wrapper">
        <textarea
          className={`chat-v3-input ${disabled ? 'chat-v3-input-disabled' : ''}`}
          placeholder={placeholder}
          value={inputText}
          onChange={handleInputChange}
          onKeyPress={handleKeyPress}
          rows={1}
          maxLength={1000}
          disabled={disabled}
          style={{
            backgroundColor: disabled ? '#f5f5f5' : '#ffffff',
            cursor: disabled ? 'not-allowed' : 'text'
          }}
        />
      </div>
      <button 
        className={`chat-v3-send-btn ${disabled ? 'chat-v3-send-btn-disabled' : ''}`}
        onClick={handleSend}
        disabled={disabled || !inputText.trim()}
        style={{
          backgroundColor: disabled ? '#d9d9d9' : inputText.trim() ? '#1890ff' : '#d9d9d9',
          cursor: disabled ? 'not-allowed' : inputText.trim() ? 'pointer' : 'not-allowed'
        }}
      >
        ➤
      </button>
    </div>
  );
};

export default ChatComposer;