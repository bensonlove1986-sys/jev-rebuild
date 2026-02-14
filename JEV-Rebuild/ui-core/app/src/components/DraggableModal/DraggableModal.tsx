import React, { useRef, useEffect, useState, useCallback, ReactNode, useMemo } from 'react';
import { modalManager } from '../../modules/chat_modular/ui/ModalManager';

interface DraggableModalProps {
  isVisible: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  initialWidth?: number;
  initialHeight?: number;
  disableEscClose?: boolean;
  disableBackdropClose?: boolean;
}

const DraggableModal: React.FC<DraggableModalProps> = ({
  isVisible,
  onClose,
  title,
  children,
  initialWidth = 520,
  initialHeight = 420,
  disableEscClose = false,
  disableBackdropClose = false
}) => {
  // Modal 管理器相关
  const modalId = useMemo(() => crypto.randomUUID(), []);
  const zIndex = useMemo(() => modalManager.register(modalId), []);

  // 使用 useRef 存储坐标和尺寸，不走 state
  const rootRef = useRef<HTMLDivElement>(null);
  const dragHandleRef = useRef<HTMLDivElement>(null);
  const resizeHandleRef = useRef<HTMLDivElement>(null);
  
  // 位置和尺寸的状态
  const posRef = useRef({ x: 0, y: 0 });
  const [size, setSize] = useState({ width: initialWidth, height: initialHeight });
  
  // 拖拽和缩放状态引用
  const draggingRef = useRef(false);
  const resizingRef = useRef(false);
  
  // 起始位置引用
  const startRef = useRef({ x: 0, y: 0 });
  const resizeStartRef = useRef({ x: 0, y: 0, width: 0, height: 0 });
  
  // 缩放方向引用
  const resizeDirectionRef = useRef('bottom-right');

  // 注册和激活 modal
  useEffect(() => {
    modalManager.activate(modalId);
    return () => modalManager.unregister(modalId);
  }, [modalId]);

  // ESC 键处理
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !disableEscClose) {
        // 只有当当前 modal 是活动状态时才关闭
        const activeModal = modalManager.getActiveModalId();
        if (activeModal === modalId) {
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [modalId, onClose, disableEscClose]);

  // 拖拽实现 - 使用useEffect监听拖拽手柄变化
  useEffect(() => {
    if (!isVisible) return;
    
    // 等待DOM渲染完成，确保dragHandleRef.current已被赋值
    const checkAndSetupDrag = () => {
      const header = dragHandleRef.current;
      if (!header) return;

      const onMouseDown = (e: MouseEvent) => {
        draggingRef.current = true;
        startRef.current = {
          x: e.clientX - posRef.current.x,
          y: e.clientY - posRef.current.y,
        };
        // 阻止文本选择
        document.body.style.userSelect = 'none';
      };

      const onMouseMove = (e: MouseEvent) => {
        if (!draggingRef.current) return;
        
        // 使用 requestAnimationFrame 优化性能
        requestAnimationFrame(() => {
          posRef.current = {
            x: e.clientX - startRef.current.x,
            y: e.clientY - startRef.current.y,
          };
          
          // 使用 transform 实现拖拽，避免重渲染
          if (rootRef.current) {
            rootRef.current.style.transform = `translate(${posRef.current.x}px, ${posRef.current.y}px)`;
          }
        });
      };

      const onMouseUp = () => {
        draggingRef.current = false;
        document.body.style.userSelect = '';
      };

      header.addEventListener('mousedown', onMouseDown);
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);

      return () => {
        header.removeEventListener('mousedown', onMouseDown);
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
      };
    };

    // 使用requestAnimationFrame确保DOM已渲染完成且布局已更新
    const rafId = requestAnimationFrame(() => {
      const cleanup = checkAndSetupDrag();
      
      // 再次检查，确保万无一失
      const timer = setTimeout(() => {
        const delayedCleanup = checkAndSetupDrag();
        if (delayedCleanup) {
          // 如果延迟检查后设置了新的监听器，需要清理之前的监听器
          if (cleanup) cleanup();
        }
      }, 0);

      return () => {
        if (cleanup) cleanup();
        clearTimeout(timer);
      };
    });

    return () => {
      cancelAnimationFrame(rafId);
    };
  }, [isVisible]);

  // 缩放实现
  useEffect(() => {
    if (!isVisible) return;
    
    // 等待DOM渲染完成，确保rootRef.current已被赋值
    const checkAndSetupResize = () => {
      const root = rootRef.current;
      if (!root) return;



      const onResizeMouseDown = (e: MouseEvent, direction: string) => {
        resizingRef.current = true;
        resizeDirectionRef.current = direction;
        resizeStartRef.current = {
          x: e.clientX,
          y: e.clientY,
          width: size.width,
          height: size.height,
        };
        e.stopPropagation();
        // 阻止文本选择
        document.body.style.userSelect = 'none';
      };

      const onResizeMove = (e: MouseEvent) => {
        if (!resizingRef.current) return;
        
        // 使用 requestAnimationFrame 优化性能
        requestAnimationFrame(() => {
          const { x, y, width, height } = resizeStartRef.current;
          const deltaX = e.clientX - x;
          const deltaY = e.clientY - y;
          
          let newWidth = width;
          let newHeight = height;

          // 根据方向计算新的尺寸
          switch (resizeDirectionRef.current) {
            case 'bottom-right':
              newWidth = width + deltaX;
              newHeight = height + deltaY;
              break;
            case 'bottom-left':
              newWidth = width - deltaX;
              newHeight = height + deltaY;
              break;
            case 'top-right':
              newWidth = width + deltaX;
              newHeight = height - deltaY;
              break;
            case 'top-left':
              newWidth = width - deltaX;
              newHeight = height - deltaY;
              break;
            case 'right':
              newWidth = width + deltaX;
              newHeight = height;
              break;
            case 'left':
              newWidth = width - deltaX;
              newHeight = height;
              break;
            case 'bottom':
              newWidth = width;
              newHeight = height + deltaY;
              break;
            case 'top':
              newWidth = width;
              newHeight = height - deltaY;
              break;
          }
          
          // 确保尺寸为正数
          newWidth = Math.max(50, newWidth);
          newHeight = Math.max(50, newHeight);

          // 更新尺寸状态
          setSize({ width: newWidth, height: newHeight });
        });
      };

      const onResizeUp = () => {
        resizingRef.current = false;
        document.body.style.userSelect = '';
      };

      // 添加所有方向的缩放手柄事件
      const resizeHandles = root.querySelectorAll('.ai-modal-resize-handle');
      resizeHandles.forEach(handle => {
        const direction = handle.getAttribute('data-direction') || 'bottom-right';
        handle.addEventListener('mousedown', (e) => onResizeMouseDown(e as MouseEvent, direction));
      });

      window.addEventListener('mousemove', onResizeMove);
      window.addEventListener('mouseup', onResizeUp);

      return () => {
        resizeHandles.forEach(handle => {
          const direction = handle.getAttribute('data-direction') || 'bottom-right';
          handle.removeEventListener('mousedown', (e) => onResizeMouseDown(e as MouseEvent, direction));
        });
        window.removeEventListener('mousemove', onResizeMove);
        window.removeEventListener('mouseup', onResizeUp);
      };
    };

    // 使用requestAnimationFrame确保DOM已渲染完成且布局已更新
    const rafId = requestAnimationFrame(() => {
      const cleanup = checkAndSetupResize();
      
      // 再次检查，确保万无一失
      const timer = setTimeout(() => {
        const delayedCleanup = checkAndSetupResize();
        if (delayedCleanup) {
          // 如果延迟检查后设置了新的监听器，需要清理之前的监听器
          if (cleanup) cleanup();
        }
      }, 0);

      return () => {
        if (cleanup) cleanup();
        clearTimeout(timer);
      };
    });

    return () => {
      cancelAnimationFrame(rafId);
    };
  }, [isVisible]);

  // 清理事件监听
  useEffect(() => {
    return () => {
      // 恢复文本选择
      document.body.style.userSelect = '';
    };
  }, []);

  // 如果不可见，直接返回 null
  if (!isVisible) return null;

  return (
    <>
      {/* 遮罩层 - 只在当前 modal 激活时显示 */}
      <div
        style={{
          position: 'fixed',
          top: '0',
          left: '0',
          right: '0',
          bottom: '0',
          backgroundColor: 'transparent', // 背景不虚化
          zIndex: zIndex - 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none' // 允许点击背景内容
        }}
      />

      {/* 内容层 */}
      <div
        style={{
          position: 'fixed',
          top: '0',
          left: '0',
          right: '0',
          bottom: '0',
          zIndex: zIndex,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none'
        }}
      >
        <div
          className="ai-modal-root"
          ref={rootRef}
          style={{
            position: 'relative',
            width: `${size.width}px`,
            height: `${size.height}px`,
            backgroundColor: '#fff',
            borderRadius: '8px',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2)',
            userSelect: 'none',
            transform: `translate(${posRef.current.x}px, ${posRef.current.y}px)`,
            pointerEvents: 'auto',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          {/* Header：拖拽手柄 */}
          <div
            className="ai-modal-header"
            ref={dragHandleRef}
            style={{
              height: '44px',
              cursor: 'move',
              padding: '0 12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontWeight: 600,
              borderBottom: '1px solid #eee',
              backgroundColor: '#fafafa',
              fontSize: `${Math.max(14, Math.min(18, size.width / 80))}px`
            }}
          >
            <span>{title}</span>
            <button
              onClick={onClose}
              style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                border: 'none',
                backgroundColor: 'transparent',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '16px',
                color: '#999',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f0f0f0';
                e.currentTarget.style.color = '#666';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = '#999';
              }}
              onMouseDown={(e) => e.stopPropagation()}
            >
              ✕
            </button>
          </div>

          {/* 内容区 */}
          <div
            className="ai-modal-body"
            style={{
              flex: 1,
              minHeight: 0,
              overflow: 'auto',
              padding: '16px',
              fontSize: `${Math.max(10, Math.min(16, size.width / 80))}px`,
              lineHeight: `${Math.max(1.4, Math.min(1.6, size.width / 800))}`
            }}
          >
            {/* 包装 children，为输入框添加焦点保护 */}
            <div
              style={{
                height: '100%',
                overflow: 'auto'
              }}
              onClick={(e) => {
                // 确保点击内容区也激活当前 modal
                modalManager.activate(modalId);
              }}
            >
              {children}
            </div>
          </div>

          {/* 四个角的 Resize 手柄 */}
          <div
            className="ai-modal-resize-handle"
            data-direction="top-left"
            style={{
              position: 'absolute',
              left: '0',
              top: '0',
              width: '8px',
              height: '8px',
              cursor: 'nwse-resize',
              backgroundColor: '#d9d9d9',
              borderRadius: '0 0 4px 0',
              border: '1px solid #bfbfbf',
              boxShadow: '0 0 5px rgba(0, 0, 0, 0.1)'
            }}
            onMouseDown={(e) => {
              e.stopPropagation();
              modalManager.activate(modalId);
            }}
          />
          <div
            className="ai-modal-resize-handle"
            data-direction="top-right"
            style={{
              position: 'absolute',
              right: '0',
              top: '0',
              width: '8px',
              height: '8px',
              cursor: 'nesw-resize',
              backgroundColor: '#d9d9d9',
              borderRadius: '0 0 0 4px',
              border: '1px solid #bfbfbf',
              boxShadow: '0 0 5px rgba(0, 0, 0, 0.1)'
            }}
            onMouseDown={(e) => {
              e.stopPropagation();
              modalManager.activate(modalId);
            }}
          />
          <div
            className="ai-modal-resize-handle"
            data-direction="bottom-left"
            style={{
              position: 'absolute',
              left: '0',
              bottom: '0',
              width: '8px',
              height: '8px',
              cursor: 'nesw-resize',
              backgroundColor: '#d9d9d9',
              borderRadius: '0 4px 0 0',
              border: '1px solid #bfbfbf',
              boxShadow: '0 0 5px rgba(0, 0, 0, 0.1)'
            }}
            onMouseDown={(e) => {
              e.stopPropagation();
              modalManager.activate(modalId);
            }}
          />
          <div
            className="ai-modal-resize-handle"
            data-direction="bottom-right"
            style={{
              position: 'absolute',
              right: '0',
              bottom: '0',
              width: '8px',
              height: '8px',
              cursor: 'nwse-resize',
              backgroundColor: '#d9d9d9',
              borderRadius: '4px 0 0 0',
              border: '1px solid #bfbfbf',
              boxShadow: '0 0 5px rgba(0, 0, 0, 0.1)'
            }}
            onMouseDown={(e) => {
              e.stopPropagation();
              modalManager.activate(modalId);
            }}
          />
          
          {/* 四条边的 Resize 手柄 */}
          <div
            className="ai-modal-resize-handle"
            data-direction="top"
            style={{
              position: 'absolute',
              left: '50%',
              top: '0',
              width: '20px',
              height: '4px',
              marginLeft: '-10px',
              cursor: 'ns-resize',
              backgroundColor: '#d9d9d9',
              border: '1px solid #bfbfbf',
              boxShadow: '0 0 5px rgba(0, 0, 0, 0.1)'
            }}
            onMouseDown={(e) => {
              e.stopPropagation();
              modalManager.activate(modalId);
            }}
          />
          <div
            className="ai-modal-resize-handle"
            data-direction="bottom"
            style={{
              position: 'absolute',
              left: '50%',
              bottom: '0',
              width: '20px',
              height: '4px',
              marginLeft: '-10px',
              cursor: 'ns-resize',
              backgroundColor: '#d9d9d9',
              border: '1px solid #bfbfbf',
              boxShadow: '0 0 5px rgba(0, 0, 0, 0.1)'
            }}
            onMouseDown={(e) => {
              e.stopPropagation();
              modalManager.activate(modalId);
            }}
          />
          <div
            className="ai-modal-resize-handle"
            data-direction="left"
            style={{
              position: 'absolute',
              left: '0',
              top: '50%',
              width: '4px',
              height: '20px',
              marginTop: '-10px',
              cursor: 'ew-resize',
              backgroundColor: '#d9d9d9',
              border: '1px solid #bfbfbf',
              boxShadow: '0 0 5px rgba(0, 0, 0, 0.1)'
            }}
            onMouseDown={(e) => {
              e.stopPropagation();
              modalManager.activate(modalId);
            }}
          />
          <div
            className="ai-modal-resize-handle"
            data-direction="right"
            style={{
              position: 'absolute',
              right: '0',
              top: '50%',
              width: '4px',
              height: '20px',
              marginTop: '-10px',
              cursor: 'ew-resize',
              backgroundColor: '#d9d9d9',
              border: '1px solid #bfbfbf',
              boxShadow: '0 0 5px rgba(0, 0, 0, 0.1)'
            }}
            onMouseDown={(e) => {
              e.stopPropagation();
              modalManager.activate(modalId);
            }}
          />
        </div>
      </div>
    </>
  );
};

export default DraggableModal;
