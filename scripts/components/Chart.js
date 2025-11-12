/**
 * Chart数据可视化图表组件
 * 提供灵活的数据可视化功能，支持多种图表类型和交互方式
 */
import BaseComponent from './base-component.js';
import logger from '../utils/logger.js';

class Chart extends BaseComponent {
  /**
   * 构造函数
   * @param {Object} options - 配置选项
   * @param {HTMLElement} container - 容器元素
   */
  constructor(options = {}, container = document.body) {
    super(options, container);
    
    // 组件元素引用
    this.canvasElement = null;
    this.legendElement = null;
    this.tooltipElement = null;
    this.loadingElement = null;
    this.errorElement = null;
    
    // 图表状态
    this.ctx = null;
    this.data = null;
    this.isRendered = false;
    this.isLoading = false;
    this.isError = false;
    this.resizeObserver = null;
    
    // 交互状态
    this.isHovered = false;
    this.hoveredDataPoint = null;
    this.hoveredSeries = null;
    this.activeElements = new Set();
  }

  /**
   * 获取默认配置
   * @private
   */
  _getDefaultOptions() {
    return {
      ...super._getDefaultOptions(),
      type: 'line', // line, bar, pie, doughnut, radar, polarArea, scatter, bubble
      width: '100%',
      height: '400px',
      responsive: true,
      maintainAspectRatio: false,
      theme: 'default', // default, dark, neon
      animation: true,
      animationDuration: 1000,
      animationEasing: 'easeInOutQuart',
      plugins: {
        legend: {
          display: true,
          position: 'top', // top, bottom, left, right
          align: 'center', // start, center, end
          fullWidth: true,
          labels: {
            boxWidth: 12,
            padding: 15,
            usePointStyle: false,
            font: {
              family: 'inherit',
              size: 12,
              weight: 'normal'
            },
            color: '#666'
          }
        },
        tooltip: {
          enabled: true,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          titleColor: '#fff',
          bodyColor: '#fff',
          borderColor: 'transparent',
          borderWidth: 0,
          cornerRadius: 4,
          displayColors: true,
          callbacks: {
            title: null,
            label: null,
            afterLabel: null
          }
        }
      },
      scales: {
        x: {
          display: true,
          title: {
            display: false,
            text: '',
            color: '#666',
            font: {
              family: 'inherit',
              size: 12,
              weight: 'bold'
            }
          },
          grid: {
            display: true,
            color: 'rgba(0, 0, 0, 0.1)'
          },
          ticks: {
            color: '#666',
            font: {
              family: 'inherit',
              size: 11
            }
          }
        },
        y: {
          display: true,
          title: {
            display: false,
            text: '',
            color: '#666',
            font: {
              family: 'inherit',
              size: 12,
              weight: 'bold'
            }
          },
          grid: {
            display: true,
            color: 'rgba(0, 0, 0, 0.1)'
          },
          ticks: {
            color: '#666',
            font: {
              family: 'inherit',
              size: 11
            },
            beginAtZero: true
          }
        }
      },
      elements: {
        line: {
          tension: 0.1,
          borderWidth: 2,
          borderCapStyle: 'round',
          borderJoinStyle: 'round',
          fill: false,
          pointRadius: 4,
          pointHoverRadius: 6,
          pointBackgroundColor: '#fff',
          pointBorderColor: '',
          pointBorderWidth: 2
        },
        bar: {
          backgroundColor: '',
          borderColor: '',
          borderWidth: 1,
          borderSkipped: false,
          borderRadius: 0
        },
        arc: {
          backgroundColor: '',
          borderColor: '#fff',
          borderWidth: 2
        },
        point: {
          hoverBackgroundColor: '',
          hoverBorderColor: '',
          hoverBorderWidth: 1
        }
      },
      layout: {
        padding: {
          top: 0,
          right: 0,
          bottom: 0,
          left: 0
        }
      },
      data: {
        labels: [],
        datasets: []
      },
      onHover: null,
      onClick: null,
      onResize: null,
      onRender: null,
      onDataUpdate: null
    };
  }

  /**
   * 获取初始状态
   * @private
   */
  _getInitialState() {
    return {
      ...super._getInitialState(),
      isRendered: false,
      isLoading: false,
      isError: false,
      data: null
    };
  }

  /**
   * 创建DOM元素
   * @private
   */
  _createElement() {
    // 创建主容器
    this.element = document.createElement('div');
    this.element.className = `jev-chart jev-chart-${this.options.theme}`;
    this.element.style.width = this.options.width;
    this.element.style.height = this.options.height;
    this.element.style.position = 'relative';
    
    // 创建canvas元素
    this.canvasElement = document.createElement('canvas');
    this.canvasElement.className = 'jev-chart-canvas';
    this.canvasElement.style.width = '100%';
    this.canvasElement.style.height = '100%';
    this.element.appendChild(this.canvasElement);
    
    // 获取上下文
    this.ctx = this.canvasElement.getContext('2d');
    
    // 创建图例容器（如果启用）
    if (this.options.plugins.legend.display) {
      this.legendElement = document.createElement('div');
      this.legendElement.className = `jev-chart-legend jev-chart-legend-${this.options.plugins.legend.position}`;
      this.element.appendChild(this.legendElement);
    }
    
    // 创建工具提示元素
    this.tooltipElement = document.createElement('div');
    this.tooltipElement.className = 'jev-chart-tooltip';
    this.tooltipElement.style.position = 'absolute';
    this.tooltipElement.style.top = '0';
    this.tooltipElement.style.left = '0';
    this.tooltipElement.style.opacity = '0';
    this.tooltipElement.style.pointerEvents = 'none';
    this.tooltipElement.style.zIndex = '100';
    this.element.appendChild(this.tooltipElement);
    
    // 创建加载状态元素
    this.loadingElement = document.createElement('div');
    this.loadingElement.className = 'jev-chart-loading';
    this.loadingElement.innerHTML = '<div class="jev-chart-loading-spinner"></div><div class="jev-chart-loading-text">加载中...</div>';
    this.loadingElement.style.display = 'none';
    this.element.appendChild(this.loadingElement);
    
    // 创建错误状态元素
    this.errorElement = document.createElement('div');
    this.errorElement.className = 'jev-chart-error';
    this.errorElement.textContent = '加载失败';
    this.errorElement.style.display = 'none';
    this.element.appendChild(this.errorElement);
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
    
    // 初始化响应式调整
    if (this.options.responsive) {
      this._initResponsive();
    }
    
    // 初始化数据
    if (this.options.data && (this.options.data.labels.length > 0 || this.options.data.datasets.length > 0)) {
      this.data = this.options.data;
      this.render();
    }
  }

