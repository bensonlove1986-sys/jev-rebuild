import React from 'react';
import { List, Avatar, Badge, Space, Button } from 'antd';
import { StarOutlined, StarFilled, UserOutlined, GroupOutlined } from '@ant-design/icons';

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

interface ContactItemProps {
  contact: Contact;
  lastMessage: string;
  lastMessageTime: number;
  unreadCount: number;
  isFavorite: boolean;
  onContactClick: (contactId: string) => void;
  onFavoriteToggle: (contactId: string) => void;
}

const ContactItem: React.FC<ContactItemProps> = ({ 
  contact, 
  lastMessage, 
  lastMessageTime, 
  unreadCount, 
  isFavorite, 
  onContactClick, 
  onFavoriteToggle 
}) => {
  // 格式化时间
  const formatTime = (timestamp: number) => {
    // 如果 timestamp 为 0，显示空字符串
    if (!timestamp) {
      return '';
    }
    
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    // 今天的消息显示时间，否则显示日期和时间
    if (diffInHours < 24 && now.toDateString() === date.toDateString()) {
      return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleString('zh-CN', { 
        month: '2-digit', 
        day: '2-digit',
        hour: '2-digit', 
        minute: '2-digit'
      });
    }
  };
  
  // 处理点击事件
  const handleClick = () => {
    onContactClick(contact.id);
  };
  
  // 处理收藏切换
  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onFavoriteToggle(contact.id);
  };
  
  return (
    <List.Item
      className="contact-item"
      onClick={handleClick}
      actions={[
        <Button
          type="text"
          icon={isFavorite ? <StarFilled style={{ color: '#FFD700' }} /> : <StarOutlined />}
          onClick={handleFavoriteClick}
          size="small"
        />
      ]}
    >
      <List.Item.Meta
        avatar={
          <Badge status={contact.onlineStatus === 'online' ? 'success' : 'default'} offset={[15, 15]}>
            <Avatar
              src={contact.avatar}
              icon={contact.isGroup ? <GroupOutlined /> : <UserOutlined />}
              alt={contact.name}
              className="contact-avatar"
            />
          </Badge>
        }
        title={
          <div className="contact-name-container">
            <span className="contact-name">{contact.name}</span>
            <span className="contact-time">{formatTime(lastMessageTime)}</span>
          </div>
        }
        description={
          <Space direction="vertical" size={0} style={{ width: '100%' }}>
            <div className="contact-message-container">
              {contact.isGroup && (
                <span className="contact-message-sender">
                  {contact.name}: 
                </span>
              )}
              <span className="contact-message">
                {lastMessage || '暂无消息'}
              </span>
            </div>
            {unreadCount > 0 && (
              <Badge count={unreadCount} className="contact-unread-badge" />
            )}
          </Space>
        }
      />
    </List.Item>
  );
};

export default ContactItem;
