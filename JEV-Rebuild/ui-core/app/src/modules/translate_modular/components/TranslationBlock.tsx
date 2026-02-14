// 翻译块组件
import React, { useState, memo, useRef, useEffect } from 'react';
import { translateMessage } from '@/modules/translate_modular/services/translateService';
import './TranslationBlock.css';

// 调试开关，默认关闭
const DEBUG_TRANSLATION = false;

interface TranslationBlockProps {
  messageId: string;
  text: string;
  direction: string;
  translation?: {
    type?: 'inbound_auto';
    target: string;
    text: string;
    engine: string;
    mode: 'auto' | 'manual';
    status: 'done' | 'error' | 'loading';
  };
  translationMode: 'auto' | 'manual';
  onTranslationUpdate: (result: any) => void;
}

const TranslationBlock: React.FC<TranslationBlockProps> = ({
  messageId,
  text,
  direction,
  translation,
  translationMode,
  onTranslationUpdate,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const lastMessageIdRef = useRef<string>(messageId);

  // 只有当messageId改变时才输出日志
  useEffect(() => {
    if (lastMessageIdRef.current !== messageId) {
      lastMessageIdRef.current = messageId;
      if (DEBUG_TRANSLATION && import.meta.env.DEV) {
        console.debug('[TRANSLATION_BLOCK_DEBUG] Message ID changed:', {
          previousMessageId: lastMessageIdRef.current,
          newMessageId: messageId
        });
      }
    }
  }, [messageId]);

  // 处理手动翻译
  const handleTranslate = async () => {
    if (DEBUG_TRANSLATION && import.meta.env.DEV && lastMessageIdRef.current === messageId) {
      console.debug('[TRANSLATION_BLOCK_DEBUG] Translation button clicked:', {
        messageId,
        text,
        isLoading,
        translationMode
      });
    }
    
    if (!text || isLoading) {
      if (DEBUG_TRANSLATION && import.meta.env.DEV && lastMessageIdRef.current === messageId) {
        console.debug('[TRANSLATION_BLOCK_DEBUG] Translation skipped:', {
          hasText: !!text,
          isLoading
        });
      }
      return;
    }

    setIsLoading(true);
    try {
      if (DEBUG_TRANSLATION && import.meta.env.DEV && lastMessageIdRef.current === messageId) {
        console.debug('[TRANSLATION_BLOCK_DEBUG] Calling translateMessage');
      }
      // 确保翻译成中文
      const result = await translateMessage(messageId, text, 'manual', 'zh');
      if (DEBUG_TRANSLATION && import.meta.env.DEV && lastMessageIdRef.current === messageId) {
        console.debug('[TRANSLATION_BLOCK_DEBUG] Translation result:', result);
      }
      onTranslationUpdate(result);
      if (DEBUG_TRANSLATION && import.meta.env.DEV && lastMessageIdRef.current === messageId) {
        console.debug('[TRANSLATION_BLOCK_DEBUG] Translation update callback called');
      }
    } catch (error) {
      console.error('Translation failed:', error);
    } finally {
      setIsLoading(false);
      if (DEBUG_TRANSLATION && import.meta.env.DEV && lastMessageIdRef.current === messageId) {
        console.debug('[TRANSLATION_BLOCK_DEBUG] Translation process completed');
      }
    }
  };

  // 切换展开/折叠状态
  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  // 手动翻译模式，显示翻译按钮
  if (translationMode === 'manual' && direction === 'inbound' && text && (translation?.type === 'inbound_auto' || !translation?.type)) {
    if (DEBUG_TRANSLATION && import.meta.env.DEV && lastMessageIdRef.current === messageId) {
      console.debug('[TRANSLATION_BLOCK_DEBUG] Manual mode conditions:', {
        translationMode,
        direction,
        hasText: !!text,
        hasTranslation: !!translation,
        translationStatus: translation?.status,
        hasTranslationText: !!translation?.text,
        translationType: translation?.type
      });
    }
    
    // 只有当translation存在、状态为done、text有内容且目标语言为中文时，才显示翻译结果
    if (translation && translation.status === 'done' && translation.text && (translation.target === 'zh' || translation.target === 'zh-CN' || !translation.target)) {
      if (DEBUG_TRANSLATION && import.meta.env.DEV && lastMessageIdRef.current === messageId) {
        console.debug('[TRANSLATION_BLOCK_DEBUG] Showing translation result:', {
          translationTarget: translation.target,
          translationText: translation.text
        });
      }
      return (
        <div className="translation-block">
          <div className="translation-header">
            <span className="translation-label">中文翻译</span>
            <span className="translation-engine">{translation.engine}</span>
          </div>
          <div className="translation-text">{translation.text}</div>
        </div>
      );
    } else if (translation && translation.status === 'error') {
      if (DEBUG_TRANSLATION && import.meta.env.DEV && lastMessageIdRef.current === messageId) {
        console.debug('[TRANSLATION_BLOCK_DEBUG] Showing translation error');
      }
      return (
        <div className="translation-block error">
          <div className="translation-header">
            <span className="translation-label">翻译失败</span>
          </div>
          <div className="translation-error">无法翻译此消息</div>
        </div>
      );
    } else {
      // 显示翻译按钮
      if (DEBUG_TRANSLATION && import.meta.env.DEV && lastMessageIdRef.current === messageId) {
        console.debug('[TRANSLATION_BLOCK_DEBUG] Showing translate button');
      }
      return (
        <div className="translation-block manual">
          <button
            className="translate-button"
            onClick={handleTranslate}
            disabled={isLoading}
          >
            {isLoading ? '翻译中...' : '翻译成中文'}
          </button>
        </div>
      );
    }
  }

  // 自动翻译模式，显示加载状态
  if (translationMode === 'auto' && direction === 'inbound' && text && !translation) {
    return (
      <div className="translation-block loading">
        <div className="translation-loading">翻译中...</div>
      </div>
    );
  }

  // 自动翻译模式下的翻译结果
  if (translation && translation.status === 'done' && (translation.type === 'inbound_auto' || !translation.type) && (translation.target === 'zh' || translation.target === 'zh-CN' || !translation.target)) {
    if (DEBUG_TRANSLATION && import.meta.env.DEV && lastMessageIdRef.current === messageId) {
      console.debug('[TRANSLATION_BLOCK_DEBUG] Showing auto translation result:', {
        translationType: translation.type,
        translationTarget: translation.target,
        translationText: translation.text
      });
    }
    return (
      <div className="translation-block">
        <div className="translation-header">
            <span className="translation-label">中文翻译</span>
            <span className="translation-engine">{translation.engine}</span>
          </div>
          <div className="translation-text">{translation.text || '翻译结果为空'}</div>
      </div>
    );
  } else if (translation && translation.status === 'error' && (translation.type === 'inbound_auto' || !translation.type)) {
    if (DEBUG_TRANSLATION && import.meta.env.DEV && lastMessageIdRef.current === messageId) {
      console.debug('[TRANSLATION_BLOCK_DEBUG] Showing auto translation error:', {
        translationType: translation.type
      });
    }
    return (
      <div className="translation-block error">
        <div className="translation-header">
          <span className="translation-label">翻译失败</span>
        </div>
        <div className="translation-error">无法翻译此消息</div>
      </div>
    );
  }

  // 其他情况不显示
  return null;
};

export default TranslationBlock;
