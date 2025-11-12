/**
 * 模块名称：StrategyManager（策略管理）
 * 功能：智能决策、失败监控、自动模式切换、负载均衡
 * 依赖模块：config.js, logger.js, agents.js
 * 作者：JEV 系统
 */

import { CONFIG } from './config.js';
import logger from './logger.js';
import agentManager from './agents.js';

class StrategyManager {
    constructor() {
        this.failureCounts = new Map(); // 记录每个客服的失败次数
        this.lastActivity = new Map(); // 记录每个客服的最后活动时间
        this.rules = this.getDefaultRules();
        this.isEnabled = true;
    }

    /**
     * 获取默认规则配置
     */
    getDefaultRules() {
        return {
            // AI失败自动转人工
            aiToHuman: {
                enabled: true,
                failureThreshold: CONFIG.STRATEGY.AI_FAILURE_THRESHOLD,
                message: 'AI连续失败次数过多，已自动切换到人工模式'
            },
            // 人工超时自动转AI
            humanToAi: {
                enabled: true,
                timeoutMs: CONFIG.STRATEGY.HUMAN_TIMEOUT,
                message: '人工模式长时间未响应，已自动切换到AI模式'
            },
            // 智能分配功能
            autoAssign: {
                enabled: CONFIG.STRATEGY.AUTO_ASSIGN_ENABLED,
                loadBalancing: true,
                priorityMode: 'active'
            }
        };
    }

    /**
     * 更新规则配置
     * @param {Object} newRules - 新的规则配置
     */
    updateRules(newRules) {
        this.rules = {
            ...this.rules,
            ...newRules
        };
        logger.info('策略规则已更新', 'strategy');
    }

    /**
     * 启用或禁用策略管理
     * @param {boolean} enabled - 是否启用
     */
    setEnabled(enabled) {
        this.isEnabled = enabled;
        logger.info(`策略管理已${enabled ? '启用' : '禁用'}`, 'strategy');
    }

    /**
     * 记录AI回复失败
     * @param {string} agentId - 客服ID
     */
    recordFailure(agentId) {
        if (!this.isEnabled || !this.rules.aiToHuman.enabled) return;

        // 获取当前失败次数
        const currentCount = this.failureCounts.get(agentId) || 0;
        const newCount = currentCount + 1;
        
        this.failureCounts.set(agentId, newCount);
        logger.warning(`客服${agentId} AI失败次数: ${newCount}/${this.rules.aiToHuman.failureThreshold}`, 'strategy');
        
        // 检查是否达到阈值
        if (newCount >= this.rules.aiToHuman.failureThreshold) {
            this.handleAIFailureThreshold(agentId);
        }
    }

    /**
     * 记录AI回复成功
     * @param {string} agentId - 客服ID
     */
    recordSuccess(agentId) {
        // 重置失败计数
        if (this.failureCounts.has(agentId)) {
            this.failureCounts.delete(agentId);
            logger.info(`客服${agentId} 失败计数已重置`, 'strategy');
        }
        
        // 更新最后活动时间
        this.updateActivity(agentId);
    }

    /**
     * 更新客服活动时间
     * @param {string} agentId - 客服ID
     */
    updateActivity(agentId) {
        this.lastActivity.set(agentId, Date.now());
    }

    /**
     * 处理AI失败阈值
     * @param {string} agentId - 客服ID
     */
    async handleAIFailureThreshold(agentId) {
        try {
            logger.warning(`触发AI失败阈值规则，自动切换到人工模式`, 'strategy');
            
            // 切换到人工模式
            const success = await agentManager.switchMode(agentId, 'Human');
            
            if (success) {
                logger.success(`客服${agentId} 已自动切换到人工模式`, 'strategy');
                this.failureCounts.delete(agentId); // 重置失败计数
                
                // 添加系统通知
                logger.warning(this.rules.aiToHuman.message, 'system');
            }
        } catch (error) {
            logger.error(`自动切换模式失败: ${error.message}`, 'strategy');
        }
    }

    /**
     * 检查人工模式超时
     */
    checkHumanTimeout() {
        if (!this.isEnabled || !this.rules.humanToAi.enabled) return;

        const now = Date.now();
        const agents = agentManager.getAllAgents();
        
        agents.forEach(agent => {
            if (agent.mode === 'Human') {
                const lastActiveTime = this.lastActivity.get(agent.agent_id) || 
                                      new Date(agent.last_active || 0).getTime();
                
                const timeSinceLastActivity = now - lastActiveTime;
                
                // 检查是否超时
                if (timeSinceLastActivity > this.rules.humanToAi.timeoutMs) {
                    this.handleHumanTimeout(agent.agent_id);
                }
            }
        });
    }

    /**
     * 处理人工模式超时
     * @param {string} agentId - 客服ID
     */
    async handleHumanTimeout(agentId) {
        try {
            logger.warning(`客服${agentId} 人工模式超时，自动切换到AI模式`, 'strategy');
            
            // 切换到AI模式
            const success = await agentManager.switchMode(agentId, 'AI');
            
            if (success) {
                logger.success(`客服${agentId} 已自动切换到AI模式`, 'strategy');
                this.lastActivity.delete(agentId); // 重置活动时间
                
                // 添加系统通知
                logger.warning(this.rules.humanToAi.message, 'system');
            }
        } catch (error) {
            logger.error(`自动切换模式失败: ${error.message}`, 'strategy');
        }
    }

    /**
     * 推荐最优客服（用于智能分配）
     * @param {Object} messageData - 消息数据
     */
    recommendAgent(messageData) {
        if (!this.isEnabled || !this.rules.autoAssign.enabled) return null;

        const agents = agentManager.getAllAgents();
        
        // 过滤可用的客服（在线且AI模式优先）
        const availableAgents = agents.filter(agent => {
            // 检查是否活跃
            const lastActive = new Date(agent.last_active || 0).getTime();
            const isActive = Date.now() - lastActive < 300000; // 5分钟内活跃
            
            // 根据负载均衡配置，优先选择AI模式或负载较低的人工
            if (this.rules.autoAssign.loadBalancing) {
                return isActive && (agent.mode === 'AI' || agent.load < 3);
            }
            
            return isActive;
        });
        
        if (availableAgents.length === 0) return null;
        
        // 按优先级排序
        if (this.rules.autoAssign.priorityMode === 'active') {
            // 按最后活跃时间排序
            availableAgents.sort((a, b) => {
                const timeA = new Date(a.last_active || 0).getTime();
                const timeB = new Date(b.last_active || 0).getTime();
                return timeB - timeA;
            });
        } else if (this.rules.autoAssign.priorityMode === 'load') {
            // 按负载排序
            availableAgents.sort((a, b) => (a.load || 0) - (b.load || 0));
        }
        
        logger.info(`智能推荐客服: ${availableAgents[0].agent_id}`, 'strategy');
        return availableAgents[0];
    }

    /**
     * 获取客服状态分析
     * @param {string} agentId - 客服ID
     */
    getAgentAnalysis(agentId) {
        const analysis = {
            failureCount: this.failureCounts.get(agentId) || 0,
            lastActivity: this.formatTime(this.lastActivity.get(agentId)),
            isAtRisk: false
        };
        
        // 检查是否处于风险状态
        const failureThreshold = this.rules.aiToHuman.failureThreshold;
        analysis.isAtRisk = analysis.failureCount >= failureThreshold * 0.7; // 70%阈值时标记为风险
        
        return analysis;
    }

    /**
     * 格式化时间显示
     * @param {number} timestamp - 时间戳
     */
    formatTime(timestamp) {
        if (!timestamp) return '无记录';
        
        const now = Date.now();
        const diff = now - timestamp;
        
        if (diff < 60000) return `${Math.floor(diff / 1000)}秒前`;
        if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
        return `${Math.floor(diff / 3600000)}小时前`;
    }

    /**
     * 获取所有策略状态
     */
    getStatus() {
        return {
            enabled: this.isEnabled,
            rules: this.rules,
            activeFailureCounts: this.failureCounts.size,
            monitoredAgents: this.lastActivity.size
        };
    }

    /**
     * 重置所有状态
     */
    reset() {
        this.failureCounts.clear();
        this.lastActivity.clear();
        this.rules = this.getDefaultRules();
        logger.info('策略状态已重置', 'strategy');
    }
}

// 导出单例实例
const strategyManager = new StrategyManager();

// 设置定时检查人工超时
setInterval(() => {
    strategyManager.checkHumanTimeout();
}, 10000); // 每10秒检查一次

export default strategyManager;
