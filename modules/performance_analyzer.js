// JEV插件整合项目 - 性能分析器与报告生成模块

// 初始化JEV命名空间
window.JEV = window.JEV || {};

/**
 * 性能分析器模块
 * 用于生成性能报告、识别瓶颈并提供优化建议
 */
class JEVPerformanceAnalyzer {
    constructor() {
        // 性能阈值配置
        this.thresholds = {
            bolo: { 
                warning: 500,  // 警告阈值(ms)
                critical: 1000 // 严重阈值(ms)
            },
            ocr: {
                warning: 2000,
                critical: 5000
            },
            translation: {
                warning: 1000,
                critical: 3000
            },
            ai: {
                warning: 3000,
                critical: 8000
            },
            cacheHitRate: {
                warning: 70,  // 百分比
                critical: 50
            },
            apiSuccessRate: {
                warning: 95,
                critical: 90
            }
        };
        
        // 历史报告存储
        this.reportHistory = [];
        
        // 最大历史报告数量
        this.maxHistoryReports = 10;
        
        // 性能监控器引用
        this.performanceMonitor = null;
        
        // 初始化集成
        this.initialize();
        
        // 通知系统模块已加载
        if (window.CustomEvent) {
            const event = new CustomEvent('performanceAnalyzerLoaded', { detail: { instance: this } });
            window.dispatchEvent(event);
        }
    }
    
    /**
     * 初始化性能分析器
     */
    initialize() {
        console.log('[Performance Analyzer] Initializing');
        
        // 尝试获取已有的性能监控器
        this.setupPerformanceMonitorIntegration();
    }
    
    /**
     * 设置性能监控器集成
     */
    setupPerformanceMonitorIntegration() {
        // 监听性能监控器加载完成
        window.addEventListener('performanceMonitorLoaded', () => {
            if (window.JEV?.PerformanceMonitor) {
                this.performanceMonitor = window.JEV.PerformanceMonitor;
                console.log('[Performance Analyzer] Connected to Performance Monitor');
            }
        });
        
        // 如果性能监控器已经加载
        if (window.JEV?.PerformanceMonitor) {
            this.performanceMonitor = window.JEV.PerformanceMonitor;
            console.log('[Performance Analyzer] Performance Monitor already loaded');
        }
    }
    
    /**
     * 生成性能报告
     */
    generatePerformanceReport() {
        console.log('[Performance Analyzer] Generating performance report');
        
        // 获取性能数据
        const performanceData = this.getPerformanceData();
        
        // 分析性能瓶颈
        const bottlenecks = this.identifyBottlenecks(performanceData);
        
        // 生成优化建议
        const recommendations = this.generateRecommendations(bottlenecks, performanceData);
        
        // 生成综合报告
        const report = {
            timestamp: new Date().toISOString(),
            summary: this.generateSummary(performanceData),
            bottlenecks: bottlenecks,
            recommendations: recommendations,
            detailedMetrics: performanceData,
            performanceScore: this.calculatePerformanceScore(performanceData)
        };
        
        // 保存报告到历史
        this.saveReportToHistory(report);
        
        // 输出报告
        this.displayReport(report);
        
        return report;
    }
    
    /**
     * 获取性能数据
     */
    getPerformanceData() {
        if (this.performanceMonitor) {
            return this.performanceMonitor.getPerformanceReport();
        }
        
        // 降级：如果没有性能监控器，尝试从控制器获取
        if (window.JEV?.Controller?.stateCache) {
            const state = window.JEV.Controller.stateCache;
            return {
                summary: {
                    bolo: {
                        min: 0,
                        max: state.processingStats.boloTime || 0,
                        avg: state.processingStats.boloTime || 0,
                        count: 1
                    },
                    ocr: {
                        min: 0,
                        max: state.processingStats.ocrTime || 0,
                        avg: state.processingStats.ocrTime || 0,
                        count: 1
                    },
                    translation: {
                        min: 0,
                        max: state.processingStats.translationTime || 0,
                        avg: state.processingStats.translationTime || 0,
                        count: 1
                    },
                    ai: {
                        min: 0,
                        max: state.processingStats.aiTime || 0,
                        avg: state.processingStats.aiTime || 0,
                        count: 1
                    },
                    api: {
                        retries: state.processingStats.apiRetryCount || 0,
                        batchMerges: state.processingStats.batchRequestsMerged || 0,
                        timeouts: state.processingStats.timeoutCount || 0,
                        successRate: 100
                    }
                },
                detailedData: {},
                timestamp: new Date().toISOString()
            };
        }
        
        // 返回空数据
        return {
            summary: {
                bolo: { min: 0, max: 0, avg: 0, count: 0 },
                ocr: { min: 0, max: 0, avg: 0, count: 0 },
                translation: { min: 0, max: 0, avg: 0, count: 0 },
                ai: { min: 0, max: 0, avg: 0, count: 0 },
                api: { retries: 0, batchMerges: 0, timeouts: 0, successRate: 100 }
            },
            detailedData: {},
            timestamp: new Date().toISOString()
        };
    }
    
