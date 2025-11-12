/**
 * Carousel轮播组件
 * 提供灵活的轮播功能，支持多种动画效果和交互方式
 */
import BaseComponent from './base-component.js';
import logger from '../utils/logger.js';

class Carousel extends BaseComponent {
  /**
   * 构造函数
   * @param {Object} options - 配置选项
   * @param {HTMLElement} container - 容器元素
   */
  constructor(options = {}, container = document.body) {
    super(options, container);
    
    // 组件元素引用
    this.slidesWrapper = null;
    this.slidesContainer = null;
    this.slides = [];
    this.prevButton = null;
    this.nextButton = null;
    this.pagination = null;
    this.progressBar = null;
    this.controlsContainer = null;
    
    // 轮播状态
    this.currentIndex = 0;
    this.isAnimating = false;
    this.isPaused = false;
    this.autoPlayTimer = null;
    this.startX = 0;
    this.currentX = 0;
    this.startTime = 0;
    this.draggingDistance = 0;
    this.isDragging = false;
    this.originalSlidesOrder = [];
  }

  /**
   * 获取默认配置
   * @private
   */
  _getDefaultOptions() {
    return {
      ...super._getDefaultOptions(),
      width: '100%',
      height: '400px',
      initialSlide: 0,
      slidesToShow: 1,
      slidesToScroll: 1,
      autoplay: true,
      autoplayInterval: 5000,
      speed: 500,
      effect: 'slide', // slide, fade, cube, coverflow, flip
      direction: 'horizontal', // horizontal, vertical
      loop: true,
      centerMode: false,
      variableWidth: false,
      adaptiveHeight: false,
      dots: true,
      arrows: true,
      prevArrow: null,
      nextArrow: null,
      dotsClass: 'jev-carousel-dots',
      dotClass: 'jev-carousel-dot',
      activeDotClass: 'jev-carousel-dot-active',
      prevArrowClass: 'jev-carousel-prev',
      nextArrowClass: 'jev-carousel-next',
      theme: 'default', // default, dark, neon
      responsive: [],
      mouseDrag: true,
      touchDrag: true,
      keyboardControl: true,
      useTransform: true,
      useCSS: true,
      pauseOnHover: true,
      pauseOnFocus: true,
      pauseOnDotsHover: false,
      swipe: true,
      swipeTolerance: 50,
      allowTouchMove: true,
      autoHeight: false,
      autoWidth: false,
      infinite: true,
      lazyLoad: 'none', // none, ondemand, progressive
      slidesPerView: 1,
      spaceBetween: 0,
      freeMode: false,
      freeModeMomentum: true,
      freeModeMomentumRatio: 1,
      freeModeMomentumBounce: true,
      freeModeMomentumBounceRatio: 1,
      freeModeMomentumVelocityRatio: 1,
      freeModeSticky: false,
      coverflowEffect: {
        rotate: 50,
        stretch: 0,
        depth: 100,
        modifier: 1,
        slideShadows: true
      },
      cubeEffect: {
        slideShadows: true,
        shadow: true,
        shadowOffset: 20,
        shadowScale: 0.94
      },
      flipEffect: {
        slideShadows: true,
        limitRotation: true
      },
      onSlideChange: null,
      onSlideChangeStart: null,
      onSlideChangeEnd: null,
      onInitialized: null,
      onResized: null,
      onReachBeginning: null,
      onReachEnd: null,
      onAutoplay: null,
      onAutoplayStop: null,
      onTouchStart: null,
      onTouchMove: null,
      onTouchEnd: null,
      onDragStart: null,
      onDragMove: null,
      onDragEnd: null
    };
  }

  /**
   * 获取初始状态
   * @private
   */
  _getInitialState() {
    return {
      ...super._getInitialState(),
      currentIndex: 0,
      isAnimating: false,
      isPaused: false,
      isDragging: false,
      totalSlides: 0
    };
  }

  /**
   * 创建DOM元素
   * @private
   */
  _createElement() {
    // 创建主容器
    this.element = document.createElement('div');
    this.element.className = `jev-carousel jev-carousel-${this.options.theme} jev-carousel-direction-${this.options.direction}`;
    this.element.style.width = this.options.width;
    this.element.style.height = this.options.height;
    this.element.style.position = 'relative';
    this.element.style.overflow = 'hidden';
    this.element.setAttribute('role', 'region');
    this.element.setAttribute('aria-roledescription', 'carousel');
    this.element.setAttribute('aria-label', '轮播图');
    this.element.setAttribute('tabindex', '0');
    
    // 创建滑动包装器
    this.slidesWrapper = document.createElement('div');
    this.slidesWrapper.className = 'jev-carousel-wrapper';
    this.slidesWrapper.style.position = 'relative';
    this.slidesWrapper.style.width = '100%';
    this.slidesWrapper.style.height = '100%';
    this.element.appendChild(this.slidesWrapper);
    
    // 创建滑动容器
    this.slidesContainer = document.createElement('div');
    this.slidesContainer.className = 'jev-carousel-slides';
    this.slidesContainer.style.position = 'absolute';
    this.slidesContainer.style.top = '0';
    this.slidesContainer.style.left = '0';
    this.slidesContainer.style.height = '100%';
    this.slidesContainer.style.display = 'flex';
    this.slidesContainer.style.flexDirection = this.options.direction === 'horizontal' ? 'row' : 'column';
    this.slidesContainer.style.transitionProperty = this.options.effect === 'slide' ? 'transform' : 'opacity';
    this.slidesContainer.style.transitionDuration = `${this.options.speed}ms`;
    this.slidesContainer.style.transitionTimingFunction = 'ease';
    
    if (this.options.useTransform) {
      this.slidesContainer.style.transform = 'translate3d(0, 0, 0)';
    }
    
    this.slidesWrapper.appendChild(this.slidesContainer);
    
    // 创建控制器容器
    this.controlsContainer = document.createElement('div');
    this.controlsContainer.className = 'jev-carousel-controls';
    this.element.appendChild(this.controlsContainer);
    
    // 创建导航箭头
    if (this.options.arrows) {
      this._createArrows();
    }
    
    // 创建分页指示器
    if (this.options.dots) {
      this._createPagination();
    }
    
    // 创建进度条
    if (this.options.autoplay) {
      this._createProgressBar();
    }
  }

