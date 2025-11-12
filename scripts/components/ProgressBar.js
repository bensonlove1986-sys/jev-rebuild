/**
 * ProgressBar进度条组件
 * 用于展示任务进度、加载状态等，支持多种模式和主题
 */
import BaseComponent from './base-component.js';
import logger from '../modular/logger.js';

class ProgressBar extends BaseComponent {
  constructor(options = {}) {
    super(options);
    
    // 进度条元素引用
    this.progressElement = null;
    this.labelElement = null;
    this.percentageElement = null;
    
    // 动画相关
    this.animationTimer = null;
    this.currentProgress = 0; // 当前显示的百分比
    this.targetProgress = 0; // 目标百分比
    this.animationFrame = null;
    
    // 缓冲进度（buffer模式）
    this.bufferElement = null;
  }

  /**
   * 获取默认配置
   * @private
   */
  _getDefaultOptions() {
    return {
      ...super._getDefaultOptions(),
      progress: 0,
      min: 0,
      max: 100,
      showPercentage: true,
      showLabel: false,
      label: '进度',
      height: '6px',
      color: '#00ff99',
      backgroundColor: '#333',
      animated: true,
      animationDuration: 300,
      onProgressChange: null,
      onComplete: null,
      mode: 'determinate', // determinate, indeterminate, buffer
      theme: 'neon', // neon, default, dark, success, warning, error
      stripe: false,
      animatedStripe: false,
      borderRadius: 3,
      buffer: 0
    };
  }

  /**
   * 获取初始状态
   * @private
   */
  _getInitialState() {
    return {
      ...super._getInitialState(),
      progress: this.options.progress,
      label: this.options.label,
      buffer: this.options.buffer,
      visible: true
    };
  }

  /**
   * 创建DOM元素
   * @private
   */
  _createElement() {
    // 创建进度条容器
    const progressContainer = document.createElement('div');
    progressContainer.className = 'jev-progress-container';
    
    // 添加模式和主题类
    progressContainer.classList.add(`jev-progress-${this.options.mode}`);
    progressContainer.classList.add(`jev-progress-${this.options.theme}`);
    
    // 添加条纹类
    if (this.options.stripe) {
      progressContainer.classList.add('jev-progress-striped');
    }
    
    if (this.options.animatedStripe) {
      progressContainer.classList.add('jev-progress-animated');
    }
    
    // 创建标签元素（如果需要）
    if (this.options.showLabel) {
      this.labelElement = document.createElement('div');
      this.labelElement.className = 'jev-progress-label';
      this.labelElement.textContent = this.options.label;
      progressContainer.appendChild(this.labelElement);
    }
    
    // 创建进度条轨道
    const progressTrack = document.createElement('div');
    progressTrack.className = 'jev-progress-track';
    
    // Buffer模式：创建缓冲元素
    if (this.options.mode === 'buffer') {
      this.bufferElement = document.createElement('div');
      this.bufferElement.className = 'jev-progress-buffer';
      progressTrack.appendChild(this.bufferElement);
    }
    
    // 创建进度条填充
    this.progressElement = document.createElement('div');
    this.progressElement.className = 'jev-progress-bar';
    this.progressElement.style.width = '0%';
    
    // 添加到轨道
    progressTrack.appendChild(this.progressElement);
    
    // 创建百分比显示（如果需要）
    if (this.options.showPercentage) {
      this.percentageElement = document.createElement('div');
      this.percentageElement.className = 'jev-progress-percentage';
      this.percentageElement.textContent = '0%';
    }
    
    // 组装进度条
    progressContainer.appendChild(progressTrack);
    if (this.percentageElement) {
      progressContainer.appendChild(this.percentageElement);
    }
    
    this.element = progressContainer;
  }

