const fs = require('fs');
const path = require('path');
const { getDeepSeekSecurityExecutor } = require('./deepseekSecurityExecutor');

/**
 * DeepSeek故障保护与自动锁定机制
 * 实现连续失败次数跟踪、自动锁定和安全解锁功能
 */
class DeepSeekFaultProtection {
    constructor(options = {}) {
        // 获取安全执行器实例
        this.securityExecutor = getDeepSeekSecurityExecutor();
        
        // 配置
        this.config = {
            // 连续失败阈值
            maxConsecutiveFailures: 3,
            // 锁定状态存储路径
            lockStatePath: path.resolve('C:\\JEV\\lock_state.json'),
            // 锁定时长（毫秒），0表示需要手动解锁
            lockDurationMs: 0,
            // 锁定状态命名空间
            lockNamespace: 'security_deepseek',
            // 锁定状态键名
            lockKeyName: 'auto_locked',
            // 最大恢复尝试次数
            maxRecoveryAttempts: 3,
            // 是否允许自动恢复
            allowAutoRecovery: false,
            // 恢复冷却时间（毫秒）
            recoveryCooldownMs: 60000,
            ...options
        };
        
        // 故障状态跟踪
        this.failureState = {
            consecutiveFailures: 0,
            lastFailureTime: null,
            failureHistory: [],
            autoLocked: false,
            lockTime: null,
            lockReason: null,
            recoveryAttempts: 0,
            lastRecoveryTime: null
        };
        
        // 初始化
        this._initialize();
        
        console.log('[DeepSeekFaultProtection] 故障保护与自动锁定机制初始化完成');
    }
    
    /**
     * 记录失败
     */
    recordFailure(error, context = {}) {
        // 检查是否已锁定
        if (this.isLocked()) {
            console.warn('[DeepSeekFaultProtection] 系统已锁定，忽略新的失败记录');
            return false;
        }
        
        // 记录失败信息
        const failureInfo = {
            timestamp: Date.now(),
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : null,
            context: context
        };
        
        // 更新失败状态
        this.failureState.consecutiveFailures++;
        this.failureState.lastFailureTime = failureInfo.timestamp;
        this.failureState.failureHistory.push(failureInfo);
        
        // 限制历史记录长度
        if (this.failureState.failureHistory.length > 100) {
            this.failureState.failureHistory.shift();
        }
        
        console.warn(`[DeepSeekFaultProtection] 记录失败 (${this.failureState.consecutiveFailures}/${this.config.maxConsecutiveFailures}): ${failureInfo.error}`);
        
        // 检查是否需要锁定
        if (this.failureState.consecutiveFailures >= this.config.maxConsecutiveFailures) {
            return this._triggerAutoLock(failureInfo);
        }
        
        // 保存状态
        this._persistLockState();
        
        return true;
    }
    
    /**
     * 记录成功
     */
    recordSuccess(context = {}) {
        // 重置连续失败计数
        this.failureState.consecutiveFailures = 0;
        
        console.log(`[DeepSeekFaultProtection] 记录成功，重置失败计数`);
        
        // 保存状态
        this._persistLockState();
        
        return true;
    }
    
    /**
     * 检查是否已锁定
     */
    isLocked() {
        // 检查内存中的锁定状态
        if (this.failureState.autoLocked) {
            // 如果有锁定时长限制，检查是否已过期
            if (this.config.lockDurationMs > 0 && this.failureState.lockTime) {
                const lockAge = Date.now() - this.failureState.lockTime;
                if (lockAge > this.config.lockDurationMs) {
                    console.log(`[DeepSeekFaultProtection] 锁定已过期，自动解锁`);
                    this._unlockInternal('自动过期解锁');
                    return false;
                }
            }
            return true;
        }
        
        return false;
    }
    
    /**
     * 尝试手动解锁
     */
    tryUnlock(adminToken, reason = '手动解锁') {
        // 验证管理员令牌
        if (!this._validateAdminToken(adminToken)) {
            console.warn('[DeepSeekFaultProtection] 无效的管理员令牌，解锁失败');
            return {
                success: false,
                error: '无效的管理员令牌'
            };
        }
        
        // 执行解锁
        const result = this._unlockInternal(reason);
        
        console.log(`[DeepSeekFaultProtection] 管理员手动解锁: ${reason}`);
        
        return result;
    }
    
