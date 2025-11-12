/**
 * JEV-PluginSync-v1.0 - 本地中继桥接器
 * 实现JEV插件与本地中继的安全通信桥接
 */

class JEVPluginRelayBridge {
    constructor(options = {}) {
        // 默认配置
        this.config = {
            localRelayUrl: 'https://jevshop.bensonlove1986.workers.dev',
            relayEndpoint: '',
            workerSyncEndpoint: '/sync',
            agentToken: 'jev-secure-key-001',
            requestTimeout: 3000,
            maxRetryAttempts: 3,
            reconnectInterval: 5000,
            ...options
        };

        // 状态管理
        this.state = {
            relayStatus: 'disconnected', // disconnected, connecting, connected, error
            lastConnectionAttempt: null,
            connectionError: null,
            messageQueue: [],
            isProcessingQueue: false,
            isInitialized: false
        };

        // 事件监听器管理
        this.eventListeners = {
            statusChange: [],
            messageRelayed: [],
            error: []
        };

        // 绑定方法
        this.connectToRelay = this.connectToRelay.bind(this);
        this.checkRelayStatus = this.checkRelayStatus.bind(this);
        this.relayMessage = this.relayMessage.bind(this);
        this.processMessageQueue = this.processMessageQueue.bind(this);
        this.startReconnect = this.startReconnect.bind(this);
        this.stopReconnect = this.stopReconnect.bind(this);
        this.on = this.on.bind(this);
        this.emit = this.emit.bind(this);
        this.getStatus = this.getStatus.bind(this);

        // 初始化
        this.initialize();
    }

    // 初始化桥接器
    initialize() {
        try {
            console.log('[JEV-Plugin-Relay] 初始化本地中继桥接器');
            
            // 设置连接头验证
            this.setupRequestInterceptors();
            
            // 开始状态检查
            this.startStatusCheck();
            
            this.state.isInitialized = true;
            this.emit('statusChange', this.getStatus());
            
        } catch (error) {
            console.error('[JEV-Plugin-Relay] 初始化失败:', error);
            this.state.connectionError = error.message;
            this.state.relayStatus = 'error';
            this.emit('error', error);
            this.emit('statusChange', this.getStatus());
        }
    }

    // 设置请求拦截器，添加安全头
    setupRequestInterceptors() {
        // 设置必要的安全头信息
        this.requestHeaders = {
            'X-Agent-Token': this.config.agentToken,
            'X-System-Layer': 'plugin',
            'Content-Type': 'application/json'
        };
        console.log('[JEV-Plugin-Relay] 请求拦截器设置完成');
    }

    // 开始定期状态检查
    startStatusCheck() {
        this.statusCheckInterval = setInterval(() => {
            this.checkRelayStatus();
        }, 30000); // 每30秒检查一次状态
    }

    // 停止状态检查
    stopStatusCheck() {
        if (this.statusCheckInterval) {
            clearInterval(this.statusCheckInterval);
            this.statusCheckInterval = null;
        }
    }

    // 开始重连机制
    startReconnect() {
        if (this.reconnectInterval) return;
        
        this.reconnectInterval = setInterval(() => {
            if (this.state.relayStatus === 'disconnected' || this.state.relayStatus === 'error') {
                this.connectToRelay();
            }
        }, this.config.reconnectInterval);
    }

    // 停止重连机制
    stopReconnect() {
        if (this.reconnectInterval) {
            clearInterval(this.reconnectInterval);
            this.reconnectInterval = null;
        }
    }

    // 检查本地中继状态
    async checkRelayStatus() {
        try {
            this.state.lastConnectionAttempt = new Date();
            
            // 构建检查URL，使用ping端点
            const statusUrl = `${this.config.localRelayUrl}/ping`;
            
            console.log(`[JEV-Plugin-Relay] 检查中继状态: ${statusUrl}`);
            
            // 发送状态检查请求
            const response = await fetch(statusUrl, {
                method: 'GET',
                headers: {
                    ...this.requestHeaders
                },
                timeout: 2000
            });
            
            if (response.ok) {
                // 更新状态为已连接
                this.updateRelayStatus('connected');
                return true;
            } else {
                // 更新状态为错误
                this.updateRelayStatus('error', `HTTP error! status: ${response.status}`);
                return false;
            }
            
        } catch (error) {
            console.error('[JEV-Plugin-Relay] 状态检查失败:', error.message);
            this.updateRelayStatus('error', error.message);
            return false;
        }
    }

