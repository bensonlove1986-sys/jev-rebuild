// JEV插件整合项目 - 性能监控与延迟图表组件

// 初始化JEV命名空间
window.JEV = window.JEV || {};

/**
 * 性能监控与延迟图表组件
 * 用于实时监控各模块处理时间，生成可视化图表
 */
class JEVPerformanceMonitor {
    constructor(options = {}) {
        this.options = {
            updateInterval: options.updateInterval || 1000, // 更新间隔(ms)
            chartHeight: options.chartHeight || 300,
            chartWidth: options.chartWidth || '100%',
            maxDataPoints: options.maxDataPoints || 50,
            elementId: options.elementId || 'jev-performance-monitor',
            ...options
        };
        
        // 模块处理时间数据
        this.performanceData = {
            bolo: [],
            ocr: [],
            translation: [],
            ai: [],
            apiRetries: [],
            batchMerges: [],
            timeouts: []
        };
        
        // 模块统计数据
        this.statsSummary = {
            bolo: { min: 0, max: 0, avg: 0, count: 0, total: 0 },
            ocr: { min: 0, max: 0, avg: 0, count: 0, total: 0 },
            translation: { min: 0, max: 0, avg: 0, count: 0, total: 0 },
            ai: { min: 0, max: 0, avg: 0, count: 0, total: 0 },
            api: { retries: 0, batchMerges: 0, timeouts: 0, successRate: 0 }
        };
        
        // 图表引用
        this.charts = {};
        
        // 初始化
        this.initialize();
        
        // 通知系统模块已加载
        if (window.CustomEvent) {
            const event = new CustomEvent('performanceMonitorLoaded', { detail: { instance: this } });
            window.dispatchEvent(event);
        }
    }
    
    /**
     * 初始化性能监控组件
     */
    initialize() {
        console.log('[Performance Monitor] Initializing with options:', this.options);
        
        // 创建DOM元素
        this.createDOMElement();
        
        // 初始化图表
        this.initializeCharts();
        
        // 启动定时更新
        this.startUpdateInterval();
    }
    
    /**
     * 创建性能监控DOM元素
     */
    createDOMElement() {
        // 检查是否已存在元素
        let container = document.getElementById(this.options.elementId);
        
        if (!container) {
            // 创建容器
            container = document.createElement('div');
            container.id = this.options.elementId;
            container.className = 'jev-performance-monitor';
            container.style.cssText = `
                background: #f8f9fa;
                border: 1px solid #dee2e6;
                border-radius: 8px;
                padding: 20px;
                margin: 20px 0;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            `;
            
            // 添加到页面
            const target = document.body || document.documentElement;
            target.appendChild(container);
        }
        
        // 创建标题
        const title = document.createElement('h3');
        title.textContent = 'JEV 模块性能监控';
        title.style.cssText = 'margin-top: 0; color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px;';
        container.appendChild(title);
        
        // 创建图表容器
        const chartsContainer = document.createElement('div');
        chartsContainer.className = 'jev-charts-container';
        chartsContainer.style.cssText = 'display: grid; grid-template-columns: 1fr; gap: 20px; margin-bottom: 20px;';
        container.appendChild(chartsContainer);
        
        // 创建处理时间图表
        const timeChartContainer = document.createElement('div');
        timeChartContainer.id = `${this.options.elementId}-time-chart`;
        timeChartContainer.style.cssText = 'height: 300px;';
        chartsContainer.appendChild(timeChartContainer);
        
        // 创建API状态图表
        const apiChartContainer = document.createElement('div');
        apiChartContainer.id = `${this.options.elementId}-api-chart`;
        apiChartContainer.style.cssText = 'height: 200px;';
        chartsContainer.appendChild(apiChartContainer);
        
        // 创建统计表格
        this.createStatsTable(container);
        
        // 保存引用
        this.container = container;
        this.timeChartContainer = timeChartContainer;
        this.apiChartContainer = apiChartContainer;
    }
    
