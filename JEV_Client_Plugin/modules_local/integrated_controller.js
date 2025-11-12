/**
 * JEV插件整合控制器
 * 阶段一：基础架构与核心组件开发
 */
class JEVController {
    constructor() {
        // 模块注册表
        this.modules = {};
        
        // 事件总线
        this.eventBus = {
            subscribers: {}
        };
        
        // 状态缓存系统
        this.stateCache = {};
        
        // 初始化
        this.initialize();
    }
    
    /**
     * 初始化控制器
     */
    initialize() {
        try {
            // 从本地存储恢复状态
            this.restoreState();
            
            // 注册到全局窗口对象
            window.JEVController = this;
            
            console.log('[JEV] Integrated Controller initialized');
            
            return true;
        } catch (error) {
            console.error('[JEV] Failed to initialize controller:', error);
            return false;
        }
    }
    
    /**
     * 模块注册机制
     */
    registerModule(moduleName, moduleInstance) {
        try {
            if (!moduleName || typeof moduleName !== 'string') {
                throw new Error('Module name must be a non-empty string');
            }
            
            this.modules[moduleName] = moduleInstance;
            
            // 触发模块注册事件
            this.emit('module.registered', { moduleName, timestamp: Date.now() });
            
            console.log(`[JEV] Module registered: ${moduleName}`);
            
            return true;
        } catch (error) {
            console.error('[JEV] Failed to register module:', error);
            return false;
        }
    }
    
    /**
     * 事件总线 - 订阅事件
     */
    on(eventName, callback) {
        try {
            if (!eventName || typeof eventName !== 'string') {
                throw new Error('Event name must be a non-empty string');
            }
            
            if (!callback || typeof callback !== 'function') {
                throw new Error('Callback must be a function');
            }
            
            if (!this.eventBus.subscribers[eventName]) {
                this.eventBus.subscribers[eventName] = [];
            }
            
            this.eventBus.subscribers[eventName].push(callback);
            
            return true;
        } catch (error) {
            console.error('[JEV] Failed to subscribe to event:', error);
            return false;
        }
    }
    
    /**
     * 事件总线 - 发布事件
     */
    emit(eventName, data) {
        try {
            if (!eventName || typeof eventName !== 'string') {
                throw new Error('Event name must be a non-empty string');
            }
            
            const subscribers = this.eventBus.subscribers[eventName];
            if (subscribers && subscribers.length > 0) {
                subscribers.forEach(callback => {
                    try {
                        callback(data);
                    } catch (callbackError) {
                        console.error(`[JEV] Error in event handler for ${eventName}:`, callbackError);
                    }
                });
            }
            
            return true;
        } catch (error) {
            console.error('[JEV] Failed to emit event:', error);
            return false;
        }
    }
    
    /**
     * 状态缓存系统 - 设置状态
     */
    setState(key, value) {
        try {
            this.stateCache[key] = value;
            
            // 保存到本地存储
            this.saveState();
            
            // 触发状态变更事件
            this.emit('state.changed', { key, value });
            
            return true;
        } catch (error) {
            console.error('[JEV] Failed to set state:', error);
            return false;
        }
    }
    
    /**
     * 状态缓存系统 - 获取状态
     */
    getState(key) {
        return this.stateCache[key];
    }
    
    /**
     * 状态缓存系统 - 保存状态到本地存储
     */
    saveState() {
        try {
            localStorage.setItem('JEV_STATE_CACHE', JSON.stringify(this.stateCache));
            return true;
        } catch (error) {
            console.error('[JEV] Failed to save state to localStorage:', error);
            return false;
        }
    }
    
    /**
     * 状态缓存系统 - 从本地存储恢复状态
     */
    restoreState() {
        try {
            const savedState = localStorage.getItem('JEV_STATE_CACHE');
            if (savedState) {
                this.stateCache = JSON.parse(savedState);
                console.log('[JEV] State restored from localStorage');
            }
            return true;
        } catch (error) {
            console.error('[JEV] Failed to restore state from localStorage:', error);
            this.stateCache = {};
            return false;
        }
    }
    
    /**
     * 系统测试功能
     */
    runSystemTest() {
        try {
            console.log('[JEV] Running system test...');
            
            // 测试1: 注册testModule
            const testModule = { name: 'testModule', version: '1.0.0' };
            const registerResult = this.registerModule('testModule', testModule);
            
            if (!registerResult || !this.modules['testModule']) {
                console.error('[JEV] Module registration test failed');
                return false;
            }
            
            // 测试2: 触发statusCheck事件
            console.log('[JEV] Emitting statusCheck event...');
            this.emit('statusCheck', { timestamp: Date.now() });
            
            // 测试3: 状态缓存系统
            this.setState('testKey', 'testValue');
            const stateValue = this.getState('testKey');
            
            if (stateValue !== 'testValue') {
                console.error('[JEV] State cache test failed');
                return false;
            }
            
            console.log('[JEV] Core systems online');
            console.log('[JEV] All tests passed successfully!');
            
            // 触发测试完成事件
            this.emit('system.test.completed', { success: true });
            
            return true;
        } catch (error) {
            console.error('[JEV] System test failed:', error);
            return false;
        }
    }
    
    /**
     * 执行上传测试
     */
    async runUploadTest() {
        try {
            // 确保上传管理器可用
            if (!window.jevUploadManager) {
                console.error('[JEV] Upload manager not available');
                return false;
            }
            
            // 执行测试上传
            const testFilePath = 'integrated_controller.js';
            const testVersion = 'v1.0';
            
            console.log(`[JEV] Testing upload for ${testFilePath} with version ${testVersion}`);
            
            // 调用上传管理器的uploadFile方法
            const uploadResult = await window.jevUploadManager.uploadFile(testFilePath, testVersion);
            
            console.log('[JEV] Upload test completed:', uploadResult);
            return uploadResult;
        } catch (error) {
            console.error('[JEV] Upload test failed:', error);
            return false;
        }
    }
    
    /**
     * 获取系统信息
     */
    getSystemInfo() {
        return {
            controllerVersion: '1.0.0',
            registeredModules: Object.keys(this.modules),
            totalEvents: Object.keys(this.eventBus.subscribers).length,
            stateKeys: Object.keys(this.stateCache),
            isInitialized: true
        };
    }
}

// 创建控制器实例并初始化
const controllerInstance = new JEVController();

// 如果支持模块化导出
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = controllerInstance;
}

// 导出到全局
window.JEVController = controllerInstance;
