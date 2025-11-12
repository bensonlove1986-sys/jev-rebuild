/**
 * Tabs标签页组件
 * 提供选项卡式界面，支持多种主题、动画效果和丰富的交互方式
 */
import BaseComponent from './base-component.js';
import logger from '../utils/logger.js';

class Tabs extends BaseComponent {
  /**
   * 构造函数
   * @param {Object} options - 配置选项
   */
  constructor(options = {}) {
    super(options);
    
    // 组件元素引用
    this.tabsContainer = null;
    this.tabList = null;
    this.tabContents = null;
    
    // 状态管理
    this.activeTab = null;
    this.tabItems = [];
    this.contentItems = [];
    this.disabledTabs = new Set();
    
    // 事件处理器
    this._clickHandlers = new Map();
    this._keydownHandlers = new Map();
    this._resizeHandler = null;
    
    // 动画相关
    this.animationTimeout = null;
  }

  /**
   * 获取默认配置
   * @private
   */
  _getDefaultOptions() {
    return {
      ...super._getDefaultOptions(),
      tabs: [],
      activeTab: 0,
      theme: 'neon', // neon, default, dark
      placement: 'top', // top, bottom, left, right
      animation: 'fade', // fade, slide, none
      animationDuration: 300,
      lazyLoad: false,
      closable: false,
      draggable: false,
      hideEmptyContent: true,
      showScrollButtons: true,
      useKeyboardNavigation: true,
      onTabClick: null,
      onTabChange: null,
      onTabAdd: null,
      onTabRemove: null,
      onTabClose: null,
      beforeTabClose: null
    };
  }

  /**
   * 获取初始状态
   * @private
   */
  _getInitialState() {
    return {
      ...super._getInitialState(),
      activeTab: this.options.activeTab,
      tabs: this.options.tabs
    };
  }

  /**
   * 创建DOM元素
   * @private
   */
  _createElement() {
    // 主容器
    this.element = document.createElement('div');
    this.element.className = `jev-tabs jev-tabs-${this.options.theme} jev-tabs-${this.options.placement}`;
    
    // 标签列表容器
    this.tabsContainer = document.createElement('div');
    this.tabsContainer.className = 'jev-tabs-header';
    
    // 标签列表
    this.tabList = document.createElement('div');
    this.tabList.className = 'jev-tabs-nav';
    this.tabList.setAttribute('role', 'tablist');
    
    // 滚动按钮
    if (this.options.showScrollButtons) {
      const prevButton = document.createElement('button');
      prevButton.className = 'jev-tabs-scroll-btn jev-tabs-prev-btn';
      prevButton.innerHTML = '&larr;';
      prevButton.setAttribute('aria-label', 'Previous tab');
      prevButton.addEventListener('click', () => this._scrollTabs(-1));
      
      const nextButton = document.createElement('button');
      nextButton.className = 'jev-tabs-scroll-btn jev-tabs-next-btn';
      nextButton.innerHTML = '&rarr;';
      nextButton.setAttribute('aria-label', 'Next tab');
      nextButton.addEventListener('click', () => this._scrollTabs(1));
      
      this.tabsContainer.appendChild(prevButton);
      this.tabsContainer.appendChild(nextButton);
    }
    
    // 内容容器
    this.tabContents = document.createElement('div');
    this.tabContents.className = 'jev-tabs-content';
    
    // 组装组件
    this.tabsContainer.appendChild(this.tabList);
    this.element.appendChild(this.tabsContainer);
    this.element.appendChild(this.tabContents);
    
    // 创建标签和内容
    this._createTabs();
  }

  /**
   * 创建标签
   * @private
   */
  _createTabs() {
    this.state.tabs.forEach((tab, index) => {
      this._addTabInternal(tab, index);
    });
  }

