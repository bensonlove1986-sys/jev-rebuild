/**
 * SOP安全策略核心模块
 * 实现安全策略验证、白名单检查、路径限制和执行控制
 */

class SOPSecurityPolicy {
  constructor(options = {}) {
    this.policy = {
      paused: false,
      tokenWhitelist: new Set(options.tokenWhitelist || []),
      allowedActions: new Set(options.allowedActions || ['READ', 'LIST']),
      restrictedPaths: new Set(options.restrictedPaths || []),
      maxRuntimeMinutes: options.maxRuntimeMinutes || 30,
      autoLockAfterFailures: options.autoLockAfterFailures || 5
    };
    
    this.failures = 0;
    this.lastCheckTime = Date.now();
    this.externalMemory = options.externalMemory || null;
    this.isDryRun = false;
    this.logger = options.logger || console;
  }

  /**
   * 加载策略配置
   */
  loadPolicy(newPolicy) {
    if (typeof newPolicy === 'object' && newPolicy !== null) {
      this.policy = {
        ...this.policy,
        tokenWhitelist: newPolicy.tokenWhitelist ? new Set(newPolicy.tokenWhitelist) : this.policy.tokenWhitelist,
        allowedActions: newPolicy.allowedActions ? new Set(newPolicy.allowedActions) : this.policy.allowedActions,
        restrictedPaths: newPolicy.restrictedPaths ? new Set(newPolicy.restrictedPaths) : this.policy.restrictedPaths,
        paused: newPolicy.paused !== undefined ? newPolicy.paused : this.policy.paused,
        maxRuntimeMinutes: newPolicy.maxRuntimeMinutes || this.policy.maxRuntimeMinutes,
        autoLockAfterFailures: newPolicy.autoLockAfterFailures || this.policy.autoLockAfterFailures
      };
      this.logger.info('SOP策略已更新', { paused: this.policy.paused });
    }
    return this.policy;
  }

  /**
   * 设置暂停状态
   */
  setPaused(paused) {
    this.policy.paused = Boolean(paused);
    this.logger.info(`系统已${paused ? '暂停' : '恢复'}`, { paused: this.policy.paused });
    return this.policy.paused;
  }

  /**
   * 获取当前状态
   */
  getStatus() {
    return {
      paused: this.policy.paused,
      tokenWhitelist: Array.from(this.policy.tokenWhitelist),
      allowedActions: Array.from(this.policy.allowedActions),
      restrictedPaths: Array.from(this.policy.restrictedPaths),
      maxRuntimeMinutes: this.policy.maxRuntimeMinutes,
      failures: this.failures,
      autoLockAfterFailures: this.policy.autoLockAfterFailures
    };
  }

  /**
   * 校验token是否在白名单中
   */
  isTokenAllowed(token) {
    if (!token) return false;
    return this.policy.tokenWhitelist.has(token);
  }

  /**
   * 校验目标路径是否受限
   */
  isPathRestricted(path) {
    if (!path) return false;
    return Array.from(this.policy.restrictedPaths).some(restricted => {
      return path.startsWith(restricted);
    });
  }

  /**
   * 校验操作是否允许
   */
  isActionAllowed(action) {
    if (!action) return false;
    return this.policy.allowedActions.has(action.toUpperCase());
  }

  /**
   * 设置演练模式
   */
  setDryRun(enabled) {
    this.isDryRun = Boolean(enabled);
    this.logger.info(`演练模式已${enabled ? '启用' : '禁用'}`);
    return this.isDryRun;
  }

  /**
   * 校验运行时间
   */
  isRuntimeExceeded() {
    const runtimeMinutes = (Date.now() - this.lastCheckTime) / (1000 * 60);
    return runtimeMinutes > this.policy.maxRuntimeMinutes;
  }

  /**
   * 记录失败并检查是否需要自动锁定
   */
  recordFailure() {
    this.failures++;
    this.logger.warning(`安全检查失败，累计失败次数: ${this.failures}`);
    
    if (this.failures >= this.policy.autoLockAfterFailures) {
      this.policy.paused = true;
      this.logger.error(`连续失败超过阈值，系统已自动暂停`);
      return true; // 已自动锁定
    }
    return false;
  }

  /**
   * 重置失败计数
   */
  resetFailures() {
    this.failures = 0;
    this.logger.info('失败计数已重置');
  }

