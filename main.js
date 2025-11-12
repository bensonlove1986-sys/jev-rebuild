// JEV Client v7.0 - 模块加载与系统初始化逻辑

class JEVModuleManager {
    constructor() {
        this.modules = [];
        this.loadedModules = 0;
        this.totalModules = 0;
        this.config = null;
        this.manifest = null;
        this.initialized = false;
    }
    
    async initialize() {
        try {
            // 加载配置
            await this.loadConfig();
            
            // 加载模块清单
            await this.loadModuleManifest();
            
            // 检查登录状态
            if (!this.checkLoginStatus()) {
                window.location.href = 'ui/login_portal.html';
                return;
            }
            
            // 启动模块加载
            this.startModuleLoading();
            
            // 验证VisionBridge
            await this.verifyVisionBridge();
            
            // 检查Sentinel状态
            await this.checkSentinelStatus();
            
            // 初始化完成
            this.initialized = true;
            console.log('🧠 JEV Client v7.0 初始化完成');
            
        } catch (error) {
            console.error('JEV初始化失败:', error);
            this.updateStatus('auth-status', '❌ VisionBridge 验证失败', true);
        }
    }
    
    async loadConfig() {
        try {
            const response = await fetch('config/settings.json');
            this.config = await response.json();
            console.log('配置加载成功:', this.config);
        } catch (error) {
            console.warn('配置加载失败，使用默认配置:', error);
            this.config = {
                owner_id: 'default-owner',
                environment: 'local',
                auto_start_modules: true,
                enable_security_guard: true,
                require_invite: true
            };
        }
    }
    
    async loadModuleManifest() {
        try {
            const response = await fetch('jev_module_manifest.json');
            this.manifest = await response.json();
            this.totalModules = this.manifest.modules.length;
            console.log('模块清单加载成功，共', this.totalModules, '个模块');
        } catch (error) {
            console.warn('模块清单加载失败，使用默认模块:', error);
            this.manifest = {
                modules: [
                    { id: 'core', name: '核心模块', path: 'modules/core.js' },
                    { id: 'auth', name: '认证模块', path: 'modules/auth.js' },
                    { id: 'ui', name: '界面模块', path: 'modules/ui.js' },
                    { id: 'data', name: '数据模块', path: 'modules/data.js' },
                    { id: 'api', name: 'API模块', path: 'modules/api.js' },
                    { id: 'security', name: '安全模块', path: 'modules/security.js' },
                    { id: 'invite', name: '邀请码模块', path: 'modules/inviteCodeManager.js' },
                    { id: 'monitor', name: '监控模块', path: 'modules/monitor.js' }
                ]
            };
            this.totalModules = this.manifest.modules.length;
        }
    }
    
    checkLoginStatus() {
        const authToken = localStorage.getItem('jev_auth_token');
        const inviteVerified = localStorage.getItem('jev_invite_verified') === 'true';
        return authToken && inviteVerified;
    }
    
    async startModuleLoading() {
        this.updateStatus('module-status', '🔄 模块加载中...');
        
        if (!this.config.auto_start_modules) {
            this.updateStatus('module-status', '⚠️ 自动加载已禁用');
            return;
        }
        
        // 模拟模块加载
        const modulePromises = [];
        
        // 确保邀请码管理器模块被优先加载
        const inviteModule = this.manifest.modules.find(m => m.id === 'invite') || 
                           { path: 'modules/inviteCodeManager.js' };
        
        modulePromises.push(this.loadModule(inviteModule.path, 'invite'));
        
        // 加载其他模块
        this.manifest.modules.forEach(module => {
            if (module.id !== 'invite') {
                modulePromises.push(this.loadModule(module.path, module.id));
            }
        });
        
        await Promise.all(modulePromises);
        
        this.updateStatus('module-status', `✅ 模块加载完成：${this.loadedModules}/${this.totalModules}`);
    }
    
    async loadModule(modulePath, moduleId) {
        try {
            const moduleScript = document.createElement('script');
            moduleScript.src = modulePath;
            moduleScript.defer = true;
            
            return new Promise((resolve) => {
                moduleScript.onload = () => {
                    this.loadedModules++;
                    console.log(`✅ 模块已加载: ${moduleId} (${this.loadedModules}/${this.totalModules})`);
                    this.updateStatus('module-status', `🔄 模块加载中... ${this.loadedModules}/${this.totalModules}`);
                    resolve();
                };
                
                moduleScript.onerror = () => {
                    console.error(`❌ 模块加载失败: ${moduleId}`);
                    this.loadedModules++;
                    resolve();
                };
                
                document.head.appendChild(moduleScript);
            });
        } catch (error) {
            console.error(`模块加载异常: ${moduleId}`, error);
            return Promise.resolve();
        }
    }
    
    async verifyVisionBridge() {
        try {
            this.updateStatus('auth-status', '🔐 VisionBridge 验证中...');
            
            // 模拟VisionBridge验证
            return new Promise((resolve) => {
                setTimeout(() => {
                    const confidence = (90 + Math.random() * 10).toFixed(2);
                    localStorage.setItem('jev_auth_token', 'mock-auth-token-' + Date.now());
                    localStorage.setItem('jev_vision_verified', 'true');
                    
                    this.updateStatus('auth-status', `✅ VisionBridge 验证通过（置信度 ${confidence}）`);
                    resolve();
                }, 1500);
            });
        } catch (error) {
            console.error('❌ VisionBridge 验证失败:', error);
            throw error;
        }
    }
    
    async checkSentinelStatus() {
        try {
            this.updateStatus('sentinel-status', '🛰 Sentinel 检查中...');
            
            // 模拟Sentinel检查
            return new Promise((resolve) => {
                setTimeout(() => {
                    this.updateStatus('sentinel-status', '✅ Sentinel 在线');
                    resolve();
                }, 800);
            });
        } catch (error) {
            console.error('❌ Sentinel 状态检查失败:', error);
            return false;
        }
    }
    
    updateStatus(elementId, message, isError = false) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = message;
            element.className = isError ? 'status-error' : 'status-normal';
        }
        console.log(`状态更新: ${message}`);
    }
}

// 全局初始化
const jevManager = new JEVModuleManager();

window.addEventListener('DOMContentLoaded', () => {
    console.log('🌐 JEV Client v7.0 启动中...');
    jevManager.initialize().catch(error => {
        console.error('全局初始化失败:', error);
    });
});