  /**
   * 添加标签内部方法
   * @private
   */
  _addTabInternal(tab, index) {
    const tabItem = document.createElement('button');
    tabItem.className = `jev-tabs-tab ${index === this.state.activeTab ? 'jev-tabs-tab-active' : ''} ${tab.disabled ? 'jev-tabs-tab-disabled' : ''}`;
    tabItem.setAttribute('role', 'tab');
    tabItem.setAttribute('aria-selected', index === this.state.activeTab ? 'true' : 'false');
    tabItem.setAttribute('aria-controls', `jev-tabs-panel-${index}`);
    tabItem.setAttribute('id', `jev-tabs-tab-${index}`);
    tabItem.tabIndex = index === this.state.activeTab ? 0 : -1;
    
    // 设置标签文本
    tabItem.innerHTML = `<span class="jev-tabs-tab-text">${tab.title}</span>`;
    
    // 添加关闭按钮
    if (this.options.closable && !tab.closable === false) {
      const closeButton = document.createElement('button');
      closeButton.className = 'jev-tabs-tab-close';
      closeButton.innerHTML = '&times;';
      closeButton.setAttribute('aria-label', `Close ${tab.title} tab`);
      closeButton.addEventListener('click', (e) => {
        e.stopPropagation();
        this.closeTab(index);
      });
      tabItem.appendChild(closeButton);
    }
    
    // 创建内容面板
    const contentItem = document.createElement('div');
    contentItem.className = `jev-tabs-panel ${index === this.state.activeTab ? 'jev-tabs-panel-active' : ''}`;
    contentItem.setAttribute('role', 'tabpanel');
    contentItem.setAttribute('aria-labelledby', `jev-tabs-tab-${index}`);
    contentItem.setAttribute('id', `jev-tabs-panel-${index}`);
    contentItem.setAttribute('hidden', index !== this.state.activeTab);
    
    // 设置内容
    if (typeof tab.content === 'string') {
      contentItem.innerHTML = tab.content;
    } else if (tab.content instanceof HTMLElement) {
      contentItem.appendChild(tab.content);
    } else if (tab.render && typeof tab.render === 'function' && (!this.options.lazyLoad || index === this.state.activeTab)) {
      // 延迟加载支持
      try {
        const renderedContent = tab.render();
        if (typeof renderedContent === 'string') {
          contentItem.innerHTML = renderedContent;
        } else if (renderedContent instanceof HTMLElement) {
          contentItem.appendChild(renderedContent);
        }
      } catch (error) {
        logger.error('标签渲染失败', error);
        contentItem.innerHTML = '<div class="jev-tabs-error">内容渲染失败</div>';
      }
    } else if (this.options.hideEmptyContent && !tab.content && !tab.render) {
      contentItem.classList.add('jev-tabs-panel-empty');
      contentItem.innerHTML = '<div class="jev-tabs-empty-text">暂无内容</div>';
    }
    
    // 添加到DOM
    this.tabList.appendChild(tabItem);
    this.tabContents.appendChild(contentItem);
    
    // 存储引用
    this.tabItems.push(tabItem);
    this.contentItems.push(contentItem);
    
    if (tab.disabled) {
      this.disabledTabs.add(index);
    }
    
    // 绑定点击事件
    const clickHandler = () => this._handleTabClick(index);
    this._clickHandlers.set(index, clickHandler);
    tabItem.addEventListener('click', clickHandler);
    
    // 绑定键盘事件
    if (this.options.useKeyboardNavigation) {
      const keydownHandler = (e) => this._handleKeydown(e, index);
      this._keydownHandlers.set(index, keydownHandler);
      tabItem.addEventListener('keydown', keydownHandler);
    }
    
    // 初始化拖拽
    if (this.options.draggable) {
      this._initDraggable(tabItem, index);
    }
    
    // 如果是第一个标签，设置为活动标签
    if (index === this.state.activeTab) {
      this.activeTab = index;
    }
  }

