/**
 * Dropdown下拉菜单组件
 * 提供下拉选择功能，支持多级嵌套、动画效果和丰富的交互方式
 */
import BaseComponent from './base-component.js';
import logger from '../utils/logger.js';

class Dropdown extends BaseComponent {
  /**
   * 构造函数
   * @param {Object} options - 配置选项
   */
  constructor(options = {}) {
    super(options);
    
    // 组件元素引用
    this.toggleElement = null;
    this.menuElement = null;
    this.menuItems = [];
    
    // 状态管理
    this.isOpen = false;
    this.selectedItems = new Set();
    this.disabledItems = new Set();
    this.hiddenItems = new Set();
    
    // 事件处理器
    this._toggleClickHandler = null;
    this._documentClickHandler = null;
    this._keydownHandler = null;
    this._resizeHandler = null;
    this._scrollHandler = null;
    
    // 动画相关
    this.animationTimeout = null;
    
    // 触摸设备检测
    this.isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  }

  /**
   * 获取默认配置
   * @private
   */
  _getDefaultOptions() {
    return {
      ...super._getDefaultOptions(),
      items: [],
      label: 'Select an option',
      placeholder: 'Select an option',
      value: null,
      multiple: false,
      searchable: false,
      filterable: false,
      clearable: true,
      disabled: false,
      readOnly: false,
      theme: 'neon', // neon, default, dark
      placement: 'bottom', // top, bottom, left, right
      alignment: 'start', // start, center, end
      autoClose: true,
      closeOnClick: true,
      closeOnOutsideClick: true,
      closeOnEscape: true,
      showCheckMarks: true,
      showBadge: true,
      animation: 'fade', // fade, slide, scale, none
      animationDuration: 250,
      maxHeight: 300,
      minWidth: 200,
      zIndex: 1050,
      onOpen: null,
      onClose: null,
      onToggle: null,
      onSelect: null,
      onDeselect: null,
      onSearch: null,
      onClear: null,
      beforeOpen: null,
      beforeClose: null
    };
  }

  /**
   * 获取初始状态
   * @private
   */
  _getInitialState() {
    return {
      ...super._getInitialState(),
      items: this.options.items,
      value: this.options.value,
      isOpen: false,
      searchTerm: ''
    };
  }

  /**
   * 创建DOM元素
   * @private
   */
  _createElement() {
    // 主容器
    this.element = document.createElement('div');
    this.element.className = `jev-dropdown jev-dropdown-${this.options.theme} ${this.options.disabled ? 'jev-dropdown-disabled' : ''}`;
    this.element.style.zIndex = this.options.zIndex;
    
    // 切换按钮
    this.toggleElement = document.createElement('button');
    this.toggleElement.className = 'jev-dropdown-toggle';
    this.toggleElement.setAttribute('type', 'button');
    this.toggleElement.setAttribute('aria-expanded', 'false');
    this.toggleElement.setAttribute('aria-haspopup', 'true');
    this.toggleElement.setAttribute('aria-label', 'Open dropdown menu');
    if (this.options.disabled) {
      this.toggleElement.disabled = true;
    }
    
    // 切换按钮内容
    const toggleContent = document.createElement('span');
    toggleContent.className = 'jev-dropdown-toggle-content';
    
    // 标签文本
    const labelElement = document.createElement('span');
    labelElement.className = 'jev-dropdown-label';
    labelElement.textContent = this._getDisplayLabel();
    
    // 下拉指示器
    const caretElement = document.createElement('span');
    caretElement.className = 'jev-dropdown-caret';
    caretElement.innerHTML = '▼';
    
    // 组装切换按钮
    toggleContent.appendChild(labelElement);
    toggleContent.appendChild(caretElement);
    this.toggleElement.appendChild(toggleContent);
    
    // 多选标签容器
    if (this.options.multiple && this.options.showBadge) {
      const badgesContainer = document.createElement('div');
      badgesContainer.className = 'jev-dropdown-badges';
      this.toggleElement.appendChild(badgesContainer);
    }
    
    // 菜单容器
    this.menuElement = document.createElement('div');
    this.menuElement.className = `jev-dropdown-menu jev-dropdown-menu-${this.options.placement} jev-dropdown-menu-${this.options.alignment}`;
    this.menuElement.style.maxHeight = `${this.options.maxHeight}px`;
    this.menuElement.style.minWidth = `${this.options.minWidth}px`;
    this.menuElement.setAttribute('role', 'menu');
    this.menuElement.setAttribute('aria-labelledby', 'jev-dropdown-toggle');
    
    // 搜索框
    if (this.options.searchable || this.options.filterable) {
      const searchContainer = document.createElement('div');
      searchContainer.className = 'jev-dropdown-search';
      
      const searchInput = document.createElement('input');
      searchInput.className = 'jev-dropdown-search-input';
      searchInput.setAttribute('type', 'text');
      searchInput.setAttribute('placeholder', 'Search...');
      searchInput.setAttribute('role', 'search');
      
      searchContainer.appendChild(searchInput);
      this.menuElement.appendChild(searchContainer);
    }
    
    // 菜单内容容器
    const menuContent = document.createElement('div');
    menuContent.className = 'jev-dropdown-menu-content';
    this.menuElement.appendChild(menuContent);
    
    // 组装组件
    this.element.appendChild(this.toggleElement);
    this.element.appendChild(this.menuElement);
    
    // 创建菜单项
    this._createMenuItems(this.state.items, menuContent);
    
    // 绑定搜索事件
    if (this.options.searchable || this.options.filterable) {
      const searchInput = this.menuElement.querySelector('.jev-dropdown-search-input');
      if (searchInput) {
        searchInput.addEventListener('input', (e) => this._handleSearch(e.target.value));
        searchInput.addEventListener('keydown', this._handleSearchKeydown.bind(this));
      }
    }
  }