    /**
     * 识别性能瓶颈
     */
    identifyBottlenecks(performanceData) {
        const bottlenecks = [];
        const { summary } = performanceData;
        
        // 检查BOLO处理时间
        if (summary.bolo && summary.bolo.avg > 0) {
            if (summary.bolo.avg > this.thresholds.bolo.critical) {
                bottlenecks.push({
                    module: 'BOLO',
                    metric: '处理时间',
                    value: summary.bolo.avg,
                    threshold: this.thresholds.bolo.critical,
                    severity: 'critical',
                    description: `BOLO地址提取平均处理时间过高: ${summary.bolo.avg.toFixed(1)}ms`
                });
            } else if (summary.bolo.avg > this.thresholds.bolo.warning) {
                bottlenecks.push({
                    module: 'BOLO',
                    metric: '处理时间',
                    value: summary.bolo.avg,
                    threshold: this.thresholds.bolo.warning,
                    severity: 'warning',
                    description: `BOLO地址提取平均处理时间偏高: ${summary.bolo.avg.toFixed(1)}ms`
                });
            }
        }
        
        // 检查OCR处理时间
        if (summary.ocr && summary.ocr.avg > 0) {
            if (summary.ocr.avg > this.thresholds.ocr.critical) {
                bottlenecks.push({
                    module: 'OCR',
                    metric: '处理时间',
                    value: summary.ocr.avg,
                    threshold: this.thresholds.ocr.critical,
                    severity: 'critical',
                    description: `OCR文字识别平均处理时间过高: ${summary.ocr.avg.toFixed(1)}ms`
                });
            } else if (summary.ocr.avg > this.thresholds.ocr.warning) {
                bottlenecks.push({
                    module: 'OCR',
                    metric: '处理时间',
                    value: summary.ocr.avg,
                    threshold: this.thresholds.ocr.warning,
                    severity: 'warning',
                    description: `OCR文字识别平均处理时间偏高: ${summary.ocr.avg.toFixed(1)}ms`
                });
            }
        }
        
        // 检查翻译处理时间
        if (summary.translation && summary.translation.avg > 0) {
            if (summary.translation.avg > this.thresholds.translation.critical) {
                bottlenecks.push({
                    module: 'Translation',
                    metric: '处理时间',
                    value: summary.translation.avg,
                    threshold: this.thresholds.translation.critical,
                    severity: 'critical',
                    description: `翻译引擎平均处理时间过高: ${summary.translation.avg.toFixed(1)}ms`
                });
            } else if (summary.translation.avg > this.thresholds.translation.warning) {
                bottlenecks.push({
                    module: 'Translation',
                    metric: '处理时间',
                    value: summary.translation.avg,
                    threshold: this.thresholds.translation.warning,
                    severity: 'warning',
                    description: `翻译引擎平均处理时间偏高: ${summary.translation.avg.toFixed(1)}ms`
                });
            }
        }
        
        // 检查AI处理时间
        if (summary.ai && summary.ai.avg > 0) {
            if (summary.ai.avg > this.thresholds.ai.critical) {
                bottlenecks.push({
                    module: 'AI',
                    metric: '处理时间',
                    value: summary.ai.avg,
                    threshold: this.thresholds.ai.critical,
                    severity: 'critical',
                    description: `AI对话系统平均处理时间过高: ${summary.ai.avg.toFixed(1)}ms`
                });
            } else if (summary.ai.avg > this.thresholds.ai.warning) {
                bottlenecks.push({
                    module: 'AI',
                    metric: '处理时间',
                    value: summary.ai.avg,
                    threshold: this.thresholds.ai.warning,
                    severity: 'warning',
                    description: `AI对话系统平均处理时间偏高: ${summary.ai.avg.toFixed(1)}ms`
                });
            }
        }
        
        // 检查API成功率
        if (summary.api) {
            if (summary.api.successRate < this.thresholds.apiSuccessRate.critical) {
                bottlenecks.push({
                    module: 'API',
                    metric: '成功率',
                    value: summary.api.successRate,
                    threshold: this.thresholds.apiSuccessRate.critical,
                    severity: 'critical',
                    description: `API请求成功率过低: ${summary.api.successRate.toFixed(1)}%`
                });
            } else if (summary.api.successRate < this.thresholds.apiSuccessRate.warning) {
                bottlenecks.push({
                    module: 'API',
                    metric: '成功率',
                    value: summary.api.successRate,
                    threshold: this.thresholds.apiSuccessRate.warning,
                    severity: 'warning',
                    description: `API请求成功率偏低: ${summary.api.successRate.toFixed(1)}%`
                });
            }
            
            // 检查API重试次数
            if (summary.api.retries > 10) {
                bottlenecks.push({
                    module: 'API',
                    metric: '重试次数',
                    value: summary.api.retries,
                    threshold: 10,
                    severity: 'warning',
                    description: `API请求重试次数过多: ${summary.api.retries}次`
                });
            }
        }
        
        return bottlenecks;
    }
    
