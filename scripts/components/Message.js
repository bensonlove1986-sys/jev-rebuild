/**
 * Message消息提示组件
 * 用于展示临时的通知、提示、警告和错误信息
 */
import BaseComponent from './base-component.js';
import logger from '../modular/logger.js';

class Message extends BaseComponent {
  constructor(options = {}) {
    super(options);
    
    // 消息元素引用
    this.contentElement = null;
    this.closeButton = null;
    
    // 计时器引用
    this.timer = null;
    
    // 消息状态
    this.visible = false;
  }

  /**
   * 获取默认配置
   * @private
   */
  _getDefaultOptions() {
    return {
      ...super._getDefaultOptions(),
      content: '',
      type: 'info', // info, success, warning, error, loading
      duration: 3000, // 自动关闭时间，0表示不自动关闭
      showClose: true,
      position: 'top-right', // top-left, top-center, top-right, bottom-left, bottom-center, bottom-right
      theme: 'neon', // neon, default, dark
      zIndex: 2000,
      animation: true,
      animationDuration: 300,
      onClose: null,
      onClick: null,
      offset: 20, // 距离边缘的偏移量
      maxWidth: '350px'
    };
  }

  /**
   * 获取初始状态
   * @private
   */
  _getInitialState() {
    return {
      ...super._getInitialState(),
      content: this.options.content,
      visible: false,
      type: this.options.type
    };
  }

  /**
   * 创建DOM元素
   * @private
   */
  _createElement() {
    // 创建消息容器
    const messageContainer = document.createElement('div');
    messageContainer.className = `jev-message jev-message-${this.options.type} jev-message-${this.options.theme}`;
    
    // 添加动画类
    if (this.options.animation) {
      messageContainer.classList.add('jev-message-animated');
    }
    
    // 创建内容元素
    this.contentElement = document.createElement('div');
    this.contentElement.className = 'jev-message-content';
    
    // 设置内容
    if (typeof this.options.content === 'string') {
      this.contentElement.innerHTML = this.options.content;
    } else if (this.options.content instanceof HTMLElement) {
      this.contentElement.appendChild(this.options.content);
    }
    
    // 创建关闭按钮
    if (this.options.showClose) {
      this.closeButton = document.createElement('button');
      this.closeButton.className = 'jev-message-close';
      this.closeButton.innerHTML = '&times;';
      this.closeButton.title = '关闭';
    }
    
    // 组装消息
    messageContainer.appendChild(this.contentElement);
    if (this.closeButton) {
      messageContainer.appendChild(this.closeButton);
    }
    
    this.element = messageContainer;
  }

  /**
   * 应用样式
   * @private
   */
  _applyStyles() {
    if (!this.element) return;
    
    // 获取主题颜色
    const colors = this._getTypeColors();
    
    // 设置基础样式
    const styles = {
      position: 'fixed',
      zIndex: this.options.zIndex,
      padding: '12px 16px',
      borderRadius: '4px',
      backgroundColor: colors.background,
      border: `1px solid ${colors.border}`,
      boxShadow: colors.boxShadow,
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      maxWidth: this.options.maxWidth,
      fontSize: '14px',
      lineHeight: '1.5',
      color: colors.text,
      opacity: '0',
      pointerEvents: 'none',
      transition: this.options.animation ? `all ${this.options.animationDuration}ms ease` : 'none'
    };
    
    // 应用位置样式
    this._applyPositionStyle(styles);
    
    // 应用样式到元素
    Object.entries(styles).forEach(([key, value]) => {
      this.element.style[key] = value;
    });
    
    // 添加全局样式
    this._addGlobalStyle('jev-message-styles', `
      /* 消息基础样式 */
      .jev-message {
        pointer-events: all;
        cursor: default;
        user-select: none;
        white-space: normal;
        word-wrap: break-word;
      }
      
      /* 动画样式 */
      .jev-message-animated {
        animation-fill-mode: both;
        animation-duration: ${this.options.animationDuration}ms;
      }
      
      /* 进入动画 */
      @keyframes jevMessageEnter {
        from {
          opacity: 0;
          transform: translateY(10px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      
      /* 退出动画 */
      @keyframes jevMessageExit {
        from {
          opacity: 1;
          transform: translateY(0);
        }
        to {
          opacity: 0;
          transform: translateY(-10px);
        }
      }
      
      /* 消息内容 */
      .jev-message-content {
        flex: 1;
        min-width: 0;
      }
      
      /* 关闭按钮 */
      .jev-message-close {
        background: none;
        border: none;
        color: inherit;
        font-size: 18px;
        line-height: 1;
        cursor: pointer;
        padding: 0;
        margin: 0;
        width: 20px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 4px;
        transition: background-color 0.2s ease;
        flex-shrink: 0;
      }
      
      .jev-message-close:hover {
        background-color: rgba(255, 255, 255, 0.1);
      }
      
      /* 主题样式 */
      .jev-message-neon {
        font-family: 'Courier New', monospace;
      }
      
      .jev-message-default {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }
      
      .jev-message-dark {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }
      
      /* 加载动画 */
      .jev-message-loading::before {
        content: '';
        display: inline-block;
        width: 16px;
        height: 16px;
        border: 2px solid rgba(255, 255, 255, 0.3);
        border-radius: 50%;
        border-top-color: #fff;
        animation: jevMessageSpin 0.8s linear infinite;
        margin-right: 8px;
      }
      
      @keyframes jevMessageSpin {
        to {
          transform: rotate(360deg);
        }
      }
      
      /* 交互效果 */
      .jev-message:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2);
      }
      
      /* 消息队列间距 */
      .jev-message + .jev-message {
        margin-top: 12px;
      }
    `);
  }

  /**
   * 获取消息类型对应的颜色
   * @private
   */
  _getTypeColors() {
    const themes = {
      neon: {
        info: {
          background: 'rgba(0, 255, 153, 0.1)',
          border: '#00ff99',
          text: '#00ff99',
          boxShadow: '0 0 10px rgba(0, 255, 153, 0.3)'
        },
        success: {
          background: 'rgba(0, 255, 153, 0.15)',
          border: '#00cc66',
          text: '#00cc66',
          boxShadow: '0 0 10px rgba(0, 255, 153, 0.4)'
        },
        warning: {
          background: 'rgba(255, 204, 0, 0.15)',
          border: '#ffcc00',
          text: '#ffcc00',
          boxShadow: '0 0 10px rgba(255, 204, 0, 0.4)'
        },
        error: {
          background: 'rgba(255, 0, 64, 0.15)',
          border: '#ff0040',
          text: '#ff0040',
          boxShadow: '0 0 10px rgba(255, 0, 64, 0.4)'
        },
        loading: {
          background: 'rgba(0, 255, 153, 0.1)',
          border: '#00ff99',
          text: '#00ff99',
          boxShadow: '0 0 10px rgba(0, 255, 153, 0.3)'
        }
      },
      default: {
        info: {
          background: '#f0f9ff',
          border: '#91d5ff',
          text: '#1890ff',
          boxShadow: '0 2px 8px rgba(24, 144, 255, 0.2)'
        },
        success: {
          background: '#f6ffed',
          border: '#b7eb8f',
          text: '#52c41a',
          boxShadow: '0 2px 8px rgba(82, 196, 26, 0.2)'
        },
        warning: {
          background: '#fff7e6',
          border: '#ffd591',
          text: '#faad14',
          boxShadow: '0 2px 8px rgba(250, 173, 20, 0.2)'
        },
        error: {
          background: '#fff2f0',
          border: '#ffccc7',
          text: '#ff4d4f',
          boxShadow: '0 2px 8px rgba(255, 77, 79, 0.2)'
        },
        loading: {
          background: '#f0f9ff',
          border: '#91d5ff',
          text: '#1890ff',
          boxShadow: '0 2px 8px rgba(24, 144, 255, 0.2)'
        }
      },
      dark: {
        info: {
          background: 'rgba(24, 144, 255, 0.1)',
          border: 'rgba(24, 144, 255, 0.3)',
          text: '#91d5ff',
          boxShadow: '0 2px 8px rgba(24, 144, 255, 0.2)'
        },
        success: {
          background: 'rgba(82, 196, 26, 0.1)',
          border: 'rgba(82, 196, 26, 0.3)',
          text: '#b7eb8f',
          boxShadow: '0 2px 8px rgba(82, 196, 26, 0.2)'
        },
        warning: {
          background: 'rgba(250, 173, 20, 0.1)',
          border: 'rgba(250, 173, 20, 0.3)',
          text: '#ffd591',
          boxShadow: '0 2px 8px rgba(250, 173, 20, 0.2)'
        },
        error: {
          background: 'rgba(255, 77, 79, 0.1)',
          border: 'rgba(255, 77, 79, 0.3)',
          text: '#ffccc7',
          boxShadow: '0 2px 8px rgba(255, 77, 79, 0.2)'
        },
        loading: {
          background: 'rgba(24, 144, 255, 0.1)',
          border: 'rgba(24, 144, 255, 0.3)',
          text: '#91d5ff',
          boxShadow: '0 2px 8px rgba(24, 144, 255, 0.2)'
        }
      }
    };
    
    const theme = themes[this.options.theme] || themes.neon;
    return theme[this.options.type] || theme.info;
  }

