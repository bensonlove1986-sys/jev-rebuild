// @deprecated
// second generation chat UI
import React from 'react';
import { generateAISuggestion } from '../../services/ai.service';

interface AISuggestionPluginProps {
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

const AISuggestionPlugin: React.FC<AISuggestionPluginProps> = ({ context, hooks }) => {
  const handleGenerateSuggestion = () => {
    if (!context.selectedCustomerId) return;

    generateAISuggestion(
      context.selectedCustomerId,
      context.customerMessages
    ).then(res => {
      hooks.onSetComposerText(res.suggestion || '');
    }).catch(error => {
      console.error('Failed to generate AI suggestion:', error);
    });
  };

  return (
    <button
      className="chat-plugin ai-suggestion"
      onClick={handleGenerateSuggestion}
      disabled={!context.selectedCustomerId}
    >
      AI 建议
    </button>
  );
};

export default AISuggestionPlugin;