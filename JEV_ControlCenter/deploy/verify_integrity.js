// JEV Plugin v2.0 - 模块完整性检测脚本
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class IntegrityVerifier {
  constructor() {
    this.configPath = path.join(__dirname, 'deploy_config.json');
    this.logPath = path.join(__dirname, 'deploy_log.txt');
    this.reportPath = path.join(__dirname, 'system_report.json');
    this.config = null;
    this.results = {
      checked_modules: 0,
      missing: [],
      outdated: [],
      status: 'OK',
      timestamp: new Date().toISOString()
    };
  }

  // 初始化配置
  init() {
    try {
      this.log('开始完整性校验...');
      
      // 加载配置文件
      if (fs.existsSync(this.configPath)) {
        const configContent = fs.readFileSync(this.configPath, 'utf8');
        this.config = JSON.parse(configContent);
        this.log(`已加载配置 - 版本: ${this.config.version}`);
      } else {
        this.log('错误: 配置文件不存在', true);
        process.exit(1);
      }

      return true;
    } catch (error) {
      this.log(`初始化失败: ${error.message}`, true);
      return false;
    }
  }

  // 执行完整性校验
  run() {
    if (!this.init()) {
      return this.getResults();
    }

    try {
      // 检查所有模块目录
      this.checkDirectoryIntegrity(this.config.plugin_path, 'plugin');
      this.checkDirectoryIntegrity(this.config.cloud_path, 'cloud');
      this.checkDirectoryIntegrity(this.config.control_path, 'control');
      this.checkDirectoryIntegrity(this.config.monitor_path, 'monitor');
      this.checkDirectoryIntegrity(this.config.repair_path, 'repair');

      // 检查核心模块
      this.checkCoreModules();

      // 更新结果
      this.results.status = this.results.missing.length === 0 && this.results.outdated.length === 0 ? 'OK' : 'ERROR';
      this.results.timestamp = new Date().toISOString();

      // 保存报告
      this.saveReport();

      // 输出结果
      this.log('完整性校验完成');
      this.log(`检查模块数: ${this.results.checked_modules}`);
      this.log(`缺失模块: ${this.results.missing.length}`);
      this.log(`过期模块: ${this.results.outdated.length}`);
      this.log(`最终状态: ${this.results.status}`);

      return this.getResults();
    } catch (error) {
      this.log(`校验过程出错: ${error.message}`, true);
      this.results.status = 'ERROR';
      return this.getResults();
    }
  }

  // 检查目录完整性
  checkDirectoryIntegrity(dirPath, moduleType) {
    try {
      if (!fs.existsSync(dirPath)) {
        const errorMsg = `${moduleType.toUpperCase()} 目录不存在: ${dirPath}`;
        this.log(errorMsg, true);
        this.results.missing.push({ type: moduleType, path: dirPath, reason: '目录不存在' });
        return false;
      }

      const files = this.getFilesInDirectory(dirPath);
      const expectedCount = this.config.expected_files[moduleType] || 0;
      
      this.log(`${moduleType.toUpperCase()} 目录检查: ${files.length}/${expectedCount} 文件`);
      
      // 检查文件数量是否符合预期
      if (expectedCount > 0 && files.length < expectedCount) {
        const warningMsg = `${moduleType.toUpperCase()} 文件数量不足: ${files.length}/${expectedCount}`;
        this.log(warningMsg, true);
      }

      // 更新检查模块数
      this.results.checked_modules += files.length;
      
      return true;
    } catch (error) {
      this.log(`${moduleType.toUpperCase()} 目录检查失败: ${error.message}`, true);
      return false;
    }
  }

  // 检查核心模块
  checkCoreModules() {
    const coreModules = this.config.required_modules || [];
    
    for (const moduleName of coreModules) {
      // 检查模块是否存在于任何目录
      let found = false;
      
      const searchPaths = [
        path.join(this.config.plugin_path, moduleName),
        path.join(this.config.cloud_path, moduleName),
        path.join(this.config.control_path, moduleName),
        path.join(this.config.control_path, 'modules_local', moduleName)
      ];
      
      for (const modulePath of searchPaths) {
        if (fs.existsSync(modulePath)) {
          found = true;
          
          // 检查文件版本信息
          const version = this.extractVersion(modulePath);
          if (version && this.isOutdated(version, this.config.version)) {
            this.results.outdated.push({
              name: moduleName,
              path: modulePath,
              currentVersion: version,
              expectedVersion: this.config.version
            });
          }
          
          break;
        }
      }
      
      if (!found) {
        this.results.missing.push({
          type: 'core_module',
          name: moduleName,
          reason: '核心模块缺失'
        });
      }
    }
  }

  // 提取文件中的版本信息
  extractVersion(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      // 尝试从注释或字符串中提取版本号
      const versionMatch = content.match(/(?:v|version|Version)\s*(\d+\.\d+\.\d+)/i);
      return versionMatch ? `v${versionMatch[1]}` : null;
    } catch (error) {
      return null;
    }
  }

  // 检查版本是否过期
  isOutdated(currentVersion, expectedVersion) {
    if (!currentVersion || !expectedVersion) {
      return false;
    }
    
    const current = currentVersion.replace('v', '').split('.').map(Number);
    const expected = expectedVersion.replace('v', '').split('.').map(Number);
    
    for (let i = 0; i < 3; i++) {
      if (current[i] < expected[i]) {
        return true;
      }
      if (current[i] > expected[i]) {
        return false;
      }
    }
    
    return false;
  }

  // 获取目录下所有文件
  getFilesInDirectory(dirPath) {
    let files = [];
    
    try {
      const items = fs.readdirSync(dirPath);
      
      for (const item of items) {
        const fullPath = path.join(dirPath, item);
        const stats = fs.statSync(fullPath);
        
        if (stats.isFile()) {
          files.push(fullPath);
        } else if (stats.isDirectory()) {
          // 递归获取子目录文件
          const subFiles = this.getFilesInDirectory(fullPath);
          files = files.concat(subFiles);
        }
      }
    } catch (error) {
      this.log(`获取文件列表失败: ${error.message}`, true);
    }
    
    return files;
  }

  // 计算文件哈希
  calculateFileHash(filePath) {
    try {
      const fileBuffer = fs.readFileSync(filePath);
      const hashSum = crypto.createHash('sha256');
      hashSum.update(fileBuffer);
      return hashSum.digest('hex');
    } catch (error) {
      return null;
    }
  }

  // 保存报告
  saveReport() {
    try {
      fs.writeFileSync(this.reportPath, JSON.stringify(this.results, null, 2), 'utf8');
      this.log(`报告已保存到: ${this.reportPath}`);
    } catch (error) {
      this.log(`保存报告失败: ${error.message}`, true);
    }
  }

  // 获取结果
  getResults() {
    return this.results;
  }

  // 日志记录
  log(message, isError = false) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${isError ? 'ERROR' : 'INFO'}: ${message}`;
    
    console.log(logMessage);
    
    try {
      fs.appendFileSync(this.logPath, logMessage + '\n', 'utf8');
    } catch (error) {
      console.error('写入日志失败:', error);
    }
  }

  // 尝试触发自动修复
  triggerAutoRepair() {
    if (!this.config.auto_repair_enabled) {
      this.log('自动修复已禁用');
      return false;
    }

    try {
      const repairPath = path.join(this.config.repair_path, 'auto_repair.js');
      
      if (fs.existsSync(repairPath)) {
        this.log('触发自动修复系统...');
        
        // 这里仅记录日志，实际执行将由PowerShell脚本负责
        return true;
      } else {
        this.log('自动修复模块不存在', true);
        return false;
      }
    } catch (error) {
      this.log(`触发修复失败: ${error.message}`, true);
      return false;
    }
  }
}

// 主程序执行
if (require.main === module) {
  const verifier = new IntegrityVerifier();
  const results = verifier.run();
  
  // 如果发现问题且启用了自动修复
  if (results.status === 'ERROR' && verifier.config?.auto_repair_enabled) {
    verifier.triggerAutoRepair();
  }
  
  // 输出JSON格式结果供PowerShell调用
  console.log('\n[JSON_RESULT_START]');
  console.log(JSON.stringify(results));
  console.log('[JSON_RESULT_END]');
  
  // 根据结果设置退出码
  process.exit(results.status === 'OK' ? 0 : 1);
}

// 导出模块供其他程序使用
module.exports = IntegrityVerifier;