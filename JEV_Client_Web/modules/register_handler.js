/**
 * JEV系统注册接口处理模块
 * 功能：处理用户注册请求、验证数据、生成用户ID、存储用户信息
 */

class RegisterHandler {
    constructor() {
        // 有效邀请码列表（实际环境中应该从安全存储中读取）
        this.validInviteCodes = [
            'JEV2025',
            'ADMIN2025',
            'DEVELOPER',
            'TEST2025',
            'PREMIUM2025'
        ];
        
        // 日志目录
        this.logDir = '/jev_logs/register/';
        
        // 初始化KV存储引用
        this.initializeKV();
    }
    
    /**
     * 初始化KV存储
     */
    initializeKV() {
        // 在实际Worker环境中，这里会获取实际的KV命名空间
        // 此处使用模拟对象
        this.kvStore = {
            put: this.mockKVPut.bind(this),
            get: this.mockKVGet.bind(this)
        };
        
        console.log('KV存储初始化完成');
    }
    
    /**
     * 处理注册请求
     */
    async handleRegisterRequest(request) {
        try {
            // 1. 验证请求头中的Token
            const token = request.headers.get('X-Agent-Token');
            if (!this.validateToken(token)) {
                return this.createErrorResponse(403, '无效的访问令牌');
            }
            
            // 2. 解析请求体
            const body = await request.json();
            
            // 3. 验证请求数据
            const validationError = this.validateRequestData(body);
            if (validationError) {
                return this.createErrorResponse(400, validationError);
            }
            
            // 4. 验证邀请码
            if (!this.validateInviteCode(body.inviteCode)) {
                return this.createErrorResponse(403, '无效的邀请码');
            }
            
            // 5. 检查邮箱是否已注册
            const isEmailRegistered = await this.checkEmailRegistered(body.email);
            if (isEmailRegistered) {
                return this.createErrorResponse(409, '该邮箱已注册');
            }
            
            // 6. 生成用户ID
            const userId = this.generateUserId();
            
            // 7. 准备用户数据（不存储明文密码）
            const userData = {
                userId: userId,
                username: body.username,
                email: body.email,
                // 在实际环境中，这里应该存储密码哈希而不是明文
                passwordHash: this.hashPassword(body.password),
                inviteCode: body.inviteCode,
                createdAt: new Date().toISOString(),
                lastLogin: null,
                status: 'active',
                permissions: this.getPermissionsByInviteCode(body.inviteCode)
            };
            
            // 8. 生成访问令牌
            const token = this.generateToken(userId);
            
            // 9. 存储用户数据到KV
            await this.storeUserInKV(body.email, userData);
            
            // 10. 记录注册日志
            await this.logRegisterEvent(body, userId, true);
            
            // 11. 返回成功响应
            return this.createSuccessResponse({
                success: true,
                userId: userId,
                token: token,
                message: '注册成功'
            });
            
        } catch (error) {
            console.error('注册处理错误:', error);
            
            // 记录错误日志
            try {
                await this.logRegisterEvent({}, null, false, error.message);
            } catch (logError) {
                console.error('记录错误日志失败:', logError);
            }
            
            return this.createErrorResponse(500, '服务器内部错误');
        }
    }
    
    /**
     * 验证访问令牌
     */
    validateToken(token) {
        // 实际环境中应该使用更安全的验证方法
        return token === 'jev-secure-key-001';
    }
    
    /**
     * 验证请求数据
     */
    validateRequestData(data) {
        // 检查必要字段
        const requiredFields = ['username', 'email', 'password', 'inviteCode'];
        for (const field of requiredFields) {
            if (!data[field] || typeof data[field] !== 'string' || data[field].trim() === '') {
                return `缺少必要字段: ${field}`;
            }
        }
        
        // 验证用户名
        if (data.username.length < 3 || data.username.length > 50) {
            return '用户名长度必须在3-50个字符之间';
        }
        
        // 验证邮箱格式
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(data.email)) {
            return '无效的邮箱格式';
        }
        
        // 验证密码强度
        if (data.password.length < 6) {
            return '密码长度至少为6位';
        }
        
