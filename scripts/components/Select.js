/**
 * Select下拉选择组件
 * 提供灵活的下拉选择功能，支持搜索、多选和分组选项
 */
import BaseComponent from './base-component.js';
import logger from '../utils/logger.js';

class Select extends BaseComponent {
  /**
   * 构造函数
   * @param {Object} options - 配置选项
   * @param {HTMLElement} container - 容器元素
   */
  constructor(options = {}, container = document.body) {
    super(options, container);
    
    // 组件元素引用
    this.inputElement = null;
    this.dropdownElement = null;
    this.optionsContainer = null;
    this.searchInput = null;
    this.tagsContainer = null;
    this.placeholderElement = null;
    this.iconElement = null;
    
    // 状态管理
    this.selectedOptions = [];
    this.filteredOptions = [];
    this.isOpen = false;
    this.isLoading = false;
    this.isMulti = false;
    this.isSearchable = false;
    this.disabled = false;
    
    // 数据
    this.options = [];
    this.groups = [];
  }

  /**
   * 获取默认配置
   * @private
   */
  _getDefaultOptions() {
    return {
      ...super._getDefaultOptions(),
      value: null,
      options: [],
      placeholder: '请选择',
      disabled: false,
      multiple: false,
      searchable: false,
      searchPlaceholder: '搜索选项...',
      loading: false,
      clearable: true,
      creatable: false,
      maxSelections: null,
      minSelections: 0,
      closeOnSelect: true,
      openOnFocus: true,
      autoSelectFirst: false,
      virtualScroll: false,
      maxHeight: '300px',
      width: 'auto',
      size: 'medium', // small, medium, large
      theme: 'default', // default, dark, neon
      showChevron: true,
      chevronIcon: '▼',
      closeIcon: '×',
      groupHeaderHeight: '30px',
      groupLabel: 'label',
      groupOptions: 'options',
      optionValue: 'value',
      optionLabel: 'label',
      optionDisabled: 'disabled',
      optionGrouped: false,
      highlightColor: '#007bff',
      selectedColor: '#007bff',
      zIndex: 1000,
      dropdownAnimation: true,
      animationDuration: 300,
      tagRemoveOnBackspace: true,
      tagMaxWidth: '120px',
      filterIgnoreCase: true,
      filterBy: null, // 自定义过滤函数
      filterMinLength: 0,
      appendTo: 'body',
      position: 'bottom-left', // bottom-left, bottom-right, top-left, top-right
      autoPosition: true,
      allowEmpty: true,
      showNoResults: true,
      noResultsText: '无匹配选项',
      loadingText: '加载中...',
      maxTags: 3,
      truncateTags: true,
      truncateTagsText: '+{count}',
      useGroups: false,
      groupSelectable: false,
      groupHeaderTemplate: null,
      optionTemplate: null,
      tagTemplate: null,
      inputClasses: '',
      inputStyle: {},
      onSelect: null,
      onRemove: null,
      onClear: null,
      onOpen: null,
      onClose: null,
      onSearch: null,
      onChange: null,
      onCreate: null,
      onFocus: null,
      onBlur: null,
      onLoad: null,
      onFilter: null,
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
      isOpen: false,
      selectedOptions: [],
      filteredOptions: this._flattenOptions(this.options),
      isLoading: this.options.loading,
      isMulti: this.options.multiple,
      isSearchable: this.options.searchable
    };
  }

  /**
   * 创建DOM元素
   * @private
   */
  _createElement() {
    // 创建主容器
    this.element = document.createElement('div');
    this.element.className = `jev-select jev-select-${this.options.theme} jev-select-${this.options.size}`;
    
    // 设置样式
    this.element.style.width = this.options.width;
    this.element.style.position = 'relative';
    
    // 配置状态
    this.isMulti = this.options.multiple;
    this.isSearchable = this.options.searchable;
    this.disabled = this.options.disabled;
    
    // 解析选项
    this._parseOptions(this.options.options);
    
    // 创建选择框
    this._createSelectBox();
    
    // 创建下拉菜单
    this._createDropdown();
    
    // 设置初始值
    if (this.options.value !== null) {
      this.setValue(this.options.value);
    }
    
    // 设置加载状态
    if (this.options.loading) {
      this.setLoading(true);
    }
  }

  /**
   * 创建选择框
   * @private
   */
  _createSelectBox() {
    const selectBox = document.createElement('div');
    selectBox.className = 'jev-select-box';
    selectBox.tabIndex = this.disabled ? -1 : 0;
    
    // 创建标签容器（多选模式）
    if (this.isMulti) {
      this.tagsContainer = document.createElement('div');
      this.tagsContainer.className = 'jev-select-tags';
      selectBox.appendChild(this.tagsContainer);
    }
    
    // 创建输入框/占位符容器
    const inputContainer = document.createElement('div');
    inputContainer.className = 'jev-select-input-container';
    
    // 创建占位符
    this.placeholderElement = document.createElement('span');
    this.placeholderElement.className = 'jev-select-placeholder';
    this.placeholderElement.textContent = this.options.placeholder;
    inputContainer.appendChild(this.placeholderElement);
    
    // 创建输入框
    if (this.isSearchable || this.isMulti) {
      this.inputElement = document.createElement('input');
      this.inputElement.type = 'text';
      this.inputElement.className = `jev-select-input ${this.options.inputClasses}`;
      this.inputElement.style.width = this.isMulti ? '100px' : '100%';
      this.inputElement.style.minWidth = '100px';
      this.inputElement.readOnly = !this.isSearchable && !this.isMulti;
      this.inputElement.disabled = this.disabled;
      
      if (this.isSearchable) {
        this.inputElement.placeholder = this.options.searchPlaceholder;
      } else {
        this.inputElement.placeholder = '';
      }
      
      // 应用自定义样式
      Object.assign(this.inputElement.style, this.options.inputStyle);
      
      inputContainer.appendChild(this.inputElement);
    }
    
    // 创建清除按钮
    if (this.options.clearable) {
      this.clearButton = document.createElement('button');
      this.clearButton.type = 'button';
      this.clearButton.className = 'jev-select-clear';
      this.clearButton.textContent = this.options.closeIcon;
      this.clearButton.style.display = 'none';
      inputContainer.appendChild(this.clearButton);
    }
    
    // 创建图标
    if (this.options.showChevron) {
      this.iconElement = document.createElement('span');
      this.iconElement.className = 'jev-select-chevron';
      this.iconElement.textContent = this.options.chevronIcon;
      inputContainer.appendChild(this.iconElement);
    }
    
    selectBox.appendChild(inputContainer);
    this.element.appendChild(selectBox);
  }

