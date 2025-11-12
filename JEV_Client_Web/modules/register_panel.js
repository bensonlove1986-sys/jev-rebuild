/**
 * JEV系统注册窗口模块
 * 功能：处理用户注册表单提交、与Worker通信、存储用户信息
 */

class RegisterModule {
    constructor() {
        this.initializeElements();
        this.setupEventListeners();
    }
    
    /**
     * 初始化DOM元素引用
     */
    initializeElements() {
        this.form = document.getElementById('register-form');
        this.usernameInput = document.getElementById('username');
        this.emailInput = document.getElementById('email');
        this.passwordInput = document.getElementById('password');
        this.inviteCodeInput = document.getElementById('inviteCode');
        this.registerButton = document.getElementById('register-button');
        this.loadingOverlay = document.getElementById('loading-overlay');
        this.errorMessage = document.getElementById('error-message');
        this.successMessage = document.getElementById('success-message');
    }
    
    /**
     * 设置事件监听器
     */
    setupEventListeners() {
        this.form.addEventListener('submit', this.handleSubmit.bind(this));
        
        // 表单输入验证
        this.emailInput.addEventListener('input', this.validateEmail.bind(this));
        this.passwordInput.addEventListener('input', this.validatePassword.bind(this));
    }
    
    /**
     * 处理表单提交
     */
    handleSubmit(event) {
        event.preventDefault();
        
        // 清除之前的错误消息
        this.hideError();
        
        // 验证表单
        if (!this.validateForm()) {
            return;
        }
        
        // 显示加载状态
        this.showLoading(true);
        
        // 收集表单数据
        const formData = {
            username: this.usernameInput.value.trim(),
            email: this.emailInput.value.trim(),
            password: this.passwordInput.value,
            inviteCode: this.inviteCodeInput.value.trim()
        };
        
        // 发送注册请求
        this.sendRegisterRequest(formData)
            .then(response => {
                this.handleRegisterResponse(response);
            })
            .catch(error => {
                this.handleRegisterError(error);
            })
            .finally(() => {
                this.showLoading(false);
            });
    }
    
    /**
     * 验证整个表单
     */
    validateForm() {
        let isValid = true;
        
        // 验证用户名
        if (!this.usernameInput.value.trim()) {
            this.showError('请输入用户名');
            isValid = false;
        }
        
        // 验证邮箱
        else if (!this.validateEmail()) {
            isValid = false;
        }
        
        // 验证密码
        else if (!this.validatePassword()) {
            isValid = false;
        }
        
        // 验证邀请码
        else if (!this.inviteCodeInput.value.trim()) {
            this.showError('请输入邀请码');
            isValid = false;
        }
        
        return isValid;
    }
    
    /**
     * 验证邮箱格式
     */
    validateEmail() {
        const email = this.emailInput.value.trim();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        
        if (!email || !emailRegex.test(email)) {
            this.showError('请输入有效的邮箱地址');
            return false;
        }
        
        this.hideError();
        return true;
    }
    
    /**
     * 验证密码
     */
    validatePassword() {
        const password = this.passwordInput.value;
        
        if (!password || password.length < 6) {
            this.showError('密码长度至少为6位');
            return false;
        }
        
        this.hideError();
        return true;
    }
    
    /**
     * 发送注册请求到Worker
     */
    async sendRegisterRequest(formData) {
        try {
            const workerUrl = '/register';
            const response = await fetch(workerUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Agent-Token': 'jev-secure-key-001'
                },
                body: JSON.stringify(formData)
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            // 在无法连接Worker的情况下，使用模拟响应（用于演示）
            if (error.message.includes('HTTP error') || error.message.includes('Failed to fetch')) {
                console.log('无法连接Worker，使用模拟响应...');
                return this.getMockResponse(formData);
            }
            throw error;
        }
    }
    
    /**
     * 获取模拟响应（用于演示和测试）
     */
    getMockResponse(formData) {
        // 模拟生成用户ID和token
        const userId = 'U' + Date.now();
        const token = 'mock-token-' + Math.random().toString(36).substring(2, 15);
        
        // 模拟日志记录
        this.logRegisterAttempt(formData, true, userId, token);
        
        return {
            success: true,
            userId: userId,
            token: token,
            message: '注册成功（模拟响应）'
        };
    }
    