  /**
   * 应用位置样式
   * @private
   */
  _applyPositionStyle(styles) {
    const offset = this.options.offset;
    
    switch (this.options.position) {
      case 'top-left':
        styles.top = `${offset}px`;
        styles.left = `${offset}px`;
        styles.right = 'auto';
        styles.bottom = 'auto';
        break;
      case 'top-center':
        styles.top = `${offset}px`;
        styles.left = '50%';
        styles.right = 'auto';
        styles.bottom = 'auto';
        styles.transform = 'translateX(-50%)';
        break;
      case 'top-right':
        styles.top = `${offset}px`;
        styles.right = `${offset}px`;
        styles.left = 'auto';
        styles.bottom = 'auto';
        break;
      case 'bottom-left':
        styles.bottom = `${offset}px`;
        styles.left = `${offset}px`;
        styles.right = 'auto';
        styles.top = 'auto';
        break;
      case 'bottom-center':
        styles.bottom = `${offset}px`;
        styles.left = '50%';
        styles.right = 'auto';
        styles.top = 'auto';
        styles.transform = 'translateX(-50%)';
        break;
      case 'bottom-right':
        styles.bottom = `${offset}px`;
        styles.right = `${offset}px`;
        styles.left = 'auto';
        styles.top = 'auto';
        break;
      default:
        styles.top = `${offset}px`;
        styles.right = `${offset}px`;
        styles.left = 'auto';
        styles.bottom = 'auto';
    }
  }

  /**
   * 绑定事件
   * @private
   */
  _bindEvents() {
    // 关闭按钮事件
    if (this.closeButton) {
      this.closeButton.addEventListener('click', () => {
        this.close();
      });
    }
    
    // 点击消息事件
    if (this.options.onClick) {
      this.element.addEventListener('click', (event) => {
        // 忽略关闭按钮的点击
        if (!event.target.closest('.jev-message-close')) {
          try {
            this.options.onClick(this);
          } catch (error) {
            logger.error('消息点击事件处理失败', error);
          }
        }
      });
    }
  }

