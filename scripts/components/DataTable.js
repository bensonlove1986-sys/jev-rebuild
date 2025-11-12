/**
 * DataTable数据表格组件
 * 提供灵活的表格功能，支持分页、排序、搜索、选择和自定义操作
 */
import BaseComponent from './base-component.js';
import logger from '../utils/logger.js';

class DataTable extends BaseComponent {
  /**
   * 构造函数
   * @param {Object} options - 配置选项
   * @param {HTMLElement} container - 容器元素
   */
  constructor(options = {}, container = document.body) {
    super(options, container);
    
    // 组件元素引用
    this.headerElement = null;
    this.searchElement = null;
    this.tableContainer = null;
    this.tableElement = null;
    this.theadElement = null;
    this.tbodyElement = null;
    this.footerElement = null;
    this.paginationElement = null;
    this.noDataElement = null;
    this.loadingElement = null;
    this.actionBarElement = null;
    
    // 表格状态
    this.data = [];
    this.originalData = [];
    this.columns = [];
    this.filteredData = [];
    this.sortConfig = null;
    this.currentPage = 1;
    this.selectedRows = new Set();
    this.isLoading = false;
    this.noDataMessage = '暂无数据';
    this.loadingMessage = '加载中...';
    this.rowHeight = 'auto';
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
      columns: [],
      pageSize: 10,
      showPagination: true,
      showSearch: true,
      showActionBar: true,
      showCheckbox: false,
      showRowNumber: false,
      showHeader: true,
      showFooter: true,
      sortable: true,
      filterable: true,
      resizableColumns: false,
      fixedHeader: false,
      fixedFooter: false,
      rowHeight: 'auto',
      theme: 'default', // default, dark, neon
      bordered: true,
      striped: true,
      hover: true,
      searchPlaceholder: '搜索...',
      noDataMessage: '暂无数据',
      loadingMessage: '加载中...',
      paginationTexts: {
        prev: '上一页',
        next: '下一页',
        first: '首页',
        last: '末页',
        of: '共',
        items: '条数据'
      },
      actions: [],
      onRowClick: null,
      onRowDoubleClick: null,
      onSort: null,
      onFilter: null,
      onPageChange: null,
      onSelectionChange: null,
      onRowAction: null,
      onColumnResize: null,
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
      filteredData: [],
      currentPage: 1,
      selectedRows: new Set(),
      sortConfig: null,
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
    this.element.className = `jev-datatable jev-datatable-${this.options.theme} ${this.options.bordered ? 'jev-datatable-bordered' : ''}`;
    this.element.style.width = this.options.width;
    this.element.style.height = this.options.height;
    this.element.setAttribute('role', 'table');
    
    // 创建头部（搜索栏和操作栏）
    if (this.options.showHeader) {
      this._createHeader();
    }
    
    // 创建表格容器
    this.tableContainer = document.createElement('div');
    this.tableContainer.className = 'jev-datatable-table-container';
    this.tableContainer.style.maxHeight = this.options.height === 'auto' ? 'none' : this.options.height;
    this.element.appendChild(this.tableContainer);
    
    // 创建表格
    this.tableElement = document.createElement('table');
    this.tableElement.className = 'jev-datatable-table';
    this.tableElement.setAttribute('role', 'grid');
    this.tableContainer.appendChild(this.tableElement);
    
    // 创建表头
    this.theadElement = document.createElement('thead');
    this.theadElement.className = 'jev-datatable-thead';
    this.tableElement.appendChild(this.theadElement);
    
    // 创建表体
    this.tbodyElement = document.createElement('tbody');
    this.tbodyElement.className = 'jev-datatable-tbody';
    this.tableElement.appendChild(this.tbodyElement);
    
    // 创建加载状态
    this.loadingElement = document.createElement('div');
    this.loadingElement.className = 'jev-datatable-loading';
    this.loadingElement.textContent = this.options.loadingMessage;
    this.loadingElement.style.display = 'none';
    this.tableContainer.appendChild(this.loadingElement);
    
    // 创建无数据提示
    this.noDataElement = document.createElement('div');
    this.noDataElement.className = 'jev-datatable-nodata';
    this.noDataElement.textContent = this.options.noDataMessage;
    this.tableContainer.appendChild(this.noDataElement);
    
    // 创建页脚（分页等）
    if (this.options.showFooter) {
      this._createFooter();
    }
  }

  /**
   * 创建头部
   * @private
   */
  _createHeader() {
    this.headerElement = document.createElement('div');
    this.headerElement.className = 'jev-datatable-header';
    this.element.appendChild(this.headerElement);
    
    // 创建搜索框
    if (this.options.showSearch) {
      this.searchElement = document.createElement('div');
      this.searchElement.className = 'jev-datatable-search';
      this.headerElement.appendChild(this.searchElement);
      
      const searchInput = document.createElement('input');
      searchInput.type = 'text';
      searchInput.className = 'jev-datatable-search-input';
      searchInput.placeholder = this.options.searchPlaceholder;
      searchInput.setAttribute('aria-label', this.options.searchPlaceholder);
      this.searchElement.appendChild(searchInput);
    }
    
    // 创建操作栏
    if (this.options.showActionBar && this.options.actions.length > 0) {
      this.actionBarElement = document.createElement('div');
      this.actionBarElement.className = 'jev-datatable-actions';
      this.headerElement.appendChild(this.actionBarElement);
      
      // 添加操作按钮
      this.options.actions.forEach(action => {
        const button = document.createElement('button');
        button.className = `jev-datatable-action-btn jev-datatable-action-${action.key}`;
        button.textContent = action.text;
        button.setAttribute('data-action', action.key);
        
        if (action.disabled) {
          button.disabled = true;
        }
        
        if (action.className) {
          button.classList.add(action.className);
        }
        
        this.actionBarElement.appendChild(button);
      });
    }
  }

