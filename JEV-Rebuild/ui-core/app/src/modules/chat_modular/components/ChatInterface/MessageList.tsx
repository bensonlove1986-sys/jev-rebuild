import React, { useRef, useEffect } from 'react';
import { List } from 'antd';
import { Message } from '../../store/chatStore';
import MessageBubble from './MessageBubble';
import './MessageList.css';

interface MessageListProps {
  messages: Message[];
  onDelete?: (messageId: string) => void;
  // 选择模式相关 props
  selectMode?: boolean;
  selectedMessages?: Set<string>;
  onSelectMessage?: (messageId: string, selected: boolean) => void;
  onBatchDelete?: (messageIds: string[]) => void;
}

const MessageList: React.FC<MessageListProps> = ({ 
  messages, 
  onDelete,
  selectMode = false,
  selectedMessages = new Set(),
  onSelectMessage,
  onBatchDelete
}) => {
  // 用于自动滚动到底部的ref
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // 自动滚动到底部
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  // 当消息列表变化时滚动到底部
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  // 格式化日期
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };
  
  // 按日期分组消息
  const groupMessagesByDate = () => {
    const groupedMessages: Record<string, Message[]> = {};
    
    messages.forEach(message => {
      const date = new Date(message.timestamp).toDateString();
      if (!groupedMessages[date]) {
        groupedMessages[date] = [];
      }
      groupedMessages[date].push(message);
    });
    
    return Object.entries(groupedMessages);
  };
  
  // 处理消息删除
  const handleMessageDelete = (messageId: string) => {
    if (onDelete) {
      onDelete(messageId);
    }
  };
  
  // 处理消息选择
  const handleMessageSelect = (messageId: string, selected: boolean) => {
    if (onSelectMessage) {
      onSelectMessage(messageId, selected);
    }
  };
  
  const groupedMessages = groupMessagesByDate();
  
  return (
    <div className="message-list">
      {groupedMessages.map(([date, dateMessages], index) => (
        <div key={index} className="message-group">
          {/* 日期分隔线 */}
          <div className="message-date-divider">
            <span className="message-date">{formatDate(new Date(date).getTime())}</span>
          </div>
          
          {/* 消息列表 */}
          <List
            dataSource={dateMessages}
            renderItem={(message) => {
              const messageId = message.id || message.message_id;
              return (
                <List.Item className="message-item" key={messageId}>
                  <MessageBubble 
                    message={message} 
                    onDelete={handleMessageDelete}
                    selectMode={selectMode}
                    selected={selectedMessages.has(messageId)}
                    onSelect={handleMessageSelect}
                  />
                </List.Item>
              );
            }}
            split={false}
          />
        </div>
      ))}
      
      {/* 用于自动滚动到底部的元素 */}
      <div ref={messagesEndRef} className="messages-end-marker" />
    </div>
  );
};

export default MessageList;
