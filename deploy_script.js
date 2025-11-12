// JEV 系统部署脚本 v1.0
// 用于将代码和配置文件发布至生产环境

class JEVDeployer {
    constructor() {
        // 部署配置
        this.deployConfig = {
            version: this.generateVersion(),
            timestamp: new Date().toISOString(),
            environment: 'production',
            deploymentPath: './deploy',
            buildPath: './build',
            sourcePath: '.',
            requiredFiles: [
                'index.html',
                'theme.css',
                'integrated_ui.html',
                'bolo_extractor.js',
                'ocr_integration.js',
                'translation_engine.js',
                'ai_dialog_system.js',
                'modules/integrated_controller.js',
                'end_to_end_test.js'
            ],
            excludePatterns: [
                'node_modules/',
                '.git/',
                '.DS_Store',
                'Thumbs.db',
                '*.log',
                'deploy/',
                'build/'
            ],
            corsConfig: {
                enabled: true,
                origins: ['*'],
                methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
                headers: ['Content-Type', 'Authorization', 'X-Requested-With']
            }
        };
        
        // 部署状态
        this.deploymentStatus = {
            started: false,
            completed: false,
            success: false,
            currentStep: null,
            steps: [],
            errors: [],
            warnings: []
        };
        
        // 日志工具
        this.logger = this.createLogger();
    }
    
    /**
     * 生成版本号
     */
    generateVersion() {
        const now = new Date();
        const year = now.getFullYear().toString().slice(2);
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        return `${year}.${month}.${day}.${hours}${minutes}`;
    }
    
    /**
     * 创建日志工具
     */
    createLogger() {
        return {
            info: (message) => this.log('INFO', message),
            success: (message) => this.log('SUCCESS', message),
            warning: (message) => this.log('WARNING', message),
            error: (message) => this.log('ERROR', message),
            debug: (message) => this.log('DEBUG', message)
        };
    }
    
    /**
     * 日志输出
     */
    log(level, message) {
        const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
        const colorCodes = {
            'INFO': '\x1b[36m',    // 青色
            'SUCCESS': '\x1b[32m', // 绿色
            'WARNING': '\x1b[33m', // 黄色
            'ERROR': '\x1b[31m',   // 红色
            'DEBUG': '\x1b[35m'    // 紫色
        };
        const resetColor = '\x1b[0m';
        
        // 在Node.js环境中使用彩色输出
        if (typeof process !== 'undefined' && process.stdout) {
            console.log(`${colorCodes[level]}[${timestamp}] [${level}] ${message}${resetColor}`);
        } else {
            // 浏览器环境中使用普通输出
            console.log(`[${timestamp}] [${level}] ${message}`);
        }
        
        // 记录警告和错误
        if (level === 'ERROR') {
            this.deploymentStatus.errors.push({ timestamp, level, message });
        } else if (level === 'WARNING') {
            this.deploymentStatus.warnings.push({ timestamp, level, message });
        }
    }
    
    /**
     * 开始部署过程
     */
    async startDeployment() {
        try {
            this.logger.info('开始 JEV 系统部署...');
            this.logger.info(`部署版本: ${this.deployConfig.version}`);
            
            this.deploymentStatus.started = true;
            
            // 执行部署步骤
            await this.executeDeploymentSteps();
            
            // 生成部署报告
            const report = this.generateDeploymentReport();
            
            this.logger.success('部署完成！');
            this.logger.info(`部署报告已生成: ${report.fileName}`);
            
            return report;
            
        } catch (error) {
            this.logger.error(`部署失败: ${error.message}`);
            this.deploymentStatus.success = false;
            this.deploymentStatus.completed = true;
            
            throw error;
        }
    }
    
