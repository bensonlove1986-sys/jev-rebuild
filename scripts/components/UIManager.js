/**
 * UI管理器
 * 统一管理所有UI组件和提供统一的UI操作接口
 */
import logger from '../modular/logger.js';
import Button from './Button.js';
import Dialog from './Dialog.js';
import Panel from './Panel.js';
import ProgressBar from './ProgressBar.js';

class UIManager {
  constructor() {
    // 组件实例缓存
    this.components = new Map();
    
    // 对话框实例缓存
    this.dialogs = new Map();
    
    // 面板实例缓存
    this.panels = new Map();
    
    // 全局配置
    this.config = {
      theme: 'default',
      zIndexBase: 1000,
      animationEnabled: true
    };
    
    // 唯一ID计数器
    this.idCounter = 0;
  }

  /**
   * 初始化UI管理器
   */
  async initialize(options = {}) {
    try {
      logger.info('初始化UI管理器');
      
      // 合并配置
      this.config = { ...this.config, ...options };
      
      // 添加全局重置样式
      this._addGlobalResetStyles();
      
      logger.info('UI管理器初始化完成');
      return true;
    } catch (error) {
      logger.error('UI管理器初始化失败', error);
      return false;
    }
  }

  /**
   * 添加全局重置样式
   * @private
   */
  _addGlobalResetStyles() {
    if (document.getElementById('jev-global-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'jev-global-styles';
    style.textContent = `
      /* JEV全局样式重置 */
      .jev-component {
        box-sizing: border-box;
      }
      
      .jev-component *,
      .jev-component *::before,
      .jev-component *::after {
        box-sizing: inherit;
      }
      
      /* 防止文本选中 */
      .jev-no-select {
        user-select: none;
        -webkit-user-select: none;
        -moz-user-select: none;
        -ms-user-select: none;
      }
      
      /* 隐藏元素 */
      .jev-hidden {
        display: none !important;
      }
      
      /* 禁用状态 */
      .jev-component-disabled {
        opacity: 0.6;
        pointer-events: none;
      }
      
      /* 加载状态 */
      .jev-component-loading {
        position: relative;
        pointer-events: none;
      }
      
      /* 通用动画 */
      @keyframes jev-fade-in {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      
      @keyframes jev-fade-out {
        from { opacity: 1; }
        to { opacity: 0; }
      }
      
      @keyframes jev-slide-up {
        from {
          opacity: 0;
          transform: translateY(20px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      
      @keyframes jev-slide-down {
        from {
          opacity: 1;
          transform: translateY(0);
        }
        to {
          opacity: 0;
          transform: translateY(20px);
        }
      }
      
      /* 黑绿荧光主题变量 */
      :root {
        --jev-primary-color: #00ff99;
        --jev-secondary-color: #1a1a1a;
        --jev-background-color: #0f0f0f;
        --jev-text-color: #00ff99;
        --jev-border-color: #333;
        --jev-shadow-color: rgba(0, 255, 153, 0.3);
      }
      
      /* 响应式工具类 */
      .jev-responsive-small {
        display: none;
      }
      
      @media (max-width: 768px) {
        .jev-responsive-small {
          display: block;
        }
        
        .jev-responsive-large {
          display: none;
        }
      }
    `;
    
    document.head.appendChild(style);
  }

  /**
   * 生成唯一ID
   * @private
   */
  _generateId() {
    return `jev-ui-${++this.idCounter}`;
  }

  /**
   * 创建按钮
   * @param {Object} options - 按钮配置
   */
  createButton(options = {}) {
    try {
      const button = new Button({
        ...options,
        id: options.id || this._generateId()
      });
      
      return button;
    } catch (error) {
      logger.error('创建按钮失败', error);
      throw error;
    }
  }

  /**
   * 创建对话框
   * @param {Object} options - 对话框配置
   */
  createDialog(options = {}) {
    try {
      const dialog = new Dialog({
        ...options,
        id: options.id || this._generateId()
      });
      
      // 缓存对话框
      if (options.id) {
        this.dialogs.set(options.id, dialog);
      }
      
      return dialog;
    } catch (error) {
      logger.error('创建对话框失败', error);
      throw error;
    }
  }

  /**
   * 创建面板
   * @param {Object} options - 面板配置
   */
  createPanel(options = {}) {
    try {
      const panel = new Panel({
        ...options,
        id: options.id || this._generateId()
      });
      
      // 缓存面板
      if (options.id) {
        this.panels.set(options.id, panel);
      }
      
      return panel;
    } catch (error) {
      logger.error('创建面板失败', error);
      throw error;
    }
  }

  /**
   * 创建进度条
   * @param {Object} options - 进度条配置
   */
  createProgressBar(options = {}) {
    try {
      const progressBar = new ProgressBar({
        ...options,
        id: options.id || this._generateId()
      });
      
      return progressBar;
    } catch (error) {
      logger.error('创建进度条失败', error);
      throw error;
    }
  }

  /**
   * 显示消息提示
   * @param {string} message - 消息内容
   * @param {Object} options - 选项
   */
  showMessage(message, options = {}) {
    const {
      type = 'info', // info, success, warning, error
      duration = 3000,
      position = 'top-right', // top-left, top-right, bottom-left, bottom-right
      onClose
    } = options;
    
    try {
      // 动态创建并加载Message组件
      const script = document.createElement('script');
      script.src = '../components/Message.js';
      script.onload = () => {
        import('./Message.js').then(module => {
          const Message = module.default;
          const msg = new Message({
            message,
            type,
            duration,
            position,
            onClose
          });
          
          msg.initialize().then(() => {
            msg.show();
          }).catch(error => {
            logger.error('显示消息失败', error);
          });
        });
      };
      
      // 如果Message组件已加载，直接使用
      if (window.JEVMessageComponent) {
        const Message = window.JEVMessageComponent;
        const msg = new Message({
          message,
          type,
          duration,
          position,
          onClose
        });
        
        msg.initialize().then(() => {
          msg.show();
        }).catch(error => {
          logger.error('显示消息失败', error);
        });
        return msg;
      }
      
      // 创建消息元素（降级方案）
      const messageElement = document.createElement('div');
      messageElement.className = `jev-message jev-message-${type} jev-message-${position}`;
      messageElement.textContent = message;
      
      // 添加样式
      messageElement.style.cssText = `
        position: fixed;
        padding: 12px 20px;
        border-radius: 4px;
        color: white;
        font-size: 14px;
        font-weight: 500;
        z-index: ${this.config.zIndexBase + 1000};
        animation: jev-fade-in 0.3s ease, jev-slide-up 0.3s ease;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        max-width: 300px;
        word-wrap: break-word;
      `;
      
      // 设置位置
      const positionStyles = {
        'top-left': { top: '20px', left: '20px' },
        'top-right': { top: '20px', right: '20px' },
        'bottom-left': { bottom: '20px', left: '20px' },
        'bottom-right': { bottom: '20px', right: '20px' }
      };
      
      Object.entries(positionStyles[position]).forEach(([key, value]) => {
        messageElement.style[key] = value;
      });
      
      // 设置类型样式
      const typeStyles = {
        info: { backgroundColor: '#2196f3', borderLeft: '4px solid #0d47a1' },
        success: { backgroundColor: '#4caf50', borderLeft: '4px solid #1b5e20' },
        warning: { backgroundColor: '#ff9800', borderLeft: '4px solid #e65100' },
        error: { backgroundColor: '#f44336', borderLeft: '4px solid #b71c1c' }
      };
      
      Object.entries(typeStyles[type]).forEach(([key, value]) => {
        messageElement.style[key] = value;
      });
      
      document.body.appendChild(messageElement);
      
      // 设置自动关闭
      const timer = setTimeout(() => {
        messageElement.style.animation = 'jev-fade-out 0.3s ease, jev-slide-down 0.3s ease';
        messageElement.style.opacity = '0';
        
        setTimeout(() => {
          if (document.body.contains(messageElement)) {
            document.body.removeChild(messageElement);
          }
          if (typeof onClose === 'function') {
            onClose();
          }
        }, 300);
      }, duration);
      
      // 点击消息关闭
      messageElement.addEventListener('click', () => {
        clearTimeout(timer);
        messageElement.style.animation = 'jev-fade-out 0.3s ease, jev-slide-down 0.3s ease';
        messageElement.style.opacity = '0';
        
        setTimeout(() => {
          if (document.body.contains(messageElement)) {
            document.body.removeChild(messageElement);
          }
          if (typeof onClose === 'function') {
            onClose();
          }
        }, 300);
      });
      
      return messageElement;
    } catch (error) {
      logger.error('创建消息失败', error);
      return null;
    }
  }
  
  /**
   * 关闭所有对话框
   */
  closeAllDialogs() {
    this.dialogs.forEach((dialog, id) => {
      if (dialog && typeof dialog.hide === 'function') {
        dialog.hide();
      }
    });
  }
  
  /**
   * 销毁组件
   * @param {string} id - 组件ID
   */
  destroyComponent(id) {
    const component = this.components.get(id);
    if (component && typeof component.destroy === 'function') {
      component.destroy();
    }
    this.components.delete(id);
    
    // 同时从特定缓存中移除
    if (this.dialogs.has(id)) {
      this.dialogs.delete(id);
    }
    
    if (this.panels.has(id)) {
      this.panels.delete(id);
    }
  }
  
  /**
   * 显示确认对话框
   * @param {string} message - 确认消息
   * @param {Object} options - 选项
   * @returns {Promise<boolean>} 确认结果
   */
  showConfirmDialog(message, options = {}) {
    return new Promise((resolve) => {
      const dialog = this.createDialog({
        title: options.title || '确认',
        content: `<div class="jev-dialog-content">${message}</div>`,
        buttons: [
          {
            text: options.cancelText || '取消',
            className: 'jev-btn-cancel',
            onClick: () => {
              dialog.hide();
              resolve(false);
            }
          },
          {
            text: options.confirmText || '确定',
            className: 'jev-btn-primary',
            onClick: () => {
              dialog.hide();
              resolve(true);
            }
          }
        ],
        onClose: () => resolve(false)
      });
      
      dialog.initialize().then(() => {
        dialog.show();
      });
    });
  }
  
  /**
   * 显示输入对话框
   * @param {Object} options - 输入对话框选项
   * @returns {Promise<Object>} 输入结果
   */
  showInputDialog(options = {}) {
    return new Promise((resolve) => {
      const inputId = this._generateId();
      const validationErrorId = this._generateId();
      
      const inputHtml = `
        <div class="jev-input-dialog-content">
          ${options.label ? `<label class="jev-input-label" for="${inputId}">${options.label}</label>` : ''}
          <input 
            id="${inputId}" 
            type="${options.inputType || 'text'}" 
            class="jev-input" 
            placeholder="${options.placeholder || ''}"
            value="${options.defaultValue || ''}"
          />
          <div id="${validationErrorId}" class="jev-validation-error" style="display: none; color: #f44336; font-size: 12px; margin-top: 5px;"></div>
        </div>
      `;
      
      const dialog = this.createDialog({
        title: options.title || '请输入',
        content: inputHtml,
        buttons: [
          {
            text: options.cancelText || '取消',
            className: 'jev-btn-cancel',
            onClick: () => {
              dialog.hide();
              resolve({ canceled: true });
            }
          },
          {
            text: options.confirmText || '确定',
            className: 'jev-btn-primary',
            onClick: () => {
              const input = document.getElementById(inputId);
              const value = input.value;
              const errorElement = document.getElementById(validationErrorId);
              
              // 验证输入
              if (options.validate && typeof options.validate === 'function') {
                try {
                  const validationResult = options.validate(value);
                  if (validationResult !== true) {
                    errorElement.textContent = validationResult || '输入无效';
                    errorElement.style.display = 'block';
                    return; // 阻止关闭
                  }
                } catch (error) {
                  errorElement.textContent = error.message || '验证失败';
                  errorElement.style.display = 'block';
                  return; // 阻止关闭
                }
              }
              
              dialog.hide();
              resolve({ canceled: false, value });
            }
          }
        ],
        onClose: () => resolve({ canceled: true })
      });
      
      dialog.initialize().then(() => {
        dialog.show();
        // 自动聚焦输入框
        setTimeout(() => {
          const input = document.getElementById(inputId);
          if (input) input.focus();
        }, 100);
      });
    });
  }
  
  /**
   * 全局事件处理
   * @private
   */
  _setupGlobalEvents() {
    // ESC键关闭所有对话框
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' || event.keyCode === 27) {
        this.closeAllDialogs();
      }
    });
    
