const fs = require('fs');
const path = require('path');

/**
 * DeepSeek安全执行器核心模块
 * 实现JEV安全模式下调用DeepSeek的安全控制
 */
class DeepSeekSecurityExecutor {
    constructor(options = {}) {
        this.config = {
            pauseFlagPath: 'C:\\JEV\\PAUSE.flag',
            maxRuntimeMinutes: 30,
            autoLockAfterFailures: 3,
            restrictedPaths: ['/system', '/secure', '/private'],
            ...options
        };
        
        // 内部状态
        this.state = {
            paused: false,
            autoLocked: false,
            failureCount: 0,
            tokenWhitelist: options.tokenWhitelist || [],
            currentExecution: null
        };
        
        // 执行历史记录
        this.executionHistory = [];
        
        // 初始化安全检查
        this.initializeSecurity();
    }
    
    /**
     * 初始化安全状态
     */
    initializeSecurity() {
        // 检查暂停标志文件
        this.checkPauseFlag();
        
        console.log('[DeepSeekSecurity] 安全执行器初始化完成');
        console.log(`[DeepSeekSecurity] 配置: paused=${this.state.paused}, autoLocked=${this.state.autoLocked}`);
    }
    
    /**
     * 检查系统暂停状态
     */
    checkPauseFlag() {
        try {
            // 检查本地暂停标志文件
            if (fs.existsSync(this.config.pauseFlagPath)) {
                this.state.paused = true;
                console.log(`[DeepSeekSecurity] 检测到暂停标志文件: ${this.config.pauseFlagPath}`);
            }
        } catch (error) {
            console.error(`[DeepSeekSecurity] 检查暂停标志时出错: ${error.message}`);
        }
    }
    
    /**
     * 获取安全状态
     */
    status() {
        // 重新检查暂停状态
        this.checkPauseFlag();
        
        return {
            paused: this.state.paused,
            autoLocked: this.state.autoLocked,
            failureCount: this.state.failureCount,
            whitelistSize: this.state.tokenWhitelist.length,
            restrictedPaths: this.config.restrictedPaths,
            maxRuntimeMinutes: this.config.maxRuntimeMinutes
        };
    }
    
    /**
     * 设置token白名单
     */
    setTokenWhitelist(whitelist) {
        if (Array.isArray(whitelist)) {
            this.state.tokenWhitelist = whitelist;
            console.log(`[DeepSeekSecurity] 更新token白名单，当前有 ${whitelist.length} 个授权令牌`);
            return true;
        }
        return false;
    }
    
    /**
     * 验证执行器令牌
     */
    isAuthorized(executorId) {
        // 如果白名单为空，则默认为拒绝所有
        if (this.state.tokenWhitelist.length === 0) {
            console.warn(`[DeepSeekSecurity] Token白名单为空，拒绝所有执行请求`);
            return false;
        }
        
        const isAuthorized = this.state.tokenWhitelist.includes(executorId);
        if (!isAuthorized) {
            console.warn(`[DeepSeekSecurity] 未授权的执行器: ${executorId}`);
        }
        return isAuthorized;
    }
    
    /**
     * 设置系统暂停状态
     */
    setPaused(paused) {
        this.state.paused = !!paused;
        
        if (paused) {
            // 创建暂停标志文件
            try {
                const flagDir = path.dirname(this.config.pauseFlagPath);
                if (!fs.existsSync(flagDir)) {
                    fs.mkdirSync(flagDir, { recursive: true });
                }
                fs.writeFileSync(this.config.pauseFlagPath, new Date().toISOString());
                console.log(`[DeepSeekSecurity] 系统已暂停，创建标志文件: ${this.config.pauseFlagPath}`);
            } catch (error) {
                console.error(`[DeepSeekSecurity] 创建暂停标志文件失败: ${error.message}`);
            }
        } else {
            // 删除暂停标志文件
            try {
                if (fs.existsSync(this.config.pauseFlagPath)) {
                    fs.unlinkSync(this.config.pauseFlagPath);
                    console.log(`[DeepSeekSecurity] 系统已恢复，删除标志文件: ${this.config.pauseFlagPath}`);
                }
            } catch (error) {
                console.error(`[DeepSeekSecurity] 删除暂停标志文件失败: ${error.message}`);
            }
        }
        
        return this.state.paused;
    }
    
    /**
     * 设置自动锁定状态
     */
    setAutoLocked(locked) {
        this.state.autoLocked = !!locked;
        if (locked) {
            console.warn(`[DeepSeekSecurity] 系统已自动锁定，需要安全管理员恢复`);
        } else {
            console.log(`[DeepSeekSecurity] 系统锁定已解除`);
            // 重置失败计数
            this.state.failureCount = 0;
        }
        return this.state.autoLocked;
    }
    
    /**
     * 增加失败计数并检查是否需要锁定
     */
    recordFailure(error) {
        this.state.failureCount++;
        console.error(`[DeepSeekSecurity] 执行失败 (${this.state.failureCount}/${this.config.autoLockAfterFailures}): ${error.message}`);
        
        // 检查是否达到自动锁定阈值
        if (this.state.failureCount >= this.config.autoLockAfterFailures) {
            this.setAutoLocked(true);
            return true; // 已锁定
        }
        
        return false; // 未锁定
    }
    
    /**
     * 重置失败计数
     */
    resetFailureCount() {
        this.state.failureCount = 0;
        console.log(`[DeepSeekSecurity] 失败计数已重置`);
    }
    
    /**
     * 验证路径是否安全
     */
    isPathSafe(filePath) {
        const normalizedPath = path.normalize(filePath).toLowerCase();
        
        // 检查是否包含受限路径
        for (const restrictedPath of this.config.restrictedPaths) {
            if (normalizedPath.includes(restrictedPath.toLowerCase())) {
                console.warn(`[DeepSeekSecurity] 检测到访问受限路径: ${filePath}`);
                return false;
            }
        }
        
        return true;
    }
    
    /**
     * 获取标准化输出格式
     */
    getStandardOutput(options = {}) {
        return {
            executor: "DeepSeek",
            paused: this.state.paused,
            authorized: options.authorized !== undefined ? options.authorized : false,
            dry_run: options.dryRun !== undefined ? options.dryRun : true,
            plan: options.plan || "",
            status: options.status || "Awaiting Confirmation",
            timestamp: new Date().toISOString()
        };
    }
}

// 创建单例实例
let securityExecutorInstance = null;

function getDeepSeekSecurityExecutor(options = {}) {
    if (!securityExecutorInstance) {
        securityExecutorInstance = new DeepSeekSecurityExecutor(options);
    }
    return securityExecutorInstance;
}

// 导出模块
module.exports = {
    DeepSeekSecurityExecutor,
    getDeepSeekSecurityExecutor,
    // 便捷访问方法
    securityPolicy: getDeepSeekSecurityExecutor()
};

// 导出到全局（浏览器环境）
if (typeof window !== 'undefined') {
    window.JEV = window.JEV || {};
    window.JEV.deepseekSecurity = {
        DeepSeekSecurityExecutor,
        getDeepSeekSecurityExecutor,
        securityPolicy: securityExecutorInstance
    };
}