  /**
   * 创建菜单项
   * @private
   */
  _createMenuItems(items, parentElement, level = 0) {
    items.forEach((item, index) => {
      if (item.divider) {
        // 创建分隔线
        const divider = document.createElement('div');
        divider.className = 'jev-dropdown-divider';
        parentElement.appendChild(divider);
        return;
      }
      
      if (item.header) {
        // 创建标题
        const header = document.createElement('div');
        header.className = 'jev-dropdown-header';
        header.textContent = item.header;
        parentElement.appendChild(header);
        return;
      }
      
      // 创建菜单项容器
      const itemContainer = document.createElement('div');
      itemContainer.className = `jev-dropdown-item-container ${level > 0 ? 'jev-dropdown-submenu-container' : ''}`;
      
      // 创建菜单项
      const menuItem = document.createElement('button');
      menuItem.className = `jev-dropdown-item ${this._isItemSelected(item.value) ? 'jev-dropdown-item-selected' : ''} ${item.disabled ? 'jev-dropdown-item-disabled' : ''} ${item.hidden ? 'jev-dropdown-item-hidden' : ''} ${level > 0 ? 'jev-dropdown-submenu-item' : ''}`;
      menuItem.setAttribute('role', 'menuitem');
      menuItem.setAttribute('aria-selected', this._isItemSelected(item.value));
      menuItem.setAttribute('data-value', item.value);
      
      // 添加缩进
      if (level > 0) {
        menuItem.style.paddingLeft = `${16 + (level * 20)}px`;
      }
      
      // 复选标记
      if (this.options.multiple && this.options.showCheckMarks) {
        const checkMark = document.createElement('span');
        checkMark.className = `jev-dropdown-item-check ${this._isItemSelected(item.value) ? 'jev-dropdown-item-check-visible' : ''}`;
        checkMark.innerHTML = '✓';
        menuItem.appendChild(checkMark);
      }
      
      // 文本内容
      const textElement = document.createElement('span');
      textElement.className = 'jev-dropdown-item-text';
      textElement.textContent = item.label;
      menuItem.appendChild(textElement);
      
      // 子菜单指示器
      if (item.children && item.children.length > 0) {
        const submenuIndicator = document.createElement('span');
        submenuIndicator.className = 'jev-dropdown-submenu-indicator';
        submenuIndicator.innerHTML = '►';
        menuItem.appendChild(submenuIndicator);
        
        // 创建子菜单
        const submenu = document.createElement('div');
        submenu.className = 'jev-dropdown-submenu';
        submenu.setAttribute('role', 'menu');
        
        // 创建子菜单项
        this._createMenuItems(item.children, submenu, level + 1);
        
        itemContainer.appendChild(submenu);
      }
      
      // 添加菜单项到容器
      itemContainer.appendChild(menuItem);
      parentElement.appendChild(itemContainer);
      
      // 存储引用
      this.menuItems.push({
        element: menuItem,
        container: itemContainer,
        value: item.value,
        submenu: item.children ? true : false
      });
      
      // 添加禁用状态
      if (item.disabled) {
        this.disabledItems.add(item.value);
      }
      
      // 添加隐藏状态
      if (item.hidden) {
        this.hiddenItems.add(item.value);
      }
      
      // 绑定点击事件
      menuItem.addEventListener('click', (e) => this._handleItemClick(e, item));
      
      // 绑定键盘事件
      menuItem.addEventListener('keydown', (e) => this._handleItemKeydown(e, item));
      
      // 处理子菜单显示
      if (item.children && item.children.length > 0) {
        menuItem.addEventListener('mouseenter', () => this._showSubmenu(menuItem, itemContainer.querySelector('.jev-dropdown-submenu')));
        menuItem.addEventListener('mouseleave', () => this._hideSubmenu(menuItem, itemContainer.querySelector('.jev-dropdown-submenu')));
        menuItem.addEventListener('focus', () => this._showSubmenu(menuItem, itemContainer.querySelector('.jev-dropdown-submenu')));
        menuItem.addEventListener('blur', () => this._hideSubmenu(menuItem, itemContainer.querySelector('.jev-dropdown-submenu')));
      }
    });
  }

