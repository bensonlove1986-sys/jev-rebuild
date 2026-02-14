import React from 'react';

const AISuggestionPlugin: React.FC<any> = ({ disabled = false }) => {
  // 处理生成AI建议
  const handleGenerateAISuggestion = () => {
    if (disabled) return;
    // 这里暂时留空，因为我们没有context
    console.log('Generate AI suggestion clicked');
  };

  return (
    <button
      className={`chat-v3-plugin ${disabled ? 'chat-v3-plugin-disabled' : ''}`}
      onClick={handleGenerateAISuggestion}
      disabled={disabled}
      title="生成AI建议"
      style={{
        opacity: disabled ? 0.6 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer'
      }}
    >
      AI 建议发送
    </button>
  );
};

export default AISuggestionPlugin;