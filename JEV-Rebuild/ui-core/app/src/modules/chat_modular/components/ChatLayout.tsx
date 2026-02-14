import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useChatStore } from '../store/chatStore';
import { useContactStore } from '../store/contactStore';
import { whatsappOutboundService } from '../../../services/whatsappOutbound.service';
import whatsAppInboxService from '../../../services/WhatsAppInboxService';
import { safeFetch } from '../../../main';
import { eventBus } from '../../../utils/eventBus';
import { normalizeChatId } from '../store/chatStore';
import { useActiveChatState } from '../store/chatSelectors';
import useAutoTranslation from '../../../hooks/useAutoTranslation';
import ConversationList from './ConversationList';
import ChatHeader from './ChatHeader';
import MessageTimeline from './MessageTimeline';
import ChatComposer from './ChatComposer';
import ImageViewer from './ChatInterface/ImageViewer';
import DeepSeekPanel from './DeepSeekPanel/DeepSeekPanel';
import './ChatLayout.css';

// CRM 客户信息面板组件
const CRMCustomerPanel: React.FC<{
  chatId: string;
  onClose: () => void;
}> = React.memo(({ chatId, onClose }) => {
  const [customer, setCustomer] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [note, setNote] = useState('');
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [showAddNote, setShowAddNote] = useState(false);
  const [showAddTask, setShowAddTask] = useState(false);
  
  // 编辑状态管理
  const [isEditing, setIsEditing] = useState(false);
  const [editedCustomer, setEditedCustomer] = useState<any>(null);
  
  const contactStore = useContactStore.getState();
  const chatStore = useChatStore.getState();
  
  useEffect(() => {
    const loadCustomerData = async () => {
      setIsLoading(true);
      try {
        // 从 CRM 获取客户数据
        const customerData = await chatStore.getCustomerFromCRM(chatId);
        setCustomer(customerData);
        setEditedCustomer(customerData);
        console.log('[CRM_PANEL] Loaded customer data:', customerData);
      } catch (error) {
        console.error('[CRM_PANEL_ERROR] Failed to load customer data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadCustomerData();
  }, [chatId]);
  
  const handleAddNote = useCallback(async () => {
    if (!note.trim()) return;
    
    try {
      await chatStore.addNoteToCRM(chatId, note);
      chatStore.emitCRMNoteAdded(chatId, note);
      setNote('');
      setShowAddNote(false);
      alert('备注添加成功');
    } catch (error) {
      console.error('[CRM_PANEL_ERROR] Failed to add note:', error);
      alert('备注添加失败');
    }
  }, [chatId, note, showAddNote]);
  
  const handleAddTask = useCallback(async () => {
    if (!taskTitle.trim()) return;
    
    try {
      await chatStore.createTaskInCRM(chatId, {
        title: taskTitle,
        description: taskDescription
      });
      chatStore.emitCRMTaskCreated(chatId, {
        title: taskTitle,
        description: taskDescription
      });
      setTaskTitle('');
      setTaskDescription('');
      setShowAddTask(false);
      alert('任务创建成功');
    } catch (error) {
      console.error('[CRM_PANEL_ERROR] Failed to create task:', error);
      alert('任务创建失败');
    }
  }, [chatId, taskTitle, taskDescription, showAddTask]);
  
  // 开始编辑
  const handleStartEdit = useCallback(() => {
    setIsEditing(true);
    setEditedCustomer({ ...customer });
  }, [customer]);
  
  // 取消编辑
  const handleCancelEdit = useCallback(() => {
    setIsEditing(false);
    setEditedCustomer({ ...customer });
  }, [customer]);
  
  // 保存编辑
  const handleSaveEdit = useCallback(async () => {
    if (!editedCustomer) return;
    
    try {
      // 保存修改到 CRM
      await contactStore.updateCustomerInCRM(editedCustomer.id, editedCustomer);
      // 更新本地客户数据
      setCustomer({ ...editedCustomer });
      setIsEditing(false);
      alert('客户信息更新成功');
    } catch (error) {
      console.error('[CRM_PANEL_ERROR] Failed to save customer data:', error);
      alert('客户信息更新失败');
    }
  }, [editedCustomer]);
  
  // 同步到 CRM
  const handleSyncContact = useCallback(async () => {
    try {
      if (isEditing) {
        // 如果正在编辑，先保存修改
        await handleSaveEdit();
      }
      
      await contactStore.syncContactWithCRM(chatId);
      alert('联系人同步成功');
    } catch (error) {
      console.error('[CRM_PANEL_ERROR] Failed to sync contact:', error);
      alert('联系人同步失败');
    }
  }, [chatId, isEditing, handleSaveEdit]);
  
  // 处理编辑数据变化
  const handleInputChange = useCallback((field: string, value: any) => {
    setEditedCustomer(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);
  
  if (isLoading) {
    return (
      <div className="crm-panel-container">
        <div className="crm-panel-header">
          <h3>CRM 客户信息</h3>
          <button className="crm-panel-close" onClick={onClose}>×</button>
        </div>
        <div className="crm-panel-body">
          <div className="crm-loading">加载中...</div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="crm-panel-container">
      <div className="crm-panel-header">
        <h3>CRM 客户信息</h3>
        <div className="crm-panel-header-actions">
          {customer && (
            <>
              {isEditing ? (
                <>
                  <button className="crm-header-btn" onClick={handleSaveEdit}>
                    保存
                  </button>
                  <button className="crm-header-btn" onClick={handleCancelEdit}>
                    取消
                  </button>
                </>
              ) : (
                <button className="crm-header-btn" onClick={handleStartEdit}>
                  编辑
                </button>
              )}
            </>
          )}
          <button className="crm-panel-close" onClick={onClose}>×</button>
        </div>
      </div>
      <div className="crm-panel-body">
        {customer ? (
          <div className="crm-customer-info">
            <div className="crm-customer-item">
              <label>客户名称:</label>
              {isEditing ? (
                <input
                  type="text"
                  value={editedCustomer?.name || ''}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className="crm-editable-input"
                />
              ) : (
                <span>{customer.name}</span>
              )}
            </div>
            <div className="crm-customer-item">
              <label>电话号码:</label>
              {isEditing ? (
                <input
                  type="text"
                  value={editedCustomer?.phone || ''}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  className="crm-editable-input"
                  disabled
                />
              ) : (
                <span>{customer.phone}</span>
              )}
            </div>
            <div className="crm-customer-item">
              <label>邮箱:</label>
              {isEditing ? (
                <input
                  type="email"
                  value={editedCustomer?.email || ''}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className="crm-editable-input"
                />
              ) : (
                <span>{customer.email || '-'}</span>
              )}
            </div>
            <div className="crm-customer-item">
              <label>公司:</label>
              {isEditing ? (
                <input
                  type="text"
                  value={editedCustomer?.company || ''}
                  onChange={(e) => handleInputChange('company', e.target.value)}
                  className="crm-editable-input"
                />
              ) : (
                <span>{customer.company || '-'}</span>
              )}
            </div>
            <div className="crm-customer-item">
              <label>标签:</label>
              {isEditing ? (
                <input
                  type="text"
                  value={editedCustomer?.tags?.join(', ') || ''}
                  onChange={(e) => handleInputChange('tags', e.target.value.split(',').map((tag: string) => tag.trim()).filter(Boolean))}
                  className="crm-editable-input"
                  placeholder="用逗号分隔多个标签"
                />
              ) : (
                <div className="crm-tags">
                  {customer.tags?.map((tag: string, index: number) => (
                    <span key={index} className="crm-tag">{tag}</span>
                  )) || '-'}
                </div>
              )}
            </div>
            <div className="crm-customer-item">
              <label>备注:</label>
              {isEditing ? (
                <textarea
                  value={editedCustomer?.notes || ''}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  className="crm-editable-textarea"
                  rows={3}
                  placeholder="输入备注内容"
                />
              ) : (
                <p className="crm-notes">{customer.notes || '-'}</p>
              )}
            </div>
            <div className="crm-customer-item">
              <label>客户价值:</label>
              {isEditing ? (
                <input
                  type="number"
                  value={editedCustomer?.value || 0}
                  onChange={(e) => handleInputChange('value', parseInt(e.target.value) || 0)}
                  className="crm-editable-input"
                  min="0"
                />
              ) : (
                <span>{customer.value || 0}</span>
              )}
            </div>
            <div className="crm-customer-item">
              <label>状态:</label>
              {isEditing ? (
                <select
                  value={editedCustomer?.status || '未知'}
                  onChange={(e) => handleInputChange('status', e.target.value)}
                  className="crm-editable-select"
                >
                  <option value="未知">未知</option>
                  <option value="新建">新建</option>
                  <option value="活跃">活跃</option>
                  <option value="潜在">潜在</option>
                  <option value="成交">成交</option>
                  <option value="流失">流失</option>
                </select>
              ) : (
                <span>{customer.status || '未知'}</span>
              )}
            </div>
            <div className="crm-customer-item">
              <label>最近联系:</label>
              <span>{new Date(customer.lastContactTime || Date.now()).toLocaleString()}</span>
            </div>
            
            <div className="crm-actions">
              <button className="crm-action-btn" onClick={() => setShowAddNote(!showAddNote)}>
                {showAddNote ? '取消' : '添加备注'}
              </button>
              <button className="crm-action-btn" onClick={() => setShowAddTask(!showAddTask)}>
                {showAddTask ? '取消' : '创建任务'}
              </button>
              <button className="crm-action-btn" onClick={handleSyncContact}>
                同步到 CRM
              </button>
            </div>
            
            {showAddNote && (
              <div className="crm-add-note">
                <textarea
                  placeholder="输入备注内容..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="crm-note-input"
                />
                <button className="crm-submit-btn" onClick={handleAddNote}>
                  保存备注
                </button>
              </div>
            )}
            
            {showAddTask && (
              <div className="crm-add-task">
                <input
                  type="text"
                  placeholder="任务标题"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  className="crm-task-title"
                />
                <textarea
                  placeholder="任务描述..."
                  value={taskDescription}
                  onChange={(e) => setTaskDescription(e.target.value)}
                  className="crm-task-description"
                />
                <button className="crm-submit-btn" onClick={handleAddTask}>
                  创建任务
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="crm-no-customer">
            <p>未找到客户信息</p>
            <button className="crm-action-btn" onClick={handleSyncContact}>
              从 CRM 同步
            </button>
          </div>
        )}
      </div>
    </div>
  );
});

CRMCustomerPanel.displayName = 'CRMCustomerPanel';

interface ChatLayoutProps {
  // 可以添加布局相关的 props
}

const ChatLayout: React.FC<ChatLayoutProps> = () => {
  // 启用自动翻译
  useAutoTranslation();
  
  // 直接从 store 获取 selectedChatId
  const selectedChatId = useChatStore((state) => state.selectedChatId);
  
  // 使用统一的活跃聊天状态选择器
  const { activeChatId, hasActiveChat, conversations, activeMessages, activeMessagesCount, chatsCount } = useActiveChatState();
  
  // 从 chatStore 获取方法
  const setSelectedChatId = useChatStore((state) => state.setSelectedChatId);
  // 不再直接使用appendMessage，而是通过WhatsAppInboxService发送消息
  const removeChat = useChatStore((state) => state.removeChat);
  const updateChat = useChatStore((state) => state.updateChat);
  
  // 只在开发环境显示调试日志
  if (import.meta.env.DEV) {
    console.log('[CHAT_LAYOUT_RENDER]', {
      selectedChatId,
      chatsCount,
      hasSelectedChat: !!selectedChatId,
      timestamp: Date.now()
    });
  }
  
  // 临时扫描日志：ChatLayout 渲染触发
  if (import.meta.env.DEV) {
    console.log('[CL_RENDER]', {
      selectedChatId,
      conversationsLength: conversations.length,
      activeMessagesCount: activeMessagesCount,
      timestamp: Date.now()
    });
  }
  
  // 图片查看器状态
  const [isImageViewerVisible, setIsImageViewerVisible] = useState(false);
  const [currentImageUrl, setCurrentImageUrl] = useState('');
  
  // 发送状态
  const [isSending, setIsSending] = useState(false);
  
  // AI 面板状态 - 默认设为true，确保AI助手默认可见
  const [isAiPanelVisible, setIsAiPanelVisible] = useState(true);
  
  // 文本插入状态
  const [textToInsert, setTextToInsert] = useState<string | null>(null);
  
  // 消息选择状态
  const [selectedMessages, setSelectedMessages] = useState<Array<{id: string, from: string, text: string}>>([]);
  
  // 最新客户消息状态
  const [latestCustomerMessage, setLatestCustomerMessage] = useState<{
    message_id: string;
    text: string;
    timestamp: number;
    media_path?: string;
  } | null>(null);
  
  // CRM 面板状态
  const [isCrmPanelVisible, setIsCrmPanelVisible] = useState(false);
  
  // Render nonce for forcing re-renders
  const [renderNonce, setRenderNonce] = useState(0);
  
  // Get chatStore instance for direct access
  const chatStore = useChatStore.getState();
  
  // 定义持久化键
  const LAST_ACTIVE_KEY = 'jev_last_active_chat';
  
  // 自动恢复聊天选择和 UI 层 self-heal
  useEffect(() => {
    // 添加状态更新保护，确保只在必要时才更新状态
    if (!selectedChatId && conversations?.length > 0) {
      const last = localStorage.getItem(LAST_ACTIVE_KEY);
      const exists = conversations.find(c => c.id === last);
      if (exists) {
        console.log('[RESTORE_LAST_ACTIVE_CHAT]', last);
        setSelectedChatId(last);
      } else {
        const fallbackId = conversations[0].id;
        console.log(
          '[ACTIVE_CHAT_SELF_HEAL_UI]',
          fallbackId
        );
        setSelectedChatId(fallbackId);
      }
    }
  }, [selectedChatId, conversations.length]);
  
  // 同步保存selectedChatId到localStorage
  useEffect(() => {
    if (selectedChatId) {
      localStorage.setItem(LAST_ACTIVE_KEY, selectedChatId);
    }
  }, [selectedChatId]);
  
  // 跟踪之前的选中聊天ID
  const prevSelectedRef = React.useRef<string | null>(null);
  
  // 只在selectedChatId首次有效时触发一次渲染
  useEffect(() => {
    if (
      selectedChatId &&
      prevSelectedRef.current !== selectedChatId
    ) {
      console.log('[CHAT_RENDER_FORCED_ONCE]', selectedChatId);
      setRenderNonce(prev => prev + 1);
    }

    prevSelectedRef.current = selectedChatId;
  }, [selectedChatId]);
  
  // Get messages by chatId with undefined fix
  const getMessagesByChatId = useCallback((chatId: string) => {
    if (!chatId) return [];
    
    const messages = chatStore.messages[chatId];
    const isUndefined = !messages;
    const result = messages || [];
    
    console.log('[CHAT_MESSAGES_SELECTOR] selectedChatId=', chatId, 'count=', result.length, 'undefined_fix=', isUndefined);
    
    return result;
  }, [chatStore]);
  
  // 当选择的聊天变化时，如果不是leader tab，触发一次on-demand pull
  useEffect(() => {
    if (selectedChatId) {
      // 触发on-demand pull
      whatsAppInboxService.pullOnDemand(selectedChatId).catch(error => {
        console.error('[ON_DEMAND_PULL_ERROR]', error);
      });
    }
  }, [selectedChatId]);
  
  // 组件挂载时初始化 WhatsAppInboxService 和事件监听
  useEffect(() => {
    // 初始化服务（只会执行一次，因为 WhatsAppInboxService 是单例）
    whatsAppInboxService.init();
    
    // 定义消息回调函数
    const handleMessageCallback = (chat_id: string, message: any) => {
      console.log('[CHAT_LAYOUT] New inbound message received:', { chat_id, message });
      
      // 确保消息对象包含必要字段
      const normalizedMessage = {
        id: message.id || message.message_id,
        message_id: message.id || message.message_id,
        chat_id: chat_id,
        chatId: chat_id,
        from: message.from || 'customer',
        to: message.to || 'operator',
        direction: message.direction || 'inbound',
        type: message.type || 'text',
        text: message.text || '',
        timestamp: message.timestamp || Date.now(),
        status: message.status || 'delivered',
        isGroup: message.isGroup || false,
        ...(message.media_path && { media_path: message.media_path }),
        ...(message.media && { media: message.media })
      };
      
      // 添加消息到 chatStore
      whatsAppInboxService.sendMessage(normalizedMessage);
      console.log('[CHAT_LAYOUT] Message sent via WhatsAppInboxService:', normalizedMessage.id);
      
      // 当收到新的客户消息时，更新最新客户消息状态
      if (
        normalizedMessage.direction === 'inbound' &&
        normalizedMessage.from === 'customer' &&
        (normalizedMessage.text || normalizedMessage.media) &&
        chat_id === selectedChatId
      ) {
        console.log('[CHAT_LAYOUT] Updating latest customer message:', normalizedMessage);
        setLatestCustomerMessage({
          message_id: normalizedMessage.message_id,
          text: normalizedMessage.text || '(媒体消息)',
          timestamp: normalizedMessage.timestamp,
          ...(normalizedMessage.media_path && { media_path: normalizedMessage.media_path })
        });
      }
      
      // 触发事件通知 CRM 模块，新消息到达
      eventBus.emit('chat:historyUpdated', {
        customer_id: chat_id,
        messages: [normalizedMessage]
      });
      
      // 触发新消息事件
      eventBus.emit('chat:newMessage', normalizedMessage);
    };
    
    // 注册消息回调函数，当有新消息到达时通知ChatLayout
    whatsAppInboxService.registerMessageCallback(handleMessageCallback);
    console.log('[CHAT_LAYOUT] Registered message callback with WhatsAppInboxService');
    
    // 监听 CRM 模块的事件，当 CRM 模块请求加载客户数据时响应
    const handleLoadCustomerData = (customerId: string) => {
      console.log('[CHAT_LAYOUT] CRM requesting customer data:', customerId);
      // 这里可以实现加载客户数据的逻辑
      // 例如，从聊天记录中获取客户的历史消息
    };
    
    // 订阅 CRM 事件
    eventBus.on('crm:loadCustomerData', handleLoadCustomerData);
    console.log('[CHAT_LAYOUT] Subscribed to CRM events');
    
    // 清理可能导致问题的旧localStorage状态
    try {
      const savedState = localStorage.getItem('deepseek_panel_state');
      if (savedState) {
        const parsedState = JSON.parse(savedState);
        // 如果状态中没有state字段或state为hidden，重置为fixed状态
        if (!parsedState.state || parsedState.state === 'hidden') {
          localStorage.setItem('deepseek_panel_state', JSON.stringify({
            state: 'fixed',
            isExpanded: true,
            isDocked: true,
            position: { x: 100, y: 100 },
            size: { width: 400, height: 500 },
            activeModule: 'reply'
          }));
        }
      }
    } catch (error) {
      // 清除损坏的localStorage数据
      localStorage.removeItem('deepseek_panel_state');
    }
    
    // 清理函数
    return () => {
      // 取消事件订阅
      eventBus.off('crm:loadCustomerData', handleLoadCustomerData);
      console.log('[CHAT_LAYOUT] Unsubscribed from CRM events');
    };
    
    // ❌ 移除组件卸载时的清理操作，SSE 连接应该保持全局
    // 只在页面卸载时由 window.beforeunload 事件清理
  }, [selectedChatId]);
  

  
  // 处理客户选择
  const handleCustomerSelect = React.useCallback(async (chatId: string) => {
    console.log('[CUSTOMER_SELECT] Received chatId:', chatId);
    
    // 直接设置选中的聊天 ID，使用原始的 chatId
    console.log('[CUSTOMER_SELECT] Setting selectedChatId:', chatId);
    setSelectedChatId(chatId);
    console.log('[CUSTOMER_SELECT] Selected chatId set to:', chatId);
    
    // 清零未读消息计数
    console.log('[CUSTOMER_SELECT] Clearing unread count for:', chatId);
    updateChat(chatId, { unreadCount: 0 });
    console.log('[CUSTOMER_SELECT] Unread count cleared for:', chatId);
    
    // 验证chat是否存在
    const chat = chatStore.chats[chatId];
    console.log('[CUSTOMER_SELECT] Chat exists:', !!chat);
    if (chat) {
      console.log('[CUSTOMER_SELECT] Chat details:', {
        id: chat.id,
        name: chat.name,
        lastMessage: chat.lastMessage,
        lastMessageTime: chat.lastMessageTime,
        unreadCount: chat.unreadCount
      });
      
      // 触发事件通知 CRM 模块，客户被选中
      eventBus.emit('customer:selected', {
        customer_id: chatId,
        name: chat.name,
        lastMessage: chat.lastMessage,
        lastMessageTime: chat.lastMessageTime
      });
    }
    
    // 规范化 chatId 用于 API 调用
    const apiChatId = normalizeChatId(chatId);
    console.log('[CUSTOMER_SELECT] API chatId:', apiChatId);
    
    // 从 history API 获取该客户的历史消息
    try {
      console.log('[CUSTOMER_SELECT] Loading history for:', apiChatId);
      
      // 不再强制拉取历史消息（since=0）
      // UI 不允许主动触发历史拉取
      console.log('[CUSTOMER_SELECT] UI does not allow主动触发历史拉取');
    } catch (error) {
      console.error('[CUSTOMER_SELECT_ERROR]', error);
    }
  }, []);
  
  // 处理发送消息
  const handleSendMessage = async (text: string, originalText?: string) => {
    if (text.trim() && selectedChatId && !isSending) {
      try {
        console.log('[OUTBOUND_FROM_ASSISTANT] Starting outbound message:', {
          text: text.substring(0, 50) + (text.length > 50 ? '...' : ''),
          originalText: originalText?.substring(0, 50) + (originalText?.length > 50 ? '...' : ''),
          selectedChatId
        });
        
        setIsSending(true);
        
        // 直接调用 API 发送消息，不做乐观更新
        const response = await safeFetch("/api/outbound/whatsapp", {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            to: selectedChatId,
            text: text
          })
        });
        
        // 打印最终 URL
        console.log('[OUTBOUND_FINAL_URL]', response.url);
        
        if (response.ok) {
          const data = await response.json();
          
          // 只有当返回 twilio_sid 时才添加消息
          if (data.twilio_sid) {
            // 生成本地消息ID，使用msg_local_前缀
            const localMessageId = `msg_local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            
            // 创建最终消息对象
            const finalMessage = {
              id: localMessageId,
              message_id: localMessageId,
              chatId: selectedChatId,
              from: 'operator',
              to: selectedChatId,
              direction: 'outbound' as const,
              type: 'text' as const,
              text: text,
              timestamp: Date.now(),
              status: 'sent' as const,
              isGroup: false,
              twilio_sid: data.twilio_sid,
              // 添加双重内容显示所需字段
              originalText: originalText,
              translatedText: text,
              translationInfo: originalText ? {
                targetLanguage: 'auto',
                engine: 'DeepSeek',
                timestamp: Date.now()
              } : undefined
            };
            
            // 详细日志：检查消息对象结构
            console.log('[DOUBLE_CONTENT_DEBUG] Final message object:', {
              id: finalMessage.id,
              originalText: finalMessage.originalText,
              translatedText: finalMessage.translatedText,
              hasOriginalText: !!finalMessage.originalText,
              hasTranslatedText: !!finalMessage.translatedText,
              text: finalMessage.text
            });
            
            // 添加最终消息到 store
            whatsAppInboxService.sendMessage(finalMessage);
            console.log('[OUTBOUND_APPEND_CONFIRMED]', { 
              messageId: localMessageId,
              twilio_sid: data.twilio_sid,
              hasOriginalText: !!originalText
            });
            
            // 触发事件通知 CRM 模块，消息已发送
            eventBus.emit('chat:messageSent', {
              customer_id: selectedChatId,
              text: text,
              sourceText: originalText || ''
            });
            
            // 触发事件通知 CRM 模块，聊天记录已更新
            eventBus.emit('chat:historyUpdated', {
              customer_id: selectedChatId,
              messages: [finalMessage]
            });
          } else {
            console.error('消息发送失败: 缺少 twilio_sid');
            console.log('[OUTBOUND_SEND_BLOCKED_NO_SID]');
            throw new Error('NO_TWILIO_SID');
          }
        } else {
          const errorData = await response.json();
          console.error('消息发送失败:', errorData);
          console.log('[OUTBOUND_SEND_BLOCKED_NO_SID]');
          const errorMessage = errorData.error || errorData.message || '未知错误';
          throw new Error(errorMessage);
        }
      } catch (error) {
        console.error('发送消息失败:', error);
        console.log('[OUTBOUND_SEND_BLOCKED_NO_SID]');
        // 错误处理：只显示错误提示，不添加消息到 store
        alert(`发送失败: ${error instanceof Error ? error.message : '网络错误'}`);
      } finally {
        setIsSending(false);
      }
    }
  };
  
  // 处理发送图片
  const handleSendImage = async (_, mediaPath: string) => {
    console.log("[HANDLE_SEND_IMAGE_START]", typeof mediaPath, mediaPath?.startsWith('data:'), mediaPath?.length);
    
    if (selectedChatId && !isSending) {
      console.log("[HANDLE_SEND_IMAGE_CHAT_ID]", selectedChatId);
      
      // 确保 mediaPath 存在且有效
      if (!mediaPath || typeof mediaPath !== 'string' || mediaPath.length === 0) {
        console.error("[OUTBOUND_IMAGE_NO_MEDIA_PATH]", typeof mediaPath, mediaPath?.length);
        alert('图片发送失败：缺少有效的媒体路径');
        return;
      }
      
      // 确保 mediaPath 是 dataUrl
      if (!mediaPath.startsWith('data:')) {
        console.error("[OUTBOUND_IMAGE_INVALID_DATA_URL]", mediaPath.substring(0, 100));
        alert('图片发送失败：无效的媒体路径格式');
        return;
      }
      
      console.log("[HANDLE_SEND_IMAGE_MEDIA_PATH_VALID]", mediaPath.substring(0, 50) + '...');
      console.log("[HANDLE_SEND_IMAGE_MEDIA_PATH_LENGTH]", mediaPath.length);
      
      try {
        setIsSending(true);
        
        console.log("[INGEST_PIPELINE_STEP1]");
        
        // Step 1：先上传，不写入 store
        const ingestEndpoint = "/api/media/ingest";
        const dataUrl = mediaPath;
        
        console.log("[INGEST_DATA_URL_CHECK]", typeof dataUrl, dataUrl?.startsWith('data:'));
        console.log("[INGEST_DATA_URL_LENGTH]", dataUrl?.length);
        console.log("[INGEST_CUSTOMER_ID]", selectedChatId);
        
        // 发送旧格式请求以兼容远程Worker
        const ingestPayload = {
          source: {
            dataUrl: dataUrl
          },
          meta: {
            namespace: "whatsapp",
            direction: "outbound",
            customerId: selectedChatId
          }
        };
        
        console.log("[INGEST_PAYLOAD_OLD_FORMAT]", ingestPayload);
        console.log("[INGEST_PAYLOAD_META]", ingestPayload.meta);
        console.log("[INGEST_PAYLOAD_JSON_LENGTH]", JSON.stringify(ingestPayload).length);
        
        const ingestResponse = await safeFetch(ingestEndpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(ingestPayload)
        });
        
        if (!ingestResponse.ok) {
          const errorText = await ingestResponse.text();
          console.error('[INGEST_ERROR_STATUS]', ingestResponse.status, ingestResponse.statusText);
          console.error('[INGEST_ERROR_BODY]', errorText);
          try {
            const errorData = JSON.parse(errorText);
            const errorMessage = errorData.error || errorData.message || '上传失败';
            alert(`上传失败: ${errorMessage}`);
          } catch {
            alert(`上传失败: ${ingestResponse.status} ${ingestResponse.statusText}`);
          }
          return;
        }
        
        const ingestJson = await ingestResponse.json();
        console.log('[INGEST_RESPONSE]', ingestJson);
        
        // 处理两种响应格式
        const media_path = ingestJson.media_path || ingestJson.data?.mediaPath;
        
        if (!media_path) {
          console.error("[INGEST_PIPELINE_ABORT]", ingestJson);
          alert('上传失败：无效的媒体路径');
          return;
        }
        
        console.log('[INGEST_PIPELINE_SUCCESS]', media_path);
        console.log("[INGEST_PIPELINE_SUCCESS]", media_path);
        
        // 生成本地消息 ID
        const localMessageId = `msg_local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Step 2：只写 Worker 返回路径
        const finalMessage = {
          id: localMessageId,
          message_id: localMessageId,
          chat_id: selectedChatId,
          chatId: selectedChatId,
          from: 'operator',
          to: selectedChatId,
          direction: 'outbound' as const,
          type: 'image' as const,
          media_path: media_path,
          text: '',
          caption: '',
          timestamp: Date.now(),
          status: 'sending' as const,
          isGroup: false
        };
        
        console.log("[STORE_APPEND_MEDIA_PATH]");
        whatsAppInboxService.sendMessage(finalMessage);
        
        // Step 3：调用 outbound
        const outboundEndpoint = "/api/outbound/whatsapp";
        
        console.log('[INGEST_FIRST_STEP_2] Calling /api/outbound/whatsapp');
        console.log('[OUTBOUND_REQUEST]', {
          to: selectedChatId,
          media_path: media_path
        });
        
        const outboundResponse = await safeFetch(outboundEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            to: selectedChatId,
            media_path: media_path,
            text: '' // 空文本，满足 Twilio API 要求
          })
        });
        
        if (outboundResponse.ok) {
          const data = await outboundResponse.json();
          
          // 处理响应，更新消息状态
          if (data.ok) {
            const updatedMessage = {
              ...finalMessage,
              status: 'sent' as const,
              twilio_sid: data.twilio_sid // 保存twilio_sid（如果有）
            };
            
            whatsAppInboxService.sendMessage(updatedMessage);
            console.log('[OUTBOUND_IMAGE_SEND_OK]', media_path);
            
            // 触发事件通知 CRM 模块，图片消息已发送
            eventBus.emit('chat:messageSent', {
              customer_id: selectedChatId,
              text: '[图片消息]',
              sourceText: '[图片消息]'
            });
            
            // 触发事件通知 CRM 模块，聊天记录已更新
            eventBus.emit('chat:historyUpdated', {
              customer_id: selectedChatId,
              messages: [updatedMessage]
            });
          } else {
            // 接口返回错误，标记消息为失败状态
            console.error('图片发送失败:', data.error);
            const failedMessage = {
              ...finalMessage,
              status: 'failed' as const,
              error: data.error || '发送失败'
            };
            whatsAppInboxService.sendMessage(failedMessage);
          }
        } else {
          const errorData = await outboundResponse.json();
          console.error('图片发送失败:', errorData);
          const errorMessage = errorData.error || errorData.message || '未知错误';
          // 接口失败，标记消息为失败状态
          const failedMessage = {
            ...finalMessage,
            status: 'failed' as const,
            error: errorMessage
          };
          whatsAppInboxService.sendMessage(failedMessage);
        }
      } catch (error) {
        console.error('发送图片失败:', error);
        alert(`发送失败: ${error instanceof Error ? error.message : '网络错误'}`);
      } finally {
        setIsSending(false);
      }
    }
  };
  
  // 处理图片双击事件
  const handleImageDoubleClick = React.useCallback((imageUrl: string) => {
    setCurrentImageUrl(imageUrl);
    setIsImageViewerVisible(true);
  }, []);
  
  // 关闭图片查看器
  const handleCloseImageViewer = React.useCallback(() => {
    setIsImageViewerVisible(false);
    setCurrentImageUrl('');
  }, []);
  
  // 处理删除联系人
  const handleDeleteContacts = React.useCallback((contactIds: string[]) => {
    contactIds.forEach(contactId => {
      removeChat(contactId);
    });
  }, []);
  
  // 处理AI面板状态变化
  const handleAiPanelStateChange = React.useCallback((isVisible: boolean) => {
    // 只有当selectedChatId存在时，才更新isAiPanelVisible状态
    if (selectedChatId) {
      setIsAiPanelVisible(isVisible);
    }
  }, [selectedChatId]);
  
  // 处理文本插入到聊天框
  const handleInsertTextToComposer = React.useCallback((text: string) => {
    console.log('[AI_INSERT_TEXT] Inserting text to composer:', text.substring(0, 50) + (text.length > 50 ? '...' : ''));
    setTextToInsert(text);
  }, []);
  
  // 处理消息选择
  const handleSelectMessage = React.useCallback((message: {id: string, from: string, text: string}) => {
    setSelectedMessages(prev => [...prev, message]);
    console.log('[CHAT_LAYOUT] Message selected:', message);
  }, []);
  
  // 处理消息取消选择
  const handleDeselectMessage = React.useCallback((messageId: string) => {
    setSelectedMessages(prev => prev.filter(msg => msg.id !== messageId));
    console.log('[CHAT_LAYOUT] Message deselected:', messageId);
  }, []);
  
  // 处理 CRM 面板切换
  const handleToggleCrmPanel = React.useCallback(() => {
    setIsCrmPanelVisible(prev => !prev);
    console.log('[CHAT_LAYOUT] CRM panel toggled:', !isCrmPanelVisible);
  }, [isCrmPanelVisible]);
  

  
  return (
    <div className="chat-layout-container" style={{ 
      display: 'flex', 
      flexDirection: 'row', 
      height: '100%', 
      width: '100%', 
      background: '#f0f2f5', 
      overflow: 'hidden', 
      position: 'relative',
      minHeight: '0'
    }}>
      {/* 左侧会话列表 */}
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        flex: '0 0 320px',
        height: '100%', 
        minHeight: '0'
      }}>
        <ConversationList
          conversations={conversations}
          selectedPhone={selectedChatId}
          onSelect={handleCustomerSelect}
          onDeleteContacts={handleDeleteContacts}
        />
      </div>
      
      {/* 右侧聊天区域 */}
      <div className="chat-main-area">
        {selectedChatId ? (
          <>
            {/* 聊天区域和AI面板容器 */}
            <div className={`chat-with-panel-container ${isAiPanelVisible ? 'with-ai-panel' : 'without-ai-panel'} ${isCrmPanelVisible ? 'with-crm-panel' : ''}`}>
              {/* 聊天主内容区 */}
              <div className="chat-content-area">
                <div className="chat-column">
                  {/* 聊天头部 */}
                  <ChatHeader 
                    phone={selectedChatId} 
                    onToggleCrmPanel={handleToggleCrmPanel} 
                  />
                  
                  {/* 聊天主体区域 */}
                  <div className="chat-body">
                    {/* 消息时间线 - 不再需要传递 messages props */}
                    <MessageTimeline 
                      onImageDoubleClick={handleImageDoubleClick}
                      selectedMessages={selectedMessages}
                      onSelectMessage={handleSelectMessage}
                      onDeselectMessage={handleDeselectMessage}
                    />
                    
                    {/* 聊天输入区 */}
                    <ChatComposer
                      onSendMessage={handleSendMessage}
                      onSendImage={handleSendImage}
                      chatId={selectedChatId}
                      disabled={!selectedChatId || isSending}
                      textToInsert={textToInsert}
                      onTextInserted={() => setTextToInsert(null)}
                    />
                  </div>
                </div>
              </div>
              
              {/* DeepSeek AI 助手面板 */}
              {isAiPanelVisible && (
                <div className="chat-panel-area">
                  <DeepSeekPanel
                    chatId={selectedChatId}
                    disabled={!selectedChatId || isSending}
                    onPanelStateChange={handleAiPanelStateChange}
                    onInsertText={handleInsertTextToComposer}
                    selectedMessages={selectedMessages}
                    latestCustomerMessage={latestCustomerMessage}
                  />
                </div>
              )}
              
              {/* CRM 客户信息面板 */}
              {isCrmPanelVisible && selectedChatId && (
                <div className="crm-panel-wrapper">
                  <CRMCustomerPanel
                    chatId={selectedChatId}
                    onClose={() => setIsCrmPanelVisible(false)}
                  />
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="chat-placeholder">
            <div className="chat-placeholder-content">
              <div className="chat-placeholder-icon">📱</div>
              <h2>请选择一个 WhatsApp 会话开始聊天</h2>
              <p>从左侧列表中选择一个客户，开始对话</p>
            </div>
          </div>
        )}
      </div>
    
      {/* 图片查看器 */}
      <ImageViewer
        isVisible={isImageViewerVisible}
        imageUrl={currentImageUrl}
        onClose={handleCloseImageViewer}
      />
    </div>
  );
};

export default ChatLayout;