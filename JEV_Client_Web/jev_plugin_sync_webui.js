/**
 * JEV-PluginSync-v1.0 - Web UI 版本
 * 实现JEV插件层与三层通信闭环的对接
 */

class JEVPluginSync {
    constructor(options = {}) {
        // 默认配置
        this.config = {
            workerUrl: 'https://jevshop.bensonlove1986.workers.dev',
            syncEndpoint: '/sync',
            agentToken: 'jev_cloud_api_key_123456',
            requestTimeout: 5000,
            maxRetryAttempts: 3,
            testMessageCount: 5,
            acceptableLatency: 100, // ms
            ...options
        };

        // 验证日志对象
        this.alignmentLog = {
            timestamp: Date.now(),
            test_id: `test_${Date.now()}`,
            worker_status: 'unknown',
            state_layer_status: 'unknown',
            plugin_status: 'unknown',
            latency_measurements: [],
            average_latency: 0,
            field_differences: 0,
            alignment_result: 'pending',
            drift_range: 'unknown',
            request_count: 0,
            success_count: 0,
            failed_count: 0,
            errors: []
        };

        // 初始化双模式管理器
        this.modeManager = new PluginModeManager(this);

        // 绑定方法
        this.runAlignmentTest = this.runAlignmentTest.bind(this);
        this.sendMessage = this.sendMessage.bind(this);
        this.getAlignmentLog = this.getAlignmentLog.bind(this);
        this.getModeStatus = this.getModeStatus.bind(this);
        this.createNotification = this.createNotification.bind(this);

        console.log('[JEV-PluginSync] Web UI版本初始化完成');
        console.log('[JEV-PluginSync] 双模式支持已启用，当前模式:', this.modeManager.getModeStatus().mode);
    }

    // 创建标准测试消息
    createTestMessage() {
        return {
            device: 'plugin-ui',
            key: 'page_event',
            value: {
                event_type: 'alignment_test',
                test_id: this.alignmentLog.test_id,
                random_data: Math.random().toString(36).substring(7),
                url: window.location.href,
                title: document.title
            },
            timestamp: Date.now(),
            origin: 'plugin'
        };
    }

