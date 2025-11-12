/**
 * Tooltip提示框组件
 * 提供灵活的提示功能，支持多种位置、样式和交互方式
 */
import BaseComponent from './base-component.js';
import logger from '../utils/logger.js';

class Tooltip extends BaseComponent {
  /**
   * 构造函数
   * @param {Object} options - 配置选项
   * @param {HTMLElement} container - 容器元素
   */
  constructor(options = {}, container = document.body) {
    super(options, container);
    
    // 组件元素引用
    this.tooltipElement = null;
    this.targetElement = null;
    
    // 状态管理
    this.isVisible = false;
    this.isActive = false;
    this.isAnimating = false;
    this.position = null;
    this.shownTimer = null;
    this.hiddenTimer = null;
    
    // DOM操作引用
    this.resizeObserver = null;
    this.observer = null;
  }

  /**
   * 获取默认配置
   * @private
   */
  _getDefaultOptions() {
    return {
      ...super._getDefaultOptions(),
      target: null,
      content: '',
      position: 'top', // top, bottom, left, right, top-start, top-end, bottom-start, bottom-end, left-start, left-end, right-start, right-end, auto
      autoPosition: true,
      margin: 8,
      zIndex: 1000,
      animation: true,
      animationType: 'fade', // fade, slide, scale, bounce
      animationDuration: 200,
      showDelay: 0,
      hideDelay: 100,
      trigger: 'hover', // hover, click, focus, manual
      closeOnClickOutside: true,
      closeOnEscape: true,
      persistent: false,
      interactive: false,
      theme: 'default', // default, dark, neon, success, warning, error, info
      maxWidth: '300px',
      arrow: true,
      arrowSize: 8,
      arrowPosition: 'center', // center, start, end
      bordered: true,
      borderRadius: '4px',
      shadow: true,
      shadowLevel: 3,
      backdropFilter: false,
      backdropOpacity: 0.8,
      offsetX: 0,
      offsetY: 0,
      className: '',
      responsive: true,
      constrainToWindow: true,
      constrainToScrollParent: false,
      viewportPadding: 10,
      touchDelay: 0,
      mouseEnterDelay: 0,
      mouseLeaveDelay: 100,
      onShow: null,
      onHide: null,
      onBeforeShow: null,
      onBeforeHide: null,
      onPositionChange: null,
      onTrigger: null,
      onClose: null,
      onInit: null,
      onUpdate: null
    };
  }

  /**
   * 获取初始状态
   * @private
   */
  _getInitialState() {
    return {
      ...super._getInitialState(),
      isVisible: false,
      isActive: false,
      isAnimating: false
    };
  }

  /**
   * 创建DOM元素
   * @private
   */
  _createElement() {
    // 验证目标元素
    if (!this.options.target) {
      logger.error('Tooltip必须指定target元素');
      return;
    }
    
    // 设置目标元素
    if (typeof this.options.target === 'string') {
      this.targetElement = document.querySelector(this.options.target);
      if (!this.targetElement) {
        logger.error(`找不到目标元素: ${this.options.target}`);
        return;
      }
    } else if (this.options.target instanceof HTMLElement) {
      this.targetElement = this.options.target;
    }
    
    // 创建tooltip元素
    this.tooltipElement = document.createElement('div');
    this.tooltipElement.className = `jev-tooltip jev-tooltip-${this.options.theme}`;
    this.tooltipElement.style.display = 'none';
    this.tooltipElement.style.maxWidth = this.options.maxWidth;
    this.tooltipElement.style.zIndex = this.options.zIndex;
    this.tooltipElement.setAttribute('role', 'tooltip');
    this.tooltipElement.setAttribute('aria-hidden', 'true');
    
    // 添加自定义类
    if (this.options.className) {
      this.tooltipElement.classList.add(...this.options.className.split(' '));
    }
    
    // 添加箭头
    if (this.options.arrow) {
      const arrowElement = document.createElement('div');
      arrowElement.className = 'jev-tooltip-arrow';
      this.tooltipElement.appendChild(arrowElement);
    }
    
    // 创建内容容器
    const contentElement = document.createElement('div');
    contentElement.className = 'jev-tooltip-content';
    
    // 设置内容
    if (typeof this.options.content === 'string') {
      contentElement.innerHTML = this.options.content;
    } else if (this.options.content instanceof HTMLElement) {
      contentElement.appendChild(this.options.content);
    }
    
    this.tooltipElement.appendChild(contentElement);
    
    // 添加边框和圆角
    if (this.options.bordered) {
      this.tooltipElement.classList.add('jev-tooltip-bordered');
    }
    
    if (this.options.borderRadius) {
      this.tooltipElement.style.borderRadius = this.options.borderRadius;
    }
    
    // 添加阴影
    if (this.options.shadow) {
      this.tooltipElement.classList.add(`jev-tooltip-shadow-${this.options.shadowLevel}`);
    }
    
    // 添加到容器
    this.container.appendChild(this.tooltipElement);
  }

