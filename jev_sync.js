// jev_sync.js - JEV 通信同步模块
// 负责心跳检测、端口发现、自动重连等底层通信功能

// 全局状态对象
const JEV_SYNC = {
    // 服务配置
    config: {
        workerPingUrl: 'http://localhost:8787/ping', // Worker 心跳地址
        agentPingUrl: 'http://localhost:1820/ping',   // Agent 心跳地址
        aiPingUrl: 'http://localhost:1822/ping',      // AI 服务心跳地址
        kvTestUrl: 'http://localhost:8787/kv-test',   // KV 测试地址
        r2TestUrl: 'http://localhost:8787/r2-test',   // R2 测试地址
        systemCheckUrl: 'http://localhost:8787/system-check', // 系统检测地址
        pingInterval: 5000,                          // 心跳间隔 (ms)
        storageCheckInterval: 10000,                 // 存储检测间隔 (ms)
        reconnectDelay: 3000,                        // 重连延迟 (ms)
        maxRetries: 5                                // 最大重试次数
    },
    
    // 服务状态
    status: {
        worker: { connected: false, retries: 0 },
        agent: { connected: false, retries: 0 },
        ai: { connected: false, retries: 0 },
        storage: {
            jevpi: { connected: false, lastUpdated: null },
            jevui: { connected: false, lastUpdated: null },
            memStore: { connected: false, lastUpdated: null },
            r2Bucket: { connected: false, lastUpdated: null },
            signature: { valid: false, value: null }
        },
        overall: 'initializing' // initializing, online, partial, offline
    },
    
    // 心跳定时器
    timers: {
        worker: null,
        agent: null,
        ai: null,
        storage: null,
        heartbeat: null
    },
    
    // 事件监听器
    listeners: {
        statusChange: [],
        log: []
    },
    
    // 初始化函数
    init: function() {
        this.log('系统初始化中...');
        
        // 设置默认日期
        const today = new Date().toISOString().split('T')[0];
        if (document.getElementById('quote-date')) {
            document.getElementById('quote-date').value = today;
        }
        
        // 启动服务检测
        this.startServiceChecks();
        
        // 启动全局心跳指示器
        this.startHeartbeatIndicator();
        
        // 更新时间显示
        this.updateCurrentTime();
        setInterval(() => this.updateCurrentTime(), 1000);
    },
    
    // 启动服务检测
    startServiceChecks: function() {
        // 立即检测一次所有服务
        this.checkWorkerStatus();
        this.checkAgentStatus();
        this.checkAIStatus();
        this.checkStorageStatus();
        
        // 设置定时检测
        this.timers.worker = setInterval(() => this.checkWorkerStatus(), this.config.pingInterval);
        this.timers.agent = setInterval(() => this.checkAgentStatus(), this.config.pingInterval);
        this.timers.ai = setInterval(() => this.checkAIStatus(), this.config.pingInterval);
        this.timers.storage = setInterval(() => this.checkStorageStatus(), this.config.storageCheckInterval);
    },
    
    // 检查存储状态
    checkStorageStatus: async function() {
        try {
            // 检查 KV 状态
            const kvResponse = await fetch(this.config.kvTestUrl, {
                method: 'GET',
                timeout: 5000
            });
            
            if (kvResponse.ok) {
                const kvData = await kvResponse.json();
                this.updateStorageStatus('jevpi', true, kvData.jevpi);
                this.updateStorageStatus('jevui', true, kvData.jevui);
                this.updateStorageStatus('memStore', true, kvData.mem);
            } else {
                this.updateStorageStatus('jevpi', false, `KV 响应异常: ${kvResponse.status}`);
                this.updateStorageStatus('jevui', false, `KV 响应异常: ${kvResponse.status}`);
                this.updateStorageStatus('memStore', false, `KV 响应异常: ${kvResponse.status}`);
            }
            
            // 检查 R2 状态
            const r2Response = await fetch(this.config.r2TestUrl, {
                method: 'GET',
                timeout: 5000
            });
            
            if (r2Response.ok) {
                const r2Data = await r2Response.json();
                this.updateStorageStatus('r2Bucket', true, r2Data.status === 'ok' ? 'R2 可用' : 'R2 状态异常');
            } else {
                this.updateStorageStatus('r2Bucket', false, `R2 响应异常: ${r2Response.status}`);
            }
            
            // 检查系统签名
            const systemResponse = await fetch(this.config.systemCheckUrl, {
                method: 'GET',
                timeout: 5000
            });
            
            if (systemResponse.ok) {
                const systemData = await systemResponse.json();
                this.status.storage.signature.valid = true;
                this.status.storage.signature.value = 'JEV_SYSTEM_READY';
                this.updateStorageUI();
            } else {
                this.status.storage.signature.valid = false;
                this.status.storage.signature.value = null;
                this.updateStorageUI();
            }
            
        } catch (error) {
            this.updateStorageStatus('jevpi', false, `存储检测失败: ${error.message}`);
            this.updateStorageStatus('jevui', false, `存储检测失败: ${error.message}`);
            this.updateStorageStatus('memStore', false, `存储检测失败: ${error.message}`);
            this.updateStorageStatus('r2Bucket', false, `存储检测失败: ${error.message}`);
            this.status.storage.signature.valid = false;
            this.status.storage.signature.value = null;
        }
    },
    
    // 更新存储状态
    updateStorageStatus: function(storageType, isConnected, message) {
        if (this.status.storage[storageType]) {
            this.status.storage[storageType].connected = isConnected;
            this.status.storage[storageType].lastUpdated = new Date().toISOString();
            this.log(`${storageType.toUpperCase()} 状态更新: ${isConnected ? '已连接' : '连接失败'} - ${message}`);
            this.updateStorageUI();
        }
    },
    
    // 更新存储 UI
    updateStorageUI: function() {
        // KV - JEVPI
        const jevpiIndicator = document.getElementById('jevpi-indicator');
        const jevpiText = document.getElementById('jevpi-status-text');
        if (jevpiIndicator && jevpiText) {
            if (this.status.storage.jevpi.connected) {
                jevpiIndicator.className = 'w-3 h-3 rounded-full bg-success';
                jevpiText.className = 'text-sm text-success';
                jevpiText.textContent = '✅ JEVPI 写入成功';
            } else {
                jevpiIndicator.className = 'w-3 h-3 rounded-full bg-warning animate-pulse';
                jevpiText.className = 'text-sm text-warning';
                jevpiText.textContent = '⏳ JEVPI 未就绪';
            }
        }
        
        // KV - JEVUI
        const jevuiIndicator = document.getElementById('jevui-indicator');
        const jevuiText = document.getElementById('jevui-status-text');
        if (jevuiIndicator && jevuiText) {
            if (this.status.storage.jevui.connected) {
                jevuiIndicator.className = 'w-3 h-3 rounded-full bg-success';
                jevuiText.className = 'text-sm text-success';
                jevuiText.textContent = '✅ JEVUI 写入成功';
            } else {
                jevuiIndicator.className = 'w-3 h-3 rounded-full bg-warning animate-pulse';
                jevuiText.className = 'text-sm text-warning';
                jevuiText.textContent = '⏳ JEVUI 未就绪';
            }
        }
        
        // KV - MEM_STORE
        const memStoreIndicator = document.getElementById('mem-store-indicator');
        const memStoreText = document.getElementById('mem-store-status-text');
        if (memStoreIndicator && memStoreText) {
            if (this.status.storage.memStore.connected) {
                memStoreIndicator.className = 'w-3 h-3 rounded-full bg-success';
                memStoreText.className = 'text-sm text-success';
                memStoreText.textContent = '✅ MEM_STORE 写入成功';
            } else {
                memStoreIndicator.className = 'w-3 h-3 rounded-full bg-warning animate-pulse';
                memStoreText.className = 'text-sm text-warning';
                memStoreText.textContent = '⏳ MEM_STORE 未就绪';
            }
        }
        
        // R2 - R2_BUCKET
        const r2BucketIndicator = document.getElementById('r2-bucket-indicator');
        const r2BucketText = document.getElementById('r2-bucket-status-text');
        if (r2BucketIndicator && r2BucketText) {
            if (this.status.storage.r2Bucket.connected) {
                r2BucketIndicator.className = 'w-3 h-3 rounded-full bg-success';
                r2BucketText.className = 'text-sm text-success';
                r2BucketText.textContent = '✅ R2_BUCKET 文件验证通过';
            } else {
                r2BucketIndicator.className = 'w-3 h-3 rounded-full bg-warning animate-pulse';
                r2BucketText.className = 'text-sm text-warning';
                r2BucketText.textContent = '⏳ R2_BUCKET 未就绪';
            }
        }
        
        // 系统签名
        const signatureIndicator = document.getElementById('signature-indicator');
        const signatureText = document.getElementById('signature-text');
        if (signatureIndicator && signatureText) {
            if (this.status.storage.signature.valid) {
                signatureIndicator.className = 'w-3 h-3 rounded-full bg-success';
                signatureText.className = 'text-sm text-success font-mono';
                signatureText.textContent = `✅ 系统签名: ${this.status.storage.signature.value}`;
            } else {
                signatureIndicator.className = 'w-3 h-3 rounded-full bg-warning animate-pulse';
                signatureText.className = 'text-sm text-warning';
                signatureText.textContent = '⏳ 签名未验证';
            }
        }
    },
    
    // 检查 Worker 状态
    checkWorkerStatus: async function() {
        try {
            const response = await fetch(this.config.workerPingUrl, {
                method: 'GET',
                timeout: 3000
            });
            
            if (response.ok) {
                this.updateServiceStatus('worker', true, 'Worker 已连接');
            } else {
                this.updateServiceStatus('worker', false, `Worker 响应异常: ${response.status}`);
            }
        } catch (error) {
            this.updateServiceStatus('worker', false, `Worker 连接失败: ${error.message}`);
        }
    },
    
    // 检查 Agent 状态
    checkAgentStatus: async function() {
        try {
            const response = await fetch(this.config.agentPingUrl, {
                method: 'GET',
                timeout: 3000
            });
            
            if (response.ok) {
                this.updateServiceStatus('agent', true, 'Agent 在线 (1820)');
            } else {
                this.updateServiceStatus('agent', false, `Agent 响应异常: ${response.status}`);
            }
        } catch (error) {
            this.updateServiceStatus('agent', false, `Agent 连接失败: ${error.message}`);
        }
    },
    
    // 检查 AI 服务状态
    checkAIStatus: async function() {
        try {
            const response = await fetch(this.config.aiPingUrl, {
                method: 'GET',
                timeout: 3000
            });
            
            if (response.ok) {
                this.updateServiceStatus('ai', true, 'AI 服务在线 (1822)');
            } else {
                this.updateServiceStatus('ai', false, `AI 服务响应异常: ${response.status}`);
            }
        } catch (error) {
            this.updateServiceStatus('ai', false, `AI 服务连接失败: ${error.message}`);
        }
    },
    
    // 更新服务状态
    updateServiceStatus: function(service, isConnected, message) {
        const prevConnected = this.status[service].connected;
        this.status[service].connected = isConnected;
        
        if (isConnected) {
            this.status[service].retries = 0;
            this.log(`✅ ${message}`);
        } else {
            this.status[service].retries++;
            this.log(`❌ ${message}`);
            
            // 如果超过最大重试次数，尝试重新初始化
            if (this.status[service].retries >= this.config.maxRetries) {
                this.log(`⚠️ ${service.toUpperCase()} 重连失败次数过多，稍后重试...`);
                this.status[service].retries = 0;
                setTimeout(() => this.reconnectService(service), this.config.reconnectDelay);
            }
        }
        
        // 如果状态发生变化，触发事件
        if (prevConnected !== isConnected) {
            this.triggerStatusChange();
        }
    },
    
    // 重新连接服务
    reconnectService: function(service) {
        this.log(`🔄 尝试重新连接 ${service.toUpperCase()}...`);
        switch(service) {
            case 'worker':
                this.checkWorkerStatus();
                break;
            case 'agent':
                this.checkAgentStatus();
                break;
            case 'ai':
                this.checkAIStatus();
                break;
        }
    },
    
    // 触发状态变化事件
    triggerStatusChange: function() {
        // 计算整体状态
        const workerUp = this.status.worker.connected;
        const agentUp = this.status.agent.connected;
        const aiUp = this.status.ai.connected;
        
        if (workerUp && agentUp && aiUp) {
            this.status.overall = 'online';
        } else if (!workerUp && !agentUp && !aiUp) {
            this.status.overall = 'offline';
        } else {
            this.status.overall = 'partial';
        }
        
        // 更新 UI 状态指示
        this.updateUIStatusIndicators();
        
        // 通知所有监听器
        this.listeners.statusChange.forEach(callback => callback(this.status));
    },
    
    // 更新 UI 状态指示
    updateUIStatusIndicators: function() {
        // 更新 Worker 状态
        this.updateServiceIndicator('worker');
        
        // 更新 Agent 状态
        this.updateServiceIndicator('agent');
        
        // 更新 AI 状态
        this.updateServiceIndicator('ai');
        
        // 更新全局系统状态
        this.updateSystemStatus();
    },
    
    // 更新单个服务的 UI 指示
    updateServiceIndicator: function(service) {
        const indicator = document.getElementById(`${service}-indicator`);
        const statusText = document.getElementById(`${service}-status-text`);
        const statusCard = document.getElementById(`${service}-status-card`);
        
        if (!indicator || !statusText || !statusCard) return;
        
        const isConnected = this.status[service].connected;
        
        // 移除所有状态类
        indicator.className = 'w-3 h-3 rounded-full';
        statusCard.className = 'bg-dark rounded-lg p-4 border shadow';
        
        if (isConnected) {
            // 在线状态
            indicator.classList.add('bg-success');
            statusCard.classList.add('border-success/30');
        } else {
            // 离线状态
            indicator.classList.add('bg-danger');
            statusCard.classList.add('border-danger/30');
        }
    },
    
    // 更新系统整体状态
    updateSystemStatus: function() {
        const statusText = document.getElementById('system-status-text');
        const heartbeatIndicator = document.getElementById('heartbeat-indicator');
        
        if (!statusText || !heartbeatIndicator) return;
        
        // 移除所有状态类
        statusText.className = 'text-sm font-medium';
        heartbeatIndicator.className = 'inline-block w-2 h-2 rounded-full';
        
        switch(this.status.overall) {
            case 'online':
                statusText.textContent = '系统正常';
                statusText.classList.add('text-success');
                heartbeatIndicator.classList.add('bg-success', 'animate-pulse');
                break;
            case 'partial':
                statusText.textContent = '部分服务异常';
                statusText.classList.add('text-warning');
                heartbeatIndicator.classList.add('bg-warning', 'animate-pulse');
                break;
            case 'offline':
                statusText.textContent = '系统离线';
                statusText.classList.add('text-danger');
                heartbeatIndicator.classList.add('bg-danger', 'animate-blink');
                break;
            default:
                statusText.textContent = '初始化中...';
                statusText.classList.add('text-warning');
                heartbeatIndicator.classList.add('bg-warning', 'animate-pulse');
        }
    },
    
    // 启动心跳指示器
    startHeartbeatIndicator: function() {
        this.timers.heartbeat = setInterval(() => {
            if (this.status.overall === 'online') {
                this.log('🩺 心跳保持中...');
            }
        }, 30000); // 每30秒记录一次心跳
    },
    
    // 更新当前时间显示
    updateCurrentTime: function() {
        const timeElement = document.getElementById('current-time');
        if (!timeElement) return;
        
        const now = new Date();
        timeElement.textContent = now.toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    },
    
    // 发送请求到 Worker
    sendToWorker: async function(endpoint, data = {}) {
        try {
            if (!this.status.worker.connected) {
                throw new Error('Worker 未连接');
            }
            
            const url = `http://localhost:8787${endpoint}`;
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });
            
            if (!response.ok) {
                throw new Error(`Worker 响应错误: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            this.log(`❌ Worker 请求失败: ${error.message}`);
            throw error;
        }
    },
    
    // 发送请求到 AI 服务
    sendToAI: async function(endpoint, data = {}) {
        try {
            if (!this.status.ai.connected) {
                throw new Error('AI 服务未连接');
            }
            
            const url = `http://localhost:1822${endpoint}`;
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });
            
            if (!response.ok) {
                throw new Error(`AI 服务响应错误: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            this.log(`❌ AI 服务请求失败: ${error.message}`);
            throw error;
        }
    },
    
    // 注册状态变化监听器
    onStatusChange: function(callback) {
        if (typeof callback === 'function') {
            this.listeners.statusChange.push(callback);
        }
    },
    
    // 注册日志监听器
    onLog: function(callback) {
        if (typeof callback === 'function') {
            this.listeners.log.push(callback);
        }
    },
    
    // 记录日志
    log: function(message) {
        const timestamp = new Date().toLocaleTimeString('zh-CN');
        const logEntry = `[${timestamp}] [JEV] ${message}`;
        
        // 输出到控制台
        console.log(logEntry);
        
        // 通知所有日志监听器
        this.listeners.log.forEach(callback => callback(logEntry));
        
        // 更新日志 UI
        this.updateLogUI(logEntry);
    },
    
    // 更新日志 UI
    updateLogUI: function(logEntry) {
        const logConsole = document.getElementById('log-console');
        if (!logConsole) return;
        
        // 创建日志条目元素
        const logElement = document.createElement('div');
        
        // 根据日志内容设置样式
        if (logEntry.includes('✅')) {
            logElement.className = 'text-success';
        } else if (logEntry.includes('❌')) {
            logElement.className = 'text-danger';
        } else if (logEntry.includes('⚠️')) {
            logElement.className = 'text-warning';
        } else if (logEntry.includes('🔄')) {
            logElement.className = 'text-secondary';
        } else if (logEntry.includes('🩺')) {
            logElement.className = 'text-primary';
        } else {
            logElement.className = 'text-gray-300';
        }
        
        logElement.textContent = logEntry;
        logConsole.appendChild(logElement);
        
        // 自动滚动到底部
        logConsole.scrollTop = logConsole.scrollHeight;
    },
    
    // 清空日志
    clearLog: function() {
        const logConsole = document.getElementById('log-console');
        if (logConsole) {
            logConsole.innerHTML = '';
            this.log('日志已清空');
        }
    },
    
    // 刷新所有服务
    refreshAll: function() {
        this.log('🔄 刷新所有服务连接...');
        this.checkWorkerStatus();
        this.checkAgentStatus();
        this.checkAIStatus();
    },
    
    // 清理资源
    cleanup: function() {
        // 清除所有定时器
        Object.values(this.timers).forEach(timer => {
            if (timer) clearInterval(timer);
        });
        
        // 清空监听器
        this.listeners.statusChange = [];
        this.listeners.log = [];
    }
};

// 当 DOM 加载完成后初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => JEV_SYNC.init());
} else {
    JEV_SYNC.init();
}

// 页面卸载时清理资源
window.addEventListener('beforeunload', () => JEV_SYNC.cleanup());


// JEV Sync class
class JEVSync {
    constructor() {
        this.isConnected = false;
        this.lastHeartbeat = null;
        this.reconnectInterval = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 3000; // 3 seconds
    }
    
    // Initialize sync
    init() {
        console.log('JEVSync: 初始化同步模块');
        this.startReconnection();
    }
    
    // Start reconnection attempts
    startReconnection() {
        this.reconnectInterval = setInterval(() => {
            this.attemptConnection();
        }, this.reconnectDelay);
    }
    
    // Attempt to connect to agent
    async attemptConnection() {
        try {
            const response = await fetch('http://localhost:1820/ping');
            const data = await response.json();
            
            if (data.agent_ok) {
                this.onConnectionSuccess();
            } else {
                this.onConnectionFailed('Agent returned not OK status');
            }
        } catch (error) {
            this.onConnectionFailed(error.message);
        }
    }
    
    // Handle successful connection
    onConnectionSuccess() {
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.lastHeartbeat = new Date();
        
        console.log('JEVSync: 成功连接到Agent');
        
        // Clear reconnection interval
        if (this.reconnectInterval) {
            clearInterval(this.reconnectInterval);
            this.reconnectInterval = null;
        }
        
        // Notify panel
        if (window.JEVPanel) {
            window.JEVPanel.log('JEVSync: 同步服务已连接');
        }
        
        // Start heartbeat
        this.startHeartbeat();
    }
    
    // Handle connection failure
    onConnectionFailed(error) {
        this.reconnectAttempts++;
        
        console.log(`JEVSync: 连接失败 (尝试 ${this.reconnectAttempts}/${this.maxReconnectAttempts}):`, error);
        
        // Notify panel
        if (window.JEVPanel) {
            window.JEVPanel.log(`JEVSync: 连接失败，${this.reconnectDelay/1000}秒后重试`);
        }
        
        // Stop reconnection after max attempts
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.log('JEVSync: 达到最大重连次数，停止尝试');
            if (this.reconnectInterval) {
                clearInterval(this.reconnectInterval);
                this.reconnectInterval = null;
            }
        }
    }
    
    // Start heartbeat
    startHeartbeat() {
        setInterval(() => {
            this.sendHeartbeat();
        }, 5000); // Every 5 seconds
    }
    
    // Send heartbeat
    async sendHeartbeat() {
        try {
            const response = await fetch('http://localhost:1820/status');
            const data = await response.json();
            
            if (data.status === 'online') {
                this.lastHeartbeat = new Date();
                this.isConnected = true;
                
                // Update panel with latest status
                if (window.JEVPanel) {
                    // Update status values based on received data
                    if (data.worker && data.worker.connected) {
                        updateStatus('workerStatusValue', 'Connected', 'connected');
                    }
                    
                    // Update uptime if available
                    if (data.agent && data.agent.uptime !== undefined) {
                        // Could update uptime display if needed
                    }
                }
            }
        } catch (error) {
            console.log('JEVSync: 心跳失败，尝试重新连接:', error.message);
            this.isConnected = false;
            
            // Notify panel
            if (window.JEVPanel) {
                window.JEVPanel.log('JEVSync: 连接已断开，正在重新连接...');
            }
            
            // Restart reconnection
            if (!this.reconnectInterval) {
                this.startReconnection();
            }
        }
    }
    
    // Get current status
    getStatus() {
        return {
            isConnected: this.isConnected,
            lastHeartbeat: this.lastHeartbeat,
            reconnectAttempts: this.reconnectAttempts
        };
    }
    
    // Disconnect
    disconnect() {
        this.isConnected = false;
        
        if (this.reconnectInterval) {
            clearInterval(this.reconnectInterval);
            this.reconnectInterval = null;
        }
        
        console.log('JEVSync: 已断开连接');
    }
}

// Global function to update status (to match jev_panel.js)
function updateStatus(elementId, value, statusClass) {
    const valueElement = document.getElementById(elementId);
    if (valueElement) {
        const cardElement = valueElement.closest('.status-card');
        
        // Clear all status classes
        valueElement.className = 'status-value';
        cardElement.className = 'status-card';
        
        // Add new status class
        valueElement.classList.add(statusClass);
        cardElement.classList.add(statusClass);
        
        // Update value
        valueElement.textContent = value;
    }
}

// Initialize JEVSync when page loads
window.addEventListener('DOMContentLoaded', () => {
    // Create global JEVSync instance
    window.JEVSync = new JEVSync();
    
    // Initialize sync
    setTimeout(() => {
        window.JEVSync.init();
    }, 1500); // Slight delay to ensure panel is ready
});