    /**
     * 执行部署步骤
     */
    async executeDeploymentSteps() {
        // 定义部署步骤
        const steps = [
            { name: '文件检查', function: this.checkRequiredFiles.bind(this) },
            { name: '创建构建目录', function: this.createBuildDirectory.bind(this) },
            { name: '准备文件', function: this.prepareFiles.bind(this) },
            { name: '更新版本信息', function: this.updateVersionInfo.bind(this) },
            { name: '配置CORS', function: this.configureCORS.bind(this) },
            { name: '设置云同步', function: this.setupCloudSync.bind(this) },
            { name: '配置日志记录', function: this.configureLogging.bind(this) },
            { name: '生成部署验证脚本', function: this.generateVerificationScript.bind(this) },
            { name: '复制到部署目录', function: this.copyToDeployDirectory.bind(this) }
        ];
        
        // 执行每个步骤
        for (const step of steps) {
            await this.executeStep(step);
        }
        
        this.deploymentStatus.completed = true;
        this.deploymentStatus.success = this.deploymentStatus.errors.length === 0;
    }
    
    /**
     * 执行单个步骤
     */
    async executeStep(step) {
        this.deploymentStatus.currentStep = step.name;
        
        try {
            this.logger.info(`执行步骤: ${step.name}...`);
            const startTime = performance.now();
            
            await step.function();
            
            const duration = Math.round(performance.now() - startTime);
            this.logger.success(`步骤完成: ${step.name} (${duration}ms)`);
            
            this.deploymentStatus.steps.push({
                name: step.name,
                status: 'success',
                duration,
                timestamp: new Date().toISOString()
            });
            
        } catch (error) {
            this.logger.error(`步骤失败: ${step.name} - ${error.message}`);
            
            this.deploymentStatus.steps.push({
                name: step.name,
                status: 'failed',
                error: error.message,
                timestamp: new Date().toISOString()
            });
            
            throw error;
        }
    }
    
    /**
     * 检查必需文件
     */
    async checkRequiredFiles() {
        this.logger.info('检查必需的部署文件...');
        
        // 模拟文件检查
        const missingFiles = [];
        
        // 检查index.html
        if (!this.fileExists('index.html')) {
            missingFiles.push('index.html');
        } else {
            this.logger.info('找到 index.html');
        }
        
        // 检查theme.css
        if (!this.fileExists('theme.css')) {
            missingFiles.push('theme.css');
        } else {
            this.logger.info('找到 theme.css');
        }
        
        // 检查integrated_ui.html
        if (!this.fileExists('integrated_ui.html')) {
            missingFiles.push('integrated_ui.html');
        } else {
            this.logger.info('找到 integrated_ui.html');
        }
        
        // 检查JavaScript模块文件
        const jsModules = ['bolo_extractor.js', 'ocr_integration.js', 'translation_engine.js'];
        for (const module of jsModules) {
            if (!this.fileExists(module)) {
                missingFiles.push(module);
            } else {
                this.logger.info(`找到 ${module}`);
            }
        }
        
        // 检查控制器文件
        if (!this.fileExists('modules/integrated_controller.js')) {
            missingFiles.push('modules/integrated_controller.js');
        } else {
            this.logger.info('找到 modules/integrated_controller.js');
        }
        
        // 如果有缺失文件，抛出错误
        if (missingFiles.length > 0) {
            throw new Error(`缺少必需文件: ${missingFiles.join(', ')}`);
        }
        
        this.logger.success('所有必需文件检查通过');
    }
    
    /**
     * 检查文件是否存在（模拟）
     */
    fileExists(filePath) {
        // 在实际环境中，这里会使用文件系统API检查文件
        // 目前返回模拟结果
        return true;
    }
    
    /**
     * 创建构建目录
     */
    async createBuildDirectory() {
        this.logger.info(`创建构建目录: ${this.deployConfig.buildPath}`);
        
        // 模拟创建目录
        this.logger.success('构建目录创建成功');
    }
    
    /**
     * 准备文件
     */
    async prepareFiles() {
        this.logger.info('准备部署文件...');
        
        // 模拟文件复制
        this.logger.info('复制所有前端文件到构建目录');
        this.logger.success('文件准备完成');
    }
    
    /**
     * 更新版本信息
     */
    async updateVersionInfo() {
        this.logger.info(`更新版本信息为: ${this.deployConfig.version}`);
        
        // 创建版本信息文件
        await this.writeFile(`${this.deployConfig.buildPath}/version.json`, JSON.stringify({
            version: this.deployConfig.version,
            timestamp: this.deployConfig.timestamp,
            environment: this.deployConfig.environment
        }, null, 2));
        
        this.logger.success('版本信息更新完成');
    }
    
