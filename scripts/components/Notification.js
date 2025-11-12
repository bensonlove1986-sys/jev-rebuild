/**
 * Notification通知面板组件
 * 提供可持久化的通知消息管理，支持分组、过滤和交互操作
 */
import BaseComponent from './base-component.js';
import logger from '../utils/logger.js';
import { formatDate } from '../utils/date-utils.js';

class Notification extends BaseComponent {
  /**
   * 构造函数
   * @param {Object} options - 配置选项
   * @param {HTMLElement} container - 容器元素
   */
  constructor(options = {}, container = document.body) {
    super(options, container);
    
    // 组件元素引用
    this.panelElement = null;
    this.headerElement = null;
    this.titleElement = null;
    this.closeButton = null;
    this.filterElement = null;
    this.notificationList = null;
    this.emptyStateElement = null;
    this.footerElement = null;
    this.counterElement = null;
    this.clearButton = null;
    
    // 状态管理
    this.notifications = [];
    this.isOpen = false;
    this.filterValue = '';
    this.selectedNotifications = new Set();
    
    // 定时器
    this.updateTimer = null;
    this.resizeObserver = null;
  }

  /**
   * 获取默认配置
   * @private
   */
  _getDefaultOptions() {
    return {
      ...super._getDefaultOptions(),
      title: '通知中心',
      position: 'top-right', // top-right, top-left, bottom-right, bottom-left, fixed
      width: 360,
      maxHeight: 600,
      maxNotifications: 50,
      autoOpen: false,
      autoClose: false,
      closeOnClick: true,
      showCounter: true,
      showFilter: true,
      showClearButton: true,
      showTimestamp: true,
      showTypeFilter: true,
      groupByType: false,
      groupByTime: false,
      timeFormat: 'HH:mm:ss',
      theme: 'default', // default, dark, neon
      allowSelection: false,
      animateNotifications: true,
      soundEnabled: false,
      soundPath: '/assets/sounds/notification.mp3',
      onNotificationClick: null,
      onNotificationClose: null,
      onNotificationAdd: null,
      onNotificationRemove: null,
      onPanelOpen: null,
      onPanelClose: null,
      onFilterChange: null,
      onSelectionChange: null
    };
  }

  /**
   * 获取初始状态
   * @private
   */
  _getInitialState() {
    return {
      ...super._getInitialState(),
      notifications: [],
      unreadCount: 0,
      isOpen: false,
      filterValue: ''
    };
  }

