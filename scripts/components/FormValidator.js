/**
 * FormValidator表单验证组件
 * 提供强大的表单验证功能，支持多种验证规则、实时验证和自定义错误提示
 */
import BaseComponent from './base-component.js';
import logger from '../utils/logger.js';

class FormValidator extends BaseComponent {
  /**
   * 构造函数
   * @param {Object} options - 配置选项
   */
  constructor(options = {}) {
    super(options);
    
    // 表单元素引用
    this.formElement = null;
    
    // 验证规则
    this.rules = {};
    
    // 错误消息
    this.errors = {};
    
    // 验证状态
    this.validationState = {};
    
    // 事件处理器
    this._submitHandler = null;
    this._inputHandlers = {};
    
    // 动画相关
    this.animationClasses = {
      error: 'jev-form-error-shake',
      success: 'jev-form-success-flash'
    };
  }

  /**
   * 获取默认配置
   * @private
   */
  _getDefaultOptions() {
    return {
      ...super._getDefaultOptions(),
      form: null, // 表单元素或选择器
      rules: {},
      messages: {},
      mode: 'real-time', // real-time, submit-only
      debounceTime: 300,
      theme: 'neon', // neon, default, dark
      onSubmit: null,
      onValid: null,
      onInvalid: null,
      onFieldValid: null,
      onFieldInvalid: null,
      errorClass: 'jev-form-error',
      validClass: 'jev-form-valid',
      containerClass: 'jev-form-container',
      useAriaAttributes: true,
      focusOnError: true
    };
  }

  /**
   * 获取初始状态
   * @private
   */
  _getInitialState() {
    return {
      ...super._getInitialState(),
      isValid: false,
      isSubmitting: false
    };
  }

  /**
   * 创建DOM元素
   * @private
   */
  _createElement() {
    // 获取表单元素
    if (typeof this.options.form === 'string') {
      this.formElement = document.querySelector(this.options.form);
    } else if (this.options.form instanceof HTMLElement) {
      this.formElement = this.options.form;
    } else {
      throw new Error('Invalid form element or selector');
    }
    
    if (!this.formElement || this.formElement.tagName !== 'FORM') {
      throw new Error('Form element not found or invalid');
    }
    
    // 应用主题类
    this.formElement.classList.add(this.options.containerClass);
    this.formElement.classList.add(`${this.options.containerClass}-${this.options.theme}`);
    
    // 设置元素引用
    this.element = this.formElement;
  }

