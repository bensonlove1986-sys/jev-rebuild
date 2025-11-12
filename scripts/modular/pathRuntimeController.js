const path = require('path');
const fs = require('fs').promises;

/**
 * 路径和运行时限制控制器
 * 负责管理系统路径访问限制和操作运行时间限制
 */
class PathRuntimeController {
  constructor(securityPolicy = {}) {
    // 初始化默认策略配置
    this.securityPolicy = {
      restrictedPaths: ["C:\\Windows", "C:\\Users\\*\\AppData", "/etc", "/var"],
      maxRuntimeMinutes: 5,
      ...securityPolicy
    };
    
    // 操作运行时间跟踪
    this.activeOperations = new Map();
    
    // 初始化路径限制检查器
    this.initPathRestrictions();
    
    console.log('[路径运行时控制器] 初始化完成');
    console.log(`[路径运行时控制器] 已配置 ${this.securityPolicy.restrictedPaths.length} 个受限制路径`);
    console.log(`[路径运行时控制器] 最大运行时间限制: ${this.securityPolicy.maxRuntimeMinutes} 分钟`);
  }
  
  /**
   * 初始化路径限制正则表达式
   * 将通配符路径转换为可匹配的正则表达式
   */
  initPathRestrictions() {
    this.restrictedPathRegexes = this.securityPolicy.restrictedPaths.map(restrictedPath => {
      // 将Windows路径规范化
      let normalizedPath = restrictedPath
        .replace(/\\/g, '\\\\')
        .replace(/\*/g, '.*'); // 处理通配符
      
      // 创建正则表达式，确保匹配完整路径前缀
      return new RegExp(`^${normalizedPath}`, 'i');
    });
  }
  
  /**
   * 检查路径是否受限制
   * @param {string} targetPath - 要检查的目标路径
   * @returns {boolean} - true表示路径受限制，false表示允许访问
   */
  isPathRestricted(targetPath) {
    try {
      // 规范化路径以确保一致的比较
      const normalizedPath = path.normalize(targetPath);
      
      // 检查是否匹配任何受限制路径
      for (const regex of this.restrictedPathRegexes) {
        if (regex.test(normalizedPath)) {
          console.warn(`[路径运行时控制器] 检测到访问受限路径: ${targetPath}`);
          return true;
        }
      }
      
      return false;
    } catch (error) {
      console.error(`[路径运行时控制器] 路径检查错误: ${error.message}`);
      // 安全起见，出错时默认拒绝访问
      return true;
    }
  }
  
  /**
   * 验证路径是否允许访问
   * @param {string} targetPath - 要验证的路径
   * @returns {object} - 包含验证结果和消息的对象
   */
  validatePathAccess(targetPath) {
    if (!targetPath) {
      return {
        allowed: false,
        message: '目标路径不能为空'
      };
    }
    
    if (this.isPathRestricted(targetPath)) {
      return {
        allowed: false,
        message: `访问受限: '${targetPath}' 属于受保护路径`
      };
    }
    
    return {
      allowed: true,
      message: '路径访问允许'
    };
  }
  
  /**
   * 开始跟踪操作运行时间
   * @param {string} operationId - 操作唯一标识符
   * @param {string} operationType - 操作类型描述
   */
  startOperation(operationId, operationType) {
    const startTime = Date.now();
    const expirationTime = startTime + (this.securityPolicy.maxRuntimeMinutes * 60 * 1000);
    
    this.activeOperations.set(operationId, {
      id: operationId,
      type: operationType,
      startTime,
      expirationTime,
      isRunning: true
    });
    
    console.log(`[路径运行时控制器] 开始跟踪操作: ${operationId} (${operationType})`);
    
    // 设置自动超时检查
    this.setupTimeoutCheck(operationId);
  }
  
