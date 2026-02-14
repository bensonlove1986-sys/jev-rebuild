import React, { useState, useEffect } from 'react';
import dayjs from 'dayjs';
import { JEV_RUNTIME } from '@/core/jev_runtime_config';
import whatsAppInboxService from '@/services/WhatsAppInboxService';
import './ConversationList.css';

// 时间格式化函数
const formatChatTime = (ts: number): string => {
  if (!ts) return '';
  
  const now = dayjs();
  const messageTime = dayjs(ts);
  const diffDays = now.diff(messageTime, 'day');
  
  // 今天
  if (diffDays === 0) {
    return messageTime.format('HH:mm');
  }
  
  // 昨天
  if (diffDays === 1) {
    return `昨天 ${messageTime.format('HH:mm')}`;
  }
  
  // 7天内
  if (diffDays < 7) {
    const weekday = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][messageTime.day()];
    return `${weekday} ${messageTime.format('HH:mm')}`;
  }
  
  // 今年内
  if (messageTime.year() === now.year()) {
    return messageTime.format('MM-DD HH:mm');
  }
  
  // 跨年
  return messageTime.format('YYYY-MM-DD HH:mm');
};

interface Conversation {
  id: string;
  phone?: string;
  name?: string;
  lastMessage?: any;
  lastMessageTime?: number;
  unreadCount: number;
}

interface ConversationListProps {
  conversations: Conversation[];
  selectedPhone: string | null;
  onSelect: (phone: string) => void;
  onDeleteContacts?: (contactIds: string[]) => void;
}

const ConversationListItem: React.FC<{
  conversation: Conversation;
  isSelected: boolean;
  onSelect: (phone: string) => void;
  isSelectionMode: boolean;
  isContactSelected: boolean;
  onContactSelect: (id: string) => void;
}> = ({ 
  conversation, 
  isSelected, 
  onSelect, 
  isSelectionMode, 
  isContactSelected, 
  onContactSelect 
}) => {
  const { id, name, lastMessage, lastMessageTime, unreadCount } = conversation;
  
  // 生成首字母作为头像（如果没有WhatsApp图标）
  const getInitials = (id: string) => {
    return id.replace(/\D/g, '').slice(-2).toUpperCase();
  };
  
  // 获取显示名称
  const displayName = name || id;
  
  // 获取最后一条消息的文本内容
  const getLastMessageText = (msg: any) => {
    if (!msg) return '暂无消息';
    if (typeof msg === 'string') return msg;
    
    // 处理不同类型的消息结构
    if (msg.text) {
      return typeof msg.text === 'string' ? msg.text : '暂无消息';
    } else if (msg.content?.text) {
      return typeof msg.content.text === 'string' ? msg.content.text : '暂无消息';
    } else if (msg.type === 'image' || msg.kind === 'image') {
      return '[图片消息]';
    } else if (msg.type === 'video') {
      return '[视频消息]';
    } else if (msg.type === 'audio') {
      return '[音频消息]';
    } else if (msg.type === 'file') {
      return '[文件消息]';
    } else if (msg.type === 'location') {
      return '[位置消息]';
    } else if (msg.type === 'contact') {
      return '[联系人消息]';
    }
    
    // 处理其他可能的消息结构
    if (msg.originalText) {
      return typeof msg.originalText === 'string' ? msg.originalText : '暂无消息';
    } else if (msg.translatedText) {
      return typeof msg.translatedText === 'string' ? msg.translatedText : '暂无消息';
    }
    
    return '暂无消息';
  };

  // 处理选择框变化
  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    onContactSelect(id);
  };
  
  // 处理选择框点击
  const handleCheckboxClick = (e: React.MouseEvent<HTMLInputElement>) => {
    e.stopPropagation();
  };
  
  return (
    <div 
      className={`conversation-item ${isSelected ? 'selected' : ''} ${isContactSelected ? 'contact-selected' : ''} ${isSelectionMode ? 'selection-mode' : ''}`}
      onClick={() => !isSelectionMode && id && onSelect(id)}
    >
      {isSelectionMode && (
        <div className="contact-checkbox">
          <input
            type="checkbox"
            checked={isContactSelected}
            onChange={handleCheckboxChange}
            onClick={handleCheckboxClick}
          />
        </div>
      )}
      <div className="conversation-avatar">
        <div className="whatsapp-avatar">
          <span className="whatsapp-icon">📱</span>
        </div>
      </div>
      <div className="conversation-info">
        <div className="conversation-header">
          <div className="conversation-name">{displayName}</div>
          <div className="conversation-meta">
            <div className="conversation-time">
              {formatChatTime(lastMessageTime || 0)}
            </div>
            {unreadCount > 0 && (
              <div className="conversation-unread">{unreadCount}</div>
            )}
          </div>
        </div>
        <div className="conversation-preview">
          <span className="last-message">
            {getLastMessageText(lastMessage)}
          </span>
        </div>
      </div>
    </div>
  );
};

