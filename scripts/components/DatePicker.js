/**
 * DatePicker日期选择器组件
 * 提供灵活的日期选择功能，支持范围选择和多种日期格式
 */
import BaseComponent from './base-component.js';
import Calendar from './Calendar.js';
import logger from '../utils/logger.js';
import { formatDate, parseDate } from '../utils/date-utils.js';

class DatePicker extends BaseComponent {
  /**
   * 构造函数
   * @param {Object} options - 配置选项
   * @param {HTMLElement} container - 容器元素
   */
  constructor(options = {}, container = document.body) {
    super(options, container);
    
    // 组件元素引用
    this.inputElement = null;
    this.iconElement = null;
    this.pickerElement = null;
    this.calendarInstance = null;
    this.calendarContainer = null;
    
    // 状态管理
    this.selectedDate = null;
    this.selectedRange = null;
    this.isOpen = false;
    this.isRange = false;
    this.isMultiSelect = false;
    this.minDate = null;
    this.maxDate = null;
    this.disabledDates = [];
    this.highlightedDates = [];
    
    // 格式化配置
    this.format = 'YYYY-MM-DD';
    this.parseFormat = 'YYYY-MM-DD';
  }

  /**
   * 获取默认配置
   * @private
   */
  _getDefaultOptions() {
    return {
      ...super._getDefaultOptions(),
      value: null, // 初始日期值
      format: 'YYYY-MM-DD', // 显示格式
      parseFormat: 'YYYY-MM-DD', // 解析格式
      placeholder: '请选择日期',
      clearable: true,
      editable: true,
      showIcon: true,
      icon: '📅',
      iconPosition: 'right', // left, right
      width: '280px',
      theme: 'default', // default, dark, neon
      size: 'medium', // small, medium, large
      autoClose: true,
      closeOnSelect: true,
      range: false, // 是否为范围选择
      multiSelect: false, // 是否多选
      minDate: null,
      maxDate: null,
      disabledDates: [],
      disabledDays: [], // [0, 6] 禁用周日和周六
      highlightedDates: [],
      highlightedDays: [],
      highlightToday: true,
      showWeekNumbers: false,
      weekStart: 0, // 0=Sunday, 1=Monday
      firstDay: 1, // 1=Monday, 0=Sunday
      monthFormat: 'YYYY年MM月',
      yearRange: [1900, 2100],
      showTime: false,
      timeFormat: 'HH:mm',
      showSeconds: false,
      showMonthSelector: true,
      showYearSelector: true,
      showPreviousYears: 50,
      showNextYears: 50,
      todayButton: true,
      todayText: '今天',
      clearButton: true,
      clearText: '清除',
      confirmButton: false,
      confirmText: '确定',
      okButtonText: '确定',
      cancelButtonText: '取消',
      enableKeyboardNavigation: true,
      autoPosition: true,
      position: 'bottom-left', // bottom-left, bottom-right, top-left, top-right
      zIndex: 1000,
      dropdownAnimation: true,
      animationDuration: 300,
      inputClasses: '',
      inputStyle: {},
      disabled: false,
      readonly: false,
      onSelect: null,
      onRangeSelect: null,
      onOpen: null,
      onClose: null,
      onChange: null,
      onClear: null,
      onError: null,
      onToday: null,
      onMonthChange: null,
      onYearChange: null,
      onFocus: null,
      onBlur: null,
      onInit: null,
      validateInput: null
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
      selectedDate: this.options.value ? this._parseValue(this.options.value) : null,
      selectedRange: this.options.range ? (this.options.value ? this._parseRange(this.options.value) : null) : null,
      isRange: this.options.range,
      isMultiSelect: this.options.multiSelect,
      disabled: this.options.disabled
    };
  }

