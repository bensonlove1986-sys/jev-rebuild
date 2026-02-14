// @deprecated
// second generation chat UI
import React from 'react';

interface DebugPanelProps {
  context: {
    selectedCustomerId: string | null;
    customerMessages: any[];
    api_base: string;
    mode: string;
  };
}

const DebugPanel: React.FC<DebugPanelProps> = ({ context }) => {
  return (
    <div className="chat-debug-panel">
      <h3>Debug Panel</h3>
      <pre>
        {JSON.stringify(context, null, 2)}
      </pre>
    </div>
  );
};

export default DebugPanel;