  /**
   * 添加全局样式
   * @private
   */
  _addGlobalStyles() {
    const styleId = 'jev-chart-styles';
    if (document.getElementById(styleId)) {
      return;
    }
    
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      /* 图表容器样式 */
      .jev-chart {
        background-color: #fff;
        border-radius: 8px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        overflow: hidden;
      }
      
      /* 主题样式 - 默认 */
      .jev-chart-default {
        background-color: #fff;
      }
      
      /* 主题样式 - 深色 */
      .jev-chart-dark {
        background-color: #2d3748;
        color: #e2e8f0;
      }
      
      /* 主题样式 - 霓虹灯 */
      .jev-chart-neon {
        background-color: #1a1a1a;
        color: #00ff99;
        border: 1px solid rgba(0, 255, 153, 0.2);
        box-shadow: 0 0 20px rgba(0, 255, 153, 0.1);
      }
      
      /* Canvas样式 */
      .jev-chart-canvas {
        display: block;
      }
      
      /* 图例样式 */
      .jev-chart-legend {
        padding: 10px 15px;
        font-size: 12px;
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: center;
        gap: 15px;
      }
      
      .jev-chart-legend-top {
        border-bottom: 1px solid #e2e8f0;
      }
      
      .jev-chart-legend-bottom {
        border-top: 1px solid #e2e8f0;
      }
      
      .jev-chart-legend-left {
        position: absolute;
        left: 0;
        top: 0;
        height: 100%;
        border-right: 1px solid #e2e8f0;
        flex-direction: column;
      }
      
      .jev-chart-legend-right {
        position: absolute;
        right: 0;
        top: 0;
        height: 100%;
        border-left: 1px solid #e2e8f0;
        flex-direction: column;
      }
      
      .jev-chart-dark .jev-chart-legend-top,
      .jev-chart-dark .jev-chart-legend-bottom {
        border-color: #4a5568;
      }
      
      .jev-chart-dark .jev-chart-legend-left,
      .jev-chart-dark .jev-chart-legend-right {
        border-color: #4a5568;
      }
      
      .jev-chart-neon .jev-chart-legend-top,
      .jev-chart-neon .jev-chart-legend-bottom {
        border-color: rgba(0, 255, 153, 0.3);
      }
      
      .jev-chart-neon .jev-chart-legend-left,
      .jev-chart-neon .jev-chart-legend-right {
        border-color: rgba(0, 255, 153, 0.3);
      }
      
      /* 图例项 */
      .jev-chart-legend-item {
        display: flex;
        align-items: center;
        cursor: pointer;
        padding: 4px 8px;
        border-radius: 4px;
        transition: background-color 0.2s;
      }
      
      .jev-chart-legend-item:hover {
        background-color: rgba(0, 0, 0, 0.05);
      }
      
      .jev-chart-dark .jev-chart-legend-item:hover {
        background-color: rgba(255, 255, 255, 0.05);
      }
      
      .jev-chart-legend-item.hidden .jev-chart-legend-color {
        opacity: 0.3;
      }
      
      /* 图例颜色指示器 */
      .jev-chart-legend-color {
        width: 12px;
        height: 12px;
        margin-right: 8px;
        border-radius: 2px;
        border: 1px solid rgba(0, 0, 0, 0.2);
      }
      
      /* 图例文本 */
      .jev-chart-legend-text {
        user-select: none;
      }
      
      /* 工具提示样式 */
      .jev-chart-tooltip {
        background-color: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 8px 12px;
        border-radius: 4px;
        font-size: 12px;
        white-space: nowrap;
        pointer-events: none;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
        transition: opacity 0.2s;
      }
      
      .jev-chart-tooltip-title {
        font-weight: bold;
        margin-bottom: 4px;
        padding-bottom: 4px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.2);
      }
      
      .jev-chart-tooltip-item {
        display: flex;
        align-items: center;
        margin: 2px 0;
      }
      
      .jev-chart-tooltip-color {
        width: 8px;
        height: 8px;
        margin-right: 6px;
        border-radius: 50%;
      }
      
      /* 加载状态 */
      .jev-chart-loading {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        background-color: rgba(255, 255, 255, 0.9);
        z-index: 10;
      }
      
      .jev-chart-dark .jev-chart-loading {
        background-color: rgba(45, 55, 72, 0.9);
      }
      
      .jev-chart-neon .jev-chart-loading {
        background-color: rgba(26, 26, 26, 0.9);
      }
      
