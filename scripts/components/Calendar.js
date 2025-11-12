/**
 * Calendar日历组件
 * 提供灵活的日历功能，支持日期选择、范围选择和多种视图模式
 */
import BaseComponent from './base-component.js';
import logger from '../utils/logger.js';

class Calendar extends BaseComponent {
  /**
   * 构造函数
   * @param {Object} options - 配置选项
   * @param {HTMLElement} container - 容器元素
   */
  constructor(options = {}, container = document.body) {
    super(options, container);
    
    // 组件元素引用
    this.headerElement = null;
    this.navigationElement = null;
    this.prevButton = null;
    this.nextButton = null;
    this.titleElement = null;
    this.todayButton = null;
    this.viewsElement = null;
    this.weekdaysElement = null;
    this.daysElement = null;
    this.footerElement = null;
    
    // 日历状态
    this.currentDate = new Date();
    this.selectedDate = null;
    this.selectedRange = { start: null, end: null };
    this.minDate = null;
    this.maxDate = null;
    this.disabledDates = [];
    this.highlightedDates = [];
    this.view = 'month'; // month, week, day
    this.weekStart = 0; // 0 = Sunday, 1 = Monday
    this.isRangeSelection = false;
    this.isRangeSelecting = false;
    this.firstDay = null;
    this.lastDay = null;
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
      view: 'month', // month, week, day
      weekStart: 0, // 0 = Sunday, 1 = Monday
      selectable: true,
      multiple: false,
      range: false,
      showTodayButton: true,
      showNavigation: true,
      showWeekNumbers: false,
      showViewSwitcher: true,
      enableRangeSelection: false,
      minDate: null,
      maxDate: null,
      disabledDates: [],
      highlightedDates: [],
      theme: 'default', // default, dark, neon
      firstDayOfWeek: 0,
      locale: 'zh-CN',
      dateFormat: 'YYYY-MM-DD',
      monthFormat: 'YYYY年MM月',
      dayNames: ['日', '一', '二', '三', '四', '五', '六'],
      monthNames: ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'],
      todayText: '今天',
      prevText: '上一个',
      nextText: '下一个',
      viewSwitcherTexts: {
        month: '月',
        week: '周',
        day: '日'
      },
      onDateSelect: null,
      onRangeSelect: null,
      onViewChange: null,
      onMonthChange: null,
      onYearChange: null,
      onDayRender: null,
      onTodayClick: null,
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
      currentDate: new Date(),
      selectedDate: null,
      selectedRange: { start: null, end: null },
      view: 'month',
      isRangeSelecting: false
    };
  }

  /**
   * 创建DOM元素
   * @private
   */
  _createElement() {
    // 创建主容器
    this.element = document.createElement('div');
    this.element.className = `jev-calendar jev-calendar-${this.options.theme}`;
    this.element.style.width = this.options.width;
    this.element.style.height = this.options.height;
    this.element.setAttribute('role', 'grid');
    this.element.setAttribute('aria-label', '日历');
    
    // 创建头部
    this._createHeader();
    
    // 创建视图容器
    this.viewContainer = document.createElement('div');
    this.viewContainer.className = 'jev-calendar-view-container';
    this.element.appendChild(this.viewContainer);
    
    // 创建页脚
    this._createFooter();
  }

  /**
   * 创建头部
   * @private
   */
  _createHeader() {
    this.headerElement = document.createElement('div');
    this.headerElement.className = 'jev-calendar-header';
    this.element.appendChild(this.headerElement);
    
    // 创建导航
    if (this.options.showNavigation) {
      this.navigationElement = document.createElement('div');
      this.navigationElement.className = 'jev-calendar-navigation';
      this.headerElement.appendChild(this.navigationElement);
      
      // 上一个按钮
      this.prevButton = document.createElement('button');
      this.prevButton.className = 'jev-calendar-nav-btn jev-calendar-prev-btn';
      this.prevButton.setAttribute('aria-label', '上一个');
      this.prevButton.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M15 18L9 12L15 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
      this.navigationElement.appendChild(this.prevButton);
      
      // 标题
      this.titleElement = document.createElement('h2');
      this.titleElement.className = 'jev-calendar-title';
      this.titleElement.setAttribute('role', 'heading');
      this.titleElement.setAttribute('aria-level', '2');
      this.navigationElement.appendChild(this.titleElement);
      
      // 下一个按钮
      this.nextButton = document.createElement('button');
      this.nextButton.className = 'jev-calendar-nav-btn jev-calendar-next-btn';
      this.nextButton.setAttribute('aria-label', '下一个');
      this.nextButton.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M9 18L15 12L9 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
      this.navigationElement.appendChild(this.nextButton);
      
      // 今天按钮
      if (this.options.showTodayButton) {
        this.todayButton = document.createElement('button');
        this.todayButton.className = 'jev-calendar-today-btn';
        this.todayButton.textContent = this.options.todayText;
        this.navigationElement.appendChild(this.todayButton);
      }
    }
    
    // 创建视图切换器
    if (this.options.showViewSwitcher) {
      this.viewsElement = document.createElement('div');
      this.viewsElement.className = 'jev-calendar-views';
      this.headerElement.appendChild(this.viewsElement);
      
      // 月视图按钮
      const monthViewBtn = document.createElement('button');
      monthViewBtn.className = 'jev-calendar-view-btn jev-calendar-view-month';
      monthViewBtn.textContent = this.options.viewSwitcherTexts.month;
      monthViewBtn.setAttribute('data-view', 'month');
      this.viewsElement.appendChild(monthViewBtn);
      
      // 周视图按钮
      const weekViewBtn = document.createElement('button');
      weekViewBtn.className = 'jev-calendar-view-btn jev-calendar-view-week';
      weekViewBtn.textContent = this.options.viewSwitcherTexts.week;
      weekViewBtn.setAttribute('data-view', 'week');
      this.viewsElement.appendChild(weekViewBtn);
      
      // 日视图按钮
      const dayViewBtn = document.createElement('button');
      dayViewBtn.className = 'jev-calendar-view-btn jev-calendar-view-day';
      dayViewBtn.textContent = this.options.viewSwitcherTexts.day;
      dayViewBtn.setAttribute('data-view', 'day');
      this.viewsElement.appendChild(dayViewBtn);
    }
  }

  /**
   * 创建页脚
   * @private
   */
  _createFooter() {
    this.footerElement = document.createElement('div');
    this.footerElement.className = 'jev-calendar-footer';
    this.element.appendChild(this.footerElement);
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
    
    // 设置最小/最大日期
    this.minDate = this.options.minDate ? new Date(this.options.minDate) : null;
    this.maxDate = this.options.maxDate ? new Date(this.options.maxDate) : null;
    
    // 设置禁用日期
    if (Array.isArray(this.options.disabledDates)) {
      this.disabledDates = this.options.disabledDates.map(date => new Date(date));
    }
    
    // 设置高亮日期
    if (Array.isArray(this.options.highlightedDates)) {
      this.highlightedDates = this.options.highlightedDates.map(date => new Date(date));
    }
    
    // 初始化视图
    this.view = this.options.view || 'month';
    
    // 渲染日历
    this.render();
    
    // 触发初始化回调
    if (typeof this.options.onInit === 'function') {
      try {
        this.options.onInit();
      } catch (error) {
        logger.error('日历初始化回调执行失败', error);
      }
    }
  }

  /**
   * 添加全局样式
   * @private
   */
  _addGlobalStyles() {
    const styleId = 'jev-calendar-styles';
    if (document.getElementById(styleId)) {
      return;
    }
    
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      /* 日历容器样式 */
      .jev-calendar {
        background-color: #fff;
        border-radius: 8px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        overflow: hidden;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      }
      
      /* 主题样式 - 默认 */
      .jev-calendar-default {
        background-color: #fff;
        color: #333;
      }
      
      /* 主题样式 - 深色 */
      .jev-calendar-dark {
        background-color: #2d3748;
        color: #e2e8f0;
      }
      
      /* 主题样式 - 霓虹灯 */
      .jev-calendar-neon {
        background-color: #1a1a1a;
        color: #00ff99;
        border: 1px solid rgba(0, 255, 153, 0.2);
        box-shadow: 0 0 20px rgba(0, 255, 153, 0.1);
      }
      
      /* 头部样式 */
      .jev-calendar-header {
        padding: 15px;
        border-bottom: 1px solid #e2e8f0;
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      
      .jev-calendar-dark .jev-calendar-header {
        border-bottom-color: #4a5568;
      }
      
      .jev-calendar-neon .jev-calendar-header {
        border-bottom-color: rgba(0, 255, 153, 0.3);
      }
      
      /* 导航样式 */
      .jev-calendar-navigation {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
      }
      
      /* 导航按钮 */
      .jev-calendar-nav-btn {
        width: 36px;
        height: 36px;
        border: none;
        background-color: transparent;
        color: inherit;
        border-radius: 50%;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
        flex-shrink: 0;
      }
      
      .jev-calendar-nav-btn:hover {
        background-color: rgba(0, 0, 0, 0.05);
      }
      
      .jev-calendar-dark .jev-calendar-nav-btn:hover {
        background-color: rgba(255, 255, 255, 0.1);
      }
      
      .jev-calendar-neon .jev-calendar-nav-btn:hover {
        background-color: rgba(0, 255, 153, 0.1);
        box-shadow: 0 0 10px rgba(0, 255, 153, 0.2);
      }
      
      /* 标题样式 */
      .jev-calendar-title {
        font-size: 18px;
        font-weight: 600;
        margin: 0;
        text-align: center;
        flex: 1;
      }
      
      /* 今天按钮 */
      .jev-calendar-today-btn {
        padding: 6px 12px;
        border: 1px solid #007bff;
        background-color: #007bff;
        color: white;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
        transition: all 0.2s ease;
        flex-shrink: 0;
      }
      
      .jev-calendar-today-btn:hover {
        background-color: #0056b3;
        border-color: #0056b3;
      }
      
      .jev-calendar-dark .jev-calendar-today-btn {
        border-color: #38b2ac;
        background-color: #38b2ac;
      }
      
      .jev-calendar-dark .jev-calendar-today-btn:hover {
        background-color: #319795;
        border-color: #319795;
      }
      
      .jev-calendar-neon .jev-calendar-today-btn {
        border-color: #00ff99;
        background-color: transparent;
        color: #00ff99;
        box-shadow: 0 0 10px rgba(0, 255, 153, 0.3);
      }
      
      .jev-calendar-neon .jev-calendar-today-btn:hover {
        background-color: rgba(0, 255, 153, 0.2);
        box-shadow: 0 0 20px rgba(0, 255, 153, 0.5);
      }
      
      /* 视图切换器 */
      .jev-calendar-views {
        display: flex;
        gap: 5px;
        justify-content: center;
      }
      
      /* 视图按钮 */
      .jev-calendar-view-btn {
        padding: 6px 12px;
        border: 1px solid #e2e8f0;
        background-color: transparent;
        color: inherit;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
        transition: all 0.2s ease;
      }
      
      .jev-calendar-view-btn.active {
        background-color: #007bff;
        border-color: #007bff;
        color: white;
      }
      
      .jev-calendar-view-btn:hover:not(.active) {
        background-color: rgba(0, 0, 0, 0.05);
      }
      
      .jev-calendar-dark .jev-calendar-view-btn {
        border-color: #4a5568;
      }
      
      .jev-calendar-dark .jev-calendar-view-btn:hover:not(.active) {
        background-color: rgba(255, 255, 255, 0.1);
      }
      
      .jev-calendar-dark .jev-calendar-view-btn.active {
        background-color: #38b2ac;
        border-color: #38b2ac;
      }
      
      .jev-calendar-neon .jev-calendar-view-btn {
        border-color: rgba(0, 255, 153, 0.3);
      }
      
      .jev-calendar-neon .jev-calendar-view-btn:hover:not(.active) {
        background-color: rgba(0, 255, 153, 0.1);
        box-shadow: 0 0 10px rgba(0, 255, 153, 0.2);
      }
      
      .jev-calendar-neon .jev-calendar-view-btn.active {
        background-color: rgba(0, 255, 153, 0.2);
        border-color: #00ff99;
        color: #00ff99;
        box-shadow: 0 0 15px rgba(0, 255, 153, 0.4);
      }
      
      /* 视图容器 */
      .jev-calendar-view-container {
        position: relative;
      }
      
      /* 星期标题 */
      .jev-calendar-weekdays {
        display: grid;
        grid-template-columns: repeat(7, 1fr);
        gap: 1px;
        background-color: #e2e8f0;
      }
      
      .jev-calendar-dark .jev-calendar-weekdays {
        background-color: #4a5568;
      }
      
      .jev-calendar-neon .jev-calendar-weekdays {
        background-color: rgba(0, 255, 153, 0.3);
      }
      
      .jev-calendar-weekday {
        padding: 10px;
        text-align: center;
        font-weight: 600;
        font-size: 14px;
        background-color: #f7fafc;
      }
      
      .jev-calendar-dark .jev-calendar-weekday {
        background-color: #374151;
      }
      
      .jev-calendar-neon .jev-calendar-weekday {
        background-color: rgba(0, 255, 153, 0.05);
      }
      
      /* 日期网格 */
      .jev-calendar-days {
        display: grid;
        grid-template-columns: repeat(7, 1fr);
        gap: 1px;
        background-color: #e2e8f0;
      }
      
      .jev-calendar-dark .jev-calendar-days {
        background-color: #4a5568;
      }
      
      .jev-calendar-neon .jev-calendar-days {
        background-color: rgba(0, 255, 153, 0.3);
      }
      
      /* 日期单元格 */
      .jev-calendar-day {
        padding: 12px 8px;
        min-height: 60px;
        background-color: white;
        border: none;
        cursor: pointer;
        text-align: center;
        transition: all 0.2s ease;
        position: relative;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        font-size: 14px;
      }
      
      .jev-calendar-day:hover:not(.jev-calendar-day-disabled) {
        background-color: #f7fafc;
      }
      
      .jev-calendar-dark .jev-calendar-day {
        background-color: #374151;
      }
      
      .jev-calendar-dark .jev-calendar-day:hover:not(.jev-calendar-day-disabled) {
        background-color: #4b5563;
      }
      
      .jev-calendar-neon .jev-calendar-day {
        background-color: rgba(0, 255, 153, 0.05);
      }
      
      .jev-calendar-neon .jev-calendar-day:hover:not(.jev-calendar-day-disabled) {
        background-color: rgba(0, 255, 153, 0.1);
        box-shadow: 0 0 10px rgba(0, 255, 153, 0.2);
      }
      
      /* 其他月份的日期 */
      .jev-calendar-day-other-month {
        color: #a0aec0;
        background-color: #f7fafc;
      }
      
      .jev-calendar-dark .jev-calendar-day-other-month {
        color: #718096;
        background-color: #2d3748;
      }
      
      .jev-calendar-neon .jev-calendar-day-other-month {
        color: #00ff9966;
        background-color: rgba(0, 255, 153, 0.02);
      }
      
      /* 今天 */
      .jev-calendar-day-today {
        font-weight: 600;
        background-color: #ebf8ff;
      }
      
      .jev-calendar-dark .jev-calendar-day-today {
        background-color: #2b6cb0;
      }
      
      .jev-calendar-neon .jev-calendar-day-today {
        background-color: rgba(0, 255, 153, 0.2);
        box-shadow: 0 0 15px rgba(0, 255, 153, 0.3);
      }
      
      /* 选中的日期 */
      .jev-calendar-day-selected {
        background-color: #007bff;
        color: white;
      }
      
      .jev-calendar-dark .jev-calendar-day-selected {
        background-color: #38b2ac;
      }
      
      .jev-calendar-neon .jev-calendar-day-selected {
        background-color: rgba(0, 255, 153, 0.3);
        box-shadow: 0 0 20px rgba(0, 255, 153, 0.5);
      }
      
      /* 范围选择的日期 */
      .jev-calendar-day-range-start {
        background-color: #007bff;
        color: white;
        border-radius: 4px 0 0 4px;
      }
      
      .jev-calendar-day-range-middle {
        background-color: #e3f2fd;
        color: #0d47a1;
      }
      
      .jev-calendar-day-range-end {
        background-color: #007bff;
        color: white;
        border-radius: 0 4px 4px 0;
      }
      
      .jev-calendar-dark .jev-calendar-day-range-start,
      .jev-calendar-dark .jev-calendar-day-range-end {
        background-color: #38b2ac;
      }
      
      .jev-calendar-dark .jev-calendar-day-range-middle {
        background-color: #285e61;
        color: #81e6d9;
      }
      
      .jev-calendar-neon .jev-calendar-day-range-start,
      .jev-calendar-neon .jev-calendar-day-range-end {
        background-color: rgba(0, 255, 153, 0.3);
        box-shadow: 0 0 15px rgba(0, 255, 153, 0.4);
      }
      
      .jev-calendar-neon .jev-calendar-day-range-middle {
        background-color: rgba(0, 255, 153, 0.1);
        box-shadow: 0 0 5px rgba(0, 255, 153, 0.2);
      }
      
      /* 禁用的日期 */
      .jev-calendar-day-disabled {
        color: #a0aec0;
        background-color: #f7fafc;
        cursor: not-allowed;
        opacity: 0.5;
      }
      
      .jev-calendar-dark .jev-calendar-day-disabled {
        color: #718096;
        background-color: #2d3748;
      }
      
      .jev-calendar-neon .jev-calendar-day-disabled {
        color: #00ff9933;
        background-color: rgba(0, 255, 153, 0.02);
      }
      
      /* 高亮的日期 */
      .jev-calendar-day-highlighted {
        position: relative;
      }
      
      .jev-calendar-day-highlighted::after {
        content: '';
        position: absolute;
        bottom: 5px;
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background-color: #007bff;
      }
      
      .jev-calendar-dark .jev-calendar-day-highlighted::after {
        background-color: #38b2ac;
      }
      
      .jev-calendar-neon .jev-calendar-day-highlighted::after {
        background-color: #00ff99;
        box-shadow: 0 0 8px rgba(0, 255, 153, 0.8);
      }
      
      /* 周末日期 */
      .jev-calendar-day-weekend {
        font-weight: 500;
      }
      
      .jev-calendar-default .jev-calendar-day-weekend {
        color: #e53e3e;
      }
      
      .jev-calendar-dark .jev-calendar-day-weekend {
        color: #fc8181;
      }
      
      .jev-calendar-neon .jev-calendar-day-weekend {
        color: #ff6b6b;
      }
      
      /* 周数 */
      .jev-calendar-week-numbers {
        display: flex;
        flex-direction: column;
        background-color: #f7fafc;
      }
      
      .jev-calendar-dark .jev-calendar-week-numbers {
        background-color: #374151;
      }
      
      .jev-calendar-neon .jev-calendar-week-numbers {
        background-color: rgba(0, 255, 153, 0.05);
      }
      
      .jev-calendar-week-number {
        padding: 12px 8px;
        text-align: center;
        font-size: 12px;
        color: #718096;
        border-bottom: 1px solid #e2e8f0;
      }
      
      .jev-calendar-dark .jev-calendar-week-number {
        color: #a0aec0;
        border-bottom-color: #4a5568;
      }
      
      .jev-calendar-neon .jev-calendar-week-number {
        color: #00ff9966;
        border-bottom-color: rgba(0, 255, 153, 0.3);
      }
      
      /* 页脚样式 */
      .jev-calendar-footer {
        padding: 10px 15px;
        border-top: 1px solid #e2e8f0;
        text-align: center;
        font-size: 12px;
        color: #718096;
      }
      
      .jev-calendar-dark .jev-calendar-footer {
        border-top-color: #4a5568;
        color: #a0aec0;
      }
      
      .jev-calendar-neon .jev-calendar-footer {
        border-top-color: rgba(0, 255, 153, 0.3);
        color: #00ff9966;
      }
      
      /* 加载状态 */
      .jev-calendar-loading {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 40px;
        color: #718096;
      }
      
      .jev-calendar-dark .jev-calendar-loading {
        color: #a0aec0;
      }
      
      .jev-calendar-neon .jev-calendar-loading {
        color: #00ff9966;
      }
      
      /* 响应式设计 */
      @media (max-width: 768px) {
        .jev-calendar-header {
          padding: 10px;
        }
        
        .jev-calendar-title {
          font-size: 16px;
        }
        
        .jev-calendar-nav-btn {
          width: 32px;
          height: 32px;
        }
        
        .jev-calendar-day {
          padding: 8px 4px;
          min-height: 50px;
          font-size: 13px;
        }
        
        .jev-calendar-today-btn {
          padding: 5px 10px;
          font-size: 13px;
        }
        
        .jev-calendar-view-btn {
          padding: 5px 10px;
          font-size: 13px;
        }
      }
      
      @media (max-width: 480px) {
        .jev-calendar-day {
          padding: 6px 2px;
          min-height: 40px;
          font-size: 12px;
        }
        
        .jev-calendar-weekday {
          padding: 8px 4px;
          font-size: 12px;
        }
        
        .jev-calendar-navigation {
          flex-wrap: wrap;
        }
        
        .jev-calendar-today-btn {
          order: 3;
          width: 100%;
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
    // 导航按钮事件
    if (this.prevButton) {
      this.prevButton.addEventListener('click', () => this.prev());
    }
    
    if (this.nextButton) {
      this.nextButton.addEventListener('click', () => this.next());
    }
    
    // 今天按钮事件
    if (this.todayButton) {
      this.todayButton.addEventListener('click', () => this.today());
    }
    
    // 视图切换器事件
    if (this.viewsElement) {
      this.viewsElement.addEventListener('click', (e) => {
        if (e.target.classList.contains('jev-calendar-view-btn')) {
          const view = e.target.getAttribute('data-view');
          this.switchView(view);
        }
      });
    }
  }

  /**
   * 渲染日历
   */
  render() {
    // 清空视图容器
    this.viewContainer.innerHTML = '';
    
    // 更新标题
    this._updateTitle();
    
    // 更新视图按钮状态
    this._updateViewButtons();
    
    // 根据视图类型渲染
    switch (this.view) {
      case 'month':
        this._renderMonthView();
        break;
      case 'week':
        this._renderWeekView();
        break;
      case 'day':
        this._renderDayView();
        break;
      default:
        this._renderMonthView();
    }
  }

  /**
   * 更新标题
   * @private
   */
  _updateTitle() {
    if (!this.titleElement) return;
    
    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();
    
    this.titleElement.textContent = `${year}年${this.options.monthNames[month]}`;
  }

  /**
   * 更新视图按钮状态
   * @private
   */
  _updateViewButtons() {
    if (!this.viewsElement) return;
    
    const buttons = this.viewsElement.querySelectorAll('.jev-calendar-view-btn');
    buttons.forEach(button => {
      const view = button.getAttribute('data-view');
      if (view === this.view) {
        button.classList.add('active');
      } else {
        button.classList.remove('active');
      }
    });
  }

  /**
   * 渲染月视图
   * @private
   */
  _renderMonthView() {
    // 创建星期标题
    this._createWeekdaysHeader();
    
    // 创建日期网格
    this._createDaysGrid();
  }

  /**
   * 渲染周视图
   * @private
   */
  _renderWeekView() {
    // 创建星期标题
    this._createWeekdaysHeader();
    
    // 创建日期网格
    this._createWeekGrid();
  }

  /**
   * 渲染日视图
   * @private
   */
  _renderDayView() {
    // 创建日视图容器
    const dayViewContainer = document.createElement('div');
    dayViewContainer.className = 'jev-calendar-day-view';
    this.viewContainer.appendChild(dayViewContainer);
    
    // 创建日期标题
    const dateHeader = document.createElement('div');
    dateHeader.className = 'jev-calendar-day-header';
    dateHeader.textContent = this._formatDate(this.currentDate);
    dayViewContainer.appendChild(dateHeader);
    
    // 可以在这里添加小时网格等更多日视图功能
  }

  /**
   * 创建星期标题
   * @private
   */
  _createWeekdaysHeader() {
    this.weekdaysElement = document.createElement('div');
    this.weekdaysElement.className = 'jev-calendar-weekdays';
    this.viewContainer.appendChild(this.weekdaysElement);
    
    // 计算星期标题的起始位置
    for (let i = 0; i < 7; i++) {
      const weekdayIndex = (i + this.options.weekStart) % 7;
      const weekday = document.createElement('div');
      weekday.className = `jev-calendar-weekday ${this._isWeekend(weekdayIndex) ? 'jev-calendar-weekday-weekend' : ''}`;
      weekday.textContent = this.options.dayNames[weekdayIndex];
      this.weekdaysElement.appendChild(weekday);
    }
  }

  /**
   * 创建日期网格
   * @private
   */
  _createDaysGrid() {
    this.daysElement = document.createElement('div');
    this.daysElement.className = 'jev-calendar-days';
    this.viewContainer.appendChild(this.daysElement);
    
    // 获取当月第一天和最后一天
    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();
    
    // 当月第一天
    const firstDayOfMonth = new Date(year, month, 1);
    // 当月最后一天
    const lastDayOfMonth = new Date(year, month + 1, 0);
    
    // 计算需要显示的第一天（上个月的日期）
    const firstDayOfWeek = firstDayOfMonth.getDay();
    const daysFromPrevMonth = (firstDayOfWeek - this.options.weekStart + 7) % 7;
    const firstDisplayDay = new Date(firstDayOfMonth);
    firstDisplayDay.setDate(firstDayOfMonth.getDate() - daysFromPrevMonth);
    
    // 计算需要显示的最后一天（下个月的日期）
    const lastDayOfWeek = lastDayOfMonth.getDay();
    const daysFromNextMonth = (7 - ((lastDayOfWeek - this.options.weekStart + 7) % 7) - 1 + 7) % 7;
    const lastDisplayDay = new Date(lastDayOfMonth);
    lastDisplayDay.setDate(lastDayOfMonth.getDate() + daysFromNextMonth);
    
    // 存储当前显示范围
    this.firstDay = firstDisplayDay;
    this.lastDay = lastDisplayDay;
    
    // 生成日期单元格
    let currentDay = new Date(firstDisplayDay);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    while (currentDay <= lastDisplayDay) {
      const dayElement = this._createDayElement(currentDay, year, month, today);
      this.daysElement.appendChild(dayElement);
      
      // 移动到下一天
      currentDay.setDate(currentDay.getDate() + 1);
    }
  }

  /**
   * 创建周网格
   * @private
   */
  _createWeekGrid() {
    this.daysElement = document.createElement('div');
    this.daysElement.className = 'jev-calendar-days';
    this.viewContainer.appendChild(this.daysElement);
    
    // 获取当前日期所在的周
    const currentDate = new Date(this.currentDate);
    const dayOfWeek = currentDate.getDay();
    const diff = (dayOfWeek - this.options.weekStart + 7) % 7;
    
    // 本周第一天
    const firstDayOfWeek = new Date(currentDate);
    firstDayOfWeek.setDate(currentDate.getDate() - diff);
    
    // 生成一周的日期
    for (let i = 0; i < 7; i++) {
      const currentDay = new Date(firstDayOfWeek);
      currentDay.setDate(firstDayOfWeek.getDate() + i);
      
      const year = currentDay.getFullYear();
      const month = currentDay.getMonth();
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const dayElement = this._createDayElement(currentDay, year, month, today);
      this.daysElement.appendChild(dayElement);
    }
  }

  /**
   * 创建日期元素
   * @private
   */
  _createDayElement(date, currentYear, currentMonth, today) {
    const dayElement = document.createElement('button');
    dayElement.className = 'jev-calendar-day';
    dayElement.setAttribute('type', 'button');
    dayElement.setAttribute('aria-label', `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`);
    
    // 设置日期文本
    const dayText = document.createElement('span');
    dayText.textContent = date.getDate();
    dayElement.appendChild(dayText);
    
    // 克隆日期对象并重置时间部分，用于比较
    const dateWithoutTime = new Date(date);
    dateWithoutTime.setHours(0, 0, 0, 0);
    
    const todayWithoutTime = new Date(today);
    todayWithoutTime.setHours(0, 0, 0, 0);
    
    // 标记其他月份的日期
    if (date.getMonth() !== currentMonth) {
      dayElement.classList.add('jev-calendar-day-other-month');
    }
    
    // 标记今天
    if (dateWithoutTime.getTime() === todayWithoutTime.getTime()) {
      dayElement.classList.add('jev-calendar-day-today');
    }
    
    // 标记周末
    const dayOfWeek = date.getDay();
    if (this._isWeekend(dayOfWeek)) {
      dayElement.classList.add('jev-calendar-day-weekend');
    }
    
    // 检查是否在禁用日期列表中
    const isDisabled = this._isDateDisabled(dateWithoutTime);
    if (isDisabled) {
      dayElement.classList.add('jev-calendar-day-disabled');
      dayElement.disabled = true;
    }
    
    // 检查是否在高亮日期列表中
    if (this._isDateHighlighted(dateWithoutTime)) {
      dayElement.classList.add('jev-calendar-day-highlighted');
    }
    
    // 检查是否在选中范围中
    if (this.options.enableRangeSelection && this.selectedRange.start && this.selectedRange.end) {
      const isInRange = this._isDateInRange(dateWithoutTime, this.selectedRange.start, this.selectedRange.end);
      
      if (isInRange) {
        const isStart = dateWithoutTime.getTime() === this.selectedRange.start.getTime();
        const isEnd = dateWithoutTime.getTime() === this.selectedRange.end.getTime();
        
        if (isStart) {
          dayElement.classList.add('jev-calendar-day-range-start');
        } else if (isEnd) {
          dayElement.classList.add('jev-calendar-day-range-end');
        } else {
          dayElement.classList.add('jev-calendar-day-range-middle');
        }
      }
    }
    // 检查是否为选中的日期（单选模式）
    else if (this.selectedDate && !isDisabled) {
      const selectedDateWithoutTime = new Date(this.selectedDate);
      selectedDateWithoutTime.setHours(0, 0, 0, 0);
      
      if (dateWithoutTime.getTime() === selectedDateWithoutTime.getTime()) {
        dayElement.classList.add('jev-calendar-day-selected');
      }
    }
    
    // 添加点击事件
    if (!isDisabled && this.options.selectable) {
      dayElement.addEventListener('click', () => this._handleDayClick(date));
    }
    
    // 触发日期渲染回调
    if (typeof this.options.onDayRender === 'function') {
      try {
        this.options.onDayRender(date, dayElement);
      } catch (error) {
        logger.error('日期渲染回调执行失败', error);
      }
    }
    
    return dayElement;
  }

  /**
   * 处理日期点击
   * @private
   */
  _handleDayClick(date) {
    const dateWithoutTime = new Date(date);
    dateWithoutTime.setHours(0, 0, 0, 0);
    
    if (this.options.enableRangeSelection) {
      this._handleRangeSelection(dateWithoutTime);
    } else {
      this._handleSingleSelection(dateWithoutTime);
    }
  }

  /**
   * 处理单选
   * @private
   */
  _handleSingleSelection(date) {
    this.selectedDate = date;
    this.updateState({ selectedDate: date });
    
    // 重新渲染以更新选中状态
    this.render();
    
    // 触发日期选择回调
    if (typeof this.options.onDateSelect === 'function') {
      try {
        this.options.onDateSelect(date);
      } catch (error) {
        logger.error('日期选择回调执行失败', error);
      }
    }
  }

  /**
   * 处理范围选择
   * @private
   */
  _handleRangeSelection(date) {
    if (!this.isRangeSelecting) {
      // 开始范围选择
      this.isRangeSelecting = true;
      this.selectedRange.start = date;
      this.selectedRange.end = null;
    } else {
      // 结束范围选择
      this.isRangeSelecting = false;
      
      // 确保开始日期小于结束日期
      if (date < this.selectedRange.start) {
        this.selectedRange.end = this.selectedRange.start;
        this.selectedRange.start = date;
      } else {
        this.selectedRange.end = date;
      }
      
      // 触发范围选择回调
      if (typeof this.options.onRangeSelect === 'function') {
        try {
          this.options.onRangeSelect(this.selectedRange.start, this.selectedRange.end);
        } catch (error) {
          logger.error('范围选择回调执行失败', error);
        }
      }
    }
    
    this.updateState({
      selectedRange: { ...this.selectedRange },
      isRangeSelecting: this.isRangeSelecting
    });
    
    // 重新渲染以更新选中状态
    this.render();
  }

  /**
   * 检查是否为周末
   * @private
   */
  _isWeekend(dayOfWeek) {
    return dayOfWeek === 0 || dayOfWeek === 6; // 0 = Sunday, 6 = Saturday
  }

  /**
   * 检查日期是否禁用
   * @private
   */
  _isDateDisabled(date) {
    // 检查最小/最大日期限制
    if (this.minDate && date < this.minDate) return true;
    if (this.maxDate && date > this.maxDate) return true;
    
    // 检查禁用日期列表
    return this.disabledDates.some(disabledDate => {
      const d = new Date(disabledDate);
      d.setHours(0, 0, 0, 0);
      return date.getTime() === d.getTime();
    });
  }

  /**
   * 检查日期是否高亮
   * @private
   */
  _isDateHighlighted(date) {
    return this.highlightedDates.some(highlightedDate => {
      const d = new Date(highlightedDate);
      d.setHours(0, 0, 0, 0);
      return date.getTime() === d.getTime();
    });
  }

  /**
   * 检查日期是否在范围内
   * @private
   */
  _isDateInRange(date, start, end) {
    return date >= start && date <= end;
  }

  /**
   * 格式化日期
   * @private
   */
  _formatDate(date) {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    
    return `${year}年${month}月${day}日`;
  }

  /**
   * 前进
   */
  next() {
    const newDate = new Date(this.currentDate);
    
    switch (this.view) {
      case 'month':
        newDate.setMonth(newDate.getMonth() + 1);
        break;
      case 'week':
        newDate.setDate(newDate.getDate() + 7);
        break;
      case 'day':
        newDate.setDate(newDate.getDate() + 1);
        break;
    }
    
    this.currentDate = newDate;
    this.updateState({ currentDate: newDate });
    
    this.render();
    
    // 触发月份变化回调
    if (this.view === 'month' && typeof this.options.onMonthChange === 'function') {
      try {
        this.options.onMonthChange(newDate);
      } catch (error) {
        logger.error('月份变化回调执行失败', error);
      }
    }
  }

  /**
   * 后退
   */
  prev() {
    const newDate = new Date(this.currentDate);
    
    switch (this.view) {
      case 'month':
        newDate.setMonth(newDate.getMonth() - 1);
        break;
      case 'week':
        newDate.setDate(newDate.getDate() - 7);
        break;
      case 'day':
        newDate.setDate(newDate.getDate() - 1);
        break;
    }
    
    this.currentDate = newDate;
    this.updateState({ currentDate: newDate });
    
    this.render();
    
    // 触发月份变化回调
    if (this.view === 'month' && typeof this.options.onMonthChange === 'function') {
      try {
        this.options.onMonthChange(newDate);
      } catch (error) {
        logger.error('月份变化回调执行失败', error);
      }
    }
  }

  /**
   * 跳转到今天
   */
  today() {
    this.currentDate = new Date();
    this.updateState({ currentDate: this.currentDate });
    
    this.render();
    
    // 触发今天点击回调
    if (typeof this.options.onTodayClick === 'function') {
      try {
        this.options.onTodayClick(this.currentDate);
      } catch (error) {
        logger.error('今天点击回调执行失败', error);
      }
    }
  }

  /**
   * 切换视图
   * @param {string} view - 视图类型
   */
  switchView(view) {
    if (view === this.view) return;
    
    this.view = view;
    this.updateState({ view });
    
    this.render();
    
    // 触发视图变化回调
    if (typeof this.options.onViewChange === 'function') {
      try {
        this.options.onViewChange(view);
      } catch (error) {
        logger.error('视图变化回调执行失败', error);
      }
    }
  }

  /**
   * 跳转到指定日期
   * @param {Date} date - 目标日期
   */
  goToDate(date) {
    this.currentDate = new Date(date);
    this.updateState({ currentDate: this.currentDate });
    
    this.render();
  }

  /**
   * 选择日期
   * @param {Date} date - 要选择的日期
   */
  selectDate(date) {
    const dateWithoutTime = new Date(date);
    dateWithoutTime.setHours(0, 0, 0, 0);
    
    // 检查日期是否可用
    if (this._isDateDisabled(dateWithoutTime)) {
      return;
    }
    
    this._handleSingleSelection(dateWithoutTime);
  }

  /**
   * 选择日期范围
   * @param {Date} startDate - 开始日期
   * @param {Date} endDate - 结束日期
   */
  selectRange(startDate, endDate) {
    if (!this.options.enableRangeSelection) {
      return;
    }
    
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    
    const end = new Date(endDate);
    end.setHours(0, 0, 0, 0);
    
    // 确保开始日期小于结束日期
    if (start > end) {
      const temp = start;
      start = end;
      end = temp;
    }
    
    this.selectedRange.start = start;
    this.selectedRange.end = end;
    this.isRangeSelecting = false;
    
    this.updateState({
      selectedRange: { ...this.selectedRange },
      isRangeSelecting: false
    });
    
    this.render();
    
    // 触发范围选择回调
    if (typeof this.options.onRangeSelect === 'function') {
      try {
        this.options.onRangeSelect(start, end);
      } catch (error) {
        logger.error('范围选择回调执行失败', error);
      }
    }
  }

  /**
   * 清除选择
   */
  clearSelection() {
    this.selectedDate = null;
    this.selectedRange.start = null;
    this.selectedRange.end = null;
    this.isRangeSelecting = false;
    
    this.updateState({
      selectedDate: null,
      selectedRange: { start: null, end: null },
      isRangeSelecting: false
    });
    
    this.render();
  }

  /**
   * 添加禁用日期
   * @param {Date} date - 禁用的日期
   */
  addDisabledDate(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    
    // 检查是否已存在
    const exists = this.disabledDates.some(disabledDate => {
      const disabled = new Date(disabledDate);
      disabled.setHours(0, 0, 0, 0);
      return d.getTime() === disabled.getTime();
    });
    
    if (!exists) {
      this.disabledDates.push(d);
      this.render();
    }
  }

  /**
   * 移除禁用日期
   * @param {Date} date - 要移除的禁用日期
   */
  removeDisabledDate(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    
    this.disabledDates = this.disabledDates.filter(disabledDate => {
      const disabled = new Date(disabledDate);
      disabled.setHours(0, 0, 0, 0);
      return d.getTime() !== disabled.getTime();
    });
    
    this.render();
  }

  /**
   * 清空禁用日期
   */
  clearDisabledDates() {
    this.disabledDates = [];
    this.render();
  }

  /**
   * 添加高亮日期
   * @param {Date} date - 要高亮的日期
   */
  addHighlightedDate(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    
    // 检查是否已存在
    const exists = this.highlightedDates.some(highlightedDate => {
      const highlighted = new Date(highlightedDate);
      highlighted.setHours(0, 0, 0, 0);
      return d.getTime() === highlighted.getTime();
    });
    
    if (!exists) {
      this.highlightedDates.push(d);
      this.render();
    }
  }

  /**
   * 移除高亮日期
   * @param {Date} date - 要移除的高亮日期
   */
  removeHighlightedDate(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    
    this.highlightedDates = this.highlightedDates.filter(highlightedDate => {
      const highlighted = new Date(highlightedDate);
      highlighted.setHours(0, 0, 0, 0);
      return d.getTime() !== highlighted.getTime();
    });
    
    this.render();
  }

  /**
   * 清空高亮日期
   */
  clearHighlightedDates() {
    this.highlightedDates = [];
    this.render();
  }

  /**
   * 设置最小日期
   * @param {Date} date - 最小日期
   */
  setMinDate(date) {
    this.minDate = date ? new Date(date) : null;
    this.render();
  }

  /**
   * 设置最大日期
   * @param {Date} date - 最大日期
   */
  setMaxDate(date) {
    this.maxDate = date ? new Date(date) : null;
    this.render();
  }

  /**
   * 设置主题
   * @param {string} theme - 主题名称
   */
  setTheme(theme) {
    this.element.classList.remove(`jev-calendar-${this.options.theme}`);
    this.element.classList.add(`jev-calendar-${theme}`);
    this.options.theme = theme;
  }

  /**
   * 获取选中的日期
   * @returns {Date|null} 选中的日期
   */
  getSelectedDate() {
    return this.selectedDate ? new Date(this.selectedDate) : null;
  }

  /**
   * 获取选中的日期范围
   * @returns {Object|null} 选中的日期范围
   */
  getSelectedRange() {
    if (!this.selectedRange.start || !this.selectedRange.end) {
      return null;
    }
    
    return {
      start: new Date(this.selectedRange.start),
      end: new Date(this.selectedRange.end)
    };
  }

  /**
   * 获取当前显示的月份
   * @returns {Date} 当前日期
   */
  getCurrentDate() {
    return new Date(this.currentDate);
  }

  /**
   * 获取当前视图
   * @returns {string} 当前视图
   */
  getCurrentView() {
    return this.view;
  }

  /**
   * 获取当前显示的日期范围
   * @returns {Object} 显示范围
   */
  getVisibleRange() {
    return {
      start: this.firstDay ? new Date(this.firstDay) : null,
      end: this.lastDay ? new Date(this.lastDay) : null
    };
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
      this.navigationElement = null;
      this.prevButton = null;
      this.nextButton = null;
      this.titleElement = null;
      this.todayButton = null;
      this.viewsElement = null;
      this.weekdaysElement = null;
      this.daysElement = null;
      this.footerElement = null;
      
    } catch (error) {
      logger.error('日历组件销毁失败', error);
    }
  }
}

export default Calendar;