  /**
   * 应用样式
   * @private
   */
  _applyStyles() {
    // 添加全局样式
    this._addGlobalStyle('jev-tabs-styles', `
      /* 基础样式 */
      .jev-tabs {
        display: flex;
        flex-direction: column;
        width: 100%;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }
      
      /* 标签头部样式 */
      .jev-tabs-header {
        display: flex;
        align-items: center;
        position: relative;
      }
      
      .jev-tabs-nav {
        display: flex;
        flex: 1;
        overflow-x: auto;
        overflow-y: hidden;
        scrollbar-width: none;
        -ms-overflow-style: none;
        white-space: nowrap;
        position: relative;
      }
      
      .jev-tabs-nav::-webkit-scrollbar {
        display: none;
      }
      
      /* 滚动按钮 */
      .jev-tabs-scroll-btn {
        position: absolute;
        top: 50%;
        transform: translateY(-50%);
        width: 32px;
        height: 32px;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        z-index: 1;
        display: none;
      }
      
      .jev-tabs-prev-btn {
        left: 0;
      }
      
      .jev-tabs-next-btn {
        right: 0;
      }
      
      /* 标签按钮样式 */
      .jev-tabs-tab {
        display: inline-flex;
        align-items: center;
        padding: 12px 20px;
        border: none;
        background: none;
        cursor: pointer;
        position: relative;
        outline: none;
        transition: all 0.3s ease;
        user-select: none;
      }
      
      .jev-tabs-tab-text {
        margin-right: 8px;
      }
      
      /* 关闭按钮 */
      .jev-tabs-tab-close {
        width: 20px;
        height: 20px;
        padding: 0;
        border: none;
        background: none;
        cursor: pointer;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 16px;
        opacity: 0.7;
        transition: all 0.2s ease;
      }
      
      .jev-tabs-tab-close:hover {
        opacity: 1;
        transform: scale(1.1);
      }
      
      /* 内容面板样式 */
      .jev-tabs-content {
        position: relative;
        flex: 1;
        min-height: 200px;
      }
      
      .jev-tabs-panel {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        min-height: 100%;
        padding: 20px;
        box-sizing: border-box;
      }
      
      .jev-tabs-panel-active {
        position: relative;
      }
      
      /* 空内容提示 */
      .jev-tabs-panel-empty {
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 200px;
      }
      
      .jev-tabs-empty-text {
        color: #999;
        font-size: 14px;
      }
      
      /* 错误提示 */
      .jev-tabs-error {
        color: #ff0040;
        padding: 20px;
        text-align: center;
      }
      
      /* 动画效果 */
      .jev-tabs-panel-active.jev-tabs-animation-fade {
        animation: jev-tabs-fade-in 0.3s ease;
      }
      
      .jev-tabs-panel-active.jev-tabs-animation-slide {
        animation: jev-tabs-slide-in 0.3s ease;
      }
      
      @keyframes jev-tabs-fade-in {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      
      @keyframes jev-tabs-slide-in {
        from {
          opacity: 0;
          transform: translateY(10px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      
      /* 位置样式 - 顶部 */
      .jev-tabs-top .jev-tabs-nav {
        border-bottom: 2px solid transparent;
      }
      
      /* 位置样式 - 底部 */
      .jev-tabs-bottom {
        flex-direction: column-reverse;
      }
      
      .jev-tabs-bottom .jev-tabs-nav {
        border-top: 2px solid transparent;
      }
      
      /* 位置样式 - 左侧 */
      .jev-tabs-left {
        flex-direction: row;
      }
      
      .jev-tabs-left .jev-tabs-nav {
        flex-direction: column;
        overflow-x: hidden;
        overflow-y: auto;
        width: 200px;
        border-right: 2px solid transparent;
      }
      
      .jev-tabs-left .jev-tabs-tab {
        width: 100%;
        justify-content: space-between;
      }
      
      /* 位置样式 - 右侧 */
      .jev-tabs-right {
        flex-direction: row-reverse;
      }
      
      .jev-tabs-right .jev-tabs-nav {
        flex-direction: column;
        overflow-x: hidden;
        overflow-y: auto;
        width: 200px;
        border-left: 2px solid transparent;
      }
      
      .jev-tabs-right .jev-tabs-tab {
        width: 100%;
        justify-content: space-between;
      }
      
      /* Neon主题样式 */
      .jev-tabs-neon {
        background-color: #1a1a1a;
        border-radius: 8px;
        overflow: hidden;
      }
      
      .jev-tabs-neon .jev-tabs-nav {
        background-color: #222;
        border-color: #00ff99;
      }
      
      .jev-tabs-neon .jev-tabs-tab {
        color: #ccc;
      }
      
      .jev-tabs-neon .jev-tabs-tab:hover:not(.jev-tabs-tab-disabled) {
        color: #00ff99;
        background-color: rgba(0, 255, 153, 0.1);
      }
      
      .jev-tabs-neon .jev-tabs-tab-active {
        color: #00ff99;
        background-color: rgba(0, 255, 153, 0.1);
      }
      
      .jev-tabs-neon .jev-tabs-tab-active::after {
        content: '';
        position: absolute;
        bottom: 0;
        left: 0;
        width: 100%;
        height: 2px;
        background: linear-gradient(90deg, #00ff99, #0099ff);
        box-shadow: 0 0 10px rgba(0, 255, 153, 0.5);
      }
      
      .jev-tabs-neon .jev-tabs-tab-disabled {
        color: #666;
        cursor: not-allowed;
      }
      
      .jev-tabs-neon .jev-tabs-content {
        background-color: #1a1a1a;
        color: #fff;
      }
      
      .jev-tabs-neon .jev-tabs-scroll-btn {
        background-color: #222;
        color: #00ff99;
      }
      
      .jev-tabs-neon .jev-tabs-scroll-btn:hover {
        background-color: rgba(0, 255, 153, 0.1);
        box-shadow: 0 0 10px rgba(0, 255, 153, 0.3);
      }
      
      .jev-tabs-neon .jev-tabs-tab-close {
        color: #00ff99;
      }
      
      .jev-tabs-neon .jev-tabs-empty-text,
      .jev-tabs-neon .jev-tabs-error {
        color: #999;
      }
      
      /* Default主题样式 */
      .jev-tabs-default {
        border-radius: 8px;
        overflow: hidden;
        border: 1px solid #e0e0e0;
      }
      
      .jev-tabs-default .jev-tabs-nav {
        background-color: #f8f9fa;
        border-color: #dee2e6;
      }
      
      .jev-tabs-default .jev-tabs-tab {
        color: #495057;
      }
      
      .jev-tabs-default .jev-tabs-tab:hover:not(.jev-tabs-tab-disabled) {
        color: #007bff;
        background-color: #e9ecef;
      }
      
      .jev-tabs-default .jev-tabs-tab-active {
        color: #007bff;
        background-color: #fff;
      }
      
      .jev-tabs-default .jev-tabs-tab-active::after {
        content: '';
        position: absolute;
        bottom: 0;
        left: 0;
        width: 100%;
        height: 2px;
        background-color: #007bff;
      }
      
      .jev-tabs-default .jev-tabs-tab-disabled {
        color: #adb5bd;
        cursor: not-allowed;
      }
      
      .jev-tabs-default .jev-tabs-content {
        background-color: #fff;
        color: #333;
      }
      
      .jev-tabs-default .jev-tabs-scroll-btn {
        background-color: #f8f9fa;
        color: #495057;
      }
      
      .jev-tabs-default .jev-tabs-scroll-btn:hover {
        background-color: #e9ecef;
      }
      
      .jev-tabs-default .jev-tabs-tab-close {
        color: #6c757d;
      }
      
      /* Dark主题样式 */
      .jev-tabs-dark {
        background-color: #2d3748;
        border-radius: 8px;
        overflow: hidden;
      }
      
      .jev-tabs-dark .jev-tabs-nav {
        background-color: #1a202c;
        border-color: #4a5568;
      }
      
      .jev-tabs-dark .jev-tabs-tab {
        color: #cbd5e0;
      }
      
      .jev-tabs-dark .jev-tabs-tab:hover:not(.jev-tabs-tab-disabled) {
        color: #63b3ed;
        background-color: #2d3748;
      }
      
      .jev-tabs-dark .jev-tabs-tab-active {
        color: #63b3ed;
        background-color: #2d3748;
      }
      
      .jev-tabs-dark .jev-tabs-tab-active::after {
        content: '';
        position: absolute;
        bottom: 0;
        left: 0;
        width: 100%;
        height: 2px;
        background-color: #63b3ed;
      }
      
      .jev-tabs-dark .jev-tabs-tab-disabled {
        color: #718096;
        cursor: not-allowed;
      }
      
      .jev-tabs-dark .jev-tabs-content {
        background-color: #2d3748;
        color: #e2e8f0;
      }
      
      .jev-tabs-dark .jev-tabs-scroll-btn {
        background-color: #1a202c;
        color: #cbd5e0;
      }
      
      .jev-tabs-dark .jev-tabs-scroll-btn:hover {
        background-color: #2d3748;
      }
      
      .jev-tabs-dark .jev-tabs-tab-close {
        color: #cbd5e0;
      }
      
      /* 响应式设计 */
      @media (max-width: 768px) {
        .jev-tabs-tab {
          padding: 10px 15px;
          font-size: 14px;
        }
        
        .jev-tabs-panel {
          padding: 15px;
        }
        
        .jev-tabs-left .jev-tabs-nav,
        .jev-tabs-right .jev-tabs-nav {
          width: 150px;
        }
      }
      
      @media (max-width: 480px) {
        .jev-tabs-scroll-btn {
          display: flex;
        }
      }
    `);
    
    // 初始化动画
    this._updateAnimationClasses();
    
    // 绑定窗口大小变化事件
    this._resizeHandler = () => this._checkScrollButtons();
    window.addEventListener('resize', this._resizeHandler);
    
    // 初始检查滚动按钮
    setTimeout(() => this._checkScrollButtons(), 100);
  }