    // 发送同步请求到Worker
    sendSyncRequest(message) {
        return new Promise((resolve, reject) => {
            const postData = JSON.stringify(message);
            const url = `${this.config.workerUrl}${this.config.syncEndpoint}`;
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.config.requestTimeout);

            fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Agent-Token': this.config.agentToken
                },
                body: postData,
                signal: controller.signal
            })
            .then(response => {
                clearTimeout(timeoutId);
                
                if (response.ok) {
                    return response.json();
                } else {
                    reject(new Error(`请求失败，状态码: ${response.status}`));
                }
            })
            .then(data => {
                resolve({
                    status: 200,
                    data: data
                });
            })
            .catch(error => {
                clearTimeout(timeoutId);
                
                if (error.name === 'AbortError') {
                    reject(new Error(`请求超时，超过${this.config.requestTimeout}ms`));
                } else {
                    reject(new Error(`请求错误: ${error.message}`));
                }
            });
        });
    }

    // 验证返回的数据结构
    validateResponseStructure(response) {
        const requiredFields = ['device', 'key', 'value', 'timestamp', 'origin'];
        let differences = 0;

        requiredFields.forEach(field => {
            if (!(field in response)) {
                differences++;
                console.error(`[JEV-PluginSync] 缺少必填字段: ${field}`);
            }
        });

        return {
            valid: differences === 0,
            differences: differences
        };
    }

    // 运行单次对齐测试
    async runSingleTest(attempt) {
        const startTime = Date.now();
        const testMessage = this.createTestMessage();

        try {
            const response = await this.sendSyncRequest(testMessage);
            const endTime = Date.now();
            const latency = endTime - startTime;

            this.alignmentLog.request_count++;
            this.alignmentLog.latency_measurements.push(latency);

            // 验证响应结构
            const validation = this.validateResponseStructure(response.data);
            this.alignmentLog.field_differences += validation.differences;

            // 更新状态
            this.alignmentLog.worker_status = 'online';
            this.alignmentLog.state_layer_status = response.data?.state_layer_status || 'online';
            this.alignmentLog.plugin_status = 'online';
            this.alignmentLog.success_count++;

            console.log(`✓ [JEV-PluginSync] 测试成功 (尝试 ${attempt}) - 延迟: ${latency}ms, 字段差异: ${validation.differences}`);
            return { success: true, latency, differences: validation.differences };
        } catch (error) {
            this.alignmentLog.request_count++;
            this.alignmentLog.failed_count++;
            this.alignmentLog.errors.push(`尝试 ${attempt}: ${error.message}`);

            console.error(`✗ [JEV-PluginSync] 测试失败 (尝试 ${attempt}): ${error.message}`);
            return { success: false, error: error.message };
        }
    }

    // 计算测试结果
    calculateResults() {
        // 计算平均延迟
        if (this.alignmentLog.latency_measurements.length > 0) {
            this.alignmentLog.average_latency = Math.round(
                this.alignmentLog.latency_measurements.reduce((a, b) => a + b, 0) /
                this.alignmentLog.latency_measurements.length
            );
        }

        // 计算漂移范围
        if (this.alignmentLog.latency_measurements.length > 0) {
            const min = Math.min(...this.alignmentLog.latency_measurements);
            const max = Math.max(...this.alignmentLog.latency_measurements);
            this.alignmentLog.drift_range = `${min}-${max}ms`;
        }

        // 判定对齐结果
        const allSystemsOnline = (
            this.alignmentLog.worker_status === 'online' &&
            this.alignmentLog.state_layer_status === 'online' &&
            this.alignmentLog.plugin_status === 'online'
        );

        const latencyAcceptable = this.alignmentLog.average_latency < this.config.acceptableLatency;
        const noFieldDifferences = this.alignmentLog.field_differences === 0;
        const enoughSuccesses = this.alignmentLog.success_count >= Math.ceil(this.config.testMessageCount / 2);

        if (allSystemsOnline && latencyAcceptable && noFieldDifferences && enoughSuccesses) {
            this.alignmentLog.alignment_result = 'Aligned';
        } else {
            this.alignmentLog.alignment_result = 'Drift';
        }
    }

    // 生成并下载报告
    generateAndDownloadReport() {
        this.calculateResults();

        // 生成JSON日志
        const logBlob = new Blob([JSON.stringify(this.alignmentLog, null, 2)], { type: 'application/json' });
        this.downloadFile(logBlob, `plugin_alignment_log_${Date.now()}.json`);

        // 生成文本报告
        const reportText = `
JEV 插件通信对齐报告
=====================
测试ID: ${this.alignmentLog.test_id}
测试时间: ${new Date(this.alignmentLog.timestamp).toLocaleString()}

状态概览:
--------
Worker 状态: ${this.alignmentLog.worker_status.toUpperCase()}
状态层状态: ${this.alignmentLog.state_layer_status.toUpperCase()}
插件状态: ${this.alignmentLog.plugin_status.toUpperCase()}

性能指标:
--------
平均延迟: ${this.alignmentLog.average_latency}ms
漂移范围: ${this.alignmentLog.drift_range}
请求总数: ${this.alignmentLog.request_count}
成功请求: ${this.alignmentLog.success_count}
失败请求: ${this.alignmentLog.failed_count}

对齐结果:
--------
对齐状态: ${this.alignmentLog.alignment_result}
字段差异: ${this.alignmentLog.field_differences}

错误详情:
--------
${this.alignmentLog.errors.length > 0 ? this.alignmentLog.errors.join('\n') : '无'}

成功判定标准:
--------
- 所有系统在线: ${this.alignmentLog.worker_status === 'online' && this.alignmentLog.state_layer_status === 'online' && this.alignmentLog.plugin_status === 'online' ? '✓' : '✗'}
- 延迟 < ${this.config.acceptableLatency}ms: ${this.alignmentLog.average_latency < this.config.acceptableLatency ? '✓' : '✗'}
- 字段差异 = 0: ${this.alignmentLog.field_differences === 0 ? '✓' : '✗'}
- 成功请求 > 50%: ${this.alignmentLog.success_count / this.alignmentLog.request_count > 0.5 ? '✓' : '✗'}

=====================
报告生成时间: ${new Date().toLocaleString()}
`;

        const reportBlob = new Blob([reportText], { type: 'text/plain' });
        const reportPath = this.downloadFile(reportBlob, `plugin_alignment_report_${Date.now()}.txt`);

        return {
            log: this.alignmentLog,
            report: reportText,
            reportPath: reportPath
        };
    }

    // 下载文件辅助函数
    downloadFile(blob, filename) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        return URL.createObjectURL(blob);
    }

    // 创建UI通知元素
    createNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = 'jev-plugin-notification';
        notification.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 8px;
            color: white;
            font-family: Arial, sans-serif;
            font-size: 14px;
            z-index: 999999;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            transition: all 0.3s ease;
            max-width: 400px;
            word-wrap: break-word;
        `;

        // 根据类型设置样式
        if (type === 'success') {
            notification.style.backgroundColor = '#4CAF50';
        } else if (type === 'error') {
            notification.style.backgroundColor = '#F44336';
        } else if (type === 'warning') {
            notification.style.backgroundColor = '#FF9800';
        } else {
            notification.style.backgroundColor = '#2196F3';
        }

        notification.textContent = message;
        document.body.appendChild(notification);

        // 自动移除通知
        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 5000);

        return notification;
    }

    // 运行完整的对齐测试流程
    async runAlignmentTest() {
        console.log('[JEV-PluginSync] 开始JEV插件通信对齐测试...');
        console.log(`[JEV-PluginSync] 目标Worker: ${this.config.workerUrl}${this.config.syncEndpoint}`);

        // 创建测试前重置日志
        this.alignmentLog = {
            timestamp: Date.now(),
            test_id: `test_${Date.now()}`,
            worker_status: 'unknown',
            state_layer_status: 'unknown',
            plugin_status: 'unknown',
            latency_measurements: [],
            average_latency: 0,
            field_differences: 0,
            alignment_result: 'pending',
            drift_range: 'unknown',
            request_count: 0,
            success_count: 0,
            failed_count: 0,
            errors: []
        };

        this.createNotification('开始JEV插件通信对齐测试...', 'info');

        let consecutiveFailures = 0;

        for (let attempt = 1; attempt <= this.config.testMessageCount; attempt++) {
            const result = await this.runSingleTest(attempt);

            if (!result.success) {
                consecutiveFailures++;

                // 如果连续失败次数达到最大重试限制，停止测试
                if (consecutiveFailures >= this.config.maxRetryAttempts) {
                    console.error(`[JEV-PluginSync] 连续失败${consecutiveFailures}次，达到最大重试限制`);
                    break;
                }

                // 等待一段时间后重试
                console.log('[JEV-PluginSync] 等待1秒后重试...');
                await new Promise(resolve => setTimeout(resolve, 1000));
            } else {
                consecutiveFailures = 0;
            }

            // 测试之间的短暂间隔
            if (attempt < this.config.testMessageCount) {
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }

        // 生成报告
        const reportResult = this.generateAndDownloadReport();

        // 显示结果通知
        if (this.alignmentLog.alignment_result === 'Aligned') {
            this.createNotification(`✅ JEV插件通信对齐成功！平均延迟: ${this.alignmentLog.average_latency}ms`, 'success');
        } else {
            this.createNotification(`⚠️ JEV插件通信对齐失败，请检查配置`, 'error');
        }

        // 输出控制台结果
        console.log('\n========================================');
        console.log('✅ JEV 插件通信对齐任务执行完成');
        console.log(`Worker 状态: ${this.alignmentLog.worker_status}`);
        console.log(`状态层状态: ${this.alignmentLog.state_layer_status}`);
        console.log(`插件状态: ${this.alignmentLog.plugin_status}`);
        console.log(`平均延迟: ${this.alignmentLog.average_latency} ms`);
        console.log(`对齐结果: ${this.alignmentLog.alignment_result}`);
        console.log('========================================');

        // 返回结果供外部使用
        return this.alignmentLog;
    }

    // 发送消息（使用双模式管理器）
    sendMessage(message) {
        return this.modeManager.sendMessage(message);
    }

    // 获取对齐日志
    getAlignmentLog() {
        return this.alignmentLog;
    }

    // 获取模式状态
    getModeStatus() {
        return this.modeManager.getModeStatus();
    }

    // 添加UI控制面板
    addUIControlPanel() {
        // 创建控制面板容器
        const controlPanel = document.createElement('div');
        controlPanel.id = 'jev-plugin-control-panel';
        controlPanel.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background-color: white;
            border-radius: 8px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.15);
            padding: 15px;
            width: 300px;
            z-index: 999999;
            font-family: Arial, sans-serif;
        `;

        // 创建标题
        const title = document.createElement('h3');
        title.textContent = 'JEV-PluginSync';
        title.style.cssText = `
            margin: 0 0 15px 0;
            color: #333;
            font-size: 16px;
            border-bottom: 1px solid #eee;
            padding-bottom: 10px;
        `;
        controlPanel.appendChild(title);

        // 创建状态指示器
        const statusDiv = document.createElement('div');
        statusDiv.style.marginBottom = '15px';
        
        const statusLabel = document.createElement('div');
        statusLabel.textContent = '连接状态:';
        statusLabel.style.fontSize = '12px';
        statusLabel.style.color = '#666';
        
        const statusValue = document.createElement('div');
        statusValue.id = 'jev-connection-status';
        statusValue.textContent = '未知';
        statusValue.style.fontWeight = 'bold';
        statusValue.style.color = '#999';
        statusValue.style.marginTop = '5px';
        
        statusDiv.appendChild(statusLabel);
        statusDiv.appendChild(statusValue);
        controlPanel.appendChild(statusDiv);

        // 创建模式指示器
        const modeDiv = document.createElement('div');
        modeDiv.style.marginBottom = '15px';
        
        const modeLabel = document.createElement('div');
        modeLabel.textContent = '运行模式:';
        modeLabel.style.fontSize = '12px';
        modeLabel.style.color = '#666';
        
        const modeValue = document.createElement('div');
        modeValue.id = 'jev-mode-status';
        modeValue.textContent = this.getModeStatus().mode;
        modeValue.style.fontWeight = 'bold';
        modeValue.style.color = this.getModeStatus().mode === 'online' ? '#4CAF50' : '#FF9800';
        modeValue.style.marginTop = '5px';
        
        modeDiv.appendChild(modeLabel);
        modeDiv.appendChild(modeValue);
        controlPanel.appendChild(modeDiv);

        // 创建测试按钮
        const testButton = document.createElement('button');
        testButton.textContent = '运行对齐测试';
        testButton.style.cssText = `
            width: 100%;
            padding: 10px;
            background-color: #2196F3;
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            font-weight: bold;
            transition: background-color 0.3s ease;
        `;
        
        testButton.addEventListener('mouseenter', () => {
            testButton.style.backgroundColor = '#1976D2';
        });
        
        testButton.addEventListener('mouseleave', () => {
            testButton.style.backgroundColor = '#2196F3';
        });
        
        testButton.addEventListener('click', async () => {
            testButton.disabled = true;
            testButton.textContent = '测试中...';
            
            try {
                await this.runAlignmentTest();
                this.updateStatusDisplay();
            } catch (error) {
                console.error('[JEV-PluginSync] 测试执行失败:', error);
                this.createNotification(`❌ 测试执行失败: ${error.message}`, 'error');
            } finally {
                testButton.disabled = false;
                testButton.textContent = '运行对齐测试';
            }
        });
        
        controlPanel.appendChild(testButton);

        // 添加到页面
        document.body.appendChild(controlPanel);

        // 初始更新状态显示
        this.updateStatusDisplay();
    }

    // 更新状态显示
    updateStatusDisplay() {
        const statusElement = document.getElementById('jev-connection-status');
        const modeElement = document.getElementById('jev-mode-status');
        
        if (statusElement) {
            statusElement.textContent = `${this.alignmentLog.worker_status} / ${this.alignmentLog.state_layer_status}`;
            
            if (this.alignmentLog.worker_status === 'online' && this.alignmentLog.state_layer_status === 'online') {
                statusElement.style.color = '#4CAF50';
            } else {
                statusElement.style.color = '#F44336';
            }
        }
        
        if (modeElement) {
            const modeStatus = this.getModeStatus();
            modeElement.textContent = modeStatus.mode;
            modeElement.style.color = modeStatus.mode === 'online' ? '#4CAF50' : '#FF9800';
        }
    }
}

