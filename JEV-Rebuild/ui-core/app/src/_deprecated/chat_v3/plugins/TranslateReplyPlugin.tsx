import React, { useState } from 'react';
import TranslateReplyModal from './TranslateReplyModal';

interface TranslateReplyPluginProps {
  disabled?: boolean;
  customerId?: string;
  customerLanguage?: string;
  onSend?: (translatedText: string, originalText: string, targetLang: string) => void;
}

const TranslateReplyPlugin: React.FC<TranslateReplyPluginProps> = ({ 
  disabled = false, 
  customerId = '',
  customerLanguage = 'auto',
  onSend = () => {}
}) => {
  // 模态窗口可见性状态
  const [isModalVisible, setIsModalVisible] = useState(false);
  
  // 处理插件按钮点击
  const handlePluginClick = () => {
    if (disabled || !customerId) return;
    setIsModalVisible(true);
  };
  
  // 处理模态窗口关闭
  const handleModalClose = () => {
    setIsModalVisible(false);
  };
  
  // 处理发送翻译结果
  const handleSend = (translatedText: string, originalText: string, targetLang: string) => {
    onSend(translatedText, originalText, targetLang);
    setIsModalVisible(false);
  };
  
  return (
    <>
      {/* 翻译回复插件按钮 */}
      <button
        className={`chat-v3-plugin ${disabled ? 'chat-v3-plugin-disabled' : ''}`}
        onClick={handlePluginClick}
        disabled={disabled || !customerId}
        title="翻译回复"
        style={{
          opacity: (disabled || !customerId) ? 0.6 : 1,
          cursor: (disabled || !customerId) ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '4px'
        }}
      >
        🌍 翻译回复
      </button>
      
      {/* 翻译回复模态窗口 */}
      <TranslateReplyModal
        isVisible={isModalVisible}
        onClose={handleModalClose}
        customerId={customerId}
        customerLanguage={customerLanguage}
        onSend={handleSend}
      />
    </>
  );
};

export default TranslateReplyPlugin;
