/**
 * Timeline时间轴组件
 * 提供灵活的时间线展示功能，支持多种布局、方向和自定义样式
 */
import BaseComponent from './base-component.js';
import logger from '../utils/logger.js';

class Timeline extends BaseComponent {
  /**
   * 构造函数
   * @param {Object} options - 配置选项
   * @param {HTMLElement} container - 容器元素
   */
  constructor(options = {}, container = document.body) {
    super(options, container);
    
    // 组件元素引用
    this.timelineElement = null;
    this.itemsContainer = null;
    this.loadingElement = null;
    this.emptyElement = null;
    this.paginationElement = null;
    
    // 时间轴状态
    this.data = [];
    this.currentPage = 1;
    this.isLoading = false;
    this.direction = 'vertical';
    this.alignment = 'alternate';
    this.animationType = 'slide';
  }

  /**
   * 获取默认配置
   * @private
   */
  _getDefaultOptions() {
    return {
      ...super._getDefaultOptions(),
      width: '100%',
      height: 'auto',
      data: [],
      direction: 'vertical', // vertical, horizontal
      alignment: 'alternate', // left, right, alternate, center
      showConnectors: true,
      showDots: true,
      dotSize: 16,
      connectorWidth: 2,
      itemSpacing: 20,
      pagination: false,
      pageSize: 10,
      animation: true,
      animationType: 'slide', // slide, fade, scale
      animationDuration: 300,
      theme: 'default', // default, dark, neon
      loading: false,
      loadingText: '加载中...',
      emptyText: '暂无数据',
      reverseOrder: false,
      showTimestamps: true,
      showIcons: false,
      timestampFormat: 'YYYY-MM-DD HH:mm',
      onItemClick: null,
      onItemHover: null,
      onPageChange: null,
      onItemRender: null,
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
      data: [],
      currentPage: 1,
      isLoading: false
    };
  }

  /**
   * 创建DOM元素
   * @private
   */
  _createElement() {
    // 创建主容器
    this.element = document.createElement('div');
    this.element.className = `jev-timeline jev-timeline-${this.options.theme} jev-timeline-${this.options.direction}`;
    this.element.style.width = this.options.width;
    this.element.style.height = this.options.height;
    
    // 创建时间轴容器
    this.timelineElement = document.createElement('div');
    this.timelineElement.className = `jev-timeline-container jev-timeline-${this.options.alignment}`;
    this.element.appendChild(this.timelineElement);
    
    // 创建项目容器
    this.itemsContainer = document.createElement('div');
    this.itemsContainer.className = 'jev-timeline-items';
    this.timelineElement.appendChild(this.itemsContainer);
    
    // 创建加载状态
    this.loadingElement = document.createElement('div');
    this.loadingElement.className = 'jev-timeline-loading';
    this.loadingElement.textContent = this.options.loadingText;
    this.loadingElement.style.display = 'none';
    this.element.appendChild(this.loadingElement);
    
    // 创建空状态
    this.emptyElement = document.createElement('div');
    this.emptyElement.className = 'jev-timeline-empty';
    this.emptyElement.textContent = this.options.emptyText;
    this.element.appendChild(this.emptyElement);
    
    // 创建分页
    if (this.options.pagination) {
      this._createPagination();
    }
  }

  /**
   * 创建分页
   * @private
   */
  _createPagination() {
    this.paginationElement = document.createElement('div');
    this.paginationElement.className = 'jev-timeline-pagination';
    this.element.appendChild(this.paginationElement);
    
    // 分页信息
    this.paginationInfo = document.createElement('div');
    this.paginationInfo.className = 'jev-timeline-pagination-info';
    this.paginationElement.appendChild(this.paginationInfo);
    
    // 分页控制
    this.paginationControls = document.createElement('div');
    this.paginationControls.className = 'jev-timeline-pagination-controls';
    this.paginationElement.appendChild(this.paginationControls);
    
    // 上一页按钮
    this.prevPageBtn = document.createElement('button');
    this.prevPageBtn.className = 'jev-timeline-pagination-btn jev-timeline-prev-btn';
    this.prevPageBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M15 18L9 12L15 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    this.paginationControls.appendChild(this.prevPageBtn);
    
    // 页码容器
    this.pageNumbersContainer = document.createElement('div');
    this.pageNumbersContainer.className = 'jev-timeline-pagination-numbers';
    this.paginationControls.appendChild(this.pageNumbersContainer);
    
    // 下一页按钮
    this.nextPageBtn = document.createElement('button');
    this.nextPageBtn.className = 'jev-timeline-pagination-btn jev-timeline-next-btn';
    this.nextPageBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M9 18L15 12L9 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    this.paginationControls.appendChild(this.nextPageBtn);
  }

