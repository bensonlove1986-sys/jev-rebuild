// DeepSeek安全执行器配置文件
// 用于管理DeepSeek模块在JEV安全模式下的所有安全设置

const path = require('path');

/**
 * DeepSeek安全配置对象
 * 包含所有安全模块的配置参数
 */
const deepseekSecurityConfig = {
    // 基本配置
    base: {
        // 模块启用状态
        enabled: true,
        // 模块名称标识符
        moduleName: 'DeepSeekSecurityExecutor',
        // 版本信息
        version: '1.0.0',
        // 描述信息
        description: 'JEV系统安全域下的DeepSeek执行代理',
        // 环境设置
        environment: process.env.NODE_ENV || 'development',
        // 调试模式
        debug: process.env.NODE_ENV === 'development',
        // 默认超时设置（毫秒）
        defaultTimeoutMs: 30000
    },
    
    // 安全执行器配置
    securityExecutor: {
        // paused检查配置
        pausedCheck: {
            // 是否启用paused检查
            enabled: true,
            // 暂停标志文件路径
            pauseFlagPath: 'D:\\PDF转网页\\PAUSE.flag',
            // 远程memory检查间隔（毫秒）
            checkIntervalMs: 5000,
            // 缓存时间（避免频繁检查）
            cacheTimeMs: 1000
        },
        
        // 令牌白名单配置
        tokenWhitelist: {
            // 白名单模式：strict（严格模式，只允许白名单中的执行器），permissive（宽松模式，默认允许）
            mode: 'strict',
            // 允许的执行器ID列表
            allowedExecutors: [
                'system_daemon',
                'admin_interface',
                'security_module',
                'trea_core',
                'jev_controller'
            ],
            // 是否允许动态添加白名单
            allowDynamicAddition: true,
            // 动态添加权限控制（需要特殊令牌）
            requireAuthForAddition: true
        },
        
        // 操作类型白名单
        allowedOperations: {
            // 允许的基础操作类型
            base: ['analysis', 'generation', 'optimization', 'planning', 'summarization', 'code_refactoring'],
            // 禁止的操作类型
            restricted: ['system_config', 'api_credentials', 'network_control', 'external_requests']
        },
        
        // 输出验证配置
        outputValidation: {
            // 是否启用输出验证
            enabled: true,
            // 敏感内容过滤规则
            sensitiveContentFilters: {
                // API密钥模式
                apiKeys: /(?:api[-_]?key|apikey|token|secret)\s*[:=]\s*['"]?([a-zA-Z0-9]{8,})['"]?/i,
                // 密码模式
                passwords: /(?:password|passwd|pwd)\s*[:=]\s*['"]?([^\s'"]{6,})['"]?/i,
                // 信用卡模式
                creditCards: /\b(?:\d{4}[\s-]?){3}\d{4}\b/,
                // 身份证号码模式（中国）
                idNumbers: /\b[1-9]\d{5}(?:18|19|20)\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])\d{3}[\dX]\b/,
                // 内部路径模式
                internalPaths: /(\\\\|\/)(system|secure|private|admin)(\\\\|\/)/i
            },
            // 内容替换规则
            replacementRules: {
                // 替换为星号的最大长度
                maxLengthForStars: 20,
                // 默认替换字符串
                defaultReplacement: '[CONTENT REMOVED]',
                // API密钥部分隐藏（保留前4后4）
                apiKeyReplacement: '****-****'
            }
        }
    },
    
    // Dry-Run配置
    dryRun: {
        // 是否默认启用dry-run模式
        defaultEnabled: true,
        // 操作类型映射（将API操作映射到标准操作类型）
        operationTypeMapping: {
            'file_write': 'WRITE',
            'file_create': 'WRITE',
            'file_update': 'WRITE',
            'file_delete': 'DELETE',
            'file_read': 'READ',
            'system_command': 'EXECUTE',
            'network_request': 'NETWORK',
            'data_access': 'READ'
        },
        // 风险级别定义
        riskLevels: {
            // 低风险操作（默认允许）
            low: ['READ', 'ANALYSIS', 'PLANNING'],
            // 中风险操作（需要确认）
            medium: ['WRITE', 'TRANSFORM', 'OPTIMIZATION'],
            // 高风险操作（需要高级确认）
            high: ['DELETE', 'EXECUTE', 'NETWORK'],
            // 极高风险操作（默认拒绝）
            critical: ['SYSTEM_MODIFY', 'CONFIG_CHANGE']
        },
        // 风险评估配置
        riskAssessment: {
            // 是否启用自动风险评估
            enabled: true,
            // 基于文件路径的风险评分
            pathRiskScore: {
                systemPaths: 50,      // 系统路径权重
                executableFiles: 30,  // 可执行文件权重
                configFiles: 25,      // 配置文件权重
                dataFiles: 10         // 数据文件权重
            },
            // 基于操作类型的风险评分
            operationRiskScore: {
                'READ': 10,
                'WRITE': 30,
                'DELETE': 50,
                'EXECUTE': 40,
                'NETWORK': 35
            }
        },
        // 计划生成配置
        planGeneration: {
            // 是否包含详细步骤
            detailedSteps: true,
            // 是否包含资源影响分析
            resourceImpactAnalysis: true,
            // 是否包含潜在风险警告
            riskWarnings: true,
            // 最大计划步骤数
            maxSteps: 50
        }
    },
    
    // 路径与运行时控制配置
    pathRuntimeControl: {
        // 受限路径列表
        restrictedPaths: [
            'C:\\system',
            'C:\\secure',
            'C:\\private',
            '/system/',
            '/secure/',
            '/private/',
            'C:\\Windows\\System32',
            'C:\\Program Files',
            'C:\\Program Files (x86)',
            'D:\\PDF转网页\\security'
        ],
        
        // 允许的路径模式
        allowedPathPatterns: [
            // 项目相关路径
            path.resolve('d:\\PDF转网页'),
            // 临时文件路径
            path.resolve(process.env.TEMP || 'D:\\PDF转网页\\temp'),
            // 日志路径
            path.resolve('D:\\PDF转网页\\logs'),
            // 队列路径
            path.resolve('d:\\PDF转网页\\queues')
        ],
        
        // 路径规范化配置
        pathNormalization: {
            // 处理路径遍历攻击
            preventPathTraversal: true,
            // 处理UNC路径
            allowUNCPaths: false,
            // 处理符号链接
            resolveSymlinks: true,
            // 允许的符号链接深度
            maxSymlinkDepth: 3
        },
        
        // 运行时控制配置
        runtimeControl: {
            // 最大运行时间（分钟）
            maxRuntimeMinutes: 30,
            // 运行时间检查间隔（毫秒）
            checkIntervalMs: 10000,
            // 是否允许超时扩展
            allowTimeoutExtension: false,
            // 最大扩展次数
            maxTimeoutExtensions: 2
        },
        
        // 文件操作限制
        fileOperationLimits: {
            // 最大读取文件大小（MB）
            maxReadSizeMB: 100,
            // 最大写入文件大小（MB）
            maxWriteSizeMB: 50,
            // 单任务文件操作计数限制
            maxOperationsPerTask: 100,
            // 是否限制并发文件操作
            limitConcurrentOperations: true,
            // 最大并发文件操作数
            maxConcurrentOperations: 10
        },
        
        // 文件类型限制
        fileTypeRestrictions: {
            // 允许的可执行文件扩展名
            allowedExecutableExtensions: [], // 默认为空，表示不允许执行文件操作
            // 允许的脚本文件扩展名
            allowedScriptExtensions: ['.js', '.json', '.html', '.css', '.txt', '.md'],
            // 允许的二进制文件扩展名
            allowedBinaryExtensions: ['.pdf', '.jpg', '.jpeg', '.png', '.gif', '.svg']
        }
    },
    
    // 故障保护配置
    faultProtection: {
        // 自动锁定配置
        autoLock: {
            // 启用自动锁定
            enabled: true,
            // 触发锁定的连续失败次数
            failureThreshold: 3,
            // 锁定持续时间（毫秒）
            lockDurationMs: 300000, // 5分钟
            // 是否允许自动解锁
            allowAutoUnlock: false,
            // 解锁所需的安全级别
            unlockSecurityLevel: 'admin'
        },
        
        // 失败检测配置
        failureDetection: {
            // 检测的失败类型
            detectedFailureTypes: [
                'execution_error',
                'validation_error',
                'timeout_error',
                'permission_denied',
                'resource_limit_exceeded'
            ],
            // 失败记录保留时间（毫秒）
            failureHistoryRetentionMs: 3600000, // 1小时
            // 检测窗口大小（毫秒）
            detectionWindowMs: 600000 // 10分钟
        },
        
        // 恢复机制配置
        recovery: {
            // 启用自动恢复尝试
            enabled: true,
            // 最大恢复尝试次数
            maxRecoveryAttempts: 2,
            // 恢复尝试间隔（毫秒）
            recoveryAttemptIntervalMs: 5000,
            // 恢复策略：immediate（立即）, exponential（指数退避）, fixed（固定间隔）
            recoveryStrategy: 'exponential'
        },
        
        // 健康检查配置
        healthCheck: {
            // 启用健康检查
            enabled: true,
            // 检查间隔（毫秒）
            checkIntervalMs: 30000,
            // 检查项目配置
            checks: {
                // 内存使用检查
                memoryUsage: true,
                // CPU使用检查
                cpuUsage: true,
                // 磁盘空间检查
                diskSpace: true,
                // 网络连接检查
                networkConnectivity: true
            }
        }
    },
    
    // 日志系统配置
    logging: {
        // 命名空间配置
        namespace: {
            // 默认命名空间
            default: 'logging_core',
            // DeepSeek执行日志键
            logKey: 'deepseek_exec.log',
            // 队列命名空间
            queueNamespace: 'queue_deepseek',
            // 审计日志命名空间
            auditNamespace: 'audit_logs'
        },
        
        // 日志级别
        logLevel: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
        
        // 日志格式配置
        format: {
            // 是否包含时间戳
            includeTimestamp: true,
            // 是否包含日志级别
            includeLogLevel: true,
            // 是否包含上下文信息
            includeContext: true,
            // 日志格式模板
            template: '${timestamp} [${level}] ${message} ${context}'
        },
        
        // 日志文件配置
        fileConfig: {
            // 日志文件路径
            logFilePath: path.resolve('D:\\PDF转网页\\logs\\deepseek_execution.log'),
            // 是否启用文件日志
            enabled: true,
            // 日志文件编码
            encoding: 'utf8',
            // 日志轮转配置
            rotation: {
                // 是否启用日志轮转
                enabled: true,
                // 轮转策略：size（按大小）, daily（按天）
                strategy: 'daily',
                // 按大小轮转时的文件大小（MB）
                maxSizeMB: 100,
                // 保留的历史日志文件数量
                maxFiles: 10,
                // 是否压缩历史日志
                compress: true
            }
        },
        
        // 敏感信息过滤配置
        sensitiveInfoFilter: {
            // 是否启用敏感信息过滤
            enabled: true,
            // 过滤模式（regex或keywords）
            filterMode: 'regex',
            // 过滤的关键字列表
            keywords: ['password', 'secret', 'key', 'token', 'credential', 'authorization'],
            // 替换字符串
            replacement: '[FILTERED]'
        }
    },
    
    // 队列管理器配置
    queueManager: {
        // 队列存储配置
        storage: {
            // 队列本地存储路径
            queueStoragePath: path.resolve('d:\\PDF转网页\\queues\\deepseek_tasks.json'),
            // 存储格式：json, sqlite, memory
            storageFormat: 'json',
            // 持久化间隔（毫秒）
            persistenceIntervalMs: 5000
        },
        
        // 队列行为配置
        behavior: {
            // 自动重放配置
            autoReplayOnResume: true,
            // 检查间隔（毫秒）
            checkIntervalMs: 5000,
            // 最大队列长度
            maxQueueSize: 1000,
            // 任务超时时间（毫秒）
            taskTimeoutMs: 3600000 // 1小时
        },
        
        // 任务优先级配置
        priorities: {
            // 支持的优先级列表
            supported: ['high', 'normal', 'low'],
            // 默认优先级
            default: 'normal',
            // 优先级权重（用于排序）
            weights: {
                high: 0,
                normal: 1,
                low: 2
            }
        },
        
        // 重试配置
        retry: {
            // 默认最大重试次数
            maxAttempts: 3,
            // 初始延迟（毫秒）
            initialDelayMs: 1000,
            // 最大延迟（毫秒）
            maxDelayMs: 60000,
            // 重试策略：fixed（固定）, exponential（指数退避）
            strategy: 'exponential'
        },
        
        // 并发控制配置
        concurrency: {
            // 最大并发任务数
            maxConcurrentTasks: 3,
            // 是否启用并发控制
            enabled: true,
            // 资源限制配置
            resourceLimits: {
                // 内存使用限制（MB）
                maxMemoryUsageMB: 512,
                // CPU使用率限制（百分比）
                maxCpuUsagePercent: 80
            }
        }
    },
    
    // 测试配置
    testing: {
        // 测试模式
        enabled: false,
        // 测试环境配置
        testEnvironment: {
            // 模拟暂停状态
            simulatePaused: false,
            // 模拟认证失败
            simulateAuthFailure: false,
            // 模拟操作失败
            simulateOperationFailure: false,
            // 失败概率（百分比）
            failureProbability: 10
        },
        // 性能测试配置
        performanceTesting: {
            // 启用性能测试
            enabled: false,
            // 测试任务数量
            testTaskCount: 100,
            // 并发任务数
            concurrentTasks: 5
        }
    }
};

