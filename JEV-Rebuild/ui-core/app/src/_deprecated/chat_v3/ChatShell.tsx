import React from 'react';
import CustomersList from './CustomersList';
import { useCustomersStore } from '../../store/customersStore';
import './chat_v3.css';

const ChatShell: React.FC<any> = ({ context }) => {
  console.log('>>> CHAT_V3 CHAT_SHELL EXECUTED');
  // 从store获取selectCustomer方法
  const { selectCustomer } = useCustomersStore();

  // 处理客户选择
  const handleSelectCustomer = (customerId: any) => {
    selectCustomer(customerId);
  };

  return (
    <div style={{ display: 'flex', height: '100%', width: '100%', position: 'relative' }}>
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
      <div style={{ width: '320px', height: '100%', background: '#ffffff', borderRight: '1px solid #e9ecef', position: 'relative', zIndex: 10 }}>
        <div style={{ padding: '16px', fontSize: '16px', fontWeight: 500, borderBottom: '1px solid #e9ecef' }}>
          客户列表
        </div>
        <div style={{ height: 'calc(100% - 52px)', overflow: 'auto' }}>
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
                transition: 'background-color 0.2s' 
              }}
              onClick={() => handleSelectCustomer(customer.id)}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9f9f9'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ffffff'}
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
      <div style={{ flex: 1, height: '100%', background: '#ffffff', position: 'relative', zIndex: 5 }}>
        <div style={{ padding: '16px', fontSize: '16px', fontWeight: 500, borderBottom: '1px solid #e9ecef' }}>
          {context.customer?.name || '未选择客户'}
        </div>
        
        <div style={{ height: 'calc(100% - 116px)', padding: '16px', overflow: 'auto' }}>
          {context.messages.length === 0 ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: '#999999' }}>
              请从左侧选择一个客户开始聊天
            </div>
          ) : (
            context.messages.map((message, index) => (
              <div key={index} style={{ marginBottom: '16px' }}>
                <div style={{ 
                  maxWidth: '70%', 
                  padding: '12px 16px', 
                  borderRadius: '18px', 
                  backgroundColor: message.role === 'customer' ? '#f0f0f0' : '#e6f7ff', 
                  alignSelf: message.role === 'customer' ? 'flex-start' : 'flex-end',
                  marginLeft: message.role === 'customer' ? 0 : 'auto'
                }}>
                  {message.text}
                </div>
              </div>
            ))
          )}
        </div>
        
        <div style={{ padding: '8px 16px', borderTop: '1px solid #f0f0f0', borderBottom: '1px solid #f0f0f0' }}>
          <button style={{ padding: '4px 12px', border: '1px solid #d9d9d9', borderRadius: '16px', background: '#ffffff', fontSize: '12px', cursor: 'pointer' }}>
            AI 建议发送
          </button>
        </div>
        
        <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <textarea 
            style={{ flex: 1, height: '40px', padding: '8px 12px', border: '1px solid #d9d9d9', borderRadius: '20px', resize: 'none', outline: 'none' }} 
            placeholder="输入消息..."
            value={context.inputText}
            onChange={(e) => context.setInputText(e.target.value)}
          />
          <button 
            style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#1890ff', border: 'none', color: 'white', cursor: 'pointer' }}
            onClick={() => context.onSend(context.inputText)}
          >
            ➤
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatShell;