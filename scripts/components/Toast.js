/**
 * Toast提示框组件
 * 提供轻量级的消息提示功能，支持多种类型和动画效果
 */
import BaseComponent from './base-component.js';
import logger from '../utils/logger.js';

class Toast extends BaseComponent {
  /**
   * 构造函数
   * @param {Object} options - 配置选项
   */
  constructor(options = {}) {
    super(options);
    
    // 组件元素引用
    this.containerElement = null;
    this.contentElement = null;
    this.iconElement = null;
    this.closeButton = null;
    
    // 状态管理
    this.isVisible = false;
    this.isAnimating = false;
    
    // 定时器
    this.showTimeout = null;
    this.hideTimeout = null;
    this.animationTimeout = null;
    
    // 静态实例管理
    if (!Toast.container) {
      Toast._createContainer();
    }
    
    // 实例ID
    this.id = `jev-toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 静态容器
   */
  static container = null;
  static toasts = new Map();
  static counter = 0;

  /**
   * 创建静态容器
   * @private
   */
  static _createContainer() {
    // 创建容器
    const container = document.createElement('div');
    container.className = 'jev-toast-container';
    container.setAttribute('aria-live', 'polite');
    container.setAttribute('role', 'alert');
    document.body.appendChild(container);
    
    Toast.container = container;
    
    // 添加全局样式
    Toast._addGlobalStyles();
  }

  /**
   * 添加全局样式
   * @private
   */
  static _addGlobalStyles() {
    const styleId = 'jev-toast-styles';
    if (document.getElementById(styleId)) {
      return;
    }
    
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      /* Toast容器样式 */
      .jev-toast-container {
        position: fixed;
        z-index: 9999;
        pointer-events: none;
        max-width: 350px;
      }
      
      /* 位置样式 */
      .jev-toast-container-top-right {
        top: 20px;
        right: 20px;
      }
      
      .jev-toast-container-top-left {
        top: 20px;
        left: 20px;
      }
      
      .jev-toast-container-bottom-right {
        bottom: 20px;
        right: 20px;
      }
      
      .jev-toast-container-bottom-left {
        bottom: 20px;
        left: 20px;
      }
      
      .jev-toast-container-top-center {
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
      }
      
      .jev-toast-container-bottom-center {
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
      }
      
      /* Toast基础样式 */
      .jev-toast {
        position: relative;
        margin-bottom: 12px;
        padding: 12px 16px;
        border-radius: 6px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        display: flex;
        align-items: center;
        gap: 12px;
        min-height: 48px;
        pointer-events: auto;
        opacity: 0;
        transform: translateX(20px);
        transition: all 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
      }
      
      /* Toast可见状态 */
      .jev-toast-visible {
        opacity: 1;
        transform: translateX(0);
      }
      
      /* 左侧位置修正 */
      .jev-toast-container-top-left .jev-toast,
      .jev-toast-container-bottom-left .jev-toast {
        transform: translateX(-20px);
      }
      
      /* 中心位置修正 */
      .jev-toast-container-top-center .jev-toast,
      .jev-toast-container-bottom-center .jev-toast {
        transform: translateY(-20px);
        margin-left: auto;
        margin-right: auto;
      }
      
      .jev-toast-container-top-center .jev-toast-visible,
      .jev-toast-container-bottom-center .jev-toast-visible {
        transform: translateY(0);
      }
      
      /* 图标样式 */
      .jev-toast-icon {
        flex-shrink: 0;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 16px;
      }
      
      /* 内容样式 */
      .jev-toast-content {
        flex: 1;
        min-width: 0;
      }
      
      .jev-toast-title {
        font-weight: 600;
        margin-bottom: 4px;
        color: inherit;
      }
      
      .jev-toast-message {
        font-size: 14px;
        color: inherit;
        opacity: 0.9;
        word-break: break-word;
      }
      
      /* 关闭按钮样式 */
      .jev-toast-close {
        flex-shrink: 0;
        width: 20px;
        height: 20px;
        padding: 0;
        border: none;
        background: none;
        cursor: pointer;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 16px;
        opacity: 0.7;
        transition: all 0.2s ease;
        color: inherit;
      }
      
      .jev-toast-close:hover {
        opacity: 1;
        background-color: rgba(255, 255, 255, 0.1);
      }
      
      /* 进度条样式 */
      .jev-toast-progress {
        position: absolute;
        bottom: 0;
        left: 0;
        height: 2px;
        background-color: rgba(255, 255, 255, 0.3);
        border-radius: 0 0 0 6px;
        transition: width 0.1s linear;
      }
      
      /* 类型样式 - 默认 */
      .jev-toast-default {
        background-color: #343a40;
        color: #fff;
      }
      
      /* 类型样式 - 信息 */
      .jev-toast-info {
        background-color: #17a2b8;
        color: #fff;
      }
      
      /* 类型样式 - 成功 */
      .jev-toast-success {
        background-color: #28a745;
        color: #fff;
      }
      
      /* 类型样式 - 警告 */
      .jev-toast-warning {
        background-color: #ffc107;
        color: #212529;
      }
      
      /* 类型样式 - 错误 */
      .jev-toast-error {
        background-color: #dc3545;
        color: #fff;
      }
      
      /* 类型样式 - 霓虹灯 */
      .jev-toast-neon {
        background-color: #1a1a1a;
        color: #00ff99;
        border: 1px solid #00ff99;
        box-shadow: 0 0 20px rgba(0, 255, 153, 0.3);
      }
      
      /* 主题样式 - 深色 */
      .jev-toast-dark {
        background-color: #2d3748;
        color: #e2e8f0;
      }
      
      /* 动画效果 - 滑动 */
      .jev-toast-animation-slide {
        transition: all 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
      }
      
      /* 动画效果 - 淡入淡出 */
      .jev-toast-animation-fade {
        transition: all 0.3s ease;
      }
      
      /* 动画效果 - 缩放 */
      .jev-toast-animation-scale {
        transform: scale(0.8);
        transition: all 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
      }
      
      .jev-toast-animation-scale.jev-toast-visible {
        transform: scale(1);
      }
      
      /* 响应式设计 */
      @media (max-width: 768px) {
        .jev-toast-container {
          max-width: 90%;
          width: 90%;
        }
        
        .jev-toast-container-top-right,
        .jev-toast-container-top-left,
        .jev-toast-container-bottom-right,
        .jev-toast-container-bottom-left {
          left: 50%;
          transform: translateX(-50%);
        }
        
        .jev-toast {
          padding: 10px 14px;
          min-height: 40px;
        }
        
        .jev-toast-icon {
          width: 20px;
          height: 20px;
          font-size: 14px;
        }
        
        .jev-toast-message {
          font-size: 13px;
        }
      }
    `;
    
    document.head.appendChild(style);
  }

  /**
   * 获取默认配置
   * @private
   */
  _getDefaultOptions() {
    return {
      ...super._getDefaultOptions(),
      message: '',
      title: '',
      type: 'default', // default, info, success, warning, error, neon
      theme: 'default', // default, dark
      position: 'top-right', // top-right, top-left, bottom-right, bottom-left, top-center, bottom-center
      duration: 3000,
      showProgress: true,
      showCloseButton: true,
      animation: 'slide', // slide, fade, scale
      autoClose: true,
      pauseOnHover: true,
      maxWidth: 350,
      onShow: null,
      onHide: null,
      onClick: null,
      onClose: null,
      icon: null
    };
  }

  /**
   * 获取初始状态
   * @private
   */
  _getInitialState() {
    return {
      ...super._getInitialState(),
      message: this.options.message,
      title: this.options.title,
      isVisible: false
    };
  }

  /**
   * 创建DOM元素
   * @private
   */
  _createElement() {
    // 创建toast元素
    this.element = document.createElement('div');
    this.element.className = `jev-toast jev-toast-${this.options.type} jev-toast-${this.options.theme} jev-toast-animation-${this.options.animation}`;
    this.element.style.maxWidth = `${this.options.maxWidth}px`;
    this.element.setAttribute('id', this.id);
    
    // 创建图标元素
    this.iconElement = document.createElement('div');
    this.iconElement.className = 'jev-toast-icon';
    this._setIcon();
    
    // 创建内容元素
    this.contentElement = document.createElement('div');
    this.contentElement.className = 'jev-toast-content';
    
    // 创建标题元素
    if (this.options.title) {
      const titleElement = document.createElement('div');
      titleElement.className = 'jev-toast-title';
      titleElement.textContent = this.options.title;
      this.contentElement.appendChild(titleElement);
    }
    
    // 创建消息元素
    const messageElement = document.createElement('div');
    messageElement.className = 'jev-toast-message';
    messageElement.textContent = this.options.message;
    this.contentElement.appendChild(messageElement);
    
    // 创建关闭按钮
    if (this.options.showCloseButton) {
      this.closeButton = document.createElement('button');
      this.closeButton.className = 'jev-toast-close';
      this.closeButton.innerHTML = '&times;';
      this.closeButton.setAttribute('aria-label', 'Close notification');
      this.closeButton.addEventListener('click', () => this.close());
    }
    
    // 创建进度条
    if (this.options.showProgress && this.options.autoClose) {
      const progressElement = document.createElement('div');
      progressElement.className = 'jev-toast-progress';
      progressElement.style.width = '100%';
      this.element.appendChild(progressElement);
    }
    
    // 组装组件
    this.element.appendChild(this.iconElement);
    this.element.appendChild(this.contentElement);
    if (this.closeButton) {
      this.element.appendChild(this.closeButton);
    }
    
    // 绑定点击事件
    this.element.addEventListener('click', (e) => {
      // 忽略关闭按钮的点击事件
      if (e.target === this.closeButton || this.closeButton?.contains(e.target)) {
        return;
      }
      
      if (typeof this.options.onClick === 'function') {
        try {
          this.options.onClick(this);
        } catch (error) {
          logger.error('Toast点击回调执行失败', error);
        }
      }
    });
    
    // 绑定悬停事件（暂停/恢复自动关闭）
    if (this.options.pauseOnHover && this.options.autoClose) {
      this.element.addEventListener('mouseenter', () => this._pauseAutoClose());
      this.element.addEventListener('mouseleave', () => this._resumeAutoClose());
    }
  }

  /**
   * 设置图标
   * @private
   */
  _setIcon() {
    if (this.options.icon) {
      // 使用自定义图标
      if (typeof this.options.icon === 'string') {
        this.iconElement.innerHTML = this.options.icon;
      } else if (this.options.icon instanceof HTMLElement) {
        this.iconElement.innerHTML = '';
        this.iconElement.appendChild(this.options.icon);
      }
      return;
    }
    
    // 使用内置图标
    const icons = {
      default: 'ℹ',
      info: 'ℹ',
      success: '✓',
      warning: '⚠',
      error: '✕',
      neon: '✨'
    };
    
    this.iconElement.textContent = icons[this.options.type] || 'ℹ';
  }

  /**
   * 应用样式
   * @private
   */
  _applyStyles() {
    // 更新容器位置
    Toast.container.className = `jev-toast-container jev-toast-container-${this.options.position}`;
    
    // 添加到容器
    Toast.container.appendChild(this.element);
    
    // 存储实例引用
    Toast.toasts.set(this.id, this);
    Toast.counter++;
  }

  /**
   * 显示Toast
   */
  show() {
    if (this.isVisible || this.isAnimating) {
      return this;
    }
    
    this.isAnimating = true;
    
    // 延迟显示以触发动画
    this.showTimeout = setTimeout(() => {
      this.element.classList.add('jev-toast-visible');
      
      // 等待动画完成
      this.animationTimeout = setTimeout(() => {
        this.isVisible = true;
        this.isAnimating = false;
        this.updateState({ isVisible: true });
        
        // 触发显示回调
        if (typeof this.options.onShow === 'function') {
          try {
            this.options.onShow(this);
          } catch (error) {
            logger.error('Toast显示回调执行失败', error);
          }
        }
        
        // 启动自动关闭
        if (this.options.autoClose) {
          this._startAutoClose();
        }
        
        this.animationTimeout = null;
      }, 300);
      
      this.showTimeout = null;
    }, 10);
    
    return this;
  }