  /**
   * 应用样式
   * @private
   */
  _applyStyles() {
    // 添加全局样式
    this._addGlobalStyle('jev-dropdown-styles', `
      /* 基础样式 */
      .jev-dropdown {
        position: relative;
        display: inline-block;
      }
      
      /* 切换按钮样式 */
      .jev-dropdown-toggle {
        position: relative;
        padding: 10px 16px;
        border: 1px solid #ccc;
        border-radius: 4px;
        background-color: #fff;
        cursor: pointer;
        font-size: 14px;
        font-family: inherit;
        display: flex;
        align-items: center;
        justify-content: space-between;
        min-width: 100%;
        box-sizing: border-box;
        transition: all 0.2s ease;
      }
      
      .jev-dropdown-toggle:focus {
        outline: none;
      }
      
      .jev-dropdown-toggle-content {
        display: flex;
        align-items: center;
        justify-content: space-between;
        width: 100%;
        overflow: hidden;
      }
      
      .jev-dropdown-label {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        flex: 1;
      }
      
      .jev-dropdown-caret {
        margin-left: 8px;
        font-size: 12px;
        transition: transform 0.2s ease;
        flex-shrink: 0;
      }
      
      /* 多选标签容器 */
      .jev-dropdown-badges {
        display: flex;
        flex-wrap: wrap;
        gap: 4px;
        margin-top: 4px;
        width: 100%;
        max-height: 60px;
        overflow-y: auto;
      }
      
      .jev-dropdown-badge {
        padding: 2px 8px;
        border-radius: 12px;
        font-size: 12px;
        display: flex;
        align-items: center;
        gap: 4px;
      }
      
      .jev-dropdown-badge-close {
        background: none;
        border: none;
        cursor: pointer;
        font-size: 12px;
        padding: 0;
        width: 16px;
        height: 16px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        transition: all 0.2s ease;
      }
      
      /* 菜单样式 */
      .jev-dropdown-menu {
        position: absolute;
        top: 100%;
        left: 0;
        margin-top: 4px;
        background-color: #fff;
        border: 1px solid #ccc;
        border-radius: 4px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        z-index: 1000;
        display: none;
        overflow: hidden;
      }
      
      .jev-dropdown-menu-content {
        overflow-y: auto;
        max-height: 100%;
      }
      
      /* 搜索框样式 */
      .jev-dropdown-search {
        padding: 8px;
        border-bottom: 1px solid #eee;
      }
      
      .jev-dropdown-search-input {
        width: 100%;
        padding: 6px 12px;
        border: 1px solid #ddd;
        border-radius: 4px;
        font-size: 14px;
        box-sizing: border-box;
      }
      
      .jev-dropdown-search-input:focus {
        outline: none;
        border-color: #007bff;
      }
      
      /* 菜单项样式 */
      .jev-dropdown-item {
        position: relative;
        padding: 8px 16px;
        border: none;
        background: none;
        cursor: pointer;
        font-size: 14px;
        width: 100%;
        text-align: left;
        display: flex;
        align-items: center;
        gap: 8px;
        transition: all 0.2s ease;
      }
      
      .jev-dropdown-item-check {
        opacity: 0;
        font-weight: bold;
        transition: opacity 0.2s ease;
      }
      
      .jev-dropdown-item-check-visible {
        opacity: 1;
      }
      
      .jev-dropdown-item-text {
        flex: 1;
      }
      
      .jev-dropdown-submenu-indicator {
        font-size: 12px;
      }
      
      /* 子菜单样式 */
      .jev-dropdown-submenu {
        position: absolute;
        top: 0;
        left: 100%;
        margin-left: 4px;
        background-color: #fff;
        border: 1px solid #ccc;
        border-radius: 4px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        z-index: 1001;
        display: none;
        min-width: 150px;
      }
      
      /* 分隔线样式 */
      .jev-dropdown-divider {
        height: 1px;
        background-color: #eee;
        margin: 4px 0;
      }
      
      /* 标题样式 */
      .jev-dropdown-header {
        padding: 8px 16px;
        font-weight: bold;
        font-size: 12px;
        color: #666;
        background-color: #f8f9fa;
      }
      
      /* 状态样式 */
      .jev-dropdown-disabled .jev-dropdown-toggle {
        opacity: 0.6;
        cursor: not-allowed;
      }
      
      .jev-dropdown-item-disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
      
      .jev-dropdown-item-hidden {
        display: none;
      }
      
      /* 位置样式 */
      .jev-dropdown-menu-top {
        top: auto;
        bottom: 100%;
        margin-top: 0;
        margin-bottom: 4px;
      }
      
      .jev-dropdown-menu-right {
        left: auto;
        right: 0;
      }
      
      /* 对齐样式 */
      .jev-dropdown-menu-center {
        left: 50%;
        transform: translateX(-50%);
      }
      
      .jev-dropdown-menu-end {
        right: 0;
        left: auto;
      }
      
      /* 动画效果 */
      .jev-dropdown-menu.jev-dropdown-animation-fade {
        opacity: 0;
        transform: translateY(-10px);
        transition: opacity 0.25s ease, transform 0.25s ease;
      }
      
      .jev-dropdown-menu.jev-dropdown-animation-fade.jev-dropdown-menu-open {
        opacity: 1;
        transform: translateY(0);
      }
      
      .jev-dropdown-menu-top.jev-dropdown-animation-fade {
        transform: translateY(10px);
      }
      
      .jev-dropdown-menu-top.jev-dropdown-animation-fade.jev-dropdown-menu-open {
        transform: translateY(0);
      }
      
      .jev-dropdown-menu.jev-dropdown-animation-slide {
        max-height: 0;
        overflow: hidden;
        transition: max-height 0.25s ease;
      }
      
      .jev-dropdown-menu.jev-dropdown-animation-slide.jev-dropdown-menu-open {
        max-height: 500px;
      }
      
      .jev-dropdown-menu.jev-dropdown-animation-scale {
        opacity: 0;
        transform: scale(0.95);
        transition: opacity 0.25s ease, transform 0.25s ease;
      }
      
      .jev-dropdown-menu.jev-dropdown-animation-scale.jev-dropdown-menu-open {
        opacity: 1;
        transform: scale(1);
      }
      
      /* Neon主题样式 */
      .jev-dropdown-neon .jev-dropdown-toggle {
        background-color: #1a1a1a;
        border-color: #00ff99;
        color: #fff;
      }
      
      .jev-dropdown-neon .jev-dropdown-toggle:hover:not(:disabled) {
        background-color: #222;
        box-shadow: 0 0 10px rgba(0, 255, 153, 0.3);
      }
      
      .jev-dropdown-neon .jev-dropdown-toggle:focus:not(:disabled) {
        box-shadow: 0 0 10px rgba(0, 255, 153, 0.5);
      }
      
      .jev-dropdown-neon .jev-dropdown-menu {
        background-color: #1a1a1a;
        border-color: #00ff99;
        color: #fff;
      }
      
      .jev-dropdown-neon .jev-dropdown-item {
        color: #ccc;
      }
      
      .jev-dropdown-neon .jev-dropdown-item:hover:not(.jev-dropdown-item-disabled) {
        background-color: rgba(0, 255, 153, 0.1);
        color: #00ff99;
      }
      
      .jev-dropdown-neon .jev-dropdown-item-selected {
        background-color: rgba(0, 255, 153, 0.2);
        color: #00ff99;
      }
      
      .jev-dropdown-neon .jev-dropdown-item-check {
        color: #00ff99;
      }
      
      .jev-dropdown-neon .jev-dropdown-badge {
        background-color: rgba(0, 255, 153, 0.2);
        color: #00ff99;
        border: 1px solid rgba(0, 255, 153, 0.3);
      }
      
      .jev-dropdown-neon .jev-dropdown-badge-close {
        color: #00ff99;
      }
      
      .jev-dropdown-neon .jev-dropdown-badge-close:hover {
        background-color: rgba(0, 255, 153, 0.3);
      }
      
      .jev-dropdown-neon .jev-dropdown-caret {
        color: #00ff99;
      }
      
      .jev-dropdown-neon .jev-dropdown-divider {
        background-color: #333;
      }
      
      .jev-dropdown-neon .jev-dropdown-header {
        background-color: #222;
        color: #999;
      }
      
      .jev-dropdown-neon .jev-dropdown-search-input {
        background-color: #222;
        border-color: #333;
        color: #fff;
      }
      
      .jev-dropdown-neon .jev-dropdown-search-input:focus {
        border-color: #00ff99;
        box-shadow: 0 0 5px rgba(0, 255, 153, 0.3);
      }
      
      /* Default主题样式 */
      .jev-dropdown-default .jev-dropdown-toggle:hover:not(:disabled) {
        background-color: #f8f9fa;
        border-color: #adb5bd;
      }
      
      .jev-dropdown-default .jev-dropdown-toggle:focus:not(:disabled) {
        border-color: #007bff;
        box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);
      }
      
      .jev-dropdown-default .jev-dropdown-item:hover:not(.jev-dropdown-item-disabled) {
        background-color: #f8f9fa;
        color: #495057;
      }
      
      .jev-dropdown-default .jev-dropdown-item-selected {
        background-color: #007bff;
        color: #fff;
      }
      
      .jev-dropdown-default .jev-dropdown-item-check {
        color: #fff;
      }
      
      .jev-dropdown-default .jev-dropdown-badge {
        background-color: #007bff;
        color: #fff;
      }
      
      .jev-dropdown-default .jev-dropdown-badge-close {
        color: #fff;
      }
      
      .jev-dropdown-default .jev-dropdown-badge-close:hover {
        background-color: rgba(255, 255, 255, 0.2);
      }
      
      .jev-dropdown-default .jev-dropdown-header {
        color: #6c757d;
      }
      
      /* Dark主题样式 */
      .jev-dropdown-dark .jev-dropdown-toggle {
        background-color: #343a40;
        border-color: #495057;
        color: #f8f9fa;
      }
      
      .jev-dropdown-dark .jev-dropdown-toggle:hover:not(:disabled) {
        background-color: #495057;
        border-color: #6c757d;
      }
      
      .jev-dropdown-dark .jev-dropdown-toggle:focus:not(:disabled) {
        border-color: #63b3ed;
        box-shadow: 0 0 0 0.2rem rgba(99, 179, 237, 0.25);
      }
      
      .jev-dropdown-dark .jev-dropdown-menu {
        background-color: #343a40;
        border-color: #495057;
        color: #f8f9fa;
      }
      
      .jev-dropdown-dark .jev-dropdown-item {
        color: #f8f9fa;
      }
      
      .jev-dropdown-dark .jev-dropdown-item:hover:not(.jev-dropdown-item-disabled) {
        background-color: #495057;
        color: #f8f9fa;
      }
      
      .jev-dropdown-dark .jev-dropdown-item-selected {
        background-color: #63b3ed;
        color: #000;
      }
      
      .jev-dropdown-dark .jev-dropdown-item-check {
        color: #000;
      }
      
      .jev-dropdown-dark .jev-dropdown-badge {
        background-color: #63b3ed;
        color: #000;
      }
      
      .jev-dropdown-dark .jev-dropdown-badge-close {
        color: #000;
      }
      
      .jev-dropdown-dark .jev-dropdown-badge-close:hover {
        background-color: rgba(0, 0, 0, 0.2);
      }
      
      .jev-dropdown-dark .jev-dropdown-divider {
        background-color: #495057;
      }
      
      .jev-dropdown-dark .jev-dropdown-header {
        background-color: #495057;
        color: #adb5bd;
      }
      
      .jev-dropdown-dark .jev-dropdown-search-input {
        background-color: #495057;
        border-color: #6c757d;
        color: #f8f9fa;
      }
      
      .jev-dropdown-dark .jev-dropdown-search-input:focus {
        border-color: #63b3ed;
        box-shadow: 0 0 0 0.2rem rgba(99, 179, 237, 0.25);
      }
      
      /* 打开状态 */
      .jev-dropdown-open .jev-dropdown-menu {
        display: block;
      }
      
      .jev-dropdown-open .jev-dropdown-caret {
        transform: rotate(180deg);
      }
      
      /* 响应式设计 */
      @media (max-width: 768px) {
        .jev-dropdown-toggle {
          padding: 8px 12px;
          font-size: 14px;
        }
        
        .jev-dropdown-menu {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          margin: 0;
          width: 100%;
          height: 100%;
          max-height: 100%;
          border-radius: 0;
          z-index: 1050;
          overflow-y: auto;
        }
        
        .jev-dropdown-menu-content {
          padding: 16px;
        }
        
        .jev-dropdown-menu-center,
        .jev-dropdown-menu-end {
          left: 0;
          transform: none;
        }
      }
    `);
    
    // 设置动画类
    if (this.options.animation !== 'none') {
      this.menuElement.classList.add(`jev-dropdown-animation-${this.options.animation}`);
    }
    
    // 绑定事件
    this._toggleClickHandler = () => this.toggle();
    this.toggleElement.addEventListener('click', this._toggleClickHandler);
    
    // 绑定全局点击事件
    this._documentClickHandler = (e) => this._handleDocumentClick(e);
    document.addEventListener('click', this._documentClickHandler);
    
    // 绑定键盘事件
    this._keydownHandler = (e) => this._handleKeydown(e);
    document.addEventListener('keydown', this._keydownHandler);
    
    // 绑定窗口大小变化事件
    this._resizeHandler = () => this._handleResize();
    window.addEventListener('resize', this._resizeHandler);
    
    // 绑定滚动事件
    this._scrollHandler = () => this._handleScroll();
    window.addEventListener('scroll', this._scrollHandler);
    
    // 初始化选中状态
    this._initializeSelectedItems();
  }

