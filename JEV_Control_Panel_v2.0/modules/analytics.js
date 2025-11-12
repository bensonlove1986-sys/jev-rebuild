/**
 * 模块名称：AnalyticsManager（数据分析）
 * 功能：数据收集、性能统计、报表生成、趋势分析
 * 依赖模块：config.js, logger.js, agents.js, strategy.js
 * 作者：JEV 系统
 */

import { CONFIG } from '../core/config.js';
import logger from '../core/logger.js';
import agentManager from '../core/agents.js';
import strategyManager from '../core/strategy.js';

class AnalyticsManager {
    constructor() {
        this.startTime = Date.now();
        this.statsHistory = [];
        this.historyLimit = 100; // 保存最近100条统计记录
        this.sessionData = {
            modeSwitches: 0,
            refreshCount: 0,
            errorCount: 0,
            successCount: 0
        };
        this.lastAgentCount = 0;
        this.performanceMetrics = {
            averageResponseTime: 0,
            maxResponseTime: 0,
            responseTimeHistory: []
        };
    }

    /**
     * 初始化分析模块
     */
    init() {
        this.registerEventListeners();
        this.startPeriodicDataCollection();
        logger.success('数据分析模块初始化完成', 'analytics');
    }

    /**
     * 注册事件监听器
     */
    registerEventListeners() {
        // 监听模式切换
        agentManager.onModeChange((agentId, oldMode, newMode) => {
            this.sessionData.modeSwitches++;
            this.recordEvent('mode_switch', {
                agentId,
                oldMode,
                newMode,
                timestamp: Date.now()
            });
        });

        // 监听刷新事件
        agentManager.onAgentsRefreshed(() => {
            this.sessionData.refreshCount++;
            this.analyzeAgentChanges();
        });

        // 监听连接状态变化
        agentManager.onConnectionStatusChange((isConnected) => {
            this.recordEvent('connection_change', {
                connected: isConnected,
                timestamp: Date.now()
            });
        });

        // 监听策略执行事件
        strategyManager.onAutoModeSwitch((agentId, oldMode, newMode, reason) => {
            this.recordEvent('auto_mode_switch', {
                agentId,
                oldMode,
                newMode,
                reason,
                timestamp: Date.now()
            });
        });

        // 监听API响应时间
        this.setupPerformanceTracking();
    }

    /**
     * 设置性能跟踪
     */
    setupPerformanceTracking() {
        // 记录原始fetch方法
        const originalFetch = window.fetch;
        
        // 重写fetch方法以跟踪性能
        window.fetch = async (url, options) => {
            const startTime = performance.now();
            
            try {
                const response = await originalFetch(url, options);
                const endTime = performance.now();
                const responseTime = endTime - startTime;
                
                // 只跟踪我们关心的API
                if (url.includes('localhost:1822') || url.includes('jevshop.bensonlove1986.workers.dev')) {
                    this.recordResponseTime(url, responseTime);
                    this.sessionData.successCount++;
                }
                
                return response;
            } catch (error) {
                const endTime = performance.now();
                this.sessionData.errorCount++;
                
                logger.error(`API请求失败: ${url}, 错误: ${error.message}`, 'analytics');
                throw error;
            }
        };
    }

    /**
     * 记录响应时间
     */
    recordResponseTime(endpoint, responseTime) {
        // 更新性能指标
        this.performanceMetrics.responseTimeHistory.push({
            endpoint,
            responseTime,
            timestamp: Date.now()
        });
        
        // 限制历史记录长度
        if (this.performanceMetrics.responseTimeHistory.length > 50) {
            this.performanceMetrics.responseTimeHistory.shift();
        }
        
        // 更新平均值和最大值
        this.updatePerformanceStats();
    }

    /**
     * 更新性能统计
     */
    updatePerformanceStats() {
        const history = this.performanceMetrics.responseTimeHistory;
        
        if (history.length > 0) {
            const avgTime = history.reduce((sum, item) => sum + item.responseTime, 0) / history.length;
            const maxTime = Math.max(...history.map(item => item.responseTime));
            
            this.performanceMetrics.averageResponseTime = avgTime;
            this.performanceMetrics.maxResponseTime = maxTime;
        }
    }

    /**
     * 分析客服变化
     */
    analyzeAgentChanges() {
        const currentAgents = agentManager.getAllAgents();
        const currentCount = currentAgents.length;
        
        if (currentCount !== this.lastAgentCount) {
            const changeType = currentCount > this.lastAgentCount ? 'join' : 'leave';
            const changeCount = Math.abs(currentCount - this.lastAgentCount);
            
            this.recordEvent('agent_count_change', {
                type: changeType,
                changeCount,
                previousCount: this.lastAgentCount,
                currentCount,
                timestamp: Date.now()
            });
            
            this.lastAgentCount = currentCount;
        }
    }

    /**
     * 记录事件
     */
    recordEvent(eventType, eventData) {
        const event = {
            type: eventType,
            timestamp: Date.now(),
            data: eventData
        };
        
        // 记录到logger以便导出
        logger.info(`事件: ${eventType}`, 'analytics', eventData);
    }

    /**
     * 开始定期数据收集
     */
    startPeriodicDataCollection() {
        // 每60秒收集一次统计数据
        setInterval(() => {
            this.collectStats();
        }, 60000);
        
        // 立即进行第一次收集
        this.collectStats();
    }