  /**
   * 创建导航箭头
   * @private
   */
  _createArrows() {
    // 上一张按钮
    if (this.options.prevArrow) {
      this.prevButton = this.options.prevArrow;
    } else {
      this.prevButton = document.createElement('button');
      this.prevButton.className = this.options.prevArrowClass;
      this.prevButton.setAttribute('aria-label', '上一张');
      this.prevButton.setAttribute('type', 'button');
      this.prevButton.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M15 18L9 12L15 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    }
    
    // 下一张按钮
    if (this.options.nextArrow) {
      this.nextButton = this.options.nextArrow;
    } else {
      this.nextButton = document.createElement('button');
      this.nextButton.className = this.options.nextArrowClass;
      this.nextButton.setAttribute('aria-label', '下一张');
      this.nextButton.setAttribute('type', 'button');
      this.nextButton.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M9 18L15 12L9 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    }
    
    // 添加到控制器容器
    this.controlsContainer.appendChild(this.prevButton);
    this.controlsContainer.appendChild(this.nextButton);
  }

  /**
   * 创建分页指示器
   * @private
   */
  _createPagination() {
    this.pagination = document.createElement('div');
    this.pagination.className = this.options.dotsClass;
    this.controlsContainer.appendChild(this.pagination);
  }

  /**
   * 创建进度条
   * @private
   */
  _createProgressBar() {
    this.progressBar = document.createElement('div');
    this.progressBar.className = 'jev-carousel-progress';
    this.progressBar.innerHTML = '<div class="jev-carousel-progress-bar"></div>';
    this.element.appendChild(this.progressBar);
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
    
    // 初始化响应式
    this._initResponsive();
    
    // 初始化自动播放
    if (this.options.autoplay) {
      this.startAutoplay();
    }
    
    // 触发初始化完成回调
    if (typeof this.options.onInitialized === 'function') {
      try {
        this.options.onInitialized();
      } catch (error) {
        logger.error('轮播初始化回调执行失败', error);
      }
    }
  }