  /**
   * 设置操作超时检查
   * @param {string} operationId - 操作唯一标识符
   */
  setupTimeoutCheck(operationId) {
    // 每分钟检查一次操作是否超时
    const checkInterval = setInterval(() => {
      const operation = this.activeOperations.get(operationId);
      
      if (!operation || !operation.isRunning) {
        clearInterval(checkInterval);
        return;
      }
      
      const currentTime = Date.now();
      if (currentTime > operation.expirationTime) {
        console.warn(`[路径运行时控制器] 操作超时: ${operationId} (${operation.type})`);
        this.stopOperation(operationId, '超时自动终止');
        clearInterval(checkInterval);
      }
    }, 60000); // 每分钟检查一次
  }
  
  /**
   * 停止跟踪操作运行时间
   * @param {string} operationId - 操作唯一标识符
   * @param {string} reason - 停止原因
   */
  stopOperation(operationId, reason = '正常完成') {
    const operation = this.activeOperations.get(operationId);
    
    if (operation && operation.isRunning) {
      const endTime = Date.now();
      const durationSeconds = Math.round((endTime - operation.startTime) / 1000);
      
      operation.isRunning = false;
      operation.endTime = endTime;
      operation.duration = durationSeconds;
      operation.stopReason = reason;
      
      console.log(`[路径运行时控制器] 操作已停止: ${operationId} (${operation.type})`);
      console.log(`[路径运行时控制器] 运行时间: ${durationSeconds} 秒, 原因: ${reason}`);
      
      // 操作完成后可选择保留历史记录或移除
      // this.activeOperations.delete(operationId);
    }
  }
  
  /**
   * 获取操作运行状态
   * @param {string} operationId - 操作唯一标识符
   * @returns {object|null} - 操作状态信息或null（如果不存在）
   */
  getOperationStatus(operationId) {
    const operation = this.activeOperations.get(operationId);
    
    if (!operation) {
      return null;
    }
    
    const currentTime = Date.now();
    const elapsedSeconds = Math.round((currentTime - operation.startTime) / 1000);
    const remainingSeconds = Math.max(0, Math.round((operation.expirationTime - currentTime) / 1000));
    
    return {
      id: operation.id,
      type: operation.type,
      isRunning: operation.isRunning,
      startTime: operation.startTime,
      elapsedTime: elapsedSeconds,
      remainingTime: remainingSeconds,
      maxTime: this.securityPolicy.maxRuntimeMinutes * 60,
      percentageComplete: Math.min(100, Math.round((elapsedSeconds / (this.securityPolicy.maxRuntimeMinutes * 60)) * 100)),
      stopReason: operation.stopReason
    };
  }
  
  /**
   * 获取所有活动操作
   * @returns {Array} - 活动操作列表
   */
  getActiveOperations() {
    const activeOps = [];
    
    for (const [id, op] of this.activeOperations.entries()) {
      if (op.isRunning) {
        activeOps.push(this.getOperationStatus(id));
      }
    }
    
    return activeOps;
  }
  
  /**
   * 检查路径是否存在并可访问
   * @param {string} targetPath - 要检查的路径
   * @returns {Promise<boolean>} - true表示路径存在且可访问
   */
  async checkPathExists(targetPath) {
    try {
      await fs.access(targetPath);
      return true;
    } catch (error) {
      return false;
    }
  }
  
  /**
   * 更新策略配置
   * @param {object} newPolicy - 新的策略配置
   */
  updatePolicy(newPolicy) {
    this.securityPolicy = {
      ...this.securityPolicy,
      ...newPolicy
    };
    
    // 重新初始化路径限制
    if (newPolicy.restrictedPaths) {
      this.initPathRestrictions();
      console.log(`[路径运行时控制器] 已更新路径限制: ${this.securityPolicy.restrictedPaths.length} 个受限制路径`);
    }
    
    if (newPolicy.maxRuntimeMinutes !== undefined) {
      console.log(`[路径运行时控制器] 已更新最大运行时间限制: ${this.securityPolicy.maxRuntimeMinutes} 分钟`);
      
      // 更新现有操作的过期时间
      const currentTime = Date.now();
      for (const [id, op] of this.activeOperations.entries()) {
        if (op.isRunning) {
          op.expirationTime = currentTime + (this.securityPolicy.maxRuntimeMinutes * 60 * 1000);
        }
      }
    }
  }
  
