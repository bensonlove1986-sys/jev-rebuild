/**
 * Switch开关组件
 * 提供灵活的开关控件，支持多种主题和大小
 */
import BaseComponent from './base-component.js';
import logger from '../utils/logger.js';

class Switch extends BaseComponent {
  /**
   * 构造函数
   * @param {Object} options - 配置选项
   * @param {HTMLElement} container - 容器元素
   */
  constructor(options = {}, container = document.body) {
    super(options, container);
    
    // 组件元素引用
    this.switchElement = null;
    this.trackElement = null;
    this.thumbElement = null;
    this.labelElement = null;
    this.inputElement = null;
    
    // 开关状态
    this.checked = false;
    this.disabled = false;
    this.size = 'medium';
    this.animated = true;
  }

  /**
   * 获取默认配置
   * @private
   */
  _getDefaultOptions() {
    return {
      ...super._getDefaultOptions(),
      checked: false,
      disabled: false,
      size: 'medium', // small, medium, large
      theme: 'default', // default, dark, neon, success, warning, error, info
      animated: true,
      animationDuration: 200,
      label: '',
      labelPosition: 'right', // left, right, top, bottom
      showLabel: true,
      thumbSize: null,
      trackHeight: null,
      trackWidth: null,
      activeColor: '',
      inactiveColor: '',
      thumbColor: '',
      checkedLabel: '',
      uncheckedLabel: '',
      useIcons: false,
      checkedIcon: '✓',
      uncheckedIcon: '✕',
      square: false,
      ripple: true,
      rippleColor: '',
      onSwitch: null,
      onChange: null,
      onCheckedChange: null,
      onInit: null
    };
  }

  /**
   * 获取初始状态
   * @private
   */
  _getInitialState() {
    return {
      ...super._getInitialState(),
      checked: this.options.checked,
      disabled: this.options.disabled
    };
  }

  /**
   * 创建DOM元素
   * @private
   */
  _createElement() {
    // 创建主容器
    this.element = document.createElement('div');
    this.element.className = `jev-switch jev-switch-${this.options.theme} jev-switch-${this.options.size}`;
    
    if (this.options.square) {
      this.element.classList.add('jev-switch-square');
    }
    
    // 布局类根据标签位置设置
    this.element.classList.add(`jev-switch-${this.options.labelPosition}`);
    
    // 创建隐藏的输入框
    this.inputElement = document.createElement('input');
    this.inputElement.type = 'checkbox';
    this.inputElement.className = 'jev-switch-input';
    this.inputElement.checked = this.options.checked;
    this.inputElement.disabled = this.options.disabled;
    
    // 创建开关轨道
    this.trackElement = document.createElement('div');
    this.trackElement.className = 'jev-switch-track';
    
    // 创建开关滑块
    this.thumbElement = document.createElement('div');
    this.thumbElement.className = 'jev-switch-thumb';
    
    // 图标容器
    if (this.options.useIcons) {
      this.checkedIconElement = document.createElement('span');
      this.checkedIconElement.className = 'jev-switch-icon jev-switch-icon-checked';
      this.checkedIconElement.textContent = this.options.checkedIcon;
      this.thumbElement.appendChild(this.checkedIconElement);
      
      this.uncheckedIconElement = document.createElement('span');
      this.uncheckedIconElement.className = 'jev-switch-icon jev-switch-icon-unchecked';
      this.uncheckedIconElement.textContent = this.options.uncheckedIcon;
      this.thumbElement.appendChild(this.uncheckedIconElement);
    }
    
    // 创建开关元素
    this.switchElement = document.createElement('label');
    this.switchElement.className = 'jev-switch-label';
    this.switchElement.appendChild(this.inputElement);
    this.switchElement.appendChild(this.trackElement);
    this.switchElement.appendChild(this.thumbElement);
    
    // 创建标签
    if (this.options.showLabel && (this.options.label || this.options.checkedLabel || this.options.uncheckedLabel)) {
      this._createLabel();
    }
    
    this.element.appendChild(this.switchElement);
    
    // 添加波纹效果容器
    if (this.options.ripple) {
      this.rippleContainer = document.createElement('div');
      this.rippleContainer.className = 'jev-switch-ripple';
      this.switchElement.appendChild(this.rippleContainer);
    }
  }