  /**
   * 添加全局样式
   * @private
   */
  _addGlobalStyles() {
    const styleId = 'jev-carousel-styles';
    if (document.getElementById(styleId)) {
      return;
    }
    
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      /* 轮播容器样式 */
      .jev-carousel {
        background-color: transparent;
        position: relative;
        overflow: hidden;
        outline: none;
      }
      
      /* 主题样式 - 默认 */
      .jev-carousel-default {
        background-color: transparent;
      }
      
      /* 主题样式 - 深色 */
      .jev-carousel-dark {
        background-color: #2d3748;
      }
      
      /* 主题样式 - 霓虹灯 */
      .jev-carousel-neon {
        background-color: #1a1a1a;
        box-shadow: 0 0 20px rgba(0, 255, 153, 0.1);
      }
      
      /* 滑动包装器 */
      .jev-carousel-wrapper {
        position: relative;
        overflow: hidden;
        width: 100%;
        height: 100%;
      }
      
      /* 滑动容器 */
      .jev-carousel-slides {
        position: absolute;
        display: flex;
        width: 100%;
        height: 100%;
        will-change: transform;
        transition-property: transform;
      }
      
      /* 水平方向 */
      .jev-carousel-direction-horizontal .jev-carousel-slides {
        flex-direction: row;
      }
      
      /* 垂直方向 */
      .jev-carousel-direction-vertical .jev-carousel-slides {
        flex-direction: column;
      }
      
      /* 幻灯片样式 */
      .jev-carousel-slide {
        position: relative;
        flex-shrink: 0;
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;
      }
      
      /* 控制器容器 */
      .jev-carousel-controls {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        pointer-events: none;
      }
      
      /* 导航箭头样式 */
      .jev-carousel-prev,
      .jev-carousel-next {
        position: absolute;
        top: 50%;
        transform: translateY(-50%);
        width: 40px;
        height: 40px;
        background-color: rgba(0, 0, 0, 0.5);
        color: white;
        border: none;
        border-radius: 50%;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.3s ease;
        opacity: 0.7;
        pointer-events: all;
        z-index: 10;
      }
      
      .jev-carousel-prev:hover,
      .jev-carousel-next:hover {
        opacity: 1;
        background-color: rgba(0, 0, 0, 0.8);
      }
      
      .jev-carousel-prev {
        left: 15px;
      }
      
      .jev-carousel-next {
        right: 15px;
      }
      
      .jev-carousel-dark .jev-carousel-prev,
      .jev-carousel-dark .jev-carousel-next {
        background-color: rgba(255, 255, 255, 0.2);
      }
      
      .jev-carousel-dark .jev-carousel-prev:hover,
      .jev-carousel-dark .jev-carousel-next:hover {
        background-color: rgba(255, 255, 255, 0.4);
      }
      
      .jev-carousel-neon .jev-carousel-prev,
      .jev-carousel-neon .jev-carousel-next {
        background-color: rgba(0, 255, 153, 0.1);
        color: #00ff99;
        box-shadow: 0 0 10px rgba(0, 255, 153, 0.2);
        border: 1px solid rgba(0, 255, 153, 0.3);
      }
      
      .jev-carousel-neon .jev-carousel-prev:hover,
      .jev-carousel-neon .jev-carousel-next:hover {
        background-color: rgba(0, 255, 153, 0.2);
        box-shadow: 0 0 20px rgba(0, 255, 153, 0.4);
      }
      
      /* 分页指示器容器 */
      .jev-carousel-dots {
        position: absolute;
        bottom: 20px;
        left: 0;
        right: 0;
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 10px;
        pointer-events: all;
        z-index: 10;
      }
      
      /* 分页指示器 */
      .jev-carousel-dot {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background-color: rgba(255, 255, 255, 0.5);
        border: none;
        cursor: pointer;
        transition: all 0.3s ease;
        opacity: 0.7;
        outline: none;
      }
      
      .jev-carousel-dot:hover {
        opacity: 1;
        transform: scale(1.2);
      }
      
      /* 活动分页指示器 */
      .jev-carousel-dot-active {
        background-color: white;
        opacity: 1;
        transform: scale(1.2);
      }
      
      .jev-carousel-dark .jev-carousel-dot {
        background-color: rgba(255, 255, 255, 0.3);
      }
      
      .jev-carousel-dark .jev-carousel-dot-active {
        background-color: white;
      }
      
      .jev-carousel-neon .jev-carousel-dot {
        background-color: rgba(0, 255, 153, 0.3);
        box-shadow: 0 0 5px rgba(0, 255, 153, 0.2);
        border: 1px solid rgba(0, 255, 153, 0.4);
      }
      
      .jev-carousel-neon .jev-carousel-dot-active {
        background-color: #00ff99;
        box-shadow: 0 0 10px rgba(0, 255, 153, 0.6);
      }
      
      /* 进度条 */
      .jev-carousel-progress {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 4px;
        background-color: rgba(255, 255, 255, 0.2);
        z-index: 10;
        overflow: hidden;
      }
      
      .jev-carousel-progress-bar {
        height: 100%;
        background-color: white;
        transition: width 0.1s linear;
        will-change: width;
      }
      
      .jev-carousel-dark .jev-carousel-progress {
        background-color: rgba(255, 255, 255, 0.1);
      }
      
      .jev-carousel-dark .jev-carousel-progress-bar {
        background-color: white;
      }
      
      .jev-carousel-neon .jev-carousel-progress {
        background-color: rgba(0, 255, 153, 0.1);
      }
      
      .jev-carousel-neon .jev-carousel-progress-bar {
        background-color: #00ff99;
        box-shadow: 0 0 10px rgba(0, 255, 153, 0.6);
      }
      
      /* 效果样式 */
      /* 淡入淡出效果 */
      .jev-carousel-effect-fade .jev-carousel-slides {
        transition-property: opacity;
      }
      
      .jev-carousel-effect-fade .jev-carousel-slide {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        opacity: 0;
        transition: opacity 0.5s ease;
      }
      
      .jev-carousel-effect-fade .jev-carousel-slide-active {
        opacity: 1;
        position: relative;
        z-index: 1;
      }
      
      /* 3D翻转效果 */
      .jev-carousel-effect-flip {
        perspective: 1200px;
      }
      
      .jev-carousel-effect-flip .jev-carousel-slides {
        transform-style: preserve-3d;
      }
      
      /* 覆盖流效果 */
      .jev-carousel-effect-coverflow .jev-carousel-slides {
        transform-style: preserve-3d;
      }
      
      /* 立方体效果 */
      .jev-carousel-effect-cube {
        perspective: 1200px;
      }
      
      .jev-carousel-effect-cube .jev-carousel-slides {
        transform-style: preserve-3d;
      }
      
      /* 自适应高度 */
      .jev-carousel-adaptive-height .jev-carousel-wrapper {
        transition: height 0.5s ease;
      }
      
      /* 响应式设计 */
      @media (max-width: 768px) {
        .jev-carousel-prev,
        .jev-carousel-next {
          width: 32px;
          height: 32px;
        }
        
        .jev-carousel-prev svg,
        .jev-carousel-next svg {
          width: 18px;
          height: 18px;
        }
        
        .jev-carousel-dots {
          gap: 6px;
        }
        
        .jev-carousel-dot {
          width: 8px;
          height: 8px;
        }
      }
      
      @media (max-width: 480px) {
        .jev-carousel-prev,
        .jev-carousel-next {
          width: 28px;
          height: 28px;
        }
        
        .jev-carousel-prev svg,
        .jev-carousel-next svg {
          width: 16px;
          height: 16px;
        }
        
        .jev-carousel-dots {
          gap: 4px;
        }
        
        .jev-carousel-dot {
          width: 6px;
          height: 6px;
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
    // 箭头点击事件
    if (this.prevButton) {
      this.prevButton.addEventListener('click', () => this.prev());
    }
    
    if (this.nextButton) {
      this.nextButton.addEventListener('click', () => this.next());
    }
    
    // 触摸事件
    if (this.options.touchDrag) {
      this.slidesWrapper.addEventListener('touchstart', (e) => this._handleTouchStart(e));
      this.slidesWrapper.addEventListener('touchmove', (e) => this._handleTouchMove(e));
      this.slidesWrapper.addEventListener('touchend', (e) => this._handleTouchEnd(e));
      this.slidesWrapper.addEventListener('touchcancel', (e) => this._handleTouchEnd(e));
    }
    
    // 鼠标拖拽事件
    if (this.options.mouseDrag) {
      this.slidesWrapper.addEventListener('mousedown', (e) => this._handleMouseDown(e));
      this.slidesWrapper.addEventListener('mousemove', (e) => this._handleMouseMove(e));
      this.slidesWrapper.addEventListener('mouseup', (e) => this._handleMouseUp(e));
      this.slidesWrapper.addEventListener('mouseleave', (e) => this._handleMouseUp(e));
    }
    
    // 键盘控制
    if (this.options.keyboardControl) {
      this.element.addEventListener('keydown', (e) => this._handleKeyDown(e));
    }
    
    // 悬停暂停
    if (this.options.pauseOnHover) {
      this.element.addEventListener('mouseenter', () => this.pause());
      this.element.addEventListener('mouseleave', () => this.play());
    }
    
    // 焦点暂停
    if (this.options.pauseOnFocus) {
      this.element.addEventListener('focusin', () => this.pause());
      this.element.addEventListener('focusout', () => this.play());
    }
    
    // 分页指示器悬停
    if (this.options.pauseOnDotsHover && this.pagination) {
      this.pagination.addEventListener('mouseenter', () => this.pause());
      this.pagination.addEventListener('mouseleave', () => this.play());
    }
  }

  /**
   * 初始化响应式
   * @private
   */
  _initResponsive() {
    // 监听窗口大小变化
    window.addEventListener('resize', () => this._handleResize());
    
    // 初始化响应式设置
    this._applyResponsiveSettings();
  }

  /**
   * 应用响应式设置
   * @private
   */
  _applyResponsiveSettings() {
    const currentWidth = window.innerWidth;
    let matchedBreakpoint = null;
    
    // 找到匹配的断点
    for (let i = this.options.responsive.length - 1; i >= 0; i--) {
      const breakpoint = this.options.responsive[i];
      if (currentWidth >= breakpoint.breakpoint) {
        matchedBreakpoint = breakpoint;
        break;
      }
    }
    
    // 应用响应式设置
    if (matchedBreakpoint && matchedBreakpoint.settings) {
      Object.assign(this.options, matchedBreakpoint.settings);
    }
    
    // 重新计算和渲染
    this._updateSlidesSize();
    this.goTo(this.currentIndex, false);
    
    // 触发调整大小回调
    if (typeof this.options.onResized === 'function') {
      try {
        this.options.onResized();
      } catch (error) {
        logger.error('轮播调整大小回调执行失败', error);
      }
    }
  }

  /**
   * 处理窗口大小变化
   * @private
   */
  _handleResize() {
    // 防抖处理
    if (this.resizeTimeout) {
      clearTimeout(this.resizeTimeout);
    }
    
    this.resizeTimeout = setTimeout(() => {
      this._applyResponsiveSettings();
    }, 100);
  }

  /**
   * 处理触摸开始
   * @private
   */
  _handleTouchStart(e) {
    if (!this.options.allowTouchMove) return;
    
    this.startX = e.touches[0].clientX;
    this.startY = e.touches[0].clientY;
    this.startTime = Date.now();
    this.isDragging = true;
    
    // 暂停自动播放
    this.pause();
    
    // 触发触摸开始回调
    if (typeof this.options.onTouchStart === 'function') {
      try {
        this.options.onTouchStart(e);
      } catch (error) {
        logger.error('触摸开始回调执行失败', error);
      }
    }
  }

  /**
   * 处理触摸移动
   * @private
   */
  _handleTouchMove(e) {
    if (!this.isDragging || !this.options.allowTouchMove) return;
    
    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    
    // 计算距离
    this.draggingDistance = currentX - this.startX;
    
    // 防止默认滚动行为
    if (Math.abs(this.draggingDistance) > Math.abs(currentY - this.startY)) {
      e.preventDefault();
    }
    
    // 拖动时实时更新位置
    if (this.options.effect === 'slide' && this.options.useTransform) {
      const currentTranslate = this._getCurrentTranslate();
      const newTranslate = currentTranslate + this.draggingDistance;
      this._setTranslate(newTranslate);
    }
    
    // 触发触摸移动回调
    if (typeof this.options.onTouchMove === 'function') {
      try {
        this.options.onTouchMove(e);
      } catch (error) {
        logger.error('触摸移动回调执行失败', error);
      }
    }
  }

  /**
   * 处理触摸结束
   * @private
   */
  _handleTouchEnd(e) {
    if (!this.isDragging) return;
    
    const duration = Date.now() - this.startTime;
    const isSwipe = Math.abs(this.draggingDistance) >= this.options.swipeTolerance;
    const isFastSwipe = duration < 300 && Math.abs(this.draggingDistance) >= 20;
    
    // 判断滑动方向
    if (isSwipe || isFastSwipe) {
      if (this.draggingDistance > 0) {
        this.prev();
      } else {
        this.next();
      }
    } else {
      // 回到原位
      this.goTo(this.currentIndex, true);
    }
    
    // 重置状态
    this.isDragging = false;
    this.draggingDistance = 0;
    
    // 恢复自动播放
    this.play();
    
    // 触发触摸结束回调
    if (typeof this.options.onTouchEnd === 'function') {
      try {
        this.options.onTouchEnd(e);
      } catch (error) {
        logger.error('触摸结束回调执行失败', error);
      }
    }
  }

  /**
   * 处理鼠标按下
   * @private
   */
  _handleMouseDown(e) {
    if (!this.options.allowTouchMove) return;
    
    this.startX = e.clientX;
    this.startY = e.clientY;
    this.isDragging = true;
    
    // 添加用户选择禁止类
    document.body.classList.add('jev-carousel-no-select');
    
    // 暂停自动播放
    this.pause();
    
    // 触发拖拽开始回调
    if (typeof this.options.onDragStart === 'function') {
      try {
        this.options.onDragStart(e);
      } catch (error) {
        logger.error('拖拽开始回调执行失败', error);
      }
    }
  }

  /**
   * 处理鼠标移动
   * @private
   */
  _handleMouseMove(e) {
    if (!this.isDragging) return;
    
    const currentX = e.clientX;
    const currentY = e.clientY;
    
    // 计算距离
    this.draggingDistance = currentX - this.startX;
    
    // 拖动时实时更新位置
    if (this.options.effect === 'slide' && this.options.useTransform) {
      const currentTranslate = this._getCurrentTranslate();
      const newTranslate = currentTranslate + this.draggingDistance;
      this._setTranslate(newTranslate);
    }
    
    // 触发拖拽移动回调
    if (typeof this.options.onDragMove === 'function') {
      try {
        this.options.onDragMove(e);
      } catch (error) {
        logger.error('拖拽移动回调执行失败', error);
      }
    }
  }

  /**
   * 处理鼠标释放
   * @private
   */
  _handleMouseUp(e) {
    if (!this.isDragging) return;
    
    // 判断是否应该切换幻灯片
    if (Math.abs(this.draggingDistance) >= 50) {
      if (this.draggingDistance > 0) {
        this.prev();
      } else {
        this.next();
      }
    } else {
      // 回到原位
      this.goTo(this.currentIndex, true);
    }
    
    // 重置状态
    this.isDragging = false;
    this.draggingDistance = 0;
    
    // 移除用户选择禁止类
    document.body.classList.remove('jev-carousel-no-select');
    
    // 恢复自动播放
    this.play();
    
    // 触发拖拽结束回调
    if (typeof this.options.onDragEnd === 'function') {
      try {
        this.options.onDragEnd(e);
      } catch (error) {
        logger.error('拖拽结束回调执行失败', error);
      }
    }
  }

  /**
   * 处理键盘事件
   * @private
   */
  _handleKeyDown(e) {
    // 左右箭头键或上下箭头键
    if (this.options.direction === 'horizontal') {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        this.prev();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        this.next();
      }
    } else {
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        this.prev();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        this.next();
      }
    }
  }