  /**
   * 创建DOM元素
   * @private
   */
  _createElement() {
    // 创建面板元素
    this.panelElement = document.createElement('div');
    this.panelElement.className = `jev-notification-panel jev-notification-panel-${this.options.theme}`;
    this.panelElement.style.width = `${this.options.width}px`;
    this.panelElement.style.maxHeight = `${this.options.maxHeight}px`;
    
    // 创建头部
    this.headerElement = document.createElement('div');
    this.headerElement.className = 'jev-notification-header';
    
    // 创建标题
    this.titleElement = document.createElement('h3');
    this.titleElement.className = 'jev-notification-title';
    this.titleElement.textContent = this.options.title;
    
    // 创建标题容器（包含标题和计数器）
    const titleContainer = document.createElement('div');
    titleContainer.className = 'jev-notification-title-container';
    titleContainer.appendChild(this.titleElement);
    
    // 创建计数器
    if (this.options.showCounter) {
      this.counterElement = document.createElement('span');
      this.counterElement.className = 'jev-notification-counter';
      this.counterElement.textContent = '0';
      titleContainer.appendChild(this.counterElement);
    }
    
    // 创建关闭按钮
    this.closeButton = document.createElement('button');
    this.closeButton.className = 'jev-notification-close';
    this.closeButton.innerHTML = '&times;';
    this.closeButton.setAttribute('aria-label', '关闭通知面板');
    
    this.headerElement.appendChild(titleContainer);
    this.headerElement.appendChild(this.closeButton);
    
    // 创建过滤器
    if (this.options.showFilter) {
      this.filterElement = document.createElement('div');
      this.filterElement.className = 'jev-notification-filter';
      
      const searchInput = document.createElement('input');
      searchInput.type = 'text';
      searchInput.className = 'jev-notification-search';
      searchInput.placeholder = '搜索通知...';
      searchInput.setAttribute('aria-label', '搜索通知');
      
      this.filterElement.appendChild(searchInput);
      
      // 如果启用类型过滤
      if (this.options.showTypeFilter) {
        const filterContainer = document.createElement('div');
        filterContainer.className = 'jev-notification-type-filters';
        
        const filterTypes = [
          { value: 'all', label: '全部' },
          { value: 'info', label: '信息' },
          { value: 'success', label: '成功' },
          { value: 'warning', label: '警告' },
          { value: 'error', label: '错误' },
          { value: 'unread', label: '未读' }
        ];
        
        filterTypes.forEach(type => {
          const button = document.createElement('button');
          button.className = `jev-notification-type-filter ${type.value === 'all' ? 'active' : ''}`;
          button.textContent = type.label;
          button.setAttribute('data-type', type.value);
          
          filterContainer.appendChild(button);
        });
        
        this.filterElement.appendChild(filterContainer);
      }
    }
    
    // 创建通知列表
    this.notificationList = document.createElement('div');
    this.notificationList.className = 'jev-notification-list';
    
    // 创建空状态提示
    this.emptyStateElement = document.createElement('div');
    this.emptyStateElement.className = 'jev-notification-empty';
    this.emptyStateElement.innerHTML = '<div class="empty-icon">📭</div><div class="empty-text">暂无通知</div>';
    this.notificationList.appendChild(this.emptyStateElement);
    
    // 创建底部
    this.footerElement = document.createElement('div');
    this.footerElement.className = 'jev-notification-footer';
    
    // 创建全选按钮（如果允许选择）
    if (this.options.allowSelection) {
      const selectAllButton = document.createElement('button');
      selectAllButton.className = 'jev-notification-select-all';
      selectAllButton.textContent = '全选';
      this.footerElement.appendChild(selectAllButton);
    }
    
    // 创建已读按钮
    const markReadButton = document.createElement('button');
    markReadButton.className = 'jev-notification-mark-read';
    markReadButton.textContent = '全部已读';
    this.footerElement.appendChild(markReadButton);
    
    // 创建清除按钮
    if (this.options.showClearButton) {
      this.clearButton = document.createElement('button');
      this.clearButton.className = 'jev-notification-clear';
      this.clearButton.textContent = '清空';
      this.footerElement.appendChild(this.clearButton);
    }
    
    // 组装面板
    this.panelElement.appendChild(this.headerElement);
    if (this.filterElement) {
      this.panelElement.appendChild(this.filterElement);
    }
    this.panelElement.appendChild(this.notificationList);
    this.panelElement.appendChild(this.footerElement);
    
    // 添加到容器
    if (this.options.position === 'fixed') {
      this.container.appendChild(this.panelElement);
    } else {
      document.body.appendChild(this.panelElement);
    }
  }

  /**
   * 应用样式
   * @private
   */
  _applyStyles() {
    // 添加全局样式
    this._addGlobalStyles();
    
    // 设置位置样式
    this.panelElement.classList.add(`jev-notification-${this.options.position}`);
    
    // 初始状态（关闭）
    if (this.options.position !== 'fixed') {
      this.panelElement.classList.add('jev-notification-closed');
    }
    
    // 绑定事件
    this._bindEvents();
    
    // 初始化调整大小观察器
    if (window.ResizeObserver) {
      this.resizeObserver = new ResizeObserver(() => {
        this._updateScrollBehavior();
      });
      this.resizeObserver.observe(this.notificationList);
    }
    
    // 如果设置了自动打开
    if (this.options.autoOpen) {
      this.open();
    }
  }

  /**
   * 添加全局样式
   * @private
   */
  _addGlobalStyles() {
    const styleId = 'jev-notification-styles';
    if (document.getElementById(styleId)) {
      return;
    }
    
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      /* 通知面板基础样式 */
      .jev-notification-panel {
        position: fixed;
        z-index: 9998;
        background-color: #fff;
        border-radius: 8px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
        display: flex;
        flex-direction: column;
        transition: all 0.3s ease;
        overflow: hidden;
        border: 1px solid #e2e8f0;
      }
      
      /* 位置样式 */
      .jev-notification-top-right {
        top: 70px;
        right: 20px;
        transform: translateX(100%);
      }
      
      .jev-notification-top-left {
        top: 70px;
        left: 20px;
        transform: translateX(-100%);
      }
      
      .jev-notification-bottom-right {
        bottom: 20px;
        right: 20px;
        transform: translateX(100%);
      }
      
      .jev-notification-bottom-left {
        bottom: 20px;
        left: 20px;
        transform: translateX(-100%);
      }
      
      .jev-notification-fixed {
        position: relative;
        transform: none !important;
      }
      
      /* 打开状态 */
      .jev-notification-panel.jev-notification-open {
        transform: translateX(0);
      }
      
      /* 关闭状态 */
      .jev-notification-panel.jev-notification-closed {
        pointer-events: none;
      }
      
      /* 主题样式 - 默认 */
      .jev-notification-panel-default {
        background-color: #fff;
        color: #1a202c;
        border-color: #e2e8f0;
      }
      
      /* 主题样式 - 深色 */
      .jev-notification-panel-dark {
        background-color: #2d3748;
        color: #e2e8f0;
        border-color: #4a5568;
      }
      
      /* 主题样式 - 霓虹灯 */
      .jev-notification-panel-neon {
        background-color: #1a1a1a;
        color: #00ff99;
        border-color: #00ff99;
        box-shadow: 0 0 20px rgba(0, 255, 153, 0.2);
      }
      
      /* 头部样式 */
      .jev-notification-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 16px;
        border-bottom: 1px solid inherit;
        flex-shrink: 0;
      }
      
