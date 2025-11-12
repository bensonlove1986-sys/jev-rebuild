/**
 * 模块名称：Dashboard（中控面板）
 * 功能：渲染客服列表、模式切换、状态显示、用户交互
 * 依赖模块：agents.js, logger.js, config.js, strategy.js
 * 作者：JEV 系统
 */

import agentManager from '../core/agents.js';
import logger from '../core/logger.js';
import { CONFIG } from '../core/config.js';
import strategyManager from '../core/strategy.js';

class Dashboard {
    constructor() {
        this.panelElement = null;
        this.refreshTimer = null;
    }

    /**
     * 初始化控制面板
     */
    init() {
        this.createPanel();
        this.bindEvents();
        this.startAutoRefresh();
        logger.success('中控面板初始化完成', 'dashboard');
    }

    /**
     * 创建控制面板DOM
     */
    createPanel() {
        // 检查是否已存在面板
        const existingPanel = document.getElementById('jev-control-panel');
        if (existingPanel) {
            existingPanel.remove();
        }

        // 创建主面板容器
        this.panelElement = document.createElement('div');
        this.panelElement.id = 'jev-control-panel';
        this.panelElement.className = 'jev-panel';

        // 面板HTML结构
        this.panelElement.innerHTML = `
            <div class="jev-panel-header">
                <div class="jev-panel-title">🧠 JEV 多客服中控面板 v2.0 Pro</div>
                <div class="jev-panel-controls">
                    <button id="jev-minimize-btn" class="jev-btn jev-btn-small">_</button>
                    <button id="jev-close-btn" class="jev-btn jev-btn-small">✕</button>
                </div>
            </div>
            
            <div class="jev-panel-content">
                <!-- 系统状态区域 -->
                <div class="jev-status-section">
                    <div class="jev-status-info">
                        <span class="jev-status-label">系统状态：</span>
                        <span id="jev-connection-status" class="jev-status-value">🔄 连接中...</span>
                        <span id="jev-port-info" class="jev-port-info">(端口 1822)</span>
                    </div>
                    <div class="jev-current-agent">
                        <span class="jev-status-label">当前客服：</span>
                        <span id="jev-agent-id" class="jev-agent-id">加载中...</span>
                        <span id="jev-agent-mode" class="jev-agent-mode jev-mode-ai">[AI模式]</span>
                    </div>
                </div>

                <!-- 客服列表表格 -->
                <div class="jev-agents-section">
                    <div class="jev-table-container">
                        <table class="jev-agents-table">
                            <thead>
                                <tr>
                                    <th>Agent</th>
                                    <th>Mode</th>
                                    <th>Load</th>
                                    <th>Active</th>
                                    <th>操作</th>
                                </tr>
                            </thead>
                            <tbody id="jev-agents-list">
                                <tr><td colspan="5" class="jev-loading">加载中...</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- 操作按钮区域 -->
                <div class="jev-actions-section">
                    <button id="jev-refresh-btn" class="jev-btn">🔄 刷新状态</button>
                    <button id="jev-all-ai-btn" class="jev-btn jev-btn-ai">🤖 全员AI</button>
                    <button id="jev-all-human-btn" class="jev-btn jev-btn-human">🧍‍♂️ 全员人工</button>
                    <button id="jev-export-logs-btn" class="jev-btn">📥 导出日志</button>
                </div>

                <!-- 日志区域 -->
                <div class="jev-logs-section">
                    <div class="jev-logs-header">
                        <span class="jev-logs-title">系统日志</span>
                        <button id="jev-clear-logs-btn" class="jev-btn jev-btn-small">清空</button>
                    </div>
                    <div id="jev-logs" class="jev-logs-container"></div>
                </div>
            </div>
        `;

        // 添加到页面
        document.body.appendChild(this.panelElement);
        this.makeDraggable();
    }

    /**
     * 绑定事件处理器
     */
    bindEvents() {
        // 面板控制按钮
        document.getElementById('jev-minimize-btn').addEventListener('click', () => this.toggleMinimize());
        document.getElementById('jev-close-btn').addEventListener('click', () => this.hidePanel());
        
        // 操作按钮
        document.getElementById('jev-refresh-btn').addEventListener('click', () => this.refreshData());
        document.getElementById('jev-all-ai-btn').addEventListener('click', () => this.setAllAgentsMode('AI'));
        document.getElementById('jev-all-human-btn').addEventListener('click', () => this.setAllAgentsMode('Human'));
        document.getElementById('jev-export-logs-btn').addEventListener('click', () => logger.exportToCSV());
        document.getElementById('jev-clear-logs-btn').addEventListener('click', () => logger.clear());
    }