    /**
     * 尝试自动恢复
     */
    tryAutoRecovery(context = {}) {
        // 检查是否允许自动恢复
        if (!this.config.allowAutoRecovery) {
            console.log('[DeepSeekFaultProtection] 自动恢复功能未启用');
            return {
                success: false,
                error: '自动恢复功能未启用'
            };
        }
        
        // 检查是否已锁定
        if (!this.isLocked()) {
            console.log('[DeepSeekFaultProtection] 系统未锁定，无需恢复');
            return {
                success: true,
                message: '系统未锁定，无需恢复'
            };
        }
        
        // 检查恢复冷却时间
        if (this.failureState.lastRecoveryTime) {
            const timeSinceLastRecovery = Date.now() - this.failureState.lastRecoveryTime;
            if (timeSinceLastRecovery < this.config.recoveryCooldownMs) {
                const remainingCooldown = Math.ceil((this.config.recoveryCooldownMs - timeSinceLastRecovery) / 1000);
                console.log(`[DeepSeekFaultProtection] 恢复冷却中，还需等待 ${remainingCooldown} 秒`);
                return {
                    success: false,
                    error: `恢复冷却中，还需等待 ${remainingCooldown} 秒`,
                    remainingCooldown: remainingCooldown
                };
            }
        }
        
        // 检查恢复尝试次数
        if (this.failureState.recoveryAttempts >= this.config.maxRecoveryAttempts) {
            console.warn(`[DeepSeekFaultProtection] 恢复尝试次数已达上限 (${this.config.maxRecoveryAttempts}次)`);
            return {
                success: false,
                error: `恢复尝试次数已达上限 (${this.config.maxRecoveryAttempts}次)`,
                needsManualIntervention: true
            };
        }
        
        // 增加恢复尝试次数
        this.failureState.recoveryAttempts++;
        this.failureState.lastRecoveryTime = Date.now();
        
        console.log(`[DeepSeekFaultProtection] 开始自动恢复尝试 (${this.failureState.recoveryAttempts}/${this.config.maxRecoveryAttempts})`);
        
        // 执行恢复操作
        try {
            // 执行清理和重置操作
            this._performRecoveryActions(context);
            
            // 解锁系统
            const result = this._unlockInternal('自动恢复解锁');
            
            if (result.success) {
                console.log(`[DeepSeekFaultProtection] 自动恢复成功`);
            } else {
                console.error(`[DeepSeekFaultProtection] 自动恢复失败: ${result.error}`);
            }
            
            return result;
        } catch (error) {
            console.error(`[DeepSeekFaultProtection] 自动恢复过程出错: ${error.message}`);
            return {
                success: false,
                error: `恢复过程出错: ${error.message}`,
                errorDetails: error
            };
        }
    }
    
    /**
     * 获取锁定状态信息
     */
    getLockStatus() {
        const isCurrentlyLocked = this.isLocked();
        const lockInfo = {
            locked: isCurrentlyLocked,
            consecutiveFailures: this.failureState.consecutiveFailures,
            maxConsecutiveFailures: this.config.maxConsecutiveFailures,
            failureHistory: this.failureState.failureHistory.slice(-5), // 返回最近5次失败
            lockReason: this.failureState.lockReason,
            lockTime: this.failureState.lockTime ? new Date(this.failureState.lockTime).toISOString() : null,
            lockDurationMs: this.config.lockDurationMs,
            recoveryAttempts: this.failureState.recoveryAttempts,
            maxRecoveryAttempts: this.config.maxRecoveryAttempts,
            allowAutoRecovery: this.config.allowAutoRecovery
        };
        
        // 如果已锁定且有锁定时长，计算剩余锁定时间
        if (isCurrentlyLocked && this.config.lockDurationMs > 0 && this.failureState.lockTime) {
            const lockAge = Date.now() - this.failureState.lockTime;
            const remainingLockTimeMs = Math.max(0, this.config.lockDurationMs - lockAge);
            lockInfo.remainingLockTimeMs = remainingLockTimeMs;
            lockInfo.remainingLockTimeSeconds = Math.ceil(remainingLockTimeMs / 1000);
        }
        
        // 如果有恢复冷却，计算剩余冷却时间
        if (this.failureState.lastRecoveryTime) {
            const timeSinceLastRecovery = Date.now() - this.failureState.lastRecoveryTime;
            if (timeSinceLastRecovery < this.config.recoveryCooldownMs) {
                lockInfo.recoveryCooldownRemainingMs = this.config.recoveryCooldownMs - timeSinceLastRecovery;
                lockInfo.recoveryCooldownRemainingSeconds = Math.ceil((this.config.recoveryCooldownMs - timeSinceLastRecovery) / 1000);
            }
        }
        
        return lockInfo;
    }
    
