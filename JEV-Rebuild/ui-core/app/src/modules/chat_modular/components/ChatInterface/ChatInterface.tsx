import React, { useState, useEffect, useRef } from 'react';
import { Layout, Button, Dropdown, Menu, Space, message } from 'antd';
import { ArrowLeftOutlined, MoreOutlined, PhoneOutlined, VideoCameraOutlined } from '@ant-design/icons';
import { useChatStore } from '../../store/chatStore';
import whatsAppInboxService from '../../../services/WhatsAppInboxService';
import { useContactStore } from '../../store/contactStore';
import { safeFetch } from '../../../../main';
import MessageList from './MessageList';
import MessageInput from '../MessageInput/MessageInput';
import { JEV_RUNTIME } from '@/core/jev_runtime_config';
import './ChatInterface.css';

interface MessagePayload {
  chat_id: string;
  customer_id: string;
  kind: 'text' | 'image';
  text?: string;
  media_path?: string;
  mime?: string;
  source: string;
};

const { Header, Content, Footer } = Layout;

interface ChatInterfaceProps {
  chatId: string;
  onBack?: () => void;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ chatId, onBack }) => {
  // 从store中获取状态和方法
  // 使用稳定的 selector 订阅
  const chats = useChatStore((state) => state.chats);
  const messages = useChatStore((state) => state.messages);
  // 不再直接使用addMessage，而是通过WhatsAppInboxService发送消息
  const setSelectedChatId = useChatStore((state) => state.setSelectedChatId);
  const updateMessageStatus = useChatStore((state) => state.updateMessageStatus);
  const deleteMessage = useChatStore((state) => state.deleteMessage);
  const { getContactById } = useContactStore();
  
  // 选择模式状态
  const [selectMode, setSelectMode] = useState(false);
  const [selectedMessages, setSelectedMessages] = useState(new Set<string>());
  
  // 使用统一的 WhatsAppInboxService WebSocket 服务
  useEffect(() => {
    // 确保 WhatsAppInboxService 已初始化
    if (whatsAppInboxService && !whatsAppInboxService.isInitialized) {
      console.log('[INIT_WA_SERVICE] Initializing WhatsAppInboxService');
      whatsAppInboxService.init();
    }
  }, []);
  
  // 获取聊天信息
  const chat = chats.get(chatId);
  
  // 获取联系人信息
  const contact = chat ? getContactById(chatId) : undefined;
  
  // 获取聊天消息
  const chatMessages = (messages as any)[chatId] || [];
  
  // 处理发送消息
  const handleSendMessage = async (text: string) => {
    if (!text.trim()) return;
    
    try {
      // 直接调用outbound API发送WhatsApp消息
      const response = await safeFetch("/api/outbound/whatsapp", {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          to: chatId,
          text: text.trim()
        })
      });
      
      // 打印最终 URL
      console.log('[OUTBOUND_FINAL_URL]', response.url);
      
      if (response.ok) {
        const data = await response.json();
        console.log('消息发送成功:', data);
        
        // 只有当返回twilio_sid时才添加消息
        if (data.twilio_sid) {
          // 创建最终消息对象
          const finalMessage = {
            id: data.twilio_sid,
            message_id: data.twilio_sid,
            chatId: chatId,
            from: 'operator',
            to: chatId,
            type: 'text' as const,
            text: text.trim(),
            direction: 'outbound' as const,
            status: 'sent' as const,
            timestamp: Date.now(),
            isGroup: chat?.type === 'group' || false,
            twilio_sid: data.twilio_sid
          };
          
          // 添加最终消息到store
          whatsAppInboxService.sendMessage(finalMessage);
        } else {
          console.error('消息发送失败: 缺少twilio_sid');
          message.error('发送失败: 缺少twilio_sid');
          throw new Error('NO_TWILIO_SID');
        }
      } else {
        const errorData = await response.json();
        console.error('消息发送失败:', errorData);
        const errorMessage = errorData.error || errorData.message || '未知错误';
        message.error(`发送失败: ${errorMessage}`);
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error('发送消息时发生错误:', error);
      const errorMessage = error instanceof Error ? error.message : '网络错误';
      message.error(`发送失败: ${errorMessage}`);
    }
  };
  
  // 处理发送图片消息
  const handleSendImage = async (mediaPath: string, mime: string) => {
    try {
      // 创建 media_source 对象
      let media_source;
      if (mediaPath.startsWith('data:')) {
        media_source = { type: "dataUrl", dataUrl: mediaPath };
      } else {
        media_source = { type: "remoteUrl", remoteUrl: mediaPath };
      }
      
      // 直接调用outbound API发送WhatsApp图片消息
      console.log('[OUTBOUND_IMAGE_SEND_REQUEST]', {
        to: chatId,
        media_source: media_source
      });
      
      const response = await safeFetch("/api/outbound/whatsapp", {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          to: chatId,
          text: '[图片]',
          media_source: media_source
        })
      });
      
      // 打印最终 URL
      console.log('[OUTBOUND_FINAL_URL]', response.url);
      
      if (response.ok) {
        const data = await response.json();
        console.log('图片消息发送成功:', data);
        
        // 处理响应，无论是否有twilio_sid
        if (data.ok) {
          // 创建最终消息对象
          const finalMessage = {
            id: data.twilio_sid || `msg_local_${Date.now()}`,
            message_id: data.twilio_sid || `msg_local_${Date.now()}`,
            chatId: chatId,
            from: 'operator',
            to: chatId,
            type: 'image' as const,
            text: '[图片]',
            media_path: mediaPath,
            media_source: media_source,
            direction: 'outbound' as const,
            status: 'sent' as const,
            timestamp: Date.now(),
            isGroup: chat?.type === 'group' || false,
            twilio_sid: data.twilio_sid
          };
          
          // 添加最终消息到store
          whatsAppInboxService.sendMessage(finalMessage);
        } else {
          console.error('图片消息发送失败:', data.error);
          message.error(`发送失败: ${data.error || '未知错误'}`);
          throw new Error(data.error || '发送失败');
        }
      } else {
        const errorData = await response.json();
        console.error('图片消息发送失败:', errorData);
        const errorMessage = errorData.error || errorData.message || '未知错误';
        message.error(`发送失败: ${errorMessage}`);
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error('发送图片消息时发生错误:', error);
      const errorMessage = error instanceof Error ? error.message : '网络错误';
      message.error(`发送失败: ${errorMessage}`);
    }
  };
  
  // 处理返回按钮点击
  const handleBackClick = () => {
    if (onBack) {
      onBack();
    } else {
      setSelectedChatId(null);
    }
  };
  
  // 切换选择模式
  const toggleSelectMode = () => {
    setSelectMode(prev => !prev);
    setSelectedMessages(new Set());
  };
  
  // 处理消息选择
  const handleSelectMessage = (messageId: string, selected: boolean) => {
    setSelectedMessages(prev => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(messageId);
      } else {
        newSet.delete(messageId);
      }
      return newSet;
    });
  };
  
  // 批量删除消息
  const handleBatchDelete = () => {
    const messageIds = Array.from(selectedMessages);
    if (messageIds.length > 0) {
      // 显示确认对话框
      if (window.confirm(`确定要删除选中的 ${messageIds.length} 条消息吗？`)) {
        // 批量删除消息
        messageIds.forEach(messageId => {
          deleteMessage(chatId, messageId);
        });
        // 清空选择
        setSelectedMessages(new Set());
        // 退出选择模式
        setSelectMode(false);
        // 显示成功提示
        message.success(`已删除 ${messageIds.length} 条消息`);
      }
    }
  };
  
  // 全选消息
  const selectAllMessages = () => {
    const chatMessages = (messages as any)[chatId] || [];
    const allMessageIds = new Set(chatMessages.map(msg => msg.id || msg.message_id));
    setSelectedMessages(allMessageIds);
  };
  
  // 取消全选
  const deselectAllMessages = () => {
    setSelectedMessages(new Set());
  };
  
  // 聊天不存在时的处理
  if (!chat) {
    return (
      <div className="chat-not-found">
        <h1>聊天不存在</h1>
        <Button type="primary" onClick={handleBackClick}>
          返回联系人列表
        </Button>
      </div>
    );
  }
  
  return (
    <Layout className="chat-interface" style={{ height: '100vh' }}>
      {/* 聊天头部 */}
      <Header className="chat-header">
        {selectMode ? (
          /* 选择模式头部 */
          <Space className="chat-header-select-mode" style={{ width: '100%', justifyContent: 'space-between', alignItems: 'center' }}>
            <Space>
              <Button
                type="text"
                icon={<ArrowLeftOutlined />}
                onClick={toggleSelectMode}
                className="chat-back-button"
              />
              <span className="selected-count">
                已选择 {selectedMessages.size} 条消息
              </span>
            </Space>
            <Space>
              <Button type="text" onClick={selectAllMessages}>全选</Button>
              <Button type="text" danger onClick={handleBatchDelete}>
                删除
              </Button>
            </Space>
          </Space>
        ) : (
          /* 普通模式头部 */
          <>
            <Space className="chat-header-left">
              {onBack && (
                <Button
                  type="text"
                  icon={<ArrowLeftOutlined />}
                  onClick={handleBackClick}
                  className="chat-back-button"
                />
              )}
              <div className="chat-header-avatar">
                <img src={chat.avatar} alt={chat.name} className="chat-avatar" />
              </div>
              <div className="chat-header-info">
                <h3 className="chat-title">{chat.name}</h3>
                <p className="chat-status">
                  {contact?.status || (contact?.onlineStatus === 'online' ? '在线' : '离线')}
                </p>
              </div>
            </Space>
            
            <Space className="chat-header-right">
              <Button type="text" icon={<PhoneOutlined />} className="chat-action-button" />
              <Button type="text" icon={<VideoCameraOutlined />} className="chat-action-button" />
              <Button type="text" onClick={toggleSelectMode} className="chat-action-button">
                选择
              </Button>
              <Dropdown
                overlay={( 
                  <Menu>
                    <Menu.Item key="1">查看联系人信息</Menu.Item>
                    <Menu.Item key="2">清空聊天记录</Menu.Item>
                    <Menu.Item key="3">删除聊天</Menu.Item>
                    <Menu.Item key="4">静音</Menu.Item>
                    <Menu.Item key="5">置顶聊天</Menu.Item>
                  </Menu>
                )}
                trigger={['click']}
              >
                <Button type="text" icon={<MoreOutlined />} className="chat-action-button" />
              </Dropdown>
            </Space>
          </>
        )}
      </Header>
      
      {/* 消息列表 */}
      <Content className="chat-content">
        <MessageList 
          messages={chatMessages} 
          selectMode={selectMode}
          selectedMessages={selectedMessages}
          onSelectMessage={handleSelectMessage}
        />
      </Content>
      
      {/* 消息输入框 */}
      <Footer className="chat-footer">
        <MessageInput 
          onSendMessage={handleSendMessage}
          onSendImage={handleSendImage}
        />
      </Footer>
    </Layout>
  );
};

export default ChatInterface;