  /**
   * 获取当前的translate值
   * @private
   */
  _getCurrentTranslate() {
    const matrix = window.getComputedStyle(this.slidesContainer).transform;
    if (!matrix || matrix === 'none') {
      return 0;
    }
    
    const matrixValues = matrix.split('(')[1].split(')')[0].split(',');
    return this.options.direction === 'horizontal' ? parseInt(matrixValues[4], 10) : parseInt(matrixValues[5], 10);
  }

  /**
   * 设置translate值
   * @private
   */
  _setTranslate(value) {
    if (!this.options.useTransform) return;
    
    const transform = this.options.direction === 'horizontal' 
      ? `translate3d(${value}px, 0, 0)` 
      : `translate3d(0, ${value}px, 0)`;
    
    this.slidesContainer.style.transform = transform;
  }

  /**
   * 更新幻灯片大小
   * @private
   */
  _updateSlidesSize() {
    const totalSlides = this.slides.length;
    if (totalSlides === 0) return;
    
    const slideWidth = this.options.variableWidth ? 'auto' : `${100 / this.options.slidesToShow}%`;
    const slideHeight = this.options.direction === 'vertical' ? `${100 / this.options.slidesToShow}%` : '100%';
    
    this.slides.forEach(slide => {
      slide.style.width = slideWidth;
      slide.style.height = slideHeight;
      slide.style.marginRight = this.options.spaceBetween + 'px';
    });
  }