    // 点击对话框外部关闭对话框
    document.addEventListener('click', (event) => {
      this.dialogs.forEach((dialog, id) => {
        if (dialog && dialog.isVisible && 
            !dialog.container.contains(event.target) && 
            !dialog.isClickInside) {
          dialog.hide();
        }
        dialog.isClickInside = false;
      });
    });
  }
  
  /**
   * 清理所有组件
   */
  clear() {
    // 关闭所有对话框
    this.closeAllDialogs();
    
    // 销毁所有面板
    this.panels.forEach((panel, id) => {
      if (panel && typeof panel.destroy === 'function') {
        panel.destroy();
      }
    });
    
    // 清空所有缓存
    this.components.clear();
    this.dialogs.clear();
    this.panels.clear();
  }
}

// 导出单例实例
const uiManager = new UIManager();
export default uiManager;
        success: { backgroundColor: '#4caf50', borderLeft: '4px solid #2e7d32' },
        warning: { backgroundColor: '#ff9800', borderLeft: '4px solid #e65100' },
        error: { backgroundColor: '#f44336', borderLeft: '4px solid #b71c1c' }
      };
      
      Object.entries(typeStyles[type]).forEach(([key, value]) => {
        messageElement.style[key] = value;
      });
      
      // 添加到页面
      document.body.appendChild(messageElement);
      
      // 设置定时器自动关闭
      const timer = setTimeout(() => {
        messageElement.style.animation = 'jev-fade-out 0.3s ease, jev-slide-down 0.3s ease';
        
        setTimeout(() => {
          if (messageElement.parentNode) {
            messageElement.parentNode.removeChild(messageElement);
          }
          
          // 触发关闭回调
          if (typeof onClose === 'function') {
            onClose();
          }
        }, 300);
      }, duration);
      
      // 点击关闭
      messageElement.addEventListener('click', () => {
        clearTimeout(timer);
        messageElement.style.animation = 'jev-fade-out 0.3s ease, jev-slide-down 0.3s ease';
        
        setTimeout(() => {
          if (messageElement.parentNode) {
            messageElement.parentNode.removeChild(messageElement);
          }
          
          if (typeof onClose === 'function') {
            onClose();
          }
        }, 300);
      });
      
      return messageElement;
    } catch (error) {
      logger.error('显示消息失败', error);
      throw error;
    }
  }

  /**
   * 显示确认对话框
   * @param {string} message - 消息内容
   * @param {Object} options - 选项
   */
  async showConfirm(message, options = {}) {
    const {
      title = '确认',
      confirmText = '确认',
      cancelText = '取消',
      confirmType = 'primary',
      cancelType = 'default'
    } = options;
    
    return new Promise((resolve) => {
      try {
        const dialog = this.createDialog({
          title,
          content: message,
          buttons: [
            {
              text: cancelText,
              type: cancelType,
              onClick: () => {
                dialog.destroy();
                resolve(false);
              }
            },
            {
              text: confirmText,
              type: confirmType,
              onClick: () => {
                dialog.destroy();
                resolve(true);
              }
            }
          ]
        });
        
        dialog.initialize().then(() => {
          dialog.mount();
          dialog.open();
        });
      } catch (error) {
        logger.error('显示确认对话框失败', error);
        resolve(false);
      }
    });
  }

  /**
   * 显示输入对话框
   * @param {Object} options - 选项
   */
  async showInputDialog(options = {}) {
    const {
      title = '输入',
      placeholder = '',
      defaultValue = '',
      confirmText = '确认',
      cancelText = '取消',
      validate
    } = options;
    
    return new Promise((resolve) => {
      try {
        // 创建输入元素
        const inputContainer = document.createElement('div');
        inputContainer.className = 'jev-input-container';
        inputContainer.innerHTML = `
          <input type="text" class="jev-input" placeholder="${placeholder}" value="${defaultValue}">
          <div class="jev-input-error" style="color: #f44336; font-size: 12px; margin-top: 4px; min-height: 16px;"></div>
        `;
        
        const inputElement = inputContainer.querySelector('.jev-input');
        const errorElement = inputContainer.querySelector('.jev-input-error');
        
        // 添加输入样式
        const style = document.createElement('style');
        style.textContent = `
          .jev-input {
            width: 100%;
            padding: 8px 12px;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 14px;
            outline: none;
            transition: border-color 0.2s;
          }
          
          .jev-input:focus {
            border-color: var(--jev-primary-color);
            box-shadow: 0 0 0 2px rgba(0, 255, 153, 0.2);
          }
          
          .jev-input-error {
            color: #f44336;
            font-size: 12px;
            margin-top: 4px;
            min-height: 16px;
          }
        `;
        document.head.appendChild(style);
        
        const dialog = this.createDialog({
          title,
          content: inputContainer,
          buttons: [
            {
              text: cancelText,
              type: 'default',
              onClick: () => {
                dialog.destroy();
                resolve({ canceled: true });
              }
            },
            {
              text: confirmText,
              type: 'primary',
              onClick: () => {
                const value = inputElement.value;
                
                // 验证输入
                if (validate) {
                  const error = validate(value);
                  if (error) {
                    errorElement.textContent = error;
                    return;
                  }
                }
                
                errorElement.textContent = '';
                dialog.destroy();
                resolve({ canceled: false, value });
              }
            }
          ]
        });
        
        dialog.initialize().then(() => {
          dialog.mount();
          dialog.open();
          
          // 聚焦输入框
          if (inputElement) {
            inputElement.focus();
            inputElement.select();
          }
        });
      } catch (error) {
        logger.error('显示输入对话框失败', error);
        resolve({ canceled: true });
      }
    });
  }

  /**
   * 获取对话框实例
   * @param {string} id - 对话框ID
   */
  getDialog(id) {
    return this.dialogs.get(id);
  }

  /**
   * 获取面板实例
   * @param {string} id - 面板ID
   */
  getPanel(id) {
    return this.panels.get(id);
  }

  /**
   * 关闭所有对话框
   */
  closeAllDialogs() {
    this.dialogs.forEach((dialog, id) => {
      try {
        dialog.close();
      } catch (error) {
        logger.error(`关闭对话框失败: ${id}`, error);
      }
    });
  }

  /**
   * 隐藏所有面板
   */
  hideAllPanels() {
    this.panels.forEach((panel, id) => {
      try {
        panel.hide();
      } catch (error) {
        logger.error(`隐藏面板失败: ${id}`, error);
      }
    });
  }

  /**
   * 更新全局主题
   * @param {string} theme - 主题名称
   */
  setTheme(theme) {
    this.config.theme = theme;
    
    // 更新CSS变量或类名
    document.documentElement.setAttribute('data-jev-theme', theme);
    
    logger.info(`已切换主题: ${theme}`);
  }

  /**
   * 资源释放与清理
   */
  async destroy() {
    try {
      logger.info('清理UI管理器');
      
      // 关闭所有对话框
      this.closeAllDialogs();
      
      // 清空缓存
      this.components.clear();
      this.dialogs.clear();
      this.panels.clear();
      
      logger.info('UI管理器清理完成');
      return true;
    } catch (error) {
      logger.error('UI管理器清理失败', error);
      return false;
    }
  }
}

// 导出单例
const uiManager = new UIManager();
export default uiManager;