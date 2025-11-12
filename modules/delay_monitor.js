// JEV插件整合项目 - 延迟监控图表组件

// 初始化JEV命名空间
window.JEV = window.JEV || {};

/**
 * 延迟监控组件，用于实时监控各模块处理时间
 */
class DelayMonitor {
    constructor() {
        // 存储历史处理时间数据
        this.processingHistory = {
            bolo: [],
            ocr: [],
            translation: [],
            ai: [],
            total: []
        };
        
        // 配置参数
        this.config = {
            maxHistoryPoints: 50,
            updateInterval: 1000, // 1秒更新一次
            warningThreshold: 2000, // 警告阈值（毫秒）
            criticalThreshold: 3000 // 严重阈值（毫秒）
        };
        
        // 图表元素引用
        this.chartElement = null;
        this.canvasContext = null;
        this.statsElement = null;
        
        // 更新定时器
        this.updateTimer = null;
        
        // 初始化时输出日志
        console.log('[Delay Monitor] Component initialized');
    }
    
    /**
     * 初始化图表和统计信息显示
     * @param {string} chartSelector - 图表canvas元素选择器
     * @param {string} statsSelector - 统计信息容器选择器
     */
    initialize(chartSelector = '#delayChart', statsSelector = '#statsContainer') {
        try {
            // 获取图表元素
            this.chartElement = document.querySelector(chartSelector);
            if (!this.chartElement) {
                console.error('[Delay Monitor] Canvas element not found');
                return false;
            }
            
            // 获取Canvas上下文
            this.canvasContext = this.chartElement.getContext('2d');
            if (!this.canvasContext) {
                console.error('[Delay Monitor] Cannot get canvas context');
                return false;
            }
            
            // 获取统计信息容器
            this.statsElement = document.querySelector(statsSelector);
            if (!this.statsElement) {
                console.warn('[Delay Monitor] Stats container not found, will not update stats');
            }
            
            // 设置Canvas尺寸
            this.resizeCanvas();
            
            // 开始定时更新
            this.startAutoUpdate();
            
            console.log('[Delay Monitor] Components initialized successfully');
            return true;
        } catch (error) {
            console.error('[Delay Monitor] Error during initialization:', error);
            return false;
        }
    }
    
    /**
     * 调整Canvas尺寸以适应容器
     */
    resizeCanvas() {
        if (!this.chartElement) return;
        
        const container = this.chartElement.parentElement;
        if (container) {
            this.chartElement.width = container.clientWidth || 600;
            this.chartElement.height = container.clientHeight || 300;
        }
    }
    
    /**
     * 记录处理时间数据
     * @param {string} moduleName - 模块名称
     * @param {number} processingTime - 处理时间（毫秒）
     */
    recordProcessingTime(moduleName, processingTime) {
        if (!this.processingHistory[moduleName]) {
            console.warn(`[Delay Monitor] Unknown module: ${moduleName}`);
            return;
        }
        
        // 添加新数据点
        this.processingHistory[moduleName].push({
            time: Date.now(),
            value: processingTime
        });
        
        // 限制历史数据点数量
        if (this.processingHistory[moduleName].length > this.config.maxHistoryPoints) {
            this.processingHistory[moduleName].shift();
        }
        
        // 检查是否超过阈值
        this.checkThreshold(moduleName, processingTime);
        
        // 立即更新图表
        this.updateChart();
        this.updateStats();
    }
    
    /**
     * 记录完整处理流程的时间数据
     * @param {object} processingData - 处理数据对象
     */
    recordProcessingFlow(processingData) {
        const { processingTimes, totalProcessingTime } = processingData;
        
        // 记录各模块处理时间
        if (processingTimes.bolo !== undefined) {
            this.recordProcessingTime('bolo', processingTimes.bolo);
        }
        if (processingTimes.ocr !== undefined) {
            this.recordProcessingTime('ocr', processingTimes.ocr);
        }
        if (processingTimes.translation !== undefined) {
            this.recordProcessingTime('translation', processingTimes.translation);
        }
        if (processingTimes.ai !== undefined) {
            this.recordProcessingTime('ai', processingTimes.ai);
        }
        if (totalProcessingTime !== undefined) {
            this.recordProcessingTime('total', totalProcessingTime);
        }
    }
    
    /**
     * 检查是否超过阈值
     * @param {string} moduleName - 模块名称
     * @param {number} processingTime - 处理时间
     */
    checkThreshold(moduleName, processingTime) {
        if (processingTime >= this.config.criticalThreshold) {
            console.error(`[Delay Monitor] CRITICAL: ${moduleName} processing time (${processingTime.toFixed(2)}ms) exceeds critical threshold`);
        } else if (processingTime >= this.config.warningThreshold) {
            console.warn(`[Delay Monitor] WARNING: ${moduleName} processing time (${processingTime.toFixed(2)}ms) exceeds warning threshold`);
        }
    }
    