      /* 加载动画 */
      .jev-chart-loading-spinner {
        width: 30px;
        height: 30px;
        border: 3px solid rgba(0, 0, 0, 0.1);
        border-top-color: #007bff;
        border-radius: 50%;
        animation: jev-chart-spin 1s ease-in-out infinite;
        margin-bottom: 10px;
      }
      
      .jev-chart-dark .jev-chart-loading-spinner {
        border-color: rgba(255, 255, 255, 0.1);
        border-top-color: #38b2ac;
      }
      
      .jev-chart-neon .jev-chart-loading-spinner {
        border-color: rgba(0, 255, 153, 0.1);
        border-top-color: #00ff99;
        box-shadow: 0 0 10px rgba(0, 255, 153, 0.3);
      }
      
      .jev-chart-loading-text {
        font-size: 14px;
        color: #666;
      }
      
      .jev-chart-dark .jev-chart-loading-text {
        color: #a0aec0;
      }
      
      .jev-chart-neon .jev-chart-loading-text {
        color: #00ff99;
      }
      
      /* 错误状态 */
      .jev-chart-error {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        background-color: rgba(255, 255, 255, 0.9);
        color: #dc3545;
        font-size: 14px;
        z-index: 10;
      }
      
      .jev-chart-dark .jev-chart-error {
        background-color: rgba(45, 55, 72, 0.9);
        color: #f56565;
      }
      
      .jev-chart-neon .jev-chart-error {
        background-color: rgba(26, 26, 26, 0.9);
        color: #ff6b6b;
      }
      
      /* 动画 */
      @keyframes jev-chart-spin {
        to { transform: rotate(360deg); }
      }
      
