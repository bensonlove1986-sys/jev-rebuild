// @deprecated - replaced by chat_v3
import React, { useState } from 'react';
import { useCustomersStore } from '../../store/customersStore';
import { useMessagesStore } from '../../store/messagesStore';
import MessageTimeline from './MessageTimeline_v2';
import ChatComposer from './ChatComposer_v2';
import AISuggestionPlugin from './AISuggestionPlugin_v2';
import SystemNoticePlugin from './SystemNoticePlugin_v2';
import DebugPanel from './DebugPanel_v2';

interface ChatShellProps {
  isDevelopment?: boolean;
}

const ChatShell: React.FC<ChatShellProps> = ({ isDevelopment = import.meta.env.DEV }) => {
  const [inputText, setInputText] = useState('');
  
  // 获取store数据
  const { selectedCustomerId = null } = useCustomersStore();
  const { messages = {}, sendMessage } = useMessagesStore();
  
  // 获取当前客户的消息
  const customerMessages = selectedCustomerId ? messages[selectedCustomerId] || [] : [];
  
  // 构建聊天上下文
  const chatContext = {
    selectedCustomerId,
    customerMessages,
    // 使用相对路径，由浏览器/代理处理
    api_base: '/',
    mode: isDevelopment ? 'development' : 'production'
  };
  
  // 构建插件钩子
  const pluginHooks = {
    onSetComposerText: setInputText,
    onSend: (text: string) => {
      if (!text || !selectedCustomerId || !sendMessage) return;
      
      // 生成唯一的message_id
      const messageId = `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // 调用现有sendMessage函数
      sendMessage(selectedCustomerId, text, messageId);
      
      // 清空输入框
      setInputText('');
    }
  };

  return (
    <div className="chat-container">
      <div className="chat-header">Chat</div>
      
      <DebugPanel context={chatContext} />
      
      <div className="chat-body">
        <SystemNoticePlugin context={chatContext} hooks={pluginHooks} />
        <MessageTimeline context={chatContext} hooks={pluginHooks} />
      </div>
      
      <div className="chat-footer">
        <ChatComposer inputText={inputText} setInputText={setInputText} />
        <AISuggestionPlugin context={chatContext} hooks={pluginHooks} />
      </div>
    </div>
  );
};

export default ChatShell;