  /**
   * 应用样式
   * @private
   */
  _applyStyles() {
    // 添加全局表单验证样式
    this._addGlobalStyle('jev-form-validator-styles', `
      /* 基础样式 */
      .jev-form-container {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }
      
      /* 输入框基础样式 */
      .jev-form-container input,
      .jev-form-container select,
      .jev-form-container textarea {
        width: 100%;
        padding: 8px 12px;
        border: 1px solid #ddd;
        border-radius: 4px;
        font-size: 14px;
        transition: all 0.3s ease;
        box-sizing: border-box;
      }
      
      /* 表单组 */
      .jev-form-group {
        margin-bottom: 16px;
      }
      
      .jev-form-group label {
        display: block;
        margin-bottom: 4px;
        font-weight: 500;
      }
      
      /* 错误消息样式 */
      .jev-form-error-message {
        margin-top: 4px;
        font-size: 12px;
        line-height: 1.4;
        display: none;
      }
      
      /* 验证状态样式 */
      .jev-form-error input,
      .jev-form-error select,
      .jev-form-error textarea {
        border-color: #ff0040;
        background-color: rgba(255, 0, 64, 0.05);
      }
      
      .jev-form-valid input,
      .jev-form-valid select,
      .jev-form-valid textarea {
        border-color: #00cc66;
        background-color: rgba(0, 204, 102, 0.05);
      }
      
      .jev-form-error .jev-form-error-message {
        display: block;
      }
      
      /* 动画效果 */
      @keyframes jev-form-error-shake {
        0%, 100% { transform: translateX(0); }
        10%, 30%, 50%, 70%, 90% { transform: translateX(-3px); }
        20%, 40%, 60%, 80% { transform: translateX(3px); }
      }
      
      @keyframes jev-form-success-flash {
        0% { background-color: transparent; }
        50% { background-color: rgba(0, 204, 102, 0.2); }
        100% { background-color: transparent; }
      }
      
      .jev-form-error-shake {
        animation: jev-form-error-shake 0.5s ease;
      }
      
      .jev-form-success-flash {
        animation: jev-form-success-flash 0.5s ease;
      }
      
      /* Neon主题样式 */
      .jev-form-container-neon input,
      .jev-form-container-neon select,
      .jev-form-container-neon textarea {
        background-color: #1a1a1a;
        border-color: #333;
        color: #fff;
      }
      
      .jev-form-container-neon input:focus,
      .jev-form-container-neon select:focus,
      .jev-form-container-neon textarea:focus {
        outline: none;
        border-color: #00ff99;
        box-shadow: 0 0 10px rgba(0, 255, 153, 0.3);
      }
      
      .jev-form-container-neon label {
        color: #00ff99;
      }
      
      .jev-form-container-neon .jev-form-error-message {
        color: #ff0040;
      }
      
      /* Default主题样式 */
      .jev-form-container-default input:focus,
      .jev-form-container-default select:focus,
      .jev-form-container-default textarea:focus {
        outline: none;
        border-color: #007bff;
        box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
      }
      
      .jev-form-container-default label {
        color: #333;
      }
      
      .jev-form-container-default .jev-form-error-message {
        color: #dc3545;
      }
      
      /* Dark主题样式 */
      .jev-form-container-dark input,
      .jev-form-container-dark select,
      .jev-form-container-dark textarea {
        background-color: #2d3748;
        border-color: #4a5568;
        color: #e2e8f0;
      }
      
      .jev-form-container-dark input:focus,
      .jev-form-container-dark select:focus,
      .jev-form-container-dark textarea:focus {
        outline: none;
        border-color: #63b3ed;
        box-shadow: 0 0 10px rgba(99, 179, 237, 0.3);
      }
      
      .jev-form-container-dark label {
        color: #e2e8f0;
      }
      
      .jev-form-container-dark .jev-form-error-message {
        color: #fc8181;
      }
      
      /* 响应式设计 */
      @media (max-width: 768px) {
        .jev-form-group {
          margin-bottom: 12px;
        }
        
        .jev-form-container input,
        .jev-form-container select,
        .jev-form-container textarea {
          padding: 10px 12px;
          font-size: 16px;
        }
      }
    `);
    
    // 初始化表单组和错误信息容器
    this._initializeFormGroups();
    
    // 初始化规则
    this.rules = { ...this.options.rules };
  }

  /**
   * 绑定事件
   * @private
   */
  _bindEvents() {
    // 表单提交事件
    this._submitHandler = (event) => {
      event.preventDefault();
      this.validateForm();
    };
    this.formElement.addEventListener('submit', this._submitHandler);
    
    // 实时验证
    if (this.options.mode === 'real-time') {
      this._setupRealTimeValidation();
    }
  }

  /**
   * 解绑事件
   * @private
   */
  _unbindEvents() {
    // 移除表单提交事件
    if (this._submitHandler) {
      this.formElement.removeEventListener('submit', this._submitHandler);
      this._submitHandler = null;
    }
    
    // 移除输入事件
    Object.entries(this._inputHandlers).forEach(([fieldName, handler]) => {
      const input = this.formElement.querySelector(`[name="${fieldName}"]`);
      if (input) {
        input.removeEventListener('input', handler);
        input.removeEventListener('blur', handler);
      }
    });
    
    this._inputHandlers = {};
  }

