// ==UserScript==
// @name         JEV-PluginSync-v1.0 - 插件通信对齐
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  实现JEV插件层与三层通信闭环的对接
// @author       JEV System
// @match        *://*
// @grant        GM_xmlhttpRequest
// @grant        GM_log
// @grant        GM_setValue
// @grant        GM_getValue
// @connect      jevshop.bensonlove1986.workers.dev
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    // 配置常量
    const CONFIG = {
        workerUrl: 'https://jevshop.bensonlove1986.workers.dev',
        syncEndpoint: '/sync',
        agentToken: 'jev_cloud_api_key_123456',
        requestTimeout: 5000,
        maxRetryAttempts: 3,
        testMessageCount: 5,
        acceptableLatency: 100 // ms
    };

    // 验证日志对象
    let alignmentLog = {
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

    // 双模式管理器
    class PluginModeManager {
        constructor() {
            this.isOnlineMode = true;
            this.offlineQueue = JSON.parse(GM_getValue('offlineQueue', '[]'));
            this.reconnectAttempts = 0;
            this.maxReconnectAttempts = 10;
            this.reconnectInterval = 5000; // 5秒
        }

        // 切换到离线模式
        switchToOfflineMode() {
            this.isOnlineMode = false;
            console.log('🔄 [JEV-Plugin] 切换到离线模式');
        }

        // 尝试切换到在线模式
        async trySwitchToOnlineMode() {
            try {
                const testMessage = createTestMessage();
                const response = await sendSyncRequest(testMessage);

                if (response.status === 200) {
                    this.isOnlineMode = true;
                    this.reconnectAttempts = 0;
                    console.log('✅ [JEV-Plugin] 成功切换到在线模式');
                    await this.processOfflineQueue();
                    return true;
                }

                return false;
            } catch (error) {
                this.reconnectAttempts++;
                console.log(`🔄 [JEV-Plugin] 重新连接尝试 ${this.reconnectAttempts}/${this.maxReconnectAttempts}: ${error.message}`);
                return false;
            }
        }

        // 将消息添加到离线队列
        queueForOffline(message) {
            this.offlineQueue.push({
                message,
                timestamp: Date.now(),
                attempts: 0
            });
            this.saveQueue();
            console.log(`📥 [JEV-Plugin] 消息已加入离线队列 (队列大小: ${this.offlineQueue.length})`);
        }

        // 保存队列到存储
        saveQueue() {
            GM_setValue('offlineQueue', JSON.stringify(this.offlineQueue));
        }

        // 处理离线队列中的消息
        async processOfflineQueue() {
            if (this.offlineQueue.length === 0) return;

            console.log(`📤 [JEV-Plugin] 开始处理离线队列 (${this.offlineQueue.length} 条消息)`);
            const remainingMessages = [];

            for (const queueItem of this.offlineQueue) {
                try {
                    await sendSyncRequest(queueItem.message);
                    console.log(`📤 [JEV-Plugin] 离线消息发送成功`);
                } catch (error) {
                    queueItem.attempts++;
                    if (queueItem.attempts < 3) { // 最多重试3次
                        remainingMessages.push(queueItem);
                        console.log(`📤 [JEV-Plugin] 离线消息发送失败，将重试 (${queueItem.attempts}/3): ${error.message}`);
                    }
                }
            }

            this.offlineQueue = remainingMessages;
            this.saveQueue();
            console.log(`📤 [JEV-Plugin] 离线队列处理完成，剩余 ${this.offlineQueue.length} 条消息`);
        }

        // 发送消息，根据当前模式决定处理方式
        async sendMessage(message) {
            if (this.isOnlineMode) {
                try {
                    const response = await sendSyncRequest(message);
                    return response;
                } catch (error) {
                    this.switchToOfflineMode();
                    this.queueForOffline(message);
                    throw error;
                }
            } else {
                this.queueForOffline(message);
                // 尝试重新连接
                if (this.reconnectAttempts < this.maxReconnectAttempts) {
                    setTimeout(() => this.trySwitchToOnlineMode(), this.reconnectInterval);
                }
                return { status: 202, responseText: JSON.stringify({ message: '消息已加入离线队列', mode: 'offline' }) };
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
    }

    // 创建标准测试消息
    function createTestMessage() {
        return {
            device: 'plugin-ui',
            key: 'page_event',
            value: {
                event_type: 'alignment_test',
                test_id: alignmentLog.test_id,
                random_data: Math.random().toString(36).substring(7),
                url: window.location.href
            },
            timestamp: Date.now(),
            origin: 'plugin'
        };
    }

    // 发送同步请求到Worker
    function sendSyncRequest(message) {
        return new Promise((resolve, reject) => {
            const postData = JSON.stringify(message);
            const url = `${CONFIG.workerUrl}${CONFIG.syncEndpoint}`;

            GM_xmlhttpRequest({
                method: 'POST',
                url: url,
                headers: {
                    'Content-Type': 'application/json',
                    'X-Agent-Token': CONFIG.agentToken
                },
                data: postData,
                timeout: CONFIG.requestTimeout,
                onload: function(response) {
                    if (response.status === 200) {
                        try {
                            const parsedData = JSON.parse(response.responseText);
                            resolve({
                                status: response.status,
                                responseText: response.responseText,
                                data: parsedData
                            });
                        } catch (error) {
                            reject(new Error(`响应解析失败: ${error.message}`));
                        }
                    } else {
                        reject(new Error(`请求失败，状态码: ${response.status}`));
                    }
                },
                onerror: function(error) {
                    reject(new Error(`请求错误: ${error.message || '网络错误'}`));
                },
                ontimeout: function() {
                    reject(new Error(`请求超时，超过${CONFIG.requestTimeout}ms`));
                }
            });
        });
    }

    // 验证返回的数据结构
    function validateResponseStructure(response) {
        const requiredFields = ['device', 'key', 'value', 'timestamp', 'origin'];
        let differences = 0;

        requiredFields.forEach(field => {
            if (!(field in response)) {
                differences++;
                console.error(`[JEV-Plugin] 缺少必填字段: ${field}`);
            }
        });

        return {
            valid: differences === 0,
            differences: differences
        };
    }

    // 运行单次对齐测试
    async function runAlignmentTest(attempt) {
        const startTime = Date.now();
        const testMessage = createTestMessage();

        try {
            const response = await sendSyncRequest(testMessage);
            const endTime = Date.now();
            const latency = endTime - startTime;

            alignmentLog.request_count++;
            alignmentLog.latency_measurements.push(latency);

            // 验证响应结构
            const validation = validateResponseStructure(response.data);
            alignmentLog.field_differences += validation.differences;

            // 更新状态
            alignmentLog.worker_status = 'online';
            alignmentLog.state_layer_status = response.data?.state_layer_status || 'online';
            alignmentLog.plugin_status = 'online';
            alignmentLog.success_count++;

            console.log(`✓ [JEV-Plugin] 测试成功 (尝试 ${attempt}) - 延迟: ${latency}ms, 字段差异: ${validation.differences}`);
            return { success: true, latency, differences: validation.differences };
        } catch (error) {
            alignmentLog.request_count++;
            alignmentLog.failed_count++;
            alignmentLog.errors.push(`尝试 ${attempt}: ${error.message}`);

            console.error(`✗ [JEV-Plugin] 测试失败 (尝试 ${attempt}): ${error.message}`);
            return { success: false, error: error.message };
        }
    }

    // 计算测试结果
    function calculateResults() {
        // 计算平均延迟
        if (alignmentLog.latency_measurements.length > 0) {
            alignmentLog.average_latency = Math.round(
                alignmentLog.latency_measurements.reduce((a, b) => a + b, 0) /
                alignmentLog.latency_measurements.length
            );
        }

        // 计算漂移范围
        if (alignmentLog.latency_measurements.length > 0) {
            const min = Math.min(...alignmentLog.latency_measurements);
            const max = Math.max(...alignmentLog.latency_measurements);
            alignmentLog.drift_range = `${min}-${max}ms`;
        }

        // 判定对齐结果
        const allSystemsOnline = (
            alignmentLog.worker_status === 'online' &&
            alignmentLog.state_layer_status === 'online' &&
            alignmentLog.plugin_status === 'online'
        );

        const latencyAcceptable = alignmentLog.average_latency < CONFIG.acceptableLatency;
        const noFieldDifferences = alignmentLog.field_differences === 0;
        const enoughSuccesses = alignmentLog.success_count >= Math.ceil(CONFIG.testMessageCount / 2);

        if (allSystemsOnline && latencyAcceptable && noFieldDifferences && enoughSuccesses) {
            alignmentLog.alignment_result = 'Aligned';
        } else {
            alignmentLog.alignment_result = 'Drift';
        }
    }

    // 生成并下载报告
    function generateAndDownloadReport() {
        calculateResults();

        // 生成JSON日志
        const logBlob = new Blob([JSON.stringify(alignmentLog, null, 2)], { type: 'application/json' });
        const logUrl = URL.createObjectURL(logBlob);
        const logLink = document.createElement('a');
        logLink.href = logUrl;
        logLink.download = `plugin_alignment_log_${Date.now()}.json`;
        document.body.appendChild(logLink);
        logLink.click();
        document.body.removeChild(logLink);
        URL.revokeObjectURL(logUrl);

        // 生成文本报告
        const reportText = `
JEV 插件通信对齐报告
=====================
测试ID: ${alignmentLog.test_id}
测试时间: ${new Date(alignmentLog.timestamp).toLocaleString()}

状态概览:
--------
Worker 状态: ${alignmentLog.worker_status.toUpperCase()}
状态层状态: ${alignmentLog.state_layer_status.toUpperCase()}
插件状态: ${alignmentLog.plugin_status.toUpperCase()}

性能指标:
--------
平均延迟: ${alignmentLog.average_latency}ms
漂移范围: ${alignmentLog.drift_range}
请求总数: ${alignmentLog.request_count}
成功请求: ${alignmentLog.success_count}
失败请求: ${alignmentLog.failed_count}

对齐结果:
--------
对齐状态: ${alignmentLog.alignment_result}
字段差异: ${alignmentLog.field_differences}

错误详情:
--------
${alignmentLog.errors.length > 0 ? alignmentLog.errors.join('\n') : '无'}

成功判定标准:
--------
- 所有系统在线: ${alignmentLog.worker_status === 'online' && alignmentLog.state_layer_status === 'online' && alignmentLog.plugin_status === 'online' ? '✓' : '✗'}
- 延迟 < ${CONFIG.acceptableLatency}ms: ${alignmentLog.average_latency < CONFIG.acceptableLatency ? '✓' : '✗'}
- 字段差异 = 0: ${alignmentLog.field_differences === 0 ? '✓' : '✗'}
- 成功请求 > 50%: ${alignmentLog.success_count / alignmentLog.request_count > 0.5 ? '✓' : '✗'}

=====================
报告生成时间: ${new Date().toLocaleString()}
`;

        const reportBlob = new Blob([reportText], { type: 'text/plain' });
        const reportUrl = URL.createObjectURL(reportBlob);
        const reportLink = document.createElement('a');
        reportLink.href = reportUrl;
        reportLink.download = `plugin_alignment_report_${Date.now()}.txt`;
        document.body.appendChild(reportLink);
        reportLink.click();
        document.body.removeChild(reportLink);
        URL.revokeObjectURL(reportUrl);

        return reportText;
    }

    // 创建UI通知元素
    function createNotification(message, type = 'info') {
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
    async function runAlignmentTestSuite() {
        console.log('[JEV-Plugin] 开始JEV插件通信对齐测试...');
        console.log(`[JEV-Plugin] 目标Worker: ${CONFIG.workerUrl}${CONFIG.syncEndpoint}`);
        
        createNotification('开始JEV插件通信对齐测试...', 'info');

        let consecutiveFailures = 0;

        for (let attempt = 1; attempt <= CONFIG.testMessageCount; attempt++) {
            const result = await runAlignmentTest(attempt);

            if (!result.success) {
                consecutiveFailures++;

                // 如果连续失败次数达到最大重试限制，停止测试
                if (consecutiveFailures >= CONFIG.maxRetryAttempts) {
                    console.error(`[JEV-Plugin] 连续失败${consecutiveFailures}次，达到最大重试限制`);
                    break;
                }

                // 等待一段时间后重试
                console.log('[JEV-Plugin] 等待1秒后重试...');
                await new Promise(resolve => setTimeout(resolve, 1000));
            } else {
                consecutiveFailures = 0;
            }

            // 测试之间的短暂间隔
            if (attempt < CONFIG.testMessageCount) {
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }

        // 生成报告
        const reportText = generateAndDownloadReport();

        // 显示结果通知
        if (alignmentLog.alignment_result === 'Aligned') {
            createNotification(`✅ JEV插件通信对齐成功！平均延迟: ${alignmentLog.average_latency}ms`, 'success');
        } else {
            createNotification(`⚠️ JEV插件通信对齐失败，请检查配置`, 'error');
        }

        // 输出控制台结果
        console.log('\n========================================');
        console.log('✅ JEV 插件通信对齐任务执行完成');
        console.log(`Worker 状态: ${alignmentLog.worker_status}`);
        console.log(`状态层状态: ${alignmentLog.state_layer_status}`);
        console.log(`插件状态: ${alignmentLog.plugin_status}`);
        console.log(`平均延迟: ${alignmentLog.average_latency} ms`);
        console.log(`对齐结果: ${alignmentLog.alignment_result}`);
        console.log('========================================');
        
        // 返回结果供外部使用
        return alignmentLog;
    }

    // 初始化插件
    function initializePlugin() {
        console.log('[JEV-Plugin] JEV-PluginSync-v1.0 插件初始化完成');
        
        // 初始化双模式管理器
        const modeManager = new PluginModeManager();
        console.log('[JEV-Plugin] 双模式支持已启用，当前模式:', modeManager.getModeStatus().mode);
        
        // 暴露到全局对象，供页面脚本调用
        window.JEVPluginSync = {
            runAlignmentTest: runAlignmentTestSuite,
            sendMessage: (message) => modeManager.sendMessage(message),
            getModeStatus: () => modeManager.getModeStatus(),
            getAlignmentLog: () => alignmentLog
        };
        
        // 等待文档加载完成后添加UI控制元素
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', addUIControls);
        } else {
            addUIControls();
        }
    }

    // 添加UI控制元素
    function addUIControls() {
        // 创建控制按钮
        const controlButton = document.createElement('button');
        controlButton.textContent = 'JEV-对齐测试';
        controlButton.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 10px 15px;
            background-color: #2196F3;
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 12px;
            z-index: 999999;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
            transition: all 0.3s ease;
        `;
        
        controlButton.addEventListener('mouseenter', () => {
            controlButton.style.backgroundColor = '#1976D2';
        });
        
        controlButton.addEventListener('mouseleave', () => {
            controlButton.style.backgroundColor = '#2196F3';
        });
        
        controlButton.addEventListener('click', async () => {
            controlButton.disabled = true;
            controlButton.textContent = '测试中...';
            
            try {
                await runAlignmentTestSuite();
            } catch (error) {
                console.error('[JEV-Plugin] 测试执行失败:', error);
                createNotification(`❌ 测试执行失败: ${error.message}`, 'error');
            } finally {
                controlButton.disabled = false;
                controlButton.textContent = 'JEV-对齐测试';
            }
        });
        
        // 添加模式状态指示器
        const statusIndicator = document.createElement('div');
        statusIndicator.id = 'jev-mode-indicator';
        statusIndicator.style.cssText = `
            position: fixed;
            top: 60px;
            right: 20px;
            padding: 8px 12px;
            background-color: #4CAF50;
            color: white;
            border-radius: 6px;
            font-size: 11px;
            font-family: Arial, sans-serif;
            z-index: 999999;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        `;
        
        statusIndicator.textContent = '在线模式';
        
        document.body.appendChild(controlButton);
        document.body.appendChild(statusIndicator);
    }

    // 监听页面事件并同步到Worker
    function setupEventListeners() {
        // 页面加载完成时发送事件
        window.addEventListener('load', () => {
            const pageLoadEvent = {
                device: 'plugin-ui',
                key: 'page_event',
                value: {
                    event_type: 'page_load',
                    url: window.location.href,
                    title: document.title
                },
                timestamp: Date.now(),
                origin: 'plugin'
            };
            
            if (window.JEVPluginSync) {
                window.JEVPluginSync.sendMessage(pageLoadEvent).catch(err => {
                    console.log('[JEV-Plugin] 页面加载事件发送失败:', err);
                });
            }
        });
        
        // 页面卸载时发送事件
        window.addEventListener('beforeunload', () => {
            const pageUnloadEvent = {
                device: 'plugin-ui',
                key: 'page_event',
                value: {
                    event_type: 'page_unload',
                    url: window.location.href,
                    title: document.title
                },
                timestamp: Date.now(),
                origin: 'plugin'
            };
            
            // 使用同步请求确保在页面卸载前发送
            try {
                const xhr = new XMLHttpRequest();
                xhr.open('POST', `${CONFIG.workerUrl}${CONFIG.syncEndpoint}`, false);
                xhr.setRequestHeader('Content-Type', 'application/json');
                xhr.setRequestHeader('X-Agent-Token', CONFIG.agentToken);
                xhr.send(JSON.stringify(pageUnloadEvent));
            } catch (e) {
                // 忽略错误，因为页面正在卸载
            }
        });
    }

    // 启动插件
    initializePlugin();
    setupEventListeners();

})();