// JEV-UI-Alignment-Pro-v3.0 - 性能监控模块

/**
 * 性能监控类
 * 处理实时性能数据采集、图表渲染和报告生成
 */
class PerformanceMonitor {
  constructor() {
    this.dataPoints = {
      cpu: [],
      kvCalls: [],
      latency: [],
      connections: []
    };
    this.maxDataPoints = 30; // 最大数据点数量
    this.updateInterval = 10000; // 更新间隔（毫秒）
    this.intervalId = null;
    this.isMonitoring = false;
    this.chartInstances = {};
    
    // 初始化
    this.init();
  }

  /**
   * 初始化性能监控
   */
  init() {
    // 等待DOM加载完成
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', this.onDOMLoaded.bind(this));
    } else {
      this.onDOMLoaded();
    }
  }

  /**
   * DOM加载完成后的初始化
   */
  onDOMLoaded() {
    // 创建监控面板DOM
    this.createMonitorPanel();
    
    // 初始化图表
    this.initCharts();
    
    // 开始监控
    this.startMonitoring();
    
    console.log('性能监控初始化完成');
  }

  /**
   * 创建监控面板DOM结构
   */
  createMonitorPanel() {
    // 检查是否已有监控面板
    if (document.getElementById('monitorPanel')) return;
    
    // 创建监控面板容器
    const panel = document.createElement('div');
    panel.className = 'monitor-panel glass';
    panel.id = 'monitorPanel';
    
    // CPU监控项
    panel.appendChild(this.createMonitorItem('CPU使用率', 'monitorCpu', '%', '🔵'));
    
    // KV I/O监控项
    panel.appendChild(this.createMonitorItem('KV I/O (次/分钟)', 'monitorKv', '', '🟢'));
    
    // 延迟监控项
    panel.appendChild(this.createMonitorItem('平均延迟', 'monitorLatency', 'ms', '🟣'));
    
    // 连接数监控项
    panel.appendChild(this.createMonitorItem('当前连接数', 'monitorConnections', '', '🟡'));
    
    // 查找合适位置插入
    const targetElement = document.querySelector('.main-content .card:first-child');
    if (targetElement) {
      targetElement.parentNode.insertBefore(panel, targetElement);
    } else {
      const mainContent = document.querySelector('.main-content');
      if (mainContent) {
        mainContent.insertBefore(panel, mainContent.firstChild);
      }
    }
    
    // 创建导出按钮
    this.createExportButton();
    
    // 创建详细监控卡片
    this.createDetailedMonitorCard();
  }

  /**
   * 创建监控项
   */
  createMonitorItem(label, valueId, unit, icon) {
    const item = document.createElement('div');
    item.className = 'monitor-item';
    
    const header = document.createElement('div');
    header.className = 'flex justify-between items-center mb-2';
    
    const labelSpan = document.createElement('span');
    labelSpan.className = 'monitor-label';
    labelSpan.innerHTML = `${icon} ${label}`;
    
    const statusBadge = document.createElement('span');
    statusBadge.className = 'status-indicator status-online';
    statusBadge.title = '正常';
    
    header.appendChild(labelSpan);
    header.appendChild(statusBadge);
    
    const valueContainer = document.createElement('div');
    valueContainer.className = 'flex items-baseline';
    
    const valueSpan = document.createElement('span');
    valueSpan.className = 'monitor-value';
    valueSpan.id = valueId;
    valueSpan.textContent = '--';
    
    const unitSpan = document.createElement('span');
    unitSpan.className = 'monitor-unit';
    unitSpan.textContent = unit;
    
    valueContainer.appendChild(valueSpan);
    valueContainer.appendChild(unitSpan);
    
    item.appendChild(header);
    item.appendChild(valueContainer);
    
    return item;
  }

  /**
   * 创建导出按钮
   */
  createExportButton() {
    const navbarRight = document.querySelector('.navbar-right');
    if (!navbarRight) return;
    
    const exportBtn = document.createElement('button');
    exportBtn.className = 'btn btn-secondary';
    exportBtn.id = 'exportMetricsBtn';
    exportBtn.innerHTML = '📊 导出报告';
    exportBtn.title = '导出性能监控报告';
    
    exportBtn.addEventListener('click', () => {
      if (window.jevUI && typeof window.jevUI.exportPerformanceReport === 'function') {
        window.jevUI.exportPerformanceReport();
      } else {
        this.exportReport();
      }
    });
    
    navbarRight.appendChild(exportBtn);
  }

  /**
   * 创建详细监控卡片
   */
  createDetailedMonitorCard() {
    const mainContent = document.querySelector('.main-content');
    if (!mainContent) return;
    
    const card = document.createElement('div');
    card.className = 'card glass';
    
    const header = document.createElement('div');
    header.className = 'card-header';
    
    const title = document.createElement('h2');
    title.className = 'card-title';
    title.textContent = '系统性能详情';
    
    header.appendChild(title);
    
    const content = document.createElement('div');
    content.className = 'card-content';
    
    // 创建图表容器
    const chartContainer = document.createElement('div');
    chartContainer.className = 'chart-container';
    chartContainer.style.height = '400px';
    chartContainer.id = 'performanceChart';
    
    content.appendChild(chartContainer);
    
    card.appendChild(header);
    card.appendChild(content);
    
    // 添加到主内容区
    mainContent.appendChild(card);
  }

  /**
   * 初始化图表
   */
  initCharts() {
    // 这里使用简化的图表实现，如果页面中引入了Recharts库，可以使用完整功能
    this.renderSimpleCharts();
  }

  /**
   * 渲染简化版图表
   */
  renderSimpleCharts() {
    const chartContainer = document.getElementById('performanceChart');
    if (!chartContainer) return;
    
    // 创建图表标题
    const title = document.createElement('div');
    title.className = 'text-center font-semibold mb-4';
    title.textContent = '性能趋势图（最近30个数据点）';
    chartContainer.appendChild(title);
    
    // 创建图例
    const legend = document.createElement('div');
    legend.className = 'flex justify-center gap-lg mb-4';
    
    const legendItems = [
      { color: '#3B82F6', label: 'CPU使用率' },
      { color: '#10B981', label: 'KV I/O' },
      { color: '#8B5CF6', label: '延迟' },
      { color: '#F59E0B', label: '连接数' }
    ];
    
    legendItems.forEach(item => {
      const legendItem = document.createElement('div');
      legendItem.className = 'flex items-center';
      
      const colorBox = document.createElement('div');
      colorBox.style.width = '12px';
      colorBox.style.height = '12px';
      colorBox.style.backgroundColor = item.color;
      colorBox.style.borderRadius = '3px';
      colorBox.style.marginRight = '6px';
      
      const labelSpan = document.createElement('span');
      labelSpan.className = 'text-sm';
      labelSpan.textContent = item.label;
      
      legendItem.appendChild(colorBox);
      legendItem.appendChild(labelSpan);
      legend.appendChild(legendItem);
    });
    
    chartContainer.appendChild(legend);
    
    // 创建简化的图表显示区域
    const placeholders = document.createElement('div');
    placeholders.className = 'space-y-4';
    
    Object.keys(this.dataPoints).forEach(key => {
      const barContainer = document.createElement('div');
      barContainer.className = 'relative';
      barContainer.style.height = '60px';
      barContainer.style.borderRadius = 'var(--border-radius-small)';
      barContainer.style.backgroundColor = 'var(--bg-secondary)';
      barContainer.style.padding = '8px';
      
      // 添加标签
      const label = document.createElement('div');
      label.className = 'text-xs text-muted mb-2';
      label.textContent = this.getMetricLabel(key);
      barContainer.appendChild(label);
      
      // 添加简化的条形图表示
      const barWrapper = document.createElement('div');
      barWrapper.className = 'h-full relative';
      
      const bar = document.createElement('div');
      bar.style.height = '100%';
      bar.style.width = '0%';
      bar.style.backgroundColor = this.getMetricColor(key);
      bar.style.borderRadius = '4px';
      bar.style.transition = 'width 0.5s ease';
      bar.id = `chartBar-${key}`;
      
      barWrapper.appendChild(bar);
      barContainer.appendChild(barWrapper);
      placeholders.appendChild(barContainer);
    });
    
    chartContainer.appendChild(placeholders);
  }

  /**
   * 获取指标标签
   */
  getMetricLabel(metric) {
    const labels = {
      cpu: 'CPU使用率 (%)',
      kvCalls: 'KV I/O 调用数',
      latency: '平均延迟 (ms)',
      connections: '当前连接数'
    };
    return labels[metric] || metric;
  }

  /**
   * 获取指标颜色
   */
  getMetricColor(metric) {
    const colors = {
      cpu: 'rgba(59, 130, 246, 0.8)',
      kvCalls: 'rgba(16, 185, 129, 0.8)',
      latency: 'rgba(139, 92, 246, 0.8)',
      connections: 'rgba(245, 158, 11, 0.8)'
    };
    return colors[metric] || 'rgba(100, 116, 139, 0.8)';
  }

  /**
   * 开始监控
   */
  startMonitoring() {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    
    // 立即获取一次数据
    this.fetchMetrics();
    
    // 设置定时更新
    this.intervalId = setInterval(() => {
      this.fetchMetrics();
    }, this.updateInterval);
  }

  /**
   * 停止监控
   */
  stopMonitoring() {
    if (!this.isMonitoring) return;
    
    this.isMonitoring = false;
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * 获取性能指标
   */
  async fetchMetrics() {
    try {
      // 尝试使用全局jevUI的API请求方法
      if (window.jevUI && typeof window.jevUI.apiRequest === 'function') {
        const response = await window.jevUI.apiRequest('/api/metrics', 'GET');
        
        if (response.success) {
          this.updateMetrics(response.data);
        } else {
          // 使用模拟数据
          this.updateMetrics(this.generateMockMetrics());
        }
      } else {
        // 使用模拟数据
        this.updateMetrics(this.generateMockMetrics());
      }
    } catch (error) {
      console.error('获取性能指标失败:', error);
      // 使用模拟数据
      this.updateMetrics(this.generateMockMetrics());
    }
  }

  /**
   * 生成模拟性能指标
   */
  generateMockMetrics() {
    // 生成有一定波动但合理的模拟数据
    const baseValues = {
      cpu: 25,
      kvCalls: 800,
      latency: 90,
      connections: 30
    };
    
    const metrics = {};
    
    Object.entries(baseValues).forEach(([key, base]) => {
      // 添加-10%到+10%的随机波动
      const fluctuation = base * 0.2 * (Math.random() - 0.5);
      metrics[key] = Math.max(0, base + fluctuation);
    });
    
    return metrics;
  }

  /**
   * 更新性能指标数据
   */
  updateMetrics(metrics) {
    const timestamp = new Date().toLocaleTimeString();
    
    // 更新数据点
    Object.keys(metrics).forEach(key => {
      if (this.dataPoints[key]) {
        this.dataPoints[key].push({
          timestamp,
          value: metrics[key]
        });
        
        // 保持数据点数量限制
        if (this.dataPoints[key].length > this.maxDataPoints) {
          this.dataPoints[key].shift();
        }
        
        // 更新UI显示
        this.updateMetricUI(key, metrics[key]);
        
        // 更新图表
        this.updateChart(key);
      }
    });
    
    // 更新状态指示器
    this.updateStatusIndicators(metrics);
  }

  /**
   * 更新单个指标UI
   */
  updateMetricUI(metric, value) {
    const element = document.getElementById(`monitor${metric.charAt(0).toUpperCase() + metric.slice(1)}`);
    if (element) {
      // 格式化显示值
      let displayValue = value;
      
      if (metric === 'cpu' || metric === 'latency') {
        displayValue = Math.round(value);
      } else if (metric === 'kvCalls') {
        displayValue = Math.round(value);
      } else {
        displayValue = Math.round(value);
      }
      
      // 添加数字变化动画
      this.animateNumberChange(element, displayValue);
    }
  }

  /**
   * 数字变化动画
   */
  animateNumberChange(element, targetValue) {
    const currentValue = parseInt(element.textContent) || 0;
    const duration = 500; // 动画持续时间
    const startTime = performance.now();
    
    function updateNumber(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // 使用缓动函数
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const current = Math.floor(currentValue + (targetValue - currentValue) * easeOut);
      
      element.textContent = current;
      
      if (progress < 1) {
        requestAnimationFrame(updateNumber);
      } else {
        element.textContent = targetValue;
      }
    }
    
    requestAnimationFrame(updateNumber);
  }

  /**
   * 更新图表
   */
  updateChart(metric) {
    const barElement = document.getElementById(`chartBar-${metric}`);
    if (!barElement) return;
    
    // 获取最新数据点
    const data = this.dataPoints[metric];
    if (!data || data.length === 0) return;
    
    // 计算最大值（用于归一化）
    const maxValue = this.getMaxValueForMetric(metric);
    
    // 获取最新值
    const latestValue = data[data.length - 1].value;
    
    // 计算百分比宽度
    const percentage = Math.min((latestValue / maxValue) * 100, 100);
    
    // 更新条形图宽度
    barElement.style.width = `${percentage}%`;
  }

  /**
   * 获取指标的最大值（用于归一化）
   */
  getMaxValueForMetric(metric) {
    const maxValues = {
      cpu: 100, // CPU最大100%
      kvCalls: 2000, // 假设最大2000次/分钟
      latency: 500, // 假设最大500ms
      connections: 100 // 假设最大100个连接
    };
    
    return maxValues[metric] || 100;
  }

  /**
   * 更新状态指示器
   */
  updateStatusIndicators(metrics) {
    const statusIndicators = document.querySelectorAll('.status-indicator');
    
    // 检查CPU状态
    if (metrics.cpu > 80) {
      this.updateStatusIndicator(statusIndicators[0], 'warning');
    } else if (metrics.cpu > 90) {
      this.updateStatusIndicator(statusIndicators[0], 'error');
    } else {
      this.updateStatusIndicator(statusIndicators[0], 'online');
    }
    
    // 检查KV I/O状态
    if (metrics.kvCalls > 1500) {
      this.updateStatusIndicator(statusIndicators[1], 'warning');
    } else {
      this.updateStatusIndicator(statusIndicators[1], 'online');
    }
    
    // 检查延迟状态
    if (metrics.latency > 200) {
      this.updateStatusIndicator(statusIndicators[2], 'warning');
    } else if (metrics.latency > 300) {
      this.updateStatusIndicator(statusIndicators[2], 'error');
    } else {
      this.updateStatusIndicator(statusIndicators[2], 'online');
    }
    
    // 检查连接数状态
    if (metrics.connections > 80) {
      this.updateStatusIndicator(statusIndicators[3], 'warning');
    } else if (metrics.connections > 90) {
      this.updateStatusIndicator(statusIndicators[3], 'error');
    } else {
      this.updateStatusIndicator(statusIndicators[3], 'online');
    }
  }

  /**
   * 更新单个状态指示器
   */
  updateStatusIndicator(indicator, status) {
    if (!indicator) return;
    
    // 移除所有状态类
    indicator.classList.remove('status-online', 'status-warning', 'status-error', 'status-offline');
    
    // 添加新状态类
    indicator.classList.add(`status-${status}`);
    
    // 更新标题
    const statusTexts = {
      online: '正常',
      warning: '警告',
      error: '错误',
      offline: '离线'
    };
    
    indicator.title = statusTexts[status] || '未知';
  }

  /**
   * 导出性能报告
   */
  exportReport() {
    const timestamp = Date.now();
    const reportData = {
      generatedAt: new Date().toISOString(),
      metrics: this.dataPoints,
      summary: this.calculateSummaryMetrics(),
      systemInfo: {
        browser: navigator.userAgent,
        screenSize: `${window.innerWidth}x${window.innerHeight}`,
        theme: document.documentElement.getAttribute('data-theme') || 'dark'
      }
    };
    
    const dataStr = JSON.stringify(reportData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `jev_ui_metrics_${timestamp}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    
    // 显示导出成功通知
    if (window.jevUI && typeof window.jevUI.showNotification === 'function') {
      window.jevUI.showNotification('性能报告已导出', 'success');
    }
  }

  /**
   * 计算汇总指标
   */
  calculateSummaryMetrics() {
    const summary = {};
    
    Object.entries(this.dataPoints).forEach(([key, points]) => {
      if (points.length > 0) {
        const values = points.map(p => p.value);
        summary[key] = {
          average: values.reduce((a, b) => a + b, 0) / values.length,
          max: Math.max(...values),
          min: Math.min(...values),
          latest: values[values.length - 1],
          samples: values.length
        };
      }
    });
    
    return summary;
  }

  /**
   * 获取当前性能状态摘要
   */
  getPerformanceSummary() {
    const latestMetrics = {};
    
    Object.entries(this.dataPoints).forEach(([key, points]) => {
      if (points.length > 0) {
        latestMetrics[key] = points[points.length - 1].value;
      }
    });
    
    // 评估整体状态
    let overallStatus = 'excellent';
    let statusMessage = '系统性能优秀';
    
    if (latestMetrics.cpu > 80 || latestMetrics.latency > 200) {
      overallStatus = 'warning';
      statusMessage = '系统负载较高';
    }
    
    if (latestMetrics.cpu > 90 || latestMetrics.latency > 300) {
      overallStatus = 'critical';
      statusMessage = '系统性能危急';
    }
    
    return {
      metrics: latestMetrics,
      status: overallStatus,
      message: statusMessage,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 手动刷新数据
   */
  refreshData() {
    this.fetchMetrics();
  }
}

// 初始化性能监控
function initPerformanceMonitor() {
  // 等待DOM加载完成
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      window.performanceMonitor = new PerformanceMonitor();
    });
  } else {
    window.performanceMonitor = new PerformanceMonitor();
  }
}

// 导出函数
export { PerformanceMonitor, initPerformanceMonitor };

// 自动初始化
initPerformanceMonitor();