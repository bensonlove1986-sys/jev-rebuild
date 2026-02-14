import React, { useState } from 'react';
import TranslateReplyModal from './TranslateReplyModal';

interface SmartReplyPluginProps {
  disabled?: boolean;
  customerId?: string;
  customerLanguage?: string;
  onSend?: (translatedText: string, originalText: string, targetLang: string) => void;
}

const SmartReplyPlugin: React.FC<SmartReplyPluginProps> = ({
  disabled = false,
  customerId = '',
  customerLanguage = 'auto',
  onSend = () => {}
}) => {
  // 模态窗口可见性状态
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState<'translate' | 'auto'>('translate');
  // 下拉菜单可见性状态
  const [isDropdownVisible, setIsDropdownVisible] = useState(false);
  
  // 处理插件按钮点击
  const handlePluginClick = () => {
    if (disabled) return;
    // 切换下拉菜单显示状态
    setIsDropdownVisible(!isDropdownVisible);
  };
  
  // 处理模态窗口关闭
  const handleModalClose = () => {
    setIsModalVisible(false);
  };
  
  // 处理发送翻译结果
  const handleSend = (translatedText: string, originalText: string, targetLang: string) => {
    onSend(translatedText, originalText, targetLang);
    setIsModalVisible(false);
    // 发送后关闭下拉菜单
    setIsDropdownVisible(false);
  };
  
  // 处理自动回复
  const handleAutoReply = () => {
    if (disabled) return;
    if (!customerId) {
      alert('请先选择一个客户');
      setIsDropdownVisible(false);
      return;
    }
    console.log('Auto reply clicked for customer:', customerId);
    // 这里可以添加自动回复的逻辑
    // 例如：调用AI生成回复内容，然后自动发送
    setModalMode('auto');
    // 模拟自动回复流程
    simulateAutoReply();
    // 关闭下拉菜单
    setIsDropdownVisible(false);
  };
  
  // 模拟自动回复流程
  const simulateAutoReply = () => {
    console.log('[AUTO_REPLY] Simulating auto reply...');
    // 这里可以添加实际的自动回复逻辑
    // 例如：调用AI服务生成回复，然后通过onSend发送
    // 这里仅作为示例
    const autoReplyText = '这是一条自动回复示例消息。';
    handleSend(autoReplyText, autoReplyText, customerLanguage);
  };
  
  // 处理翻译回复
  const handleTranslateReply = () => {
    if (disabled) return;
    if (!customerId) {
      alert('请先选择一个客户');
      setIsDropdownVisible(false);
      return;
    }
    setModalMode('translate');
    setIsModalVisible(true);
    // 关闭下拉菜单
    setIsDropdownVisible(false);
  };
  
  return (
    <>
      {/* 智能回复插件按钮 */}
      <div style={{ position: 'relative', display: 'inline-block' }}>
        <button
          className={`chat-v3-plugin ${disabled ? 'chat-v3-plugin-disabled' : ''}`}
          onClick={handlePluginClick}
          disabled={disabled}
          title="智能回复 (翻译/自动)"
          style={{
            opacity: disabled ? 0.6 : 1,
            cursor: disabled ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}
        >
          🤖 智能回复 ▼
        </button>
        
        {/* 下拉菜单 */}
        {isDropdownVisible && (
          <div style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            marginTop: '4px',
            backgroundColor: 'white',
            border: '1px solid #e0e0e0',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            zIndex: 1000,
            minWidth: '150px',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <button
              onClick={handleTranslateReply}
              style={{
                padding: '12px 16px',
                border: 'none',
                backgroundColor: 'transparent',
                cursor: 'pointer',
                textAlign: 'left',
                fontSize: '14px',
                transition: 'background-color 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f0f0f0'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              🌍 翻译回复
            </button>
            <div style={{ height: '1px', backgroundColor: '#f0f0f0', margin: '0 8px' }}></div>
            <button
              onClick={handleAutoReply}
              style={{
                padding: '12px 16px',
                border: 'none',
                backgroundColor: 'transparent',
                cursor: 'pointer',
                textAlign: 'left',
                fontSize: '14px',
                transition: 'background-color 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f0f0f0'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              🤖 自动回复
            </button>
          </div>
        )}
      </div>
      
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

export default SmartReplyPlugin;