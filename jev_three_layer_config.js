/**
 * JEV-PluginSync-v1.0 - 三层通信闭环统一配置
 * 集中管理插件层 ↔ 本地中继 ↔ Worker ↔ 状态层的通信配置
 */

class JEVThreeLayerConfig {
    constructor(options = {}) {
        // 默认配置
        this.defaultConfig = {
            // 通信端点配置
            endpoints: {
                // 插件层配置
                plugin: {
                    baseUrl: 'http://localhost:8080',
                    statusEndpoint: '/status',
                    syncEndpoint: '/api/sync',
                    messageEndpoint: '/api/message',
                    maxRetries: 3,
                    retryDelay: 1000
                },
                
                // 本地中继配置
                relay: {
                    baseUrl: 'http://localhost:3000',
                    statusEndpoint: '/api/status',
                    relayEndpoint: '/api/relay',
                    heartbeatEndpoint: '/api/heartbeat',
                    maxRetries: 5,
                    retryDelay: 1500,
                    connectionTimeout: 5000,
                    heartbeatInterval: 30000 // 30秒心跳
                },
                
                // Worker层配置
                worker: {
                    baseUrl: 'https://jevshop.bensonlove1986.workers.dev',
                    statusEndpoint: '/status',
                    syncEndpoint: '/sync',
                    stateCheckEndpoint: '/state/check',
                    maxRetries: 3,
                    retryDelay: 2000,
                    connectionTimeout: 8000
                }
            },
            
            // 安全配置
            security: {
                agentToken: 'jev_cloud_api_key_123456',
                encryptionEnabled: true,
                encryptionKeyLength: 256,
                enableMessageSigning: true,
                signatureAlgorithm: 'HMAC-SHA256',
                enableRateLimit: true,
                requestsPerMinute: 120,
                allowedOrigins: ['http://localhost:8080', 'http://localhost:3000'],
                sslVerify: true
            },
            
            // 通信配置
            communication: {
                messageFormat: 'json',
                compressionEnabled: true,
                compressionLevel: 5, // 1-9
                maxMessageSize: 1048576, // 1MB
                defaultTimeout: 10000,
                enableBatching: true,
                batchSize: 10,
                batchInterval: 1000, // 1秒批量发送
                queueSizeLimit: 1000,
                offlineQueueEnabled: true,
                offlineQueuePersist: true,
                offlineQueueStorageKey: 'jev_offline_messages'
            },
            
            // 双模式配置
            dualMode: {
                onlineModeDefault: true,
                autoSwitchToOffline: true,
                connectionCheckInterval: 5000,
                consecutiveFailuresThreshold: 3,
                reconnectionDelay: 5000,
                maxReconnectionAttempts: 10
            },
            
            // 日志配置
            logging: {
                enabled: true,
                logLevel: 'info', // error, warn, info, debug
                logToConsole: true,
                logToFile: true,
                logFilePath: 'd:/PDF转网页/jev_logs/communication/',
                logFileNamePrefix: 'jev_three_layer_',
                maxLogFileSize: 5242880, // 5MB
                maxLogFiles: 5,
                includeTimestamp: true,
                includeSeverity: true,
                includeComponent: true
            },
            
            // 测试配置
            testing: {
                testModeEnabled: false,
                mockResponses: false,
                testMessageCount: 10,
                testMessageInterval: 1000,
                testDuration: 30000,
                acceptableLatency: 150,
                acceptableErrorRate: 0.05
            },
            
            // 性能监控配置
            performance: {
                monitorEnabled: true,
                metricsCollectionInterval: 60000, // 1分钟
                trackLatency: true,
                trackThroughput: true,
                trackErrorRate: true,
                trackQueueLength: true,
                latencyBucketThresholds: [50, 100, 200, 500, 1000]
            },
            
            // 故障恢复配置
            recovery: {
                enableCircuitBreaker: true,
                circuitBreakerThreshold: 10,
                circuitBreakerResetTimeout: 30000, // 30秒后尝试重置
                fallbackStrategy: 'queue', // queue, cache, offline
                gracefulDegradation: true
            }
        };

        // 合并用户配置
        this.config = this.deepMerge(this.defaultConfig, options);
        
        // 初始化配置验证
        this.validateConfig();
        
        // 绑定方法
        this.getConfig = this.getConfig.bind(this);
        this.updateConfig = this.updateConfig.bind(this);
        this.getEndpointUrl = this.getEndpointUrl.bind(this);
        this.getSecurityConfig = this.getSecurityConfig.bind(this);
        this.getCommunicationConfig = this.getCommunicationConfig.bind(this);
        this.getDualModeConfig = this.getDualModeConfig.bind(this);
        this.getLoggingConfig = this.getLoggingConfig.bind(this);
        this.getTestingConfig = this.getTestingConfig.bind(this);
        this.getPerformanceConfig = this.getPerformanceConfig.bind(this);
        this.getRecoveryConfig = this.getRecoveryConfig.bind(this);
        this.saveConfig = this.saveConfig.bind(this);
        this.loadConfig = this.loadConfig.bind(this);
        this.validateConfig = this.validateConfig.bind(this);
    }