  /**
   * 应用样式
   * @private
   */
  _applyStyles() {
    // 添加全局样式
    this._addGlobalStyles();
    
    // 初始化数据
    this.data = this.options.data || [];
    this.direction = this.options.direction;
    this.alignment = this.options.alignment;
    this.animationType = this.options.animationType;
    
    // 绑定事件
    this._bindEvents();
    
    // 渲染时间轴
    this.render();
    
    // 触发初始化回调
    if (typeof this.options.onInit === 'function') {
      try {
        this.options.onInit();
      } catch (error) {
        logger.error('时间轴初始化回调执行失败', error);
      }
    }
  }

  /**
   * 添加全局样式
   * @private
   */
  _addGlobalStyles() {
    const styleId = 'jev-timeline-styles';
    if (document.getElementById(styleId)) {
      return;
    }
    
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      /* 时间轴容器样式 */
      .jev-timeline {
        position: relative;
        background-color: #fff;
        border-radius: 8px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        overflow: hidden;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      }
      
      /* 主题样式 - 默认 */
      .jev-timeline-default {
        background-color: #fff;
        color: #333;
      }
      
      /* 主题样式 - 深色 */
      .jev-timeline-dark {
        background-color: #2d3748;
        color: #e2e8f0;
      }
      
      /* 主题样式 - 霓虹灯 */
      .jev-timeline-neon {
        background-color: #1a1a1a;
        color: #00ff99;
        border: 1px solid rgba(0, 255, 153, 0.2);
        box-shadow: 0 0 20px rgba(0, 255, 153, 0.1);
      }
      
      /* 垂直时间轴 */
      .jev-timeline-vertical .jev-timeline-container {
        position: relative;
        padding: 20px;
      }
      
      .jev-timeline-vertical .jev-timeline-items {
        display: flex;
        flex-direction: column;
        gap: var(--timeline-item-spacing, 20px);
      }
      
      /* 水平时间轴 */
      .jev-timeline-horizontal .jev-timeline-container {
        overflow-x: auto;
        padding: 40px 20px;
      }
      
      .jev-timeline-horizontal .jev-timeline-items {
        display: flex;
        gap: var(--timeline-item-spacing, 20px);
        min-width: max-content;
      }
      
      /* 对齐方式 - 左侧 */
      .jev-timeline-left .jev-timeline-item {
        display: flex;
        flex-direction: row;
        align-items: flex-start;
      }
      
      .jev-timeline-left .jev-timeline-item-content {
        margin-left: 20px;
        text-align: left;
        flex: 1;
      }
      
      /* 对齐方式 - 右侧 */
      .jev-timeline-right .jev-timeline-item {
        display: flex;
        flex-direction: row-reverse;
        align-items: flex-start;
      }
      
      .jev-timeline-right .jev-timeline-item-content {
        margin-right: 20px;
        text-align: right;
        flex: 1;
      }
      
      /* 对齐方式 - 交替 */
      .jev-timeline-alternate .jev-timeline-item {
        display: flex;
        align-items: flex-start;
      }
      
      .jev-timeline-alternate .jev-timeline-item:nth-child(odd) {
        flex-direction: row;
      }
      
      .jev-timeline-alternate .jev-timeline-item:nth-child(even) {
        flex-direction: row-reverse;
      }
      
      .jev-timeline-alternate .jev-timeline-item:nth-child(odd) .jev-timeline-item-content {
        margin-left: 20px;
        text-align: left;
      }
      
      .jev-timeline-alternate .jev-timeline-item:nth-child(even) .jev-timeline-item-content {
        margin-right: 20px;
        text-align: right;
      }
      
      .jev-timeline-alternate .jev-timeline-item-content {
        flex: 1;
        max-width: calc(50% - 40px);
      }
      
      /* 对齐方式 - 居中 */
      .jev-timeline-center .jev-timeline-item {
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
      }
      
      .jev-timeline-center .jev-timeline-item-content {
        margin-top: 10px;
        max-width: 600px;
      }
      
      /* 水平方向的居中对齐 */
      .jev-timeline-horizontal.jev-timeline-center .jev-timeline-item {
        align-items: flex-start;
        text-align: center;
        flex-direction: column;
      }
      
      .jev-timeline-horizontal.jev-timeline-center .jev-timeline-item-content {
        margin-top: 10px;
        margin-left: 0;
        margin-right: 0;
      }
      
      /* 时间轴项目 */
      .jev-timeline-item {
        position: relative;
        opacity: 0;
        transform: translateY(20px);
        transition: opacity 0.3s ease, transform 0.3s ease;
      }
      
      .jev-timeline-item.animate-in {
        opacity: 1;
        transform: translateY(0);
      }
      
      .jev-timeline-item.animate-fade {
        transition: opacity 0.3s ease;
      }
      
      .jev-timeline-item.animate-scale {
        transition: opacity 0.3s ease, transform 0.3s ease;
      }
      
      .jev-timeline-item.animate-scale.animate-in {
        transform: scale(1);
      }
      
      .jev-timeline-item.animate-scale:not(.animate-in) {
        transform: scale(0.8);
      }
      
      /* 时间轴点 */
      .jev-timeline-dot {
        position: relative;
        width: var(--timeline-dot-size, 16px);
        height: var(--timeline-dot-size, 16px);
        border-radius: 50%;
        background-color: #007bff;
        flex-shrink: 0;
        z-index: 2;
      }
      
      .jev-timeline-dark .jev-timeline-dot {
        background-color: #38b2ac;
      }
      
      .jev-timeline-neon .jev-timeline-dot {
        background-color: #00ff99;
        box-shadow: 0 0 10px rgba(0, 255, 153, 0.5);
      }
      
      /* 时间轴连接器 */
      .jev-timeline-connector {
        position: absolute;
        background-color: #e2e8f0;
        z-index: 1;
      }
      
      .jev-timeline-dark .jev-timeline-connector {
        background-color: #4a5568;
      }
      
      .jev-timeline-neon .jev-timeline-connector {
        background-color: rgba(0, 255, 153, 0.3);
        box-shadow: 0 0 5px rgba(0, 255, 153, 0.2);
      }
      
      /* 垂直连接器 */
      .jev-timeline-vertical .jev-timeline-connector {
        width: var(--timeline-connector-width, 2px);
        top: var(--timeline-dot-size, 16px);
        bottom: calc(-1 * var(--timeline-item-spacing, 20px));
        left: 50%;
        transform: translateX(-50%);
      }
      
      .jev-timeline-vertical .jev-timeline-item:last-child .jev-timeline-connector {
        display: none;
      }
      
      /* 水平连接器 */
      .jev-timeline-horizontal .jev-timeline-connector {
        height: var(--timeline-connector-width, 2px);
        left: var(--timeline-dot-size, 16px);
        right: calc(-1 * var(--timeline-item-spacing, 20px));
        top: 50%;
        transform: translateY(-50%);
      }
      
      .jev-timeline-horizontal .jev-timeline-item:last-child .jev-timeline-connector {
        display: none;
      }
      
      /* 内容容器 */
      .jev-timeline-item-content {
        background-color: #f7fafc;
        border-radius: 8px;
        padding: 16px;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        transition: all 0.2s ease;
        position: relative;
      }
      
      .jev-timeline-item-content:hover {
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      }
      
      .jev-timeline-dark .jev-timeline-item-content {
        background-color: #374151;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
      }
      
      .jev-timeline-dark .jev-timeline-item-content:hover {
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
      }
      
      .jev-timeline-neon .jev-timeline-item-content {
        background-color: rgba(0, 255, 153, 0.05);
        box-shadow: 0 1px 3px rgba(0, 255, 153, 0.1);
        border: 1px solid rgba(0, 255, 153, 0.1);
      }
      
      .jev-timeline-neon .jev-timeline-item-content:hover {
        box-shadow: 0 4px 12px rgba(0, 255, 153, 0.2);
        border-color: rgba(0, 255, 153, 0.3);
      }
      
      /* 标题 */
      .jev-timeline-item-title {
        font-size: 16px;
        font-weight: 600;
        margin: 0 0 8px 0;
        color: inherit;
      }
      
      /* 内容 */
      .jev-timeline-item-body {
        font-size: 14px;
        line-height: 1.5;
        margin: 0 0 12px 0;
        color: inherit;
        opacity: 0.9;
      }
      
      /* 时间戳 */
      .jev-timeline-item-timestamp {
        font-size: 12px;
        color: #718096;
        margin: 0;
      }
      
      .jev-timeline-dark .jev-timeline-item-timestamp {
        color: #a0aec0;
      }
      
      .jev-timeline-neon .jev-timeline-item-timestamp {
        color: #00ff9966;
      }
      
      /* 图标 */
      .jev-timeline-item-icon {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        font-size: 10px;
        color: white;
        z-index: 3;
      }
      
      /* 加载状态 */
      .jev-timeline-loading {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 40px;
        color: #718096;
      }
      
      .jev-timeline-dark .jev-timeline-loading {
        color: #a0aec0;
      }
      
      .jev-timeline-neon .jev-timeline-loading {
        color: #00ff99;
      }
      
      /* 空状态 */
      .jev-timeline-empty {
        display: none;
        align-items: center;
        justify-content: center;
        padding: 60px 20px;
        text-align: center;
        color: #718096;
      }
      
      .jev-timeline-dark .jev-timeline-empty {
        color: #a0aec0;
      }
      
      .jev-timeline-neon .jev-timeline-empty {
        color: #00ff9966;
      }
      
      /* 分页样式 */
      .jev-timeline-pagination {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 15px 20px;
        border-top: 1px solid #e2e8f0;
      }
      
      .jev-timeline-dark .jev-timeline-pagination {
        border-top-color: #4a5568;
      }
      
      .jev-timeline-neon .jev-timeline-pagination {
        border-top-color: rgba(0, 255, 153, 0.3);
      }
      
      .jev-timeline-pagination-info {
        font-size: 14px;
        color: #718096;
      }
      
      .jev-timeline-dark .jev-timeline-pagination-info {
        color: #a0aec0;
      }
      
      .jev-timeline-neon .jev-timeline-pagination-info {
        color: #00ff9966;
      }
      
      .jev-timeline-pagination-controls {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      
      /* 分页按钮 */
      .jev-timeline-pagination-btn {
        width: 32px;
        height: 32px;
        border: 1px solid #e2e8f0;
        background-color: #fff;
        color: #333;
        border-radius: 4px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
      }
      
      .jev-timeline-pagination-btn:hover:not(:disabled) {
        background-color: #f7fafc;
      }
      
      .jev-timeline-pagination-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      
      .jev-timeline-dark .jev-timeline-pagination-btn {
        border-color: #4a5568;
        background-color: #374151;
        color: #e2e8f0;
      }
      
      .jev-timeline-dark .jev-timeline-pagination-btn:hover:not(:disabled) {
        background-color: #4a5568;
      }
      
      .jev-timeline-neon .jev-timeline-pagination-btn {
        border-color: rgba(0, 255, 153, 0.3);
        background-color: transparent;
        color: #00ff99;
      }
      
      .jev-timeline-neon .jev-timeline-pagination-btn:hover:not(:disabled) {
        background-color: rgba(0, 255, 153, 0.1);
        box-shadow: 0 0 8px rgba(0, 255, 153, 0.2);
      }
      
      /* 页码容器 */
      .jev-timeline-pagination-numbers {
        display: flex;
        gap: 4px;
      }
      
      /* 页码按钮 */
      .jev-timeline-page-btn {
        width: 28px;
        height: 28px;
        border: 1px solid #e2e8f0;
        background-color: #fff;
        color: #333;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
        transition: all 0.2s ease;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      .jev-timeline-page-btn:hover:not(:disabled) {
        background-color: #f7fafc;
      }
      
      .jev-timeline-page-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      
      .jev-timeline-page-btn.active {
        background-color: #007bff;
        border-color: #007bff;
        color: white;
      }
      
      .jev-timeline-dark .jev-timeline-page-btn {
        border-color: #4a5568;
        background-color: #374151;
        color: #e2e8f0;
      }
      
      .jev-timeline-dark .jev-timeline-page-btn:hover:not(:disabled) {
        background-color: #4a5568;
      }
      
      .jev-timeline-dark .jev-timeline-page-btn.active {
        background-color: #38b2ac;
        border-color: #38b2ac;
      }
      
      .jev-timeline-neon .jev-timeline-page-btn {
        border-color: rgba(0, 255, 153, 0.3);
        background-color: transparent;
        color: #00ff99;
      }
      
      .jev-timeline-neon .jev-timeline-page-btn:hover:not(:disabled) {
        background-color: rgba(0, 255, 153, 0.1);
      }
      
      .jev-timeline-neon .jev-timeline-page-btn.active {
        background-color: rgba(0, 255, 153, 0.2);
        border-color: #00ff99;
        box-shadow: 0 0 8px rgba(0, 255, 153, 0.3);
      }
      
      /* 省略号 */
      .jev-timeline-pagination-ellipsis {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 28px;
        height: 28px;
        color: #718096;
      }
      
      .jev-timeline-dark .jev-timeline-pagination-ellipsis {
        color: #a0aec0;
      }
      
      .jev-timeline-neon .jev-timeline-pagination-ellipsis {
        color: #00ff9966;
      }
      
      /* 响应式设计 */
      @media (max-width: 768px) {
        .jev-timeline-vertical .jev-timeline-container {
          padding: 15px;
        }
        
        /* 移动设备上强制左侧对齐 */
        .jev-timeline-vertical.jev-timeline-alternate .jev-timeline-item,
        .jev-timeline-vertical.jev-timeline-right .jev-timeline-item {
          flex-direction: row;
        }
        
        .jev-timeline-vertical.jev-timeline-alternate .jev-timeline-item-content,
        .jev-timeline-vertical.jev-timeline-right .jev-timeline-item-content {
          margin-left: 20px;
          margin-right: 0;
          text-align: left;
          max-width: none;
        }
        
        .jev-timeline-item-content {
          padding: 12px;
        }
        
        .jev-timeline-item-title {
          font-size: 15px;
        }
        
        .jev-timeline-item-body {
          font-size: 13px;
        }
        
        .jev-timeline-pagination {
          flex-direction: column;
          gap: 10px;
          padding: 10px 15px;
        }
        
        .jev-timeline-pagination-controls {
          flex-wrap: wrap;
          justify-content: center;
        }
      }
      
      @media (max-width: 480px) {
        .jev-timeline-vertical .jev-timeline-container {
          padding: 10px;
        }
        
        .jev-timeline-horizontal .jev-timeline-container {
          padding: 30px 10px;
        }
        
        .jev-timeline-item-content {
          padding: 10px;
        }
        
        .jev-timeline-item-title {
          font-size: 14px;
        }
        
        .jev-timeline-item-body {
          font-size: 12px;
        }
        
        .jev-timeline-pagination-btn {
          width: 28px;
          height: 28px;
        }
        
        .jev-timeline-page-btn {
          width: 24px;
          height: 24px;
          font-size: 12px;
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
    // 监听滚动以触发动画
    window.addEventListener('scroll', this._handleScroll.bind(this));
    
    // 绑定窗口大小变化事件
    window.addEventListener('resize', this._handleResize.bind(this));
    
    // 分页事件
    if (this.options.pagination) {
      this.prevPageBtn.addEventListener('click', () => this.prevPage());
      this.nextPageBtn.addEventListener('click', () => this.nextPage());
      this.pageNumbersContainer.addEventListener('click', this._handlePageClick.bind(this));
    }
  }

  /**
   * 处理滚动
   * @private
   */
  _handleScroll() {
    this._animateItems();
  }

  /**
   * 处理窗口大小变化
   * @private
   */
  _handleResize() {
    this._animateItems();
  }

  /**
   * 处理页码点击
   * @private
   */
  _handlePageClick(e) {
    if (e.target.classList.contains('jev-timeline-page-btn')) {
      const page = parseInt(e.target.textContent, 10);
      if (!isNaN(page)) {
        this.goToPage(page);
      }
    }
  }

  /**
   * 处理项目点击
   * @private
   */
  _handleItemClick(e, item, index) {
    if (typeof this.options.onItemClick === 'function') {
      try {
        this.options.onItemClick(item, index, e);
      } catch (error) {
        logger.error('项目点击回调执行失败', error);
      }
    }
  }

  /**
   * 处理项目悬停
   * @private
   */
  _handleItemHover(e, item, index, isEntering) {
    if (typeof this.options.onItemHover === 'function') {
      try {
        this.options.onItemHover(item, index, isEntering, e);
      } catch (error) {
        logger.error('项目悬停回调执行失败', error);
      }
    }
  }

  /**
   * 动画项目
   * @private
   */
  _animateItems() {
    if (!this.options.animation) return;
    
    const items = this.itemsContainer.querySelectorAll('.jev-timeline-item');
    items.forEach((item, index) => {
      const rect = item.getBoundingClientRect();
      const isVisible = rect.top < window.innerHeight && rect.bottom >= 0;
      
      if (isVisible) {
        // 添加适当的延迟以创建级联效果
        setTimeout(() => {
          item.classList.add('animate-in');
        }, index * 100);
      }
    });
  }

  /**
   * 渲染时间轴
   */
  render() {
    // 清空项目容器
    this.itemsContainer.innerHTML = '';
    
    // 设置CSS变量
    this._setCSSVariables();
    
    // 更新加载状态
    this._updateLoadingState();
    
    // 更新空状态
    this._updateEmptyState();
    
    // 获取要显示的数据
    const displayData = this._getDisplayData();
    
    // 渲染项目
    displayData.forEach((item, index) => {
      const timelineItem = this._createTimelineItem(item, index);
      this.itemsContainer.appendChild(timelineItem);
    });
    
    // 渲染分页
    if (this.options.pagination) {
      this._renderPagination();
    }
    
    // 触发动画
    setTimeout(() => {
      this._animateItems();
    }, 100);
  }

  /**
   * 设置CSS变量
   * @private
   */
  _setCSSVariables() {
    this.timelineElement.style.setProperty('--timeline-dot-size', `${this.options.dotSize}px`);
    this.timelineElement.style.setProperty('--timeline-connector-width', `${this.options.connectorWidth}px`);
    this.timelineElement.style.setProperty('--timeline-item-spacing', `${this.options.itemSpacing}px`);
  }

  /**
   * 更新加载状态
   * @private
   */
  _updateLoadingState() {
    this.loadingElement.style.display = this.isLoading ? 'flex' : 'none';
  }

  /**
   * 更新空状态
   * @private
   */
  _updateEmptyState() {
    const displayData = this._getDisplayData();
    this.emptyElement.style.display = displayData.length === 0 && !this.isLoading ? 'flex' : 'none';
  }

  /**
   * 获取要显示的数据
   * @private
   */
  _getDisplayData() {
    let data = [...this.data];
    
    // 反转顺序
    if (this.options.reverseOrder) {
      data = data.reverse();
    }
    
    // 分页
    if (this.options.pagination) {
      const startIndex = (this.currentPage - 1) * this.options.pageSize;
      const endIndex = startIndex + this.options.pageSize;
      data = data.slice(startIndex, endIndex);
    }
    
    return data;
  }

  /**
   * 创建时间轴项目
   * @private
   */
  _createTimelineItem(item, index) {
    const timelineItem = document.createElement('div');
    timelineItem.className = `jev-timeline-item animate-${this.animationType}`;
    
    // 创建点
    if (this.options.showDots) {
      const dot = document.createElement('div');
      dot.className = 'jev-timeline-dot';
      
      // 添加图标
      if (this.options.showIcons && item.icon) {
        const icon = document.createElement('span');
        icon.className = 'jev-timeline-item-icon';
        icon.textContent = item.icon;
        dot.appendChild(icon);
      }
      
      timelineItem.appendChild(dot);
    }
    
    // 创建连接器
    if (this.options.showConnectors) {
      const connector = document.createElement('div');
      connector.className = 'jev-timeline-connector';
      timelineItem.appendChild(connector);
    }
    
    // 创建内容容器
    const content = document.createElement('div');
    content.className = 'jev-timeline-item-content';
    
    // 添加标题
    if (item.title) {
      const title = document.createElement('h3');
      title.className = 'jev-timeline-item-title';
      title.textContent = item.title;
      content.appendChild(title);
    }
    
    // 添加内容
    if (item.content) {
      const body = document.createElement('div');
      body.className = 'jev-timeline-item-body';
      
      if (typeof item.content === 'string') {
        body.textContent = item.content;
      } else if (item.content instanceof Node) {
        body.appendChild(item.content);
      }
      
      content.appendChild(body);
    }
    
    // 添加时间戳
    if (this.options.showTimestamps && item.timestamp) {
      const timestamp = document.createElement('div');
      timestamp.className = 'jev-timeline-item-timestamp';
      timestamp.textContent = this._formatTimestamp(item.timestamp);
      content.appendChild(timestamp);
    }
    
    // 触发自定义渲染回调
    if (typeof this.options.onItemRender === 'function') {
      try {
        this.options.onItemRender(item, content, index);
      } catch (error) {
        logger.error('项目渲染回调执行失败', error);
      }
    }
    
    timelineItem.appendChild(content);
    
    // 添加事件监听
    timelineItem.addEventListener('click', (e) => this._handleItemClick(e, item, index));
    timelineItem.addEventListener('mouseenter', (e) => this._handleItemHover(e, item, index, true));
    timelineItem.addEventListener('mouseleave', (e) => this._handleItemHover(e, item, index, false));
    
    return timelineItem;
  }

  /**
   * 格式化时间戳
   * @private
   */
  _formatTimestamp(timestamp) {
    if (typeof timestamp === 'string') {
      return timestamp;
    }
    
    if (timestamp instanceof Date) {
      // 简单的日期格式化
      const year = timestamp.getFullYear();
      const month = String(timestamp.getMonth() + 1).padStart(2, '0');
      const day = String(timestamp.getDate()).padStart(2, '0');
      const hours = String(timestamp.getHours()).padStart(2, '0');
      const minutes = String(timestamp.getMinutes()).padStart(2, '0');
      
      return `${year}-${month}-${day} ${hours}:${minutes}`;
    }
    
    return String(timestamp);
  }

  /**
   * 渲染分页
   * @private
   */
  _renderPagination() {
    const totalItems = this.data.length;
    const totalPages = this.getTotalPages();
    const startItem = (this.currentPage - 1) * this.options.pageSize + 1;
    const endItem = Math.min(this.currentPage * this.options.pageSize, totalItems);
    
    // 更新分页信息
    this.paginationInfo.textContent = `显示 ${startItem}-${endItem} 共 ${totalItems} 项`;
    
    // 更新分页按钮状态
    this.prevPageBtn.disabled = this.currentPage === 1;
    this.nextPageBtn.disabled = this.currentPage === totalPages || totalPages === 0;
    
    // 渲染页码
    this.pageNumbersContainer.innerHTML = '';
    
    if (totalPages <= 7) {
      // 总页数不多，显示所有页码
      for (let i = 1; i <= totalPages; i++) {
        this._addPageButton(i);
      }
    } else {
      // 总页数较多，显示部分页码
      // 显示首页
      this._addPageButton(1);
      
      // 显示当前页附近的页码
      if (this.currentPage > 3) {
        this._addEllipsis();
      }
      
      const startPage = Math.max(2, this.currentPage - 2);
      const endPage = Math.min(totalPages - 1, this.currentPage + 2);
      
      for (let i = startPage; i <= endPage; i++) {
        this._addPageButton(i);
      }
      
      if (this.currentPage < totalPages - 2) {
        this._addEllipsis();
      }
      
      // 显示末页
      this._addPageButton(totalPages);
    }
  }

  /**
   * 添加页码按钮
   * @private
   */
  _addPageButton(page) {
    const button = document.createElement('button');
    button.className = `jev-timeline-page-btn ${page === this.currentPage ? 'active' : ''}`;
    button.textContent = page;
    this.pageNumbersContainer.appendChild(button);
  }

  /**
   * 添加省略号
   * @private
   */
  _addEllipsis() {
    const ellipsis = document.createElement('span');
    ellipsis.className = 'jev-timeline-pagination-ellipsis';
    ellipsis.textContent = '...';
    this.pageNumbersContainer.appendChild(ellipsis);
  }

  /**
   * 获取总页数
   */
  getTotalPages() {
    if (!this.options.pagination) return 1;
    return Math.ceil(this.data.length / this.options.pageSize);
  }

  /**
   * 前往指定页
   * @param {number} page - 页码
   */
  goToPage(page) {
    if (!this.options.pagination) return;
    
    const totalPages = this.getTotalPages();
    if (page < 1 || page > totalPages) return;
    
    this.currentPage = page;
    this.updateState({ currentPage: page });
    
    this.render();
    
    // 触发页码变化回调
    if (typeof this.options.onPageChange === 'function') {
      try {
        this.options.onPageChange(page, this.options.pageSize);
      } catch (error) {
        logger.error('页码变化回调执行失败', error);
      }
    }
  }

  /**
   * 上一页
   */
  prevPage() {
    if (this.currentPage > 1) {
      this.goToPage(this.currentPage - 1);
    }
  }

  /**
   * 下一页
   */
  nextPage() {
    const totalPages = this.getTotalPages();
    if (this.currentPage < totalPages) {
      this.goToPage(this.currentPage + 1);
    }
  }

  /**
   * 设置数据
   * @param {Array} data - 新数据
   */
  setData(data) {
    this.data = data || [];
    this.currentPage = 1;
    
    this.updateState({
      data: this.data,
      currentPage: 1
    });
    
    this.render();
  }

  /**
   * 添加项目
   * @param {Object|Array} items - 要添加的项目
   */
  addItems(items) {
    if (Array.isArray(items)) {
      this.data.push(...items);
    } else {
      this.data.push(items);
    }
    
    this.updateState({ data: this.data });
    this.render();
  }

  /**
   * 更新项目
   * @param {number} index - 项目索引
   * @param {Object} newData - 新数据
   */
  updateItem(index, newData) {
    if (index >= 0 && index < this.data.length) {
      this.data[index] = { ...this.data[index], ...newData };
      this.updateState({ data: this.data });
      this.render();
    }
  }

  /**
   * 删除项目
   * @param {number} index - 项目索引
   */
  removeItem(index) {
    if (index >= 0 && index < this.data.length) {
      this.data.splice(index, 1);
      
      // 调整当前页
      const totalPages = this.getTotalPages();
      if (this.currentPage > totalPages && totalPages > 0) {
        this.currentPage = totalPages;
      }
      
      this.updateState({
        data: this.data,
        currentPage: this.currentPage
      });
      
      this.render();
    }
  }

  /**
   * 清空数据
   */
  clearData() {
    this.data = [];
    this.currentPage = 1;
    
    this.updateState({
      data: this.data,
      currentPage: 1
    });
    
    this.render();
  }

  /**
   * 设置方向
   * @param {string} direction - 方向
   */
  setDirection(direction) {
    this.element.classList.remove(`jev-timeline-${this.direction}`);
    this.direction = direction;
    this.element.classList.add(`jev-timeline-${this.direction}`);
    this.render();
  }

  /**
   * 设置对齐方式
   * @param {string} alignment - 对齐方式
   */
  setAlignment(alignment) {
    this.timelineElement.classList.remove(`jev-timeline-${this.alignment}`);
    this.alignment = alignment;
    this.timelineElement.classList.add(`jev-timeline-${this.alignment}`);
    this.render();
  }

  /**
   * 设置主题
   * @param {string} theme - 主题名称
   */
  setTheme(theme) {
    this.element.classList.remove(`jev-timeline-${this.options.theme}`);
    this.element.classList.add(`jev-timeline-${theme}`);
    this.options.theme = theme;
  }

  /**
   * 设置加载状态
   * @param {boolean} loading - 是否加载中
   */
  setLoading(loading) {
    this.isLoading = loading;
    this.updateState({ isLoading: loading });
    this._updateLoadingState();
  }

  /**
   * 设置点大小
   * @param {number} size - 大小
   */
  setDotSize(size) {
    this.options.dotSize = size;
    this._setCSSVariables();
    this.render();
  }

  /**
   * 设置连接器宽度
   * @param {number} width - 宽度
   */
  setConnectorWidth(width) {
    this.options.connectorWidth = width;
    this._setCSSVariables();
    this.render();
  }

  /**
   * 设置项目间距
   * @param {number} spacing - 间距
   */
  setItemSpacing(spacing) {
    this.options.itemSpacing = spacing;
    this._setCSSVariables();
    this.render();
  }

  /**
   * 设置页大小
   * @param {number} pageSize - 页大小
   */
  setPageSize(pageSize) {
    this.options.pageSize = pageSize;
    this.currentPage = 1;
    
    this.updateState({ currentPage: 1 });
    
    this.render();
  }

  /**
   * 启用/禁用动画
   * @param {boolean} enabled - 是否启用
   */
  setAnimationEnabled(enabled) {
    this.options.animation = enabled;
  }

  /**
   * 设置动画类型
   * @param {string} type - 动画类型
   */
  setAnimationType(type) {
    this.animationType = type;
    this.render();
  }

  /**
   * 获取所有数据
   * @returns {Array} 数据
   */
  getData() {
    return [...this.data];
  }

  /**
   * 获取当前页数据
   * @returns {Array} 当前页数据
   */
  getCurrentPageData() {
    return this._getDisplayData();
  }

  /**
   * 获取当前页码
   * @returns {number} 当前页码
   */
  getCurrentPage() {
    return this.currentPage;
  }

  /**
   * 滚动到指定项目
   * @param {number} index - 项目索引
   */
  scrollToItem(index) {
    const items = this.itemsContainer.querySelectorAll('.jev-timeline-item');
    if (items[index]) {
      items[index].scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  /**
   * 刷新时间轴
   */
  refresh() {
    this.render();
  }

  /**
   * 资源释放与清理
   */
  async destroy() {
    try {
      // 移除事件监听
      window.removeEventListener('scroll', this._handleScroll.bind(this));
      window.removeEventListener('resize', this._handleResize.bind(this));
      
      // 移除DOM元素
      if (this.element && this.element.parentNode) {
        this.element.parentNode.removeChild(this.element);
      }
      
      // 清理引用
      this.timelineElement = null;
      this.itemsContainer = null;
      this.loadingElement = null;
      this.emptyElement = null;
      this.paginationElement = null;
      
      // 清空数据
      this.data = [];
      
    } catch (error) {
      logger.error('时间轴组件销毁失败', error);
    }
  }
}

export default Timeline;