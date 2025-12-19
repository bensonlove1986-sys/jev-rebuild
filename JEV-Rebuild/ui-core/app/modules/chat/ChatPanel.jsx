import React, { useEffect, useState, useRef, useMemo } from 'react';
import { Card, List, Input, Button, Avatar, Typography } from 'antd';
import styles from './ChatPanel.module.css';
import { WORKER_BASE } from '../../config/constants.js';

const { TextArea } = Input;
const { Text } = Typography;

// 修复：恢复完整的ChatPanel组件结构
export default function ChatPanel({ customer, onAIDraftChange, aiReplyMode = 'semi-auto', chatDraftText = '', onNewMessageCustomer, activeCustomerId, messagesMap, setMessagesMap }) {
  // 状态管理
  const [draftText, setDraftText] = useState(chatDraftText);
  const [autoTranslate, setAutoTranslate] = useState(false);
  
  // ref管理
  const endRef = useRef(null);
  // 翻译缓存：messageId -> translatedText
  const translationCache = useRef(new Map());
  // 正在翻译的消息ID集合
  const translatingRef = useRef(new Set());
  
  // 翻译消息函数
  const translateMessage = async (messageId, text) => {
    // 检查缓存
    if (translationCache.current.has(messageId)) {
      return;
    }
    
    // 防止重复请求
    if (translatingRef.current.has(messageId)) {
      return;
    }
    
    try {
      translatingRef.current.add(messageId);
      
      // 调用翻译API
      const response = await fetch(`${WORKER_BASE}/api/translate/text`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: text,
          target_lang: 'zh-CN',
          source: 'customer'
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.translated_text) {
          translationCache.current.set(messageId, data.translated_text);
        }
      }
    } catch (error) {
      console.error('[TRANSLATE_ERROR]', messageId, error.message);
    } finally {
      translatingRef.current.delete(messageId);
    }
  };
  
  // 自动翻译逻辑
  useEffect(() => {
    if (!autoTranslate) return;
    
    // 自动翻译所有客户消息
    activeMessages.forEach(message => {
      if ((message.direction === 'inbound' || message.from === 'customer') && !translationCache.current.has(message.id)) {
        translateMessage(message.id, message.text);
      }
    });
  }, [activeMessages, autoTranslate]);
  
  // 渲染消息气泡
  const renderMessage = (message) => {
    const messageText = message.text;
    
    // 判定消息类型 - 严格按要求：direction === "inbound" 或 from === "customer"
    const isCustomerMessage = message.direction === "inbound" || message.from === "customer";
    const isSelfMessage = message.source === 'ui' || message.from === 'self' || message.direction === "outbound";
    
    // 计算发送者名称
    let displayName;
    let avatarText;
    
    if (isCustomerMessage) {
      // 按优先级确定客户发送者名称
      displayName = 
        customer?.display_name || 
        message.customer_name || 
        message.customer_id || 
        "客户"; // 最终兜底
      
      avatarText = displayName.charAt(0).toUpperCase();
    } else if (isSelfMessage) {
      displayName = '我';
      avatarText = '我';
    } else {
      // 兜底情况
      displayName = 
        customer?.display_name || 
        message.customer_name || 
        message.customer_id || 
        "客户";
      
      avatarText = displayName.charAt(0).toUpperCase();
    }
    
    // 获取翻译结果
    const translatedText = translationCache.current.get(message.id);
    // 检查是否正在翻译
    const isTranslating = translatingRef.current.has(message.id);
    
    return (
      <div key={message.id} className={styles.message}>
        <Avatar className={styles.avatar}>
          {avatarText}
        </Avatar>
        <div className={styles.messageContent}>
          <div className={styles.displayName}>{displayName}</div>
          <div className={styles.messageBubble} style={{ position: 'relative' }}>
            <Text>{messageText}</Text>
            
            {/* 翻译结果显示 */}
            {translatedText && (
              <div style={{ 
                fontSize: '12px', 
                color: '#666', 
                marginTop: '4px',
                paddingTop: '4px',
                borderTop: '1px dashed #e0e0e0'
              }}>
                中文：{translatedText}
              </div>
            )}
            
            {/* 正在翻译提示 */}
            {isTranslating && (
              <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>
                翻译中...
              </div>
            )}
            
            {/* 客户消息显示翻译按钮 */}
            {isCustomerMessage && (
              <Button 
                size="small" 
                style={{ 
                  position: 'absolute', 
                  bottom: '4px', 
                  right: '4px', 
                  fontSize: '10px', 
                  padding: '2px 8px',
                  opacity: 0.7
                }}
                onClick={() => translateMessage(message.id, message.text)}
              >
                翻译成中文
              </Button>
            )}
          </div>
          <Text type="secondary" className={styles.timestamp}>
            {message.timestamp}
          </Text>
        </div>
      </div>
    );
  };
  
  // 发送消息
  const handleSend = () => {
    if (!activeCustomerId || !draftText?.trim()) return;

    // 使用标准化消息结构
    const localMsg = {
      id: `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      customer_id: activeCustomerId,
      content: draftText,
      text: draftText, // 确保文本内容在text字段中
      timestamp: Date.now(),
      source: 'ui', // 我方消息source设置为ui
      from: 'self', // 我方消息from设置为self
      direction: 'outbound',
      status: 'sending'
    };

    // 立即添加到消息列表（乐观更新）
    setMessagesMap(prev => {
      const existingMessages = prev[activeCustomerId] || [];
      return {
        ...prev,
        [activeCustomerId]: [...existingMessages, { ...localMsg, status: 'sent' }]
      };
    });

    setDraftText('');
    
    // 发送到服务器
    fetch(`${WORKER_BASE}/api/message/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        customer_id: activeCustomerId,
        text: draftText,
        source: 'ui'
      })
    })
    .then(res => res.json())
    .then(data => {
      if (data.ok) {
        // 商业规则：记录发送成功日志
        console.log(`[SEND_OK] message_id=${localMsg.id}`);
      } else {
        // 处理发送失败
        console.error(`[SEND_ERROR] message_id=${localMsg.id} error=${data.error}`);
        // 更新消息状态为失败
        setMessagesMap(prev => {
          const existingMessages = prev[activeCustomerId] || [];
          return {
            ...prev,
            [activeCustomerId]: existingMessages.map(msg => 
              msg.id === localMsg.id 
                ? { ...msg, status: 'failed' } 
                : msg
            )
          };
        });
      }
    })
    .catch(err => {
      console.error(`[SEND_ERROR] message_id=${localMsg.id} error=${err.message}`);
      // 更新消息状态为失败
      setMessagesMap(prev => {
        const existingMessages = prev[activeCustomerId] || [];
        return {
          ...prev,
          [activeCustomerId]: existingMessages.map(msg => 
            msg.id === localMsg.id 
              ? { ...msg, status: 'failed' } 
              : msg
          )
        };
      });
    });
    
    console.log('[UI][SEND_LOCAL_OK]', activeCustomerId, localMsg.text);
  };
  
  // 优化：使用useMemo创建activeMessages作为单一渲染源
  const activeMessages = useMemo(() => {
    if (!activeCustomerId) return [];
    return messagesMap[activeCustomerId] || [];
  }, [messagesMap, activeCustomerId]);
  
  // 新增：监听activeCustomerId变化，触发inbox拉取
  useEffect(() => {
    if (!activeCustomerId) return;

    fetch(`${WORKER_BASE}/api/inbox/pull?customer_id=${activeCustomerId}&since=0&limit=50`)
      .then(res => res.json())
      .then(data => {
        const msgs = Array.isArray(data.messages) ? data.messages : [];
        setMessagesMap(prev => {
          // 商业规则：永不清空已拉消息，只合并去重
          const existingMessages = prev[activeCustomerId] || [];
          // 创建消息ID映射，确保去重
          const messageMap = new Map();
          
          // 保留现有消息
          existingMessages.forEach(msg => {
            messageMap.set(msg.id, msg);
          });
          
          // 添加新消息（去重）
          msgs.forEach(msg => {
            if (!messageMap.has(msg.id)) {
              messageMap.set(msg.id, msg);
            }
          });
          
          // 按时间戳排序
          const mergedMessages = Array.from(messageMap.values())
            .sort((a, b) => a.timestamp - b.timestamp);
          
          return {
            ...prev,
            [activeCustomerId]: mergedMessages
          };
        });
        console.log('[INBOX_PULL_OK]', activeCustomerId, data.messages.length);
      })
      .catch(err => {
        console.error('[INBOX_PULL_ERROR]', err);
      });

  }, [activeCustomerId]);
  
  // 调试钩子：渲染前日志
  console.log('[CHAT_RENDER]', activeCustomerId, activeMessages.length);
  
  // 极简渲染规则：无activeCustomerId时显示空状态
  if (!activeCustomerId) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100%', 
        color: '#999',
        fontSize: '16px'
      }}>
        请选择客户
      </div>
    );
  }
  
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Card 
        className={styles.chatPanel} 
        styles={{ 
          body: { 
            padding: 0, 
            height: '100%', 
            display: 'flex', 
            flexDirection: 'column',
            overflow: 'hidden',
            minHeight: 0
          } 
        }} 
        variant="borderless"
      >
        {/* 主内容区：聊天 */}
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {/* 自动翻译开关 */}
          <div style={{ 
            padding: '8px 16px', 
            background: '#fff', 
            borderBottom: '1px solid #f0f0f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '8px'
          }}>
            <span style={{ fontSize: '12px', color: '#666' }}>
              ☑ 自动翻译客户消息
            </span>
            <input
              type="checkbox"
              checked={autoTranslate}
              onChange={(e) => setAutoTranslate(e.target.checked)}
              style={{ cursor: 'pointer' }}
            />
          </div>
          
          {/* 聊天列表 */}
          <div style={{ 
            flex: 1, 
            overflowY: 'auto', 
            background: '#f0f2f5',
            minHeight: 0
          }}>
            <List
              dataSource={activeMessages}
              renderItem={renderMessage}
              className={styles.messageList}
              style={{ padding: '16px', minHeight: '100%' }}
              pagination={false}
              locale={{
                emptyText: (
                  <div style={{ textAlign: 'center', padding: '40px 20px', color: '#999' }}>
                    <div style={{ fontSize: '16px', marginBottom: '8px' }}>
                      暂无聊天记录
                    </div>
                    <div style={{ fontSize: '12px' }}>
                      开始与客户聊天吧
                    </div>
                  </div>
                )
              }}
            />
          </div>
        </div>
        
        {/* 输入区域 */}
        <div style={{ padding: '12px', borderTop: '1px solid #f0f0f0' }}>
          <TextArea
            placeholder={'输入消息...'}
            value={draftText}
            onChange={(e) => setDraftText(e.target.value)}
            onPressEnter={handleSend}
            autoSize={{ minRows: 3, maxRows: 8 }}
            style={{ minHeight: '80px', marginBottom: '8px' }}
            disabled={false}
          />
          
          {/* 发送按钮区域 */}
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <Button 
              type="primary" 
              onClick={handleSend}
              disabled={!draftText.trim()}
            >
              发送
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