  /**
   * 绑定事件
   * @private
   */
  _bindEvents() {
    // 事件已在创建标签时绑定
  }

  /**
   * 解绑事件
   * @private
   */
  _unbindEvents() {
    // 清理点击事件
    this._clickHandlers.forEach((handler, index) => {
      const tab = this.tabItems[index];
      if (tab) {
        tab.removeEventListener('click', handler);
      }
    });
    
    // 清理键盘事件
    this._keydownHandlers.forEach((handler, index) => {
      const tab = this.tabItems[index];
      if (tab) {
        tab.removeEventListener('keydown', handler);
      }
    });
    
    // 清理窗口大小变化事件
    if (this._resizeHandler) {
      window.removeEventListener('resize', this._resizeHandler);
      this._resizeHandler = null;
    }
    
    // 清空处理器映射
    this._clickHandlers.clear();
    this._keydownHandlers.clear();
  }

  /**
   * 处理标签点击
   * @private
   */
  _handleTabClick(index) {
    // 检查是否禁用
    if (this.disabledTabs.has(index)) {
      return;
    }
    
    // 触发点击回调
    if (typeof this.options.onTabClick === 'function') {
      try {
        this.options.onTabClick(index, this.state.tabs[index]);
      } catch (error) {
        logger.error('标签点击回调执行失败', error);
      }
    }
    
    // 切换标签
    this.setActiveTab(index);
  }