    // 获取完整配置
    getConfig() {
        return { ...this.config };
    }

    // 更新配置
    updateConfig(newConfig) {
        this.config = this.deepMerge(this.config, newConfig);
        this.validateConfig();
        return this.getConfig();
    }

    // 获取指定组件的配置
    getComponentConfig(component) {
        const validComponents = ['plugin', 'relay', 'worker'];
        if (!validComponents.includes(component)) {
            throw new Error(`无效的组件: ${component}。有效组件: ${validComponents.join(', ')}`);
        }
        return { ...this.config.endpoints[component] };
    }

    // 获取完整端点URL
    getEndpointUrl(component, endpointType) {
        const componentConfig = this.getComponentConfig(component);
        const endpointPath = componentConfig[`${endpointType}Endpoint`];
        
        if (!endpointPath) {
            throw new Error(`组件 ${component} 没有 ${endpointType} 端点配置`);
        }
        
        return this.joinUrl(componentConfig.baseUrl, endpointPath);
    }

    // 获取安全配置
    getSecurityConfig() {
        return { ...this.config.security };
    }

    // 获取通信配置
    getCommunicationConfig() {
        return { ...this.config.communication };
    }

    // 获取双模式配置
    getDualModeConfig() {
        return { ...this.config.dualMode };
    }

    // 获取日志配置
    getLoggingConfig() {
        return { ...this.config.logging };
    }

    // 获取测试配置
    getTestingConfig() {
        return { ...this.config.testing };
    }

    // 获取性能监控配置
    getPerformanceConfig() {
        return { ...this.config.performance };
    }

    // 获取故障恢复配置
    getRecoveryConfig() {
        return { ...this.config.recovery };
    }

    // 合并URL路径
    joinUrl(baseUrl, path) {
        const base = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
        const endpoint = path.startsWith('/') ? path : `/${path}`;
        return `${base}${endpoint}`;
    }

    // 深度合并对象
    deepMerge(target, source) {
        const output = { ...target };
        
        if (this.isObject(target) && this.isObject(source)) {
            Object.keys(source).forEach(key => {
                if (this.isObject(source[key])) {
                    if (!(key in target)) {
                        Object.assign(output, { [key]: source[key] });
                    } else {
                        output[key] = this.deepMerge(target[key], source[key]);
                    }
                } else {
                    Object.assign(output, { [key]: source[key] });
                }
            });
        }
        
        return output;
    }

    // 检查是否为对象
    isObject(item) {
        return item && typeof item === 'object' && !Array.isArray(item);
    }

