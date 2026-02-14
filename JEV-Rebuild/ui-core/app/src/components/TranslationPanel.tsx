import React, { useState, useRef, useEffect, useCallback } from 'react';
import LanguageSelector from './LanguageSelector';
import { translateText } from '../services/translate.service';
import './TranslationPanel.css';

// 节流函数
const throttle = (func: Function, delay: number) => {
  let inThrottle: boolean = false;
  return (...args: any[]) => {
    if (!inThrottle) {
      func.apply(null, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, delay);
    }
  };
};

// 支持的语言列表
const SUPPORTED_LANGUAGES = [
  { code: 'zh', name: '中文', nativeName: '中文' },
  { code: 'en', name: '英文', nativeName: 'English' },
  { code: 'ja', name: '日文', nativeName: '日本語' },
  { code: 'ko', name: '韩文', nativeName: '한국어' },
  { code: 'de', name: '德文', nativeName: 'Deutsch' },
  { code: 'fr', name: '法文', nativeName: 'Français' },
  { code: 'ur', name: '乌尔都语', nativeName: 'اردو' },
  { code: 'vi', name: '越南语', nativeName: 'Tiếng Việt' },
  { code: 'th', name: '泰语', nativeName: 'ไทย' },
  { code: 'ar', name: '阿拉伯语', nativeName: 'العربية' },
  { code: 'tr', name: '土耳其语', nativeName: 'Türkçe' },
  { code: 'es', name: '西班牙语', nativeName: 'Español' },
  { code: 'pt', name: '葡萄牙语', nativeName: 'Português' },
  { code: 'ru', name: '俄语', nativeName: 'Русский' },
  { code: 'it', name: '意大利语', nativeName: 'Italiano' },
  { code: 'nl', name: '荷兰语', nativeName: 'Nederlands' },
  { code: 'pl', name: '波兰语', nativeName: 'Polski' },
  { code: 'id', name: '印度尼西亚语', nativeName: 'Bahasa Indonesia' },
  { code: 'hi', name: '印地语', nativeName: 'हिन्दी' },
  { code: 'fa', name: '波斯语', nativeName: 'فارسی' }
];

interface TranslationPanelProps {
  visible?: boolean;
  onClose?: () => void;
  onSend?: (original: string, translated: string, targetLang: string) => void;
  initialText?: string;
  customerId?: string;
  customerName?: string;
  customerLanguage?: string;
}

