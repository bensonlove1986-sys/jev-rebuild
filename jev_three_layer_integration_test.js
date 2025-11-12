/**
 * JEV-PluginSync-v1.0 - 三层通信闭环集成测试
 * 测试插件层 ↔ 本地中继 ↔ Worker ↔ 状态层的完整通信链路
 */

class JEVThreeLayerTest {
    constructor(options = {}) {
        // 默认配置
        this.config = {
            pluginUrl: 'http://localhost:8080', // 插件Web界面
            relayUrl: 'http://localhost:3000',  // 本地中继
            workerUrl: 'https://jevshop.bensonlove1986.workers.dev', // Worker
            agentToken: 'jev_cloud_api_key_123456',
            testDuration: 30000, // 30秒
            messageInterval: 2000, // 2秒
            testMessageCount: 10,
            acceptableLatency: 150, // ms
            connectionTimeout: 5000,
            ...options
        };

        // 测试结果日志
        this.testResults = {
            test_id: `test_${Date.now()}`,
            timestamp: Date.now(),
            config: this.config,
            plugin_status: 'unknown',
            relay_status: 'unknown',
            worker_status: 'unknown',
            state_layer_status: 'unknown',
            communication_test_results: [],
            latency_measurements: {
                plugin_to_relay: [],
                relay_to_worker: [],
                worker_to_state: [],
                total_end_to_end: []
            },
            success_count: 0,
            failure_count: 0,
            error_logs: [],
            throughput: 0,
            alignment_score: 0,
            test_status: 'pending'
        };

        // 测试状态
        this.isRunning = false;
        this.messageSequence = 0;
        this.startTime = null;
        this.endTime = null;
        
        // 通信状态检查器
        this.statusCheckers = {
            plugin: null,
            relay: null,
            worker: null
        };

        // 绑定方法
        this.runFullTest = this.runFullTest.bind(this);
        this.checkAllServices = this.checkAllServices.bind(this);
        this.testPluginToRelay = this.testPluginToRelay.bind(this);
        this.testRelayToWorker = this.testRelayToWorker.bind(this);
        this.testWorkerToState = this.testWorkerToState.bind(this);
        this.runEndToEndTest = this.runEndToEndTest.bind(this);
        this.generateReport = this.generateReport.bind(this);
        this.saveReport = this.saveReport.bind(this);
    }

    // 检查所有服务状态
    async checkAllServices() {
        console.log('[JEV-ThreeLayer] 开始检查所有服务状态...');
        
        // 并行检查所有服务
        const [pluginStatus, relayStatus, workerStatus] = await Promise.all([
            this.checkPluginStatus(),
            this.checkRelayStatus(),
            this.checkWorkerStatus()
        ]);

        this.testResults.plugin_status = pluginStatus ? 'online' : 'offline';
        this.testResults.relay_status = relayStatus ? 'online' : 'offline';
        this.testResults.worker_status = workerStatus ? 'online' : 'offline';

        console.log(`[JEV-ThreeLayer] 服务状态检查完成:`);
        console.log(`- 插件层: ${this.testResults.plugin_status}`);
        console.log(`- 本地中继: ${this.testResults.relay_status}`);
        console.log(`- Worker层: ${this.testResults.worker_status}`);

        // 如果任何服务离线，添加错误日志
        if (!pluginStatus) {
            this.addError('plugin_offline', '插件层服务离线');
        }
        if (!relayStatus) {
            this.addError('relay_offline', '本地中继服务离线');
        }
        if (!workerStatus) {
            this.addError('worker_offline', 'Worker服务离线');
        }

        return {
            allOnline: pluginStatus && relayStatus && workerStatus,
            status: {
                plugin: this.testResults.plugin_status,
                relay: this.testResults.relay_status,
                worker: this.testResults.worker_status
            }
        };
    }