      /* 响应式设计 */
      @media (max-width: 768px) {
        .jev-chart {
          border-radius: 6px;
        }
        
        .jev-chart-legend {
          padding: 8px 10px;
          font-size: 11px;
          gap: 10px;
        }
        
        .jev-chart-legend-left,
        .jev-chart-legend-right {
          position: relative;
          height: auto;
          width: 100%;
          border: none;
          border-bottom: 1px solid #e2e8f0;
          flex-direction: row;
        }
        
        .jev-chart-dark .jev-chart-legend-left,
        .jev-chart-dark .jev-chart-legend-right {
          border-bottom-color: #4a5568;
        }
        
        .jev-chart-neon .jev-chart-legend-left,
        .jev-chart-neon .jev-chart-legend-right {
          border-bottom-color: rgba(0, 255, 153, 0.3);
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
    // 鼠标移动事件 - 用于工具提示和交互
    this.canvasElement.addEventListener('mousemove', (e) => this._handleMouseMove(e));
    
    // 鼠标离开事件
    this.canvasElement.addEventListener('mouseleave', () => this._handleMouseLeave());
    
    // 点击事件
    this.canvasElement.addEventListener('click', (e) => this._handleClick(e));
  }

  /**
   * 初始化响应式功能
   * @private
   */
  _initResponsive() {
    // 使用ResizeObserver监听容器大小变化
    if (window.ResizeObserver) {
      this.resizeObserver = new ResizeObserver(() => {
        if (this.isRendered) {
          this.resize();
        }
      });
      
      this.resizeObserver.observe(this.element);
    } else {
      // 降级方案：使用窗口大小变化事件
      window.addEventListener('resize', () => this.resize());
    }
  }

  /**
   * 处理鼠标移动事件
   * @private
   */
  _handleMouseMove(e) {
    if (!this.isRendered) return;
    
    const rect = this.canvasElement.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    // 检测是否悬停在数据点上
    const dataPoint = this._getHoveredDataPoint(mouseX, mouseY);
    
    if (dataPoint) {
      this.isHovered = true;
      this.hoveredDataPoint = dataPoint;
      
      // 显示工具提示
      this._showTooltip(e, dataPoint);
      
      // 触发悬停回调
      if (typeof this.options.onHover === 'function') {
        try {
          this.options.onHover(e, dataPoint);
        } catch (error) {
          logger.error('图表悬停回调执行失败', error);
        }
      }
    } else {
      // 隐藏工具提示
      this._hideTooltip();
    }
  }

  /**
   * 处理鼠标离开事件
   * @private
   */
  _handleMouseLeave() {
    this.isHovered = false;
    this.hoveredDataPoint = null;
    this._hideTooltip();
  }

  /**
   * 处理点击事件
   * @private
   */
  _handleClick(e) {
    if (!this.isRendered) return;
    
    const rect = this.canvasElement.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    // 获取点击的数据点
    const dataPoint = this._getHoveredDataPoint(mouseX, mouseY);
    
    if (dataPoint) {
      // 触发点击回调
      if (typeof this.options.onClick === 'function') {
        try {
          this.options.onClick(e, dataPoint);
        } catch (error) {
          logger.error('图表点击回调执行失败', error);
        }
      }
    }
  }

  /**
   * 获取悬停的数据点
   * @private
   */
  _getHoveredDataPoint(x, y) {
    // 这里是简化版实现，实际项目中需要根据不同图表类型进行精确计算
    // 在真实实现中，应该根据图表类型（线图、柱状图等）计算数据点位置
    return null;
  }

  /**
   * 显示工具提示
   * @private
   */
  _showTooltip(event, dataPoint) {
    if (!this.options.plugins.tooltip.enabled) return;
    
    const tooltip = this.tooltipElement;
    tooltip.innerHTML = '';
    
    // 设置工具提示样式
    tooltip.style.backgroundColor = this.options.plugins.tooltip.backgroundColor;
    tooltip.style.borderColor = this.options.plugins.tooltip.borderColor;
    tooltip.style.borderWidth = `${this.options.plugins.tooltip.borderWidth}px`;
    tooltip.style.borderRadius = `${this.options.plugins.tooltip.cornerRadius}px`;
    
    // 创建标题
    const title = document.createElement('div');
    title.className = 'jev-chart-tooltip-title';
    title.style.color = this.options.plugins.tooltip.titleColor;
    
    if (typeof this.options.plugins.tooltip.callbacks.title === 'function') {
      title.textContent = this.options.plugins.tooltip.callbacks.title(dataPoint);
    } else {
      title.textContent = dataPoint.label || '数据点';
    }
    
    tooltip.appendChild(title);
    
    // 创建数据项
    const item = document.createElement('div');
    item.className = 'jev-chart-tooltip-item';
    
    // 颜色指示器
    const color = document.createElement('span');
    color.className = 'jev-chart-tooltip-color';
    color.style.backgroundColor = dataPoint.color || '#007bff';
    item.appendChild(color);
    
    // 文本内容
    const text = document.createElement('span');
    text.style.color = this.options.plugins.tooltip.bodyColor;
    
    if (typeof this.options.plugins.tooltip.callbacks.label === 'function') {
      text.textContent = this.options.plugins.tooltip.callbacks.label(dataPoint);
    } else {
      text.textContent = `${dataPoint.datasetLabel}: ${dataPoint.value}`;
    }
    
    item.appendChild(text);
    tooltip.appendChild(item);
    
    // 定位工具提示
    const rect = this.element.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();
    
    let left = event.clientX - rect.left + 10;
    let top = event.clientY - rect.top - tooltipRect.height - 10;
    
    // 防止溢出
    if (top < 0) {
      top = event.clientY - rect.top + 10;
    }
    
    if (left + tooltipRect.width > rect.width) {
      left = event.clientX - rect.left - tooltipRect.width - 10;
    }
    
    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;
    tooltip.style.opacity = '1';
  }

  /**
   * 隐藏工具提示
   * @private
   */
  _hideTooltip() {
    this.tooltipElement.style.opacity = '0';
  }

  /**
   * 生成图例
   * @private
   */
  _generateLegend() {
    if (!this.options.plugins.legend.display || !this.legendElement || !this.data) return;
    
    this.legendElement.innerHTML = '';
    
    // 遍历数据集生成图例项
    this.data.datasets.forEach((dataset, index) => {
      const legendItem = document.createElement('div');
      legendItem.className = 'jev-chart-legend-item';
      legendItem.dataset.datasetIndex = index;
      
      // 颜色指示器
      const color = document.createElement('span');
      color.className = 'jev-chart-legend-color';
      color.style.backgroundColor = dataset.backgroundColor || dataset.borderColor || this._getDefaultColor(index);
      legendItem.appendChild(color);
      
      // 文本
      const text = document.createElement('span');
      text.className = 'jev-chart-legend-text';
      text.textContent = dataset.label || `数据集 ${index + 1}`;
      legendItem.appendChild(text);
      
      // 添加点击事件以切换显示/隐藏数据集
      legendItem.addEventListener('click', () => {
        this.toggleDatasetVisibility(index);
      });
      
      this.legendElement.appendChild(legendItem);
    });
  }

  /**
   * 获取默认颜色
   * @private
   */
  _getDefaultColor(index) {
    const defaultColors = [
      '#007bff', '#28a745', '#dc3545', '#ffc107', '#17a2b8', 
      '#6610f2', '#e83e8c', '#fd7e14', '#20c997', '#6c757d'
    ];
    
    return defaultColors[index % defaultColors.length];
  }

  /**
   * 渲染图表
   */
  render() {
    if (!this.ctx || !this.data) return;
    
    // 清除画布
    this.ctx.clearRect(0, 0, this.canvasElement.width, this.canvasElement.height);
    
    // 设置画布尺寸以适应容器
    this._updateCanvasSize();
    
    // 根据图表类型渲染不同的图表
    switch (this.options.type) {
      case 'line':
        this._renderLineChart();
        break;
      case 'bar':
        this._renderBarChart();
        break;
      case 'pie':
        this._renderPieChart();
        break;
      case 'doughnut':
        this._renderDoughnutChart();
        break;
      case 'radar':
        this._renderRadarChart();
        break;
      default:
        this._renderLineChart();
    }
    
    // 生成图例
    this._generateLegend();
    
    this.isRendered = true;
    
    // 触发渲染完成回调
    if (typeof this.options.onRender === 'function') {
      try {
        this.options.onRender();
      } catch (error) {
        logger.error('图表渲染回调执行失败', error);
      }
    }
    
    // 更新状态
    this.updateState({ isRendered: true });
  }

  /**
   * 更新画布尺寸
   * @private
   */
  _updateCanvasSize() {
    const container = this.canvasElement.parentElement;
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    
    // 设置画布的实际尺寸（考虑设备像素比）
    const dpr = window.devicePixelRatio || 1;
    this.canvasElement.width = containerWidth * dpr;
    this.canvasElement.height = containerHeight * dpr;
    
    // 缩放上下文以匹配设备像素比
    this.ctx.scale(dpr, dpr);
    
    // 设置CSS尺寸
    this.canvasElement.style.width = `${containerWidth}px`;
    this.canvasElement.style.height = `${containerHeight}px`;
  }

  /**
   * 渲染折线图
   * @private
   */
  _renderLineChart() {
    // 这里是简化版实现，实际项目中需要更复杂的计算和渲染逻辑
    const { ctx, canvasElement, data, options } = this;
    const width = canvasElement.clientWidth;
    const height = canvasElement.clientHeight;
    
    // 绘制背景网格
    this._renderGrid(width, height);
    
    // 绘制坐标轴
    this._renderAxes(width, height);
    
    // 绘制数据线条
    data.datasets.forEach((dataset, datasetIndex) => {
      this._renderLine(dataset, datasetIndex, width, height);
    });
  }

  /**
   * 渲染柱状图
   * @private
   */
  _renderBarChart() {
    // 简化版实现
    const { ctx, canvasElement, data, options } = this;
    const width = canvasElement.clientWidth;
    const height = canvasElement.clientHeight;
    
    // 绘制背景网格
    this._renderGrid(width, height);
    
    // 绘制坐标轴
    this._renderAxes(width, height);
    
    // 绘制柱状图
    data.datasets.forEach((dataset, datasetIndex) => {
      this._renderBars(dataset, datasetIndex, width, height);
    });
  }

  /**
   * 渲染饼图
   * @private
   */
  _renderPieChart() {
    // 简化版实现
    const { ctx, canvasElement, data, options } = this;
    const width = canvasElement.clientWidth;
    const height = canvasElement.clientHeight;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 2 - 40;
    
    // 计算总数值
    let total = 0;
    data.datasets.forEach(dataset => {
      total += dataset.data.reduce((sum, value) => sum + value, 0);
    });
    
    // 绘制饼图
    let currentAngle = -Math.PI / 2; // 从顶部开始
    
    data.datasets.forEach((dataset, datasetIndex) => {
      dataset.data.forEach((value, index) => {
        const sliceAngle = (value / total) * Math.PI * 2;
        const endAngle = currentAngle + sliceAngle;
        
        // 绘制扇形
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, currentAngle, endAngle);
        ctx.closePath();
        
        // 设置颜色
        const backgroundColor = Array.isArray(dataset.backgroundColor) 
          ? dataset.backgroundColor[index] 
          : dataset.backgroundColor || this._getDefaultColor(index);
        
        ctx.fillStyle = backgroundColor;
        ctx.fill();
        
        // 绘制边框
        ctx.strokeStyle = dataset.borderColor || '#fff';
        ctx.lineWidth = dataset.borderWidth || 2;
        ctx.stroke();
        
        // 更新当前角度
        currentAngle = endAngle;
      });
    });
  }