const TranslationPanel: React.FC<TranslationPanelProps> = ({
  visible = true,
  onClose,
  onSend,
  initialText = '',
  customerId,
  customerName = '客户',
  customerLanguage
}) => {
  // 拖拽状态
  const [position, setPosition] = useState({ x: 100, y: 100 });
  
  // 翻译状态
  const [originalText, setOriginalText] = useState(initialText);
  const [translatedText, setTranslatedText] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [sourceLang, setSourceLang] = useState('auto');
  // 初始目标语言使用customerLanguage或默认值'en'
  const [targetLang, setTargetLang] = useState(customerLanguage || 'en');
  // 标记是否已手动选择目标语言
  const [hasManualTargetLang, setHasManualTargetLang] = useState(false);
  
  // 面板状态
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  
  // 引用
  const panelRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const initialPosition = useRef({ x: 100, y: 100 });
  const initialSize = useRef({ width: 600, height: 400 });
  
  // 简化的拖拽实现
  const handleDragStart = (e: React.MouseEvent<HTMLDivElement>) => {
    // 确保只有标题栏可以拖拽，排除按钮区域
    if (isMaximized || e.target instanceof HTMLButtonElement) return;
    
    const startX = e.clientX;
    const startY = e.clientY;
    const startPosX = position.x;
    const startPosY = position.y;
    
    // 鼠标移动事件处理
    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;
      
      const newX = startPosX + deltaX;
      const newY = startPosY + deltaY;
      
      // 限制在视口内
      const panelWidth = panelRef.current?.offsetWidth || 600;
      const panelHeight = panelRef.current?.offsetHeight || 400;
      const maxX = window.innerWidth - panelWidth;
      const maxY = window.innerHeight - panelHeight;
      
      setPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY))
      });
    };
    
    // 鼠标松开事件处理
    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    // 添加事件监听器
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    // 阻止默认行为，防止文本选择
    e.preventDefault();
  };
  
  // 处理最小化
  const handleMinimize = () => {
    setIsMinimized(!isMinimized);
  };
  
  // 处理最大化
  const handleMaximize = useCallback(() => {
    if (isMaximized) {
      // 恢复原始位置和大小
      setIsMaximized(false);
      setPosition(initialPosition.current);
    } else {
      // 保存当前位置和大小
      initialPosition.current = position;
      if (panelRef.current) {
        initialSize.current = {
          width: panelRef.current.offsetWidth,
          height: panelRef.current.offsetHeight
        };
      }
      setIsMaximized(true);
    }
  }, [isMaximized, position]);
  
  // 处理关闭
  const handleClose = () => {
    if (onClose) {
      onClose();
    }
  };
  
  // 处理翻译
  const handleTranslate = async () => {
    if (!originalText.trim() || !targetLang) return;
    
    setIsTranslating(true);
    try {
      const result = await translateText({
        text: originalText,
        from: sourceLang,
        to: targetLang
      });
      setTranslatedText(result);
    } catch (error) {
      console.error('[TRANSLATION_ERROR]', error);
      setTranslatedText('翻译失败，请重试');
    } finally {
      setIsTranslating(false);
    }
  };
  
  // 处理发送
  const handleSend = () => {
    if (onSend && translatedText.trim()) {
      onSend(originalText, translatedText, targetLang);
    }
  };
  
  // 处理目标语言变化（手动选择）
  const handleTargetLangChange = (lang: string) => {
    setTargetLang(lang);
    setHasManualTargetLang(true); // 标记为已手动选择
  };
  
  // 自动翻译
  useEffect(() => {
    if (originalText.trim() && targetLang) {
      // 重置translatedText，避免显示旧的翻译结果
      setTranslatedText('');
      handleTranslate();
    }
  }, [originalText, sourceLang, targetLang]);
  
  // 初始文本变化时更新
  useEffect(() => {
    setOriginalText(initialText);
  }, [initialText]);
  
  // 客户语言变化时更新目标语言 - 仅在未手动选择目标语言时生效
  useEffect(() => {
    // 只有在组件初始化阶段且未手动选择目标语言时，才使用customerLanguage更新目标语言
    if (customerLanguage && !hasManualTargetLang) {
      setTargetLang(customerLanguage);
    }
  }, [customerLanguage, hasManualTargetLang]);
  
  if (!visible) return null;
  
  return (
    <div 
      ref={panelRef}
      className={`translation-panel ${isMinimized ? 'minimized' : ''} ${isMaximized ? 'maximized' : ''}`}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`
      }}
    >
      {/* 标题栏 */}
      <div 
        ref={titleRef}
        className="translation-panel-header"
        onMouseDown={handleDragStart}
      >
        <div className="translation-panel-title">
          <span className="translation-panel-icon">🌍</span>
          <span>翻译助手</span>
          {customerName && (
            <span className="translation-panel-customer">
              {customerName}
            </span>
          )}
        </div>
        
        <div className="translation-panel-actions">
          <button 
            className="translation-panel-action-btn"
            onClick={handleMinimize}
            title={isMinimized ? '最大化' : '最小化'}
          >
            {isMinimized ? '⬜' : '—'}
          </button>
          <button 
            className="translation-panel-action-btn"
            onClick={handleMaximize}
            title={isMaximized ? '恢复' : '最大化'}
          >
            {isMaximized ? '⬜' : '⛶'}
          </button>
          <button 
            className="translation-panel-action-btn close"
            onClick={handleClose}
            title="关闭"
          >
            ✕
          </button>
        </div>
      </div>
      
      {/* 内容区域 */}
      {!isMinimized && (
        <div className="translation-panel-content">
          {/* 语言选择区 */}
          <div className="translation-panel-language-selector">
            <LanguageSelector 
              languages={SUPPORTED_LANGUAGES}
              value={sourceLang}
              onChange={setSourceLang}
              placeholder="自动检测"
              label="源语言"
            />
            
            <button className="translation-panel-switch-btn" onClick={() => {
              const temp = sourceLang;
              setSourceLang(targetLang);
              setTargetLang(temp);
              setHasManualTargetLang(true); // 切换语言也视为手动选择
            }} title="切换语言">
              ⇄
            </button>
            
            <LanguageSelector 
              languages={SUPPORTED_LANGUAGES}
              value={targetLang}
              onChange={handleTargetLangChange}
              placeholder="目标语言"
              label="目标语言"
            />
          </div>
          
          {/* 翻译区域 */}
          <div className="translation-panel-translate-area">
            {/* 原文 */}
            <div className="translation-panel-original">
              <div className="translation-panel-section-title">
                <span>原文</span>
                <span className="translation-panel-char-count">{originalText.length} 字符</span>
              </div>
              <textarea
                className="translation-panel-textarea"
                value={originalText}
                onChange={(e) => setOriginalText(e.target.value)}
                placeholder="请输入要翻译的文本..."
                rows={6}
              />
            </div>
            
            {/* 翻译按钮 */}
            <div className="translation-panel-translate-btn-container">
              <button 
                className="translation-panel-translate-btn"
                onClick={handleTranslate}
                disabled={isTranslating || !originalText.trim()}
              >
                {isTranslating ? '翻译中...' : '翻译'}
              </button>
            </div>
            
            {/* 译文 */}
            <div className="translation-panel-translated">
              <div className="translation-panel-section-title">
                <span>译文</span>
                <span className="translation-panel-char-count">{translatedText.length} 字符</span>
              </div>
              <textarea
                className="translation-panel-textarea"
                value={translatedText}
                onChange={(e) => setTranslatedText(e.target.value)}
                placeholder="翻译结果将显示在这里..."
                rows={6}
              />
            </div>
          </div>
          
          {/* 操作区域 */}
          <div className="translation-panel-footer">
            <button 
              className="translation-panel-action-btn secondary"
              onClick={() => setOriginalText('')}
              disabled={!originalText.trim()}
            >
              清空
            </button>
            <button 
              className="translation-panel-action-btn primary"
              onClick={handleSend}
              disabled={!translatedText.trim()}
            >
              发送翻译
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TranslationPanel;
