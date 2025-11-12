// JEV Plugin v2.0 - 核心自修复逻辑
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// 导入更新器
const Updater = require('./updater');

class AutoRepair {
  constructor() {
    this.rulesPath = path.join(__dirname, 'repair_rules.json');
    this.logPath = path.join(__dirname, 'repair_log.txt');
    this.rules = null;
    this.updater = new Updater();
    this.scanInterval = null;
    
    // 加载规则
    this.loadRules();
    
    // 初始化监控
    if (this.rules?.auto_repair_enabled) {
      this.startMonitoring();
    }
  }

  // 加载修复规则
  loadRules() {
    try {
      if (fs.existsSync(this.rulesPath)) {
        const rulesContent = fs.readFileSync(this.rulesPath, 'utf8');
        this.rules = JSON.parse(rulesContent);
      } else {
        // 使用默认规则
        this.rules = {
          auto_repair_enabled: true,
          scan_interval_minutes: 60,
          repair_threshold: 2,
          modules_to_monitor: [
            "ai_responder.js",
            "ocr_engine.js",
            "relay_connector.js",
            "storage_manager.js",
            "toggle_manager.js"
          ],
          scan_directories: [
            "./modules_local",
            "./Cloud_Modules",
            "./JEV_ControlCenter"
          ]
        };
      }
    } catch (error) {
      console.error('加载修复规则失败:', error);
      this.logError('加载修复规则失败', error.message);
    }
  }

  // 开始监控
  startMonitoring() {
    if (this.scanInterval) {
      clearInterval(this.scanInterval);
    }
    
    const intervalMs = (this.rules.scan_interval_minutes || 60) * 60 * 1000;
    
    console.log(`✅ [JEV Plugin v2.0 Auto-Repair System Active]`);
    console.log(`扫描间隔: ${this.rules.scan_interval_minutes} 分钟`);
    
    // 立即执行一次扫描
    this.checkIntegrity();
    
    // 设置定时扫描
    this.scanInterval = setInterval(() => {
      this.checkIntegrity();
    }, intervalMs);
    
    // 设置每日凌晨3点的完整修复
    this.scheduleDailyRepair();
  }

  // 停止监控
  stopMonitoring() {
    if (this.scanInterval) {
      clearInterval(this.scanInterval);
      this.scanInterval = null;
      console.log('❌ [JEV Plugin v2.0 Auto-Repair System Paused]');
    }
  }

  // 安排每日修复
  scheduleDailyRepair() {
    const scheduleNextRun = () => {
      const now = new Date();
      const nextRun = new Date(now);
      nextRun.setHours(3, 0, 0, 0); // 设置为今天凌晨3点
      
      if (nextRun <= now) {
        nextRun.setDate(nextRun.getDate() + 1); // 如果已经过了今天的3点，设置为明天
      }
      
      const delay = nextRun - now;
      
      setTimeout(() => {
        this.repairAll();
        scheduleNextRun(); // 递归设置下一次运行
      }, delay);
    };
    
    scheduleNextRun();
  }

  // 检查完整性
  async checkIntegrity() {
    try {
      console.log(`[${new Date().toLocaleString('zh-CN')}] 开始完整性检查...`);
      
      const modulesToCheck = this.rules.modules_to_monitor || [];
      const results = [];
      
      for (const moduleName of modulesToCheck) {
        const result = await this.checkModuleIntegrity(moduleName);
        results.push(result);
        
        // 如果发现异常，尝试修复
        if (!result.integrity && this.rules.auto_repair_enabled) {
          await this.repairModule(moduleName);
        }
      }
      
      const corruptedCount = results.filter(r => !r.integrity).length;
      
      console.log(`完整性检查完成 - 发现 ${corruptedCount} 个异常模块`);
      
      return {
        success: true,
        results,
        corruptedCount
      };
    } catch (error) {
      console.error('完整性检查失败:', error);
      this.logError('完整性检查失败', error.message);
      return { success: false, error: error.message };
    }
  }