    // 连接到本地中继
    async connectToRelay() {
        if (this.state.relayStatus === 'connecting') {
            console.log('[JEV-Plugin-Relay] 连接中，等待完成...');
            return false;
        }

        this.updateRelayStatus('connecting');
        this.state.lastConnectionAttempt = Date.now();

        try {
            const connected = await this.checkRelayStatus();
            
            if (connected) {
                console.log('[JEV-Plugin-Relay] 成功连接到本地中继');
                
                // 如果有队列中的消息，开始处理
                if (this.state.messageQueue.length > 0) {
                    this.processMessageQueue();
                }
                
                // 停止重连（状态检查会继续）
                this.stopReconnect();
                
                return true;
            } else {
                console.log('[JEV-Plugin-Relay] 连接失败，开始重连机制');
                this.startReconnect();
                return false;
            }
            
        } catch (error) {
            console.error('[JEV-Plugin-Relay] 连接错误:', error);
            this.updateRelayStatus('error', error.message);
            this.startReconnect();
            return false;
        }
    }

    // 更新中继状态
    updateRelayStatus(status, error = null) {
        const oldStatus = this.state.relayStatus;
        this.state.relayStatus = status;
        
        if (error) {
            this.state.connectionError = error;
        }
        
        // 只有状态变化时才触发事件
        if (oldStatus !== status) {
            console.log(`[JEV-Plugin-Relay] 状态变更: ${oldStatus} -> ${status}`);
            this.emit('statusChange', this.getStatus());
        }
    }

    // 向中继发送请求的通用方法
    async makeRelayRequest(method, endpoint, data = null) {
        const url = `${this.config.localRelayUrl}${endpoint}`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.config.requestTimeout);

        const headers = {
            ...this.requestHeaders,
            'Content-Type': 'application/json',
            'X-JEV-Plugin-Id': this.generatePluginId(),
            'X-JEV-Plugin-Version': 'v1.0'
        };

        const options = {
            method,
            headers,
            signal: controller.signal
        };

        if (data) {
            options.body = JSON.stringify(data);
        }