  /**
   * 获取主题颜色
   * @private
   */
  _getThemeColors() {
    const themes = {
      neon: {
        background: '#333',
        fill: '#00ff99',
        text: '#00ff99',
        glow: '0 0 8px rgba(0, 255, 153, 0.5)'
      },
      default: {
        background: '#e9ecef',
        fill: '#007bff',
        text: '#6c757d',
        glow: 'none'
      },
      dark: {
        background: '#495057',
        fill: '#adb5bd',
        text: '#e9ecef',
        glow: 'none'
      },
      success: {
        background: 'rgba(0, 255, 153, 0.15)',
        fill: '#00cc66',
        text: '#00cc66',
        glow: '0 0 8px rgba(0, 204, 102, 0.5)'
      },
      warning: {
        background: 'rgba(255, 204, 0, 0.15)',
        fill: '#ffcc00',
        text: '#ffcc00',
        glow: '0 0 8px rgba(255, 204, 0, 0.5)'
      },
      error: {
        background: 'rgba(255, 0, 64, 0.15)',
        fill: '#ff0040',
        text: '#ff0040',
        glow: '0 0 8px rgba(255, 0, 64, 0.5)'
      }
    };
    
    return themes[this.options.theme] || themes.neon;
  }

  /**
   * 应用样式
   * @private
   */
  _applyStyles() {
    // 获取主题颜色
    const colors = this._getThemeColors();
    
    // 添加全局进度条样式
    this._addGlobalStyle('jev-progress-styles', `
      /* 进度条容器样式 */
      .jev-progress-container {
        display: flex;
        flex-direction: column;
        gap: 6px;
        width: 100%;
      }
      
      /* 标签样式 */
      .jev-progress-label {
        font-size: 12px;
        font-weight: 500;
      }
      
      /* 进度条轨道样式 */
      .jev-progress-track {
        position: relative;
        width: 100%;
        background-color: #333;
        border-radius: 3px;
        overflow: hidden;
        box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.3);
      }
      
      /* 进度条填充样式 */
      .jev-progress-bar {
        height: 100%;
        transition: width 0.3s ease;
        position: relative;
        border-radius: 3px;
      }
      
      /* 缓冲条样式 */
      .jev-progress-buffer {
        position: absolute;
        top: 0;
        left: 0;
        height: 100%;
        background-color: rgba(255, 255, 255, 0.1);
        border-radius: 3px;
        transition: width 0.3s ease;
        z-index: 1;
      }
      
      /* 动画效果 */
      .jev-progress-bar::after {
        content: '';
        position: absolute;
        top: 0;
        left: -100%;
        width: 100%;
        height: 100%;
        background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
        animation: jev-progress-shine 1.5s infinite;
      }
      
      @keyframes jev-progress-shine {
        0% { left: -100%; }
        100% { left: 100%; }
      }
      
      /* 条纹样式 */
      .jev-progress-striped .jev-progress-bar {
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
      @keyframes jev-progress-bar-stripe {
        0% { background-position: 1rem 0; }
        100% { background-position: 0 0; }
      }
      
      .jev-progress-animated .jev-progress-bar {
        animation: jev-progress-bar-stripe 1s linear infinite;
      }
      
      /* 不确定模式 */
      .jev-progress-indeterminate .jev-progress-bar {
        position: absolute;
        width: 60%;
        animation: jev-progress-indeterminate 1.4s ease-in-out infinite;
      }
      
      @keyframes jev-progress-indeterminate {
        0% { left: -100%; }
        100% { left: 100%; }
      }
      
      /* 百分比显示样式 */
      .jev-progress-percentage {
        font-size: 11px;
        text-align: right;
        font-weight: bold;
      }
      
      /* 主题样式 - Neon */
      .jev-progress-neon .jev-progress-label,
      .jev-progress-neon .jev-progress-percentage {
        color: #00ff99;
        text-shadow: 0 0 3px rgba(0, 255, 153, 0.5);
      }
      
      .jev-progress-neon .jev-progress-track {
        background-color: #333;
      }
      
      .jev-progress-neon .jev-progress-bar {
        background: linear-gradient(90deg, #00ff99, #00cc88);
        box-shadow: 0 0 8px rgba(0, 255, 153, 0.5);
      }
      
      /* 主题样式 - Default */
      .jev-progress-default .jev-progress-label,
      .jev-progress-default .jev-progress-percentage {
        color: #6c757d;
      }
      
      .jev-progress-default .jev-progress-track {
        background-color: #e9ecef;
      }
      
      .jev-progress-default .jev-progress-bar {
        background: linear-gradient(90deg, #007bff, #0056b3);
        box-shadow: none;
      }
      
      /* 主题样式 - Dark */
      .jev-progress-dark .jev-progress-label,
      .jev-progress-dark .jev-progress-percentage {
        color: #e9ecef;
      }
      
      .jev-progress-dark .jev-progress-track {
        background-color: #495057;
      }
      
      .jev-progress-dark .jev-progress-bar {
        background: linear-gradient(90deg, #adb5bd, #6c757d);
        box-shadow: none;
      }
      
      /* 主题样式 - Success */
      .jev-progress-success .jev-progress-label,
      .jev-progress-success .jev-progress-percentage {
        color: #00cc66;
        text-shadow: 0 0 3px rgba(0, 204, 102, 0.5);
      }
      
      .jev-progress-success .jev-progress-track {
        background-color: rgba(0, 255, 153, 0.15);
      }
      
      .jev-progress-success .jev-progress-bar {
        background: linear-gradient(90deg, #00cc66, #00994d);
        box-shadow: 0 0 8px rgba(0, 204, 102, 0.5);
      }
      
      /* 主题样式 - Warning */
      .jev-progress-warning .jev-progress-label,
      .jev-progress-warning .jev-progress-percentage {
        color: #ffcc00;
        text-shadow: 0 0 3px rgba(255, 204, 0, 0.5);
      }
      
      .jev-progress-warning .jev-progress-track {
        background-color: rgba(255, 204, 0, 0.15);
      }
      
      .jev-progress-warning .jev-progress-bar {
        background: linear-gradient(90deg, #ffcc00, #ff9900);
        box-shadow: 0 0 8px rgba(255, 204, 0, 0.5);
      }
      
      /* 主题样式 - Error */
      .jev-progress-error .jev-progress-label,
      .jev-progress-error .jev-progress-percentage {
        color: #ff0040;
        text-shadow: 0 0 3px rgba(255, 0, 64, 0.5);
      }
      
      .jev-progress-error .jev-progress-track {
        background-color: rgba(255, 0, 64, 0.15);
      }
      
      .jev-progress-error .jev-progress-bar {
        background: linear-gradient(90deg, #ff0040, #cc0033);
        box-shadow: 0 0 8px rgba(255, 0, 64, 0.5);
      }
      
      /* 禁用状态 */
      .jev-component-disabled .jev-progress-bar {
        background: linear-gradient(90deg, #666, #555);
        box-shadow: none;
      }
      
      .jev-component-disabled .jev-progress-bar::after,
      .jev-component-disabled .jev-progress-animated .jev-progress-bar {
        animation: none;
      }
    `);
    
    // 应用基础样式
    if (this.element) {
      // 设置轨道高度
      const trackElement = this.element.querySelector('.jev-progress-track');
      if (trackElement) {
        trackElement.style.height = this.options.height;
        trackElement.style.borderRadius = `${this.options.borderRadius}px`;
      }
      
      // 设置进度条圆角
      if (this.progressElement) {
        this.progressElement.style.borderRadius = `${this.options.borderRadius}px`;
        
        // 如果没有启用动画，移除动画伪元素
        if (!this.options.animated) {
          this.progressElement.style.animation = 'none';
          this.progressElement.style.animationName = 'none';
        }
      }
      
      // 设置缓冲条样式
      if (this.bufferElement) {
        this.bufferElement.style.borderRadius = `${this.options.borderRadius}px`;
      }
    }
    
    // 应用自定义样式
    if (this.options.style && this.element) {
      Object.entries(this.options.style).forEach(([key, value]) => {
        this.element.style[key] = value;
      });
    }
  }