/**
 * 导出配置
 */
module.exports = {
    deepseekSecurityConfig,
    // 导出配置获取函数，支持环境变量覆盖
    getConfig: function(override = {}) {
        // 深度合并配置
        const mergedConfig = this._deepMerge({}, deepseekSecurityConfig, override);
        
        // 应用环境变量覆盖
        this._applyEnvironmentOverrides(mergedConfig);
        
        return mergedConfig;
    },
    
    /**
     * 深度合并对象
     */
    _deepMerge: function(target, source, override) {
        const output = { ...target };
        
        if (this._isObject(target) && this._isObject(source)) {
            Object.keys(source).forEach(key => {
                if (this._isObject(source[key])) {
                    if (!(key in target)) {
                        Object.assign(output, { [key]: source[key] });
                    } else {
                        output[key] = this._deepMerge(target[key], source[key]);
                    }
                } else {
                    Object.assign(output, { [key]: source[key] });
                }
            });
        }
        
        // 应用覆盖
        if (this._isObject(override)) {
            Object.keys(override).forEach(key => {
                if (this._isObject(override[key]) && this._isObject(output[key])) {
                    output[key] = this._deepMerge(output[key], override[key]);
                } else {
                    output[key] = override[key];
                }
            });
        }
        
        return output;
    },
    
    /**
     * 检查是否为对象
     */
    _isObject: function(item) {
        return item && typeof item === 'object' && !Array.isArray(item);
    },
    
    /**
     * 应用环境变量覆盖配置
     */
    _applyEnvironmentOverrides: function(config) {
        // 从环境变量读取配置覆盖
        // 例如: DEEPSEEK_MAX_RUNTIME=60 会覆盖 maxRuntimeMinutes 设置
        const envPrefix = 'DEEPSEEK_';
        
        Object.keys(process.env).forEach(key => {
            if (key.startsWith(envPrefix)) {
                const configKey = key.substring(envPrefix.length).toLowerCase();
                const value = process.env[key];
                
                // 尝试将环境变量映射到配置
                this._setNestedConfigValue(config, configKey, value);
            }
        });
    },
    
    /**
     * 设置嵌套配置值
     */
    _setNestedConfigValue: function(config, keyPath, value) {
        const keys = keyPath.split('_');
        let current = config;
        
        for (let i = 0; i < keys.length - 1; i++) {
            const key = keys[i];
            if (!current[key]) {
                current[key] = {};
            }
            current = current[key];
        }
        
        const lastKey = keys[keys.length - 1];
        
        // 尝试转换值类型
        if (value === 'true') {
            current[lastKey] = true;
        } else if (value === 'false') {
            current[lastKey] = false;
        } else if (!isNaN(value) && value !== '') {
            current[lastKey] = Number(value);
        } else {
            current[lastKey] = value;
        }
    }
};

// 导出到全局（浏览器环境）
if (typeof window !== 'undefined') {
    window.JEV = window.JEV || {};
    window.JEV.deepseekConfig = {
        deepseekSecurityConfig,
        getConfig: module.exports.getConfig
    };
}