    /**
     * 收集统计数据
     */
    collectStats() {
        const stats = this.generateStatsSnapshot();
        
        // 保存到历史记录
        this.statsHistory.push(stats);
        
        // 限制历史记录长度
        if (this.statsHistory.length > this.historyLimit) {
            this.statsHistory.shift();
        }
        
        logger.info('统计数据已收集', 'analytics');
    }

    /**
     * 生成统计快照
     */
    generateStatsSnapshot() {
        const agents = agentManager.getAllAgents();
        const aiAgents = agents.filter(agent => agent.mode === 'AI').length;
        const humanAgents = agents.filter(agent => agent.mode === 'Human').length;
        const isConnected = agentManager.getStats().isConnected;
        const uptime = Date.now() - this.startTime;
        const failureStats = strategyManager.getFailureStats();
        
        return {
            timestamp: Date.now(),
            uptime: this.formatUptime(uptime),
            agents: {
                total: agents.length,
                ai: aiAgents,
                human: humanAgents,
                active: agents.filter(agent => agent.active).length
            },
            system: {
                connected: isConnected,
                failureRate: this.calculateFailureRate(),
                averageResponseTime: Math.round(this.performanceMetrics.averageResponseTime) + 'ms'
            },
            session: {...this.sessionData},
            failures: failureStats
        };
    }

    /**
     * 计算失败率
     */
    calculateFailureRate() {
        const totalRequests = this.sessionData.successCount + this.sessionData.errorCount;
        if (totalRequests === 0) return '0%';
        
        const failureRate = (this.sessionData.errorCount / totalRequests) * 100;
        return `${failureRate.toFixed(1)}%`;
    }

    /**
     * 格式化运行时间
     */
    formatUptime(milliseconds) {
        const seconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        
        if (days > 0) return `${days}天 ${hours % 24}小时`;
        if (hours > 0) return `${hours}小时 ${minutes % 60}分钟`;
        if (minutes > 0) return `${minutes}分钟`;
        return `${seconds}秒`;
    }

    /**
     * 获取当前统计摘要
     */
    getCurrentStats() {
        return this.generateStatsSnapshot();
    }

    /**
     * 获取历史统计数据
     */
    getHistoryStats() {
        return this.statsHistory;
    }

    /**
     * 分析客服负载分布
     */
    analyzeLoadDistribution() {
        const agents = agentManager.getAllAgents();
        const totalLoad = agents.reduce((sum, agent) => sum + (agent.load || 0), 0);
        const avgLoad = agents.length > 0 ? totalLoad / agents.length : 0;
        
        return {
            totalLoad,
            averageLoad: avgLoad.toFixed(1),
            maxLoad: Math.max(...agents.map(agent => agent.load || 0), 0),
            loadByMode: {
                ai: agents.filter(a => a.mode === 'AI').reduce((sum, a) => sum + (a.load || 0), 0),
                human: agents.filter(a => a.mode === 'Human').reduce((sum, a) => sum + (a.load || 0), 0)
            }
        };
    }

    /**
     * 获取模式切换统计
     */
    getModeSwitchStats() {
        const agents = agentManager.getAllAgents();
        
        // 计算模式分布
        const modeStats = {
            ai: agents.filter(a => a.mode === 'AI').length,
            human: agents.filter(a => a.mode === 'Human').length
        };
        
        // 计算模式比例
        const total = modeStats.ai + modeStats.human;
        const modePercentage = total > 0 ? {
            ai: ((modeStats.ai / total) * 100).toFixed(1),
            human: ((modeStats.human / total) * 100).toFixed(1)
        } : { ai: '0', human: '0' };
        
        return {
            totalSwitches: this.sessionData.modeSwitches,
            currentModeDistribution: modeStats,
            currentModePercentage: modePercentage
        };
    }

    /**
     * 导出统计数据
     */
    exportStats() {
        const exportData = {
            summary: this.getCurrentStats(),
            history: this.getHistoryStats(),
            sessionInfo: {
                startTime: new Date(this.startTime).toLocaleString(),
                exportTime: new Date().toLocaleString()
            }
        };
        
        return JSON.stringify(exportData, null, 2);
    }

    /**
     * 获取性能报告
     */
    getPerformanceReport() {
        return {
            averageResponseTime: Math.round(this.performanceMetrics.averageResponseTime) + 'ms',
            maxResponseTime: Math.round(this.performanceMetrics.maxResponseTime) + 'ms',
            totalRequests: this.sessionData.successCount + this.sessionData.errorCount,
            successRate: this.calculateSuccessRate()
        };
    }

    /**
     * 计算成功率
     */
    calculateSuccessRate() {
        const totalRequests = this.sessionData.successCount + this.sessionData.errorCount;
        if (totalRequests === 0) return '100%';
        
        const successRate = (this.sessionData.successCount / totalRequests) * 100;
        return `${successRate.toFixed(1)}%`;
    }

    /**
     * 清理资源
     */
    destroy() {
        this.statsHistory = [];
        logger.info('数据分析模块已清理', 'analytics');
    }
}

// 导出单例实例
const analyticsManager = new AnalyticsManager();
export default analyticsManager;