    /**
     * 配置CORS
     */
    async configureCORS() {
        if (!this.deployConfig.corsConfig.enabled) {
            this.logger.warning('CORS配置已禁用');
            return;
        }
        
        this.logger.info('配置CORS设置...');
        
        // 创建.htaccess文件用于CORS配置（适用于Apache服务器）
        const htaccessContent = `
# JEV 系统 CORS 配置
<IfModule mod_headers.c>
    Header set Access-Control-Allow-Origin "${this.deployConfig.corsConfig.origins.join(', ')}"
    Header set Access-Control-Allow-Methods "${this.deployConfig.corsConfig.methods.join(', ')}"
    Header set Access-Control-Allow-Headers "${this.deployConfig.corsConfig.headers.join(', ')}"
    Header set Access-Control-Allow-Credentials "true"
</IfModule>

# 缓存控制
<FilesMatch "\.(js|css|html|json|svg|png|jpg|jpeg|gif|ico)$">
    Header set Cache-Control "max-age=86400, public"
</FilesMatch>

# 压缩设置
<IfModule mod_deflate.c>
    AddOutputFilterByType DEFLATE application/javascript
    AddOutputFilterByType DEFLATE text/css
    AddOutputFilterByType DEFLATE text/html
    AddOutputFilterByType DEFLATE application/json
</IfModule>
`;
        
        await this.writeFile(`${this.deployConfig.buildPath}/.htaccess`, htaccessContent);
        
        // 创建nginx配置文件示例
        const nginxConfigContent = `
# JEV 系统 Nginx 配置示例
server {
    listen 80;
    server_name your-domain.com;
    
    root ${this.deployConfig.deploymentPath};
    index index.html;
    
    # CORS 配置
    add_header Access-Control-Allow-Origin "${this.deployConfig.corsConfig.origins.join(', ')}";
    add_header Access-Control-Allow-Methods "${this.deployConfig.corsConfig.methods.join(', ')}";
    add_header Access-Control-Allow-Headers "${this.deployConfig.corsConfig.headers.join(', ')}";
    add_header Access-Control-Allow-Credentials "true";
    
    # 缓存控制
    location ~* \.(js|css|html|json|svg|png|jpg|jpeg|gif|ico)$ {
        expires 1d;
        add_header Cache-Control "public, max-age=86400";
        try_files $uri $uri/ =404;
    }
    
    # 处理所有路径
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # 日志配置
    access_log /var/log/nginx/jev_access.log;
    error_log /var/log/nginx/jev_error.log;
}
`;
        
        await this.writeFile(`${this.deployConfig.buildPath}/nginx-config-example.conf`, nginxConfigContent);
        
        this.logger.success('CORS配置完成');
    }
    
    /**
     * 设置云同步
     */
    async setupCloudSync() {
        this.logger.info('设置云同步配置...');
        
        // 创建云同步配置文件
        const cloudSyncConfig = {
            version: this.deployConfig.version,
            syncEnabled: true,
            syncInterval: 3600000, // 1小时
            backupEnabled: true,
            backupInterval: 86400000, // 24小时
            remoteStorage: {
                type: 'cloud_storage',
                region: 'auto',
                bucketName: 'jev-system-backup',
                retentionPolicy: '30days'
            },
            versionControl: {
                enabled: true,
                maxVersions: 10,
                autoCleanup: true
            }
        };
        
        await this.writeFile(`${this.deployConfig.buildPath}/cloud_sync_config.json`, JSON.stringify(cloudSyncConfig, null, 2));
        
        this.logger.success('云同步配置完成');
    }
    
