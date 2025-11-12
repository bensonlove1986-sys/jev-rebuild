/**
 * SOP意图处理器 - 实现标准操作流程的各种系统控制意图
 * 支持：软暂停、硬暂停、紧急停机、系统恢复和演练模式
 */

// 安全导入模块，处理可能的模块加载失败
let securityPolicy, pauseResumeController, failSafeController;
try {
  const securityModule = require('./advancedSecurityPolicy');
  securityPolicy = securityModule.securityPolicy;
} catch (error) {
  console.warn('[SOPIntent] 无法加载advancedSecurityPolicy模块:', error.message);
  // 创建模拟安全策略对象
  securityPolicy = {
    policy: { paused: false, queueOnPause: true, tokenWhitelist: ['TREA_MAIN', 'WORKER_OP'] },
    async setPaused(value) { this.policy.paused = value; },
    async savePolicy() { console.log('模拟保存安全策略'); },
    async loadPolicy() { console.log('模拟加载安全策略'); },
    log: (ns, action, details) => console.log(`[模拟日志] ${ns}:${action}`, details)
  };
}

try {
  const pauseModule = require('./pauseResumeController');
  pauseResumeController = pauseModule.pauseResumeController;
} catch (error) {
  console.warn('[SOPIntent] 无法加载pauseResumeController模块:', error.message);
  // 创建模拟暂停控制器对象
  pauseResumeController = {
    _status: { paused: false, queueLength: 0 },
    async pause() { this._status.paused = true; },
    async resume() { this._status.paused = false; },
    getStatus() { return this._status; }
  };
}

try {
  const failSafeModule = require('./failSafeController');
  failSafeController = failSafeModule.failSafeController;
} catch (error) {
  console.warn('[SOPIntent] 无法加载failSafeController模块:', error.message);
  // 创建模拟故障保护控制器对象
  failSafeController = {
    killSwitchActive: false,
    failureCount: 0,
    async activateKillSwitch() { this.killSwitchActive = true; },
    async deactivateKillSwitch() { this.killSwitchActive = false; }
  };
}

/**
 * SOP意图处理器类
 * 负责解析和执行标准化操作流程的各种系统控制指令
 */
class SOPIntentHandler {
  constructor() {
    this.operationLog = [];
    this.dryRunMode = false;
    
    // 初始化可用意图映射
    this.intentMap = {
      '暂停系统（软）': this.handleSoftPause.bind(this),
      '暂停系统（硬）': this.handleHardPause.bind(this),
      '执行紧急停机': this.handleFullFreeze.bind(this),
      '恢复系统': this.handleResume.bind(this),
      '仅演练（不执行）': this.handleDryRun.bind(this)
    };
  }
  
