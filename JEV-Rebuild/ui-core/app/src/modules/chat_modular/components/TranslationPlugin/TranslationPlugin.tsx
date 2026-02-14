import React, { useState, useCallback, useRef, useEffect, useContext } from 'react';
import ReactDOM from 'react-dom';
import { TranslationContext } from '@/App';
import TranslationPopup from './TranslationPopup';
import { translateMessage } from '@/modules/translate_modular/services/translateService';
import './TranslationPlugin.css';

interface TranslationPluginProps {
  inputText: string;
  onTranslate: (translatedText: string, originalText?: string, targetLanguage?: string) => void;
  onDirectSend: (translatedText: string, originalText?: string) => void;
  chatId?: string;
  disabled?: boolean;
}

interface Language {
  code: string;
  name: string;
  nativeName: string;
}

const commonLanguages: Language[] = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'zh', name: 'Chinese', nativeName: '中文' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
  { code: 'de', name: 'German', nativeName: 'Deutsch' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語' },
  { code: 'ko', name: 'Korean', nativeName: '한국어' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
];

const TranslationPlugin: React.FC<TranslationPluginProps> = ({ 
  inputText, 
  onTranslate, 
  onDirectSend, 
  chatId, 
  disabled = false 
}) => {
  const { translateOpen, setTranslateOpen, translateText, setTranslateText } = useContext(TranslationContext);
  const [selectedLanguage, setSelectedLanguage] = useState<Language>(commonLanguages[1]);
  const [translatedText, setTranslatedText] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [error, setError] = useState('');
  const [localInputText, setLocalInputText] = useState('');
  const [isAnswerMode, setIsAnswerMode] = useState(false);
  const [isBusinessMode, setIsBusinessMode] = useState(false);
  const [chatLanguageMap, setChatLanguageMap] = useState<Record<string, string>>({});
  const [popupSize, setPopupSize] = useState({ width: 400, height: 300 });
  const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0 });
  const [isResizing, setIsResizing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [boundChatId, setBoundChatId] = useState<string | null>(null);
  
  const popupRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const resizeTimeoutRef = useRef<NodeJS.Timeout>();
  const resizeStartRef = useRef({ x: 0, y: 0 });
  const dragStartRef = useRef({ x: 0, y: 0 });
  const dragPositionRef = useRef({ x: 0, y: 0 });
  const animationFrameRef = useRef<number>();
  
  // 防抖处理翻译请求
  const debouncedTranslate = useCallback((text: string, targetLanguage: string, answerMode: boolean) => {
    if (resizeTimeoutRef.current) {
      clearTimeout(resizeTimeoutRef.current);
    }
    
    resizeTimeoutRef.current = setTimeout(async () => {
      if (!text.trim()) {
        setTranslatedText('');
        setError('');
        return;
      }
      
      setIsTranslating(true);
      setError('');
      
      try {
        const messageId = `translate_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // 确定目标语言
        let finalTargetLanguage = targetLanguage;
        if (chatId && chatLanguageMap[chatId]) {
          finalTargetLanguage = chatLanguageMap[chatId];
        } else if (chatId) {
          // 首次翻译，存储语言选择
          setChatLanguageMap(prev => ({
            ...prev,
            [chatId]: targetLanguage
          }));
        }
        
        const result = await translateMessage(
          messageId, 
          text, 
          answerMode ? 'answer' : 'manual', 
          finalTargetLanguage,
          chatId,
          true // languageOverride
        );
        
        if (result.status === 'done') {
          setTranslatedText(result.text);
        } else {
          setError('翻译失败，请重试');
          setTranslatedText('');
        }
      } catch (err) {
        setError('翻译服务暂时不可用，请稍后重试');
        setTranslatedText('');
      } finally {
        setIsTranslating(false);
      }
    }, 300);
  }, [chatId, chatLanguageMap]);
  
  // 当输入文本、目标语言或回答模式变化时，触发翻译
  useEffect(() => {
    const textToTranslate = localInputText || inputText;
    debouncedTranslate(textToTranslate, selectedLanguage.code, isAnswerMode);
  }, [inputText, localInputText, selectedLanguage.code, isAnswerMode, debouncedTranslate]);
  
  // 计算弹窗位置
  useEffect(() => {
    if (translateOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setPopupPosition({
        x: rect.left,
        y: rect.bottom + window.scrollY + 10
      });
    }
  }, [translateOpen]);
  
  // 当 chat_id 变化时，重新绑定但不清空翻译内容
  // 确保切换聊天时翻译窗口保持打开状态
  useEffect(() => {
    if (chatId) {
      console.log('[ASSISTANT_CHAT_BIND] Chat ID changed, rebinding:', chatId);
      setBoundChatId(chatId);
    } else {
      console.log('[ASSISTANT_CHAT_BIND] No chat ID available, clearing binding');
      setBoundChatId(null);
    }
  }, [chatId]);

  // 移除点击外部关闭弹窗的逻辑，确保翻译助手持久化显示
  // 现在只允许通过右上角的关闭按钮关闭
  
  // 处理语言选择
  const handleLanguageSelect = (language: Language) => {
    setSelectedLanguage(language);
    
    // 更新语言锁定映射
    if (chatId) {
      setChatLanguageMap(prev => ({
        ...prev,
        [chatId]: language.code
      }));
    }
  };
  
  // 发送前强校验
  const validateChatId = (): boolean => {
    if (!boundChatId) {
      console.error('[ASSISTANT_SEND_BLOCKED_NO_BIND] No bound chat ID');
      setError('翻译助手未绑定聊天 ID，无法发送');
      return false;
    }
    if (boundChatId !== chatId) {
      console.error('[ASSISTANT_SEND_BLOCKED_CHAT_MISMATCH] Chat ID mismatch:', {
        boundChatId,
        currentChatId: chatId,
        error: 'CHAT_ID_MISMATCH_BLOCKED'
      });
      setError('发送目标与当前聊天不匹配，操作已阻止');
      return false;
    }
    return true;
  };

  // 处理发送翻译结果
  const handleSendTranslation = () => {
    if (translatedText && validateChatId()) {
      const textToTranslate = localInputText || inputText;
      onTranslate(translatedText, textToTranslate, selectedLanguage.code);
      // 发送后清空输入框和翻译框
      setLocalInputText('');
      setTranslatedText('');
      setError('');
      setShowPopup(false);
    }
  };
  
  // 处理本地输入变化
  const handleLocalInputChange = (text: string) => {
    setLocalInputText(text);
  };
  
  // 处理直接发送
  const handleDirectSend = () => {
    if (translatedText && validateChatId()) {
      const textToTranslate = localInputText || inputText;
      console.log('[OUTBOUND_FROM_ASSISTANT] Direct send with bound chat ID:', {
        translatedText,
        originalText: textToTranslate,
        boundChatId
      });
      // 直接调用 onDirectSend 回调，实现直接发送功能
      onDirectSend(translatedText, textToTranslate);
      // 发送后清空输入框和翻译框
      setLocalInputText('');
      setTranslatedText('');
      setError('');
      // 保持弹窗打开状态
    }
  };
  
  // 处理商业发送模式
  const handleBusinessSend = async () => {
    if (inputText.trim() && validateChatId()) {
      setIsTranslating(true);
      setError('');
      
      try {
        const messageId = `translate_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        console.log('[ASSISTANT_TRANSLATION_DRAFT] Starting business send mode:', {
          inputText,
          targetLanguage: selectedLanguage.code,
          chatId
        });
        
        const result = await translateMessage(
          messageId,
          inputText,
          'business_send',
          selectedLanguage.code,
          chatId,
          true // languageOverride
        );
        
        console.log('[BUSINESS_SEND_RESULT]', result);
        
        if (result.status === 'done') {
          // 商业发送模式下，只发送 external.send_text 给客户
          let sendText = '';
          if (result.external && result.external.send_text) {
            sendText = result.external.send_text;
          } else if (result.text) {
            sendText = result.text;
          } else {
            console.error('[BUSINESS_SEND_ERROR] No text to send');
            setError('商业发送失败：没有可发送的文本');
            return;
          }
          
          console.log('[OUTBOUND_FROM_ASSISTANT] Business send text:', sendText);
          
          // 调用 onDirectSend 发送翻译后的文本给客户，传递原文内容
          onDirectSend(sendText, inputText);
          
          // 发送后清空输入框和翻译框
          setLocalInputText('');
          setTranslatedText('');
          setError('');
        } else {
          console.error('[BUSINESS_SEND_ERROR] Translation failed:', result.status);
          setError('商业发送失败：翻译错误');
        }
      } catch (err) {
        console.error('Business send error:', err);
        setError('商业发送失败，请重试');
      } finally {
        setIsTranslating(false);
      }
    } else {
      setError('请输入要翻译的文本');
    }
  };
  
  // 处理回答模式切换
  const handleAnswerModeChange = (mode: boolean) => {
    setIsAnswerMode(mode);
  };
  
  // 处理商业发送模式切换
  const handleBusinessModeChange = (mode: boolean) => {
    setIsBusinessMode(mode);
    if (mode) {
      setIsAnswerMode(false); // 商业模式下禁用回答模式
    }
  };
  
  // 处理弹窗大小调整
  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    resizeStartRef.current = { x: e.clientX, y: e.clientY };
  };
  
  const handleResizeMove = (e: MouseEvent) => {
    if (!isResizing || !popupRef.current) return;
    
    const deltaX = e.clientX - resizeStartRef.current.x;
    const deltaY = e.clientY - resizeStartRef.current.y;
    
    // 从DOM获取实时大小
    const currentRect = popupRef.current.getBoundingClientRect();
    
    // 添加边界检查，设置最大尺寸
    const minWidth = 300;
    const minHeight = 200;
    const maxWidth = window.innerWidth * 0.8;
    const maxHeight = window.innerHeight * 0.8;
    
    const newWidth = Math.max(minWidth, Math.min(maxWidth, currentRect.width + deltaX));
    const newHeight = Math.max(minHeight, Math.min(maxHeight, currentRect.height + deltaY));
    
    // 添加视觉反馈
    if (popupRef.current) {
      // 直接修改DOM样式，避免频繁触发React渲染
      popupRef.current.style.width = `${newWidth}px`;
      popupRef.current.style.height = `${newHeight}px`;
      
      // 添加调整大小时的视觉反馈
      popupRef.current.style.boxShadow = '0 4px 20px rgba(0, 123, 255, 0.3)';
      popupRef.current.style.border = '2px solid #007bff';
    }
    
    resizeStartRef.current = { x: e.clientX, y: e.clientY };
  };
  
  const handleResizeEnd = () => {
    if (popupRef.current) {
      // 只在结束时更新状态
      const newWidth = parseInt(popupRef.current.style.width || '400', 10);
      const newHeight = parseInt(popupRef.current.style.height || '300', 10);
      setPopupSize({ width: newWidth, height: newHeight });
      
      // 移除视觉反馈，恢复正常样式
      popupRef.current.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.15)';
      popupRef.current.style.border = 'none';
    }
    setIsResizing(false);
  };
  
  // 处理弹窗拖动
  const handleDragStart = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX - popupPosition.x, y: e.clientY - popupPosition.y };
    dragPositionRef.current = { ...popupPosition };
  };
  
  const handleDragMove = (e: MouseEvent) => {
    if (!isDragging || !popupRef.current) return;
    
    // 使用requestAnimationFrame优化拖动性能
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    
    animationFrameRef.current = requestAnimationFrame(() => {
      const newX = e.clientX - dragStartRef.current.x;
      const newY = e.clientY - dragStartRef.current.y;
      
      // 直接修改DOM样式，避免频繁触发React渲染
      if (popupRef.current) {
        popupRef.current.style.left = `${newX}px`;
        popupRef.current.style.top = `${newY}px`;
      }
      
      dragPositionRef.current = { x: newX, y: newY };
    });
  };
  
  const handleDragEnd = () => {
    // 只在结束时更新状态
    setPopupPosition(dragPositionRef.current);
    setIsDragging(false);
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
  };
  
  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleResizeMove);
      document.addEventListener('mouseup', handleResizeEnd);
      
      return () => {
        document.removeEventListener('mousemove', handleResizeMove);
        document.removeEventListener('mouseup', handleResizeEnd);
      };
    }
  }, [isResizing]);
  
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleDragMove);
      document.addEventListener('mouseup', handleDragEnd);
      
      return () => {
        document.removeEventListener('mousemove', handleDragMove);
        document.removeEventListener('mouseup', handleDragEnd);
      };
    }
  }, [isDragging]);
  
  return (
    <div style={{ position: 'relative', zIndex: 4000 }} onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
      {/* 翻译按钮 */}
      <button
        ref={buttonRef}
        className="chat-composer-translate-btn"
        onClick={(e) => {
          e.stopPropagation();
          console.log('[TRANSLATION_BUTTON_CLICK] Current translateOpen state:', translateOpen);
          setTranslateOpen(!translateOpen);
          console.log('[TRANSLATION_BUTTON_CLICK] New translateOpen state:', !translateOpen);
        }}
        onMouseDown={(e) => {
          e.stopPropagation();
          console.log('[TRANSLATION_BUTTON_MOUSEDOWN] Preventing event propagation');
        }}
        disabled={disabled}
        title="翻译消息"
        style={{
          width: '36px',
          height: '36px',
          border: 'none',
          borderRadius: '50%',
          backgroundColor: '#ffffff',
          fontSize: '18px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.2s ease',
          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
          zIndex: 4001,
          position: 'relative'
        }}
      >
        🌐
      </button>
      
      {/* 翻译弹窗 - 使用React Portal挂载到document.body */}
      {translateOpen && ReactDOM.createPortal(
        <TranslationPopup
          ref={popupRef}
          size={popupSize}
          position={popupPosition}
          inputText={localInputText || inputText}
          translatedText={translatedText}
          selectedLanguage={selectedLanguage}
          isTranslating={isTranslating}
          error={error}
          isAnswerMode={isAnswerMode}
          isBusinessMode={isBusinessMode}
          boundChatId={boundChatId}
          onLanguageSelect={handleLanguageSelect}
          onSendTranslation={handleSendTranslation}
          onDirectSend={handleDirectSend}
          onBusinessSend={handleBusinessSend}
          onInputChange={handleLocalInputChange}
          onAnswerModeChange={handleAnswerModeChange}
          onBusinessModeChange={handleBusinessModeChange}
          onResizeStart={handleResizeStart}
          onDragStart={handleDragStart}
          onClose={() => {
            console.log('[TRANSLATION_POPUP_CLOSE] Closing popup');
            setTranslateOpen(false);
          }}
        />,
        document.body
      )}
    </div>
  );
};

export default TranslationPlugin;
export { commonLanguages };
