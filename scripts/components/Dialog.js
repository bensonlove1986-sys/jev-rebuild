/**
 * Dialog对话框组件
 * 提供模态、非模态对话框，支持多种主题、动画效果和丰富的交互方式
 */
import BaseComponent from './base-component.js';
import Button from './Button.js';
import logger from '../modular/logger.js';

class Dialog extends BaseComponent {
  constructor(options = {}) {
    super(options);
    
    // 对话框元素引用
    this.overlayElement = null;
    this.dialogContainer = null;
    this.contentElement = null;
    this.headerElement = null;
    this.titleElement = null;
    this.footerElement = null;
    this.closeButton = null;
    
    // 事件处理器
    this._outsideClickHandler = null;
    this._escapeHandler = null;
    
    // 按钮实例
    this.buttons = {};
    
    // 状态和动画
    this.isOpen = false;
    this.draggingState = null;
    this.resizingState = null;
    this.animationTimeout = null;
  }

  /**
   * 获取默认配置
   * @private
   */
  _getDefaultOptions() {
    return {
      ...super._getDefaultOptions(),
      title: '',
      content: '',
      width: '500px',
      height: 'auto',
      modal: true,
      resizable: false,
      draggable: false,
      closable: true,
      maskClosable: true,
      escClosable: true,
      showCloseButton: true,
      buttons: [],
      theme: 'neon', // neon, default, dark, success, warning, error
      position: 'center', // center, top, bottom, left, right
      zIndex: 1000,
      animationDuration: 300,
      onOpen: null,
      onClose: null,
      onBeforeClose: null,
      onConfirm: null,
      onCancel: null,
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
      title: this.options.title,
      content: this.options.content,
      visible: false
    };
  }

  /**
   * 创建DOM元素
   * @private
   */
  _createElement() {
    // 创建遮罩层（仅模态对话框需要）
    if (this.options.modal) {
      this.overlayElement = document.createElement('div');
      this.overlayElement.className = 'jev-dialog-overlay';
      this.overlayElement.style.zIndex = this.options.zIndex;
    }
    
    // 创建对话框容器
    this.dialogContainer = document.createElement('div');
    this.dialogContainer.className = 'jev-dialog-container';
    this.dialogContainer.classList.add(`jev-dialog-${this.options.theme}`);
    
    // 设置可调整大小和可拖拽
    if (this.options.resizable) {
      this.dialogContainer.classList.add('jev-dialog-resizable');
      this.dialogContainer.style.position = 'relative';
    }
    
    if (this.options.draggable) {
      this.dialogContainer.classList.add('jev-dialog-draggable');
    }
    
    // 设置对话框容器样式
    this.dialogContainer.style.width = this.options.width;
    this.dialogContainer.style.zIndex = this.options.zIndex + 1;
    
    // 创建头部
    this.headerElement = document.createElement('div');
    this.headerElement.className = 'jev-dialog-header';
    
    // 标题
    this.titleElement = document.createElement('h3');
    this.titleElement.className = 'jev-dialog-title';
    this.titleElement.textContent = this.options.title;
    
    // 关闭按钮
    if (this.options.closable && this.options.showCloseButton) {
      this.closeButton = new Button({
        text: '',
        icon: '&times;',
        size: 'small',
        type: 'default',
        className: 'jev-dialog-close-btn',
        theme: this.options.theme,
        onClick: () => this.close()
      });
    }
    
    this.headerElement.appendChild(this.titleElement);
    if (this.closeButton) {
      this.headerElement.appendChild(this.closeButton.getElement());
    }
    
    // 创建内容区域
    this.contentElement = document.createElement('div');
    this.contentElement.className = 'jev-dialog-content';
    
    // 设置内容
    if (typeof this.options.content === 'string') {
      this.contentElement.innerHTML = this.options.content;
    } else if (this.options.content instanceof Element) {
      this.contentElement.appendChild(this.options.content);
    }
    
    // 创建底部
    this.footerElement = document.createElement('div');
    this.footerElement.className = 'jev-dialog-footer';
    
    // 添加按钮
    this._createButtons();
    
    // 组装对话框
    this.dialogContainer.appendChild(this.headerElement);
    this.dialogContainer.appendChild(this.contentElement);
    this.dialogContainer.appendChild(this.footerElement);
    
    // 设置根元素
    if (this.options.modal) {
      this.overlayElement.appendChild(this.dialogContainer);
      this.element = this.overlayElement;
    } else {
      this.element = this.dialogContainer;
    }
  }