    /**
     * 刷新所有数据
     */
    async refreshData() {
        try {
            this.updateStatus('🔄 刷新中...', 'loading');
            
            // 刷新客服列表
            await agentManager.refreshAgents();
            
            // 更新UI
            this.renderAgentsList();
            this.updateCurrentAgentInfo();
            this.updateConnectionStatus();
            
            logger.info('面板数据已刷新', 'dashboard');
        } catch (error) {
            logger.error(`刷新失败: ${error.message}`, 'dashboard');
        }
    }

    /**
     * 渲染客服列表
     */
    renderAgentsList() {
        const agentsListElement = document.getElementById('jev-agents-list');
        const agents = agentManager.getAllAgents();
        const currentAgentId = agentManager.getCurrentAgent().agentId;

        if (agents.length === 0) {
            agentsListElement.innerHTML = `<tr><td colspan="5" class="jev-empty">暂无客服在线</td></tr>`;
            return;
        }

        agentsListElement.innerHTML = '';
        
        agents.forEach(agent => {
            const row = document.createElement('tr');
            row.className = agent.agent_id === currentAgentId ? 'jev-current-agent-row' : '';
            
            // 格式化最后活跃时间
            const lastActive = this.formatLastActive(agent.last_active);
            
            // 获取模式样式
            const modeClass = agent.mode === 'AI' ? 'jev-mode-ai' : 'jev-mode-human';
            const modeDisplay = agent.mode === 'AI' ? 'AI' : '人工';
            
            // 获取策略分析
            const analysis = strategyManager.getAgentAnalysis(agent.agent_id);
            const riskIndicator = analysis.isAtRisk ? '<span class="jev-risk-indicator">⚠️</span>' : '';
            
            row.innerHTML = `
                <td class="jev-agent-name">
                    ${agent.agent_id} ${riskIndicator}
                    ${agent.agent_id === currentAgentId ? '<span class="jev-you">[您]</span>' : ''}
                </td>
                <td><span class="jev-mode-badge ${modeClass}">${modeDisplay}</span></td>
                <td>${agent.load || 0}</td>
                <td>${lastActive}</td>
                <td>
                    <button class="jev-switch-btn" data-agent="${agent.agent_id}" data-current-mode="${agent.mode}">
                        切换
                    </button>
                </td>
            `;
            
            agentsListElement.appendChild(row);
        });

        // 绑定切换按钮事件
        document.querySelectorAll('.jev-switch-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const agentId = e.target.dataset.agent;
                const currentMode = e.target.dataset.currentMode;
                const newMode = currentMode === 'AI' ? 'Human' : 'AI';
                this.switchAgentMode(agentId, newMode);
            });
        });
    }

    /**
     * 切换客服模式
     */
    async switchAgentMode(agentId, mode) {
        try {
            this.updateStatus(`🔄 切换到${mode === 'AI' ? 'AI' : '人工'}服务模式...`, 'loading');
            
            const success = await agentManager.switchMode(agentId, mode);
            
            if (success) {
                this.refreshData();
                logger.success(`服务${agentId} 已切换到${mode}模式`, 'dashboard');
            }
        } catch (error) {
            logger.error(`切换失败: ${error.message}`, 'dashboard');
        }
    }

    /**
     * 设置所有客服模式
     */
    async setAllAgentsMode(mode) {
        try {
            if (!confirm(`确定要将所有客服设置为${mode === 'AI' ? 'AI' : '人工'}模式吗？`)) {
                return;
            }
            
            this.updateStatus(`🔄 设置全员${mode === 'AI' ? 'AI' : '人工'}模式...`, 'loading');
            
            const success = await agentManager.setAllAgentsMode(mode);
            
            if (success) {
                this.refreshData();
                logger.success(`已将所有客服设置为${mode}模式`, 'dashboard');
            }
        } catch (error) {
            logger.error(`批量设置失败: ${error.message}`, 'dashboard');
        }
    }

    /**
     * 更新连接状态显示
     */
    updateConnectionStatus() {
        const statusElement = document.getElementById('jev-connection-status');
        const isConnected = agentManager.getStats().isConnected;
        
        if (isConnected) {
            statusElement.textContent = '✅ 已连接';
            statusElement.className = 'jev-status-value connected';
        } else {
            statusElement.textContent = '❌ 未连接';
            statusElement.className = 'jev-status-value disconnected';
        }
    }

    /**
     * 更新当前客服信息
     */
    updateCurrentAgentInfo() {
        const currentAgent = agentManager.getCurrentAgent();
        
        document.getElementById('jev-agent-id').textContent = currentAgent.agentId;
        
        const modeElement = document.getElementById('jev-agent-mode');
        if (currentAgent.mode === 'AI') {
            modeElement.textContent = '[AI模式]';
            modeElement.className = 'jev-agent-mode jev-mode-ai';
        } else {
            modeElement.textContent = '[人工模式]';
            modeElement.className = 'jev-agent-mode jev-mode-human';
        }
    }

    /**
     * 更新状态文本
     */
    updateStatus(text, type = 'normal') {
        const statusElement = document.getElementById('jev-connection-status');
        statusElement.textContent = text;
        
        statusElement.className = `jev-status-value ${type}`;
    }

    /**
     * 格式化最后活跃时间
     */
    formatLastActive(timestamp) {
        if (!timestamp) return '未知';
        
        const now = Date.now();
        const lastActive = new Date(timestamp).getTime();
        const diff = now - lastActive;
        
        if (diff < 60000) return `${Math.floor(diff / 1000)}秒前`;
        if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
        return new Date(timestamp).toLocaleDateString();
    }

    /**
     * 启动自动刷新
     */
    startAutoRefresh() {
        this.stopAutoRefresh(); // 先停止现有刷新
        
        this.refreshTimer = setInterval(() => {
            this.refreshData();
        }, CONFIG.REFRESH_INTERVAL);
        
        logger.info(`自动刷新已启动，间隔${CONFIG.REFRESH_INTERVAL/1000}秒`, 'dashboard');
    }

    /**
     * 停止自动刷新
     */
    stopAutoRefresh() {
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
            this.refreshTimer = null;
            logger.info('自动刷新已停止', 'dashboard');
        }
    }

    /**
     * 使面板可拖动
     */
    makeDraggable() {
        const panel = this.panelElement;
        const header = panel.querySelector('.jev-panel-header');
        
        let isDragging = false;
        let offsetX, offsetY;
        
        header.addEventListener('mousedown', (e) => {
            isDragging = true;
            
            // 计算鼠标位置与面板左上角的偏移
            const panelRect = panel.getBoundingClientRect();
            offsetX = e.clientX - panelRect.left;
            offsetY = e.clientY - panelRect.top;
            
            // 添加拖动样式
            panel.classList.add('jev-panel-dragging');
            
            // 防止文本选择
            e.preventDefault();
        });
        
        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            
            // 计算新位置
            const newX = e.clientX - offsetX;
            const newY = e.clientY - offsetY;
            
            // 设置面板位置
            panel.style.left = `${newX}px`;
            panel.style.top = `${newY}px`;
        });
        
        document.addEventListener('mouseup', () => {
            isDragging = false;
            panel.classList.remove('jev-panel-dragging');
        });
    }

    /**
     * 切换最小化状态
     */
    toggleMinimize() {
        const content = this.panelElement.querySelector('.jev-panel-content');
        const minimizeBtn = document.getElementById('jev-minimize-btn');
        
        if (content.style.display === 'none') {
            content.style.display = 'block';
            minimizeBtn.textContent = '_';
            this.panelElement.style.height = 'auto';
        } else {
            content.style.display = 'none';
            minimizeBtn.textContent = '□';
            this.panelElement.style.height = '40px';
        }
    }

    /**
     * 隐藏面板
     */
    hidePanel() {
        this.panelElement.style.display = 'none';
        logger.info('面板已隐藏', 'dashboard');
    }

    /**
     * 显示面板
     */
    showPanel() {
        this.panelElement.style.display = 'block';
        logger.info('面板已显示', 'dashboard');
    }

    /**
     * 销毁面板
     */
    destroy() {
        this.stopAutoRefresh();
        if (this.panelElement) {
            this.panelElement.remove();
            this.panelElement = null;
        }
        logger.info('面板已销毁', 'dashboard');
    }
}

// 导出单例实例
const dashboard = new Dashboard();
export default dashboard;