  /**
   * 渲染环形图
   * @private
   */
  _renderDoughnutChart() {
    // 简化版实现，基于饼图但有内半径
    const { ctx, canvasElement, data, options } = this;
    const width = canvasElement.clientWidth;
    const height = canvasElement.clientHeight;
    const centerX = width / 2;
    const centerY = height / 2;
    const outerRadius = Math.min(width, height) / 2 - 40;
    const innerRadius = outerRadius * 0.6; // 内半径为外半径的60%
    
    // 计算总数值
    let total = 0;
    data.datasets.forEach(dataset => {
      total += dataset.data.reduce((sum, value) => sum + value, 0);
    });
    
    // 绘制环形图
    let currentAngle = -Math.PI / 2;
    
    data.datasets.forEach((dataset, datasetIndex) => {
      dataset.data.forEach((value, index) => {
        const sliceAngle = (value / total) * Math.PI * 2;
        const endAngle = currentAngle + sliceAngle;
        
        // 绘制扇形
        ctx.beginPath();
        ctx.arc(centerX, centerY, outerRadius, currentAngle, endAngle);
        ctx.arc(centerX, centerY, innerRadius, endAngle, currentAngle, true);
        ctx.closePath();
        
        // 设置颜色
        const backgroundColor = Array.isArray(dataset.backgroundColor) 
          ? dataset.backgroundColor[index] 
          : dataset.backgroundColor || this._getDefaultColor(index);
        
        ctx.fillStyle = backgroundColor;
        ctx.fill();
        
        // 绘制边框
        ctx.strokeStyle = dataset.borderColor || '#fff';
        ctx.lineWidth = dataset.borderWidth || 2;
        ctx.stroke();
        
        // 更新当前角度
        currentAngle = endAngle;
      });
    });
  }

  /**
   * 渲染雷达图
   * @private
   */
  _renderRadarChart() {
    // 简化版实现
    const { ctx, canvasElement, data, options } = this;
    const width = canvasElement.clientWidth;
    const height = canvasElement.clientHeight;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 2 - 40;
    const labelsCount = data.labels.length;
    const angleStep = (Math.PI * 2) / labelsCount;
    
    // 绘制网格线
    this._renderRadarGrid(centerX, centerY, radius, labelsCount, angleStep);
    
    // 绘制标签
    this._renderRadarLabels(centerX, centerY, radius, angleStep);
    
    // 绘制数据集
    data.datasets.forEach((dataset, datasetIndex) => {
      this._renderRadarDataset(dataset, datasetIndex, centerX, centerY, radius, angleStep);
    });
  }