  /**
   * 创建按钮
   * @private
   */
  _createButtons() {
    if (!this.footerElement) return;
    
    // 如果没有自定义按钮，使用默认的确认/取消按钮
    if (this.options.buttons.length === 0) {
      // 取消按钮
      if (this.options.onCancel) {
        const cancelBtn = this._createButton('cancel', {
          text: '取消',
          type: 'default',
          onClick: () => {
            this.options.onCancel(this);
            this.close();
          }
        });
        this.footerElement.appendChild(cancelBtn.element);
      }
      
      // 确认按钮
      if (this.options.onConfirm) {
        const confirmBtn = this._createButton('confirm', {
          text: '确认',
          type: 'primary',
          onClick: () => {
            this.options.onConfirm(this);
            this.close();
          }
        });
        this.footerElement.appendChild(confirmBtn.element);
      }
    } else {
      // 创建自定义按钮
      this.options.buttons.forEach((btnConfig, index) => {
        const btn = this._createButton(`button-${index}`, {
          ...btnConfig,
          onClick: (event) => {
            if (typeof btnConfig.onClick === 'function') {
              btnConfig.onClick(event, this);
            }
          }
        });
        this.footerElement.appendChild(btn.element);
      });
    }
  }

  /**
   * 创建单个按钮
   * @private
   */
  _createButton(key, options) {
    const button = new Button(options);
    this.buttons[key] = button;
    return button;
  }