    /**
     * 强制锁定系统
     */
    forceLock(reason = '强制锁定', adminToken = null) {
        // 如果提供了令牌，验证它
        if (adminToken && !this._validateAdminToken(adminToken)) {
            console.warn('[DeepSeekFaultProtection] 无效的管理员令牌，强制锁定失败');
            return {
                success: false,
                error: '无效的管理员令牌'
            };
        }
        
        // 触发锁定
        const lockInfo = {
            error: '强制锁定',
            timestamp: Date.now()
        };
        
        const result = this._triggerAutoLock(lockInfo, reason);
        
        console.warn(`[DeepSeekFaultProtection] 系统已被强制锁定: ${reason}`);
        
        return result;
    }
    
    /**
     * 重置失败计数
     */
    resetFailureCount() {
        if (this.isLocked()) {
            console.warn('[DeepSeekFaultProtection] 系统已锁定，无法重置失败计数');
            return false;
        }
        
        this.failureState.consecutiveFailures = 0;
        this.failureState.recoveryAttempts = 0;
        
        console.log('[DeepSeekFaultProtection] 失败计数已重置');
        
        // 保存状态
        this._persistLockState();
        
        return true;
    }
    
    /**
     * 获取系统健康状态
     */
    getHealthStatus() {
        const lockStatus = this.getLockStatus();
        const healthStatus = {
            status: lockStatus.locked ? 'LOCKED' : 'HEALTHY',
            lockInfo: lockStatus,
            failureRate: this._calculateFailureRate(),
            lastActivityTime: this._getLastActivityTime(),
            systemReady: !lockStatus.locked
        };
        
        return healthStatus;
    }
    
    /**
     * 私有方法：初始化
     */
    _initialize() {
        // 加载持久化的锁定状态
        this._loadLockState();
        
        // 检查是否有暂停标志文件
        this._checkPauseFlag();
        
        // 设置定期健康检查
        this._setupHealthCheck();
    }
    
    /**
     * 私有方法：触发自动锁定
     */
    _triggerAutoLock(failureInfo, reason = null) {
        // 设置锁定状态
        this.failureState.autoLocked = true;
        this.failureState.lockTime = Date.now();
        this.failureState.lockReason = reason || `连续失败 ${this.failureState.consecutiveFailures} 次: ${failureInfo.error}`;
        
        console.error(`[DeepSeekFaultProtection] 🔒 系统已自动锁定!`);
        console.error(`[DeepSeekFaultProtection] 锁定原因: ${this.failureState.lockReason}`);
        console.error(`[DeepSeekFaultProtection] 最后失败: ${failureInfo.error}`);
        
        // 持久化锁定状态
        this._persistLockState();
        
        // 尝试记录到externalMemory
        try {
            this._recordLockToExternalMemory();
        } catch (error) {
            console.error(`[DeepSeekFaultProtection] 记录锁定状态到externalMemory失败: ${error.message}`);
        }
        
        // 创建暂停标志文件
        this._createPauseFlag();
        
        return {
            success: true,
            locked: true,
            reason: this.failureState.lockReason,
            lockTime: this.failureState.lockTime
        };
    }
    