        try {
            const response = await fetch(url, options);
            clearTimeout(timeoutId);
            return response;
        } catch (error) {
            clearTimeout(timeoutId);
            throw error;
        }
    }

    // 中继消息到本地中继
    async relayMessage(message, options = {}) {
        // 验证消息格式
        if (!this.validateMessageFormat(message)) {
            throw new Error('无效的消息格式');
        }

        // 如果中继未连接，添加到队列
        if (this.state.relayStatus !== 'connected') {
            console.log('[JEV-Plugin-Relay] 中继未连接，消息已加入队列');
            
            const queueItem = {
                message,
                options,
                timestamp: Date.now(),
                attempts: 0
            };
            
            this.state.messageQueue.push(queueItem);
            
            // 尝试连接
            this.connectToRelay();
            
            return { status: 'queued', queuePosition: this.state.messageQueue.length };
        }

        // 直接发送消息
        return this._sendRelayMessage(message, options);
    }

    // 实际发送消息的内部方法
    async _sendRelayMessage(message, options = {}) {
        const { retryCount = 0 } = options;
        
        try {
            // 添加中继所需的额外字段
            const relayMessage = {
                ...message,
                relay_timestamp: Date.now(),
                relay_source: 'plugin',
                relay_id: this.generateRelayId()
            };

            const response = await this.makeRelayRequest('POST', this.config.relayEndpoint, relayMessage);
            
            if (response.ok) {
                const data = await response.json();
                
                console.log('[JEV-Plugin-Relay] 消息中继成功:', data);
                this.emit('messageRelayed', { message, response: data });
                
                return {
                    status: 'relayed',
                    response: data,
                    relay_id: relayMessage.relay_id
                };
            } else {
                throw new Error(`中继请求失败: HTTP ${response.status}`);
            }
            
        } catch (error) {
            console.error(`[JEV-Plugin-Relay] 消息中继失败 (${retryCount}/${this.config.maxRetryAttempts}):`, error);
            
            // 重试逻辑
            if (retryCount < this.config.maxRetryAttempts) {
                console.log(`[JEV-Plugin-Relay] 尝试重试消息中继 (${retryCount + 1}/${this.config.maxRetryAttempts})`);
                
                // 等待一段时间后重试
                await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
                
                return this._sendRelayMessage(message, { ...options, retryCount: retryCount + 1 });
            }
            
            // 重试失败，添加到队列
            console.log('[JEV-Plugin-Relay] 消息中继重试失败，添加到队列');
            
            const queueItem = {
                message,
                options,
                timestamp: Date.now(),
                attempts: retryCount + 1
            };
            
            this.state.messageQueue.push(queueItem);
            
            // 更新状态为错误并开始重连
            this.updateRelayStatus('error', error.message);
            this.startReconnect();
            
            this.emit('error', error);
            
            return { 
                status: 'failed', 
                error: error.message,
                queued: true,
                queuePosition: this.state.messageQueue.length
            };
        }
    }

    // 处理消息队列
    async processMessageQueue() {
        if (this.state.isProcessingQueue || this.state.messageQueue.length === 0 || this.state.relayStatus !== 'connected') {
            return;
        }

        this.state.isProcessingQueue = true;
        console.log(`[JEV-Plugin-Relay] 开始处理消息队列 (${this.state.messageQueue.length} 条消息)`);

        // 复制队列，避免处理过程中修改
        const queueCopy = [...this.state.messageQueue];
        this.state.messageQueue = [];

        let processedCount = 0;
        let successCount = 0;

        for (const item of queueCopy) {
            // 检查是否仍然连接
            if (this.state.relayStatus !== 'connected') {
                console.log('[JEV-Plugin-Relay] 连接中断，停止队列处理');
                // 将剩余消息放回队列
                const remainingItems = queueCopy.slice(processedCount);
                this.state.messageQueue = [...remainingItems, ...this.state.messageQueue];
                break;
            }

            try {
                // 发送消息，不增加重试次数
                const result = await this._sendRelayMessage(item.message, item.options);
                
                if (result.status === 'relayed') {
                    successCount++;
                } else {
                    // 如果仍然失败，重新加入队列
                    this.state.messageQueue.push(item);
                }
                
            } catch (error) {
                console.error(`[JEV-Plugin-Relay] 队列消息处理失败:`, error);
                this.state.messageQueue.push(item);
            } finally {
                processedCount++;
                
                // 短暂延迟，避免过度请求
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }

        console.log(`[JEV-Plugin-Relay] 队列处理完成 - 处理: ${processedCount}, 成功: ${successCount}, 剩余: ${this.state.messageQueue.length}`);
        this.state.isProcessingQueue = false;
    }

    // 验证消息格式
    validateMessageFormat(message) {
        if (!message || typeof message !== 'object') {
            return false;
        }

        // 检查必需字段
        const requiredFields = ['device', 'key', 'timestamp', 'origin'];
        for (const field of requiredFields) {
            if (!(field in message)) {
                console.error(`[JEV-Plugin-Relay] 消息缺少必需字段: ${field}`);
                return false;
            }
        }

        return true;
    }

    // 生成唯一的插件ID
    generatePluginId() {
        // 使用浏览器/环境信息生成唯一ID
        const fingerprint = [
            navigator.userAgent.substring(0, 32),
            window.screen.width,
            window.screen.height,
            new Date().getTimezoneOffset()
        ].join('-');
        
        // 简单的哈希函数
        let hash = 0;
        for (let i = 0; i < fingerprint.length; i++) {
            const char = fingerprint.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        
        return `plugin_${Math.abs(hash)}`;
    }

    // 生成中继ID
    generateRelayId() {
        return `relay_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    }

    // 获取当前状态
    getStatus() {
        return {
            relayStatus: this.state.relayStatus,
            lastConnectionAttempt: this.state.lastConnectionAttempt,
            connectionError: this.state.connectionError,
            queueLength: this.state.messageQueue.length,
            isProcessingQueue: this.state.isProcessingQueue,
            isInitialized: this.state.isInitialized,
            relayUrl: this.config.localRelayUrl
        };
    }

    // 事件监听
    on(event, callback) {
        if (this.eventListeners[event]) {
            this.eventListeners[event].push(callback);
        }
    }

    // 触发事件
    emit(event, data) {
        if (this.eventListeners[event]) {
            this.eventListeners[event].forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`[JEV-Plugin-Relay] 事件监听器错误 (${event}):`, error);
                }
            });
        }
    }

    // 清理资源
    destroy() {
        this.stopStatusCheck();
        this.stopReconnect();
        this.eventListeners = {};
        this.state.messageQueue = [];
        console.log('[JEV-Plugin-Relay] 桥接器已销毁，资源已清理');
    }
}

// 初始化桥接器并与插件同步组件集成
function initializeRelayBridge() {
    // 检查是否在浏览器环境
    if (typeof window !== 'undefined') {
        // 创建桥接器实例
        const relayBridge = new JEVPluginRelayBridge();
        
        // 暴露到全局
        window.jevRelayBridge = relayBridge;
        
        console.log('[JEV-Plugin-Relay] 本地中继桥接器已初始化并暴露到全局');
        
        // 监听状态变化
        relayBridge.on('statusChange', (status) => {
            console.log('[JEV-Plugin-Relay] 状态更新:', status);
            
            // 如果插件同步组件已加载，通知状态更新
            if (window.JEVPluginSync && window.jevPluginInstance) {
                window.jevPluginInstance.updateStatusDisplay();
            }
        });
        
        // 监听消息中继成功
        relayBridge.on('messageRelayed', (data) => {
            console.log('[JEV-Plugin-Relay] 消息中继成功:', data);
        });
        
        // 监听错误
        relayBridge.on('error', (error) => {
            console.error('[JEV-Plugin-Relay] 桥接器错误:', error);
        });
        
        // 尝试连接
        relayBridge.connectToRelay();
        
        return relayBridge;
    }
    
    return null;
}

// 如果在浏览器环境中自动初始化
if (typeof window !== 'undefined') {
    // 等待DOM加载完成
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeRelayBridge);
    } else {
        // 立即初始化
        initializeRelayBridge();
    }
}

// 导出模块（如果支持）
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = {
        JEVPluginRelayBridge,
        initializeRelayBridge
    };
}

/**
 * 与插件同步组件集成的辅助函数
 */
function integrateWithPluginSync() {
    // 这个函数会在插件同步组件加载后调用
    // 用于将桥接器与插件同步组件连接起来
    
    if (window.JEVPluginSync && window.jevPluginInstance && window.jevRelayBridge) {
        console.log('[JEV-Plugin-Relay] 正在与插件同步组件集成...');
        
        // 修改插件同步组件的sendSyncRequest方法，使其通过桥接器发送
        const originalSendSyncRequest = window.jevPluginInstance.sendSyncRequest;
        
        window.jevPluginInstance.sendSyncRequest = async function(message) {
            try {
                // 检查桥接器状态
                const bridgeStatus = window.jevRelayBridge.getStatus();
                
                if (bridgeStatus.relayStatus === 'connected') {
                    // 通过桥接器发送消息
                    const result = await window.jevRelayBridge.relayMessage(message);
                    
                    if (result.status === 'relayed') {
                        return {
                            status: 200,
                            data: result.response
                        };
                    } else if (result.status === 'queued') {
                        return {
                            status: 202,
                            data: {
                                message: '消息已加入中继队列',
                                queuePosition: result.queuePosition,
                                relay_status: bridgeStatus.relayStatus
                            }
                        };
                    }
                }
                
                // 如果桥接器未连接或失败，回退到直接发送
                console.log('[JEV-Plugin-Relay] 桥接器不可用，回退到直接请求');
                return await originalSendSyncRequest.call(this, message);
                
            } catch (error) {
                console.error('[JEV-Plugin-Relay] 中继集成错误:', error);
                // 回退到原始方法
                return await originalSendSyncRequest.call(this, message);
            }
        };
        
        console.log('[JEV-Plugin-Relay] 与插件同步组件集成成功');
        return true;
    }
    
    return false;
}

// 监听插件同步组件加载
if (typeof window !== 'undefined') {
    // 检查是否已加载
    if (window.JEVPluginSync && window.jevPluginInstance) {
        integrateWithPluginSync();
    } else {
        // 使用MutationObserver监听窗口对象变化
        const observer = new MutationObserver(() => {
            if (window.JEVPluginSync && window.jevPluginInstance) {
                observer.disconnect();
                integrateWithPluginSync();
            }
        });
        
        observer.observe(window, { childList: true });
        
        // 3秒后自动断开观察器
        setTimeout(() => {
            observer.disconnect();
        }, 3000);
    }
}

// 暴露集成函数
if (typeof window !== 'undefined') {
    window.integrateRelayWithPluginSync = integrateWithPluginSync;
}