import React, { useState, useRef, useEffect } from 'react';

const DeepSeekFloatingChat = () => {
  // 窗口状态
  const [visible, setVisible] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [position, setPosition] = useState({ x: 80, y: 80 });
  const [size, setSize] = useState({ width: 400, height: 500 });
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0 });
  
  const windowRef = useRef(null);

  // 初始化窗口状态
  useEffect(() => {
    console.log('[DS_FLOAT_WINDOW_INIT] Initializing DeepSeek floating window');
    
    // 从localStorage加载窗口状态
    const savedState = localStorage.getItem('deepseek_chat_window_state');
    if (savedState) {
      try {
        const state = JSON.parse(savedState);
        setPosition({ x: state.x || 80, y: state.y || 80 });
        setSize({ width: state.width || 400, height: state.height || 500 });
        setMinimized(state.minimized || false);
        setVisible(state.visible || false);
      } catch (error) {
        console.error('[DS_FLOAT_WINDOW_ERROR] Failed to load window state:', error);
      }
    }

    // 从localStorage加载聊天历史
    const savedHistory = localStorage.getItem('deepseek_chat_history_local');
    if (savedHistory) {
      try {
        const history = JSON.parse(savedHistory);
        setMessages(history);
      } catch (error) {
        console.error('[DS_FLOAT_WINDOW_ERROR] Failed to load chat history:', error);
      }
    }
  }, []);

  // 保存窗口状态到localStorage
  useEffect(() => {
    const windowState = {
      x: position.x,
      y: position.y,
      width: size.width,
      height: size.height,
      minimized: minimized,
      visible: visible
    };
    localStorage.setItem('deepseek_chat_window_state', JSON.stringify(windowState));
  }, [position, size, minimized, visible]);

  // 保存聊天历史到localStorage
  useEffect(() => {
    localStorage.setItem('deepseek_chat_history_local', JSON.stringify(messages));
  }, [messages]);

  // 切换窗口显示/隐藏
  const toggleFloatingWindow = () => {
    setVisible(!visible);
    if (!visible && minimized) {
      setMinimized(false);
    }
  };

  // 处理窗口拖动开始
  const handleDragStart = (e) => {
    if (!minimized) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
      console.log('[DS_FLOAT_WINDOW_DRAG] Starting drag');
    }
  };

  // 处理窗口拖动中
  const handleDragMove = (e) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  // 处理窗口拖动结束
  const handleDragEnd = () => {
    setIsDragging(false);
    console.log('[DS_FLOAT_WINDOW_DRAG] Drag ended');
  };

  // 处理窗口缩放开始
  const handleResizeStart = (e) => {
    if (!minimized) {
      setIsResizing(true);
      setResizeStart({ x: e.clientX, y: e.clientY });
      console.log('[DS_FLOAT_WINDOW_RESIZE] Starting resize');
    }
  };

  // 处理窗口缩放中
  const handleResizeMove = (e) => {
    if (isResizing) {
      setSize({
        width: Math.max(300, size.width + (e.clientX - resizeStart.x)),
        height: Math.max(400, size.height + (e.clientY - resizeStart.y))
      });
      setResizeStart({ x: e.clientX, y: e.clientY });
    }
  };

  // 处理窗口缩放结束
  const handleResizeEnd = () => {
    setIsResizing(false);
    console.log('[DS_FLOAT_WINDOW_RESIZE] Resize ended');
  };

  // 全局鼠标事件监听
  useEffect(() => {
    if (isDragging || isResizing) {
      document.addEventListener('mousemove', isDragging ? handleDragMove : handleResizeMove);
      document.addEventListener('mouseup', isDragging ? handleDragEnd : handleResizeEnd);
      
      return () => {
        document.removeEventListener('mousemove', isDragging ? handleDragMove : handleResizeMove);
        document.removeEventListener('mouseup', isDragging ? handleDragEnd : handleResizeEnd);
      };
    }
  }, [isDragging, isResizing, dragStart, resizeStart, position, size]);

  // 模拟发送消息
  const sendDeepSeekChatMessage = () => {
    if (!inputText.trim()) return;

    console.log('[DS_FLOAT_CHAT_SEND] Sending message:', inputText);

    // 添加用户消息
    const userMessage = {
      id: Date.now().toString(),
      sender: 'user',
      content: inputText.trim(),
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');

    // 模拟DeepSeek回复
    setTimeout(() => {
      const mockResponse = {
        id: (Date.now() + 1).toString(),
        sender: 'deepseek',
        content: `This is a mock response to: "${inputText.trim()}"`,
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, mockResponse]);
    }, 1000);
  };

  // 处理键盘事件
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendDeepSeekChatMessage();
    }
  };

  // 渲染窗口
  if (!visible) {
    return (
      <button
        onClick={toggleFloatingWindow}
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          padding: '12px 24px',
          backgroundColor: 'rgba(59, 130, 246, 0.9)',
          color: 'white',
          border: 'none',
          borderRadius: '24px',
          cursor: 'pointer',
          fontSize: '14px',
          fontWeight: '600',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
          zIndex: 10000,
          transition: 'all 0.2s ease'
        }}
      >
        DeepSeek Chat
      </button>
    );
  }

  return (
    <>
      {/* 浮动窗口 */}
      <div
        ref={windowRef}
        style={{
          position: 'fixed',
          left: `${position.x}px`,
          top: `${position.y}px`,
          width: minimized ? '300px' : `${size.width}px`,
          height: minimized ? '48px' : `${size.height}px`,
          backgroundColor: 'rgba(15, 23, 42, 0.9)',
          borderRadius: '12px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          zIndex: 10000,
          overflow: 'hidden',
          transition: 'all 0.2s ease'
        }}
      >
        {/* 窗口标题栏 */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '12px 16px',
            backgroundColor: 'rgba(30, 41, 59, 0.8)',
            cursor: isDragging ? 'grabbing' : 'grab'
          }}
          onMouseDown={handleDragStart}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="#3b82f6"/>
              <path d="M2 17L12 22L22 17" fill="#3b82f6"/>
              <path d="M2 12L12 17L22 12" fill="#3b82f6"/>
            </svg>
            <span style={{ color: 'white', fontSize: '14px', fontWeight: '600' }}>
              DeepSeek Chat
            </span>
          </div>
          
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setMinimized(!minimized)}
              style={{
                padding: '4px 8px',
                backgroundColor: 'transparent',
                color: 'rgba(255, 255, 255, 0.7)',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              {minimized ? '□' : '−'}
            </button>
            <button
              onClick={() => setVisible(false)}
              style={{
                padding: '4px 8px',
                backgroundColor: 'transparent',
                color: 'rgba(255, 255, 255, 0.7)',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              ×
            </button>
          </div>
        </div>

        {/* 消息区域 */}
        {!minimized && (
          <div
            style={{
              height: 'calc(100% - 112px)',
              padding: '16px',
              overflowY: 'auto',
              color: 'white'
            }}
          >
            {messages.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'rgba(255, 255, 255, 0.5)', padding: '40px 0' }}>
                No messages yet. Start chatting with DeepSeek!
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  style={{
                    marginBottom: '16px',
                    display: 'flex',
                    flexDirection: message.sender === 'user' ? 'row-reverse' : 'row',
                    gap: '12px'
                  }}
                >
                  <div
                    style={{
                      maxWidth: '70%',
                      padding: '12px 16px',
                      borderRadius: '18px',
                      backgroundColor: message.sender === 'user' 
                        ? 'rgba(59, 130, 246, 0.8)' 
                        : 'rgba(75, 85, 99, 0.8)',
                      wordBreak: 'break-word'
                    }}
                  >
                    {message.content}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* 输入区域 */}
        {!minimized && (
          <div
            style={{
              padding: '16px',
              borderTop: '1px solid rgba(255, 255, 255, 0.1)',
              backgroundColor: 'rgba(15, 23, 42, 0.8)'
            }}
          >
            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message..."
                style={{
                  flex: 1,
                  padding: '12px',
                  backgroundColor: 'rgba(30, 41, 59, 0.8)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '12px',
                  color: 'white',
                  fontSize: '14px',
                  resize: 'none',
                  minHeight: '40px',
                  maxHeight: '120px'
                }}
                rows={1}
              />
              <button
                onClick={sendDeepSeekChatMessage}
                disabled={!inputText.trim()}
                style={{
                  padding: '12px 20px',
                  backgroundColor: inputText.trim() ? 'rgba(59, 130, 246, 0.9)' : 'rgba(59, 130, 246, 0.4)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  cursor: inputText.trim() ? 'pointer' : 'not-allowed',
                  fontSize: '14px',
                  fontWeight: '600'
                }}
              >
                Send
              </button>
            </div>
          </div>
        )}

        {/* 缩放手柄 */}
        {!minimized && (
          <div
            onMouseDown={handleResizeStart}
            style={{
              position: 'absolute',
              bottom: '0',
              right: '0',
              width: '16px',
              height: '16px',
              cursor: 'se-resize',
              backgroundImage: 'linear-gradient(45deg, transparent 50%, rgba(255, 255, 255, 0.3) 50%)',
              backgroundSize: '10px 10px'
            }}
          />
        )}
      </div>
    </>
  );
};

export default DeepSeekFloatingChat;