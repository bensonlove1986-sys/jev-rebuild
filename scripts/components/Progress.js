/**
 * Progress进度条组件
 * 提供灵活的进度展示功能，支持线性和圆形进度条
 */
import BaseComponent from './base-component.js';
import logger from '../utils/logger.js';

class Progress extends BaseComponent {
  /**
   * 构造函数
   * @param {Object} options - 配置选项
   * @param {HTMLElement} container - 容器元素
   */
  constructor(options = {}, container = document.body) {
    super(options, container);
    
    // 组件元素引用
    this.progressElement = null;
    this.progressBar = null;
    this.progressContent = null;
    this.progressText = null;
    this.animatedBackground = null;
    
    // 进度条状态
    this.value = 0;
    this.animated = true;
    this.type = 'linear';
  }

  /**
   * 获取默认配置
   * @private
   */
  _getDefaultOptions() {
    return {
      ...super._getDefaultOptions(),
      width: '100%',
      height: '8px',
      value: 0,
      min: 0,
      max: 100,
      type: 'linear', // linear, circular
      theme: 'default', // default, dark, neon, success, warning, error, info
      animated: true,
      animationDuration: 600,
      animationEasing: 'ease',
      showLabel: false,
      labelPosition: 'inside', // inside, outside, top, bottom
      labelFormat: '{{value}}%',
      showPercentage: true,
      showValue: false,
      thickness: '8px',
      strokeLinecap: 'round', // round, square, butt
      backgroundColor: '',
      progressColor: '',
      gradient: false,
      gradientColors: ['#007bff', '#00bcd4'],
      stripe: false,
      indeterminate: false,
      indeterminateDuration: 2000,
      autoHide: false,
      autoHideThreshold: 100,
      onProgressChange: null,
      onComplete: null,
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
      value: this.options.value,
      animated: this.options.animated,
      indeterminate: this.options.indeterminate
    };
  }

  /**
   * 创建DOM元素
   * @private
   */
  _createElement() {
    // 创建主容器
    this.element = document.createElement('div');
    this.element.className = `jev-progress jev-progress-${this.options.theme} jev-progress-${this.options.type}`;
    
    // 设置尺寸
    if (this.options.type === 'linear') {
      this.element.style.width = this.options.width;
      this.element.style.height = this.options.height;
    } else {
      this.element.style.width = this.options.width;
      this.element.style.height = this.options.height || this.options.width;
    }
    
    // 创建进度条元素
    if (this.options.type === 'linear') {
      this._createLinearProgress();
    } else {
      this._createCircularProgress();
    }
    
    // 添加标签容器
    if (this.options.showLabel) {
      this._createLabel();
    }
  }

  /**
   * 创建线性进度条
   * @private
   */
  _createLinearProgress() {
    // 进度条容器
    this.progressElement = document.createElement('div');
    this.progressElement.className = 'jev-progress-container';
    
    // 设置背景
    if (this.options.backgroundColor) {
      this.progressElement.style.backgroundColor = this.options.backgroundColor;
    }
    
    // 进度条
    this.progressBar = document.createElement('div');
    this.progressBar.className = 'jev-progress-bar';
    
    // 设置进度颜色
    if (this.options.progressColor) {
      this.progressBar.style.backgroundColor = this.options.progressColor;
    }
    
    // 添加渐变
    if (this.options.gradient) {
      this._applyGradient();
    }
    
    // 添加条纹
    if (this.options.stripe) {
      this.progressBar.classList.add('jev-progress-bar-striped');
    }
    
    // 不确定模式
    if (this.options.indeterminate) {
      this.progressBar.classList.add('jev-progress-bar-indeterminate');
      this.progressElement.classList.add('jev-progress-indeterminate');
    }
    
    this.progressElement.appendChild(this.progressBar);
    this.element.appendChild(this.progressElement);
  }