  /**
   * 处理键盘导航
   * @private
   */
  _handleKeydown(event, index) {
    switch (event.key) {
      case 'ArrowRight':
        event.preventDefault();
        this._navigateTabs(1, index);
        break;
      case 'ArrowLeft':
        event.preventDefault();
        this._navigateTabs(-1, index);
        break;
      case 'ArrowUp':
        event.preventDefault();
        this._navigateTabs(-1, index);
        break;
      case 'ArrowDown':
        event.preventDefault();
        this._navigateTabs(1, index);
        break;
      case 'Home':
        event.preventDefault();
        this.setActiveTab(0);
        break;
      case 'End':
        event.preventDefault();
        this.setActiveTab(this.state.tabs.length - 1);
        break;
      case 'Enter':
      case ' ': 
        event.preventDefault();
        this._handleTabClick(index);
        break;
    }
  }

  /**
   * 导航标签
   * @private
   */
  _navigateTabs(direction, currentIndex) {
    const tabsCount = this.state.tabs.length;
    let newIndex = currentIndex + direction;
    
    // 循环导航
    if (newIndex < 0) {
      newIndex = tabsCount - 1;
    } else if (newIndex >= tabsCount) {
      newIndex = 0;
    }
    
    // 跳过禁用的标签
    let attempts = 0;
    while (this.disabledTabs.has(newIndex) && attempts < tabsCount) {
      newIndex = (newIndex + direction + tabsCount) % tabsCount;
      attempts++;
    }
    
    // 设置活动标签
    if (attempts < tabsCount) {
      this.setActiveTab(newIndex);
      this.tabItems[newIndex]?.focus();
    }
  }

  /**
   * 更新动画类
   * @private
   */
  _updateAnimationClasses() {
    this.contentItems.forEach((content, index) => {
      // 清除所有动画类
      content.classList.remove('jev-tabs-animation-fade', 'jev-tabs-animation-slide');
      
      // 添加当前动画类
      if (index === this.state.activeTab && this.options.animation !== 'none') {
        content.classList.add(`jev-tabs-animation-${this.options.animation}`);
      }
    });
  }

  /**
   * 检查滚动按钮显示状态
   * @private
   */
  _checkScrollButtons() {
    if (!this.options.showScrollButtons || !this.tabList) return;
    
    const prevButton = this.tabsContainer?.querySelector('.jev-tabs-prev-btn');
    const nextButton = this.tabsContainer?.querySelector('.jev-tabs-next-btn');
    
    if (prevButton && nextButton) {
      const { scrollLeft, scrollWidth, clientWidth } = this.tabList;
      
      prevButton.style.display = scrollLeft > 10 ? 'flex' : 'none';
      nextButton.style.display = scrollLeft < scrollWidth - clientWidth - 10 ? 'flex' : 'none';
    }
  }

  /**
   * 滚动标签
   * @private
   */
  _scrollTabs(direction) {
    if (!this.tabList) return;
    
    const scrollAmount = 200;
    this.tabList.scrollBy({ 
      left: direction * scrollAmount, 
      behavior: 'smooth' 
    });
    
    // 检查滚动按钮状态
    setTimeout(() => this._checkScrollButtons(), 300);
  }

  /**
   * 初始化拖拽功能
   * @private
   */
  _initDraggable(tabItem, index) {
    let isDragging = false;
    let dragStartX, dragStartY;
    let dragIndex = -1;
    
    const handleDragStart = (e) => {
      // 忽略关闭按钮拖拽
      if (e.target.closest('.jev-tabs-tab-close')) {
        return;
      }
      
      isDragging = true;
      dragIndex = index;
      dragStartX = e.clientX || e.touches[0].clientX;
      dragStartY = e.clientY || e.touches[0].clientY;
      
      tabItem.classList.add('jev-tabs-tab-dragging');
      document.body.style.userSelect = 'none';
    };
    
    const handleDragMove = (e) => {
      if (!isDragging) return;
      
      const clientX = e.clientX || e.touches[0].clientX;
      const clientY = e.clientY || e.touches[0].clientY;
      
      // 检测是否需要交换位置
      const deltaX = Math.abs(clientX - dragStartX);
      const deltaY = Math.abs(clientY - dragStartY);
      
      if (deltaX > 5 || deltaY > 5) {
        // 计算应该交换到哪个位置
        const newIndex = this._calculateDragTarget(clientX, clientY);
        
        if (newIndex !== -1 && newIndex !== dragIndex) {
          this._swapTabs(dragIndex, newIndex);
          dragIndex = newIndex;
        }
      }
    };
    
    const handleDragEnd = () => {
      if (!isDragging) return;
      
      isDragging = false;
      tabItem.classList.remove('jev-tabs-tab-dragging');
      document.body.style.userSelect = '';
    };
    
    // 绑定拖拽事件
    tabItem.addEventListener('mousedown', handleDragStart);
    tabItem.addEventListener('touchstart', handleDragStart, { passive: true });
    document.addEventListener('mousemove', handleDragMove);
    document.addEventListener('touchmove', handleDragMove, { passive: false });
    document.addEventListener('mouseup', handleDragEnd);
    document.addEventListener('touchend', handleDragEnd);
  }