    /**
     * 生成优化建议
     */
    generateRecommendations(bottlenecks, performanceData) {
        const recommendations = [];
        const { summary } = performanceData;
        
        // 处理已知瓶颈
        bottlenecks.forEach(bottleneck => {
            switch(bottleneck.module) {
                case 'BOLO':
                    recommendations.push({
                        module: 'BOLO',
                        priority: bottleneck.severity === 'critical' ? 'high' : 'medium',
                        action: '优化地址提取算法，增加预提取规则',
                        expectedImpact: '中高',
                        description: '考虑优化正则表达式和文本处理逻辑，减少不必要的计算。' +
                                    '可以增加常用地址格式的预检测规则，提高匹配效率。'
                    });
                    break;
                    
                case 'OCR':
                    recommendations.push({
                        module: 'OCR',
                        priority: bottleneck.severity === 'critical' ? 'high' : 'medium',
                        action: '优化OCR识别参数，增加图像预处理',
                        expectedImpact: '高',
                        description: '调整OCR引擎的识别参数，增加图像预处理步骤（如二值化、去噪）。' +
                                    '考虑使用更适合当前场景的OCR模型或服务。'
                    });
                    break;
                    
                case 'Translation':
                    recommendations.push({
                        module: 'Translation',
                        priority: bottleneck.severity === 'critical' ? 'high' : 'medium',
                        action: '优化翻译请求，增加本地词典',
                        expectedImpact: '中',
                        description: '优化翻译请求批处理逻辑，增加常用词汇的本地词典缓存。' +
                                    '考虑使用更高效的翻译服务或API。'
                    });
                    break;
                    
                case 'AI':
                    recommendations.push({
                        module: 'AI',
                        priority: bottleneck.severity === 'critical' ? 'high' : 'medium',
                        action: '优化AI提示词，增加响应缓存',
                        expectedImpact: '高',
                        description: '优化AI提示词结构，使其更加简洁明确。' +
                                    '增加更多的上下文理解缓存，减少重复计算。'
                    });
                    break;
                    
                case 'API':
                    if (bottleneck.metric === '成功率') {
                        recommendations.push({
                            module: 'API',
                            priority: 'high',
                            action: '优化API错误处理，增加降级策略',
                            expectedImpact: '高',
                            description: '增强API错误处理机制，实现更智能的重试策略。' +
                                        '添加服务降级功能，在API不可用时提供基础功能。'
                        });
                    } else if (bottleneck.metric === '重试次数') {
                        recommendations.push({
                            module: 'API',
                            priority: 'medium',
                            action: '优化网络请求，增加请求合并',
                            expectedImpact: '中',
                            description: '进一步优化API请求合并策略，减少网络延迟影响。' +
                                        '调整超时时间和重试间隔，避免频繁重试。'
                        });
                    }
                    break;
            }
        });
        
        // 通用优化建议
        
        // 检查缓存效率
        const totalRequests = this.calculateTotalRequests(summary);
        if (totalRequests > 0) {
            // 估算缓存命中率（基于现有数据）
            const estimatedCacheHitRate = this.estimateCacheHitRate();
            if (estimatedCacheHitRate < this.thresholds.cacheHitRate.warning) {
                recommendations.push({
                    module: 'Cache',
                    priority: 'medium',
                    action: '优化缓存策略，增加缓存时间',
                    expectedImpact: '中高',
                    description: '增加缓存有效期，优化缓存键生成策略。' +
                                '考虑实现缓存预热和预加载机制，提高缓存命中率。'
                });
            }
        }
        
        // 检查并发处理
        if (window.JEV?.Controller?.taskQueue) {
            const maxConcurrent = window.JEV.Controller.taskQueue.maxConcurrentTasks || 3;
            if (this.hasHighProcessingTimes(summary)) {
                recommendations.push({
                    module: 'TaskQueue',
                    priority: 'medium',
                    action: '优化并发处理，调整任务优先级',
                    expectedImpact: '中',
                    description: `考虑增加并发任务数（当前: ${maxConcurrent}），但注意系统资源限制。` +
                                '优化任务优先级分配，确保关键任务优先处理。'
                });
            }
        }
        
        // 按优先级排序
        recommendations.sort((a, b) => {
            const priorityOrder = { high: 0, medium: 1, low: 2 };
            return priorityOrder[a.priority] - priorityOrder[b.priority];
        });
        
        return recommendations;
    }
    
