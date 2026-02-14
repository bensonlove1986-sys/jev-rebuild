import React, { useState } from 'react';
import { useCustomersStore } from '../store/customersStore';
import { useMessagesStore } from '../store/messagesStore';
import ChatShell from './chat_v3/ChatShell';
import ChatComposer from './chat_v3/ChatComposer';
import PluginsBar from './chat_v3/PluginsBar';
import AISuggestionPlugin from './chat_v3/plugins/AISuggestionPlugin';
import SystemNoticePlugin from './chat_v3/plugins/SystemNoticePlugin';
import SmartReplyPlugin from './chat_v3/plugins/SmartReplyPlugin';
import MessageTimeline from './chat_v3/MessageTimeline';
import { ErrorBoundary } from '../components/ErrorBoundary';

console.log('>>> CHAT_V3 MODULE LOADED');
console.log("[CHAT_ENTRY_ACTIVE]", "./modules/ChatModule_v3.tsx", "ChatModule_v3");

export default function ChatModule_v3() {
  return (
    <ChatSafe />
  );
}

function ChatSafe() {
  // 获取store数据
  const { selectedCustomerId = null, customers = [], selectCustomer } = useCustomersStore();
  const { messages = {}, sendMessage } = useMessagesStore();
  
  // 输入框文本状态
  const [inputText, setInputText] = useState('');
  
  // 获取当前选中的客户
  const currentCustomer = customers.find(c => c.customer_id === selectedCustomerId);
  
  // 获取当前客户的消息
  const customerMessages = selectedCustomerId ? messages[selectedCustomerId] || [] : [];
  
  // 格式化客户信息
  const formattedCustomer = currentCustomer ? {
    id: currentCustomer.customer_id,
    name: currentCustomer.stable_name || currentCustomer.customer_name || '未命名客户',
    meta: currentCustomer.source || ''
  } : null;
  
  // 处理选择客户
  const handleSelectCustomer = (customerId: string) => {
    if (selectCustomer) {
      selectCustomer(customerId);
    }
  };
  
  // 处理发送消息
  const handleSendMessage = (text: string, options?: { original_zh?: string; target_lang?: string }) => {
    if (!selectedCustomerId || !sendMessage || !text.trim()) return;
    
    // 生成唯一的message_id
    const messageId = `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // 调用现有sendMessage函数，传递翻译参数
    sendMessage(selectedCustomerId, text, messageId, options?.original_zh);
    setInputText('');
  };
  
  return (
    <div style={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'row', backgroundColor: '#f5f5f5' }}>
      {/* 可视性探针 */}
      <div 
        id="chat-v3-visibility-probe" 
        style={{ 
          position: 'fixed', 
          top: 8, 
          right: 8, 
          zIndex: 999999, 
          background: 'red', 
          color: 'white', 
          padding: '6px 10px', 
          fontSize: 12, 
        }} 
      >
        CHAT_V3_VISIBLE
      </div>
      
      {/* 左栏：客户列表 */}
      <div style={{ width: '320px', height: '100%', background: '#ffffff', borderRight: '1px solid #e9ecef', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '16px', fontSize: '16px', fontWeight: 500, borderBottom: '1px solid #e9ecef' }}>
          客户列表
        </div>
        <div style={{ flex: 1, overflow: 'auto' }}>
          {[
            { id: '1', name: '客户1', lastMessage: '你好，我想咨询一下产品', lastTime: '10:30' },
            { id: '2', name: '客户2', lastMessage: '这个产品多少钱？', lastTime: '09:15' },
            { id: '3', name: '客户3', lastMessage: '谢谢，我知道了', lastTime: '昨天' },
          ].map((customer) => (
            <div 
              key={customer.id} 
              style={{ 
                padding: '16px', 
                borderBottom: '1px solid #f0f0f0', 
                cursor: 'pointer', 
                transition: 'background-color 0.2s',
                backgroundColor: selectedCustomerId === customer.id ? '#f0f8ff' : '#ffffff'
              }}
              onClick={() => handleSelectCustomer(customer.id)}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = selectedCustomerId === customer.id ? '#f0f8ff' : '#f9f9f9'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = selectedCustomerId === customer.id ? '#f0f8ff' : '#ffffff'}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontWeight: 500 }}>{customer.name}</div>
                <div style={{ fontSize: '12px', color: '#999999' }}>{customer.lastTime}</div>
              </div>
              <div style={{ fontSize: '14px', color: '#666666', marginTop: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {customer.lastMessage}
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* 右栏：聊天区域 */}
      <div style={{ flex: 1, height: '100%', background: '#ffffff', display: 'flex', flexDirection: 'column' }}>
        {/* 聊天头部 */}
        <div style={{ padding: '16px', fontSize: '16px', fontWeight: 500, borderBottom: '1px solid #e9ecef' }}>
          {formattedCustomer?.name || '未命名客户'}
        </div>
        
        {/* 消息时间线 */}
        <div style={{ flex: 1, padding: '16px', overflow: 'auto' }}>
          <MessageTimeline 
            messages={customerMessages} 
            customer={formattedCustomer} 
          />
        </div>
        
        {/* 插件栏 - 无条件渲染 */}
        <div style={{ padding: '8px 16px', borderTop: '1px solid #f0f0f0', borderBottom: '1px solid #f0f0f0' }}>
          <PluginsBar>
            <AISuggestionPlugin disabled={!selectedCustomerId} />
            <SystemNoticePlugin />
            <SmartReplyPlugin 
              disabled={!selectedCustomerId} 
              customerId={selectedCustomerId || ''}
              customerLanguage={selectedCustomer?.language || 'auto'}
              onSend={(translatedText, originalText, targetLang) => {
                if (selectedCustomerId) {
                  handleSendMessage(translatedText, {
                    original_zh: originalText,
                    target_lang: targetLang
                  });
                }
              }}
            />
          </PluginsBar>
        </div>
        
        {/* 聊天输入框 - 无条件渲染，用disabled控制 */}
        <div style={{ padding: '12px 16px', position: 'relative' }}>
          <ChatComposer 
            inputText={inputText} 
            setInputText={setInputText} 
            onSend={handleSendMessage} 
            disabled={!selectedCustomerId}
            placeholder={selectedCustomerId ? '输入消息...' : '请选择左侧客户后开始聊天'}
          />
          {/* 强制可视化验证 */}
          <div style={{ position: 'absolute', bottom: 8, left: 8, background: 'green', color: '#fff', padding: '4px 8px', fontSize: 12, zIndex: 9999 }}>
            CHAT_COMPOSER_MOUNTED
          </div>
        </div>
      </div>
    </div>
  );
}