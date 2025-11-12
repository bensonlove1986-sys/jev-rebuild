/**
 * JEV客服系统 - Daojie聊天窗口模块
 * 功能：嵌入Daojie平台聊天接口
 * 版本：1.0.0
 */

class DaojieChatModule {
    constructor() {
        // 配置常量
        this.CHAT_URL = 'https://app.daojiemarketing.com/';
        this.TOKEN = 'jev-secure-key-001';
        this.LOAD_TIMEOUT = 5000; // 5秒超时
        this.POPUP_WIDTH = 400;
        this.POPUP_HEIGHT = 600;
        
        // 状态变量
        this.isInitialized = false;
        this.isChatOpen = false;
        this.loadStartTime = 0;
        this.stateIndicator = null;
        this.chatButton = null;
        this.popupContainer = null;
        this.iframe = null;
        this.closeButton = null;
        this.loadTimeoutId = null;
        
        // 初始化
        this.initialize();
    }
    
    /**
     * 初始化聊天模块
     */
    initialize() {
        if (this.isInitialized) return;
        
        console.log('[JEV][ChatModule] 初始化 Daojie 聊天模块...');
        
        // 创建聊天按钮
        this.createChatButton();
        
        // 创建状态指示器
        this.createStateIndicator();
        
        // 初始化完成
        this.isInitialized = true;
        console.log('[JEV][ChatModule] Daojie 聊天模块初始化完成');
    }
    
    /**
     * 创建聊天按钮
     */
    createChatButton() {
        // 创建按钮元素
        this.chatButton = document.createElement('div');
        this.chatButton.className = 'jev-chat-button';
        this.chatButton.innerHTML = '💬 聊天';
        
        // 添加样式
        Object.assign(this.chatButton.style, {
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            backgroundColor: '#0078d4',
            color: 'white',
            padding: '12px 16px',
            borderRadius: '24px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 'bold',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
            zIndex: 1000,
            userSelect: 'none',
            transition: 'all 0.3s ease',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
        });
        
        // 添加悬停效果
        this.chatButton.addEventListener('mouseenter', () => {
            this.chatButton.style.backgroundColor = '#005a9e';
            this.chatButton.style.transform = 'scale(1.05)';
        });
        
        this.chatButton.addEventListener('mouseleave', () => {
            this.chatButton.style.backgroundColor = '#0078d4';
            this.chatButton.style.transform = 'scale(1)';
        });
        
        // 添加点击事件
        this.chatButton.addEventListener('click', () => {
            this.toggleChat();
        });
        
        // 添加到页面
        document.body.appendChild(this.chatButton);
        console.log('[JEV][ChatModule] 聊天按钮创建完成');
    }
    
    /**
     * 创建状态指示器
     */
    createStateIndicator() {
        // 创建状态指示器元素
        this.stateIndicator = document.createElement('div');
        this.stateIndicator.className = 'jev-chat-status';
        this.stateIndicator.textContent = 'Chat (Daojie) Offline';
        
        // 添加样式
        Object.assign(this.stateIndicator.style, {
            position: 'fixed',
            top: '20px',
            right: '100px',
            backgroundColor: '#f5f5f5',
            color: '#d13438',
            padding: '6px 12px',
            borderRadius: '12px',
            fontSize: '12px',
            fontWeight: 'bold',
            zIndex: 999,
            border: '1px solid #ddd',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
        });
        
        // 添加状态灯
        const statusLight = document.createElement('span');
        statusLight.className = 'jev-status-light';
        statusLight.style.cssText = `
            width: 8px;
            height: 8px;
            borderRadius: 50%;
            backgroundColor: #d13438;
            display: inline-block;
            transition: background-color 0.3s ease;
        `;
        
        this.stateIndicator.appendChild(statusLight);
        
        // 添加到页面
        document.body.appendChild(this.stateIndicator);
        console.log('[JEV][ChatModule] 状态指示器创建完成');
    }
    