  /**
   * 创建页脚
   * @private
   */
  _createFooter() {
    this.footerElement = document.createElement('div');
    this.footerElement.className = 'jev-datatable-footer';
    this.element.appendChild(this.footerElement);
    
    // 创建分页
    if (this.options.showPagination) {
      this.paginationElement = document.createElement('div');
      this.paginationElement.className = 'jev-datatable-pagination';
      this.footerElement.appendChild(this.paginationElement);
      
      // 分页信息
      this.paginationInfo = document.createElement('div');
      this.paginationInfo.className = 'jev-datatable-pagination-info';
      this.paginationElement.appendChild(this.paginationInfo);
      
      // 分页控制
      this.paginationControls = document.createElement('div');
      this.paginationControls.className = 'jev-datatable-pagination-controls';
      this.paginationElement.appendChild(this.paginationControls);
      
      // 首页按钮
      this.firstPageBtn = document.createElement('button');
      this.firstPageBtn.className = 'jev-datatable-pagination-btn jev-datatable-first-btn';
      this.firstPageBtn.textContent = this.options.paginationTexts.first;
      this.paginationControls.appendChild(this.firstPageBtn);
      
      // 上一页按钮
      this.prevPageBtn = document.createElement('button');
      this.prevPageBtn.className = 'jev-datatable-pagination-btn jev-datatable-prev-btn';
      this.prevPageBtn.textContent = this.options.paginationTexts.prev;
      this.paginationControls.appendChild(this.prevPageBtn);
      
      // 页码容器
      this.pageNumbersContainer = document.createElement('div');
      this.pageNumbersContainer.className = 'jev-datatable-pagination-numbers';
      this.paginationControls.appendChild(this.pageNumbersContainer);
      
      // 下一页按钮
      this.nextPageBtn = document.createElement('button');
      this.nextPageBtn.className = 'jev-datatable-pagination-btn jev-datatable-next-btn';
      this.nextPageBtn.textContent = this.options.paginationTexts.next;
      this.paginationControls.appendChild(this.nextPageBtn);
      
      // 末页按钮
      this.lastPageBtn = document.createElement('button');
      this.lastPageBtn.className = 'jev-datatable-pagination-btn jev-datatable-last-btn';
      this.lastPageBtn.textContent = this.options.paginationTexts.last;
      this.paginationControls.appendChild(this.lastPageBtn);
    }
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
    this.originalData = JSON.parse(JSON.stringify(this.data));
    this.columns = this.options.columns || [];
    this.rowHeight = this.options.rowHeight;
    
    // 绑定事件
    this._bindEvents();
    
    // 渲染表格
    this.render();
    
    // 触发初始化回调
    if (typeof this.options.onInit === 'function') {
      try {
        this.options.onInit();
      } catch (error) {
        logger.error('表格初始化回调执行失败', error);
      }
    }
  }

