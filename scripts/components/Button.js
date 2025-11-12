/**
 * 按钮组件
 * 提供统一的按钮样式和交互功能
 */
import BaseComponent from './base-component.js';
import logger from '../modular/logger.js';

class Button extends BaseComponent {
  constructor(options = {}) {
    super(options);
    
    // 按钮特有的事件处理函数引用
    this._clickHandler = null;
  }

  /**
   * 获取默认配置
   * @private
   */
  _getDefaultOptions() {
    return {
      ...super._getDefaultOptions(),
      text: '按钮',
      type: 'default', // default, primary, success, warning, danger
      size: 'medium', // small, medium, large
      icon: null,
      iconPosition: 'left', // left, right
      disabled: false,
      loading: false,
      onClick: null
    };
  }

  /**
   * 获取初始状态
   * @private
   */
  _getInitialState() {
    return {
      ...super._getInitialState(),
      text: this.options.text,
      disabled: this.options.disabled,
      loading: this.options.loading
    };
  }

  /**
   * 创建DOM元素
   * @private
   */
  _createElement() {
    const button = document.createElement('button');
    button.type = 'button';
    
    // 设置基础类名
    button.className = `jev-button jev-button-${this.options.type} jev-button-${this.options.size}`;
    
    // 创建图标元素（如果有）
    if (this.options.icon) {
      this._iconElement = this._cacheElement('icon', document.createElement('span'));
      this._iconElement.className = `jev-button-icon jev-button-icon-${this.options.iconPosition}`;
      this._iconElement.innerHTML = this.options.icon;
      button.appendChild(this._iconElement);
    }
    
    // 创建文本元素
    this._textElement = this._cacheElement('text', document.createElement('span'));
    this._textElement.className = 'jev-button-text';
    this._textElement.textContent = this.options.text;
    button.appendChild(this._textElement);
    
    // 创建加载指示器
    this._loadingElement = this._cacheElement('loading', document.createElement('span'));
    this._loadingElement.className = 'jev-button-loading';
    this._loadingElement.innerHTML = '<div class="jev-loading-spinner"></div>';
    this._loadingElement.style.display = 'none';
    button.appendChild(this._loadingElement);
    
    this.element = button;
  }

  /**
   * 应用样式
   * @private
   */
  _applyStyles() {
    super._applyStyles();
    
    // 添加全局按钮样式
    this._addGlobalStyle('jev-button-styles', `
      .jev-button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 8px 16px;
        border: none;
        border-radius: 4px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
        outline: none;
        position: relative;
        gap: 6px;
      }
      
      .jev-button:hover:not(:disabled):not(.jev-component-disabled) {
        opacity: 0.9;
      }
      
      .jev-button:active:not(:disabled):not(.jev-component-disabled) {
        transform: translateY(1px);
      }
      
      .jev-button:disabled,
      .jev-component-disabled.jev-button {
        opacity: 0.6;
        cursor: not-allowed;
        transform: none !important;
      }
      
      .jev-component-loading.jev-button {
        cursor: wait;
      }
      
      /* 按钮类型样式 */
      .jev-button-default {
        background-color: #f0f0f0;
        color: #333;
      }
      
      .jev-button-default:hover:not(:disabled):not(.jev-component-disabled) {
        background-color: #e0e0e0;
      }
      
      .jev-button-primary {
        background-color: #2196f3;
        color: white;
      }
      
      .jev-button-primary:hover:not(:disabled):not(.jev-component-disabled) {
        background-color: #1976d2;
      }
      
      .jev-button-success {
        background-color: #4caf50;
        color: white;
      }
      
      .jev-button-success:hover:not(:disabled):not(.jev-component-disabled) {
        background-color: #45a049;
      }
      
      .jev-button-warning {
        background-color: #ff9800;
        color: white;
      }
      
      .jev-button-warning:hover:not(:disabled):not(.jev-component-disabled) {
        background-color: #e68900;
      }
      
      .jev-button-danger {
        background-color: #f44336;
        color: white;
      }
      
      .jev-button-danger:hover:not(:disabled):not(.jev-component-disabled) {
        background-color: #da190b;
      }
      
      /* 按钮大小样式 */
      .jev-button-small {
        padding: 6px 12px;
        font-size: 12px;
      }
      
      .jev-button-medium {
        padding: 8px 16px;
        font-size: 14px;
      }
      
      .jev-button-large {
        padding: 10px 20px;
        font-size: 16px;
      }
      
      /* 图标样式 */
      .jev-button-icon {
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }
      
      /* 文本样式 */
      .jev-button-text {
        display: inline-block;
      }
      
      /* 加载指示器样式 */
      .jev-button-loading {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      .jev-component-loading .jev-button-loading {
        display: flex;
      }
      
      .jev-component-loading .jev-button-icon,
      .jev-component-loading .jev-button-text {
        visibility: hidden;
      }
      
      /* 加载动画 */
      .jev-loading-spinner {
        width: 16px;
        height: 16px;
        border: 2px solid rgba(255, 255, 255, 0.3);
        border-radius: 50%;
        border-top-color: white;
        animation: jev-spin 1s ease-in-out infinite;
      }
      
      .jev-button-default .jev-loading-spinner {
        border-color: rgba(0, 0, 0, 0.3);
        border-top-color: #333;
      }
      
      @keyframes jev-spin {
        to { transform: rotate(360deg); }
      }
    `);
  }