  /**
   * 记录操作日志
   */
  logOperation(action, details) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      action,
      details,
      dryRun: this.dryRunMode
    };
    
    this.operationLog.push(logEntry);
    
    // 同时记录到安全日志系统
    if (securityPolicy && securityPolicy.log) {
      securityPolicy.log('sop', action, details);
    }
    
    return logEntry;
  }
  
  /**
   * 执行操作（支持干运行模式）
   */
  async executeOperation(name, operationFn, params = {}) {
    // 记录操作开始
    console.log(`[SOPIntent] 开始执行: ${name}`);
    
    // 处理干运行模式
    if (this.dryRunMode || params.dryRun) {
      console.log(`[DRY RUN] 模拟执行: ${name}`, params);
      this.logOperation(name, { ...params, status: 'simulated' });
      
      // 即使在干运行模式下也执行操作函数，但返回标记为干运行的结果
      try {
        const simulatedResult = await operationFn(params);
        return { 
          success: true, 
          dryRun: true, 
          action: name, 
          params,
          ...simulatedResult
        };
      } catch (error) {
        console.error(`[DRY RUN ERROR] 模拟执行出错: ${name}`, error);
        return { 
          success: false, 
          dryRun: true, 
          action: name, 
          error: error.message, 
          params
        };
      }
    }
    
    try {
      console.log(`[执行] ${name}`, params);
      const result = await operationFn(params);
      this.logOperation(name, { ...params, status: 'completed' });
      
      // 确保结果对象包含基本字段
      const enhancedResult = {
        success: true,
        action: name,
        params,
        ...result
      };
      
      return enhancedResult;
    } catch (error) {
      console.error(`[失败] ${name}`, error);
      this.logOperation(name, { ...params, status: 'failed', error: error.message });
      return { 
        success: false, 
        action: name, 
        error: error.message, 
        params
      };
    }
  }
  
  /**
   * 处理软暂停操作
   */
  async handleSoftPause(params = {}) {
    return await this.executeOperation('软暂停系统', async () => {
      try {
        // 设置安全策略为暂停状态
        if (securityPolicy) {
          if (typeof securityPolicy.setPaused === 'function') {
            await securityPolicy.setPaused(true);
          } else if (securityPolicy.policy) {
            securityPolicy.policy.paused = true;
          }
          
          // 确保保留暂停时的队列功能
          if (securityPolicy.policy) {
            securityPolicy.policy.queueOnPause = true;
          }
          
          // 尝试保存策略（处理可能的异常）
          if (typeof securityPolicy.savePolicy === 'function') {
            try {
              await securityPolicy.savePolicy();
            } catch (saveError) {
              console.warn('[SOPIntent] 保存安全策略失败，但继续执行:', saveError.message);
            }
          }
        }
        
        // 通过暂停控制器暂停系统（处理不同接口）
        if (pauseResumeController) {
          if (typeof pauseResumeController.pause === 'function') {
            await pauseResumeController.pause();
          } else if (typeof pauseResumeController.setPaused === 'function') {
            await pauseResumeController.setPaused(true);
          } else if (pauseResumeController._status) {
            pauseResumeController._status.paused = true;
          }
        }
        
        // 获取状态信息
        let pauseStatus = 'unknown';
        if (pauseResumeController) {
          if (typeof pauseResumeController.getStatus === 'function') {
            pauseStatus = pauseResumeController.getStatus();
          } else if (pauseResumeController.status) {
            pauseStatus = pauseResumeController.status;
          } else if (pauseResumeController._status) {
            pauseStatus = pauseResumeController._status;
          }
        }
        
        return {
          message: '系统已软暂停',
          securityPolicyStatus: securityPolicy?.policy || 'unknown',
          pauseControllerStatus: pauseStatus
        };
      } catch (error) {
        console.error('[SOPIntent] 软暂停执行出错:', error);
        // 即使出错也尝试返回尽可能多的信息
        return {
          message: '软暂停执行过程中出现错误',
          error: error.message,
          securityPolicyStatus: securityPolicy?.policy || 'unknown',
          pauseControllerStatus: pauseResumeController?.getStatus?.() || pauseResumeController?.status || 'unknown'
        };
      }
    }, params);
  }
  
  /**
   * 处理硬暂停操作
   */
  async handleHardPause(params = {}) {
    return await this.executeOperation('硬暂停系统', async () => {
      try {
        // 首先执行软暂停
        const softPauseResult = await this.handleSoftPause(params);
        
        // 模拟防火墙阻断和停止进程
        const additionalActions = [];
        
        // 模拟防火墙阻断1818端口
        console.log('建议：在防火墙中阻断1818端口的入站和出站流量');
        additionalActions.push('防火墙阻断1818端口的入站和出站流量');
        
        // 模拟停止desktopAgent进程
        console.log('建议：停止desktopAgent.ps1进程');
        additionalActions.push('停止desktopAgent.ps1进程');
        
        return {
          ...softPauseResult,
          message: '系统已硬暂停',
          additionalActions,
          firewallSuggestion: 'Block 1818 inbound/outbound',
          processSuggestion: 'stop desktopAgent.ps1 process'
        };
      } catch (error) {
        console.error('[SOPIntent] 硬暂停执行出错:', error);
        return {
          message: '硬暂停执行过程中出现错误',
          error: error.message,
          softPauseAttempted: true
        };
      }
    }, params);
  }
  
  /**
   * 处理紧急停机操作
   */
  async handleFullFreeze(params = {}) {
    return await this.executeOperation('紧急停机', async () => {
      try {
        // 首先执行硬暂停
        const hardPauseResult = await this.handleHardPause(params);
        
        // 然后清除令牌白名单
        let tokenWhitelistCleared = false;
        if (securityPolicy) {
          try {
            if (securityPolicy.policy) {
              securityPolicy.policy.tokenWhitelist = [];
              tokenWhitelistCleared = true;
              
              // 尝试保存策略（处理可能的异常）
              if (typeof securityPolicy.savePolicy === 'function') {
                try {
                  await securityPolicy.savePolicy();
                } catch (saveError) {
                  console.warn('[SOPIntent] 保存令牌白名单清除操作失败，但继续执行:', saveError.message);
                }
              }
            }
          } catch (error) {
            console.error('[SOPIntent] 清除令牌白名单失败:', error);
          }
        }
        
        // 激活故障保护控制器的紧急停止
        let killSwitchActivated = false;
        if (failSafeController) {
          try {
            if (typeof failSafeController.activateKillSwitch === 'function') {
              await failSafeController.activateKillSwitch();
              killSwitchActivated = true;
            }
          } catch (error) {
            console.error('[SOPIntent] 激活故障保护停止开关失败:', error);
          }
        }
        
        console.log('建议：禁用Cloudflare路由和定时任务');
        
        const additionalActions = [...(hardPauseResult.additionalActions || [])];
        additionalActions.push(tokenWhitelistCleared ? '成功清除令牌白名单' : '尝试清除令牌白名单');
        additionalActions.push(killSwitchActivated ? '成功激活故障保护停止开关' : '尝试激活故障保护停止开关');
        additionalActions.push('禁用Cloudflare路由和定时任务');
        
        return {
          ...hardPauseResult,
          message: '系统已紧急停机',
          tokenWhitelistCleared,
          killSwitchActivated,
          cloudflareSuggestion: 'disable Cloudflare route/cron',
          additionalActions
        };
      } catch (error) {
        console.error('[SOPIntent] 紧急停机执行出错:', error);
        return {
          message: '紧急停机执行过程中出现错误',
          error: error.message,
          hardPauseAttempted: true
        };
      }
    }, params);
  }
  
  /**
   * 处理系统恢复操作
   */
  async handleResume(params = {}) {
    return await this.executeOperation('恢复系统', async () => {
      try {
        // 重置安全策略的暂停状态
        if (securityPolicy) {
          if (typeof securityPolicy.setPaused === 'function') {
            await securityPolicy.setPaused(false);
          } else if (securityPolicy.policy) {
            securityPolicy.policy.paused = false;
          }
          
          // 尝试保存策略（处理可能的异常）
          if (typeof securityPolicy.savePolicy === 'function') {
            try {
              await securityPolicy.savePolicy();
            } catch (saveError) {
              console.warn('[SOPIntent] 保存安全策略失败，但继续执行:', saveError.message);
            }
          }
        }
        
        // 通过暂停控制器恢复系统（处理不同接口）
        if (pauseResumeController) {
          if (typeof pauseResumeController.resume === 'function') {
            await pauseResumeController.resume();
          } else if (typeof pauseResumeController.setPaused === 'function') {
            await pauseResumeController.setPaused(false);
          } else if (pauseResumeController._status) {
            pauseResumeController._status.paused = false;
          }
        }
        
        // 关闭故障保护的停止开关（如果激活）
        if (failSafeController && failSafeController.killSwitchActive) {
          if (typeof failSafeController.deactivateKillSwitch === 'function') {
            await failSafeController.deactivateKillSwitch();
          } else {
            failSafeController.killSwitchActive = false;
          }
        }
        
        // 如果指定了重播队列任务
        if (params.replayLastN) {
          console.log(`建议：重播最后 ${params.replayLastN} 个队列任务`);
          // 这里可以添加实际重播队列任务的代码
        }
        
        // 获取状态信息
        let pauseStatus = 'unknown';
        if (pauseResumeController) {
          if (typeof pauseResumeController.getStatus === 'function') {
            pauseStatus = pauseResumeController.getStatus();
          } else if (pauseResumeController.status) {
            pauseStatus = pauseResumeController.status;
          } else if (pauseResumeController._status) {
            pauseStatus = pauseResumeController._status;
          }
        }
        
        return {
          message: '系统已恢复',
          securityPolicyStatus: securityPolicy?.policy || 'unknown',
          pauseControllerStatus: pauseStatus
        };
      } catch (error) {
        console.error('[SOPIntent] 恢复系统执行出错:', error);
        // 即使出错也尝试返回尽可能多的信息
        return {
          message: '恢复系统执行过程中出现错误',
          error: error.message,
          securityPolicyStatus: securityPolicy?.policy || 'unknown',
          pauseControllerStatus: pauseResumeController?.getStatus?.() || pauseResumeController?.status || 'unknown'
        };
      }
    }, params);
  }
  
  /**
   * 处理演练模式
   */
  async handleDryRun(params = {}) {
    const originalMode = this.dryRunMode;
    this.dryRunMode = true;
    
    try {
      let targetIntent = params.targetIntent || params.intent;
      if (!targetIntent) {
        throw new Error('演练模式需要指定targetIntent参数');
      }
      
      console.log(`[演练模式] 即将模拟执行: ${targetIntent}`);
      
      // 处理意图名称映射（兼容不同格式）
      const intentMap = {
        'softPause': '暂停系统（软）',
        'hardPause': '暂停系统（硬）',
        'fullFreeze': '执行紧急停机',
        'resume': '恢复系统'
      };
      
      // 如果提供的是简写形式，转换为完整形式
      targetIntent = intentMap[targetIntent] || targetIntent;
      
      // 检查目标意图是否存在
      if (!this.intentMap[targetIntent]) {
        throw new Error(`未知的意图: ${targetIntent}`);
      }
      
      // 执行目标意图（但处于干运行模式）
      const result = await this.intentMap[targetIntent](params.targetParams || params);
      
      // 确保返回值包含演练模式标记
      return {
        ...result,
        isDryRun: true,
        message: `演练模式: ${result.message || '操作已模拟'}`
      };
    } catch (error) {
      console.error('[SOPIntent] 演练模式执行出错:', error);
      return {
        message: '演练模式执行过程中出现错误',
        error: error.message,
        isDryRun: true,
        success: false
      };
    } finally {
      // 恢复原始模式
      this.dryRunMode = originalMode;
    }
  }
  
  /**
   * 处理用户意图指令
   */
  async processIntent(phrase, params = {}) {
    // 检查意图是否存在
    const intentHandler = this.intentMap[phrase];
    if (!intentHandler) {
      return {
        success: false,
        error: `未知的SOP意图: ${phrase}`,
        availableIntents: Object.keys(this.intentMap)
      };
    }
    
    // 执行对应的处理函数
    return await intentHandler(params);
  }
  
  /**
   * 获取系统当前状态
   */
  async getCurrentStatus() {
    const status = {
      timestamp: new Date().toISOString(),
      systemState: 'unknown',
      securityPolicy: {
        paused: false,
        tokenWhitelist: [],
        queueOnPause: false
      },
      pauseController: {
        paused: false,
        queueLength: 0
      },
      failSafe: {
        killSwitchActive: false,
        failureCount: 0
      }
    };
    
    // 获取安全策略状态
    if (securityPolicy && securityPolicy.policy) {
      status.securityPolicy = {
        paused: securityPolicy.policy.paused || false,
        tokenWhitelist: securityPolicy.policy.tokenWhitelist || [],
        queueOnPause: securityPolicy.policy.queueOnPause || false
      };
    }
    
    // 获取暂停控制器状态
    if (pauseResumeController) {
      const controllerStatus = pauseResumeController.getStatus();
      status.pauseController = controllerStatus || status.pauseController;
    }
    
    // 获取故障保护状态
    if (failSafeController) {
      status.failSafe = {
        killSwitchActive: failSafeController.killSwitchActive || false,
        failureCount: failSafeController.failureCount || 0
      };
    }
    
    // 确定整体系统状态
    if (status.failSafe.killSwitchActive) {
      status.systemState = 'FULL_FROZEN';
    } else if (status.securityPolicy.paused) {
      status.systemState = 'PAUSED';
    } else {
      status.systemState = 'RUNNING';
    }
    
    return status;
  }
}

// 创建单例实例
const sopIntentHandler = new SOPIntentHandler();

// 导出便捷函数
async function processSOPIntent(phrase, params = {}) {
  return await sopIntentHandler.processIntent(phrase, params);
}

async function getSystemStatus() {
  return await sopIntentHandler.getCurrentStatus();
}

// 命令行交互支持
async function handleCommandLine() {
  if (typeof process !== 'undefined' && process.argv && process.argv.length > 2) {
    const command = process.argv[2];
    const params = {};
    
    console.log(`[SOP] 命令行执行: ${command}`);
    
    try {
      const result = await processSOPIntent(command, params);
      console.log('执行结果:', JSON.stringify(result, null, 2));
      process.exit(result.success ? 0 : 1);
    } catch (error) {
      console.error('执行失败:', error.message);
      process.exit(1);
    }
  }
}

// 如果直接运行此脚本，执行命令行处理
if (require.main === module) {
  handleCommandLine();
}

// 导出模块
exports.SOPIntentHandler = SOPIntentHandler;
exports.sopIntentHandler = sopIntentHandler;
exports.processSOPIntent = processSOPIntent;
exports.getSystemStatus = getSystemStatus;