    /**
     * 切换聊天窗口显示/隐藏
     */
    toggleChat() {
        if (this.isChatOpen) {
            this.closeChat();
        } else {
            this.openChat();
        }
    }
    
    /**
     * 打开聊天窗口
     */
    openChat() {
        if (this.isChatOpen || this.popupContainer) return;
        
        // 记录日志
        this.logEvent('open_chat');
        
        // 创建弹窗容器
        this.popupContainer = document.createElement('div');
        this.popupContainer.className = 'jev-chat-popup';
        
        // 添加样式
        Object.assign(this.popupContainer.style, {
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1001,
            flexDirection: 'column'
        });
        
        // 创建弹窗内容
        const popupContent = document.createElement('div');
        popupContent.className = 'jev-chat-popup-content';
        
        // 添加样式
        Object.assign(popupContent.style, {
            backgroundColor: 'white',
            borderRadius: '8px',
            width: `${this.POPUP_WIDTH}px`,
            height: `${this.POPUP_HEIGHT}px`,
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
        });
        
        // 创建弹窗标题栏
        const popupHeader = document.createElement('div');
        popupHeader.className = 'jev-chat-popup-header';
        popupHeader.innerHTML = '<span>Daojie 客服聊天</span>';
        
        // 添加样式
        Object.assign(popupHeader.style, {
            backgroundColor: '#0078d4',
            color: 'white',
            padding: '12px 16px',
            fontSize: '16px',
            fontWeight: 'bold',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
        });
        
        // 创建关闭按钮
        this.closeButton = document.createElement('button');
        this.closeButton.className = 'jev-chat-close-button';
        this.closeButton.innerHTML = '×';
        
        // 添加样式
        Object.assign(this.closeButton.style, {
            backgroundColor: 'transparent',
            border: 'none',
            color: 'white',
            fontSize: '24px',
            cursor: 'pointer',
            padding: '0',
            width: '30px',
            height: '30px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            borderRadius: '50%',
            transition: 'background-color 0.2s ease'
        });
        
        // 添加悬停效果
        this.closeButton.addEventListener('mouseenter', () => {
            this.closeButton.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
        });
        
        this.closeButton.addEventListener('mouseleave', () => {
            this.closeButton.style.backgroundColor = 'transparent';
        });
        
        // 添加点击事件
        this.closeButton.addEventListener('click', () => {
            this.closeChat();
        });
        
        // 添加关闭按钮到标题栏
        popupHeader.appendChild(this.closeButton);
        
        // 创建iframe容器
        const iframeContainer = document.createElement('div');
        iframeContainer.style.cssText = `
            flex: 1;
            position: relative;
            overflow: hidden;
        `;
        
        // 创建加载状态
        const loadingIndicator = document.createElement('div');
        loadingIndicator.className = 'jev-chat-loading';
        loadingIndicator.innerHTML = '<div>正在加载聊天窗口...</div>';
        
        // 添加样式
        Object.assign(loadingIndicator.style, {
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: '#f8f8f8',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1,
            color: '#666',
            fontSize: '14px'
        });
        
        // 创建iframe
        this.iframe = document.createElement('iframe');
        this.iframe.src = this.CHAT_URL;
        this.iframe.title = 'Daojie 客服聊天';
        
        // 添加样式
        Object.assign(this.iframe.style, {
            width: '100%',
            height: '100%',
            border: 'none',
            position: 'absolute',
            top: 0,
            left: 0
        });
        
        // 设置安全属性
        this.iframe.sandbox = 'allow-scripts allow-same-origin allow-forms allow-popups';
        this.iframe.allow = 'geolocation; microphone; camera';
        
        // 记录开始加载时间
        this.loadStartTime = Date.now();
        
        // 设置超时
        this.loadTimeoutId = setTimeout(() => {
            this.handleLoadTimeout();
        }, this.LOAD_TIMEOUT);
        
        // 添加加载完成事件
        this.iframe.onload = () => {
            this.handleIframeLoad();
        };
        
        // 添加加载错误事件
        this.iframe.onerror = () => {
            this.handleLoadError();
        };
        
        // 组装DOM
        iframeContainer.appendChild(loadingIndicator);
        iframeContainer.appendChild(this.iframe);
        popupContent.appendChild(popupHeader);
        popupContent.appendChild(iframeContainer);
        this.popupContainer.appendChild(popupContent);
        
        // 添加到页面
        document.body.appendChild(this.popupContainer);
        
        // 设置状态
        this.isChatOpen = true;
        console.log('[JEV][ChatModule] 聊天窗口已打开');
    }
    