  /**
   * 创建标签
   * @private
   */
  _createLabel() {
    this.labelElement = document.createElement('span');
    this.labelElement.className = 'jev-switch-text';
    
    // 设置标签文本
    this._updateLabelText();
    
    // 根据位置添加到DOM
    if (this.options.labelPosition === 'left' || this.options.labelPosition === 'top') {
      this.element.insertBefore(this.labelElement, this.switchElement);
    } else {
      this.element.appendChild(this.labelElement);
    }
  }

  /**
   * 更新标签文本
   * @private
   */
  _updateLabelText() {
    if (!this.labelElement) return;
    
    let text = this.options.label;
    
    // 优先使用checkedLabel或uncheckedLabel
    if (this.checked && this.options.checkedLabel) {
      text = this.options.checkedLabel;
    } else if (!this.checked && this.options.uncheckedLabel) {
      text = this.options.uncheckedLabel;
    }
    
    this.labelElement.textContent = text;
  }

  /**
   * 应用样式
   * @private
   */
  _applyStyles() {
    // 添加全局样式
    this._addGlobalStyles();
    
    // 设置初始状态
    this.checked = this.options.checked;
    this.disabled = this.options.disabled;
    this.size = this.options.size;
    this.animated = this.options.animated;
    
    // 应用自定义颜色
    this._applyCustomColors();
    
    // 应用尺寸
    this._applySizes();
    
    // 设置初始状态
    this._setCheckedState(this.checked, false);
    
    // 绑定事件
    this._bindEvents();
    
    // 触发初始化回调
    if (typeof this.options.onInit === 'function') {
      try {
        this.options.onInit();
      } catch (error) {
        logger.error('开关初始化回调执行失败', error);
      }
    }
  }

