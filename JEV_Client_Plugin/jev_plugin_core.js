// ==UserScript==
// @name         JEV Plugin v2.0 - 模块化AI客服插件
// @namespace    http://tampermonkey.net/
// @version      2.0.0
// @description  JEV Plugin v2.0 模块化云端客服插件体系
// @author       JEV Team
// @match        *://*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_xmlhttpRequest
// @grant        GM_registerMenuCommand
// @grant        GM_unregisterMenuCommand
// @grant        GM_getResourceText
// @grant        GM_addStyle
// @require      https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js
// @require      https://cdn.jsdelivr.net/npm/luxon@3.4.4/build/global/luxon.min.js
// @resource     STYLE_DARK ./style.css
// @icon         https://jevshop.workers.dev/favicon.ico
// @updateURL    https://jevshop.workers.dev/update/plugin
// @downloadURL  https://jevshop.workers.dev/download/plugin
// @license      MIT
// ==/UserScript==

(function() {
    'use strict';

    console.log('[JEV Plugin v2.0] 开始加载智能客服插件系统...');

    // 全局配置增强
    const JEV_CONFIG = {
        version: '2.0.0',
        lockStatus: 'ACTIVE',
        relayUrl: '',
        licenseKey: '',
        deviceId: generateDeviceId(),
        hotUpdateInterval: 6 * 60 * 60 * 1000, // 6小时
        baseUrl: 'https://jevshop.workers.dev',
        localBasePath: 'modules_local/',
        relayBaseUrl: 'http://localhost:3000/relay',
        apiEndpoints: {
            inviteVerify: 'https://control.jevshop.workers.dev/api/invite/verify',
            moduleLoad: 'https://jevshop.workers.dev/api/modules/load',
            updateCheck: 'https://control.jevshop.workers.dev/api/plugin/update-check'
        },
        modules: [
            'storage_manager',
            'register',
            'toggle_manager',
            'relay_connector',
            'ui_panel'
        ],
        cloudModules: [
            'translation_engine',
            'ai_responder',
            'ocr_engine',
            'profit_calc',
            'pi_generator',
            'semantic_analyzer',
            'task_tracker',
            'security_guard'
        ],
        storageKeys: {
            license: 'jev_plugin_license',
            deviceId: 'jev_plugin_device_id',
            settings: 'jev_plugin_settings',
            lastSync: 'jev_plugin_last_sync'
        },
        defaultSettings: {
            autoStart: true,
            showPanel: true,
            language: 'zh-CN',
            theme: 'dark',
            logLevel: 'info'
        }
    };

    // 全局对象增强
    window.JEV = {
        config: JEV_CONFIG,
        version: JEV_CONFIG.version,
        isInitialized: false,
        modules: {},
        cloudModules: {},
        settings: {},
        license: null,
        deviceId: JEV_CONFIG.deviceId,
        status: {
            initialized: false,
            authenticated: false,
            modulesLoaded: false,
            featuresEnabled: false
        },
        utils: {},
        core: {},
        api: {}
    };

    // 生成设备ID
    function generateDeviceId() {
        let deviceId = localStorage.getItem(JEV_CONFIG.storageKeys.deviceId);
        if (!deviceId) {
            deviceId = 'DEV-' + Date.now() + '-' + Math.random().toString(36).substring(2, 8).toUpperCase();
            localStorage.setItem(JEV_CONFIG.storageKeys.deviceId, deviceId);
        }
        return deviceId;
    }

    // 日志记录器增强
    const Logger = {
        levels: { DEBUG: 0, INFO: 1, WARNING: 2, ERROR: 3 },
        currentLevel: JEV_CONFIG.defaultSettings.logLevel,
        
        log(level, message) {
            const levelNum = this.levels[level];
            if (levelNum >= this.levels[this.currentLevel]) {
                console.log(`[JEV][${level}] ${message}`);
            }
        },
        
        debug(message) { this.log('DEBUG', message); },
        info(message) { this.log('INFO', message); },
        warning(message) { this.log('WARNING', message); },
        error(message) { this.log('ERROR', message); }
    };

    // 工具函数增强
    window.JEV.utils = {
        log: Logger.log.bind(Logger),
        error: function(message, error) {
            Logger.error(`${message} ${error ? error.message : ''}`);
            if (error) console.error(error);
        },
        ajax: function(url, options) {
            return new Promise((resolve, reject) => {
                GM_xmlhttpRequest({
                    url: url,
                    method: options.method || 'GET',
                    headers: options.headers || {},
                    data: options.data,
                    onload: function(response) {
                        try {
                            resolve({
                                status: response.status,
                                responseText: response.responseText,
                                responseJSON: response.responseText ? JSON.parse(response.responseText) : null
                            });
                        } catch (e) {
                            reject(new Error('JSON解析失败'));
                        }
                    },
                    onerror: function(error) {
                        reject(error);
                    }
                });
            });
        },
        loadScript: function(url, callback) {
            const script = document.createElement('script');
            script.src = url;
            script.onload = callback;
            script.onerror = () => {
                JEV.utils.error('加载脚本失败', url);
            };
            document.head.appendChild(script);
        },
        loadStyle: function(cssContent) {
            GM_addStyle(cssContent);
        },
        debounce: function(func, wait) {
            let timeout;
            return function(...args) {
                clearTimeout(timeout);
                timeout = setTimeout(() => func.apply(this, args), wait);
            };
        },
        loadLocalModule: function(moduleName) {
            const moduleUrl = `${JEV_CONFIG.localBasePath}${moduleName}.js`;
            return new Promise((resolve, reject) => {
                GM_xmlhttpRequest({
                    method: 'GET',
                    url: moduleUrl,
                    onload: function(response) {
                        try {
                            eval(response.responseText);
                            Logger.info(`本地模块 ${moduleName} 已加载`);
                            resolve(moduleName);
                        } catch (error) {
                            Logger.error(`执行模块 ${moduleName} 失败: ${error.message}`);
                            reject(error);
                        }
                    },
                    onerror: function(error) {
                        Logger.error(`加载模块 ${moduleName} 失败: ${error.message}`);
                        reject(error);
                    }
                });
            });
        }
    };

    // 核心功能增强
    window.JEV.core = {
        // 初始化插件
        init: async function() {
            try {
                JEV.utils.log('INFO', '开始初始化插件系统');
                
                // 加载设置
                this.loadSettings();
                
                // 加载样式
                await this.loadStyles();
                
                // 加载本地模块
                await this.loadLocalModules();
                
                // 检查登录状态
                await this.checkAuthStatus();
                
                // 初始化功能模块
                await this.initializeModules();
                
                // 设置热更新
                this.setupHotUpdate();
                
                // 设置菜单命令
                this.setupMenuCommands();
                
                JEV.status.initialized = true;
                JEV.isInitialized = true;
                JEV.utils.log('INFO', '插件初始化完成');
            } catch (error) {
                JEV.utils.error('插件初始化失败', error);
                // 显示错误提示
                this.showErrorNotification('插件初始化失败，请刷新页面重试');
            }
        },
        
        // 加载设置
        loadSettings: function() {
            try {
                const savedSettings = localStorage.getItem(JEV_CONFIG.storageKeys.settings);
                if (savedSettings) {
                    JEV.settings = JSON.parse(savedSettings);
                } else {
                    JEV.settings = { ...JEV_CONFIG.defaultSettings };
                }
                
                // 加载许可证
                JEV.license = localStorage.getItem(JEV_CONFIG.storageKeys.license);
            } catch (error) {
                JEV.utils.error('加载设置失败', error);
                JEV.settings = { ...JEV_CONFIG.defaultSettings };
            }
        },
        
        // 保存设置
        saveSettings: function() {
            try {
                localStorage.setItem(JEV_CONFIG.storageKeys.settings, JSON.stringify(JEV.settings));
                JEV.utils.log('INFO', '设置已保存');
            } catch (error) {
                JEV.utils.error('保存设置失败', error);
            }
        },
        
        // 加载样式
        loadStyles: async function() {
            try {
                // 基础样式（与原代码保持一致）
                const cssContent = `
                    /* JEV Plugin v2.0 基础样式 */
                    .jev-plugin-container {
                        position: fixed;
                        right: 20px;
                        bottom: 20px;
                        z-index: 999999;
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    }
                    
                    /* 其他样式保持不变 */
                    /* ... 此处省略原样式内容 ... */
                `;
                JEV.utils.loadStyle(cssContent);
                JEV.utils.log('INFO', '样式加载成功');
            } catch (error) {
                JEV.utils.error('样式加载失败', error);
            }
        },
        
        // 加载本地模块
        loadLocalModules: async function() {
            try {
                JEV.utils.log('INFO', '开始加载本地模块');
                
                const basePath = location.origin + '/PDF转网页/JEV_Client_Plugin/modules_local/';
                
                for (const moduleName of JEV_CONFIG.modules) {
                    await new Promise((resolve, reject) => {
                        JEV.utils.loadScript(basePath + moduleName + '.js', () => {
                            JEV.utils.log('INFO', `模块 ${moduleName} 加载成功`);
                            resolve();
                        });
                    });
                }
                
                JEV.utils.log('INFO', '所有本地模块加载完成');
            } catch (error) {
                JEV.utils.error('本地模块加载失败', error);
                throw error;
            }
        },
        
        // 检查认证状态
        checkAuthStatus: async function() {
            try {
                // 检查是否有存储管理器模块
                if (JEV.modules.storageManager) {
                    const isLoggedIn = await JEV.modules.storageManager.checkAuth();
                    if (isLoggedIn) {
                        JEV.status.authenticated = true;
                        JEV.utils.log('INFO', '已登录，验证通过');
                        return true;
                    }
                }
                
                // 如果未登录且注册模块可用，则显示注册窗口
                if (JEV.modules.register) {
                    JEV.utils.log('INFO', '未检测到登录状态，显示注册窗口');
                    JEV.modules.register.showRegisterWindow();
                }
                
                return false;
            } catch (error) {
                JEV.utils.error('认证状态检查失败', error);
                return false;
            }
        },
        
        // 初始化所有模块
        initializeModules: async function() {
            try {
                JEV.utils.log('INFO', '初始化模块功能');
                
                // 按优先级初始化模块
                // 1. 首先初始化存储管理器（如果存在）
                if (JEV.modules.storageManager) {
                    await JEV.modules.storageManager.init();
                }
                
                // 2. 初始化注册模块（如果存在）
                if (JEV.modules.register) {
                    await JEV.modules.register.init();
                }
                
                // 3. 初始化开关管理器（如果存在）
                if (JEV.modules.toggleManager) {
                    await JEV.modules.toggleManager.init();
                    // 从注册模块获取功能权限并设置到开关管理器
                    if (JEV.modules.register && JEV.modules.register.getPermissions) {
                        const permissions = JEV.modules.register.getPermissions();
                        if (permissions && permissions.features) {
                            JEV.modules.toggleManager.setFeatures(permissions.features);
                        }
                    }
                }
                
                // 4. 初始化中继连接器
                if (JEV.modules.relayConnector) {
                    await JEV.modules.relayConnector.init();
                }
                
                // 5. 最后初始化UI面板
                if (JEV.modules.uiPanel) {
                    await JEV.modules.uiPanel.init();
                    // 如果功能开关管理器可用，将其传递给UI面板
                    if (JEV.modules.toggleManager) {
                        JEV.modules.uiPanel.setToggleManager(JEV.modules.toggleManager);
                    }
                }
                
                JEV.status.modulesLoaded = true;
                JEV.utils.log('INFO', '模块初始化完成');
            } catch (error) {
                JEV.utils.error('模块初始化失败', error);
                // 尝试恢复关键模块
                this.recoverModules();
            }
        },
        
        // 恢复关键模块
        recoverModules: async function() {
            try {
                JEV.utils.log('WARNING', '尝试恢复关键模块...');
                
                // 只恢复最重要的模块
                const criticalModules = ['storage_manager', 'register', 'ui_panel'];
                
                for (const moduleName of criticalModules) {
                    if (JEV.modules[moduleName]) {
                        try {
                            await JEV.modules[moduleName].init();
                            JEV.utils.log('INFO', `关键模块 ${moduleName} 已恢复`);
                        } catch (err) {
                            JEV.utils.error(`恢复模块 ${moduleName} 失败`, err);
                        }
                    }
                }
            } catch (error) {
                JEV.utils.error('模块恢复失败', error);
            }
        },
        
        // 设置菜单命令
        setupMenuCommands: function() {
            try {
                // 注册菜单命令
                GM_registerMenuCommand('显示/隐藏面板', () => {
                    if (JEV.modules.uiPanel && JEV.modules.uiPanel.togglePanel) {
                        JEV.modules.uiPanel.togglePanel();
                    }
                });
                
                GM_registerMenuCommand('重新登录', () => {
                    // 清除登录状态
                    localStorage.removeItem(JEV_CONFIG.storageKeys.license);
                    JEV.status.authenticated = false;
                    
                    // 重新显示注册窗口
                    if (JEV.modules.register) {
                        JEV.modules.register.showRegisterWindow();
                    }
                });
                
                GM_registerMenuCommand('检查更新', async () => {
                    await this.checkForUpdates(true);
                });
            } catch (error) {
                JEV.utils.error('设置菜单命令失败', error);
            }
        },
        
        // 设置热更新
        setupHotUpdate: function() {
            try {
                JEV.utils.log('INFO', '设置热更新机制，间隔时间：' + (JEV_CONFIG.hotUpdateInterval / (60 * 60 * 1000)) + '小时');
                
                setInterval(async () => {
                    try {
                        await this.checkForUpdates();
                    } catch (error) {
                        JEV.utils.error('热更新检查失败', error);
                    }
                }, JEV_CONFIG.hotUpdateInterval);
            } catch (error) {
                JEV.utils.error('设置热更新失败', error);
            }
        },
        
        // 检查更新
        checkForUpdates: async function(userInitiated = false) {
            try {
                JEV.utils.log('INFO', '检查插件更新...');
                
                const response = await JEV.utils.ajax(JEV_CONFIG.apiEndpoints.updateCheck, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    data: JSON.stringify({
                        version: JEV_CONFIG.version,
                        device_id: JEV_CONFIG.deviceId
                    })
                });
                
                if (response.status === 200 && response.responseJSON) {
                    const { has_update, new_version, download_url } = response.responseJSON;
                    if (has_update) {
                        JEV.utils.log('INFO', `检测到新版本: ${new_version}`);
                        
                        if (userInitiated && download_url) {
                            // 如果是用户主动检查且有下载链接，提示更新
                            if (confirm(`检测到新版本 ${new_version}，是否更新？`)) {
                                window.location.href = download_url;
                            }
                        }
                    } else if (userInitiated) {
                        this.showNotification('您的插件已是最新版本');
                    }
                }
            } catch (error) {
                JEV.utils.error('更新检查失败', error);
                if (userInitiated) {
                    this.showErrorNotification('更新检查失败，请稍后重试');
                }
            }
        },
        
        // 显示通知
        showNotification: function(message) {
            // 简单的通知实现
            const notification = document.createElement('div');
            notification.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: rgba(102, 126, 234, 0.9);
                color: white;
                padding: 12px 20px;
                border-radius: 8px;
                z-index: 999999;
                box-shadow: 0 4px 20px rgba(102, 126, 234, 0.4);
                font-size: 14px;
            `;
            notification.textContent = message;
            
            document.body.appendChild(notification);
            
            setTimeout(() => {
                notification.remove();
            }, 3000);
        },
        
        // 显示错误通知
        showErrorNotification: function(message) {
            const notification = document.createElement('div');
            notification.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: rgba(244, 67, 54, 0.9);
                color: white;
                padding: 12px 20px;
                border-radius: 8px;
                z-index: 999999;
                box-shadow: 0 4px 20px rgba(244, 67, 54, 0.4);
                font-size: 14px;
            `;
            notification.textContent = message;
            
            document.body.appendChild(notification);
            
            setTimeout(() => {
                notification.remove();
            }, 5000);
        }
    };

    // 增强API接口
    window.JEV_API = {
        // 面板控制
        togglePanel: function() {
            if (JEV.modules.uiPanel && JEV.modules.uiPanel.togglePanel) {
                JEV.modules.uiPanel.togglePanel();
            }
        },
        
        // 功能开关控制
        toggleFeature: function(featureName, enabled) {
            if (JEV.modules.toggleManager) {
                return JEV.modules.toggleManager.toggleFeature(featureName, enabled);
            }
            return false;
        },
        
        // 获取功能状态
        getFeatureStatus: function(featureName) {
            if (JEV.modules.toggleManager) {
                return JEV.modules.toggleManager.getFeatureStatus(featureName);
            }
            return false;
        },
        
        // 注册/登录
        showRegisterWindow: function() {
            if (JEV.modules.register) {
                JEV.modules.register.showRegisterWindow();
            }
        },
        
        // 状态查询
        getStatus: function() {
            return JEV.status;
        },
        
        getConfig: function() {
            return JEV.config;
        },
        
        getSettings: function() {
            return JEV.settings;
        },
        
        // 模块管理
        refreshModules: async function() {
            await JEV.core.initializeModules();
        },
        
        // 设置管理
        updateSettings: function(newSettings) {
            JEV.settings = { ...JEV.settings, ...newSettings };
            JEV.core.saveSettings();
            return true;
        },
        
        // 授权管理
        isAuthenticated: function() {
            return JEV.status.authenticated;
        },
        
        logout: function() {
            localStorage.removeItem(JEV_CONFIG.storageKeys.license);
            JEV.status.authenticated = false;
            if (JEV.modules.register) {
                JEV.modules.register.showRegisterWindow();
            }
            return true;
        }
    };

    // 文档加载完成后初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            JEV.core.init();
        });
    } else {
        JEV.core.init();
    }

    console.log('[JEV Plugin v2.0] 加载完成');

})();