// 双模式支持类 - 支持在线/离线模式
class PluginModeManager {
    constructor(pluginSync) {
        this.pluginSync = pluginSync;
        this.isOnlineMode = true;
        this.offlineQueue = this.loadQueueFromStorage() || [];
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 10;
        this.reconnectInterval = 5000; // 5秒
        
        // 开始后台重连检查
        this.startBackgroundReconnect();
    }

    // 从localStorage加载队列
    loadQueueFromStorage() {
        try {
            const savedQueue = localStorage.getItem('jev_offline_queue');
            return savedQueue ? JSON.parse(savedQueue) : [];
        } catch (error) {
            console.error('[JEV-PluginSync] 加载离线队列失败:', error);
            return [];
        }
    }

    // 保存队列到localStorage
    saveQueueToStorage() {
        try {
            localStorage.setItem('jev_offline_queue', JSON.stringify(this.offlineQueue));
        } catch (error) {
            console.error('[JEV-PluginSync] 保存离线队列失败:', error);
        }
    }

    // 切换到离线模式
    switchToOfflineMode() {
        if (this.isOnlineMode) {
            this.isOnlineMode = false;
            console.log('🔄 [JEV-PluginSync] 切换到离线模式');
            this.pluginSync.createNotification('🔄 已切换到离线模式，消息将排队发送', 'warning');
        }
    }

