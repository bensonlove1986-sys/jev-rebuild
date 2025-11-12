/**
 * Modal模态框组件
 * 提供功能丰富的模态对话框，支持动画、主题和响应式设计
 */
import BaseComponent from './base-component.js';
import logger from '../utils/logger.js';

class Modal extends BaseComponent {
  /**
   * 构造函数
   * @param {Object} options - 配置选项
   * @param {HTMLElement} container - 容器元素
   */
  constructor(options = {}, container = document.body) {
    super(options, container);
    
    // 组件元素引用
    this.backdropElement = null;
    this.modalElement = null;
    this.headerElement = null;
    this.titleElement = null;
    this.closeButtonElement = null;
    this.bodyElement = null;
    this.footerElement = null;
    
    // 状态管理
    this.isOpen = false;
    this.isAnimating = false;
    this.backdropTransitionEndHandler = null;
    this.modalTransitionEndHandler = null;
    
    // 键盘事件处理
    this.keyboardHandler = null;
    
    // 滚动位置保存
    this.scrollPosition = 0;
  }

  /**
   * 获取默认配置
   * @private
   */
  _getDefaultOptions() {
    return {
      ...super._getDefaultOptions(),
      id: `jev-modal-${Date.now()}`,
      title: '模态框',
      content: '',
      width: '500px',
      height: 'auto',
      minWidth: '300px',
      minHeight: '200px',
      maxWidth: '90vw',
      maxHeight: '90vh',
      centered: true,
      backdrop: true,
      backdropClose: true,
      keyboard: true,
      closeButton: true,
      showHeader: true,
      showFooter: true,
      resizable: false,
      draggable: false,
      animation: 'fade', // fade, slide, zoom, none
      animationDuration: 300,
      theme: 'default', // default, dark, neon, success, warning, error
      zIndex: 1050,
      onOpen: null,
      onOpened: null,
      onClose: null,
      onClosed: null,
      onBeforeClose: null,
      onBackdropClick: null,
      onModalClick: null,
      onDragStart: null,
      onDragMove: null,
      onDragEnd: null,
      onResizeStart: null,
      onResizeMove: null,
      onResizeEnd: null
    };
  }

  /**
   * 获取初始状态
   * @private
   */
  _getInitialState() {
    return {
      ...super._getInitialState(),
      isOpen: false,
      isAnimating: false
    };
  }

  /**
   * 创建DOM元素
   * @private
   */
  _createElement() {
    // 创建背景遮罩
    if (this.options.backdrop) {
      this.backdropElement = document.createElement('div');
      this.backdropElement.className = `jev-modal-backdrop jev-modal-backdrop-${this.options.theme}`;
      this.backdropElement.style.zIndex = this.options.zIndex - 1;
      this.backdropElement.style.transition = `opacity ${this.options.animationDuration}ms ease`;
      this.backdropElement.style.opacity = '0';
      this.backdropElement.style.display = 'none';
      
      // 如果配置了背景模糊效果
      this.backdropElement.style.backdropFilter = 'blur(2px)';
    }
    
    // 创建模态框容器
    this.modalElement = document.createElement('div');
    this.modalElement.id = this.options.id;
    this.modalElement.className = `jev-modal jev-modal-${this.options.theme} jev-modal-${this.options.animation}`;
    
    // 设置样式
    this.modalElement.style.width = this.options.width;
    this.modalElement.style.height = this.options.height;
    this.modalElement.style.minWidth = this.options.minWidth;
    this.modalElement.style.minHeight = this.options.minHeight;
    this.modalElement.style.maxWidth = this.options.maxWidth;
    this.modalElement.style.maxHeight = this.options.maxHeight;
    this.modalElement.style.zIndex = this.options.zIndex;
    this.modalElement.style.display = 'none';
    
    // 设置动画类
    this.modalElement.style.transition = `all ${this.options.animationDuration}ms ease`;
    
    // 可拖拽类
    if (this.options.draggable) {
      this.modalElement.classList.add('jev-modal-draggable');
    }
    
    // 可调整大小类
    if (this.options.resizable) {
      this.modalElement.classList.add('jev-modal-resizable');
    }
    
    // 创建头部
    if (this.options.showHeader) {
      this.headerElement = document.createElement('div');
      this.headerElement.className = 'jev-modal-header';
      
      // 创建标题
      this.titleElement = document.createElement('h5');
      this.titleElement.className = 'jev-modal-title';
      this.titleElement.textContent = this.options.title;
      this.headerElement.appendChild(this.titleElement);
      
      // 创建关闭按钮
      if (this.options.closeButton) {
        this.closeButtonElement = document.createElement('button');
        this.closeButtonElement.type = 'button';
        this.closeButtonElement.className = 'jev-modal-close';
        this.closeButtonElement.innerHTML = '&times;';
        this.closeButtonElement.setAttribute('aria-label', '关闭');
        this.headerElement.appendChild(this.closeButtonElement);
      }
      
      this.modalElement.appendChild(this.headerElement);
    }
    
    // 创建内容区域
    this.bodyElement = document.createElement('div');
    this.bodyElement.className = 'jev-modal-body';
    
    // 设置内容
    if (typeof this.options.content === 'string') {
      this.bodyElement.innerHTML = this.options.content;
    } else if (this.options.content instanceof HTMLElement) {
      this.bodyElement.appendChild(this.options.content);
    }
    
    this.modalElement.appendChild(this.bodyElement);
    
    // 创建底部
    if (this.options.showFooter) {
      this.footerElement = document.createElement('div');
      this.footerElement.className = 'jev-modal-footer';
      
      // 默认按钮
      const closeButton = document.createElement('button');
      closeButton.type = 'button';
      closeButton.className = 'jev-modal-button jev-modal-button-secondary';
      closeButton.textContent = '关闭';
      closeButton.addEventListener('click', () => this.close());
      
      const confirmButton = document.createElement('button');
      confirmButton.type = 'button';
      confirmButton.className = 'jev-modal-button jev-modal-button-primary';
      confirmButton.textContent = '确定';
      confirmButton.addEventListener('click', () => {
        if (typeof this.options.onConfirm === 'function') {
          this.options.onConfirm();
        }
        this.close();
      });
      
      this.footerElement.appendChild(closeButton);
      this.footerElement.appendChild(confirmButton);
      
      this.modalElement.appendChild(this.footerElement);
    }
    
    // 调整大小句柄
    if (this.options.resizable) {
      const resizeHandle = document.createElement('div');
      resizeHandle.className = 'jev-modal-resize-handle';
      this.modalElement.appendChild(resizeHandle);
    }
  }