    /**
     * 生成性能摘要
     */
    generateSummary(performanceData) {
        const { summary } = performanceData;
        
        let totalTime = 0;
        let moduleCount = 0;
        
        ['bolo', 'ocr', 'translation', 'ai'].forEach(module => {
            if (summary[module] && summary[module].avg > 0) {
                totalTime += summary[module].avg;
                moduleCount++;
            }
        });
        
        const averageTotalTime = moduleCount > 0 ? totalTime / moduleCount : 0;
        
        // 确定整体性能等级
        let performanceLevel = '优秀';
        if (averageTotalTime > 3000) {
            performanceLevel = '较差';
        } else if (averageTotalTime > 1500) {
            performanceLevel = '一般';
        } else if (averageTotalTime > 800) {
            performanceLevel = '良好';
        }
        
        return {
            totalRequests: this.calculateTotalRequests(summary),
            averageTotalTime: averageTotalTime,
            performanceLevel: performanceLevel,
            fastestModule: this.getFastestModule(summary),
            slowestModule: this.getSlowestModule(summary),
            apiSuccessRate: summary.api?.successRate || 100,
            totalRetryCount: summary.api?.retries || 0,
            batchRequestsMerged: summary.api?.batchMerges || 0
        };
    }
    
    /**
     * 计算性能得分
     */
    calculatePerformanceScore(performanceData) {
        const { summary } = performanceData;
        let score = 100;
        
        // 基于处理时间的扣分
        ['bolo', 'ocr', 'translation', 'ai'].forEach(module => {
            if (summary[module] && summary[module].avg > 0) {
                const avgTime = summary[module].avg;
                const thresholds = this.thresholds[module];
                
                if (avgTime > thresholds.critical) {
                    // 严重超时，最高扣20分
                    const excess = (avgTime - thresholds.critical) / 1000;
                    score -= Math.min(20, excess * 5);
                } else if (avgTime > thresholds.warning) {
                    // 轻微超时，最高扣10分
                    const excess = (avgTime - thresholds.warning) / 1000;
                    score -= Math.min(10, excess * 5);
                }
            }
        });
        
        // 基于API成功率的扣分
        if (summary.api) {
            if (summary.api.successRate < this.thresholds.apiSuccessRate.critical) {
                score -= (90 - summary.api.successRate) * 2;
            } else if (summary.api.successRate < this.thresholds.apiSuccessRate.warning) {
                score -= (95 - summary.api.successRate);
            }
            
            // 基于重试次数的扣分
            if (summary.api.retries > 5) {
                score -= Math.min(10, summary.api.retries - 5);
            }
        }
        
        // 确保分数在0-100范围内
        return Math.max(0, Math.min(100, Math.round(score)));
    }
    