    /**
     * 处理注册响应
     */
    handleRegisterResponse(response) {
        if (response.success) {
            // 保存token到localStorage
            this.saveUserInfo(response.userId, response.token, this.usernameInput.value.trim());
            
            // 显示成功消息
            this.showSuccess();
            
            // 延迟后关闭窗口并刷新父页面
            setTimeout(() => {
                if (window.parent && window.parent.closeRegisterWindow) {
                    window.parent.closeRegisterWindow();
                }
                
                // 尝试通知父页面刷新状态
                this.notifyParentPage();
            }, 2000);
        } else {
            this.showError(response.message || '注册失败，请重试');
        }
    }
    
    /**
     * 处理注册错误
     */
    handleRegisterError(error) {
        console.error('注册错误:', error);
        this.showError('注册过程中发生错误，请检查网络连接后重试');
    }
    
    /**
     * 保存用户信息到localStorage
     */
    saveUserInfo(userId, token, username) {
        try {
            // 只保存必要的信息，不保存密码
            localStorage.setItem('jev_user_token', token);
            localStorage.setItem('jev_user_id', userId);
            localStorage.setItem('jev_username', username);
            localStorage.setItem('jev_user_email', this.emailInput.value.trim());
            localStorage.setItem('jev_last_login', new Date().toISOString());
            
            console.log('用户信息已保存到localStorage');
        } catch (error) {
            console.error('保存用户信息失败:', error);
        }
    }
    
    /**
     * 显示加载状态
     */
    showLoading(show) {
        this.loadingOverlay.style.display = show ? 'flex' : 'none';
        this.registerButton.disabled = show;
    }
    
    /**
     * 显示错误消息
     */
    showError(message) {
        this.errorMessage.textContent = message;
        this.errorMessage.style.display = 'block';
    }
    
    /**
     * 隐藏错误消息
     */
    hideError() {
        this.errorMessage.style.display = 'none';
    }
    
    /**
     * 显示成功消息
     */
    showSuccess() {
        this.successMessage.style.display = 'block';
        this.form.style.display = 'none';
    }
    
    /**
     * 通知父页面更新状态
     */
    notifyParentPage() {
        if (window.parent && window.parent.updateUserStatus) {
            window.parent.updateUserStatus();
        } else if (window.opener && window.opener.updateUserStatus) {
            window.opener.updateUserStatus();
        } else {
            // 如果无法直接通知，尝试使用window.postMessage
            try {
                window.postMessage('JEV_USER_REGISTERED', '*');
            } catch (e) {
                console.log('无法通知父页面');
            }
        }
    }
    
    /**
     * 记录注册尝试日志
     */
    logRegisterAttempt(formData, success, userId, token) {
        try {
            const timestamp = Date.now();
            const logData = {
                timestamp: timestamp,
                userInfo: {
                    username: formData.username,
                    email: formData.email
                },
                success: success,
                userId: userId,
                tokenCreated: !!token,
                browserInfo: navigator.userAgent
            };
            
            // 保存日志到localStorage（实际环境中应该由Worker处理）
            const logKey = `jev_register_log_${timestamp}`;
            localStorage.setItem(logKey, JSON.stringify(logData));
            
            console.log('注册日志已记录:', logKey);
        } catch (error) {
            console.error('记录日志失败:', error);
        }
    }
}

// 初始化注册模块
document.addEventListener('DOMContentLoaded', () => {
    const registerModule = new RegisterModule();
    
    // 暴露到window对象，方便外部调用
    window.registerModule = registerModule;
    
    // 提供给测试页面的方法
    window.registerModule.updateUserStatus = () => {
        // 刷新用户状态
        if (typeof window.refreshState === 'function') {
            window.refreshState();
        }
    };
    
    console.log('JEV注册模块已初始化');
});

// 关闭窗口函数（供父页面调用）
window.closeRegisterWindow = function() {
    if (window.parent && window.parent !== window) {
        // 如果是iframe，向父窗口发送关闭通知
        window.parent.postMessage('CLOSE_REGISTER_WINDOW', '*');
        console.log('向父窗口发送关闭通知');
    } else if (window.opener) {
        // 如果是新窗口
        window.close();
    }
};

// 模拟Worker响应函数（仅用于测试）
window.simulateRegisterResponse = function(success = true) {
    const registerModule = window.registerModule;
    if (registerModule) {
        const mockResponse = {
            success: success,
            userId: success ? 'U' + Date.now() : null,
            token: success ? 'mock-token-' + Math.random().toString(36).substring(2, 15) : null,
            message: success ? '注册成功' : '注册失败，邀请码无效'
        };
        registerModule.handleRegisterResponse(mockResponse);
    }
};