// ==UserScript==
// @name         JEV 嘉尔威智能客服工具
// @namespace    http://tampermonkey.net/
// @version      1.0.0
// @description  JEV智能客服系统的客服端插件（L4 UI层）
// @author       JEV Team
// @match        *://*
// @grant        GM_addStyle
// @grant        GM_registerMenuCommand
// ==/UserScript==

(function() {
    'use strict';
    
    console.log('[JEV] 嘉尔威智能客服工具初始化中...');
    
    // 全局样式
    GM_addStyle(`
        /* 全局样式 */
        body {
            margin: 0;
            font-family: 'Consolas', 'Roboto Mono', monospace;
        }
        
        /* JEV主容器 */
        #jev-container {
            position: fixed;
            top: 50px;
            left: 50px;
            width: 800px;
            height: 600px;
            background: rgba(15, 15, 15, 0.95);
            border: 1px solid #0f0;
            border-radius: 8px;
            box-shadow: 0 0 10px rgba(0, 255, 0, 0.5);
            color: #0f0;
            z-index: 9999;
            display: flex;
            flex-direction: column;
            overflow: hidden;
        }
        
        #jev-container.dragging {
            box-shadow: 0 0 20px rgba(0, 255, 0, 0.8);
            border-color: #33ff33;
        }
        
        #jev-container.minimized {
            height: 40px;
        }
        
        /* 顶部标题栏 */
        #jev-header {
            padding: 10px 20px;
            background: rgba(0, 30, 0, 0.8);
            border-bottom: 1px solid #0f0;
            display: flex;
            justify-content: space-between;
            align-items: center;
            cursor: move;
            user-select: none;
        }
        
        #jev-title {
            font-size: 16px;
            font-weight: bold;
            color: #0f0;
            text-shadow: 0 0 5px rgba(0, 255, 0, 0.7);
        }
        
        #jev-controls {
            display: flex;
            gap: 10px;
        }
        
        .jev-control-btn {
            width: 24px;
            height: 24px;
            border: 1px solid #0f0;
            background: rgba(0, 20, 0, 0.5);
            color: #0f0;
            border-radius: 4px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: all 0.3s ease;
        }
        
        .jev-control-btn:hover {
            background: rgba(0, 255, 0, 0.2);
            box-shadow: 0 0 8px rgba(0, 255, 0, 0.8);
        }
        
        /* 导航栏 */
        #jev-nav {
            background: rgba(0, 20, 0, 0.5);
            border-bottom: 1px solid #0f0;
            display: flex;
            overflow-x: auto;
            scrollbar-width: thin;
            scrollbar-color: #0f0 rgba(0, 20, 0, 0.5);
        }
        
        #jev-nav::-webkit-scrollbar {
            height: 6px;
        }
        
        #jev-nav::-webkit-scrollbar-track {
            background: rgba(0, 20, 0, 0.5);
        }
        
        #jev-nav::-webkit-scrollbar-thumb {
            background: #0f0;
            border-radius: 3px;
        }
        
        .jev-nav-item {
            padding: 10px 20px;
            border-right: 1px solid #0f0;
            cursor: pointer;
            transition: all 0.3s ease;
            white-space: nowrap;
        }
        
        .jev-nav-item:hover {
            background: rgba(0, 255, 0, 0.1);
            text-shadow: 0 0 5px rgba(0, 255, 0, 0.7);
        }
        
        .jev-nav-item.active {
            background: rgba(0, 255, 0, 0.2);
            box-shadow: inset 0 0 10px rgba(0, 255, 0, 0.5);
        }
        
        /* 内容区域 */
        #jev-content {
            flex: 1;
            padding: 20px;
            overflow-y: auto;
            scrollbar-width: thin;
            scrollbar-color: #0f0 rgba(0, 20, 0, 0.5);
        }
        
        #jev-content::-webkit-scrollbar {
            width: 6px;
        }
        
        #jev-content::-webkit-scrollbar-track {
            background: rgba(0, 20, 0, 0.5);
        }
        
        #jev-content::-webkit-scrollbar-thumb {
            background: #0f0;
            border-radius: 3px;
        }
        
        /* 底部状态栏 */
        #jev-footer {
            padding: 8px 20px;
            background: rgba(0, 30, 0, 0.8);
            border-top: 1px solid #0f0;
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 12px;
        }
        
        #jev-status {
            display: flex;
            gap: 20px;
        }
        
        .status-item {
            display: flex;
            align-items: center;
            gap: 5px;
        }
        
        .status-indicator {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            animation: pulse 2s infinite;
        }
        
        .status-indicator.green {
            background: #0f0;
        }
        
        .status-indicator.yellow {
            background: #ff0;
        }
        
        .status-indicator.red {
            background: #f00;
        }
        
        /* 通用组件样式 */
        .jev-button {
            padding: 8px 16px;
            border: 1px solid #0f0;
            background: rgba(0, 20, 0, 0.5);
            color: #0f0;
            border-radius: 4px;
            cursor: pointer;
            transition: all 0.3s ease;
            font-family: 'Consolas', 'Roboto Mono', monospace;
        }
        
        .jev-button:hover {
            background: rgba(0, 255, 0, 0.2);
            box-shadow: 0 0 8px rgba(0, 255, 0, 0.8);
        }
        
        .jev-input {
            padding: 8px 12px;
            border: 1px solid #0f0;
            background: rgba(0, 10, 0, 0.5);
            color: #0f0;
            border-radius: 4px;
            font-family: 'Consolas', 'Roboto Mono', monospace;
        }
        
        .jev-input:focus {
            outline: none;
            box-shadow: 0 0 8px rgba(0, 255, 0, 0.5);
        }
        
        .jev-card {
            padding: 15px;
            border: 1px solid #0f0;
            border-radius: 6px;
            background: rgba(0, 10, 0, 0.5);
            margin-bottom: 15px;
            transition: all 0.3s ease;
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
    `);
    
    // 全局JEV对象
    window.JEV = window.JEV || {};
    window.JEV_MODULES = {};
    
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
        init: function() {
            this.renderMainContainer();
            this.loadModules();
            this.bindEvents();
            this.loadUIState();
            this.switchModule('chat');
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
                        <div class="status-indicator green"></div>
                        <span>云端OK</span>
                    </div>
                    <div class="status-item">
                        <div class="status-indicator green"></div>
                        <span>DAOJIE同步</span>
                    </div>
                </div>
                <div id="jev-version">版本 1.0.0</div>
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
        
        // 加载所有模块
        loadModules: function() {
            // 注册聊天模块
            window.JEV_MODULES['chat'] = {
                render: function(container) {
                    container.innerHTML = `
                        <div class="jev-module" id="module-chat">
                            <div id="chat-messages">
                                <div class="message customer">
                                    <strong>客户：</strong>您好，我想咨询一下产品信息。
                                </div>
                                <div class="message support">
                                    <strong>客服：</strong>您好！很高兴为您服务，请问您想了解哪方面的产品信息呢？
                                </div>
                                <div class="message customer">
                                    <strong>客户：</strong>我想知道你们的产品价格和交付时间。
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
                    document.getElementById('chat-translate').addEventListener('click', function() {
                        console.log('[JEV] 调用翻译接口');
                        // 模拟翻译
                        alert('翻译功能：接口占位');
                    });
                    
                    document.getElementById('chat-ai-suggest').addEventListener('click', function() {
                        console.log('[JEV] 调用AI建议接口');
                        // 模拟AI建议
                        document.getElementById('chat-input').value = "您好，我们的产品价格根据配置不同有所差异，基础款起价为¥2999，高端配置可达¥8999。交付时间通常为下单后3-5个工作日内。您对哪个具体型号感兴趣呢？";
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
                            input.value = '';
                        }
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
                                <button class="jev-button">🔄 刷新推荐</button>
                            </div>
                        </div>
                    `;
                    
                    // 绑定采纳按钮事件
                    document.querySelectorAll('.recommendation-card .jev-button:first-child').forEach(btn => {
                        btn.addEventListener('click', function() {
                            const text = this.parentNode.previousElementSibling.textContent;
                            alert(`已采纳回复：${text}`);
                        });
                    });
                    
                    // 绑定刷新按钮事件
                    document.querySelector('#module-ai .jev-button:last-child').addEventListener('click', function() {
                        console.log('[JEV] 调用AI推荐接口');
                        alert('刷新推荐：接口占位');
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
                                    <h4>📄 报价生成</h4>
                                    <button class="jev-button" id="generate-quote">生成报价表格</button>
                                </div>
                                
                                <div class="tool-section">
                                    <h4>🕓 时间格式化</h4>
                                    <div class="tool-input-group">
                                        <label>当前时间:</label>
                                        <input type="text" class="jev-input" id="formatted-time" readonly>
                                    </div>
                                    <button class="jev-button" id="format-time">格式化</button>
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
                    
                    // 报价生成
                    document.getElementById('generate-quote').addEventListener('click', function() {
                        alert('报价表格生成中...');
                    });
                    
                    // 时间格式化
                    document.getElementById('format-time').addEventListener('click', function() {
                        const now = new Date();
                        const formatted = now.toLocaleString('zh-CN', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit'
                        });
                        document.getElementById('formatted-time').value = formatted;
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
                    container.innerHTML = `
                        <div class="jev-module" id="module-settings">
                            <div class="settings-section">
                                <h3 class="settings-title">关于</h3>
                                <p>JEV 嘉尔威智能客服工具 v1.0.0</p>
                                <p>客服端插件 (L4 UI层)</p>
                                <p>负责客户消息采集、展示与交互</p>
                            </div>
                            
                            <div class="settings-section">
                                <h3 class="settings-title">更新检查</h3>
                                <button class="jev-button" id="check-update">检查更新</button>
                                <div style="margin-top: 10px; font-size: 12px;">
                                    上次检查: 2023-07-15 10:30
                                </div>
                            </div>
                            
                            <div class="settings-section">
                                <h3 class="settings-title">系统状态</h3>
                                <div class="status-item">
                                    <div class="status-indicator green"></div>
                                    <span>AI服务: 正常</span>
                                </div>
                                <div class="status-item">
                                    <div class="status-indicator green"></div>
                                    <span>网络连接: 正常</span>
                                </div>
                                <div class="status-item">
                                    <div class="status-indicator green"></div>
                                    <span>数据同步: 正常</span>
                                </div>
                            </div>
                        </div>
                    `;
                    
                    // 绑定检查更新事件
                    document.getElementById('check-update').addEventListener('click', function() {
                        console.log('[JEV] 正在检查更新...');
                        this.innerHTML = '检查中...';
                        
                        setTimeout(() => {
                            alert('已是最新版本');
                            this.innerHTML = '检查更新';
                        }, 1500);
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
                if (e.target.closest('#jev-controls')) return;
                
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
            localStorage.setItem('jev_ui_state', JSON.stringify(state));
        },
        
        // 加载UI状态
        loadUIState: function() {
            const stateStr = localStorage.getItem('jev_ui_state');
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
    
    // 模拟API调用占位函数
    window.JEV_API = {
        upload: function(data) {
            console.log('[JEV] 接口占位 - upload');
            return Promise.resolve({ success: true, message: '接口占位' });
        },
        translate: function(text) {
            console.log('[JEV] 接口占位 - translate');
            return Promise.resolve({ success: true, message: '接口占位' });
        },
        recommend: function(context) {
            console.log('[JEV] 接口占位 - recommend');
            return Promise.resolve({ success: true, message: '接口占位' });
        },
        status: function() {
            console.log('[JEV] 接口占位 - status');
            return Promise.resolve({ success: true, message: '接口占位' });
        }
    };
    
    console.log('[JEV] 嘉尔威智能客服工具已加载完成');
})();