    // 尝试切换到在线模式
    async trySwitchToOnlineMode() {
        if (!this.isOnlineMode) {
            try {
                const testMessage = this.pluginSync.createTestMessage();
                const response = await this.pluginSync.sendSyncRequest(testMessage);

                if (response.status === 200) {
                    this.isOnlineMode = true;
                    this.reconnectAttempts = 0;
                    console.log('✅ [JEV-PluginSync] 成功切换到在线模式');
                    this.pluginSync.createNotification('✅ 已恢复在线模式，正在处理离线消息', 'success');
                    await this.processOfflineQueue();
                    return true;
                }

                return false;
            } catch (error) {
                this.reconnectAttempts++;
                console.log(`🔄 [JEV-PluginSync] 重新连接尝试 ${this.reconnectAttempts}/${this.maxReconnectAttempts}: ${error.message}`);
                return false;
            }
        }
        return true;
    }

    // 将消息添加到离线队列
    queueForOffline(message) {
        this.offlineQueue.push({
            message,
            timestamp: Date.now(),
            attempts: 0
        });
        this.saveQueueToStorage();
        console.log(`📥 [JEV-PluginSync] 消息已加入离线队列 (队列大小: ${this.offlineQueue.length})`);
    }

    // 处理离线队列中的消息
    async processOfflineQueue() {
        if (this.offlineQueue.length === 0) return;

        console.log(`📤 [JEV-PluginSync] 开始处理离线队列 (${this.offlineQueue.length} 条消息)`);
        const remainingMessages = [];

        for (const queueItem of this.offlineQueue) {
            try {
                await this.pluginSync.sendSyncRequest(queueItem.message);
                console.log(`📤 [JEV-PluginSync] 离线消息发送成功`);
            } catch (error) {
                queueItem.attempts++;
                if (queueItem.attempts < 3) { // 最多重试3次
                    remainingMessages.push(queueItem);
                    console.log(`📤 [JEV-PluginSync] 离线消息发送失败，将重试 (${queueItem.attempts}/3): ${error.message}`);
                }
            }
        }

        this.offlineQueue = remainingMessages;
        this.saveQueueToStorage();
        console.log(`📤 [JEV-PluginSync] 离线队列处理完成，剩余 ${this.offlineQueue.length} 条消息`);
    }