    /**
     * 保存报告到历史
     */
    saveReportToHistory(report) {
        this.reportHistory.push(report);
        
        // 限制历史报告数量
        if (this.reportHistory.length > this.maxHistoryReports) {
            this.reportHistory.shift();
        }
    }
    
    /**
     * 显示报告
     */
    displayReport(report) {
        console.log('==========================================');
        console.log('JEV 性能分析报告');
        console.log('==========================================');
        console.log(`生成时间: ${new Date(report.timestamp).toLocaleString()}`);
        console.log(`性能得分: ${report.performanceScore}/100 (${report.summary.performanceLevel})`);
        console.log('------------------------------------------');
        console.log('摘要:');
        console.log(`  总请求数: ${report.summary.totalRequests}`);
        console.log(`  平均处理时间: ${report.summary.averageTotalTime.toFixed(1)}ms`);
        console.log(`  最快模块: ${report.summary.fastestModule}`);
        console.log(`  最慢模块: ${report.summary.slowestModule}`);
        console.log(`  API成功率: ${report.summary.apiSuccessRate.toFixed(1)}%`);
        console.log('------------------------------------------');
        
        if (report.bottlenecks.length > 0) {
            console.log('性能瓶颈:');
            report.bottlenecks.forEach(bottleneck => {
                const severity = bottleneck.severity === 'critical' ? '严重' : '警告';
                console.log(`  [${severity}] ${bottleneck.description}`);
            });
            console.log('------------------------------------------');
        }
        
        if (report.recommendations.length > 0) {
            console.log('优化建议:');
            report.recommendations.slice(0, 5).forEach((rec, index) => {
                const priority = rec.priority === 'high' ? '高' : rec.priority === 'medium' ? '中' : '低';
                console.log(`  ${index + 1}. [${priority}] ${rec.action} - ${rec.module}`);
                console.log(`     预期效果: ${rec.expectedImpact} - ${rec.description}`);
            });
        }
        
        console.log('==========================================');
        
        // 创建HTML报告
        this.createHTMLReport(report);
    }
    