    // 验证配置
    validateConfig() {
        const errors = [];
        
        // 验证端点URL
        ['plugin', 'relay', 'worker'].forEach(component => {
            const baseUrl = this.config.endpoints[component].baseUrl;
            if (!this.isValidUrl(baseUrl)) {
                errors.push(`无效的 ${component} 基础URL: ${baseUrl}`);
            }
        });
        
        // 验证安全配置
        if (!this.config.security.agentToken || this.config.security.agentToken.trim().length < 8) {
            errors.push('Agent Token 无效或太短');
        }
        
        // 验证日志级别
        const validLogLevels = ['error', 'warn', 'info', 'debug'];
        if (!validLogLevels.includes(this.config.logging.logLevel)) {
            errors.push(`无效的日志级别: ${this.config.logging.logLevel}`);
        }
        
        // 验证性能配置
        if (this.config.performance.metricsCollectionInterval < 1000) {
            errors.push('性能指标收集间隔不能小于1秒');
        }
        
        // 如果有错误，抛出异常
        if (errors.length > 0) {
            throw new Error(`配置验证失败:\n${errors.join('\n')}`);
        }
        
        console.log('✅ JEV三层通信配置验证通过');
        return true;
    }

    // 验证URL
    isValidUrl(url) {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    }

    // 保存配置到文件/存储
    async saveConfig() {
        try {
            // 在Node.js环境中使用fs
            if (typeof require !== 'undefined') {
                const fs = require('fs');
                const path = require('path');
                
                // 确保日志目录存在
                const configPath = path.join(this.config.logging.logFilePath, 'jev_three_layer_config.json');
                const directory = path.dirname(configPath);
                
                if (!fs.existsSync(directory)) {
                    fs.mkdirSync(directory, { recursive: true });
                }
                
                fs.writeFileSync(configPath, JSON.stringify(this.config, null, 2));
                console.log(`✅ JEV三层通信配置已保存到: ${configPath}`);
                return configPath;
                
            } else if (typeof window !== 'undefined') {
                // 在浏览器环境中使用localStorage
                localStorage.setItem('jev_three_layer_config', JSON.stringify(this.config));
                console.log('✅ JEV三层通信配置已保存到localStorage');
                return 'localStorage';
            }
            
        } catch (error) {
            console.error('❌ 保存JEV三层通信配置失败:', error);
            throw error;
        }
    }

    // 从文件/存储加载配置
    async loadConfig() {
        try {
            let loadedConfig = null;
            
            // 在Node.js环境中使用fs
            if (typeof require !== 'undefined') {
                const fs = require('fs');
                const path = require('path');
                
                const configPath = path.join(this.config.logging.logFilePath, 'jev_three_layer_config.json');
                
                if (fs.existsSync(configPath)) {
                    const configData = fs.readFileSync(configPath, 'utf8');
                    loadedConfig = JSON.parse(configData);
                    console.log(`✅ 从 ${configPath} 加载JEV三层通信配置`);
                }
                
            } else if (typeof window !== 'undefined') {
                // 在浏览器环境中使用localStorage
                const storedConfig = localStorage.getItem('jev_three_layer_config');
                if (storedConfig) {
                    loadedConfig = JSON.parse(storedConfig);
                    console.log('✅ 从localStorage加载JEV三层通信配置');
                }
            }
            
            // 如果加载成功，更新配置
            if (loadedConfig) {
                this.config = this.deepMerge(this.config, loadedConfig);
                this.validateConfig();
            }
            
            return loadedConfig;
            
        } catch (error) {
            console.error('❌ 加载JEV三层通信配置失败:', error);
            // 加载失败时使用默认配置
            console.log('使用默认配置');
            return null;
        }
    }

    // 为测试模式设置配置
    setTestMode(enabled) {
        this.config.testing.testModeEnabled = enabled;
        if (enabled) {
            // 测试模式下的特殊配置
            this.config.communication.logToConsole = true;
            this.config.logging.logLevel = 'debug';
            this.config.security.sslVerify = false; // 测试环境可能使用自签名证书
        }
        console.log(`测试模式已${enabled ? '启用' : '禁用'}`);
    }