    /**
     * 开始自动更新
     */
    startAutoUpdate() {
        // 清除现有定时器
        if (this.updateTimer) {
            clearInterval(this.updateTimer);
        }
        
        // 设置新的定时器
        this.updateTimer = setInterval(() => {
            this.updateChart();
            this.updateStats();
        }, this.config.updateInterval);
    }
    
    /**
     * 停止自动更新
     */
    stopAutoUpdate() {
        if (this.updateTimer) {
            clearInterval(this.updateTimer);
            this.updateTimer = null;
        }
    }
    
    /**
     * 更新图表显示
     */
    updateChart() {
        if (!this.canvasContext || !this.chartElement) return;
        
        const ctx = this.canvasContext;
        const width = this.chartElement.width;
        const height = this.chartElement.height;
        
        // 清空画布
        ctx.clearRect(0, 0, width, height);
        
        // 绘制背景
        this.drawBackground(ctx, width, height);
        
        // 绘制网格线
        this.drawGrid(ctx, width, height);
        
        // 绘制各模块的图表
        const moduleColors = {
            bolo: '#4CAF50', // 绿色
            ocr: '#2196F3',  // 蓝色
            translation: '#FF9800', // 橙色
            ai: '#9C27B0',   // 紫色
            total: '#F44336' // 红色
        };
        
        // 找出最大Y值用于缩放
        let maxY = 1000; // 默认最大值
        Object.keys(this.processingHistory).forEach(module => {
            const maxValue = Math.max(...this.processingHistory[module].map(item => item.value), 0);
            if (maxValue > maxY) maxY = maxValue;
        });
        
        // 留出一些余量
        maxY = Math.ceil(maxY * 1.2);
        
        // 绘制每个模块的数据
        Object.keys(moduleColors).forEach(module => {
            this.drawLine(ctx, width, height, this.processingHistory[module], moduleColors[module], maxY);
        });
        
        // 绘制图例
        this.drawLegend(ctx, width, height, moduleColors);
    }
    
    /**
     * 绘制背景
     */
    drawBackground(ctx, width, height) {
        ctx.fillStyle = '#f5f5f5';
        ctx.fillRect(0, 0, width, height);
    }
    
    /**
     * 绘制网格线
     */
    drawGrid(ctx, width, height) {
        ctx.strokeStyle = '#e0e0e0';
        ctx.lineWidth = 1;
        
        // 水平网格线
        const gridSpacing = 5;
        for (let i = 0; i <= gridSpacing; i++) {
            const y = (height / gridSpacing) * i;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }
        
        // 垂直网格线
        const verticalSpacing = 10;
        for (let i = 0; i <= verticalSpacing; i++) {
            const x = (width / verticalSpacing) * i;
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();
        }
    }
    
    /**
     * 绘制数据线
     */
    drawLine(ctx, width, height, data, color, maxY) {
        if (!data || data.length < 2) return;
        
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        
        data.forEach((point, index) => {
            const x = (index / (data.length - 1)) * width;
            const y = height - (point.value / maxY) * height;
            
            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });
        
        ctx.stroke();
    }
    
    /**
     * 绘制图例
     */
    drawLegend(ctx, width, height, colors) {
        ctx.fillStyle = '#333';
        ctx.font = '12px Arial';
        
        const legendItems = {
            bolo: 'BOLO Extractor',
            ocr: 'OCR Engine',
            translation: 'Translation Engine',
            ai: 'AI Dialog System',
            total: 'Total Time'
        };
        
        let yPos = 20;
        const legendX = 10;
        const boxSize = 10;
        
        Object.keys(legendItems).forEach(key => {
            if (colors[key]) {
                // 绘制颜色方块
                ctx.fillStyle = colors[key];
                ctx.fillRect(legendX, yPos - 8, boxSize, boxSize);
                
                // 绘制文字
                ctx.fillStyle = '#333';
                ctx.fillText(legendItems[key], legendX + boxSize + 5, yPos);
                
                yPos += 15;
            }
        });
    }
    
    /**
     * 更新统计信息显示
     */
    updateStats() {
        if (!this.statsElement) return;
        
        let statsHTML = '<div class="delay-stats">';
        statsHTML += '<h3>处理时间统计 (ms)</h3>';
        
        const moduleLabels = {
            bolo: 'BOLO提取',
            ocr: 'OCR识别',
            translation: '翻译',
            ai: 'AI处理',
            total: '总时间'
        };
        
        Object.keys(moduleLabels).forEach(module => {
            const data = this.processingHistory[module];
            if (data && data.length > 0) {
                const latest = data[data.length - 1].value.toFixed(2);
                const avg = (data.reduce((sum, item) => sum + item.value, 0) / data.length).toFixed(2);
                const max = Math.max(...data.map(item => item.value)).toFixed(2);
                
                // 确定状态颜色
                let statusClass = 'status-good';
                if (latest >= this.config.criticalThreshold) {
                    statusClass = 'status-critical';
                } else if (latest >= this.config.warningThreshold) {
                    statusClass = 'status-warning';
                }
                
                statsHTML += `
                    <div class="stat-item">
                        <span class="stat-label">${moduleLabels[module]}:</span>
                        <span class="stat-value ${statusClass}">${latest}</span>
                        <span class="stat-details"> (平均: ${avg}, 最大: ${max})</span>
                    </div>
                `;
            }
        });
        
        statsHTML += '</div>';
        this.statsElement.innerHTML = statsHTML;
    }
    
