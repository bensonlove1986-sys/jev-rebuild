/**
 * UI组件基类
 * 提供所有UI组件的通用生命周期和基础功能
 */
import logger from '../modular/logger.js';

class BaseComponent {
  constructor(options = {}) {
    // 组件配置
    this.options = { ...this._getDefaultOptions(), ...options };
    
    // 组件状态
    this.state = { ...this._getInitialState() };
    
    // 根元素引用
    this.element = null;
    
    // 是否已初始化
    this.initialized = false;
    
    // 是否已挂载
    this.mounted = false;
    
    // DOM元素缓存
    this.elements = {};
  }

  /**
   * 获取默认配置
   * @private
   */
  _getDefaultOptions() {
    return {
      id: null,
      className: '',
      style: {},
      parent: null,
      theme: 'default'
    };
  }

  /**
   * 获取初始状态
   * @private
   */
  _getInitialState() {
    return {
      visible: true,
      disabled: false,
      loading: false
    };
  }

  /**
   * 初始化组件
   */
  async initialize() {
    try {
      if (this.initialized) return this;
      
      logger.debug(`初始化组件: ${this.constructor.name}`);
      
      // 执行初始化前钩子
      await this._beforeInitialize();
      
      // 创建DOM元素
      this._createElement();
      
      // 添加样式
      this._applyStyles();
      
      // 绑定事件
      this._bindEvents();
      
      // 执行初始化后钩子
      await this._afterInitialize();
      
      this.initialized = true;
      logger.debug(`组件初始化完成: ${this.constructor.name}`);
      
      return this;
    } catch (error) {
      logger.error(`组件初始化失败: ${this.constructor.name}`, error);
      throw error;
    }
  }

  /**
   * 挂载组件到DOM
   * @param {HTMLElement} parent - 父元素
   */
  async mount(parent = null) {
    try {
      if (this.mounted) return this;
      
      // 确保已初始化
      if (!this.initialized) {
        await this.initialize();
      }
      
      const mountParent = parent || this.options.parent || document.body;
      
      logger.debug(`挂载组件: ${this.constructor.name} 到 ${mountParent.tagName}`);
      
      // 执行挂载前钩子
      await this._beforeMount();
      
      // 挂载到DOM
      mountParent.appendChild(this.element);
      
      // 执行挂载后钩子
      await this._afterMount();
      
      this.mounted = true;
      logger.debug(`组件挂载完成: ${this.constructor.name}`);
      
      return this;
    } catch (error) {
      logger.error(`组件挂载失败: ${this.constructor.name}`, error);
      throw error;
    }
  }

  /**
   * 卸载组件
   */
  async unmount() {
    try {
      if (!this.mounted || !this.element) return this;
      
      logger.debug(`卸载组件: ${this.constructor.name}`);
      
      // 执行卸载前钩子
      await this._beforeUnmount();
      
      // 清理事件
      this._unbindEvents();
      
      // 移除元素
      if (this.element.parentNode) {
        this.element.parentNode.removeChild(this.element);
      }
      
      // 执行卸载后钩子
      await this._afterUnmount();
      
      this.mounted = false;
      logger.debug(`组件卸载完成: ${this.constructor.name}`);
      
      return this;
    } catch (error) {
      logger.error(`组件卸载失败: ${this.constructor.name}`, error);
      throw error;
    }
  }

  /**
   * 更新组件状态
   * @param {Object} newState - 新状态
   */
  updateState(newState) {
    const prevState = { ...this.state };
    this.state = { ...this.state, ...newState };
    
    // 状态更新后重渲染
    this._onStateChange(prevState, this.state);
    this.render();
    
    return this;
  }

  /**
   * 重渲染组件
   */
  render() {
    if (!this.initialized || !this.element) return this;
    
    logger.debug(`重渲染组件: ${this.constructor.name}`);
    
    // 根据当前状态更新UI
    this._updateElement();
    
    return this;
  }