    // 发送消息，根据当前模式决定处理方式
    async sendMessage(message) {
        if (this.isOnlineMode) {
            try {
                const response = await this.pluginSync.sendSyncRequest(message);
                return response;
            } catch (error) {
                this.switchToOfflineMode();
                this.queueForOffline(message);
                throw error;
            }
        } else {
            this.queueForOffline(message);
            return { status: 202, data: { message: '消息已加入离线队列', mode: 'offline' } };
        }
    }

    // 获取当前模式状态
    getModeStatus() {
        return {
            mode: this.isOnlineMode ? 'online' : 'offline',
            queueSize: this.offlineQueue.length,
            reconnectAttempts: this.reconnectAttempts,
            lastAttempt: Date.now()
        };
    }

    // 开始后台重连检查
    startBackgroundReconnect() {
        setInterval(async () => {
            if (!this.isOnlineMode && this.reconnectAttempts < this.maxReconnectAttempts) {
                await this.trySwitchToOnlineMode();
            }
        }, this.reconnectInterval);
    }
}

// 初始化插件并暴露到全局
if (typeof window !== 'undefined') {
    window.JEVPluginSync = JEVPluginSync;
    
    // 页面加载完成后自动初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            // 自动创建并添加控制面板
            const jevPlugin = new JEVPluginSync();
            jevPlugin.addUIControlPanel();
            
            // 暴露实例到全局
            window.jevPluginInstance = jevPlugin;
        });
    } else {
        // 立即初始化
        const jevPlugin = new JEVPluginSync();
        jevPlugin.addUIControlPanel();
        window.jevPluginInstance = jevPlugin;
    }
}

// 导出模块（如果支持）
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = JEVPluginSync;
}