  /**
   * 创建DOM元素
   * @private
   */
  _createElement() {
    // 创建主容器
    this.element = document.createElement('div');
    this.element.className = `jev-datepicker jev-datepicker-${this.options.theme} jev-datepicker-${this.options.size}`;
    
    // 设置样式
    this.element.style.width = this.options.width;
    this.element.style.position = 'relative';
    this.element.style.zIndex = '1';
    
    // 创建输入框容器
    const inputContainer = document.createElement('div');
    inputContainer.className = 'jev-datepicker-input-container';
    
    // 创建输入框
    this.inputElement = document.createElement('input');
    this.inputElement.type = this.options.editable ? 'text' : 'text';
    this.inputElement.className = `jev-datepicker-input ${this.options.inputClasses}`;
    this.inputElement.placeholder = this.options.placeholder;
    this.inputElement.readOnly = !this.options.editable || this.options.disabled;
    this.inputElement.disabled = this.options.disabled;
    
    // 应用输入框样式
    Object.assign(this.inputElement.style, this.options.inputStyle);
    
    // 添加图标
    if (this.options.showIcon) {
      this.iconElement = document.createElement('span');
      this.iconElement.className = `jev-datepicker-icon jev-datepicker-icon-${this.options.iconPosition}`;
      this.iconElement.textContent = this.options.icon;
      
      // 根据位置添加到DOM
      if (this.options.iconPosition === 'left') {
        inputContainer.appendChild(this.iconElement);
        inputContainer.appendChild(this.inputElement);
      } else {
        inputContainer.appendChild(this.inputElement);
        inputContainer.appendChild(this.iconElement);
      }
    } else {
      inputContainer.appendChild(this.inputElement);
    }
    
    this.element.appendChild(inputContainer);
    
    // 创建选择器面板
    this.pickerElement = document.createElement('div');
    this.pickerElement.className = 'jev-datepicker-picker';
    this.pickerElement.style.display = 'none';
    this.pickerElement.style.zIndex = this.options.zIndex;
    
    // 创建日历容器
    this.calendarContainer = document.createElement('div');
    this.calendarContainer.className = 'jev-datepicker-calendar';
    this.pickerElement.appendChild(this.calendarContainer);
    
    // 添加到body而不是容器内，以避免溢出问题
    document.body.appendChild(this.pickerElement);
    
    // 设置初始值
    if (this.options.value) {
      this._setValue(this.options.value);
    }
  }

  /**
   * 应用样式
   * @private
   */
  _applyStyles() {
    // 添加全局样式
    this._addGlobalStyles();
    
    // 初始化日历组件
    this._initCalendar();
    
    // 绑定事件
    this._bindEvents();
    
    // 触发初始化回调
    if (typeof this.options.onInit === 'function') {
      try {
        this.options.onInit();
      } catch (error) {
        logger.error('日期选择器初始化回调执行失败', error);
      }
    }
  }

