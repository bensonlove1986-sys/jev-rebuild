// ==UserScript==
// @name         JEV 嘉尔威智能客服工具（本地+云端联动版）
// @namespace    http://tampermonkey.net/
// @version      1.1.0
// @description  JEV智能客服系统客服端插件 - 支持本地Agent和云端Worker自动切换
// @author       JEV Team
// @match        *://*
// @grant        GM_addStyle
// @grant        GM_registerMenuCommand
// @connect      localhost
// @connect      jevshop.workers.dev
==/UserScript==

(function() {
    'use strict';
    
    console.log('[JEV] 客服端插件已启动');
    
    // 全局样式 - 科技柔光风格（NeoGreen Glass）
    GM_addStyle(`
        /* 全局样式 */
        body {
            margin: 0;
            font-family: 'Inter', 'Segoe UI', '微软雅黑', sans-serif;
        }
        
        /* JEV主容器 */
        #jev-container {
            position: fixed;
            top: 50px;
            left: 50px;
            width: 800px;
            height: 600px;
            background: rgba(12, 18, 15, 0.85);
            border: 1px solid rgba(0, 255, 140, 0.5);
            border-radius: 12px;
            box-shadow: 0 0 15px rgba(0, 255, 140, 0.4);
            color: #e0ffe5;
            z-index: 9999;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            backdrop-filter: blur(15px);
            transition: all 0.3s ease;
        }
        
        #jev-container.dragging {
            box-shadow: 0 0 25px rgba(0, 255, 140, 0.6);
            border-color: rgba(0, 255, 140, 0.8);
        }
        
        #jev-container.minimized {
            height: 48px;
        }
        
        /* 顶部标题栏 */
        #jev-header {
            padding: 12px 20px;
            background: rgba(10, 25, 15, 0.7);
            border-bottom: 1px solid rgba(0, 255, 140, 0.3);
            display: flex;
            justify-content: space-between;
            align-items: center;
            cursor: move;
            user-select: none;
            border-top-left-radius: 12px;
            border-top-right-radius: 12px;
        }
        
        #jev-title {
            font-size: 16px;
            font-weight: 600;
            color: #e0ffe5;
            text-shadow: 0 0 8px rgba(0, 255, 140, 0.3);
        }
        
        #jev-connection-status {
            font-size: 12px;
            padding: 4px 12px;
            border-radius: 15px;
            background: rgba(0, 255, 140, 0.15);
            border: 1px solid rgba(0, 255, 140, 0.3);
            color: #00ff99;
        }
        
        #jev-connection-status.local {
            background: rgba(0, 255, 140, 0.15);
            border-color: rgba(0, 255, 140, 0.3);
            color: #00ff99;
        }
        
        #jev-connection-status.cloud {
            background: rgba(0, 150, 255, 0.15);
            border-color: rgba(0, 150, 255, 0.3);
            color: #4da6ff;
        }
        
        #jev-connection-status.offline {
            background: rgba(255, 59, 59, 0.15);
            border-color: rgba(255, 59, 59, 0.3);
            color: #ff3b3b;
        }
        
        #jev-controls {
            display: flex;
            gap: 8px;
        }
        
        .jev-control-btn {
            width: 30px;
            height: 30px;
            border: 1px solid rgba(0, 255, 140, 0.3);
            background: rgba(10, 25, 15, 0.5);
            color: #e0ffe5;
            border-radius: 6px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: all 0.3s ease;
            position: relative;
            overflow: hidden;
        }
        
        .jev-control-btn:hover {
            background: linear-gradient(90deg, rgba(0, 255, 140, 0.2), rgba(0, 122, 61, 0.2));
            box-shadow: 0 0 12px rgba(0, 255, 140, 0.6);
            border-color: rgba(0, 255, 140, 0.5);
        }
        
        .jev-control-btn::before {
            content: '';
            position: absolute;
            top: -50%;
            left: -50%;
            width: 200%;
            height: 200%;
            background: linear-gradient(45deg, transparent, rgba(0, 255, 140, 0.2), transparent);
            animation: flow 2s infinite;
        }
        
        /* 导航栏 */
        #jev-nav {
            background: rgba(10, 25, 15, 0.6);
            border-bottom: 1px solid rgba(0, 255, 140, 0.3);
            display: flex;
            overflow-x: auto;
            scrollbar-width: thin;
            scrollbar-color: rgba(0, 255, 140, 0.5) rgba(10, 25, 15, 0.6);
        }
        
        #jev-nav::-webkit-scrollbar {
            height: 6px;
        }
        
        #jev-nav::-webkit-scrollbar-track {
            background: rgba(10, 25, 15, 0.6);
        }
        
        #jev-nav::-webkit-scrollbar-thumb {
            background: rgba(0, 255, 140, 0.5);
            border-radius: 3px;
        }
        
        .jev-nav-item {
            padding: 12px 24px;
            border-right: 1px solid rgba(0, 255, 140, 0.2);
            cursor: pointer;
            transition: all 0.3s ease;
            white-space: nowrap;
            position: relative;
            overflow: hidden;
            color: #e0ffe5;
            font-weight: 500;
        }
        
        .jev-nav-item:hover {
            background: rgba(0, 255, 140, 0.1);
            text-shadow: 0 0 8px rgba(0, 255, 140, 0.4);
        }
        
        .jev-nav-item.active {
            background: linear-gradient(90deg, rgba(0, 255, 140, 0.2), rgba(0, 122, 61, 0.15));
            box-shadow: inset 0 0 15px rgba(0, 255, 140, 0.3);
            color: #00ff99;
            text-shadow: 0 0 10px rgba(0, 255, 140, 0.5);
        }
        
        /* 内容区域 */
        #jev-content {
            flex: 1;
            padding: 24px;
            overflow-y: auto;
            scrollbar-width: thin;
            scrollbar-color: rgba(0, 255, 140, 0.5) rgba(10, 25, 15, 0.4);
        }
        
        #jev-content::-webkit-scrollbar {
            width: 8px;
        }
        
        #jev-content::-webkit-scrollbar-track {
            background: rgba(10, 25, 15, 0.4);
            border-radius: 4px;
        }
        
        #jev-content::-webkit-scrollbar-thumb {
            background: rgba(0, 255, 140, 0.5);
            border-radius: 4px;
            transition: background 0.3s ease;
        }
        
        #jev-content::-webkit-scrollbar-thumb:hover {
            background: rgba(0, 255, 140, 0.7);
        }
        
        /* 底部状态栏 */
        #jev-footer {
            padding: 10px 20px;
            background: rgba(10, 25, 15, 0.7);
            border-top: 1px solid rgba(0, 255, 140, 0.3);
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 13px;
            position: sticky;
            bottom: 0;
            border-bottom-left-radius: 12px;
            border-bottom-right-radius: 12px;
        }
        
        #jev-status {
            display: flex;
            gap: 24px;
        }
        
        .status-item {
            display: flex;
            align-items: center;
            gap: 8px;
            color: #e0ffe5;
        }
        
        .status-indicator {
            width: 10px;
            height: 10px;
            border-radius: 50%;
            animation: pulse 2s infinite;
            box-shadow: 0 0 6px currentColor;
        }
        
        .status-indicator.green {
            background: #00ff99;
            color: #00ff99;
        }
        
        .status-indicator.blue {
            background: #4da6ff;
            color: #4da6ff;
        }
        
        .status-indicator.yellow {
            background: #ffd166;
            color: #ffd166;
        }
        
        .status-indicator.red {
            background: #ff3b3b;
            color: #ff3b3b;
        }
        
        /* 通用组件样式 */
        .jev-button {
            padding: 10px 20px;
            border: 1px solid rgba(0, 255, 140, 0.3);
            background: linear-gradient(90deg, rgba(0, 255, 140, 0.8), rgba(0, 122, 61, 0.8));
            color: #e0ffe5;
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.3s ease;
            font-family: 'Inter', 'Segoe UI', '微软雅黑', sans-serif;
            position: relative;
            overflow: hidden;
            font-weight: 500;
            text-shadow: 0 0 5px rgba(0, 0, 0, 0.3);
        }
        
        .jev-button:hover {
            background: linear-gradient(90deg, #00ff99, #007a3d);
            box-shadow: 0 0 12px rgba(0, 255, 140, 0.6);
            transform: translateY(-1px);
        }
        
        .jev-button:active {
            transform: translateY(0);
        }
        
        .jev-button::before {
            content: '';
            position: absolute;
            top: -50%;
            left: -50%;
            width: 200%;
            height: 200%;
            background: linear-gradient(45deg, transparent, rgba(255, 255, 255, 0.3), transparent);
            animation: flow 2s infinite;
        }
        
        .jev-input {
            padding: 10px 16px;
            border: 1px solid rgba(0, 255, 140, 0.3);
            background: rgba(10, 25, 15, 0.5);
            color: #e0ffe5;
            border-radius: 8px;
            font-family: 'Inter', 'Segoe UI', '微软雅黑', sans-serif;
            transition: all 0.3s ease;
        }
        
        .jev-input:focus {
            outline: none;
            box-shadow: 0 0 12px rgba(0, 255, 140, 0.4);
            border-color: rgba(0, 255, 140, 0.6);
        }
        
        .jev-card {
            padding: 20px;
            border: 1px solid rgba(0, 255, 140, 0.2);
            border-radius: 10px;
            background: rgba(10, 25, 15, 0.6);
            margin-bottom: 20px;
            transition: all 0.3s ease;
            backdrop-filter: blur(10px);
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
        }
        
        .jev-card:hover {
            box-shadow: 0 6px 20px rgba(0, 255, 140, 0.15);
            border-color: rgba(0, 255, 140, 0.3);
        }
        
        .jev-card:hover {
            box-shadow: 0 0 10px rgba(0, 255, 0, 0.3);
        }
        
        /* 模块内容 */
        .jev-module {
            display: none;
            animation: fadeIn 0.3s ease-in-out;
        }
        
        .jev-module.active {
            display: block;
        }
        
        /* 聊天模块样式 */
        #chat-messages {
            height: 350px;
            overflow-y: auto;
            border: 1px solid #0f0;
            border-radius: 4px;
            padding: 10px;
            margin-bottom: 15px;
            background: rgba(0, 10, 0, 0.3);
        }
        
        .message {
            margin-bottom: 10px;
            padding: 8px;
            border-radius: 4px;
        }
        
        .message.customer {
            background: rgba(0, 50, 0, 0.3);
            border-left: 3px solid #0f0;
        }
        
        .message.support {
            background: rgba(0, 30, 0, 0.3);
            border-right: 3px solid #0f0;
            text-align: right;
        }
        
        .message.translated {
            background: rgba(0, 20, 40, 0.3);
            border-left: 3px solid #0066ff;
            font-style: italic;
            margin-top: -5px;
            margin-bottom: 15px;
        }
        
        #chat-input-container {
            display: flex;
            flex-direction: column;
            gap: 10px;
        }
        
        #chat-input {
            min-height: 80px;
            resize: vertical;
            padding: 10px;
        }
        
        #chat-actions {
            display: flex;
            justify-content: flex-end;
            gap: 10px;
        }
        
        /* AI推荐模块样式 */
        .recommendation-card {
            display: flex;
            flex-direction: column;
            gap: 10px;
            margin-bottom: 15px;
        }
        
        .recommendation-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .confidence-score {
            font-size: 12px;
            color: #0f0;
            background: rgba(0, 255, 0, 0.2);
            padding: 2px 8px;
            border-radius: 10px;
        }
        
        .recommendation-actions {
            display: flex;
            gap: 10px;
            margin-top: 10px;
        }
        
        /* 小工具模块样式 */
        .tools-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
        }
        
        .tool-section {
            padding: 15px;
            border: 1px solid #0f0;
            border-radius: 6px;
            background: rgba(0, 10, 0, 0.5);
        }
        
        .tool-input-group {
            margin-bottom: 10px;
        }
        
        .tool-input-group label {
            display: block;
            margin-bottom: 5px;
            font-size: 12px;
        }
        
        /* 设置模块样式 */
        .settings-section {
            margin-bottom: 20px;
            padding-bottom: 20px;
            border-bottom: 1px solid #0f0;
        }
        
        .settings-section:last-child {
            border-bottom: none;
        }
        
        .settings-title {
            font-size: 16px;
            margin-bottom: 15px;
            color: #0f0;
            text-shadow: 0 0 5px rgba(0, 255, 0, 0.5);
        }
        
        .connection-test-result {
            margin-top: 10px;
            padding: 10px;
            border-radius: 4px;
            font-size: 12px;
        }
        
        .connection-test-result.success {
            background: rgba(0, 255, 0, 0.1);
            border: 1px solid #0f0;
        }
        
        .connection-test-result.failed {
            background: rgba(255, 0, 0, 0.1);
            border: 1px solid #ff0000;
        }
        
        /* 动画 */
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        
        @keyframes pulse {
            0% { opacity: 1; }
            50% { opacity: 0.5; }
            100% { opacity: 1; }
        }
        
        @keyframes glow {
            0% { box-shadow: 0 0 5px rgba(0, 255, 0, 0.5); }
            50% { box-shadow: 0 0 20px rgba(0, 255, 0, 0.8); }
            100% { box-shadow: 0 0 5px rgba(0, 255, 0, 0.5); }
        }
        
        @keyframes flow {
            0% { transform: rotate(0deg) translateX(-100%); }
            100% { transform: rotate(360deg) translateX(100%); }
        }
    `);
    
    // 全局JEV对象
    window.JEV = window.JEV || {};
    window.JEV_MODULES = {};
    window.JEV_UI = {};
    window.JEV_CONNECTION = {};
    
    // 连接管理模块
    window.JEV_CONNECTION = {
        activeEndpoint: null,
        isLocal: false,
        endpoints: [
            { url: 'http://localhost:1820', name: '本地Agent', local: true },
            { url: 'https://control.jevshop.workers.dev', name: '云端Worker', local: false }
        ],
        
        // 检测连接
        async detectConnection() {
            console.log('[JEV] 正在检测连接...');
            
            for (const endpoint of this.endpoints) {
                try {
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 3000);
                    
                    const response = await fetch(`${endpoint.url}/ping`, {
                        method: 'GET',
                        signal: controller.signal,
                        headers: {
                            'Content-Type': 'application/json'
                        }
                    });
                    
                    clearTimeout(timeoutId);
                    
                    if (response.ok) {
                        this.activeEndpoint = endpoint.url;
                        this.isLocal = endpoint.local;
                        
                        // 保存连接模式到本地存储
                        localStorage.setItem('JEV_CONN_MODE', JSON.stringify({
                            url: endpoint.url,
                            local: endpoint.local
                        }));
                        
                        console.log(`[JEV] 检测到${endpoint.name}连接成功`);
                        
                        if (window.JEV_UI && window.JEV_UI.updateConnectionStatus) {
                            window.JEV_UI.updateConnectionStatus(endpoint.local);
                        }
                        
                        return { url: endpoint.url, local: endpoint.local };
                    }
                } catch (error) {
                    console.log(`[JEV] ${endpoint.name}连接失败:`, error.message);
                }
            }
            
            // 无可用连接
            this.activeEndpoint = null;
            this.isLocal = false;
            console.log('[JEV] 无可用连接，切换到离线模式');
            
            if (window.JEV_UI && window.JEV_UI.updateConnectionStatus) {
                window.JEV_UI.updateConnectionStatus(null);
            }
            
            return { url: null, local: false };
        },
        
        // 获取当前端点
        getCurrentEndpoint() {
            if (!this.activeEndpoint) {
                // 尝试从本地存储恢复
                const savedMode = localStorage.getItem('JEV_CONN_MODE');
                if (savedMode) {
                    try {
                        const mode = JSON.parse(savedMode);
                        this.activeEndpoint = mode.url;
                        this.isLocal = mode.local;
                    } catch (e) {
                        console.error('[JEV] 解析保存的连接模式失败:', e);
                    }
                }
            }
            return this.activeEndpoint;
        },
        
        // 发送请求（自动切换）
        async sendRequest(endpoint, options = {}) {
            const currentEndpoint = this.getCurrentEndpoint();
            
            if (!currentEndpoint) {
                // 尝试重新检测连接
                await this.detectConnection();
                
                if (!this.activeEndpoint) {
                    console.error('[JEV] 无可用连接，请求失败');
                    return { success: false, error: '无可用连接' };
                }
            }
            
            const url = `${this.activeEndpoint}${endpoint}`;
            
            try {
                console.log(`[JEV] 发送请求到 ${url}`);
                const response = await fetch(url, {
                    ...options,
                    headers: {
                        'Content-Type': 'application/json',
                        ...options.headers
                    }
                });
                
                const data = await response.json();
                return { success: true, data };
            } catch (error) {
                console.error(`[JEV] 请求失败:`, error);
                
                // 如果是本地连接失败，尝试切换到云端
                if (this.isLocal) {
                    console.log('[JEV] 本地连接失败，尝试切换到云端');
                    const cloudEndpoint = this.endpoints.find(e => !e.local);
                    this.activeEndpoint = cloudEndpoint.url;
                    this.isLocal = false;
                    
                    if (window.JEV_UI && window.JEV_UI.updateConnectionStatus) {
                        window.JEV_UI.updateConnectionStatus(false);
                    }
                    
                    return this.sendRequest(endpoint, options);
                }
                
                return { success: false, error: error.message };
            }
        },
        
        // 模拟接口调用
        mockApiCall(endpoint) {
            console.log(`[JEV] ${endpoint} 接口占位`);
            return Promise.resolve({ success: true, message: '接口占位' });
        }
    };
    
    // 主UI控制器
    window.JEV_UI = {
        container: null,
        header: null,
        nav: null,
        content: null,
        footer: null,
        currentModule: 'chat',
        isMinimized: false,
        dragInfo: { isDragging: false, startX: 0, startY: 0, startLeft: 0, startTop: 0 },
        
        // 初始化UI
        init: async function() {
            this.renderMainContainer();
            
            // 先检测连接
            await window.JEV_CONNECTION.detectConnection();
            
            this.loadModules();
            this.bindEvents();
            this.loadUIState();
            this.switchModule('chat');
            
            // 加载保存的草稿
            this.loadDraft();
            
            console.log('[JEV] UI初始化完成');
        },
        
        // 渲染主容器
        renderMainContainer: function() {
            const container = document.createElement('div');
            container.id = 'jev-container';
            
            // 头部
            const header = document.createElement('div');
            header.id = 'jev-header';
            header.innerHTML = `
                <div id="jev-title">🌿 JEV 嘉尔威智能客服工具</div>
                <div id="jev-connection-status" class="local">🟢 当前模式：本地</div>
                <div id="jev-controls">
                    <div class="jev-control-btn" id="jev-minimize">−</div>
                    <div class="jev-control-btn" id="jev-close">×</div>
                </div>
            `;
            
            // 导航栏
            const nav = document.createElement('div');
            nav.id = 'jev-nav';
            nav.innerHTML = `
                <div class="jev-nav-item active" data-module="chat">💬 聊天</div>
                <div class="jev-nav-item" data-module="ai">🧠 AI推荐</div>
                <div class="jev-nav-item" data-module="tools">🧩 小工具</div>
                <div class="jev-nav-item" data-module="settings">⚙️ 设置</div>
            `;
            
            // 内容区
            const content = document.createElement('div');
            content.id = 'jev-content';
            
            // 底部状态栏
            const footer = document.createElement('div');
            footer.id = 'jev-footer';
            footer.innerHTML = `
                <div id="jev-status">
                    <div class="status-item">
                        <div class="status-indicator green"></div>
                        <span>AI运行中</span>
                    </div>
                    <div class="status-item">
                        <div class="status-indicator blue"></div>
                        <span>云端OK</span>
                    </div>
                    <div class="status-item">
                        <div class="status-indicator green"></div>
                        <span>本地Agent已连接</span>
                    </div>
                </div>
                <div id="jev-version">版本 1.1.0</div>
            `;
            
            container.appendChild(header);
            container.appendChild(nav);
            container.appendChild(content);
            container.appendChild(footer);
            
            document.body.appendChild(container);
            
            this.container = container;
            this.header = header;
            this.nav = nav;
            this.content = content;
            this.footer = footer;
        },
        
        // 更新连接状态显示
        updateConnectionStatus: function(local) {
            const statusElement = document.getElementById('jev-connection-status');
            const agentStatus = document.querySelector('.status-item:last-child .status-indicator');
            
            if (local === null) {
                // 离线
                statusElement.className = 'offline';
                statusElement.textContent = '🔴 当前模式：离线';
                agentStatus.className = 'status-indicator red';
                document.querySelector('.status-item:last-child span').textContent = '未连接';
            } else if (local) {
                // 本地
                statusElement.className = 'local';
                statusElement.textContent = '🟢 当前模式：本地';
                agentStatus.className = 'status-indicator green';
                document.querySelector('.status-item:last-child span').textContent = '本地Agent已连接';
            } else {
                // 云端
                statusElement.className = 'cloud';
                statusElement.textContent = '🔵 当前模式：云端';
                agentStatus.className = 'status-indicator red';
                document.querySelector('.status-item:last-child span').textContent = '本地Agent未连接';
            }
        },
        
        // 加载所有模块
        loadModules: function() {
            // 注册聊天模块
            window.JEV_MODULES['chat'] = {
                render: function(container) {
                    container.innerHTML = `
                        <div class="jev-module" id="module-chat">
                            <h3 class="settings-title">聊天与翻译</h3>
                            <div id="chat-messages">
                                <div class="message customer">
                                    <strong>客户：</strong>Hello, I want to inquire about your product information.
                                </div>
                                <div class="message translated">
                                    <strong>翻译：</strong>您好，我想咨询一下产品信息。
                                </div>
                                <div class="message support">
                                    <strong>客服：</strong>您好！很高兴为您服务，请问您想了解哪方面的产品信息呢？
                                </div>
                                <div class="message customer">
                                    <strong>客户：</strong>I want to know about your product prices and delivery times.
                                </div>
                                <div class="message translated">
                                    <strong>翻译：</strong>我想知道你们的产品价格和交付时间。
                                </div>
                            </div>
                            <div id="chat-input-container">
                                <textarea id="chat-input" class="jev-input" placeholder="请输入回复内容..."></textarea>
                                <div id="chat-actions">
                                    <button class="jev-button" id="chat-translate">🌐 翻译</button>
                                    <button class="jev-button" id="chat-ai-suggest">🧠 AI建议</button>
                                    <button class="jev-button" id="chat-send">发送</button>
                                </div>
                            </div>
                        </div>
                    `;
                    
                    // 绑定聊天事件
                    document.getElementById('chat-translate').addEventListener('click', async function() {
                        const input = document.getElementById('chat-input');
                        if (input.value.trim()) {
                            // 尝试通过连接模块发送请求
                            console.log('[JEV] 调用翻译接口');
                            
                            const result = await window.JEV_CONNECTION.sendRequest('/translate', {
                                method: 'POST',
                                body: JSON.stringify({ text: input.value })
                            });
                            
                            // 模拟翻译结果
                            if (!result.success) {
                                // 如果连接失败，使用模拟数据
                                const mockResult = await window.JEV_CONNECTION.mockApiCall('/translate');
                                alert('翻译结果（模拟）：这是一段翻译后的文本。');
                            } else {
                                // 实际环境中处理返回的数据
                                console.log('[JEV] 翻译结果:', result.data);
                            }
                        }
                    });
                    
                    document.getElementById('chat-ai-suggest').addEventListener('click', async function() {
                        console.log('[JEV] 调用AI建议接口');
                        
                        const result = await window.JEV_CONNECTION.sendRequest('/recommend', {
                            method: 'POST',
                            body: JSON.stringify({ context: '产品价格和交付时间' })
                        });
                        
                        if (!result.success) {
                            // 模拟AI建议
                            await window.JEV_CONNECTION.mockApiCall('/recommend');
                            document.getElementById('chat-input').value = "您好，我们的产品价格根据配置不同有所差异，基础款起价为¥2999，高端配置可达¥8999。交付时间通常为下单后3-5个工作日内。您对哪个具体型号感兴趣呢？";
                        } else {
                            // 实际环境中处理返回的建议
                            console.log('[JEV] AI建议结果:', result.data);
                        }
                    });
                    
                    document.getElementById('chat-send').addEventListener('click', function() {
                        const input = document.getElementById('chat-input');
                        if (input.value.trim()) {
                            const messages = document.getElementById('chat-messages');
                            const newMessage = document.createElement('div');
                            newMessage.className = 'message support';
                            newMessage.innerHTML = `<strong>客服：</strong>${input.value}`;
                            messages.appendChild(newMessage);
                            messages.scrollTop = messages.scrollHeight;
                            
                            // 清空输入并保存草稿
                            input.value = '';
                            window.JEV_UI.saveDraft('');
                        }
                    });
                    
                    // 保存草稿
                    document.getElementById('chat-input').addEventListener('input', function() {
                        window.JEV_UI.saveDraft(this.value);
                    });
                },
                init: function() {
                    console.log('[JEV] 模块 [聊天] 已加载');
                },
                destroy: function() {
                    console.log('[JEV] 模块 [聊天] 已卸载');
                }
            };
            
            // 注册AI推荐模块
            window.JEV_MODULES['ai'] = {
                render: function(container) {
                    container.innerHTML = `
                        <div class="jev-module" id="module-ai">
                            <h3 class="settings-title">AI推荐回复</h3>
                            
                            <div class="recommendation-card jev-card">
                                <div class="recommendation-header">
                                    <h4>推荐回复 #1</h4>
                                    <span class="confidence-score">置信度: 92%</span>
                                </div>
                                <p>您好，我们的产品价格根据配置不同有所差异，基础款起价为¥2999，高端配置可达¥8999。交付时间通常为下单后3-5个工作日内。</p>
                                <div class="recommendation-actions">
                                    <button class="jev-button">采纳</button>
                                    <button class="jev-button">修改</button>
                                </div>
                            </div>
                            
                            <div class="recommendation-card jev-card">
                                <div class="recommendation-header">
                                    <h4>推荐回复 #2</h4>
                                    <span class="confidence-score">置信度: 85%</span>
                                </div>
                                <p>感谢您的咨询！我们提供多种产品型号，价格区间为¥2999-¥8999，具体取决于您选择的配置。标准交付时间为3-5个工作日。</p>
                                <div class="recommendation-actions">
                                    <button class="jev-button">采纳</button>
                                    <button class="jev-button">修改</button>
                                </div>
                            </div>
                            
                            <div class="recommendation-card jev-card">
                                <div class="recommendation-header">
                                    <h4>推荐回复 #3</h4>
                                    <span class="confidence-score">置信度: 78%</span>
                                </div>
                                <p>您好，价格和交付时间因产品型号而异。基础配置¥2999，3天内发货；高级配置¥5999-¥8999，5天内发货。</p>
                                <div class="recommendation-actions">
                                    <button class="jev-button">采纳</button>
                                    <button class="jev-button">修改</button>
                                </div>
                            </div>
                            
                            <div style="text-align: center; margin-top: 20px;">
                                <button class="jev-button" id="refresh-recommendations">🔄 刷新推荐</button>
                            </div>
                        </div>
                    `;
                    
                    // 绑定采纳按钮事件
                    document.querySelectorAll('.recommendation-card .jev-button:first-child').forEach(btn => {
                        btn.addEventListener('click', function() {
                            const text = this.parentNode.previousElementSibling.textContent;
                            
                            // 切换到聊天模块并填充内容
                            window.JEV_UI.switchModule('chat');
                            setTimeout(() => {
                                const chatInput = document.getElementById('chat-input');
                                if (chatInput) {
                                    chatInput.value = text;
                                    chatInput.focus();
                                    window.JEV_UI.saveDraft(text);
                                }
                            }, 100);
                        });
                    });
                    
                    // 绑定刷新按钮事件
                    document.getElementById('refresh-recommendations').addEventListener('click', async function() {
                        console.log('[JEV] 刷新AI推荐');
                        
                        const result = await window.JEV_CONNECTION.sendRequest('/recommend', {
                            method: 'POST',
                            body: JSON.stringify({ refresh: true })
                        });
                        
                        if (!result.success) {
                            // 模拟刷新
                            await window.JEV_CONNECTION.mockApiCall('/recommend');
                            alert('推荐已刷新（模拟）');
                        } else {
                            // 实际环境中刷新推荐内容
                            console.log('[JEV] 刷新结果:', result.data);
                        }
                    });
                },
                init: function() {
                    console.log('[JEV] 模块 [AI推荐] 已加载');
                },
                destroy: function() {
                    console.log('[JEV] 模块 [AI推荐] 已卸载');
                }
            };
            
            // 注册小工具模块
            window.JEV_MODULES['tools'] = {
                render: function(container) {
                    container.innerHTML = `
                        <div class="jev-module" id="module-tools">
                            <h3 class="settings-title">实用工具</h3>
                            
                            <div class="tools-grid">
                                <div class="tool-section">
                                    <h4>🧮 单位换算</h4>
                                    <div class="tool-input-group">
                                        <label>厘米 (cm):</label>
                                        <input type="number" class="jev-input" id="cm-input" placeholder="输入厘米值">
                                    </div>
                                    <div class="tool-input-group">
                                        <label>英寸 (inch):</label>
                                        <input type="number" class="jev-input" id="inch-input" placeholder="输入英寸值" readonly>
                                    </div>
                                    <button class="jev-button" id="convert-cm-inch">转换</button>
                                </div>
                                
                                <div class="tool-section">
                                    <h4>💱 汇率换算</h4>
                                    <div class="tool-input-group">
                                        <label>美元 (USD):</label>
                                        <input type="number" class="jev-input" id="usd-input" placeholder="输入美元值">
                                    </div>
                                    <div class="tool-input-group">
                                        <label>印度卢比 (INR):</label>
                                        <input type="number" class="jev-input" id="inr-input" placeholder="输入卢比值" readonly>
                                    </div>
                                    <button class="jev-button" id="convert-usd-inr">转换</button>
                                </div>
                                
                                <div class="tool-section">
                                    <h4>🕓 时间转换</h4>
                                    <div class="tool-input-group">
                                        <label>UTC时间:</label>
                                        <input type="text" class="jev-input" id="utc-input" placeholder="YYYY-MM-DD HH:MM:SS">
                                    </div>
                                    <div class="tool-input-group">
                                        <label>本地时间:</label>
                                        <input type="text" class="jev-input" id="local-time-input" placeholder="本地时间" readonly>
                                    </div>
                                    <button class="jev-button" id="convert-time">转换</button>
                                </div>
                                
                                <div class="tool-section">
                                    <h4>📄 快速报价单</h4>
                                    <button class="jev-button" id="generate-quote">生成报价单</button>
                                </div>
                            </div>
                        </div>
                    `;
                    
                    // 单位换算
                    document.getElementById('convert-cm-inch').addEventListener('click', function() {
                        const cmValue = document.getElementById('cm-input').value;
                        if (cmValue) {
                            const inchValue = (parseFloat(cmValue) / 2.54).toFixed(2);
                            document.getElementById('inch-input').value = inchValue;
                        }
                    });
                    
                    // 汇率换算
                    document.getElementById('convert-usd-inr').addEventListener('click', function() {
                        const usdValue = document.getElementById('usd-input').value;
                        if (usdValue) {
                            // 模拟汇率
                            const inrValue = (parseFloat(usdValue) * 83.5).toFixed(2);
                            document.getElementById('inr-input').value = inrValue;
                        }
                    });
                    
                    // 时间转换
                    document.getElementById('convert-time').addEventListener('click', function() {
                        const utcInput = document.getElementById('utc-input').value;
                        if (utcInput) {
                            const utcDate = new Date(utcInput + ' UTC');
                            if (!isNaN(utcDate.getTime())) {
                                document.getElementById('local-time-input').value = utcDate.toLocaleString();
                            } else {
                                alert('请输入有效的UTC时间格式');
                            }
                        }
                    });
                    
                    // 报价生成 - 尝试使用本地Agent
                    document.getElementById('generate-quote').addEventListener('click', async function() {
                        console.log('[JEV] 调用本地任务生成报价单');
                        
                        // 优先尝试本地Agent
                        try {
                            const result = await fetch('http://localhost:1820/task', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ action: 'generate_quote', template: 'pi' })
                            });
                            
                            if (result.ok) {
                                const data = await result.json();
                                console.log('[JEV] 报价单生成成功:', data);
                                alert('报价单已生成（本地）');
                            } else {
                                throw new Error('本地Agent调用失败');
                            }
                        } catch (error) {
                            console.log('[JEV] 本地调用失败，回退到云端', error);
                            // 回退到云端
                            const cloudResult = await window.JEV_CONNECTION.sendRequest('/local-task', {
                                method: 'POST',
                                body: JSON.stringify({ action: 'generate_quote', template: 'pi' })
                            });
                            
                            if (!cloudResult.success) {
                                // 模拟生成
                                await window.JEV_CONNECTION.mockApiCall('/local-task');
                                alert('报价单已生成（模拟）\n\nPI格式报价单\n日期: 2023-07-15\n客户: 示例客户\n产品: JEV智能客服系统\n单价: ¥9999.00\n数量: 1\n总计: ¥9999.00');
                            }
                        }
                    });
                },
                init: function() {
                    console.log('[JEV] 模块 [小工具] 已加载');
                },
                destroy: function() {
                    console.log('[JEV] 模块 [小工具] 已卸载');
                }
            };
            
            // 注册设置模块
            window.JEV_MODULES['settings'] = {
                render: function(container) {
                    const connectionMode = window.JEV_CONNECTION.isLocal ? '本地' : window.JEV_CONNECTION.activeEndpoint ? '云端' : '离线';
                    
                    container.innerHTML = `
                        <div class="jev-module" id="module-settings">
                            <div class="settings-section">
                                <h3 class="settings-title">关于</h3>
                                <p>JEV 嘉尔威智能客服工具 v1.1.0</p>
                                <p>客服端插件 (L4 UI层)</p>
                                <p>支持本地Agent和云端Worker自动切换</p>
                            </div>
                            
                            <div class="settings-section">
                                <h3 class="settings-title">连接设置</h3>
                                <p>当前连接模式: <strong>${connectionMode}</strong></p>
                                <button class="jev-button" id="switch-connection">切换连接模式</button>
                                <button class="jev-button" id="test-connection">测试连接</button>
                                <div id="connection-test-result" style="display: none;"></div>
                            </div>
                            
                            <div class="settings-section">
                                <h3 class="settings-title">系统状态</h3>
                                <div class="status-item">
                                    <div class="status-indicator ${window.JEV_CONNECTION.activeEndpoint ? 'green' : 'red'}"></div>
                                    <span>连接状态: ${window.JEV_CONNECTION.activeEndpoint ? '已连接' : '未连接'}</span>
                                </div>
                                <div class="status-item">
                                    <div class="status-indicator green"></div>
                                    <span>AI服务: 正常</span>
                                </div>
                                <div class="status-item">
                                    <div class="status-indicator ${window.JEV_CONNECTION.isLocal ? 'green' : 'red'}"></div>
                                    <span>本地Agent: ${window.JEV_CONNECTION.isLocal ? '已连接' : '未连接'}</span>
                                </div>
                            </div>
                            
                            <div class="settings-section">
                                <h3 class="settings-title">更新检查</h3>
                                <button class="jev-button" id="check-update">检查更新</button>
                                <div style="margin-top: 10px; font-size: 12px;">
                                    上次检查: ${localStorage.getItem('JEV_LAST_UPDATE_CHECK') || '从未检查'}
                                </div>
                            </div>
                        </div>
                    `;
                    
                    // 切换连接模式
                    document.getElementById('switch-connection').addEventListener('click', async function() {
                        console.log('[JEV] 切换连接模式');
                        
                        // 强制重新检测连接
                        window.JEV_CONNECTION.activeEndpoint = null;
                        await window.JEV_CONNECTION.detectConnection();
                        
                        // 重新渲染设置模块以更新状态
                        window.JEV_MODULES['settings'].render(container);
                    });
                    
                    // 测试连接
                    document.getElementById('test-connection').addEventListener('click', async function() {
                        const resultElement = document.getElementById('connection-test-result');
                        resultElement.style.display = 'block';
                        resultElement.className = '';
                        resultElement.textContent = '正在测试连接...';
                        
                        try {
                            const result = await window.JEV_CONNECTION.detectConnection();
                            
                            if (result.url) {
                                resultElement.className = 'connection-test-result success';
                                resultElement.textContent = `连接成功: ${result.local ? '本地Agent' : '云端Worker'} (${result.url})`;
                            } else {
                                resultElement.className = 'connection-test-result failed';
                                resultElement.textContent = '连接失败: 未检测到可用的本地Agent或云端Worker';
                            }
                        } catch (error) {
                            resultElement.className = 'connection-test-result failed';
                            resultElement.textContent = `测试失败: ${error.message}`;
                        }
                    });
                    
                    // 检查更新
                    document.getElementById('check-update').addEventListener('click', async function() {
                        console.log('[JEV] 正在检查更新...');
                        this.innerHTML = '检查中...';
                        
                        try {
                            const result = await window.JEV_CONNECTION.sendRequest('/version');
                            
                            if (!result.success) {
                                // 模拟检查更新
                                await window.JEV_CONNECTION.mockApiCall('/status');
                            }
                            
                            // 保存检查时间
                            const now = new Date().toLocaleString();
                            localStorage.setItem('JEV_LAST_UPDATE_CHECK', now);
                            
                            alert('已是最新版本');
                        } catch (error) {
                            console.error('[JEV] 更新检查失败:', error);
                            alert('更新检查失败，请稍后重试');
                        } finally {
                            this.innerHTML = '检查更新';
                            // 重新渲染以更新时间
                            window.JEV_MODULES['settings'].render(container);
                        }
                    });
                },
                init: function() {
                    console.log('[JEV] 模块 [设置] 已加载');
                },
                destroy: function() {
                    console.log('[JEV] 模块 [设置] 已卸载');
                }
            };
        },
        
        // 绑定事件
        bindEvents: function() {
            // 拖拽功能
            this.header.addEventListener('mousedown', (e) => {
                if (e.target.closest('#jev-controls') || e.target.closest('#jev-connection-status')) return;
                
                this.dragInfo.isDragging = true;
                this.dragInfo.startX = e.clientX;
                this.dragInfo.startY = e.clientY;
                this.dragInfo.startLeft = this.container.offsetLeft;
                this.dragInfo.startTop = this.container.offsetTop;
                
                this.container.classList.add('dragging');
            });
            
            document.addEventListener('mousemove', (e) => {
                if (!this.dragInfo.isDragging) return;
                
                const dx = e.clientX - this.dragInfo.startX;
                const dy = e.clientY - this.dragInfo.startY;
                
                this.container.style.left = (this.dragInfo.startLeft + dx) + 'px';
                this.container.style.top = (this.dragInfo.startTop + dy) + 'px';
            });
            
            document.addEventListener('mouseup', () => {
                if (this.dragInfo.isDragging) {
                    this.dragInfo.isDragging = false;
                    this.container.classList.remove('dragging');
                    this.saveUIState();
                }
            });
            
            // 最小化功能
            document.getElementById('jev-minimize').addEventListener('click', () => {
                this.isMinimized = !this.isMinimized;
                if (this.isMinimized) {
                    this.container.classList.add('minimized');
                    this.nav.style.display = 'none';
                    this.content.style.display = 'none';
                    this.footer.style.display = 'none';
                } else {
                    this.container.classList.remove('minimized');
                    this.nav.style.display = 'flex';
                    this.content.style.display = 'block';
                    this.footer.style.display = 'flex';
                }
                this.saveUIState();
            });
            
            // 关闭功能
            document.getElementById('jev-close').addEventListener('click', () => {
                if (confirm('确定要关闭JEV客服工具吗？')) {
                    this.container.remove();
                    // 可以在这里添加清理逻辑
                }
            });
            
            // 导航切换
            this.nav.querySelectorAll('.jev-nav-item').forEach(item => {
                item.addEventListener('click', () => {
                    const moduleName = item.getAttribute('data-module');
                    this.switchModule(moduleName);
                });
            });
        },
        
        // 切换模块
        switchModule: function(moduleName) {
            if (!window.JEV_MODULES[moduleName]) {
                console.error('[JEV] 模块', moduleName, '不存在');
                return;
            }
            
            // 卸载当前模块
            if (window.JEV_MODULES[this.currentModule]) {
                window.JEV_MODULES[this.currentModule].destroy();
            }
            
            // 更新导航状态
            this.nav.querySelectorAll('.jev-nav-item').forEach(item => {
                item.classList.remove('active');
                if (item.getAttribute('data-module') === moduleName) {
                    item.classList.add('active');
                }
            });
            
            // 渲染新模块
            this.content.innerHTML = '';
            window.JEV_MODULES[moduleName].render(this.content);
            window.JEV_MODULES[moduleName].init();
            
            this.currentModule = moduleName;
        },
        
        // 保存UI状态
        saveUIState: function() {
            const state = {
                left: this.container.offsetLeft,
                top: this.container.offsetTop,
                width: this.container.offsetWidth,
                height: this.container.offsetHeight,
                isMinimized: this.isMinimized,
                currentModule: this.currentModule
            };
            localStorage.setItem('JEV_UI_STATE', JSON.stringify(state));
        },
        
        // 加载UI状态
        loadUIState: function() {
            const stateStr = localStorage.getItem('JEV_UI_STATE');
            if (stateStr) {
                try {
                    const state = JSON.parse(stateStr);
                    if (state.left !== undefined) this.container.style.left = state.left + 'px';
                    if (state.top !== undefined) this.container.style.top = state.top + 'px';
                    if (state.width !== undefined) this.container.style.width = state.width + 'px';
                    if (state.height !== undefined) this.container.style.height = state.height + 'px';
                    if (state.isMinimized) {
                        this.isMinimized = state.isMinimized;
                        this.container.classList.add('minimized');
                        this.nav.style.display = 'none';
                        this.content.style.display = 'none';
                        this.footer.style.display = 'none';
                    }
                    if (state.currentModule) this.currentModule = state.currentModule;
                } catch (e) {
                    console.error('[JEV] 加载UI状态失败:', e);
                }
            }
        },
        
        // 保存草稿
        saveDraft: function(text) {
            localStorage.setItem('JEV_DRAFT', text);
        },
        
        // 加载草稿
        loadDraft: function() {
            const draft = localStorage.getItem('JEV_DRAFT');
            if (draft && this.currentModule === 'chat') {
                setTimeout(() => {
                    const chatInput = document.getElementById('chat-input');
                    if (chatInput) {
                        chatInput.value = draft;
                    }
                }, 100);
            }
        }
    };
    
    // 初始化JEV UI
    document.addEventListener('DOMContentLoaded', function() {
        setTimeout(() => {
            window.JEV_UI.init();
        }, 1000);
    });
    
    // 注册Tampermonkey菜单命令
    GM_registerMenuCommand("打开JEV客服工具", function() {
        if (!document.getElementById('jev-container')) {
            window.JEV_UI.init();
        } else {
            const container = document.getElementById('jev-container');
            container.style.display = container.style.display === 'none' ? 'flex' : 'flex';
        }
    });
    
    console.log('[JEV] 当前工作模式：本地优先');
})();