  /**
   * 创建圆形进度条
   * @private
   */
  _createCircularProgress() {
    // 圆形容器
    this.progressElement = document.createElement('div');
    this.progressElement.className = 'jev-progress-circular';
    
    // SVG容器
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.className = 'jev-progress-svg';
    
    // 计算尺寸
    const size = Math.min(this.element.clientWidth, this.element.clientHeight);
    svg.setAttribute('width', size);
    svg.setAttribute('height', size);
    
    // 中心位置
    const center = size / 2;
    // 半径（减去线条粗细的一半）
    const thickness = this._parseThickness(this.options.thickness);
    const radius = center - thickness / 2;
    
    // 背景圆
    const bgCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    bgCircle.className = 'jev-progress-circle-bg';
    bgCircle.setAttribute('cx', center);
    bgCircle.setAttribute('cy', center);
    bgCircle.setAttribute('r', radius);
    bgCircle.setAttribute('stroke-width', thickness);
    bgCircle.setAttribute('fill', 'none');
    
    if (this.options.backgroundColor) {
      bgCircle.setAttribute('stroke', this.options.backgroundColor);
    }
    
    // 进度圆
    this.progressBar = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    this.progressBar.className = 'jev-progress-circle';
    this.progressBar.setAttribute('cx', center);
    this.progressBar.setAttribute('cy', center);
    this.progressBar.setAttribute('r', radius);
    this.progressBar.setAttribute('stroke-width', thickness);
    this.progressBar.setAttribute('fill', 'none');
    this.progressBar.setAttribute('stroke-linecap', this.options.strokeLinecap);
    this.progressBar.setAttribute('transform', `rotate(-90 ${center} ${center})`);
    
    // 计算周长
    this.circumference = 2 * Math.PI * radius;
    this.progressBar.setAttribute('stroke-dasharray', this.circumference);
    this.progressBar.setAttribute('stroke-dashoffset', this.circumference);
    
    if (this.options.progressColor) {
      this.progressBar.setAttribute('stroke', this.options.progressColor);
    }
    
    // 添加渐变
    if (this.options.gradient) {
      this._applyCircularGradient(svg, size, center, radius);
    }
    
    svg.appendChild(bgCircle);
    svg.appendChild(this.progressBar);
    this.progressElement.appendChild(svg);
    
    // 内容容器
    this.progressContent = document.createElement('div');
    this.progressContent.className = 'jev-progress-content';
    this.progressElement.appendChild(this.progressContent);
    
    this.element.appendChild(this.progressElement);
  }

  /**
   * 创建标签
   * @private
   */
  _createLabel() {
    this.progressText = document.createElement('div');
    this.progressText.className = `jev-progress-label jev-progress-label-${this.options.labelPosition}`;
    this.element.appendChild(this.progressText);
  }

