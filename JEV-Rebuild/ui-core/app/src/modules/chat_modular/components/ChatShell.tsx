import React, { useState } from 'react';
import { Layout } from 'antd';
import ContactList from './ContactList/ContactList';
import ChatInterface from './ChatInterface/ChatInterface';
import { useChatStore } from '../store/chatStore';

const { Sider, Content } = Layout;

const ChatShell: React.FC = () => {
  // 从store中获取选中的聊天ID
  // 使用稳定的 selector 订阅
  const selectedChatId = useChatStore((state) => state.selectedChatId);
  const setSelectedChatId = useChatStore((state) => state.setSelectedChatId);
  
  // 响应式状态
  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  
  // 处理窗口大小变化
  React.useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // 处理联系人选择
  const handleContactSelect = (contactId: string) => {
    setSelectedChatId(contactId);
    // 在移动端，选择联系人后隐藏联系人列表
    if (isMobile) {
      setCollapsed(true);
    }
  };
  
  // 处理返回联系人列表
  const handleBackToList = () => {
    setSelectedChatId(null);
    setCollapsed(false);
  };
  
  return (
    <Layout className="chat-shell" style={{ height: '100vh' }}>
      {/* 左侧联系人列表 */}
      <Sider
        width={isMobile ? '100%' : 320}
        collapsedWidth={isMobile ? 0 : 80}
        collapsed={selectedChatId && isMobile ? true : collapsed}
        onCollapse={setCollapsed}
        theme="light"
        className="contact-list-sider"
        breakpoint="lg"
        style={{ background: '#fff', borderRight: '1px solid #f0f0f0' }}
      >
        <ContactList onContactSelect={handleContactSelect} />
      </Sider>
      
      {/* 右侧聊天界面 */}
      <Content className="chat-interface-content">
        {selectedChatId ? (
          <ChatInterface 
            chatId={selectedChatId} 
            onBack={isMobile ? handleBackToList : undefined}
          />
        ) : (
          <div className="welcome-message">
            <h1>欢迎使用聊天系统</h1>
            <p>请选择一个联系人开始聊天</p>
          </div>
        )}
      </Content>
    </Layout>
  );
};

export default ChatShell;