    // 检查插件状态
    async checkPluginStatus() {
        try {
            const response = await this.makeRequest('GET', `${this.config.pluginUrl}/status`);
            return response && response.status === 200;
        } catch (error) {
            console.error('[JEV-ThreeLayer] 插件状态检查失败:', error.message);
            return false;
        }
    }

    // 检查中继状态
    async checkRelayStatus() {
        try {
            const response = await this.makeRequest('GET', `${this.config.relayUrl}/api/status`);
            if (response && response.status === 200) {
                const data = await response.json();
                return data.status === 'online';
            }
            return false;
        } catch (error) {
            console.error('[JEV-ThreeLayer] 中继状态检查失败:', error.message);
            return false;
        }
    }

    // 检查Worker状态
    async checkWorkerStatus() {
        try {
            const response = await this.makeRequest('GET', `${this.config.workerUrl}/status`);
            return response && response.status === 200;
        } catch (error) {
            console.error('[JEV-ThreeLayer] Worker状态检查失败:', error.message);
            return false;
        }
    }

    // 测试插件到中继的通信
    async testPluginToRelay() {
        console.log('[JEV-ThreeLayer] 开始测试插件到中继的通信...');
        
        if (this.testResults.relay_status !== 'online') {
            console.error('[JEV-ThreeLayer] 中继服务离线，跳过测试');
            return false;
        }

        try {
            const startTime = Date.now();
            const testMessage = this.createTestMessage('plugin_to_relay');
            
            const response = await this.makeRequest(
                'POST', 
                `${this.config.relayUrl}/api/relay`,
                testMessage
            );
            
            const endTime = Date.now();
            const latency = endTime - startTime;
            
            if (response && response.status === 200) {
                const data = await response.json();
                
                this.testResults.latency_measurements.plugin_to_relay.push(latency);
                
                console.log(`✅ [JEV-ThreeLayer] 插件到中继通信成功，延迟: ${latency}ms`);
                
                return {
                    success: true,
                    latency,
                    response: data
                };
            }
            
            throw new Error(`HTTP状态码: ${response ? response.status : '无响应'}`);
            
        } catch (error) {
            this.addError('plugin_relay_failure', `插件到中继通信失败: ${error.message}`);
            console.error(`❌ [JEV-ThreeLayer] 插件到中继通信失败:`, error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // 测试中继到Worker的通信
    async testRelayToWorker() {
        console.log('[JEV-ThreeLayer] 开始测试中继到Worker的通信...');
        
        if (this.testResults.worker_status !== 'online') {
            console.error('[JEV-ThreeLayer] Worker服务离线，跳过测试');
            return false;
        }

        try {
            const startTime = Date.now();
            const testMessage = this.createTestMessage('relay_to_worker');
            
            // 模拟中继到Worker的请求
            const response = await this.makeRequest(
                'POST',
                `${this.config.workerUrl}/sync`,
                testMessage,
                {
                    'X-Relay-Source': 'integration_test',
                    'X-Relay-Id': `relay_${Date.now()}`
                }
            );
            
            const endTime = Date.now();
            const latency = endTime - startTime;
            
            if (response && response.status === 200) {
                const data = await response.json();
                
                this.testResults.latency_measurements.relay_to_worker.push(latency);
                this.testResults.state_layer_status = data?.state_layer_status || 'unknown';
                
                console.log(`✅ [JEV-ThreeLayer] 中继到Worker通信成功，延迟: ${latency}ms`);
                
                return {
                    success: true,
                    latency,
                    response: data
                };
            }
            
            throw new Error(`HTTP状态码: ${response ? response.status : '无响应'}`);
            
        } catch (error) {
            this.addError('relay_worker_failure', `中继到Worker通信失败: ${error.message}`);
            console.error(`❌ [JEV-ThreeLayer] 中继到Worker通信失败:`, error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // 测试Worker到状态层的通信
    async testWorkerToState() {
        console.log('[JEV-ThreeLayer] 开始测试Worker到状态层的通信...');
        
        if (this.testResults.worker_status !== 'online') {
            console.error('[JEV-ThreeLayer] Worker服务离线，跳过测试');
            return false;
        }

        try {
            const startTime = Date.now();
            const testMessage = this.createTestMessage('worker_to_state');
            
            // 通过Worker API测试状态层访问
            const response = await this.makeRequest(
                'POST',
                `${this.config.workerUrl}/state/check`,
                testMessage
            );
            
            const endTime = Date.now();
            const latency = endTime - startTime;
            
            if (response && response.status === 200) {
                const data = await response.json();
                
                this.testResults.latency_measurements.worker_to_state.push(latency);
                this.testResults.state_layer_status = data?.status || 'online';
                
                console.log(`✅ [JEV-ThreeLayer] Worker到状态层通信成功，延迟: ${latency}ms`);
                
                return {
                    success: true,
                    latency,
                    response: data
                };
            } else if (response && response.status === 404) {
                // 如果状态检查端点不可用，尝试通过sync端点间接测试
                console.log('[JEV-ThreeLayer] 状态检查端点不可用，通过sync端点间接测试');
                return this.testRelayToWorker(); // 复用Worker测试
            }
            
            throw new Error(`HTTP状态码: ${response ? response.status : '无响应'}`);
            
        } catch (error) {
            this.addError('worker_state_failure', `Worker到状态层通信失败: ${error.message}`);
            console.error(`❌ [JEV-ThreeLayer] Worker到状态层通信失败:`, error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // 运行端到端通信测试
    async runEndToEndTest() {
        console.log('[JEV-ThreeLayer] 开始端到端通信测试...');
        
        const allOnline = await this.checkAllServices();
        if (!allOnline.allOnline) {
            console.error('[JEV-ThreeLayer] 部分服务离线，无法进行端到端测试');
            return false;
        }

        this.startTime = Date.now();
        this.isRunning = true;
        this.testResults.test_status = 'running';

        // 运行指定数量的测试消息
        for (let i = 0; i < this.config.testMessageCount; i++) {
            if (!this.isRunning) break;
            
            console.log(`\n📤 [JEV-ThreeLayer] 发送端到端测试消息 #${i + 1}/${this.config.testMessageCount}`);
            
            const startTime = Date.now();
            const testMessage = this.createTestMessage('end_to_end', i);
            
            try {
                // 发送测试消息到插件接口（模拟插件层）
                const response = await this.makeRequest(
                    'POST',
                    `${this.config.pluginUrl || this.config.relayUrl}/api/relay`,
                    testMessage
                );
                
                const endTime = Date.now();
                const totalLatency = endTime - startTime;
                
                if (response && (response.status === 200 || response.status === 202)) {
                    const data = await response.json();
                    
                    this.testResults.success_count++;
                    this.testResults.latency_measurements.total_end_to_end.push(totalLatency);
                    
                    const testResult = {
                        message_id: testMessage.message_id,
                        sequence: i + 1,
                        timestamp: Date.now(),
                        latency: totalLatency,
                        success: true,
                        response: data
                    };
                    
                    this.testResults.communication_test_results.push(testResult);
                    
                    console.log(`✅ [JEV-ThreeLayer] 消息 #${i + 1} 成功，总延迟: ${totalLatency}ms`);
                    
                } else {
                    throw new Error(`HTTP状态码: ${response ? response.status : '无响应'}`);
                }
                
            } catch (error) {
                this.testResults.failure_count++;
                
                const testResult = {
                    message_id: testMessage.message_id,
                    sequence: i + 1,
                    timestamp: Date.now(),
                    success: false,
                    error: error.message
                };
                
                this.testResults.communication_test_results.push(testResult);
                this.addError(`message_failure_${i}`, `消息 #${i + 1} 失败: ${error.message}`);
                
                console.error(`❌ [JEV-ThreeLayer] 消息 #${i + 1} 失败:`, error.message);
            }
            
            // 等待下一条消息
            if (i < this.config.testMessageCount - 1) {
                await new Promise(resolve => setTimeout(resolve, this.config.messageInterval));
            }
        }

        this.endTime = Date.now();
        this.isRunning = false;
        
        console.log('\n========================================');
        console.log('端到端测试完成:');
        console.log(`成功: ${this.testResults.success_count}`);
        console.log(`失败: ${this.testResults.failure_count}`);
        console.log(`总时间: ${this.endTime - this.startTime}ms`);
        console.log('========================================');
        
        return true;
    }

    // 运行完整的三层通信测试
    async runFullTest() {
        console.log('========================================');
        console.log('🔄 JEV 三层通信闭环集成测试开始');
        console.log(`测试ID: ${this.testResults.test_id}`);
        console.log(`测试配置: ${JSON.stringify(this.config)}`);
        console.log('========================================');

        try {
            // 1. 检查所有服务状态
            const serviceStatus = await this.checkAllServices();
            
            if (!serviceStatus.allOnline) {
                console.warn('⚠️ 部分服务离线，继续测试但可能结果不准确');
            }

            // 2. 测试各层之间的通信
            await Promise.all([
                this.testPluginToRelay(),
                this.testRelayToWorker(),
                this.testWorkerToState()
            ]);

            // 3. 运行端到端测试
            const endToEndSuccess = await this.runEndToEndTest();
            
            // 4. 生成报告
            const report = this.generateReport();
            
            // 5. 保存报告
            await this.saveReport(report);
            
            console.log('\n========================================');
            console.log('✅ JEV 三层通信闭环集成测试完成');
            console.log(`测试结果: ${this.testResults.test_status.toUpperCase()}`);
            console.log(`对齐得分: ${this.testResults.alignment_score}/100`);
            console.log(`报告已保存: jev_integration_report_${this.testResults.test_id}.json`);
            console.log('========================================');
            
            return report;
            
        } catch (error) {
            console.error('\n❌ [JEV-ThreeLayer] 测试执行失败:', error);
            this.addError('test_execution_failure', error.message);
            this.testResults.test_status = 'failed';
            
            const report = this.generateReport();
            await this.saveReport(report);
            
            return report;
        }
    }

    // 生成测试报告
    generateReport() {
        // 计算统计数据
        this.calculateStatistics();
        
        // 判定测试结果
        this.determineTestStatus();
        
        // 计算对齐得分
        this.calculateAlignmentScore();

        return {
            test_summary: {
                test_id: this.testResults.test_id,
                start_time: this.startTime,
                end_time: this.endTime,
                duration_ms: this.endTime ? this.endTime - this.startTime : 0,
                test_status: this.testResults.test_status,
                alignment_score: this.testResults.alignment_score
            },
            service_status: {
                plugin: this.testResults.plugin_status,
                relay: this.testResults.relay_status,
                worker: this.testResults.worker_status,
                state_layer: this.testResults.state_layer_status
            },
            performance_metrics: {
                latency: {
                    plugin_to_relay: this.calculateLatencyStats(this.testResults.latency_measurements.plugin_to_relay),
                    relay_to_worker: this.calculateLatencyStats(this.testResults.latency_measurements.relay_to_worker),
                    worker_to_state: this.calculateLatencyStats(this.testResults.latency_measurements.worker_to_state),
                    end_to_end: this.calculateLatencyStats(this.testResults.latency_measurements.total_end_to_end)
                },
                throughput: this.testResults.throughput,
                success_rate: this.testResults.success_count > 0 ? 
                    (this.testResults.success_count / (this.testResults.success_count + this.testResults.failure_count) * 100).toFixed(2) : 0
            },
            communication_results: this.testResults.communication_test_results,
            error_logs: this.testResults.error_logs,
            configuration: this.config
        };
    }

    // 计算统计数据
    calculateStatistics() {
        // 计算吞吐量 (消息/秒)
        if (this.startTime && this.endTime) {
            const durationSeconds = (this.endTime - this.startTime) / 1000;
            this.testResults.throughput = durationSeconds > 0 ? 
                ((this.testResults.success_count + this.testResults.failure_count) / durationSeconds).toFixed(2) : 0;
        }
    }

    // 计算延迟统计
    calculateLatencyStats(latencyArray) {
        if (!latencyArray || latencyArray.length === 0) {
            return { average: 0, min: 0, max: 0, count: 0 };
        }
        
        return {
            average: Math.round(latencyArray.reduce((a, b) => a + b, 0) / latencyArray.length),
            min: Math.min(...latencyArray),
            max: Math.max(...latencyArray),
            count: latencyArray.length
        };
    }

    // 判定测试状态
    determineTestStatus() {
        const successRate = this.testResults.success_count > 0 ? 
            this.testResults.success_count / (this.testResults.success_count + this.testResults.failure_count) : 0;
        
        const allServicesOnline = (
            this.testResults.plugin_status === 'online' &&
            this.testResults.relay_status === 'online' &&
            this.testResults.worker_status === 'online' &&
            this.testResults.state_layer_status === 'online'
        );
        
        if (successRate >= 0.9 && allServicesOnline) {
            this.testResults.test_status = 'passed';
        } else if (successRate >= 0.7) {
            this.testResults.test_status = 'warning';
        } else {
            this.testResults.test_status = 'failed';
        }
    }

    // 计算对齐得分
    calculateAlignmentScore() {
        let score = 100;
        
        // 服务状态评分 (40分)
        if (this.testResults.plugin_status !== 'online') score -= 10;
        if (this.testResults.relay_status !== 'online') score -= 10;
        if (this.testResults.worker_status !== 'online') score -= 10;
        if (this.testResults.state_layer_status !== 'online') score -= 10;
        
        // 成功率评分 (30分)
        const totalMessages = this.testResults.success_count + this.testResults.failure_count;
        if (totalMessages > 0) {
            const successRate = this.testResults.success_count / totalMessages;
            if (successRate < 1) score -= (1 - successRate) * 30;
        }
        
        // 延迟评分 (30分)
        const endToEndLatency = this.calculateLatencyStats(this.testResults.latency_measurements.total_end_to_end);
        if (endToEndLatency.average > 0) {
            const latencyRatio = Math.min(endToEndLatency.average / this.config.acceptableLatency, 2);
            if (latencyRatio > 1) score -= (latencyRatio - 1) * 30;
        }
        
        this.testResults.alignment_score = Math.max(0, Math.round(score));
    }

    // 保存报告到文件
    async saveReport(report) {
        const reportFilename = `jev_integration_report_${this.testResults.test_id}.json`;
        const reportPath = `d:\\PDF转网页\\jev_logs\\communication\\${reportFilename}`;
        
        try {
            // 在Node.js环境中使用fs
            if (typeof require !== 'undefined') {
                const fs = require('fs');
                const path = require('path');
                
                // 确保目录存在
                const directory = path.dirname(reportPath);
                if (!fs.existsSync(directory)) {
                    fs.mkdirSync(directory, { recursive: true });
                }
                
                fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
                console.log(`📊 [JEV-ThreeLayer] 测试报告已保存到: ${reportPath}`);
                
            } else if (typeof window !== 'undefined') {
                // 在浏览器环境中使用下载
                const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = reportFilename;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                console.log(`📊 [JEV-ThreeLayer] 测试报告已下载: ${reportFilename}`);
            }
            
        } catch (error) {
            console.error('[JEV-ThreeLayer] 保存报告失败:', error);
            throw error;
        }
    }

    // 创建测试消息
    createTestMessage(type, sequence = 0) {
        return {
            message_id: `test_${this.testResults.test_id}_${type}_${sequence}_${Date.now()}`,
            device: 'integration_test',
            key: `test_${type}`,
            value: {
                test_id: this.testResults.test_id,
                sequence: sequence,
                type: type,
                timestamp: Date.now(),
                random_data: Math.random().toString(36).substring(2, 10)
            },
            timestamp: Date.now(),
            origin: 'integration_test'
        };
    }

    // 通用HTTP请求方法
    async makeRequest(method, url, data = null, customHeaders = {}) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.config.connectionTimeout);

        const headers = {
            'Content-Type': 'application/json',
            'X-Agent-Token': this.config.agentToken,
            'X-JEV-Test-Id': this.testResults.test_id,
            ...customHeaders
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
            // 在Node.js环境中使用fetch或http
            let response;
            
            if (typeof window !== 'undefined') {
                // 浏览器环境
                response = await fetch(url, options);
            } else if (typeof require !== 'undefined') {
                // Node.js环境，使用node-fetch或http
                try {
                    const fetch = require('node-fetch');
                    response = await fetch(url, options);
                } catch (e) {
                    // 降级到http/https
                    response = await this.makeNodeHttpRequest(method, url, data, headers);
                }
            }
            
            clearTimeout(timeoutId);
            return response;
            
        } catch (error) {
            clearTimeout(timeoutId);
            throw error;
        }
    }

    // Node.js HTTP请求降级方案
    async makeNodeHttpRequest(method, url, data, headers) {
        return new Promise((resolve, reject) => {
            try {
                const http = url.startsWith('https') ? require('https') : require('http');
                const parsedUrl = new URL(url);
                
                const options = {
                    hostname: parsedUrl.hostname,
                    port: parsedUrl.port,
                    path: parsedUrl.pathname + parsedUrl.search,
                    method,
                    headers
                };

                const req = http.request(options, (res) => {
                    let responseData = '';

                    res.on('data', (chunk) => {
                        responseData += chunk;
                    });

                    res.on('end', () => {
                        // 模拟fetch响应对象
                        resolve({
                            status: res.statusCode,
                            json: async () => JSON.parse(responseData),
                            text: async () => responseData
                        });
                    });
                });

                req.on('error', (error) => {
                    reject(error);
                });

                if (data) {
                    req.write(JSON.stringify(data));
                }

                req.end();
            } catch (error) {
                reject(error);
            }
        });
    }

    // 添加错误日志
    addError(errorCode, errorMessage) {
        this.testResults.error_logs.push({
            error_code: errorCode,
            error_message: errorMessage,
            timestamp: Date.now()
        });
    }

    // 停止测试
    stopTest() {
        this.isRunning = false;
        this.endTime = Date.now();
        this.testResults.test_status = 'stopped';
        
        this.stopStatusCheckers();
        console.log('[JEV-ThreeLayer] 测试已停止');
    }

    // 停止状态检查器
    stopStatusCheckers() {
        for (const checker in this.statusCheckers) {
            if (this.statusCheckers[checker]) {
                clearInterval(this.statusCheckers[checker]);
                this.statusCheckers[checker] = null;
            }
        }
    }
}

// 在Node.js环境中直接运行测试
if (typeof require !== 'undefined' && require.main === module) {
    console.log('🚀 启动JEV三层通信闭环集成测试...');
    
    const test = new JEVThreeLayerTest({
        testMessageCount: 10,
        messageInterval: 1000
    });
    
    test.runFullTest().then(() => {
        console.log('\n🎉 测试执行完毕！');
        process.exit(0);
    }).catch(error => {
        console.error('\n💥 测试执行出错:', error);
        process.exit(1);
    });
}

// 导出模块
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = JEVThreeLayerTest;
}

// 在浏览器环境中暴露
if (typeof window !== 'undefined') {
    window.JEVThreeLayerTest = JEVThreeLayerTest;
}

console.log('✅ JEV三层通信闭环集成测试模块已加载');