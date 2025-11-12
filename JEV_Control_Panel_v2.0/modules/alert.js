/**
 * 模块名称：AlertManager（告警模块）
 * 功能：连接监控、失败检测、用户通知、异常处理
 * 依赖模块：config.js, logger.js, agents.js, strategy.js
 * 作者：JEV 系统
 */

import { CONFIG } from '../core/config.js';
import logger from '../core/logger.js';
import agentManager from '../core/agents.js';
import strategyManager from '../core/strategy.js';

class AlertManager {
    constructor() {
        this.monitorInterval = null;
        this.lastConnectionStatus = null;
        this.notificationTimeout = null;
        this.errorCount = 0;
        this.maxErrorCount = 3;
    }

    /**
     * 初始化告警系统
     */
    init() {
        this.startConnectionMonitor();
        this.registerEventListeners();
        logger.success('告警系统初始化完成', 'alert');
    }

    /**
     * 注册事件监听器
     */
    registerEventListeners() {
        // 监听客服模式切换事件
        agentManager.onModeChange((agentId, oldMode, newMode) => {
            this.handleModeChange(agentId, oldMode, newMode);
        });

        // 监听客服注册事件
        agentManager.onAgentRegistered((agentId) => {
            this.handleAgentRegistered(agentId);
        });

        // 监听连接状态变化
        agentManager.onConnectionStatusChange((isConnected) => {
            this.handleConnectionChange(isConnected);
        });

        // 监听失败事件
        strategyManager.onFailure((agentId, failureType) => {
            this.handleFailureEvent(agentId, failureType);
        });

        // 监听超时事件
        strategyManager.onTimeout((agentId) => {
            this.handleTimeoutEvent(agentId);
        });
    }

    /**
     * 启动连接监控
     */
    startConnectionMonitor() {
        // 停止现有监控
        if (this.monitorInterval) {
            clearInterval(this.monitorInterval);
        }

        // 设置新的监控间隔 - 每15秒检查一次连接状态
        this.monitorInterval = setInterval(() => {
            this.checkConnectionStatus();
        }, 15000);

        logger.info('连接监控已启动', 'alert');
    }

    /**
     * 停止连接监控
     */
    stopConnectionMonitor() {
        if (this.monitorInterval) {
            clearInterval(this.monitorInterval);
            this.monitorInterval = null;
            logger.info('连接监控已停止', 'alert');
        }
    }

    /**
     * 检查连接状态
     */
    async checkConnectionStatus() {
        try {
            const isConnected = await agentManager.checkConnection();
            
            // 连接断开时记录错误
            if (!isConnected) {
                this.errorCount++;
                logger.error(`连接检查失败 (${this.errorCount}/${this.maxErrorCount})`, 'alert');
                
                // 连续失败达到阈值时发出告警
                if (this.errorCount >= this.maxErrorCount) {
                    this.showConnectionLostAlert();
                }
            } else {
                // 连接恢复，重置错误计数
                if (this.errorCount > 0) {
                    this.errorCount = 0;
                    logger.success('连接已恢复', 'alert');
                    this.showConnectionRestoredAlert();
                }
            }
        } catch (error) {
            this.errorCount++;
            logger.error(`连接检查出错: ${error.message}`, 'alert');
            
            if (this.errorCount >= this.maxErrorCount) {
                this.showConnectionLostAlert();
            }
        }
    }

    /**
     * 处理连接状态变化
     */
    handleConnectionChange(isConnected) {
        // 检查状态是否真正改变
        if (this.lastConnectionStatus !== isConnected) {
            this.lastConnectionStatus = isConnected;
            
            if (isConnected) {
                logger.success('系统连接已建立', 'alert');
                this.showConnectionRestoredAlert();
            } else {
                logger.error('系统连接已断开', 'alert');
                this.showConnectionLostAlert();
            }
        }
    }

    /**
     * 处理客服模式切换
     */
    handleModeChange(agentId, oldMode, newMode) {
        // 检查是否为当前客服
        const currentAgentId = agentManager.getCurrentAgent().agentId;
        
        // 为当前客服显示模式切换通知
        if (agentId === currentAgentId) {
            const modeText = newMode === 'AI' ? 'AI模式' : '人工模式';
            this.showNotification(`模式已切换到${modeText}`, 'success');
        }
        
        // 记录事件
        logger.info(`服务${agentId} 从 ${oldMode} 切换到 ${newMode}`, 'alert');
    }

    /**
     * 处理客服注册
     */
    handleAgentRegistered(agentId) {
        logger.success(`客服${agentId} 已成功注册`, 'alert');
        this.showNotification(`客服注册成功: ${agentId}`, 'success');
    }