  // 检查单个模块完整性
  async checkModuleIntegrity(moduleName) {
    try {
      // 查找模块位置
      const modulePath = this.findModulePath(moduleName);
      
      // 检查文件是否存在
      if (!fs.existsSync(modulePath)) {
        return { 
          moduleName, 
          integrity: false, 
          reason: '缺失文件',
          path: modulePath 
        };
      }
      
      // 检查文件大小
      const stats = fs.statSync(modulePath);
      const fileSize = stats.size;
      
      if (fileSize === 0) {
        return { 
          moduleName, 
          integrity: false, 
          reason: '空文件',
          path: modulePath,
          size: fileSize
        };
      }
      
      // 检查文件哈希
      const fileHash = this.calculateFileHash(modulePath);
      
      // 从清单获取期望的哈希
      const expectedHash = this.updater.manifest?.modules[moduleName]?.sha256;
      
      if (expectedHash && fileHash !== expectedHash) {
        return { 
          moduleName, 
          integrity: false, 
          reason: '哈希不匹配',
          path: modulePath,
          expectedHash,
          actualHash: fileHash
        };
      }
      
      // 检查文件是否包含必要的函数或结构
      const content = fs.readFileSync(modulePath, 'utf8');
      const hasRequiredStructure = this.checkModuleStructure(content, moduleName);
      
      if (!hasRequiredStructure) {
        return { 
          moduleName, 
          integrity: false, 
          reason: '结构不完整',
          path: modulePath
        };
      }
      
      return { 
        moduleName, 
        integrity: true,
        path: modulePath,
        size: fileSize,
        hash: fileHash
      };
    } catch (error) {
      console.error(`检查 ${moduleName} 完整性失败:`, error);
      return { 
        moduleName, 
        integrity: false, 
        reason: '检查失败',
        error: error.message
      };
    }
  }