  /**
   * 初始化表单组
   * @private
   */
  _initializeFormGroups() {
    // 为每个输入字段创建表单组和错误消息容器
    Object.keys(this.rules).forEach(fieldName => {
      const input = this.formElement.querySelector(`[name="${fieldName}"]`);
      if (input && !input.parentNode.classList.contains('jev-form-group')) {
        // 创建表单组
        const formGroup = document.createElement('div');
        formGroup.className = 'jev-form-group';
        
        // 创建错误消息容器
        const errorContainer = document.createElement('div');
        errorContainer.className = 'jev-form-error-message';
        errorContainer.setAttribute('data-field', fieldName);
        
        // 包装输入元素
        const parent = input.parentNode;
        parent.insertBefore(formGroup, input);
        formGroup.appendChild(input);
        formGroup.appendChild(errorContainer);
        
        // 移动标签到表单组内
        const label = parent.querySelector(`label[for="${input.id}"]`);
        if (label) {
          formGroup.insertBefore(label, input);
        }
      }
    });
  }

  /**
   * 设置实时验证
   * @private
   */
  _setupRealTimeValidation() {
    Object.keys(this.rules).forEach(fieldName => {
      const input = this.formElement.querySelector(`[name="${fieldName}"]`);
      if (input) {
        // 创建防抖函数
        const debouncedValidate = this._debounce(() => {
          this.validateField(fieldName);
        }, this.options.debounceTime);
        
        // 绑定事件
        input.addEventListener('input', debouncedValidate);
        input.addEventListener('blur', () => {
          this.validateField(fieldName, true); // 失焦时立即验证
        });
        
        // 存储处理器引用
        this._inputHandlers[fieldName] = debouncedValidate;
      }
    });
  }

  /**
   * 防抖函数
   * @private
   */
  _debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  /**
   * 验证单个字段
   * @param {string} fieldName - 字段名称
   * @param {boolean} showAnimation - 是否显示动画
   * @returns {boolean} 是否验证通过
   */
  validateField(fieldName, showAnimation = false) {
    const field = this.formElement.querySelector(`[name="${fieldName}"]`);
    if (!field) return true;
    
    const fieldRules = this.rules[fieldName];
    if (!fieldRules) return true;
    
    const value = field.value;
    const formGroup = field.closest('.jev-form-group');
    const errorContainer = formGroup?.querySelector(`[data-field="${fieldName}"]`);
    
    // 重置状态
    formGroup?.classList.remove(this.options.errorClass, this.options.validClass);
    if (errorContainer) {
      errorContainer.textContent = '';
    }
    
    // 验证规则
    for (const rule in fieldRules) {
      let isValid = true;
      let errorMessage = this._getMessage(fieldName, rule, fieldRules[rule]);
      
      switch (rule) {
        case 'required':
          isValid = value.trim() !== '';
          break;
          
        case 'min':
          isValid = value.length >= fieldRules[rule];
          break;
          
        case 'max':
          isValid = value.length <= fieldRules[rule];
          break;
          
        case 'email':
          isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
          break;
          
        case 'number':
          isValid = !isNaN(value) && value !== '';
          break;
          
        case 'integer':
          isValid = /^-?\d+$/.test(value);
          break;
          
        case 'pattern':
          isValid = fieldRules[rule].test(value);
          break;
          
        case 'equalTo':
          const targetField = this.formElement.querySelector(`[name="${fieldRules[rule]}"]`);
          isValid = targetField && value === targetField.value;
          break;
          
        case 'custom':
          if (typeof fieldRules[rule] === 'function') {
            isValid = fieldRules[rule](value, field);
          }
          break;
          
        default:
          break;
      }
      
      if (!isValid) {
        // 显示错误
        this._showError(fieldName, errorMessage, showAnimation);
        return false;
      }
    }
    
    // 验证通过
    this._showSuccess(fieldName, showAnimation);
    return true;
  }