    /**
     * 处理失败事件
     */
    handleFailureEvent(agentId, failureType) {
        const failureInfo = {
            'ai_error': 'AI回复失败',
            'timeout': '响应超时',
            'connection_error': '连接错误',
            'api_error': 'API调用失败'
        }[failureType] || '未知错误';
        
        logger.warning(`客服${agentId} ${failureInfo}`, 'alert');
        
        // 连续失败检测
        const failureCount = strategyManager.getFailureCount(agentId);
        if (failureCount === 2) { // 第二次失败时发出警告
            this.showNotification(`${agentId}: 已失败 ${failureCount} 次，请注意监控`, 'warning');
        }
        
        // 自动转人工的策略处理由strategy模块负责
    }

    /**
     * 处理超时事件
     */
    handleTimeoutEvent(agentId) {
        logger.warning(`客服${agentId} 响应超时`, 'alert');
        this.showNotification(`${agentId}: 响应超时，正在处理...`, 'warning');
    }

    /**
     * 显示连接丢失告警
     */
    showConnectionLostAlert() {
        this.showNotification(
            '⚠️ 系统连接已断开', 
            'error', 
            'AI服务端连接丢失，请检查服务是否正常运行',
            true // 高优先级，不自动关闭
        );
        
        // 尝试自动重连
        this.attemptAutoReconnect();
    }

    /**
     * 显示连接恢复通知
     */
    showConnectionRestoredAlert() {
        this.showNotification('✅ 系统连接已恢复', 'success');
    }

    /**
     * 尝试自动重连
     */
    async attemptAutoReconnect() {
        try {
            logger.info('尝试自动重连...', 'alert');
            
            // 等待5秒后尝试重新注册
            setTimeout(async () => {
                try {
                    await agentManager.reconnect();
                    logger.success('自动重连成功', 'alert');
                } catch (error) {
                    logger.error(`自动重连失败: ${error.message}`, 'alert');
                    // 30秒后再次尝试
                    setTimeout(() => this.attemptAutoReconnect(), 30000);
                }
            }, 5000);
        } catch (error) {
            logger.error(`重连机制出错: ${error.message}`, 'alert');
        }
    }

    /**
     * 显示通知
     */
    showNotification(title, type = 'info', message = '', persistent = false) {
        // 清除之前的通知
        this.clearNotification();
        
        // 创建通知元素
        const notification = document.createElement('div');
        notification.className = `jev-notification jev-notification-${type}`;
        notification.id = 'jev-notification';
        
        // 设置通知内容
        notification.innerHTML = `
            <div class="jev-notification-title">${title}</div>
            ${message ? `<div class="jev-notification-message">${message}</div>` : ''}
        `;
        
        // 添加关闭按钮（非持久通知）
        if (!persistent) {
            const closeBtn = document.createElement('button');
            closeBtn.className = 'jev-notification-close';
            closeBtn.textContent = '✕';
            closeBtn.onclick = () => this.clearNotification();
            notification.appendChild(closeBtn);
        }
        
        // 添加到页面
        document.body.appendChild(notification);
        
        // 添加显示动画
        setTimeout(() => {
            notification.classList.add('jev-notification-show');
        }, 10);
        
        // 非持久通知自动关闭
        if (!persistent) {
            this.notificationTimeout = setTimeout(() => {
                this.clearNotification();
            }, 5000);
        }
    }

    /**
     * 清除通知
     */
    clearNotification() {
        // 清除超时计时器
        if (this.notificationTimeout) {
            clearTimeout(this.notificationTimeout);
            this.notificationTimeout = null;
        }
        
        // 移除通知元素
        const notification = document.getElementById('jev-notification');
        if (notification) {
            notification.classList.remove('jev-notification-show');
            
            // 等待动画完成后移除
            setTimeout(() => {
                notification.remove();
            }, 300);
        }
    }

    /**
     * 显示AI连续失败警告
     */
    showAIFailureWarning(agentId) {
        const failureCount = strategyManager.getFailureCount(agentId);
        
        this.showNotification(
            `⚠️ AI回复连续失败 ${failureCount} 次`, 
            'warning',
            `建议手动检查客服 ${agentId} 的状态`,
            true
        );
        
        logger.warning(`AI连续失败警告: ${agentId}`, 'alert');
    }

    /**
     * 检查系统健康状态
     */
    async checkSystemHealth() {
        try {
            const healthData = {
                connection: await agentManager.checkConnection(),
                agentStatus: agentManager.getStats(),
                failureStats: strategyManager.getFailureStats(),
                lastActivity: agentManager.getLastActivity()
            };
            
            logger.info('系统健康检查完成', 'alert');
            return healthData;
        } catch (error) {
            logger.error(`健康检查失败: ${error.message}`, 'alert');
            return null;
        }
    }

    /**
     * 发送心跳检查结果通知
     */
    notifyHeartbeatStatus(success, agentId) {
        if (!success) {
            logger.warning(`客服${agentId} 心跳发送失败`, 'alert');
            this.showNotification(`⚠️ 心跳发送失败`, 'warning');
        }
    }

    /**
     * 清理资源
     */
    destroy() {
        this.stopConnectionMonitor();
        this.clearNotification();
        logger.info('告警系统已销毁', 'alert');
    }
}

// 导出单例实例
const alertManager = new AlertManager();
export default alertManager;