    /**
     * 创建统计表格
     */
    createStatsTable(container) {
        const statsSection = document.createElement('div');
        statsSection.className = 'jev-stats-section';
        statsSection.style.cssText = 'background: white; border-radius: 6px; padding: 15px;';
        
        const statsTitle = document.createElement('h4');
        statsTitle.textContent = '模块处理统计';
        statsTitle.style.cssText = 'margin-top: 0; margin-bottom: 15px; color: #2c3e50;';
        statsSection.appendChild(statsTitle);
        
        // 创建表格
        const table = document.createElement('table');
        table.style.cssText = 'width: 100%; border-collapse: collapse;';
        
        // 表头
        const thead = document.createElement('thead');
        thead.innerHTML = `
            <tr style="background: #f8f9fa;">
                <th style="padding: 10px; text-align: left; border-bottom: 2px solid #dee2e6;">模块</th>
                <th style="padding: 10px; text-align: center; border-bottom: 2px solid #dee2e6;">最小(ms)</th>
                <th style="padding: 10px; text-align: center; border-bottom: 2px solid #dee2e6;">最大(ms)</th>
                <th style="padding: 10px; text-align: center; border-bottom: 2px solid #dee2e6;">平均(ms)</th>
                <th style="padding: 10px; text-align: center; border-bottom: 2px solid #dee2e6;">请求数</th>
            </tr>
        `;
        table.appendChild(thead);
        
        // 表体
        const tbody = document.createElement('tbody');
        tbody.id = `${this.options.elementId}-stats-body`;
        table.appendChild(tbody);
        
        statsSection.appendChild(table);
        container.appendChild(statsSection);
        
        // API统计
        const apiStatsSection = document.createElement('div');
        apiStatsSection.className = 'jev-api-stats-section';
        apiStatsSection.style.cssText = 'background: white; border-radius: 6px; padding: 15px; margin-top: 15px;';
        
        const apiStatsTitle = document.createElement('h4');
        apiStatsTitle.textContent = 'API优化统计';
        apiStatsTitle.style.cssText = 'margin-top: 0; margin-bottom: 15px; color: #2c3e50;';
        apiStatsSection.appendChild(apiStatsTitle);
        
        const apiStatsContent = document.createElement('div');
        apiStatsContent.id = `${this.options.elementId}-api-stats`;
        apiStatsContent.style.cssText = 'display: flex; gap: 30px; font-size: 14px;';
        apiStatsSection.appendChild(apiStatsContent);
        container.appendChild(apiStatsSection);
    }
    
    /**
     * 初始化图表
     */
    initializeCharts() {
        // 使用简单的Canvas图表实现，避免外部依赖
        this.initializeTimeChart();
        this.initializeApiChart();
    }
    
    /**
     * 初始化处理时间图表
     */
    initializeTimeChart() {
        const canvas = document.createElement('canvas');
        canvas.width = this.timeChartContainer.offsetWidth || 800;
        canvas.height = this.options.chartHeight;
        this.timeChartContainer.appendChild(canvas);
        
        this.charts.timeChart = canvas.getContext('2d');
    }
    
    /**
     * 初始化API状态图表
     */
    initializeApiChart() {
        const canvas = document.createElement('canvas');
        canvas.width = this.apiChartContainer.offsetWidth || 800;
        canvas.height = 200;
        this.apiChartContainer.appendChild(canvas);
        
        this.charts.apiChart = canvas.getContext('2d');
    }
    
    /**
     * 启动定时更新
     */
    startUpdateInterval() {
        this.updateInterval = setInterval(() => {
            this.drawCharts();
            this.updateStatsTable();
        }, this.options.updateInterval);
    }
    
    /**
     * 绘制图表
     */
    drawCharts() {
        if (this.charts.timeChart) {
            this.drawTimeChart();
        }
        
        if (this.charts.apiChart) {
            this.drawApiChart();
        }
    }
    