  /**
   * 添加全局样式
   * @private
   */
  _addGlobalStyles() {
    const styleId = 'jev-datatable-styles';
    if (document.getElementById(styleId)) {
      return;
    }
    
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      /* 表格容器样式 */
      .jev-datatable {
        background-color: #fff;
        border-radius: 8px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        overflow: hidden;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      }
      
      /* 主题样式 - 默认 */
      .jev-datatable-default {
        background-color: #fff;
        color: #333;
      }
      
      /* 主题样式 - 深色 */
      .jev-datatable-dark {
        background-color: #2d3748;
        color: #e2e8f0;
      }
      
      /* 主题样式 - 霓虹灯 */
      .jev-datatable-neon {
        background-color: #1a1a1a;
        color: #00ff99;
        border: 1px solid rgba(0, 255, 153, 0.2);
        box-shadow: 0 0 20px rgba(0, 255, 153, 0.1);
      }
      
      /* 头部样式 */
      .jev-datatable-header {
        padding: 15px;
        border-bottom: 1px solid #e2e8f0;
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-wrap: wrap;
        gap: 10px;
      }
      
      .jev-datatable-dark .jev-datatable-header {
        border-bottom-color: #4a5568;
      }
      
      .jev-datatable-neon .jev-datatable-header {
        border-bottom-color: rgba(0, 255, 153, 0.3);
      }
      
      /* 搜索框样式 */
      .jev-datatable-search {
        flex: 1;
        min-width: 200px;
      }
      
      .jev-datatable-search-input {
        width: 100%;
        padding: 8px 12px;
        border: 1px solid #e2e8f0;
        border-radius: 4px;
        font-size: 14px;
        background-color: #fff;
        color: inherit;
        transition: all 0.2s ease;
      }
      
      .jev-datatable-search-input:focus {
        outline: none;
        border-color: #007bff;
        box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
      }
      
      .jev-datatable-dark .jev-datatable-search-input {
        border-color: #4a5568;
        background-color: #374151;
      }
      
      .jev-datatable-dark .jev-datatable-search-input:focus {
        border-color: #38b2ac;
        box-shadow: 0 0 0 3px rgba(56, 178, 172, 0.1);
      }
      
      .jev-datatable-neon .jev-datatable-search-input {
        border-color: rgba(0, 255, 153, 0.3);
        background-color: rgba(0, 255, 153, 0.05);
      }
      
      .jev-datatable-neon .jev-datatable-search-input:focus {
        border-color: #00ff99;
        box-shadow: 0 0 10px rgba(0, 255, 153, 0.3);
      }
      
      /* 操作栏样式 */
      .jev-datatable-actions {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
      }
      
      /* 操作按钮 */
      .jev-datatable-action-btn {
        padding: 6px 12px;
        border: 1px solid #e2e8f0;
        background-color: #fff;
        color: #333;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
        transition: all 0.2s ease;
      }
      
      .jev-datatable-action-btn:hover:not(:disabled) {
        background-color: #f7fafc;
      }
      
      .jev-datatable-action-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      
      .jev-datatable-dark .jev-datatable-action-btn {
        border-color: #4a5568;
        background-color: #374151;
        color: #e2e8f0;
      }
      
      .jev-datatable-dark .jev-datatable-action-btn:hover:not(:disabled) {
        background-color: #4a5568;
      }
      
      .jev-datatable-neon .jev-datatable-action-btn {
        border-color: rgba(0, 255, 153, 0.3);
        background-color: transparent;
        color: #00ff99;
      }
      
      .jev-datatable-neon .jev-datatable-action-btn:hover:not(:disabled) {
        background-color: rgba(0, 255, 153, 0.1);
        box-shadow: 0 0 10px rgba(0, 255, 153, 0.2);
      }
      
      /* 表格容器 */
      .jev-datatable-table-container {
        overflow-x: auto;
        position: relative;
      }
      
      /* 表格样式 */
      .jev-datatable-table {
        width: 100%;
        border-collapse: collapse;
        border-spacing: 0;
      }
      
      /* 表格边框 */
      .jev-datatable-bordered .jev-datatable-table {
        border: 1px solid #e2e8f0;
      }
      
      .jev-datatable-dark.jev-datatable-bordered .jev-datatable-table {
        border-color: #4a5568;
      }
      
      .jev-datatable-neon.jev-datatable-bordered .jev-datatable-table {
        border-color: rgba(0, 255, 153, 0.3);
      }
      
      /* 表头样式 */
      .jev-datatable-thead {
        background-color: #f7fafc;
      }
      
      .jev-datatable-dark .jev-datatable-thead {
        background-color: #374151;
      }
      
      .jev-datatable-neon .jev-datatable-thead {
        background-color: rgba(0, 255, 153, 0.05);
      }
      
      .jev-datatable-thead th {
        padding: 12px;
        text-align: left;
        font-weight: 600;
        font-size: 14px;
        border-bottom: 1px solid #e2e8f0;
        white-space: nowrap;
        position: relative;
        min-width: 100px;
      }
      
      .jev-datatable-dark .jev-datatable-thead th {
        border-bottom-color: #4a5568;
      }
      
      .jev-datatable-neon .jev-datatable-thead th {
        border-bottom-color: rgba(0, 255, 153, 0.3);
      }
      
      /* 可排序列 */
      .jev-datatable-thead th.jev-datatable-sortable {
        cursor: pointer;
        user-select: none;
        padding-right: 24px;
      }
      
      .jev-datatable-thead th.jev-datatable-sortable:hover {
        background-color: #edf2f7;
      }
      
      .jev-datatable-dark .jev-datatable-thead th.jev-datatable-sortable:hover {
        background-color: #4a5568;
      }
      
      .jev-datatable-neon .jev-datatable-thead th.jev-datatable-sortable:hover {
        background-color: rgba(0, 255, 153, 0.1);
      }
      
      /* 排序图标 */
      .jev-datatable-sort-icon {
        position: absolute;
        right: 8px;
        top: 50%;
        transform: translateY(-50%);
        font-size: 12px;
        opacity: 0.5;
      }
      
      .jev-datatable-sort-icon.asc {
        opacity: 1;
      }
      
      .jev-datatable-sort-icon.desc {
        opacity: 1;
      }
      
      /* 表体样式 */
      .jev-datatable-tbody {
        background-color: #fff;
      }
      
      .jev-datatable-dark .jev-datatable-tbody {
        background-color: #2d3748;
      }
      
      .jev-datatable-neon .jev-datatable-tbody {
        background-color: #1a1a1a;
      }
      
      /* 行样式 */
      .jev-datatable-tbody tr {
        transition: background-color 0.2s ease;
      }
      
      .jev-datatable-tbody td {
        padding: 12px;
        border-bottom: 1px solid #e2e8f0;
        font-size: 14px;
        vertical-align: middle;
      }
      
      .jev-datatable-dark .jev-datatable-tbody td {
        border-bottom-color: #4a5568;
      }
      
      .jev-datatable-neon .jev-datatable-tbody td {
        border-bottom-color: rgba(0, 255, 153, 0.1);
      }
      
      /* 条纹样式 */
      .jev-datatable-striped .jev-datatable-tbody tr:nth-child(even) {
        background-color: #f7fafc;
      }
      
      .jev-datatable-dark.jev-datatable-striped .jev-datatable-tbody tr:nth-child(even) {
        background-color: #374151;
      }
      
      .jev-datatable-neon.jev-datatable-striped .jev-datatable-tbody tr:nth-child(even) {
        background-color: rgba(0, 255, 153, 0.05);
      }
      
      /* 悬停样式 */
      .jev-datatable-hover .jev-datatable-tbody tr:hover:not(.jev-datatable-row-selected) {
        background-color: #edf2f7;
      }
      
      .jev-datatable-dark.jev-datatable-hover .jev-datatable-tbody tr:hover:not(.jev-datatable-row-selected) {
        background-color: #4a5568;
      }
      
      .jev-datatable-neon.jev-datatable-hover .jev-datatable-tbody tr:hover:not(.jev-datatable-row-selected) {
        background-color: rgba(0, 255, 153, 0.1);
        box-shadow: 0 0 10px rgba(0, 255, 153, 0.1);
      }
      
      /* 选中行样式 */
      .jev-datatable-row-selected {
        background-color: #e3f2fd !important;
      }
      
      .jev-datatable-dark .jev-datatable-row-selected {
        background-color: #2b6cb0 !important;
      }
      
      .jev-datatable-neon .jev-datatable-row-selected {
        background-color: rgba(0, 255, 153, 0.2) !important;
        box-shadow: 0 0 15px rgba(0, 255, 153, 0.2);
      }
      
      /* 复选框列 */
      .jev-datatable-checkbox {
        width: 16px;
        height: 16px;
        cursor: pointer;
      }
      
      /* 行操作列 */
      .jev-datatable-actions-cell {
        display: flex;
        gap: 8px;
        align-items: center;
      }
      
      .jev-datatable-row-action {
        padding: 4px 8px;
        border: none;
        background-color: transparent;
        color: #007bff;
        cursor: pointer;
        font-size: 13px;
        border-radius: 3px;
        transition: all 0.2s ease;
      }
      
      .jev-datatable-row-action:hover {
        background-color: rgba(0, 123, 255, 0.1);
      }
      
      .jev-datatable-dark .jev-datatable-row-action {
        color: #4fd1c5;
      }
      
      .jev-datatable-dark .jev-datatable-row-action:hover {
        background-color: rgba(79, 209, 197, 0.1);
      }
      
      .jev-datatable-neon .jev-datatable-row-action {
        color: #00ff99;
      }
      
      .jev-datatable-neon .jev-datatable-row-action:hover {
        background-color: rgba(0, 255, 153, 0.1);
      }
      
      /* 页脚样式 */
      .jev-datatable-footer {
        padding: 12px 15px;
        border-top: 1px solid #e2e8f0;
      }
      
      .jev-datatable-dark .jev-datatable-footer {
        border-top-color: #4a5568;
      }
      
      .jev-datatable-neon .jev-datatable-footer {
        border-top-color: rgba(0, 255, 153, 0.3);
      }
      
      /* 分页样式 */
      .jev-datatable-pagination {
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-wrap: wrap;
        gap: 15px;
      }
      
      .jev-datatable-pagination-info {
        font-size: 14px;
        color: #718096;
      }
      
      .jev-datatable-dark .jev-datatable-pagination-info {
        color: #a0aec0;
      }
      
      .jev-datatable-neon .jev-datatable-pagination-info {
        color: #00ff9966;
      }
      
      .jev-datatable-pagination-controls {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      
      /* 分页按钮 */
      .jev-datatable-pagination-btn {
        padding: 6px 10px;
        border: 1px solid #e2e8f0;
        background-color: #fff;
        color: #333;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
        transition: all 0.2s ease;
        min-width: 32px;
        text-align: center;
      }
      
      .jev-datatable-pagination-btn:hover:not(:disabled) {
        background-color: #f7fafc;
      }
      
      .jev-datatable-pagination-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      
      .jev-datatable-pagination-btn.active {
        background-color: #007bff;
        border-color: #007bff;
        color: white;
      }
      
      .jev-datatable-dark .jev-datatable-pagination-btn {
        border-color: #4a5568;
        background-color: #374151;
        color: #e2e8f0;
      }
      
      .jev-datatable-dark .jev-datatable-pagination-btn:hover:not(:disabled) {
        background-color: #4a5568;
      }
      
      .jev-datatable-dark .jev-datatable-pagination-btn.active {
        background-color: #38b2ac;
        border-color: #38b2ac;
      }
      
      .jev-datatable-neon .jev-datatable-pagination-btn {
        border-color: rgba(0, 255, 153, 0.3);
        background-color: transparent;
        color: #00ff99;
      }
      
      .jev-datatable-neon .jev-datatable-pagination-btn:hover:not(:disabled) {
        background-color: rgba(0, 255, 153, 0.1);
      }
      
      .jev-datatable-neon .jev-datatable-pagination-btn.active {
        background-color: rgba(0, 255, 153, 0.2);
        border-color: #00ff99;
        box-shadow: 0 0 10px rgba(0, 255, 153, 0.3);
      }
      
      /* 页码容器 */
      .jev-datatable-pagination-numbers {
        display: flex;
        gap: 4px;
      }
      
      /* 加载状态 */
      .jev-datatable-loading {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: rgba(255, 255, 255, 0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 14px;
        color: #718096;
        z-index: 10;
      }
      
      .jev-datatable-dark .jev-datatable-loading {
        background-color: rgba(45, 55, 72, 0.8);
        color: #a0aec0;
      }
      
      .jev-datatable-neon .jev-datatable-loading {
        background-color: rgba(26, 26, 26, 0.8);
        color: #00ff99;
      }
      
      /* 无数据提示 */
      .jev-datatable-nodata {
        padding: 40px;
        text-align: center;
        font-size: 14px;
        color: #718096;
        display: none;
      }
      
      .jev-datatable-dark .jev-datatable-nodata {
        color: #a0aec0;
      }
      
      .jev-datatable-neon .jev-datatable-nodata {
        color: #00ff9966;
      }
      
      /* 响应式设计 */
      @media (max-width: 768px) {
        .jev-datatable-header {
          padding: 10px;
          flex-direction: column;
          align-items: stretch;
        }
        
        .jev-datatable-search {
          min-width: 100%;
        }
        
        .jev-datatable-actions {
          justify-content: center;
        }
        
        .jev-datatable-thead th,
        .jev-datatable-tbody td {
          padding: 10px 8px;
          font-size: 13px;
        }
        
        .jev-datatable-pagination {
          flex-direction: column;
          align-items: center;
        }
        
        .jev-datatable-pagination-controls {
          flex-wrap: wrap;
          justify-content: center;
        }
      }
      
      @media (max-width: 480px) {
        .jev-datatable-thead th,
        .jev-datatable-tbody td {
          padding: 8px 4px;
          font-size: 12px;
        }
        
        .jev-datatable-pagination-btn {
          padding: 4px 8px;
          font-size: 13px;
          min-width: 28px;
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
    // 搜索事件
    if (this.searchElement) {
      const searchInput = this.searchElement.querySelector('.jev-datatable-search-input');
      if (searchInput) {
        searchInput.addEventListener('input', this._handleSearch.bind(this));
      }
    }
    
    // 操作按钮事件
    if (this.actionBarElement) {
      this.actionBarElement.addEventListener('click', this._handleActionClick.bind(this));
    }
    
    // 分页按钮事件
    if (this.paginationElement) {
      this.firstPageBtn.addEventListener('click', () => this.goToPage(1));
      this.prevPageBtn.addEventListener('click', () => this.prevPage());
      this.nextPageBtn.addEventListener('click', () => this.nextPage());
      this.lastPageBtn.addEventListener('click', () => this.goToPage(this.getTotalPages()));
      this.pageNumbersContainer.addEventListener('click', this._handlePageClick.bind(this));
    }
  }

  /**
   * 处理搜索
   * @private
   */
  _handleSearch(e) {
    const searchTerm = e.target.value.toLowerCase();
    this.filteredData = this.originalData.filter(item => {
      // 搜索所有列
      return this.columns.some(column => {
        if (!column.dataField) return false;
        
        const value = this._getValueByPath(item, column.dataField);
        return value && String(value).toLowerCase().includes(searchTerm);
      });
    });
    
    this.currentPage = 1;
    this.updateState({
      filteredData: this.filteredData,
      currentPage: 1
    });
    
    this.render();
    
    // 触发过滤回调
    if (typeof this.options.onFilter === 'function') {
      try {
        this.options.onFilter(searchTerm, this.filteredData);
      } catch (error) {
        logger.error('过滤回调执行失败', error);
      }
    }
  }

  /**
   * 处理操作按钮点击
   * @private
   */
  _handleActionClick(e) {
    if (e.target.classList.contains('jev-datatable-action-btn')) {
      const actionKey = e.target.getAttribute('data-action');
      const selectedData = Array.from(this.selectedRows).map(index => this.filteredData[index]);
      
      if (typeof this.options.onRowAction === 'function') {
        try {
          this.options.onRowAction(actionKey, selectedData);
        } catch (error) {
          logger.error('行操作回调执行失败', error);
        }
      }
    }
  }

  /**
   * 处理页码点击
   * @private
   */
  _handlePageClick(e) {
    if (e.target.classList.contains('jev-datatable-page-btn')) {
      const page = parseInt(e.target.textContent, 10);
      if (!isNaN(page)) {
        this.goToPage(page);
      }
    }
  }

  /**
   * 处理表头点击（排序）
   * @private
   */
  _handleHeaderClick(e) {
    if (!this.options.sortable) return;
    
    const th = e.target.closest('th.jev-datatable-sortable');
    if (!th) return;
    
    const columnIndex = Array.from(th.parentNode.children).indexOf(th);
    const column = this.columns[columnIndex - (this.options.showCheckbox ? 1 : 0) - (this.options.showRowNumber ? 1 : 0)];
    
    if (!column || !column.sortable) return;
    
    // 确定排序方向
    let direction = 'asc';
    if (this.sortConfig && this.sortConfig.field === column.dataField) {
      direction = this.sortConfig.direction === 'asc' ? 'desc' : 'asc';
    }
    
    // 设置排序配置
    this.sortConfig = {
      field: column.dataField,
      direction: direction
    };
    
    this.updateState({ sortConfig: this.sortConfig });
    
    // 重新渲染
    this.render();
    
    // 触发排序回调
    if (typeof this.options.onSort === 'function') {
      try {
        this.options.onSort(column.dataField, direction);
      } catch (error) {
        logger.error('排序回调执行失败', error);
      }
    }
  }

  /**
   * 处理行点击
   * @private
   */
  _handleRowClick(e, rowIndex, rowData) {
    // 如果点击的是复选框，不触发行点击事件
    if (e.target.type === 'checkbox') return;
    
    // 处理选择
    if (this.options.showCheckbox) {
      this.toggleRowSelection(rowIndex);
    }
    
    // 触发行点击回调
    if (typeof this.options.onRowClick === 'function') {
      try {
        this.options.onRowClick(rowIndex, rowData, e);
      } catch (error) {
        logger.error('行点击回调执行失败', error);
      }
    }
  }

  /**
   * 处理行双击
   * @private
   */
  _handleRowDoubleClick(e, rowIndex, rowData) {
    // 触发行双击回调
    if (typeof this.options.onRowDoubleClick === 'function') {
      try {
        this.options.onRowDoubleClick(rowIndex, rowData, e);
      } catch (error) {
        logger.error('行双击回调执行失败', error);
      }
    }
  }

  /**
   * 处理行选择
   * @private
   */
  _handleRowSelection(e, rowIndex) {
    e.stopPropagation();
    this.toggleRowSelection(rowIndex);
  }

  /**
   * 处理全选
   * @private
   */
  _handleSelectAll(e) {
    e.stopPropagation();
    const isChecked = e.target.checked;
    
    if (isChecked) {
      this.selectAllRows();
    } else {
      this.clearSelection();
    }
  }

  /**
   * 通过路径获取对象的值
   * @private
   */
  _getValueByPath(obj, path) {
    if (!obj || !path) return null;
    
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : null;
    }, obj);
  }

  /**
   * 排序数据
   * @private
   */
  _sortData(data) {
    if (!this.sortConfig) return data;
    
    const { field, direction } = this.sortConfig;
    
    return [...data].sort((a, b) => {
      const valueA = this._getValueByPath(a, field);
      const valueB = this._getValueByPath(b, field);
      
      if (valueA === null || valueA === undefined) return 1;
      if (valueB === null || valueB === undefined) return -1;
      
      if (typeof valueA === 'string' && typeof valueB === 'string') {
        return direction === 'asc' 
          ? valueA.localeCompare(valueB)
          : valueB.localeCompare(valueA);
      }
      
      if (typeof valueA === 'number' && typeof valueB === 'number') {
        return direction === 'asc' ? valueA - valueB : valueB - valueA;
      }
      
      return 0;
    });
  }

  /**
   * 渲染表格
   */
  render() {
    // 更新表头
    this._renderHeader();
    
    // 更新表体
    this._renderBody();
    
    // 更新分页
    if (this.options.showPagination) {
      this._renderPagination();
    }
    
    // 更新加载状态
    this._updateLoadingState();
  }

  /**
   * 渲染表头
   * @private
   */
  _renderHeader() {
    this.theadElement.innerHTML = '';
    
    const headerRow = document.createElement('tr');
    headerRow.className = 'jev-datatable-header-row';
    this.theadElement.appendChild(headerRow);
    
    // 复选框列
    if (this.options.showCheckbox) {
      const checkboxTh = document.createElement('th');
      checkboxTh.className = 'jev-datatable-checkbox-th';
      checkboxTh.style.width = '40px';
      checkboxTh.style.textAlign = 'center';
      
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'jev-datatable-checkbox jev-datatable-select-all';
      checkbox.checked = this.selectedRows.size === this.filteredData.length && this.filteredData.length > 0;
      checkbox.addEventListener('change', this._handleSelectAll.bind(this));
      
      checkboxTh.appendChild(checkbox);
      headerRow.appendChild(checkboxTh);
    }
    
    // 行号列
    if (this.options.showRowNumber) {
      const rowNumberTh = document.createElement('th');
      rowNumberTh.className = 'jev-datatable-row-number-th';
      rowNumberTh.textContent = '序号';
      rowNumberTh.style.width = '60px';
      rowNumberTh.style.textAlign = 'center';
      headerRow.appendChild(rowNumberTh);
    }
    
    // 数据列
    this.columns.forEach(column => {
      const th = document.createElement('th');
      th.className = `jev-datatable-header-cell ${column.sortable ? 'jev-datatable-sortable' : ''}`;
      
      if (column.width) {
        th.style.width = column.width;
      }
      
      if (column.align) {
        th.style.textAlign = column.align;
      }
      
      th.textContent = column.title;
      
      // 添加排序图标
      if (column.sortable && this.options.sortable) {
        const sortIcon = document.createElement('span');
        sortIcon.className = 'jev-datatable-sort-icon';
        sortIcon.innerHTML = '⇅';
        
        // 更新排序图标状态
        if (this.sortConfig && this.sortConfig.field === column.dataField) {
          sortIcon.className += ` ${this.sortConfig.direction}`;
          sortIcon.innerHTML = this.sortConfig.direction === 'asc' ? '↑' : '↓';
        }
        
        th.appendChild(sortIcon);
        th.addEventListener('click', this._handleHeaderClick.bind(this));
      }
      
      headerRow.appendChild(th);
    });
  }

  /**
   * 渲染表体
   * @private
   */
  _renderBody() {
    this.tbodyElement.innerHTML = '';
    
    // 排序数据
    let displayData = this._sortData(this.filteredData);
    
    // 获取当前页的数据
    const pageData = this._getPageData(displayData);
    
    // 更新无数据显示
    this.noDataElement.style.display = pageData.length === 0 ? 'block' : 'none';
    
    // 渲染行
    pageData.forEach((item, index) => {
      const actualIndex = (this.currentPage - 1) * this.options.pageSize + index;
      const row = this._createRow(item, actualIndex);
      this.tbodyElement.appendChild(row);
    });
  }

  /**
   * 创建行
   * @private
   */
  _createRow(rowData, rowIndex) {
    const row = document.createElement('tr');
    row.className = 'jev-datatable-row';
    
    // 设置行高
    if (this.rowHeight !== 'auto') {
      row.style.height = this.rowHeight;
    }
    
    // 设置选中状态
    if (this.selectedRows.has(rowIndex)) {
      row.classList.add('jev-datatable-row-selected');
    }
    
    // 添加点击事件
    row.addEventListener('click', (e) => this._handleRowClick(e, rowIndex, rowData));
    row.addEventListener('dblclick', (e) => this._handleRowDoubleClick(e, rowIndex, rowData));
    
    // 复选框列
    if (this.options.showCheckbox) {
      const checkboxTd = document.createElement('td');
      checkboxTd.className = 'jev-datatable-checkbox-td';
      checkboxTd.style.textAlign = 'center';
      
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'jev-datatable-checkbox';
      checkbox.checked = this.selectedRows.has(rowIndex);
      checkbox.addEventListener('change', (e) => this._handleRowSelection(e, rowIndex));
      
      checkboxTd.appendChild(checkbox);
      row.appendChild(checkboxTd);
    }
    
    // 行号列
    if (this.options.showRowNumber) {
      const rowNumberTd = document.createElement('td');
      rowNumberTd.className = 'jev-datatable-row-number-td';
      rowNumberTd.textContent = rowIndex + 1;
      rowNumberTd.style.textAlign = 'center';
      row.appendChild(rowNumberTd);
    }
    
    // 数据列
    this.columns.forEach(column => {
      const td = document.createElement('td');
      td.className = 'jev-datatable-cell';
      
      if (column.align) {
        td.style.textAlign = column.align;
      }
      
      // 渲染单元格内容
      if (typeof column.render === 'function') {
        try {
          const result = column.render(rowData, rowIndex);
          if (typeof result === 'string') {
            td.innerHTML = result;
          } else if (result instanceof Node) {
            td.appendChild(result);
          }
        } catch (error) {
          logger.error('单元格渲染失败', error);
          td.textContent = '';
        }
      } else if (column.dataField) {
        const value = this._getValueByPath(rowData, column.dataField);
        td.textContent = value ?? '';
      }
      
      row.appendChild(td);
    });
    
    return row;
  }

  /**
   * 渲染分页
   * @private
   */
  _renderPagination() {
    const totalItems = this.filteredData.length;
    const totalPages = this.getTotalPages();
    
    // 更新分页信息
    this.paginationInfo.textContent = `${this.options.paginationTexts.of} ${totalItems} ${this.options.paginationTexts.items}`;
    
    // 更新分页按钮状态
    this.firstPageBtn.disabled = this.currentPage === 1 || totalPages === 0;
    this.prevPageBtn.disabled = this.currentPage === 1 || totalPages === 0;
    this.nextPageBtn.disabled = this.currentPage === totalPages || totalPages === 0;
    this.lastPageBtn.disabled = this.currentPage === totalPages || totalPages === 0;
    
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
    button.className = `jev-datatable-pagination-btn jev-datatable-page-btn ${page === this.currentPage ? 'active' : ''}`;
    button.textContent = page;
    this.pageNumbersContainer.appendChild(button);
  }

  /**
   * 添加省略号
   * @private
   */
  _addEllipsis() {
    const ellipsis = document.createElement('span');
    ellipsis.className = 'jev-datatable-pagination-ellipsis';
    ellipsis.textContent = '...';
    ellipsis.style.padding = '0 8px';
    this.pageNumbersContainer.appendChild(ellipsis);
  }

  /**
   * 更新加载状态
   * @private
   */
  _updateLoadingState() {
    this.loadingElement.style.display = this.isLoading ? 'flex' : 'none';
  }

  /**
   * 获取分页数据
   * @private
   */
  _getPageData(data) {
    const startIndex = (this.currentPage - 1) * this.options.pageSize;
    const endIndex = startIndex + this.options.pageSize;
    return data.slice(startIndex, endIndex);
  }

  /**
   * 获取总页数
   */
  getTotalPages() {
    return Math.ceil(this.filteredData.length / this.options.pageSize);
  }

  /**
   * 前往指定页
   * @param {number} page - 页码
   */
  goToPage(page) {
    if (page < 1 || page > this.getTotalPages()) return;
    
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
    if (this.currentPage < this.getTotalPages()) {
      this.goToPage(this.currentPage + 1);
    }
  }

  /**
   * 设置数据
   * @param {Array} data - 新数据
   */
  setData(data) {
    this.data = data || [];
    this.originalData = JSON.parse(JSON.stringify(this.data));
    this.filteredData = [...this.data];
    this.currentPage = 1;
    this.selectedRows.clear();
    
    this.updateState({
      data: this.data,
      filteredData: this.filteredData,
      currentPage: 1,
      selectedRows: new Set()
    });
    
    this.render();
  }

  /**
   * 添加数据
   * @param {Object|Array} data - 要添加的数据
   */
  addData(data) {
    if (Array.isArray(data)) {
      this.data.push(...data);
      this.originalData.push(...JSON.parse(JSON.stringify(data)));
      this.filteredData.push(...data);
    } else {
      this.data.push(data);
      this.originalData.push(JSON.parse(JSON.stringify(data)));
      this.filteredData.push(data);
    }
    
    this.updateState({
      data: this.data,
      filteredData: this.filteredData
    });
    
    this.render();
  }

  /**
   * 更新行数据
   * @param {number} rowIndex - 行索引
   * @param {Object} newData - 新数据
   */
  updateRow(rowIndex, newData) {
    if (rowIndex >= 0 && rowIndex < this.data.length) {
      this.data[rowIndex] = { ...this.data[rowIndex], ...newData };
      this.originalData[rowIndex] = JSON.parse(JSON.stringify(this.data[rowIndex]));
      
      // 更新过滤后的数据
      const filteredIndex = this.filteredData.findIndex(item => {
        // 这里假设每个项目都有唯一标识符，实际应用中需要调整
        return JSON.stringify(item) === JSON.stringify(this.data[rowIndex]);
      });
      
      if (filteredIndex !== -1) {
        this.filteredData[filteredIndex] = { ...this.filteredData[filteredIndex], ...newData };
      }
      
      this.updateState({
        data: this.data,
        filteredData: this.filteredData
      });
      
      this.render();
    }
  }

  /**
   * 删除行
   * @param {number} rowIndex - 行索引
   */
  removeRow(rowIndex) {
    if (rowIndex >= 0 && rowIndex < this.data.length) {
      this.data.splice(rowIndex, 1);
      this.originalData.splice(rowIndex, 1);
      
      // 从过滤后的数据中删除
      const filteredItem = this.filteredData.find((_, index) => index === rowIndex);
      if (filteredItem) {
        const filteredIndex = this.filteredData.indexOf(filteredItem);
        if (filteredIndex !== -1) {
          this.filteredData.splice(filteredIndex, 1);
        }
      }
      
      // 调整选中行
      const newSelectedRows = new Set();
      this.selectedRows.forEach(index => {
        if (index < rowIndex) {
          newSelectedRows.add(index);
        } else if (index > rowIndex) {
          newSelectedRows.add(index - 1);
        }
      });
      this.selectedRows = newSelectedRows;
      
      // 调整当前页
      if (this.currentPage > this.getTotalPages()) {
        this.currentPage = Math.max(1, this.getTotalPages());
      }
      
      this.updateState({
        data: this.data,
        filteredData: this.filteredData,
        selectedRows: this.selectedRows,
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
    this.originalData = [];
    this.filteredData = [];
    this.currentPage = 1;
    this.selectedRows.clear();
    
    this.updateState({
      data: this.data,
      filteredData: this.filteredData,
      currentPage: 1,
      selectedRows: new Set()
    });
    
    this.render();
  }

  /**
   * 设置列配置
   * @param {Array} columns - 列配置
   */
  setColumns(columns) {
    this.columns = columns || [];
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
   * 设置主题
   * @param {string} theme - 主题名称
   */
  setTheme(theme) {
    this.element.classList.remove(`jev-datatable-${this.options.theme}`);
    this.element.classList.add(`jev-datatable-${theme}`);
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
   * 选择行
   * @param {number} rowIndex - 行索引
   */
  selectRow(rowIndex) {
    if (rowIndex >= 0 && rowIndex < this.filteredData.length) {
      this.selectedRows.add(rowIndex);
      this.updateState({ selectedRows: this.selectedRows });
      this.render();
      
      // 触发选择变化回调
      this._triggerSelectionChange();
    }
  }

  /**
   * 取消选择行
   * @param {number} rowIndex - 行索引
   */
  deselectRow(rowIndex) {
    this.selectedRows.delete(rowIndex);
    this.updateState({ selectedRows: this.selectedRows });
    this.render();
    
    // 触发选择变化回调
    this._triggerSelectionChange();
  }

  /**
   * 切换行选择状态
   * @param {number} rowIndex - 行索引
   */
  toggleRowSelection(rowIndex) {
    if (rowIndex >= 0 && rowIndex < this.filteredData.length) {
      if (this.selectedRows.has(rowIndex)) {
        this.deselectRow(rowIndex);
      } else {
        this.selectRow(rowIndex);
      }
    }
  }

  /**
   * 全选
   */
  selectAllRows() {
    this.selectedRows.clear();
    for (let i = 0; i < this.filteredData.length; i++) {
      this.selectedRows.add(i);
    }
    
    this.updateState({ selectedRows: this.selectedRows });
    this.render();
    
    // 触发选择变化回调
    this._triggerSelectionChange();
  }

  /**
   * 清空选择
   */
  clearSelection() {
    this.selectedRows.clear();
    this.updateState({ selectedRows: this.selectedRows });
    this.render();
    
    // 触发选择变化回调
    this._triggerSelectionChange();
  }

  /**
   * 触发选择变化回调
   * @private
   */
  _triggerSelectionChange() {
    if (typeof this.options.onSelectionChange === 'function') {
      try {
        const selectedData = Array.from(this.selectedRows).map(index => this.filteredData[index]);
        this.options.onSelectionChange(selectedData);
      } catch (error) {
        logger.error('选择变化回调执行失败', error);
      }
    }
  }

  /**
   * 获取选中行数据
   * @returns {Array} 选中行的数据
   */
  getSelectedRows() {
    return Array.from(this.selectedRows).map(index => this.filteredData[index]);
  }

  /**
   * 获取选中行索引
   * @returns {Array} 选中行的索引
   */
  getSelectedRowIndices() {
    return Array.from(this.selectedRows);
  }

  /**
   * 过滤数据
   * @param {Function} filterFn - 过滤函数
   */
  filterData(filterFn) {
    if (typeof filterFn === 'function') {
      this.filteredData = this.originalData.filter(filterFn);
      this.currentPage = 1;
      
      this.updateState({
        filteredData: this.filteredData,
        currentPage: 1
      });
      
      this.render();
    }
  }

  /**
   * 排序数据
   * @param {string} field - 排序字段
   * @param {string} direction - 排序方向
   */
  sortData(field, direction = 'asc') {
    this.sortConfig = {
      field: field,
      direction: direction
    };
    
    this.updateState({ sortConfig: this.sortConfig });
    this.render();
  }

  /**
   * 清空排序
   */
  clearSort() {
    this.sortConfig = null;
    this.updateState({ sortConfig: null });
    this.render();
  }

  /**
   * 获取当前页数据
   * @returns {Array} 当前页的数据
   */
  getCurrentPageData() {
    return this._getPageData(this._sortData(this.filteredData));
  }

  /**
   * 获取当前页码
   * @returns {number} 当前页码
   */
  getCurrentPage() {
    return this.currentPage;
  }

  /**
   * 获取页大小
   * @returns {number} 页大小
   */
  getPageSize() {
    return this.options.pageSize;
  }

  /**
   * 获取总数据量
   * @returns {number} 总数据量
   */
  getTotalItems() {
    return this.filteredData.length;
  }

  /**
   * 获取原始数据
   * @returns {Array} 原始数据
   */
  getOriginalData() {
    return JSON.parse(JSON.stringify(this.originalData));
  }

  /**
   * 获取过滤后的数据
   * @returns {Array} 过滤后的数据
   */
  getFilteredData() {
    return JSON.parse(JSON.stringify(this.filteredData));
  }

  /**
   * 导出数据为CSV
   * @returns {string} CSV格式的数据
   */
  exportToCSV() {
    if (!this.data.length) return '';
    
    // 获取列标题
    const headers = this.columns.map(col => col.title);
    
    // 获取数据行
    const rows = this.data.map(row => {
      return this.columns.map(col => {
        let value;
        if (typeof col.render === 'function') {
          // 对于自定义渲染，尝试获取原始值
          value = col.dataField ? this._getValueByPath(row, col.dataField) : '';
        } else if (col.dataField) {
          value = this._getValueByPath(row, col.dataField);
        } else {
          value = '';
        }
        
        // 处理特殊字符
        value = value ?? '';
        if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
          value = '"' + value.replace(/"/g, '""') + '"';
        }
        return value;
      });
    });
    
    // 组合CSV内容
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
    
    return csvContent;
  }

  /**
   * 资源释放与清理
   */
  async destroy() {
    try {
      // 移除DOM元素
      if (this.element && this.element.parentNode) {
        this.element.parentNode.removeChild(this.element);
      }
      
      // 清理引用
      this.headerElement = null;
      this.searchElement = null;
      this.tableContainer = null;
      this.tableElement = null;
      this.theadElement = null;
      this.tbodyElement = null;
      this.footerElement = null;
      this.paginationElement = null;
      this.noDataElement = null;
      this.loadingElement = null;
      this.actionBarElement = null;
      
      // 清空数据
      this.data = [];
      this.originalData = [];
      this.filteredData = [];
      this.selectedRows.clear();
      
    } catch (error) {
      logger.error('表格组件销毁失败', error);
    }
  }
}

export default DataTable;