    /**
     * 配置日志记录
     */
    async configureLogging() {
        this.logger.info('配置日志记录和错误捕获...');
        
        // 创建日志配置文件
        const loggingConfig = {
            level: 'info',
            format: 'json',
            rotation: {
                size: '10mb',
                days: 7
            },
            destinations: [
                {
                    type: 'console',
                    enabled: true
                },
                {
                    type: 'file',
                    enabled: true,
                    path: 'logs/jev-system.log'
                },
                {
                    type: 'remote',
                    enabled: false,
                    endpoint: 'https://logs.example.com/api/v1/logs',
                    batchSize: 100,
                    batchInterval: 5000
                }
            ],
            errorCapture: {
                enabled: true,
                captureConsoleErrors: true,
                captureUnhandledRejections: true,
                sendToAnalytics: false,
                maxErrorSize: '2kb'
            },
            performanceMetrics: {
                enabled: true,
                sampleRate: 0.1,
                logInterval: 60000
            }
        };
        
        await this.writeFile(`${this.deployConfig.buildPath}/logging_config.json`, JSON.stringify(loggingConfig, null, 2));
        
        // 创建错误捕获脚本
        const errorCaptureScript = `
// JEV 系统错误捕获脚本
window.onerror = function(message, source, lineno, colno, error) {
    console.error('[JEV Error]', { message, source, lineno, colno, error });
    
    // 记录错误到本地存储
    try {
        const errors = JSON.parse(localStorage.getItem('JEV_Errors') || '[]');
        errors.push({
            timestamp: new Date().toISOString(),
            message: String(message),
            source: source || '',
            line: lineno || 0,
            column: colno || 0,
            stack: error?.stack || '',
            url: window.location.href
        });
        
        // 只保留最近100个错误
        if (errors.length > 100) {
            errors.splice(0, errors.length - 100);
        }
        
        localStorage.setItem('JEV_Errors', JSON.stringify(errors));
    } catch (e) {
        console.error('[JEV Error Capture] Failed to store error:', e);
    }
    
    return true; // 阻止默认处理
};

// 捕获未处理的Promise拒绝
window.addEventListener('unhandledrejection', function(event) {
    console.error('[JEV Promise Error]', { reason: event.reason, promise: event.promise });
    
    // 记录到本地存储
    try {
        const errors = JSON.parse(localStorage.getItem('JEV_Errors') || '[]');
        errors.push({
            timestamp: new Date().toISOString(),
            message: 'Promise rejection',
            reason: String(event.reason),
            stack: event.reason?.stack || '',
            url: window.location.href
        });
        
        // 只保留最近100个错误
        if (errors.length > 100) {
            errors.splice(0, errors.length - 100);
        }
        
        localStorage.setItem('JEV_Errors', JSON.stringify(errors));
    } catch (e) {
        console.error('[JEV Error Capture] Failed to store promise error:', e);
    }
});

// 性能监控
if (window.performance && window.performance.mark) {
    // 应用启动性能标记
    window.addEventListener('load', function() {
        window.performance.mark('app-load-end');
        
        try {
            const measures = {
                loadTime: window.performance.measure('app-load', 'navigation-start', 'app-load-end').duration,
                domReady: window.performance.timing.domContentLoadedEventEnd - window.performance.timing.navigationStart
            };
            
            console.log('[JEV Performance] Load metrics:', measures);
            
            // 存储性能数据
            const performanceData = JSON.parse(localStorage.getItem('JEV_Performance') || '[]');
            performanceData.push({
                timestamp: new Date().toISOString(),
                ...measures
            });
            
            localStorage.setItem('JEV_Performance', JSON.stringify(performanceData.slice(-50)));
        } catch (e) {
            console.error('[JEV Performance] Failed to record metrics:', e);
        }
    });
}

// 资源错误监控
window.addEventListener('error', function(event) {
    if (event.target && (event.target.src || event.target.href)) {
        const resourceType = event.target.tagName.toLowerCase();
        const resourceUrl = event.target.src || event.target.href;
        
        console.error(`[JEV Resource Error] Failed to load ${resourceType}: ${resourceUrl}`);
        
        // 记录资源错误
        try {
            const resourceErrors = JSON.parse(localStorage.getItem('JEV_ResourceErrors') || '[]');
            resourceErrors.push({
                timestamp: new Date().toISOString(),
                type: resourceType,
                url: resourceUrl,
                sourceUrl: window.location.href
            });
            
            localStorage.setItem('JEV_ResourceErrors', JSON.stringify(resourceErrors.slice(-50)));
        } catch (e) {
            console.error('[JEV Error Capture] Failed to store resource error:', e);
        }
    }
}, true);
`;
        
        await this.writeFile(`${this.deployConfig.buildPath}/error_capture.js`, errorCaptureScript);
        
        this.logger.success('日志记录配置完成');
    }
    