  /**
   * 绑定事件
   * @private
   */
  _bindEvents() {
    if (!this.element) return;
    
    // 点击事件
    this._clickHandler = (event) => {
      // 如果禁用或加载中，不触发点击事件
      if (this.state.disabled || this.state.loading) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      
      // 触发配置的点击回调
      if (typeof this.options.onClick === 'function') {
        try {
          this.options.onClick(event, this);
        } catch (error) {
          logger.error('按钮点击事件处理失败', error);
        }
      }
      
      // 触发自定义事件
      this._triggerEvent('click', { event });
    };
    
    this.element.addEventListener('click', this._clickHandler);
  }

  /**
   * 解绑事件
   * @private
   */
  _unbindEvents() {
    if (this.element && this._clickHandler) {
      this.element.removeEventListener('click', this._clickHandler);
      this._clickHandler = null;
    }
  }

  /**
   * 更新DOM元素
   * @private
   */
  _updateElement() {
    // 更新文本
    const textElement = this._getCachedElement('text');
    if (textElement && textElement.textContent !== this.state.text) {
      textElement.textContent = this.state.text;
    }
    
    // 更新加载状态
    const loadingElement = this._getCachedElement('loading');
    if (loadingElement) {
      loadingElement.style.display = this.state.loading ? 'flex' : 'none';
    }
    
    // 更新图标和文本的可见性
    const iconElement = this._getCachedElement('icon');
    const textEl = this._getCachedElement('text');
    if (this.state.loading) {
      if (iconElement) iconElement.style.visibility = 'hidden';
      if (textEl) textEl.style.visibility = 'hidden';
    } else {
      if (iconElement) iconElement.style.visibility = 'visible';
      if (textEl) textEl.style.visibility = 'visible';
    }
  }

  /**
   * 设置按钮文本
   * @param {string} text - 按钮文本
   */
  setText(text) {
    return this.updateState({ text });
  }

  /**
   * 设置按钮图标
   * @param {string} icon - 图标HTML或文本
   */
  setIcon(icon) {
    const iconElement = this._getCachedElement('icon');
    if (iconElement) {
      iconElement.innerHTML = icon;
    } else if (icon) {
      // 如果之前没有图标，创建新图标
      this._iconElement = this._cacheElement('icon', document.createElement('span'));
      this._iconElement.className = `jev-button-icon jev-button-icon-${this.options.iconPosition}`;
      this._iconElement.innerHTML = icon;
      
      if (this._textElement && this.element) {
        if (this.options.iconPosition === 'left') {
          this.element.insertBefore(this._iconElement, this._textElement);
        } else {
          this.element.appendChild(this._iconElement);
        }
      }
    }
    
    return this;
  }

  /**
   * 设置点击事件处理器
   * @param {Function} handler - 点击事件处理函数
   */
  onClick(handler) {
    this.options.onClick = handler;
    return this;
  }
}

export default Button;