    /**
     * 创建HTML格式的报告
     */
    createHTMLReport(report) {
        // 检查是否已存在报告容器
        let reportContainer = document.getElementById('jev-performance-report');
        
        if (!reportContainer) {
            // 创建报告容器
            reportContainer = document.createElement('div');
            reportContainer.id = 'jev-performance-report';
            reportContainer.className = 'jev-performance-report';
            reportContainer.style.cssText = `
                background: white;
                border: 1px solid #dee2e6;
                border-radius: 8px;
                padding: 20px;
                margin: 20px 0;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            `;
            
            // 添加到页面
            const monitorContainer = document.getElementById('jev-performance-monitor');
            if (monitorContainer) {
                monitorContainer.parentNode.insertBefore(reportContainer, monitorContainer.nextSibling);
            } else {
                const target = document.body || document.documentElement;
                target.appendChild(reportContainer);
            }
        }
        
        // 设置报告内容
        reportContainer.innerHTML = `
            <div style="border-bottom: 2px solid #3498db; padding-bottom: 10px; margin-bottom: 20px;">
                <h2 style="margin: 0; color: #2c3e50;">JEV 性能分析报告</h2>
                <p style="margin: 5px 0 0; color: #7f8c8d;">生成时间: ${new Date(report.timestamp).toLocaleString()}</p>
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; margin-bottom: 20px;">
                <div style="background: #f8f9fa; padding: 15px; border-radius: 6px;">
                    <h3 style="margin: 0 0 10px; color: #2c3e50; font-size: 18px;">性能得分</h3>
                    <div style="font-size: 36px; font-weight: bold; color: ${this.getScoreColor(report.performanceScore)};">
                        ${report.performanceScore}
                    </div>
                    <div style="color: #7f8c8d;">/${100} (${report.summary.performanceLevel})</div>
                </div>
                
                <div style="background: #f8f9fa; padding: 15px; border-radius: 6px;">
                    <h3 style="margin: 0 0 10px; color: #2c3e50; font-size: 18px;">平均处理时间</h3>
                    <div style="font-size: 36px; font-weight: bold; color: #3498db;">
                        ${report.summary.averageTotalTime.toFixed(1)}
                    </div>
                    <div style="color: #7f8c8d;">毫秒</div>
                </div>
                
                <div style="background: #f8f9fa; padding: 15px; border-radius: 6px;">
                    <h3 style="margin: 0 0 10px; color: #2c3e50; font-size: 18px;">API成功率</h3>
                    <div style="font-size: 36px; font-weight: bold; color: #27ae60;">
                        ${report.summary.apiSuccessRate.toFixed(1)}
                    </div>
                    <div style="color: #7f8c8d;">%</div>
                </div>
            </div>
            
            <div style="margin-bottom: 20px;">
                <h3 style="margin: 0 0 15px; color: #2c3e50; border-bottom: 1px solid #eee; padding-bottom: 5px;">模块性能详情</h3>
                <div style="overflow-x: auto;">
                    <table style="width: 100%; border-collapse: collapse;">
                        <thead>
                            <tr style="background: #f8f9fa;">
                                <th style="padding: 10px; text-align: left; border-bottom: 2px solid #dee2e6;">模块</th>
                                <th style="padding: 10px; text-align: center; border-bottom: 2px solid #dee2e6;">最小(ms)</th>
                                <th style="padding: 10px; text-align: center; border-bottom: 2px solid #dee2e6;">最大(ms)</th>
                                <th style="padding: 10px; text-align: center; border-bottom: 2px solid #dee2e6;">平均(ms)</th>
                                <th style="padding: 10px; text-align: center; border-bottom: 2px solid #dee2e6;">请求数</th>
                                <th style="padding: 10px; text-align: center; border-bottom: 2px solid #dee2e6;">状态</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${this.generateModulePerformanceRows(report.detailedMetrics.summary)}
                        </tbody>
                    </table>
                </div>
            </div>
            
            ${report.bottlenecks.length > 0 ? `
            <div style="margin-bottom: 20px; background: #fff5f5; border-left: 4px solid #e74c3c; padding: 15px; border-radius: 0 6px 6px 0;">
                <h3 style="margin: 0 0 10px; color: #c0392b;">⚠️ 发现性能瓶颈</h3>
                <ul style="margin: 0; padding-left: 20px;">
                    ${report.bottlenecks.map(b => `
                        <li style="margin-bottom: 5px; color: #7f281a;">
                            <strong>${b.module}:</strong> ${b.description}
                        </li>
                    `).join('')}
                </ul>
            </div>
            ` : ''}
            
            <div style="margin-bottom: 20px;">
                <h3 style="margin: 0 0 15px; color: #2c3e50; border-bottom: 1px solid #eee; padding-bottom: 5px;">优化建议</h3>
                ${report.recommendations.length > 0 ? `
                <div style="display: grid; grid-template-columns: 1fr; gap: 10px;">
                    ${report.recommendations.slice(0, 5).map((rec, index) => `
                        <div style="background: #f8f9fa; padding: 15px; border-radius: 6px; border-left: 4px solid ${this.getPriorityColor(rec.priority)};">
                            <div style="font-weight: bold; margin-bottom: 5px;">${index + 1}. [${this.getPriorityText(rec.priority)}] ${rec.action}</div>
                            <div style="color: #7f8c8d; font-size: 14px; margin-bottom: 5px;">模块: ${rec.module} | 预期效果: ${rec.expectedImpact}</div>
                            <div style="font-size: 14px;">${rec.description}</div>
                        </div>
                    `).join('')}
                </div>
                ` : '<p>当前系统性能良好，暂无需优化建议。</p>'}
            </div>
            
            <div style="text-align: right;">
                <button id="jev-generate-report-btn" style="
                    background: #3498db; color: white; border: none; padding: 10px 20px; 
                    border-radius: 4px; cursor: pointer; font-size: 14px;
                ">重新生成报告</button>
                <button id="jev-export-report-btn" style="
                    background: #27ae60; color: white; border: none; padding: 10px 20px; 
                    border-radius: 4px; cursor: pointer; font-size: 14px; margin-left: 10px;
                ">导出报告</button>
            </div>
        `;
        
        // 添加事件监听器
        setTimeout(() => {
            const regenerateBtn = document.getElementById('jev-generate-report-btn');
            if (regenerateBtn) {
                regenerateBtn.addEventListener('click', () => {
                    this.generatePerformanceReport();
                });
            }
            
            const exportBtn = document.getElementById('jev-export-report-btn');
            if (exportBtn) {
                exportBtn.addEventListener('click', () => {
                    this.exportReport(report);
                });
            }
        }, 0);
    }
    