  /**
   * 隐藏Toast
   */
  hide() {
    if (!this.isVisible || this.isAnimating) {
      return this;
    }
    
    this.isAnimating = true;
    
    // 移除可见类以触发隐藏动画
    this.element.classList.remove('jev-toast-visible');
    
    // 等待动画完成
    this.animationTimeout = setTimeout(() => {
      // 移除DOM元素
      this.element.remove();
      
      // 清理实例引用
      Toast.toasts.delete(this.id);
      Toast.counter--;
      
      this.isVisible = false;
      this.isAnimating = false;
      this.updateState({ isVisible: false });
      
      // 触发隐藏回调
      if (typeof this.options.onHide === 'function') {
        try {
          this.options.onHide(this);
        } catch (error) {
          logger.error('Toast隐藏回调执行失败', error);
        }
      }
      
      // 触发关闭回调
      if (typeof this.options.onClose === 'function') {
        try {
          this.options.onClose(this);
        } catch (error) {
          logger.error('Toast关闭回调执行失败', error);
        }
      }
      
      this.animationTimeout = null;
    }, 300);
    
    return this;
  }

  /**
   * 关闭Toast（等同hide）
   */
  close() {
    return this.hide();
  }

  /**
   * 启动自动关闭
   * @private
   */
  _startAutoClose() {
    this._remainingTime = this.options.duration;
    this._startTime = Date.now();
    
    // 启动进度条动画
    if (this.options.showProgress) {
      this._updateProgress();
      this._progressInterval = setInterval(() => this._updateProgress(), 10);
    }
    
    // 设置隐藏定时器
    this.hideTimeout = setTimeout(() => {
      this.hide();
    }, this.options.duration);
  }

  /**
   * 暂停自动关闭
   * @private
   */
  _pauseAutoClose() {
    if (this.hideTimeout) {
      clearTimeout(this.hideTimeout);
      this.hideTimeout = null;
    }
    
    if (this._progressInterval) {
      clearInterval(this._progressInterval);
      this._progressInterval = null;
      this._pausedTime = Date.now();
      this._remainingTime -= (this._pausedTime - this._startTime);
    }
  }

  /**
   * 恢复自动关闭
   * @private
   */
  _resumeAutoClose() {
    if (this._remainingTime > 0) {
      this._startTime = Date.now();
      
      // 重新启动进度条动画
      if (this.options.showProgress) {
        this._progressInterval = setInterval(() => this._updateProgress(), 10);
      }
      
      // 重新设置隐藏定时器
      this.hideTimeout = setTimeout(() => {
        this.hide();
      }, this._remainingTime);
    }
  }

  /**
   * 更新进度条
   * @private
   */
  _updateProgress() {
    const progressElement = this.element.querySelector('.jev-toast-progress');
    if (!progressElement) {
      return;
    }
    
    const elapsedTime = Date.now() - this._startTime;
    const progress = Math.max(0, 100 - (elapsedTime / this._remainingTime) * 100);
    
    progressElement.style.width = `${progress}%`;
  }

  /**
   * 更新消息内容
   * @param {string} message - 新消息
   * @returns {Toast} 组件实例
   */
  setMessage(message) {
    this.options.message = message;
    this.updateState({ message });
    
    const messageElement = this.contentElement.querySelector('.jev-toast-message');
    if (messageElement) {
      messageElement.textContent = message;
    }
    
    return this;
  }

  /**
   * 更新标题
   * @param {string} title - 新标题
   * @returns {Toast} 组件实例
   */
  setTitle(title) {
    this.options.title = title;
    this.updateState({ title });
    
    let titleElement = this.contentElement.querySelector('.jev-toast-title');
    
    if (title) {
      if (!titleElement) {
        titleElement = document.createElement('div');
        titleElement.className = 'jev-toast-title';
        const messageElement = this.contentElement.querySelector('.jev-toast-message');
        this.contentElement.insertBefore(titleElement, messageElement);
      }
      titleElement.textContent = title;
    } else if (titleElement) {
      titleElement.remove();
    }
    
    return this;
  }

  /**
   * 设置类型
   * @param {string} type - 新类型
   * @returns {Toast} 组件实例
   */
  setType(type) {
    // 移除旧类型类
    ['default', 'info', 'success', 'warning', 'error', 'neon'].forEach(t => {
      this.element.classList.remove(`jev-toast-${t}`);
    });
    
    // 添加新类型类
    this.options.type = type;
    this.element.classList.add(`jev-toast-${type}`);
    
    // 更新图标
    this._setIcon();
    
    return this;
  }