  /**
   * 显示组件
   */
  show() {
    return this.updateState({ visible: true });
  }

  /**
   * 隐藏组件
   */
  hide() {
    return this.updateState({ visible: false });
  }

  /**
   * 切换组件显示/隐藏
   */
  toggle() {
    return this.updateState({ visible: !this.state.visible });
  }

  /**
   * 启用组件
   */
  enable() {
    return this.updateState({ disabled: false });
  }

  /**
   * 禁用组件
   */
  disable() {
    return this.updateState({ disabled: true });
  }

  /**
   * 设置加载状态
   * @param {boolean} loading - 加载状态
   */
  setLoading(loading) {
    return this.updateState({ loading });
  }

  // 生命周期钩子和抽象方法（子类需要实现）
  
  /**
   * 初始化前钩子
   * @private
   */
  async _beforeInitialize() {}

  /**
   * 创建DOM元素
   * @private
   * @abstract
   */
  _createElement() {
    throw new Error('子类必须实现_createElement方法');
  }

  /**
   * 应用样式
   * @private
   */
  _applyStyles() {
    if (!this.element) return;
    
    // 应用ID
    if (this.options.id) {
      this.element.id = this.options.id;
    }
    
    // 应用类名
    if (this.options.className) {
      this.element.className = this.options.className;
    }
    
    // 应用内联样式
    Object.entries(this.options.style).forEach(([key, value]) => {
      this.element.style[key] = value;
    });
  }

  /**
   * 绑定事件
   * @private
   */
  _bindEvents() {}

  /**
   * 解绑事件
   * @private
   */
  _unbindEvents() {}

  /**
   * 初始化后钩子
   * @private
   */
  async _afterInitialize() {}

  /**
   * 挂载前钩子
   * @private
   */
  async _beforeMount() {}

  /**
   * 挂载后钩子
   * @private
   */
  async _afterMount() {}

  /**
   * 卸载前钩子
   * @private
   */
  async _beforeUnmount() {}

  /**
   * 卸载后钩子
   * @private
   */
  async _afterUnmount() {}

  /**
   * 状态改变时的处理
   * @private
   */
  _onStateChange(prevState, newState) {
    // 根据可见性更新显示
    if (prevState.visible !== newState.visible) {
      if (this.element) {
        this.element.style.display = newState.visible ? '' : 'none';
      }
    }
    
    // 根据禁用状态更新
    if (prevState.disabled !== newState.disabled) {
      if (this.element) {
        this.element.disabled = newState.disabled;
        this.element.classList.toggle('jev-component-disabled', newState.disabled);
      }
    }
    
    // 根据加载状态更新
    if (prevState.loading !== newState.loading) {
      if (this.element) {
        this.element.classList.toggle('jev-component-loading', newState.loading);
      }
    }
  }

  /**
   * 更新DOM元素
   * @private
   * @abstract
   */
  _updateElement() {}

  /**
   * 缓存DOM元素引用
   * @param {string} key - 缓存键
   * @param {HTMLElement} element - DOM元素
   */
  _cacheElement(key, element) {
    this.elements[key] = element;
    return element;
  }

  /**
   * 获取缓存的DOM元素
   * @param {string} key - 缓存键
   */
  _getCachedElement(key) {
    return this.elements[key];
  }

  /**
   * 添加全局样式
   * @param {string} styleId - 样式ID
   * @param {string} css - CSS内容
   */
  _addGlobalStyle(styleId, css) {
    if (document.getElementById(styleId)) return;
    
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = css;
    document.head.appendChild(style);
  }

  /**
   * 触发自定义事件
   * @param {string} eventName - 事件名称
   * @param {Object} detail - 事件详情
   */
  _triggerEvent(eventName, detail = {}) {
    if (!this.element) return;
    
    const event = new CustomEvent(`jev:${eventName}`, {
      bubbles: true,
      cancelable: true,
      detail: { ...detail, component: this }
    });
    
    this.element.dispatchEvent(event);
  }
}

export default BaseComponent;