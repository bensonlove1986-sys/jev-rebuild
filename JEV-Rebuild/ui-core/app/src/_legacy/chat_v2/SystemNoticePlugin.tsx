// @deprecated
// second generation chat UI
import React from 'react';

interface SystemNoticePluginProps {
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

const SystemNoticePlugin: React.FC<SystemNoticePluginProps> = () => {
  return null;
};

export default SystemNoticePlugin;