  /**
   * 创建下拉菜单
   * @private
   */
  _createDropdown() {
    // 创建下拉容器
    this.dropdownElement = document.createElement('div');
    this.dropdownElement.className = 'jev-select-dropdown';
    this.dropdownElement.style.display = 'none';
    this.dropdownElement.style.maxHeight = this.options.maxHeight;
    this.dropdownElement.style.zIndex = this.options.zIndex;
    
    // 添加到指定容器
    if (this.options.appendTo === 'body') {
      document.body.appendChild(this.dropdownElement);
    } else {
      this.element.appendChild(this.dropdownElement);
    }
    
    // 创建搜索框（如果支持搜索）
    if (this.isSearchable && !this.isMulti) {
      this.searchInput = document.createElement('input');
      this.searchInput.type = 'text';
      this.searchInput.className = 'jev-select-search';
      this.searchInput.placeholder = this.options.searchPlaceholder;
      this.dropdownElement.appendChild(this.searchInput);
    }
    
    // 创建选项容器
    this.optionsContainer = document.createElement('div');
    this.optionsContainer.className = 'jev-select-options';
    this.dropdownElement.appendChild(this.optionsContainer);
    
    // 创建无结果提示
    this.noResultsElement = document.createElement('div');
    this.noResultsElement.className = 'jev-select-no-results';
    this.noResultsElement.textContent = this.options.noResultsText;
    this.noResultsElement.style.display = 'none';
    this.dropdownElement.appendChild(this.noResultsElement);
    
    // 创建加载提示
    this.loadingElement = document.createElement('div');
    this.loadingElement.className = 'jev-select-loading';
    this.loadingElement.textContent = this.options.loadingText;
    this.loadingElement.style.display = 'none';
    this.dropdownElement.appendChild(this.loadingElement);
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
    
    // 渲染选项
    this._renderOptions();
    
    // 触发初始化回调
    if (typeof this.options.onInit === 'function') {
      try {
        this.options.onInit();
      } catch (error) {
        logger.error('下拉选择器初始化回调执行失败', error);
      }
    }
  }