    /**
     * 生成模块性能表格行
     */
    generateModulePerformanceRows(summary) {
        const modules = {
            bolo: 'BOLO',
            ocr: 'OCR',
            translation: '翻译引擎',
            ai: 'AI对话系统'
        };
        
        return Object.entries(modules).map(([key, name]) => {
            const data = summary[key] || { min: 0, max: 0, avg: 0, count: 0 };
            const status = this.getModuleStatus(key, data.avg);
            
            return `
                <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #dee2e6;">${name}</td>
                    <td style="padding: 10px; text-align: center; border-bottom: 1px solid #dee2e6;">${data.min.toFixed(1)}</td>
                    <td style="padding: 10px; text-align: center; border-bottom: 1px solid #dee2e6;">${data.max.toFixed(1)}</td>
                    <td style="padding: 10px; text-align: center; border-bottom: 1px solid #dee2e6;">${data.avg.toFixed(1)}</td>
                    <td style="padding: 10px; text-align: center; border-bottom: 1px solid #dee2e6;">${data.count}</td>
                    <td style="padding: 10px; text-align: center; border-bottom: 1px solid #dee2e6;">
                        <span style="
                            display: inline-block; padding: 3px 8px; border-radius: 12px; 
                            font-size: 12px; font-weight: bold; 
                            background: ${status.color}; color: white;
                        ">${status.text}</span>
                    </td>
                </tr>
            `;
        }).join('');
    }
    
    /**
     * 获取模块状态
     */
    getModuleStatus(module, avgTime) {
        const thresholds = this.thresholds[module];
        
        if (!thresholds) {
            return { text: '未知', color: '#95a5a6' };
        }
        
        if (avgTime > thresholds.critical) {
            return { text: '严重', color: '#e74c3c' };
        } else if (avgTime > thresholds.warning) {
            return { text: '警告', color: '#f39c12' };
        } else {
            return { text: '正常', color: '#27ae60' };
        }
    }
    
    /**
     * 获取分数对应的颜色
     */
    getScoreColor(score) {
        if (score >= 85) return '#27ae60';
        if (score >= 70) return '#f39c12';
        return '#e74c3c';
    }
    
    /**
     * 获取优先级对应的颜色
     */
    getPriorityColor(priority) {
        switch(priority) {
            case 'high': return '#e74c3c';
            case 'medium': return '#f39c12';
            case 'low': return '#95a5a6';
            default: return '#95a5a6';
        }
    }
    
    /**
     * 获取优先级文本
     */
    getPriorityText(priority) {
        switch(priority) {
            case 'high': return '高';
            case 'medium': return '中';
            case 'low': return '低';
            default: return '未知';
        }
    }
    
