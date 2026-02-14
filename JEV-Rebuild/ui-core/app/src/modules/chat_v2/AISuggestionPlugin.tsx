import React from 'react';
import { generateAISuggestion } from '../../services/ai.service';

interface AISuggestionPluginProps {
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
  };
  hooks: {
    onSetComposerText: (text: string) => void;
  };
}

const AISuggestionPlugin: React.FC<AISuggestionPluginProps> = ({ context, hooks }) => {
  const { selectedCustomerId, customerMessages } = context;
  const { onSetComposerText } = hooks;

  const handleGenerateAISuggestion = () => {
    if (!selectedCustomerId) return;

    generateAISuggestion(
      selectedCustomerId,
      customerMessages
    ).then(res => {
      onSetComposerText(res.suggestion || '');
    }).catch(error => {
      console.error('Failed to generate AI suggestion:', error);
    });
  };

  return (
    <div className="ai-suggestion-plugin">
      <button
        onClick={handleGenerateAISuggestion}
        disabled={!selectedCustomerId}
      >
        AI 建议
      </button>
    </div>
  );
};

export default AISuggestionPlugin;