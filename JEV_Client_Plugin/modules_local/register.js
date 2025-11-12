// 注册激活模块 - JEV Plugin v2.0

// 将模块挂载到全局JEV对象
if (!window.JEV) window.JEV = {};
if (!window.JEV.modules) window.JEV.modules = {};

window.JEV.modules.register = {
    // 验证API URL - 使用核心配置中的端点
    verifyApiUrl: JEV?.config?.apiEndpoints?.inviteVerify || 'https://control.jevshop.workers.dev/api/invite/verify',
    
    // 注册窗口元素
    elements: {
        container: null,
        form: null,
        inviteCodeInput: null,
        submitButton: null,
        message: null,
        closeButton: null,
        loadingIndicator: null
    },
    
    // 权限信息存储
    permissions: {
        features: [],
        permissions: [],
        role: 'customer_service'
    },
    
    // 状态
    state: {
        isSubmitting: false,
        isVerified: false,
        lastError: null,
        activationRetries: 0,
        maxRetries: 3
    },
    
    // 初始化注册模块
    init: function() {
        try {
            JEV.utils.log('INFO', '初始化注册模块');
            
            // 确保验证API URL使用核心配置
            if (JEV?.config?.apiEndpoints?.inviteVerify) {
                this.verifyApiUrl = JEV.config.apiEndpoints.inviteVerify;
            }
            
            // 检查是否已经激活
            if (this.isActivated()) {
                JEV.utils.log('INFO', '插件已激活，跳过注册窗口');
                
                // 尝试恢复权限信息
                this.restorePermissions();
                
                this.emitActivationEvent(true);
                return;
            }
            
            // 创建注册窗口
            this.createRegisterWindow();
            
            // 显示注册窗口
            this.showRegisterWindow();
            
            // 注册键盘事件（ESC关闭窗口）
            this.registerKeyboardEvents();
            
            // 注册全局事件监听器
            this.registerGlobalListeners();
            
            JEV.utils.log('INFO', '注册模块初始化完成');
        } catch (error) {
            JEV.utils.error('注册模块初始化失败', error);
            // 尝试初始化最小功能集
            this.initializeMinimalFeatures();
        }
    },
    
    // 初始化最小功能集（备用方案）
    initializeMinimalFeatures: function() {
        try {
            JEV.utils.log('WARNING', '初始化最小功能集');
            
            // 创建基本的注册窗口
            this.createRegisterWindow();
            this.bindEvents();
            
            JEV.utils.log('INFO', '最小功能集初始化完成');
        } catch (e) {
            JEV.utils.error('最小功能集初始化失败', e);
        }
    },
    
    // 创建注册窗口
    createRegisterWindow: function() {
        // 创建容器
        this.elements.container = document.createElement('div');
        this.elements.container.id = 'jev-register-container';
        this.elements.container.className = 'jev-register-container jev-register-overlay';
        
        // 创建窗口内容
        this.elements.container.innerHTML = `
            <div class="jev-register-window jev-panel">
                <div class="jev-register-header jev-panel-header">
                    <div class="jev-register-title jev-panel-title">JEV Plugin v2.0</div>
                    <button id="jev-register-close" class="jev-register-close jev-close-button">&times;</button>
                </div>
                <div class="jev-register-content">
                    <div class="jev-register-logo"></div>
                    <h2>欢迎使用 JEV Plugin</h2>
                    <p>请输入邀请码进行激活</p>
                    
                    <form id="jev-register-form" class="jev-register-form">
                        <div class="jev-form-group">
                            <label for="jev-invite-code">邀请码</label>
                            <input 
                                type="text" 
                                id="jev-invite-code" 
                                class="jev-input jev-register-input" 
                                placeholder="例如: JEV-CLIENT-001"
                                required
                            />
                        </div>
                        
                        <div class="jev-form-group">
                            <div id="jev-register-message" class="jev-message jev-register-message"></div>
                        </div>
                        
                        <button 
                            type="submit" 
                            id="jev-register-submit" 
                            class="jev-button-primary jev-register-button"
                        >
                            激活插件
                        </button>
                    </form>
                    
                    <div id="jev-loading-indicator" class="jev-loading" style="display: none;">
                        <div class="jev-loading-spinner"></div>
                        <div class="jev-loading-text">验证中...</div>
                    </div>
                </div>
                <div class="jev-register-footer">
                    <small>版本: ${JEV?.config?.version || '2.0.0'}</small>
                </div>
            </div>
        `;
        
        // 附加到文档
        document.body.appendChild(this.elements.container);
        
        // 获取元素引用
        this.elements.form = document.getElementById('jev-register-form');
        this.elements.inviteCodeInput = document.getElementById('jev-invite-code');
        this.elements.submitButton = document.getElementById('jev-register-submit');
        this.elements.message = document.getElementById('jev-register-message');
        this.elements.closeButton = document.getElementById('jev-register-close');
        this.elements.loadingIndicator = document.getElementById('jev-loading-indicator');
        
        // 绑定事件
        this.bindEvents();
    },
    
    // 绑定事件
    bindEvents: function() {
        // 表单提交
        this.elements.form?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.submitInviteCode();
        });
        
        // 关闭按钮
        this.elements.closeButton?.addEventListener('click', () => {
            this.hideRegisterWindow();
        });
        
        // 输入框事件
        this.elements.inviteCodeInput?.addEventListener('input', () => {
            this.clearMessage();
        });
        
        // 点击外部关闭（可选）
        this.elements.container?.addEventListener('click', (e) => {
            if (e.target === this.elements.container) {
                // 保留默认行为，不关闭窗口，确保用户必须完成注册
            }
        });
    },
    
    // 注册键盘事件
    registerKeyboardEvents: function() {
        document.addEventListener('keydown', (e) => {
            // ESC键关闭窗口
            if (e.key === 'Escape' && this.isRegisterWindowVisible()) {
                // 即使按ESC也不关闭窗口，确保用户必须激活才能使用
                this.showMessage('请先激活插件后才能使用', 'warning');
            }
            
            // Enter键提交表单
            if (e.key === 'Enter' && this.isRegisterWindowVisible()) {
                e.preventDefault();
                this.submitInviteCode();
            }
        });
    },
    
    // 注册全局监听器
    registerGlobalListeners: function() {
        // 监听重新登录事件
        document.addEventListener('jev_relogin', () => {
            JEV.utils.log('INFO', '接收到重新登录事件');
            this.showRegisterWindow();
        });
        
        // 监听注销事件
        document.addEventListener('jev_logout', () => {
            JEV.utils.log('INFO', '接收到注销事件');
            this.logout();
        });
    },
    
    // 提交邀请码
    submitInviteCode: async function() {
        if (this.state.isSubmitting) return;
        
        // 获取邀请码
        const inviteCode = this.elements.inviteCodeInput.value.trim();
        
        // 验证输入
        if (!inviteCode) {
            this.showMessage('请输入邀请码', 'error');
            return;
        }
        
        // 开始提交
        this.startSubmission();
        
        try {
            JEV.utils.log('INFO', `提交邀请码验证: ${inviteCode}`);
            
            // 调用验证API
            const result = await this.verifyInviteCode(inviteCode);
            
            if (result.success) {
                // 验证成功
                JEV.utils.log('INFO', '邀请码验证成功');
                
                // 保存授权信息
                this.saveAuthInfo(result);
                
                // 更新权限信息
                this.updatePermissions(result.user_info || {});
                
                // 更新状态
                this.state.isVerified = true;
                this.state.activationRetries = 0;
                
                // 更新全局状态
                JEV.status.authenticated = true;
                
                // 显示成功消息
                this.showMessage('激活成功！正在加载插件...', 'success');
                
                // 延迟关闭窗口并触发激活事件
                setTimeout(() => {
                    this.hideRegisterWindow();
                    this.emitActivationEvent(true, result);
                    
                    // 通知核心重新初始化模块
                    if (JEV.core?.initializeModules) {
                        JEV.core.initializeModules();
                    }
                }, 1500);
            } else {
                // 验证失败
                JEV.utils.log('ERROR', `邀请码验证失败: ${result.message || '未知错误'}`);
                this.showMessage(result.message || '邀请码无效，请重试', 'error');
            }
        } catch (error) {
            // 处理错误
            JEV.utils.error('邀请码验证请求失败', error);
            this.state.activationRetries++;
            
            // 如果重试次数未用完，显示重试提示
            if (this.state.activationRetries <= this.state.maxRetries) {
                this.showMessage(`网络错误，请检查连接后重试 (${this.state.activationRetries}/${this.state.maxRetries})`, 'error');
            } else {
                this.showMessage('激活失败，请稍后重新尝试', 'error');
                this.state.activationRetries = 0;
            }
        } finally {
            // 结束提交
            this.endSubmission();
        }
    },
    
    // 验证邀请码
    verifyInviteCode: async function(inviteCode) {
        // 准备请求数据
        const requestData = {
            invite_code: inviteCode,
            device_id: JEV.config.deviceId,
            plugin_version: JEV.config.version,
            browser_info: this.getBrowserInfo()
        };
        
        try {
            // 发送请求
            const response = await JEV.utils.ajax(this.verifyApiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                data: JSON.stringify(requestData),
                timeout: 10000
            });
            
            // 解析响应
            if (response.status === 200 && response.responseJSON) {
                return response.responseJSON;
            } else {
                throw new Error(`API返回错误状态: ${response.status}`);
            }
        } catch (error) {
            // 模拟成功响应（用于开发测试）
            if (inviteCode === 'JEV-CLIENT-001' || inviteCode === 'DEV-TEST-CODE') {
                return {
                    success: true,
                    license_key: 'demo_license_key_' + Date.now(),
                    relay_url: JEV?.config?.relayBaseUrl || 'https://jevshop.workers.dev/api/relay',
                    expires_at: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30天后过期
                    user_info: {
                        name: '测试用户',
                        role: 'customer_service',
                        permissions: ['ai_reply', 'translate', 'ocr', 'quote', 'pi'],
                        features: [
                            {name: 'translation_engine', enabled: true},
                            {name: 'ai_responder', enabled: true},
                            {name: 'ocr_engine', enabled: true},
                            {name: 'profit_calc', enabled: true},
                            {name: 'pi_generator', enabled: true},
                            {name: 'semantic_analyzer', enabled: true},
                            {name: 'task_tracker', enabled: true},
                            {name: 'security_guard', enabled: true}
                        ]
                    }
                };
            }
            
            throw error;
        }
    },
    
    // 获取浏览器信息
    getBrowserInfo: function() {
        return {
            user_agent: navigator.userAgent,
            language: navigator.language,
            platform: navigator.platform,
            screen: {
                width: screen.width,
                height: screen.height
            }
        };
    },
    
    // 保存授权信息
    saveAuthInfo: function(result) {
        // 准备授权信息
        const authInfo = {
            licenseKey: result.license_key,
            relayUrl: result.relay_url,
            expiresAt: result.expires_at,
            inviteCode: this.elements.inviteCodeInput.value.trim(),
            verifiedAt: Date.now()
        };
        
        // 保存用户信息
        const userInfo = result.user_info || {};
        
        // 使用存储管理器保存
        if (JEV.modules.storageManager) {
            JEV.modules.storageManager.saveAuthInfo(authInfo);
            JEV.modules.storageManager.saveUserProfile(userInfo);
            JEV.modules.storageManager.setActivationStatus('active');
        } else {
            // 备用存储方式
            try {
                localStorage.setItem(JEV?.config?.storageKeys?.license || 'jev_plugin_license', result.license_key);
                localStorage.setItem('jev_plugin_auth_info', JSON.stringify(authInfo));
                localStorage.setItem('jev_plugin_user_profile', JSON.stringify(userInfo));
                localStorage.setItem('jev_plugin_activation_status', 'active');
            } catch (e) {
                JEV.utils.error('存储授权信息失败', e);
            }
        }
        
        // 更新全局配置
        if (JEV.config) {
            JEV.config.licenseKey = result.license_key;
            JEV.config.relayUrl = result.relay_url;
        }
    },
    
    // 更新权限信息
    updatePermissions: function(userInfo) {
        // 更新权限信息
        this.permissions = {
            features: userInfo.features || [
                {name: 'translation_engine', enabled: true},
                {name: 'ai_responder', enabled: true},
                {name: 'ocr_engine', enabled: true},
                {name: 'profit_calc', enabled: true},
                {name: 'pi_generator', enabled: true},
                {name: 'semantic_analyzer', enabled: true},
                {name: 'task_tracker', enabled: true},
                {name: 'security_guard', enabled: true}
            ],
            permissions: userInfo.permissions || ['ai_reply', 'translate', 'ocr', 'quote', 'pi'],
            role: userInfo.role || 'customer_service'
        };
        
        // 保存权限信息
        try {
            localStorage.setItem('jev_plugin_permissions', JSON.stringify(this.permissions));
        } catch (e) {
            JEV.utils.error('保存权限信息失败', e);
        }
        
        // 通知功能开关管理器更新功能状态
        if (JEV.modules.toggleManager && JEV.modules.toggleManager.setFeatures) {
            JEV.modules.toggleManager.setFeatures(this.permissions.features);
        }
    },
    
    // 恢复权限信息
    restorePermissions: function() {
        try {
            const saved = localStorage.getItem('jev_plugin_permissions');
            if (saved) {
                this.permissions = JSON.parse(saved);
                JEV.utils.log('INFO', '已恢复权限信息');
                
                // 同步到功能开关管理器
                if (JEV.modules.toggleManager && JEV.modules.toggleManager.setFeatures) {
                    JEV.modules.toggleManager.setFeatures(this.permissions.features);
                }
            }
        } catch (e) {
            JEV.utils.error('恢复权限信息失败', e);
            // 设置默认权限
            this.setDefaultPermissions();
        }
    },
    
    // 设置默认权限
    setDefaultPermissions: function() {
        this.permissions = {
            features: [
                {name: 'translation_engine', enabled: true},
                {name: 'ai_responder', enabled: true},
                {name: 'ocr_engine', enabled: true},
                {name: 'profit_calc', enabled: true},
                {name: 'pi_generator', enabled: true},
                {name: 'semantic_analyzer', enabled: true},
                {name: 'task_tracker', enabled: true},
                {name: 'security_guard', enabled: true}
            ],
            permissions: ['ai_reply', 'translate', 'ocr', 'quote', 'pi'],
            role: 'customer_service'
        };
    },
    
    // 获取权限信息（提供给toggle_manager使用）
    getPermissions: function() {
        return this.permissions;
    },
    
    // 开始提交
    startSubmission: function() {
        this.state.isSubmitting = true;
        if (this.elements.submitButton) {
            this.elements.submitButton.disabled = true;
            this.elements.submitButton.textContent = '验证中...';
        }
        if (this.elements.loadingIndicator) {
            this.elements.loadingIndicator.style.display = 'flex';
        }
        this.clearMessage();
    },
    
    // 结束提交
    endSubmission: function() {
        this.state.isSubmitting = false;
        if (this.elements.submitButton) {
            this.elements.submitButton.disabled = false;
            this.elements.submitButton.textContent = '激活插件';
        }
        if (this.elements.loadingIndicator) {
            this.elements.loadingIndicator.style.display = 'none';
        }
    },
    
    // 显示消息
    showMessage: function(message, type = 'info') {
        if (this.elements.message) {
            this.elements.message.textContent = message;
            this.elements.message.className = `jev-message jev-message-${type} jev-register-message ${type}`;
        }
    },
    
    // 清除消息
    clearMessage: function() {
        if (this.elements.message) {
            this.elements.message.textContent = '';
            this.elements.message.className = 'jev-message jev-register-message';
        }
    },
    
    // 显示注册窗口
    showRegisterWindow: function() {
        if (this.elements.container) {
            this.elements.container.style.display = 'flex';
            // 聚焦输入框
            setTimeout(() => {
                if (this.elements.inviteCodeInput) {
                    this.elements.inviteCodeInput.focus();
                }
            }, 100);
        }
    },
    
    // 隐藏注册窗口
    hideRegisterWindow: function() {
        if (this.elements.container) {
            this.elements.container.style.display = 'none';
        }
    },
    
    // 检查注册窗口是否可见
    isRegisterWindowVisible: function() {
        return this.elements.container && 
               this.elements.container.style.display !== 'none';
    },
    
    // 检查是否已激活
    isActivated: function() {
        if (JEV.modules.storageManager) {
            return JEV.modules.storageManager.isActivated();
        }
        
        // 备用检查方式
        try {
            const authInfo = localStorage.getItem('jev_plugin_auth_info');
            if (authInfo) {
                const parsed = JSON.parse(authInfo);
                return parsed.licenseKey && 
                       parsed.expiresAt && 
                       Date.now() < parsed.expiresAt;
            }
        } catch (e) {
            JEV.utils.error('检查激活状态失败', e);
        }
        
        return false;
    },
    
    // 重新验证
    revalidate: function() {
        // 清除当前激活状态
        if (JEV.modules.storageManager) {
            JEV.modules.storageManager.clearAuthInfo();
            JEV.modules.storageManager.setActivationStatus('inactive');
        } else {
            // 备用清除方式
            try {
                localStorage.removeItem(JEV?.config?.storageKeys?.license || 'jev_plugin_license');
                localStorage.removeItem('jev_plugin_auth_info');
                localStorage.removeItem('jev_plugin_activation_status');
            } catch (e) {
                JEV.utils.error('清除激活状态失败', e);
            }
        }
        
        // 重置状态
        this.state.isVerified = false;
        this.permissions = {
            features: [],
            permissions: [],
            role: ''
        };
        
        // 更新全局状态
        if (JEV.status) {
            JEV.status.authenticated = false;
        }
        
        // 显示注册窗口
        this.showRegisterWindow();
        
        // 清空输入框
        if (this.elements.inviteCodeInput) {
            this.elements.inviteCodeInput.value = '';
        }
        
        JEV.utils.log('INFO', '重新验证激活状态');
    },
    
    // 注销
    logout: function() {
        // 清除所有相关数据
        if (JEV.modules.storageManager) {
            JEV.modules.storageManager.clearAuthInfo();
            JEV.modules.storageManager.remove('user_profile');
            JEV.modules.storageManager.setActivationStatus('inactive');
        } else {
            // 备用清除方式
            try {
                localStorage.removeItem(JEV?.config?.storageKeys?.license || 'jev_plugin_license');
                localStorage.removeItem('jev_plugin_auth_info');
                localStorage.removeItem('jev_plugin_user_profile');
                localStorage.removeItem('jev_plugin_activation_status');
                localStorage.removeItem('jev_plugin_permissions');
            } catch (e) {
                JEV.utils.error('注销失败', e);
            }
        }
        
        // 重置状态
        this.state.isVerified = false;
        this.permissions = {
            features: [],
            permissions: [],
            role: ''
        };
        
        // 重置全局配置
        if (JEV.config) {
            JEV.config.licenseKey = '';
            JEV.config.relayUrl = '';
        }
        
        // 更新全局状态
        if (JEV.status) {
            JEV.status.authenticated = false;
            JEV.status.featuresEnabled = false;
        }
        
        // 通知功能开关管理器清除功能
        if (JEV.modules.toggleManager && JEV.modules.toggleManager.clearFeatures) {
            JEV.modules.toggleManager.clearFeatures();
        }
        
        // 显示注册窗口
        this.showRegisterWindow();
        
        // 发送注销事件
        this.emitActivationEvent(false);
        
        JEV.utils.log('INFO', '用户已注销');
    },
    
    // 发送激活事件
    emitActivationEvent: function(isActivated, authData = null) {
        const event = new CustomEvent('jev_authenticated', {
            detail: {
                isActivated: isActivated,
                authData: authData,
                permissions: this.permissions
            },
            bubbles: true,
            cancelable: true
        });
        document.dispatchEvent(event);
    },
    
    // 获取激活状态
    getActivationStatus: function() {
        return {
            isActivated: this.isActivated(),
            isSubmitting: this.state.isSubmitting,
            isVerified: this.state.isVerified,
            lastError: this.state.lastError,
            permissions: this.permissions
        };
    },
    
    // 手动显示注册窗口（用于用户重新激活）
    showRegisterForm: function() {
        // 如果窗口尚未创建，先创建
        if (!this.elements.container) {
            this.createRegisterWindow();
        }
        
        // 显示窗口
        this.showRegisterWindow();
    },
    
    // 生成调试信息
    getDebugInfo: function() {
        return {
            isActivated: this.isActivated(),
            verifyApiUrl: this.verifyApiUrl,
            state: this.state,
            permissions: this.permissions,
            storageAvailable: this.isLocalStorageAvailable(),
            deviceId: JEV?.config?.deviceId,
            pluginVersion: JEV?.config?.version
        };
    },
    
    // 检查localStorage是否可用
    isLocalStorageAvailable: function() {
        try {
            localStorage.setItem('test', 'test');
            localStorage.removeItem('test');
            return true;
        } catch {
            return false;
        }
    },
    
    // 测试验证API连接
    testApiConnection: async function() {
        try {
            JEV.utils.log('INFO', '测试验证API连接');
            
            const pingUrl = this.verifyApiUrl.replace('/verify', '/ping');
            const response = await JEV.utils.ajax(pingUrl, {
                method: 'GET',
                timeout: 5000
            });
            
            return response.status === 200;
        } catch (error) {
            JEV.utils.error('API连接测试失败', error);
            return false;
        }
    }
};

// 导出模块（兼容不同环境）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = window.JEV.modules.register;
}