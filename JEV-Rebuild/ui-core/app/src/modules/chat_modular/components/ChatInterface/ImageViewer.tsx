import React, { useState, useRef, useEffect } from 'react';
import './ImageViewer.css';

interface ImageViewerProps {
  isVisible: boolean;
  imageUrl: string;
  onClose: () => void;
}

const ImageViewer: React.FC<ImageViewerProps> = ({ isVisible, imageUrl, onClose }) => {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const imageRef = useRef<HTMLImageElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // 重置状态
  const resetState = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
    setIsDragging(false);
    setStartPos({ x: 0, y: 0 });
  };

  // 关闭图片查看器
  const handleClose = () => {
    resetState();
    onClose();
  };

  // 处理双击事件，放大/缩小图片
  const handleDoubleClick = () => {
    if (scale === 1) {
      // 放大到 2 倍
      setScale(2);
    } else {
      // 缩小到原始大小
      resetState();
    }
  };

  // 处理鼠标按下事件，开始拖拽
  const handleMouseDown = (e: React.MouseEvent<HTMLImageElement>) => {
    if (scale > 1) {
      setIsDragging(true);
      setStartPos({
        x: e.clientX - position.x,
        y: e.clientY - position.y
      });
    }
  };

  // 处理鼠标移动事件，更新位置
  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - startPos.x,
        y: e.clientY - startPos.y
      });
    }
  };

  // 处理鼠标松开事件，结束拖拽
  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // 处理鼠标滚轮事件，缩放图片
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    
    // 计算缩放因子，每次缩放 10%
    const scaleFactor = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.max(0.1, Math.min(5, scale * scaleFactor));
    
    setScale(newScale);
  };

  // 处理键盘事件
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleClose();
    }
  };

  // 点击模态框背景关闭
  const handleModalClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === modalRef.current) {
      handleClose();
    }
  };

  // 组件挂载时添加事件监听，卸载时移除
  useEffect(() => {
    if (isVisible) {
      document.addEventListener('keydown', handleKeyDown);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('mousemove', handleMouseMove);
    }
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('mousemove', handleMouseMove);
    };
  }, [isVisible, isDragging]);

  // 当图片 URL 变化时重置状态
  useEffect(() => {
    if (isVisible) {
      resetState();
    }
  }, [imageUrl, isVisible]);

  if (!isVisible) return null;

  return (
    <div 
      ref={modalRef}
      className="image-viewer-modal"
      onClick={handleModalClick}
    >
      <div className="image-viewer-content">
        <button 
          className="image-viewer-close-button"
          onClick={handleClose}
          aria-label="关闭"
        >
          ×
        </button>
        
        <div className="image-viewer-controls">
          <button 
            className="image-viewer-control-button"
            onClick={() => setScale(Math.max(0.1, scale - 0.1))}
            aria-label="缩小"
          >
            −
          </button>
          <button 
            className="image-viewer-control-button"
            onClick={() => resetState()}
            aria-label="重置"
          >
            ⟲
          </button>
          <button 
            className="image-viewer-control-button"
            onClick={() => setScale(Math.min(5, scale + 0.1))}
            aria-label="放大"
          >
            +
          </button>
        </div>
        
        <div 
          className="image-viewer-image-container"
          onWheel={handleWheel}
        >
          <img
            ref={imageRef}
            src={imageUrl}
            alt="放大图片"
            className="image-viewer-image"
            style={{
              transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
              cursor: isDragging ? 'grabbing' : scale > 1 ? 'grab' : 'default'
            }}
            onDoubleClick={handleDoubleClick}
            onMouseDown={handleMouseDown}
          />
        </div>
      </div>
    </div>
  );
};

export default React.memo(ImageViewer);