    /**
     * 关闭聊天窗口
     */
    closeChat() {
        if (!this.isChatOpen || !this.popupContainer) return;
        
        // 记录日志
        this.logEvent('close_chat');
        
        // 清除超时
        if (this.loadTimeoutId) {
            clearTimeout(this.loadTimeoutId);
            this.loadTimeoutId = null;
        }
        
        // 移除DOM元素
        if (this.popupContainer && this.popupContainer.parentNode) {
            this.popupContainer.parentNode.removeChild(this.popupContainer);
        }
        
        // 重置状态
        this.popupContainer = null;
        this.iframe = null;
        this.closeButton = null;
        this.isChatOpen = false;
        
        // 更新状态指示器为离线
        this.updateStateIndicator(false);
        
        console.log('[JEV][ChatModule] 聊天窗口已关闭');
    }
    
    /**
     * 处理iframe加载完成
     */
    handleIframeLoad() {
        // 清除超时
        if (this.loadTimeoutId) {
            clearTimeout(this.loadTimeoutId);
            this.loadTimeoutId = null;
        }
        
        // 计算加载时间
        const loadTime = Date.now() - this.loadStartTime;
        
        // 移除加载指示器
        if (this.iframe && this.iframe.parentNode) {
            const loadingIndicator = this.iframe.parentNode.querySelector('.jev-chat-loading');
            if (loadingIndicator) {
                loadingIndicator.parentNode.removeChild(loadingIndicator);
            }
        }
        
        // 更新状态指示器为在线
        this.updateStateIndicator(true);
        
        // 记录日志
        this.logEvent('iframe_loaded', { load_time_ms: loadTime });
        
        console.log(`[JEV][ChatModule] Chat (Daojie) loaded successfully in ${loadTime}ms`);
    }
    
    /**
     * 处理加载超时
     */
    handleLoadTimeout() {
        this.loadTimeoutId = null;
        
        // 显示错误信息
        if (this.iframe && this.iframe.parentNode) {
            const loadingIndicator = this.iframe.parentNode.querySelector('.jev-chat-loading');
            if (loadingIndicator) {
                loadingIndicator.innerHTML = '<div style="color: #d13438;">⚠️ 聊天窗口加载失败</div>';
            }
        }
        
        // 更新状态指示器为离线
        this.updateStateIndicator(false);
        
        // 记录错误日志
        this.logEvent('load_timeout', { error: 'Chat window load timeout' });
        
        console.error('[JEV][ChatModule] Chat (Daojie) load timeout after 5s');
    }
    
    /**
     * 处理加载错误
     */
    handleLoadError() {
        // 清除超时
        if (this.loadTimeoutId) {
            clearTimeout(this.loadTimeoutId);
            this.loadTimeoutId = null;
        }
        
        // 显示错误信息
        if (this.iframe && this.iframe.parentNode) {
            const loadingIndicator = this.iframe.parentNode.querySelector('.jev-chat-loading');
            if (loadingIndicator) {
                loadingIndicator.innerHTML = '<div style="color: #d13438;">⚠️ 聊天窗口加载失败</div>';
            }
        }
        
        // 更新状态指示器为离线
        this.updateStateIndicator(false);
        
        // 记录错误日志
        this.logEvent('load_error', { error: 'Chat window load failed' });
        
        console.error('[JEV][ChatModule] Chat (Daojie) load error');
    }
    
