import React from 'react';

const ChatHeader: React.FC<any> = ({ customer }) => {
  return (
    <div className="chat-v3-header">
      <div className="chat-v3-header-info">
        <h2 className="chat-v3-customer-name">
          {customer?.name || '未选择客户'}
        </h2>
        <div className="chat-v3-customer-meta">
          {customer?.meta || '客户信息'}
        </div>
      </div>
      <div className="chat-v3-header-actions">
        {/* 预留头部操作按钮位置 */}
      </div>
    </div>
  );
};

export default ChatHeader;