  /**
   * 更新DOM元素
   * @private
   */
  _updateElement() {
    // 计算百分比
    const percentage = this._calculatePercentage(this.state.progress);
    
    // 更新标签
    if (this.labelElement && this.labelElement.textContent !== this.state.label) {
      this.labelElement.textContent = this.state.label;
    }
    
    // 更新进度条
    if (this.progressElement) {
      if (this.options.mode === 'indeterminate') {
        // 不确定模式，不需要设置宽度
        this.progressElement.style.position = 'absolute';
        this.progressElement.style.width = '60%';
      } else {
        // 确定模式或缓冲模式
        this.progressElement.style.position = 'relative';
        if (this.options.animated) {
          this._animateProgress(percentage);
        } else {
          this.progressElement.style.width = `${percentage}%`;
          this.currentProgress = percentage;
        }
      }
    }
    
    // 更新缓冲进度
    if (this.bufferElement && this.options.mode === 'buffer') {
      const bufferPercentage = this._calculatePercentage(this.state.buffer);
      this.bufferElement.style.width = `${bufferPercentage}%`;
    }
    
    // 更新百分比显示
    if (this.percentageElement && this.options.mode !== 'indeterminate') {
      this.percentageElement.textContent = `${Math.round(percentage)}%`;
    }
    
    // 触发进度变化回调
    if (typeof this.options.onProgressChange === 'function') {
      try {
        this.options.onProgressChange(percentage, this);
      } catch (error) {
        logger.error('进度变化事件处理失败', error);
      }
    }
    
    // 检查是否完成
    if (this.options.onComplete && percentage >= 100) {
      try {
        this.options.onComplete();
      } catch (error) {
        logger.error('完成回调执行失败', error);
      }
    }
    
    // 更新可见性
    if (this.state.visible !== undefined) {
      this.element.style.display = this.state.visible ? '' : 'none';
    }
  }