  /**
   * 计算拖拽目标位置
   * @private
   */
  _calculateDragTarget(clientX, clientY) {
    for (let i = 0; i < this.tabItems.length; i++) {
      const tab = this.tabItems[i];
      const rect = tab.getBoundingClientRect();
      
      // 检查点击是否在标签内
      if (clientX >= rect.left && clientX <= rect.right && 
          clientY >= rect.top && clientY <= rect.bottom) {
        return i;
      }
    }
    return -1;
  }

  /**
   * 交换标签位置
   * @private
   */
  _swapTabs(fromIndex, toIndex) {
    // 交换标签数据
    const tabs = [...this.state.tabs];
    const temp = tabs[fromIndex];
    tabs[fromIndex] = tabs[toIndex];
    tabs[toIndex] = temp;
    
    // 交换DOM元素
    const fromTab = this.tabItems[fromIndex];
    const toTab = this.tabItems[toIndex];
    const fromContent = this.contentItems[fromIndex];
    const toContent = this.contentItems[toIndex];
    
    // 保存激活状态
    const fromActive = fromIndex === this.activeTab;
    const toActive = toIndex === this.activeTab;
    
    // 交换标签
    this.tabList.insertBefore(fromTab, toTab);
    
    // 交换内容
    this.tabContents.insertBefore(fromContent, toContent);
    
    // 交换引用
    this.tabItems[fromIndex] = toTab;
    this.tabItems[toIndex] = fromTab;
    this.contentItems[fromIndex] = toContent;
    this.contentItems[toIndex] = fromContent;
    
    // 更新激活状态
    if (fromActive) {
      this.activeTab = toIndex;
    } else if (toActive) {
      this.activeTab = fromIndex;
    }
    
    // 更新状态
    this.updateState({ tabs });
  }

  /**
   * 设置活动标签
   * @param {number} index - 标签索引
   * @returns {Tabs} 组件实例
   */
  setActiveTab(index) {
    if (index < 0 || index >= this.state.tabs.length || this.disabledTabs.has(index)) {
      return this;
    }
    
    // 清理旧的活动标签
    if (this.activeTab !== null && this.activeTab !== index) {
      const oldTab = this.tabItems[this.activeTab];
      const oldContent = this.contentItems[this.activeTab];
      
      if (oldTab) {
        oldTab.classList.remove('jev-tabs-tab-active');
        oldTab.setAttribute('aria-selected', 'false');
        oldTab.tabIndex = -1;
      }
      
      if (oldContent) {
        oldContent.classList.remove('jev-tabs-panel-active');
        oldContent.setAttribute('hidden', 'true');
        
        // 清除动画类
        oldContent.classList.remove('jev-tabs-animation-fade', 'jev-tabs-animation-slide');
      }
    }
    
    // 设置新的活动标签
    const newTab = this.tabItems[index];
    const newContent = this.contentItems[index];
    
    if (newTab) {
      newTab.classList.add('jev-tabs-tab-active');
      newTab.setAttribute('aria-selected', 'true');
      newTab.tabIndex = 0;
    }
    
    if (newContent) {
      // 处理延迟加载
      const tab = this.state.tabs[index];
      if (tab.render && typeof tab.render === 'function' && 
          this.options.lazyLoad && !newContent.hasChildNodes()) {
        try {
          const renderedContent = tab.render();
          if (typeof renderedContent === 'string') {
            newContent.innerHTML = renderedContent;
          } else if (renderedContent instanceof HTMLElement) {
            newContent.appendChild(renderedContent);
          }
        } catch (error) {
          logger.error('标签延迟加载失败', error);
          newContent.innerHTML = '<div class="jev-tabs-error">内容加载失败</div>';
        }
      }
      
      newContent.classList.add('jev-tabs-panel-active');
      newContent.removeAttribute('hidden');
      
      // 添加动画类
      if (this.options.animation !== 'none') {
        newContent.classList.add(`jev-tabs-animation-${this.options.animation}`);
      }
    }
    
    // 更新状态
    this.activeTab = index;
    
    // 触发标签变化回调
    if (typeof this.options.onTabChange === 'function') {
      try {
        this.options.onTabChange(index, this.state.tabs[index]);
      } catch (error) {
        logger.error('标签变化回调执行失败', error);
      }
    }
    
    return this;
  }

