/**
 * JEV Client v7.0 - 邀请码生成与验证逻辑
 */

class InviteCodeManager {
    constructor() {
        this.prefix = 'JEV';
        this.baseUrl = 'https://jevshop.bensonlove1986.workers.dev';
        this.debug = true;
    }
    
    /**
     * 生成格式化邀请码
     * @returns {string} 格式为 JEV-XXXXX-YYYY 的邀请码
     */
    generateInviteCode() {
        // 生成6位随机字符
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let randomStr = '';
        for (let i = 0; i < 6; i++) {
            randomStr += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        
        // 获取当前年份 + 4（有效期4年）
        const expiryYear = new Date().getFullYear() + 4;
        
        // 格式化邀请码
        const inviteCode = `${this.prefix}-${randomStr}-${expiryYear}`;
        
        if (this.debug) {
            console.log(`[InviteCode] 生成邀请码: ${inviteCode}`);
        }
        
        return inviteCode;
    }
    
    /**
     * 校验邀请码有效期与签名
     * @param {string} inviteCode - 邀请码
     * @returns {Promise<boolean>} 是否有效
     */
    async verifyInviteCode(inviteCode) {
        // 模拟异步验证过程
        return new Promise((resolve) => {
            setTimeout(() => {
                try {
                    // 验证格式
                    const isValidFormat = this.validateInviteCodeFormat(inviteCode);
                    if (!isValidFormat) {
                        console.warn('[InviteCode] 格式无效:', inviteCode);
                        resolve(false);
                        return;
                    }
                    
                    // 验证有效期
                    const isNotExpired = this.checkExpiry(inviteCode);
                    if (!isNotExpired) {
                        console.warn('[InviteCode] 已过期:', inviteCode);
                        resolve(false);
                        return;
                    }
                    
                    // 演示模式：所有格式正确的邀请码都视为有效
                    console.log('[InviteCode] 验证通过:', inviteCode);
                    resolve(true);
                    
                } catch (error) {
                    console.error('[InviteCode] 验证异常:', error);
                    resolve(false);
                }
            }, 800); // 模拟网络延迟
        });
    }
    
    /**
     * 验证邀请码格式
     * @param {string} inviteCode - 邀请码
     * @returns {boolean} 格式是否正确
     */
    validateInviteCodeFormat(inviteCode) {
        // 检查是否为字符串
        if (typeof inviteCode !== 'string') {
            return false;
        }
        
        // 严格模式：检查是否符合 JEV-XXXXX-YYYY 格式
        // 宽松模式：允许任何包含 '-' 的邀请码格式进行测试
        
        // 演示模式使用宽松验证
        if (this.debug) {
            return inviteCode.includes('-');
        }
        
        // 生产模式使用严格正则
        const strictPattern = /^JEV-[A-Z0-9]{6}-\d{4}$/;
        return strictPattern.test(inviteCode);
    }
    
    /**
     * 检查邀请码是否过期
     * @param {string} inviteCode - 邀请码
     * @returns {boolean} 是否未过期
     */
    checkExpiry(inviteCode) {
        try {
            // 从邀请码中提取年份部分
            const parts = inviteCode.split('-');
            if (parts.length < 3) {
                // 演示模式下，格式不正确的也视为有效
                return this.debug;
            }
            
            const expiryYear = parseInt(parts[2]);
            const currentYear = new Date().getFullYear();
            
            return expiryYear >= currentYear;
        } catch (error) {
            // 解析错误时，演示模式返回true
            return this.debug;
        }
    }
    
    /**
     * 生成验证链接
     * @param {string} inviteCode - 邀请码
     * @returns {string} 验证链接
     */
    generateVerificationLink(inviteCode) {
        return `${this.baseUrl}/invite?code=${encodeURIComponent(inviteCode)}`;
    }
    
    /**
     * 批量生成邀请码
     * @param {number} count - 生成数量
     * @returns {Array<string>} 邀请码数组
     */
    generateBatchInviteCodes(count) {
        const codes = [];
        for (let i = 0; i < count; i++) {
            codes.push(this.generateInviteCode());
        }
        return codes;
    }
    
    /**
     * 验证邀请码并获取详细信息
     * @param {string} inviteCode - 邀请码
     * @returns {Promise<Object>} 验证结果对象
     */
    async verifyInviteCodeWithDetails(inviteCode) {
        const isValid = await this.verifyInviteCode(inviteCode);
        
        return {
            code: inviteCode,
            valid: isValid,
            formatValid: this.validateInviteCodeFormat(inviteCode),
            expired: !this.checkExpiry(inviteCode),
            verificationLink: this.generateVerificationLink(inviteCode),
            timestamp: new Date().toISOString()
        };
    }
}

// 创建单例实例
const inviteCodeManager = new InviteCodeManager();

// 暴露全局方法
window.InviteCodeManager = InviteCodeManager;
window.inviteCodeManager = inviteCodeManager;

// 简化的全局函数
window.generateInviteCode = () => inviteCodeManager.generateInviteCode();
window.verifyInviteCode = (code) => inviteCodeManager.verifyInviteCode(code);
window.generateVerificationLink = (code) => inviteCodeManager.generateVerificationLink(code);

// 模块导出支持
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { InviteCodeManager, inviteCodeManager };
} else if (typeof define === 'function' && define.amd) {
    define([], () => ({ InviteCodeManager, inviteCodeManager }));
}

console.log('[InviteCodeManager] 模块已加载');