  /**
   * 计算百分比
   * @private
   */
  _calculatePercentage(value) {
    const { min, max } = this.options;
    const clampedValue = Math.max(min, Math.min(max, value));
    return ((clampedValue - min) / (max - min)) * 100;
  }

  /**
   * 动画更新进度
   * @private
   */
  _animateProgress(targetPercentage) {
    if (!this.progressElement) return;
    
    // 清理之前的动画
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
    }
    
    if (this.animationTimer) {
      clearTimeout(this.animationTimer);
    }
    
    this.targetProgress = targetPercentage;
    const startPercentage = this.currentProgress;
    const difference = targetPercentage - startPercentage;
    const duration = this.options.animationDuration;
    const startTime = performance.now();
    
    const animate = (timestamp) => {
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // 如果目标值改变，重新开始动画
      if (this.targetProgress !== targetPercentage) {
        return;
      }
      
      // 使用缓动函数
      const easedProgress = this._easeOutQuad(progress);
      const current = startPercentage + (difference * easedProgress);
      
      this.progressElement.style.width = `${current}%`;
      this.currentProgress = current;
      
      if (progress < 1) {
        this.animationFrame = requestAnimationFrame(animate);
      } else {
        this.currentProgress = targetPercentage;
        this.animationFrame = null;
      }
    };
    