  /**
   * 添加标签
   * @param {Object} tabConfig - 标签配置
   * @param {number} index - 插入位置（可选）
   * @returns {Tabs} 组件实例
   */
  addTab(tabConfig, index = -1) {
    const tabs = [...this.state.tabs];
    
    // 确定插入位置
    const insertIndex = index >= 0 && index <= tabs.length ? index : tabs.length;
    
    // 添加新标签
    tabs.splice(insertIndex, 0, tabConfig);
    
    // 更新状态
    this.updateState({ tabs });
    
    // 创建新标签DOM
    this._addTabInternal(tabConfig, insertIndex);
    
    // 重新索引现有标签
    this._reindexTabs();
    
    // 触发标签添加回调
    if (typeof this.options.onTabAdd === 'function') {
      try {
        this.options.onTabAdd(insertIndex, tabConfig);
      } catch (error) {
        logger.error('标签添加回调执行失败', error);
      }
    }
    
    // 检查滚动按钮
    this._checkScrollButtons();
    
    return this;
  }

  /**
   * 移除标签
   * @param {number} index - 标签索引
   * @returns {Tabs} 组件实例
   */
  removeTab(index) {
    if (index < 0 || index >= this.state.tabs.length) {
      return this;
    }
    
    const tabs = [...this.state.tabs];
    const removedTab = tabs.splice(index, 1)[0];
    
    // 更新DOM
    const tabItem = this.tabItems[index];
    const contentItem = this.contentItems[index];
    
    if (tabItem && contentItem) {
      // 移除事件
      const clickHandler = this._clickHandlers.get(index);
      const keydownHandler = this._keydownHandlers.get(index);
      
      if (clickHandler) {
        tabItem.removeEventListener('click', clickHandler);
      }
      
      if (keydownHandler) {
        tabItem.removeEventListener('keydown', keydownHandler);
      }
      
      // 移除DOM元素
      tabItem.remove();
      contentItem.remove();
    }
    
    // 更新引用
    this.tabItems.splice(index, 1);
    this.contentItems.splice(index, 1);
    this._clickHandlers.delete(index);
    this._keydownHandlers.delete(index);
    
    // 移除禁用状态
    if (this.disabledTabs.has(index)) {
      this.disabledTabs.delete(index);
    }
    
    // 调整活动标签
    if (this.activeTab === index) {
      const newActiveIndex = Math.min(index, tabs.length - 1);
      this.activeTab = tabs.length > 0 ? newActiveIndex : null;
      
      // 如果还有标签，设置第一个为活动标签
      if (tabs.length > 0) {
        this.setActiveTab(newActiveIndex);
      }
    } else if (this.activeTab > index) {
      this.activeTab--;
    }
    
    // 更新状态
    this.updateState({ tabs });
    
    // 重新索引现有标签
    this._reindexTabs();
    
    // 触发标签移除回调
    if (typeof this.options.onTabRemove === 'function') {
      try {
        this.options.onTabRemove(index, removedTab);
      } catch (error) {
        logger.error('标签移除回调执行失败', error);
      }
    }
    
    // 检查滚动按钮
    this._checkScrollButtons();
    
    return this;
  }

  /**
   * 关闭标签（带确认）
   * @param {number} index - 标签索引
   * @returns {Tabs} 组件实例
   */
  async closeTab(index) {
    if (index < 0 || index >= this.state.tabs.length) {
      return this;
    }
    
    // 触发关闭前回调
    if (typeof this.options.beforeTabClose === 'function') {
      try {
        const canClose = await this.options.beforeTabClose(index, this.state.tabs[index]);
        if (canClose === false) {
          return this; // 阻止关闭
        }
      } catch (error) {
        logger.error('标签关闭前回调执行失败', error);
        return this;
      }
    }
    
    // 触发关闭回调
    if (typeof this.options.onTabClose === 'function') {
      try {
        this.options.onTabClose(index, this.state.tabs[index]);
      } catch (error) {
        logger.error('标签关闭回调执行失败', error);
      }
    }
    
    // 移除标签
    return this.removeTab(index);
  }

  /**
   * 重新索引标签
   * @private
   */
  _reindexTabs() {
    this.tabItems.forEach((tab, index) => {
      const content = this.contentItems[index];
      
      // 更新ARIA属性
      tab.setAttribute('aria-controls', `jev-tabs-panel-${index}`);
      tab.setAttribute('id', `jev-tabs-tab-${index}`);
      
      if (content) {
        content.setAttribute('aria-labelledby', `jev-tabs-tab-${index}`);
        content.setAttribute('id', `jev-tabs-panel-${index}`);
      }
    });
  }

  /**
   * 启用标签
   * @param {number} index - 标签索引
   * @returns {Tabs} 组件实例
   */
  enableTab(index) {
    if (index < 0 || index >= this.state.tabs.length) {
      return this;
    }
    
    this.disabledTabs.delete(index);
    
    const tab = this.tabItems[index];
    if (tab) {
      tab.classList.remove('jev-tabs-tab-disabled');
      tab.setAttribute('aria-disabled', 'false');
    }
    
    // 更新标签配置
    const tabs = [...this.state.tabs];
    tabs[index] = { ...tabs[index], disabled: false };
    this.updateState({ tabs });
    
    return this;
  }

