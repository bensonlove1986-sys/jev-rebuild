// @deprecated
// second generation chat UI
import React, { Suspense } from 'react';
import { useCustomersStore } from '../../store/customersStore';
import { useMessagesStore } from '../../store/messagesStore';

// 使用React.lazy实现组件懒加载
export default function ChatModule() {
  return (
    <Suspense fallback={<div className="p-4 text-center">Loading...</div>}>
      <ChatContent />
    </Suspense>
  );
}

function ChatContent() {
  // 使用React Suspense兼容的方式获取store状态
  const { selectedCustomerId = null, customers = [] } = useCustomersStore();
  const { messages = {}, sendMessage } = useMessagesStore();
  
  // 获取当前选中的客户
  const currentCustomer = customers.find(c => c.customer_id === selectedCustomerId);
  
  // 获取当前客户的消息
  const customerMessages = selectedCustomerId ? messages[selectedCustomerId] || [] : [];
  
  // 动态加载Chat组件
  const Chat = React.lazy(() => import('../../components/Chat'));
  
  return (
    <div className="flex flex-col h-full bg-white shadow">
      <Chat />
    </div>
  );
}