  /**
   * 应用样式
   * @private
   */
  _applyStyles() {
    // 添加全局样式
    this._addGlobalStyles();
    
    // 绑定事件
    this._bindEvents();
    
    // 设置初始属性
    this.targetElement.setAttribute('aria-describedby', this.tooltipElement.id || '');
    
    // 创建唯一ID
    if (!this.tooltipElement.id) {
      this.tooltipElement.id = `jev-tooltip-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    }
    
    // 触发初始化回调
    if (typeof this.options.onInit === 'function') {
      try {
        this.options.onInit();
      } catch (error) {
        logger.error('Tooltip初始化回调执行失败', error);
      }
    }
  }

  /**
   * 添加全局样式
   * @private
   */
  _addGlobalStyles() {
    const styleId = 'jev-tooltip-styles';
    if (document.getElementById(styleId)) {
      return;
    }
    
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      /* Tooltip容器 */
      .jev-tooltip {
        position: absolute;
        background-color: #333;
        color: white;
        padding: 8px 12px;
        font-size: 14px;
        line-height: 1.4;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        pointer-events: none;
        box-sizing: border-box;
      }
      
      /* 启用交互时 */
      .jev-tooltip.jev-tooltip-interactive {
        pointer-events: auto;
      }
      
      /* 箭头样式 */
      .jev-tooltip-arrow {
        position: absolute;
        width: 0;
        height: 0;
        border-style: solid;
        pointer-events: none;
      }
      
      /* 顶部位置箭头 */
      .jev-tooltip-top .jev-tooltip-arrow {
        bottom: -8px;
        left: 50%;
        transform: translateX(-50%);
        border-width: 8px 8px 0;
        border-color: #333 transparent transparent;
      }
      
      /* 底部位置箭头 */
      .jev-tooltip-bottom .jev-tooltip-arrow {
        top: -8px;
        left: 50%;
        transform: translateX(-50%);
        border-width: 0 8px 8px;
        border-color: transparent transparent #333;
      }
      
      /* 左侧位置箭头 */
      .jev-tooltip-left .jev-tooltip-arrow {
        right: -8px;
        top: 50%;
        transform: translateY(-50%);
        border-width: 8px 0 8px 8px;
        border-color: transparent transparent transparent #333;
      }
      
      /* 右侧位置箭头 */
      .jev-tooltip-right .jev-tooltip-arrow {
        left: -8px;
        top: 50%;
        transform: translateY(-50%);
        border-width: 8px 8px 8px 0;
        border-color: transparent #333 transparent transparent;
      }
      
      /* 顶部起始位置 */
      .jev-tooltip-top-start .jev-tooltip-arrow {
        bottom: -8px;
        left: 20px;
        border-width: 8px 8px 0;
        border-color: #333 transparent transparent;
      }
      
      /* 顶部结束位置 */
      .jev-tooltip-top-end .jev-tooltip-arrow {
        bottom: -8px;
        right: 20px;
        border-width: 8px 8px 0;
        border-color: #333 transparent transparent;
      }
      
      /* 底部起始位置 */
      .jev-tooltip-bottom-start .jev-tooltip-arrow {
        top: -8px;
        left: 20px;
        border-width: 0 8px 8px;
        border-color: transparent transparent #333;
      }
      
      /* 底部结束位置 */
      .jev-tooltip-bottom-end .jev-tooltip-arrow {
        top: -8px;
        right: 20px;
        border-width: 0 8px 8px;
        border-color: transparent transparent #333;
      }
      
      /* 左侧起始位置 */
      .jev-tooltip-left-start .jev-tooltip-arrow {
        right: -8px;
        top: 20px;
        border-width: 8px 0 8px 8px;
        border-color: transparent transparent transparent #333;
      }
      
      /* 左侧结束位置 */
      .jev-tooltip-left-end .jev-tooltip-arrow {
        right: -8px;
        bottom: 20px;
        border-width: 8px 0 8px 8px;
        border-color: transparent transparent transparent #333;
      }
      
      /* 右侧起始位置 */
      .jev-tooltip-right-start .jev-tooltip-arrow {
        left: -8px;
        top: 20px;
        border-width: 8px 8px 8px 0;
        border-color: transparent #333 transparent transparent;
      }
      
      /* 右侧结束位置 */
      .jev-tooltip-right-end .jev-tooltip-arrow {
        left: -8px;
        bottom: 20px;
        border-width: 8px 8px 8px 0;
        border-color: transparent #333 transparent transparent;
      }
      
      /* 边框样式 */
      .jev-tooltip-bordered {
        border: 1px solid rgba(255, 255, 255, 0.2);
      }
      
      /* 阴影样式 */
      .jev-tooltip-shadow-1 {
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      }
      
      .jev-tooltip-shadow-2 {
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
      }
      
      .jev-tooltip-shadow-3 {
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
      }
      
      .jev-tooltip-shadow-4 {
        box-shadow: 0 8px 16px rgba(0, 0, 0, 0.25);
      }
      
      .jev-tooltip-shadow-5 {
        box-shadow: 0 16px 32px rgba(0, 0, 0, 0.3);
      }
      
      /* 主题样式 - 默认 */
      .jev-tooltip-default {
        background-color: #333;
        color: white;
      }
      
      .jev-tooltip-default.jev-tooltip-top .jev-tooltip-arrow,
      .jev-tooltip-default.jev-tooltip-top-start .jev-tooltip-arrow,
      .jev-tooltip-default.jev-tooltip-top-end .jev-tooltip-arrow {
        border-top-color: #333;
      }
      
      .jev-tooltip-default.jev-tooltip-bottom .jev-tooltip-arrow,
      .jev-tooltip-default.jev-tooltip-bottom-start .jev-tooltip-arrow,
      .jev-tooltip-default.jev-tooltip-bottom-end .jev-tooltip-arrow {
        border-bottom-color: #333;
      }
      
      .jev-tooltip-default.jev-tooltip-left .jev-tooltip-arrow,
      .jev-tooltip-default.jev-tooltip-left-start .jev-tooltip-arrow,
      .jev-tooltip-default.jev-tooltip-left-end .jev-tooltip-arrow {
        border-left-color: #333;
      }
      
      .jev-tooltip-default.jev-tooltip-right .jev-tooltip-arrow,
      .jev-tooltip-default.jev-tooltip-right-start .jev-tooltip-arrow,
      .jev-tooltip-default.jev-tooltip-right-end .jev-tooltip-arrow {
        border-right-color: #333;
      }
      
      /* 主题样式 - 深色 */
      .jev-tooltip-dark {
        background-color: #1e293b;
        color: #f8fafc;
      }
      
      .jev-tooltip-dark.jev-tooltip-top .jev-tooltip-arrow,
      .jev-tooltip-dark.jev-tooltip-top-start .jev-tooltip-arrow,
      .jev-tooltip-dark.jev-tooltip-top-end .jev-tooltip-arrow {
        border-top-color: #1e293b;
      }
      
      .jev-tooltip-dark.jev-tooltip-bottom .jev-tooltip-arrow,
      .jev-tooltip-dark.jev-tooltip-bottom-start .jev-tooltip-arrow,
      .jev-tooltip-dark.jev-tooltip-bottom-end .jev-tooltip-arrow {
        border-bottom-color: #1e293b;
      }
      
      .jev-tooltip-dark.jev-tooltip-left .jev-tooltip-arrow,
      .jev-tooltip-dark.jev-tooltip-left-start .jev-tooltip-arrow,
      .jev-tooltip-dark.jev-tooltip-left-end .jev-tooltip-arrow {
        border-left-color: #1e293b;
      }
      
      .jev-tooltip-dark.jev-tooltip-right .jev-tooltip-arrow,
      .jev-tooltip-dark.jev-tooltip-right-start .jev-tooltip-arrow,
      .jev-tooltip-dark.jev-tooltip-right-end .jev-tooltip-arrow {
        border-right-color: #1e293b;
      }
      
      /* 主题样式 - 霓虹灯 */
      .jev-tooltip-neon {
        background-color: rgba(0, 255, 153, 0.9);
        color: #0f172a;
        border: 1px solid #00ff99;
        box-shadow: 0 0 15px rgba(0, 255, 153, 0.5);
      }
      
      .jev-tooltip-neon.jev-tooltip-top .jev-tooltip-arrow,
      .jev-tooltip-neon.jev-tooltip-top-start .jev-tooltip-arrow,
      .jev-tooltip-neon.jev-tooltip-top-end .jev-tooltip-arrow {
        border-top-color: rgba(0, 255, 153, 0.9);
      }
      
      .jev-tooltip-neon.jev-tooltip-bottom .jev-tooltip-arrow,
      .jev-tooltip-neon.jev-tooltip-bottom-start .jev-tooltip-arrow,
      .jev-tooltip-neon.jev-tooltip-bottom-end .jev-tooltip-arrow {
        border-bottom-color: rgba(0, 255, 153, 0.9);
      }
      
      .jev-tooltip-neon.jev-tooltip-left .jev-tooltip-arrow,
      .jev-tooltip-neon.jev-tooltip-left-start .jev-tooltip-arrow,
      .jev-tooltip-neon.jev-tooltip-left-end .jev-tooltip-arrow {
        border-left-color: rgba(0, 255, 153, 0.9);
      }
      
      .jev-tooltip-neon.jev-tooltip-right .jev-tooltip-arrow,
      .jev-tooltip-neon.jev-tooltip-right-start .jev-tooltip-arrow,
      .jev-tooltip-neon.jev-tooltip-right-end .jev-tooltip-arrow {
        border-right-color: rgba(0, 255, 153, 0.9);
      }
      
      /* 主题样式 - 成功 */
      .jev-tooltip-success {
        background-color: #28a745;
        color: white;
      }
      
      .jev-tooltip-success.jev-tooltip-top .jev-tooltip-arrow,
      .jev-tooltip-success.jev-tooltip-top-start .jev-tooltip-arrow,
      .jev-tooltip-success.jev-tooltip-top-end .jev-tooltip-arrow {
        border-top-color: #28a745;
      }
      
      .jev-tooltip-success.jev-tooltip-bottom .jev-tooltip-arrow,
      .jev-tooltip-success.jev-tooltip-bottom-start .jev-tooltip-arrow,
      .jev-tooltip-success.jev-tooltip-bottom-end .jev-tooltip-arrow {
        border-bottom-color: #28a745;
      }
      
      .jev-tooltip-success.jev-tooltip-left .jev-tooltip-arrow,
      .jev-tooltip-success.jev-tooltip-left-start .jev-tooltip-arrow,
      .jev-tooltip-success.jev-tooltip-left-end .jev-tooltip-arrow {
        border-left-color: #28a745;
      }
      
      .jev-tooltip-success.jev-tooltip-right .jev-tooltip-arrow,
      .jev-tooltip-success.jev-tooltip-right-start .jev-tooltip-arrow,
      .jev-tooltip-success.jev-tooltip-right-end .jev-tooltip-arrow {
        border-right-color: #28a745;
      }
      
      /* 主题样式 - 警告 */
      .jev-tooltip-warning {
        background-color: #ffc107;
        color: #212529;
      }
      
      .jev-tooltip-warning.jev-tooltip-top .jev-tooltip-arrow,
      .jev-tooltip-warning.jev-tooltip-top-start .jev-tooltip-arrow,
      .jev-tooltip-warning.jev-tooltip-top-end .jev-tooltip-arrow {
        border-top-color: #ffc107;
      }
      
      .jev-tooltip-warning.jev-tooltip-bottom .jev-tooltip-arrow,
      .jev-tooltip-warning.jev-tooltip-bottom-start .jev-tooltip-arrow,
      .jev-tooltip-warning.jev-tooltip-bottom-end .jev-tooltip-arrow {
        border-bottom-color: #ffc107;
      }
      
      .jev-tooltip-warning.jev-tooltip-left .jev-tooltip-arrow,
      .jev-tooltip-warning.jev-tooltip-left-start .jev-tooltip-arrow,
      .jev-tooltip-warning.jev-tooltip-left-end .jev-tooltip-arrow {
        border-left-color: #ffc107;
      }
      
      .jev-tooltip-warning.jev-tooltip-right .jev-tooltip-arrow,
      .jev-tooltip-warning.jev-tooltip-right-start .jev-tooltip-arrow,
      .jev-tooltip-warning.jev-tooltip-right-end .jev-tooltip-arrow {
        border-right-color: #ffc107;
      }
      
      /* 主题样式 - 错误 */
      .jev-tooltip-error {
        background-color: #dc3545;
        color: white;
      }
      
      .jev-tooltip-error.jev-tooltip-top .jev-tooltip-arrow,
      .jev-tooltip-error.jev-tooltip-top-start .jev-tooltip-arrow,
      .jev-tooltip-error.jev-tooltip-top-end .jev-tooltip-arrow {
        border-top-color: #dc3545;
      }
      
      .jev-tooltip-error.jev-tooltip-bottom .jev-tooltip-arrow,
      .jev-tooltip-error.jev-tooltip-bottom-start .jev-tooltip-arrow,
      .jev-tooltip-error.jev-tooltip-bottom-end .jev-tooltip-arrow {
        border-bottom-color: #dc3545;
      }
      
      .jev-tooltip-error.jev-tooltip-left .jev-tooltip-arrow,
      .jev-tooltip-error.jev-tooltip-left-start .jev-tooltip-arrow,
      .jev-tooltip-error.jev-tooltip-left-end .jev-tooltip-arrow {
        border-left-color: #dc3545;
      }
      
      .jev-tooltip-error.jev-tooltip-right .jev-tooltip-arrow,
      .jev-tooltip-error.jev-tooltip-right-start .jev-tooltip-arrow,
      .jev-tooltip-error.jev-tooltip-right-end .jev-tooltip-arrow {
        border-right-color: #dc3545;
      }
      
      /* 主题样式 - 信息 */
      .jev-tooltip-info {
        background-color: #17a2b8;
        color: white;
      }
      
      .jev-tooltip-info.jev-tooltip-top .jev-tooltip-arrow,
      .jev-tooltip-info.jev-tooltip-top-start .jev-tooltip-arrow,
      .jev-tooltip-info.jev-tooltip-top-end .jev-tooltip-arrow {
        border-top-color: #17a2b8;
      }
      
      .jev-tooltip-info.jev-tooltip-bottom .jev-tooltip-arrow,
      .jev-tooltip-info.jev-tooltip-bottom-start .jev-tooltip-arrow,
      .jev-tooltip-info.jev-tooltip-bottom-end .jev-tooltip-arrow {
        border-bottom-color: #17a2b8;
      }
      
      .jev-tooltip-info.jev-tooltip-left .jev-tooltip-arrow,
      .jev-tooltip-info.jev-tooltip-left-start .jev-tooltip-arrow,
      .jev-tooltip-info.jev-tooltip-left-end .jev-tooltip-arrow {
        border-left-color: #17a2b8;
      }
      
      .jev-tooltip-info.jev-tooltip-right .jev-tooltip-arrow,
      .jev-tooltip-info.jev-tooltip-right-start .jev-tooltip-arrow,
      .jev-tooltip-info.jev-tooltip-right-end .jev-tooltip-arrow {
        border-right-color: #17a2b8;
      }
      
      /* 动画类 */
      .jev-tooltip {
        transition: opacity 0.2s ease, transform 0.2s ease;
      }
      
      /* 淡入淡出动画 */
      .jev-tooltip-animation-fade {
        opacity: 0;
      }
      
      .jev-tooltip-animation-fade.jev-tooltip-visible {
        opacity: 1;
      }
      
      /* 滑入动画 */
      .jev-tooltip-animation-slide.jev-tooltip-top,
      .jev-tooltip-animation-slide.jev-tooltip-top-start,
      .jev-tooltip-animation-slide.jev-tooltip-top-end {
        opacity: 0;
        transform: translateY(8px);
      }
      
      .jev-tooltip-animation-slide.jev-tooltip-bottom,
      .jev-tooltip-animation-slide.jev-tooltip-bottom-start,
      .jev-tooltip-animation-slide.jev-tooltip-bottom-end {
        opacity: 0;
        transform: translateY(-8px);
      }
      
      .jev-tooltip-animation-slide.jev-tooltip-left,
      .jev-tooltip-animation-slide.jev-tooltip-left-start,
      .jev-tooltip-animation-slide.jev-tooltip-left-end {
        opacity: 0;
        transform: translateX(8px);
      }
      
      .jev-tooltip-animation-slide.jev-tooltip-right,
      .jev-tooltip-animation-slide.jev-tooltip-right-start,
      .jev-tooltip-animation-slide.jev-tooltip-right-end {
        opacity: 0;
        transform: translateX(-8px);
      }
      
      .jev-tooltip-animation-slide.jev-tooltip-visible {
        opacity: 1;
        transform: translate(0, 0);
      }
      
      /* 缩放动画 */
      .jev-tooltip-animation-scale {
        opacity: 0;
        transform: scale(0.9);
      }
      
      .jev-tooltip-animation-scale.jev-tooltip-visible {
        opacity: 1;
        transform: scale(1);
      }
      
      /* 弹跳动画 */
      .jev-tooltip-animation-bounce {
        opacity: 0;
        transform: scale(0.8);
        transition-timing-function: cubic-bezier(0.68, -0.55, 0.265, 1.55);
      }
      
      .jev-tooltip-animation-bounce.jev-tooltip-visible {
        opacity: 1;
        transform: scale(1);
      }
      
      /* 内容样式 */
      .jev-tooltip-content {
        max-height: 300px;
        overflow-y: auto;
        overflow-x: hidden;
      }
      
      /* 响应式设计 */
      @media (max-width: 768px) {
        .jev-tooltip {
          max-width: 90vw !important;
          font-size: 13px;
          padding: 6px 10px;
        }
      }
      
      /* 无障碍支持 */
      .jev-tooltip:focus-visible {
        outline: 2px solid #007bff;
        outline-offset: 2px;
      }
      
      /* 减少动画偏好 */
      @media (prefers-reduced-motion: reduce) {
        .jev-tooltip {
          transition: none !important;
          transform: none !important;
          opacity: 1 !important;
        }
      }
    `;
    
    document.head.appendChild(style);
  }

  /**
   * 绑定事件
   * @private
   */
  _bindEvents() {
    if (!this.targetElement || this.options.trigger === 'manual') {
      return;
    }
    
    // 绑定鼠标事件
    if (this.options.trigger.includes('hover') || this.options.trigger === 'auto') {
      this.targetElement.addEventListener('mouseenter', this._handleMouseEnter.bind(this));
      this.targetElement.addEventListener('mouseleave', this._handleMouseLeave.bind(this));
    }
    
    // 绑定点击事件
    if (this.options.trigger.includes('click')) {
      this.targetElement.addEventListener('click', this._handleClick.bind(this));
    }
    
    // 绑定焦点事件
    if (this.options.trigger.includes('focus')) {
      this.targetElement.addEventListener('focus', this._handleFocus.bind(this));
      this.targetElement.addEventListener('blur', this._handleBlur.bind(this));
    }
    
    // 绑定触摸事件
    if ('ontouchstart' in window) {
      this.targetElement.addEventListener('touchstart', this._handleTouchStart.bind(this), { passive: true });
      this.targetElement.addEventListener('touchend', this._handleTouchEnd.bind(this), { passive: true });
    }
    
    // 绑定ESC键关闭
    if (this.options.closeOnEscape) {
      document.addEventListener('keydown', this._handleEscape.bind(this));
    }
    
    // 绑定点击外部关闭
    if (this.options.closeOnClickOutside) {
      document.addEventListener('click', this._handleClickOutside.bind(this));
    }
    
    // 窗口大小变化时重新定位
    window.addEventListener('resize', this._handleResize.bind(this));
    
    // 滚动时重新定位
    window.addEventListener('scroll', this._handleUpdatePosition.bind(this));
    
    // 监听目标元素变化
    if (this.options.responsive) {
      this._observeElement();
    }
  }

  /**
   * 观察元素变化
   * @private
   */
  _observeElement() {
    try {
      if (window.ResizeObserver) {
        this.resizeObserver = new ResizeObserver(this._handleElementResize.bind(this));
        this.resizeObserver.observe(this.targetElement);
      }
    } catch (error) {
      logger.warn('ResizeObserver不支持，无法监听元素大小变化', error);
    }
  }

  /**
   * 计算位置
   * @private
   */
  _calculatePosition() {
    if (!this.targetElement || !this.tooltipElement) return 'top';
    
    // 获取元素位置和尺寸
    const targetRect = this.targetElement.getBoundingClientRect();
    const tooltipRect = this.tooltipElement.getBoundingClientRect();
    const viewport = {
      width: window.innerWidth || document.documentElement.clientWidth,
      height: window.innerHeight || document.documentElement.clientHeight
    };
    
    // 添加偏移量
    const margin = this.options.margin;
    const offsetX = this.options.offsetX;
    const offsetY = this.options.offsetY;
    
    // 计算各个位置的可用空间
    const positions = {
      top: targetRect.top - tooltipRect.height - margin,
      bottom: viewport.height - targetRect.bottom - tooltipRect.height - margin,
      left: targetRect.left - tooltipRect.width - margin,
      right: viewport.width - targetRect.right - tooltipRect.width - margin
    };
    
    // 如果启用自动定位，选择空间最大的位置
    if (this.options.autoPosition) {
      let bestPosition = this.options.position;
      let maxSpace = -Infinity;
      
      Object.entries(positions).forEach(([position, space]) => {
        if (space > maxSpace && space >= this.options.viewportPadding) {
          maxSpace = space;
          bestPosition = position;
        }
      });
      
      return bestPosition;
    }
    
    // 否则使用指定的位置
    let finalPosition = this.options.position;
    
    // 检查指定位置是否有足够空间
    if (positions[finalPosition] < this.options.viewportPadding) {
      // 尝试找到合适的位置
      const fallbackOrder = {
        top: ['bottom', 'left', 'right'],
        bottom: ['top', 'left', 'right'],
        left: ['right', 'top', 'bottom'],
        right: ['left', 'top', 'bottom']
      };
      
      const fallbacks = fallbackOrder[finalPosition] || ['top', 'bottom', 'left', 'right'];
      
      for (const pos of fallbacks) {
        if (positions[pos] >= this.options.viewportPadding) {
          finalPosition = pos;
          break;
        }
      }
    }
    
    return finalPosition;
  }

  /**
   * 设置位置
   * @private
   */
  _setPosition(position = null) {
    if (!this.targetElement || !this.tooltipElement) return;
    
    // 移除所有位置类
    const positionClasses = ['top', 'bottom', 'left', 'right', 'top-start', 'top-end', 'bottom-start', 'bottom-end', 'left-start', 'left-end', 'right-start', 'right-end'];
    positionClasses.forEach(cls => {
      this.tooltipElement.classList.remove(`jev-tooltip-${cls}`);
    });
    
    // 计算或使用指定位置
    const finalPosition = position || this._calculatePosition();
    
    // 添加位置类
    this.tooltipElement.classList.add(`jev-tooltip-${finalPosition}`);
    this.position = finalPosition;
    
    // 获取元素位置和尺寸
    const targetRect = this.targetElement.getBoundingClientRect();
    const tooltipRect = this.tooltipElement.getBoundingClientRect();
    
    // 设置位置样式
    const margin = this.options.margin;
    const offsetX = this.options.offsetX;
    const offsetY = this.options.offsetY;
    
    let left, top;
    
    switch (finalPosition) {
      case 'top':
        left = targetRect.left + targetRect.width / 2 - tooltipRect.width / 2;
        top = targetRect.top - tooltipRect.height - margin;
        break;
      case 'bottom':
        left = targetRect.left + targetRect.width / 2 - tooltipRect.width / 2;
        top = targetRect.bottom + margin;
        break;
      case 'left':
        left = targetRect.left - tooltipRect.width - margin;
        top = targetRect.top + targetRect.height / 2 - tooltipRect.height / 2;
        break;
      case 'right':
        left = targetRect.right + margin;
        top = targetRect.top + targetRect.height / 2 - tooltipRect.height / 2;
        break;
      case 'top-start':
        left = targetRect.left;
        top = targetRect.top - tooltipRect.height - margin;
        break;
      case 'top-end':
        left = targetRect.right - tooltipRect.width;
        top = targetRect.top - tooltipRect.height - margin;
        break;
      case 'bottom-start':
        left = targetRect.left;
        top = targetRect.bottom + margin;
        break;
      case 'bottom-end':
        left = targetRect.right - tooltipRect.width;
        top = targetRect.bottom + margin;
        break;
      case 'left-start':
        left = targetRect.left - tooltipRect.width - margin;
        top = targetRect.top;
        break;
      case 'left-end':
        left = targetRect.left - tooltipRect.width - margin;
        top = targetRect.bottom - tooltipRect.height;
        break;
      case 'right-start':
        left = targetRect.right + margin;
        top = targetRect.top;
        break;
      case 'right-end':
        left = targetRect.right + margin;
        top = targetRect.bottom - tooltipRect.height;
        break;
      default:
        left = targetRect.left + targetRect.width / 2 - tooltipRect.width / 2;
        top = targetRect.top - tooltipRect.height - margin;
    }
    
    // 应用偏移量
    left += offsetX;
    top += offsetY;
    
    // 约束在视窗内
    if (this.options.constrainToWindow) {
      const viewport = {
        width: window.innerWidth || document.documentElement.clientWidth,
        height: window.innerHeight || document.documentElement.clientHeight
      };
      
      // 计算滚动偏移
      const scrollX = window.pageXOffset || document.documentElement.scrollLeft;
      const scrollY = window.pageYOffset || document.documentElement.scrollTop;
      
      // 约束左右位置
      left = Math.max(this.options.viewportPadding, Math.min(left, viewport.width - tooltipRect.width - this.options.viewportPadding));
      
      // 约束上下位置
      top = Math.max(this.options.viewportPadding, Math.min(top, viewport.height - tooltipRect.height - this.options.viewportPadding));
    }
    
    // 设置最终位置
    this.tooltipElement.style.left = `${left}px`;
    this.tooltipElement.style.top = `${top}px`;
    
    // 触发位置变化回调
    if (typeof this.options.onPositionChange === 'function') {
      try {
        this.options.onPositionChange(finalPosition, { left, top });
      } catch (error) {
        logger.error('位置变化回调执行失败', error);
      }
    }
  }

  /**
   * 处理鼠标进入
   * @private
   */
  _handleMouseEnter() {
    this.clearTimers();
    
    if (this.options.mouseEnterDelay > 0) {
      this.shownTimer = setTimeout(() => {
        this.show();
      }, this.options.mouseEnterDelay);
    } else {
      this.show();
    }
  }

  /**
   * 处理鼠标离开
   * @private
   */
  _handleMouseLeave() {
    this.clearTimers();
    
    if (!this.options.persistent) {
      if (this.options.mouseLeaveDelay > 0) {
        this.hiddenTimer = setTimeout(() => {
          this.hide();
        }, this.options.mouseLeaveDelay);
      } else {
        this.hide();
      }
    }
  }

  /**
   * 处理点击
   * @private
   */
  _handleClick() {
    this.clearTimers();
    
    // 切换显示状态
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }

  /**
   * 处理焦点
   * @private
   */
  _handleFocus() {
    this.clearTimers();
    this.show();
  }

  /**
   * 处理失焦
   * @private
   */
  _handleBlur() {
    this.clearTimers();
    
    if (!this.options.persistent) {
      this.hide();
    }
  }

  /**
   * 处理触摸开始
   * @private
   */
  _handleTouchStart(e) {
    // 防止滚动
    if (this.options.trigger.includes('hover')) {
      e.preventDefault();
    }
    
    this.clearTimers();
    
    if (this.options.touchDelay > 0) {
      this.shownTimer = setTimeout(() => {
        this.show();
      }, this.options.touchDelay);
    } else {
      this.show();
    }
  }

  /**
   * 处理触摸结束
   * @private
   */
  _handleTouchEnd() {
    // 触摸结束不需要立即隐藏，保持行为一致性
  }

  /**
   * 处理ESC键
   * @private
   */
  _handleEscape(e) {
    if (e.key === 'Escape' && this.isVisible && this.options.closeOnEscape) {
      this.hide();
    }
  }

  /**
   * 处理点击外部
   * @private
   */
  _handleClickOutside(e) {
    if (!this.isVisible || this.options.closeOnClickOutside === false) return;
    
    // 检查是否点击了目标元素或tooltip本身
    if (this.targetElement.contains(e.target) || this.tooltipElement.contains(e.target)) {
      return;
    }
    
    this.hide();
  }

  /**
   * 处理窗口大小变化
   * @private
   */
  _handleResize() {
    if (this.isVisible) {
      this._updatePosition();
    }
  }

  /**
   * 处理元素大小变化
   * @private
   */
  _handleElementResize() {
    if (this.isVisible) {
      this._updatePosition();
    }
  }

  /**
   * 更新位置
   * @private
   */
  _updatePosition() {
    if (this.isVisible) {
      this._setPosition();
    }
  }

  /**
   * 清除定时器
   * @private
   */
  clearTimers() {
    if (this.shownTimer) {
      clearTimeout(this.shownTimer);
      this.shownTimer = null;
    }
    
    if (this.hiddenTimer) {
      clearTimeout(this.hiddenTimer);
      this.hiddenTimer = null;
    }
  }

  /**
   * 显示提示框
   * @returns {Promise} 显示后的Promise
   */
  show() {
    return new Promise((resolve, reject) => {
      try {
        // 如果已经显示或正在动画中，不做操作
        if (this.isVisible || this.isAnimating) {
          resolve();
          return;
        }
        
        // 触发显示前回调
        if (typeof this.options.onBeforeShow === 'function') {
          const result = this.options.onBeforeShow();
          if (result === false) {
            reject(new Error('显示被阻止'));
            return;
          }
        }
        
        // 设置为动画中
        this.isAnimating = true;
        this.updateState({ isAnimating: true });
        
        // 显示元素
        this.tooltipElement.style.display = 'block';
        
        // 设置位置
        this._setPosition();
        
        // 添加动画类
        if (this.options.animation) {
          this.tooltipElement.classList.add(`jev-tooltip-animation-${this.options.animationType}`);
          
          // 强制重排
          this.tooltipElement.offsetWidth;
          
          // 添加可见类
          setTimeout(() => {
            this.tooltipElement.classList.add('jev-tooltip-visible');
          }, 10);
        } else {
          this.tooltipElement.classList.add('jev-tooltip-visible');
        }
        
        // 添加交互类
        if (this.options.interactive) {
          this.tooltipElement.classList.add('jev-tooltip-interactive');
        }
        
        // 更新可访问性属性
        this.tooltipElement.setAttribute('aria-hidden', 'false');
        
        // 等待动画完成
        setTimeout(() => {
          // 更新状态
          this.isVisible = true;
          this.isActive = true;
          this.isAnimating = false;
          this.updateState({ 
            isVisible: true, 
            isActive: true, 
            isAnimating: false 
          });
          
          // 触发显示回调
          if (typeof this.options.onShow === 'function') {
            try {
              this.options.onShow();
            } catch (error) {
              logger.error('显示回调执行失败', error);
            }
          }
          
          resolve();
        }, this.options.animation ? this.options.animationDuration : 0);
      } catch (error) {
        logger.error('显示提示框失败', error);
        this.isAnimating = false;
        this.updateState({ isAnimating: false });
        reject(error);
      }
    });
  }

  /**
   * 隐藏提示框
   * @returns {Promise} 隐藏后的Promise
   */
  hide() {
    return new Promise((resolve, reject) => {
      try {
        // 如果已经隐藏或正在动画中，不做操作
        if (!this.isVisible || this.isAnimating) {
          resolve();
          return;
        }
        
        // 触发隐藏前回调
        if (typeof this.options.onBeforeHide === 'function') {
          const result = this.options.onBeforeHide();
          if (result === false) {
            reject(new Error('隐藏被阻止'));
            return;
          }
        }
        
        // 设置为动画中
        this.isAnimating = true;
        this.updateState({ isAnimating: true });
        
        // 移除可见类
        this.tooltipElement.classList.remove('jev-tooltip-visible');
        
        // 移除交互类
        this.tooltipElement.classList.remove('jev-tooltip-interactive');
        
        // 更新可访问性属性
        this.tooltipElement.setAttribute('aria-hidden', 'true');
        
        // 等待动画完成
        setTimeout(() => {
          // 隐藏元素
          this.tooltipElement.style.display = 'none';
          
          // 移除动画类
          if (this.options.animation) {
            this.tooltipElement.classList.remove(`jev-tooltip-animation-${this.options.animationType}`);
          }
          
          // 更新状态
          this.isVisible = false;
          this.isActive = false;
          this.isAnimating = false;
          this.updateState({ 
            isVisible: false, 
            isActive: false, 
            isAnimating: false 
          });
          
          // 触发隐藏回调
          if (typeof this.options.onHide === 'function') {
            try {
              this.options.onHide();
            } catch (error) {
              logger.error('隐藏回调执行失败', error);
            }
          }
          
          // 触发关闭回调
          if (typeof this.options.onClose === 'function') {
            try {
              this.options.onClose();
            } catch (error) {
              logger.error('关闭回调执行失败', error);
            }
          }
          
          resolve();
        }, this.options.animation ? this.options.animationDuration : 0);
      } catch (error) {
        logger.error('隐藏提示框失败', error);
        this.isAnimating = false;
        this.updateState({ isAnimating: false });
        reject(error);
      }
    });
  }

  /**
   * 切换显示状态
   */
  toggle() {
    if (this.isVisible) {
      return this.hide();
    } else {
      return this.show();
    }
  }

  /**
   * 设置内容
   * @param {string|HTMLElement} content - 新内容
   */
  setContent(content) {
    if (this.tooltipElement) {
      const contentElement = this.tooltipElement.querySelector('.jev-tooltip-content');
      if (contentElement) {
        // 清空内容
        contentElement.innerHTML = '';
        
        // 设置新内容
        if (typeof content === 'string') {
          contentElement.innerHTML = content;
        } else if (content instanceof HTMLElement) {
          contentElement.appendChild(content);
        }
        
        this.options.content = content;
        
        // 如果当前可见，重新定位
        if (this.isVisible) {
          this._updatePosition();
        }
        
        // 触发更新回调
        if (typeof this.options.onUpdate === 'function') {
          try {
            this.options.onUpdate();
          } catch (error) {
            logger.error('更新回调执行失败', error);
          }
        }
      }
    }
    
    return this;
  }

  /**
   * 设置位置
   * @param {string} position - 新位置
   */
  setPosition(position) {
    this.options.position = position;
    
    if (this.isVisible) {
      this._setPosition(position);
    }
    
    return this;
  }

  /**
   * 设置主题
   * @param {string} theme - 新主题
   */
  setTheme(theme) {
    if (this.tooltipElement) {
      this.tooltipElement.classList.remove(`jev-tooltip-${this.options.theme}`);
      this.tooltipElement.classList.add(`jev-tooltip-${theme}`);
      this.options.theme = theme;
    }
    
    return this;
  }

  /**
   * 设置最大宽度
   * @param {string} maxWidth - 最大宽度
   */
  setMaxWidth(maxWidth) {
    if (this.tooltipElement) {
      this.tooltipElement.style.maxWidth = maxWidth;
      this.options.maxWidth = maxWidth;
      
      if (this.isVisible) {
        this._updatePosition();
      }
    }
    
    return this;
  }

  /**
   * 设置是否可交互
   * @param {boolean} interactive - 是否可交互
   */
  setInteractive(interactive) {
    this.options.interactive = interactive;
    
    if (this.tooltipElement) {
      if (interactive && this.isVisible) {
        this.tooltipElement.classList.add('jev-tooltip-interactive');
      } else {
        this.tooltipElement.classList.remove('jev-tooltip-interactive');
      }
    }
    
    return this;
  }

  /**
   * 设置是否持久
   * @param {boolean} persistent - 是否持久
   */
  setPersistent(persistent) {
    this.options.persistent = persistent;
    return this;
  }

  /**
   * 设置触发器
   * @param {string} trigger - 触发器
   */
  setTrigger(trigger) {
    // 移除旧的事件监听
    if (this.targetElement) {
      this.targetElement.removeEventListener('mouseenter', this._handleMouseEnter.bind(this));
      this.targetElement.removeEventListener('mouseleave', this._handleMouseLeave.bind(this));
      this.targetElement.removeEventListener('click', this._handleClick.bind(this));
      this.targetElement.removeEventListener('focus', this._handleFocus.bind(this));
      this.targetElement.removeEventListener('blur', this._handleBlur.bind(this));
      
      if ('ontouchstart' in window) {
        this.targetElement.removeEventListener('touchstart', this._handleTouchStart.bind(this));
        this.targetElement.removeEventListener('touchend', this._handleTouchEnd.bind(this));
      }
    }
    
    // 更新触发器
    this.options.trigger = trigger;
    
    // 添加新的事件监听
    this._bindEvents();
    
    return this;
  }

  /**
   * 设置显示延迟
   * @param {number} delay - 延迟时间（毫秒）
   */
  setShowDelay(delay) {
    this.options.showDelay = delay;
    this.options.mouseEnterDelay = delay;
    this.options.touchDelay = delay;
    return this;
  }

  /**
   * 设置隐藏延迟
   * @param {number} delay - 延迟时间（毫秒）
   */
  setHideDelay(delay) {
    this.options.hideDelay = delay;
    this.options.mouseLeaveDelay = delay;
    return this;
  }

  /**
   * 获取提示框元素
   * @returns {HTMLElement} 提示框元素
   */
  getElement() {
    return this.tooltipElement;
  }

  /**
   * 获取目标元素
   * @returns {HTMLElement} 目标元素
   */
  getTarget() {
    return this.targetElement;
  }

  /**
   * 检查是否可见
   * @returns {boolean} 是否可见
   */
  isVisible() {
    return this.isVisible;
  }

  /**
   * 检查是否活跃
   * @returns {boolean} 是否活跃
   */
  isActive() {
    return this.isActive;
  }

  /**
   * 刷新提示框
   */
  refresh() {
    if (this.isVisible) {
      this._updatePosition();
    }
    return this;
  }

  /**
   * 销毁提示框
   */
  destroy() {
    // 清除定时器
    this.clearTimers();
    
    // 移除事件监听
    if (this.targetElement) {
      this.targetElement.removeEventListener('mouseenter', this._handleMouseEnter);
      this.targetElement.removeEventListener('mouseleave', this._handleMouseLeave);
      this.targetElement.removeEventListener('click', this._handleClick);
      this.targetElement.removeEventListener('focus', this._handleFocus);
      this.targetElement.removeEventListener('blur', this._handleBlur);
      
      if ('ontouchstart' in window) {
        this.targetElement.removeEventListener('touchstart', this._handleTouchStart);
        this.targetElement.removeEventListener('touchend', this._handleTouchEnd);
      }
    }
    
    document.removeEventListener('keydown', this._handleEscape);
    document.removeEventListener('click', this._handleClickOutside);
    window.removeEventListener('resize', this._handleResize);
    window.removeEventListener('scroll', this._updatePosition);
    
    // 清理观察器
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
    
    // 移除元素
    if (this.tooltipElement && this.tooltipElement.parentNode) {
      this.tooltipElement.parentNode.removeChild(this.tooltipElement);
    }
    
    // 清理引用
    this.tooltipElement = null;
    this.targetElement = null;
    
    super.destroy();
  }
}

export default Tooltip;