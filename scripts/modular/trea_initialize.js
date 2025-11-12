/**
 * TREA 初始化脚本
 * 加载核心规则并初始化TREA系统
 */

// 确保在模块环境中正确导入
async function initializeTREASystem() {
  try {
    console.log("正在初始化TREA系统...");
    
    // 尝试加载核心规则
    let TREA_CORE_RULES;
    let initializeTREA;
    
    try {
      // CommonJS环境
      if (typeof require !== 'undefined' && typeof module !== 'undefined') {
        const rulesModule = require('./trea_core_rules');
        TREA_CORE_RULES = rulesModule.TREA_CORE_RULES;
        initializeTREA = rulesModule.initializeTREA;
      }
      // 浏览器环境（已通过script标签加载）
      else if (typeof window !== 'undefined' && window.TREA_CORE_RULES) {
        TREA_CORE_RULES = window.TREA_CORE_RULES;
        initializeTREA = window.initializeTREA;
      }
    } catch (importError) {
      console.error("加载TREA核心规则失败:", importError);
    }
    
    // 如果导入失败，直接定义规则对象
    if (!TREA_CORE_RULES) {
      console.warn("使用内置规则配置");
      TREA_CORE_RULES = {
        confirmationMessage: "系统核心规则已加载。所有模块将按闭环架构执行。"
      };
      
      initializeTREA = function() {
        console.log(TREA_CORE_RULES.confirmationMessage);
        return TREA_CORE_RULES;
      };
    }
    
    // 初始化JEV对象（如果不存在）
    if (typeof window !== 'undefined' && !window.JEV) {
      window.JEV = {
        externalMemory: {
          set: async function(key, value, options) {
            console.log('[模拟存储] ' + (options?.ns || 'default') + '::' + key);
            return Promise.resolve({ success: true });
          }
        },
        autoLoadModules: async function() {
          console.log("[TREA] 模拟自动加载模块");
          return {};
        }
      };
    }
    
    // 执行初始化
    const initializedRules = initializeTREA();
    
    // 输出核心确认消息
    console.log(initializedRules.confirmationMessage);
    
    // 记录初始化日志
    logTREAAction('trea_initialize', 'system_startup', 'success', 0);
    
    return {
      success: true,
      message: initializedRules.confirmationMessage,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error("TREA系统初始化失败:", error);
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * 记录TREA操作日志
 */
function logTREAAction(module, action, status, durationMs) {
  const logId = 'trea_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  
  const logEntry = {
    logId: logId,
    timestamp: new Date().toISOString(),
    module: module,
    action: action,
    status: status,
    durationMs: durationMs
  };
  
  console.log('📄 操作: ' + module);
  console.log('🧠 结果: ' + status);
  console.log('⏱️ 耗时: ' + (durationMs / 1000).toFixed(2) + '秒');
  console.log('🧾 日志ID: ' + logId);
  
  // 尝试存储到externalMemory
  if (typeof window !== 'undefined' && window.JEV && window.JEV.externalMemory) {
    window.JEV.externalMemory.set(
      'log_' + logId, 
      logEntry, 
      { ns: 'trea_logs' }
    ).catch(function(err) {
      console.warn("存储TREA日志失败:", err);
    });
  }
  
  return logId;
}

// CommonJS导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    initializeTREASystem: initializeTREASystem,
    logTREAAction: logTREAAction
  };
}

// 如果直接运行此脚本，执行初始化
if (typeof require !== 'undefined' && require.main === module) {
  initializeTREASystem().then(function(result) {
    if (result.success) {
      console.log("\nTREA初始化完成！");
    } else {
      console.error("TREA初始化失败！");
    }
  });
}