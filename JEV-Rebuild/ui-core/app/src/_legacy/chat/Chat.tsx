// @deprecated - replaced by chat_v3
import React, { useRef, useState } from 'react';
import { useCustomersStore } from '../../store/customersStore';
import { useMessagesStore } from '../../store/messagesStore';
import { generateAISuggestion } from '../../services/ai.service';



const Chat: React.FC = () => {
  // 使用React Suspense兼容的方式获取store状态
  const {
    selectedCustomerId = null
  } = useCustomersStore();
  
  const {
    messages = {},
    sendMessage
  } = useMessagesStore();

  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 获取当前选中客户的消息
  const customerMessages = selectedCustomerId ? messages[selectedCustomerId] || [] : [];

  return (
    <div className="chat-container">
      <div className="chat-header">Chat</div>

      <div className="chat-body">
        <div className="chat-messages">
          {customerMessages.map(msg => (
            <div key={msg.id || msg.message_id || `msg-${msg.timestamp}-${msg.text?.substring(0, 5) || 'empty'}`} className="chat-message">
              <div className="chat-message-text">
                {String(msg.text || '')}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="chat-input-bar">
        <textarea
          value={inputText}
          onChange={e => setInputText(e.target.value)}
          placeholder="输入消息…"
          rows={2}
        />
        <div className="chat-input-buttons">
          <button
            onClick={() => {
              generateAISuggestion(
                selectedCustomerId,
                customerMessages
              ).then(res => {
                setInputText(res.suggestion || '')
              })
            }}
          >
            AI 建议
          </button>
          <button
            onClick={() => {
              const text = inputText.trim()
              if (!text || !selectedCustomerId) return
              // 生成唯一的message_id
              const messageId = `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
              sendMessage(selectedCustomerId, text, messageId)
              setInputText('')
            }}
          >
            发送
          </button>
        </div>
      </div>
    </div>
  );
};

export default Chat;