    /**
     * 绘制处理时间图表
     */
    drawTimeChart() {
        const ctx = this.charts.timeChart;
        const canvas = ctx.canvas;
        const width = canvas.width;
        const height = canvas.height;
        
        // 清空画布
        ctx.clearRect(0, 0, width, height);
        
        // 设置样式
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 1;
        
        // 绘制网格线和坐标轴
        this.drawGrid(ctx, width, height);
        
        // 获取所有数据
        const dataSets = [
            { data: this.performanceData.bolo, color: '#3498db', label: 'BOLO' },
            { data: this.performanceData.ocr, color: '#2ecc71', label: 'OCR' },
            { data: this.performanceData.translation, color: '#e74c3c', label: '翻译' },
            { data: this.performanceData.ai, color: '#f39c12', label: 'AI' }
        ];
        
        // 绘制数据线
        const maxDataLength = Math.max(...dataSets.map(d => d.data.length));
        if (maxDataLength > 0) {
            const xStep = width / Math.max(1, Math.min(maxDataLength - 1, this.options.maxDataPoints - 1));
            const maxValue = Math.max(1, ...dataSets.flatMap(d => d.data));
            const yStep = height / maxValue * 0.8; // 80%高度用于数据
            
            // 绘制每条数据线
            dataSets.forEach((set, index) => {
                if (set.data.length > 0) {
                    ctx.beginPath();
                    ctx.strokeStyle = set.color;
                    ctx.lineWidth = 2;
                    
                    set.data.slice(-this.options.maxDataPoints).forEach((value, i) => {
                        const x = i * xStep;
                        const y = height - 30 - value * yStep;
                        
                        if (i === 0) {
                            ctx.moveTo(x, y);
                        } else {
                            ctx.lineTo(x, y);
                        }
                    });
                    
                    ctx.stroke();
                    
                    // 绘制图例
                    ctx.fillStyle = set.color;
                    ctx.fillRect(10 + index * 80, 10, 15, 3);
                    ctx.fillStyle = '#333';
                    ctx.font = '12px Arial';
                    ctx.fillText(set.label, 30 + index * 80, 12);
                }
            });
        }
        
        // 绘制标题
        ctx.fillStyle = '#333';
        ctx.font = '14px Arial';
        ctx.fillText('模块处理时间 (毫秒)', 10, height - 10);
    }
    
    /**
     * 绘制API状态图表
     */
    drawApiChart() {
        const ctx = this.charts.apiChart;
        const canvas = ctx.canvas;
        const width = canvas.width;
        const height = canvas.height;
        
        // 清空画布
        ctx.clearRect(0, 0, width, height);
        
        // 设置样式
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 1;
        
        // 绘制坐标轴
        ctx.beginPath();
        ctx.moveTo(50, 10);
        ctx.lineTo(50, height - 30);
        ctx.lineTo(width - 10, height - 30);
        ctx.stroke();
        
        // 绘制柱状图
        const barWidth = 80;
        const barGap = 40;
        const startX = 80;
        const maxValue = Math.max(1, 
            this.performanceData.apiRetries[this.performanceData.apiRetries.length - 1] || 0,
            this.performanceData.batchMerges[this.performanceData.batchMerges.length - 1] || 0,
            this.performanceData.timeouts[this.performanceData.timeouts.length - 1] || 0
        );
        
        const barHeightScale = (height - 40) / Math.max(1, maxValue);
        
        // 重试次数
        const retriesCount = this.performanceData.apiRetries[this.performanceData.apiRetries.length - 1] || 0;
        const retriesHeight = retriesCount * barHeightScale;
        ctx.fillStyle = '#e74c3c';
        ctx.fillRect(startX, height - 30 - retriesHeight, barWidth, retriesHeight);
        ctx.fillStyle = '#333';
        ctx.font = '12px Arial';
        ctx.fillText('重试', startX + barWidth/2 - 10, height - 10);
        
        // 合并请求数
        const mergeCount = this.performanceData.batchMerges[this.performanceData.batchMerges.length - 1] || 0;
        const mergeHeight = mergeCount * barHeightScale;
        ctx.fillStyle = '#27ae60';
        ctx.fillRect(startX + barWidth + barGap, height - 30 - mergeHeight, barWidth, mergeHeight);
        ctx.fillStyle = '#333';
        ctx.fillText('合并', startX + barWidth + barGap + barWidth/2 - 10, height - 10);
        
        // 超时次数
        const timeoutCount = this.performanceData.timeouts[this.performanceData.timeouts.length - 1] || 0;
        const timeoutHeight = timeoutCount * barHeightScale;
        ctx.fillStyle = '#f39c12';
        ctx.fillRect(startX + 2*(barWidth + barGap), height - 30 - timeoutHeight, barWidth, timeoutHeight);
        ctx.fillStyle = '#333';
        ctx.fillText('超时', startX + 2*(barWidth + barGap) + barWidth/2 - 10, height - 10);
        
        // 绘制标题
        ctx.fillStyle = '#333';
        ctx.font = '14px Arial';
        ctx.fillText('API优化指标', 10, 15);
    }
    
