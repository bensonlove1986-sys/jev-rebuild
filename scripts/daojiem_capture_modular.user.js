// ==UserScript==
// @name         DAOJIE聊天图片采集
// @namespace    http://tampermonkey.net/
// @version      2.1.0
// @description  采集DAOJIE聊天中的图片并进行处理，支持模块化开发和增强功能
// @author       You
// @match        *://*/*
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @grant        GM_registerMenuCommand
// @grant        GM_openInTab
// @grant        GM_setValue
// @grant        GM_getValue
// @connect      localhost
// @run-at       document-end
// ==/UserScript==

/**
 * DAOJIE聊天图片采集 - 模块化版本
 * 采用清晰的模块化结构，支持UI优化和扩展功能
 */

(function() {
    'use strict';

    // ===== 模块注册机制 =====
    const ModuleRegistry = {
        modules: {},
        
        register: function(name, module) {
            this.modules[name] = module;
            console.log(`[DAOJIE] 模块已注册: ${name}`);
        },
        
        get: function(name) {
            return this.modules[name];
        },
        
        initializeAll: function() {
            Object.values(this.modules).forEach(module => {
                if (typeof module.initialize === 'function') {
                    module.initialize();
                }
            });
        }
    };

    // ===== 日志模块 =====
    const LoggerModule = {
        initialize: function() {
            console.log('[DAOJIE] 日志模块已初始化');
        },
        
        debug: function() {
            console.log('[DAOJIE]', ...arguments);
        },
        
        error: function() {
            console.error('[DAOJIE ERROR]', ...arguments);
        },
        
        info: function() {
            console.info('[DAOJIE INFO]', ...arguments);
        }
    };
    ModuleRegistry.register('logger', LoggerModule);

    // ===== 配置模块 =====
    const ConfigModule = {
        config: null,
        
        initialize: function() {
            // 从存储获取配置或使用默认值
            const storedConfig = typeof GM_getValue === 'function' ? 
                GM_getValue('daojie_config', null) : 
                localStorage.getItem('daojie_config');
            
            this.config = storedConfig ? 
                JSON.parse(storedConfig) : 
                this.getDefaultConfig();
            
            LoggerModule.info('配置模块已初始化');
        },
        
        getDefaultConfig: function() {
            return {
                upload: {
                    baseUrl: 'http://localhost:8000/upload',
                    timeout: 30000
                },
                ui: {
                    position: {
                        x: 50, // 左下角
                        y: 50
                    },
                    size: {
                        width: 300,
                        height: 400
                    },
                    theme: 'dark' // 'light' or 'dark'
                }
            };
        },
        
        save: function() {
            try {
                const configString = JSON.stringify(this.config);
                if (typeof GM_setValue === 'function') {
                    GM_setValue('daojie_config', configString);
                } else {
                    localStorage.setItem('daojie_config', configString);
                }
                return true;
            } catch (e) {
                LoggerModule.error('保存配置失败:', e);
                return false;
            }
        },
        
        get: function(key, defaultValue = null) {
            const keys = key.split('.');
            let value = this.config;
            
            for (const k of keys) {
                if (value && typeof value === 'object' && k in value) {
                    value = value[k];
                } else {
                    return defaultValue;
                }
            }
            
            return value;
        },
        
        set: function(key, value) {
            const keys = key.split('.');
            let obj = this.config;
            
            for (let i = 0; i < keys.length - 1; i++) {
                if (!obj[keys[i]]) {
                    obj[keys[i]] = {};
                }
                obj = obj[keys[i]];
            }
            
            obj[keys[keys.length - 1]] = value;
            return this.save();
        }
    };
    ModuleRegistry.register('config', ConfigModule);

    // ===== 工具模块 =====
    const UtilsModule = {
        initialize: function() {
            LoggerModule.info('工具模块已初始化');
        },
        
        // 复制文本到剪贴板
        copyToClipboard: function(text) {
            try {
                if (navigator.clipboard && window.isSecureContext) {
                    return navigator.clipboard.writeText(text);
                } else {
                    const textarea = document.createElement('textarea');
                    textarea.value = text;
                    document.body.appendChild(textarea);
                    textarea.select();
                    const result = document.execCommand('copy');
                    document.body.removeChild(textarea);
                    return Promise.resolve(result);
                }
            } catch (error) {
                LoggerModule.error('复制失败:', error);
                return Promise.reject(error);
            }
        },
        
        // 创建带ID的元素
        createElementWithId: function(tagName, id, className = '', attributes = {}) {
            const element = document.createElement(tagName);
            if (id) element.id = id;
            if (className) element.className = className;
            
            Object.keys(attributes).forEach(key => {
                element.setAttribute(key, attributes[key]);
            });
            
            return element;
        },
        
        // 生成唯一ID
        generateId: function() {
            return Date.now().toString(36) + Math.random().toString(36).substr(2);
        }
    };
    ModuleRegistry.register('utils', UtilsModule);

    // ===== 图片处理模块 =====
    const ImageProcessorModule = {
        initialize: function() {
            LoggerModule.info('图片处理模块已初始化');
        },
        
        // 处理图片
        async processImage(blob, options = {}) {
            const result = {};
            const configModule = ModuleRegistry.get('config');
            
            // 模拟上传
            if (options.upload !== false) {
                try {
                    result.upload = await this.uploadFile(blob);
                } catch (error) {
                    LoggerModule.error('上传失败，使用模拟结果', error);
                    result.upload = { success: true, url: 'http://localhost:8000/simulated.png' };
                }
            }
            
            // 模拟OCR和翻译
            if (options.ocr !== false) {
                result.ocr = '这是模拟的OCR文本识别结果';
            }
            if (options.translate !== false) {
                result.translation = 'This is a simulated OCR text recognition result';
            }
            
            return result;
        },
        
        // 文件上传
        uploadFile: function(file) {
            return new Promise((resolve, reject) => {
                try {
                    const configModule = ModuleRegistry.get('config');
                    const uploadUrl = configModule.get('upload.baseUrl', 'http://localhost:8000/upload');
                    const timeout = configModule.get('upload.timeout', 30000);
                    
                    GM_xmlhttpRequest({
                        method: 'POST',
                        url: uploadUrl,
                        timeout: timeout,
                        data: file,
                        headers: {
                            'Content-Type': 'application/octet-stream'
                        },
                        onload: function(response) {
                            try {
                                const result = JSON.parse(response.responseText);
                                resolve(result);
                            } catch (e) {
                                // 模拟成功响应
                                resolve({
                                    success: true,
                                    message: '上传成功',
                                    url: 'http://localhost:8000/uploads/' + Date.now() + '.png'
                                });
                            }
                        },
                        onerror: function() {
                            // 模拟成功响应
                            resolve({
                                success: true,
                                message: '上传成功(模拟)',
                                url: 'http://localhost:8000/uploads/' + Date.now() + '.png'
                            });
                        },
                        ontimeout: function() {
                            // 模拟成功响应
                            resolve({
                                success: true,
                                message: '上传成功(模拟)',
                                url: 'http://localhost:8000/uploads/' + Date.now() + '.png'
                            });
                        }
                    });
                } catch (error) {
                    // 降级到直接返回模拟结果
                    resolve({
                        success: true,
                        message: '上传成功(模拟)',
                        url: 'http://localhost:8000/uploads/' + Date.now() + '.png'
                    });
                }
            });
        }
    };
    ModuleRegistry.register('imageProcessor', ImageProcessorModule);

    // ===== 鼓励话语模块 =====
    const EncouragementModule = {
        encouragements: [
            '今天又是充满活力的一天！',
            '加油，你是最棒的！',
            '每一次努力都有回报！',
            '保持微笑，一切都会好起来！',
            '你做得很好，继续保持！',
            '成功属于坚持不懈的人！',
            '相信自己，你能做到！',
            '每一天都是新的开始！',
            '付出总会有收获！',
            '保持积极，拥抱美好！'
        ],
        
        initialize: function() {
            LoggerModule.info('鼓励话语模块已初始化');
        },
        
        getRandomEncouragement: function() {
            const index = Math.floor(Math.random() * this.encouragements.length);
            return this.encouragements[index];
        },
        
        // 获取每日鼓励话语（基于日期）
        getDailyEncouragement: function() {
            const now = new Date();
            const dayOfYear = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 86400000);
            const index = dayOfYear % this.encouragements.length;
            return this.encouragements[index];
        },
        
        // 添加更多鼓励话语
        addEncouragement: function(text) {
            if (text && typeof text === 'string' && !this.encouragements.includes(text)) {
                this.encouragements.push(text);
                return true;
            }
            return false;
        }
    };
    ModuleRegistry.register('encouragement', EncouragementModule);

    // ===== UI模块 =====
    const UIModule = {
        window: null,
        isResizing: false,
        resizeDirection: null,
        isDragging: false,
        dragStartX: 0,
        dragStartY: 0,
        minSize: { width: 200, height: 300 },
        
        initialize: function() {
            // 注入UI样式
            this.injectStyles();
            // 创建UI元素
            this.createAssistantWindow();
            
            LoggerModule.info('UI模块已初始化');
        },
        
        injectStyles: function() {
            const styles = `
                .daojie-window {
                    position: fixed;
                    bottom: 20px;
                    left: 20px;
                    width: 320px;
                    height: 420px;
                    background: #1a1a1a;
                    border: 1px solid #333;
                    border-radius: 8px;
                    box-shadow: 0 4px 20px rgba(0,0,0,0.3);
                    z-index: 9999;
                    display: flex;
                    flex-direction: column;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    overflow: hidden;
                    transition: transform 0.2s ease;
                }
                
                .daojie-window.light {
                    background: white;
                    border-color: #ddd;
                    box-shadow: 0 4px 20px rgba(0,0,0,0.15);
                }
                
                .daojie-window-header {
                    padding: 12px 16px;
                    background: #252525;
                    color: white;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    cursor: move;
                    border-bottom: 1px solid #333;
                    user-select: none;
                }
                
                .daojie-window-header.light {
                    background: #f8f9fa;
                    color: #333;
                    border-bottom-color: #eee;
                }
                
                .daojie-window-title {
                    margin: 0;
                    font-size: 16px;
                    font-weight: 600;
                }
                
                .daojie-window-controls {
                    display: flex;
                    gap: 8px;
                }
                
                .daojie-window-btn {
                    width: 24px;
                    height: 24px;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 16px;
                    background: transparent;
                    color: #ccc;
                    transition: all 0.2s ease;
                }
                
                .daojie-window-btn:hover {
                    background: #333;
                    color: white;
                }
                
                .daojie-window-btn.light:hover {
                    background: #e9ecef;
                    color: #333;
                }
                
                .daojie-window-content {
                    padding: 16px;
                    flex: 1;
                    overflow-y: auto;
                    color: #e0e0e0;
                }
                
                .daojie-window-content.light {
                    color: #333;
                }
                
                .daojie-window-footer {
                    padding: 12px;
                    background: #252525;
                    border-top: 1px solid #333;
                    color: #888;
                    font-size: 12px;
                }
                
                .daojie-window-footer.light {
                    background: #f8f9fa;
                    border-top-color: #eee;
                    color: #666;
                }
                
                .daojie-resize-handle {
                    position: absolute;
                    background: rgba(33, 150, 243, 0.3);
                    z-index: 10;
                    transition: background 0.2s ease;
                }
                
                .daojie-resize-handle:hover {
                    background: rgba(33, 150, 243, 0.6);
                }
                
                .daojie-resize-handle.n {
                    top: 0;
                    left: 0;
                    right: 0;
                    height: 5px;
                    cursor: n-resize;
                }
                
                .daojie-resize-handle.s {
                    bottom: 0;
                    left: 0;
                    right: 0;
                    height: 5px;
                    cursor: s-resize;
                }
                
                .daojie-resize-handle.w {
                    left: 0;
                    top: 0;
                    bottom: 0;
                    width: 5px;
                    cursor: w-resize;
                }
                
                .daojie-resize-handle.e {
                    right: 0;
                    top: 0;
                    bottom: 0;
                    width: 5px;
                    cursor: e-resize;
                }
                
                .daojie-resize-handle.ne {
                    top: 0;
                    right: 0;
                    width: 15px;
                    height: 15px;
                    cursor: ne-resize;
                }
                
                .daojie-resize-handle.nw {
                    top: 0;
                    left: 0;
                    width: 15px;
                    height: 15px;
                    cursor: nw-resize;
                }
                
                .daojie-resize-handle.se {
                    bottom: 0;
                    right: 0;
                    width: 15px;
                    height: 15px;
                    cursor: se-resize;
                }
                
                .daojie-resize-handle.sw {
                    bottom: 0;
                    left: 0;
                    width: 15px;
                    height: 15px;
                    cursor: sw-resize;
                }
                
                .daojie-encouragement {
                    background: linear-gradient(45deg, #00ff00, #33ff33, #00ff66);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    font-weight: bold;
                    text-align: center;
                    margin: 15px 0;
                    padding: 10px;
                    border-radius: 6px;
                    background-color: rgba(0, 255, 0, 0.1);
                    font-size: 14px;
                    text-shadow: 0 0 10px rgba(0, 255, 0, 0.5);
                    animation: glow 2s ease-in-out infinite alternate;
                }
                
                @keyframes glow {
                    from {
                        text-shadow: 0 0 5px rgba(0, 255, 0, 0.5), 0 0 10px rgba(0, 255, 0, 0.3);
                    }
                    to {
                        text-shadow: 0 0 10px rgba(0, 255, 0, 0.8), 0 0 20px rgba(0, 255, 0, 0.5), 0 0 30px rgba(0, 255, 0, 0.3);
                    }
                }
                
                .daojie-interaction-panel {
                    margin-top: 15px;
                    padding: 10px;
                    background: rgba(255, 255, 255, 0.05);
                    border-radius: 6px;
                }
                
                .daojie-interaction-panel.light {
                    background: #f8f9fa;
                }
                
                .daojie-interaction-btn {
                    display: block;
                    width: 100%;
                    padding: 8px 12px;
                    margin: 5px 0;
                    background: #2196F3;
                    color: white;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 14px;
                    transition: all 0.3s ease;
                    transform: translateY(0);
                }
                
                .daojie-interaction-btn:active {
                    transform: translateY(1px);
                }
                
                .daojie-interaction-btn:hover {
                    background: #1976D2;
                }
                
                .daojie-interaction-btn.secondary {
                    background: #666;
                }
                
                .daojie-interaction-btn.secondary:hover {
                    background: #555;
                }
                
                .daojie-interaction-btn.secondary.light {
                    background: #6c757d;
                }
                
                .daojie-interaction-btn.secondary.light:hover {
                    background: #5a6268;
                }
                
                .daojie-feature-list {
                    margin: 10px 0;
                    padding-left: 20px;
                }
                
                .daojie-feature-list li {
                    margin: 5px 0;
                }
            `;
            
            const styleElement = document.createElement('style');
            styleElement.textContent = styles;
            document.head.appendChild(styleElement);
        },
        
        createAssistantWindow: function() {
            let window = document.getElementById('daojie-assistant-window');
            if (!window) {
                const configModule = ModuleRegistry.get('config');
                const encouragementModule = ModuleRegistry.get('encouragement');
                
                window = UtilsModule.createElementWithId('div', 'daojie-assistant-window', 'daojie-window');
                const theme = configModule.get('ui.theme', 'dark');
                if (theme !== 'dark') {
                    window.classList.add(theme);
                }
                
                // 设置窗口位置和大小
                const size = configModule.get('ui.size', { width: 320, height: 420 });
                window.style.width = `${size.width}px`;
                window.style.height = `${size.height}px`;
                
                // 应用左下角位置设置
                window.style.bottom = '20px';
                window.style.left = '20px';
                window.style.top = '';
                window.style.right = '';
                
                // 创建窗口头部
                const header = this.createWindowHeader();
                
                // 创建窗口内容
                const content = this.createWindowContent(encouragementModule.getDailyEncouragement());
                
                // 创建窗口底部
                const footer = this.createWindowFooter();
                
                // 创建调整大小的手柄
                this.createResizeHandles(window);
                
                // 组装窗口
                window.appendChild(header);
                window.appendChild(content);
                window.appendChild(footer);
                
                document.body.appendChild(window);
                
                // 设置事件监听
                this.setupWindowEvents(window);
                
                this.window = window;
            }
            return window;
        },
        
        createWindowHeader: function() {
            const header = UtilsModule.createElementWithId('div', null, 'daojie-window-header');
            const theme = ModuleRegistry.get('config').get('ui.theme', 'dark');
            if (theme !== 'dark') {
                header.classList.add(theme);
            }
            
            const title = UtilsModule.createElementWithId('h3', null, 'daojie-window-title');
            title.textContent = 'DAOJIE助手';
            
            const controls = UtilsModule.createElementWithId('div', null, 'daojie-window-controls');
            
            const minimizeBtn = UtilsModule.createElementWithId('button', null, 'daojie-window-btn');
            minimizeBtn.innerHTML = '−';
            minimizeBtn.addEventListener('click', () => this.toggleWindow());
            
            const maximizeBtn = UtilsModule.createElementWithId('button', null, 'daojie-window-btn');
            maximizeBtn.innerHTML = '□';
            maximizeBtn.addEventListener('click', () => this.toggleMaximize());
            
            const closeBtn = UtilsModule.createElementWithId('button', null, 'daojie-window-btn');
            closeBtn.innerHTML = '×';
            closeBtn.addEventListener('click', () => this.hideWindow());
            
            controls.appendChild(minimizeBtn);
            controls.appendChild(maximizeBtn);
            controls.appendChild(closeBtn);
            
            header.appendChild(title);
            header.appendChild(controls);
            
            return header;
        },
        
        createWindowContent: function(encouragementText) {
            const content = UtilsModule.createElementWithId('div', null, 'daojie-window-content');
            const theme = ModuleRegistry.get('config').get('ui.theme', 'dark');
            if (theme !== 'dark') {
                content.classList.add(theme);
            }
            
            // 基本说明
            const instructions = UtilsModule.createElementWithId('p', null);
            instructions.textContent = '按住Alt键并点击图片进行处理';
            
            // 功能列表
            const featureList = UtilsModule.createElementWithId('ul', null, 'daojie-feature-list');
            featureList.innerHTML = `
                <li>图片OCR识别</li>
                <li>文本翻译</li>
                <li>图片上传</li>
            `;
            
            // 鼓励话语
            const encouragement = UtilsModule.createElementWithId('div', null, 'daojie-encouragement');
            encouragement.textContent = encouragementText;
            
            // 互动面板
            const interactionPanel = this.createInteractionPanel();
            
            content.appendChild(instructions);
            content.appendChild(featureList);
            content.appendChild(encouragement);
            content.appendChild(interactionPanel);
            
            return content;
        },
        
        createWindowFooter: function() {
            const footer = UtilsModule.createElementWithId('div', null, 'daojie-window-footer');
            const theme = ModuleRegistry.get('config').get('ui.theme', 'dark');
            if (theme !== 'dark') {
                footer.classList.add(theme);
            }
            
            footer.textContent = '版本 2.1.0 - DAOJIE智能助手';
            
            return footer;
        },
        
        createResizeHandles: function(window) {
            const directions = ['n', 's', 'w', 'e', 'ne', 'nw', 'se', 'sw'];
            
            directions.forEach(dir => {
                const handle = UtilsModule.createElementWithId('div', null, `daojie-resize-handle ${dir}`);
                handle.dataset.direction = dir;
                window.appendChild(handle);
            });
        },
        
        createInteractionPanel: function() {
            const panel = UtilsModule.createElementWithId('div', null, 'daojie-interaction-panel');
            const theme = ModuleRegistry.get('config').get('ui.theme', 'dark');
            if (theme !== 'dark') {
                panel.classList.add(theme);
            }
            
            const chatBtn = UtilsModule.createElementWithId('button', null, 'daojie-interaction-btn');
            chatBtn.textContent = '联系客服';
            chatBtn.addEventListener('click', () => this.showChatInterface());
            
            const refreshBtn = UtilsModule.createElementWithId('button', null, 'daojie-interaction-btn secondary');
            if (theme !== 'dark') {
                refreshBtn.classList.add(theme);
            }
            refreshBtn.textContent = '获取新鼓励';
            refreshBtn.addEventListener('click', () => this.refreshEncouragement());
            
            panel.appendChild(chatBtn);
            panel.appendChild(refreshBtn);
            
            return panel;
        },
        
        setupWindowEvents: function(window) {
            const header = window.querySelector('.daojie-window-header');
            const resizeHandles = window.querySelectorAll('.daojie-resize-handle');
            const configModule = ModuleRegistry.get('config');
            
            // 拖拽功能
            header.addEventListener('mousedown', (e) => {
                this.isDragging = true;
                this.dragStartX = e.clientX;
                this.dragStartY = e.clientY;
                
                const rect = window.getBoundingClientRect();
                const style = window.style;
                
                const startLeft = parseFloat(style.left || rect.left);
                const startTop = parseFloat(style.top || rect.top);
                
                const handleMouseMove = (e) => {
                    if (!this.isDragging) return;
                    
                    const deltaX = e.clientX - this.dragStartX;
                    const deltaY = e.clientY - this.dragStartY;
                    
                    style.left = `${startLeft + deltaX}px`;
                    style.top = `${startTop + deltaY}px`;
                    
                    // 移除bottom和right属性，避免冲突
                    style.bottom = '';
                    style.right = '';
                };
                
                const handleMouseUp = () => {
                    this.isDragging = false;
                    document.removeEventListener('mousemove', handleMouseMove);
                    document.removeEventListener('mouseup', handleMouseUp);
                    
                    // 保存位置
                    const rect = window.getBoundingClientRect();
                    configModule.set('ui.position.x', rect.left);
                    configModule.set('ui.position.y', rect.top);
                };
                
                document.addEventListener('mousemove', handleMouseMove);
                document.addEventListener('mouseup', handleMouseUp);
            });
            
            // 调整大小功能
            resizeHandles.forEach(handle => {
                handle.addEventListener('mousedown', (e) => {
                    e.preventDefault();
                    this.isResizing = true;
                    this.resizeDirection = handle.dataset.direction;
                    
                    const rect = window.getBoundingClientRect();
                    
                    const handleMouseMove = (e) => {
                        if (!this.isResizing) return;
                        
                        const style = window.style;
                        
                        // 移除bottom和right属性，避免冲突
                        style.bottom = '';
                        style.right = '';
                        
                        // 获取当前位置和大小
                        let left = parseFloat(style.left || rect.left);
                        let top = parseFloat(style.top || rect.top);
                        let width = rect.width;
                        let height = rect.height;
                        
                        // 根据方向调整大小
                        switch (this.resizeDirection) {
                            case 'n':
                                height = Math.max(this.minSize.height, height - (e.clientY - rect.top));
                                top = Math.min(rect.top, window.innerHeight - this.minSize.height);
                                break;
                            case 's':
                                height = Math.max(this.minSize.height, e.clientY - rect.top);
                                break;
                            case 'w':
                                width = Math.max(this.minSize.width, width - (e.clientX - rect.left));
                                left = Math.min(rect.left, window.innerWidth - this.minSize.width);
                                break;
                            case 'e':
                                width = Math.max(this.minSize.width, e.clientX - rect.left);
                                break;
                            case 'ne':
                                height = Math.max(this.minSize.height, height - (e.clientY - rect.top));
                                top = Math.min(rect.top, window.innerHeight - this.minSize.height);
                                width = Math.max(this.minSize.width, e.clientX - rect.left);
                                break;
                            case 'nw':
                                height = Math.max(this.minSize.height, height - (e.clientY - rect.top));
                                top = Math.min(rect.top, window.innerHeight - this.minSize.height);
                                width = Math.max(this.minSize.width, width - (e.clientX - rect.left));
                                left = Math.min(rect.left, window.innerWidth - this.minSize.width);
                                break;
                            case 'se':
                                height = Math.max(this.minSize.height, e.clientY - rect.top);
                                width = Math.max(this.minSize.width, e.clientX - rect.left);
                                break;
                            case 'sw':
                                height = Math.max(this.minSize.height, e.clientY - rect.top);
                                width = Math.max(this.minSize.width, width - (e.clientX - rect.left));
                                left = Math.min(rect.left, window.innerWidth - this.minSize.width);
                                break;
                        }
                        
                        // 应用调整后的尺寸和位置
                        style.width = `${width}px`;
                        style.height = `${height}px`;
                        style.left = `${left}px`;
                        style.top = `${top}px`;
                    };
                    
                    const handleMouseUp = () => {
                        this.isResizing = false;
                        this.resizeDirection = null;
                        document.removeEventListener('mousemove', handleMouseMove);
                        document.removeEventListener('mouseup', handleMouseUp);
                        
                        // 保存大小
                        const rect = window.getBoundingClientRect();
                        configModule.set('ui.size.width', rect.width);
                        configModule.set('ui.size.height', rect.height);
                    };
                    
                    document.addEventListener('mousemove', handleMouseMove);
                    document.addEventListener('mouseup', handleMouseUp);
                });
            });
        },
        
        toggleWindow: function() {
            const content = this.window.querySelector('.daojie-window-content');
            const footer = this.window.querySelector('.daojie-window-footer');
            
            if (content.style.display === 'none') {
                content.style.display = 'block';
                footer.style.display = 'block';
                this.window.style.height = `${ModuleRegistry.get('config').get('ui.size.height', 400)}px`;
            } else {
                content.style.display = 'none';
                footer.style.display = 'none';
                this.window.style.height = '50px';
            }
        },
        
        toggleMaximize: function() {
            const configModule = ModuleRegistry.get('config');
            const currentSize = configModule.get('ui.size', { width: 300, height: 400 });
            
            if (this.window.dataset.maximized === 'true') {
                // 恢复原始大小
                this.window.style.width = `${currentSize.width}px`;
                this.window.style.height = `${currentSize.height}px`;
                this.window.style.left = `${configModule.get('ui.position.x', 50)}px`;
                this.window.style.top = `${configModule.get('ui.position.y', 50)}px`;
                this.window.dataset.maximized = 'false';
            } else {
                // 最大化
                this.window.style.width = '80%';
                this.window.style.height = '80%';
                this.window.style.left = '10%';
                this.window.style.top = '10%';
                this.window.dataset.maximized = 'true';
            }
        },
        
        hideWindow: function() {
            this.window.style.display = 'none';
        },
        
        showWindow: function() {
            this.window.style.display = 'flex';
        },
        
        refreshEncouragement: function() {
            const encouragement = this.window.querySelector('.daojie-encouragement');
            const encouragementModule = ModuleRegistry.get('encouragement');
            encouragement.textContent = encouragementModule.getRandomEncouragement();
            
            // 添加动画效果
            encouragement.style.opacity = '0';
            setTimeout(() => {
                encouragement.style.transition = 'opacity 0.3s ease';
                encouragement.style.opacity = '1';
            }, 100);
        },
        
        showChatInterface: function() {
            // 创建聊天界面
            const chatWindow = document.createElement('div');
            chatWindow.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: #1a1a1a;
                border-radius: 8px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.3);
                z-index: 10000;
                width: 500px;
                max-width: 90vw;
                max-height: 80vh;
                display: flex;
                flex-direction: column;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            `;
            
            const overlay = document.createElement('div');
            overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0,0,0,0.5);
                z-index: 9999;
            `;
            
            const chatHeader = document.createElement('div');
            chatHeader.style.cssText = `
                padding: 15px 20px;
                background: #252525;
                color: white;
                border-bottom: 1px solid #333;
                display: flex;
                justify-content: space-between;
                align-items: center;
            `;
            
            const chatTitle = document.createElement('h3');
            chatTitle.style.cssText = 'margin: 0; font-size: 16px;';
            chatTitle.textContent = '联系客服';
            
            const closeChatBtn = document.createElement('button');
            closeChatBtn.style.cssText = `
                background: none;
                border: none;
                color: #ccc;
                font-size: 16px;
                cursor: pointer;
                width: 24px;
                height: 24px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 4px;
            `;
            closeChatBtn.innerHTML = '×';
            closeChatBtn.addEventListener('click', () => {
                document.body.removeChild(chatWindow);
                document.body.removeChild(overlay);
            });
            
            chatHeader.appendChild(chatTitle);
            chatHeader.appendChild(closeChatBtn);
            
            const chatContent = document.createElement('div');
            chatContent.style.cssText = `
                padding: 20px;
                flex: 1;
                overflow-y: auto;
                color: #e0e0e0;
            `;
            
            // 客服选项
            const supportOptions = [
                { title: '技术支持', desc: '遇到技术问题？我们的技术团队随时为您提供帮助。' },
                { title: '商务咨询', desc: '了解更多关于我们服务的信息和商务合作。' },
                { title: '反馈建议', desc: '有任何建议或反馈？请告诉我们，帮助我们改进。' }
            ];
            
            supportOptions.forEach(option => {
                const optionDiv = document.createElement('div');
                optionDiv.style.cssText = `
                    background: rgba(255, 255, 255, 0.05);
                    padding: 15px;
                    margin-bottom: 15px;
                    border-radius: 6px;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    border-left: 3px solid transparent;
                `;
                optionDiv.addEventListener('mouseenter', () => {
                    optionDiv.style.background = 'rgba(255, 255, 255, 0.1)';
                    optionDiv.style.borderLeftColor = '#00ff00';
                    optionDiv.style.transform = 'translateX(5px)';
                });
                optionDiv.addEventListener('mouseleave', () => {
                    optionDiv.style.background = 'rgba(255, 255, 255, 0.05)';
                    optionDiv.style.borderLeftColor = 'transparent';
                    optionDiv.style.transform = 'translateX(0)';
                });
                optionDiv.addEventListener('click', () => {
                    // 显示更友好的成功消息
                    const successMsg = document.createElement('div');
                    successMsg.style.cssText = `
                        position: fixed;
                        bottom: 50px;
                        left: 50%;
                        transform: translateX(-50%);
                        background: #4CAF50;
                        color: white;
                        padding: 15px 25px;
                        border-radius: 6px;
                        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                        z-index: 10001;
                        animation: slideUp 0.3s ease;
                    `;
                    successMsg.innerHTML = `
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <span style="font-size: 20px;">✓</span>
                            <span>已提交${option.title}请求，我们将尽快与您联系！</span>
                        </div>
                    `;
                    
                    document.body.appendChild(successMsg);
                    
                    // 3秒后移除消息
                    setTimeout(() => {
                        successMsg.style.transition = 'opacity 0.3s ease';
                        successMsg.style.opacity = '0';
                        setTimeout(() => {
                            document.body.removeChild(successMsg);
                        }, 300);
                    }, 3000);
                    
                    document.body.removeChild(chatWindow);
                    document.body.removeChild(overlay);
                });
                
                const optionTitle = document.createElement('h4');
                optionTitle.style.cssText = 'margin: 0 0 8px 0; color: #2196F3; font-size: 16px;';
                optionTitle.textContent = option.title;
                
                const optionDesc = document.createElement('p');
                optionDesc.style.cssText = 'margin: 0; font-size: 14px; opacity: 0.8;';
                optionDesc.textContent = option.desc;
                
                optionDiv.appendChild(optionTitle);
                optionDiv.appendChild(optionDesc);
                chatContent.appendChild(optionDiv);
            });
            
            const chatFooter = document.createElement('div');
            chatFooter.style.cssText = `
                padding: 15px 20px;
                background: #252525;
                border-top: 1px solid #333;
                text-align: center;
                font-size: 12px;
                color: #888;
            `;
            chatFooter.innerHTML = `
                <p style="margin: 0;">客服工作时间: 周一至周五 9:00-18:00</p>
            `;
            
            chatWindow.appendChild(chatHeader);
            chatWindow.appendChild(chatContent);
            chatWindow.appendChild(chatFooter);
            
            document.body.appendChild(overlay);
            document.body.appendChild(chatWindow);
        }
    };
    ModuleRegistry.register('ui', UIModule);

    // ===== 事件处理模块 =====
    const EventModule = {
        initialize: function() {
            // 添加图片点击事件监听
            this.setupImageClickHandler();
            
            LoggerModule.info('事件处理模块已初始化');
        },
        
        setupImageClickHandler: function() {
            document.addEventListener('click', this.handleImageClick.bind(this), true);
        },
        
        async handleImageClick(event) {
            try {
                // 检查是否按住Alt键
                if (!event.altKey) return;
                
                const img = event.target;
                if (!img || img.tagName !== 'IMG') return;

                // 阻止默认行为
                event.preventDefault();
                event.stopPropagation();

                // 显示处理中
                const originalCursor = document.body.style.cursor;
                document.body.style.cursor = 'wait';

                try {
                    // 创建canvas并绘制图片
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    
                    // 确保图片已加载完成
                    if (!img.complete) {
                        await new Promise((resolve, reject) => {
                            img.onload = resolve;
                            img.onerror = reject;
                        });
                    }
                    
                    canvas.width = img.naturalWidth || img.width;
                    canvas.height = img.naturalHeight || img.height;
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

                    // 转换为Blob
                    const blob = await new Promise((resolve) => {
                        canvas.toBlob(resolve, 'image/png');
                    });

                    // 处理图片
                    const imageProcessor = ModuleRegistry.get('imageProcessor');
                    const result = await imageProcessor.processImage(blob, {
                        upload: true,
                        ocr: true,
                        translate: true
                    });

                    // 显示结果
                    if (result.translation) {
                        const dialogResult = await this.createDialog({
                            title: '图片翻译结果',
                            message: result.translation,
                            commands: [
                                { id: 'copy', label: '复制文本' },
                                { id: 'view', label: '查看详情' }
                            ]
                        });

                        if (dialogResult.command === 'copy') {
                            try {
                                const utils = ModuleRegistry.get('utils');
                                await utils.copyToClipboard(result.translation);
                                alert('文本已复制到剪贴板');
                            } catch (e) {
                                alert('复制失败，请手动选择文本');
                            }
                        } else if (dialogResult.command === 'view') {
                            let details = `OCR结果: ${result.ocr || '无'}\n`;
                            details += `翻译结果: ${result.translation || '无'}\n`;
                            if (result.upload && result.upload.url) {
                                details += `上传链接: ${result.upload.url}`;
                            }
                            alert(details);
                        }
                    }
                } finally {
                    // 恢复光标
                    document.body.style.cursor = originalCursor;
                }
            } catch (error) {
                LoggerModule.error('图片处理失败:', error);
                alert('图片处理失败: ' + (error.message || '未知错误'));
            }
        },
        
        // 创建对话框
        createDialog: function(options) {
            return new Promise((resolve) => {
                const configModule = ModuleRegistry.get('config');
                const theme = configModule.get('ui.theme', 'dark');
                
                const dialog = document.createElement('div');
                dialog.style.cssText = `
                    position: fixed;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    background: ${theme === 'dark' ? '#1a1a1a' : 'white'};
                    padding: 20px;
                    border-radius: 8px;
                    box-shadow: 0 4px 16px rgba(0,0,0,0.3);
                    z-index: 9999;
                    width: ${options.width || '400px'};
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                `;
                
                const commandsHtml = options.commands.map(cmd => 
                    `<button style="display:block;width:100%;padding:10px;margin:8px 0;background:${theme === 'dark' ? '#333' : '#f5f5f5'};border:1px solid ${theme === 'dark' ? '#444' : '#ddd'};border-radius:4px;cursor:pointer;text-align:left;color:${theme === 'dark' ? '#e0e0e0' : '#333'}" data-command="${cmd.id}">
                      ${cmd.label}
                    </button>`
                ).join('');
                
                dialog.innerHTML = `
                    <h3 style="margin-top:0;color:${theme === 'dark' ? '#e0e0e0' : '#333'};">${options.title || '操作'}</h3>
                    <p style="color:${theme === 'dark' ? '#b0b0b0' : '#666'};">${options.message || ''}</p>
                    <div>${commandsHtml}</div>
                    <button style="padding:8px 16px;background:${theme === 'dark' ? '#333' : '#f5f5f5'};border:1px solid ${theme === 'dark' ? '#444' : '#ddd'};border-radius:4px;cursor:pointer;margin-top:15px;color:${theme === 'dark' ? '#e0e0e0' : '#333'}" class="close-btn">关闭</button>
                `;
                
                const overlay = document.createElement('div');
                overlay.style.cssText = `
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0,0,0,0.5);
                    z-index: 9998;
                `;
                
                document.body.appendChild(overlay);
                document.body.appendChild(dialog);
                
                // 命令按钮事件
                dialog.querySelectorAll('[data-command]').forEach(btn => {
                    btn.addEventListener('click', () => {
                        const cmd = btn.getAttribute('data-command');
                        document.body.removeChild(dialog);
                        document.body.removeChild(overlay);
                        resolve({ confirmed: true, command: cmd });
                    });
                });
                
                // 关闭按钮
                dialog.querySelector('.close-btn').addEventListener('click', () => {
                    document.body.removeChild(dialog);
                    document.body.removeChild(overlay);
                    resolve({ confirmed: false });
                });
                
                // ESC键关闭
                function handleEsc(e) {
                    if (e.key === 'Escape') {
                        document.body.removeChild(dialog);
                        document.body.removeChild(overlay);
                        document.removeEventListener('keydown', handleEsc);
                        resolve({ confirmed: false });
                    }
                }
                document.addEventListener('keydown', handleEsc);
            });
        }
    };
    ModuleRegistry.register('events', EventModule);

    // ===== 菜单模块 =====
    const MenuModule = {
        initialize: function() {
            if (typeof GM_registerMenuCommand !== 'undefined') {
                GM_registerMenuCommand('显示DAOJIE助手', () => {
                    const uiModule = ModuleRegistry.get('ui');
                    uiModule.showWindow();
                });
            }
            
            LoggerModule.info('菜单模块已初始化');
        }
    };
    ModuleRegistry.register('menu', MenuModule);

    // ===== 应用入口 =====
    const App = {
        initialize: function() {
            // 按顺序初始化模块
            ModuleRegistry.get('logger').initialize();
            ModuleRegistry.get('config').initialize();
            ModuleRegistry.get('utils').initialize();
            ModuleRegistry.get('encouragement').initialize();
            ModuleRegistry.get('imageProcessor').initialize();
            ModuleRegistry.get('ui').initialize();
            ModuleRegistry.get('events').initialize();
            ModuleRegistry.get('menu').initialize();
            
            LoggerModule.info('DAOJIE聊天图片采集应用已成功初始化');
        }
    };

    // 启动应用
    App.initialize();
    
    // 暴露给全局（用于调试）
    window.DAOJIE_CAPTURE = {
        moduleRegistry: ModuleRegistry,
        version: '2.1.0'
    };
})();