  /**
   * 应用样式
   * @private
   */
  _applyStyles() {
    // 应用基础样式
    if (this.element) {
      this.element.style.display = 'none';
    }
    
    // 添加全局对话框样式
    this._addGlobalStyle('jev-dialog-styles', `
      /* 遮罩层样式 */
      .jev-dialog-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        backdrop-filter: blur(2px);
        opacity: 0;
        visibility: hidden;
        transition: opacity 0.3s ease, visibility 0.3s ease;
      }
      
      .jev-dialog-overlay.jev-dialog-visible {
        opacity: 1;
        visibility: visible;
      }
      
      /* 对话框容器样式 */
      .jev-dialog-container {
        border-radius: 8px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
        max-width: 90vw;
        max-height: 90vh;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        opacity: 0;
        transform: scale(0.9);
        transition: opacity 0.3s ease, transform 0.3s ease;
      }
      
      .jev-dialog-overlay.jev-dialog-visible .jev-dialog-container {
        opacity: 1;
        transform: scale(1);
      }
      
      /* 头部样式 */
      .jev-dialog-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 16px 20px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      }
      
      .jev-dialog-title {
        margin: 0;
        font-size: 18px;
        font-weight: 600;
        line-height: 1.4;
      }
      
      /* 内容样式 */
      .jev-dialog-content {
        padding: 20px;
        flex: 1;
        overflow-y: auto;
        line-height: 1.6;
        max-height: calc(90vh - 140px);
      }
      
      /* 底部样式 */
      .jev-dialog-footer {
        padding: 16px 20px;
        border-top: 1px solid rgba(255, 255, 255, 0.1);
        display: flex;
        justify-content: flex-end;
        gap: 12px;
      }
      
      /* 关闭按钮样式 */
      .jev-dialog-close-btn {
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0;
        border-radius: 4px;
        font-size: 18px;
        transition: background-color 0.2s ease;
      }
      
      /* 可调整大小样式 */
      .jev-dialog-resizable {
        min-width: 300px;
        min-height: 200px;
      }
      
      .jev-dialog-resizable::after {
        content: '';
        position: absolute;
        bottom: 0;
        right: 0;
        width: 20px;
        height: 20px;
        cursor: nwse-resize;
        background: linear-gradient(135deg, transparent 50%, rgba(255, 255, 255, 0.2) 50%);
      }
      
      /* 可拖拽样式 */
      .jev-dialog-draggable .jev-dialog-header {
        cursor: move;
        user-select: none;
      }
      
      /* 位置样式 */
      .jev-dialog-position-top {
        align-items: flex-start;
      }
      
      .jev-dialog-position-bottom {
        align-items: flex-end;
      }
      
      .jev-dialog-position-left {
        justify-content: flex-start;
      }
      
      .jev-dialog-position-right {
        justify-content: flex-end;
      }
      
      /* 主题样式 - Neon */
      .jev-dialog-neon {
        background-color: #1a1a1a;
        border: 1px solid #00ff99;
        box-shadow: 0 0 20px rgba(0, 255, 153, 0.3);
      }
      
      .jev-dialog-neon .jev-dialog-title {
        color: #00ff99;
        text-shadow: 0 0 5px rgba(0, 255, 153, 0.5);
      }
      
      .jev-dialog-neon .jev-dialog-header,
      .jev-dialog-neon .jev-dialog-footer {
        border-color: rgba(0, 255, 153, 0.3);
      }
      
      .jev-dialog-neon .jev-dialog-content {
        color: #ffffff;
      }
      
      .jev-dialog-neon .jev-dialog-close-btn {
        color: #00ff99;
        background: none;
      }
      
      .jev-dialog-neon .jev-dialog-close-btn:hover {
        background-color: rgba(0, 255, 153, 0.1) !important;
        color: #00ff99;
      }
      
      /* 主题样式 - Default */
      .jev-dialog-default {
        background-color: #ffffff;
        border: 1px solid #dee2e6;
      }
      
      .jev-dialog-default .jev-dialog-title {
        color: #333333;
      }
      
      .jev-dialog-default .jev-dialog-header,
      .jev-dialog-default .jev-dialog-footer {
        border-color: #dee2e6;
      }
      
      .jev-dialog-default .jev-dialog-content {
        color: #495057;
      }
      
      .jev-dialog-default .jev-dialog-close-btn {
        color: #999;
        background: none;
      }
      
      .jev-dialog-default .jev-dialog-close-btn:hover {
        background-color: #f5f5f5 !important;
        color: #666;
      }
      
      /* 主题样式 - Dark */
      .jev-dialog-dark {
        background-color: #2d3748;
        border: 1px solid #4a5568;
      }
      
      .jev-dialog-dark .jev-dialog-title {
        color: #e2e8f0;
      }
      
      .jev-dialog-dark .jev-dialog-header,
      .jev-dialog-dark .jev-dialog-footer {
        border-color: #4a5568;
      }
      
      .jev-dialog-dark .jev-dialog-content {
        color: #cbd5e0;
      }
      
      .jev-dialog-dark .jev-dialog-close-btn {
        color: #cbd5e0;
        background: none;
      }
      
      .jev-dialog-dark .jev-dialog-close-btn:hover {
        background-color: rgba(255, 255, 255, 0.1) !important;
        color: #e2e8f0;
      }
      
      /* 主题样式 - Success */
      .jev-dialog-success {
        background-color: #f0fff4;
        border: 1px solid #00cc66;
      }
      
      .jev-dialog-success .jev-dialog-title {
        color: #006400;
      }
      
      .jev-dialog-success .jev-dialog-header,
      .jev-dialog-success .jev-dialog-footer {
        border-color: rgba(0, 204, 102, 0.3);
      }
      
      .jev-dialog-success .jev-dialog-content {
        color: #2e7d32;
      }
      
      .jev-dialog-success .jev-dialog-close-btn {
        color: #006400;
        background: none;
      }
      
      .jev-dialog-success .jev-dialog-close-btn:hover {
        background-color: rgba(0, 204, 102, 0.1) !important;
        color: #006400;
      }
      
      /* 主题样式 - Warning */
      .jev-dialog-warning {
        background-color: #fffaf0;
        border: 1px solid #ffcc00;
      }
      
      .jev-dialog-warning .jev-dialog-title {
        color: #8b5a00;
      }
      
      .jev-dialog-warning .jev-dialog-header,
      .jev-dialog-warning .jev-dialog-footer {
        border-color: rgba(255, 204, 0, 0.3);
      }
      
      .jev-dialog-warning .jev-dialog-content {
        color: #bf6900;
      }
      
      .jev-dialog-warning .jev-dialog-close-btn {
        color: #8b5a00;
        background: none;
      }
      
      .jev-dialog-warning .jev-dialog-close-btn:hover {
        background-color: rgba(255, 204, 0, 0.1) !important;
        color: #8b5a00;
      }
      
      /* 主题样式 - Error */
      .jev-dialog-error {
        background-color: #fff0f4;
        border: 1px solid #ff0040;
      }
      
      .jev-dialog-error .jev-dialog-title {
        color: #a00020;
      }
      
      .jev-dialog-error .jev-dialog-header,
      .jev-dialog-error .jev-dialog-footer {
        border-color: rgba(255, 0, 64, 0.3);
      }
      
      .jev-dialog-error .jev-dialog-content {
        color: #c62828;
      }
      
      .jev-dialog-error .jev-dialog-close-btn {
        color: #a00020;
        background: none;
      }
      
      .jev-dialog-error .jev-dialog-close-btn:hover {
        background-color: rgba(255, 0, 64, 0.1) !important;
        color: #a00020;
      }
      
      /* 响应式设计 */
      @media (max-width: 768px) {
        .jev-dialog-container {
          width: 95vw !important;
          margin: 0;
        }
        
        .jev-dialog-header,
        .jev-dialog-content,
        .jev-dialog-footer {
          padding: 12px 16px;
        }
        
        .jev-dialog-title {
          font-size: 16px;
        }
      }
    `);
    
    // 应用位置样式
    if (this.overlayElement && this.options.position !== 'center') {
      this.overlayElement.classList.add(`jev-dialog-position-${this.options.position}`);
    }
    
    // 应用自定义样式
    if (this.options.style && this.element) {
      Object.entries(this.options.style).forEach(([key, value]) => {
        this.element.style[key] = value;
      });
    }
    
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
   * 绑定事件
   * @private
   */
  _bindEvents() {
    // 关闭按钮事件已在按钮创建时绑定
    
    // 遮罩层点击事件
    if (this.options.modal && this.options.maskClosable && this.overlayElement) {
      this._outsideClickHandler = (event) => {
        if (event.target === this.overlayElement) {
          this.close();
        }
      };
      this.overlayElement.addEventListener('click', this._outsideClickHandler);
    }
    
    // ESC键关闭事件
    if (this.options.escClosable) {
      this._escapeHandler = (event) => {
        if (event.key === 'Escape' && this.state.visible) {
          this.close();
        }
      };
      document.addEventListener('keydown', this._escapeHandler);
    }
  }

  /**
   * 解绑事件
   * @private
   */
  _unbindEvents() {
    if (this.overlayElement && this._outsideClickHandler) {
      this.overlayElement.removeEventListener('click', this._outsideClickHandler);
      this._outsideClickHandler = null;
    }
    
    if (this._escapeHandler) {
      document.removeEventListener('keydown', this._escapeHandler);
      this._escapeHandler = null;
    }
    
    // 清理按钮事件
    Object.values(this.buttons).forEach(button => {
      button._unbindEvents();
    });
  }

  /**
   * 初始化后钩子
   * @private
   */
  async _afterInitialize() {
    // 初始化所有按钮
    for (const button of Object.values(this.buttons)) {
      await button.initialize();
    }
  }
  
  /**
   * 初始化拖拽功能
   * @private
   */
  _initDraggable() {
    if (!this.dialogContainer || !this.headerElement) return;
    
    const startDrag = (e) => {
      // 忽略点击头部的按钮区域
      if (e.target.closest('.jev-dialog-close-btn')) {
        return;
      }
      
      e.preventDefault();
      
      const rect = this.dialogContainer.getBoundingClientRect();
      
      // 支持触摸事件
      let clientX, clientY;
      if (e.type === 'touchstart') {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else {
        clientX = e.clientX;
        clientY = e.clientY;
      }
      
      this.draggingState = {
        startX: clientX,
        startY: clientY,
        offsetX: clientX - rect.left,
        offsetY: clientY - rect.top
      };
      
      // 设置对话框样式
      this.dialogContainer.style.position = 'absolute';
      this.dialogContainer.style.zIndex = this.options.zIndex + 2;
      
      // 触发拖拽开始回调
      if (typeof this.options.onDragStart === 'function') {
        try {
          this.options.onDragStart(this);
        } catch (error) {
          logger.error('拖拽开始回调执行失败', error);
        }
      }
      
      // 阻止文本选择
      document.body.style.userSelect = 'none';
    };
    
    const dragMove = (e) => {
      if (!this.draggingState) return;
      e.preventDefault();
      
      // 支持触摸事件
      let clientX, clientY;
      if (e.type === 'touchmove') {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else {
        clientX = e.clientX;
        clientY = e.clientY;
      }
      
      let newLeft = clientX - this.draggingState.offsetX;
      let newTop = clientY - this.draggingState.offsetY;
      
      // 限制在可视区域内
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const dialogWidth = this.dialogContainer.offsetWidth;
      const dialogHeight = this.dialogContainer.offsetHeight;
      
      newLeft = Math.max(0, Math.min(newLeft, viewportWidth - dialogWidth));
      newTop = Math.max(0, Math.min(newTop, viewportHeight - dialogHeight));
      
      this.dialogContainer.style.left = `${newLeft}px`;
      this.dialogContainer.style.top = `${newTop}px`;
      
      // 触发拖拽移动回调
      if (typeof this.options.onDragMove === 'function') {
        try {
          this.options.onDragMove(newLeft, newTop, this);
        } catch (error) {
          logger.error('拖拽移动回调执行失败', error);
        }
      }
    };
    
    const dragEnd = () => {
      if (!this.draggingState) return;
      
      // 触发拖拽结束回调
      if (typeof this.options.onDragEnd === 'function') {
        try {
          this.options.onDragEnd(this);
        } catch (error) {
          logger.error('拖拽结束回调执行失败', error);
        }
      }
      
      // 恢复文本选择
      document.body.style.userSelect = '';
      this.draggingState = null;
    };
    
    // 绑定拖拽事件
    this.headerElement.addEventListener('mousedown', startDrag);
    this.headerElement.addEventListener('touchstart', startDrag, { passive: false });
    document.addEventListener('mousemove', dragMove);
    document.addEventListener('touchmove', dragMove, { passive: false });
    document.addEventListener('mouseup', dragEnd);
    document.addEventListener('touchend', dragEnd);
  }
  
  /**
   * 初始化调整大小功能
   * @private
   */
  _initResizable() {
    if (!this.dialogContainer) return;
    
    const startResize = (e) => {
      // 只有点击右下角才开始调整大小
      const rect = this.dialogContainer.getBoundingClientRect();
      const isInResizeArea = e.clientX > rect.right - 20 && e.clientY > rect.bottom - 20;
      if (!isInResizeArea) return;
      
      e.preventDefault();
      
      this.resizingState = {
        startX: e.clientX,
        startY: e.clientY,
        startWidth: this.dialogContainer.offsetWidth,
        startHeight: this.dialogContainer.offsetHeight
      };
      
      // 设置对话框为绝对定位
      if (this.dialogContainer.style.position !== 'absolute') {
        const rect = this.dialogContainer.getBoundingClientRect();
        this.dialogContainer.style.position = 'absolute';
        this.dialogContainer.style.left = `${rect.left}px`;
        this.dialogContainer.style.top = `${rect.top}px`;
      }
      
      // 触发调整大小开始回调
      if (typeof this.options.onResizeStart === 'function') {
        try {
          this.options.onResizeStart(this);
        } catch (error) {
          logger.error('调整大小开始回调执行失败', error);
        }
      }
    };
    
    const resizeMove = (e) => {
      if (!this.resizingState) return;
      e.preventDefault();
      
      const width = this.resizingState.startWidth + (e.clientX - this.resizingState.startX);
      const height = this.resizingState.startHeight + (e.clientY - this.resizingState.startY);
      
      // 限制最小尺寸
      const minWidth = 300;
      const minHeight = 200;
      const newWidth = Math.max(minWidth, width);
      const newHeight = Math.max(minHeight, height);
      
      this.dialogContainer.style.width = `${newWidth}px`;
      this.dialogContainer.style.height = `${newHeight}px`;
      
      // 触发调整大小移动回调
      if (typeof this.options.onResizeMove === 'function') {
        try {
          this.options.onResizeMove(newWidth, newHeight, this);
        } catch (error) {
          logger.error('调整大小移动回调执行失败', error);
        }
      }
    };
    
    const resizeEnd = () => {
      if (!this.resizingState) return;
      
      // 触发调整大小结束回调
      if (typeof this.options.onResizeEnd === 'function') {
        try {
          this.options.onResizeEnd(this);
        } catch (error) {
          logger.error('调整大小结束回调执行失败', error);
        }
      }
      
      this.resizingState = null;
    };
    
    // 绑定调整大小事件
    this.dialogContainer.addEventListener('mousedown', startResize);
    document.addEventListener('mousemove', resizeMove);
    document.addEventListener('mouseup', resizeEnd);
  }

  /**
   * 更新DOM元素
   * @private
   */
  _updateElement() {
    // 更新标题
    if (this.titleElement && this.titleElement.textContent !== this.state.title) {
      this.titleElement.textContent = this.state.title;
    }
    
    // 更新内容
    if (this.contentElement && this.state.content !== undefined) {
      // 清空内容
      this.contentElement.innerHTML = '';
      
      // 设置新内容
      if (typeof this.state.content === 'string') {
        this.contentElement.innerHTML = this.state.content;
      } else if (this.state.content instanceof Element) {
        this.contentElement.appendChild(this.state.content);
      }
    }
    
    // 更新可见性（处理动画显示/隐藏）
    if (this.element) {
      if (this.state.visible && !this.isOpen) {
        // 显示对话框
        this.element.style.display = 'flex';
        setTimeout(() => {
          if (this.overlayElement) {
            this.overlayElement.classList.add('jev-dialog-visible');
          } else {
            this.dialogContainer.style.opacity = '1';
            this.dialogContainer.style.transform = 'scale(1)';
          }
          
          // 触发打开回调
          this.isOpen = true;
          if (typeof this.options.onOpen === 'function') {
            try {
              this.options.onOpen(this);
            } catch (error) {
              logger.error('对话框打开回调执行失败', error);
            }
          }
        }, 10);
      } else if (!this.state.visible && this.isOpen) {
        // 隐藏对话框（带动画）
        if (this.overlayElement) {
          this.overlayElement.classList.remove('jev-dialog-visible');
        } else {
          this.dialogContainer.style.opacity = '0';
          this.dialogContainer.style.transform = 'scale(0.9)';
        }
        
        this.animationTimeout = setTimeout(() => {
          this.element.style.display = 'none';
          this.isOpen = false;
          
          // 触发关闭回调
          if (typeof this.options.onClose === 'function') {
            try {
              this.options.onClose(this);
            } catch (error) {
              logger.error('对话框关闭回调执行失败', error);
            }
          }
        }, this.options.animationDuration);
      }
    }
  }

  /**
   * 打开对话框
   * @returns {Dialog} 对话框实例
   */
  async open() {
    try {
      // 确保元素已挂载
      if (!this.element.parentNode) {
        document.body.appendChild(this.element);
      }
      
      return this.updateState({ visible: true });
    } catch (error) {
      logger.error('对话框打开失败', error);
      throw error;
    }
  }

  /**
   * 关闭对话框
   * @returns {Dialog} 对话框实例
   */
  async close() {
    // 触发关闭前回调
    if (typeof this.options.onBeforeClose === 'function') {
      try {
        const canClose = await this.options.onBeforeClose(this);
        if (canClose === false) {
          return this; // 阻止关闭
        }
      } catch (error) {
        logger.error('对话框关闭前回调执行失败', error);
        return this;
      }
    }
    
    return this.updateState({ visible: false });
  }

  /**
   * 设置标题
   * @param {string} title - 标题
   * @returns {Dialog} 对话框实例
   */
  setTitle(title) {
    return this.updateState({ title });
  }

  /**
   * 设置内容
   * @param {string|Element} content - 内容
   * @returns {Dialog} 对话框实例
   */
  setContent(content) {
    return this.updateState({ content });
  }

  /**
   * 获取内容元素
   * @returns {HTMLElement} 内容元素
   */
  getContentElement() {
    return this.contentElement;
  }

  /**
   * 获取按钮实例
   * @param {string} key - 按钮键
   * @returns {Button} 按钮实例
   */
  getButton(key) {
    return this.buttons[key];
  }
  
  /**
   * 添加按钮
   * @param {string} key - 按钮标识
   * @param {Object} options - 按钮配置
   * @returns {Dialog} 对话框实例
   */
  addButton(key, options) {
    const button = new Button({
      ...options,
      theme: options.theme || this.options.theme
    });
    
    this.buttons[key] = button;
    this.footerElement.appendChild(button.getElement());
    button.initialize();
    
    return this;
  }
  
  /**
   * 移除按钮
   * @param {string} key - 按钮标识
   * @returns {Dialog} 对话框实例
   */
  removeButton(key) {
    const button = this.buttons[key];
    if (button) {
      try {
        button.destroy();
        this.footerElement.removeChild(button.getElement());
      } catch (error) {
        logger.error('按钮移除失败', error);
      }
      delete this.buttons[key];
    }
    return this;
  }
  
  /**
   * 清空按钮
   * @returns {Dialog} 对话框实例
   */
  clearButtons() {
    Object.keys(this.buttons).forEach(key => this.removeButton(key));
    return this;
  }
  
  /**
   * 设置对话框大小
   * @param {string} width - 宽度
   * @param {string} height - 高度
   * @returns {Dialog} 对话框实例
   */
  setSize(width, height) {
    if (this.dialogContainer) {
      this.dialogContainer.style.width = width;
      if (height) {
        this.dialogContainer.style.height = height;
      }
    }
    return this;
  }
  
  /**
   * 设置对话框位置
   * @param {number} left - 左侧位置
   * @param {number} top - 顶部位置
   * @returns {Dialog} 对话框实例
   */
  setPosition(left, top) {
    if (this.dialogContainer) {
      this.dialogContainer.style.position = 'absolute';
      this.dialogContainer.style.left = `${left}px`;
      this.dialogContainer.style.top = `${top}px`;
    }
    return this;
  }
  
  /**
   * 设置对话框主题
   * @param {string} theme - 主题
   * @returns {Dialog} 对话框实例
   */
  setTheme(theme) {
    if (!this.dialogContainer) return this;
    
    // 移除旧主题类，添加新主题类
    ['neon', 'default', 'dark', 'success', 'warning', 'error'].forEach(t => {
      this.dialogContainer.classList.remove(`jev-dialog-${t}`);
    });
    this.dialogContainer.classList.add(`jev-dialog-${theme}`);
    this.options.theme = theme;
    
    // 更新按钮主题
    Object.values(this.buttons).forEach(button => {
      if (button.setTheme) {
        button.setTheme(theme);
      }
    });
    
    return this;
  }
  
  /**
   * 使对话框居中显示
   * @returns {Dialog} 对话框实例
   */
  center() {
    if (this.dialogContainer) {
      this.dialogContainer.style.position = 'absolute';
      this.dialogContainer.style.left = '50%';
      this.dialogContainer.style.top = '50%';
      this.dialogContainer.style.transform = 'translate(-50%, -50%) scale(1)';
    }
    return this;
  }
  
  /**
   * 获取对话框是否可见
   * @returns {boolean} 是否可见
   */
  isVisible() {
    return this.isOpen;
  }

  /**
   * 资源释放与清理
   */
  async destroy() {
    try {
      // 清理事件
      this._unbindEvents();
      
      // 清理动画定时器
      if (this.animationTimeout) {
        clearTimeout(this.animationTimeout);
        this.animationTimeout = null;
      }
      
      // 清理拖拽和调整大小状态
      this.draggingState = null;
      this.resizingState = null;
      
      // 清理按钮
      await this.clearButtons();
      
      // 卸载组件
      await this.unmount();
      
      // 重置引用
      this.overlayElement = null;
      this.dialogContainer = null;
      this.contentElement = null;
      this.headerElement = null;
      this.titleElement = null;
      this.footerElement = null;
      this.closeButton = null;
      
      // 重置状态
      this.isOpen = false;
      this.buttons = {};
      
    } catch (error) {
      logger.error('对话框销毁失败', error);
    }
  }
}

export default Dialog;