  /**
   * 验证整个表单
   * @returns {boolean} 是否验证通过
   */
  validateForm() {
    let isValid = true;
    this.errors = {};
    
    // 验证所有字段
    Object.keys(this.rules).forEach(fieldName => {
      const fieldIsValid = this.validateField(fieldName, true);
      isValid = isValid && fieldIsValid;
    });
    
    // 更新状态
    this.updateState({ isValid, isSubmitting: false });
    
    // 处理焦点管理
    if (!isValid && this.options.focusOnError) {
      const firstError = this.formElement.querySelector(`.${this.options.errorClass} input`);
      if (firstError) {
        firstError.focus();
      }
    }
    
    // 触发回调
    if (isValid) {
      if (typeof this.options.onValid === 'function') {
        try {
          this.options.onValid(this);
        } catch (error) {
          logger.error('表单验证通过回调执行失败', error);
        }
      }
      
      if (typeof this.options.onSubmit === 'function') {
        try {
          this.options.onSubmit(this);
        } catch (error) {
          logger.error('表单提交回调执行失败', error);
        }
      }
    } else {
      if (typeof this.options.onInvalid === 'function') {
        try {
          this.options.onInvalid(this, this.errors);
        } catch (error) {
          logger.error('表单验证失败回调执行失败', error);
        }
      }
    }
    
    return isValid;
  }

  /**
   * 显示错误
   * @private
   */
  _showError(fieldName, message, showAnimation) {
    const field = this.formElement.querySelector(`[name="${fieldName}"]`);
    const formGroup = field?.closest('.jev-form-group');
    const errorContainer = formGroup?.querySelector(`[data-field="${fieldName}"]`);
    
    if (formGroup && errorContainer) {
      formGroup.classList.add(this.options.errorClass);
      formGroup.classList.remove(this.options.validClass);
      
      errorContainer.textContent = message;
      this.errors[fieldName] = message;
      
      // 设置ARIA属性
      if (this.options.useAriaAttributes && field) {
        field.setAttribute('aria-invalid', 'true');
        field.setAttribute('aria-describedby', errorContainer.id || `${fieldName}-error`);
        if (!errorContainer.id) {
          errorContainer.id = `${fieldName}-error`;
        }
      }
      
      // 显示动画
      if (showAnimation) {
        formGroup.classList.add(this.animationClasses.error);
        setTimeout(() => {
          formGroup.classList.remove(this.animationClasses.error);
        }, 500);
      }
      
      // 触发字段验证失败回调
      if (typeof this.options.onFieldInvalid === 'function') {
        try {
          this.options.onFieldInvalid(fieldName, message, field);
        } catch (error) {
          logger.error('字段验证失败回调执行失败', error);
        }
      }
    }
  }

  /**
   * 显示成功状态
   * @private
   */
  _showSuccess(fieldName, showAnimation) {
    const field = this.formElement.querySelector(`[name="${fieldName}"]`);
    const formGroup = field?.closest('.jev-form-group');
    
    if (formGroup) {
      formGroup.classList.add(this.options.validClass);
      formGroup.classList.remove(this.options.errorClass);
      
      // 清除ARIA属性
      if (this.options.useAriaAttributes && field) {
        field.setAttribute('aria-invalid', 'false');
      }
      
      // 显示动画
      if (showAnimation) {
        formGroup.classList.add(this.animationClasses.success);
        setTimeout(() => {
          formGroup.classList.remove(this.animationClasses.success);
        }, 500);
      }
      
      // 触发字段验证通过回调
      if (typeof this.options.onFieldValid === 'function') {
        try {
          this.options.onFieldValid(fieldName, field);
        } catch (error) {
          logger.error('字段验证通过回调执行失败', error);
        }
      }
    }
    
    // 移除错误
    delete this.errors[fieldName];
  }

  /**
   * 获取错误消息
   * @private
   */
  _getMessage(fieldName, rule, ruleValue) {
    // 自定义消息优先级最高
    if (this.options.messages && this.options.messages[fieldName] && this.options.messages[fieldName][rule]) {
      return this.options.messages[fieldName][rule];
    }
    
    // 默认消息
    const defaultMessages = {
      required: '此字段为必填项',
      min: `至少需要${ruleValue}个字符`,
      max: `最多允许${ruleValue}个字符`,
      email: '请输入有效的电子邮箱地址',
      number: '请输入有效的数字',
      integer: '请输入有效的整数',
      pattern: '输入格式不正确',
      equalTo: '两次输入不一致',
      custom: '验证失败'
    };
    
    return defaultMessages[rule] || '输入格式不正确';
  }

