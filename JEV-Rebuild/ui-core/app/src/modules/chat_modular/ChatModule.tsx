import React, { useEffect } from 'react';
import ChatLayout from './components/ChatLayout';
import whatsAppInboxService from '../../services/WhatsAppInboxService';
import './styles/chat_module.css';

const ChatModule: React.FC = () => {
  useEffect(() => {
    console.log('[CHAT_MODULE_MOUNTED] ChatModule component mounted');
    // 强制加载 CONTACT_INDEX 客户列表
    console.log('[CHAT_MODULE_LOAD_CUSTOMERS] Forcing load of CONTACT_INDEX customer list');
    whatsAppInboxService.loadContactList();
  }, []);

  return (
    <div className="chat-module" style={{ 
      display: 'flex', 
      flexDirection: 'row', 
      height: '100%', 
      width: '100%', 
      overflow: 'hidden', 
      backgroundColor: '#f0f2f5'
    }}>
      <ChatLayout />
    </div>
  );
};

export default ChatModule;