  /**
   * 添加全局样式
   * @private
   */
  _addGlobalStyles() {
    const styleId = 'jev-switch-styles';
    if (document.getElementById(styleId)) {
      return;
    }
    
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      /* 开关容器 */
      .jev-switch {
        display: inline-flex;
        align-items: center;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        cursor: pointer;
        position: relative;
        user-select: none;
      }
      
      /* 禁用状态 */
      .jev-switch-disabled {
        cursor: not-allowed;
        opacity: 0.6;
      }
      
      /* 开关标签 */
      .jev-switch-label {
        position: relative;
        display: inline-block;
        cursor: inherit;
      }
      
      /* 隐藏输入框 */
      .jev-switch-input {
        position: absolute;
        opacity: 0;
        width: 0;
        height: 0;
        pointer-events: none;
      }
      
      /* 开关轨道 */
      .jev-switch-track {
        position: relative;
        display: inline-block;
        background-color: #ccc;
        border-radius: 20px;
        transition: background-color 0.2s ease;
      }
      
      /* 开关滑块 */
      .jev-switch-thumb {
        position: absolute;
        top: 50%;
        left: 2px;
        background-color: white;
        border-radius: 50%;
        transition: transform 0.2s ease;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
      }
      
      /* 方形样式 */
      .jev-switch-square .jev-switch-track,
      .jev-switch-square .jev-switch-thumb {
        border-radius: 4px;
      }
      
      /* 开关状态 - 选中 */
      .jev-switch-input:checked ~ .jev-switch-track {
        background-color: #007bff;
      }
      
      .jev-switch-input:checked ~ .jev-switch-thumb {
        transform: translateX(calc(100% - 4px)) translateY(-50%);
      }
      
      /* 禁用状态 */
      .jev-switch-input:disabled ~ .jev-switch-track {
        opacity: 0.5;
      }
      
      .jev-switch-input:disabled ~ .jev-switch-thumb {
        opacity: 0.8;
      }
      
      /* 图标样式 */
      .jev-switch-icon {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        font-size: 10px;
        font-weight: bold;
        color: white;
        transition: opacity 0.2s ease;
        pointer-events: none;
      }
      
      .jev-switch-icon-checked {
        opacity: 0;
      }
      
      .jev-switch-input:checked ~ .jev-switch-thumb .jev-switch-icon-checked {
        opacity: 1;
      }
      
      .jev-switch-input:checked ~ .jev-switch-thumb .jev-switch-icon-unchecked {
        opacity: 0;
      }
      
      /* 波纹效果 */
      .jev-switch-ripple {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        border-radius: 50%;
        background-color: rgba(255, 255, 255, 0.5);
        pointer-events: none;
        opacity: 0;
      }
      
      .jev-switch-ripple-active {
        animation: jev-ripple 0.6s ease-out;
      }
      
      @keyframes jev-ripple {
        0% {
          width: 0;
          height: 0;
          opacity: 0.8;
        }
        100% {
          width: 100px;
          height: 100px;
          opacity: 0;
        }
      }
      
      /* 标签样式 */
      .jev-switch-text {
        margin: 0 8px;
        font-size: 14px;
        color: inherit;
        user-select: none;
        white-space: nowrap;
      }
      
      /* 标签位置 - 左侧 */
      .jev-switch-left {
        flex-direction: row-reverse;
      }
      
      .jev-switch-left .jev-switch-text {
        margin: 0 8px 0 0;
      }
      
      /* 标签位置 - 右侧 */
      .jev-switch-right .jev-switch-text {
        margin: 0 0 0 8px;
      }
      
      /* 标签位置 - 顶部 */
      .jev-switch-top {
        flex-direction: column;
        align-items: flex-start;
      }
      
      .jev-switch-top .jev-switch-text {
        margin: 0 0 8px 0;
      }
      
      /* 标签位置 - 底部 */
      .jev-switch-bottom {
        flex-direction: column-reverse;
        align-items: flex-start;
      }
      
      .jev-switch-bottom .jev-switch-text {
        margin: 8px 0 0 0;
      }
      
      /* 主题样式 - 默认 */
      .jev-switch-default .jev-switch-input:checked ~ .jev-switch-track {
        background-color: #007bff;
      }
      
      /* 主题样式 - 深色 */
      .jev-switch-dark {
        color: #e2e8f0;
      }
      
      .jev-switch-dark .jev-switch-track {
        background-color: #4a5568;
      }
      
      .jev-switch-dark .jev-switch-input:checked ~ .jev-switch-track {
        background-color: #38b2ac;
      }
      
      /* 主题样式 - 霓虹灯 */
      .jev-switch-neon {
        color: #00ff99;
      }
      
      .jev-switch-neon .jev-switch-track {
        background-color: rgba(0, 255, 153, 0.2);
      }
      
      .jev-switch-neon .jev-switch-input:checked ~ .jev-switch-track {
        background-color: #00ff99;
        box-shadow: 0 0 10px rgba(0, 255, 153, 0.5);
      }
      
      .jev-switch-neon .jev-switch-thumb {
        background-color: #1a1a1a;
        box-shadow: 0 0 5px rgba(0, 255, 153, 0.3);
      }
      
      /* 主题样式 - 成功 */
      .jev-switch-success .jev-switch-input:checked ~ .jev-switch-track {
        background-color: #38a169;
      }
      
      /* 主题样式 - 警告 */
      .jev-switch-warning .jev-switch-input:checked ~ .jev-switch-track {
        background-color: #dd6b20;
      }
      
      /* 主题样式 - 错误 */
      .jev-switch-error .jev-switch-input:checked ~ .jev-switch-track {
        background-color: #e53e3e;
      }
      
      /* 主题样式 - 信息 */
      .jev-switch-info .jev-switch-input:checked ~ .jev-switch-track {
        background-color: #3182ce;
      }
      
      /* 尺寸样式 - 小 */
      .jev-switch-small .jev-switch-track {
        width: 40px;
        height: 20px;
      }
      
      .jev-switch-small .jev-switch-thumb {
        width: 16px;
        height: 16px;
      }
      
      .jev-switch-small .jev-switch-text {
        font-size: 12px;
      }
      
      /* 尺寸样式 - 中 */
      .jev-switch-medium .jev-switch-track {
        width: 48px;
        height: 24px;
      }
      
      .jev-switch-medium .jev-switch-thumb {
        width: 20px;
        height: 20px;
      }
      
      /* 尺寸样式 - 大 */
      .jev-switch-large .jev-switch-track {
        width: 56px;
        height: 28px;
      }
      
      .jev-switch-large .jev-switch-thumb {
        width: 24px;
        height: 24px;
      }
      
      .jev-switch-large .jev-switch-text {
        font-size: 16px;
      }
      
      /* 尺寸样式 - 更大 */
      .jev-switch-xlarge .jev-switch-track {
        width: 64px;
        height: 32px;
      }
      
      .jev-switch-xlarge .jev-switch-thumb {
        width: 28px;
        height: 28px;
      }
      
      .jev-switch-xlarge .jev-switch-text {
        font-size: 18px;
      }
      
      /* 图标尺寸调整 */
      .jev-switch-small .jev-switch-icon {
        font-size: 8px;
      }
      
      .jev-switch-medium .jev-switch-icon {
        font-size: 10px;
      }
      
      .jev-switch-large .jev-switch-icon {
        font-size: 12px;
      }
      
      .jev-switch-xlarge .jev-switch-icon {
        font-size: 14px;
      }
      
      /* 响应式设计 */
      @media (max-width: 768px) {
        .jev-switch-text {
          font-size: 13px;
        }
        
        .jev-switch-large .jev-switch-text {
          font-size: 14px;
        }
        
        .jev-switch-xlarge {
          transform: scale(0.9);
        }
      }
      
      @media (max-width: 480px) {
        .jev-switch-text {
          font-size: 12px;
        }
        
        .jev-switch-large .jev-switch-text {
          font-size: 13px;
        }
        
        .jev-switch-xlarge {
          transform: scale(0.8);
        }
      }
      
      /* 焦点样式 */
      .jev-switch:focus-within .jev-switch-track {
        outline: 2px solid rgba(0, 123, 255, 0.5);
        outline-offset: 2px;
      }
      
      /* 无障碍支持 */
      .jev-switch-track:focus {
        outline: none;
      }
      
      /* 高对比度模式支持 */
      @media (prefers-contrast: high) {
        .jev-switch-track {
          border: 1px solid;
        }
      }
      
      /* 减少动画偏好 */
      @media (prefers-reduced-motion: reduce) {
        .jev-switch-track,
        .jev-switch-thumb,
        .jev-switch-icon {
          transition: none !important;
        }
        
        .jev-switch-ripple {
          animation: none !important;
        }
      }
    `;
    
    document.head.appendChild(style);
  }

  /**
   * 应用自定义颜色
   * @private
   */
  _applyCustomColors() {
    // 激活颜色
    if (this.options.activeColor) {
      // 创建样式规则
      const styleId = `jev-switch-active-${Date.now()}`;
      let style = document.getElementById(styleId);
      
      if (!style) {
        style = document.createElement('style');
        style.id = styleId;
        document.head.appendChild(style);
      }
      
      // 生成选择器
      const selector = `#${this.element.id} .jev-switch-input:checked ~ .jev-switch-track`;
      
      // 设置样式
      style.textContent = `${selector} { background-color: ${this.options.activeColor} !important; }`;
    }
    
