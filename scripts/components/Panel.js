/**
 * 面板组件 - 增强版
 * 用于统一管理各模块的面板UI展示，支持拖拽、调整大小、动画效果等高级功能
 */
import BaseComponent from './base-component.js';
import Button from './Button.js';
import logger from '../modular/logger.js';

class Panel extends BaseComponent {
  constructor(options = {}) {
    super(options);
    
    // 面板元素引用
    this.headerElement = null;
    this.titleElement = null;
    this.contentElement = null;
    this.footerElement = null;
    this.closeButton = null;
    
    // 事件处理器
    this._closeHandler = null;
    this._collapseHandler = null;
    
    // 按钮实例
    this.buttons = {};
    
    // 状态管理
    this.collapsed = false;
    this.originalHeight = null;
    
    // 调整大小相关
    this.resizeHandle = null;
    this._resizeHandlers = null;
    this.minSize = { width: 200, height: 150 };
    
    // 动画相关
    this.animationTimer = null;
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
      collapsible: true,
      closable: false,
      draggable: false,
      resizable: false,
      width: 'auto',
      height: 'auto',
      minWidth: 200,
      minHeight: 150,
      position: {
        top: null,
        right: null,
        bottom: null,
        left: null
      },
      zIndex: 1000,
      theme: 'neon', // neon, default, dark
      animation: true,
      animationDuration: 300,
      onClose: null,
      onCollapse: null,
      onExpand: null,
      onResize: null,
      onDragEnd: null,
      layout: 'fixed' // fixed, absolute, relative
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
      collapsed: false,
      visible: false,
      width: this.options.width,
      height: this.options.height
    };
  }

  /**
   * 创建DOM元素
   * @private
   */
  _createElement() {
    // 创建面板容器
    const panelContainer = document.createElement('div');
    panelContainer.className = `jev-panel jev-panel-${this.options.theme}`;
    
    // 添加动画类
    if (this.options.animation) {
      panelContainer.classList.add('jev-panel-animated');
    }
    
    // 创建头部
    this.headerElement = document.createElement('div');
    this.headerElement.className = 'jev-panel-header';
    
    // 标题
    this.titleElement = document.createElement('h3');
    this.titleElement.className = 'jev-panel-title';
    this.titleElement.textContent = this.options.title;
    
    // 头部操作按钮容器
    const headerActions = document.createElement('div');
    headerActions.className = 'jev-panel-header-actions';
    
    // 折叠按钮
    if (this.options.collapsible) {
      this.collapseButton = new Button({
        text: '',
        icon: '▼',
        size: 'small',
        type: 'default',
        className: 'jev-panel-collapse-btn',
        onClick: () => this.toggleCollapse()
      });
      headerActions.appendChild(this.collapseButton.element);
    }
    
    // 关闭按钮
    if (this.options.closable) {
      this.closeButton = new Button({
        text: '',
        icon: '&times;',
        size: 'small',
        type: 'default',
        className: 'jev-panel-close-btn',
        onClick: () => this.close()
      });
      headerActions.appendChild(this.closeButton.element);
    }
    
    this.headerElement.appendChild(this.titleElement);
    if (headerActions.children.length > 0) {
      this.headerElement.appendChild(headerActions);
    }
    
    // 创建内容区域
    this.contentElement = document.createElement('div');
    this.contentElement.className = 'jev-panel-content';
    
    // 设置内容
    if (typeof this.options.content === 'string') {
      this.contentElement.innerHTML = this.options.content;
    } else if (this.options.content instanceof HTMLElement) {
      this.contentElement.appendChild(this.options.content);
    }
    
    // 创建底部
    this.footerElement = document.createElement('div');
    this.footerElement.className = 'jev-panel-footer';
    
    // 组装面板
    panelContainer.appendChild(this.headerElement);
    panelContainer.appendChild(this.contentElement);
    panelContainer.appendChild(this.footerElement);
    
    // 添加调整大小句柄
    if (this.options.resizable) {
      this._createResizeHandle(panelContainer);
    }
    
    this.element = panelContainer;
  }
  
  /**
   * 创建调整大小句柄
   * @private
   */
  _createResizeHandle(container) {
    // 右下角调整大小句柄
    this.resizeHandle = document.createElement('div');
    this.resizeHandle.className = 'jev-panel-resize-handle';
    this.resizeHandle.style.cssText = `
      position: absolute;
      right: 0;
      bottom: 0;
      width: 15px;
      height: 15px;
      cursor: nwse-resize;
      background: linear-gradient(135deg, transparent 0%, transparent 60%, rgba(0, 255, 153, 0.5) 60%, rgba(0, 255, 153, 0.5) 100%);
      z-index: 10;
    `;
    
    container.appendChild(this.resizeHandle);
  }

  /**
   * 应用样式
   * @private
   */
  _applyStyles() {
    // 设置基础样式
    const styles = {
      width: this.options.width,
      height: this.options.height,
      minWidth: `${this.options.minWidth}px`,
      minHeight: `${this.options.minHeight}px`,
      position: this.options.layout,
      zIndex: this.options.zIndex,
      backgroundColor: this._getThemeColors().background,
      border: `1px solid ${this._getThemeColors().border}`,
      borderRadius: '8px',
      boxShadow: this._getThemeColors().boxShadow,
      display: 'none', // 初始隐藏
      flexDirection: 'column',
      color: this._getThemeColors().text,
      overflow: 'hidden'
    };
    
    // 应用位置样式
    Object.entries(this.options.position).forEach(([key, value]) => {
      if (value !== null) {
        styles[key] = value;
      }
    });
    
    // 应用样式到元素
    Object.entries(styles).forEach(([key, value]) => {
      if (this.element) {
        this.element.style[key] = value;
      }
    });
    
    // 保存最小尺寸
    this.minSize = {
      width: this.options.minWidth,
      height: this.options.minHeight
    };
    
    // 添加全局面板样式
    this._addGlobalStyle('jev-panel-styles', `
      /* 面板基础样式 */
      .jev-panel {
        transition: all 0.2s ease;
      }
      
      /* 动画样式 */
      .jev-panel-animated {
        animation-duration: ${this.options.animationDuration}ms;
        animation-fill-mode: both;
      }
      
      .jev-panel-enter {
        opacity: 0;
        transform: translateY(-10px) scale(0.95);
        animation-name: jevPanelEnter;
      }
      
      .jev-panel-exit {
        opacity: 1;
        animation-name: jevPanelExit;
      }
      
      @keyframes jevPanelEnter {
        to {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }
      
      @keyframes jevPanelExit {
        to {
          opacity: 0;
          transform: translateY(-10px) scale(0.95);
        }
      }
      
      /* 主题样式 */
      .jev-panel-neon {
        background: linear-gradient(145deg, #1a1a1a, #222);
        border: 1px solid #00ff99;
        box-shadow: 
          0 0 10px rgba(0, 255, 153, 0.3),
          inset 0 0 10px rgba(0, 255, 153, 0.1);
      }
      
      .jev-panel-default {
        background: linear-gradient(145deg, #f8f9fa, #e9ecef);
        border: 1px solid #ced4da;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      }
      
      .jev-panel-dark {
        background: linear-gradient(145deg, #2c3e50, #1a252f);
        border: 1px solid #34495e;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
      }
      
      /* 面板头部样式 */
      .jev-panel-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px 16px;
        border-bottom: 1px solid #333;
        background: rgba(0, 255, 153, 0.1);
        cursor: default;
        user-select: none;
        transition: background-color 0.2s ease;
      }
      
      .jev-panel-draggable .jev-panel-header {
        cursor: move;
      }
      
      .jev-panel-default .jev-panel-header {
        background: #f8f9fa;
        border-bottom-color: #dee2e6;
      }
      
      .jev-panel-dark .jev-panel-header {
        background: rgba(52, 73, 94, 0.3);
        border-bottom-color: #34495e;
      }
      
      .jev-panel-title {
        margin: 0;
        font-size: 14px;
        font-weight: 500;
        color: #00ff99;
        text-shadow: 0 0 5px rgba(0, 255, 153, 0.5);
      }
      
      .jev-panel-default .jev-panel-title {
        color: #212529;
        text-shadow: none;
      }
      
      .jev-panel-dark .jev-panel-title {
        color: #ecf0f1;
        text-shadow: none;
      }
      
      /* 头部操作按钮容器 */
      .jev-panel-header-actions {
        display: flex;
        gap: 4px;
      }
      
      /* 面板内容样式 */
      .jev-panel-content {
        padding: 16px;
        flex: 1;
        overflow-y: auto;
        font-size: 13px;
        color: #00ff99;
        background-color: rgba(0, 0, 0, 0.3);
        transition: all 0.2s ease;
      }
      
      .jev-panel-default .jev-panel-content {
        color: #212529;
        background-color: #ffffff;
      }
      
      .jev-panel-dark .jev-panel-content {
        color: #ecf0f1;
        background-color: #2c3e50;
      }
      
      /* 面板底部样式 */
      .jev-panel-footer {
        padding: 12px 16px;
        border-top: 1px solid #333;
        display: flex;
        justify-content: flex-end;
        gap: 8px;
        background: rgba(0, 255, 153, 0.05);
        transition: all 0.2s ease;
      }
      
      .jev-panel-default .jev-panel-footer {
        background: #f8f9fa;
        border-top-color: #dee2e6;
      }
      
      .jev-panel-dark .jev-panel-footer {
        background: rgba(52, 73, 94, 0.2);
        border-top-color: #34495e;
      }
      
      /* 折叠状态样式 */
      .jev-panel-collapsed .jev-panel-content,
      .jev-panel-collapsed .jev-panel-footer {
        display: none;
      }
      
      .jev-panel-collapsed .jev-panel-collapse-btn {
        transform: rotate(-90deg);
      }
      
      /* 按钮样式覆盖 */
      .jev-panel-collapse-btn,
      .jev-panel-close-btn {
        background: rgba(0, 255, 153, 0.1);
        color: #00ff99;
        border: 1px solid rgba(0, 255, 153, 0.3);
        padding: 2px 6px;
        transition: all 0.2s ease;
      }
      
      .jev-panel-collapse-btn:hover,
      .jev-panel-close-btn:hover {
        background: rgba(0, 255, 153, 0.2) !important;
        box-shadow: 0 0 5px rgba(0, 255, 153, 0.5);
        transform: translateY(-1px);
      }
      
      .jev-panel-default .jev-panel-collapse-btn,
      .jev-panel-default .jev-panel-close-btn {
        background: #e9ecef;
        color: #495057;
        border: 1px solid #ced4da;
      }
      
      .jev-panel-default .jev-panel-collapse-btn:hover,
      .jev-panel-default .jev-panel-close-btn:hover {
        background: #dee2e6 !important;
        box-shadow: 0 0 5px rgba(0, 0, 0, 0.2);
      }
      
      .jev-panel-dark .jev-panel-collapse-btn,
      .jev-panel-dark .jev-panel-close-btn {
        background: rgba(52, 73, 94, 0.3);
        color: #ecf0f1;
        border: 1px solid #34495e;
      }
      
      .jev-panel-dark .jev-panel-collapse-btn:hover,
      .jev-panel-dark .jev-panel-close-btn:hover {
        background: rgba(52, 73, 94, 0.5) !important;
        box-shadow: 0 0 5px rgba(0, 0, 0, 0.4);
      }
      
      /* 滚动条样式 */
      .jev-panel-content::-webkit-scrollbar {
        width: 8px;
        height: 8px;
      }
      
      .jev-panel-content::-webkit-scrollbar-track {
        background: rgba(0, 0, 0, 0.3);
        border-radius: 4px;
      }
      
      .jev-panel-content::-webkit-scrollbar-thumb {
        background: rgba(0, 255, 153, 0.5);
        border-radius: 4px;
        transition: background 0.2s ease;
      }
      
      .jev-panel-content::-webkit-scrollbar-thumb:hover {
        background: rgba(0, 255, 153, 0.7);
      }
      
      .jev-panel-default .jev-panel-content::-webkit-scrollbar-track {
        background: #f1f1f1;
      }
      
      .jev-panel-default .jev-panel-content::-webkit-scrollbar-thumb {
        background: #c1c1c1;
      }
      
      .jev-panel-default .jev-panel-content::-webkit-scrollbar-thumb:hover {
        background: #a1a1a1;
      }
      
      .jev-panel-dark .jev-panel-content::-webkit-scrollbar-track {
        background: rgba(0, 0, 0, 0.2);
      }
      
      .jev-panel-dark .jev-panel-content::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.2);
      }
      
      .jev-panel-dark .jev-panel-content::-webkit-scrollbar-thumb:hover {
        background: rgba(255, 255, 255, 0.3);
      }
      
      /* 可拖拽提示 */
      .jev-panel-header::before {
        content: '';
        display: none;
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 255, 153, 0.05);
        pointer-events: none;
      }
      
      .jev-panel-header:hover::before {
        display: block;
      }
      
      /* 调整大小句柄样式 */
      .jev-panel-resize-handle {
        transition: all 0.2s ease;
      }
      
      .jev-panel-resize-handle:hover {
        width: 20px;
        height: 20px;
      }
      
      /* 拖拽中样式 */
      .jev-panel-dragging {
        opacity: 0.9;
        box-shadow: 0 0 20px rgba(0, 255, 153, 0.5) !important;
      }
      
      /* 响应式设计 */
      @media (max-width: 768px) {
        .jev-panel {
          width: 95% !important;
          max-width: 95% !important;
          left: 2.5% !important;
          right: 2.5% !important;
          top: 10px !important;
        }
      }
    `);
    
    // 应用自定义样式
    if (this.options.style && this.element) {
      Object.entries(this.options.style).forEach(([key, value]) => {
        this.element.style[key] = value;
      });
    }
  }

  /**
   * 获取主题颜色
   * @private
   */
  _getThemeColors() {
    const themes = {
      neon: {
        background: '#1a1a1a',
        border: '#00ff99',
        text: '#00ff99',
        boxShadow: '0 0 15px rgba(0, 255, 153, 0.3)'
      },
      default: {
        background: '#ffffff',
        border: '#ced4da',
        text: '#212529',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
      },
      dark: {
        background: '#2c3e50',
        border: '#34495e',
        text: '#ecf0f1',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)'
      }
    };
    
    return themes[this.options.theme] || themes.neon;
  }
  
  /**
   * 绑定事件
   * @private
   */
  _bindEvents() {
    // 按钮事件已在按钮创建时绑定
    
    // 实现拖拽功能
    if (this.options.draggable && this.headerElement) {
      this._initDraggable();
    }
    
    // 实现调整大小功能
    if (this.options.resizable && this.resizeHandle) {
      this._initResizable();
    }
  }

  /**
   * 初始化拖拽功能
   * @private
   */
  _initDraggable() {
    if (!this.headerElement || !this.element) return;
    
    let isDragging = false;
    let offsetX, offsetY;
    let lastX, lastY;
    
    // 添加可拖拽类
    this.element.classList.add('jev-panel-draggable');
    
    const startDrag = (event) => {
      // 忽略点击头部按钮的情况
      if (event.target.closest('.jev-panel-header-actions')) return;
      
      isDragging = true;
      const rect = this.element.getBoundingClientRect();
      offsetX = event.clientX - rect.left;
      offsetY = event.clientY - rect.top;
      
      // 记录起始位置
      lastX = rect.left;
      lastY = rect.top;
      
      // 添加拖拽中样式
      this.element.classList.add('jev-panel-dragging');
      
      // 防止文本选中
      document.body.style.userSelect = 'none';
      
      // 提高z-index，确保拖拽时在最上层
      this.element.style.zIndex = (parseInt(this.element.style.zIndex) || 1000) + 100;
    };
    
    const drag = (event) => {
      if (!isDragging) return;
      
      const x = event.clientX - offsetX;
      const y = event.clientY - offsetY;
      
      // 确保面板不会被拖出可视区域
      const maxX = window.innerWidth - this.element.offsetWidth;
      const maxY = window.innerHeight - this.element.offsetHeight;
      
      const clampedX = Math.max(0, Math.min(x, maxX));
      const clampedY = Math.max(0, Math.min(y, maxY));
      
      this.element.style.left = `${clampedX}px`;
      this.element.style.top = `${clampedY}px`;
      
      // 清除其他定位属性
      this.element.style.right = 'auto';
      this.element.style.bottom = 'auto';
    };
    
    const stopDrag = () => {
      if (isDragging) {
        isDragging = false;
        this.element.classList.remove('jev-panel-dragging');
        document.body.style.userSelect = '';
        
        // 触发拖拽结束回调
        if (typeof this.options.onDragEnd === 'function') {
          try {
            const rect = this.element.getBoundingClientRect();
            this.options.onDragEnd({
              x: rect.left,
              y: rect.top,
              width: rect.width,
              height: rect.height
            });
          } catch (error) {
            logger.error('面板拖拽结束事件处理失败', error);
          }
        }
      }
    };
    
    // 绑定拖拽事件
    this.headerElement.addEventListener('mousedown', startDrag);
    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', stopDrag);
    
    // 支持触摸设备
    this.headerElement.addEventListener('touchstart', (e) => {
      if (e.touches && e.touches.length === 1) {
        const touch = e.touches[0];
        startDrag(touch);
        e.preventDefault(); // 防止页面滚动
      }
    });
    
    document.addEventListener('touchmove', (e) => {
      if (isDragging && e.touches && e.touches.length === 1) {
        const touch = e.touches[0];
        drag(touch);
        e.preventDefault(); // 防止页面滚动
      }
    });
    
    document.addEventListener('touchend', stopDrag);
    
    // 保存事件处理函数引用以便后续清理
    this._dragHandlers = {
      startDrag,
      drag,
      stopDrag
    };
  }
  
  /**
   * 初始化调整大小功能
   * @private
   */
  _initResizable() {
    if (!this.resizeHandle || !this.element) return;
    
    let isResizing = false;
    let startWidth, startHeight, startX, startY;
    
    const startResize = (event) => {
      isResizing = true;
      startWidth = this.element.offsetWidth;
      startHeight = this.element.offsetHeight;
      startX = event.clientX;
      startY = event.clientY;
      
      // 防止文本选中
      document.body.style.userSelect = 'none';
      
      // 添加调整中样式
      this.element.classList.add('jev-panel-resizing');
    };
    
    const resize = (event) => {
      if (!isResizing) return;
      
      const deltaX = event.clientX - startX;
      const deltaY = event.clientY - startY;
      
      // 计算新尺寸
      const newWidth = Math.max(this.minSize.width, startWidth + deltaX);
      const newHeight = Math.max(this.minSize.height, startHeight + deltaY);
      
      // 应用新尺寸
      this.element.style.width = `${newWidth}px`;
      this.element.style.height = `${newHeight}px`;
      
      // 更新状态
      this.updateState({
        width: `${newWidth}px`,
        height: `${newHeight}px`
      });
    };
    
    const stopResize = () => {
      if (isResizing) {
        isResizing = false;
        document.body.style.userSelect = '';
        this.element.classList.remove('jev-panel-resizing');
        
        // 触发调整大小回调
        if (typeof this.options.onResize === 'function') {
          try {
            this.options.onResize({
              width: this.element.offsetWidth,
              height: this.element.offsetHeight
            });
          } catch (error) {
            logger.error('面板调整大小事件处理失败', error);
          }
        }
      }
    };
    
    // 绑定调整大小事件
    this.resizeHandle.addEventListener('mousedown', startResize);
    document.addEventListener('mousemove', resize);
    document.addEventListener('mouseup', stopResize);
    
    // 支持触摸设备
    this.resizeHandle.addEventListener('touchstart', (e) => {
      if (e.touches && e.touches.length === 1) {
        const touch = e.touches[0];
        startResize(touch);
        e.preventDefault();
      }
    });
    
    document.addEventListener('touchmove', (e) => {
      if (isResizing && e.touches && e.touches.length === 1) {
        const touch = e.touches[0];
        resize(touch);
        e.preventDefault();
      }
    });
    
    document.addEventListener('touchend', stopResize);
    
    // 保存事件处理函数引用以便后续清理
    this._resizeHandlers = {
      startResize,
      resize,
      stopResize
    };
  }

  /**
   * 解绑事件
   * @private
   */
  _unbindEvents() {
    // 清理拖拽事件
    if (this._dragHandlers) {
      if (this.headerElement) {
        this.headerElement.removeEventListener('mousedown', this._dragHandlers.startDrag);
        this.headerElement.removeEventListener('touchstart', this._dragHandlers.startDrag);
      }
      document.removeEventListener('mousemove', this._dragHandlers.drag);
      document.removeEventListener('touchmove', this._dragHandlers.drag);
      document.removeEventListener('mouseup', this._dragHandlers.stopDrag);
      document.removeEventListener('touchend', this._dragHandlers.stopDrag);
      this._dragHandlers = null;
    }
    
    // 清理调整大小事件
    if (this._resizeHandlers) {
      if (this.resizeHandle) {
        this.resizeHandle.removeEventListener('mousedown', this._resizeHandlers.startResize);
        this.resizeHandle.removeEventListener('touchstart', this._resizeHandlers.startResize);
      }
      document.removeEventListener('mousemove', this._resizeHandlers.resize);
      document.removeEventListener('touchmove', this._resizeHandlers.resize);
      document.removeEventListener('mouseup', this._resizeHandlers.stopResize);
      document.removeEventListener('touchend', this._resizeHandlers.stopResize);
      this._resizeHandlers = null;
    }
    
    // 清理按钮事件
    if (this.collapseButton) {
      this.collapseButton._unbindEvents();
    }
    
    if (this.closeButton) {
      this.closeButton._unbindEvents();
    }
  }

  /**
   * 初始化后钩子
   * @private
   */
  async _afterInitialize() {
    // 初始化按钮
    if (this.collapseButton) {
      await this.collapseButton.initialize();
    }
    
    if (this.closeButton) {
      await this.closeButton.initialize();
    }
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
    if (this.contentElement && this.state.content !== this.options.content) {
      // 清空内容
      this.contentElement.innerHTML = '';
      
      // 设置新内容
      if (typeof this.state.content === 'string') {
        this.contentElement.innerHTML = this.state.content;
      } else if (this.state.content instanceof HTMLElement) {
        this.contentElement.appendChild(this.state.content);
      }
    }
    
    // 更新折叠状态
    if (this.state.collapsed !== this.collapsed) {
      this._updateCollapseState();
    }
    
    // 更新尺寸
    if (this.element) {
      if (this.state.width && this.state.width !== this.options.width) {
        this.element.style.width = this.state.width;
      }
      if (this.state.height && this.state.height !== this.options.height) {
        this.element.style.height = this.state.height;
      }
    }
    
    // 处理可见性变化
    if (this.element && this.state.visible !== this.isVisible) {
      if (this.state.visible) {
        this._showWithAnimation();
      } else {
        this._hideWithAnimation();
      }
    }
  }
  
  /**
   * 带动画显示面板
   * @private
   */
  _showWithAnimation() {
    if (!this.element) return;
    
    // 清除之前的定时器
    if (this.animationTimer) {
      clearTimeout(this.animationTimer);
    }
    
    // 设置显示
    this.element.style.display = 'flex';
    this.element.style.opacity = '0';
    
    // 应用动画
    if (this.options.animation) {
      this.element.classList.add('jev-panel-enter');
      
      // 动画结束后清理
      this.animationTimer = setTimeout(() => {
        this.element.classList.remove('jev-panel-enter');
        this.element.style.opacity = '1';
      }, this.options.animationDuration);
    } else {
      this.element.style.opacity = '1';
    }
    
    this.isVisible = true;
  }
  
  /**
   * 带动画隐藏面板
   * @private
   */
  _hideWithAnimation() {
    if (!this.element) return;
    
    // 清除之前的定时器
    if (this.animationTimer) {
      clearTimeout(this.animationTimer);
    }
    
    // 应用动画
    if (this.options.animation) {
      this.element.classList.add('jev-panel-exit');
      
      // 动画结束后隐藏
      this.animationTimer = setTimeout(() => {
        this.element.classList.remove('jev-panel-exit');
        this.element.style.display = 'none';
        this.isVisible = false;
      }, this.options.animationDuration);
    } else {
      this.element.style.display = 'none';
      this.isVisible = false;
    }
  }

  /**
   * 更新折叠状态
   * @private
   */
  _updateCollapseState() {
    if (!this.element) return;
    
    this.collapsed = this.state.collapsed;
    
    if (this.collapsed) {
      // 保存原始高度
      this.originalHeight = this.element.style.height;
      
      // 保存内容和底部高度用于动画
      const contentHeight = this.contentElement ? this.contentElement.offsetHeight : 0;
      const footerHeight = this.footerElement ? this.footerElement.offsetHeight : 0;
      const headerHeight = this.headerElement ? this.headerElement.offsetHeight : 0;
      
      // 设置动画
      if (this.options.animation) {
        this.element.style.transition = `height ${this.options.animationDuration}ms ease`;
        this.element.style.height = `${headerHeight + contentHeight + footerHeight}px`;
        
        // 强制重排
        this.element.offsetHeight;
        
        // 折叠动画
        setTimeout(() => {
          this.element.style.height = `${headerHeight}px`;
          
          // 动画结束后添加折叠类
          setTimeout(() => {
            this.element.classList.add('jev-panel-collapsed');
            this.element.style.transition = '';
          }, this.options.animationDuration);
        }, 10);
      } else {
        this.element.classList.add('jev-panel-collapsed');
      }
      
      // 触发折叠回调
      if (typeof this.options.onCollapse === 'function') {
        try {
          this.options.onCollapse(this);
        } catch (error) {
          logger.error('面板折叠事件处理失败', error);
        }
      }
    } else {
      // 移除折叠类
      this.element.classList.remove('jev-panel-collapsed');
      
      // 保存头部高度
      const headerHeight = this.headerElement ? this.headerElement.offsetHeight : 0;
      
      // 计算内容和底部高度
      const contentHeight = this.contentElement ? this.contentElement.offsetHeight : 0;
      const footerHeight = this.footerElement ? this.footerElement.offsetHeight : 0;
      
      // 设置动画
      if (this.options.animation) {
        this.element.style.height = `${headerHeight}px`;
        this.element.style.transition = `height ${this.options.animationDuration}ms ease`;
        
        // 强制重排
        this.element.offsetHeight;
        
        // 展开动画
        setTimeout(() => {
          this.element.style.height = this.originalHeight || `${headerHeight + contentHeight + footerHeight}px`;
          
          // 动画结束后清理
          setTimeout(() => {
            this.element.style.transition = '';
          }, this.options.animationDuration);
        }, 10);
      } else {
        // 恢复原始高度
        if (this.originalHeight) {
          this.element.style.height = this.originalHeight;
        }
      }
      
      // 触发展开回调
      if (typeof this.options.onExpand === 'function') {
        try {
          this.options.onExpand(this);
        } catch (error) {
          logger.error('面板展开事件处理失败', error);
        }
      }
    }
  }

  /**
   * 设置标题
   * @param {string} title - 标题
   */
  setTitle(title) {
    return this.updateState({ title });
  }

  /**
   * 设置内容
   * @param {string|HTMLElement} content - 内容
   */
  setContent(content) {
    return this.updateState({ content });
  }

  /**
   * 获取内容元素
   */
  getContentElement() {
    return this.contentElement;
  }

  /**
   * 切换折叠状态
   */
  toggleCollapse() {
    return this.updateState({ collapsed: !this.state.collapsed });
  }

  /**
   * 折叠面板
   */
  collapse() {
    return this.updateState({ collapsed: true });
  }

  /**
   * 展开面板
   */
  expand() {
    return this.updateState({ collapsed: false });
  }

  /**
   * 添加按钮到底部
   * @param {string} key - 按钮键
   * @param {Object} options - 按钮配置
   * @returns {Panel} 面板实例（支持链式调用）
   */
  addButton(key, options) {
    if (!this.footerElement) return this;
    
    // 确保按钮主题与面板主题一致
    if (!options.theme) {
      options.theme = this.options.theme;
    }
    
    const button = new Button(options);
    this.buttons[key] = button;
    
    // 初始化并添加到底部
    button.initialize().then(() => {
      this.footerElement.appendChild(button.element);
    });
    
    return this;
  }
  
  /**
   * 批量添加按钮
   * @param {Object} buttons - 按钮配置对象 {key: options}
   * @returns {Panel} 面板实例
   */
  addButtons(buttons) {
    Object.entries(buttons).forEach(([key, options]) => {
      this.addButton(key, options);
    });
    return this;
  }
  
  /**
   * 移除按钮
   * @param {string} key - 按钮键
   * @returns {Panel} 面板实例
   */
  removeButton(key) {
    const button = this.buttons[key];
    if (button && button.element && this.footerElement) {
      this.footerElement.removeChild(button.element);
      button.destroy();
      delete this.buttons[key];
    }
    return this;
  }
  
  /**
   * 清空所有按钮
   * @returns {Panel} 面板实例
   */
  clearButtons() {
    Object.keys(this.buttons).forEach(key => {
      this.removeButton(key);
    });
    return this;
  }

  /**
   * 获取按钮实例
   * @param {string} key - 按钮键
   */
  getButton(key) {
    return this.buttons[key];
  }

  /**
   * 关闭面板
   */
  close() {
    this.hide();
    
    // 触发关闭回调
    if (typeof this.options.onClose === 'function') {
      try {
        this.options.onClose(this);
      } catch (error) {
        logger.error('面板关闭事件处理失败', error);
      }
    }
    
    return this;
  }

  /**
   * 资源释放与清理
   */
  async destroy() {
    try {
      // 清除动画定时器
      if (this.animationTimer) {
        clearTimeout(this.animationTimer);
        this.animationTimer = null;
      }
      
      // 清理事件
      this._unbindEvents();
      
      // 清空按钮
      this.clearButtons();
      
      // 卸载组件
      await this.unmount();
      
      // 重置引用
      this.headerElement = null;
      this.titleElement = null;
      this.contentElement = null;
      this.footerElement = null;
      this.closeButton = null;
      this.collapseButton = null;
      this.resizeHandle = null;
      this.buttons = {};
      
    } catch (error) {
      logger.error('面板销毁失败', error);
    }
  }
  
  /**
   * 设置面板主题
   * @param {string} theme - 主题名称
   */
  setTheme(theme) {
    if (!this.element) return this;
    
    // 移除旧主题类
    this.element.classList.remove(`jev-panel-${this.options.theme}`);
    
    // 设置新主题
    this.options.theme = theme;
    this.element.classList.add(`jev-panel-${theme}`);
    
    // 更新按钮主题
    Object.values(this.buttons).forEach(button => {
      if (button.setTheme) {
        button.setTheme(theme);
      }
    });
    
    return this;
  }
  
  /**
   * 居中显示面板
   * @returns {Panel} 面板实例
   */
  center() {
    if (!this.element) return this;
    
    const updateCenter = () => {
      const rect = this.element.getBoundingClientRect();
      const left = (window.innerWidth - rect.width) / 2;
      const top = (window.innerHeight - rect.height) / 2;
      
      this.element.style.left = `${Math.max(0, left)}px`;
      this.element.style.top = `${Math.max(0, top)}px`;
      this.element.style.right = 'auto';
      this.element.style.bottom = 'auto';
    };
    
    // 立即更新
    updateCenter();
    
    // 监听窗口大小变化
    window.addEventListener('resize', updateCenter);
    
    // 保存引用以便销毁时清理
    this._centerListener = updateCenter;
    
    return this;
  }
  
  /**
   * 最大化面板
   * @returns {Panel} 面板实例
   */
  maximize() {
    if (!this.element) return this;
    
    // 保存当前状态
    this._normalState = {
      width: this.element.style.width,
      height: this.element.style.height,
      left: this.element.style.left,
      top: this.element.style.top,
      right: this.element.style.right,
      bottom: this.element.style.bottom
    };
    
    // 设置为全屏
    this.element.style.width = '100%';
    this.element.style.height = '100%';
    this.element.style.left = '0';
    this.element.style.top = '0';
    this.element.style.right = '0';
    this.element.style.bottom = '0';
    
    return this;
  }
  
  /**
   * 恢复面板到正常大小
   * @returns {Panel} 面板实例
   */
  restore() {
    if (!this.element || !this._normalState) return this;
    
    // 恢复到之前的状态
    Object.entries(this._normalState).forEach(([key, value]) => {
      this.element.style[key] = value;
    });
    
    this._normalState = null;
    return this;
  }
  
  /**
   * 检查是否已最大化
   * @returns {boolean} 是否最大化
   */
  isMaximized() {
    return !!this._normalState;
  }
  
  /**
   * 切换最大化/恢复状态
   * @returns {Panel} 面板实例
   */
  toggleMaximize() {
    return this.isMaximized() ? this.restore() : this.maximize();
  }
  
  /**
   * 设置面板尺寸限制
   * @param {Object} limits - 限制对象 {minWidth, minHeight, maxWidth, maxHeight}
   * @returns {Panel} 面板实例
   */
  setSizeLimits(limits) {
    if (!this.element) return this;
    
    if (limits.minWidth !== undefined) {
      this.minSize.width = limits.minWidth;
      this.element.style.minWidth = `${limits.minWidth}px`;
    }
    
    if (limits.minHeight !== undefined) {
      this.minSize.height = limits.minHeight;
      this.element.style.minHeight = `${limits.minHeight}px`;
    }
    
    if (limits.maxWidth !== undefined) {
      this.element.style.maxWidth = `${limits.maxWidth}px`;
    }
    
    if (limits.maxHeight !== undefined) {
      this.element.style.maxHeight = `${limits.maxHeight}px`;
    }
    
    return this;
  }
  
  /**
   * 禁用/启用拖拽
   * @param {boolean} draggable - 是否可拖拽
   * @returns {Panel} 面板实例
   */
  setDraggable(draggable) {
    if (!this.headerElement || !this.element) return this;
    
    this.options.draggable = draggable;
    
    // 清理旧的拖拽事件
    if (this._dragHandlers) {
      this._unbindEvents();
    }
    
    // 重新初始化拖拽
    if (draggable) {
      this._initDraggable();
    }
    
    return this;
  }
  
  /**
   * 禁用/启用调整大小
   * @param {boolean} resizable - 是否可调整大小
   * @returns {Panel} 面板实例
   */
  setResizable(resizable) {
    this.options.resizable = resizable;
    
    // 清理旧的调整大小事件
    if (this._resizeHandlers) {
      this._unbindEvents();
    }
    
    // 添加或移除调整大小句柄
    if (resizable && !this.resizeHandle && this.element) {
      this._createResizeHandle(this.element);
      this._initResizable();
    } else if (!resizable && this.resizeHandle) {
      if (this.element) {
        this.element.removeChild(this.resizeHandle);
      }
      this.resizeHandle = null;
    }
    
    return this;
  }
}

export default Panel;