  /**
   * 绑定事件
   * @private
   */
  _bindEvents() {
    // 事件已在applyStyles中绑定
  }

  /**
   * 解绑事件
   * @private
   */
  _unbindEvents() {
    if (this._toggleClickHandler) {
      this.toggleElement.removeEventListener('click', this._toggleClickHandler);
      this._toggleClickHandler = null;
    }
    
    if (this._documentClickHandler) {
      document.removeEventListener('click', this._documentClickHandler);
      this._documentClickHandler = null;
    }
    
    if (this._keydownHandler) {
      document.removeEventListener('keydown', this._keydownHandler);
      this._keydownHandler = null;
    }
    
    if (this._resizeHandler) {
      window.removeEventListener('resize', this._resizeHandler);
      this._resizeHandler = null;
    }
    
    if (this._scrollHandler) {
      window.removeEventListener('scroll', this._scrollHandler);
      this._scrollHandler = null;
    }
  }

  /**
   * 初始化选中项
   * @private
   */
  _initializeSelectedItems() {
    if (this.options.multiple && Array.isArray(this.state.value)) {
      this.state.value.forEach(value => {
        this.selectedItems.add(value);
      });
    } else if (!this.options.multiple && this.state.value !== null) {
      this.selectedItems.add(this.state.value);
    }
    
    // 更新标签
    this._updateToggleLabel();
    this._updateBadges();
  }