      .jev-notification-title-container {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      
      .jev-notification-title {
        margin: 0;
        font-size: 16px;
        font-weight: 600;
      }
      
      .jev-notification-counter {
        background-color: #dc3545;
        color: white;
        font-size: 12px;
        padding: 2px 8px;
        border-radius: 12px;
        min-width: 20px;
        text-align: center;
      }
      
      /* 关闭按钮 */
      .jev-notification-close {
        background: none;
        border: none;
        font-size: 20px;
        cursor: pointer;
        color: inherit;
        opacity: 0.7;
        transition: opacity 0.2s;
        padding: 0;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      .jev-notification-close:hover {
        opacity: 1;
      }
      
      /* 过滤器样式 */
      .jev-notification-filter {
        padding: 12px 16px;
        border-bottom: 1px solid inherit;
        flex-shrink: 0;
      }
      
      .jev-notification-search {
        width: 100%;
        padding: 8px 12px;
        border: 1px solid inherit;
        border-radius: 4px;
        background-color: rgba(255, 255, 255, 0.05);
        color: inherit;
        font-size: 14px;
        margin-bottom: 8px;
      }
      
      .jev-notification-search::placeholder {
        color: inherit;
        opacity: 0.6;
      }
      
      .jev-notification-type-filters {
        display: flex;
        gap: 4px;
        flex-wrap: wrap;
      }
      
      .jev-notification-type-filter {
        padding: 4px 8px;
        border: 1px solid inherit;
        border-radius: 16px;
        background: none;
        color: inherit;
        font-size: 12px;
        cursor: pointer;
        transition: all 0.2s;
      }
      
      .jev-notification-type-filter.active {
        background-color: rgba(255, 255, 255, 0.1);
      }
      
      /* 通知列表样式 */
      .jev-notification-list {
        flex: 1;
        overflow-y: auto;
        padding: 8px;
      }
      
      /* 空状态样式 */
      .jev-notification-empty {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 40px 20px;
        text-align: center;
        color: inherit;
        opacity: 0.6;
      }
      
      .empty-icon {
        font-size: 48px;
        margin-bottom: 16px;
      }
      
      .empty-text {
        font-size: 14px;
      }
      
      /* 通知项样式 */
      .jev-notification-item {
        position: relative;
        padding: 12px;
        margin-bottom: 8px;
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.2s;
        border: 1px solid transparent;
        display: flex;
        gap: 12px;
        opacity: 0;
        transform: translateY(10px);
      }
      
      .jev-notification-item.visible {
        opacity: 1;
        transform: translateY(0);
        transition: all 0.3s;
      }
      
      .jev-notification-item.unread {
        font-weight: 500;
        border-left: 4px solid #17a2b8;
      }
      
      /* 通知类型样式 */
      .jev-notification-item-info {
        background-color: rgba(23, 162, 184, 0.1);
        border-left-color: #17a2b8;
      }
      
      .jev-notification-item-success {
        background-color: rgba(40, 167, 69, 0.1);
        border-left-color: #28a745;
      }
      
      .jev-notification-item-warning {
        background-color: rgba(255, 193, 7, 0.1);
        border-left-color: #ffc107;
      }
      
      .jev-notification-item-error {
        background-color: rgba(220, 53, 69, 0.1);
        border-left-color: #dc3545;
      }
      
      /* 深色主题下的通知项 */
      .jev-notification-panel-dark .jev-notification-item-info {
        background-color: rgba(23, 162, 184, 0.2);
      }
      
      .jev-notification-panel-dark .jev-notification-item-success {
        background-color: rgba(40, 167, 69, 0.2);
      }
      
      .jev-notification-panel-dark .jev-notification-item-warning {
        background-color: rgba(255, 193, 7, 0.2);
      }
      
      .jev-notification-panel-dark .jev-notification-item-error {
        background-color: rgba(220, 53, 69, 0.2);
      }
      
      /* 通知项图标 */
      .jev-notification-item-icon {
        flex-shrink: 0;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 16px;
      }
      
      /* 通知项内容 */
      .jev-notification-item-content {
        flex: 1;
        min-width: 0;
      }
      
      .jev-notification-item-title {
        font-weight: 600;
        margin-bottom: 4px;
        font-size: 14px;
      }
      
      .jev-notification-item-message {
        font-size: 13px;
        opacity: 0.8;
        margin-bottom: 4px;
        word-break: break-word;
      }
      
      .jev-notification-item-time {
        font-size: 11px;
        opacity: 0.6;
      }
      
      /* 通知项关闭按钮 */
      .jev-notification-item-close {
        position: absolute;
        top: 8px;
        right: 8px;
        background: none;
        border: none;
        font-size: 12px;
        cursor: pointer;
        color: inherit;
        opacity: 0;
        transition: opacity 0.2s;
        width: 20px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
      }
      
      .jev-notification-item:hover .jev-notification-item-close {
        opacity: 0.7;
      }
      
      .jev-notification-item-close:hover {
        opacity: 1 !important;
        background-color: rgba(0, 0, 0, 0.1);
      }
      
      /* 通知项选择 */
      .jev-notification-item.selected {
        background-color: rgba(54, 162, 235, 0.2);
        border-color: #36a2eb;
      }
      
      .jev-notification-item-checkbox {
        flex-shrink: 0;
        width: 16px;
        height: 16px;
        border: 2px solid;
        border-radius: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-top: 4px;
      }
      
      .jev-notification-item-checkbox.checked::after {
        content: '✓';
        font-size: 12px;
      }
      
      /* 底部样式 */
      .jev-notification-footer {
        display: flex;
        justify-content: space-between;
        padding: 12px 16px;
        border-top: 1px solid inherit;
        gap: 8px;
        flex-wrap: wrap;
        flex-shrink: 0;
      }
      
      .jev-notification-footer button {
        padding: 6px 12px;
        border: 1px solid inherit;
        border-radius: 4px;
        background: none;
        color: inherit;
        font-size: 12px;
        cursor: pointer;
        transition: all 0.2s;
      }
      
      .jev-notification-footer button:hover {
        background-color: rgba(255, 255, 255, 0.1);
      }
      
      /* 分组样式 */
      .jev-notification-group {
        margin-bottom: 16px;
      }
      
      .jev-notification-group-header {
        padding: 8px 12px;
        font-size: 12px;
        font-weight: 600;
        opacity: 0.7;
        border-bottom: 1px solid;
        margin-bottom: 8px;
      }
      
      /* 响应式设计 */
      @media (max-width: 768px) {
        .jev-notification-panel {
          width: 90% !important;
          max-width: 400px;
        }
        
        .jev-notification-top-right,
        .jev-notification-top-left {
          top: 20px;
        }
        
        .jev-notification-panel.jev-notification-open {
          max-height: 80vh;
        }
      }
      
      /* 滚动条样式 */
      .jev-notification-list::-webkit-scrollbar {
        width: 6px;
      }
      
      .jev-notification-list::-webkit-scrollbar-track {
        background: rgba(0, 0, 0, 0.1);
        border-radius: 3px;
      }
      
      .jev-notification-list::-webkit-scrollbar-thumb {
        background: rgba(0, 0, 0, 0.3);
        border-radius: 3px;
      }
      
      .jev-notification-list::-webkit-scrollbar-thumb:hover {
        background: rgba(0, 0, 0, 0.5);
      }
      
      /* 深色主题滚动条 */
      .jev-notification-panel-dark .jev-notification-list::-webkit-scrollbar-track {
        background: rgba(255, 255, 255, 0.1);
      }
      
      .jev-notification-panel-dark .jev-notification-list::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.3);
      }
      