  /**
   * 应用渐变
   * @private
   */
  _applyGradient() {
    if (!this.progressBar) return;
    
    // 生成唯一ID
    const gradientId = `jev-gradient-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // 创建渐变元素
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    const linearGradient = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
    linearGradient.setAttribute('id', gradientId);
    
    // 添加渐变停止点
    this.options.gradientColors.forEach((color, index) => {
      const stop = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
      stop.setAttribute('offset', `${(index / (this.options.gradientColors.length - 1)) * 100}%`);
      stop.setAttribute('stop-color', color);
      linearGradient.appendChild(stop);
    });
    
    defs.appendChild(linearGradient);
    
    // 创建SVG
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '100%');
    svg.appendChild(defs);
    
    // 创建矩形
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('width', '100%');
    rect.setAttribute('height', '100%');
    rect.setAttribute('fill', `url(#${gradientId})`);
    svg.appendChild(rect);
    
    // 设置背景为渐变SVG
    this.progressBar.style.background = `url("data:image/svg+xml,${encodeURIComponent(new XMLSerializer().serializeToString(svg))}")`;
  }

  /**
   * 应用圆形渐变
   * @private
   */
  _applyCircularGradient(svg, size, center, radius) {
    // 生成唯一ID
    const gradientId = `jev-circular-gradient-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // 创建渐变元素
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    const linearGradient = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
    linearGradient.setAttribute('id', gradientId);
    linearGradient.setAttribute('x1', '0%');
    linearGradient.setAttribute('y1', '0%');
    linearGradient.setAttribute('x2', '100%');
    linearGradient.setAttribute('y2', '0%');
    
    // 添加渐变停止点
    this.options.gradientColors.forEach((color, index) => {
      const stop = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
      stop.setAttribute('offset', `${(index / (this.options.gradientColors.length - 1)) * 100}%`);
      stop.setAttribute('stop-color', color);
      linearGradient.appendChild(stop);
    });
    
    defs.appendChild(linearGradient);
    svg.appendChild(defs);
    
    // 设置进度圆使用渐变
    this.progressBar.setAttribute('stroke', `url(#${gradientId})`);
  }

  /**
   * 应用样式
   * @private
   */
  _applyStyles() {
    // 添加全局样式
    this._addGlobalStyles();
    
    // 设置初始值
    this.value = this.options.value;
    this.animated = this.options.animated;
    this.type = this.options.type;
    
    // 设置初始进度
    this.setValue(this.value, false);
    
    // 触发初始化回调
    if (typeof this.options.onInit === 'function') {
      try {
        this.options.onInit();
      } catch (error) {
        logger.error('进度条初始化回调执行失败', error);
      }
    }
  }

  /**
   * 添加全局样式
   * @private
   */
  _addGlobalStyles() {
    const styleId = 'jev-progress-styles';
    if (document.getElementById(styleId)) {
      return;
    }
    
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      /* 进度条容器 */
      .jev-progress {
        position: relative;
        display: inline-block;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      }
      
      /* 主题样式 - 默认 */
      .jev-progress-default .jev-progress-container {
        background-color: #e2e8f0;
      }
      
      .jev-progress-default .jev-progress-bar {
        background-color: #007bff;
      }
      
      .jev-progress-default .jev-progress-circle-bg {
        stroke: #e2e8f0;
      }
      
      .jev-progress-default .jev-progress-circle {
        stroke: #007bff;
      }
      
      /* 主题样式 - 深色 */
      .jev-progress-dark .jev-progress-container {
        background-color: #4a5568;
      }
      
      .jev-progress-dark .jev-progress-bar {
        background-color: #38b2ac;
      }
      
      .jev-progress-dark .jev-progress-circle-bg {
        stroke: #4a5568;
      }
      
      .jev-progress-dark .jev-progress-circle {
        stroke: #38b2ac;
      }
      
      /* 主题样式 - 霓虹灯 */
      .jev-progress-neon .jev-progress-container {
        background-color: rgba(0, 255, 153, 0.2);
      }
      
      .jev-progress-neon .jev-progress-bar {
        background-color: #00ff99;
        box-shadow: 0 0 10px rgba(0, 255, 153, 0.5);
      }
      
      .jev-progress-neon .jev-progress-circle-bg {
        stroke: rgba(0, 255, 153, 0.2);
      }
      
      .jev-progress-neon .jev-progress-circle {
        stroke: #00ff99;
        filter: drop-shadow(0 0 5px rgba(0, 255, 153, 0.5));
      }
      
      /* 主题样式 - 成功 */
      .jev-progress-success .jev-progress-container {
        background-color: #c6f6d5;
      }
      
      .jev-progress-success .jev-progress-bar {
        background-color: #38a169;
      }
      
      .jev-progress-success .jev-progress-circle-bg {
        stroke: #c6f6d5;
      }
      
      .jev-progress-success .jev-progress-circle {
        stroke: #38a169;
      }
      
      /* 主题样式 - 警告 */
      .jev-progress-warning .jev-progress-container {
        background-color: #fed7d7;
      }
      
      .jev-progress-warning .jev-progress-bar {
        background-color: #dd6b20;
      }
      
      .jev-progress-warning .jev-progress-circle-bg {
        stroke: #fed7d7;
      }
      
      .jev-progress-warning .jev-progress-circle {
        stroke: #dd6b20;
      }
      
      /* 主题样式 - 错误 */
      .jev-progress-error .jev-progress-container {
        background-color: #fed7d7;
      }
      
      .jev-progress-error .jev-progress-bar {
        background-color: #e53e3e;
      }
      
      .jev-progress-error .jev-progress-circle-bg {
        stroke: #fed7d7;
      }
      
      .jev-progress-error .jev-progress-circle {
        stroke: #e53e3e;
      }
      
      /* 主题样式 - 信息 */
      .jev-progress-info .jev-progress-container {
        background-color: #bee3f8;
      }
      
      .jev-progress-info .jev-progress-bar {
        background-color: #3182ce;
      }
      
      .jev-progress-info .jev-progress-circle-bg {
        stroke: #bee3f8;
      }
      
      .jev-progress-info .jev-progress-circle {
        stroke: #3182ce;
      }
      
      /* 线性进度条 */
      .jev-progress-linear {
        width: 100%;
      }
      
      .jev-progress-linear .jev-progress-container {
        position: relative;
        height: 100%;
        border-radius: 4px;
        overflow: hidden;
      }
      
      .jev-progress-linear .jev-progress-bar {
        position: absolute;
        left: 0;
        top: 0;
        height: 100%;
        width: 0%;
        transition: width 0.6s ease;
        border-radius: 4px;
      }
      
      /* 条纹样式 */
      .jev-progress-bar-striped {
        background-image: linear-gradient(
          45deg,
          rgba(255, 255, 255, 0.15) 25%,
          transparent 25%,
          transparent 50%,
          rgba(255, 255, 255, 0.15) 50%,
          rgba(255, 255, 255, 0.15) 75%,
          transparent 75%,
          transparent
        );
        background-size: 1rem 1rem;
      }
      
      /* 动画条纹 */
      .jev-progress-bar-striped.animate {
        animation: jev-progress-stripes 1s linear infinite;
      }
      
      /* 不确定模式 */
      .jev-progress-indeterminate .jev-progress-bar {
        width: 50%;
        animation: jev-progress-indeterminate 1.5s ease-in-out infinite;
      }
      
      /* 圆形进度条 */
      .jev-progress-circular {
        position: relative;
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }
      
      .jev-progress-svg {
        transform: rotate(-90deg);
      }
      
      .jev-progress-circle-bg,
      .jev-progress-circle {
        transition: stroke-dashoffset 0.6s ease;
      }
      
      .jev-progress-content {
        position: absolute;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 100%;
        height: 100%;
      }
      
      /* 标签样式 */
      .jev-progress-label {
        font-size: 14px;
        color: inherit;
        text-align: center;
        user-select: none;
      }
      
      .jev-progress-label-inside {
        position: absolute;
        top: 50%;
        left: 0;
        right: 0;
        transform: translateY(-50%);
        color: white;
        text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
        pointer-events: none;
      }
      
      .jev-progress-label-outside {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        color: inherit;
        pointer-events: none;
      }
      
      .jev-progress-label-top {
        margin-bottom: 8px;
      }
      
      .jev-progress-label-bottom {
        margin-top: 8px;
      }
      
      /* 动画定义 */
      @keyframes jev-progress-stripes {
        0% {
          background-position: 1rem 0;
        }
        100% {
          background-position: 0 0;
        }
      }
      
      @keyframes jev-progress-indeterminate {
        0% {
          left: -50%;
        }
        50% {
          left: 100%;
        }
        100% {
          left: -50%;
        }
      }
      
      /* 响应式设计 */
      @media (max-width: 768px) {
        .jev-progress-label {
          font-size: 12px;
        }
        
        .jev-progress-label-inside {
          font-size: 11px;
        }
      }
      
      @media (max-width: 480px) {
        .jev-progress-label {
          font-size: 11px;
        }
        
        .jev-progress-label-inside {
          font-size: 10px;
        }
      }
    `;
    
    document.head.appendChild(style);
  }

  /**
   * 解析粗细值
   * @private
   */
  _parseThickness(thickness) {
    if (typeof thickness === 'number') {
      return thickness;
    }
    
    if (typeof thickness === 'string') {
      // 移除px单位
      const num = parseFloat(thickness.replace('px', ''));
      return isNaN(num) ? 8 : num;
    }
    
    return 8;
  }

  /**
   * 格式化标签文本
   * @private
   */
  _formatLabel(value) {
    const percentage = this._calculatePercentage(value);
    const labelValue = this.options.showPercentage ? percentage : value;
    
    return this.options.labelFormat
      .replace('{{value}}', labelValue.toFixed(this.options.showPercentage ? 0 : 2))
      .replace('{{percent}}', percentage.toFixed(0))
      .replace('{{raw}}', value.toFixed(2));
  }

  /**
   * 计算百分比
   * @private
   */
  _calculatePercentage(value) {
    const clampedValue = Math.max(this.options.min, Math.min(this.options.max, value));
    return ((clampedValue - this.options.min) / (this.options.max - this.options.min)) * 100;
  }

  /**
   * 设置进度值
   * @param {number} value - 进度值
   * @param {boolean} animated - 是否动画
   */
  setValue(value, animated = undefined) {
    const newValue = Math.max(this.options.min, Math.min(this.options.max, value));
    const shouldAnimate = animated !== undefined ? animated : this.animated && !this.options.indeterminate;
    
    // 存储旧值
    const oldValue = this.value;
    
    // 更新值
    this.value = newValue;
    this.updateState({ value: newValue });
    
    // 触发进度变化回调
    if (typeof this.options.onProgressChange === 'function' && oldValue !== newValue) {
      try {
        this.options.onProgressChange(newValue, this._calculatePercentage(newValue), oldValue);
      } catch (error) {
        logger.error('进度变化回调执行失败', error);
      }
    }
    
    // 处理自动隐藏
    if (this.options.autoHide && newValue >= this.options.autoHideThreshold && this.options.autoHideThreshold <= this.options.max) {
      setTimeout(() => {
        this.hide();
      }, 500);
    }
    
    // 触发完成回调
    if (typeof this.options.onComplete === 'function' && newValue >= this.options.max && oldValue < this.options.max) {
      try {
        this.options.onComplete();
      } catch (error) {
        logger.error('完成回调执行失败', error);
      }
    }
    
    // 更新显示
    this._updateProgressDisplay(shouldAnimate);
    
    // 更新标签
    if (this.options.showLabel) {
      this._updateLabel();
    }
    
    return this;
  }

  /**
   * 更新进度显示
   * @private
   */
  _updateProgressDisplay(animated = true) {
    if (!this.progressBar) return;
    
    const percentage = this._calculatePercentage(this.value);
    
    if (this.options.type === 'linear') {
      // 设置线性进度条宽度
      const width = `${percentage}%`;
      
      if (animated) {
        // 应用动画
        this.progressBar.style.transition = `width ${this.options.animationDuration}ms ${this.options.animationEasing}`;
      } else {
        // 无动画
        this.progressBar.style.transition = 'none';
      }
      
      this.progressBar.style.width = width;
    } else if (this.options.type === 'circular' && this.circumference) {
      // 设置圆形进度条
      const offset = this.circumference - (percentage / 100) * this.circumference;
      
      if (animated) {
        // 应用动画
        this.progressBar.style.transition = `stroke-dashoffset ${this.options.animationDuration}ms ${this.options.animationEasing}`;
      } else {
        // 无动画
        this.progressBar.style.transition = 'none';
      }
      
      this.progressBar.setAttribute('stroke-dashoffset', offset);
    }
  }

  /**
   * 更新标签
   * @private
   */
  _updateLabel() {
    if (!this.progressText) return;
    
    // 更新标签文本
    this.progressText.textContent = this._formatLabel(this.value);
    
    // 对于线性进度条，在内部标签情况下，根据进度位置调整文本位置
    if (this.options.type === 'linear' && this.options.labelPosition === 'inside') {
      const percentage = this._calculatePercentage(this.value);
      
      // 如果进度太满，将文本移到左侧
      if (percentage > 80) {
        this.progressText.style.right = '10px';
        this.progressText.style.left = 'auto';
      } else {
        this.progressText.style.left = '10px';
        this.progressText.style.right = 'auto';
      }
    }
  }

  /**
   * 获取当前值
   * @returns {number} 当前值
   */
  getValue() {
    return this.value;
  }

  /**
   * 获取百分比
   * @returns {number} 百分比
   */
  getPercentage() {
    return this._calculatePercentage(this.value);
  }

  /**
   * 增加进度值
   * @param {number} increment - 增加值
   */
  increment(increment = 1) {
    const newValue = this.value + increment;
    this.setValue(newValue);
    return this;
  }

  /**
   * 减少进度值
   * @param {number} decrement - 减少值
   */
  decrement(decrement = 1) {
    const newValue = this.value - decrement;
    this.setValue(newValue);
    return this;
  }

  /**
   * 重置进度条
   */
  reset() {
    this.setValue(this.options.min);
    return this;
  }

  /**
   * 设置为最大值
   */
  complete() {
    this.setValue(this.options.max);
    return this;
  }

  /**
   * 设置主题
   * @param {string} theme - 主题名称
   */
  setTheme(theme) {
    this.element.classList.remove(`jev-progress-${this.options.theme}`);
    this.element.classList.add(`jev-progress-${theme}`);
    this.options.theme = theme;
    return this;
  }

  /**
   * 设置最小值
   * @param {number} min - 最小值
   */
  setMin(min) {
    this.options.min = min;
    // 重新计算进度
    this.setValue(this.value);
    return this;
  }

  /**
   * 设置最大值
   * @param {number} max - 最大值
   */
  setMax(max) {
    this.options.max = max;
    // 重新计算进度
    this.setValue(this.value);
    return this;
  }

  /**
   * 启用/禁用动画
   * @param {boolean} animated - 是否启用动画
   */
  setAnimated(animated) {
    this.animated = animated;
    this.updateState({ animated });
    
    if (this.progressBar) {
      if (this.options.stripe && animated) {
        this.progressBar.classList.add('animate');
      } else {
        this.progressBar.classList.remove('animate');
      }
    }
    
    return this;
  }

  /**
   * 设置为不确定模式
   * @param {boolean} indeterminate - 是否不确定
   */
  setIndeterminate(indeterminate) {
    this.options.indeterminate = indeterminate;
    this.updateState({ indeterminate });
    
    if (this.progressElement && this.progressBar) {
      if (indeterminate) {
        this.progressElement.classList.add('jev-progress-indeterminate');
        this.progressBar.classList.add('jev-progress-bar-indeterminate');
      } else {
        this.progressElement.classList.remove('jev-progress-indeterminate');
        this.progressBar.classList.remove('jev-progress-bar-indeterminate');
      }
      
      // 重新更新进度显示
      this._updateProgressDisplay();
    }
    
    return this;
  }

  /**
   * 设置条纹
   * @param {boolean} stripe - 是否显示条纹
   */
  setStripe(stripe) {
    this.options.stripe = stripe;
    
    if (this.progressBar) {
      if (stripe) {
        this.progressBar.classList.add('jev-progress-bar-striped');
        if (this.animated) {
          this.progressBar.classList.add('animate');
        }
      } else {
        this.progressBar.classList.remove('jev-progress-bar-striped');
        this.progressBar.classList.remove('animate');
      }
    }
    
    return this;
  }

  /**
   * 设置渐变
   * @param {boolean} gradient - 是否启用渐变
   * @param {Array} colors - 渐变颜色
   */
  setGradient(gradient, colors = null) {
    this.options.gradient = gradient;
    
    if (colors) {
      this.options.gradientColors = colors;
    }
    
    // 重新应用渐变
    if (this.progressBar) {
      if (gradient) {
        if (this.options.type === 'linear') {
          this._applyGradient();
        } else if (this.options.type === 'circular') {
          const size = Math.min(this.element.clientWidth, this.element.clientHeight);
          const center = size / 2;
          const thickness = this._parseThickness(this.options.thickness);
          const radius = center - thickness / 2;
          
          const svg = this.progressBar.closest('svg');
          if (svg) {
            this._applyCircularGradient(svg, size, center, radius);
          }
        }
      } else if (this.options.progressColor) {
        // 恢复到纯色
        if (this.options.type === 'linear') {
          this.progressBar.style.backgroundColor = this.options.progressColor;
        } else if (this.options.type === 'circular') {
          this.progressBar.setAttribute('stroke', this.options.progressColor);
        }
      }
    }
    
    return this;
  }

  /**
   * 设置颜色
   * @param {string} backgroundColor - 背景颜色
   * @param {string} progressColor - 进度颜色
   */
  setColors(backgroundColor, progressColor) {
    if (backgroundColor) {
      this.options.backgroundColor = backgroundColor;
      
      if (this.progressElement) {
        if (this.options.type === 'linear') {
          this.progressElement.style.backgroundColor = backgroundColor;
        } else if (this.options.type === 'circular') {
          const bgCircle = this.progressElement.querySelector('.jev-progress-circle-bg');
          if (bgCircle) {
            bgCircle.setAttribute('stroke', backgroundColor);
          }
        }
      }
    }
    
    if (progressColor) {
      this.options.progressColor = progressColor;
      
      if (this.progressBar && !this.options.gradient) {
        if (this.options.type === 'linear') {
          this.progressBar.style.backgroundColor = progressColor;
        } else if (this.options.type === 'circular') {
          this.progressBar.setAttribute('stroke', progressColor);
        }
      }
    }
    
    return this;
  }

  /**
   * 设置标签
   * @param {boolean} show - 是否显示标签
   * @param {string} position - 标签位置
   * @param {string} format - 标签格式
   */
  setLabel(show, position = null, format = null) {
    this.options.showLabel = show;
    
    if (position) {
      this.options.labelPosition = position;
    }
    
    if (format) {
      this.options.labelFormat = format;
    }
    
    // 如果需要显示标签但还没有创建
    if (show && !this.progressText) {
      this._createLabel();
      this._updateLabel();
    } 
    // 如果不需要显示标签但已存在
    else if (!show && this.progressText && this.progressText.parentNode === this.element) {
      this.element.removeChild(this.progressText);
      this.progressText = null;
    } 
    // 如果已经显示标签，更新其样式和内容
    else if (show && this.progressText) {
      this.progressText.className = `jev-progress-label jev-progress-label-${this.options.labelPosition}`;
      this._updateLabel();
    }
    
    return this;
  }

  /**
   * 设置圆形进度条粗细
   * @param {string|number} thickness - 粗细
   */
  setThickness(thickness) {
    if (this.options.type === 'circular') {
      this.options.thickness = thickness;
      
      // 重新计算和更新圆形进度条
      const size = Math.min(this.element.clientWidth, this.element.clientHeight);
      const center = size / 2;
      const newThickness = this._parseThickness(thickness);
      const newRadius = center - newThickness / 2;
      
      // 更新背景圆和进度圆
      const bgCircle = this.progressElement.querySelector('.jev-progress-circle-bg');
      if (bgCircle) {
        bgCircle.setAttribute('r', newRadius);
        bgCircle.setAttribute('stroke-width', newThickness);
      }
      
      if (this.progressBar) {
        this.progressBar.setAttribute('r', newRadius);
        this.progressBar.setAttribute('stroke-width', newThickness);
        
        // 重新计算周长
        this.circumference = 2 * Math.PI * newRadius;
        this.progressBar.setAttribute('stroke-dasharray', this.circumference);
        
        // 重新设置进度
        const percentage = this._calculatePercentage(this.value);
        const offset = this.circumference - (percentage / 100) * this.circumference;
        this.progressBar.setAttribute('stroke-dashoffset', offset);
      }
    }
    
    return this;
  }

  /**
   * 显示进度条
   */
  show() {
    this.element.style.display = '';
    return this;
  }

  /**
   * 隐藏进度条
   */
  hide() {
    this.element.style.display = 'none';
    return this;
  }

  /**
   * 切换显示/隐藏
   */
  toggle() {
    if (this.element.style.display === 'none') {
      this.show();
    } else {
      this.hide();
    }
    return this;
  }

  /**
   * 设置尺寸
   * @param {string|number} width - 宽度
   * @param {string|number} height - 高度
   */
  setSize(width, height = null) {
    this.options.width = width;
    
    if (height) {
      this.options.height = height;
    }
    
    // 更新元素尺寸
    this.element.style.width = width;
    
    if (this.options.type === 'linear') {
      this.element.style.height = height || this.options.height;
    } else {
      this.element.style.height = height || width;
    }
    
    // 如果是圆形进度条，需要重新计算和更新
    if (this.options.type === 'circular' && this.progressElement) {
      this._recalculateCircularDimensions();
    }
    
    return this;
  }

  /**
   * 重新计算圆形尺寸
   * @private
   */
  _recalculateCircularDimensions() {
    const size = Math.min(this.element.clientWidth, this.element.clientHeight);
    
    const svg = this.progressElement.querySelector('.jev-progress-svg');
    if (svg) {
      svg.setAttribute('width', size);
      svg.setAttribute('height', size);
    }
    
    // 重新计算其他尺寸
    this._createCircularProgress();
    this._updateProgressDisplay(false);
  }

  /**
   * 监听窗口大小变化
   * @param {boolean} listen - 是否监听
   */
  listenResize(listen = true) {
    if (listen && !this.resizeListener) {
      this.resizeListener = () => {
        if (this.options.type === 'circular') {
          this._recalculateCircularDimensions();
        }
      };
      window.addEventListener('resize', this.resizeListener);
    } else if (!listen && this.resizeListener) {
      window.removeEventListener('resize', this.resizeListener);
      this.resizeListener = null;
    }
    
    return this;
  }

  /**
   * 资源释放与清理
   */
  async destroy() {
    try {
      // 移除事件监听
      if (this.resizeListener) {
        window.removeEventListener('resize', this.resizeListener);
      }
      
      // 移除DOM元素
      if (this.element && this.element.parentNode) {
        this.element.parentNode.removeChild(this.element);
      }
      
      // 清理引用
      this.progressElement = null;
      this.progressBar = null;
      this.progressContent = null;
      this.progressText = null;
      this.animatedBackground = null;
      this.resizeListener = null;
      
    } catch (error) {
      logger.error('进度条组件销毁失败', error);
    }
  }
}

export default Progress;