  /**
   * 渲染网格
   * @private
   */
  _renderGrid(width, height) {
    const { ctx, options } = this;
    const padding = this.options.layout.padding;
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;
    
    ctx.save();
    ctx.translate(padding.left, padding.top);
    
    // 绘制垂直网格线
    if (options.scales.x?.grid?.display) {
      ctx.strokeStyle = options.scales.x.grid.color || 'rgba(0, 0, 0, 0.1)';
      ctx.lineWidth = 1;
      
      const labelsCount = this.data.labels.length;
      const step = chartWidth / (labelsCount - 1);
      
      for (let i = 0; i < labelsCount; i++) {
        ctx.beginPath();
        const x = i * step;
        ctx.moveTo(x, 0);
        ctx.lineTo(x, chartHeight);
        ctx.stroke();
      }
    }
    
    // 绘制水平网格线
    if (options.scales.y?.grid?.display) {
      ctx.strokeStyle = options.scales.y.grid.color || 'rgba(0, 0, 0, 0.1)';
      ctx.lineWidth = 1;
      
      // 假设5条水平网格线
      const gridLinesCount = 5;
      const step = chartHeight / (gridLinesCount - 1);
      
      for (let i = 0; i < gridLinesCount; i++) {
        ctx.beginPath();
        const y = i * step;
        ctx.moveTo(0, y);
        ctx.lineTo(chartWidth, y);
        ctx.stroke();
      }
    }
    
    ctx.restore();
  }

  /**
   * 渲染坐标轴
   * @private
   */
  _renderAxes(width, height) {
    const { ctx, options } = this;
    const padding = this.options.layout.padding;
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;
    
    ctx.save();
    ctx.translate(padding.left, padding.top);
    
    // 绘制X轴
    if (options.scales.x?.display) {
      ctx.strokeStyle = '#666';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, chartHeight);
      ctx.lineTo(chartWidth, chartHeight);
      ctx.stroke();
      
      // 绘制X轴标签
      this._renderXAxisLabels(chartWidth, chartHeight);
      
      // 绘制X轴标题
      this._renderXAxisTitle(width, height);
    }
    
    // 绘制Y轴
    if (options.scales.y?.display) {
      ctx.strokeStyle = '#666';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, chartHeight);
      ctx.stroke();
      
      // 绘制Y轴标签
      this._renderYAxisLabels(chartHeight);
      