    // 获取集成测试配置
    getIntegrationTestConfig() {
        return {
            pluginUrl: this.config.endpoints.plugin.baseUrl,
            relayUrl: this.config.endpoints.relay.baseUrl,
            workerUrl: this.config.endpoints.worker.baseUrl,
            agentToken: this.config.security.agentToken,
            testMessageCount: this.config.testing.testMessageCount,
            messageInterval: this.config.testing.testMessageInterval,
            connectionTimeout: Math.max(
                this.config.endpoints.plugin.connectionTimeout || 5000,
                this.config.endpoints.relay.connectionTimeout || 5000,
                this.config.endpoints.worker.connectionTimeout || 5000
            ),
            acceptableLatency: this.config.testing.acceptableLatency
        };
    }

    // 获取通信头配置
    getCommunicationHeaders() {
        return {
            'Content-Type': this.config.communication.messageFormat === 'json' ? 
                'application/json' : 'application/x-www-form-urlencoded',
            'X-JEV-Version': 'v1.0',
            'X-JEV-Component': 'three_layer_sync',
            'X-Agent-Token': this.config.security.agentToken,
            'X-Encryption-Enabled': this.config.security.encryptionEnabled.toString()
        };
    }

    // 克隆配置
    cloneConfig() {
        return JSON.parse(JSON.stringify(this.config));
    }

    // 重置为默认配置
    resetToDefaults() {
        this.config = this.deepMerge({}, this.defaultConfig);
        console.log('✅ JEV三层通信配置已重置为默认值');
        return this.getConfig();
    }

    // 验证连接配置
    async validateConnections() {
        const results = {
            plugin: { connected: false, error: null },
            relay: { connected: false, error: null },
            worker: { connected: false, error: null }
        };

        try {
            // 并行验证所有连接
            await Promise.all([
                this.validateConnection('plugin', results),
                this.validateConnection('relay', results),
                this.validateConnection('worker', results)
            ]);
        } catch (error) {
            console.error('连接验证过程中出错:', error);
        }

        return results;
    }

    // 验证单个连接
    async validateConnection(component, results) {
        try {
            const endpointUrl = this.getEndpointUrl(component, 'status');
            const headers = this.getCommunicationHeaders();
            
            let response;
            
            // 根据环境使用不同的fetch方法
            if (typeof window !== 'undefined') {
                // 浏览器环境
                response = await fetch(endpointUrl, {
                    method: 'GET',
                    headers,
                    timeout: this.config.communication.defaultTimeout
                });
            } else if (typeof require !== 'undefined') {
                // Node.js环境
                try {
                    const fetch = require('node-fetch');
                    response = await fetch(endpointUrl, {
                        method: 'GET',
                        headers,
                        timeout: this.config.communication.defaultTimeout
                    });
                } catch (e) {
                    // 降级到http请求
                    response = await this.makeNodeHttpRequest('GET', endpointUrl, null, headers);
                }
            }
            
            if (response && response.status === 200) {
                results[component].connected = true;
                console.log(`✅ ${component} 连接验证成功: ${endpointUrl}`);
            } else {
                throw new Error(`HTTP状态码: ${response ? response.status : '无响应'}`);
            }
        } catch (error) {
            results[component].error = error.message;
            console.error(`❌ ${component} 连接验证失败:`, error.message);
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
                    headers,
                    timeout: this.config.communication.defaultTimeout
                };

                const req = http.request(options, (res) => {
                    let responseData = '';

                    res.on('data', (chunk) => {
                        responseData += chunk;
                    });

                    res.on('end', () => {
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

                req.on('timeout', () => {
                    req.destroy();
                    reject(new Error('请求超时'));
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
}

// 导出配置单例
const jevConfig = new JEVThreeLayerConfig();

// 导出模块
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = {
        JEVThreeLayerConfig,
        jevConfig
    };
}

// 在浏览器环境中暴露
if (typeof window !== 'undefined') {
    window.JEVThreeLayerConfig = JEVThreeLayerConfig;
    window.jevConfig = jevConfig;
}

console.log('✅ JEV三层通信闭环统一配置模块已加载');

// 自动尝试加载保存的配置
if (typeof window !== 'undefined' || (typeof require !== 'undefined' && require.main !== module)) {
    jevConfig.loadConfig().catch(err => {
        console.log('未找到保存的配置，使用默认配置');
    });
}