    /**
     * 生成性能报告
     * @returns {object} 性能报告对象
     */
    generatePerformanceReport() {
        const report = {
            timestamp: Date.now(),
            modules: {},
            overall: {}
        };
        
        Object.keys(this.processingHistory).forEach(module => {
            const data = this.processingHistory[module];
            if (data && data.length > 0) {
                const values = data.map(item => item.value);
                const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
                const max = Math.max(...values);
                const min = Math.min(...values);
                const p95 = this.calculatePercentile(values, 95);
                
                report.modules[module] = {
                    count: data.length,
                    avg: avg,
                    max: max,
                    min: min,
                    p95: p95,
                    trend: this.analyzeTrend(values)
                };
            }
        });
        
        // 计算整体统计
        const totalData = this.processingHistory.total;
        if (totalData && totalData.length > 0) {
            const values = totalData.map(item => item.value);
            const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
            
            report.overall = {
                totalRequests: totalData.length,
                avgProcessingTime: avg,
                isWithinThreshold: avg < this.config.warningThreshold
            };
        }
        
        return report;
    }
    
    /**
     * 计算百分位数
     */
    calculatePercentile(values, percentile) {
        const sorted = [...values].sort((a, b) => a - b);
        const index = Math.ceil(percentile / 100 * sorted.length) - 1;
        return sorted[index] || 0;
    }
    
    /**
     * 分析性能趋势
     */
    analyzeTrend(values) {
        if (values.length < 10) return 'insufficient_data';
        
        // 计算最近的平均值
        const recent = values.slice(-5).reduce((sum, val) => sum + val, 0) / 5;
        const earlier = values.slice(0, 5).reduce((sum, val) => sum + val, 0) / 5;
        
        const diff = (recent - earlier) / earlier;
        
        if (diff > 0.2) return 'degrading';
        if (diff < -0.2) return 'improving';
        return 'stable';
    }
    
    /**
     * 清除历史数据
     */
    clearHistory() {
        Object.keys(this.processingHistory).forEach(key => {
            this.processingHistory[key] = [];
        });
        this.updateChart();
        this.updateStats();
    }
}

// 创建全局实例
window.delayMonitor = new DelayMonitor();

// 注册到JEV控制器
if (window.JEV && window.JEV.Controller) {
    JEV.Controller.registerModule('delayMonitor', {
        onInit: () => {
            console.log('[Delay Monitor] Registered with controller');
            
            // 监听地址处理完成事件
            JEV.Controller.on('addressProcessingComplete', (processData) => {
                delayMonitor.recordProcessingFlow(processData);
            });
            
            // 监听状态变化以更新统计
            JEV.Controller.on('stateChanged', (newState) => {
                if (newState.processingStats) {
                    const { boloTime, ocrTime, translationTime, aiTime } = newState.processingStats;
                    
                    if (boloTime > 0) delayMonitor.recordProcessingTime('bolo', boloTime);
                    if (ocrTime > 0) delayMonitor.recordProcessingTime('ocr', ocrTime);
                    if (translationTime > 0) delayMonitor.recordProcessingTime('translation', translationTime);
                    if (aiTime > 0) delayMonitor.recordProcessingTime('ai', aiTime);
                }
            });
        },
        initialize: (chartSelector, statsSelector) => delayMonitor.initialize(chartSelector, statsSelector),
        generateReport: () => delayMonitor.generatePerformanceReport(),
        clearHistory: () => delayMonitor.clearHistory(),
        getCurrentStats: () => ({
            bolo: delayMonitor.processingHistory.bolo.length > 0 ? delayMonitor.processingHistory.bolo[delayMonitor.processingHistory.bolo.length - 1].value : 0,
            ocr: delayMonitor.processingHistory.ocr.length > 0 ? delayMonitor.processingHistory.ocr[delayMonitor.processingHistory.ocr.length - 1].value : 0,
            translation: delayMonitor.processingHistory.translation.length > 0 ? delayMonitor.processingHistory.translation[delayMonitor.processingHistory.translation.length - 1].value : 0,
            ai: delayMonitor.processingHistory.ai.length > 0 ? delayMonitor.processingHistory.ai[delayMonitor.processingHistory.ai.length - 1].value : 0,
            total: delayMonitor.processingHistory.total.length > 0 ? delayMonitor.processingHistory.total[delayMonitor.processingHistory.total.length - 1].value : 0
        })
    });
}