    /**
     * 绘制网格
     */
    drawGrid(ctx, width, height) {
        // 水平网格线
        for (let i = 0; i <= 5; i++) {
            const y = 30 + (height - 60) * i / 5;
            ctx.beginPath();
            ctx.strokeStyle = '#e0e0e0';
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }
        
        // 垂直网格线
        for (let i = 0; i <= 10; i++) {
            const x = width * i / 10;
            ctx.beginPath();
            ctx.strokeStyle = '#e0e0e0';
            ctx.moveTo(x, 30);
            ctx.lineTo(x, height - 30);
            ctx.stroke();
        }
        
        // 坐标轴
        ctx.beginPath();
        ctx.strokeStyle = '#333';
        ctx.moveTo(0, height - 30);
        ctx.lineTo(width, height - 30);
        ctx.moveTo(0, height - 30);
        ctx.lineTo(0, 30);
        ctx.stroke();
    }
    
    /**
     * 更新统计表格
     */
    updateStatsTable() {
        const tbody = document.getElementById(`${this.options.elementId}-stats-body`);
        const apiStats = document.getElementById(`${this.options.elementId}-api-stats`);
        
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #dee2e6;">BOLO</td>
                    <td style="padding: 10px; text-align: center; border-bottom: 1px solid #dee2e6;">${this.statsSummary.bolo.min}</td>
                    <td style="padding: 10px; text-align: center; border-bottom: 1px solid #dee2e6;">${this.statsSummary.bolo.max}</td>
                    <td style="padding: 10px; text-align: center; border-bottom: 1px solid #dee2e6;">${this.statsSummary.bolo.avg.toFixed(1)}</td>
                    <td style="padding: 10px; text-align: center; border-bottom: 1px solid #dee2e6;">${this.statsSummary.bolo.count}</td>
                </tr>
                <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #dee2e6;">OCR</td>
                    <td style="padding: 10px; text-align: center; border-bottom: 1px solid #dee2e6;">${this.statsSummary.ocr.min}</td>
                    <td style="padding: 10px; text-align: center; border-bottom: 1px solid #dee2e6;">${this.statsSummary.ocr.max}</td>
                    <td style="padding: 10px; text-align: center; border-bottom: 1px solid #dee2e6;">${this.statsSummary.ocr.avg.toFixed(1)}</td>
                    <td style="padding: 10px; text-align: center; border-bottom: 1px solid #dee2e6;">${this.statsSummary.ocr.count}</td>
                </tr>
                <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #dee2e6;">翻译</td>
                    <td style="padding: 10px; text-align: center; border-bottom: 1px solid #dee2e6;">${this.statsSummary.translation.min}</td>
                    <td style="padding: 10px; text-align: center; border-bottom: 1px solid #dee2e6;">${this.statsSummary.translation.max}</td>
                    <td style="padding: 10px; text-align: center; border-bottom: 1px solid #dee2e6;">${this.statsSummary.translation.avg.toFixed(1)}</td>
                    <td style="padding: 10px; text-align: center; border-bottom: 1px solid #dee2e6;">${this.statsSummary.translation.count}</td>
                </tr>
                <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #dee2e6;">AI</td>
                    <td style="padding: 10px; text-align: center; border-bottom: 1px solid #dee2e6;">${this.statsSummary.ai.min}</td>
                    <td style="padding: 10px; text-align: center; border-bottom: 1px solid #dee2e6;">${this.statsSummary.ai.max}</td>
                    <td style="padding: 10px; text-align: center; border-bottom: 1px solid #dee2e6;">${this.statsSummary.ai.avg.toFixed(1)}</td>
                    <td style="padding: 10px; text-align: center; border-bottom: 1px solid #dee2e6;">${this.statsSummary.ai.count}</td>
                </tr>
            `;
        }
        
        if (apiStats) {
            apiStats.innerHTML = `
                <div><strong>重试次数:</strong> ${this.statsSummary.api.retries}</div>
                <div><strong>请求合并数:</strong> ${this.statsSummary.api.batchMerges}</div>
                <div><strong>超时次数:</strong> ${this.statsSummary.api.timeouts}</div>
                <div><strong>成功率:</strong> ${this.statsSummary.api.successRate.toFixed(1)}%</div>
            `;
        }
    }
    
    /**
     * 更新模块性能数据
     */
    updatePerformanceData(module, processingTime) {
        if (this.performanceData[module]) {
            // 添加新数据点
            this.performanceData[module].push(processingTime);
            
            // 限制数据点数量
            if (this.performanceData[module].length > this.options.maxDataPoints) {
                this.performanceData[module].shift();
            }
            
            // 更新统计
            this.updateModuleStats(module, processingTime);
        }
    }
    
    /**
     * 更新API统计数据
     */
    updateAPIStats(retries, batchMerges, timeouts) {
        // 更新API重试数据
        if (this.performanceData.apiRetries) {
            this.performanceData.apiRetries.push(retries);
            if (this.performanceData.apiRetries.length > this.options.maxDataPoints) {
                this.performanceData.apiRetries.shift();
            }
        }
        
        // 更新批量合并数据
        if (this.performanceData.batchMerges) {
            this.performanceData.batchMerges.push(batchMerges);
            if (this.performanceData.batchMerges.length > this.options.maxDataPoints) {
                this.performanceData.batchMerges.shift();
            }
        }
        
        // 更新超时数据
        if (this.performanceData.timeouts) {
            this.performanceData.timeouts.push(timeouts);
            if (this.performanceData.timeouts.length > this.options.maxDataPoints) {
                this.performanceData.timeouts.shift();
            }
        }
        
        // 更新统计摘要
        this.statsSummary.api.retries = retries;
        this.statsSummary.api.batchMerges = batchMerges;
        this.statsSummary.api.timeouts = timeouts;
        
        // 计算成功率
        const totalRequests = this.getTotalRequests();
        const successfulRequests = totalRequests - timeouts;
        this.statsSummary.api.successRate = totalRequests > 0 ? (successfulRequests / totalRequests) * 100 : 0;
    }
    
    /**
     * 更新模块统计信息
     */
    updateModuleStats(module, processingTime) {
        if (this.statsSummary[module]) {
            const stats = this.statsSummary[module];
            
            // 更新统计数据
            if (stats.count === 0) {
                stats.min = processingTime;
                stats.max = processingTime;
            } else {
                stats.min = Math.min(stats.min, processingTime);
                stats.max = Math.max(stats.max, processingTime);
            }
            
            stats.total += processingTime;
            stats.count++;
            stats.avg = stats.total / stats.count;
        }
    }
    
    /**
     * 获取总请求数
     */
    getTotalRequests() {
        const { bolo, ocr, translation, ai } = this.statsSummary;
        return bolo.count + ocr.count + translation.count + ai.count;
    }
    
    /**
     * 获取性能报告
     */
    getPerformanceReport() {
        return {
            summary: this.statsSummary,
            detailedData: this.performanceData,
            timestamp: new Date().toISOString()
        };
    }
    
    /**
     * 重置性能数据
     */
    resetPerformanceData() {
        // 清空性能数据
        Object.keys(this.performanceData).forEach(key => {
            this.performanceData[key] = [];
        });
        
        // 重置统计数据
        Object.keys(this.statsSummary).forEach(key => {
            const moduleStats = this.statsSummary[key];
            if (typeof moduleStats === 'object' && moduleStats !== null) {
                if (moduleStats.min !== undefined) {
                    // 模块统计
                    moduleStats.min = 0;
                    moduleStats.max = 0;
                    moduleStats.avg = 0;
                    moduleStats.count = 0;
                    moduleStats.total = 0;
                } else {
                    // API统计
                    moduleStats.retries = 0;
                    moduleStats.batchMerges = 0;
                    moduleStats.timeouts = 0;
                    moduleStats.successRate = 0;
                }
            }
        });
        
        // 重绘图表
        this.drawCharts();
        this.updateStatsTable();
    }
    
    /**
     * 销毁性能监控器
     */
    destroy() {
        // 清除定时器
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
        
        // 移除DOM元素
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
        
        console.log('[Performance Monitor] Destroyed');
    }
}

// 注册为JEV模块
window.JEV.PerformanceMonitor = new JEVPerformanceMonitor();

// 导出模块供其他组件使用
module.exports = JEVPerformanceMonitor;