      .jev-notification-panel-dark .jev-notification-list::-webkit-scrollbar-thumb:hover {
        background: rgba(255, 255, 255, 0.5);
      }
    `;
    
    document.head.appendChild(style);
  }

  /**
   * 绑定事件
   * @private
   */
  _bindEvents() {
    // 关闭按钮事件
    this.closeButton.addEventListener('click', () => this.close());
    
    // 搜索过滤器事件
    if (this.filterElement) {
      const searchInput = this.filterElement.querySelector('.jev-notification-search');
      searchInput.addEventListener('input', (e) => {
        this.filterValue = e.target.value;
        this.updateState({ filterValue: this.filterValue });
        this._filterNotifications();
        
        if (typeof this.options.onFilterChange === 'function') {
          try {
            this.options.onFilterChange(this.filterValue, this._getActiveFilterType());
          } catch (error) {
            logger.error('通知过滤回调执行失败', error);
          }
        }
      });
      
      // 类型过滤事件
      if (this.options.showTypeFilter) {
        const filterButtons = this.filterElement.querySelectorAll('.jev-notification-type-filter');
        filterButtons.forEach(button => {
          button.addEventListener('click', () => {
            // 移除所有活动状态
            filterButtons.forEach(btn => btn.classList.remove('active'));
            // 添加当前活动状态
            button.classList.add('active');
            
            this._filterNotifications();
            
            if (typeof this.options.onFilterChange === 'function') {
              try {
                this.options.onFilterChange(this.filterValue, button.getAttribute('data-type'));
              } catch (error) {
                logger.error('通知过滤回调执行失败', error);
              }
            }
          });
        });
      }
    }
    
    // 底部按钮事件
    const selectAllButton = this.footerElement.querySelector('.jev-notification-select-all');
    if (selectAllButton) {
      selectAllButton.addEventListener('click', () => this._toggleSelectAll());
    }
    
    const markReadButton = this.footerElement.querySelector('.jev-notification-mark-read');
    markReadButton.addEventListener('click', () => this.markAllAsRead());
    
    if (this.clearButton) {
      this.clearButton.addEventListener('click', () => this.clear());
    }
  }

  /**
   * 过滤通知
   * @private
   */
  _filterNotifications() {
    const activeFilter = this._getActiveFilterType();
    const searchTerm = this.filterValue.toLowerCase();
    
    // 获取所有通知项
    const notificationItems = this.notificationList.querySelectorAll('.jev-notification-item');
    
    notificationItems.forEach(item => {
      const notificationId = item.getAttribute('data-id');
      const notification = this.notifications.find(n => n.id === notificationId);
      
      if (!notification) return;
      
      // 应用搜索过滤
      const matchesSearch = !searchTerm || 
        notification.title.toLowerCase().includes(searchTerm) || 
        notification.message.toLowerCase().includes(searchTerm);
      
      // 应用类型过滤
      let matchesType = true;
      if (activeFilter === 'unread') {
        matchesType = !notification.read;
      } else if (activeFilter !== 'all') {
        matchesType = notification.type === activeFilter;
      }
      
      // 显示或隐藏通知
      item.style.display = (matchesSearch && matchesType) ? 'flex' : 'none';
    });
    
    // 更新空状态显示
    this._updateEmptyState();
  }

  /**
   * 获取当前活动的过滤类型
   * @private
   */
  _getActiveFilterType() {
    if (!this.options.showTypeFilter || !this.filterElement) {
      return 'all';
    }
    
    const activeButton = this.filterElement.querySelector('.jev-notification-type-filter.active');
    return activeButton ? activeButton.getAttribute('data-type') : 'all';
  }

  /**
   * 更新空状态显示
   * @private
   */
  _updateEmptyState() {
    const visibleItems = this.notificationList.querySelectorAll('.jev-notification-item[style*="display: flex"]');
    const hasVisibleItems = visibleItems.length > 0;
    
    this.emptyStateElement.style.display = hasVisibleItems ? 'none' : 'flex';
  }

  /**
   * 更新滚动行为
   * @private
   */
  _updateScrollBehavior() {
    // 自动滚动到底部显示新通知
    if (this.isOpen && this.notificationList.scrollHeight > this.notificationList.clientHeight) {
      this.notificationList.scrollTop = this.notificationList.scrollHeight;
    }
  }

  /**
   * 切换全选状态
   * @private
   */
  _toggleSelectAll() {
    const visibleItems = this.notificationList.querySelectorAll('.jev-notification-item[style*="display: flex"]');
    const allSelected = Array.from(visibleItems).every(item => 
      item.classList.contains('selected')
    );
    
    visibleItems.forEach(item => {
      const notificationId = item.getAttribute('data-id');
      if (allSelected) {
        this.selectedNotifications.delete(notificationId);
        item.classList.remove('selected');
        item.querySelector('.jev-notification-item-checkbox').classList.remove('checked');
      } else {
        this.selectedNotifications.add(notificationId);
        item.classList.add('selected');
        item.querySelector('.jev-notification-item-checkbox').classList.add('checked');
      }
    });
    
    this._triggerSelectionChange();
  }

  /**
   * 触发选择变更事件
   * @private
   */
  _triggerSelectionChange() {
    if (typeof this.options.onSelectionChange === 'function') {
      try {
        this.options.onSelectionChange(this.getSelectedNotifications());
      } catch (error) {
        logger.error('通知选择变更回调执行失败', error);
      }
    }
  }

  /**
   * 创建通知项元素
   * @private
   */
  _createNotificationElement(notification) {
    const item = document.createElement('div');
    item.className = `jev-notification-item jev-notification-item-${notification.type} ${notification.read ? '' : 'unread'}`;
    item.setAttribute('data-id', notification.id);
    
    // 如果允许选择，添加复选框
    if (this.options.allowSelection) {
      const checkbox = document.createElement('div');
      checkbox.className = 'jev-notification-item-checkbox';
      item.appendChild(checkbox);
    }
    
    // 创建图标
    const icon = document.createElement('div');
    icon.className = 'jev-notification-item-icon';
    const icons = {
      info: 'ℹ',
      success: '✓',
      warning: '⚠',
      error: '✕'
    };
    icon.textContent = icons[notification.type] || 'ℹ';
    
    // 创建内容
    const content = document.createElement('div');
    content.className = 'jev-notification-item-content';
    
    // 添加标题
    if (notification.title) {
      const title = document.createElement('div');
      title.className = 'jev-notification-item-title';
      title.textContent = notification.title;
      content.appendChild(title);
    }
    
    // 添加消息
    const message = document.createElement('div');
    message.className = 'jev-notification-item-message';
    message.textContent = notification.message;
    content.appendChild(message);
    
    // 添加时间戳
    if (this.options.showTimestamp) {
      const time = document.createElement('div');
      time.className = 'jev-notification-item-time';
      time.textContent = formatDate(notification.timestamp, this.options.timeFormat);
      content.appendChild(time);
    }
    
    // 创建关闭按钮
    const close = document.createElement('button');
    close.className = 'jev-notification-item-close';
    close.innerHTML = '&times;';
    close.setAttribute('aria-label', '关闭通知');
    
    // 组装元素
    item.appendChild(icon);
    item.appendChild(content);
    item.appendChild(close);
    
    // 绑定点击事件
    item.addEventListener('click', (e) => {
      // 忽略关闭按钮点击
      if (e.target === close || close.contains(e.target)) return;
      
      // 忽略复选框点击
      if (this.options.allowSelection && 
          (e.target.className === 'jev-notification-item-checkbox' || 
           e.target.closest('.jev-notification-item-checkbox'))) {
        e.preventDefault();
        e.stopPropagation();
        
        const notificationId = item.getAttribute('data-id');
        const checkbox = item.querySelector('.jev-notification-item-checkbox');
        
        if (this.selectedNotifications.has(notificationId)) {
          this.selectedNotifications.delete(notificationId);
          item.classList.remove('selected');
          checkbox.classList.remove('checked');
        } else {
          this.selectedNotifications.add(notificationId);
          item.classList.add('selected');
          checkbox.classList.add('checked');
        }
        
        this._triggerSelectionChange();
        return;
      }
      
      // 标记为已读
      if (!notification.read) {
        this.markAsRead(notification.id);
      }
      
      // 触发点击回调
      if (typeof this.options.onNotificationClick === 'function') {
        try {
          this.options.onNotificationClick(notification);
        } catch (error) {
          logger.error('通知点击回调执行失败', error);
        }
      }
      
      // 如果设置了点击关闭面板
      if (this.options.closeOnClick) {
        this.close();
      }
    });
    
    // 绑定关闭按钮事件
    close.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.removeNotification(notification.id);
    });
    
    return item;
  }

  /**
   * 打开通知面板
   */
  open() {
    if (this.isOpen) return;
    
    this.panelElement.classList.remove('jev-notification-closed');
    this.panelElement.classList.add('jev-notification-open');
    this.isOpen = true;
    this.updateState({ isOpen: true });
    
    // 触发打开回调
    if (typeof this.options.onPanelOpen === 'function') {
      try {
        this.options.onPanelOpen();
      } catch (error) {
        logger.error('通知面板打开回调执行失败', error);
      }
    }
    
    // 更新滚动行为
    setTimeout(() => this._updateScrollBehavior(), 100);
  }

  /**
   * 关闭通知面板
   */
  close() {
    if (!this.isOpen) return;
    
    this.panelElement.classList.remove('jev-notification-open');
    this.panelElement.classList.add('jev-notification-closed');
    this.isOpen = false;
    this.updateState({ isOpen: false });
    
    // 触发关闭回调
    if (typeof this.options.onPanelClose === 'function') {
      try {
        this.options.onPanelClose();
      } catch (error) {
        logger.error('通知面板关闭回调执行失败', error);
      }
    }
    
    // 清除选择
    this.selectedNotifications.clear();
    const selectedItems = this.notificationList.querySelectorAll('.jev-notification-item.selected');
    selectedItems.forEach(item => {
      item.classList.remove('selected');
      const checkbox = item.querySelector('.jev-notification-item-checkbox');
      if (checkbox) checkbox.classList.remove('checked');
    });
  }

  /**
   * 添加通知
   * @param {Object|string} notification - 通知对象或消息文本
   * @returns {string} 通知ID
   */
  addNotification(notification) {
    // 支持字符串参数
    if (typeof notification === 'string') {
      notification = {
        message: notification,
        type: 'info'
      };
    }
    
    // 生成唯一ID
    const id = notification.id || `jev-notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // 构建完整通知对象
    const fullNotification = {
      id,
      title: notification.title || '',
      message: notification.message || '',
      type: notification.type || 'info',
      timestamp: notification.timestamp || new Date(),
      read: notification.read || false,
      data: notification.data || {}
    };
    