  /**
   * 获取显示标签
   * @private
   */
  _getDisplayLabel() {
    if (this.options.multiple && this.selectedItems.size > 0) {
      if (this.selectedItems.size === 1) {
        const selectedItem = this._findItemByValue(Array.from(this.selectedItems)[0]);
        return selectedItem ? selectedItem.label : this.options.placeholder;
      }
      return `${this.selectedItems.size} items selected`;
    } else if (!this.options.multiple && this.selectedItems.size === 1) {
      const selectedItem = this._findItemByValue(Array.from(this.selectedItems)[0]);
      return selectedItem ? selectedItem.label : this.options.placeholder;
    }
    return this.options.placeholder;
  }

  /**
   * 更新切换按钮标签
   * @private
   */
  _updateToggleLabel() {
    const labelElement = this.toggleElement.querySelector('.jev-dropdown-label');
    if (labelElement) {
      labelElement.textContent = this._getDisplayLabel();
    }
  }

  /**
   * 更新多选标签
   * @private
   */
  _updateBadges() {
    if (!this.options.multiple || !this.options.showBadge) {
      return;
    }
    
    const badgesContainer = this.toggleElement.querySelector('.jev-dropdown-badges');
    if (!badgesContainer) {
      return;
    }
    
    // 清空现有标签
    badgesContainer.innerHTML = '';
    
    // 创建新标签
    this.selectedItems.forEach(value => {
      const item = this._findItemByValue(value);
      if (item) {
        const badge = document.createElement('div');
        badge.className = 'jev-dropdown-badge';
        
        const badgeText = document.createElement('span');
        badgeText.textContent = item.label;
        
        const badgeClose = document.createElement('button');
        badgeClose.className = 'jev-dropdown-badge-close';
        badgeClose.innerHTML = '&times;';
        badgeClose.setAttribute('aria-label', `Remove ${item.label}`);
        badgeClose.addEventListener('click', (e) => {
          e.stopPropagation();
          this.deselect(value);
        });
        
        badge.appendChild(badgeText);
        badge.appendChild(badgeClose);
        badgesContainer.appendChild(badge);
      }
    });
  }

  /**
   * 检查项是否选中
   * @private
   */
  _isItemSelected(value) {
    return this.selectedItems.has(value);
  }

  /**
   * 通过值查找项
   * @private
   */
  _findItemByValue(value, items = this.state.items) {
    for (const item of items) {
      if (item.value === value) {
        return item;
      }
      if (item.children && item.children.length > 0) {
        const found = this._findItemByValue(value, item.children);
        if (found) {
          return found;
        }
      }
    }
    return null;
  }

  /**
   * 处理切换点击
   * @private
   */
  async toggle() {
    if (this.options.disabled || this.options.readOnly) {
      return;
    }
    
    if (this.isOpen) {
      await this.close();
    } else {
      await this.open();
    }
    
    // 触发切换回调
    if (typeof this.options.onToggle === 'function') {
      try {
        this.options.onToggle(this.isOpen);
      } catch (error) {
        logger.error('切换回调执行失败', error);
      }
    }
  }

