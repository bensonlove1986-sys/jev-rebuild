import React, { useState, useRef, useEffect, ReactNode } from 'react';

interface SmartModalProps {
  isVisible: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  initialWidth?: number;
  initialHeight?: number;
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
  zIndex?: number;
}

const SmartModal: React.FC<SmartModalProps> = ({
  isVisible,
  onClose,
  title,
  children,
  initialWidth = 420,
  initialHeight = 360,
  minWidth = 360,
  minHeight = 260,
  maxWidth = window.innerWidth - 40,
  maxHeight = window.innerHeight - 40,
  zIndex = 9999
}) => {
  // 弹窗位置和尺寸状态
  const [position, setPosition] = useState({
    x: 200,
    y: 120
  });
  const [size, setSize] = useState({
    width: initialWidth,
    height: initialHeight
  });
  const [isMaximized, setIsMaximized] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);

  // 拖拽和缩放相关的引用
  const dragStartRef = useRef({ x: 0, y: 0 });
  const resizeStartRef = useRef({ x: 0, y: 0, width: 0, height: 0 });
  const originalSizeRef = useRef({ width: initialWidth, height: initialHeight });
  const originalPositionRef = useRef({ x: position.x, y: position.y });
  const modalRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);

  // 处理窗口大小变化
  useEffect(() => {
    const handleResize = () => {
      if (isMaximized) {
        setSize({
          width: window.innerWidth - 40,
          height: window.innerHeight - 40
        });
        setPosition({ x: 20, y: 20 });
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isMaximized]);

  // 处理拖拽开始
  const handleDragStart = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isMaximized) return;
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y
    };
    document.addEventListener('mousemove', handleDragMove);
    document.addEventListener('mouseup', handleDragEnd);
    // 阻止文本选择
    document.body.style.userSelect = 'none';
  };

  // 处理拖拽移动
  const handleDragMove = (e: MouseEvent) => {
    if (!isDragging) return;

    // 使用 requestAnimationFrame 优化性能
    requestAnimationFrame(() => {
      const newX = e.clientX - dragStartRef.current.x;
      const newY = e.clientY - dragStartRef.current.y;

      setPosition({
        x: Math.max(0, Math.min(newX, window.innerWidth - size.width - 20)),
        y: Math.max(0, Math.min(newY, window.innerHeight - size.height - 20))
      });
    });
  };

  // 处理拖拽结束
  const handleDragEnd = () => {
    setIsDragging(false);
    document.removeEventListener('mousemove', handleDragMove);
    document.removeEventListener('mouseup', handleDragEnd);
    // 恢复文本选择
    document.body.style.userSelect = '';
  };

  // 处理缩放开始
  const handleResizeStart = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isMaximized) return;
    e.stopPropagation();
    setIsResizing(true);
    resizeStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      width: size.width,
      height: size.height
    };
    document.addEventListener('mousemove', handleResizeMove);
    document.addEventListener('mouseup', handleResizeEnd);
  };

  // 处理缩放移动
  const handleResizeMove = (e: MouseEvent) => {
    if (!isResizing) return;

    // 使用 requestAnimationFrame 优化性能
    requestAnimationFrame(() => {
      const deltaX = e.clientX - resizeStartRef.current.x;
      const deltaY = e.clientY - resizeStartRef.current.y;

      const newWidth = Math.max(
        minWidth,
        Math.min(resizeStartRef.current.width + deltaX, maxWidth)
      );
      const newHeight = Math.max(
        minHeight,
        Math.min(resizeStartRef.current.height + deltaY, maxHeight)
      );

      setSize({ width: newWidth, height: newHeight });
    });
  };

  // 处理缩放结束
  const handleResizeEnd = () => {
    setIsResizing(false);
    document.removeEventListener('mousemove', handleResizeMove);
    document.removeEventListener('mouseup', handleResizeEnd);
  };

  // 处理最大化/还原
  const handleToggleMaximize = () => {
    if (isMaximized) {
      // 还原
      setIsMaximized(false);
      setSize(originalSizeRef.current);
      setPosition(originalPositionRef.current);
    } else {
      // 最大化
      originalSizeRef.current = size;
      originalPositionRef.current = position;
      setIsMaximized(true);
      setSize({
        width: window.innerWidth - 40,
        height: window.innerHeight - 40
      });
      setPosition({ x: 20, y: 20 });
    }
  };

  // 清理事件监听
  useEffect(() => {
    // 这个useEffect不需要依赖项，因为我们只是在组件卸载时清理事件监听
    // eslint-disable-next-line react-hooks/exhaustive-deps
    return () => {
      document.removeEventListener('mousemove', handleDragMove);
      document.removeEventListener('mouseup', handleDragEnd);
      document.removeEventListener('mousemove', handleResizeMove);
      document.removeEventListener('mouseup', handleResizeEnd);
    };
  }, []);

  // 点击模态框外部关闭
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    if (isVisible) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isVisible, onClose]);

  if (!isVisible) return null;

  return (
    <div
      ref={modalRef}
      className="smart-modal"
      style={{
        position: 'fixed',
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: `${size.width}px`,
        height: `${size.height}px`,
        zIndex,
        backgroundColor: 'white',
        borderRadius: '12px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        border: '1px solid #e8e8e8',
        cursor: isDragging ? 'move' : isResizing ? 'nwse-resize' : 'default',
        // 移除可能影响拖拽的 transition
        willChange: 'left, top, width, height'
      }}
    >
      {/* 标题栏 - 可拖拽 */}
      <div
        ref={headerRef}
        className="smart-modal-header"
        style={{
          padding: '12px 16px',
          backgroundColor: '#fafafa',
          borderBottom: '1px solid #e8e8e8',
          cursor: isMaximized ? 'default' : 'move',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          userSelect: 'none',
          '-webkit-user-select': 'none',
          '-moz-user-select': 'none'
        }}
        onMouseDown={handleDragStart}
      >
        <div className="smart-modal-title" style={{
          fontSize: '16px',
          fontWeight: 500,
          color: '#333',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }}>
          {title}
        </div>
        <div className="smart-modal-actions" style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          {/* 最大化/还原按钮 */}
          <button
            className="smart-modal-action-btn"
            onClick={handleToggleMaximize}
            style={{
              width: '24px',
              height: '24px',
              borderRadius: '4px',
              border: 'none',
              backgroundColor: 'transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '14px',
              color: '#666',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#f0f0f0';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
            title={isMaximized ? '还原' : '最大化'}
          >
            {isMaximized ? '⤢' : '⬜'}
          </button>
          {/* 关闭按钮 */}
          <button
            className="smart-modal-close-btn"
            onClick={onClose}
            style={{
              width: '24px',
              height: '24px',
              borderRadius: '4px',
              border: 'none',
              backgroundColor: 'transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '16px',
              color: '#666',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#ff4d4f';
              e.currentTarget.style.color = 'white';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = '#666';
            }}
            title="关闭"
          >
            ✕
          </button>
        </div>
      </div>

      {/* 内容区 */}
      <div
        className="smart-modal-content"
        style={{
          flex: 1,
          padding: '16px',
          overflow: 'auto'
        }}
      >
        {children}
      </div>

      {/* 缩放控制柄 */}
      {!isMaximized && (
        <div
          className="smart-modal-resize-handle"
          style={{
            position: 'absolute',
            right: '0',
            bottom: '0',
            width: '30px',
            height: '30px',
            cursor: 'nwse-resize',
            // 更明显的缩放控制柄样式
            background: 'linear-gradient(135deg, transparent 60%, #d9d9d9 60%, #d9d9d9 75%, transparent 75%)',
            backgroundPosition: 'bottom right',
            backgroundRepeat: 'no-repeat',
            zIndex: 10,
            // 确保鼠标事件能被正确捕获
            pointerEvents: 'auto'
          }}
          onMouseDown={handleResizeStart}
        ></div>
      )}

      {/* 样式 */}
      <style jsx>{`
        .smart-modal {
          will-change: transform, left, top, width, height;
        }
        
        .smart-modal-content {
          scrollbar-width: thin;
          scrollbar-color: #d9d9d9 transparent;
        }
        
        .smart-modal-content::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        
        .smart-modal-content::-webkit-scrollbar-track {
          background: transparent;
        }
        
        .smart-modal-content::-webkit-scrollbar-thumb {
          background-color: #d9d9d9;
          border-radius: 3px;
        }
        
        .smart-modal-content::-webkit-scrollbar-thumb:hover {
          background-color: #bfbfbf;
        }
      `}</style>
    </div>
  );
};

export default SmartModal;
