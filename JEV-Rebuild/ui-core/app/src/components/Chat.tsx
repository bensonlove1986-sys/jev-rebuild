import React, { useRef, useState, useEffect } from 'react';
import { useCustomersStore } from '../store/customersStore';
import { useMessagesStore } from '../store/messagesStore';
import { useChatStore } from '../modules/chat_modular/store/chatStore';
import whatsAppInboxService from '../services/WhatsAppInboxService';
import { generateAISuggestion } from '../services/ai.service';
import ImageModal from './ImageModal';
import useAutoTranslation from '../hooks/useAutoTranslation';
import MessageTimeline from '../modules/chat_modular/components/MessageTimeline';
import DeepSeekPanel from '../modules/chat_modular/components/DeepSeekPanel/DeepSeekPanel';

const Chat: React.FC = () => {
  // 使用正确的状态名称
  const {
    selectedPhone = null,
    customers
  } = useCustomersStore();
  
  // 启用自动翻译
  useAutoTranslation();
  
  const {
    messages = {},
    sendMessage
  } = useMessagesStore();

  // 使用稳定的 selector 订阅
  const selectedChatId = useChatStore((state) => state.selectedChatId);
  const setSelectedChatId = useChatStore((state) => state.setSelectedChatId);
  const chats = useChatStore((state) => state.chats);
  const messages = useChatStore((state) => state.messages);
  // 不再直接使用addMessage，而是通过WhatsAppInboxService发送消息
  const updateMessageStatus = useChatStore((state) => state.updateMessageStatus);
  const deleteMessage = useChatStore((state) => state.deleteMessage);

  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  // 添加图片模态框状态
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState('');
  const [aiPanelVisible, setAiPanelVisible] = useState(true);

  // 调试日志
  console.log('[CHAT_COMPONENT_RENDER]', {
    selectedPhone,
    selectedChatId,
    customersCount: customers.length,
    hasSelectedCustomer: !!selectedPhone,
    aiPanelVisible
  });

  // 当selectedPhone变化时，同步更新selectedChatId
  useEffect(() => {
    console.log('[CHAT_USEEFFECT] selectedPhone changed:', selectedPhone);
    if (selectedPhone) {
      // 转换为canonical格式
      const canonicalChatId = selectedPhone.startsWith('whatsapp:') ? selectedPhone : `whatsapp:${selectedPhone}`;
      console.log('[CHAT_USEEFFECT] Setting selectedChatId:', canonicalChatId);
      setSelectedChatId(canonicalChatId);
    } else {
      console.log('[CHAT_USEEFFECT] Clearing selectedChatId');
      setSelectedChatId(null);
    }
  }, [selectedPhone, setSelectedChatId]);

  // 获取当前选中客户的消息
  const customerMessages = selectedPhone ? messages[selectedPhone] || [] : [];

  // 处理图片双击事件
  const handleImageDoubleClick = (imageUrl: string) => {
    setSelectedImageUrl(imageUrl);
    setIsImageModalOpen(true);
  };

  // 关闭图片模态框
  const handleCloseImageModal = () => {
    setIsImageModalOpen(false);
    setSelectedImageUrl('');
  };

  // 处理AI面板状态变化
  const handleAiPanelStateChange = (isVisible: boolean) => {
    console.log('[CHAT_AI_PANEL] State changed:', isVisible);
    setAiPanelVisible(isVisible);
  };

  // 处理插入文本到输入框
  const handleInsertText = (text: string) => {
    setInputText(text);
  };

  // 获取当前客户信息
  const currentCustomer = customers.find(customer => customer.phone === selectedPhone);
  console.log('[CHAT_CURRENT_CUSTOMER]', currentCustomer);

  // 强制显示聊天界面，不依赖于selectedPhone
  return (
    <div className="chat-container flex flex-1 overflow-hidden" style={{ border: '1px solid red' }}>
      {/* 调试信息 */}
      <div style={{ position: 'fixed', top: '10px', right: '10px', backgroundColor: 'rgba(0,0,0,0.8)', color: 'white', padding: '10px', borderRadius: '4px', fontSize: '12px', zIndex: 9999 }}>
        <div>selectedPhone: {selectedPhone}</div>
        <div>selectedChatId: {selectedChatId}</div>
        <div>Customers: {customers.length}</div>
        <div>AI Panel: {aiPanelVisible ? 'Visible' : 'Hidden'}</div>
      </div>
      
      {/* 主聊天区域 */}
      <div className={`chat-main ${aiPanelVisible ? 'with-ai-panel' : ''}`} style={{ flex: 1, display: 'flex', flexDirection: 'column', border: '1px solid blue' }}>
        {/* 聊天头部 */}
        <div className="chat-header" style={{ height: '56px', boxSizing: 'border-box', padding: '0 16px', display: 'flex', alignItems: 'center', borderBottom: '1px solid #e5e7eb', backgroundColor: '#f8f9fa' }}>
          <h2 className="text-lg font-medium m-0">
            {currentCustomer ? currentCustomer.stable_name || `客户 ${currentCustomer.phone}` : '选择客户'}
          </h2>
        </div>

        {/* 消息时间线 */}
        <div className="chat-body flex-1 overflow-hidden" style={{ border: '1px solid green' }}>
          {selectedPhone ? (
            <MessageTimeline 
              onImageDoubleClick={handleImageDoubleClick}
            />
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#666' }}>
              请从左侧列表选择一个客户开始聊天
            </div>
          )}
        </div>

        {/* 聊天输入栏 */}
        <div className="chat-input-bar" style={{ borderTop: '1px solid #e5e7eb', padding: '12px 16px', backgroundColor: '#f8f9fa' }}>
          <textarea
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            placeholder="输入消息…"
            rows={2}
            style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '4px', resize: 'none' }}
          />
          <div className="chat-input-buttons" style={{ marginTop: '8px', display: 'flex', gap: '8px' }}>
            <button
              onClick={() => {
                generateAISuggestion(
                  selectedPhone,
                  customerMessages
                ).then(res => {
                  setInputText(res.suggestion || '')
                })
              }}
              style={{ padding: '6px 12px', backgroundColor: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: '4px', cursor: 'pointer' }}
              disabled={!selectedPhone}
            >
              AI 建议
            </button>
            <button
              onClick={() => {
                const text = inputText.trim()
                if (!selectedPhone) return
                
                // 验证文本是否为空
                const hasText = typeof text === 'string' && text.trim() !== '';
                
                if (!hasText) {
                  console.error('[OUTBOUND_HARD_BLOCK_EMPTY_PAYLOAD]', { selectedPhone, text });
                  return;
                }
                
                // 生成唯一的message_id
                const messageId = `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
                sendMessage(selectedPhone, text, messageId)
                setInputText('')
              }}
              style={{ padding: '6px 12px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
              disabled={!selectedPhone}
            >
              发送
            </button>
          </div>
        </div>
      </div>

      {/* DeepSeek AI 助手面板 */}
      <div className="chat-ai-panel" style={{ width: aiPanelVisible ? '400px' : '0', borderLeft: aiPanelVisible ? '1px solid #e5e7eb' : 'none', transition: 'width 0.3s ease', border: '1px solid purple' }}>
        <DeepSeekPanel 
          chatId={selectedChatId || undefined}
          onInsertText={handleInsertText}
          onPanelStateChange={handleAiPanelStateChange}
        />
      </div>
      
      {/* 图片放大模态框 */}
      <ImageModal 
        isOpen={isImageModalOpen} 
        imageUrl={selectedImageUrl} 
        onClose={handleCloseImageModal} 
      />
      
      <style jsx>{`
        .chat-container {
          height: 100%;
          min-height: 500px;
        }
        
        .chat-main.with-ai-panel {
          margin-right: 0;
        }
        
        .chat-body {
          overflow: hidden;
        }
      `}</style>
    </div>
  );
};

export default Chat;