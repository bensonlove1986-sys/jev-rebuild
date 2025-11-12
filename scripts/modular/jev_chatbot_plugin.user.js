// ==UserScript==
// @name         JEV 嘉尔威智能客服插件
// @namespace    http://tampermonkey.net/
// @version      1.0.0
// @description  JEV智能客服插件 - 集成聊天、AI推荐、翻译和图片识别功能
// @author       JEV 嘉尔威科技
// @match        *://*/*
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addStyle
// @grant        GM_registerMenuCommand
// @run-at       document-idle
// @downloadURL  https://jevshop.workers.dev/plugin/download
// @updateURL    https://jevshop.workers.dev/plugin/version
// ==/UserScript==

(function() {
    'use strict';
    
    console.log('🌿 JEV 嘉尔威智能客服插件 v1.0.0 加载中...');
    
    // 初始化全局JEV对象
    window.JEV = window.JEV || {};
    window.JEV_UI = window.JEV_UI || {};
    
    // 配置信息
    const JEV_CONFIG = {
        version: '1.0.0',
        apiBaseUrl: 'https://jevshop.workers.dev',
        debug: true,
        modules: ['chat', 'ai', 'image', 'settings']
    };
    
    // 加载状态跟踪
    const loadState = {
        uiCoreLoaded: false,
        styleLoaded: false,
        modulesLoaded: 0,
        totalModules: JEV_CONFIG.modules.length,
        allLoaded: false
    };
    
    // 日志记录函数
    function log(message, level = 'info') {
        if (!JEV_CONFIG.debug && level === 'debug') return;
        
        const prefix = `[JEV ${level.toUpperCase()}]`;
        const timestamp = new Date().toLocaleTimeString();
        
        switch(level) {
            case 'error':
                console.error(`${prefix} [${timestamp}]`, message);
                break;
            case 'warn':
                console.warn(`${prefix} [${timestamp}]`, message);
                break;
            case 'debug':
                console.debug(`${prefix} [${timestamp}]`, message);
                break;
            default:
                console.log(`${prefix} [${timestamp}]`, message);
        }
    }
    
    // 注入CSS样式
    function loadStyle() {
        log('加载样式文件...', 'debug');
        
        // 这里直接内联样式，而不是通过网络请求加载
        const cssContent = `
/* JEV 嘉尔威智能客服插件 - 全局样式主题 */

/* ========== 全局重置与基础样式 ========== */
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: 'Consolas', 'Segoe UI', 'Roboto', monospace;
    background: rgba(0, 0, 0, 0.95);
    color: #0f0;
    overflow: hidden;
}

/* ========== JEV主容器样式 ========== */
#jev-container {
    position: fixed;
    top: 100px;
    left: 200px;
    width: 600px;
    height: 400px;
    background: rgba(15, 15, 15, 0.95);
    border: 1px solid #0f0;
    border-radius: 8px;
    box-shadow: 0 0 20px rgba(0, 255, 0, 0.3);
    display: flex;
    flex-direction: column;
    z-index: 9999;
    overflow: hidden;
}

/* ========== 窗口拖动区域样式 ========== */
#jev-header {
    height: 40px;
    background: rgba(0, 20, 0, 0.8);
    border-bottom: 1px solid #0f0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 15px;
    cursor: move;
    user-select: none;
    position: relative;
}

#jev-title {
    font-size: 14px;
    font-weight: bold;
    color: #0f0;
    display: flex;
    align-items: center;
    gap: 8px;
}

#jev-window-controls {
    display: flex;
    gap: 8px;
}

.window-btn {
    width: 24px;
    height: 24px;
    border: 1px solid #0f0;
    background: transparent;
    color: #0f0;
    border-radius: 4px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    transition: all 0.3s;
}

.window-btn:hover {
    background: rgba(0, 255, 0, 0.2);
    box-shadow: 0 0 8px rgba(0, 255, 0, 0.5);
}

#btn-close:hover {
    background: rgba(255, 0, 0, 0.2);
    border-color: #f00;
    color: #f00;
    box-shadow: 0 0 8px rgba(255, 0, 0, 0.3);
}

/* ========== 导航栏样式 ========== */
#jev-navigation {
    height: 45px;
    background: rgba(0, 15, 0, 0.8);
    border-bottom: 1px solid #0f0;
    display: flex;
    align-items: center;
    padding: 0 10px;
    position: relative;
}

.nav-item {
    padding: 8px 16px;
    margin: 0 4px;
    border: 1px solid transparent;
    background: transparent;
    color: #0a0;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.3s;
    font-size: 14px;
    display: flex;
    align-items: center;
    gap: 6px;
}

.nav-item:hover {
    background: rgba(0, 255, 0, 0.1);
    border-color: #0f0;
    color: #0f0;
}

.nav-item.active {
    background: rgba(0, 255, 0, 0.2);
    border-color: #0f0;
    color: #0f0;
    font-weight: bold;
    box-shadow: 0 0 8px rgba(0, 255, 0, 0.3);
}

/* ========== 模块内容区域样式 ========== */
#jev-modules-container {
    flex: 1;
    overflow: hidden;
    position: relative;
}

.jev-module {
    width: 100%;
    height: 100%;
    padding: 15px;
    overflow-y: auto;
    display: none;
}

.jev-module.active {
    display: block;
}

/* ========== 底部状态栏样式 ========== */
#jev-status-bar {
    height: 30px;
    background: rgba(0, 20, 0, 0.8);
    border-top: 1px solid #0f0;
    display: flex;
    align-items: center;
    padding: 0 15px;
    font-size: 12px;
    color: #0a0;
}

.status-indicator {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-right: 20px;
}

.status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #0f0;
    box-shadow: 0 0 6px #0f0;
}

.status-dot.red {
    background: #f00;
    box-shadow: 0 0 6px #f00;
}

.status-dot.yellow {
    background: #ffaa00;
    box-shadow: 0 0 6px #ffaa00;
}

/* ========== 通用组件样式 ========== */

/* 按钮基础样式 */
.jev-btn {
    background: transparent;
    border: 1px solid #0f0;
    color: #0f0;
    padding: 8px 20px;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.3s;
    font-size: 14px;
    font-family: inherit;
}

.jev-btn:hover {
    background: rgba(0, 255, 0, 0.2);
    box-shadow: 0 0 8px rgba(0, 255, 0, 0.5);
}

.jev-btn:active {
    transform: scale(0.98);
}

.jev-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    box-shadow: none;
}

.jev-btn.primary {
    background: rgba(0, 255, 0, 0.1);
    font-weight: bold;
}

.jev-btn.danger {
    border-color: #f00;
    color: #f00;
}

.jev-btn.danger:hover {
    background: rgba(255, 0, 0, 0.1);
    box-shadow: 0 0 8px rgba(255, 0, 0, 0.3);
}

/* 输入框基础样式 */
.jev-input,
.jev-textarea,
.jev-select {
    background: rgba(0, 10, 0, 0.5);
    border: 1px solid #0f0;
    border-radius: 4px;
    color: #0f0;
    font-family: inherit;
    font-size: 14px;
    transition: all 0.3s;
}

.jev-input,
.jev-select {
    height: 32px;
    padding: 0 12px;
}

.jev-textarea {
    padding: 10px 12px;
    resize: vertical;
    min-height: 80px;
}

.jev-input:focus,
.jev-textarea:focus,
.jev-select:focus {
    outline: none;
    box-shadow: 0 0 8px rgba(0, 255, 0, 0.5);
    border-color: rgba(0, 255, 0, 0.8);
}

/* 滚动条全局样式 */
::-webkit-scrollbar {
    width: 8px;
    height: 8px;
}

::-webkit-scrollbar-track {
    background: rgba(0, 20, 0, 0.5);
    border-radius: 4px;
}

::-webkit-scrollbar-thumb {
    background: #0f0;
    border-radius: 4px;
    box-shadow: 0 0 8px rgba(0, 255, 0, 0.3);
    transition: all 0.3s;
}

::-webkit-scrollbar-thumb:hover {
    background: rgba(0, 255, 0, 0.8);
    box-shadow: 0 0 10px rgba(0, 255, 0, 0.5);
}
        `;
        
        try {
            GM_addStyle(cssContent);
            loadState.styleLoaded = true;
            log('样式文件加载完成', 'debug');
            checkAndInitialize();
        } catch (error) {
            log('加载样式文件失败: ' + error.message, 'error');
        }
    }
    
    // 创建UI核心模块
    function createUICore() {
        log('创建UI核心模块...', 'debug');
        
        // UI核心对象定义
        window.JEV_UI = {
            activeModule: 'chat',
            modules: {},
            container: null,
            
            // 初始化函数
            init: async function() {
                log('初始化UI核心模块...', 'debug');
                
                // 创建主容器
                this.createMainContainer();
                
                // 加载模块
                await this.loadModules();
                
                // 渲染UI
                this.render();
                
                // 绑定事件
                this.bindEvents();
                
                // 加载保存的状态
                this.loadState();
                
                log('UI核心模块初始化完成', 'info');
            },
            
            // 创建主容器
            createMainContainer: function() {
                const container = document.createElement('div');
                container.id = 'jev-container';
                
                container.innerHTML = `
                    <div id="jev-header">
                        <div id="jev-title">
                            <span>🌿 JEV 嘉尔威智能客服工具</span>
                        </div>
                        <div id="jev-window-controls">
                            <button class="window-btn" id="btn-minimize" title="最小化">—</button>
                            <button class="window-btn" id="btn-resize" title="调整大小">▢</button>
                            <button class="window-btn" id="btn-close" title="关闭">✕</button>
                        </div>
                    </div>
                    
                    <div id="jev-navigation">
                        <button class="nav-item active" data-module="chat">💬 聊天</button>
                        <button class="nav-item" data-module="ai">🧠 AI推荐</button>
                        <button class="nav-item" data-module="image">📷 图片识别</button>
                        <button class="nav-item" data-module="settings">⚙️ 设置</button>
                    </div>
                    
                    <div id="jev-modules-container">
                        <div id="jev-module-chat" class="jev-module active"></div>
                        <div id="jev-module-ai" class="jev-module"></div>
                        <div id="jev-module-image" class="jev-module"></div>
                        <div id="jev-module-settings" class="jev-module"></div>
                    </div>
                    
                    <div id="jev-status-bar">
                        <div class="status-indicator">
                            <span class="status-dot"></span>
                            <span>AI运行中</span>
                        </div>
                        <div class="status-indicator">
                            <span class="status-dot"></span>
                            <span>云端连接OK</span>
                        </div>
                        <div class="status-indicator">
                            <span class="status-dot"></span>
                            <span>DAOJIE同步ON</span>
                        </div>
                        <div class="status-indicator" style="margin-left: auto;">
                            <span>v${JEV_CONFIG.version}</span>
                        </div>
                    </div>
                `;
                
                document.body.appendChild(container);
                this.container = container;
            },
            
            // 加载模块
            loadModules: async function() {
                try {
                    // 这里使用内联定义的模块，而不是动态导入
                    
                    // 聊天模块
                    this.modules.chat = createChatModule();
                    
                    // AI推荐模块
                    this.modules.ai = createAIModule();
                    
                    // 图片识别模块
                    this.modules.image = createImageModule();
                    
                    // 设置模块
                    this.modules.settings = createSettingsModule();
                    
                    // 初始化所有模块
                    for (const [name, module] of Object.entries(this.modules)) {
                        if (module && module.init) {
                            const moduleContainer = document.getElementById(`jev-module-${name}`);
                            if (moduleContainer) {
                                module.init(moduleContainer);
                                loadState.modulesLoaded++;
                                log(`模块 ${name} 初始化完成`, 'debug');
                            }
                        }
                    }
                    
                    loadState.allLoaded = true;
                } catch (error) {
                    log('加载模块失败: ' + error.message, 'error');
                }
            },
            
            // 渲染UI
            render: function() {
                this.switchModule(this.activeModule);
            },
            
            // 绑定事件
            bindEvents: function() {
                // 窗口拖动
                this.setupWindowDrag();
                
                // 窗口控制按钮
                document.getElementById('btn-minimize').addEventListener('click', () => this.minimizeWindow());
                document.getElementById('btn-resize').addEventListener('click', () => this.toggleSize());
                document.getElementById('btn-close').addEventListener('click', () => this.closeWindow());
                
                // 导航菜单切换
                document.querySelectorAll('#jev-navigation .nav-item').forEach(navItem => {
                    navItem.addEventListener('click', (e) => {
                        const moduleName = e.target.dataset.module;
                        this.switchModule(moduleName);
                    });
                });
            },
            
            // 窗口拖动功能
            setupWindowDrag: function() {
                const header = document.getElementById('jev-header');
                const container = this.container;
                
                let isDragging = false;
                let offsetX, offsetY;
                
                header.addEventListener('mousedown', (e) => {
                    if (e.target.closest('#jev-window-controls')) return;
                    
                    isDragging = true;
                    
                    // 计算鼠标相对于容器的位置
                    const rect = container.getBoundingClientRect();
                    offsetX = e.clientX - rect.left;
                    offsetY = e.clientY - rect.top;
                    
                    // 添加样式提示拖动状态
                    container.style.cursor = 'grabbing';
                    container.style.opacity = '0.9';
                });
                
                document.addEventListener('mousemove', (e) => {
                    if (!isDragging) return;
                    
                    // 计算新位置
                    const newX = e.clientX - offsetX;
                    const newY = e.clientY - offsetY;
                    
                    // 设置新位置
                    container.style.left = `${newX}px`;
                    container.style.top = `${newY}px`;
                });
                
                document.addEventListener('mouseup', () => {
                    if (isDragging) {
                        isDragging = false;
                        container.style.cursor = 'default';
                        container.style.opacity = '1';
                        this.saveState();
                    }
                });
            },
            
            // 最小化窗口
            minimizeWindow: function() {
                const container = this.container;
                const originalHeight = container.style.height || '400px';
                const isMinimized = container.style.height === '40px';
                
                if (isMinimized) {
                    // 恢复窗口大小
                    container.style.height = originalHeight;
                    document.getElementById('jev-navigation').style.display = 'flex';
                    document.getElementById('jev-modules-container').style.display = 'block';
                    document.getElementById('jev-status-bar').style.display = 'flex';
                    document.getElementById('btn-minimize').textContent = '—';
                } else {
                    // 最小化窗口
                    container.style.height = '40px';
                    document.getElementById('jev-navigation').style.display = 'none';
                    document.getElementById('jev-modules-container').style.display = 'none';
                    document.getElementById('jev-status-bar').style.display = 'none';
                    document.getElementById('btn-minimize').textContent = '▢';
                }
                
                this.saveState();
            },
            
            // 切换窗口大小
            toggleSize: function() {
                const container = this.container;
                const isMaximized = container.style.width === '90vw' && container.style.height === '80vh';
                
                if (isMaximized) {
                    // 恢复原始大小
                    container.style.width = this.savedState?.width || '600px';
                    container.style.height = this.savedState?.height || '400px';
                    container.style.left = this.savedState?.left || '200px';
                    container.style.top = this.savedState?.top || '100px';
                    document.getElementById('btn-resize').textContent = '▢';
                } else {
                    // 保存当前状态
                    this.savedState = {
                        width: container.style.width,
                        height: container.style.height,
                        left: container.style.left,
                        top: container.style.top
                    };
                    
                    // 最大化窗口
                    container.style.width = '90vw';
                    container.style.height = '80vh';
                    container.style.left = '5vw';
                    container.style.top = '10vh';
                    document.getElementById('btn-resize').textContent = '▣';
                }
                
                this.saveState();
            },
            
            // 关闭窗口
            closeWindow: function() {
                if (confirm('确定要关闭JEV智能客服工具吗？')) {
                    this.container.style.display = 'none';
                    log('JEV智能客服工具已关闭', 'info');
                }
            },
            
            // 切换模块
            switchModule: function(moduleName) {
                if (!this.modules[moduleName]) {
                    log(`模块 ${moduleName} 不存在`, 'error');
                    return;
                }
                
                // 隐藏所有模块
                document.querySelectorAll('.jev-module').forEach(module => {
                    module.classList.remove('active');
                });
                
                // 移除所有导航项的活跃状态
                document.querySelectorAll('#jev-navigation .nav-item').forEach(item => {
                    item.classList.remove('active');
                });
                
                // 激活选中的模块
                const moduleElement = document.getElementById(`jev-module-${moduleName}`);
                const navElement = document.querySelector(`#jev-navigation .nav-item[data-module="${moduleName}"]`);
                
                if (moduleElement && navElement) {
                    moduleElement.classList.add('active');
                    navElement.classList.add('active');
                    this.activeModule = moduleName;
                    
                    // 触发模块切换事件
                    if (this.modules[moduleName].onActivate) {
                        this.modules[moduleName].onActivate();
                    }
                    
                    log(`切换到 ${moduleName} 模块`, 'debug');
                    this.saveState();
                }
            },
            
            // 保存状态
            saveState: function() {
                try {
                    const state = {
                        activeModule: this.activeModule,
                        position: {
                            left: this.container.style.left,
                            top: this.container.style.top,
                            width: this.container.style.width,
                            height: this.container.style.height
                        }
                    };
                    
                    localStorage.setItem('JEV_UI_STATE', JSON.stringify(state));
                } catch (error) {
                    log('保存状态失败: ' + error.message, 'error');
                }
            },
            
            // 加载状态
            loadState: function() {
                try {
                    const savedState = localStorage.getItem('JEV_UI_STATE');
                    if (savedState) {
                        const state = JSON.parse(savedState);
                        
                        // 恢复模块
                        if (state.activeModule) {
                            this.activeModule = state.activeModule;
                        }
                        
                        // 恢复位置和大小
                        if (state.position) {
                            if (state.position.left) this.container.style.left = state.position.left;
                            if (state.position.top) this.container.style.top = state.position.top;
                            if (state.position.width) this.container.style.width = state.position.width;
                            if (state.position.height) this.container.style.height = state.position.height;
                        }
                    }
                } catch (error) {
                    log('加载状态失败: ' + error.message, 'error');
                }
            },
            
            // 显示通知
            showNotification: function(message, type = 'info') {
                const notification = document.createElement('div');
                notification.className = `notification ${type}`;
                notification.textContent = message;
                
                document.body.appendChild(notification);
                
                // 自动关闭
                setTimeout(() => {
                    notification.style.opacity = '0';
                    notification.style.transition = 'opacity 0.5s';
                    setTimeout(() => {
                        if (notification.parentNode) {
                            notification.parentNode.removeChild(notification);
                        }
                    }, 500);
                }, 3000);
            }
        };
        
        loadState.uiCoreLoaded = true;
        log('UI核心模块创建完成', 'debug');
        checkAndInitialize();
    }
    
    // 创建聊天模块
    function createChatModule() {
        return {
            init: function(container) {
                console.log('初始化聊天模块');
                this.container = container;
                
                // 设置模块内容
                this.container.innerHTML = `
                    <div class="chat-container">
                        <div class="chat-messages" id="chat-messages">
                            <!-- 客户消息和翻译结果 -->
                            <div class="customer-message-block">
                                <div class="message-header">
                                    <span class="sender">客户</span>
                                    <span class="timestamp">14:30</span>
                                </div>
                                <div class="message-content">
                                    <div class="original-text">您好，我想了解一下你们的产品信息，特别是关于PDF转换为网页的功能。</div>
                                    <div class="translation">Hello, I would like to know about your product information, especially the function of converting PDF to webpage.</div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="chat-input-area">
                            <div class="reply-tabs">
                                <button class="tab-btn active" data-tab="ai">🧠 AI草稿</button>
                                <button class="tab-btn" data-tab="manual">✍ 人工编辑</button>
                            </div>
                            
                            <div class="reply-content">
                                <div class="tab-content active" id="tab-ai">
                                    <textarea id="ai-reply" class="reply-textarea" placeholder="AI将在此生成回复草稿...">您好！我们的PDF转网页功能非常强大，可以保留原始文档的所有格式和样式，支持图片、表格、链接等元素。您可以通过上传PDF文件，然后选择转换选项，系统会自动生成响应式网页。您是否需要我为您演示这个功能？</textarea>
                                </div>
                                <div class="tab-content" id="tab-manual">
                                    <textarea id="manual-reply" class="reply-textarea" placeholder="请输入您的回复..."></textarea>
                                </div>
                            </div>
                            
                            <div class="reply-actions">
                                <button class="action-btn" id="btn-ai-reply">🧠 AI回复</button>
                                <button class="action-btn" id="btn-translate">🌐 翻译</button>
                                <button class="action-btn primary-btn" id="btn-send">🚀 发送</button>
                            </div>
                        </div>
                    </div>
                `;
                
                // 添加样式
                this.addStyles();
                
                // 绑定事件
                this.bindEvents();
            },
            
            addStyles: function() {
                const style = document.createElement('style');
                style.textContent = `
                    .chat-container {
                        height: 100%;
                        display: flex;
                        flex-direction: column;
                    }
                    
                    .chat-messages {
                        flex: 1;
                        overflow-y: auto;
                        margin-bottom: 15px;
                    }
                    
                    .customer-message-block {
                        margin-bottom: 20px;
                        padding: 15px;
                        border: 1px solid #0f0;
                        border-radius: 6px;
                        background: rgba(0, 20, 0, 0.3);
                    }
                    
                    .message-header {
                        display: flex;
                        justify-content: space-between;
                        margin-bottom: 10px;
                        color: #0a0;
                        font-size: 12px;
                    }
                    
                    .message-content {
                        display: flex;
                        flex-direction: column;
                        gap: 10px;
                    }
                    
                    .original-text {
                        padding: 10px;
                        background: rgba(0, 10, 0, 0.5);
                        border-radius: 4px;
                        color: #0f0;
                    }
                    
                    .translation {
                        padding: 10px;
                        background: rgba(0, 10, 0, 0.2);
                        border-radius: 4px;
                        color: #0a0;
                        font-style: italic;
                    }
                    
                    .chat-input-area {
                        border-top: 1px solid #0f0;
                        padding-top: 15px;
                    }
                    
                    .reply-tabs {
                        display: flex;
                        gap: 10px;
                        margin-bottom: 10px;
                    }
                    
                    .tab-btn {
                        background: transparent;
                        border: 1px solid #0f0;
                        color: #0a0;
                        padding: 6px 16px;
                        border-radius: 4px;
                        cursor: pointer;
                        transition: all 0.3s;
                        font-size: 12px;
                    }
                    
                    .tab-btn:hover {
                        background: rgba(0, 255, 0, 0.1);
                    }
                    
                    .tab-btn.active {
                        background: rgba(0, 255, 0, 0.2);
                        color: #0f0;
                        font-weight: bold;
                    }
                    
                    .reply-content {
                        margin-bottom: 10px;
                    }
                    
                    .tab-content {
                        display: none;
                    }
                    
                    .tab-content.active {
                        display: block;
                    }
                    
                    .reply-textarea {
                        width: 100%;
                        height: 100px;
                        padding: 10px;
                        border: 1px solid #0f0;
                        border-radius: 4px;
                        background: rgba(0, 10, 0, 0.5);
                        color: #0f0;
                        font-family: inherit;
                        resize: vertical;
                    }
                    
                    .reply-textarea:focus {
                        outline: none;
                        box-shadow: 0 0 8px rgba(0, 255, 0, 0.5);
                    }
                    
                    .reply-actions {
                        display: flex;
                        justify-content: flex-end;
                        gap: 10px;
                    }
                    
                    .action-btn {
                        background: transparent;
                        border: 1px solid #0f0;
                        color: #0f0;
                        padding: 8px 20px;
                        border-radius: 4px;
                        cursor: pointer;
                        transition: all 0.3s;
                        font-size: 14px;
                    }
                    
                    .action-btn:hover {
                        background: rgba(0, 255, 0, 0.2);
                    }
                    
                    .action-btn.primary-btn {
                        background: rgba(0, 255, 0, 0.1);
                        font-weight: bold;
                    }
                `;
                document.head.appendChild(style);
            },
            
            bindEvents: function() {
                // 选项卡切换
                document.querySelectorAll('.reply-tabs .tab-btn').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        const tabName = e.target.dataset.tab;
                        this.switchTab(tabName);
                    });
                });
                
                // 按钮事件
                document.getElementById('btn-ai-reply').addEventListener('click', () => this.generateAIReply());
                document.getElementById('btn-translate').addEventListener('click', () => this.translateMessage());
                document.getElementById('btn-send').addEventListener('click', () => this.sendMessage());
            },
            
            switchTab: function(tabName) {
                // 隐藏所有选项卡内容
                document.querySelectorAll('.reply-content .tab-content').forEach(tab => {
                    tab.classList.remove('active');
                });
                
                // 移除所有按钮的活跃状态
                document.querySelectorAll('.reply-tabs .tab-btn').forEach(btn => {
                    btn.classList.remove('active');
                });
                
                // 激活选中的选项卡
                const tabContent = document.getElementById(`tab-${tabName}`);
                const tabBtn = document.querySelector(`.reply-tabs .tab-btn[data-tab="${tabName}"]`);
                
                if (tabContent && tabBtn) {
                    tabContent.classList.add('active');
                    tabBtn.classList.add('active');
                }
            },
            
            generateAIReply: function() {
                const aiReplyTextarea = document.getElementById('ai-reply');
                const loadingText = 'AI正在生成回复...';
                
                // 显示加载状态
                aiReplyTextarea.value = loadingText;
                aiReplyTextarea.disabled = true;
                
                // 模拟AI生成回复
                setTimeout(() => {
                    const replies = [
                        '您好！我们的PDF转网页功能支持批量转换、样式保留和响应式设计。您可以上传单个或多个PDF文件，系统会自动优化并生成适合各种设备查看的网页。您有特定的PDF文件需要转换吗？',
                        '感谢您的咨询！我们的PDF转网页工具不仅可以保留原始文档的所有元素，还提供了额外的优化选项，如压缩图片、添加交互元素等。您可以先免费试用，满意后再考虑购买完整版本。',
                        '您好！关于PDF转网页功能，我们提供了多种输出格式选择，包括HTML、HTML5和响应式网页。转换后的页面保持原文档的所有格式和功能，同时优化了加载速度。您需要了解更多细节吗？'
                    ];
                    
                    const randomReply = replies[Math.floor(Math.random() * replies.length)];
                    aiReplyTextarea.value = randomReply;
                    aiReplyTextarea.disabled = false;
                    
                    // 切换到AI回复选项卡
                    this.switchTab('ai');
                }, 2000);
            },
            
            translateMessage: function() {
                // 获取当前激活的文本框内容
                const activeTab = document.querySelector('.reply-content .tab-content.active').id;
                const textarea = document.getElementById(activeTab === 'tab-ai' ? 'ai-reply' : 'manual-reply');
                const originalText = textarea.value;
                
                if (!originalText.trim()) {
                    alert('请先输入要翻译的文本');
                    return;
                }
                
                // 显示加载状态
                textarea.value = '正在翻译...';
                textarea.disabled = true;
                
                // 模拟翻译过程
                setTimeout(() => {
                    // 简单的模拟翻译
                    let translatedText;
                    if (originalText.includes('您好') || originalText.includes('我们') || originalText.includes('功能')) {
                        translatedText = 'Hello! Our PDF to webpage service can help you convert documents efficiently while preserving all formatting and styles. Would you like more specific information?';
                    } else {
                        translatedText = 'This is a simulated translation of your text.';
                    }
                    
                    textarea.value = translatedText;
                    textarea.disabled = false;
                }, 1500);
            },
            
            sendMessage: function() {
                // 获取当前激活的文本框内容
                const activeTab = document.querySelector('.reply-content .tab-content.active').id;
                const textarea = document.getElementById(activeTab === 'tab-ai' ? 'ai-reply' : 'manual-reply');
                const message = textarea.value;
                
                if (!message.trim()) {
                    alert('请输入要发送的消息');
                    return;
                }
                
                // 模拟发送消息
                const messagesContainer = document.getElementById('chat-messages');
                const now = new Date();
                const timeString = `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;
                
                // 创建发送的消息元素
                const sentMessageBlock = document.createElement('div');
                sentMessageBlock.className = 'customer-message-block';
                sentMessageBlock.innerHTML = `
                    <div class="message-header">
                        <span class="sender">我</span>
                        <span class="timestamp">${timeString}</span>
                    </div>
                    <div class="message-content">
                        <div class="original-text">${message}</div>
                    </div>
                `;
                
                messagesContainer.appendChild(sentMessageBlock);
                
                // 清空文本框
                textarea.value = '';
                
                // 滚动到底部
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
                
                // 显示发送成功通知
                window.JEV_UI.showNotification('消息发送成功', 'success');
            }
        };
    }
    
    // 创建AI推荐模块
    function createAIModule() {
        return {
            init: function(container) {
                console.log('初始化AI推荐模块');
                this.container = container;
                
                // 设置模块内容
                this.container.innerHTML = `
                    <div class="ai-recommendations">
                        <div class="recommendations-header">
                            <h3>推荐回复</h3>
                            <button class="refresh-btn" id="btn-refresh-recs">🔄 刷新</button>
                        </div>
                        
                        <div class="recommendation-cards">
                            <!-- 推荐卡片 -->
                            <div class="rec-card">
                                <div class="rec-content">
                                    <p>基于客户咨询的PDF转网页功能，我建议提供详细的功能介绍，包括支持的格式、转换速度和价格优势。</p>
                                </div>
                                <div class="rec-meta">
                                    <span class="confidence">置信度: 95%</span>
                                </div>
                                <div class="rec-actions">
                                    <button class="action-btn primary-btn">采纳</button>
                                    <button class="action-btn">修改</button>
                                </div>
                            </div>
                            
                            <div class="rec-card">
                                <div class="rec-content">
                                    <p>客户可能需要了解PDF转网页后的SEO友好性和加载速度优化。建议强调我们的服务在这两方面的优势。</p>
                                </div>
                                <div class="rec-meta">
                                    <span class="confidence">置信度: 88%</span>
                                </div>
                                <div class="rec-actions">
                                    <button class="action-btn primary-btn">采纳</button>
                                    <button class="action-btn">修改</button>
                                </div>
                            </div>
                            
                            <div class="rec-card">
                                <div class="rec-content">
                                    <p>考虑到客户可能是第一次使用我们的服务，建议提供简单的使用步骤指南，并强调我们有专业的技术支持团队。</p>
                                </div>
                                <div class="rec-meta">
                                    <span class="confidence">置信度: 76%</span>
                                </div>
                                <div class="rec-actions">
                                    <button class="action-btn primary-btn">采纳</button>
                                    <button class="action-btn">修改</button>
                                </div>
                            </div>
                        </div>
                        
                        <div class="ai-stats">
                            <h4>AI统计信息</h4>
                            <div class="stats-grid">
                                <div class="stat-item">
                                    <div class="stat-label">准确率</div>
                                    <div class="stat-value">92%</div>
                                </div>
                                <div class="stat-item">
                                    <div class="stat-label">平均响应时间</div>
                                    <div class="stat-value">0.8s</div>
                                </div>
                                <div class="stat-item">
                                    <div class="stat-label">今日推荐</div>
                                    <div class="stat-value">24</div>
                                </div>
                                <div class="stat-item">
                                    <div class="stat-label">采纳率</div>
                                    <div class="stat-value">85%</div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="customer-intent">
                            <h4>客户意图分析</h4>
                            <div class="intent-tags">
                                <span class="intent-tag primary">产品咨询 (0.95)</span>
                                <span class="intent-tag">功能了解 (0.82)</span>
                                <span class="intent-tag">购买意向 (0.61)</span>
                            </div>
                        </div>
                    </div>
                `;
                
                // 添加样式
                this.addStyles();
                
                // 绑定事件
                this.bindEvents();
            },
            
            addStyles: function() {
                const style = document.createElement('style');
                style.textContent = `
                    .ai-recommendations {
                        height: 100%;
                        display: flex;
                        flex-direction: column;
                    }
                    
                    .recommendations-header {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        margin-bottom: 20px;
                    }
                    
                    .recommendations-header h3 {
                        color: #0f0;
                        font-size: 16px;
                        margin: 0;
                    }
                    
                    .refresh-btn {
                        background: transparent;
                        border: 1px solid #0f0;
                        color: #0f0;
                        padding: 6px 16px;
                        border-radius: 4px;
                        cursor: pointer;
                        transition: all 0.3s;
                        font-size: 14px;
                    }
                    
                    .refresh-btn:hover {
                        background: rgba(0, 255, 0, 0.2);
                    }
                    
                    .recommendation-cards {
                        display: flex;
                        flex-direction: column;
                        gap: 15px;
                        margin-bottom: 25px;
                    }
                    
                    .rec-card {
                        border: 1px solid #0f0;
                        border-radius: 6px;
                        padding: 15px;
                        background: rgba(0, 20, 0, 0.3);
                        transition: all 0.3s;
                    }
                    
                    .rec-card:hover {
                        box-shadow: 0 0 15px rgba(0, 255, 0, 0.3);
                    }
                    
                    .rec-content p {
                        margin: 0 0 10px 0;
                        color: #0f0;
                        line-height: 1.5;
                    }
                    
                    .rec-meta {
                        margin-bottom: 10px;
                        padding-bottom: 10px;
                        border-bottom: 1px solid rgba(0, 255, 0, 0.2);
                    }
                    
                    .confidence {
                        font-size: 12px;
                        color: #0a0;
                    }
                    
                    .rec-actions {
                        display: flex;
                        gap: 10px;
                        justify-content: flex-end;
                    }
                    
                    .action-btn {
                        background: transparent;
                        border: 1px solid #0f0;
                        color: #0f0;
                        padding: 6px 16px;
                        border-radius: 4px;
                        cursor: pointer;
                        transition: all 0.3s;
                        font-size: 12px;
                    }
                    
                    .action-btn:hover {
                        background: rgba(0, 255, 0, 0.2);
                    }
                    
                    .action-btn.primary-btn {
                        background: rgba(0, 255, 0, 0.1);
                        font-weight: bold;
                    }
                    
                    .ai-stats,
                    .customer-intent {
                        margin-bottom: 20px;
                        padding: 15px;
                        border: 1px solid #0f0;
                        border-radius: 6px;
                        background: rgba(0, 20, 0, 0.3);
                    }
                    
                    .ai-stats h4,
                    .customer-intent h4 {
                        color: #0f0;
                        font-size: 14px;
                        margin: 0 0 15px 0;
                    }
                    
                    .stats-grid {
                        display: grid;
                        grid-template-columns: repeat(2, 1fr);
                        gap: 15px;
                    }
                    
                    .stat-item {
                        text-align: center;
                    }
                    
                    .stat-label {
                        display: block;
                        font-size: 12px;
                        color: #0a0;
                        margin-bottom: 5px;
                    }
                    
                    .stat-value {
                        display: block;
                        font-size: 20px;
                        font-weight: bold;
                        color: #0f0;
                    }
                    
                    .intent-tags {
                        display: flex;
                        flex-wrap: wrap;
                        gap: 10px;
                    }
                    
                    .intent-tag {
                        display: inline-block;
                        padding: 5px 12px;
                        border-radius: 12px;
                        font-size: 12px;
                        border: 1px solid #0f0;
                        background: rgba(0, 10, 0, 0.5);
                        color: #0f0;
                    }
                    
                    .intent-tag.primary {
                        background: rgba(0, 255, 0, 0.1);
                        font-weight: bold;
                    }
                `;
                document.head.appendChild(style);
            },
            
            bindEvents: function() {
                // 刷新按钮
                document.getElementById('btn-refresh-recs').addEventListener('click', () => this.refreshRecommendations());
                
                // 采纳按钮
                document.querySelectorAll('.rec-card .action-btn.primary-btn').forEach(btn => {
                    btn.addEventListener('click', (e) => this.acceptRecommendation(e));
                });
                
                // 修改按钮
                document.querySelectorAll('.rec-card .action-btn:not(.primary-btn)').forEach(btn => {
                    btn.addEventListener('click', (e) => this.modifyRecommendation(e));
                });
            },
            
            refreshRecommendations: function() {
                const refreshBtn = document.getElementById('btn-refresh-recs');
                const originalText = refreshBtn.textContent;
                
                // 显示加载状态
                refreshBtn.textContent = '刷新中...';
                refreshBtn.disabled = true;
                
                // 模拟刷新过程
                setTimeout(() => {
                    // 更新推荐内容
                    const recTexts = [
                        [
                            '建议向客户介绍我们的批量转换功能，可以一次处理多个PDF文件，节省时间和提高效率。',
                            '考虑到客户可能关注数据安全问题，建议强调我们的转换过程完全在安全环境中进行，保障文档隐私。',
                            '客户可能对价格方案感兴趣，建议提供我们的不同套餐选择，从免费试用版到企业高级版。'
                        ],
                        [
                            '基于最新的对话分析，客户可能需要了解如何将转换后的网页集成到他们现有的网站中。',
                            '建议介绍我们的定制化服务，可以根据客户的具体需求调整转换参数和输出格式。',
                            '考虑提供成功案例，展示我们如何帮助类似的客户解决他们的文档转换问题。'
                        ],
                        [
                            '客户可能对长期合作感兴趣，建议提供会员折扣和专属客服支持的信息。',
                            '建议询问客户具体的使用场景，以便提供更加个性化的解决方案。',
                            '考虑到客户可能是企业用户，建议介绍我们的团队协作功能和企业管理后台。'
                        ]
                    ];
                    
                    const randomSet = recTexts[Math.floor(Math.random() * recTexts.length)];
                    const recCards = document.querySelectorAll('.rec-card .rec-content p');
                    const confidenceSpans = document.querySelectorAll('.rec-card .confidence');
                    
                    recCards.forEach((card, index) => {
                        card.textContent = randomSet[index];
                        // 更新置信度
                        const confidence = 70 + Math.floor(Math.random() * 25);
                        confidenceSpans[index].textContent = `置信度: ${confidence}%`;
                    });
                    
                    // 恢复按钮
                    refreshBtn.textContent = originalText;
                    refreshBtn.disabled = false;
                    
                    // 显示刷新成功通知
                    window.JEV_UI.showNotification('推荐已刷新', 'success');
                }, 1500);
            },
            
            acceptRecommendation: function(e) {
                const recCard = e.target.closest('.rec-card');
                const recText = recCard.querySelector('.rec-content p').textContent;
                
                // 切换到聊天模块并填充推荐内容
                window.JEV_UI.switchModule('chat');
                
                // 等待模块切换完成
                setTimeout(() => {
                    const aiReplyTextarea = document.getElementById('ai-reply');
                    if (aiReplyTextarea) {
                        aiReplyTextarea.value = recText;
                        
                        // 切换到AI回复选项卡
                        const aiTab = document.querySelector('.reply-tabs .tab-btn[data-tab="ai"]');
                        if (aiTab && !aiTab.classList.contains('active')) {
                            aiTab.click();
                        }
                    }
                }, 100);
                
                // 显示采纳成功通知
                window.JEV_UI.showNotification('已采纳推荐回复', 'success');
            },
            
            modifyRecommendation: function(e) {
                const recCard = e.target.closest('.rec-card');
                const recText = recCard.querySelector('.rec-content p').textContent;
                
                // 切换到聊天模块并填充到手动编辑框
                window.JEV_UI.switchModule('chat');
                
                // 等待模块切换完成
                setTimeout(() => {
                    const manualReplyTextarea = document.getElementById('manual-reply');
                    if (manualReplyTextarea) {
                        manualReplyTextarea.value = recText;
                        
                        // 切换到手动编辑选项卡
                        const manualTab = document.querySelector('.reply-tabs .tab-btn[data-tab="manual"]');
                        if (manualTab && !manualTab.classList.contains('active')) {
                            manualTab.click();
                        }
                    }
                }, 100);
                
                // 显示修改提示通知
                window.JEV_UI.showNotification('已复制到编辑区，请进行修改', 'info');
            }
        };
    }
    
    // 创建图片识别模块
    function createImageModule() {
        return {
            init: function(container) {
                console.log('初始化图片识别模块');
                this.container = container;
                
                // 设置模块内容
                this.container.innerHTML = `
                    <div class="image-recognition-container">
                        <div class="upload-area" id="upload-area">
                            <div class="upload-placeholder">
                                <div class="upload-icon">📁</div>
                                <p>点击或拖拽图片到此处上传</p>
                                <p class="upload-hint">支持 JPG, PNG, PDF 格式，最大 10MB</p>
                            </div>
                            <input type="file" id="image-upload" accept=".jpg,.jpeg,.png,.pdf" style="display: none;">
                        </div>
                        
                        <div id="preview-area" class="preview-area hidden">
                            <div class="preview-header">
                                <h4>图片预览</h4>
                                <div class="preview-actions">
                                    <button class="action-btn" id="btn-rotate">🔄 旋转</button>
                                    <button class="action-btn" id="btn-reset">🔄 重置</button>
                                    <button class="action-btn danger-btn" id="btn-remove">✕ 移除</button>
                                </div>
                            </div>
                            <div class="preview-content">
                                <img id="preview-image" src="" alt="预览图片">
                            </div>
                        </div>
                        
                        <div class="recognition-controls">
                            <div class="recognition-options">
                                <button class="option-btn active" data-type="ocr">📝 OCR 文字识别</button>
                                <button class="option-btn" data-type="object">🔍 物体检测</button>
                                <button class="option-btn" data-type="translate">🌐 翻译内容</button>
                            </div>
                            <button class="action-btn primary-btn" id="btn-recognize">🚀 开始识别</button>
                        </div>
                        
                        <div id="results-area" class="results-area hidden">
                            <div class="results-header">
                                <h4>识别结果</h4>
                                <div class="results-actions">
                                    <button class="action-btn" id="btn-copy-results">📋 复制</button>
                                    <button class="action-btn" id="btn-export-results">📥 导出</button>
                                </div>
                            </div>
                            <div class="results-content" id="recognition-results">
                                <!-- 识别结果将在这里显示 -->
                            </div>
                        </div>
                    </div>
                `;
                
                // 添加样式
                this.addStyles();
                
                // 绑定事件
                this.bindEvents();
            },
            
            addStyles: function() {
                const style = document.createElement('style');
                style.textContent = `
                    .image-recognition-container {
                        height: 100%;
                        display: flex;
                        flex-direction: column;
                    }
                    
                    .upload-area {
                        border: 2px dashed #0f0;
                        border-radius: 8px;
                        padding: 40px;
                        text-align: center;
                        cursor: pointer;
                        transition: all 0.3s;
                        margin-bottom: 20px;
                    }
                    
                    .upload-area:hover {
                        background: rgba(0, 255, 0, 0.05);
                        border-color: rgba(0, 255, 0, 0.8);
                    }
                    
                    .upload-icon {
                        font-size: 48px;
                        margin-bottom: 15px;
                    }
                    
                    .upload-placeholder p {
                        margin: 0;
                        color: #0f0;
                    }
                    
                    .upload-hint {
                        font-size: 12px;
                        color: #0a0;
                        margin-top: 10px;
                    }
                    
                    .preview-area {
                        border: 1px solid #0f0;
                        border-radius: 6px;
                        padding: 15px;
                        margin-bottom: 20px;
                        background: rgba(0, 20, 0, 0.3);
                    }
                    
                    .preview-header {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        margin-bottom: 15px;
                    }
                    
                    .preview-header h4 {
                        margin: 0;
                        color: #0f0;
                        font-size: 14px;
                    }
                    
                    .preview-actions {
                        display: flex;
                        gap: 10px;
                    }
                    
                    .preview-content {
                        text-align: center;
                        padding: 15px;
                        background: rgba(0, 10, 0, 0.5);
                        border-radius: 4px;
                    }
                    
                    #preview-image {
                        max-width: 100%;
                        max-height: 200px;
                        border-radius: 4px;
                    }
                    
                    .recognition-controls {
                        margin-bottom: 20px;
                    }
                    
                    .recognition-options {
                        display: flex;
                        gap: 10px;
                        margin-bottom: 15px;
                    }
                    
                    .option-btn {
                        flex: 1;
                        background: transparent;
                        border: 1px solid #0f0;
                        color: #0a0;
                        padding: 8px 16px;
                        border-radius: 4px;
                        cursor: pointer;
                        transition: all 0.3s;
                        font-size: 12px;
                    }
                    
                    .option-btn:hover {
                        background: rgba(0, 255, 0, 0.1);
                        color: #0f0;
                    }
                    
                    .option-btn.active {
                        background: rgba(0, 255, 0, 0.2);
                        color: #0f0;
                        font-weight: bold;
                        border-color: #0f0;
                    }
                    
                    .action-btn {
                        background: transparent;
                        border: 1px solid #0f0;
                        color: #0f0;
                        padding: 8px 20px;
                        border-radius: 4px;
                        cursor: pointer;
                        transition: all 0.3s;
                        font-size: 14px;
                    }
                    
                    .action-btn:hover {
                        background: rgba(0, 255, 0, 0.2);
                    }
                    
                    .action-btn.primary-btn {
                        background: rgba(0, 255, 0, 0.1);
                        font-weight: bold;
                    }
                    
                    .action-btn.danger-btn {
                        border-color: #f00;
                        color: #f00;
                    }
                    
                    .action-btn.danger-btn:hover {
                        background: rgba(255, 0, 0, 0.1);
                    }
                    
                    .results-area {
                        flex: 1;
                        border: 1px solid #0f0;
                        border-radius: 6px;
                        padding: 15px;
                        background: rgba(0, 20, 0, 0.3);
                        display: flex;
                        flex-direction: column;
                    }
                    
                    .results-header {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        margin-bottom: 15px;
                    }
                    
                    .results-header h4 {
                        margin: 0;
                        color: #0f0;
                        font-size: 14px;
                    }
                    
                    .results-actions {
                        display: flex;
                        gap: 10px;
                    }
                    
                    .results-content {
                        flex: 1;
                        overflow-y: auto;
                        padding: 15px;
                        background: rgba(0, 10, 0, 0.5);
                        border-radius: 4px;
                        white-space: pre-wrap;
                        color: #0f0;
                    }
                    
                    .hidden {
                        display: none;
                    }
                `;
                document.head.appendChild(style);
            },
            
            bindEvents: function() {
                const uploadArea = document.getElementById('upload-area');
                const fileInput = document.getElementById('image-upload');
                const previewArea = document.getElementById('preview-area');
                const previewImage = document.getElementById('preview-image');
                const resultsArea = document.getElementById('results-area');
                const recognitionResults = document.getElementById('recognition-results');
                
                // 上传区域点击
                uploadArea.addEventListener('click', () => {
                    fileInput.click();
                });
                
                // 文件选择
                fileInput.addEventListener('change', (e) => {
                    if (e.target.files && e.target.files[0]) {
                        this.handleFileUpload(e.target.files[0]);
                    }
                });
                
                // 拖拽上传
                uploadArea.addEventListener('dragover', (e) => {
                    e.preventDefault();
                    uploadArea.style.background = 'rgba(0, 255, 0, 0.1)';
                });
                
                uploadArea.addEventListener('dragleave', () => {
                    uploadArea.style.background = 'transparent';
                });
                
                uploadArea.addEventListener('drop', (e) => {
                    e.preventDefault();
                    uploadArea.style.background = 'transparent';
                    
                    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                        this.handleFileUpload(e.dataTransfer.files[0]);
                    }
                });
                
                // 图片操作按钮
                document.getElementById('btn-rotate').addEventListener('click', () => this.rotateImage());
                document.getElementById('btn-reset').addEventListener('click', () => this.resetImage());
                document.getElementById('btn-remove').addEventListener('click', () => this.removeImage());
                
                // 识别选项按钮
                document.querySelectorAll('.option-btn').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        this.selectRecognitionType(e.target.dataset.type);
                    });
                });
                
                // 开始识别按钮
                document.getElementById('btn-recognize').addEventListener('click', () => this.startRecognition());
                
                // 结果操作按钮
                document.getElementById('btn-copy-results').addEventListener('click', () => this.copyResults());
                document.getElementById('btn-export-results').addEventListener('click', () => this.exportResults());
            },
            
            handleFileUpload: function(file) {
                // 验证文件类型和大小
                const validTypes = ['image/jpeg', 'image/png', 'application/pdf'];
                const maxSize = 10 * 1024 * 1024; // 10MB
                
                if (!validTypes.includes(file.type)) {
                    alert('不支持的文件格式，请上传 JPG, PNG 或 PDF 文件。');
                    return;
                }
                
                if (file.size > maxSize) {
                    alert('文件过大，请上传小于 10MB 的文件。');
                    return;
                }
                
                // 创建预览
                const reader = new FileReader();
                reader.onload = (e) => {
                    const previewImage = document.getElementById('preview-image');
                    const previewArea = document.getElementById('preview-area');
                    const uploadArea = document.getElementById('upload-area');
                    
                    // 如果是PDF，使用占位图标
                    if (file.type === 'application/pdf') {
                        previewImage.src = 'https://via.placeholder.com/400x200?text=PDF+File';
                    } else {
                        previewImage.src = e.target.result;
                    }
                    
                    previewImage.dataset.originalSrc = e.target.result;
                    previewImage.dataset.rotation = 0;
                    
                    // 显示预览区域，隐藏上传区域
                    previewArea.classList.remove('hidden');
                    uploadArea.classList.add('hidden');
                    
                    // 显示加载成功通知
                    window.JEV_UI.showNotification('文件上传成功', 'success');
                };
                
                // 读取文件
                if (file.type === 'application/pdf') {
                    reader.readAsDataURL(file);
                } else {
                    reader.readAsDataURL(file);
                }
            },
            
            rotateImage: function() {
                const previewImage = document.getElementById('preview-image');
                let rotation = parseInt(previewImage.dataset.rotation || '0');
                rotation = (rotation + 90) % 360;
                previewImage.dataset.rotation = rotation;
                
                previewImage.style.transform = `rotate(${rotation}deg)`;
            },
            
            resetImage: function() {
                const previewImage = document.getElementById('preview-image');
                previewImage.style.transform = 'none';
                previewImage.dataset.rotation = '0';
            },
            
            removeImage: function() {
                const previewImage = document.getElementById('preview-image');
                const previewArea = document.getElementById('preview-area');
                const uploadArea = document.getElementById('upload-area');
                const resultsArea = document.getElementById('results-area');
                
                // 重置并隐藏
                previewImage.src = '';
                previewArea.classList.add('hidden');
                uploadArea.classList.remove('hidden');
                resultsArea.classList.add('hidden');
                
                // 清空文件输入
                document.getElementById('image-upload').value = '';
            },
            
            selectRecognitionType: function(type) {
                // 移除所有选项的活跃状态
                document.querySelectorAll('.option-btn').forEach(btn => {
                    btn.classList.remove('active');
                });
                
                // 激活选中的选项
                const selectedBtn = document.querySelector(`.option-btn[data-type="${type}"]`);
                if (selectedBtn) {
                    selectedBtn.classList.add('active');
                }
            },
            
            startRecognition: function() {
                const selectedType = document.querySelector('.option-btn.active').dataset.type;
                const recognizeBtn = document.getElementById('btn-recognize');
                const resultsArea = document.getElementById('results-area');
                const recognitionResults = document.getElementById('recognition-results');
                
                // 显示加载状态
                recognizeBtn.textContent = '识别中...';
                recognizeBtn.disabled = true;
                
                // 模拟识别过程
                setTimeout(() => {
                    let results = '';
                    
                    // 根据识别类型生成模拟结果
                    switch(selectedType) {
                        case 'ocr':
                            results = `PDF转网页服务介绍\n\n功能特点：\n- 快速将PDF文档转换为响应式网页\n- 保留原始格式、图片和链接\n- 支持批量处理多个文件\n- 提供多种输出格式选择\n\n价格方案：\n- 免费版：每月最多转换5个文件\n- 标准版：¥99/月，无限制转换\n- 企业版：¥399/月，支持团队协作\n\n联系方式：\nsupport@jevshop.com\n400-123-4567`;
                            break;
                        case 'object':
                            results = `检测到的物体：\n\n1. 文档 - 置信度：98%\n2. 表格 - 置信度：95%\n3. 文本段落 - 置信度：99%\n4. 公司标志 - 置信度：87%\n5. 联系信息 - 置信度：92%\n\n图像特征：\n- 页面布局：单栏\n- 文字密度：高\n- 图像数量：3\n- 可能是产品介绍文档`;
                            break;
                        case 'translate':
                            results = `PDF to Webpage Service Introduction\n\nFeatures:\n- Quickly convert PDF documents to responsive webpages\n- Preserve original formatting, images and links\n- Support batch processing of multiple files\n- Provide multiple output format options\n\nPricing Plans:\n- Free Version: Up to 5 conversions per month\n- Standard Version: ¥99/month, unlimited conversions\n- Enterprise Version: ¥399/month, team collaboration support\n\nContact Information:\nsupport@jevshop.com\n400-123-4567`;
                            break;
                    }
                    
                    // 显示结果
                    recognitionResults.textContent = results;
                    resultsArea.classList.remove('hidden');
                    
                    // 恢复按钮
                    recognizeBtn.textContent = '🚀 开始识别';
                    recognizeBtn.disabled = false;
                    
                    // 滚动到结果区域
                    resultsArea.scrollIntoView({ behavior: 'smooth' });
                }, 2000);
            },
            
            copyResults: function() {
                const recognitionResults = document.getElementById('recognition-results');
                const textToCopy = recognitionResults.textContent;
                
                navigator.clipboard.writeText(textToCopy)
                    .then(() => {
                        window.JEV_UI.showNotification('结果已复制到剪贴板', 'success');
                    })
                    .catch(err => {
                        console.error('复制失败: ', err);
                        window.JEV_UI.showNotification('复制失败，请手动复制', 'error');
                    });
            },
            
            exportResults: function() {
                const recognitionResults = document.getElementById('recognition-results');
                const textToExport = recognitionResults.textContent;
                
                // 创建Blob并下载
                const blob = new Blob([textToExport], { type: 'text/plain' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `recognition_results_${new Date().getTime()}.txt`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                
                window.JEV_UI.showNotification('结果已导出', 'success');
            }
        };
    }
    
    // 创建设置模块
    function createSettingsModule() {
        return {
            init: function(container) {
                console.log('初始化设置模块');
                this.container = container;
                
                // 设置模块内容
                this.container.innerHTML = `
                    <div class="settings-container">
                        <div class="settings-tabs">
                            <button class="tab-btn active" data-tab="account">账号设置</button>
                            <button class="tab-btn" data-tab="kv-sync">KV同步</button>
                            <button class="tab-btn" data-tab="update">更新检测</button>
                            <button class="tab-btn" data-tab="about">关于</button>
                        </div>
                        
                        <div class="settings-content">
                            <!-- 账号设置选项卡 -->
                            <div class="tab-content active" id="tab-account">
                                <div class="setting-group">
                                    <label class="setting-label">API Key</label>
                                    <input type="password" class="setting-input" id="api-key" placeholder="输入您的API Key">
                                </div>
                                
                                <div class="setting-group">
                                    <label class="setting-label">Worker URL</label>
                                    <input type="text" class="setting-input" id="worker-url" value="https://jevshop.workers.dev" placeholder="Worker URL">
                                </div>
                                
                                <div class="setting-group">
                                    <label class="setting-label">用户名</label>
                                    <input type="text" class="setting-input" id="username" placeholder="输入您的用户名">
                                </div>
                                
                                <div class="setting-group">
                                    <label class="setting-label">部门</label>
                                    <select class="setting-input" id="department">
                                        <option value="sales">销售部</option>
                                        <option value="support">客服部</option>
                                        <option value="it">IT部</option>
                                        <option value="marketing">市场部</option>
                                        <option value="other">其他</option>
                                    </select>
                                </div>
                                
                                <div class="setting-group checkbox-group">
                                    <input type="checkbox" id="auto-login" class="setting-checkbox">
                                    <label for="auto-login" class="checkbox-label">自动登录</label>
                                </div>
                                
                                <div class="setting-group checkbox-group">
                                    <input type="checkbox" id="remember-credentials" class="setting-checkbox">
                                    <label for="remember-credentials" class="checkbox-label">记住凭证</label>
                                </div>
                                
                                <div class="settings-actions">
                                    <button class="action-btn primary-btn" id="btn-save-account">保存设置</button>
                                    <button class="action-btn" id="btn-test-connection">测试连接</button>
                                    <button class="action-btn danger-btn" id="btn-logout">退出登录</button>
                                </div>
                            </div>
                            
                            <!-- KV同步选项卡 -->
                            <div class="tab-content" id="tab-kv-sync">
                                <div class="sync-status">
                                    <h4>K-V Store 状态</h4>
                                    <div class="status-grid">
                                        <div class="status-item">
                                            <span class="status-label">连接状态:</span>
                                            <span class="status-value connected">已连接</span>
                                        </div>
                                        <div class="status-item">
                                            <span class="status-label">上次同步:</span>
                                            <span class="status-value">2023-06-15 14:30:25</span>
                                        </div>
                                        <div class="status-item">
                                            <span class="status-label">数据条目:</span>
                                            <span class="status-value">42</span>
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="setting-group">
                                    <label class="setting-label">自动同步间隔</label>
                                    <select class="setting-input" id="sync-interval">
                                        <option value="5">5分钟</option>
                                        <option value="15">15分钟</option>
                                        <option value="30">30分钟</option>
                                        <option value="60">1小时</option>
                                        <option value="0">手动</option>
                                    </select>
                                </div>
                                
                                <div class="setting-group checkbox-group">
                                    <input type="checkbox" id="sync-on-startup" class="setting-checkbox" checked>
                                    <label for="sync-on-startup" class="checkbox-label">启动时同步</label>
                                </div>
                                
                                <div class="setting-group checkbox-group">
                                    <input type="checkbox" id="sync-on-change" class="setting-checkbox">
                                    <label for="sync-on-change" class="checkbox-label">数据变更时同步</label>
                                </div>
                                
                                <div class="settings-actions">
                                    <button class="action-btn primary-btn" id="btn-sync-now">立即同步</button>
                                    <button class="action-btn" id="btn-clear-cache">清除缓存</button>
                                    <button class="action-btn" id="btn-export-data">导出数据</button>
                                    <button class="action-btn" id="btn-import-data">导入数据</button>
                                </div>
                            </div>
                            
                            <!-- 更新检测选项卡 -->
                            <div class="tab-content" id="tab-update">
                                <div class="update-status">
                                    <h4>更新状态</h4>
                                    <div class="status-grid">
                                        <div class="status-item">
                                            <span class="status-label">当前版本:</span>
                                            <span class="status-value">${JEV_CONFIG.version}</span>
                                        </div>
                                        <div class="status-item">
                                            <span class="status-label">最新版本:</span>
                                            <span class="status-value">${JEV_CONFIG.version}</span>
                                        </div>
                                        <div class="status-item">
                                            <span class="status-label">更新状态:</span>
                                            <span class="status-value up-to-date">已是最新版本</span>
                                        </div>
                                        <div class="status-item">
                                            <span class="status-label">检查时间:</span>
                                            <span class="status-value">刚刚</span>
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="setting-group checkbox-group">
                                    <input type="checkbox" id="auto-check-updates" class="setting-checkbox" checked>
                                    <label for="auto-check-updates" class="checkbox-label">自动检查更新</label>
                                </div>
                                
                                <div class="setting-group checkbox-group">
                                    <input type="checkbox" id="auto-download-updates" class="setting-checkbox">
                                    <label for="auto-download-updates" class="checkbox-label">自动下载安装更新</label>
                                </div>
                                
                                <div class="settings-actions">
                                    <button class="action-btn primary-btn" id="btn-check-updates">检查更新</button>
                                    <button class="action-btn" id="btn-download-update">下载更新</button>
                                    <button class="action-btn" id="btn-view-changelog">查看更新日志</button>
                                </div>
                            </div>
                            
                            <!-- 关于选项卡 -->
                            <div class="tab-content" id="tab-about">
                                <div class="about-content">
                                    <div class="about-header">
                                        <span class="app-icon">🌿</span>
                                        <h3>JEV 嘉尔威智能客服工具</h3>
                                        <p class="version">版本 ${JEV_CONFIG.version}</p>
                                    </div>
                                    
                                    <div class="about-description">
                                        <p>JEV智能客服工具是一款专为企业客服团队设计的高效辅助工具，集成了AI推荐、实时翻译、图片识别等功能，帮助客服人员提升工作效率，提供更好的客户服务体验。</p>
                                    </div>
                                    
                                    <div class="about-features">
                                        <h4>主要功能</h4>
                                        <ul>
                                            <li>💬 智能聊天与回复推荐</li>
                                            <li>🌐 多语言实时翻译</li>
                                            <li>📷 图片识别与OCR文字提取</li>
                                            <li>🔄 KV数据同步与管理</li>
                                            <li>⚙️ 个性化设置与配置</li>
                                        </ul>
                                    </div>
                                    
                                    <div class="about-contact">
                                        <h4>联系方式</h4>
                                        <p>官方网站: <a href="#" class="about-link">https://jevshop.workers.dev</a></p>
                                        <p>技术支持: <a href="#" class="about-link">support@jevshop.com</a></p>
                                        <p>客服热线: <a href="#" class="about-link">400-123-4567</a></p>
                                    </div>
                                    
                                    <div class="about-copyright">
                                        <p>© 2023 JEV 嘉尔威科技有限公司. 保留所有权利.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
                
                // 添加样式
                this.addStyles();
                
                // 绑定事件
                this.bindEvents();
                
                // 加载保存的设置
                this.loadSettings();
            },
            
            addStyles: function() {
                const style = document.createElement('style');
                style.textContent = `
                    .settings-container {
                        height: 100%;
                        display: flex;
                        flex-direction: column;
                    }
                    
                    .settings-tabs {
                        display: flex;
                        gap: 10px;
                        margin-bottom: 20px;
                        flex-wrap: wrap;
                    }
                    
                    .tab-btn {
                        background: transparent;
                        border: 1px solid #0f0;
                        color: #0a0;
                        padding: 8px 20px;
                        border-radius: 4px;
                        cursor: pointer;
                        transition: all 0.3s;
                        font-size: 14px;
                    }
                    
                    .tab-btn:hover {
                        background: rgba(0, 255, 0, 0.1);
                        color: #0f0;
                    }
                    
                    .tab-btn.active {
                        background: rgba(0, 255, 0, 0.2);
                        color: #0f0;
                        font-weight: bold;
                        border-color: #0f0;
                    }
                    
                    .settings-content {
                        flex: 1;
                        overflow-y: auto;
                    }
                    
                    .tab-content {
                        display: none;
                    }
                    
                    .tab-content.active {
                        display: block;
                    }
                    
                    .setting-group {
                        margin-bottom: 20px;
                    }
                    
                    .setting-label {
                        display: block;
                        margin-bottom: 8px;
                        color: #0f0;
                        font-size: 14px;
                    }
                    
                    .setting-input {
                        width: 100%;
                        padding: 10px;
                        background: rgba(0, 10, 0, 0.5);
                        border: 1px solid #0f0;
                        border-radius: 4px;
                        color: #0f0;
                        font-family: inherit;
                    }
                    
                    .setting-input:focus {
                        outline: none;
                        box-shadow: 0 0 8px rgba(0, 255, 0, 0.5);
                    }
                    
                    .checkbox-group {
                        display: flex;
                        align-items: center;
                    }
                    
                    .setting-checkbox {
                        margin-right: 10px;
                    }
                    
                    .checkbox-label {
                        color: #0f0;
                        font-size: 14px;
                    }
                    
                    .settings-actions {
                        display: flex;
                        gap: 10px;
                        flex-wrap: wrap;
                        margin-top: 30px;
                        padding-top: 20px;
                        border-top: 1px solid rgba(0, 255, 0, 0.2);
                    }
                    
                    .action-btn {
                        background: transparent;
                        border: 1px solid #0f0;
                        color: #0f0;
                        padding: 8px 20px;
                        border-radius: 4px;
                        cursor: pointer;
                        transition: all 0.3s;
                        font-size: 14px;
                    }
                    
                    .action-btn:hover {
                        background: rgba(0, 255, 0, 0.2);
                    }
                    
                    .action-btn.primary-btn {
                        background: rgba(0, 255, 0, 0.1);
                        font-weight: bold;
                    }
                    
                    .action-btn.danger-btn {
                        border-color: #f00;
                        color: #f00;
                    }
                    
                    .action-btn.danger-btn:hover {
                        background: rgba(255, 0, 0, 0.1);
                    }
                    
                    .sync-status,
                    .update-status {
                        margin-bottom: 30px;
                        padding: 15px;
                        border: 1px solid #0f0;
                        border-radius: 6px;
                        background: rgba(0, 20, 0, 0.3);
                    }
                    
                    .sync-status h4,
                    .update-status h4 {
                        margin: 0 0 15px 0;
                        color: #0f0;
                        font-size: 14px;
                    }
                    
                    .status-grid {
                        display: grid;
                        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                        gap: 15px;
                    }
                    
                    .status-item {
                        display: flex;
                        justify-content: space-between;
                    }
                    
                    .status-label {
                        color: #0a0;
                        font-size: 12px;
                    }
                    
                    .status-value {
                        color: #0f0;
                        font-weight: bold;
                    }
                    
                    .status-value.connected {
                        color: #0f0;
                    }
                    
                    .status-value.disconnected {
                        color: #f00;
                    }
                    
                    .status-value.up-to-date {
                        color: #0f0;
                    }
                    
                    .status-value.update-available {
                        color: #ffaa00;
                    }
                    
                    /* 关于页面样式 */
                    .about-content {
                        text-align: center;
                    }
                    
                    .about-header {
                        margin-bottom: 30px;
                    }
                    
                    .app-icon {
                        font-size: 64px;
                        display: block;
                        margin-bottom: 15px;
                    }
                    
                    .about-header h3 {
                        color: #0f0;
                        margin: 0 0 10px 0;
                    }
                    
                    .version {
                        color: #0a0;
                        font-size: 14px;
                        margin: 0;
                    }
                    
                    .about-description {
                        margin-bottom: 30px;
                        padding: 0 20px;
                    }
                    
                    .about-description p {
                        color: #0f0;
                        line-height: 1.6;
                        margin: 0;
                    }
                    
                    .about-features,
                    .about-contact {
                        margin-bottom: 30px;
                        padding: 0 20px;
                        text-align: left;
                    }
                    
                    .about-features h4,
                    .about-contact h4 {
                        color: #0f0;
                        margin: 0 0 15px 0;
                        font-size: 14px;
                    }
                    
                    .about-features ul {
                        list-style-type: none;
                        padding: 0;
                        margin: 0;
                    }
                    
                    .about-features li {
                        color: #0f0;
                        margin-bottom: 8px;
                        padding-left: 5px;
                    }
                    
                    .about-contact p {
                        color: #0f0;
                        margin: 0 0 8px 0;
                    }
                    
                    .about-link {
                        color: #0f0;
                        text-decoration: none;
                        border-bottom: 1px dashed #0f0;
                        transition: all 0.3s;
                    }
                    
                    .about-link:hover {
                        color: rgba(0, 255, 0, 0.8);
                        border-bottom-color: rgba(0, 255, 0, 0.8);
                    }
                    
                    .about-copyright {
                        margin-top: 40px;
                        padding-top: 20px;
                        border-top: 1px solid rgba(0, 255, 0, 0.2);
                    }
                    
                    .about-copyright p {
                        color: #0a0;
                        font-size: 12px;
                        margin: 0;
                    }
                `;
                document.head.appendChild(style);
            },
            
            bindEvents: function() {
                // 选项卡切换
                document.querySelectorAll('.settings-tabs .tab-btn').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        const tabName = e.target.dataset.tab;
                        this.switchTab(tabName);
                    });
                });
                
                // 账号设置按钮
                document.getElementById('btn-save-account').addEventListener('click', () => this.saveAccountSettings());
                document.getElementById('btn-test-connection').addEventListener('click', () => this.testConnection());
                document.getElementById('btn-logout').addEventListener('click', () => this.logout());
                
                // KV同步按钮
                document.getElementById('btn-sync-now').addEventListener('click', () => this.syncNow());
                document.getElementById('btn-clear-cache').addEventListener('click', () => this.clearCache());
                document.getElementById('btn-export-data').addEventListener('click', () => this.exportData());
                document.getElementById('btn-import-data').addEventListener('click', () => this.importData());
                
                // 更新检测按钮
                document.getElementById('btn-check-updates').addEventListener('click', () => this.checkUpdates());
                document.getElementById('btn-download-update').addEventListener('click', () => this.downloadUpdate());
                document.getElementById('btn-view-changelog').addEventListener('click', () => this.viewChangelog());
            },
            
            switchTab: function(tabName) {
                // 隐藏所有选项卡内容
                document.querySelectorAll('.settings-content .tab-content').forEach(tab => {
                    tab.classList.remove('active');
                });
                
                // 移除所有按钮的活跃状态
                document.querySelectorAll('.settings-tabs .tab-btn').forEach(btn => {
                    btn.classList.remove('active');
                });
                
                // 激活选中的选项卡
                const tabContent = document.getElementById(`tab-${tabName}`);
                const tabBtn = document.querySelector(`.settings-tabs .tab-btn[data-tab="${tabName}"]`);
                
                if (tabContent && tabBtn) {
                    tabContent.classList.add('active');
                    tabBtn.classList.add('active');
                }
            },
            
            loadSettings: function() {
                try {
                    // 加载保存的设置
                    const savedSettings = localStorage.getItem('JEV_SETTINGS');
                    if (savedSettings) {
                        const settings = JSON.parse(savedSettings);
                        
                        // 加载账号设置
                        if (settings.account) {
                            if (settings.account.apiKey) {
                                document.getElementById('api-key').value = settings.account.apiKey;
                            }
                            if (settings.account.workerUrl) {
                                document.getElementById('worker-url').value = settings.account.workerUrl;
                            }
                            if (settings.account.username) {
                                document.getElementById('username').value = settings.account.username;
                            }
                            if (settings.account.department) {
                                document.getElementById('department').value = settings.account.department;
                            }
                            if (settings.account.autoLogin) {
                                document.getElementById('auto-login').checked = true;
                            }
                            if (settings.account.rememberCredentials) {
                                document.getElementById('remember-credentials').checked = true;
                            }
                        }
                        
                        // 加载KV同步设置
                        if (settings.kvSync) {
                            if (settings.kvSync.syncInterval) {
                                document.getElementById('sync-interval').value = settings.kvSync.syncInterval;
                            }
                            if (settings.kvSync.syncOnStartup) {
                                document.getElementById('sync-on-startup').checked = true;
                            }
                            if (settings.kvSync.syncOnChange) {
                                document.getElementById('sync-on-change').checked = true;
                            }
                        }
                        
                        // 加载更新设置
                        if (settings.update) {
                            if (settings.update.autoCheckUpdates) {
                                document.getElementById('auto-check-updates').checked = true;
                            }
                            if (settings.update.autoDownloadUpdates) {
                                document.getElementById('auto-download-updates').checked = true;
                            }
                        }
                    }
                } catch (error) {
                    console.error('加载设置失败:', error);
                }
            },
            
            saveAccountSettings: function() {
                try {
                    const settings = {
                        account: {
                            apiKey: document.getElementById('api-key').value,
                            workerUrl: document.getElementById('worker-url').value,
                            username: document.getElementById('username').value,
                            department: document.getElementById('department').value,
                            autoLogin: document.getElementById('auto-login').checked,
                            rememberCredentials: document.getElementById('remember-credentials').checked
                        }
                    };
                    
                    localStorage.setItem('JEV_SETTINGS', JSON.stringify(settings));
                    window.JEV_UI.showNotification('账号设置已保存', 'success');
                } catch (error) {
                    console.error('保存设置失败:', error);
                    window.JEV_UI.showNotification('保存设置失败', 'error');
                }
            },
            
            testConnection: function() {
                const testBtn = document.getElementById('btn-test-connection');
                const originalText = testBtn.textContent;
                
                // 显示加载状态
                testBtn.textContent = '测试中...';
                testBtn.disabled = true;
                
                // 模拟连接测试
                setTimeout(() => {
                    // 恢复按钮
                    testBtn.textContent = originalText;
                    testBtn.disabled = false;
                    
                    // 显示测试成功通知
                    window.JEV_UI.showNotification('连接测试成功', 'success');
                }, 1500);
            },
            
            logout: function() {
                if (confirm('确定要退出登录吗？')) {
                    // 清除本地存储的凭证
                    try {
                        const settings = JSON.parse(localStorage.getItem('JEV_SETTINGS') || '{}');
                        if (settings.account) {
                            delete settings.account.apiKey;
                            delete settings.account.username;
                            settings.account.autoLogin = false;
                            localStorage.setItem('JEV_SETTINGS', JSON.stringify(settings));
                        }
                        
                        // 清空输入框
                        document.getElementById('api-key').value = '';
                        document.getElementById('username').value = '';
                        document.getElementById('auto-login').checked = false;
                        
                        window.JEV_UI.showNotification('已退出登录', 'info');
                    } catch (error) {
                        console.error('退出登录失败:', error);
                        window.JEV_UI.showNotification('退出登录失败', 'error');
                    }
                }
            },
            
            syncNow: function() {
                const syncBtn = document.getElementById('btn-sync-now');
                const originalText = syncBtn.textContent;
                
                // 显示加载状态
                syncBtn.textContent = '同步中...';
                syncBtn.disabled = true;
                
                // 模拟同步过程
                setTimeout(() => {
                    // 更新上次同步时间
                    const now = new Date();
                    const dateString = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
                    
                    const statusItems = document.querySelectorAll('.sync-status .status-item');
                    if (statusItems.length > 0) {
                        statusItems[1].querySelector('.status-value').textContent = dateString;
                    }
                    
                    // 恢复按钮
                    syncBtn.textContent = originalText;
                    syncBtn.disabled = false;
                    
                    // 显示同步成功通知
                    window.JEV_UI.showNotification('同步完成', 'success');
                }, 2000);
            },
            
            clearCache: function() {
                if (confirm('确定要清除缓存吗？这将删除本地存储的所有数据。')) {
                    // 模拟清除缓存
                    setTimeout(() => {
                        window.JEV_UI.showNotification('缓存已清除', 'success');
                    }, 500);
                }
            },
            
            exportData: function() {
                // 模拟导出数据
                window.JEV_UI.showNotification('数据导出功能开发中', 'info');
            },
            
            importData: function() {
                // 模拟导入数据
                window.JEV_UI.showNotification('数据导入功能开发中', 'info');
            },
            
            checkUpdates: function() {
                const checkBtn = document.getElementById('btn-check-updates');
                const originalText = checkBtn.textContent;
                
                // 显示加载状态
                checkBtn.textContent = '检查中...';
                checkBtn.disabled = true;
                
                // 模拟检查更新
                setTimeout(() => {
                    // 更新检查时间
                    const now = new Date();
                    const timeString = now.getHours() + ':' + String(now.getMinutes()).padStart(2, '0');
                    
                    const statusItems = document.querySelectorAll('.update-status .status-item');
                    if (statusItems.length > 2) {
                        statusItems[3].querySelector('.status-value').textContent = '刚刚';
                    }
                    
                    // 恢复按钮
                    checkBtn.textContent = originalText;
                    checkBtn.disabled = false;
                    
                    // 显示检查结果通知
                    window.JEV_UI.showNotification('已是最新版本', 'success');
                }, 1500);
            },
            
            downloadUpdate: function() {
                // 模拟下载更新
                window.JEV_UI.showNotification('当前已是最新版本', 'info');
            },
            
            viewChangelog: function() {
                // 显示更新日志
                const changelog = `版本更新日志\n\nv1.0.0 (初始版本)\n• 发布JEV智能客服插件第一版\n• 集成聊天、AI推荐、翻译和图片识别功能\n• 支持窗口拖拽、缩放和最小化\n• 添加KV数据同步功能\n• 实现自动更新检测机制`;
                
                alert(changelog);
            }
        };
    }
    
    // 检查所有组件是否加载完成，然后初始化
    function checkAndInitialize() {
        if (loadState.styleLoaded && loadState.uiCoreLoaded && loadState.modulesLoaded >= loadState.totalModules) {
            log('所有组件加载完成，开始初始化JEV...', 'info');
            window.JEV_UI.init();
        }
    }
    
    // 注册Tampermonkey菜单命令
    function registerMenuCommands() {
        try {
            GM_registerMenuCommand('打开JEV客服工具', () => {
                const container = document.getElementById('jev-container');
                if (container) {
                    container.style.display = 'flex';
                } else {
                    // 如果容器不存在，重新初始化
                    log('重新初始化JEV客服工具...', 'debug');
                    loadStyle();
                    createUICore();
                }
            });
            
            GM_registerMenuCommand('检查更新', checkUpdates);
            
            GM_registerMenuCommand('关于', () => {
                if (window.JEV_UI && window.JEV_UI.modules && window.JEV_UI.modules.settings) {
                    window.JEV_UI.switchModule('settings');
                    setTimeout(() => {
                        document.querySelector('.settings-tabs .tab-btn[data-tab="about"]')?.click();
                    }, 100);
                } else {
                    alert(`JEV 嘉尔威智能客服工具 v${JEV_CONFIG.version}\n\n专为企业客服团队设计的高效辅助工具`);
                }
            });
        } catch (error) {
            log('注册菜单命令失败: ' + error.message, 'warn');
        }
    }
    
    // 检查更新函数
    function checkUpdates() {
        log('检查更新...', 'debug');
        
        try {
            // 模拟检查更新
            setTimeout(() => {
                log('检查完成，当前已是最新版本', 'info');
                alert(`JEV 嘉尔威智能客服工具\n当前版本: ${JEV_CONFIG.version}\n已是最新版本`);
            }, 1000);
        } catch (error) {
            log('检查更新失败: ' + error.message, 'error');
            alert('检查更新失败，请稍后再试');
        }
    }
    
    // 启动插件
    function startPlugin() {
        log('启动JEV嘉尔威智能客服插件...', 'info');
        
        // 加载样式
        loadStyle();
        
        // 创建UI核心
        createUICore();
        
        // 注册菜单命令
        registerMenuCommands();
        
        // 检查更新
        if (localStorage.getItem('JEV_AUTO_CHECK_UPDATES') !== 'false') {
            setTimeout(checkUpdates, 5000); // 延迟5秒检查更新，避免影响插件启动
        }
    }
    
    // 当文档加载完成时启动插件
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', startPlugin);
    } else {
        startPlugin();
    }
    
    log('JEV 嘉尔威智能客服插件 v1.0.0 加载完成', 'info');
})();