  /**
   * 解绑事件
   * @private
   */
  _unbindEvents() {
    // 清理事件监听
    if (this.closeButton) {
      this.closeButton.removeEventListener('click', () => this.close());
    }
    
    if (this.options.onClick && this.element) {
      this.element.removeEventListener('click', () => {});
    }
    
    // 清理定时器
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  /**
   * 更新DOM元素
   * @private
   */
  _updateElement() {
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
    
    // 更新类型
    if (this.state.type !== this.options.type && this.element) {
      // 移除旧类型类
      this.element.classList.remove(`jev-message-${this.options.type}`);
      
      // 添加新类型类
      this.element.classList.add(`jev-message-${this.state.type}`);
      
      // 更新颜色
      this.options.type = this.state.type;
      const colors = this._getTypeColors();
      this.element.style.backgroundColor = colors.background;
      this.element.style.borderColor = colors.border;
      this.element.style.color = colors.text;
      this.element.style.boxShadow = colors.boxShadow;
    }
    
    // 更新可见性
    if (this.state.visible !== this.visible) {
      this.visible = this.state.visible;
      
      if (this.visible) {
        this._show();
      } else {
        this._hide();
      }
    }
  }

  /**
   * 显示消息
   * @private
   */
  _show() {
    if (!this.element) return;
    
    // 添加到文档
    if (!document.body.contains(this.element)) {
      document.body.appendChild(this.element);
    }
    
    // 应用进入动画
    if (this.options.animation) {
      this.element.style.opacity = '1';
      this.element.style.transform = this.options.position.includes('bottom') ? 'translateY(0)' : 'translateY(0)';
      this.element.style.animationName = 'jevMessageEnter';
    } else {
      this.element.style.opacity = '1';
    }
    
    // 设置自动关闭
    if (this.options.duration > 0) {
      this.timer = setTimeout(() => {
        this.close();
      }, this.options.duration);
    }
  }

  /**
   * 隐藏消息
   * @private
   */
  _hide() {
    if (!this.element) return;
    
    // 清理定时器
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    
    // 应用退出动画
    if (this.options.animation) {
      this.element.style.animationName = 'jevMessageExit';
      
      // 动画结束后移除
      setTimeout(() => {
        this._removeFromDOM();
      }, this.options.animationDuration);
    } else {
      this._removeFromDOM();
    }
  }

  /**
   * 从DOM中移除
   * @private
   */
  _removeFromDOM() {
    if (this.element && document.body.contains(this.element)) {
      document.body.removeChild(this.element);
    }
    
    // 触发关闭回调
    if (typeof this.options.onClose === 'function') {
      try {
        this.options.onClose(this);
      } catch (error) {
        logger.error('消息关闭事件处理失败', error);
      }
    }
  }

  /**
   * 显示消息
   * @returns {Message} 消息实例
   */
  show() {
    this.updateState({ visible: true });
    return this;
  }

  /**
   * 关闭消息
   * @returns {Message} 消息实例
   */
  close() {
    this.updateState({ visible: false });
    return this;
  }

  /**
   * 切换消息显示状态
   * @returns {Message} 消息实例
   */
  toggle() {
    this.updateState({ visible: !this.state.visible });
    return this;
  }

  /**
   * 设置消息内容
   * @param {string|HTMLElement} content - 消息内容
   * @returns {Message} 消息实例
   */
  setContent(content) {
    this.updateState({ content });
    return this;
  }

  /**
   * 设置消息类型
   * @param {string} type - 消息类型
   * @returns {Message} 消息实例
   */
  setType(type) {
    this.updateState({ type });
    return this;
  }

  /**
   * 设置消息位置
   * @param {string} position - 消息位置
   * @returns {Message} 消息实例
   */
  setPosition(position) {
    if (!this.element) return this;
    
    this.options.position = position;
    const styles = {};
    this._applyPositionStyle(styles);
    
    Object.entries(styles).forEach(([key, value]) => {
      this.element.style[key] = value;
    });
    
    return this;
  }

  /**
   * 设置自动关闭时间
   * @param {number} duration - 持续时间（毫秒）
   * @returns {Message} 消息实例
   */
  setDuration(duration) {
    this.options.duration = duration;
    
    // 重置定时器
    if (this.visible && duration > 0) {
      if (this.timer) {
        clearTimeout(this.timer);
      }
      
      this.timer = setTimeout(() => {
        this.close();
      }, duration);
    }
    
    return this;
  }

  /**
   * 设置消息主题
   * @param {string} theme - 主题名称
   * @returns {Message} 消息实例
   */
  setTheme(theme) {
    if (!this.element) return this;
    
    // 移除旧主题类
    this.element.classList.remove(`jev-message-${this.options.theme}`);
    
    // 设置新主题
    this.options.theme = theme;
    this.element.classList.add(`jev-message-${theme}`);
    
    // 更新颜色
    const colors = this._getTypeColors();
    this.element.style.backgroundColor = colors.background;
    this.element.style.borderColor = colors.border;
    this.element.style.color = colors.text;
    this.element.style.boxShadow = colors.boxShadow;
    
    return this;
  }

  /**
   * 资源释放与清理
   */
  async destroy() {
    try {
      // 清理事件和定时器
      this._unbindEvents();
      
      // 从DOM中移除
      if (this.element && document.body.contains(this.element)) {
        document.body.removeChild(this.element);
      }
      
      // 重置引用
      this.contentElement = null;
      this.closeButton = null;
      this.visible = false;
      
    } catch (error) {
      logger.error('消息销毁失败', error);
    }
  }
}

export default Message;