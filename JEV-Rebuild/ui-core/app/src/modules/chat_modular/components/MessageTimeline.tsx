import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { useChatStore } from '../store/chatStore';
import { selectActiveChatState } from '../store/chatSelectors';
import { normalizeChatId } from '../store/chatStore';
import MessageBubble from './ChatInterface/MessageBubble';
import './MessageTimeline.css';

const MessageTimeline: React.FC<{
  onImageDoubleClick?: (imageUrl: string) => void;
  selectedMessages?: Array<{id: string, from: string, text: string}>;
  onSelectMessage?: (message: {id: string, from: string, text: string}) => void;
  onDeselectMessage?: (messageId: string) => void;
}> = ({ onImageDoubleClick, selectedMessages = [], onSelectMessage, onDeselectMessage }) => {
  // 文件指纹
  if ((window as any).__DEV_DEBUG__) {
    console.debug("[TL_FILE_FINGERPRINT]", import.meta.url);
  }
  // 使用 useRef 确保 TL_FINGERPRINT 只生成一次
  const fingerprintRef = React.useRef<string | null>(null);
  
  // 在useEffect中初始化fingerprintRef，避免在渲染函数中直接修改ref
  React.useEffect(() => {
    if (!fingerprintRef.current) {
      fingerprintRef.current = "TL@L10.6.1#" + Math.random().toString(36).slice(2,8);
      if ((window as any).__DEV_DEBUG__) {
        console.debug("[TL_FINGERPRINT]", fingerprintRef.current);
      }
    }
  }, []);
  
  // 使用默认值，确保即使在useEffect执行前也有值
  const TL_FINGERPRINT = fingerprintRef.current || "TL@L10.6.1#default";
  
  // 分别从 store 中获取需要的状态和方法
  const selectedChatId = useChatStore((state) => state.selectedChatId);
  const messages = useChatStore((state) => state.messages);
  const setTranslation = useChatStore((state) => state.setTranslation);
  const setOCR = useChatStore((state) => state.setOCR);
  
  // 使用useMemo缓存当前聊天的消息，只有当selectedChatId或messages变化时才重新计算
  const currentMessages = React.useMemo(() => {
    if (!selectedChatId) return [];
    return messages[selectedChatId] || [];
  }, [selectedChatId, messages]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  
  // 翻译模式状态
  const [translationMode, setTranslationMode] = useState<'auto' | 'manual'>('manual');
  
  // AI动作状态
  const [aiActionState, setAiActionState] = useState<'idle' | 'reading' | 'generating' | 'sending'>('idle');
  
  // 渲染计数器
  const mediaListBuildCountRef = useRef(0);
  
  // 处理翻译更新
  const handleTranslationUpdate = useCallback((messageId: string, result: any) => {
    // 存储翻译结果到 chatStore.translations
    if (result.status === 'done') {
      setTranslation(messageId, {
        text: result.text,
        provider: result.engine
      });
    }
  }, [setTranslation]);
  
  // 处理 OCR 更新
  const handleOCRUpdate = useCallback((messageId: string, result: any) => {
    // 存储 OCR 结果到 chatStore.ocr
    setOCR(messageId, result);
  }, [setOCR]);
  
  // 构建媒体消息列表，使用 useMemo 优化
  const mediaMessages = useMemo(() => {
    // 去重处理
    const seen = new Set<string>();
    const dedupedMediaMessages = [];
    
    currentMessages.forEach(msg => {
      if (msg.media_path) {
        // 生成 mediaKey：优先使用 message_id，其次使用 media_path
        const mediaKey = msg.message_id || msg.id || msg.media_path;
        
        // 去重
        if (!seen.has(mediaKey)) {
          seen.add(mediaKey);
          dedupedMediaMessages.push(msg);
        }
      }
    });
    
    return dedupedMediaMessages;
  }, [currentMessages]);
  
  // 渲染保护
  if (!selectedChatId) {
    return (
      <div className="message-timeline" data-jev-timeline={TL_FINGERPRINT}>
        <div className="message-placeholder">
          <div className="placeholder-icon">💬</div>
          <div className="placeholder-text">请选择一个聊天会话</div>
        </div>
        <div ref={messagesEndRef} />
      </div>
    );
  }
  
  // 自动滚动到底部
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);
  
  // 当消息列表变化时自动滚动到底部
  useEffect(() => {
    scrollToBottom();
  }, [currentMessages.length, scrollToBottom]);
  
  // 滚动到指定消息
  const scrollToMessage = useCallback((chatId: string, messageId: string) => {
    if ((window as any).__DEV_DEBUG__) {
      console.debug('[MESSAGE_TIMELINE_SCROLL_TO]', { chatId, messageId });
    }
    
    // 先切换到对应的聊天
    if (selectedChatId !== chatId) {
      // 这里可以添加切换聊天的逻辑
      if ((window as any).__DEV_DEBUG__) {
        console.debug('[MESSAGE_TIMELINE_SCROLL_TO] Need to switch to chat:', chatId);
      }
    }
    
    // 滚动到消息
    const messageElement = messageRefs.current.get(messageId);
    if (messageElement) {
      messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // 高亮显示消息
      messageElement.style.backgroundColor = '#f0f8ff';
      setTimeout(() => {
        messageElement.style.backgroundColor = '';
      }, 2000);
    } else if ((window as any).__DEV_DEBUG__) {
      console.debug('[MESSAGE_TIMELINE_SCROLL_TO] Message element not found:', messageId);
    }
  }, [selectedChatId]);
  
  // 监听滚动到消息事件
  useEffect(() => {
    const handleScrollToMessage = (event: CustomEvent) => {
      const { chat_id, message_id } = event.detail;
      scrollToMessage(chat_id, message_id);
    };
    
    window.addEventListener('JEV_SCROLL_TO_MESSAGE', handleScrollToMessage as EventListener);
    
    return () => {
      window.removeEventListener('JEV_SCROLL_TO_MESSAGE', handleScrollToMessage as EventListener);
    };
  }, [scrollToMessage]);
  
  // 不再过滤 MM 开头的消息，确保所有消息都能显示
  const filteredMessages = useMemo(() => {
    return currentMessages;
  }, [currentMessages]);
  
  // 为每条消息添加稳定的 ID
  const messagesWithId = useMemo(() => {
    return filteredMessages.map((message, index) => {
      const messageId = message.id || message.message_id || `msg_${index}_${message.timestamp}`;
      // 只在消息没有id或message_id时才添加，避免每次渲染都生成新对象
      if (message.id && message.message_id) {
        return message;
      }
      return {
        ...message,
        id: message.id || messageId,
        message_id: message.message_id || messageId
      };
    });
  }, [filteredMessages]);
  

  
  // 渲染消息列表，使用 useMemo 优化
  const renderedMessages = useMemo(() => {
    return messagesWithId.map(message => {
      const messageId = message.id || message.message_id;
      const isSelected = selectedMessages.some(msg => msg.id === messageId);
      
      // 生成正确的 renderKey
      const renderKey = `${message.id || message.messageId}-${message.ts ?? message.timestamp ?? '0'}`;
      if (import.meta.env.DEV && (window as any).__TL_DEBUG__) {
        console.debug('[MESSAGE_TIMELINE_KEY]', renderKey);
      }
      
      // 处理消息点击 - 移除自动选择功能
      const handleMessageClick = () => {
        // 移除自动选择功能，点击消息不再自动选择
        if ((window as any).__DEV_DEBUG__) {
          console.debug('Message clicked:', messageId);
        }
      };
      
      return (
        <div 
          key={renderKey} 
          ref={(el) => {
            if (el) {
              messageRefs.current.set(messageId, el);
            }
          }}
          className={`message-item ${message.direction} ${isSelected ? 'message-item-selected' : ''}`}
          onClick={handleMessageClick}
          style={{ cursor: 'pointer' }}
          data-jev-mid={String(message.id || message.messageId || "unknown")}
          data-jev-ts={String(message.ts ?? message.timestamp ?? 0)}
        >
          <div className="message-selection-indicator">
            {isSelected && <span className="selection-check">✓</span>}
          </div>
          <MessageBubble 
            message={message} 
            onImageDoubleClick={onImageDoubleClick}
            translationMode={translationMode}
            onTranslationUpdate={handleTranslationUpdate}
            onOCRUpdate={handleOCRUpdate}
          />
        </div>
      );
    });
  }, [messagesWithId, selectedMessages, onImageDoubleClick, translationMode, handleTranslationUpdate, handleOCRUpdate]);
  


  return (
    <div className="message-timeline-container">
      {/* 翻译模式切换器 */}
      <div className="translation-mode-switcher" style={{ height: '56px', boxSizing: 'border-box' }}>
        <span className="translation-mode-label">翻译模式：</span>
        <button 
          className={`translation-mode-button ${translationMode === 'manual' ? 'active' : ''}`}
          onClick={() => setTranslationMode('manual')}
        >
          手动
        </button>
        <button 
          className={`translation-mode-button ${translationMode === 'auto' ? 'active' : ''}`}
          onClick={() => setTranslationMode('auto')}
        >
          自动
        </button>
        {/* AI动作状态指示器 */}
        {aiActionState !== 'idle' && (
          <div className={`ai-action-indicator ai-action-${aiActionState}`}>
            <span className="ai-action-icon">
              {aiActionState === 'reading' && '👁️'}
              {aiActionState === 'generating' && '🤖'}
              {aiActionState === 'sending' && '📤'}
            </span>
            <span className="ai-action-text">
              {aiActionState === 'reading' && '正在读取信息...'}
              {aiActionState === 'generating' && '正在生成信息...'}
              {aiActionState === 'sending' && '正在发送信息...'}
            </span>
          </div>
        )}
      </div>
      
      <div className="message-timeline" data-jev-timeline={TL_FINGERPRINT}>
        {renderedMessages}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
};

// 移除 React.memo，因为组件需要对 store 中的任何变化都做出反应
export default MessageTimeline;
