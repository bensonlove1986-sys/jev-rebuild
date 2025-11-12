// UI面板模块 - JEV Plugin v2.0

// 将模块挂载到全局JEV对象
if (!window.JEV) window.JEV = {};
if (!window.JEV.modules) window.JEV.modules = {};

window.JEV.modules.uiPanel = {
    container: null,
    toggleButton: null,
    panel: null,
    
    // 初始化UI面板
    init: async function() {
        try {
            JEV.utils.log('INFO', '初始化UI面板模块');
            this.createUI();
            this.setupEventListeners();
            this.updateStatusDisplay();
            JEV.utils.log('INFO', 'UI面板初始化完成');
        } catch (error) {
            JEV.utils.error('UI面板初始化失败', error);
        }
    },
    
    // 创建UI元素
    createUI: function() {
        // 创建容器
        this.container = document.createElement('div');
        this.container.className = 'jev-plugin-container';
        
        // 创建悬浮按钮
        this.toggleButton = document.createElement('button');
        this.toggleButton.className = 'jev-toggle-button';
        this.toggleButton.innerHTML = '🧠';
        this.toggleButton.title = 'JEV智能客服助手 v2.0';
        
        // 创建主面板
        this.panel = document.createElement('div');
        this.panel.className = 'jev-panel hidden';
        
        // 面板内容
        this.panel.innerHTML = this.getPanelContent();
        
        // 组装DOM
        this.container.appendChild(this.toggleButton);
        this.container.appendChild(this.panel);
        document.body.appendChild(this.container);
    },
    
    // 获取面板HTML内容
    getPanelContent: function() {
        return `
            <div class="jev-panel-header">
                <div class="jev-panel-title">
                    <div class="jev-panel-logo">J</div>
                    JEV智能客服助手 v${JEV.config.version}
                </div>
                <button class="jev-close-button" id="jev-close-panel">×</button>
            </div>
            
            <div class="jev-status-info">
                <span class="jev-status-dot" id="jev-status-indicator"></span>
                <span id="jev-status-text">系统初始化中...</span>
            </div>
            
            <div class="jev-features-section">
                <div class="jev-section-title">核心功能</div>
                
                <div class="jev-feature-row">
                    <label class="jev-feature-label">
                        <span class="jev-feature-icon">🧠</span>
                        AI自动回复
                    </label>
                    <label class="jev-switch">
                        <input type="checkbox" id="jev-toggle-ai" data-feature="ai_responder">
                        <span class="jev-slider"></span>
                    </label>
                </div>
                
                <div class="jev-feature-row">
                    <label class="jev-feature-label">
                        <span class="jev-feature-icon">🈳</span>
                        自动翻译
                    </label>
                    <label class="jev-switch">
                        <input type="checkbox" id="jev-toggle-translation" data-feature="translation_engine">
                        <span class="jev-slider"></span>
                    </label>
                </div>
                
                <div class="jev-feature-row">
                    <label class="jev-feature-label">
                        <span class="jev-feature-icon">🖼️</span>
                        图片识别
                    </label>
                    <label class="jev-switch">
                        <input type="checkbox" id="jev-toggle-ocr" data-feature="ocr_engine">
                        <span class="jev-slider"></span>
                    </label>
                </div>
                
                <div class="jev-feature-row">
                    <label class="jev-feature-label">
                        <span class="jev-feature-icon">💰</span>
                        报价计算
                    </label>
                    <label class="jev-switch">
                        <input type="checkbox" id="jev-toggle-profit" data-feature="profit_calc">
                        <span class="jev-slider"></span>
                    </label>
                </div>
                
                <div class="jev-feature-row">
                    <label class="jev-feature-label">
                        <span class="jev-feature-icon">📄</span>
                        PI生成
                    </label>
                    <label class="jev-switch">
                        <input type="checkbox" id="jev-toggle-pi" data-feature="pi_generator">
                        <span class="jev-slider"></span>
                    </label>
                </div>
            </div>
            
            <div class="jev-features-section">
                <div class="jev-section-title">系统设置</div>
                
                <div class="jev-feature-row">
                    <label class="jev-feature-label">
                        <span class="jev-feature-icon">🧍</span>
                        人工模式
                    </label>
                    <label class="jev-switch">
                        <input type="checkbox" id="jev-toggle-manual" data-feature="manual_mode">
                        <span class="jev-slider"></span>
                    </label>
                </div>
                
                <div class="jev-feature-row">
                    <label class="jev-feature-label">
                        <span class="jev-feature-icon">🛡️</span>
                        安全锁
                    </label>
                    <label class="jev-switch">
                        <input type="checkbox" id="jev-toggle-security" checked disabled data-feature="security_lock">
                        <span class="jev-slider"></span>
                    </label>
                </div>
                
                <div class="jev-feature-row">
                    <label class="jev-feature-label">
                        <span class="jev-feature-icon">🔄</span>
                        云同步
                    </label>
                    <label class="jev-switch">
                        <input type="checkbox" id="jev-toggle-sync" data-feature="cloud_sync">
                        <span class="jev-slider"></span>
                    </label>
                </div>
            </div>
            
            <div class="jev-info-section">
                <div class="jev-info-text">
                    安全状态: <strong id="jev-security-status">${JEV.config.lockStatus}</strong><br>
                    上次同步: <span id="jev-last-sync">未同步</span>
                </div>
            </div>
            
            <div class="jev-footer">
                <div class="jev-version">v${JEV.config.version}</div>
                <div class="jev-status">
                    <span class="jev-status-dot" id="jev-footer-status"></span>
                    <span class="jev-status-text" id="jev-footer-status-text">就绪</span>
                </div>
            </div>
        `;
    },
    
    // 设置事件监听器
    setupEventListeners: function() {
        // 悬浮按钮点击事件
        this.toggleButton.addEventListener('click', () => {
            this.togglePanel();
        });
        
        // 关闭按钮点击事件
        document.getElementById('jev-close-panel').addEventListener('click', () => {
            this.hidePanel();
        });
        
        // 所有开关的点击事件
        const toggleSwitches = document.querySelectorAll('.jev-switch input');
        toggleSwitches.forEach(switchEl => {
            switchEl.addEventListener('change', (e) => {
                const feature = e.target.dataset.feature;
                const enabled = e.target.checked;
                this.handleFeatureToggle(feature, enabled);
            });
        });
        
        // 点击面板外部关闭
        document.addEventListener('click', (e) => {
            if (this.panel && !this.panel.classList.contains('hidden') &&
                !this.container.contains(e.target)) {
                this.hidePanel();
            }
        });
        
        // 阻止面板内部点击冒泡
        this.panel.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    },
    
    // 切换面板显示/隐藏
    togglePanel: function() {
        if (this.panel.classList.contains('hidden')) {
            this.showPanel();
        } else {
            this.hidePanel();
        }
    },
    
    // 显示面板
    showPanel: function() {
        this.panel.classList.remove('hidden');
        this.toggleButton.innerHTML = '✖️';
        // 更新状态显示
        this.updateStatusDisplay();
        // 触发显示事件
        this.emitEvent('panel_visible');
    },
    
    // 隐藏面板
    hidePanel: function() {
        this.panel.classList.add('hidden');
        this.toggleButton.innerHTML = '🧠';
        // 触发隐藏事件
        this.emitEvent('panel_hidden');
    },
    
    // 处理功能开关切换
    handleFeatureToggle: function(feature, enabled) {
        JEV.utils.log('INFO', `${feature} ${enabled ? '已启用' : '已禁用'}`);
        
        // 调用开关管理器处理切换
        if (JEV.modules.toggleManager && JEV.modules.toggleManager.toggleFeature) {
            JEV.modules.toggleManager.toggleFeature(feature, enabled);
        }
        
        // 保存设置到本地存储
        if (JEV.modules.storageManager && JEV.modules.storageManager.saveFeatureSettings) {
            JEV.modules.storageManager.saveFeatureSettings(feature, enabled);
        }
        
        // 触发功能切换事件
        this.emitEvent('feature_toggled', { feature, enabled });
        
        // 显示切换提示
        this.showNotification(`${feature} ${enabled ? '已启用' : '已禁用'}`);
    },
    
    // 更新状态显示
    updateStatusDisplay: function() {
        const statusIndicator = document.getElementById('jev-status-indicator');
        const statusText = document.getElementById('jev-status-text');
        const footerStatus = document.getElementById('jev-footer-status');
        const footerStatusText = document.getElementById('jev-footer-status-text');
        const securityStatus = document.getElementById('jev-security-status');
        const lastSync = document.getElementById('jev-last-sync');
        
        // 更新认证状态
        if (JEV.status.authenticated) {
            statusIndicator.className = 'jev-status-dot';
            statusText.textContent = '已授权 - 正常运行';
            footerStatus.className = 'jev-status-dot';
            footerStatusText.textContent = '在线';
        } else {
            statusIndicator.className = 'jev-status-dot warning';
            statusText.textContent = '未授权 - 请注册';
            footerStatus.className = 'jev-status-dot warning';
            footerStatusText.textContent = '离线';
        }
        
        // 更新安全状态
        securityStatus.textContent = JEV.config.lockStatus;
        
        // 更新同步时间
        if (JEV.modules.storageManager) {
            const lastSyncTime = JEV.modules.storageManager.getLastSyncTime();
            if (lastSyncTime) {
                lastSync.textContent = this.formatTime(lastSyncTime);
            }
        }
        
        // 更新功能开关状态
        this.restoreFeatureStates();
    },
    
    // 恢复功能开关状态
    restoreFeatureStates: function() {
        if (!JEV.modules.storageManager) return;
        
        const featureSettings = JEV.modules.storageManager.getFeatureSettings();
        if (!featureSettings) return;
        
        Object.keys(featureSettings).forEach(feature => {
            const switchEl = document.querySelector(`.jev-switch input[data-feature="${feature}"]`);
            if (switchEl) {
                switchEl.checked = featureSettings[feature];
            }
        });
    },
    
    // 显示通知
    showNotification: function(message, type = 'info') {
        // 创建通知元素
        const notification = document.createElement('div');
        notification.className = `jev-register-message ${type}`;
        notification.textContent = message;
        
        // 设置样式
        notification.style.position = 'fixed';
        notification.style.top = '20px';
        notification.style.right = '20px';
        notification.style.zIndex = '999999';
        notification.style.minWidth = '200px';
        notification.style.maxWidth = '300px';
        notification.style.opacity = '0';
        notification.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        notification.style.transform = 'translateY(-20px)';
        
        document.body.appendChild(notification);
        
        // 显示动画
        setTimeout(() => {
            notification.style.opacity = '1';
            notification.style.transform = 'translateY(0)';
        }, 10);
        
        // 自动关闭
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateY(-20px)';
            setTimeout(() => {
                if (document.body.contains(notification)) {
                    document.body.removeChild(notification);
                }
            }, 300);
        }, 3000);
    },
    
    // 格式化时间
    formatTime: function(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;
        
        // 小于1分钟
        if (diff < 60 * 1000) {
            return '刚刚';
        }
        // 小于1小时
        else if (diff < 60 * 60 * 1000) {
            const minutes = Math.floor(diff / (60 * 1000));
            return `${minutes}分钟前`;
        }
        // 小于24小时
        else if (diff < 24 * 60 * 60 * 1000) {
            const hours = Math.floor(diff / (60 * 60 * 1000));
            return `${hours}小时前`;
        }
        // 大于24小时
        else {
            const days = Math.floor(diff / (24 * 60 * 60 * 1000));
            return `${days}天前`;
        }
    },
    
    // 触发事件
    emitEvent: function(eventName, detail = {}) {
        const event = new CustomEvent(`jev_${eventName}`, {
            detail: detail,
            bubbles: true,
            cancelable: true
        });
        document.dispatchEvent(event);
    },
    
    // 绑定事件监听器
    on: function(eventName, callback) {
        document.addEventListener(`jev_${eventName}`, (e) => {
            callback(e.detail);
        });
    },
    
    // 获取面板状态
    getPanelState: function() {
        return {
            visible: !this.panel.classList.contains('hidden'),
            authenticated: JEV.status.authenticated,
            version: JEV.config.version,
            securityStatus: JEV.config.lockStatus
        };
    },
    
    // 刷新面板
    refresh: function() {
        this.updateStatusDisplay();
    },
    
    // 销毁面板
    destroy: function() {
        if (this.container && document.body.contains(this.container)) {
            document.body.removeChild(this.container);
        }
        this.container = null;
        this.toggleButton = null;
        this.panel = null;
    }
};

// 导出模块（兼容不同环境）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = window.JEV.modules.uiPanel;
}
