import React, { useState } from 'react';

interface AutoReplyPluginProps {
  disabled?: boolean;
  customerId?: string;
}

const AutoReplyPlugin: React.FC<AutoReplyPluginProps> = ({ 
  disabled = false, 
  customerId = ''
}) => {
  // 处理自动回复按钮点击
  const handleAutoReplyClick = () => {
    if (disabled || !customerId) return;
    console.log('Auto reply clicked for customer:', customerId);
    // 这里可以添加自动回复的逻辑
    // 例如：调用AI生成回复内容，然后自动发送
  };
  
  return (
    <button
      className={`chat-v3-plugin ${disabled ? 'chat-v3-plugin-disabled' : ''}`}
      onClick={handleAutoReplyClick}
      disabled={disabled || !customerId}
      title="自动回复"
      style={{
        opacity: (disabled || !customerId) ? 0.6 : 1,
        cursor: (disabled || !customerId) ? 'not-allowed' : 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '4px'
      }}
    >
      🤖 自动回复
    </button>
  );
};

export default AutoReplyPlugin;