  /**
   * 添加全局样式
   * @private
   */
  _addGlobalStyles() {
    const styleId = 'jev-datepicker-styles';
    if (document.getElementById(styleId)) {
      return;
    }
    
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      /* 日期选择器容器 */
      .jev-datepicker {
        display: inline-block;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        position: relative;
      }
      
      /* 输入框容器 */
      .jev-datepicker-input-container {
        display: flex;
        align-items: center;
        position: relative;
        background-color: #fff;
        border: 1px solid #e2e8f0;
        border-radius: 4px;
        transition: all 0.2s ease;
      }
      
      /* 输入框 */
      .jev-datepicker-input {
        flex: 1;
        padding: 8px 12px;
        font-size: 14px;
        border: none;
        outline: none;
        background-color: transparent;
        color: #333;
        cursor: pointer;
      }
      
      /* 图标样式 */
      .jev-datepicker-icon {
        padding: 0 8px;
        cursor: pointer;
        font-size: 16px;
        color: #666;
        user-select: none;
      }
      
      /* 图标位置 - 左侧 */
      .jev-datepicker-icon-left {
        border-right: 1px solid #e2e8f0;
      }
      
      /* 图标位置 - 右侧 */
      .jev-datepicker-icon-right {
        border-left: 1px solid #e2e8f0;
      }
      
      /* 输入框容器焦点状态 */
      .jev-datepicker-input-container:focus-within {
        border-color: #007bff;
        box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
      }
      
      /* 禁用状态 */
      .jev-datepicker-disabled .jev-datepicker-input-container {
        background-color: #f7fafc;
        border-color: #e2e8f0;
        cursor: not-allowed;
        opacity: 0.6;
      }
      
      .jev-datepicker-disabled .jev-datepicker-input,
      .jev-datepicker-disabled .jev-datepicker-icon {
        cursor: not-allowed;
      }
      
      /* 选择器面板 */
      .jev-datepicker-picker {
        position: absolute;
        background-color: white;
        border: 1px solid #e2e8f0;
        border-radius: 6px;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
        overflow: hidden;
        width: 280px;
        transition: opacity 0.3s ease, transform 0.3s ease;
      }
      
      /* 日历容器 */
      .jev-datepicker-calendar {
        width: 100%;
      }
      
      /* 范围选择样式 */
      .jev-datepicker-range .jev-datepicker-input {
        color: #007bff;
        font-weight: 500;
      }
      
      /* 多选样式 */
      .jev-datepicker-multi .jev-datepicker-input {
        color: #38a169;
      }
      
      /* 主题样式 - 默认 */
      .jev-datepicker-default .jev-datepicker-input-container {
        border-color: #e2e8f0;
      }
      
      .jev-datepicker-default .jev-datepicker-input-container:focus-within {
        border-color: #007bff;
      }
      
      /* 主题样式 - 深色 */
      .jev-datepicker-dark {
        color: #e2e8f0;
      }
      
      .jev-datepicker-dark .jev-datepicker-input-container {
        background-color: #2d3748;
        border-color: #4a5568;
      }
      
      .jev-datepicker-dark .jev-datepicker-input {
        color: #e2e8f0;
      }
      
      .jev-datepicker-dark .jev-datepicker-input-container:focus-within {
        border-color: #38b2ac;
        box-shadow: 0 0 0 2px rgba(56, 178, 172, 0.25);
      }
      
      /* 主题样式 - 霓虹灯 */
      .jev-datepicker-neon .jev-datepicker-input-container {
        border-color: #00ff99;
        box-shadow: 0 0 5px rgba(0, 255, 153, 0.3);
      }
      
      .jev-datepicker-neon .jev-datepicker-input-container:focus-within {
        border-color: #00ff99;
        box-shadow: 0 0 10px rgba(0, 255, 153, 0.5);
      }
      
      .jev-datepicker-neon .jev-datepicker-input {
        color: #00ff99;
        background-color: #0f172a;
      }
      
      /* 尺寸样式 - 小 */
      .jev-datepicker-small .jev-datepicker-input {
        font-size: 12px;
        padding: 6px 8px;
      }
      
      .jev-datepicker-small .jev-datepicker-icon {
        font-size: 14px;
        padding: 0 6px;
      }
      
      .jev-datepicker-small .jev-datepicker-picker {
        width: 240px;
      }
      
      /* 尺寸样式 - 中 */
      .jev-datepicker-medium .jev-datepicker-input {
        font-size: 14px;
      }
      
      /* 尺寸样式 - 大 */
      .jev-datepicker-large .jev-datepicker-input {
        font-size: 16px;
        padding: 10px 14px;
      }
      
      .jev-datepicker-large .jev-datepicker-icon {
        font-size: 18px;
        padding: 0 10px;
      }
      
      .jev-datepicker-large .jev-datepicker-picker {
        width: 320px;
      }
      
      /* 范围选择器宽度 */
      .jev-datepicker-range .jev-datepicker-picker {
        width: 560px;
      }
      
      /* 动画效果 */
      .jev-datepicker-picker-enter {
        opacity: 0;
        transform: translateY(-10px);
      }
      
      .jev-datepicker-picker-enter-active {
        opacity: 1;
        transform: translateY(0);
      }
      
      .jev-datepicker-picker-leave {
        opacity: 1;
        transform: translateY(0);
      }
      
      .jev-datepicker-picker-leave-active {
        opacity: 0;
        transform: translateY(-10px);
      }
      
      /* 响应式设计 */
      @media (max-width: 768px) {
        .jev-datepicker-picker {
          position: fixed !important;
          top: 50% !important;
          left: 50% !important;
          transform: translate(-50%, -50%) !important;
          width: 90% !important;
          max-width: 320px;
          z-index: 1001 !important;
        }
        
        .jev-datepicker-range .jev-datepicker-picker {
          width: 90% !important;
          max-width: 560px;
        }
        
        /* 响应式背景遮罩 */
        .jev-datepicker-mobile-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.5);
          z-index: 1000;
        }
      }
      
      /* 无障碍支持 */
      .jev-datepicker-input:focus {
        outline: none;
      }
      
      /* 高对比度模式支持 */
      @media (prefers-contrast: high) {
        .jev-datepicker-input-container {
          border: 2px solid;
        }
      }
      
      /* 减少动画偏好 */
      @media (prefers-reduced-motion: reduce) {
        .jev-datepicker-picker {
          transition: none !important;
        }
      }
      
      /* 加载状态 */
      .jev-datepicker-loading .jev-datepicker-icon::after {
        content: '';
        display: inline-block;
        width: 10px;
        height: 10px;
        border: 2px solid #f3f3f3;
        border-top: 2px solid #3498db;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin-left: 5px;
      }
      
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `;
    
    document.head.appendChild(style);
  }

  /**
   * 初始化日历组件
   * @private
   */
  _initCalendar() {
    // 日历配置
    const calendarOptions = {
      theme: this.options.theme,
      width: '100%',
      showTodayButton: this.options.todayButton,
      todayText: this.options.todayText,
      showWeekNumbers: this.options.showWeekNumbers,
      weekStart: this.options.weekStart,
      firstDay: this.options.firstDay,
      monthFormat: this.options.monthFormat,
      yearRange: this.options.yearRange,
      showMonthSelector: this.options.showMonthSelector,
      showYearSelector: this.options.showYearSelector,
      showPreviousYears: this.options.showPreviousYears,
      showNextYears: this.options.showNextYears,
      highlightToday: this.options.highlightToday,
      showTime: this.options.showTime,
      timeFormat: this.options.timeFormat,
      showSeconds: this.options.showSeconds,
      minDate: this.options.minDate,
      maxDate: this.options.maxDate,
      disabledDates: this.options.disabledDates,
      disabledDays: this.options.disabledDays,
      highlightedDates: this.options.highlightedDates,
      highlightedDays: this.options.highlightedDays,
      enableKeyboardNavigation: this.options.enableKeyboardNavigation,
      
      // 选择模式
      selectionMode: this.options.range ? 'range' : (this.options.multiSelect ? 'multiple' : 'single'),
      
      // 回调函数
      onDateSelect: this._handleDateSelect.bind(this),
      onRangeSelect: this._handleRangeSelect.bind(this),
      onMonthChange: this.options.onMonthChange,
      onYearChange: this.options.onYearChange,
      onTodayClick: this._handleTodayClick.bind(this)
    };
    
    // 创建日历实例
    try {
      this.calendarInstance = new Calendar(calendarOptions, this.calendarContainer);
    } catch (error) {
      logger.error('日历组件初始化失败', error);
      
      // 降级处理
      this._handleCalendarError();
    }
  }

  /**
   * 处理日历错误
   * @private
   */
  _handleCalendarError() {
    // 显示错误信息
    this.calendarContainer.innerHTML = `
      <div class="jev-datepicker-error">
        <div style="padding: 20px; text-align: center; color: #e53e3e;">
          日历组件加载失败，请刷新页面重试
        </div>
      </div>
    `;
  }

  /**
   * 绑定事件
   * @private
   */
  _bindEvents() {
    // 输入框焦点事件
    this.inputElement.addEventListener('focus', this._handleInputFocus.bind(this));
    
    // 输入框失焦事件
    this.inputElement.addEventListener('blur', this._handleInputBlur.bind(this));
    
    // 输入框输入事件
    if (this.options.editable && !this.options.disabled) {
      this.inputElement.addEventListener('input', this._handleInput.bind(this));
    }
    
    // 输入框键盘事件
    this.inputElement.addEventListener('keydown', this._handleKeyDown.bind(this));
    
    // 图标点击事件
    if (this.iconElement) {
      this.iconElement.addEventListener('click', this._togglePicker.bind(this));
    }
    
    // 点击外部关闭
    document.addEventListener('click', this._handleClickOutside.bind(this));
    
    // 窗口大小变化重新定位
    window.addEventListener('resize', this._handleResize.bind(this));
    
    // 键盘ESC关闭
    document.addEventListener('keydown', this._handleEscapeKey.bind(this));
  }

  /**
   * 处理输入框焦点事件
   * @private
   */
  _handleInputFocus() {
    // 触发回调
    if (typeof this.options.onFocus === 'function') {
      try {
        this.options.onFocus();
      } catch (error) {
        logger.error('焦点事件回调执行失败', error);
      }
    }
    
    // 自动打开选择器
    if (!this.isOpen && !this.options.disabled) {
      this.open();
    }
  }

  /**
   * 处理输入框失焦事件
   * @private
   */
  _handleInputBlur() {
    // 延迟关闭，以确保点击其他元素正常工作
    setTimeout(() => {
      if (this.isOpen && this.options.autoClose && !this._isPickerClicked) {
        this.close();
      }
      
      // 验证输入
      this._validateInput();
    }, 200);
    
    // 触发回调
    if (typeof this.options.onBlur === 'function') {
      try {
        this.options.onBlur();
      } catch (error) {
        logger.error('失焦事件回调执行失败', error);
      }
    }
  }

  /**
   * 处理输入事件
   * @private
   */
  _handleInput(e) {
    const value = e.target.value;
    
    // 验证输入
    if (!this._validateInput(value)) {
      return;
    }
    
    // 解析输入值
    try {
      const parsedValue = this._parseInput(value);
      
      if (parsedValue) {
        // 更新值
        this.setValue(parsedValue);
      }
    } catch (error) {
      logger.error('输入值解析失败', error);
      
      // 触发错误回调
      if (typeof this.options.onError === 'function') {
        try {
          this.options.onError(error);
        } catch (err) {
          logger.error('错误回调执行失败', err);
        }
      }
    }
  }

  /**
   * 处理键盘事件
   * @private
   */
  _handleKeyDown(e) {
    // ESC键关闭选择器
    if (e.key === 'Escape' && this.isOpen) {
      e.preventDefault();
      this.close();
      return;
    }
    
    // Enter键确认输入
    if (e.key === 'Enter' && this.options.editable) {
      e.preventDefault();
      this._validateInput();
    }
  }

  /**
   * 切换选择器显示状态
   * @private
   */
  _togglePicker() {
    if (this.options.disabled) return;
    
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  /**
   * 处理点击外部关闭
   * @private
   */
  _handleClickOutside(e) {
    // 检查是否点击在组件内部
    if (!this.element.contains(e.target) && 
        !this.pickerElement.contains(e.target) && 
        this.isOpen) {
      this.close();
    }
  }

  /**
   * 处理窗口大小变化
   * @private
   */
  _handleResize() {
    if (this.isOpen && this.options.autoPosition) {
      this._positionPicker();
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
   * 处理日期选择
   * @private
   */
  _handleDateSelect(date) {
    // 更新选择日期
    this.selectedDate = date;
    
    // 设置输入框值
    this._updateInputValue();
    
    // 更新状态
    this.updateState({ selectedDate: date });
    
    // 触发回调
    this._triggerSelectCallbacks(date);
    
    // 自动关闭
    if (this.options.closeOnSelect) {
      this.close();
    }
  }

  /**
   * 处理范围选择
   * @private
   */
  _handleRangeSelect(range) {
    // 更新选择范围
    this.selectedRange = range;
    
    // 设置输入框值
    this._updateInputValue();
    
    // 更新状态
    this.updateState({ selectedRange: range });
    
    // 触发回调
    if (typeof this.options.onRangeSelect === 'function') {
      try {
        this.options.onRangeSelect(range, this);
      } catch (error) {
        logger.error('范围选择回调执行失败', error);
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
    
    // 自动关闭
    if (range.start && range.end && this.options.closeOnSelect) {
      this.close();
    }
  }

  /**
   * 处理今天按钮点击
   * @private
   */
  _handleTodayClick() {
    const today = new Date();
    
    // 设置今天的日期
    this.selectDate(today);
    
    // 触发回调
    if (typeof this.options.onToday === 'function') {
      try {
        this.options.onToday(today);
      } catch (error) {
        logger.error('今天按钮回调执行失败', error);
      }
    }
  }

  /**
   * 触发选择回调
   * @private
   */
  _triggerSelectCallbacks(date) {
    // onSelect回调
    if (typeof this.options.onSelect === 'function') {
      try {
        this.options.onSelect(date, this);
      } catch (error) {
        logger.error('选择回调执行失败', error);
      }
    }
    
    // onChange回调
    if (typeof this.options.onChange === 'function') {
      try {
        this.options.onChange(this.getValue());
      } catch (error) {
        logger.error('变化回调执行失败', error);
      }
    }
  }

  /**
   * 更新输入框值
   * @private
   */
  _updateInputValue() {
    if (!this.inputElement) return;
    
    if (this.options.range && this.selectedRange) {
      // 范围选择
      if (this.selectedRange.start && this.selectedRange.end) {
        const startStr = formatDate(this.selectedRange.start, this.options.format);
        const endStr = formatDate(this.selectedRange.end, this.options.format);
        this.inputElement.value = `${startStr} - ${endStr}`;
      } else if (this.selectedRange.start) {
        const startStr = formatDate(this.selectedRange.start, this.options.format);
        this.inputElement.value = `${startStr} - `;
      }
    } else if (this.options.multiSelect && this.selectedDate) {
      // 多选
      const dateStrs = this.selectedDate.map(date => 
        formatDate(date, this.options.format)
      ).join(', ');
      this.inputElement.value = dateStrs;
    } else if (this.selectedDate) {
      // 单选
      this.inputElement.value = formatDate(this.selectedDate, this.options.format);
    } else {
      // 无选择
      this.inputElement.value = '';
    }
  }

  /**
   * 设置选择器位置
   * @private
   */
  _positionPicker() {
    if (!this.pickerElement || !this.element) return;
    
    const rect = this.element.getBoundingClientRect();
    const pickerStyle = this.pickerElement.style;
    
    // 重置样式
    pickerStyle.left = 'auto';
    pickerStyle.right = 'auto';
    pickerStyle.top = 'auto';
    pickerStyle.bottom = 'auto';
    pickerStyle.position = 'fixed'; // 使用fixed定位以避免滚动问题
    
    // 获取视口大小
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // 获取选择器大小
    const pickerRect = this.pickerElement.getBoundingClientRect();
    
    // 计算位置
    let position = this.options.position;
    
    // 自动定位逻辑
    if (this.options.autoPosition) {
      const availableSpaceBottom = viewportHeight - rect.bottom - 10;
      const availableSpaceTop = rect.top - 10;
      const availableSpaceRight = viewportWidth - rect.right - 10;
      const availableSpaceLeft = rect.left - 10;
      
      // 优先向下定位
      const direction = availableSpaceBottom >= pickerRect.height ? 'bottom' : 'top';
      
      // 左右位置
      const side = availableSpaceRight >= pickerRect.width ? 'left' : 'right';
      
      position = `${direction}-${side}`;
    }
    
    // 应用位置
    switch (position) {
      case 'bottom-left':
        pickerStyle.left = `${rect.left}px`;
        pickerStyle.top = `${rect.bottom + 5}px`;
        break;
      case 'bottom-right':
        pickerStyle.left = `${rect.right - pickerRect.width}px`;
        pickerStyle.top = `${rect.bottom + 5}px`;
        break;
      case 'top-left':
        pickerStyle.left = `${rect.left}px`;
        pickerStyle.top = `${rect.top - pickerRect.height - 5}px`;
        break;
      case 'top-right':
        pickerStyle.left = `${rect.right - pickerRect.width}px`;
        pickerStyle.top = `${rect.top - pickerRect.height - 5}px`;
        break;
    }
  }

  /**
   * 打开选择器
   */
  open() {
    if (this.isOpen || this.options.disabled) return;
    
    // 显示选择器
    this.pickerElement.style.display = 'block';
    
    // 定位选择器
    this._positionPicker();
    
    // 添加动画类
    if (this.options.dropdownAnimation) {
      this.pickerElement.classList.add('jev-datepicker-picker-enter');
      setTimeout(() => {
        this.pickerElement.classList.remove('jev-datepicker-picker-enter');
        this.pickerElement.classList.add('jev-datepicker-picker-enter-active');
      }, 10);
    }
    
    // 更新状态
    this.isOpen = true;
    this.updateState({ isOpen: true });
    
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
   * 关闭选择器
   */
  close() {
    if (!this.isOpen) return;
    
    // 动画关闭
    if (this.options.dropdownAnimation) {
      this.pickerElement.classList.add('jev-datepicker-picker-leave-active');
      setTimeout(() => {
        this._hidePicker();
      }, this.options.animationDuration);
    } else {
      this._hidePicker();
    }
    
    // 移除动画类
    setTimeout(() => {
      this.pickerElement.classList.remove('jev-datepicker-picker-enter-active');
      this.pickerElement.classList.remove('jev-datepicker-picker-leave-active');
    }, this.options.animationDuration + 10);
  }

  /**
   * 隐藏选择器（内部方法）
   * @private
   */
  _hidePicker() {
    this.pickerElement.style.display = 'none';
    
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
   * 设置日期
   * @param {Date|string|number} date - 日期值
   */
  setValue(date) {
    try {
      // 设置值
      this._setValue(date);
      
      // 更新输入框显示
      this._updateInputValue();
      
      // 同步日历选择
      this._syncCalendarSelection();
      
      return this;
    } catch (error) {
      logger.error('设置日期值失败', error);
      
      // 触发错误回调
      if (typeof this.options.onError === 'function') {
        try {
          this.options.onError(error);
        } catch (err) {
          logger.error('错误回调执行失败', err);
        }
      }
      
      return this;
    }
  }

  /**
   * 内部设置值
   * @private
   */
  _setValue(value) {
    if (this.options.range) {
      // 范围模式
      this.selectedRange = this._parseRange(value);
      this.updateState({ selectedRange: this.selectedRange });
    } else if (this.options.multiSelect) {
      // 多选模式
      this.selectedDate = this._parseMulti(value);
      this.updateState({ selectedDate: this.selectedDate });
    } else {
      // 单选模式
      this.selectedDate = this._parseValue(value);
      this.updateState({ selectedDate: this.selectedDate });
    }
  }

  /**
   * 获取值
   * @returns {Date|Object|Array|null} 日期值
   */
  getValue() {
    if (this.options.range) {
      return this.selectedRange;
    } else if (this.options.multiSelect) {
      return this.selectedDate || [];
    } else {
      return this.selectedDate;
    }
  }

  /**
   * 获取格式化的值
   * @returns {string|null} 格式化的日期字符串
   */
  getFormattedValue() {
    if (this.options.range && this.selectedRange) {
      if (this.selectedRange.start && this.selectedRange.end) {
        const startStr = formatDate(this.selectedRange.start, this.options.format);
        const endStr = formatDate(this.selectedRange.end, this.options.format);
        return `${startStr} - ${endStr}`;
      }
    } else if (this.options.multiSelect && this.selectedDate && this.selectedDate.length > 0) {
      return this.selectedDate.map(date => 
        formatDate(date, this.options.format)
      ).join(', ');
    } else if (this.selectedDate) {
      return formatDate(this.selectedDate, this.options.format);
    }
    
    return null;
  }

  /**
   * 选择日期
   * @param {Date|string|number} date - 日期值
   */
  selectDate(date) {
    const parsedDate = this._parseValue(date);
    
    if (parsedDate) {
      // 设置选择
      this.selectedDate = parsedDate;
      
      // 更新输入框
      this._updateInputValue();
      
      // 同步日历
      if (this.calendarInstance) {
        this.calendarInstance.selectDate(parsedDate);
      }
      
      // 触发回调
      this._triggerSelectCallbacks(parsedDate);
    }
    
    return this;
  }

  /**
   * 选择范围
   * @param {Object} range - 范围对象 {start, end}
   */
  selectRange(range) {
    const parsedRange = this._parseRange(range);
    
    if (parsedRange) {
      // 设置范围
      this.selectedRange = parsedRange;
      
      // 更新输入框
      this._updateInputValue();
      
      // 同步日历
      if (this.calendarInstance) {
        this.calendarInstance.selectRange(parsedRange);
      }
      
      // 触发回调
      if (typeof this.options.onRangeSelect === 'function') {
        try {
          this.options.onRangeSelect(parsedRange, this);
        } catch (error) {
          logger.error('范围选择回调执行失败', error);
        }
      }
    }
    
    return this;
  }

  /**
   * 清除选择
   */
  clear() {
    // 重置状态
    this.selectedDate = null;
    this.selectedRange = null;
    
    // 清空输入框
    if (this.inputElement) {
      this.inputElement.value = '';
    }
    
    // 同步日历
    if (this.calendarInstance) {
      this.calendarInstance.clearSelection();
    }
    
    // 更新状态
    this.updateState({ 
      selectedDate: null, 
      selectedRange: null 
    });
    
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
        this.options.onChange(null);
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
    this.options.disabled = !!disabled;
    
    if (this.inputElement) {
      this.inputElement.disabled = disabled;
      this.inputElement.readOnly = !this.options.editable || disabled;
    }
    
    // 更新样式
    if (disabled) {
      this.element.classList.add('jev-datepicker-disabled');
    } else {
      this.element.classList.remove('jev-datepicker-disabled');
    }
    
    // 更新状态
    this.updateState({ disabled });
    
    return this;
  }

  /**
   * 设置最小日期
   * @param {Date|string|number} date - 最小日期
   */
  setMinDate(date) {
    this.minDate = this._parseValue(date);
    
    if (this.calendarInstance) {
      this.calendarInstance.setMinDate(this.minDate);
    }
    
    return this;
  }

  /**
   * 设置最大日期
   * @param {Date|string|number} date - 最大日期
   */
  setMaxDate(date) {
    this.maxDate = this._parseValue(date);
    
    if (this.calendarInstance) {
      this.calendarInstance.setMaxDate(this.maxDate);
    }
    
    return this;
  }

  /**
   * 设置禁用日期
   * @param {Array} dates - 禁用日期数组
   */
  setDisabledDates(dates) {
    this.disabledDates = dates.map(date => this._parseValue(date)).filter(Boolean);
    
    if (this.calendarInstance) {
      this.calendarInstance.clearDisabledDates();
      this.disabledDates.forEach(date => {
        this.calendarInstance.addDisabledDate(date);
      });
    }
    
    return this;
  }

  /**
   * 设置高亮日期
   * @param {Array} dates - 高亮日期数组
   */
  setHighlightedDates(dates) {
    this.highlightedDates = dates.map(date => this._parseValue(date)).filter(Boolean);
    
    if (this.calendarInstance) {
      this.calendarInstance.clearHighlightedDates();
      this.highlightedDates.forEach(date => {
        this.calendarInstance.addHighlightedDate(date);
      });
    }
    
    return this;
  }

  /**
   * 设置主题
   * @param {string} theme - 主题
   */
  setTheme(theme) {
    this.element.classList.remove(`jev-datepicker-${this.options.theme}`);
    this.element.classList.add(`jev-datepicker-${theme}`);
    this.options.theme = theme;
    
    if (this.calendarInstance) {
      this.calendarInstance.setTheme(theme);
    }
    
    return this;
  }

  /**
   * 设置格式
   * @param {string} format - 日期格式
   */
  setFormat(format) {
    this.options.format = format;
    
    // 重新格式化显示
    this._updateInputValue();
    
    return this;
  }

  /**
   * 同步日历选择
   * @private
   */
  _syncCalendarSelection() {
    if (!this.calendarInstance) return;
    
    try {
      if (this.options.range && this.selectedRange) {
        this.calendarInstance.selectRange(this.selectedRange);
      } else if (this.options.multiSelect && this.selectedDate) {
        this.calendarInstance.clearSelection();
        this.selectedDate.forEach(date => {
          this.calendarInstance.selectDate(date);
        });
      } else if (this.selectedDate) {
        this.calendarInstance.selectDate(this.selectedDate);
      } else {
        this.calendarInstance.clearSelection();
      }
    } catch (error) {
      logger.error('同步日历选择失败', error);
    }
  }

  /**
   * 解析输入值
   * @private
   */
  _parseInput(value) {
    try {
      // 使用日期工具解析
      return parseDate(value, this.options.parseFormat);
    } catch (error) {
      throw new Error('Invalid date format');
    }
  }

  /**
   * 解析单个值
   * @private
   */
  _parseValue(value) {
    if (!value) return null;
    
    if (value instanceof Date) {
      return value;
    }
    
    try {
      return parseDate(value, this.options.parseFormat);
    } catch (error) {
      throw new Error('Invalid date value');
    }
  }

  /**
   * 解析范围值
   * @private
   */
  _parseRange(value) {
    if (!value) return { start: null, end: null };
    
    if (typeof value === 'object' && 'start' in value && 'end' in value) {
      return {
        start: this._parseValue(value.start),
        end: this._parseValue(value.end)
      };
    }
    
    // 尝试从字符串解析
    if (typeof value === 'string') {
      const parts = value.split('-').map(part => part.trim());
      if (parts.length === 2) {
        return {
          start: this._parseValue(parts[0]),
          end: this._parseValue(parts[1])
        };
      }
    }
    
    return { start: null, end: null };
  }

  /**
   * 解析多值
   * @private
   */
  _parseMulti(value) {
    if (!value) return [];
    
    if (Array.isArray(value)) {
      return value.map(date => this._parseValue(date)).filter(Boolean);
    }
    
    // 尝试从逗号分隔的字符串解析
    if (typeof value === 'string') {
      return value.split(',').map(part => {
        try {
          return this._parseValue(part.trim());
        } catch (e) {
          return null;
        }
      }).filter(Boolean);
    }
    
    return [];
  }

  /**
   * 验证输入
   * @private
   */
  _validateInput(value = this.inputElement?.value) {
    // 空值通过验证
    if (!value || value.trim() === '') {
      return true;
    }
    
    // 使用自定义验证函数
    if (typeof this.options.validateInput === 'function') {
      return this.options.validateInput(value);
    }
    
    try {
      if (this.options.range) {
        // 范围验证
        const parts = value.split('-').map(part => part.trim());
        
        if (parts.length === 1) {
          // 只有开始日期
          return !!this._parseValue(parts[0]);
        } else if (parts.length === 2) {
          // 完整范围
          const start = this._parseValue(parts[0]);
          const end = parts[1] ? this._parseValue(parts[1]) : null;
          
          return start && (!end || (end >= start));
        }
      } else {
        // 单个日期验证
        return !!this._parseValue(value);
      }
    } catch (error) {
      return false;
    }
    
    return false;
  }

  /**
   * 刷新组件
   */
  refresh() {
    // 重新定位
    if (this.isOpen) {
      this._positionPicker();
    }
    
    // 重新同步选择
    this._syncCalendarSelection();
    
    return this;
  }

  /**
   * 获取日历实例
   * @returns {Calendar} 日历实例
   */
  getCalendar() {
    return this.calendarInstance;
  }

  /**
   * 获取输入框元素
   * @returns {HTMLInputElement} 输入框元素
   */
  getInput() {
    return this.inputElement;
  }

  /**
   * 资源释放与清理
   */
  async destroy() {
    try {
      // 移除DOM元素
      if (this.pickerElement && this.pickerElement.parentNode) {
        this.pickerElement.parentNode.removeChild(this.pickerElement);
      }
      
      // 移除事件监听
      document.removeEventListener('click', this._handleClickOutside.bind(this));
      window.removeEventListener('resize', this._handleResize.bind(this));
      document.removeEventListener('keydown', this._handleEscapeKey.bind(this));
      
      // 销毁日历实例
      if (this.calendarInstance) {
        await this.calendarInstance.destroy();
      }
      
      // 清理引用
      this.inputElement = null;
      this.iconElement = null;
      this.pickerElement = null;
      this.calendarInstance = null;
      this.calendarContainer = null;
      this.selectedDate = null;
      this.selectedRange = null;
      
    } catch (error) {
      logger.error('日期选择器销毁失败', error);
    }
  }
}

export default DatePicker;