  /**
   * 渲染分页指示器
   * @private
   */
  _renderPagination() {
    if (!this.options.dots || !this.pagination) return;
    
    // 清空分页
    this.pagination.innerHTML = '';
    
    const totalSlides = this.slides.length;
    if (totalSlides === 0) return;
    
    // 计算需要的分页数量
    const totalPages = Math.ceil(totalSlides / this.options.slidesToShow);
    
    // 创建分页点
    for (let i = 0; i < totalPages; i++) {
      const dot = document.createElement('button');
      dot.className = `${this.options.dotClass} ${i === this.currentIndex ? this.options.activeDotClass : ''}`;
      dot.setAttribute('aria-label', `跳转到幻灯片 ${i + 1}`);
      dot.setAttribute('type', 'button');
      dot.setAttribute('tabindex', '0');
      
      // 添加点击事件
      dot.addEventListener('click', () => {
        this.goTo(i);
      });
      
      // 添加键盘事件
      dot.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.goTo(i);
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault();
          const prevIndex = i > 0 ? i - 1 : totalPages - 1;
          this.pagination.children[prevIndex].focus();
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          const nextIndex = i < totalPages - 1 ? i + 1 : 0;
          this.pagination.children[nextIndex].focus();
        }
      });
      
      this.pagination.appendChild(dot);
    }
  }

  /**
   * 更新进度条
   * @private
   */
  _updateProgress() {
    if (!this.progressBar || !this.options.autoplay) return;
    
    const progressWidth = (this.currentProgress / this.options.autoplayInterval) * 100;
    this.progressBar.querySelector('.jev-carousel-progress-bar').style.width = `${progressWidth}%`;
  }

  /**
   * 开始自动播放
   */
  startAutoplay() {
    if (!this.options.autoplay || this.isPaused) return;
    
    this.stopAutoplay();
    
    this.currentProgress = 0;
    this._updateProgress();
    
    // 使用requestAnimationFrame来平滑更新进度条
    const animateProgress = () => {
      if (!this.isPaused && !this.isDragging) {
        this.currentProgress += 16; // 约60fps
        this._updateProgress();
        
        if (this.currentProgress >= this.options.autoplayInterval) {
          this.next();
          this.currentProgress = 0;
        }
      }
      
      this.autoplayAnimationId = requestAnimationFrame(animateProgress);
    };
    
    this.autoplayAnimationId = requestAnimationFrame(animateProgress);
    
    // 同时设置定时器作为后备
    this.autoPlayTimer = setTimeout(() => {
      this.next();
    }, this.options.autoplayInterval);
    
    // 触发自动播放回调
    if (typeof this.options.onAutoplay === 'function') {
      try {
        this.options.onAutoplay();
      } catch (error) {
        logger.error('自动播放回调执行失败', error);
      }
    }
  }

  /**
   * 停止自动播放
   */
  stopAutoplay() {
    if (this.autoPlayTimer) {
      clearTimeout(this.autoPlayTimer);
      this.autoPlayTimer = null;
    }
    
    if (this.autoplayAnimationId) {
      cancelAnimationFrame(this.autoplayAnimationId);
      this.autoplayAnimationId = null;
    }
    
    // 触发自动播放停止回调
    if (typeof this.options.onAutoplayStop === 'function') {
      try {
        this.options.onAutoplayStop();
      } catch (error) {
        logger.error('自动播放停止回调执行失败', error);
      }
    }
  }

  /**
   * 暂停自动播放
   */
  pause() {
    if (this.isPaused) return;
    
    this.isPaused = true;
    this.updateState({ isPaused: true });
  }

  /**
   * 恢复自动播放
   */
  play() {
    if (!this.isPaused) return;
    
    this.isPaused = false;
    this.updateState({ isPaused: false });
  }

  /**
   * 切换到上一张
   */
  prev() {
    if (this.isAnimating) return;
    
    let newIndex = this.currentIndex - this.options.slidesToScroll;
    
    // 循环逻辑
    if (this.options.loop) {
      if (newIndex < 0) {
        newIndex = Math.ceil(this.slides.length / this.options.slidesToShow) - 1;
      }
    } else if (newIndex < 0) {
      newIndex = 0;
      
      // 触发到达开始回调
      if (typeof this.options.onReachBeginning === 'function') {
        try {
          this.options.onReachBeginning();
        } catch (error) {
          logger.error('到达开始回调执行失败', error);
        }
      }
    }
    
    this.goTo(newIndex);
  }

  /**
   * 切换到下一张
   */
  next() {
    if (this.isAnimating) return;
    
    let newIndex = this.currentIndex + this.options.slidesToScroll;
    const maxIndex = Math.ceil(this.slides.length / this.options.slidesToShow) - 1;
    
    // 循环逻辑
    if (this.options.loop) {
      if (newIndex > maxIndex) {
        newIndex = 0;
      }
    } else if (newIndex > maxIndex) {
      newIndex = maxIndex;
      
      // 触发到达结束回调
      if (typeof this.options.onReachEnd === 'function') {
        try {
          this.options.onReachEnd();
        } catch (error) {
          logger.error('到达结束回调执行失败', error);
        }
      }
    }
    
    this.goTo(newIndex);
  }

  /**
   * 跳转到指定幻灯片
   * @param {number} index - 目标索引
   * @param {boolean} animated - 是否使用动画
   */
  goTo(index, animated = true) {
    if (this.isAnimating || index === this.currentIndex) return;
    
    // 触发滑动变化开始回调
    if (typeof this.options.onSlideChangeStart === 'function') {
      try {
        this.options.onSlideChangeStart(this.currentIndex, index);
      } catch (error) {
        logger.error('滑动变化开始回调执行失败', error);
      }
    }
    
    this.isAnimating = true;
    this.updateState({ isAnimating: true });
    
    // 保存当前索引
    const oldIndex = this.currentIndex;
    
    // 更新当前索引
    this.currentIndex = index;
    this.updateState({ currentIndex: index });
    
    // 根据效果类型执行不同的动画
    switch (this.options.effect) {
      case 'fade':
        this._animateFade(index, oldIndex);
        break;
      case 'cube':
        this._animateCube(index, oldIndex);
        break;
      case 'coverflow':
        this._animateCoverflow(index);
        break;
      case 'flip':
        this._animateFlip(index, oldIndex);
        break;
      case 'slide':
      default:
        this._animateSlide(index, animated);
        break;
    }
    
    // 更新分页指示器
    this._renderPagination();
    
    // 重置自动播放
    if (this.options.autoplay) {
      this.stopAutoplay();
      this.startAutoplay();
    }
  }

  /**
   * 滑动动画
   * @private
   */
  _animateSlide(index, animated = true) {
    if (!this.options.useTransform) return;
    
    // 计算目标位置
    const slideWidth = this.options.variableWidth 
      ? this.slides[0].offsetWidth + this.options.spaceBetween 
      : (this.slidesContainer.offsetWidth / this.options.slidesToShow) + this.options.spaceBetween;
    
    const targetPosition = -index * slideWidth * this.options.slidesToShow;
    
    // 设置过渡
    if (!animated) {
      this.slidesContainer.style.transitionDuration = '0ms';
    }
    
    // 设置位置
    this._setTranslate(targetPosition);
    
    // 动画结束后处理
    setTimeout(() => {
      if (!animated) {
        this.slidesContainer.style.transitionDuration = `${this.options.speed}ms`;
      }
      
      this.isAnimating = false;
      this.updateState({ isAnimating: false });
      
      // 触发滑动变化结束回调
      this._triggerSlideChangeCallbacks();
    }, animated ? this.options.speed : 0);
  }

  /**
   * 淡入淡出动画
   * @private
   */
  _animateFade(newIndex, oldIndex) {
    // 确保索引有效
    if (oldIndex >= 0 && oldIndex < this.slides.length) {
      this.slides[oldIndex].classList.remove('jev-carousel-slide-active');
    }
    
    if (newIndex >= 0 && newIndex < this.slides.length) {
      this.slides[newIndex].classList.add('jev-carousel-slide-active');
    }
    
    // 动画结束后处理
    setTimeout(() => {
      this.isAnimating = false;
      this.updateState({ isAnimating: false });
      
      // 触发滑动变化结束回调
      this._triggerSlideChangeCallbacks();
    }, this.options.speed);
  }

  /**
   * 立方体动画
   * @private
   */
  _animateCube(newIndex, oldIndex) {
    // 简化的立方体动画实现
    this._animateSlide(newIndex);
  }

  /**
   * 覆盖流动画
   * @private
   */
  _animateCoverflow(newIndex) {
    // 简化的覆盖流动画实现
    this._animateSlide(newIndex);
  }

  /**
   * 翻转动画
   * @private
   */
  _animateFlip(newIndex, oldIndex) {
    // 简化的翻转动画实现
    this._animateFade(newIndex, oldIndex);
  }

  /**
   * 触发滑动变化回调
   * @private
   */
  _triggerSlideChangeCallbacks() {
    // 触发滑动变化回调
    if (typeof this.options.onSlideChange === 'function') {
      try {
        this.options.onSlideChange(this.currentIndex);
      } catch (error) {
        logger.error('滑动变化回调执行失败', error);
      }
    }
    
    // 触发滑动变化结束回调
    if (typeof this.options.onSlideChangeEnd === 'function') {
      try {
        this.options.onSlideChangeEnd(this.currentIndex);
      } catch (error) {
        logger.error('滑动变化结束回调执行失败', error);
      }
    }
  }

  /**
   * 添加幻灯片
   * @param {HTMLElement|string} slide - 幻灯片内容
   * @param {number} index - 插入位置（可选）
   */
  addSlide(slide, index = -1) {
    const slideElement = typeof slide === 'string' 
      ? this._createSlideFromString(slide) 
      : this._createSlideFromElement(slide);
    
    if (index >= 0 && index <= this.slides.length) {
      this.slidesContainer.insertBefore(slideElement, this.slidesContainer.children[index]);
      this.slides.splice(index, 0, slideElement);
    } else {
      this.slidesContainer.appendChild(slideElement);
      this.slides.push(slideElement);
    }
    
    // 更新幻灯片大小
    this._updateSlidesSize();
    
    // 重新渲染分页
    this._renderPagination();
    
    // 更新状态
    this.updateState({ totalSlides: this.slides.length });
    
    return slideElement;
  }

  /**
   * 从字符串创建幻灯片
   * @private
   */
  _createSlideFromString(content) {
    const slide = document.createElement('div');
    slide.className = 'jev-carousel-slide';
    slide.innerHTML = content;
    return slide;
  }

  /**
   * 从元素创建幻灯片
   * @private
   */
  _createSlideFromElement(element) {
    const slide = document.createElement('div');
    slide.className = 'jev-carousel-slide';
    slide.appendChild(element);
    return slide;
  }

  /**
   * 移除幻灯片
   * @param {number} index - 幻灯片索引
   */
  removeSlide(index) {
    if (index < 0 || index >= this.slides.length) return;
    
    const slideToRemove = this.slides[index];
    this.slidesContainer.removeChild(slideToRemove);
    this.slides.splice(index, 1);
    
    // 如果删除的是当前幻灯片，调整当前索引
    if (index <= this.currentIndex && this.currentIndex > 0) {
      this.currentIndex--;
      this.updateState({ currentIndex: this.currentIndex });
      
      // 重新定位
      this.goTo(this.currentIndex, false);
    }
    
    // 重新渲染分页
    this._renderPagination();
    
    // 更新状态
    this.updateState({ totalSlides: this.slides.length });
  }

  /**
   * 清空所有幻灯片
   */
  clearSlides() {
    this.slidesContainer.innerHTML = '';
    this.slides = [];
    this.currentIndex = 0;
    
    // 清空分页
    if (this.pagination) {
      this.pagination.innerHTML = '';
    }
    
    // 更新状态
    this.updateState({ currentIndex: 0, totalSlides: 0 });
  }

  /**
   * 获取当前幻灯片
   * @returns {HTMLElement|null} 当前幻灯片元素
   */
  getCurrentSlide() {
    return this.slides[this.currentIndex] || null;
  }

  /**
   * 获取所有幻灯片
   * @returns {HTMLElement[]} 幻灯片元素数组
   */
  getSlides() {
    return [...this.slides];
  }

  /**
   * 获取当前索引
   * @returns {number} 当前索引
   */
  getCurrentIndex() {
    return this.currentIndex;
  }

  /**
   * 设置自动播放间隔
   * @param {number} interval - 间隔时间（毫秒）
   */
  setAutoplayInterval(interval) {
    this.options.autoplayInterval = interval;
    
    if (this.options.autoplay) {
      this.stopAutoplay();
      this.startAutoplay();
    }
  }

  /**
   * 设置动画速度
   * @param {number} speed - 速度（毫秒）
   */
  setSpeed(speed) {
    this.options.speed = speed;
    this.slidesContainer.style.transitionDuration = `${speed}ms`;
  }

  /**
   * 设置效果
   * @param {string} effect - 效果类型
   */
  setEffect(effect) {
    this.options.effect = effect;
    this.element.classList.remove('jev-carousel-effect-slide', 'jev-carousel-effect-fade', 'jev-carousel-effect-cube', 'jev-carousel-effect-coverflow', 'jev-carousel-effect-flip');
    this.element.classList.add(`jev-carousel-effect-${effect}`);
    
    // 重新应用样式
    this._updateSlidesSize();
    this.goTo(this.currentIndex, false);
  }

  /**
   * 设置主题
   * @param {string} theme - 主题名称
   */
  setTheme(theme) {
    this.element.classList.remove(`jev-carousel-${this.options.theme}`);
    this.element.classList.add(`jev-carousel-${theme}`);
    this.options.theme = theme;
  }

  /**
   * 显示导航箭头
   */
  showArrows() {
    this.options.arrows = true;
    if (this.prevButton) this.prevButton.style.display = 'flex';
    if (this.nextButton) this.nextButton.style.display = 'flex';
  }

  /**
   * 隐藏导航箭头
   */
  hideArrows() {
    this.options.arrows = false;
    if (this.prevButton) this.prevButton.style.display = 'none';
    if (this.nextButton) this.nextButton.style.display = 'none';
  }

  /**
   * 显示分页指示器
   */
  showDots() {
    this.options.dots = true;
    if (this.pagination) this.pagination.style.display = 'flex';
    this._renderPagination();
  }

  /**
   * 隐藏分页指示器
   */
  hideDots() {
    this.options.dots = false;
    if (this.pagination) this.pagination.style.display = 'none';
  }

  /**
   * 暂停滑动（暂时不接受用户交互）
   */
  disable() {
    this.options.allowTouchMove = false;
    this.element.style.pointerEvents = 'none';
  }

  /**
   * 启用滑动
   */
  enable() {
    this.options.allowTouchMove = true;
    this.element.style.pointerEvents = 'auto';
  }

  /**
   * 获取状态
   * @returns {Object} 当前状态
   */
  getStatus() {
    return {
      currentIndex: this.currentIndex,
      totalSlides: this.slides.length,
      isAnimating: this.isAnimating,
      isPaused: this.isPaused,
      isDragging: this.isDragging,
      isAutoplay: this.options.autoplay && !this.isPaused
    };
  }

  /**
   * 资源释放与清理
   */
  async destroy() {
    try {
      // 停止自动播放
      this.stopAutoplay();
      
      // 清除定时器
      if (this.resizeTimeout) {
        clearTimeout(this.resizeTimeout);
      }
      
      // 移除DOM元素
      if (this.element && this.element.parentNode) {
        this.element.parentNode.removeChild(this.element);
      }
      
      // 清理引用
      this.slidesWrapper = null;
      this.slidesContainer = null;
      this.slides = [];
      this.prevButton = null;
      this.nextButton = null;
      this.pagination = null;
      this.progressBar = null;
      this.controlsContainer = null;
      
    } catch (error) {
      logger.error('轮播组件销毁失败', error);
    }
  }
}

export default Carousel;