      // 绘制Y轴标题
      this._renderYAxisTitle(width, height);
    }
    
    ctx.restore();
  }

  /**
   * 渲染X轴标签
   * @private
   */
  _renderXAxisLabels(chartWidth, chartHeight) {
    const { ctx, options, data } = this;
    const labelsCount = data.labels.length;
    const step = chartWidth / (labelsCount - 1);
    
    ctx.fillStyle = options.scales.x.ticks.color || '#666';
    ctx.font = `${options.scales.x.ticks.font.size || 11}px ${options.scales.x.ticks.font.family || 'inherit'}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    
    data.labels.forEach((label, index) => {
      const x = index * step;
      const y = chartHeight + 10;
      ctx.fillText(label, x, y);
    });
  }

  /**
   * 渲染Y轴标签
   * @private
   */
  _renderYAxisLabels(chartHeight) {
    const { ctx, options } = this;
    
    // 假设5个刻度
    const ticksCount = 5;
    const step = chartHeight / (ticksCount - 1);
    
    ctx.fillStyle = options.scales.y.ticks.color || '#666';
    ctx.font = `${options.scales.y.ticks.font.size || 11}px ${options.scales.y.ticks.font.family || 'inherit'}`;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    
    for (let i = 0; i < ticksCount; i++) {
      const y = chartHeight - i * step;
      const value = (i / (ticksCount - 1) * this._getMaxValue()).toFixed(0);
      ctx.fillText(value, -10, y);
    }
  }

  /**
   * 渲染X轴标题
   * @private
   */
  _renderXAxisTitle(width, height) {
    const { ctx, options } = this;
    const { scales } = options;
    
    if (scales.x?.title?.display) {
      ctx.save();
      ctx.fillStyle = scales.x.title.color || '#666';
      ctx.font = `${scales.x.title.font.weight || 'bold'} ${scales.x.title.font.size || 12}px ${scales.x.title.font.family || 'inherit'}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      
      ctx.fillText(
        scales.x.title.text,
        width / 2,
        height - 20
      );
      ctx.restore();
    }
  }

  /**
   * 渲染Y轴标题
   * @private
   */
  _renderYAxisTitle(width, height) {
    const { ctx, options } = this;
    const { scales } = options;
    
    if (scales.y?.title?.display) {
      ctx.save();
      ctx.translate(20, height / 2);
      ctx.rotate(-Math.PI / 2);
      
      ctx.fillStyle = scales.y.title.color || '#666';
      ctx.font = `${scales.y.title.font.weight || 'bold'} ${scales.y.title.font.size || 12}px ${scales.y.title.font.family || 'inherit'}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      ctx.fillText(scales.y.title.text, 0, 0);
      ctx.restore();
    }
  }

  /**
   * 渲染线条
   * @private
   */
  _renderLine(dataset, datasetIndex, width, height) {
    const { ctx, options, data } = this;
    const padding = this.options.layout.padding;
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;
    const labelsCount = data.labels.length;
    const step = chartWidth / (labelsCount - 1);
    const maxValue = this._getMaxValue();
    
    ctx.save();
    ctx.translate(padding.left, padding.top);
    
    // 设置线条样式
    ctx.strokeStyle = dataset.borderColor || this._getDefaultColor(datasetIndex);
    ctx.lineWidth = dataset.borderWidth || options.elements.line.borderWidth || 2;
    ctx.lineCap = dataset.borderCapStyle || options.elements.line.borderCapStyle || 'round';
    ctx.lineJoin = dataset.borderJoinStyle || options.elements.line.borderJoinStyle || 'round';
    
    // 开始绘制线条
    ctx.beginPath();
    
    dataset.data.forEach((value, index) => {
      const x = index * step;
      const y = chartHeight - (value / maxValue) * chartHeight;
      
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    
    ctx.stroke();
    
    // 绘制数据点
    this._renderPoints(dataset, datasetIndex, chartWidth, chartHeight);
    
    ctx.restore();
  }

  /**
   * 渲染数据点
   * @private
   */
  _renderPoints(dataset, datasetIndex, chartWidth, chartHeight) {
    const { ctx, options, data } = this;
    const labelsCount = data.labels.length;
    const step = chartWidth / (labelsCount - 1);
    const maxValue = this._getMaxValue();
    
    dataset.data.forEach((value, index) => {
      const x = index * step;
      const y = chartHeight - (value / maxValue) * chartHeight;
      const radius = dataset.pointRadius || options.elements.point.radius || 4;
      
      // 绘制点背景
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fillStyle = dataset.pointBackgroundColor || '#fff';
      ctx.fill();
      
      // 绘制点边框
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.strokeStyle = dataset.pointBorderColor || dataset.borderColor || this._getDefaultColor(datasetIndex);
      ctx.lineWidth = dataset.pointBorderWidth || options.elements.point.borderWidth || 2;
      ctx.stroke();
    });
  }

  /**
   * 渲染柱状图
   * @private
   */
  _renderBars(dataset, datasetIndex, width, height) {
    const { ctx, options, data } = this;
    const padding = this.options.layout.padding;
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;
    const labelsCount = data.labels.length;
    const datasetsCount = data.datasets.length;
    const barWidth = (chartWidth / labelsCount) * 0.8 / datasetsCount;
    const maxValue = this._getMaxValue();
    
    ctx.save();
    ctx.translate(padding.left, padding.top);
    
    dataset.data.forEach((value, index) => {
      const barHeight = (value / maxValue) * chartHeight;
      const x = (index * (chartWidth / labelsCount)) + ((chartWidth / labelsCount) * 0.1) + (barWidth * datasetIndex);
      const y = chartHeight - barHeight;
      
      // 设置颜色
      const backgroundColor = Array.isArray(dataset.backgroundColor) 
        ? dataset.backgroundColor[index] 
        : dataset.backgroundColor || this._getDefaultColor(datasetIndex);
      
      // 绘制柱形
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(x, y, barWidth, barHeight);
      
      // 绘制边框
      if (dataset.borderWidth > 0) {
        ctx.strokeStyle = dataset.borderColor || '#000';
        ctx.lineWidth = dataset.borderWidth;
        ctx.strokeRect(x, y, barWidth, barHeight);
      }
    });
    
    ctx.restore();
  }

  /**
   * 渲染雷达图网格
   * @private
   */
  _renderRadarGrid(centerX, centerY, radius, labelsCount, angleStep) {
    const { ctx, options } = this;
    
    // 绘制径向网格线
    for (let level = 1; level <= 5; level++) {
      const levelRadius = (radius / 5) * level;
      
      ctx.beginPath();
      for (let i = 0; i < labelsCount; i++) {
        const angle = -Math.PI / 2 + (i * angleStep);
        const x = centerX + (Math.cos(angle) * levelRadius);
        const y = centerY + (Math.sin(angle) * levelRadius);
        
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.closePath();
      
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    
    // 绘制角度网格线
    for (let i = 0; i < labelsCount; i++) {
      const angle = -Math.PI / 2 + (i * angleStep);
      const x = centerX + (Math.cos(angle) * radius);
      const y = centerY + (Math.sin(angle) * radius);
      
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(x, y);
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }

  /**
   * 渲染雷达图标签
   * @private
   */
  _renderRadarLabels(centerX, centerY, radius, angleStep) {
    const { ctx, options, data } = this;
    
    ctx.fillStyle = options.scales.x?.ticks?.color || '#666';
    ctx.font = `${options.scales.x?.ticks?.font?.size || 11}px ${options.scales.x?.ticks?.font?.family || 'inherit'}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    data.labels.forEach((label, index) => {
      const angle = -Math.PI / 2 + (index * angleStep);
      const x = centerX + (Math.cos(angle) * (radius + 30));
      const y = centerY + (Math.sin(angle) * (radius + 30));
      
      ctx.fillText(label, x, y);
    });
  }

  /**
   * 渲染雷达图数据集
   * @private
   */
  _renderRadarDataset(dataset, datasetIndex, centerX, centerY, radius, angleStep) {
    const { ctx } = this;
    const maxValue = this._getMaxValue();
    
    ctx.beginPath();
    
    dataset.data.forEach((value, index) => {
      const dataRadius = (value / maxValue) * radius;
      const angle = -Math.PI / 2 + (index * angleStep);
      const x = centerX + (Math.cos(angle) * dataRadius);
      const y = centerY + (Math.sin(angle) * dataRadius);
      
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    
    ctx.closePath();
    
    // 设置填充样式
    const backgroundColor = dataset.backgroundColor || this._getDefaultColor(datasetIndex);
    ctx.fillStyle = backgroundColor.replace('rgb', 'rgba').replace(')', ', 0.2)');
    ctx.fill();
    
    // 设置边框样式
    ctx.strokeStyle = dataset.borderColor || this._getDefaultColor(datasetIndex);
    ctx.lineWidth = dataset.borderWidth || 2;
    ctx.stroke();
  }

  /**
   * 获取最大值
   * @private
   */
  _getMaxValue() {
    let maxValue = 0;
    
    if (!this.data || !this.data.datasets) return maxValue;
    
    this.data.datasets.forEach(dataset => {
      if (dataset.data && Array.isArray(dataset.data)) {
        const datasetMax = Math.max(...dataset.data);
        maxValue = Math.max(maxValue, datasetMax);
      }
    });
    
    return maxValue || 1; // 避免除以零
  }

  /**
   * 设置数据
   * @param {Object} data - 图表数据
   */
  setData(data) {
    this.data = data;
    
    // 触发数据更新回调
    if (typeof this.options.onDataUpdate === 'function') {
      try {
        this.options.onDataUpdate(data);
      } catch (error) {
        logger.error('图表数据更新回调执行失败', error);
      }
    }
    
    // 更新状态
    this.updateState({ data });
    
    // 重新渲染
    this.render();
  }

  /**
   * 获取数据
   * @returns {Object} 图表数据
   */
  getData() {
    return this.data;
  }

  /**
   * 添加数据集
   * @param {Object} dataset - 数据集
   * @returns {number} 数据集索引
   */
  addDataset(dataset) {
    if (!this.data) {
      this.data = { labels: [], datasets: [] };
    }
    
    this.data.datasets.push(dataset);
    this.render();
    
    return this.data.datasets.length - 1;
  }

  /**
   * 更新数据集
   * @param {number} index - 数据集索引
   * @param {Object} dataset - 新的数据集
   */
  updateDataset(index, dataset) {
    if (!this.data || !this.data.datasets || index < 0 || index >= this.data.datasets.length) {
      return;
    }
    
    this.data.datasets[index] = { ...this.data.datasets[index], ...dataset };
    this.render();
  }

  /**
   * 移除数据集
   * @param {number} index - 数据集索引
   */
  removeDataset(index) {
    if (!this.data || !this.data.datasets || index < 0 || index >= this.data.datasets.length) {
      return;
    }
    
    this.data.datasets.splice(index, 1);
    this.render();
  }

  /**
   * 切换数据集可见性
   * @param {number} index - 数据集索引
   */
  toggleDatasetVisibility(index) {
    if (!this.data || !this.data.datasets || index < 0 || index >= this.data.datasets.length) {
      return;
    }
    
    const dataset = this.data.datasets[index];
    dataset.hidden = !dataset.hidden;
    
    // 更新图例状态
    const legendItem = this.legendElement?.querySelector(`[data-dataset-index="${index}"]`);
    if (legendItem) {
      legendItem.classList.toggle('hidden', dataset.hidden);
    }
    
    this.render();
  }

  /**
   * 设置图表类型
   * @param {string} type - 图表类型
   */
  setType(type) {
    if (!type) return;
    
    this.options.type = type;
    this.render();
  }

  /**
   * 设置主题
   * @param {string} theme - 主题名称
   */
  setTheme(theme) {
    if (!theme) return;
    
    // 移除旧主题类
    this.element.classList.remove(`jev-chart-${this.options.theme}`);
    
    // 添加新主题类
    this.element.classList.add(`jev-chart-${theme}`);
    
    this.options.theme = theme;
    this.render();
  }

  /**
   * 调整大小
   */
  resize() {
    if (this.isRendered) {
      this._updateCanvasSize();
      this.render();
      
      // 触发调整大小回调
      if (typeof this.options.onResize === 'function') {
        try {
          this.options.onResize();
        } catch (error) {
          logger.error('图表调整大小回调执行失败', error);
        }
      }
    }
  }

  /**
   * 导出图表为图片
   * @param {string} format - 图片格式 ('png', 'jpeg')
   * @param {number} quality - 图片质量 (0-1)
   * @returns {string} 图片URL
   */
  toImage(format = 'png', quality = 0.9) {
    return this.canvasElement.toDataURL(`image/${format}`, quality);
  }

  /**
   * 显示加载状态
   */
  showLoading() {
    this.isLoading = true;
    this.isError = false;
    
    if (this.loadingElement) {
      this.loadingElement.style.display = 'flex';
    }
    
    if (this.errorElement) {
      this.errorElement.style.display = 'none';
    }
    
    this.updateState({ isLoading: true, isError: false });
  }

  /**
   * 隐藏加载状态
   */
  hideLoading() {
    this.isLoading = false;
    
    if (this.loadingElement) {
      this.loadingElement.style.display = 'none';
    }
    
    this.updateState({ isLoading: false });
  }

  /**
   * 显示错误状态
   * @param {string} message - 错误消息
   */
  showError(message) {
    this.isError = true;
    this.isLoading = false;
    
    if (this.errorElement) {
      this.errorElement.textContent = message || '加载失败';
      this.errorElement.style.display = 'flex';
    }
    
    if (this.loadingElement) {
      this.loadingElement.style.display = 'none';
    }
    
    this.updateState({ isError: true, isLoading: false });
  }

  /**
   * 隐藏错误状态
   */
  hideError() {
    this.isError = false;
    
    if (this.errorElement) {
      this.errorElement.style.display = 'none';
    }
    
    this.updateState({ isError: false });
  }

  /**
   * 清除图表
   */
  clear() {
    if (this.ctx) {
      this.ctx.clearRect(0, 0, this.canvasElement.width, this.canvasElement.height);
    }
    
    this.isRendered = false;
    this.updateState({ isRendered: false });
  }

  /**
   * 资源释放与清理
   */
  async destroy() {
    try {
      // 清除ResizeObserver
      if (this.resizeObserver) {
        this.resizeObserver.disconnect();
        this.resizeObserver = null;
      }
      
      // 移除DOM元素
      if (this.element && this.element.parentNode) {
        this.element.parentNode.removeChild(this.element);
      }
      
      // 清理引用
      this.canvasElement = null;
      this.legendElement = null;
      this.tooltipElement = null;
      this.loadingElement = null;
      this.errorElement = null;
      this.ctx = null;
      this.data = null;
      
    } catch (error) {
      logger.error('图表组件销毁失败', error);
    }
  }
}

export default Chart;