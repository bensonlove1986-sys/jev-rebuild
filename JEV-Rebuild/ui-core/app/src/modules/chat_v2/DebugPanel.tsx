import React from 'react';

interface DebugPanelProps {
  context: {
    selectedCustomerId: string | null;
    customerMessages: Array<{
      id?: string;
      message_id?: string;
      text: string;
      direction?: string;
      role?: string;
      timestamp?: number;
      from?: string;
    }>;
    mode: 'development' | 'production';
  };
}

const DebugPanel: React.FC<DebugPanelProps> = ({ context }) => {
  // 只在开发模式显示
  if (context.mode !== 'development') {
    return null;
  }

  const { selectedCustomerId, customerMessages } = context;
  const lastMessage = customerMessages[customerMessages.length - 1];

  return (
    <div className="debug-panel" style={{
      backgroundColor: '#f5f5f5',
      border: '1px solid #ddd',
      borderRadius: '4px',
      padding: '10px',
      margin: '10px 0',
      fontSize: '12px',
      color: '#666',
      fontFamily: 'monospace',
    }}>
      <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#333' }}>Debug Panel (Dev Only)</h4>
      <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: '5px' }}>
        <div>selectedCustomerId:</div>
        <div>{selectedCustomerId || 'null'}</div>
        
        <div>customerMessages.length:</div>
        <div>{customerMessages.length}</div>
        
        {lastMessage && (
          <>
            <div>lastMessageId:</div>
            <div>{lastMessage.id || lastMessage.message_id || 'N/A'}</div>
            
            <div>lastTimestamp:</div>
            <div>{lastMessage.timestamp ? new Date(lastMessage.timestamp).toLocaleString() : 'N/A'}</div>
          </>
        )}
      </div>
    </div>
  );
};

export default DebugPanel;