    // 添加到通知列表
    this.notifications.unshift(fullNotification);
    
    // 限制最大通知数量
    if (this.notifications.length > this.options.maxNotifications) {
      const removedNotifications = this.notifications.splice(this.options.maxNotifications);
      // 清理被移除的通知DOM元素
      removedNotifications.forEach(n => {
        const element = this.notificationList.querySelector(`[data-id="${n.id}"]`);
        if (element) element.remove();
      });
    }
    
    // 创建并添加DOM元素
    const notificationElement = this._createNotificationElement(fullNotification);
    
    // 如果是空的，移除空状态
    if (this.notifications.length === 1) {
      this.emptyStateElement.style.display = 'none';
    }
    
    // 插入到列表开头
    const firstChild = this.notificationList.firstChild;
    if (firstChild === this.emptyStateElement) {
      this.notificationList.appendChild(notificationElement);
    } else {
      this.notificationList.insertBefore(notificationElement, firstChild);
    }
    
    // 触发显示动画
    if (this.options.animateNotifications) {
      setTimeout(() => {
        notificationElement.classList.add('visible');
      }, 10);
    } else {
      notificationElement.classList.add('visible');
    }
    
    // 更新计数器
    this._updateCounter();
    
    // 如果设置了声音提醒
    if (this.options.soundEnabled) {
      this._playSound();
    }
    