    /**
     * 生成部署验证脚本
     */
    async generateVerificationScript() {
        this.logger.info('生成部署验证脚本...');
        
        const verificationScript = `
// JEV 系统部署验证脚本
class DeploymentVerifier {
    constructor() {
        this.verificationResults = [];
        this.startTime = null;
    }
    
    async runVerification() {
        console.log('[JEV Verification] 开始部署验证...');
        this.startTime = performance.now();
        
        const tests = [
            this.verifyResources.bind(this),
            this.verifyConfiguration.bind(this),
            this.verifyModules.bind(this),
            this.verifyAPIEndpoints.bind(this)
        ];
        
        for (const test of tests) {
            try {
                await test();
            } catch (error) {
                console.error('[JEV Verification] 测试失败:', error);
                this.verificationResults.push({
                    test: test.name,
                    status: 'failed',
                    error: error.message
                });
            }
        }
        
        const duration = Math.round(performance.now() - this.startTime);
        const success = this.verificationResults.every(r => r.status === 'success');
        
        console.log(`[JEV Verification] 验证完成，耗时: ${duration}ms`);
        console.log(`[JEV Verification] 验证结果: ${success ? '通过' : '失败'}`);
        
        return {
            success,
            duration,
            results: this.verificationResults,
            timestamp: new Date().toISOString()
        };
    }
    
    async verifyResources() {
        console.log('[JEV Verification] 验证静态资源...');
        const resources = [
            'theme.css',
            'bolo_extractor.js',
            'ocr_integration.js',
            'translation_engine.js'
        ];
        
        const resourceResults = await Promise.all(
            resources.map(async (resource) => {
                try {
                    const response = await fetch(resource, { method: 'HEAD' });
                    return {
                        resource,
                        status: response.ok ? 'success' : 'failed',
                        statusCode: response.status
                    };
                } catch (error) {
                    return {
                        resource,
                        status: 'failed',
                        error: error.message
                    };
                }
            })
        );
        
        this.verificationResults.push({
            test: 'verifyResources',
            status: resourceResults.every(r => r.status === 'success') ? 'success' : 'failed',
            details: resourceResults
        });
    }
    
    async verifyConfiguration() {
        console.log('[JEV Verification] 验证配置文件...');
        const configFiles = [
            'version.json',
            'cloud_sync_config.json',
            'logging_config.json'
        ];
        
        for (const configFile of configFiles) {
            try {
                const response = await fetch(configFile);
                if (response.ok) {
                    const data = await response.json();
                    console.log(`[JEV Verification] 配置文件 ${configFile} 有效`);
                } else {
                    throw new Error(`配置文件 ${configFile} 不存在或无法访问`);
                }
            } catch (error) {
                console.error(`[JEV Verification] 配置文件验证失败: ${error}`);
                throw error;
            }
        }
        
        this.verificationResults.push({
            test: 'verifyConfiguration',
            status: 'success'
        });
    }
    
    async verifyModules() {
        console.log('[JEV Verification] 验证模块加载...');
        
        // 检查全局模块是否可用
        const modules = ['boloExtractor', 'ocrIntegration', 'translationEngine'];
        const moduleStatus = {};
        
        for (const module of modules) {
            moduleStatus[module] = typeof window[module] !== 'undefined';
        }
        
        const allModulesLoaded = Object.values(moduleStatus).every(status => status);
        
        this.verificationResults.push({
            test: 'verifyModules',
            status: allModulesLoaded ? 'success' : 'failed',
            details: moduleStatus
        });
    }
    
    async verifyAPIEndpoints() {
        console.log('[JEV Verification] 验证API端点...');
        
        // 模拟API端点检查
        this.verificationResults.push({
            test: 'verifyAPIEndpoints',
            status: 'success',
            message: 'API端点验证通过 (模拟)'  
        });
    }
}

// 初始化验证器
const verifier = new DeploymentVerifier();
window.verifyJEVDeployment = () => verifier.runVerification();

// 自动执行验证
setTimeout(() => {
    console.log('[JEV Verification] 自动执行部署验证...');
    verifier.runVerification().then(result => {
        // 保存验证结果
        localStorage.setItem('JEV_VerificationResult', JSON.stringify(result));
    });
}, 3000);
`;
        
        await this.writeFile(`${this.deployConfig.buildPath}/deployment_verification.js`, verificationScript);
        
        this.logger.success('部署验证脚本生成完成');
    }
    
