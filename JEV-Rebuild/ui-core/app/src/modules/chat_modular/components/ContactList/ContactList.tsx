import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { Input, List, Space, Button } from 'antd';
import { SearchOutlined, StarOutlined, StarFilled, MessageOutlined } from '@ant-design/icons';
import { useChatStore, eventEmitter } from '../../store/chatStore';
import { useContactStore } from '../../store/contactStore';
import ContactItem from './ContactItem';
import './ContactList.css';

// 直接在组件中定义 Contact 接口
type ContactStatus = 'online' | 'offline' | 'away' | 'busy';

interface Contact {
  id: string;
  name: string;
  phone: string;
  avatar?: string;
  status?: string;
  onlineStatus: ContactStatus;
  lastSeen?: number;
  isBlocked?: boolean;
  isFavorited?: boolean;
  createdAt: number;
  updatedAt: number;
  email?: string;
  country?: string;
  countryCode?: string;
  tags?: string[];
  isGroup?: boolean;
  groupSize?: number;
}

interface ContactListProps {
  onContactSelect: (contactId: string) => void;
}

const ContactList: React.FC<ContactListProps> = ({ onContactSelect }) => {
  // 从store中获取状态和方法
  // 使用稳定的 selector 订阅
  const chats = useChatStore((state) => state.chats);
  const updateChat = useChatStore((state) => state.updateChat);
  const { 
    searchQuery, 
    setSearchQuery, 
    filteredContacts,
    favoriteContacts, 
    toggleFavoriteContact,
    isLoadingContacts
  } = useContactStore();
  
  // 本地状态
  const [showFavorites, setShowFavorites] = useState(false);
  
  // 处理搜索
  const handleSearch = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  }, [setSearchQuery]);
  
  // 处理联系人选择
  const handleContactClick = useCallback((contactId: string) => {
    // 标记该联系人的未读消息为已读
    const chat = chats.get(contactId);
    if (chat && chat.unreadCount > 0) {
      console.log('[CONTACT_LIST] Marking contact as read:', contactId, 'unreadCount:', chat.unreadCount);
      // 使用 updateChat 方法将未读计数重置为 0
      updateChat(contactId, { unreadCount: 0 });
    }
    
    onContactSelect(contactId);
  }, [onContactSelect, chats, updateChat]);
  
  // 处理收藏切换
  const handleFavoriteToggle = useCallback((contactId: string) => {
    toggleFavoriteContact(contactId);
  }, [toggleFavoriteContact]);
  
  // 获取联系人的聊天信息
  const getContactChatInfo = useCallback((contact: Contact) => {
    const chat = chats.get(contact.id);
    if (chat) {
      // 处理 lastMessage 是字符串或对象的情况
      let lastMessageText = '';
      if (typeof chat.lastMessage === 'string') {
        lastMessageText = chat.lastMessage;
      } else if (chat.lastMessage) {
        // 处理不同类型的消息
        if (chat.lastMessage.text) {
          lastMessageText = chat.lastMessage.text;
        } else if (chat.lastMessage.type === 'image' || chat.lastMessage.kind === 'image') {
          lastMessageText = '[图片消息]';
        } else if (chat.lastMessage.type === 'video') {
          lastMessageText = '[视频消息]';
        } else if (chat.lastMessage.type === 'audio') {
          lastMessageText = '[音频消息]';
        } else if (chat.lastMessage.type === 'file') {
          lastMessageText = '[文件消息]';
        } else if (chat.lastMessage.type === 'location') {
          lastMessageText = '[位置消息]';
        } else if (chat.lastMessage.type === 'contact') {
          lastMessageText = '[联系人消息]';
        } else {
          lastMessageText = '[其他消息]';
        }
      }
      
      return {
        lastMessage: lastMessageText || '',
        lastMessageTime: chat.lastMessageTime || 0,
        unreadCount: chat.unreadCount || 0
      };
    }
    return {
      lastMessage: '',
      lastMessageTime: 0,
      unreadCount: 0
    };
  }, [chats]);
  
  // 过滤联系人
  const displayContacts = useMemo(() => {
    // 直接从 chats 中获取联系人，确保新消息的联系人总是显示
    const allContactsMap = new Map<string, Contact>();
    
    // 只添加/更新 chats 中的联系人，确保只显示有聊天记录的联系人
    chats.forEach((chat, chatId) => {
      const existingContact = filteredContacts.find(c => c.id === chatId);
      const chatContact: Contact = {
        id: chatId,
        name: chat.name,
        phone: chatId,
        onlineStatus: 'offline',
        createdAt: existingContact?.createdAt || chat.createdAt,
        updatedAt: chat.updatedAt
      };
      allContactsMap.set(chatId, chatContact);
    });
    
    // 转换为数组
    let contactsToDisplay = Array.from(allContactsMap.values());
    
    if (showFavorites) {
      contactsToDisplay = contactsToDisplay.filter(contact => favoriteContacts.has(contact.id));
    }
    
    // 按优先级排序：有聊天记录的联系人 > 未读消息 > 更新时间
    contactsToDisplay.sort((a, b) => {
      const chatA = chats.get(a.id);
      const chatB = chats.get(b.id);
      
      // 优先显示有聊天记录的联系人
      const hasChatA = !!chatA;
      const hasChatB = !!chatB;
      if (hasChatA !== hasChatB) {
        return hasChatB ? 1 : -1;
      }
      
      // 优先考虑未读消息
      const unreadA = chatA?.unreadCount || 0;
      const unreadB = chatB?.unreadCount || 0;
      if (unreadA !== unreadB) {
        return unreadB - unreadA; // 未读消息多的排在前面
      }
      
      // 未读消息数相同，按更新时间排序
      const updateTimeA = chatA?.updatedAt || a.updatedAt || 0;
      const updateTimeB = chatB?.updatedAt || b.updatedAt || 0;
      return updateTimeB - updateTimeA;
    });
    
    // 只在开发环境显示调试日志
    if (import.meta.env.DEV) {
      console.log('[CONTACT_LIST] Sorted contacts:', contactsToDisplay.map(c => ({
        id: c.id,
        name: c.name,
        unreadCount: chats.get(c.id)?.unreadCount || 0,
        updatedAt: chats.get(c.id)?.updatedAt || c.updatedAt
      })));
    }
    
    return contactsToDisplay;
  }, [filteredContacts, showFavorites, favoriteContacts, chats]);
  

  
  // 监听新消息事件，确保实时更新联系人列表
  useEffect(() => {
    const handleNewMessage = (chatId: string, message: any) => {
      // 只在开发环境显示调试日志
      if (import.meta.env.DEV) {
        console.log('[CONTACT_LIST] New message event received for chat:', chatId);
        console.log('[CONTACT_LIST] Message details:', message);
      }
      
      // useMemo 会自动处理依赖项变化，无需手动更新
    };
    
    // 订阅新消息事件
    eventEmitter.on('newMessage', handleNewMessage);
    
    // 只在开发环境显示调试日志
    if (import.meta.env.DEV) {
      console.log('[CONTACT_LIST] Subscribed to newMessage events');
    }
    
    // 清理订阅
    return () => {
      eventEmitter.off('newMessage', handleNewMessage);
      
      // 只在开发环境显示调试日志
      if (import.meta.env.DEV) {
        console.log('[CONTACT_LIST] Unsubscribed from newMessage events');
      }
    };
  }, []);
  
  return (
    <div className="contact-list-container">
      {/* 搜索栏 */}
      <div className="contact-list-header">
        <Space.Compact style={{ width: '100%' }}>
          <Input
            placeholder="搜索联系人"
            prefix={<SearchOutlined />}
            value={searchQuery}
            onChange={handleSearch}
            style={{ borderRight: 0, borderRadius: '8px 0 0 8px' }}
          />
          <Button 
            type={showFavorites ? 'primary' : 'default'}
            icon={showFavorites ? <StarFilled /> : <StarOutlined />}
            onClick={() => setShowFavorites(!showFavorites)}
            style={{ borderRadius: '0 8px 8px 0' }}
          />
        </Space.Compact>
      </div>
      
      {/* 联系人列表 */}
      <div className="contact-list-content">
        {isLoadingContacts ? (
          <div className="contact-list-loading">加载中...</div>
        ) : displayContacts.length === 0 ? (
          <div className="contact-list-empty">
            <MessageOutlined style={{ fontSize: '48px', color: '#ccc', marginBottom: '16px' }} />
            <p>{searchQuery ? '没有找到匹配的联系人' : '暂无联系人'}</p>
          </div>
        ) : (
          <List
            dataSource={displayContacts}
            renderItem={(contact) => {
              const chatInfo = getContactChatInfo(contact);
              return (
                <ContactItem
                  contact={contact}
                  lastMessage={chatInfo.lastMessage}
                  lastMessageTime={chatInfo.lastMessageTime}
                  unreadCount={chatInfo.unreadCount}
                  isFavorite={favoriteContacts.has(contact.id)}
                  onContactClick={handleContactClick}
                  onFavoriteToggle={handleFavoriteToggle}
                />
              );
            }}
            split={false}
          />
        )}
      </div>
    </div>
  );
};

export default ContactList;