    this.animationFrame = requestAnimationFrame(animate);
  }

  /**
   * 缓动函数 - 二次方缓出
   * @private
   */
  _easeOutQuad(t) {
    return t * (2 - t);
  }

  /**
   * 设置进度
   * @param {number} progress - 进度值
   * @returns {ProgressBar} 进度条实例
   */
  setProgress(progress) {
    // 确保值在有效范围内
    const validProgress = Math.max(this.options.min, Math.min(this.options.max, progress));
    return this.updateState({ progress: validProgress });
  }

  /**
   * 设置标签
   * @param {string} label - 标签文本
   * @returns {ProgressBar} 进度条实例
   */
  setLabel(label) {
    return this.updateState({ label });
  }

  /**
   * 设置缓冲进度
   * @param {number} buffer - 缓冲进度值
   * @returns {ProgressBar} 进度条实例
   */
  setBuffer(buffer) {
    // 确保值在有效范围内
    const validBuffer = Math.max(this.options.min, Math.min(this.options.max, buffer));
    return this.updateState({ buffer: validBuffer });
  }

  /**
   * 增加进度
   * @param {number} amount - 增加的量
   * @returns {ProgressBar} 进度条实例
   */
  increase(amount) {
    return this.setProgress(this.state.progress + amount);
  }

  /**
   * 减少进度
   * @param {number} amount - 减少的量
   * @returns {ProgressBar} 进度条实例
   */
  decrease(amount) {
    return this.setProgress(this.state.progress - amount);
  }

  /**
   * 重置进度
   * @returns {ProgressBar} 进度条实例
   */
  reset() {
    return this.updateState({ 
      progress: this.options.min, 
      buffer: this.options.min 
    });
  }

  /**
   * 设置为完成状态
   * @returns {ProgressBar} 进度条实例
   */
  complete() {
    return this.setProgress(this.options.max);
  }

  /**
   * 获取当前进度百分比
   * @returns {number} 进度百分比
   */
  getPercentage() {
    return this._calculatePercentage(this.state.progress);
  }

  /**
   * 设置进度条模式
   * @param {string} mode - 模式 (determinate, indeterminate, buffer)
   * @returns {ProgressBar} 进度条实例
   */
  setMode(mode) {
    if (!this.element || !['determinate', 'indeterminate', 'buffer'].includes(mode)) {
      return this;
    }
    
    // 移除旧模式类，添加新模式类
    ['determinate', 'indeterminate', 'buffer'].forEach(m => {
      this.element.classList.remove(`jev-progress-${m}`);
    });
    this.element.classList.add(`jev-progress-${mode}`);
    this.options.mode = mode;
    
    // 如果切换到buffer模式且没有缓冲元素，创建它
    if (mode === 'buffer' && !this.bufferElement && this.progressElement) {
      this.bufferElement = document.createElement('div');
      this.bufferElement.className = 'jev-progress-buffer';
      this.bufferElement.style.borderRadius = `${this.options.borderRadius}px`;
      this.progressElement.parentNode.insertBefore(this.bufferElement, this.progressElement);
    }
    
    // 更新显示
    this._updateElement();
    return this;
  }

  /**
   * 设置进度条主题
   * @param {string} theme - 主题
   * @returns {ProgressBar} 进度条实例
   */
  setTheme(theme) {
    if (!this.element) return this;
    
    // 移除旧主题类，添加新主题类
    ['neon', 'default', 'dark', 'success', 'warning', 'error'].forEach(t => {
      this.element.classList.remove(`jev-progress-${t}`);
    });
    this.element.classList.add(`jev-progress-${theme}`);
    this.options.theme = theme;
    
    return this;
  }

  /**
   * 设置条纹样式
   * @param {boolean} stripe - 是否显示条纹
   * @returns {ProgressBar} 进度条实例
   */
  setStripe(stripe) {
    if (!this.element) return this;
    
    this.options.stripe = stripe;
    if (stripe) {
      this.element.classList.add('jev-progress-striped');
    } else {
      this.element.classList.remove('jev-progress-striped');
    }
    return this;
  }

  /**
   * 设置动画条纹
   * @param {boolean} animated - 是否显示动画条纹
   * @returns {ProgressBar} 进度条实例
   */
  setAnimatedStripe(animated) {
    if (!this.element) return this;
    
    this.options.animatedStripe = animated;
    if (animated) {
      this.element.classList.add('jev-progress-animated');
    } else {
      this.element.classList.remove('jev-progress-animated');
    }
    return this;
  }

  /**
   * 设置是否显示百分比
   * @param {boolean} showPercentage - 是否显示百分比
   * @returns {ProgressBar} 进度条实例
   */
  setShowPercentage(showPercentage) {
    this.options.showPercentage = showPercentage;
    
    if (showPercentage && !this.percentageElement) {
      this.percentageElement = document.createElement('div');
      this.percentageElement.className = 'jev-progress-percentage';
      this.percentageElement.textContent = `${Math.round(this.getPercentage())}%`;
      this.element.appendChild(this.percentageElement);
    } else if (!showPercentage && this.percentageElement) {
      this.element.removeChild(this.percentageElement);
      this.percentageElement = null;
    }
    
    return this;
  }

  /**
   * 设置是否显示标签
   * @param {boolean} showLabel - 是否显示标签
   * @returns {ProgressBar} 进度条实例
   */
  setShowLabel(showLabel) {
    this.options.showLabel = showLabel;
    
    if (showLabel && !this.labelElement) {
      this.labelElement = document.createElement('div');
      this.labelElement.className = 'jev-progress-label';
      this.labelElement.textContent = this.state.label;
      this.element.insertBefore(this.labelElement, this.element.firstChild);
    } else if (!showLabel && this.labelElement) {
      this.element.removeChild(this.labelElement);
      this.labelElement = null;
    }
    
    return this;
  }

  /**
   * 设置进度条高度
   * @param {string|number} height - 高度
   * @returns {ProgressBar} 进度条实例
   */
  setHeight(height) {
    this.options.height = typeof height === 'number' ? `${height}px` : height;
    const trackElement = this.element?.querySelector('.jev-progress-track');
    if (trackElement) {
      trackElement.style.height = this.options.height;
    }
    return this;
  }

  /**
   * 设置边框圆角
   * @param {number} borderRadius - 边框圆角
   * @returns {ProgressBar} 进度条实例
   */
  setBorderRadius(borderRadius) {
    this.options.borderRadius = borderRadius;
    const trackElement = this.element?.querySelector('.jev-progress-track');
    if (trackElement) {
      trackElement.style.borderRadius = `${borderRadius}px`;
    }
    if (this.progressElement) {
      this.progressElement.style.borderRadius = `${borderRadius}px`;
    }
    if (this.bufferElement) {
      this.bufferElement.style.borderRadius = `${borderRadius}px`;
    }
    return this;
  }

  /**
   * 显示进度条
   * @returns {ProgressBar} 进度条实例
   */
  show() {
    this.updateState({ visible: true });
    return this;
  }

  /**
   * 隐藏进度条
   * @returns {ProgressBar} 进度条实例
   */
  hide() {
    this.updateState({ visible: false });
    return this;
  }

  /**
   * 切换显示状态
   * @returns {ProgressBar} 进度条实例
   */
  toggle() {
    this.updateState({ visible: !this.state.visible });
    return this;
  }

  /**
   * 获取当前进度信息
   * @returns {Object} 进度信息
   */
  getProgressInfo() {
    return {
      progress: this.state.progress,
      min: this.options.min,
      max: this.options.max,
      percentage: this.getPercentage(),
      buffer: this.state.buffer
    };

  /**
   * 资源释放与清理
   */
  async destroy() {
    try {
      // 清除动画计时器
      if (this.animationTimer) {
        clearInterval(this.animationTimer);
        this.animationTimer = null;
      }
      
      // 清除动画帧
      if (this.animationFrame) {
        cancelAnimationFrame(this.animationFrame);
        this.animationFrame = null;
      }
      
      // 卸载组件
      await this.unmount();
      
      // 重置引用
      this.progressElement = null;
      this.labelElement = null;
      this.percentageElement = null;
      this.bufferElement = null;
      this.currentProgress = 0;
      this.targetProgress = 0;
      
    } catch (error) {
      logger.error('进度条销毁失败', error);
    }
  }
}

export default ProgressBar;