  /**
   * 打开下拉菜单
   */
  async open() {
    if (this.isOpen || this.options.disabled || this.options.readOnly) {
      return;
    }
    
    // 触发打开前回调
    if (typeof this.options.beforeOpen === 'function') {
      try {
        const canOpen = await this.options.beforeOpen();
        if (canOpen === false) {
          return;
        }
      } catch (error) {
        logger.error('打开前回调执行失败', error);
        return;
      }
    }
    
    // 添加打开类
    this.element.classList.add('jev-dropdown-open');
    this.menuElement.classList.add('jev-dropdown-menu-open');
    this.toggleElement.setAttribute('aria-expanded', 'true');
    
    // 更新状态
    this.isOpen = true;
    this.updateState({ isOpen: true });
    
    // 设置焦点到第一个菜单项
    setTimeout(() => {
      const firstItem = this.menuElement.querySelector('.jev-dropdown-item:not(.jev-dropdown-item-disabled):not(.jev-dropdown-item-hidden)');
      if (firstItem) {
        firstItem.focus();
      } else if (this.options.searchable || this.options.filterable) {
        const searchInput = this.menuElement.querySelector('.jev-dropdown-search-input');
        if (searchInput) {
          searchInput.focus();
        }
      }
    }, 10);
    
    // 触发打开回调
    if (typeof this.options.onOpen === 'function') {
      try {
        this.options.onOpen();
      } catch (error) {
        logger.error('打开回调执行失败', error);
      }
    }
  }

  /**
   * 关闭下拉菜单
   */
  async close() {
    if (!this.isOpen) {
      return;
    }
    
    // 触发关闭前回调
    if (typeof this.options.beforeClose === 'function') {
      try {
        const canClose = await this.options.beforeClose();
        if (canClose === false) {
          return;
        }
      } catch (error) {
        logger.error('关闭前回调执行失败', error);
        return;
      }
    }
    
    // 移除打开类
    this.element.classList.remove('jev-dropdown-open');
    
    // 动画处理
    if (this.options.animation !== 'none') {
      this.menuElement.classList.remove('jev-dropdown-menu-open');
      
      // 等待动画完成
      this.animationTimeout = setTimeout(() => {
        this.menuElement.style.display = 'none';
        this.toggleElement.setAttribute('aria-expanded', 'false');
        this.animationTimeout = null;
      }, this.options.animationDuration);
    } else {
      this.menuElement.style.display = 'none';
      this.toggleElement.setAttribute('aria-expanded', 'false');
    }
    
    // 更新状态
    this.isOpen = false;
    this.updateState({ isOpen: false });
    
    // 触发关闭回调
    if (typeof this.options.onClose === 'function') {
      try {
        this.options.onClose();
      } catch (error) {
        logger.error('关闭回调执行失败', error);
      }
    }
  }

  /**
   * 处理文档点击
   * @private
   */
  _handleDocumentClick(event) {
    if (!this.isOpen || !this.options.closeOnOutsideClick) {
      return;
    }
    
    // 检查点击是否在下拉菜单或切换按钮内
    if (!this.element.contains(event.target)) {
      this.close();
    }
  }

  /**
   * 处理键盘事件
   * @private
   */
  _handleKeydown(event) {
    if (!this.isOpen) {
      return;
    }
    
    // ESC键关闭
    if (this.options.closeOnEscape && event.key === 'Escape') {
      event.preventDefault();
      this.close();
      this.toggleElement.focus();
    }
  }

  /**
   * 处理菜单项点击
   * @private
   */
  _handleItemClick(event, item) {
    // 检查是否禁用
    if (item.disabled) {
      return;
    }
    
    // 忽略子菜单项点击（由子菜单处理）
    if (item.children && item.children.length > 0) {
      return;
    }
    
    // 选择项
    if (this.options.multiple) {
      if (this.selectedItems.has(item.value)) {
        this.deselect(item.value);
      } else {
        this.select(item.value);
      }
    } else {
      this.select(item.value);
    }
    
    // 自动关闭
    if (this.options.closeOnClick && (!this.options.multiple || !this.options.autoClose === false)) {
      this.close();
      this.toggleElement.focus();
    }
  }

  /**
   * 处理菜单项键盘事件
   * @private
   */
  _handleItemKeydown(event, item) {
    switch (event.key) {
      case 'Enter':
      case ' ':
        event.preventDefault();
        this._handleItemClick(event, item);
        break;
      case 'ArrowDown':
        event.preventDefault();
        this._navigateItems(1, event.target);
        break;
      case 'ArrowUp':
        event.preventDefault();
        this._navigateItems(-1, event.target);
        break;
      case 'Home':
        event.preventDefault();
        const firstItem = this.menuElement.querySelector('.jev-dropdown-item:not(.jev-dropdown-item-disabled):not(.jev-dropdown-item-hidden)');
        if (firstItem) {
          firstItem.focus();
        }
        break;
      case 'End':
        event.preventDefault();
        const items = Array.from(this.menuElement.querySelectorAll('.jev-dropdown-item:not(.jev-dropdown-item-disabled):not(.jev-dropdown-item-hidden)'));
        if (items.length > 0) {
          items[items.length - 1].focus();
        }
        break;
    }
  }