  /**
   * 主验证方法
   */
  validate(request) {
    const { token, action, path, args = {}, plan = '' } = request;
    const result = {
      allowed: false,
      reason: '',
      dryRun: this.isDryRun,
      queued: false
    };

    try {
      // 检查运行时间
      if (this.isRuntimeExceeded()) {
        result.reason = '超出最大运行时间';
        this.recordFailure();
        return result;
      }

      // 检查系统暂停状态
      if (this.policy.paused) {
        // 对于写类操作，入队而非执行
        if (['WRITE', 'DELETE', 'UPDATE'].some(a => action.toUpperCase().includes(a))) {
          result.reason = '系统暂停中，写操作已入队';
          result.queued = true;
        } else {
          result.reason = '系统暂停中，不允许操作';
        }
        return result;
      }

      // 检查token白名单
      if (!this.isTokenAllowed(token)) {
        result.reason = '无效的授权令牌';
        this.recordFailure();
        return result;
      }

      // 检查操作类型
      if (!this.isActionAllowed(action)) {
        result.reason = `操作类型 ${action} 不被允许`;
        this.recordFailure();
        return result;
      }

      // 检查路径限制
      if (path && this.isPathRestricted(path)) {
        result.reason = `路径 ${path} 被限制访问`;
        this.recordFailure();
        return result;
      }

      // 所有检查通过
      result.allowed = true;
      result.reason = '验证通过';
      this.resetFailures();
      
    } catch (error) {
      this.logger.error('验证过程发生错误', error);
      result.reason = `验证错误: ${error.message}`;
      this.recordFailure();
    }

    return result;
  }

  /**
   * 执行受保护的操作
   */
  async executeProtectedOperation(request, operationFn) {
    const validation = this.validate(request);
    const { token, action, path, args = {}, plan = '' } = request;
    
    // 生成审计记录
    const auditRecord = {
      ts: new Date().toISOString(),
      actor: this.determineActor(token),
      intent: this.determineIntent(action),
      request: { args, plan, dryRun: this.isDryRun },
      decision: {
        allowed: validation.allowed,
        reason: validation.reason
      },
      effects: {
        memoryWrites: [],
        systemChanges: [],
        queued: validation.queued ? 1 : 0
      },
      result: {
        status: validation.allowed ? 'done' : validation.queued ? 'queued' : 'denied',
        error: null
      }
    };

    try {
      // 如果是演练模式，只输出计划
      if (this.isDryRun) {
        this.logger.info('【演练模式】计划执行操作:', {
          action,
          path,
          args,
          allowed: validation.allowed,
          reason: validation.reason
        });
        auditRecord.result.status = 'dry_run';
        return { success: true, dryRun: true, audit: auditRecord };
      }

      if (!validation.allowed) {
        if (validation.queued) {
          // 处理入队逻辑
          this.logger.info(`操作已入队，等待系统恢复后执行: ${action}`);
        } else {
          this.logger.warning(`操作被拒绝: ${validation.reason}`);
        }
        return { success: false, reason: validation.reason, audit: auditRecord };
      }

      // 执行实际操作
      const operationResult = await operationFn();
      auditRecord.result.status = 'done';
      auditRecord.effects.systemChanges.push(`执行了 ${action} 操作`);
      
      return {
        success: true,
        result: operationResult,
        audit: auditRecord
      };

    } catch (error) {
      this.logger.error('执行操作时发生错误', error);
      this.recordFailure();
      
      auditRecord.result.status = 'failed';
      auditRecord.result.error = error.message;
      
      return {
        success: false,
        error: error.message,
        audit: auditRecord
      };
    }
  }

  /**
   * 确定操作执行者
   */
  determineActor(token) {
    if (!token) return 'desktopAgent';
    if (token.includes('TREA')) return 'TREA';
    if (token.includes('OP')) return 'Operator';
    return 'desktopAgent';
  }

  /**
   * 确定操作意图
   */
  determineIntent(action) {
    const actionUpper = action.toUpperCase();
    if (actionUpper.includes('PAUSE')) return 'SOFT_PAUSE';
    if (actionUpper.includes('FREEZE')) return 'HARD_PAUSE';
    if (actionUpper.includes('RESUME')) return 'RESUME';
    if (actionUpper.includes('DRY')) return 'DRY_RUN';
    return actionUpper;
  }
}

// 导出单例实例和类
let instance = null;

function getSecurityPolicy(options) {
  if (!instance) {
    instance = new SOPSecurityPolicy(options);
  }
  return instance;
}

module.exports = {
  SOPSecurityPolicy,
  getSecurityPolicy
};