  /**
   * 应用样式
   * @private
   */
  _applyStyles() {
    // 添加全局样式
    this._addGlobalStyles();
    
    // 绑定事件
    this._bindEvents();
  }

  /**
   * 添加全局样式
   * @private
   */
  _addGlobalStyles() {
    const styleId = 'jev-modal-styles';
    if (document.getElementById(styleId)) {
      return;
    }
    
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      /* 模态框全局样式重置 */
      .jev-modal-open {
        overflow: hidden;
      }
      
      /* 背景遮罩样式 */
      .jev-modal-backdrop {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      /* 背景遮罩主题 - 默认 */
      .jev-modal-backdrop-default {
        background-color: rgba(0, 0, 0, 0.5);
      }
      
      /* 背景遮罩主题 - 深色 */
      .jev-modal-backdrop-dark {
        background-color: rgba(0, 0, 0, 0.8);
      }
      
      /* 背景遮罩主题 - 霓虹灯 */
      .jev-modal-backdrop-neon {
        background-color: rgba(0, 255, 153, 0.1);
        box-shadow: inset 0 0 100px rgba(0, 255, 153, 0.2);
      }
      
      /* 模态框容器样式 */
      .jev-modal {
        background-color: #fff;
        border-radius: 8px;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
        position: relative;
        overflow: hidden;
        outline: none;
      }
      
      /* 模态框主题 - 默认 */
      .jev-modal-default {
        background-color: #fff;
        color: #333;
      }
      
      /* 模态框主题 - 深色 */
      .jev-modal-dark {
        background-color: #2d3748;
        color: #e2e8f0;
      }
      
      /* 模态框主题 - 霓虹灯 */
      .jev-modal-neon {
        background-color: #1a1a1a;
        color: #00ff99;
        border: 1px solid #00ff99;
        box-shadow: 0 0 20px rgba(0, 255, 153, 0.3);
      }
      
      /* 模态框主题 - 成功 */
      .jev-modal-success {
        background-color: #fff;
        color: #28a745;
        border-top: 4px solid #28a745;
      }
      
      /* 模态框主题 - 警告 */
      .jev-modal-warning {
        background-color: #fff;
        color: #ffc107;
        border-top: 4px solid #ffc107;
      }
      
      /* 模态框主题 - 错误 */
      .jev-modal-error {
        background-color: #fff;
        color: #dc3545;
        border-top: 4px solid #dc3545;
      }
      
      /* 深色主题下的状态模态框 */
      .jev-modal-dark.jev-modal-success {
        background-color: #2d3748;
        border-top-color: #38a169;
      }
      
      .jev-modal-dark.jev-modal-warning {
        background-color: #2d3748;
        border-top-color: #d69e2e;
      }
      
      .jev-modal-dark.jev-modal-error {
        background-color: #2d3748;
        border-top-color: #e53e3e;
      }
      
      /* 头部样式 */
      .jev-modal-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 16px 24px;
        border-bottom: 1px solid #e9ecef;
      }
      
      .jev-modal-dark .jev-modal-header {
        border-bottom-color: #4a5568;
      }
      
      .jev-modal-neon .jev-modal-header {
        border-bottom-color: rgba(0, 255, 153, 0.3);
      }
      
      /* 标题样式 */
      .jev-modal-title {
        margin: 0;
        font-size: 18px;
        font-weight: 600;
        line-height: 1.5;
      }
      
      /* 关闭按钮样式 */
      .jev-modal-close {
        background: none;
        border: none;
        font-size: 24px;
        cursor: pointer;
        color: inherit;
        opacity: 0.5;
        transition: opacity 0.2s;
        line-height: 1;
        padding: 0;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 4px;
      }
      
      .jev-modal-close:hover {
        opacity: 0.8;
        background-color: rgba(0, 0, 0, 0.05);
      }
      
      .jev-modal-dark .jev-modal-close:hover {
        background-color: rgba(255, 255, 255, 0.05);
      }
      
      /* 内容区域样式 */
      .jev-modal-body {
        padding: 24px;
        overflow-y: auto;
        max-height: calc(100% - 130px);
      }
      
      /* 底部样式 */
      .jev-modal-footer {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        padding: 16px 24px;
        border-top: 1px solid #e9ecef;
        gap: 12px;
      }
      
      .jev-modal-dark .jev-modal-footer {
        border-top-color: #4a5568;
      }
      
      .jev-modal-neon .jev-modal-footer {
        border-top-color: rgba(0, 255, 153, 0.3);
      }
      
      /* 按钮样式 */
      .jev-modal-button {
        padding: 8px 16px;
        border: none;
        border-radius: 4px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
        outline: none;
      }
      
      .jev-modal-button:focus {
        box-shadow: 0 0 0 2px rgba(38, 143, 255, 0.5);
      }
      
      /* 主要按钮 */
      .jev-modal-button-primary {
        background-color: #007bff;
        color: white;
      }
      
      .jev-modal-button-primary:hover {
        background-color: #0056b3;
      }
      
      /* 次要按钮 */
      .jev-modal-button-secondary {
        background-color: #6c757d;
        color: white;
      }
      
      .jev-modal-button-secondary:hover {
        background-color: #545b62;
      }
      
      /* 深色主题下的按钮 */
      .jev-modal-dark .jev-modal-button-primary {
        background-color: #3182ce;
      }
      
      .jev-modal-dark .jev-modal-button-primary:hover {
        background-color: #2c5aa0;
      }
      
      .jev-modal-dark .jev-modal-button-secondary {
        background-color: #718096;
      }
      
      .jev-modal-dark .jev-modal-button-secondary:hover {
        background-color: #4a5568;
      }
      
      /* 霓虹灯主题下的按钮 */
      .jev-modal-neon .jev-modal-button-primary {
        background-color: #00ff99;
        color: #1a1a1a;
        box-shadow: 0 0 10px rgba(0, 255, 153, 0.3);
      }
      
      .jev-modal-neon .jev-modal-button-primary:hover {
        background-color: #00e68a;
        box-shadow: 0 0 20px rgba(0, 255, 153, 0.5);
      }
      
      .jev-modal-neon .jev-modal-button-secondary {
        background-color: transparent;
        color: #00ff99;
        border: 1px solid #00ff99;
      }
      
      .jev-modal-neon .jev-modal-button-secondary:hover {
        background-color: rgba(0, 255, 153, 0.1);
      }
      
      /* 动画样式 */
      /* 淡入淡出 */
      .jev-modal.fade {
        opacity: 0;
        transform: translateY(-10px);
      }
      
      .jev-modal.fade.show {
        opacity: 1;
        transform: translateY(0);
      }
      
      /* 滑入 */
      .jev-modal.slide {
        transform: translateX(-100%);
      }
      
      .jev-modal.slide.show {
        transform: translateX(0);
      }
      
      /* 缩放 */
      .jev-modal.zoom {
        opacity: 0;
        transform: scale(0.9);
      }
      
      .jev-modal.zoom.show {
        opacity: 1;
        transform: scale(1);
      }
      
      /* 无动画 */
      .jev-modal.none {
        transition: none;
      }
      
      /* 可拖拽样式 */
      .jev-modal-draggable .jev-modal-header {
        cursor: move;
        user-select: none;
      }
      
      .jev-modal-draggable .jev-modal-header.dragging {
        cursor: grabbing;
      }
      
      /* 可调整大小样式 */
      .jev-modal-resizable {
        resize: both;
      }
      
      /* 调整大小句柄 */
      .jev-modal-resize-handle {
        position: absolute;
        bottom: 0;
        right: 0;
        width: 20px;
        height: 20px;
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 10 10'%3E%3Cpath d='M0 10 L10 10 L10 0' fill='none' stroke='%23ccc' stroke-width='2'/%3E%3C/svg%3E");
        background-repeat: no-repeat;
        background-position: right bottom;
        cursor: nwse-resize;
      }
      
      .jev-modal-dark .jev-modal-resize-handle {
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 10 10'%3E%3Cpath d='M0 10 L10 10 L10 0' fill='none' stroke='%23666' stroke-width='2'/%3E%3C/svg%3E");
      }
      
      .jev-modal-neon .jev-modal-resize-handle {
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 10 10'%3E%3Cpath d='M0 10 L10 10 L10 0' fill='none' stroke='%2300ff99' stroke-width='2'/%3E%3C/svg%3E");
      }
      
      /* 响应式设计 */
      @media (max-width: 768px) {
        .jev-modal {
          width: 90vw !important;
          margin: 0 auto;
          max-height: 90vh !important;
        }
        
        .jev-modal-header,
        .jev-modal-body,
        .jev-modal-footer {
          padding: 16px;
        }
        
        .jev-modal-title {
          font-size: 16px;
        }
        
        .jev-modal-footer {
          flex-direction: column-reverse;
          gap: 8px;
        }
        
        .jev-modal-button {
          width: 100%;
        }
      }
      
      @media (max-width: 480px) {
        .jev-modal {
          width: 95vw !important;
          margin: 0 auto;
          max-height: 95vh !important;
        }
        
        .jev-modal-header,
        .jev-modal-body,
        .jev-modal-footer {
          padding: 12px;
        }
      }
      
      /* 焦点样式 */
      .jev-modal:focus {
        outline: none;
      }
      
      /* 辅助功能 */
      @media (prefers-reduced-motion: reduce) {
        .jev-modal,
        .jev-modal-backdrop {
          transition: none !important;
        }
      }
    `;
    
    document.head.appendChild(style);
  }

  /**
   * 绑定事件
   * @private
   */
  _bindEvents() {
    // 关闭按钮点击事件
    if (this.closeButtonElement) {
      this.closeButtonElement.addEventListener('click', () => {
        this.close();
      });
    }
    
    // 背景点击事件
    if (this.options.backdrop && this.options.backdropClose) {
      this.backdropElement.addEventListener('click', (e) => {
        if (e.target === this.backdropElement) {
          if (typeof this.options.onBackdropClick === 'function') {
            try {
              const shouldClose = this.options.onBackdropClick(e);
              if (shouldClose !== false) {
                this.close();
              }
            } catch (error) {
              logger.error('背景点击回调执行失败', error);
              this.close();
            }
          } else {
            this.close();
          }
        }
      });
    }
    
    // 模态框点击事件
    this.modalElement.addEventListener('click', (e) => {
      if (typeof this.options.onModalClick === 'function') {
        try {
          this.options.onModalClick(e);
        } catch (error) {
          logger.error('模态框点击回调执行失败', error);
        }
      }
    });
    
    // 初始化拖拽功能
    if (this.options.draggable) {
      this._initDraggable();
    }
    
    // 初始化调整大小功能
    if (this.options.resizable) {
      this._initResizable();
    }
  }

  /**
   * 初始化拖拽功能
   * @private
   */
  _initDraggable() {
    if (!this.headerElement) return;
    
    let isDragging = false;
    let offsetX = 0;
    let offsetY = 0;
    
    const startDrag = (e) => {
      // 忽略关闭按钮的点击
      if (e.target === this.closeButtonElement || 
          this.closeButtonElement?.contains(e.target)) {
        return;
      }
      
      e.preventDefault();
      isDragging = true;
      
      // 获取点击位置相对于模态框的偏移
      const rect = this.modalElement.getBoundingClientRect();
      offsetX = e.clientX - rect.left;
      offsetY = e.clientY - rect.top;
      
      // 添加拖拽类
      this.headerElement.classList.add('dragging');
      this.modalElement.style.userSelect = 'none';
      
      // 触发拖拽开始回调
      if (typeof this.options.onDragStart === 'function') {
        try {
          this.options.onDragStart(e, {
            x: offsetX,
            y: offsetY
          });
        } catch (error) {
          logger.error('拖拽开始回调执行失败', error);
        }
      }
    };
    
    const drag = (e) => {
      if (!isDragging) return;
      
      e.preventDefault();
      
      // 计算新位置
      let newX = e.clientX - offsetX;
      let newY = e.clientY - offsetY;
      
      // 限制在视窗内
      const modalWidth = this.modalElement.offsetWidth;
      const modalHeight = this.modalElement.offsetHeight;
      const maxX = window.innerWidth - modalWidth;
      const maxY = window.innerHeight - modalHeight;
      
      newX = Math.max(0, Math.min(newX, maxX));
      newY = Math.max(0, Math.min(newY, maxY));
      
      // 设置位置
      this.modalElement.style.left = `${newX}px`;
      this.modalElement.style.top = `${newY}px`;
      this.modalElement.style.right = 'auto';
      this.modalElement.style.bottom = 'auto';
      
      // 触发拖拽移动回调
      if (typeof this.options.onDragMove === 'function') {
        try {
          this.options.onDragMove(e, {
            x: newX,
            y: newY
          });
        } catch (error) {
          logger.error('拖拽移动回调执行失败', error);
        }
      }
    };
    
    const endDrag = (e) => {
      if (!isDragging) return;
      
      isDragging = false;
      
      // 移除拖拽类
      this.headerElement.classList.remove('dragging');
      this.modalElement.style.userSelect = '';
      
      // 触发拖拽结束回调
      if (typeof this.options.onDragEnd === 'function') {
        try {
          const rect = this.modalElement.getBoundingClientRect();
          this.options.onDragEnd(e, {
            x: rect.left,
            y: rect.top
          });
        } catch (error) {
          logger.error('拖拽结束回调执行失败', error);
        }
      }
    };
    
    // 绑定鼠标事件
    this.headerElement.addEventListener('mousedown', startDrag);
    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', endDrag);
    
    // 绑定触摸事件
    this.headerElement.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        startDrag(e.touches[0]);
      }
    });
    
    document.addEventListener('touchmove', (e) => {
      if (e.touches.length === 1) {
        drag(e.touches[0]);
      }
    });
    
    document.addEventListener('touchend', endDrag);
  }

  /**
   * 初始化调整大小功能
   * @private
   */
  _initResizable() {
    const resizeHandle = this.modalElement.querySelector('.jev-modal-resize-handle');
    if (!resizeHandle) return;
    
    let isResizing = false;
    let startX = 0;
    let startY = 0;
    let startWidth = 0;
    let startHeight = 0;
    
    const startResize = (e) => {
      e.preventDefault();
      isResizing = true;
      
      startX = e.clientX;
      startY = e.clientY;
      startWidth = this.modalElement.offsetWidth;
      startHeight = this.modalElement.offsetHeight;
      
      // 阻止文本选择
      document.body.style.userSelect = 'none';
      
      // 触发调整大小开始回调
      if (typeof this.options.onResizeStart === 'function') {
        try {
          this.options.onResizeStart(e, {
            width: startWidth,
            height: startHeight
          });
        } catch (error) {
          logger.error('调整大小开始回调执行失败', error);
        }
      }
    };
    
    const resize = (e) => {
      if (!isResizing) return;
      
      e.preventDefault();
      
      // 计算新尺寸
      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;
      
      let newWidth = startWidth + deltaX;
      let newHeight = startHeight + deltaY;
      
      // 应用最小尺寸限制
      const minWidth = parseInt(this.options.minWidth) || 300;
      const minHeight = parseInt(this.options.minHeight) || 200;
      const maxWidth = parseInt(this.options.maxWidth) || window.innerWidth;
      const maxHeight = parseInt(this.options.maxHeight) || window.innerHeight;
      
      newWidth = Math.max(minWidth, Math.min(newWidth, maxWidth));
      newHeight = Math.max(minHeight, Math.min(newHeight, maxHeight));
      
      // 设置新尺寸
      this.modalElement.style.width = `${newWidth}px`;
      this.modalElement.style.height = `${newHeight}px`;
      
      // 触发调整大小移动回调
      if (typeof this.options.onResizeMove === 'function') {
        try {
          this.options.onResizeMove(e, {
            width: newWidth,
            height: newHeight
          });
        } catch (error) {
          logger.error('调整大小移动回调执行失败', error);
        }
      }
    };
    
    const endResize = (e) => {
      if (!isResizing) return;
      
      isResizing = false;
      
      // 恢复文本选择
      document.body.style.userSelect = '';
      
      // 触发调整大小结束回调
      if (typeof this.options.onResizeEnd === 'function') {
        try {
          this.options.onResizeEnd(e, {
            width: this.modalElement.offsetWidth,
            height: this.modalElement.offsetHeight
          });
        } catch (error) {
          logger.error('调整大小结束回调执行失败', error);
        }
      }
    };
    
    // 绑定鼠标事件
    resizeHandle.addEventListener('mousedown', startResize);
    document.addEventListener('mousemove', resize);
    document.addEventListener('mouseup', endResize);
    
    // 绑定触摸事件
    resizeHandle.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        startResize(e.touches[0]);
      }
    });
    
    document.addEventListener('touchmove', (e) => {
      if (e.touches.length === 1) {
        resize(e.touches[0]);
      }
    });
    
    document.addEventListener('touchend', endResize);
  }

  /**
   * 绑定键盘事件
   * @private
   */
  _bindKeyboardEvents() {
    if (!this.options.keyboard) return;
    
    this.keyboardHandler = (e) => {
      // ESC键关闭
      if (e.key === 'Escape') {
        this.close();
      }
    };
    
    document.addEventListener('keydown', this.keyboardHandler);
  }

  /**
   * 解绑键盘事件
   * @private
   */
  _unbindKeyboardEvents() {
    if (this.keyboardHandler) {
      document.removeEventListener('keydown', this.keyboardHandler);
      this.keyboardHandler = null;
    }
  }

  /**
   * 保存滚动位置
   * @private
   */
  _saveScrollPosition() {
    this.scrollPosition = window.pageYOffset || document.documentElement.scrollTop;
  }

  /**
   * 恢复滚动位置
   * @private
   */
  _restoreScrollPosition() {
    window.scrollTo(0, this.scrollPosition);
  }

  /**
   * 打开模态框
   */
  open() {
    if (this.isOpen || this.isAnimating) return;
    
    this.isOpen = true;
    this.isAnimating = true;
    
    // 触发打开前回调
    if (typeof this.options.onOpen === 'function') {
      try {
        this.options.onOpen();
      } catch (error) {
        logger.error('模态框打开前回调执行失败', error);
      }
    }
    
    // 保存滚动位置
    this._saveScrollPosition();
    
    // 添加模态框打开类
    document.body.classList.add('jev-modal-open');
    
    // 阻止背景滚动
    document.body.style.position = 'fixed';
    document.body.style.top = `-${this.scrollPosition}px`;
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.style.overflow = 'hidden';
    
    // 添加到DOM
    if (this.options.backdrop && this.backdropElement) {
      this.container.appendChild(this.backdropElement);
    }
    this.container.appendChild(this.modalElement);
    
    // 显示元素
    if (this.backdropElement) {
      this.backdropElement.style.display = 'flex';
    }
    this.modalElement.style.display = 'block';
    
    // 计算位置
    this._positionModal();
    
    // 触发重排以确保动画效果
    this.modalElement.offsetHeight;
    
    // 开始动画
    if (this.backdropElement) {
      this.backdropElement.style.opacity = '1';
    }
    this.modalElement.classList.add('show');
    
    // 绑定键盘事件
    this._bindKeyboardEvents();
    
    // 设置焦点
    this.modalElement.focus();
    
    // 动画结束后处理
    this.modalTransitionEndHandler = () => {
      this.isAnimating = false;
      
      // 触发打开完成回调
      if (typeof this.options.onOpened === 'function') {
        try {
          this.options.onOpened();
        } catch (error) {
          logger.error('模态框打开完成回调执行失败', error);
        }
      }
    };
    
    this.modalElement.addEventListener('transitionend', this.modalTransitionEndHandler, { once: true });
    
    // 更新状态
    this.updateState({ isOpen: true, isAnimating: false });
  }

  /**
   * 关闭模态框
   */
  close() {
    if (!this.isOpen || this.isAnimating) return;
    
    // 触发关闭前回调
    if (typeof this.options.onBeforeClose === 'function') {
      try {
        const shouldClose = this.options.onBeforeClose();
        if (shouldClose === false) {
          return;
        }
      } catch (error) {
        logger.error('模态框关闭前回调执行失败', error);
      }
    }
    
    this.isAnimating = true;
    
    // 触发关闭回调
    if (typeof this.options.onClose === 'function') {
      try {
        this.options.onClose();
      } catch (error) {
        logger.error('模态框关闭回调执行失败', error);
      }
    }
    
    // 开始关闭动画
    if (this.backdropElement) {
      this.backdropElement.style.opacity = '0';
    }
    this.modalElement.classList.remove('show');
    
    // 解绑键盘事件
    this._unbindKeyboardEvents();
    
    // 动画结束后处理
    const handleTransitionEnd = () => {
      this.isOpen = false;
      this.isAnimating = false;
      
      // 隐藏元素
      if (this.backdropElement) {
        this.backdropElement.style.display = 'none';
      }
      this.modalElement.style.display = 'none';
      
      // 移除从DOM
      if (this.backdropElement && this.backdropElement.parentNode) {
        this.backdropElement.parentNode.removeChild(this.backdropElement);
      }
      if (this.modalElement.parentNode) {
        this.modalElement.parentNode.removeChild(this.modalElement);
      }
      
      // 恢复滚动
      document.body.classList.remove('jev-modal-open');
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.left = '';
      document.body.style.right = '';
      document.body.style.overflow = '';
      this._restoreScrollPosition();
      
      // 触发关闭完成回调
      if (typeof this.options.onClosed === 'function') {
        try {
          this.options.onClosed();
        } catch (error) {
          logger.error('模态框关闭完成回调执行失败', error);
        }
      }
      
      // 更新状态
      this.updateState({ isOpen: false, isAnimating: false });
    };
    
    // 如果有背景，等待背景动画结束
    if (this.backdropElement) {
      this.backdropTransitionEndHandler = handleTransitionEnd;
      this.backdropElement.addEventListener('transitionend', this.backdropTransitionEndHandler, { once: true });
    } else {
      // 否则使用模态框动画结束
      this.modalTransitionEndHandler = handleTransitionEnd;
      this.modalElement.addEventListener('transitionend', this.modalTransitionEndHandler, { once: true });
    }
  }

  /**
   * 定位模态框
   * @private
   */
  _positionModal() {
    // 清除之前的定位样式
    this.modalElement.style.position = 'absolute';
    this.modalElement.style.margin = '0';
    
    if (this.options.centered) {
      // 居中定位
      this.modalElement.style.left = '50%';
      this.modalElement.style.top = '50%';
      this.modalElement.style.transform = 'translate(-50%, -50%)';
      
      // 动画时的特殊处理
      if (this.options.animation === 'fade') {
        this.modalElement.style.transform = 'translate(-50%, calc(-50% + 10px))';
      } else if (this.options.animation === 'zoom') {
        this.modalElement.style.transform = 'translate(-50%, -50%) scale(0.9)';
      }
    } else {
      // 顶部定位
      this.modalElement.style.left = '50%';
      this.modalElement.style.top = '10%';
      this.modalElement.style.transform = 'translateX(-50%)';
    }
  }

  /**
   * 设置标题
   * @param {string|HTMLElement} title - 标题内容
   */
  setTitle(title) {
    if (!this.titleElement) return;
    
    if (typeof title === 'string') {
      this.titleElement.textContent = title;
    } else if (title instanceof HTMLElement) {
      this.titleElement.innerHTML = '';
      this.titleElement.appendChild(title);
    }
    
    this.options.title = title;
  }

  /**
   * 设置内容
   * @param {string|HTMLElement} content - 内容
   */
  setContent(content) {
    if (!this.bodyElement) return;
    
    // 清空内容
    this.bodyElement.innerHTML = '';
    
    if (typeof content === 'string') {
      this.bodyElement.innerHTML = content;
    } else if (content instanceof HTMLElement) {
      this.bodyElement.appendChild(content);
    }
    
    this.options.content = content;
  }

  /**
   * 获取内容元素
   * @returns {HTMLElement} 内容区域元素
   */
  getBodyElement() {
    return this.bodyElement;
  }

  /**
   * 获取底部元素
   * @returns {HTMLElement} 底部区域元素
   */
  getFooterElement() {
    return this.footerElement;
  }

  /**
   * 设置尺寸
   * @param {string} width - 宽度
   * @param {string} height - 高度
   */
  setSize(width, height) {
    if (width) {
      this.modalElement.style.width = width;
      this.options.width = width;
    }
    
    if (height) {
      this.modalElement.style.height = height;
      this.options.height = height;
    }
    
    // 重新定位
    this._positionModal();
  }

  /**
   * 设置位置
   * @param {Object} position - 位置对象 {left, top, right, bottom}
   */
  setPosition(position) {
    if (!position) return;
    
    // 清除居中样式
    if (this.options.centered) {
      this.options.centered = false;
    }
    
    // 设置位置
    if (position.left !== undefined) {
      this.modalElement.style.left = position.left;
    }
    if (position.top !== undefined) {
      this.modalElement.style.top = position.top;
    }
    if (position.right !== undefined) {
      this.modalElement.style.right = position.right;
    }
    if (position.bottom !== undefined) {
      this.modalElement.style.bottom = position.bottom;
    }
    
    // 清除transform
    this.modalElement.style.transform = 'none';
  }

  /**
   * 设置主题
   * @param {string} theme - 主题名称
   */
  setTheme(theme) {
    if (!theme) return;
    
    // 移除旧主题类
    this.modalElement.classList.remove(`jev-modal-${this.options.theme}`);
    if (this.backdropElement) {
      this.backdropElement.classList.remove(`jev-modal-backdrop-${this.options.theme}`);
    }
    
    // 添加新主题类
    this.modalElement.classList.add(`jev-modal-${theme}`);
    if (this.backdropElement) {
      this.backdropElement.classList.add(`jev-modal-backdrop-${theme}`);
    }
    
    this.options.theme = theme;
  }

  /**
   * 设置动画
   * @param {string} animation - 动画类型
   * @param {number} duration - 动画持续时间（毫秒）
   */
  setAnimation(animation, duration) {
    if (!animation) return;
    
    // 移除旧动画类
    this.modalElement.classList.remove(`jev-modal-${this.options.animation}`);
    
    // 添加新动画类
    this.modalElement.classList.add(`jev-modal-${animation}`);
    
    // 设置动画持续时间
    if (duration) {
      this.modalElement.style.transition = `all ${duration}ms ease`;
      if (this.backdropElement) {
        this.backdropElement.style.transition = `opacity ${duration}ms ease`;
      }
      this.options.animationDuration = duration;
    }
    
    this.options.animation = animation;
    
    // 重新定位以应用新的动画变换
    if (this.isOpen) {
      this._positionModal();
    }
  }

  /**
   * 检查是否打开
   * @returns {boolean} 是否打开
   */
  isVisible() {
    return this.isOpen;
  }

  /**
   * 切换显示/隐藏
   */
  toggle() {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  /**
   * 添加按钮到底部
   * @param {Object} options - 按钮配置
   * @returns {HTMLElement} 创建的按钮元素
   */
  addButton(options = {}) {
    if (!this.footerElement) return null;
    
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `jev-modal-button ${options.className || ''}`;
    button.textContent = options.text || '按钮';
    
    if (options.onClick) {
      button.addEventListener('click', options.onClick);
    }
    
    // 如果指定了位置，插入到指定位置
    if (options.position && options.position === 'first') {
      this.footerElement.insertBefore(button, this.footerElement.firstChild);
    } else {
      this.footerElement.appendChild(button);
    }
    
    return button;
  }

  /**
   * 移除底部按钮
   * @param {HTMLElement} button - 要移除的按钮元素
   */
  removeButton(button) {
    if (!this.footerElement || !button || !this.footerElement.contains(button)) return;
    
    this.footerElement.removeChild(button);
  }

  /**
   * 清空底部按钮
   */
  clearButtons() {
    if (!this.footerElement) return;
    
    while (this.footerElement.firstChild) {
      this.footerElement.removeChild(this.footerElement.firstChild);
    }
  }

  /**
   * 资源释放与清理
   */
  async destroy() {
    try {
      // 如果打开，先关闭
      if (this.isOpen) {
        await this.close();
      }
      
      // 解绑事件
      this._unbindKeyboardEvents();
      
      // 移除DOM元素
      if (this.backdropElement && this.backdropElement.parentNode) {
        this.backdropElement.parentNode.removeChild(this.backdropElement);
      }
      
      if (this.modalElement && this.modalElement.parentNode) {
        this.modalElement.parentNode.removeChild(this.modalElement);
      }
      
      // 清理引用
      this.backdropElement = null;
      this.modalElement = null;
      this.headerElement = null;
      this.titleElement = null;
      this.closeButtonElement = null;
      this.bodyElement = null;
      this.footerElement = null;
      this.keyboardHandler = null;
      this.backdropTransitionEndHandler = null;
      this.modalTransitionEndHandler = null;
      
    } catch (error) {
      logger.error('模态框组件销毁失败', error);
    }
  }
}

export default Modal;