    // 非激活颜色
    if (this.options.inactiveColor) {
      this.trackElement.style.backgroundColor = this.options.inactiveColor;
    }
    
    // 滑块颜色
    if (this.options.thumbColor) {
      this.thumbElement.style.backgroundColor = this.options.thumbColor;
    }
    
    // 波纹颜色
    if (this.options.ripple && this.options.rippleColor && this.rippleContainer) {
      this.rippleContainer.style.backgroundColor = this.options.rippleColor;
    }
  }

  /**
   * 应用自定义尺寸
   * @private
   */
  _applySizes() {
    // 轨道宽度
    if (this.options.trackWidth) {
      this.trackElement.style.width = this.options.trackWidth;
    }
    
    // 轨道高度
    if (this.options.trackHeight) {
      this.trackElement.style.height = this.options.trackHeight;
    }
    
    // 滑块尺寸
    if (this.options.thumbSize) {
      this.thumbElement.style.width = this.options.thumbSize;
      this.thumbElement.style.height = this.options.thumbSize;
    }
  }

  /**
   * 绑定事件
   * @private
   */
  _bindEvents() {
    // 输入框变化事件
    this.inputElement.addEventListener('change', this._handleChange.bind(this));
    
    // 点击事件（用于波纹效果）
    this.switchElement.addEventListener('click', this._handleClick.bind(this));
    
    // 键盘事件
    this.switchElement.addEventListener('keydown', this._handleKeydown.bind(this));
    
    // 使开关可聚焦
    this.switchElement.tabIndex = this.disabled ? -1 : 0;
  }

  /**
   * 处理变化事件
   * @private
   */
  _handleChange(e) {
    const newCheckedState = e.target.checked;
    
    // 更新内部状态
    this.checked = newCheckedState;
    this.updateState({ checked: newCheckedState });
    
    // 更新标签
    this._updateLabelText();
    
    // 触发回调
    this._triggerCallbacks(newCheckedState);
  }

  /**
   * 处理点击事件
   * @private
   */
  _handleClick(e) {
    // 忽略禁用状态
    if (this.disabled) return;
    
    // 触发波纹效果
    if (this.options.ripple && this.rippleContainer) {
      this._createRipple(e);
    }
  }

  /**
   * 处理键盘事件
   * @private
   */
  _handleKeydown(e) {
    // 忽略禁用状态
    if (this.disabled) return;
    
    // 处理空格键和回车键
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      
      // 切换状态
      this.toggle();
    }
  }

  /**
   * 创建波纹效果
   * @private
   */
  _createRipple(e) {
    // 清除之前的波纹
    this.rippleContainer.innerHTML = '';
    
    // 创建新波纹
    const ripple = document.createElement('span');
    ripple.className = 'jev-switch-ripple-active';
    
    // 计算位置
    const rect = this.switchElement.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // 设置位置和大小
    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;
    
    // 添加波纹
    this.rippleContainer.appendChild(ripple);
    
    // 自动移除
    setTimeout(() => {
      ripple.remove();
    }, 600);
  }

  /**
   * 设置选中状态
   * @private
   */
  _setCheckedState(checked, animated = true) {
    // 应用动画类
    if (!animated) {
      this.element.classList.add('jev-switch-no-animation');
    }
    
    // 更新输入框状态
    this.inputElement.checked = checked;
    
    // 强制重绘
    this.element.offsetHeight;
    
    // 移除动画类
    if (!animated) {
      this.element.classList.remove('jev-switch-no-animation');
    }
  }

  /**
   * 触发回调
   * @private
   */
  _triggerCallbacks(checked) {
    // onSwitch回调
    if (typeof this.options.onSwitch === 'function') {
      try {
        this.options.onSwitch(checked, this);
      } catch (error) {
        logger.error('开关切换回调执行失败', error);
      }
    }
    
    // onChange回调
    if (typeof this.options.onChange === 'function') {
      try {
        this.options.onChange({ target: { checked } });
      } catch (error) {
        logger.error('开关变化回调执行失败', error);
      }
    }
    
    // onCheckedChange回调
    if (typeof this.options.onCheckedChange === 'function') {
      try {
        this.options.onCheckedChange(checked);
      } catch (error) {
        logger.error('选中状态变化回调执行失败', error);
      }
    }
  }

  /**
   * 设置选中状态
   * @param {boolean} checked - 是否选中
   * @param {boolean} silent - 是否静默更新（不触发回调）
   */
  setChecked(checked, silent = false) {
    const newCheckedState = !!checked;
    
    // 只有当状态改变时才更新
    if (this.checked !== newCheckedState) {
      this.checked = newCheckedState;
      
      // 更新DOM
      this._setCheckedState(newCheckedState);
      
      // 更新状态
      this.updateState({ checked: newCheckedState });
      
      // 更新标签
      this._updateLabelText();
      
      // 触发回调
      if (!silent) {
        this._triggerCallbacks(newCheckedState);
      }
    }
    
    return this;
  }

  /**
   * 切换选中状态
   * @param {boolean} silent - 是否静默更新（不触发回调）
   */
  toggle(silent = false) {
    return this.setChecked(!this.checked, silent);
  }

  /**
   * 获取选中状态
   * @returns {boolean} 是否选中
   */
  isChecked() {
    return this.checked;
  }

  /**
   * 设置禁用状态
   * @param {boolean} disabled - 是否禁用
   */
  setDisabled(disabled) {
    this.disabled = !!disabled;
    
    // 更新输入框
    this.inputElement.disabled = this.disabled;
    
    // 更新样式
    if (this.disabled) {
      this.element.classList.add('jev-switch-disabled');
      this.switchElement.tabIndex = -1;
    } else {
      this.element.classList.remove('jev-switch-disabled');
      this.switchElement.tabIndex = 0;
    }
    
    // 更新状态
    this.updateState({ disabled: this.disabled });
    
    return this;
  }

  /**
   * 获取禁用状态
   * @returns {boolean} 是否禁用
   */
  isDisabled() {
    return this.disabled;
  }

  /**
   * 设置大小
   * @param {string} size - 大小
   */
  setSize(size) {
    this.element.classList.remove(`jev-switch-${this.size}`);
    this.size = size;
    this.element.classList.add(`jev-switch-${this.size}`);
    
    return this;
  }

  /**
   * 设置主题
   * @param {string} theme - 主题
   */
  setTheme(theme) {
    this.element.classList.remove(`jev-switch-${this.options.theme}`);
    this.element.classList.add(`jev-switch-${theme}`);
    this.options.theme = theme;
    
    return this;
  }

  /**
   * 设置标签
   * @param {string} label - 标签文本
   * @param {string} position - 标签位置
   */
  setLabel(label, position = null) {
    this.options.label = label;
    
    if (position) {
      this.element.classList.remove(`jev-switch-${this.options.labelPosition}`);
      this.options.labelPosition = position;
      this.element.classList.add(`jev-switch-${this.options.labelPosition}`);
      
      // 重新排列标签位置
      if (this.labelElement) {
        this.element.removeChild(this.labelElement);
        
        if (position === 'left' || position === 'top') {
          this.element.insertBefore(this.labelElement, this.switchElement);
        } else {
          this.element.appendChild(this.labelElement);
        }
      }
    }
    
    // 创建或更新标签
    if (label && !this.labelElement) {
      this._createLabel();
    } else if (this.labelElement) {
      this._updateLabelText();
    }
    
    return this;
  }

  /**
   * 设置选中/未选中标签
   * @param {string} checkedLabel - 选中标签
   * @param {string} uncheckedLabel - 未选中标签
   */
  setStateLabels(checkedLabel, uncheckedLabel) {
    this.options.checkedLabel = checkedLabel;
    this.options.uncheckedLabel = uncheckedLabel;
    
    // 更新标签
    this._updateLabelText();
    
    return this;
  }

  /**
   * 设置图标
   * @param {boolean} useIcons - 是否使用图标
   * @param {string} checkedIcon - 选中图标
   * @param {string} uncheckedIcon - 未选中图标
   */
  setIcons(useIcons, checkedIcon = null, uncheckedIcon = null) {
    this.options.useIcons = useIcons;
    
    if (checkedIcon) {
      this.options.checkedIcon = checkedIcon;
    }
    
    if (uncheckedIcon) {
      this.options.uncheckedIcon = uncheckedIcon;
    }
    
    // 移除现有图标
    if (this.checkedIconElement && this.checkedIconElement.parentNode) {
      this.checkedIconElement.parentNode.removeChild(this.checkedIconElement);
    }
    
    if (this.uncheckedIconElement && this.uncheckedIconElement.parentNode) {
      this.uncheckedIconElement.parentNode.removeChild(this.uncheckedIconElement);
    }
    
    // 创建新图标
    if (useIcons) {
      this.checkedIconElement = document.createElement('span');
      this.checkedIconElement.className = 'jev-switch-icon jev-switch-icon-checked';
      this.checkedIconElement.textContent = this.options.checkedIcon;
      this.thumbElement.appendChild(this.checkedIconElement);
      
      this.uncheckedIconElement = document.createElement('span');
      this.uncheckedIconElement.className = 'jev-switch-icon jev-switch-icon-unchecked';
      this.uncheckedIconElement.textContent = this.options.uncheckedIcon;
      this.thumbElement.appendChild(this.uncheckedIconElement);
      
      // 更新图标状态
      if (this.checked) {
        this.checkedIconElement.style.opacity = '1';
        this.uncheckedIconElement.style.opacity = '0';
      } else {
        this.checkedIconElement.style.opacity = '0';
        this.uncheckedIconElement.style.opacity = '1';
      }
    }
    
    return this;
  }

  /**
   * 设置动画
   * @param {boolean} animated - 是否启用动画
   */
  setAnimated(animated) {
    this.animated = animated;
    this.updateState({ animated });
    
    if (animated) {
      this.element.classList.remove('jev-switch-no-animation');
    } else {
      this.element.classList.add('jev-switch-no-animation');
    }
    
    return this;
  }

  /**
   * 设置方形样式
   * @param {boolean} square - 是否启用方形样式
   */
  setSquare(square) {
    this.options.square = square;
    
    if (square) {
      this.element.classList.add('jev-switch-square');
    } else {
      this.element.classList.remove('jev-switch-square');
    }
    
    return this;
  }

  /**
   * 设置波纹效果
   * @param {boolean} ripple - 是否启用波纹效果
   * @param {string} color - 波纹颜色
   */
  setRipple(ripple, color = null) {
    this.options.ripple = ripple;
    
    if (color) {
      this.options.rippleColor = color;
    }
    
    // 创建或移除波纹容器
    if (ripple && !this.rippleContainer) {
      this.rippleContainer = document.createElement('div');
      this.rippleContainer.className = 'jev-switch-ripple';
      
      if (color) {
        this.rippleContainer.style.backgroundColor = color;
      }
      
      this.switchElement.appendChild(this.rippleContainer);
    } else if (!ripple && this.rippleContainer && this.rippleContainer.parentNode) {
      this.rippleContainer.parentNode.removeChild(this.rippleContainer);
      this.rippleContainer = null;
    }
    
    return this;
  }

  /**
   * 设置自定义颜色
   * @param {string} activeColor - 激活颜色
   * @param {string} inactiveColor - 非激活颜色
   * @param {string} thumbColor - 滑块颜色
   */
  setColors(activeColor, inactiveColor = null, thumbColor = null) {
    this.options.activeColor = activeColor;
    
    if (inactiveColor) {
      this.options.inactiveColor = inactiveColor;
    }
    
    if (thumbColor) {
      this.options.thumbColor = thumbColor;
    }
    
    // 重新应用颜色
    this._applyCustomColors();
    
    return this;
  }

  /**
   * 刷新组件
   */
  refresh() {
    // 重新应用样式
    this._applyCustomColors();
    this._applySizes();
    
    // 更新状态
    this._setCheckedState(this.checked, false);
    
    return this;
  }

  /**
   * 重置组件
   */
  reset() {
    return this.setChecked(this.options.checked);
  }

  /**
   * 获取HTML元素
   * @returns {HTMLElement} 开关元素
   */
  getElement() {
    return this.switchElement;
  }

  /**
   * 获取输入框
   * @returns {HTMLInputElement} 输入框元素
   */
  getInput() {
    return this.inputElement;
  }

  /**
   * 资源释放与清理
   */
  async destroy() {
    try {
      // 移除事件监听
      if (this.inputElement) {
        this.inputElement.removeEventListener('change', this._handleChange.bind(this));
      }
      
      if (this.switchElement) {
        this.switchElement.removeEventListener('click', this._handleClick.bind(this));
        this.switchElement.removeEventListener('keydown', this._handleKeydown.bind(this));
      }
      
      // 移除DOM元素
      if (this.element && this.element.parentNode) {
        this.element.parentNode.removeChild(this.element);
      }
      
      // 清理引用
      this.switchElement = null;
      this.trackElement = null;
      this.thumbElement = null;
      this.labelElement = null;
      this.inputElement = null;
      this.rippleContainer = null;
      this.checkedIconElement = null;
      this.uncheckedIconElement = null;
      
    } catch (error) {
      logger.error('开关组件销毁失败', error);
    }
  }
}

export default Switch;