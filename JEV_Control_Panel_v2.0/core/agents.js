/**
 * 模块名称：AgentManager（客服管理）
 * 功能：管理客服实例、状态监控、模式切换、心跳机制
 * 依赖模块：config.js, logger.js, api.js
 * 作者：JEV 系统
 */

import api from './api.js';
import logger from './logger.js';
import { CONFIG } from './config.js';

class AgentManager {
    constructor() {
        this.agentId = null; // 当前客服ID
        this.currentMode = 'AI'; // 默认模式
        this.agents = []; // 所有客服列表
        this.status = 'disconnected'; // 连接状态：connected, disconnected
        this.heartbeatTimer = null;
    }

    /**
     * 初始化客服管理器
     */
    async init() {
        try {
            // 生成或获取客服ID
            this.generateAgentId();
            
            // 注册到服务端
            await this.register();
            
            // 启动心跳
            this.startHeartbeat();
            
            return true;
        } catch (error) {
            logger.error(`客服管理器初始化失败: ${error.message}`, 'agents');
            return false;
        }
    }

    /**
     * 生成唯一的客服ID
     */
    generateAgentId() {
        // 尝试从localStorage获取现有ID
        let existingId = localStorage.getItem('jev_agent_id');
        
        if (existingId) {
            this.agentId = existingId;
            logger.info(`使用现有客服ID: ${this.agentId}`, 'agents');
        } else {
            // 生成新ID
            const timestamp = Date.now();
            const random = Math.random().toString(36).substring(2, 8);
            this.agentId = `agent_${timestamp}_${random}`;
            localStorage.setItem('jev_agent_id', this.agentId);
            logger.info(`生成新客服ID: ${this.agentId}`, 'agents');
        }
        
        // 设置到API模块
        api.setAgentId(this.agentId);
    }

    /**
     * 注册客服到服务端
     */
    async register() {
        try {
            logger.info(`正在注册客服...`, 'agents');
            const result = await api.registerAgent(this.agentId, this.currentMode);
            
            if (result && result.success !== false) {
                logger.success(`客服注册成功`, 'agents');
                this.status = 'connected';
                return true;
            } else {
                throw new Error('注册失败: ' + (result?.error || '未知错误'));
            }
        } catch (error) {
            logger.error(`注册失败: ${error.message}`, 'agents');
            this.status = 'disconnected';
            throw error;
        }
    }

    /**
     * 获取所有客服状态
     */
    async refreshAgents() {
        try {
            logger.info(`刷新客服列表...`, 'agents');
            const result = await api.getAgents();
            
            if (result && result.agents && Array.isArray(result.agents)) {
                this.agents = [...result.agents];
                this.status = 'connected';
                
                // 更新当前客服模式
                const currentAgent = this.agents.find(agent => agent.agent_id === this.agentId);
                if (currentAgent) {
                    this.currentMode = currentAgent.mode || this.currentMode;
                }
                
                logger.info(`客服列表已更新，共${this.agents.length}个客服`, 'agents');
                return this.agents;
            } else {
                throw new Error('获取客服列表失败');
            }
        } catch (error) {
            logger.error(`刷新客服列表失败: ${error.message}`, 'agents');
            this.status = 'disconnected';
            return [];
        }
    }

    /**
     * 切换客服模式
     * @param {string} agentId - 客服ID（可选，默认为当前客服）
     * @param {string} mode - 目标模式：AI或Human
     */
    async switchMode(agentId = this.agentId, mode) {
        try {
            const targetMode = mode === 'AI' ? 'AI' : 'Human';
            logger.info(`切换客服 ${agentId} 到${targetMode}模式`, 'agents');
            
            const result = await api.setMode(agentId, targetMode);
            
            if (result && result.success !== false) {
                logger.success(`模式切换成功`, 'agents');
                
                // 更新本地状态
                if (agentId === this.agentId) {
                    this.currentMode = targetMode;
                }
                
                // 更新客服列表
                const agentIndex = this.agents.findIndex(agent => agent.agent_id === agentId);
                if (agentIndex !== -1) {
                    this.agents[agentIndex].mode = targetMode;
                }
                
                return true;
            } else {
                throw new Error('切换失败: ' + (result?.error || '未知错误'));
            }
        } catch (error) {
            logger.error(`模式切换失败: ${error.message}`, 'agents');
            return false;
        }
    }

    /**
     * 切换当前客服模式（切换AI/人工）
     */
    async toggleMyMode() {
        const newMode = this.currentMode === 'AI' ? 'Human' : 'AI';
        return this.switchMode(this.agentId, newMode);
    }

    /**
     * 设置所有客服为指定模式
     * @param {string} mode - 目标模式
     */
    async setAllAgentsMode(mode) {
        try {
            logger.info(`设置所有客服为${mode}模式`, 'agents');
            const result = await api.setAllAgentsMode(mode);
            
            if (result && result.success) {
                logger.success(`批量模式设置成功`, 'agents');
                
                // 更新当前客服模式
                this.currentMode = mode;
                
                // 更新本地客服列表
                this.agents.forEach(agent => {
                    agent.mode = mode;
                });
                
                return true;
            } else {
                throw new Error('批量设置失败: ' + (result?.error || '未知错误'));
            }
        } catch (error) {
            logger.error(`批量模式设置失败: ${error.message}`, 'agents');
            return false;
        }
    }

    /**
     * 启动心跳包
     */
    startHeartbeat() {
        // 停止现有的心跳
        this.stopHeartbeat();
        
        // 启动新心跳
        this.heartbeatTimer = setInterval(async () => {
            try {
                await api.heartbeat(this.agentId);
                // 心跳成功不需要日志，失败会在API模块记录
            } catch (error) {
                // 静默失败，等待下次重试
            }
        }, CONFIG.HEARTBEAT_INTERVAL);
        
        logger.info(`心跳机制已启动，间隔${CONFIG.HEARTBEAT_INTERVAL}ms`, 'agents');
    }

    /**
     * 停止心跳包
     */
    stopHeartbeat() {
        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
            this.heartbeatTimer = null;
            logger.info(`心跳机制已停止`, 'agents');
        }
    }

    /**
     * 获取当前客服信息
     */
    getCurrentAgent() {
        return {
            agentId: this.agentId,
            mode: this.currentMode,
            status: this.status
        };
    }

    /**
     * 获取所有客服列表
     */
    getAllAgents() {
        return [...this.agents].sort((a, b) => {
            // 按最后活跃时间排序
            const timeA = new Date(a.last_active || 0).getTime();
            const timeB = new Date(b.last_active || 0).getTime();
            return timeB - timeA;
        });
    }

    /**
     * 获取客服状态统计
     */
    getStats() {
        const total = this.agents.length;
        const aiMode = this.agents.filter(a => a.mode === 'AI').length;
        const humanMode = this.agents.filter(a => a.mode === 'Human').length;
        const active = this.agents.filter(a => {
            const lastActive = new Date(a.last_active || 0).getTime();
            const now = Date.now();
            return (now - lastActive) < 60000; // 1分钟内活跃
        }).length;
        
        return {
            total,
            aiMode,
            humanMode,
            active,
            isConnected: this.status === 'connected'
        };
    }

    /**
     * 清理资源
     */
    destroy() {
        this.stopHeartbeat();
        logger.info(`客服管理器已销毁`, 'agents');
    }
}

// 导出单例实例
const agentManager = new AgentManager();
export default agentManager;