    /**
     * 更新状态指示器
     * @param {boolean} isOnline - 是否在线
     */
    updateStateIndicator(isOnline) {
        if (!this.stateIndicator) return;
        
        const statusLight = this.stateIndicator.querySelector('.jev-status-light');
        
        if (isOnline) {
            this.stateIndicator.textContent = 'Chat (Daojie) Online';
            this.stateIndicator.style.color = '#107c10';
            if (statusLight) {
                statusLight.style.backgroundColor = '#107c10';
            }
        } else {
            this.stateIndicator.textContent = 'Chat (Daojie) Offline';
            this.stateIndicator.style.color = '#d13438';
            if (statusLight) {
                statusLight.style.backgroundColor = '#d13438';
            }
            
            // 重新添加状态灯
            if (statusLight) {
                this.stateIndicator.appendChild(statusLight);
            }
        }
    }
    
    /**
     * 记录事件日志
     * @param {string} eventType - 事件类型
     * @param {Object} extraData - 额外数据
     */
    logEvent(eventType, extraData = {}) {
        try {
            const timestamp = Date.now();
            const logData = {
                timestamp,
                event_type: eventType,
                token: this.TOKEN,
                user_agent: navigator.userAgent,
                screen_size: `${window.innerWidth}x${window.innerHeight}`,
                chat_url: this.CHAT_URL,
                ...extraData
            };
            
            // 生成localStorage键名
            const logKey = `jev_chat_module_log_${timestamp}`;
            
            // 保存到localStorage
            localStorage.setItem(logKey, JSON.stringify(logData));
            
            console.log(`[JEV][ChatModule] 事件已记录: ${eventType}`, logData);
            
            // 限制localStorage中的日志数量（保留最近50条）
            this.cleanupOldLogs();
            
        } catch (error) {
            console.error('[JEV][ChatModule] 日志记录失败:', error);
        }
    }
    
    /**
     * 清理旧日志
     */
    cleanupOldLogs() {
        try {
            const logKeys = [];
            
            // 收集所有聊天模块日志键
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith('jev_chat_module_log_')) {
                    logKeys.push(key);
                }
            }
            
            // 按时间戳排序
            logKeys.sort((a, b) => {
                const timeA = parseInt(a.split('_').pop());
                const timeB = parseInt(b.split('_').pop());
                return timeB - timeA; // 降序排列
            });
            
            // 删除超出限制的旧日志
            const MAX_LOGS = 50;
            if (logKeys.length > MAX_LOGS) {
                const logsToDelete = logKeys.slice(MAX_LOGS);
                logsToDelete.forEach(key => {
                    localStorage.removeItem(key);
                });
            }
            
        } catch (error) {
            console.error('[JEV][ChatModule] 清理旧日志失败:', error);
        }
    }
    
    /**
     * 销毁聊天模块
     */
    destroy() {
        try {
            // 关闭聊天窗口
            this.closeChat();
            
            // 移除DOM元素
            if (this.chatButton && this.chatButton.parentNode) {
                this.chatButton.parentNode.removeChild(this.chatButton);
            }
            
            if (this.stateIndicator && this.stateIndicator.parentNode) {
                this.stateIndicator.parentNode.removeChild(this.stateIndicator);
            }
            
            // 重置状态
            this.isInitialized = false;
            this.chatButton = null;
            this.stateIndicator = null;
            
            console.log('[JEV][ChatModule] 聊天模块已销毁');
            
        } catch (error) {
            console.error('[JEV][ChatModule] 销毁失败:', error);
        }
    }
}

// 模块初始化
function initializeDaojieChatModule() {
    // 等待DOM加载完成
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            new DaojieChatModule();
        });
    } else {
        new DaojieChatModule();
    }
}

// 导出模块
window.DaojieChatModule = DaojieChatModule;
window.initializeDaojieChatModule = initializeDaojieChatModule;

// 自动初始化
initializeDaojieChatModule();

// 添加模块信息到JEV系统
if (window.jevModules) {
    window.jevModules.chat = {
        name: 'Daojie Chat Module',
        version: '1.0.0',
        status: 'initialized'
    };
}

console.log('[JEV][ChatModule] Daojie 聊天窗口模块加载完成');