  /**
   * 获取表单数据
   * @returns {Object} 表单数据对象
   */
  getFormData() {
    const formData = new FormData(this.formElement);
    const data = {};
    
    formData.forEach((value, key) => {
      // 处理多选框
      if (key.endsWith('[]')) {
        const cleanKey = key.replace('[]', '');
        if (!data[cleanKey]) {
          data[cleanKey] = [];
        }
        data[cleanKey].push(value);
      } else {
        data[key] = value;
      }
    });
    
    return data;
  }

  /**
   * 设置表单数据
   * @param {Object} data - 表单数据对象
   * @returns {FormValidator} 组件实例
   */
  setFormData(data) {
    Object.entries(data).forEach(([key, value]) => {
      const field = this.formElement.querySelector(`[name="${key}"]`);
      if (field) {
        if (Array.isArray(value)) {
          // 处理多选字段
          if (field.type === 'checkbox' || field.type === 'radio') {
            const fields = this.formElement.querySelectorAll(`[name="${key}"]`);
            fields.forEach(input => {
              input.checked = value.includes(input.value);
            });
          }
        } else {
          field.value = value;
        }
      }
    });
    
    return this;
  }

  /**
   * 重置表单
   * @returns {FormValidator} 组件实例
   */
  resetForm() {
    this.formElement.reset();
    
    // 重置验证状态
    this.errors = {};
    this.validationState = {};
    
    // 重置UI
    this.formElement.querySelectorAll(`.${this.options.errorClass}, .${this.options.validClass}`).forEach(group => {
      group.classList.remove(this.options.errorClass, this.options.validClass);
    });
    
    this.formElement.querySelectorAll('.jev-form-error-message').forEach(el => {
      el.textContent = '';
    });
    
    return this;
  }

  /**
   * 设置字段错误
   * @param {string} fieldName - 字段名称
   * @param {string} message - 错误消息
   * @returns {FormValidator} 组件实例
   */
  setFieldError(fieldName, message) {
    this._showError(fieldName, message, true);
    return this;
  }

  /**
   * 清除字段错误
   * @param {string} fieldName - 字段名称
   * @returns {FormValidator} 组件实例
   */
  clearFieldError(fieldName) {
    const field = this.formElement.querySelector(`[name="${fieldName}"]`);
    const formGroup = field?.closest('.jev-form-group');
    
    if (formGroup) {
      formGroup.classList.remove(this.options.errorClass);
      const errorContainer = formGroup.querySelector(`[data-field="${fieldName}"]`);
      if (errorContainer) {
        errorContainer.textContent = '';
      }
    }
    
    delete this.errors[fieldName];
    return this;
  }

  /**
   * 获取验证错误
   * @returns {Object} 错误信息对象
   */
  getErrors() {
    return { ...this.errors };
  }

  /**
   * 设置主题
   * @param {string} theme - 主题名称
   * @returns {FormValidator} 组件实例
   */
  setTheme(theme) {
    // 移除旧主题类
    ['neon', 'default', 'dark'].forEach(t => {
      this.formElement.classList.remove(`${this.options.containerClass}-${t}`);
    });
    
    // 添加新主题类
    this.formElement.classList.add(`${this.options.containerClass}-${theme}`);
    this.options.theme = theme;
    
    return this;
  }

  /**
   * 获取表单元素
   * @returns {HTMLFormElement} 表单元素
   */
  getFormElement() {
    return this.formElement;
  }

  /**
   * 资源释放与清理
   */
  async destroy() {
    try {
      // 清理事件
      this._unbindEvents();
      
      // 移除样式类
      this.formElement.classList.remove(this.options.containerClass);
      ['neon', 'default', 'dark'].forEach(t => {
        this.formElement.classList.remove(`${this.options.containerClass}-${t}`);
      });
      
      // 清理DOM元素
      this.formElement.querySelectorAll('.jev-form-error-message').forEach(el => {
        el.remove();
      });
      
      // 重置表单
      this.resetForm();
      
      // 重置引用
      this.formElement = null;
      this.rules = {};
      this.errors = {};
      this.validationState = {};
      
    } catch (error) {
      logger.error('表单验证器销毁失败', error);
    }
  }
}

export default FormValidator;