    /**
     * 导出报告
     */
    exportReport(report) {
        const dataStr = JSON.stringify(report, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `jev-performance-report-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        console.log('[Performance Analyzer] Report exported');
    }
    
    /**
     * 计算总请求数
     */
    calculateTotalRequests(summary) {
        let total = 0;
        
        ['bolo', 'ocr', 'translation', 'ai'].forEach(module => {
            if (summary[module] && summary[module].count) {
                total += summary[module].count;
            }
        });
        
        return total;
    }
    
    /**
     * 获取最快模块
     */
    getFastestModule(summary) {
        let fastestModule = '无数据';
        let fastestTime = Infinity;
        
        const moduleNames = {
            bolo: 'BOLO',
            ocr: 'OCR',
            translation: '翻译引擎',
            ai: 'AI对话系统'
        };
        
        Object.entries(moduleNames).forEach(([key, name]) => {
            if (summary[key] && summary[key].avg > 0 && summary[key].avg < fastestTime) {
                fastestTime = summary[key].avg;
                fastestModule = `${name} (${fastestTime.toFixed(1)}ms)`;
            }
        });
        
        return fastestModule;
    }
    
    /**
     * 获取最慢模块
     */
    getSlowestModule(summary) {
        let slowestModule = '无数据';
        let slowestTime = 0;
        
        const moduleNames = {
            bolo: 'BOLO',
            ocr: 'OCR',
            translation: '翻译引擎',
            ai: 'AI对话系统'
        };
        
        Object.entries(moduleNames).forEach(([key, name]) => {
            if (summary[key] && summary[key].avg > slowestTime) {
                slowestTime = summary[key].avg;
                slowestModule = `${name} (${slowestTime.toFixed(1)}ms)`;
            }
        });
        
        return slowestModule;
    }
    
    /**
     * 估算缓存命中率
     */
    estimateCacheHitRate() {
        // 这是一个估算，实际应该从各模块获取准确的缓存统计
        return 75; // 默认假设75%的命中率
    }
    
    /**
     * 检查是否存在高处理时间
     */
    hasHighProcessingTimes(summary) {
        const modules = ['bolo', 'ocr', 'translation', 'ai'];
        
        for (const module of modules) {
            if (summary[module] && summary[module].avg > this.thresholds[module]?.warning) {
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * 设置性能阈值
     */
    setThresholds(customThresholds) {
        this.thresholds = {
            ...this.thresholds,
            ...customThresholds
        };
        
        console.log('[Performance Analyzer] Thresholds updated:', this.thresholds);
    }
    
    /**
     * 获取历史报告
     */
    getHistoryReports() {
        return this.reportHistory;
    }
    
    /**
     * 获取分析报告
     * 用于与集成控制器兼容的接口
     */
    getAnalysisReport() {
        return this.reportHistory.length > 0 ? this.reportHistory[this.reportHistory.length - 1] : null;
    }
    
    /**
     * 分析性能
     * 用于与集成控制器兼容的接口
     */
    analyzePerformance() {
        return this.generatePerformanceReport();
    }
    
    /**
     * 清除分析数据
     * 用于与集成控制器兼容的接口
     */
    clearAnalysisData() {
        this.reportHistory = [];
        console.log('[Performance Analyzer] Analysis data cleared');
    }
    
    /**
     * 注册模块
     * 用于与集成控制器兼容的接口
     */
    registerModule(moduleName, moduleObj) {
        console.log(`[Performance Analyzer] Module registered: ${moduleName}`);
        
        // 如果模块提供了初始化方法，立即调用
        if (moduleObj.onInit && typeof moduleObj.onInit === 'function') {
            moduleObj.onInit();
        }
        
        // 存储模块引用
        if (!this.registeredModules) {
            this.registeredModules = {};
        }
        this.registeredModules[moduleName] = moduleObj;
        
        return true;
    }
    
    /**
     * 销毁性能分析器
     */
    destroy() {
        // 清理事件监听器
        // 移除DOM元素
        const reportContainer = document.getElementById('jev-performance-report');
        if (reportContainer && reportContainer.parentNode) {
            reportContainer.parentNode.removeChild(reportContainer);
        }
        
        console.log('[Performance Analyzer] Destroyed');
    }
}

// 注册为JEV模块
window.JEV.PerformanceAnalyzer = new JEVPerformanceAnalyzer();

// 导出模块供其他组件使用
module.exports = JEVPerformanceAnalyzer;