  /**
   * 生成路径安全报告
   * @returns {object} - 包含路径限制信息的报告
   */
  generatePathSecurityReport() {
    return {
      restrictedPaths: this.securityPolicy.restrictedPaths,
      restrictedPathCount: this.securityPolicy.restrictedPaths.length,
      maxRuntimeMinutes: this.securityPolicy.maxRuntimeMinutes,
      activeOperationCount: this.getActiveOperations().length,
      activeOperations: this.getActiveOperations()
    };
  }
}

// 创建单例实例
let pathRuntimeControllerInstance = null;

/**
 * 获取路径运行时控制器实例
 * @param {object} securityPolicy - 可选的安全策略配置
 * @returns {PathRuntimeController} - 控制器实例
 */
function getPathRuntimeController(securityPolicy = {}) {
  if (!pathRuntimeControllerInstance) {
    pathRuntimeControllerInstance = new PathRuntimeController(securityPolicy);
  }
  return pathRuntimeControllerInstance;
}

// 便捷函数：检查路径是否允许访问
function checkPathAccess(targetPath) {
  return getPathRuntimeController().validatePathAccess(targetPath);
}

// 便捷函数：开始跟踪操作
function trackOperation(operationId, operationType) {
  getPathRuntimeController().startOperation(operationId, operationType);
}

// 便捷函数：停止跟踪操作
function untrackOperation(operationId, reason) {
  getPathRuntimeController().stopOperation(operationId, reason);
}

// 便捷函数：获取操作状态
function getOperationStatus(operationId) {
  return getPathRuntimeController().getOperationStatus(operationId);
}

// 导出模块
exports.PathRuntimeController = PathRuntimeController;
exports.getPathRuntimeController = getPathRuntimeController;
exports.checkPathAccess = checkPathAccess;
exports.trackOperation = trackOperation;
exports.untrackOperation = untrackOperation;
exports.getOperationStatus = getOperationStatus;

// 命令行交互功能
if (require.main === module) {
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  const controller = getPathRuntimeController();
  
  console.log('===== 路径和运行时限制控制器 =====');
  console.log('输入命令: check <path> | start <id> <type> | stop <id> | status <id> | report | exit');
  
  rl.on('line', (line) => {
    const parts = line.trim().split(' ');
    const command = parts[0];
    
    switch (command) {
      case 'check':
        if (parts.length > 1) {
          const targetPath = parts.slice(1).join(' ');
          const result = controller.validatePathAccess(targetPath);
          console.log(`路径检查: ${result.allowed ? '✅ 允许' : '❌ 拒绝'} - ${result.message}`);
        } else {
          console.log('请提供要检查的路径');
        }
        break;
        
      case 'start':
        if (parts.length > 2) {
          const [id, type] = [parts[1], parts.slice(2).join(' ')];
          controller.startOperation(id, type);
          console.log(`已开始跟踪操作: ${id}`);
        } else {
          console.log('请提供操作ID和类型');
        }
        break;
        
      case 'stop':
        if (parts.length > 1) {
          controller.stopOperation(parts[1]);
          console.log(`已停止跟踪操作: ${parts[1]}`);
        } else {
          console.log('请提供操作ID');
        }
        break;
        
      case 'status':
        if (parts.length > 1) {
          const status = controller.getOperationStatus(parts[1]);
          if (status) {
            console.log(JSON.stringify(status, null, 2));
          } else {
            console.log(`未找到操作: ${parts[1]}`);
          }
        } else {
          console.log(JSON.stringify(controller.getActiveOperations(), null, 2));
        }
        break;
        
      case 'report':
        console.log(JSON.stringify(controller.generatePathSecurityReport(), null, 2));
        break;
        
      case 'exit':
        console.log('退出控制器');
        rl.close();
        break;
        
      default:
        console.log('未知命令');
    }
  });
  
  rl.on('close', () => {
    process.exit(0);
  });
}