  /**
   * 禁用标签
   * @param {number} index - 标签索引
   * @returns {Tabs} 组件实例
   */
  disableTab(index) {
    if (index < 0 || index >= this.state.tabs.length) {
      return this;
    }
    
    // 如果是活动标签，切换到其他标签
    if (this.activeTab === index && this.state.tabs.length > 1) {
      this.setActiveTab(index === 0 ? 1 : index - 1);
    }
    
    this.disabledTabs.add(index);
    
    const tab = this.tabItems[index];
    if (tab) {
      tab.classList.add('jev-tabs-tab-disabled');
      tab.setAttribute('aria-disabled', 'true');
    }
    
    // 更新标签配置
    const tabs = [...this.state.tabs];
    tabs[index] = { ...tabs[index], disabled: true };
    this.updateState({ tabs });
    
    return this;
  }

  /**
   * 更新标签内容
   * @param {number} index - 标签索引
   * @param {string|HTMLElement|Function} content - 新内容
   * @returns {Tabs} 组件实例
   */
  updateTabContent(index, content) {
    if (index < 0 || index >= this.state.tabs.length) {
      return this;
    }
    
    const contentItem = this.contentItems[index];
    if (contentItem) {
      // 清空内容
      contentItem.innerHTML = '';
      
      // 设置新内容
      if (typeof content === 'string') {
        contentItem.innerHTML = content;
      } else if (content instanceof HTMLElement) {
        contentItem.appendChild(content);
      } else if (typeof content === 'function') {
        try {
          const renderedContent = content();
          if (typeof renderedContent === 'string') {
            contentItem.innerHTML = renderedContent;
          } else if (renderedContent instanceof HTMLElement) {
            contentItem.appendChild(renderedContent);
          }
        } catch (error) {
          logger.error('标签内容更新失败', error);
          contentItem.innerHTML = '<div class="jev-tabs-error">内容更新失败</div>';
        }
      }
    }
    
    // 更新标签配置
    const tabs = [...this.state.tabs];
    tabs[index] = { ...tabs[index], content };
    this.updateState({ tabs });
    
    return this;
  }

  /**
   * 更新标签标题
   * @param {number} index - 标签索引
   * @param {string} title - 新标题
   * @returns {Tabs} 组件实例
   */
  updateTabTitle(index, title) {
    if (index < 0 || index >= this.state.tabs.length) {
      return this;
    }
    
    const tabItem = this.tabItems[index];
    if (tabItem) {
      const textElement = tabItem.querySelector('.jev-tabs-tab-text');
      if (textElement) {
        textElement.textContent = title;
      }
    }
    
    // 更新标签配置
    const tabs = [...this.state.tabs];
    tabs[index] = { ...tabs[index], title };
    this.updateState({ tabs });
    
    return this;
  }

  /**
   * 获取活动标签索引
   * @returns {number} 活动标签索引
   */
  getActiveTabIndex() {
    return this.activeTab;
  }

  /**
   * 获取标签数量
   * @returns {number} 标签数量
   */
  getTabCount() {
    return this.state.tabs.length;
  }

  /**
   * 设置主题
   * @param {string} theme - 主题名称
   * @returns {Tabs} 组件实例
   */
  setTheme(theme) {
    // 移除旧主题类
    ['neon', 'default', 'dark'].forEach(t => {
      this.element.classList.remove(`jev-tabs-${t}`);
    });
    
    // 添加新主题类
    this.element.classList.add(`jev-tabs-${theme}`);
    this.options.theme = theme;
    
    return this;
  }

  /**
   * 设置位置
   * @param {string} placement - 位置
   * @returns {Tabs} 组件实例
   */
  setPlacement(placement) {
    // 移除旧位置类
    ['top', 'bottom', 'left', 'right'].forEach(p => {
      this.element.classList.remove(`jev-tabs-${p}`);
    });
    
    // 添加新位置类
    this.element.classList.add(`jev-tabs-${placement}`);
    this.options.placement = placement;
    
    // 重新调整布局
    this._checkScrollButtons();
    
    return this;
  }

  /**
   * 资源释放与清理
   */
  async destroy() {
    try {
      // 清理事件
      this._unbindEvents();
      
      // 清理动画定时器
      if (this.animationTimeout) {
        clearTimeout(this.animationTimeout);
        this.animationTimeout = null;
      }
      
      // 清理数据
      this.tabItems = [];
      this.contentItems = [];
      this.disabledTabs.clear();
      this.activeTab = null;
      
      // 卸载组件
      await this.unmount();
      
    } catch (error) {
      logger.error('标签页组件销毁失败', error);
    }
  }
}

export default Tabs;