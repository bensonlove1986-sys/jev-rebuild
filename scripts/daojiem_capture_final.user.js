// ==UserScript==
// @name         DAOJIE客服聊天与图片采集系�?// @namespace    http://tampermonkey.net/
// @version      3.1.0
// @description  跨境电商在线客服聊天系统，支持DEEPSEEK对话集成、实时客服聊天、WORKER对接、图片采集与处理
// @author       DAOJIE
// @match        https://app.daojiemarketing.com/*
// @icon         data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==
// @grant        GM_registerMenuCommand
// @grant        GM_unregisterMenuCommand
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @connect      *
// @connect      app.daojiemarketing.com
// @connect      jevshop.bensonlove1986.workers.dev
// @run-at       document-end
// ==/UserScript==

(async function() {
    'use strict';
    
    // ===== 全局配置 =====
    const DEFAULT_CONFIG = {
        // 原有功能配置
        enableAltClick: true,
        enableOCR: true,
        enableTranslation: true,
        
        // 客服聊天系统配置
        chatSystem: {
            enabled: true,
            autoConnect: false,
            showNotification: true,
            soundEnabled: true,
            typingIndicator: true,
            messageDelay: 500,
            messageStatus: true
        },
        
        // Worker配置
        worker: {
            enabled: true,
            imageAnalyzeUrl: 'https://jevshop.bensonlove1986.workers.dev/analyze-image',
            translateUrl: 'https://jevshop.bensonlove1986.workers.dev/translate',
            timeout: 5000 // 5秒超�?        },
        
        // 本地中控配置
        localControl: {
            enabled: true,
            statusUrl: 'http://localhost:1820/status',
            checkInterval: 10000 // 10秒检测一�?        },
        
        // 图片采集配置
        imageCapture: {
            enabled: true,
            targetDomain: 'https://app.daojiemarketing.com',
            allowedFormats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
            maxSizeMB: 10,
            autoCaptureInterval: 5000,
            enableAutoCapture: true
        },
        
        // 日志配置
        logger: {
            enabled: true,
            level: 'info'
        },
        
        // UI配置
        ui: {
            theme: 'dark',
            compactMode: false,
            autoHideOffline: true,
            responsive: true,
            animationSpeed: 300
        }
    };
    
    // ===== 状态管�?=====
    const AppState = {
        isCentralControlConnected: false,
        isWorkerConnected: false,
        lastRecognitionResult: null,
        lastCommunicationTime: null,
        processedMessages: new Set(),
        lastProcessTime: 0
    };
    
    // ===== 工具函数 =====
    const Utils = {
        config: null,
        
        // 初始化配�?        initConfig: function() {
            try {
                const storedConfig = typeof GM_getValue === 'function' ? 
                    GM_getValue('daojie_config', null) : 
                    localStorage.getItem('daojie_config');
                
                this.config = storedConfig ? 
                    (typeof storedConfig === 'string' ? JSON.parse(storedConfig) : storedConfig) : 
                    DEFAULT_CONFIG;
                
                // 合并默认配置
                this.config = Object.assign({}, DEFAULT_CONFIG, this.config);
            } catch (e) {
                this.log('配置解析失败，使用默认配�?, 'error');
                this.config = DEFAULT_CONFIG;
            }
        },
        
        // 日志系统 - 增强�?        log: function(message, level = 'info', module = 'system') {
            const levels = ['debug', 'info', 'warn', 'error'];
            const currentLevel = levels.indexOf(this.config?.logger?.level || 'info');
            const messageLevel = levels.indexOf(level);
            
            if (!this.config?.logger?.enabled || messageLevel < currentLevel) return;
            
            const timestamp = new Date().toLocaleTimeString();
            const prefix = `[${level.toUpperCase()}]`;
            
            switch (level) {
                case 'debug':
                    console.debug(prefix, message);
                    break;
                case 'info':
                    console.info(prefix, message);
                    break;
                case 'warn':
                    console.warn(prefix, message);
                    break;
                case 'error':
                    console.error(prefix, message);
                    break;
            }
            
            // 更新最后通信时间
            AppState.lastCommunicationTime = new Date();
        },
        
        // 增强的网络请求函�?        sendRequest: function(options) {
            return new Promise((resolve, reject) => {
                try {
                    if (typeof GM_xmlhttpRequest === 'function') {
                        this.log(`正在发送请�? ${options.url}`, 'info');
                        GM_xmlhttpRequest({
                            method: options.method || 'GET',
                            url: options.url,
                            headers: options.headers,
                            data: options.data,
                            timeout: options.timeout || this.config.worker.timeout,
                            onload: function(response) {
                                resolve({
                                    status: response.status,
                                    responseText: response.responseText,
                                    response: response.response
                                });
                            },
                            onerror: function(error) {
                                reject(new Error('请求失败: ' + error.message));
                            },
                            ontimeout: function() {
                                reject(new Error('请求超时'));
                            }
                        });
                    } else {
                        reject(new Error('GM_xmlhttpRequest不可�?));
                    }
                } catch (error) {
                    reject(error);
                }
            });
        },
        
        // DOM操作辅助函数
        createElementWithId: function(tagName, id, className = '', attributes = {}) {
            const element = document.createElement(tagName);
            if (id) element.id = id;
            if (className) element.className = className;
            
            Object.keys(attributes).forEach(key => {
                element.setAttribute(key, attributes[key]);
            });
            
            return element;
        },
        
        // 格式化日期时�?        formatDateTime: function(date = new Date()) {
            const d = new Date(date);
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            const hours = String(d.getHours()).padStart(2, '0');
            const minutes = String(d.getMinutes()).padStart(2, '0');
            const seconds = String(d.getSeconds()).padStart(2, '0');
            
            return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
        },
        
        // 节流函数
        throttle: function(func, wait) {
            let lastCall = 0;
            return function(...args) {
                const now = Date.now();
                if (now - lastCall >= wait) {
                    lastCall = now;
                    return func.apply(this, args);
                }
            };
        },
        
        // 检测文本是否为英文
        isEnglishText: function(text) {
            if (!text || typeof text !== 'string') return false;
            // 移除数字和特殊字符后检�?            const cleanText = text.replace(/[0-9\s\W_]+/g, '');
            if (cleanText.length === 0) return false;
            // 检查是否包含英文字�?            return /[a-zA-Z]/.test(cleanText);
        }
    };
    
    // ===== 本地中控检测模�?=====
    const CentralControlModule = {
        checkInterval: null,
        
        // 初始化中控检�?        init: function() {
            if (!Utils.config.localControl.enabled) {
                Utils.log('本地中控检测功能已禁用', 'info');
                return;
            }
            
            Utils.log('初始化本地中控检测模�?, 'info');
            
            // 立即执行一次检�?            this.checkConnection();
            
            // 设置定时检�?            this.checkInterval = setInterval(() => {
                this.checkConnection();
            }, Utils.config.localControl.checkInterval);
        },
        
        // 检查中控连接状�?        async checkConnection() {
            try {
                Utils.log('正在检测中控连�?..', 'info');
                
                const response = await Utils.sendRequest({
                    url: Utils.config.localControl.statusUrl,
                    method: 'GET',
                    timeout: 3000
                });
                
                if (response.status === 200) {
                    try {
                        const data = JSON.parse(response.responseText);
                        if (data.status === 'running' || data.running === true) {
                            AppState.isCentralControlConnected = true;
                            Utils.log('中控连接：已连接', 'info');
                            StatusModule.updateStatus();
                            return true;
                        }
                    } catch (parseError) {
                        // 如果解析失败但状态码�?00，也认为连接成功
                        AppState.isCentralControlConnected = true;
                        Utils.log('中控连接：已连接（无法解析响应）', 'info');
                        StatusModule.updateStatus();
                        return true;
                    }
                }
                
                // 连接失败
                this.handleDisconnect();
                return false;
            } catch (error) {
                this.handleDisconnect();
                return false;
            }
        },
        
        // 处理断开连接
        handleDisconnect() {
            if (AppState.isCentralControlConnected) {
                Utils.log('⚠️ 中控未连接，尝试重连...', 'warn');
            }
            AppState.isCentralControlConnected = false;
            StatusModule.updateStatus();
        },
        
        // 停止检�?        stop: function() {
            if (this.checkInterval) {
                clearInterval(this.checkInterval);
                this.checkInterval = null;
            }
        }
    };
    
    // ===== Worker通信模块 =====
    const WorkerModule = {
        // 图片识别接口
        async analyzeImage(imageUrl) {
            try {
                Utils.log('正在调用图片识别接口', 'info');
                
                const response = await Utils.sendRequest({
                    url: Utils.config.worker.imageAnalyzeUrl,
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    data: JSON.stringify({
                        image_url: imageUrl
                    }),
                    timeout: Utils.config.worker.timeout
                });
                
                if (response.status === 200) {
                    const result = JSON.parse(response.responseText);
                    AppState.isWorkerConnected = true;
                    AppState.lastRecognitionResult = result;
                    
                    Utils.log(`[成功] 图片识别接口响应成功`, 'info');
                    Utils.log(`[识别结果] 型号�?{result.model || '未知'} 数量�?{result.quantity || '未知'}`, 'info');
                    
                    StatusModule.updateStatus();
                    return result;
                }
                
                throw new Error(`请求失败，状态码: ${response.status}`);
            } catch (error) {
                AppState.isWorkerConnected = false;
                Utils.log(`[错误] 请求失败：图片识别接�?- ${error.message}`, 'error');
                StatusModule.updateStatus();
                throw error;
            }
        },
        
        // 翻译接口
        async translateText(text) {
            try {
                Utils.log('正在调用翻译接口', 'info');
                
                const response = await Utils.sendRequest({
                    url: Utils.config.worker.translateUrl,
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    data: JSON.stringify({
                        text: text,
                        target_lang: 'zh-CN'
                    }),
                    timeout: Utils.config.worker.timeout
                });
                
                if (response.status === 200) {
                    const result = JSON.parse(response.responseText);
                    AppState.isWorkerConnected = true;
                    
                    const translation = result.translation || result.result || '翻译失败';
                    Utils.log(`[成功] 翻译接口响应成功`, 'info');
                    Utils.log(`[翻译结果] ${text.slice(0, 30)}... �?中文译文�?{translation.slice(0, 50)}...`, 'info');
                    
                    StatusModule.updateStatus();
                    return translation;
                }
                
                throw new Error(`请求失败，状态码: ${response.status}`);
            } catch (error) {
                AppState.isWorkerConnected = false;
                Utils.log(`[错误] 请求失败：翻译接�?- ${error.message}`, 'error');
                StatusModule.updateStatus();
                throw error;
            }
        }
    };
    
    // ===== 状态提示模�?=====
    const StatusModule = {
        statusPanel: null,
        
        // 初始化状态面�?        init: function() {
            this.createStatusPanel();
        },
        
        // 创建状态面�?        createStatusPanel: function() {
            // 创建悬浮面板
            this.statusPanel = Utils.createElementWithId('div', 'daojie-status-panel', 'daojie-status-panel');
            
            const styles = `
                position: fixed;
                top: 10px;
                right: 10px;
                background: ${Utils.config.ui.theme === 'dark' ? '#1a1a1a' : '#ffffff'};
                border: 1px solid ${Utils.config.ui.theme === 'dark' ? '#444' : '#ddd'};
                border-radius: 8px;
                padding: 10px;
                font-size: 12px;
                line-height: 1.4;
                color: ${Utils.config.ui.theme === 'dark' ? '#ccc' : '#333'};
                box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
                z-index: 9998;
                min-width: 200px;
                max-width: 300px;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            `;
            
            this.statusPanel.style.cssText = styles;
            document.body.appendChild(this.statusPanel);
            
            // 添加GM样式
            GM_addStyle(`
                #daojie-status-panel .status-item {
                    margin-bottom: 5px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                #daojie-status-panel .status-label {
                    font-weight: 500;
                }
                #daojie-status-panel .status-value {
                    color: #4096ff;
                }
                #daojie-status-panel .connection-status {
                    font-weight: 600;
                }
                #daojie-status-panel .connection-status.connected {
                    color: #52c41a;
                }
                #daojie-status-panel .connection-status.disconnected {
                    color: #ff4d4f;
                }
            `);
            
            this.updateStatus();
        },
        
        // 更新状态显�?        updateStatus: function() {
            if (!this.statusPanel) return;
            
            const centralControlStatus = AppState.isCentralControlConnected ? 
                '<span class="connection-status connected">🟢 已连�?/span>' : 
                '<span class="connection-status disconnected">🔴 未连�?/span>';
            
            const workerStatus = AppState.isWorkerConnected ? 
                '<span class="connection-status connected">正常</span>' : 
                '<span class="connection-status disconnected">异常</span>';
            
            const lastRecognition = AppState.lastRecognitionResult ? 
                `${AppState.lastRecognitionResult.model || '未知'} (${AppState.lastRecognitionResult.quantity || '未知'})` : 
                '�?;
            
            const lastTime = AppState.lastCommunicationTime ? 
                Utils.formatDateTime(AppState.lastCommunicationTime) : 
                '未通信';
            
            this.statusPanel.innerHTML = `
                <div class="status-item">
                    <span class="status-label">中控连接�?/span>
                    <span class="status-value">${centralControlStatus}</span>
                </div>
                <div class="status-item">
                    <span class="status-label">Worker连接�?/span>
                    <span class="status-value">${workerStatus}</span>
                </div>
                <div class="status-item">
                    <span class="status-label">最近识别结果：</span>
                    <span class="status-value">${lastRecognition}</span>
                </div>
                <div class="status-item">
                    <span class="status-label">上次通信时间�?/span>
                    <span class="status-value">${lastTime}</span>
                </div>
            `;
        }
    };
    
    // ===== 自动翻译模块 =====
    const TranslationModule = {
        // 初始化翻译模�?        init: function() {
            Utils.log('初始化自动翻译模�?, 'info');
            this.startMonitoring();
        },
        
        // 开始监控聊天内�?        startMonitoring: function() {
            Utils.log('正在监听聊天内容...', 'info');
            
            // 使用节流函数防止重复执行
            const throttledMonitor = Utils.throttle(() => {
                this.monitorChatMessages();
            }, 500);
            
            // 设置定时器监�?            setInterval(throttledMonitor, 1000);
            
            // 监听DOM变化
            const observer = new MutationObserver(() => {
                throttledMonitor();
            });
            
            observer.observe(document.body, {
                childList: true,
                subtree: true,
                characterData: true
            });
        },
        
        // 监控聊天消息
        monitorChatMessages: function() {
            // 查找聊天消息元素 - 适配Daojie页面
            const messageSelectors = [
                '.chat-message', 
                '.message-item',
                '.message-bubble',
                '[data-message-id]',
                '.message-content',
                '.chat-bubble'
            ];
            
            let messages = [];
            messageSelectors.forEach(selector => {
                const elements = document.querySelectorAll(selector);
                messages = [...messages, ...Array.from(elements)];
            });
            
            // 去重并处理每个消�?            const uniqueMessages = [...new Set(messages)];
            uniqueMessages.forEach(message => {
                this.processMessage(message);
            });
        },
        
        // 处理单个消息
        async processMessage(messageElement) {
            // 生成消息ID
            const messageId = messageElement.getAttribute('data-message-id') || 
                            messageElement.id || 
                            messageElement.innerText.substring(0, 50);
            
            // 避免重复处理
            if (AppState.processedMessages.has(messageId)) return;
            
            // 检查是否为客服聊天区域的消�?            if (!this.isChatMessage(messageElement)) return;
            
            // 标记为已处理
            AppState.processedMessages.add(messageId);
            
            // 检查文本内�?            const text = messageElement.innerText.trim();
            if (text && Utils.isEnglishText(text)) {
                try {
                    await WorkerModule.translateText(text);
                } catch (error) {
                    Utils.log(`翻译文本失败: ${error.message}`, 'error');
                }
            }
            
            // 检查图�?            const images = messageElement.querySelectorAll('img');
            if (images.length > 0) {
                for (const img of images) {
                    const imageUrl = img.src;
                    if (imageUrl) {
                        try {
                            await WorkerModule.analyzeImage(imageUrl);
                        } catch (error) {
                            Utils.log(`识别图片失败: ${error.message}`, 'error');
                        }
                    }
                }
            }
        },
        
        // 判断是否为聊天消�?        isChatMessage: function(element) {
            // 检查是否包含聊天相关的类或属�?            const chatClasses = ['chat', 'message', 'conversation', 'talk'];
            const classList = element.className || '';
            
            // 检查类�?            for (const chatClass of chatClasses) {
                if (classList.toLowerCase().includes(chatClass)) {
                    return true;
                }
            }
            
            // 检查父元素
            let parent = element.parentElement;
            for (let i = 0; i < 3 && parent; i++) {
                const parentClass = parent.className || '';
                for (const chatClass of chatClasses) {
                    if (parentClass.toLowerCase().includes(chatClass)) {
                        return true;
                    }
                }
                parent = parent.parentElement;
            }
            
            return false;
        }
    };
    
    // ===== 原有聊天与图片采集功�?=====
    const ChatAndCaptureModule = {
        // 初始化原有功�?        init: function() {
            Utils.log('初始化聊天与图片采集功能', 'info');
            this.setupEventListeners();
        },
        
        // 设置事件监听
        setupEventListeners: function() {
            // Alt点击图片采集
            document.addEventListener('click', (e) => {
                if (Utils.config.enableAltClick && e.altKey && e.target.tagName === 'IMG') {
                    e.preventDefault();
                    this.handleImageClick(e.target);
                }
            }, true);
            
            // 图片右键菜单
            document.addEventListener('contextmenu', (e) => {
                if (e.target.tagName === 'IMG') {
                    // 可以在这里添加右键菜单功�?                }
            }, true);
        },
        
        // 处理图片点击
        async handleImageClick(imgElement) {
            try {
                Utils.log(`Alt点击图片: ${imgElement.src}`, 'info');
                
                // 调用图片识别
                if (Utils.config.enableOCR) {
                    await WorkerModule.analyzeImage(imgElement.src);
                }
                
                // 可以添加原有的图片采集逻辑
            } catch (error) {
                Utils.log(`处理图片失败: ${error.message}`, 'error');
            }
        }
    };
    
    // ===== 菜单命令 =====
    const MenuModule = {
        // 初始化菜�?        init: function() {
            this.registerMenuCommands();
        },
        
        // 注册菜单命令
        registerMenuCommands: function() {
            // 测试中控连接
            GM_registerMenuCommand('检测中控连�?, () => {
                CentralControlModule.checkConnection();
            });
            
            // 测试翻译功能
            GM_registerMenuCommand('测试翻译功能', async () => {
                try {
                    const testText = 'This is a test translation';
                    await WorkerModule.translateText(testText);
                    Utils.log('翻译测试完成', 'info');
                } catch (error) {
                    Utils.log(`翻译测试失败: ${error.message}`, 'error');
                }
            });
            
            // 显示状�?            GM_registerMenuCommand('显示状态信�?, () => {
                StatusModule.updateStatus();
                Utils.log('中控连接�? + (AppState.isCentralControlConnected ? '已连�? : '未连�?), 'info');
                Utils.log('Worker连接�? + (AppState.isWorkerConnected ? '正常' : '异常'), 'info');
            });
        }
    };
    
    // ===== 主应�?=====
    const DAOJIEApp = {
        // 初始化应�?        async initialize() {
            try {
                Utils.initConfig();
                Utils.log('插件启动成功 v3.1.0', 'info');
                
                // 初始化各个模�?                StatusModule.init();
                CentralControlModule.init();
                MenuModule.init();
                ChatAndCaptureModule.init();
                TranslationModule.init();
                
                // 初始化成功日�?                Utils.log('所有模块初始化完成', 'info');
            } catch (error) {
                Utils.log(`应用初始化失�? ${error.message}`, 'error');
            }
        },
        
        // 清理资源
        cleanup() {
            CentralControlModule.stop();
            Utils.log('应用资源已清�?, 'info');
        }
    };
    
    // ===== 启动应用 =====
    DAOJIEApp.initialize();
    
    // ===== 页面卸载时清理资�?=====
    window.addEventListener('beforeunload', () => {
        DAOJIEApp.cleanup();
    });
    
    // ===== 暴露给全局（用于调试）=====
    window.DAOJIE_CAPTURE = {
        app: DAOJIEApp,
        utils: Utils,
        state: AppState,
        centralControl: CentralControlModule,
        worker: WorkerModule,
        status: StatusModule
    };
    
})();