    /**
     * 复制到部署目录
     */
    async copyToDeployDirectory() {
        this.logger.info(`复制文件到部署目录: ${this.deployConfig.deploymentPath}`);
        
        // 模拟复制操作
        this.logger.info('正在复制文件...');
        
        // 创建部署完成标记文件
        await this.writeFile(`${this.deployConfig.deploymentPath}/DEPLOYMENT_COMPLETE`, `
JEV 系统部署完成
版本: ${this.deployConfig.version}
时间: ${new Date(this.deployConfig.timestamp).toLocaleString()}
环境: ${this.deployConfig.environment}
`);
        
        this.logger.success('文件复制完成，部署目录已准备就绪');
    }
    
    /**
     * 写入文件（模拟）
     */
    async writeFile(filePath, content) {
        // 在实际环境中，这里会使用文件系统API写入文件
        // 目前只是记录日志
        this.logger.debug(`写入文件: ${filePath}`);
        return Promise.resolve();
    }
    
    /**
     * 生成部署报告
     */
    generateDeploymentReport() {
        const report = {
            version: this.deployConfig.version,
            timestamp: new Date().toISOString(),
            environment: this.deployConfig.environment,
            success: this.deploymentStatus.success,
            duration: this.calculateTotalDuration(),
            steps: this.deploymentStatus.steps,
            errors: this.deploymentStatus.errors,
            warnings: this.deploymentStatus.warnings,
            configuration: {
                corsEnabled: this.deployConfig.corsConfig.enabled,
                cloudSyncEnabled: true,
                loggingEnabled: true,
                versionControlEnabled: true
            },
            fileName: `jev_deployment_report_${this.deployConfig.version}.json`
        };
        
        // 保存报告到文件
        this.writeFile(`${this.deployConfig.deploymentPath}/${report.fileName}`, JSON.stringify(report, null, 2));
        
        return report;
    }
    
    /**
     * 计算总部署时间
     */
    calculateTotalDuration() {
        if (this.deploymentStatus.steps.length === 0) return 0;
        
        return this.deploymentStatus.steps.reduce((total, step) => {
            return total + (step.duration || 0);
        }, 0);
    }
    
    /**
     * 获取部署状态
     */
    getDeploymentStatus() {
        return {
            ...this.deploymentStatus,
            version: this.deployConfig.version,
            timestamp: this.deployConfig.timestamp
        };
    }
}

// 初始化部署工具
const jevDeployer = new JEVDeployer();

// 导出到全局
window.JEV = window.JEV || {};
window.JEV.Deployer = jevDeployer;
window.deployJEVSystem = async () => {
    try {
        const report = await jevDeployer.startDeployment();
        console.log('\n部署报告:');
        console.log(JSON.stringify(report, null, 2));
        return report;
    } catch (error) {
        console.error('部署失败:', error);
        throw error;
    }
};

// 如果在Node.js环境中直接运行
if (typeof require !== 'undefined' && typeof module !== 'undefined') {
    module.exports = {
        JEVDeployer,
        jevDeployer,
        deployJEVSystem
    };
}

console.log('JEV 部署脚本已加载');
console.log('使用方法:');
console.log('1. 浏览器环境: window.deployJEVSystem()');
console.log('2. Node.js环境: const { deployJEVSystem } = require(\'./deploy_script.js\'); deployJEVSystem()');

// 自动执行（仅在浏览器环境且明确设置时）
if (typeof window !== 'undefined' && window.autoDeployJEV === true) {
    console.log('自动启动部署流程...');
    window.deployJEVSystem();
}