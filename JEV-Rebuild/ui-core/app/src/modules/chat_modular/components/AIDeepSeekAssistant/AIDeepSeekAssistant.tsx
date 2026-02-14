import React, { useState, useCallback, useRef, useEffect } from 'react';
import AIDeepSeekPopup from './AIDeepSeekPopup';
import { safeFetch } from '../../../../main';
import './AIDeepSeekAssistant.css';

interface AIDeepSeekAssistantProps {
  inputText: string;
  onSendMessage: (message: string) => void;
  chatId?: string;
  disabled?: boolean;
}

interface ResponseStyle {
  id: string;
  name: string;
  description: string;
  prompt: string;
}

const responseStyles: ResponseStyle[] = [
  {
    id: 'friendly',
    name: '友好',
    description: '亲切友好的回复风格',
    prompt: '请以友好、亲切的语气回复客户，使用简单易懂的语言，让客户感受到我们的热情服务。'
  },
  {
    id: 'professional',
    name: '专业',
    description: '专业、正式的回复风格',
    prompt: '请以专业、正式的语气回复客户，提供详细、准确的信息，展现我们的专业素养。'
  },
  {
    id: 'concise',
    name: '简洁',
    description: '简洁明了的回复风格',
    prompt: '请以简洁、明了的语气回复客户，直接回答客户的问题，避免多余的寒暄。'
  },
  {
    id: 'detailed',
    name: '详细',
    description: '详细、全面的回复风格',
    prompt: '请以详细、全面的语气回复客户，提供完整的信息和解决方案，确保客户能够完全理解。'
  }
];

const AIDeepSeekAssistant: React.FC<AIDeepSeekAssistantProps> = ({ 
  inputText, 
  onSendMessage, 
  chatId, 
  disabled = false 
}) => {
  const [showPopup, setShowPopup] = useState(false);
  const [selectedStyle, setSelectedStyle] = useState<ResponseStyle>(responseStyles[0]);
  const [aiResponse, setAiResponse] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');
  const [localInputText, setLocalInputText] = useState('');
  const [popupSize, setPopupSize] = useState({ width: 450, height: 350 });
  const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0 });
  const [isResizing, setIsResizing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  
  const popupRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const resizeTimeoutRef = useRef<NodeJS.Timeout>();
  const resizeStartRef = useRef({ x: 0, y: 0 });
  const dragStartRef = useRef({ x: 0, y: 0 });
  const dragPositionRef = useRef({ x: 0, y: 0 });
  const animationFrameRef = useRef<number>();
  
  // 调用DEEPSEEK API生成回复
  const generateAIResponse = useCallback(async (text: string, style: ResponseStyle) => {
    if (!text.trim()) {
      setAiResponse('');
      setError('');
      return;
    }
    
    setIsGenerating(true);
    setError('');
    
    try {
      const response = await safeFetch('/api/ai/deepseek', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          prompt: text,
          style: style.id,
          stylePrompt: style.prompt,
          chat_id: chatId
        })
      });
      
      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.response) {
        setAiResponse(data.response);
      } else {
        setError('AI生成失败：未返回有效回复');
        setAiResponse('');
      }
    } catch (err) {
      console.error('AI response generation error:', err);
      setError('AI服务暂时不可用，请稍后重试');
      setAiResponse('');
    } finally {
      setIsGenerating(false);
    }
  }, [chatId]);
  
  // 防抖处理AI回复请求
  const debouncedGenerateResponse = useCallback((text: string, style: ResponseStyle) => {
    if (resizeTimeoutRef.current) {
      clearTimeout(resizeTimeoutRef.current);
    }
    
    resizeTimeoutRef.current = setTimeout(() => {
      generateAIResponse(text, style);
    }, 500);
  }, [generateAIResponse]);
  
  // 当输入文本或回复风格变化时，触发AI回复生成
  useEffect(() => {
    const textToGenerate = localInputText || inputText;
    debouncedGenerateResponse(textToGenerate, selectedStyle);
  }, [inputText, localInputText, selectedStyle, debouncedGenerateResponse]);
  
  // 计算弹窗位置
  useEffect(() => {
    if (showPopup && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setPopupPosition({
        x: rect.left,
        y: rect.bottom + window.scrollY + 10
      });
    }
  }, [showPopup]);
  
  // 点击外部关闭弹窗
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        popupRef.current && 
        buttonRef.current &&
        !popupRef.current.contains(event.target as Node) &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setShowPopup(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  // 处理回复风格选择
  const handleStyleSelect = (style: ResponseStyle) => {
    setSelectedStyle(style);
  };
  
  // 处理发送AI回复
  const handleSendResponse = () => {
    if (aiResponse) {
      onSendMessage(aiResponse);
      setShowPopup(false);
    }
  };
  
  // 处理直接发送
  const handleDirectSend = () => {
    if (aiResponse) {
      onSendMessage(aiResponse);
    }
  };
  
  // 处理本地输入变化
  const handleInputChange = (text: string) => {
    setLocalInputText(text);
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
    const minWidth = 350;
    const minHeight = 250;
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
      const newWidth = parseInt(popupRef.current.style.width || '450', 10);
      const newHeight = parseInt(popupRef.current.style.height || '350', 10);
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
      
      // 添加边界检查，确保弹窗不超出屏幕范围
      const maxX = window.innerWidth - popupSize.width - 20;
      const maxY = window.innerHeight - popupSize.height - 20;
      
      const boundedX = Math.max(0, Math.min(maxX, newX));
      const boundedY = Math.max(0, Math.min(maxY, newY));
      
      // 直接修改DOM样式，避免频繁触发React渲染
      if (popupRef.current) {
        popupRef.current.style.left = `${boundedX}px`;
        popupRef.current.style.top = `${boundedY}px`;
      }
      
      dragPositionRef.current = { x: boundedX, y: boundedY };
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
  }, [isDragging, popupSize]);
  
  return (
    <>
      {/* AI助手按钮 */}
      <button
        ref={buttonRef}
        className="chat-composer-ai-btn"
        onClick={() => setShowPopup(!showPopup)}
        disabled={disabled}
        title="AI DeepSeek助手"
      >
        🤖
      </button>
      
      {/* AI助手弹窗 */}
      {showPopup && (
        <AIDeepSeekPopup
          ref={popupRef}
          size={popupSize}
          position={popupPosition}
          inputText={localInputText || inputText}
          aiResponse={aiResponse}
          selectedStyle={selectedStyle}
          responseStyles={responseStyles}
          isGenerating={isGenerating}
          error={error}
          onStyleSelect={handleStyleSelect}
          onSendResponse={handleSendResponse}
          onDirectSend={handleDirectSend}
          onInputChange={handleInputChange}
          onResizeStart={handleResizeStart}
          onDragStart={handleDragStart}
          onClose={() => setShowPopup(false)}
        />
      )}
    </>
  );
};

export default AIDeepSeekAssistant;