  // 修复单个模块
  async repairModule(moduleName) {
    try {
      console.log(`正在修复模块: ${moduleName}`);
      
      // 下载最新版本
      const downloadResult = await this.updater.downloadUpdate(moduleName);
      
      if (!downloadResult.success) {
        throw new Error(downloadResult.error);
      }
      
      // 应用更新
      const updateResult = await this.updater.applyUpdate(moduleName);
      
      if (!updateResult.success) {
        throw new Error(updateResult.error);
      }
      
      // 验证修复结果
      const checkResult = await this.checkModuleIntegrity(moduleName);
      
      if (checkResult.integrity) {
        this.logSuccess('修复成功', `模块: ${moduleName} | 原因: ${checkResult.reason || '文件异常'} | 操作: 重新下载并验证通过`);
        return { success: true };
      } else {
        throw new Error('修复后验证失败');
      }
    } catch (error) {
      console.error(`修复 ${moduleName} 失败:`, error);
      this.logError('修复失败', `模块: ${moduleName} | 原因: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  // 修复所有模块
  async repairAll() {
    try {
      console.log(`[${new Date().toLocaleString('zh-CN')}] 开始全面修复...`);
      
      const modulesToRepair = this.rules.modules_to_monitor || [];
      const results = [];
      
      for (const moduleName of modulesToRepair) {
        const checkResult = await this.checkModuleIntegrity(moduleName);
        
        if (!checkResult.integrity) {
          const repairResult = await this.repairModule(moduleName);
          results.push({
            moduleName,
            repaired: repairResult.success,
            reason: checkResult.reason
          });
        }
      }
      
      const repairedCount = results.filter(r => r.repaired).length;
      const failedCount = results.filter(r => !r.repaired).length;
      
      console.log(`全面修复完成 - 成功: ${repairedCount}, 失败: ${failedCount}`);
      
      this.logSuccess('全面修复完成', `成功: ${repairedCount}, 失败: ${failedCount}`);
      
      return {
        success: true,
        repairedCount,
        failedCount,
        results
      };
    } catch (error) {
      console.error('全面修复失败:', error);
      this.logError('全面修复失败', error.message);
      return { success: false, error: error.message };
    }
  }

  // 查找模块路径
  findModulePath(moduleName) {
    const baseDir = path.join(__dirname, '..');
    const scanDirs = this.rules.scan_directories || [
      "./modules_local",
      "./Cloud_Modules",
      "."
    ];
    
    for (const dir of scanDirs) {
      const fullPath = path.join(baseDir, dir, moduleName);
      if (fs.existsSync(fullPath)) {
        return fullPath;
      }
    }
    
    // 返回默认路径
    return path.join(baseDir, './modules_local', moduleName);
  }

  // 计算文件哈希
  calculateFileHash(filePath) {
    try {
      const fileBuffer = fs.readFileSync(filePath);
      const hashSum = crypto.createHash('sha256');
      hashSum.update(fileBuffer);
      return hashSum.digest('hex');
    } catch (error) {
      console.error('计算文件哈希失败:', error);
      return null;
    }
  }

  // 检查模块结构
  checkModuleStructure(content, moduleName) {
    // 根据不同模块检查必要的结构
    const structureChecks = {
      'ai_responder.js': /class\s+AIResponder|processMessage|generateResponse/i,
      'ocr_engine.js': /class\s+OCREngine|extractText|analyzeDocument/i,
      'relay_connector.js': /class\s+RelayConnector|sendData|receiveData/i,
      'storage_manager.js': /class\s+StorageManager|save|load|delete/i,
      'toggle_manager.js': /class\s+ToggleManager|enable|disable|getStatus/i
    };
    
    const checkRegex = structureChecks[moduleName];
    
    // 如果没有特定的检查规则，执行通用检查
    if (!checkRegex) {
      return content.length > 100 && /function|class|export/.test(content);
    }
    
    return checkRegex.test(content);
  }

  // 获取模块状态
  async getModuleStatus() {
    const status = {};
    const modules = this.rules.modules_to_monitor || [];
    
    for (const moduleName of modules) {
      const result = await this.checkModuleIntegrity(moduleName);
      status[moduleName] = result;
    }
    
    return status;
  }

  // 切换自动修复模式
  toggleAutoRepair(enabled) {
    this.rules.auto_repair_enabled = enabled;
    
    try {
      fs.writeFileSync(this.rulesPath, JSON.stringify(this.rules, null, 2), 'utf8');
      
      if (enabled) {
        this.startMonitoring();
      } else {
        this.stopMonitoring();
      }
      
      const action = enabled ? '启用' : '禁用';
      this.logSuccess(`${action}自动修复`, `状态: ${enabled ? '开启' : '关闭'}`);
      
      return { success: true };
    } catch (error) {
      this.logError(`${action}自动修复失败`, error.message);
      return { success: false, error: error.message };
    }
  }

  // 日志函数
  logSuccess(action, details) {
    const timestamp = new Date().toLocaleString('zh-CN');
    const logMessage = `[${timestamp}] ✅ ${action} | ${details}`;
    console.log(logMessage);
    fs.appendFileSync(this.logPath, logMessage + '\n', 'utf8');
  }

  logError(action, details) {
    const timestamp = new Date().toLocaleString('zh-CN');
    const logMessage = `[${timestamp}] ⚠️ ${action} | ${details}`;
    console.error(logMessage);
    fs.appendFileSync(this.logPath, logMessage + '\n', 'utf8');
  }

  // 获取统计信息
  async getStatistics() {
    try {
      const status = await this.getModuleStatus();
      const totalModules = Object.keys(status).length;
      const healthyModules = Object.values(status).filter(s => s.integrity).length;
      const corruptedModules = totalModules - healthyModules;
      const integrityRate = totalModules > 0 ? (healthyModules / totalModules * 100).toFixed(2) : 0;
      
      return {
        totalModules,
        healthyModules,
        corruptedModules,
        integrityRate: parseFloat(integrityRate),
        lastScan: new Date().toISOString()
      };
    } catch (error) {
      console.error('获取统计信息失败:', error);
      return null;
    }
  }
}

// 导出模块
if (typeof module !== 'undefined') {
  module.exports = AutoRepair;
}

// 启动自动修复系统
if (typeof require !== 'undefined' && require.main === module) {
  const autoRepair = new AutoRepair();
  console.log('✅ [JEV Plugin v2.0 Auto-Repair System Active]');
}