    /**
     * 私有方法：内部解锁
     */
    _unlockInternal(reason = '系统解锁') {
        try {
            // 重置锁定状态
            this.failureState.autoLocked = false;
            this.failureState.lockTime = null;
            this.failureState.lockReason = null;
            this.failureState.consecutiveFailures = 0;
            
            console.log(`[DeepSeekFaultProtection] 🔓 系统已解锁: ${reason}`);
            
            // 持久化状态
            this._persistLockState();
            
            // 删除暂停标志文件
            this._removePauseFlag();
            
            return {
                success: true,
                message: '系统已成功解锁'
            };
        } catch (error) {
            console.error(`[DeepSeekFaultProtection] 解锁过程出错: ${error.message}`);
            return {
                success: false,
                error: `解锁失败: ${error.message}`
            };
        }
    }
    
    /**
     * 私有方法：验证管理员令牌
     */
    _validateAdminToken(token) {
        // 在实际应用中，这里应该与安全策略系统集成验证令牌
        // 这里使用简化的验证逻辑
        return token && typeof token === 'string' && token.length > 10;
    }
    
    /**
     * 私有方法：执行恢复操作
     */
    _performRecoveryActions(context = {}) {
        console.log('[DeepSeekFaultProtection] 执行恢复操作...');
        
        // 这里可以添加清理资源、重置状态等恢复操作
        // 例如：关闭未完成的任务、清理临时文件等
        
        // 重置失败历史（可选）
        if (context.resetHistory) {
            this.failureState.failureHistory = [];
            console.log('[DeepSeekFaultProtection] 已重置失败历史');
        }
    }
    
    /**
     * 私有方法：持久化锁定状态
     */
    _persistLockState() {
        try {
            const lockDir = path.dirname(this.config.lockStatePath);
            
            // 确保目录存在
            if (!fs.existsSync(lockDir)) {
                fs.mkdirSync(lockDir, { recursive: true });
            }
            
            // 写入锁定状态
            const stateData = {
                ...this.failureState,
                lastUpdated: Date.now()
            };
            
            fs.writeFileSync(this.config.lockStatePath, JSON.stringify(stateData, null, 2));
            console.log(`[DeepSeekFaultProtection] 锁定状态已持久化到 ${this.config.lockStatePath}`);
        } catch (error) {
            console.error(`[DeepSeekFaultProtection] 持久化锁定状态失败: ${error.message}`);
        }
    }
    
    /**
     * 私有方法：加载锁定状态
     */
    _loadLockState() {
        try {
            if (fs.existsSync(this.config.lockStatePath)) {
                const stateData = JSON.parse(fs.readFileSync(this.config.lockStatePath, 'utf8'));
                
                // 恢复失败状态
                this.failureState.consecutiveFailures = stateData.consecutiveFailures || 0;
                this.failureState.lastFailureTime = stateData.lastFailureTime || null;
                this.failureState.failureHistory = stateData.failureHistory || [];
                this.failureState.autoLocked = stateData.autoLocked || false;
                this.failureState.lockTime = stateData.lockTime || null;
                this.failureState.lockReason = stateData.lockReason || null;
                this.failureState.recoveryAttempts = stateData.recoveryAttempts || 0;
                this.failureState.lastRecoveryTime = stateData.lastRecoveryTime || null;
                
                console.log(`[DeepSeekFaultProtection] 已从 ${this.config.lockStatePath} 加载锁定状态`);
                
                // 验证锁定状态是否仍然有效
                if (this.isLocked()) {
                    console.warn(`[DeepSeekFaultProtection] 检测到持久化的锁定状态`);
                }
            }
        } catch (error) {
            console.error(`[DeepSeekFaultProtection] 加载锁定状态失败: ${error.message}`);
            // 继续使用默认状态
        }
    }
    
    /**
     * 私有方法：记录锁定到externalMemory
     */
    _recordLockToExternalMemory() {
        // 这里模拟与externalMemory的交互
        // 在实际应用中，应该使用真实的externalMemory API
        console.log(`[DeepSeekFaultProtection] 记录锁定状态到命名空间: ${this.config.lockNamespace}/${this.config.lockKeyName}`);
    }
    