const ConversationList: React.FC<ConversationListProps> = ({ 
  conversations, 
  selectedPhone, 
  onSelect,
  onDeleteContacts
}) => {
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  
  // 记录接收到的 conversations 数据
  useEffect(() => {
    console.log('[CONVERSATION_LIST_RECEIVED]', conversations.length, conversations);
  }, [conversations]);
  
  // 组件加载时打印时间格式化启用日志
  useEffect(() => {
    console.log('[TIME_FORMAT_V2_ENABLED]');
  }, []);

  // 进入选择模式
  const handleEnterSelectionMode = () => {
    setIsSelectionMode(true);
    setSelectedContacts([]);
  };

  // 退出选择模式
  const handleExitSelectionMode = () => {
    setIsSelectionMode(false);
    setSelectedContacts([]);
  };

  // 选择/取消选择联系人
  const handleContactSelect = (contactId: string) => {
    setSelectedContacts(prev => {
      if (prev.includes(contactId)) {
        return prev.filter(id => id !== contactId);
      } else {
        return [...prev, contactId];
      }
    });
  };

  // 删除选中的联系人
  const handleDeleteContacts = async () => {
    if (selectedContacts.length > 0) {
      try {
        // 循环删除每个选中的联系人
        for (const contactId of selectedContacts) {
          console.log("[UI_CONTACT_DELETE_REQ]", contactId);
          
          // 调用后端删除接口
          const response = await fetch(`${JEV_RUNTIME.API_BASE}/inbox/contact?customer_id=${encodeURIComponent(contactId)}`, {
            method: "DELETE"
          });
          
          if (!response.ok) {
            throw new Error(`Delete failed: ${response.status}`);
          }
          
          const result = await response.json();
          console.log("[UI_CONTACT_DELETE_OK]", result.customer_id);
        }
        
        // 成功后刷新联系人列表
        await whatsAppInboxService.loadContactList();
        console.log("[UI_CONTACT_LIST_REFRESHED]");
        
        // 调用父组件提供的删除回调函数
        if (onDeleteContacts) {
          onDeleteContacts(selectedContacts);
        }
        
      } catch (error) {
        console.error("[UI_CONTACT_DELETE_ERROR]", error);
        // 即使失败也刷新联系人列表
        await whatsAppInboxService.loadContactList();
      } finally {
        // 退出选择模式
        setIsSelectionMode(false);
        setSelectedContacts([]);
      }
    }
  };

  return (
    <div className="conversation-list-container">
      <div className="conversation-list-header" style={{ height: '56px', boxSizing: 'border-box' }}>
        <div className="whatsapp-logo">
          <span className="whatsapp-icon">📱</span>
          <h2>WhatsApp</h2>
        </div>
        {!isSelectionMode ? (
          <button className="select-button" onClick={handleEnterSelectionMode}>
            <span className="select-icon">☑️</span>
            <span className="select-text">选择</span>
          </button>
        ) : (
          <div className="selection-mode-actions">
            <button className="cancel-button" onClick={handleExitSelectionMode}>
              取消
            </button>
            <button 
              className="delete-button" 
              onClick={handleDeleteContacts}
              disabled={selectedContacts.length === 0}
            >
              删除 ({selectedContacts.length})
            </button>
          </div>
        )}
      </div>
      <div className="conversation-list">
        {conversations.length === 0 ? (
          <div className="no-conversations">暂无 WhatsApp 客户</div>
        ) : (
          conversations.map((conversation, index) => (
            <ConversationListItem
              key={conversation.id || `conversation-${index}`}
              conversation={conversation}
              isSelected={conversation.id === selectedPhone}
              onSelect={onSelect}
              isSelectionMode={isSelectionMode}
              isContactSelected={selectedContacts.includes(conversation.id)}
              onContactSelect={handleContactSelect}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default ConversationList;