    // 如果面板关闭且有新通知，可以考虑自动打开
    if (!this.isOpen && this.options.autoOpen) {
      this.open();
    }
    
    // 触发添加回调
    if (typeof this.options.onNotificationAdd === 'function') {
      try {
        this.options.onNotificationAdd(fullNotification);
      } catch (error) {
        logger.error('通知添加回调执行失败', error);
      }
    }
    
    // 更新状态
    this.updateState({ 
      notifications: [...this.notifications],
      unreadCount: this.notifications.filter(n => !n.read).length
    });
    
    // 更新过滤器
    this._filterNotifications();
    
    return id;
  }

  /**
   * 移除通知
   * @param {string} id - 通知ID
   */
  removeNotification(id) {
    const index = this.notifications.findIndex(n => n.id === id);
    if (index === -1) return;
    
    const notification = this.notifications[index];
    
    // 移除DOM元素
    const element = this.notificationList.querySelector(`[data-id="${id}"]`);
    if (element) {
      // 触发移除动画
      element.style.opacity = '0';
      element.style.transform = 'translateY(10px)';
      element.style.marginBottom = '0';
      element.style.height = `${element.offsetHeight}px`;
      
      setTimeout(() => {
        element.style.height = '0';
        element.style.padding = '0';
        element.style.marginBottom = '0';
        
        setTimeout(() => {
          if (element.parentNode) {
            element.parentNode.removeChild(element);
          }
        }, 300);
      }, 10);
    }
    
    // 从数组中移除
    this.notifications.splice(index, 1);
    
    // 从选择集中移除
    this.selectedNotifications.delete(id);
    
    // 更新空状态
    if (this.notifications.length === 0) {
      this.emptyStateElement.style.display = 'flex';
    }
    
    // 更新计数器
    this._updateCounter();
    
    // 触发移除回调
    if (typeof this.options.onNotificationRemove === 'function') {
      try {
        this.options.onNotificationRemove(notification);
      } catch (error) {
        logger.error('通知移除回调执行失败', error);
      }
    }
    
    // 更新状态
    this.updateState({ 
      notifications: [...this.notifications],
      unreadCount: this.notifications.filter(n => !n.read).length
    });
    
    // 更新过滤器
    this._filterNotifications();
  }

  /**
   * 标记通知为已读
   * @param {string} id - 通知ID
   */
  markAsRead(id) {
    const notification = this.notifications.find(n => n.id === id);
    if (!notification || notification.read) return;
    
    notification.read = true;
    
    // 更新DOM元素
    const element = this.notificationList.querySelector(`[data-id="${id}"]`);
    if (element) {
      element.classList.remove('unread');
    }
    
    // 更新计数器
    this._updateCounter();
    
    // 更新状态
    this.updateState({ 
      unreadCount: this.notifications.filter(n => !n.read).length
    });
  }

  /**
   * 标记所有通知为已读
   */
  markAllAsRead() {
    this.notifications.forEach(notification => {
      if (!notification.read) {
        notification.read = true;
        
        // 更新DOM元素
        const element = this.notificationList.querySelector(`[data-id="${notification.id}"]`);
        if (element) {
          element.classList.remove('unread');
        }
      }
    });
    
    // 更新计数器
    this._updateCounter();
    
    // 更新状态
    this.updateState({ unreadCount: 0 });
  }

  /**
   * 清空所有通知
   */
  clear() {
    // 清空DOM元素
    const notificationItems = this.notificationList.querySelectorAll('.jev-notification-item');
    notificationItems.forEach(item => item.remove());
    
    // 清空数组
    this.notifications = [];
    this.selectedNotifications.clear();
    
    // 显示空状态
    this.emptyStateElement.style.display = 'flex';
    
    // 更新计数器
    this._updateCounter();
    
    // 更新状态
    this.updateState({ 
      notifications: [],
      unreadCount: 0 
    });
  }

  /**
   * 更新计数器
   * @private
   */
  _updateCounter() {
    if (!this.options.showCounter || !this.counterElement) return;
    
    const unreadCount = this.notifications.filter(n => !n.read).length;
    this.counterElement.textContent = unreadCount;
    this.counterElement.style.display = unreadCount > 0 ? 'inline-block' : 'none';
  }

  /**
   * 播放通知声音
   * @private
   */
  _playSound() {
    try {
      const audio = new Audio(this.options.soundPath);
      audio.volume = 0.3;
      audio.play().catch(e => {
        logger.warn('通知声音播放失败', e);
      });
    } catch (error) {
      logger.error('通知声音初始化失败', error);
    }
  }

  /**
   * 获取所有通知
   * @returns {Array} 通知数组
   */
  getAllNotifications() {
    return [...this.notifications];
  }

  /**
   * 获取未读通知
   * @returns {Array} 未读通知数组
   */
  getUnreadNotifications() {
    return this.notifications.filter(n => !n.read);
  }

  /**
   * 获取已选择的通知
   * @returns {Array} 已选择通知数组
   */
  getSelectedNotifications() {
    return this.notifications.filter(n => this.selectedNotifications.has(n.id));
  }

  /**
   * 设置面板标题
   * @param {string} title - 新标题
   */
  setTitle(title) {
    this.options.title = title;
    this.titleElement.textContent = title;
  }

  /**
   * 设置主题
   * @param {string} theme - 主题名称
   */
  setTheme(theme) {
    // 移除旧主题类
    ['default', 'dark', 'neon'].forEach(t => {
      this.panelElement.classList.remove(`jev-notification-panel-${t}`);
    });
    
    // 添加新主题类
    this.options.theme = theme;
    this.panelElement.classList.add(`jev-notification-panel-${theme}`);
  }

  /**
   * 切换面板可见性
   */
  toggle() {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  /**
   * 检查面板是否可见
   * @returns {boolean} 是否可见
   */
  isVisible() {
    return this.isOpen;
  }

  /**
   * 获取未读数量
   * @returns {number} 未读数量
   */
  getUnreadCount() {
    return this.notifications.filter(n => !n.read).length;
  }

  /**
   * 资源释放与清理
   */
  async destroy() {
    try {
      // 清理定时器
      if (this.updateTimer) {
        clearTimeout(this.updateTimer);
        this.updateTimer = null;
      }
      
      // 清理调整大小观察器
      if (this.resizeObserver) {
        this.resizeObserver.disconnect();
        this.resizeObserver = null;
      }
      
      // 移除DOM元素
      if (this.panelElement && this.panelElement.parentNode) {
        this.panelElement.remove();
      }
      
      // 清空数据
      this.notifications = [];
      this.selectedNotifications.clear();
      
      this.isOpen = false;
      this.filterValue = '';
      
    } catch (error) {
      logger.error('通知面板组件销毁失败', error);
    }
  }
}

export default Notification;