        return null; // 验证通过
    }
    
    /**
     * 验证邀请码
     */
    validateInviteCode(inviteCode) {
        // 转换为大写进行比较，忽略大小写
        const code = inviteCode.toUpperCase().trim();
        return this.validInviteCodes.includes(code);
    }
    
    /**
     * 检查邮箱是否已注册
     */
    async checkEmailRegistered(email) {
        try {
            const key = `JEV_USER_${email.toLowerCase()}`;
            const existingUser = await this.kvStore.get(key);
            return !!existingUser;
        } catch (error) {
            console.error('检查邮箱注册状态失败:', error);
            return false;
        }
    }
    
    /**
     * 生成用户ID
     */
    generateUserId() {
        // 格式：U + 时间戳
        return 'U' + Date.now();
    }
    
    /**
     * 哈希密码（简单演示，实际环境应使用安全的哈希算法）
     */
    hashPassword(password) {
        // 实际环境中应该使用bcrypt等安全的哈希算法
        // 这里仅作演示，不是真正的安全实现
        return 'hash_' + password.split('').reverse().join('') + '_' + Date.now();
    }
    
    /**
     * 根据邀请码获取权限
     */
    getPermissionsByInviteCode(inviteCode) {
        const code = inviteCode.toUpperCase().trim();
        
        switch (code) {
            case 'ADMIN2025':
                return ['admin', 'user', 'developer'];
            case 'DEVELOPER':
                return ['developer', 'user'];
            default:
                return ['user'];
        }
    }
    
    /**
     * 生成访问令牌
     */
    generateToken(userId) {
        // 实际环境中应该使用JWT或其他安全的令牌生成方法
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 15);
        return `jev_token_${userId}_${timestamp}_${random}`;
    }
    
    /**
     * 存储用户数据到KV
     */
    async storeUserInKV(email, userData) {
        const key = `JEV_USER_${email.toLowerCase()}`;
        await this.kvStore.put(key, JSON.stringify(userData));
        console.log(`用户数据已存储，键: ${key}`);
    }
    
    /**
     * 记录注册事件
     */
    async logRegisterEvent(userData, userId, success, errorMessage = null) {
        const timestamp = Date.now();
        const logEntry = {
            timestamp: timestamp,
            userInfo: {
                username: userData.username || 'unknown',
                email: userData.email || 'unknown'
            },
            userId: userId,
            success: success,
            error: errorMessage,
            userAgent: userData.userAgent || 'unknown',
            timestampHuman: new Date().toLocaleString()
        };
        
        // 在实际环境中，这里会将日志写入到指定目录
        // 此处模拟日志记录
        console.log('注册日志:', logEntry);
        
        // 同时保存到localStorage（仅用于演示）
        try {
            const logKey = `register_log_${timestamp}`;
            localStorage.setItem(logKey, JSON.stringify(logEntry));
        } catch (e) {
            console.error('无法保存日志到localStorage:', e);
        }
    }
    
    /**
     * 创建成功响应
     */
    createSuccessResponse(data) {
        return new Response(JSON.stringify(data), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'X-JEV-Status': 'success'
            }
        });
    }
    
    /**
     * 创建错误响应
     */
    createErrorResponse(status, message) {
        return new Response(JSON.stringify({
            success: false,
            error: message,
            status: status
        }), {
            status: status,
            headers: {
                'Content-Type': 'application/json',
                'X-JEV-Status': 'error'
            }
        });
    }
    
    /**
     * 模拟KV的put操作
     */
    mockKVPut(key, value) {
        return new Promise((resolve) => {
            // 模拟异步操作
            setTimeout(() => {
                console.log(`[模拟KV] 存储: ${key}`);
                try {
                    // 使用localStorage作为模拟存储
                    localStorage.setItem(`MOCK_KV_${key}`, value);
                } catch (e) {
                    console.error('模拟KV存储失败:', e);
                }
                resolve();
            }, 100);
        });
    }
    
    /**
     * 模拟KV的get操作
     */
    mockKVGet(key) {
        return new Promise((resolve) => {
            // 模拟异步操作
            setTimeout(() => {
                console.log(`[模拟KV] 获取: ${key}`);
                try {
                    // 从localStorage获取模拟数据
                    const value = localStorage.getItem(`MOCK_KV_${key}`);
                    resolve(value);
                } catch (e) {
                    console.error('模拟KV读取失败:', e);
                    resolve(null);
                }
            }, 100);
        });
    }
}

// 导出RegisterHandler类
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = RegisterHandler;
}

// 为Worker环境提供请求处理函数
self.addEventListener('fetch', (event) => {
    if (event.request.url.endsWith('/register') && event.request.method === 'POST') {
        const handler = new RegisterHandler();
        event.respondWith(handler.handleRegisterRequest(event.request));
    }
});

// 提供测试接口
if (typeof window !== 'undefined') {
    window.RegisterHandler = RegisterHandler;
    window.testRegister = async (formData) => {
        const handler = new RegisterHandler();
        // 创建模拟请求
        const mockRequest = {
            headers: {
                get: () => 'jev-secure-key-001'
            },
            json: async () => formData
        };
        
        const result = await handler.handleRegisterRequest(mockRequest);
        return result;
    };
}