  /**
   * 资源释放与清理
   */
  async destroy() {
    try {
      // 清理定时器
      if (this.showTimeout) {
        clearTimeout(this.showTimeout);
        this.showTimeout = null;
      }
      
      if (this.hideTimeout) {
        clearTimeout(this.hideTimeout);
        this.hideTimeout = null;
      }
      
      if (this.animationTimeout) {
        clearTimeout(this.animationTimeout);
        this.animationTimeout = null;
      }
      
      if (this._progressInterval) {
        clearInterval(this._progressInterval);
        this._progressInterval = null;
      }
      
      // 移除DOM元素
      if (this.element && this.element.parentNode) {
        this.element.remove();
      }
      
      // 清理实例引用
      Toast.toasts.delete(this.id);
      Toast.counter--;
      
      // 如果没有toast了，可以考虑清理容器
      if (Toast.counter === 0 && Toast.container) {
        // 保留容器，以备后用
        // Toast.container.remove();
        // Toast.container = null;
      }
      
      this.isVisible = false;
      this.isAnimating = false;
      
    } catch (error) {
      logger.error('Toast组件销毁失败', error);
    }
  }

  /**
   * 静态方法：显示Toast
   * @param {Object|string} options - 配置选项或消息文本
   * @returns {Toast} Toast实例
   */
  static show(options) {
    // 支持字符串参数
    if (typeof options === 'string') {
      options = { message: options };
    }
    
    // 创建并显示Toast
    const toast = new Toast(options);
    toast.show();
    
    return toast;
  }

  /**
   * 静态方法：显示信息Toast
   * @param {Object|string} options - 配置选项或消息文本
   * @returns {Toast} Toast实例
   */
  static info(options) {
    if (typeof options === 'string') {
      options = { message: options };
    }
    return Toast.show({ ...options, type: 'info' });
  }

  /**
   * 静态方法：显示成功Toast
   * @param {Object|string} options - 配置选项或消息文本
   * @returns {Toast} Toast实例
   */
  static success(options) {
    if (typeof options === 'string') {
      options = { message: options };
    }
    return Toast.show({ ...options, type: 'success' });
  }

  /**
   * 静态方法：显示警告Toast
   * @param {Object|string} options - 配置选项或消息文本
   * @returns {Toast} Toast实例
   */
  static warning(options) {
    if (typeof options === 'string') {
      options = { message: options };
    }
    return Toast.show({ ...options, type: 'warning' });
  }

  /**
   * 静态方法：显示错误Toast
   * @param {Object|string} options - 配置选项或消息文本
   * @returns {Toast} Toast实例
   */
  static error(options) {
    if (typeof options === 'string') {
      options = { message: options };
    }
    return Toast.show({ ...options, type: 'error' });
  }

  /**
   * 静态方法：显示霓虹灯Toast
   * @param {Object|string} options - 配置选项或消息文本
   * @returns {Toast} Toast实例
   */
  static neon(options) {
    if (typeof options === 'string') {
      options = { message: options };
    }
    return Toast.show({ ...options, type: 'neon' });
  }

  /**
   * 静态方法：关闭所有Toast
   */
  static closeAll() {
    Toast.toasts.forEach((toast) => {
      toast.close();
    });
    
    Toast.toasts.clear();
    Toast.counter = 0;
  }

  /**
   * 静态方法：获取所有活动的Toast
   * @returns {Array} Toast实例数组
   */
  static getActiveToasts() {
    return Array.from(Toast.toasts.values());
  }

  /**
   * 静态方法：获取活动Toast数量
   * @returns {number} Toast数量
   */
  static getActiveCount() {
    return Toast.counter;
  }

  /**
   * 静态方法：设置全局默认配置
   * @param {Object} defaults - 默认配置
   */
  static setDefaults(defaults) {
    Toast.defaultOptions = { ...Toast.defaultOptions, ...defaults };
  }
}

// 静态默认配置
Toast.defaultOptions = {};

export default Toast;