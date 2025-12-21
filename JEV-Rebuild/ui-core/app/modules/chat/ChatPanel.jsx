import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { fetchJsonSafe } from '../../utils/fetchSafe.js';
import { Card, List, Input, Button, Avatar } from 'antd';
import styles from './ChatPanel.module.css';

// 生成消息的唯一键
const generateMessageKey = (message, customerId) => {
  // 优先使用message.id
  if (message.id) {
    return message.id;
  }
  
  // 生成fallbackKey: `${customer_id}:${timestamp}:${hash(text)}`
  const timestamp = message.timestamp || Date.now();
  const text = message.text || message.content || '';
  
  // 简单的哈希函数
  const hash = (str) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
  };
  
  return `${customerId || 'unknown'}:${timestamp}:${hash(text)}`;
};

const { TextArea } = Input;

// 修复：恢复完整的ChatPanel组件结构
export default function ChatPanel({ customer, chatDraftText = '', onNewMessageCustomer, activeCustomerId, messagesMap, setMessagesMap }) {
  // 状态管理
  const [draftText, setDraftText] = useState(chatDraftText);
  // AI建议相关状态
  const [aiSuggestion, setAiSuggestion] = useState('');
  const [isGeneratingSuggestion, setIsGeneratingSuggestion] = useState(false);
  // 翻译相关状态
  const [translateResult, setTranslateResult] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [autoTranslate, setAutoTranslate] = useState(false);
  const [translatedMessages, setTranslatedMessages] = useState({});
  const [translatingMessages, setTranslatingMessages] = useState({});
  
  // ref管理
  const endRef = useRef(null);

  // 优化：使用useMemo创建activeMessages作为单一渲染源
  const activeMessages = useMemo(() => {
    if (!activeCustomerId) return [];
    return messagesMap[activeCustomerId] || [];
  }, [messagesMap, activeCustomerId]);
  
  // 语言检测函数
  const detectLanguage = (text) => {
    // 简单的语言检测逻辑：检查文本中是否包含中文字符
    const hasChinese = /[\u4e00-\u9fa5]/.test(text);
    return hasChinese ? 'zh' : 'en';
  };
  
  // 客户语言判定函数
  const detectCustomerLanguage = (messages) => {
    // 取当前会话中最近一条inbound客户消息
    const customerMessages = messages.filter(msg => 
      msg.direction === "inbound" || msg.from === "customer"
    );
    
    if (customerMessages.length === 0) {
      // 若没有客户消息，默认en
      return 'en';
    }
    
    // 取最近一条消息
    const latestMessage = customerMessages[customerMessages.length - 1];
    
    // 使用detectLanguage逻辑判定语言
    return detectLanguage(latestMessage.text || latestMessage.content || '');
  };
  
  // 时间格式化函数
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  };
  
  // 移除AI建议生成功能，不再需要handleGenerateSuggestion函数
  
  // 翻译消息
  const translateMessage = useCallback(async (messageId, text) => {
    if (!text.trim()) return;
    
    // 设置加载状态
    setTranslatingMessages(prev => ({ ...prev, [messageId]: true }));
    
    try {
      // 符合要求的点击日志格式
      console.log('[TRANSLATE_CLICK] text=' + text.slice(0, 50) + '...');
      
      // 调用统一的翻译接口 /api/translate/text
      const url = `/api/translate/text`;
      const response = await fetchJsonSafe(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: text,
          target_lang: 'zh'
        })
      });
      
      // 添加详细日志以便调试
      console.log('[TRANSLATE_RESPONSE]', JSON.stringify(response));
      
      // 修复：正确处理fetchJsonSafe返回的嵌套响应格式
      // fetchJsonSafe将API响应包装在data字段中，而mock-worker返回的响应包含ok和translated_text字段
      const apiResult = response.data;
      console.log('[API_RESULT]', JSON.stringify(apiResult));
      
      // 获取翻译结果
      const translatedText = apiResult?.translated_text;
      console.log('[TRANSLATE_TEXT]', translatedText);
      console.log('[API_RESULT_OK]', apiResult?.ok);
      
      // 确保翻译结果不为空
      const finalTranslatedText = translatedText || '翻译失败';
      
      // 符合要求的成功日志格式
      console.log('[TRANSLATE_SUCCESS] translated_text=' + finalTranslatedText.slice(0, 50) + '...');
      
      // 更新translatedMessages状态
      setTranslatedMessages(prev => {
        const newState = {
          ...prev,
          [messageId]: finalTranslatedText
        };
        console.log('[TRANSLATED_MESSAGES_UPDATED]', JSON.stringify(newState));
        return newState;
      });
    } catch (err) {
      console.error('[TRANSLATE_ERROR]', err.message);
      // 显示翻译失败
      setTranslatedMessages(prev => {
        const newState = {
          ...prev,
          [messageId]: '翻译失败'
        };
        console.log('[TRANSLATED_MESSAGES_UPDATED]', JSON.stringify(newState));
        return newState;
      });
    } finally {
      // 清除加载状态
      setTranslatingMessages(prev => ({
        ...prev,
        [messageId]: false
      }));
    }
  }, []);
  
  // 自动翻译功能
  useEffect(() => {
    if (autoTranslate && activeMessages.length > 0) {
      activeMessages.forEach(message => {
        // 使用generateMessageKey生成唯一键，与renderMessage函数保持一致
        const messageKey = generateMessageKey(message, customer?.customer_id || activeCustomerId);
        // 判定消息类型 - 简化逻辑
        const isCustomerMessage = 
          message.direction === "inbound" || 
          message.from === "customer" ||
          message.type === "inbound"; // 兼容mock-worker返回的消息结构
        
        const messageText = message.text || message.content || '';
        
        if (isCustomerMessage && messageText && !translatedMessages[messageKey]) {
          // 直接翻译，不做语言检测，确保所有客户消息都能自动翻译
          translateMessage(messageKey, messageText);
        }
      });
    }
  }, [autoTranslate, activeMessages, translatedMessages, translateMessage, customer, activeCustomerId]);
  
  // 文本归一化函数，将 \n 转换为实际换行符
  function normalizeMessageText(text = '') {
    return text
      .replace(/\\r\\n/g, '\n')
      .replace(/\\n\\n/g, '\n\n')
      .replace(/\\n/g, '\n');
  }

  // 渲染消息气泡
  const renderMessage = (message) => {
    const messageText = message.text || message.content || '';
    // 使用generateMessageKey生成唯一键
    const messageKey = generateMessageKey(message, customer?.customer_id || activeCustomerId);
    const isTranslated = translatedMessages[messageKey];
    
    // 判定消息类型 - 简化逻辑
    const isCustomerMessage = 
      message.direction === "inbound" || 
      message.from === "customer" ||
      message.type === "inbound"; // 兼容mock-worker返回的消息结构
    
    const isSelfMessage = message.source === 'human' || message.from === 'self' || message.direction === "outbound";
    
    // 计算发送者名称
    let displayName;
    let avatarText;
    
    if (isCustomerMessage) {
      // 按优先级确定客户发送者名称
      displayName = 
        customer?.display_name || 
        message.customer_name || 
        message.displayName || // 兼容mock-worker返回的消息结构
        message.contact?.displayName || // 兼容mock-worker返回的消息结构
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
    
    return (
      <div key={messageKey} className={styles.message}>
        <Avatar className={styles.avatar}>
          {avatarText}
        </Avatar>
        <div className={styles.messageContent}>
          <div className={styles.displayName}>{displayName}</div>
          <div className={styles.messageBubble}>
            {/* 显示原始文本或翻译结果 */}
            {isTranslated ? (
              // 显示翻译结果，按照要求的格式
              <div className="translated-content" style={{ fontSize: '14px', lineHeight: '1.5' }}>
                <div style={{ marginBottom: '8px' }}>
                  <strong>【原文】</strong>
                </div>
                <div className="message-text" style={{ marginBottom: '8px', color: '#333' }}>
                  {normalizeMessageText(messageText)}
                </div>
                <div style={{ marginBottom: '4px' }}>
                  <strong>【中文】</strong>
                </div>
                <div className="message-text" style={{ color: '#1890ff' }}>
                  {normalizeMessageText(isTranslated)}
                </div>
              </div>
            ) : (
              // 显示原始文本
              <div className="message-text">
                {normalizeMessageText(messageText)}
              </div>
            )}
            {/* 手动翻译按钮 - 仅对未翻译的客户消息显示 */}
            {isCustomerMessage && !isTranslated && messageText && (
              <div style={{ marginTop: '4px', textAlign: 'right' }}>
                <Button 
                  size="small"
                  type="link"
                  onClick={() => translateMessage(messageKey, messageText)}
                  style={{ padding: '0', fontSize: '12px' }}
                  loading={translatingMessages[messageKey]}
                >
                  {translatingMessages[messageKey] ? '翻译中...' : '翻译'}
                </Button>
              </div>
            )}
          </div>
          <span className={styles.timestamp}>
            {formatTimestamp(message.timestamp)}
          </span>
        </div>
      </div>
    );
  };
  
  // 生成AI建议
  const handleGenerateSuggestion = async () => {
    if (!activeCustomerId || activeMessages.length === 0) return;
    
    setIsGeneratingSuggestion(true);
    setAiSuggestion('正在生成AI建议...');
    
    try {
      // 准备最近的N条消息（这里取最近10条）
      const recentMessages = [...activeMessages]
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 10)
        .reverse(); // 按时间顺序排列
      
      const url = `/api/ai/suggest-reply`;
      const result = await fetchJsonSafe(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          customerId: activeCustomerId,
          messages: recentMessages
        })
      });
      
      setAiSuggestion(result.data.text || '【AI建议生成失败】');
    } catch (err) {
      console.error('[AI_SUGGEST_ERROR]', err.message);
      setAiSuggestion('【AI建议生成失败】');
    } finally {
      setIsGeneratingSuggestion(false);
    }
  };
  
  // 采用AI建议
  const handleAdoptSuggestion = () => {
    if (aiSuggestion) {
      setDraftText(prev => prev ? `${prev}\n\n${aiSuggestion}` : aiSuggestion);
      setAiSuggestion(''); // 清空建议
    }
  };
  
  // 处理翻译
  const handleTranslate = async () => {
    if (!activeCustomerId || !draftText.trim()) {
      setTranslateResult("【翻译暂不可用】");
      return;
    }
    
    setIsTranslating(true);
    
    try {
      // 调用翻译接口
      const url = `/api/translate/text`;
      const result = await fetchJsonSafe(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: draftText,
          source_lang: 'auto',
          target_lang: 'en'
        })
      });
      
      // 兼容不同响应格式：mock返回text，production返回translated_text
      const translatedText = result.data?.translated_text || result.data?.text;
      if (translatedText) {
        setTranslateResult(translatedText);
      } else {
        setTranslateResult("【翻译暂不可用】");
      }
    } catch (err) {
      console.error('[TRANSLATE_ERROR]', err.message);
      setTranslateResult("【翻译暂不可用】");
    } finally {
      setIsTranslating(false);
    }
  };
  
  // 发送消息
  const handleSend = async () => {
    if (!activeCustomerId || !draftText?.trim()) return;

    // 使用标准化消息结构，确保只有人工输入
    const localMsg = {
      id: `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      customer_id: activeCustomerId,
      content: draftText,
      text: draftText, // 只发送用户输入的文本
      timestamp: Date.now(),
      source: 'human', // 明确标记为人工发送
      from: 'self',
      direction: 'outbound',
      status: 'sending'
    };

    // 从customer对象中获取contactId和locationId
    const contactId = customer?.contactId || customer?.customer_id || activeCustomerId;
    const locationId = customer?.locationId || '3SsfTbU1lmAPpkG9iB6C'; // 使用默认locationId
    
    // 立即添加到消息列表（乐观更新，只添加一次）
    setMessagesMap(prev => {
      const existingMessages = prev[activeCustomerId] || [];
      
      // 消息去重锁：同一content + timestamp ±2s视为重复，丢弃
      const isDuplicate = existingMessages.some(msg => {
        const timeDiff = Math.abs(msg.timestamp - localMsg.timestamp);
        return msg.content === localMsg.content && timeDiff < 2000;
      });
      
      if (isDuplicate) {
        console.info('MESSAGE_DUPLICATE_BLOCKED', { id: localMsg.id, content: localMsg.content });
        return prev; // 丢弃重复消息
      }
      
      return {
        ...prev,
        [activeCustomerId]: [...existingMessages, { ...localMsg, status: 'sent' }]
      };
    });

    setDraftText('');
    
    // 发送到服务器，只发送用户输入的文本
    try {
      const url = `/api/message/send`;
      const result = await fetchJsonSafe(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          customer_id: activeCustomerId,
          text: draftText, // 只发送用户输入的文本
          source: 'human', // 明确标记为人工发送
          contactId: contactId,
          locationId: locationId
        })
      });
      
      if (result.data.mode === 'local-dev') {
        // 显示本地调试模式提示
        console.log('[LOCAL_DEV_MODE] Message not sent to customer');
        alert('本地调试模式，消息未实际发送给客户');
      }
    } catch (err) {
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
    };
  };
  
  // 新增：监听activeCustomerId变化，触发inbox拉取
  useEffect(() => {
    if (!activeCustomerId) return;

    // 标准化customer_id，确保与后端一致
    const canonicalId = String(activeCustomerId || '').trim().toLowerCase();

    const pullMessages = async () => {
      try {
        const url = `/api/inbox/pull?customer_id=${canonicalId}&since=0&limit=50`;
        const result = await fetchJsonSafe(url);
        // 兼容mock-worker返回的响应格式
        const msgs = Array.isArray(result.messages) ? result.messages : Array.isArray(result.data?.messages) ? result.data.messages : [];
        
        // 只处理非空消息数组
        if (msgs.length > 0) {
          // 使用functional update更新状态，只触发一次
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
                // 确保消息使用canonical customer_id
                msg.customer_id = canonicalId;
                messageMap.set(msg.id, msg);
              }
            });
            
            // 按时间戳排序
            const mergedMessages = Array.from(messageMap.values())
              .sort((a, b) => a.timestamp - b.timestamp);
            
            // 确保新消息必须 append，不因数组引用相同而 skip render
            // 强制创建新数组，确保 React 检测到变化
            const newMessagesArray = [...mergedMessages];
            
            return {
              ...prev,
              [activeCustomerId]: newMessagesArray
            };
          });
        }
      } catch (err) {
        console.error('[INBOX_PULL_ERROR]', err.message);
      }
    };

    // 立即触发一次拉取
    pullMessages();
    
    // 添加定时拉取机制，每3秒拉取一次
    const interval = setInterval(pullMessages, 3000);
    
    return () => {
      clearInterval(interval);
    };

  }, [activeCustomerId, setMessagesMap]);
  

  
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
    <div className="chat-layout" style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* 聊天列表 */}
      <div className="message-list jev-scrollbar" style={{ 
        height: 'calc(100vh - 300px)',
        overflowY: 'scroll !important', 
        overflowX: 'hidden',
        background: '#f0f2f5',
        overscrollBehavior: 'contain',
        padding: '16px'
      }}>
        <List
          dataSource={activeMessages}
          renderItem={renderMessage}
          style={{ width: '100%' }}
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
      
      {/* 输入区域 */}
      <div className="chat-input" style={{ padding: '12px', borderTop: '1px solid #f0f0f0', flexShrink: 0, minHeight: '200px', display: 'flex', flexDirection: 'column' }}>
          {/* AI建议显示区域 */}
          {aiSuggestion && (
            <div style={{ 
              marginBottom: '12px', 
              padding: '12px', 
              backgroundColor: '#f9f9f9', 
              borderRadius: '8px',
              border: '1px solid #e8e8e8'
            }}>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginBottom: '8px'
              }}>
                <div style={{ fontWeight: 'bold', color: '#1890ff' }}>AI 建议</div>
                <Button 
                  size="small" 
                  onClick={handleAdoptSuggestion}
                  disabled={!aiSuggestion || aiSuggestion === '正在生成AI建议...'}
                >
                  采用建议
                </Button>
              </div>
              <div style={{ fontSize: '14px', lineHeight: '1.5' }}>
                {aiSuggestion}
              </div>
            </div>
          )}
          
          <TextArea
            placeholder={'输入消息...'}
            value={draftText}
            onChange={(e) => setDraftText(e.target.value)}
            onPressEnter={handleSend}
            autoSize={{ minRows: 3, maxRows: 8 }}
            style={{ minHeight: '80px', marginBottom: '8px' }}
            disabled={false}
          />
          
          {/* 翻译结果显示区域 */}
          {translateResult && (
            <div style={{ 
              marginBottom: '12px', 
              padding: '12px', 
              backgroundColor: '#f9f9f9', 
              borderRadius: '8px',
              border: '1px solid #e8e8e8'
            }}>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginBottom: '8px'
              }}>
                <div style={{ fontWeight: 'bold', color: '#1890ff' }}>翻译结果</div>
              </div>
              <div style={{ fontSize: '14px', lineHeight: '1.5' }}>
                {translateResult}
              </div>
            </div>
          )}
          
          {/* 按钮区域 */}
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <Button 
              size="middle"
              onClick={() => setAutoTranslate(!autoTranslate)}
              type={autoTranslate ? "primary" : "default"}
            >
              {autoTranslate ? '关闭自动翻译' : '开启自动翻译'}
            </Button>
            <Button 
              size="middle"
              onClick={handleTranslate}
              disabled={isTranslating}
              loading={isTranslating}
            >
              翻译
            </Button>
            <Button 
              size="middle"
              onClick={handleGenerateSuggestion}
              disabled={isGeneratingSuggestion || !activeCustomerId || activeMessages.length === 0}
              loading={isGeneratingSuggestion}
            >
              AI 建议
            </Button>
            <Button 
              type="primary" 
              size="middle"
              onClick={handleSend}
              disabled={!draftText.trim()}
            >
              发送
            </Button>
          </div>
        </div>
      </div>
    );
  }