    /**
     * 私有方法：创建暂停标志文件
     */
    _createPauseFlag() {
        try {
            const pauseFlagPath = 'C:\\JEV\\PAUSE.flag';
            const pauseFlagDir = path.dirname(pauseFlagPath);
            
            // 确保目录存在
            if (!fs.existsSync(pauseFlagDir)) {
                fs.mkdirSync(pauseFlagDir, { recursive: true });
            }
            
            // 写入暂停标志内容
            const flagContent = {
                locked: true,
                lockTime: new Date().toISOString(),
                lockReason: this.failureState.lockReason,
                failureCount: this.failureState.consecutiveFailures
            };
            
            fs.writeFileSync(pauseFlagPath, JSON.stringify(flagContent, null, 2));
            console.log(`[DeepSeekFaultProtection] 已创建暂停标志文件: ${pauseFlagPath}`);
        } catch (error) {
            console.error(`[DeepSeekFaultProtection] 创建暂停标志文件失败: ${error.message}`);
        }
    }
    
    /**
     * 私有方法：删除暂停标志文件
     */
    _removePauseFlag() {
        try {
            const pauseFlagPath = 'C:\\JEV\\PAUSE.flag';
            
            if (fs.existsSync(pauseFlagPath)) {
                fs.unlinkSync(pauseFlagPath);
                console.log(`[DeepSeekFaultProtection] 已删除暂停标志文件`);
            }
        } catch (error) {
            console.error(`[DeepSeekFaultProtection] 删除暂停标志文件失败: ${error.message}`);
        }
    }
    
    /**
     * 私有方法：检查暂停标志文件
     */
    _checkPauseFlag() {
        try {
            const pauseFlagPath = 'C:\\JEV\\PAUSE.flag';
            
            if (fs.existsSync(pauseFlagPath)) {
                console.warn(`[DeepSeekFaultProtection] 检测到暂停标志文件，系统将保持锁定状态`);
                
                try {
                    const flagContent = JSON.parse(fs.readFileSync(pauseFlagPath, 'utf8'));
                    this.failureState.autoLocked = true;
                    this.failureState.lockReason = flagContent.lockReason || '检测到暂停标志文件';
                    this.failureState.lockTime = Date.now();
                } catch (parseError) {
                    console.error(`[DeepSeekFaultProtection] 解析暂停标志文件失败: ${parseError.message}`);
                }
            }
        } catch (error) {
            console.error(`[DeepSeekFaultProtection] 检查暂停标志文件失败: ${error.message}`);
        }
    }
    
    /**
     * 私有方法：设置健康检查
     */
    _setupHealthCheck() {
        // 每60秒执行一次健康检查
        setInterval(() => {
            this._checkHealth();
        }, 60000);
    }
    
    /**
     * 私有方法：健康检查
     */
    _checkHealth() {
        // 重新检查暂停标志文件
        this._checkPauseFlag();
        
        // 检查锁定状态是否过期
        if (this.isLocked()) {
            console.log('[DeepSeekFaultProtection] 健康检查: 系统当前处于锁定状态');
        }
    }
    
    /**
     * 私有方法：计算失败率
     */
    _calculateFailureRate() {
        // 简化的失败率计算
        const totalEvents = this.failureState.failureHistory.length;
        return totalEvents > 0 ? this.failureState.consecutiveFailures / totalEvents : 0;
    }
    
    /**
     * 私有方法：获取最后活动时间
     */
    _getLastActivityTime() {
        const lastEventTime = this.failureState.lastFailureTime || Date.now();
        return new Date(lastEventTime).toISOString();
    }
}

// 创建单例实例
let faultProtectionInstance = null;

function getDeepSeekFaultProtection(options = {}) {
    if (!faultProtectionInstance) {
        faultProtectionInstance = new DeepSeekFaultProtection(options);
    }
    return faultProtectionInstance;
}

// 导出模块
module.exports = {
    DeepSeekFaultProtection,
    getDeepSeekFaultProtection
};

// 导出到全局（浏览器环境）
if (typeof window !== 'undefined') {
    window.JEV = window.JEV || {};
    window.JEV.deepseekFaultProtection = {
        DeepSeekFaultProtection,
        getDeepSeekFaultProtection
    };
}