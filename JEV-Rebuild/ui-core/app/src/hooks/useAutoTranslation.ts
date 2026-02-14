import { useEffect, useRef } from 'react';
import { useSystemStore } from '../store/systemStore';
import { useCustomersStore } from '../store/customersStore';
import { useChatStore, eventEmitter } from '../modules/chat_modular/store/chatStore';
import { translateToChinese } from '../services/translate.service';
import { uiScheduler, SchedulerEventType } from '../core/scheduler/ui_scheduler_core';

// 获取持久化的已翻译消息ID集合
const getTranslatedMessageIds = (customerId: string): Set<string> => {
  try {
    const key = `translated_ids_${customerId}`;
    const savedIds = localStorage.getItem(key);
    return new Set(savedIds ? JSON.parse(savedIds) : []);
  } catch (error) {
    console.error('[AUTO_TRANSLATE_ERROR] Failed to load translated message IDs:', error);
    return new Set<string>();
  }
};

// 保存已翻译消息ID集合到localStorage
const saveTranslatedMessageIds = (customerId: string, ids: Set<string>) => {
  try {
    const key = `translated_ids_${customerId}`;
    localStorage.setItem(key, JSON.stringify(Array.from(ids)));
  } catch (error) {
    console.error('[AUTO_TRANSLATE_ERROR] Failed to save translated message IDs:', error);
  }
};

// 自动翻译钩子，处理消息的自动翻译
const useAutoTranslation = () => {
  const { autoTranslate: globalAutoTranslate } = useSystemStore();
  const { selectedCustomerId, getCustomerById } = useCustomersStore();
  // 使用稳定的 selector 订阅
  const setTranslation = useChatStore((state) => state.setTranslation);
  const getTranslation = useChatStore((state) => state.getTranslation);
  
  // 使用ref跟踪已经翻译过的消息ID，避免重复翻译
  const translatedMessageIdsRef = useRef<Set<string>>(new Set());
  
  // 当客户变化时，从localStorage加载已翻译消息ID
  useEffect(() => {
    if (selectedCustomerId) {
      translatedMessageIdsRef.current = getTranslatedMessageIds(selectedCustomerId);
    }
  }, [selectedCustomerId]);
  
  // 当消息列表变化时，自动翻译新消息
  useEffect(() => {
    if (!selectedCustomerId) return;
    
    const customer = getCustomerById(selectedCustomerId);
    if (!customer) return;
    
    // 检查是否需要自动翻译（全局开关或客户级开关）
    const shouldAutoTranslate = globalAutoTranslate || customer.autoTranslate;
    if (!shouldAutoTranslate) return;
    
    // 从chatStore获取消息
    const chatStore = useChatStore.getState();
    const customerMessages = chatStore.messages[selectedCustomerId] || [];
    
    // 遍历消息，自动翻译未翻译的inbound消息
    customerMessages.forEach(async (message) => {
      // 只翻译inbound消息，且未翻译过的消息，必须有id
      if (
        message.direction === 'inbound' && 
        message.text && 
        message.id && // 必须有id才能保存翻译
        !translatedMessageIdsRef.current.has(message.id) &&
        !message.translatedText // 避免重复翻译
      ) {
        try {
          // 调用翻译服务，翻译为中文
          const translatedText = await translateToChinese(message.text);
          
          // 直接更新chatStore中的翻译
          chatStore.setTranslation(message.id, {
            text: translatedText,
            provider: 'deepseek'
          });
          console.log('[AUTO_TRANSLATE_SUCCESS] Translated message:', message.id);
          
          // 通过 Scheduler 发送翻译完成事件
          uiScheduler.receiveEvent({
            type: SchedulerEventType.TRANSLATION_READY,
            data: {
              text: translatedText,
              provider: 'deepseek',
              ts: Date.now()
            },
            messageId: message.id
          });
          
          // 添加到已翻译消息ID集合
          translatedMessageIdsRef.current.add(message.id);
          
          // 保存到localStorage，持久化
          saveTranslatedMessageIds(selectedCustomerId, translatedMessageIdsRef.current);
        } catch (error) {
          console.error('[AUTO_TRANSLATE_ERROR] Failed to translate message:', error);
        }
      }
    });
  }, [selectedCustomerId, globalAutoTranslate, getCustomerById]);
  
  // 监听chatStore的消息变化，实时翻译新消息
  useEffect(() => {
    if (!selectedCustomerId) return;
    
    const customer = getCustomerById(selectedCustomerId);
    if (!customer) return;
    
    // 检查是否需要自动翻译（全局开关或客户级开关）
    const shouldAutoTranslate = globalAutoTranslate || customer.autoTranslate;
    if (!shouldAutoTranslate) return;
    
    // 监听chatStore的newMessage事件
    const chatStore = useChatStore.getState();
    const handleNewMessage = async (chatId: string, message: any) => {
      if (chatId !== selectedCustomerId) return;
      
      // 只翻译inbound消息，且未翻译过的消息，必须有id
      if (
        message.direction === 'inbound' && 
        message.text && 
        message.id && // 必须有id才能保存翻译
        !translatedMessageIdsRef.current.has(message.id) &&
        !message.translatedText // 避免重复翻译
      ) {
        try {
          // 调用翻译服务，翻译为中文
          const translatedText = await translateToChinese(message.text);
          
          // 直接更新chatStore中的翻译
          chatStore.setTranslation(message.id, {
            text: translatedText,
            provider: 'deepseek'
          });
          console.log('[AUTO_TRANSLATE_SUCCESS] Translated message:', message.id);
          
          // 通过 Scheduler 发送翻译完成事件
          uiScheduler.receiveEvent({
            type: SchedulerEventType.TRANSLATION_READY,
            data: {
              text: translatedText,
              provider: 'deepseek',
              ts: Date.now()
            },
            messageId: message.id
          });
          
          // 添加到已翻译消息ID集合
          translatedMessageIdsRef.current.add(message.id);
          
          // 保存到localStorage，持久化
          saveTranslatedMessageIds(selectedCustomerId, translatedMessageIdsRef.current);
        } catch (error) {
          console.error('[AUTO_TRANSLATE_ERROR] Failed to translate message:', error);
        }
      }
    };
    
    // 订阅newMessage事件
    eventEmitter.on('newMessage', handleNewMessage);
    
    // 清理订阅
    return () => {
      eventEmitter.off('newMessage', handleNewMessage);
    };
  }, [selectedCustomerId, globalAutoTranslate, getCustomerById]);
};

export default useAutoTranslation;