  /**
   * 添加全局样式
   * @private
   */
  _addGlobalStyles() {
    const styleId = 'jev-select-styles';
    if (document.getElementById(styleId)) {
      return;
    }
    
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      /* 下拉选择器容器 */
      .jev-select {
        display: inline-block;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        position: relative;
        outline: none;
      }
      
      /* 选择框 */
      .jev-select-box {
        display: flex;
        align-items: center;
        background-color: #fff;
        border: 1px solid #e2e8f0;
        border-radius: 4px;
        padding: 8px 12px;
        cursor: pointer;
        transition: all 0.2s ease;
        user-select: none;
      }
      
      /* 标签容器 */
      .jev-select-tags {
        display: flex;
        flex-wrap: wrap;
        gap: 4px;
        flex: 1;
        align-items: center;
        min-height: 20px;
      }
      
      /* 标签样式 */
      .jev-select-tag {
        display: inline-flex;
        align-items: center;
        background-color: #007bff;
        color: white;
        padding: 2px 8px;
        border-radius: 12px;
        font-size: 12px;
        max-width: 120px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      
      /* 标签文本 */
      .jev-select-tag-label {
        margin-right: 4px;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      
      /* 标签移除按钮 */
      .jev-select-tag-remove {
        background: none;
        border: none;
        color: white;
        cursor: pointer;
        padding: 0;
        margin-left: 4px;
        font-size: 12px;
        line-height: 1;
        width: 14px;
        height: 14px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      /* 输入容器 */
      .jev-select-input-container {
        display: flex;
        align-items: center;
        flex: 1;
        min-width: 0;
      }
      
      /* 占位符 */
      .jev-select-placeholder {
        color: #94a3b8;
        font-size: 14px;
        pointer-events: none;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        position: absolute;
      }
      
      /* 输入框 */
      .jev-select-input {
        border: none;
        outline: none;
        background: transparent;
        font-size: 14px;
        color: #333;
        padding: 0;
        margin: 0;
        flex: 1;
        min-width: 0;
      }
      
      /* 清除按钮 */
      .jev-select-clear {
        background: none;
        border: none;
        color: #94a3b8;
        cursor: pointer;
        font-size: 16px;
        padding: 0;
        margin-left: 8px;
        line-height: 1;
        width: 20px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      /* 下拉箭头 */
      .jev-select-chevron {
        color: #64748b;
        margin-left: 8px;
        transition: transform 0.2s ease;
        pointer-events: none;
      }
      
      /* 下拉箭头打开状态 */
      .jev-select.open .jev-select-chevron {
        transform: rotate(180deg);
      }
      
      /* 下拉菜单 */
      .jev-select-dropdown {
        position: absolute;
        background-color: white;
        border: 1px solid #e2e8f0;
        border-radius: 6px;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
        overflow: hidden;
        min-width: 100%;
        max-height: 300px;
        overflow-y: auto;
      }
      
      /* 搜索输入框 */
      .jev-select-search {
        width: 100%;
        border: none;
        outline: none;
        padding: 8px 12px;
        border-bottom: 1px solid #e2e8f0;
        font-size: 14px;
      }
      
      /* 选项容器 */
      .jev-select-options {
        max-height: 250px;
        overflow-y: auto;
      }
      
      /* 选项组 */
      .jev-select-group {
        margin-bottom: 8px;
      }
      
      /* 选项组标题 */
      .jev-select-group-header {
        background-color: #f8fafc;
        padding: 8px 12px;
        font-weight: 600;
        font-size: 12px;
        color: #64748b;
        user-select: none;
        cursor: pointer;
        border-bottom: 1px solid #e2e8f0;
      }
      
      /* 选项 */
      .jev-select-option {
        padding: 10px 12px;
        cursor: pointer;
        user-select: none;
        transition: background-color 0.1s ease;
        border-bottom: 1px solid #f1f5f9;
        display: flex;
        align-items: center;
      }
      
      /* 选项悬停状态 */
      .jev-select-option:hover:not(.jev-select-option-disabled) {
        background-color: #f1f5f9;
      }
      
      /* 选项选中状态 */
      .jev-select-option.jev-select-option-selected {
        background-color: #e6f0ff;
        color: #007bff;
        font-weight: 500;
      }
      
      /* 选项禁用状态 */
      .jev-select-option.jev-select-option-disabled {
        color: #a0aec0;
        cursor: not-allowed;
        background-color: transparent;
      }
      
      /* 选项前的复选框 */
      .jev-select-option-checkbox {
        margin-right: 8px;
        width: 16px;
        height: 16px;
        border: 2px solid #cbd5e1;
        border-radius: 3px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }
      
      /* 复选框选中状态 */
      .jev-select-option-selected .jev-select-option-checkbox {
        background-color: #007bff;
        border-color: #007bff;
        color: white;
      }
      
      /* 无结果提示 */
      .jev-select-no-results {
        padding: 16px;
        text-align: center;
        color: #64748b;
        font-size: 14px;
      }
      
      /* 加载状态 */
      .jev-select-loading {
        padding: 16px;
        text-align: center;
        color: #64748b;
        font-size: 14px;
      }
      
      /* 加载动画 */
      .jev-select-loading::after {
        content: '';
        display: inline-block;
        width: 16px;
        height: 16px;
        margin-left: 8px;
        border: 2px solid #f3f3f3;
        border-top: 2px solid #3498db;
        border-radius: 50%;
        animation: jev-spin 1s linear infinite;
      }
      
      @keyframes jev-spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      
      /* 焦点状态 */
      .jev-select-box:focus {
        border-color: #007bff;
        box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
      }
      
      /* 禁用状态 */
      .jev-select-disabled .jev-select-box {
        background-color: #f8fafc;
        border-color: #e2e8f0;
        cursor: not-allowed;
        opacity: 0.6;
      }
      
      /* 截断标签提示 */
      .jev-select-tag-truncate {
        background-color: #64748b;
      }
      
      /* 主题样式 - 默认 */
      .jev-select-default .jev-select-box {
        border-color: #e2e8f0;
      }
      
      .jev-select-default .jev-select-box:focus {
        border-color: #007bff;
      }
      
      /* 主题样式 - 深色 */
      .jev-select-dark .jev-select-box {
        background-color: #2d3748;
        border-color: #4a5568;
        color: #e2e8f0;
      }
      
      .jev-select-dark .jev-select-input {
        color: #e2e8f0;
      }
      
      .jev-select-dark .jev-select-box:focus {
        border-color: #38b2ac;
        box-shadow: 0 0 0 2px rgba(56, 178, 172, 0.25);
      }
      
      .jev-select-dark .jev-select-dropdown {
        background-color: #2d3748;
        border-color: #4a5568;
      }
      
      .jev-select-dark .jev-select-option:hover:not(.jev-select-option-disabled) {
        background-color: #4a5568;
      }
      
      /* 主题样式 - 霓虹灯 */
      .jev-select-neon .jev-select-box {
        border-color: #00ff99;
        box-shadow: 0 0 5px rgba(0, 255, 153, 0.3);
        background-color: #0f172a;
        color: #00ff99;
      }
      
      .jev-select-neon .jev-select-input {
        color: #00ff99;
      }
      
      .jev-select-neon .jev-select-box:focus {
        border-color: #00ff99;
        box-shadow: 0 0 10px rgba(0, 255, 153, 0.5);
      }
      
      .jev-select-neon .jev-select-dropdown {
        background-color: #0f172a;
        border-color: #00ff99;
      }
      
      .jev-select-neon .jev-select-option:hover:not(.jev-select-option-disabled) {
        background-color: rgba(0, 255, 153, 0.1);
      }
      
      /* 尺寸样式 - 小 */
      .jev-select-small .jev-select-box {
        padding: 4px 8px;
      }
      
      .jev-select-small .jev-select-input {
        font-size: 12px;
      }
      
      .jev-select-small .jev-select-option {
        padding: 8px 10px;
        font-size: 12px;
      }
      
      /* 尺寸样式 - 中 */
      .jev-select-medium .jev-select-option {
        font-size: 14px;
      }
      
      /* 尺寸样式 - 大 */
      .jev-select-large .jev-select-box {
        padding: 12px 16px;
      }
      
      .jev-select-large .jev-select-input {
        font-size: 16px;
      }
      
      .jev-select-large .jev-select-option {
        padding: 12px 14px;
        font-size: 16px;
      }
      
      /* 动画效果 */
      .jev-select-dropdown {
        transition: opacity 0.3s ease, transform 0.3s ease;
      }
      
      .jev-select-dropdown-enter {
        opacity: 0;
        transform: translateY(-10px);
      }
      
      .jev-select-dropdown-enter-active {
        opacity: 1;
        transform: translateY(0);
      }
      
      .jev-select-dropdown-leave {
        opacity: 1;
        transform: translateY(0);
      }
      
      .jev-select-dropdown-leave-active {
        opacity: 0;
        transform: translateY(-10px);
      }
      
      /* 响应式设计 */
      @media (max-width: 768px) {
        .jev-select-dropdown {
          position: fixed !important;
          top: 50% !important;
          left: 50% !important;
          transform: translate(-50%, -50%) !important;
          width: 90% !important;
          max-width: 320px;
          max-height: 70vh;
          z-index: 1001 !important;
        }
      }
      
      /* 无障碍支持 */
      .jev-select-box:focus-visible {
        outline: 2px solid #007bff;
        outline-offset: 2px;
      }
      
      /* 减少动画偏好 */
      @media (prefers-reduced-motion: reduce) {
        .jev-select-dropdown {
          transition: none !important;
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
    const selectBox = this.element.querySelector('.jev-select-box');
    
    // 点击选择框
    selectBox.addEventListener('click', this._handleBoxClick.bind(this));
    
    // 选择框键盘事件
    selectBox.addEventListener('keydown', this._handleKeyDown.bind(this));
    
    // 输入框事件
    if (this.inputElement) {
      this.inputElement.addEventListener('input', this._handleInput.bind(this));
      this.inputElement.addEventListener('keydown', this._handleInputKeyDown.bind(this));
    }
    
    // 搜索框事件
    if (this.searchInput) {
      this.searchInput.addEventListener('input', this._handleSearch.bind(this));
      this.searchInput.addEventListener('keydown', this._handleSearchKeyDown.bind(this));
    }
    
    // 清除按钮事件
    if (this.clearButton) {
      this.clearButton.addEventListener('click', this._handleClear.bind(this));
    }
    
    // 点击外部关闭
    document.addEventListener('click', this._handleClickOutside.bind(this));
    
    // 窗口大小变化
    window.addEventListener('resize', this._handleResize.bind(this));
    
    // ESC键关闭
    document.addEventListener('keydown', this._handleEscapeKey.bind(this));
  }

  /**
   * 处理选择框点击
   * @private
   */
  _handleBoxClick(e) {
    // 阻止冒泡，避免立即关闭
    e.stopPropagation();
    
    if (this.disabled) return;
    
    // 切换下拉菜单
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  /**
   * 处理键盘事件
   * @private
   */
  _handleKeyDown(e) {
    if (this.disabled) return;
    
    // 空格或回车打开下拉菜单
    if ((e.key === ' ' || e.key === 'Enter') && !this.isOpen) {
      e.preventDefault();
      this.open();
      return;
    }
    
    // 键盘导航
    if (this.isOpen) {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          this._navigateOptions(1);
          break;
        case 'ArrowUp':
          e.preventDefault();
          this._navigateOptions(-1);
          break;
        case 'Enter':
          e.preventDefault();
          this._selectHighlightedOption();
          break;
        case 'Escape':
          e.preventDefault();
          this.close();
          break;
      }
    }
  }

  /**
   * 处理输入事件
   * @private
   */
  _handleInput(e) {
    const value = e.target.value.trim();
    
    // 处理创建新选项
    if (this.options.creatable && value && !this._findOptionByLabel(value)) {
      // 触发创建回调
      if (typeof this.options.onCreate === 'function') {
        try {
          this.options.onCreate(value);
        } catch (error) {
          logger.error('创建选项回调执行失败', error);
        }
      }
    }
    
    // 触发搜索回调
    if (typeof this.options.onSearch === 'function') {
      try {
        this.options.onSearch(value);
      } catch (error) {
        logger.error('搜索回调执行失败', error);
      }
    }
  }

  /**
   * 处理输入框键盘事件
   * @private
   */
  _handleInputKeyDown(e) {
    // 处理删除键删除标签
    if (this.isMulti && e.key === 'Backspace' && this.options.tagRemoveOnBackspace) {
      const input = e.target;
      if (!input.value && this.selectedOptions.length > 0) {
        e.preventDefault();
        this._removeLastTag();
      }
    }
  }

  /**
   * 处理搜索事件
   * @private
   */
  _handleSearch(e) {
    const value = e.target.value.trim();
    
    // 过滤选项
    this._filterOptions(value);
    
    // 触发搜索回调
    if (typeof this.options.onSearch === 'function') {
      try {
        this.options.onSearch(value);
      } catch (error) {
        logger.error('搜索回调执行失败', error);
      }
    }
  }

  /**
   * 处理搜索框键盘事件
   * @private
   */
  _handleSearchKeyDown(e) {
    // 复用选择框键盘导航逻辑
    this._handleKeyDown(e);
  }

  /**
   * 处理清除按钮点击
   * @private
   */
  _handleClear(e) {
    e.stopPropagation();
    this.clear();
  }

  /**
   * 处理点击外部关闭
   * @private
   */
  _handleClickOutside(e) {
    // 检查是否点击在组件内部
    if (!this.element.contains(e.target) && 
        !this.dropdownElement.contains(e.target)) {
      this.close();
    }
  }

  /**
   * 处理窗口大小变化
   * @private
   */
  _handleResize() {
    if (this.isOpen && this.options.autoPosition) {
      this._positionDropdown();
    }
  }

  /**
   * 处理ESC键关闭
   * @private
   */
  _handleEscapeKey(e) {
    if (e.key === 'Escape' && this.isOpen) {
      this.close();
    }
  }

  /**
   * 导航选项
   * @private
   */
  _navigateOptions(direction) {
    const options = this.optionsContainer.querySelectorAll('.jev-select-option:not(.jev-select-option-disabled)');
    if (options.length === 0) return;
    
    // 找到当前高亮选项
    let currentIndex = -1;
    options.forEach((option, index) => {
      if (option.classList.contains('jev-select-option-highlighted')) {
        currentIndex = index;
      }
    });
    
    // 计算下一个索引
    let nextIndex = currentIndex + direction;
    if (nextIndex < 0) nextIndex = options.length - 1;
    if (nextIndex >= options.length) nextIndex = 0;
    
    // 移除所有高亮
    options.forEach(option => option.classList.remove('jev-select-option-highlighted'));
    
    // 添加新高亮
    const nextOption = options[nextIndex];
    nextOption.classList.add('jev-select-option-highlighted');
    
    // 滚动到可视区域
    this._scrollToOption(nextOption);
  }

  /**
   * 选择高亮选项
   * @private
   */
  _selectHighlightedOption() {
    const highlighted = this.optionsContainer.querySelector('.jev-select-option-highlighted');
    if (highlighted) {
      const value = highlighted.getAttribute('data-value');
      if (value !== null) {
        this._selectOptionByValue(value);
      }
    }
  }

  /**
   * 滚动到选项
   * @private
   */
  _scrollToOption(option) {
    const container = this.optionsContainer;
    const optionTop = option.offsetTop;
    const optionBottom = optionTop + option.offsetHeight;
    const containerScrollTop = container.scrollTop;
    const containerHeight = container.clientHeight;
    
    // 向上滚动
    if (optionTop < containerScrollTop) {
      container.scrollTop = optionTop - 10;
    }
    // 向下滚动
    else if (optionBottom > containerScrollTop + containerHeight) {
      container.scrollTop = optionBottom - containerHeight + 10;
    }
  }

  /**
   * 解析选项
   * @private
   */
  _parseOptions(options) {
    this.options = [];
    this.groups = [];
    
    if (!Array.isArray(options)) return;
    
    options.forEach(item => {
      if (item[this.options.groupOptions] && Array.isArray(item[this.options.groupOptions])) {
        // 分组选项
        const group = {
          label: item[this.options.groupLabel] || '未命名组',
          options: [],
          disabled: !!item[this.options.optionDisabled]
        };
        
        item[this.options.groupOptions].forEach(opt => {
          group.options.push(this._normalizeOption(opt));
        });
        
        this.groups.push(group);
        
        // 同时添加到扁平选项列表
        group.options.forEach(opt => this.options.push({
          ...opt,
          group: group.label
        }));
      } else {
        // 普通选项
        this.options.push(this._normalizeOption(item));
      }
    });
    
    // 初始化过滤选项
    this.filteredOptions = [...this.options];
  }

  /**
   * 标准化选项
   * @private
   */
  _normalizeOption(option) {
    if (typeof option === 'string') {
      return {
        value: option,
        label: option,
        disabled: false
      };
    }
    
    return {
      value: option[this.options.optionValue] !== undefined ? option[this.options.optionValue] : option.value,
      label: option[this.options.optionLabel] !== undefined ? option[this.options.optionLabel] : option.label || String(option.value),
      disabled: !!option[this.options.optionDisabled] || !!option.disabled,
      data: option
    };
  }

  /**
   * 扁平化选项
   * @private
   */
  _flattenOptions(options) {
    const flattened = [];
    
    if (!Array.isArray(options)) return flattened;
    
    options.forEach(item => {
      if (item[this.options.groupOptions]) {
        // 递归扁平化分组选项
        flattened.push(...this._flattenOptions(item[this.options.groupOptions]));
      } else {
        flattened.push(this._normalizeOption(item));
      }
    });
    
    return flattened;
  }

  /**
   * 渲染选项
   * @private
   */
  _renderOptions() {
    this.optionsContainer.innerHTML = '';
    
    // 显示加载状态
    if (this.isLoading) {
      this.loadingElement.style.display = 'block';
      this.noResultsElement.style.display = 'none';
      return;
    }
    
    this.loadingElement.style.display = 'none';
    
    // 检查是否有选项
    if (this.filteredOptions.length === 0) {
      this.noResultsElement.style.display = 'block';
      return;
    }
    
    this.noResultsElement.style.display = 'none';
    
    // 渲染分组或普通选项
    if (this.groups.length > 0 && this.options.useGroups) {
      this._renderGroups();
    } else {
      this._renderFlatOptions();
    }
    
    // 自动选择第一个选项
    if (this.options.autoSelectFirst && this.filteredOptions.length > 0) {
      const firstOption = this.optionsContainer.querySelector('.jev-select-option:not(.jev-select-option-disabled)');
      if (firstOption) {
        firstOption.classList.add('jev-select-option-highlighted');
      }
    }
  }

  /**
   * 渲染分组选项
   * @private
   */
  _renderGroups() {
    this.groups.forEach(group => {
      // 创建组容器
      const groupElement = document.createElement('div');
      groupElement.className = 'jev-select-group';
      
      // 创建组标题
      const headerElement = document.createElement('div');
      headerElement.className = 'jev-select-group-header';
      headerElement.textContent = group.label;
      
      // 应用组标题模板
      if (typeof this.options.groupHeaderTemplate === 'function') {
        try {
          const customContent = this.options.groupHeaderTemplate(group);
          if (customContent) {
            headerElement.innerHTML = '';
            if (typeof customContent === 'string') {
              headerElement.innerHTML = customContent;
            } else if (customContent instanceof Node) {
              headerElement.appendChild(customContent);
            }
          }
        } catch (error) {
          logger.error('组标题模板执行失败', error);
        }
      }
      
      groupElement.appendChild(headerElement);
      
      // 渲染组内选项
      group.options.forEach(option => {
        // 只渲染过滤后的选项
        if (this._isOptionFiltered(option)) {
          const optionElement = this._createOptionElement(option);
          if (optionElement) {
            groupElement.appendChild(optionElement);
          }
        }
      });
      
      // 只有当组内有选项时才添加
      const optionElements = groupElement.querySelectorAll('.jev-select-option');
      if (optionElements.length > 0) {
        this.optionsContainer.appendChild(groupElement);
      }
    });
  }

  /**
   * 渲染扁平选项
   * @private
   */
  _renderFlatOptions() {
    this.filteredOptions.forEach(option => {
      const optionElement = this._createOptionElement(option);
      if (optionElement) {
        this.optionsContainer.appendChild(optionElement);
      }
    });
  }

  /**
   * 创建选项元素
   * @private
   */
  _createOptionElement(option) {
    const optionElement = document.createElement('div');
    optionElement.className = 'jev-select-option';
    optionElement.setAttribute('data-value', option.value);
    
    // 设置禁用状态
    if (option.disabled) {
      optionElement.classList.add('jev-select-option-disabled');
    }
    
    // 设置选中状态
    if (this._isOptionSelected(option)) {
      optionElement.classList.add('jev-select-option-selected');
    }
    
    // 多选模式添加复选框
    if (this.isMulti) {
      const checkbox = document.createElement('div');
      checkbox.className = 'jev-select-option-checkbox';
      
      if (this._isOptionSelected(option)) {
        checkbox.textContent = '✓';
      }
      
      optionElement.appendChild(checkbox);
    }
    
    // 创建标签文本
    const labelElement = document.createElement('span');
    labelElement.className = 'jev-select-option-label';
    labelElement.textContent = option.label;
    optionElement.appendChild(labelElement);
    
    // 应用选项模板
    if (typeof this.options.optionTemplate === 'function') {
      try {
        const customContent = this.options.optionTemplate(option);
        if (customContent) {
          optionElement.innerHTML = '';
          if (typeof customContent === 'string') {
            optionElement.innerHTML = customContent;
          } else if (customContent instanceof Node) {
            optionElement.appendChild(customContent);
          }
        }
      } catch (error) {
        logger.error('选项模板执行失败', error);
      }
    }
    
    // 添加点击事件
    optionElement.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!option.disabled) {
        this._selectOptionByValue(option.value);
      }
    });
    
    return optionElement;
  }

  /**
   * 过滤选项
   * @private
   */
  _filterOptions(searchTerm) {
    if (!searchTerm || searchTerm.length < this.options.filterMinLength) {
      this.filteredOptions = [...this.options];
      this._renderOptions();
      return;
    }
    
    // 使用自定义过滤函数
    if (typeof this.options.filterBy === 'function') {
      try {
        this.filteredOptions = this.options.filter(option => 
          this.options.filterBy(option, searchTerm)
        );
      } catch (error) {
        logger.error('过滤函数执行失败', error);
        this.filteredOptions = [...this.options];
      }
    } else {
      // 默认过滤逻辑
      const term = this.options.filterIgnoreCase ? 
        searchTerm.toLowerCase() : searchTerm;
      
      this.filteredOptions = this.options.filter(option => {
        const label = this.options.filterIgnoreCase ? 
          option.label.toLowerCase() : option.label;
        const value = this.options.filterIgnoreCase ? 
          String(option.value).toLowerCase() : String(option.value);
        
        return label.includes(term) || value.includes(term);
      });
    }
    
    // 触发过滤回调
    if (typeof this.options.onFilter === 'function') {
      try {
        this.options.onFilter(this.filteredOptions, searchTerm);
      } catch (error) {
        logger.error('过滤回调执行失败', error);
      }
    }
    
    this._renderOptions();
  }

  /**
   * 检查选项是否被过滤
   * @private
   */
  _isOptionFiltered(option) {
    return this.filteredOptions.some(opt => opt.value === option.value);
  }

  /**
   * 检查选项是否被选中
   * @private
   */
  _isOptionSelected(option) {
    return this.selectedOptions.some(selected => selected.value === option.value);
  }

  /**
   * 通过值选择选项
   * @private
   */
  _selectOptionByValue(value) {
    const option = this.options.find(opt => opt.value === value);
    if (!option || option.disabled) return;
    
    // 单选模式
    if (!this.isMulti) {
      this.selectedOptions = [option];
      this._updateSelectBox();
      
      // 触发回调
      this._triggerSelectCallbacks(option);
      
      // 自动关闭
      if (this.options.closeOnSelect) {
        this.close();
      }
    } else {
      // 多选模式
      const index = this.selectedOptions.findIndex(opt => opt.value === value);
      
      if (index === -1) {
        // 检查最大选择数量
        if (this.options.maxSelections && 
            this.selectedOptions.length >= this.options.maxSelections) {
          return;
        }
        
        // 添加选项
        this.selectedOptions.push(option);
      } else {
        // 移除选项
        this.selectedOptions.splice(index, 1);
      }
      
      this._updateSelectBox();
      this._updateOptionsSelection();
      
      // 触发回调
      if (index === -1) {
        this._triggerSelectCallbacks(option);
      } else {
        this._triggerRemoveCallbacks(option);
      }
    }
  }

  /**
   * 更新选择框显示
   * @private
   */
  _updateSelectBox() {
    // 更新占位符显示
    if (this.placeholderElement) {
      this.placeholderElement.style.display = this.selectedOptions.length > 0 ? 'none' : 'block';
    }
    
    // 更新清除按钮显示
    if (this.clearButton) {
      this.clearButton.style.display = this.selectedOptions.length > 0 ? 'flex' : 'none';
    }
    
    // 单选模式更新输入框
    if (!this.isMulti && this.inputElement) {
      this.inputElement.value = this.selectedOptions.length > 0 ? 
        this.selectedOptions[0].label : '';
    }
    
    // 多选模式更新标签
    if (this.isMulti && this.tagsContainer) {
      this._renderTags();
    }
    
    // 触发change回调
    if (typeof this.options.onChange === 'function') {
      try {
        this.options.onChange(this.getValue());
      } catch (error) {
        logger.error('变化回调执行失败', error);
      }
    }
  }

  /**
   * 渲染标签（多选模式）
   * @private
   */
  _renderTags() {
    this.tagsContainer.innerHTML = '';
    
    // 处理截断标签
    let visibleTags = this.selectedOptions;
    let truncateCount = 0;
    
    if (this.options.truncateTags && 
        this.options.maxTags && 
        this.selectedOptions.length > this.options.maxTags) {
      visibleTags = this.selectedOptions.slice(0, this.options.maxTags);
      truncateCount = this.selectedOptions.length - this.options.maxTags;
    }
    
    // 渲染可见标签
    visibleTags.forEach(option => {
      const tagElement = this._createTagElement(option);
      this.tagsContainer.appendChild(tagElement);
    });
    
    // 渲染截断标签
    if (truncateCount > 0) {
      const truncateTag = document.createElement('div');
      truncateTag.className = 'jev-select-tag jev-select-tag-truncate';
      truncateTag.textContent = this.options.truncateTagsText.replace('{count}', truncateCount);
      this.tagsContainer.appendChild(truncateTag);
    }
    
    // 调整输入框宽度
    if (this.inputElement) {
      this.inputElement.style.width = visibleTags.length > 0 ? '100px' : '100%';
    }
  }

  /**
   * 创建标签元素
   * @private
   */
  _createTagElement(option) {
    const tagElement = document.createElement('div');
    tagElement.className = 'jev-select-tag';
    tagElement.style.maxWidth = this.options.tagMaxWidth;
    
    // 应用标签模板
    if (typeof this.options.tagTemplate === 'function') {
      try {
        const customContent = this.options.tagTemplate(option);
        if (customContent) {
          if (typeof customContent === 'string') {
            tagElement.innerHTML = customContent;
          } else if (customContent instanceof Node) {
            tagElement.appendChild(customContent);
          }
          return tagElement;
        }
      } catch (error) {
        logger.error('标签模板执行失败', error);
      }
    }
    
    // 默认标签结构
    const labelElement = document.createElement('span');
    labelElement.className = 'jev-select-tag-label';
    labelElement.textContent = option.label;
    
    const removeButton = document.createElement('button');
    removeButton.type = 'button';
    removeButton.className = 'jev-select-tag-remove';
    removeButton.textContent = this.options.closeIcon;
    
    // 添加移除事件
    removeButton.addEventListener('click', (e) => {
      e.stopPropagation();
      this._removeOptionByValue(option.value);
    });
    
    tagElement.appendChild(labelElement);
    tagElement.appendChild(removeButton);
    
    return tagElement;
  }

  /**
   * 更新选项选中状态
   * @private
   */
  _updateOptionsSelection() {
    const options = this.optionsContainer.querySelectorAll('.jev-select-option');
    
    options.forEach(optionElement => {
      const value = optionElement.getAttribute('data-value');
      const isSelected = this.selectedOptions.some(opt => opt.value === value);
      
      if (isSelected) {
        optionElement.classList.add('jev-select-option-selected');
        
        // 更新复选框
        const checkbox = optionElement.querySelector('.jev-select-option-checkbox');
        if (checkbox) {
          checkbox.textContent = '✓';
        }
      } else {
        optionElement.classList.remove('jev-select-option-selected');
        
        // 更新复选框
        const checkbox = optionElement.querySelector('.jev-select-option-checkbox');
        if (checkbox) {
          checkbox.textContent = '';
        }
      }
    });
  }

  /**
   * 移除选项
   * @private
   */
  _removeOptionByValue(value) {
    const index = this.selectedOptions.findIndex(opt => opt.value === value);
    if (index !== -1) {
      const removedOption = this.selectedOptions[index];
      this.selectedOptions.splice(index, 1);
      
      this._updateSelectBox();
      this._updateOptionsSelection();
      
      // 触发移除回调
      this._triggerRemoveCallbacks(removedOption);
    }
  }

  /**
   * 移除最后一个标签
   * @private
   */
  _removeLastTag() {
    if (this.selectedOptions.length > 0) {
      const lastOption = this.selectedOptions[this.selectedOptions.length - 1];
      this._removeOptionByValue(lastOption.value);
    }
  }

  /**
   * 触发选择回调
   * @private
   */
  _triggerSelectCallbacks(option) {
    if (typeof this.options.onSelect === 'function') {
      try {
        this.options.onSelect(option, this);
      } catch (error) {
        logger.error('选择回调执行失败', error);
      }
    }
  }

  /**
   * 触发移除回调
   * @private
   */
  _triggerRemoveCallbacks(option) {
    if (typeof this.options.onRemove === 'function') {
      try {
        this.options.onRemove(option, this);
      } catch (error) {
        logger.error('移除回调执行失败', error);
      }
    }
  }

  /**
   * 定位下拉菜单
   * @private
   */
  _positionDropdown() {
    if (!this.dropdownElement || !this.element) return;
    
    const rect = this.element.getBoundingClientRect();
    const dropdownStyle = this.dropdownElement.style;
    
    // 重置样式
    dropdownStyle.left = 'auto';
    dropdownStyle.right = 'auto';
    dropdownStyle.top = 'auto';
    dropdownStyle.bottom = 'auto';
    
    // 如果appendTo不是body，使用相对定位
    if (this.options.appendTo !== 'body') {
      dropdownStyle.position = 'absolute';
    } else {
      dropdownStyle.position = 'fixed';
    }
    
    // 获取视口大小
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // 获取下拉菜单大小
    const dropdownRect = this.dropdownElement.getBoundingClientRect();
    
    // 计算位置
    let position = this.options.position;
    
    // 自动定位逻辑
    if (this.options.autoPosition) {
      const availableSpaceBottom = viewportHeight - rect.bottom - 10;
      const availableSpaceTop = rect.top - 10;
      const availableSpaceRight = viewportWidth - rect.right - 10;
      const availableSpaceLeft = rect.left - 10;
      
      // 优先向下定位
      const direction = availableSpaceBottom >= dropdownRect.height ? 'bottom' : 'top';
      
      // 左右位置
      const side = availableSpaceRight >= dropdownRect.width ? 'left' : 'right';
      
      position = `${direction}-${side}`;
    }
    
    // 应用位置
    if (this.options.appendTo === 'body') {
      switch (position) {
        case 'bottom-left':
          dropdownStyle.left = `${rect.left}px`;
          dropdownStyle.top = `${rect.bottom + 5}px`;
          break;
        case 'bottom-right':
          dropdownStyle.left = `${rect.right - dropdownRect.width}px`;
          dropdownStyle.top = `${rect.bottom + 5}px`;
          break;
        case 'top-left':
          dropdownStyle.left = `${rect.left}px`;
          dropdownStyle.top = `${rect.top - dropdownRect.height - 5}px`;
          break;
        case 'top-right':
          dropdownStyle.left = `${rect.right - dropdownRect.width}px`;
          dropdownStyle.top = `${rect.top - dropdownRect.height - 5}px`;
          break;
      }
    } else {
      switch (position) {
        case 'bottom-left':
          dropdownStyle.left = '0';
          dropdownStyle.top = `${rect.height + 5}px`;
          break;
        case 'bottom-right':
          dropdownStyle.right = '0';
          dropdownStyle.top = `${rect.height + 5}px`;
          break;
        case 'top-left':
          dropdownStyle.left = '0';
          dropdownStyle.bottom = `${rect.height + 5}px`;
          break;
        case 'top-right':
          dropdownStyle.right = '0';
          dropdownStyle.bottom = `${rect.height + 5}px`;
          break;
      }
    }
  }

  /**
   * 打开下拉菜单
   */
  open() {
    if (this.isOpen || this.disabled) return;
    
    // 显示下拉菜单
    this.dropdownElement.style.display = 'block';
    
    // 定位下拉菜单
    this._positionDropdown();
    
    // 添加动画类
    if (this.options.dropdownAnimation) {
      this.dropdownElement.classList.add('jev-select-dropdown-enter');
      setTimeout(() => {
        this.dropdownElement.classList.remove('jev-select-dropdown-enter');
        this.dropdownElement.classList.add('jev-select-dropdown-enter-active');
      }, 10);
    }
    
    // 添加打开状态类
    this.element.classList.add('open');
    
    // 更新状态
    this.isOpen = true;
    this.updateState({ isOpen: true });
    
    // 聚焦输入框
    if (this.searchInput) {
      this.searchInput.focus();
      this.searchInput.select();
    } else if (this.inputElement) {
      this.inputElement.focus();
    }
    
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
  close() {
    if (!this.isOpen) return;
    
    // 动画关闭
    if (this.options.dropdownAnimation) {
      this.dropdownElement.classList.add('jev-select-dropdown-leave-active');
      setTimeout(() => {
        this._hideDropdown();
      }, this.options.animationDuration);
    } else {
      this._hideDropdown();
    }
    
    // 移除动画类
    setTimeout(() => {
      this.dropdownElement.classList.remove('jev-select-dropdown-enter-active');
      this.dropdownElement.classList.remove('jev-select-dropdown-leave-active');
    }, this.options.animationDuration + 10);
  }

  /**
   * 隐藏下拉菜单（内部方法）
   * @private
   */
  _hideDropdown() {
    this.dropdownElement.style.display = 'none';
    this.element.classList.remove('open');
    
    // 移除高亮状态
    const highlighted = this.optionsContainer.querySelectorAll('.jev-select-option-highlighted');
    highlighted.forEach(option => option.classList.remove('jev-select-option-highlighted'));
    
    // 清空搜索
    if (this.searchInput) {
      this.searchInput.value = '';
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
   * 设置值
   * @param {*} value - 选择值
   */
  setValue(value) {
    try {
      this.selectedOptions = [];
      
      if (this.isMulti) {
        // 多选模式
        if (Array.isArray(value)) {
          value.forEach(val => {
            const option = this._findOptionByValue(val);
            if (option && !option.disabled) {
              this.selectedOptions.push(option);
            }
          });
        }
      } else {
        // 单选模式
        if (value !== null && value !== undefined) {
          const option = this._findOptionByValue(value);
          if (option && !option.disabled) {
            this.selectedOptions = [option];
          }
        }
      }
      
      // 更新UI
      this._updateSelectBox();
      this._updateOptionsSelection();
      
      return this;
    } catch (error) {
      logger.error('设置值失败', error);
      return this;
    }
  }

  /**
   * 获取值
   * @returns {*} 选择值
   */
  getValue() {
    if (this.isMulti) {
      return this.selectedOptions.map(opt => opt.value);
    } else {
      return this.selectedOptions.length > 0 ? this.selectedOptions[0].value : null;
    }
  }

  /**
   * 获取选中选项对象
   * @returns {Array|Object|null} 选中的选项
   */
  getSelectedOptions() {
    if (this.isMulti) {
      return [...this.selectedOptions];
    } else {
      return this.selectedOptions.length > 0 ? this.selectedOptions[0] : null;
    }
  }

  /**
   * 设置选项
   * @param {Array} options - 选项数组
   */
  setOptions(options) {
    // 保存当前选择的值
    const currentValue = this.getValue();
    
    // 重新解析选项
    this._parseOptions(options);
    this.filteredOptions = [...this.options];
    
    // 重新渲染选项
    this._renderOptions();
    
    // 重新设置值
    this.setValue(currentValue);
    
    // 触发加载回调
    if (typeof this.options.onLoad === 'function') {
      try {
        this.options.onLoad(options);
      } catch (error) {
        logger.error('加载回调执行失败', error);
      }
    }
    
    return this;
  }

  /**
   * 添加选项
   * @param {Array|Object} options - 要添加的选项
   */
  addOptions(options) {
    const newOptions = Array.isArray(options) ? options : [options];
    
    // 添加到现有选项
    newOptions.forEach(option => {
      const normalized = this._normalizeOption(option);
      // 检查是否已存在
      if (!this._findOptionByValue(normalized.value)) {
        this.options.push(normalized);
        this.filteredOptions.push(normalized);
      }
    });
    
    // 重新渲染
    this._renderOptions();
    
    return this;
  }

  /**
   * 移除选项
   * @param {*} value - 要移除的选项值
   */
  removeOption(value) {
    const index = this.options.findIndex(opt => opt.value === value);
    if (index !== -1) {
      // 移除选项
      this.options.splice(index, 1);
      
      // 移除过滤选项
      const filteredIndex = this.filteredOptions.findIndex(opt => opt.value === value);
      if (filteredIndex !== -1) {
        this.filteredOptions.splice(filteredIndex, 1);
      }
      
      // 移除已选项
      this._removeOptionByValue(value);
      
      // 重新渲染
      this._renderOptions();
    }
    
    return this;
  }

  /**
   * 清空选项
   */
  clearOptions() {
    this.options = [];
    this.filteredOptions = [];
    this.groups = [];
    this.selectedOptions = [];
    
    // 重新渲染
    this._renderOptions();
    this._updateSelectBox();
    
    return this;
  }

  /**
   * 清除选择
   */
  clear() {
    this.selectedOptions = [];
    
    // 更新UI
    this._updateSelectBox();
    this._updateOptionsSelection();
    
    // 触发清除回调
    if (typeof this.options.onClear === 'function') {
      try {
        this.options.onClear();
      } catch (error) {
        logger.error('清除回调执行失败', error);
      }
    }
    
    // 触发change回调
    if (typeof this.options.onChange === 'function') {
      try {
        this.options.onChange(this.getValue());
      } catch (error) {
        logger.error('变化回调执行失败', error);
      }
    }
    
    return this;
  }

  /**
   * 设置禁用状态
   * @param {boolean} disabled - 是否禁用
   */
  setDisabled(disabled) {
    this.disabled = !!disabled;
    
    // 更新样式
    if (disabled) {
      this.element.classList.add('jev-select-disabled');
    } else {
      this.element.classList.remove('jev-select-disabled');
    }
    
    // 更新输入框
    if (this.inputElement) {
      this.inputElement.disabled = disabled;
    }
    
    if (this.searchInput) {
      this.searchInput.disabled = disabled;
    }
    
    // 更新选择框
    const selectBox = this.element.querySelector('.jev-select-box');
    if (selectBox) {
      selectBox.tabIndex = disabled ? -1 : 0;
    }
    
    // 更新状态
    this.updateState({ disabled });
    
    // 如果禁用，关闭下拉菜单
    if (disabled && this.isOpen) {
      this.close();
    }
    
    return this;
  }

  /**
   * 设置加载状态
   * @param {boolean} loading - 是否加载中
   */
  setLoading(loading) {
    this.isLoading = !!loading;
    this._renderOptions();
    
    // 更新状态
    this.updateState({ isLoading: loading });
    
    return this;
  }

  /**
   * 设置主题
   * @param {string} theme - 主题
   */
  setTheme(theme) {
    this.element.classList.remove(`jev-select-${this.options.theme}`);
    this.element.classList.add(`jev-select-${theme}`);
    this.options.theme = theme;
    
    return this;
  }

  /**
   * 设置大小
   * @param {string} size - 大小
   */
  setSize(size) {
    this.element.classList.remove(`jev-select-${this.options.size}`);
    this.element.classList.add(`jev-select-${size}`);
    this.options.size = size;
    
    return this;
  }

  /**
   * 根据值查找选项
   * @private
   */
  _findOptionByValue(value) {
    return this.options.find(opt => opt.value === value);
  }

  /**
   * 根据标签查找选项
   * @private
   */
  _findOptionByLabel(label) {
    return this.options.find(opt => opt.label === label);
  }

  /**
   * 刷新组件
   */
  refresh() {
    // 重新定位
    if (this.isOpen) {
      this._positionDropdown();
    }
    
    // 重新渲染
    this._renderOptions();
    this._updateSelectBox();
    
    return this;
  }

  /**
   * 获取下拉菜单元素
   * @returns {HTMLElement} 下拉菜单元素
   */
  getDropdown() {
    return this.dropdownElement;
  }

  /**
   * 获取输入框元素
   * @returns {HTMLElement|null} 输入框元素
   */
  getInput() {
    return this.inputElement;
  }

  /**
   * 获取选中的标签元素
   * @returns {NodeList|null} 标签元素列表
   */
  getTags() {
    return this.tagsContainer ? this.tagsContainer.querySelectorAll('.jev-select-tag') : null;
  }

  /**
   * 切换多选模式
   * @param {boolean} multiple - 是否多选
   */
  setMultiple(multiple) {
    if (this.isMulti !== multiple) {
      this.isMulti = multiple;
      this.options.multiple = multiple;
      
      // 清除选择
      this.selectedOptions = [];
      
      // 重新创建UI
      this._createElement();
      this._applyStyles();
    }
    
    return this;
  }

  /**
   * 切换搜索功能
   * @param {boolean} searchable - 是否可搜索
   */
  setSearchable(searchable) {
    if (this.isSearchable !== searchable) {
      this.isSearchable = searchable;
      this.options.searchable = searchable;
      
      // 重新创建UI
      this._createElement();
      this._applyStyles();
    }
    
    return this;
  }

  /**
   * 设置最大选择数量
   * @param {number} max - 最大数量
   */
  setMaxSelections(max) {
    this.options.maxSelections = max;
    
    // 如果超过限制，移除多余选项
    if (max !== null && this.selectedOptions.length > max) {
      this.selectedOptions = this.selectedOptions.slice(0, max);
      this._updateSelectBox();
      this._updateOptionsSelection();
    }
    
    return this;
  }

  /**
   * 设置最大高度
   * @param {string} height - 最大高度
   */
  setMaxHeight(height) {
    this.options.maxHeight = height;
    if (this.dropdownElement) {
      this.dropdownElement.style.maxHeight = height;
    }
    
    return this;
  }

  /**
   * 检查是否打开
   * @returns {boolean} 是否打开
   */
  isDropdownOpen() {
    return this.isOpen;
  }

  /**
   * 检查是否禁用
   * @returns {boolean} 是否禁用
   */
  isDisabled() {
    return this.disabled;
  }

  /**
   * 检查是否多选
   * @returns {boolean} 是否多选
   */
  isMultiple() {
    return this.isMulti;
  }

  /**
   * 检查是否可搜索
   * @returns {boolean} 是否可搜索
   */
  isSearchable() {
    return this.isSearchable;
  }

  /**
   * 销毁组件
   */
  destroy() {
    // 解绑事件
    if (this.element) {
      const selectBox = this.element.querySelector('.jev-select-box');
      if (selectBox) {
        selectBox.removeEventListener('click', this._handleBoxClick);
        selectBox.removeEventListener('keydown', this._handleKeyDown);
      }
    }
    
    if (this.inputElement) {
      this.inputElement.removeEventListener('input', this._handleInput);
      this.inputElement.removeEventListener('keydown', this._handleInputKeyDown);
    }
    
    if (this.searchInput) {
      this.searchInput.removeEventListener('input', this._handleSearch);
      this.searchInput.removeEventListener('keydown', this._handleSearchKeyDown);
    }
    
    if (this.clearButton) {
      this.clearButton.removeEventListener('click', this._handleClear);
    }
    
    document.removeEventListener('click', this._handleClickOutside);
    window.removeEventListener('resize', this._handleResize);
    document.removeEventListener('keydown', this._handleEscapeKey);
    
    // 移除下拉菜单
    if (this.dropdownElement && this.dropdownElement.parentNode) {
      this.dropdownElement.parentNode.removeChild(this.dropdownElement);
    }
    
    // 移除元素
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
    
    // 清理引用
    this.element = null;
    this.inputElement = null;
    this.dropdownElement = null;
    this.optionsContainer = null;
    this.searchInput = null;
    this.tagsContainer = null;
    this.placeholderElement = null;
    this.iconElement = null;
    this.clearButton = null;
    this.noResultsElement = null;
    this.loadingElement = null;
    
    this.selectedOptions = [];
    this.filteredOptions = [];
    this.options = [];
    this.groups = [];
    
    super.destroy();
  }
}

export default Select;
