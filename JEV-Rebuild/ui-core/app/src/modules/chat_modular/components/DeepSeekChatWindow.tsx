import React, { useState, useRef, useEffect } from 'react';
import './DeepSeekChatWindow.css';
import { safeFetch } from '../../../main';

interface DeepSeekChatWindowProps {
  onClose: () => void;
}

const DeepSeekChatWindow: React.FC<DeepSeekChatWindowProps> = ({ onClose }) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [position, setPosition] = useState({ x: 20, y: 20 });
  const [size, setSize] = useState({ width: 600, height: 800 });
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0 });
  const windowRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number>();

  // 加载聊天历史
  useEffect(() => {
    // 异步加载聊天历史，避免阻塞渲染
    setTimeout(() => {
      const savedMessages = localStorage.getItem('deepseek_chat_history');
      if (savedMessages) {
        try {
          setMessages(JSON.parse(savedMessages));
        } catch (error) {
          console.error('Failed to load chat history:', error);
        }
      }

      const savedPosition = localStorage.getItem('deepseek_chat_position');
      if (savedPosition) {
        try {
          setPosition(JSON.parse(savedPosition));
        } catch (error) {
          console.error('Failed to load chat position:', error);
        }
      }

      const savedSize = localStorage.getItem('deepseek_chat_size');
      if (savedSize) {
        try {
          setSize(JSON.parse(savedSize));
        } catch (error) {
          console.error('Failed to load chat size:', error);
        }
      }
    }, 100);
  }, []);

  // 保存聊天历史
  useEffect(() => {
    localStorage.setItem('deepseek_chat_history', JSON.stringify(messages));
  }, [messages]);

  // 保存窗口状态
  useEffect(() => {
    if (!isMinimized && !isMaximized) {
      localStorage.setItem('deepseek_chat_position', JSON.stringify(position));
      localStorage.setItem('deepseek_chat_size', JSON.stringify(size));
    }
  }, [position, size, isMinimized, isMaximized]);

  // 拖动处理函数 - 超高性能版本
  const handleHeaderMouseDown = (e: React.MouseEvent) => {
    if (isMaximized) return;
    
    e.preventDefault();
    
    const window = windowRef.current;
    if (!window) return;
    
    // 获取初始位置
    const startX = e.clientX;
    const startY = e.clientY;
    const initialLeft = position.x;
    const initialTop = position.y;
    
    // 禁用文本选择，避免拖动时选中文本
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'grabbing';
    
    // 强制 GPU 加速
    window.style.willChange = 'transform';
    
    // 鼠标移动处理函数 - 极简版，无任何额外计算
    const handleMouseMove = (e: MouseEvent) => {
      // 计算偏移量（直接计算，无中间变量）
      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;
      
      // 使用 translate3d 强制 GPU 加速
      // 比 translate 更快，因为它会创建一个新的层
      window.style.transform = `translate3d(${deltaX}px, ${deltaY}px, 0)`;
    };
    
    // 鼠标释放处理函数
    const handleMouseUp = () => {
      // 移除事件监听器
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      
      // 恢复文本选择
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
      
      // 移除 will-change
      window.style.willChange = '';
      
      // 计算最终位置
      const transformValue = window.style.transform;
      const match = transformValue.match(/translate3d\(([^,]+)px, ([^,]+)px, ([^)]+)\)/);
      const deltaX = match ? parseFloat(match[1]) : 0;
      const deltaY = match ? parseFloat(match[2]) : 0;
      
      // 更新最终位置
      const finalLeft = Math.round(initialLeft + deltaX);
      const finalTop = Math.round(initialTop + deltaY);
      
      // 重置 transform
      window.style.transform = 'none';
      
      // 直接更新 DOM 位置
      window.style.left = `${finalLeft}px`;
      window.style.top = `${finalTop}px`;
      
      // 更新 React 状态（使用微任务队列，最快的更新方式）
      queueMicrotask(() => {
        setPosition({
          x: finalLeft,
          y: finalTop
        });
      });
    };
    
    // 添加事件监听器，使用 passive 提高性能
    // passive: true 告诉浏览器这个监听器不会调用 preventDefault
    document.addEventListener('mousemove', handleMouseMove, { passive: true });
    document.addEventListener('mouseup', handleMouseUp);
  };

  // 处理发送消息
  const handleSendMessage = async () => {
    if (!inputText.trim()) return;

    const newMessage = {
      id: Date.now().toString(),
      sender: 'user',
      content: inputText.trim(),
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, newMessage]);
    setInputText('');
    setIsTyping(true);

    // 调用真实的DeepSeek API
    try {
      // 使用 safeFetch 发送请求
      const response = await safeFetch('/api/persona/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: inputText.trim()
        })
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      
      const deepseekResponse = {
        id: (Date.now() + 1).toString(),
        sender: 'deepseek',
        content: data.response,
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, deepseekResponse]);
    } catch (error) {
      console.error('Failed to get DeepSeek response:', error);
      
      const errorMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'deepseek',
        content: '抱歉，获取回复时出错，请稍后再试。',
        timestamp: new Date().toISOString(),
        error: true
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  // 处理键盘事件
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };



  // 处理缩放开始
  const handleResizeMouseDown = (e: React.MouseEvent) => {
    if (!isMaximized && !isMinimized) {
      e.preventDefault();
      
      const window = windowRef.current;
      if (!window) return;
      
      // 获取初始大小
      const rect = window.getBoundingClientRect();
      const startX = e.clientX;
      const startY = e.clientY;
      const initialWidth = rect.width;
      const initialHeight = rect.height;
      
      // 标记为正在调整大小
      setIsResizing(true);
      setResizeStart({ x: startX, y: startY });
      
      // 鼠标移动处理函数
      const handleMouseMove = (e: MouseEvent) => {
        const deltaX = e.clientX - startX;
        const deltaY = e.clientY - startY;
        
        // 计算新大小
        const newWidth = Math.max(400, initialWidth + deltaX);
        const newHeight = Math.max(600, initialHeight + deltaY);
        
        // 直接修改 DOM 样式
        window.style.width = `${newWidth}px`;
        window.style.height = `${newHeight}px`;
      };
      
      // 鼠标释放处理函数
      const handleMouseUp = () => {
        // 移除事件监听器
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        
        // 更新最终大小状态
        const finalRect = window.getBoundingClientRect();
        setSize({
          width: finalRect.width,
          height: finalRect.height
        });
        
        // 标记为调整大小结束
        setIsResizing(false);
      };
      
      // 添加事件监听器
      document.addEventListener('mousemove', handleMouseMove, { passive: true });
      document.addEventListener('mouseup', handleMouseUp);
    }
  };

  // 处理最小化
  const handleMinimize = () => {
    setIsMinimized(!isMinimized);
  };

  // 处理最大化
  const handleMaximize = () => {
    setIsMaximized(!isMaximized);
  };

  return (
    <div 
      ref={windowRef}
      className={`deepseek-chat-window ${isMinimized ? 'minimized' : ''} ${isMaximized ? 'maximized' : ''}`}
      style={{
        width: isMinimized ? '300px' : isMaximized ? '90vw' : `${size.width}px`,
        height: isMinimized ? '48px' : isMaximized ? '90vh' : `${size.height}px`,
        left: isMaximized ? '5vw' : `${position.x}px`,
        top: isMaximized ? '5vh' : `${position.y}px`
      }}
    >
      {/* 聊天窗口头部 */}
      <div 
        className="deepseek-chat-header"
        onMouseDown={handleHeaderMouseDown}
      >
        <div className="deepseek-chat-title">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="#3b82f6"/>
            <path d="M2 17L12 22L22 17" fill="#3b82f6"/>
            <path d="M2 12L12 17L22 12" fill="#3b82f6"/>
          </svg>
          <span>DeepSeek 聊天</span>
        </div>
        <div className="deepseek-chat-controls">
          <button 
            className="deepseek-chat-control-btn"
            onClick={handleMinimize}
            title="最小化"
          >
            −
          </button>
          <button 
            className="deepseek-chat-control-btn"
            onClick={handleMaximize}
            title="最大化"
          >
            {isMaximized ? '☒' : '□'}
          </button>
          <button 
            className="deepseek-chat-control-btn close"
            onClick={onClose}
            title="关闭"
          >
            ×
          </button>
        </div>
      </div>

      {/* 消息区域 */}
      {!isMinimized && (
        <div className="deepseek-chat-messages">
          {/* 消息列表 */}
          {messages.map((message, index) => (
            <div key={index} className={`deepseek-chat-message ${message.sender}`}>
              <div className="deepseek-chat-message-bubble">
                {message.content}
              </div>
              {message.sender === 'user' && (
                <div className="deepseek-chat-message-actions">
                  <button className="deepseek-chat-action-btn" title="复制">
                    📋
                  </button>
                </div>
              )}
              {message.sender === 'deepseek' && (
                <div className="deepseek-chat-message-actions">
                  <button className="deepseek-chat-action-btn" title="复制">
                    📋
                  </button>
                  <button className="deepseek-chat-action-btn" title="重新生成">
                    🔄
                  </button>
                </div>
              )}
            </div>
          ))}
          
          {/* 打字指示器 */}
          {isTyping && (
            <div className="deepseek-chat-message deepseek">
              <div className="deepseek-chat-message-bubble">
                <div className="deepseek-typing-indicator">
                  <span className="dot"></span>
                  <span className="dot"></span>
                  <span className="dot"></span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 输入区域 */}
      {!isMinimized && (
        <div className="deepseek-chat-input-area">
          <textarea
            className="deepseek-chat-input"
            placeholder="向 DeepSeek 提问..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
          />
          <button 
            className="deepseek-chat-send-btn"
            onClick={handleSendMessage}
            disabled={!inputText.trim()}
          >
            →
          </button>
        </div>
      )}

      {/* 缩放手柄 */}
      {!isMinimized && !isMaximized && (
        <div 
          className="deepseek-chat-resize-handle"
          onMouseDown={handleResizeMouseDown}
        >
          ⋮⋮
        </div>
      )}
    </div>
  );
};

export default DeepSeekChatWindow;