  /**
   * 导航菜单项
   * @private
   */
  _navigateItems(direction, currentItem) {
    const items = Array.from(this.menuElement.querySelectorAll('.jev-dropdown-item:not(.jev-dropdown-item-disabled):not(.jev-dropdown-item-hidden)'));
    const currentIndex = items.indexOf(currentItem);
    
    if (currentIndex === -1) {
      return;
    }
    
    let newIndex = currentIndex + direction;
    
    // 循环导航
    if (newIndex < 0) {
      newIndex = items.length - 1;
    } else if (newIndex >= items.length) {
      newIndex = 0;
    }
    
    // 设置焦点
    if (items[newIndex]) {
      items[newIndex].focus();
    }
  }

  /**
   * 处理搜索
   * @private
   */
  _handleSearch(term) {
    this.updateState({ searchTerm: term });
    
    // 触发搜索回调
    if (typeof this.options.onSearch === 'function') {
      try {
        this.options.onSearch(term);
      } catch (error) {
        logger.error('搜索回调执行失败', error);
      }
    }
    
    // 过滤菜单项
    if (this.options.filterable) {
      this._filterItems(term);
    }
  }

  /**
   * 处理搜索框键盘事件
   * @private
   */
  _handleSearchKeydown(event) {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        const firstItem = this.menuElement.querySelector('.jev-dropdown-item:not(.jev-dropdown-item-disabled):not(.jev-dropdown-item-hidden)');
        if (firstItem) {
          firstItem.focus();
        }
        break;
    }
  }

  /**
   * 过滤菜单项
   * @private
   */
  _filterItems(term) {
    const normalizedTerm = term.toLowerCase().trim();
    
    this.menuItems.forEach(({ element, value }) => {
      const item = this._findItemByValue(value);
      if (item) {
        const matches = normalizedTerm === '' || 
                      item.label.toLowerCase().includes(normalizedTerm);
        
        if (matches) {
          element.classList.remove('jev-dropdown-item-hidden');
        } else {
          element.classList.add('jev-dropdown-item-hidden');
        }
      }
    });
  }

  /**
   * 显示子菜单
   * @private
   */
  _showSubmenu(item, submenu) {
    if (!item || !submenu) {
      return;
    }
    
    // 定位子菜单
    const itemRect = item.getBoundingClientRect();
    const menuRect = this.menuElement.getBoundingClientRect();
    
    submenu.style.top = `${itemRect.top - menuRect.top}px`;
    submenu.style.left = `${itemRect.right - menuRect.left}px`;
    
    // 显示子菜单
    submenu.style.display = 'block';
  }

  /**
   * 隐藏子菜单
   * @private
   */
  _hideSubmenu(item, submenu) {
    if (!item || !submenu) {
      return;
    }
    
    // 延迟隐藏，允许移动到子菜单
    setTimeout(() => {
      const isHovered = item.matches(':hover') || submenu.matches(':hover');
      if (!isHovered) {
        submenu.style.display = 'none';
      }
    }, 200);
  }

  /**
   * 处理窗口大小变化
   * @private
   */
  _handleResize() {
    if (this.isOpen) {
      // 重新计算位置
      this._positionMenu();
    }
  }

  /**
   * 处理滚动
   * @private
   */
  _handleScroll() {
    if (this.isOpen) {
      // 检查下拉菜单是否在视口内
      if (!this._isInViewport(this.element)) {
        this.close();
      }
    }
  }

  /**
   * 检查元素是否在视口内
   * @private
   */
  _isInViewport(element) {
    const rect = element.getBoundingClientRect();
    return (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
      rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
  }

  /**
   * 定位菜单
   * @private
   */
  _positionMenu() {
    const toggleRect = this.toggleElement.getBoundingClientRect();
    const menuRect = this.menuElement.getBoundingClientRect();
    
    // 根据位置调整
    if (this.options.placement === 'top' && toggleRect.top < menuRect.height) {
      this.menuElement.classList.remove('jev-dropdown-menu-top');
    } else if (this.options.placement === 'bottom' && toggleRect.bottom + menuRect.height > window.innerHeight) {
      this.menuElement.classList.add('jev-dropdown-menu-top');
    }
  }

  /**
   * 选择项
   * @param {*} value - 选项值
   * @returns {Dropdown} 组件实例
   */
  select(value) {
    // 检查值是否有效
    const item = this._findItemByValue(value);
    if (!item || item.disabled) {
      return this;
    }
    
    // 多选模式
    if (this.options.multiple) {
      if (!this.selectedItems.has(value)) {
        this.selectedItems.add(value);
        
        // 更新UI
        this._updateItemSelectedState(value, true);
        
        // 更新值
        const newValue = Array.from(this.selectedItems);
        this.updateState({ value: newValue });
        
        // 触发选择回调
        if (typeof this.options.onSelect === 'function') {
          try {
            this.options.onSelect(value, item);
          } catch (error) {
            logger.error('选择回调执行失败', error);
          }
        }
      }
    } 
    // 单选模式
    else {
      const oldValue = this.selectedItems.size > 0 ? Array.from(this.selectedItems)[0] : null;
      
      if (oldValue !== value) {
        // 取消旧值选择
        if (oldValue !== null) {
          this.selectedItems.delete(oldValue);
          this._updateItemSelectedState(oldValue, false);
        }
        
        // 选择新值
        this.selectedItems.add(value);
        this._updateItemSelectedState(value, true);
        
        // 更新值
        this.updateState({ value });
        
        // 触发选择回调
        if (typeof this.options.onSelect === 'function') {
          try {
            this.options.onSelect(value, item, oldValue);
          } catch (error) {
            logger.error('选择回调执行失败', error);
          }
        }
      }
    }
    
    // 更新标签
    this._updateToggleLabel();
    this._updateBadges();
    
    return this;
  }

  /**
   * 取消选择项
   * @param {*} value - 选项值
   * @returns {Dropdown} 组件实例
   */
  deselect(value) {
    if (!this.selectedItems.has(value) || !this.options.multiple) {
      return this;
    }
    
    // 取消选择
    this.selectedItems.delete(value);
    
    // 更新UI
    this._updateItemSelectedState(value, false);
    
    // 更新值
    const newValue = Array.from(this.selectedItems);
    this.updateState({ value: newValue });
    
    // 触发取消选择回调
    if (typeof this.options.onDeselect === 'function') {
      const item = this._findItemByValue(value);
      try {
        this.options.onDeselect(value, item);
      } catch (error) {
        logger.error('取消选择回调执行失败', error);
      }
    }
    
    // 更新标签
    this._updateToggleLabel();
    this._updateBadges();
    
    return this;
  }

  /**
   * 更新项选择状态
   * @private
   */
  _updateItemSelectedState(value, selected) {
    this.menuItems.forEach(({ element }) => {
      if (element.getAttribute('data-value') === String(value)) {
        element.classList.toggle('jev-dropdown-item-selected', selected);
        element.setAttribute('aria-selected', selected);
        
        const checkMark = element.querySelector('.jev-dropdown-item-check');
        if (checkMark) {
          checkMark.classList.toggle('jev-dropdown-item-check-visible', selected);
        }
      }
    });
  }

  /**
   * 清除所有选择
   * @returns {Dropdown} 组件实例
   */
  clear() {
    // 存储旧值
    const oldValues = Array.from(this.selectedItems);
    
    // 清除选择
    this.selectedItems.clear();
    
    // 更新UI
    oldValues.forEach(value => {
      this._updateItemSelectedState(value, false);
    });
    
    // 更新值
    const newValue = this.options.multiple ? [] : null;
    this.updateState({ value: newValue });
    
    // 触发清除回调
    if (typeof this.options.onClear === 'function') {
      try {
        this.options.onClear(oldValues);
      } catch (error) {
        logger.error('清除回调执行失败', error);
      }
    }
    
    // 更新标签
    this._updateToggleLabel();
    this._updateBadges();
    
    return this;
  }

  /**
   * 设置值
   * @param {*} value - 新值
   * @returns {Dropdown} 组件实例
   */
  setValue(value) {
    // 清除现有选择
    this.selectedItems.clear();
    
    // 设置新值
    if (this.options.multiple && Array.isArray(value)) {
      value.forEach(v => {
        const item = this._findItemByValue(v);
        if (item && !item.disabled) {
          this.selectedItems.add(v);
        }
      });
    } else if (!this.options.multiple && value !== null) {
      const item = this._findItemByValue(value);
      if (item && !item.disabled) {
        this.selectedItems.add(value);
      }
    }
    
    // 更新UI
    this.menuItems.forEach(({ element, value: itemValue }) => {
      const selected = this.selectedItems.has(itemValue);
      element.classList.toggle('jev-dropdown-item-selected', selected);
      element.setAttribute('aria-selected', selected);
      
      const checkMark = element.querySelector('.jev-dropdown-item-check');
      if (checkMark) {
        checkMark.classList.toggle('jev-dropdown-item-check-visible', selected);
      }
    });
    
    // 更新状态
    this.updateState({ value: this.options.multiple ? Array.from(this.selectedItems) : (this.selectedItems.size > 0 ? Array.from(this.selectedItems)[0] : null) });
    
    // 更新标签
    this._updateToggleLabel();
    this._updateBadges();
    
    return this;
  }

  /**
   * 获取值
   * @returns {*} 当前值
   */
  getValue() {
    return this.state.value;
  }

  /**
   * 设置标签
   * @param {string} label - 新标签
   * @returns {Dropdown} 组件实例
   */
  setLabel(label) {
    this.options.label = label;
    this.options.placeholder = label;
    this._updateToggleLabel();
    return this;
  }

  /**
   * 设置禁用状态
   * @param {boolean} disabled - 是否禁用
   * @returns {Dropdown} 组件实例
   */
  setDisabled(disabled) {
    this.options.disabled = disabled;
    this.toggleElement.disabled = disabled;
    this.element.classList.toggle('jev-dropdown-disabled', disabled);
    
    // 如果禁用且打开，关闭下拉菜单
    if (disabled && this.isOpen) {
      this.close();
    }
    
    return this;
  }

  /**
   * 设置只读状态
   * @param {boolean} readOnly - 是否只读
   * @returns {Dropdown} 组件实例
   */
  setReadOnly(readOnly) {
    this.options.readOnly = readOnly;
    
    // 如果只读且打开，关闭下拉菜单
    if (readOnly && this.isOpen) {
      this.close();
    }
    
    return this;
  }

  /**
   * 设置主题
   * @param {string} theme - 主题名称
   * @returns {Dropdown} 组件实例
   */
  setTheme(theme) {
    // 移除旧主题类
    ['neon', 'default', 'dark'].forEach(t => {
      this.element.classList.remove(`jev-dropdown-${t}`);
    });
    
    // 添加新主题类
    this.element.classList.add(`jev-dropdown-${theme}`);
    this.options.theme = theme;
    
    return this;
  }

  /**
   * 检查是否打开
   * @returns {boolean} 是否打开
   */
  isOpen() {
    return this.isOpen;
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
      this.selectedItems.clear();
      this.disabledItems.clear();
      this.hiddenItems.clear();
      this.menuItems = [];
      this.isOpen = false;
      
      // 卸载组件
      await this.unmount();
      
    } catch (error) {
      logger.error('下拉菜单组件销毁失败', error);
    }
  }
}

export default Dropdown;