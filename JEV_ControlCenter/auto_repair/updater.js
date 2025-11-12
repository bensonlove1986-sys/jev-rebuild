// JEV Plugin v2.0 - 智能热更新引擎
const fs = require('fs');
const path = require('path');
const https = require('https');
const crypto = require('crypto');

class Updater {
  constructor() {
    this.manifestPath = path.join(__dirname, 'update_manifest.json');
    this.backupDir = path.join(__dirname, 'backups');
    this.logPath = path.join(__dirname, 'repair_log.txt');
    this.manifest = null;
    this.downloadsDir = path.join(__dirname, 'downloads');
    
    // 确保目录存在
    if (!fs.existsSync(this.downloadsDir)) {
      fs.mkdirSync(this.downloadsDir, { recursive: true });
    }
    
    // 加载清单
    this.loadManifest();
  }

  // 加载更新清单
  loadManifest() {
    try {
      if (fs.existsSync(this.manifestPath)) {
        const manifestContent = fs.readFileSync(this.manifestPath, 'utf8');
        this.manifest = JSON.parse(manifestContent);
      }
    } catch (error) {
      console.error('加载更新清单失败:', error);
      this.logError('加载更新清单失败', error.message);
    }
  }

  // 检查更新
  async checkForUpdates() {
    try {
      // 从服务器获取最新清单
      const latestManifest = await this.fetchLatestManifest();
      
      if (!this.manifest) {
        this.manifest = latestManifest;
        this.saveManifest();
        return { hasUpdate: true, manifest: latestManifest };
      }
      
      // 比对版本号
      const hasUpdate = this.compareVersions(latestManifest.version, this.manifest.version);
      
      if (hasUpdate) {
        this.manifest = latestManifest;
        this.saveManifest();
      }
      
      return { hasUpdate, manifest: latestManifest };
    } catch (error) {
      console.error('检查更新失败:', error);
      this.logError('检查更新失败', error.message);
      return { hasUpdate: false, error: error.message };
    }
  }

  // 获取最新清单
  async fetchLatestManifest() {
    return new Promise((resolve, reject) => {
      https.get('https://jevshop.workers.dev/api/manifest', (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (error) {
            // 如果远程获取失败，返回本地清单的模拟更新
            resolve({
              version: 'v2.0.7',
              modules: this.manifest?.modules || {},
              last_update: new Date().toISOString(),
              release_notes: '模拟更新 - 这是一个测试版本',
              update_required: false
            });
          }
        });
      }).on('error', () => {
        // 失败时返回模拟数据
        resolve({
          version: 'v2.0.7',
          modules: this.manifest?.modules || {},
          last_update: new Date().toISOString(),
          release_notes: '模拟更新 - 这是一个测试版本',
          update_required: false
        });
      });
    });
  }

  // 下载更新
  async downloadUpdate(moduleName) {
    try {
      if (!this.manifest || !this.manifest.modules[moduleName]) {
        throw new Error(`模块 ${moduleName} 在清单中不存在`);
      }
      
      const moduleInfo = this.manifest.modules[moduleName];
      const downloadPath = path.join(this.downloadsDir, moduleName);
      
      // 下载文件
      await this.downloadFile(moduleInfo.url, downloadPath);
      
      // 验证文件完整性
      const isValid = await this.verifyFileIntegrity(downloadPath, moduleInfo.sha256);
      
      if (!isValid) {
        fs.unlinkSync(downloadPath);
        throw new Error('文件验证失败');
      }
      
      this.logSuccess(`下载成功`, `模块: ${moduleName} | 版本: ${moduleInfo.version}`);
      return { success: true, path: downloadPath };
    } catch (error) {
      console.error(`下载 ${moduleName} 失败:`, error);
      this.logError(`下载失败`, `模块: ${moduleName} | 原因: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  // 应用更新
  async applyUpdate(moduleName) {
    try {
      const downloadPath = path.join(this.downloadsDir, moduleName);
      
      // 查找模块实际位置
      const targetPath = this.findModulePath(moduleName);
      if (!targetPath) {
        throw new Error(`找不到模块 ${moduleName} 的目标路径`);
      }
      
      // 备份旧版本
      await this.backupModule(moduleName, targetPath);
      
      // 复制新版本
      fs.copyFileSync(downloadPath, targetPath);
      
      // 删除下载的文件
      fs.unlinkSync(downloadPath);
      
      // 获取版本信息
      const newVersion = this.manifest.modules[moduleName]?.version || 'unknown';
      
      this.logSuccess(`更新成功`, `模块: ${moduleName} | 版本: ${newVersion} | 状态: 热更新完成`);
      
      // 触发webhook通知
      this.notifyUpdate(moduleName, 'update', newVersion);
      
      return { success: true, targetPath };
    } catch (error) {
      console.error(`应用 ${moduleName} 更新失败:`, error);
      this.logError(`更新失败`, `模块: ${moduleName} | 原因: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  // 回滚到上一个版本
  async rollback(moduleName) {
    try {
      // 查找最新的备份
      const backupFile = this.findLatestBackup(moduleName);
      if (!backupFile) {
        throw new Error(`找不到 ${moduleName} 的备份文件`);
      }
      
      // 查找模块实际位置
      const targetPath = this.findModulePath(moduleName);
      if (!targetPath) {
        throw new Error(`找不到模块 ${moduleName} 的目标路径`);
      }
      
      // 获取备份文件的版本信息
      const backupVersion = path.basename(backupFile).match(/v(\d+\.\d+\.\d+)/)?.[1] || 'unknown';
      
      // 复制备份文件
      fs.copyFileSync(backupFile, targetPath);
      
      this.logSuccess(`回滚成功`, `模块: ${moduleName} | 版本: ${backupVersion} | 原因: 手动回滚`);
      
      // 触发webhook通知
      this.notifyUpdate(moduleName, 'rollback', backupVersion);
      
      return { success: true, backupFile };
    } catch (error) {
      console.error(`回滚 ${moduleName} 失败:`, error);
      this.logError(`回滚失败`, `模块: ${moduleName} | 原因: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  // 下载文件
  downloadFile(url, destination) {
    return new Promise((resolve, reject) => {
      const file = fs.createWriteStream(destination);
      
      https.get(url, (response) => {
        response.pipe(file);
        
        file.on('finish', () => {
          file.close(resolve);
        });
      }).on('error', (error) => {
        fs.unlink(destination, () => {});
        reject(error);
      });
    });
  }

  // 验证文件完整性
  verifyFileIntegrity(filePath, expectedHash) {
    return new Promise((resolve) => {
      try {
        const fileBuffer = fs.readFileSync(filePath);
        const hashSum = crypto.createHash('sha256');
        hashSum.update(fileBuffer);
        const calculatedHash = hashSum.digest('hex');
        
        resolve(calculatedHash === expectedHash);
      } catch (error) {
        resolve(false);
      }
    });
  }

  // 备份模块
  async backupModule(moduleName, sourcePath) {
    if (!fs.existsSync(sourcePath)) {
      return; // 文件不存在，无需备份
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFileName = `${moduleName}.bak.${timestamp}`;
    const backupPath = path.join(this.backupDir, backupFileName);
    
    fs.copyFileSync(sourcePath, backupPath);
    
    // 清理旧备份
    this.cleanupOldBackups();
  }

  // 清理旧备份
  cleanupOldBackups() {
    try {
      const files = fs.readdirSync(this.backupDir)
        .filter(file => file.endsWith('.bak.'))
        .map(file => ({
          name: file,
          mtime: fs.statSync(path.join(this.backupDir, file)).mtime.getTime()
        }))
        .sort((a, b) => b.mtime - a.mtime);
      
      // 保留最新的10个备份
      const filesToDelete = files.slice(10);
      filesToDelete.forEach(file => {
        fs.unlinkSync(path.join(this.backupDir, file.name));
      });
    } catch (error) {
      console.error('清理旧备份失败:', error);
    }
  }

  // 查找模块路径
  findModulePath(moduleName) {
    const searchDirs = [
      path.join(__dirname, '../modules_local'),
      path.join(__dirname, '../../Cloud_Modules'),
      path.join(__dirname, '..')
    ];
    
    for (const dir of searchDirs) {
      const potentialPath = path.join(dir, moduleName);
      if (fs.existsSync(potentialPath)) {
        return potentialPath;
      }
    }
    
    // 如果找不到，返回默认路径
    return path.join(__dirname, '../modules_local', moduleName);
  }

  // 查找最新备份
  findLatestBackup(moduleName) {
    try {
      const files = fs.readdirSync(this.backupDir)
        .filter(file => file.startsWith(moduleName) && file.includes('.bak.'))
        .map(file => ({
          name: file,
          mtime: fs.statSync(path.join(this.backupDir, file)).mtime.getTime()
        }))
        .sort((a, b) => b.mtime - a.mtime);
      
      return files.length > 0 ? path.join(this.backupDir, files[0].name) : null;
    } catch (error) {
      console.error('查找备份失败:', error);
      return null;
    }
  }

  // 版本比较
  compareVersions(newVersion, currentVersion) {
    const newVer = newVersion.replace('v', '').split('.').map(Number);
    const currVer = currentVersion.replace('v', '').split('.').map(Number);
    
    for (let i = 0; i < 3; i++) {
      if (newVer[i] > currVer[i]) return true;
      if (newVer[i] < currVer[i]) return false;
    }
    return false;
  }

  // 保存清单
  saveManifest() {
    try {
      fs.writeFileSync(this.manifestPath, JSON.stringify(this.manifest, null, 2), 'utf8');
    } catch (error) {
      console.error('保存清单失败:', error);
    }
  }

  // 发送更新通知
  notifyUpdate(moduleName, action, version) {
    if (this.manifest?.webhook) {
      const data = JSON.stringify({
        module: moduleName,
        action,
        version,
        timestamp: new Date().toISOString()
      });
      
      const options = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': data.length
        }
      };
      
      const req = https.request(this.manifest.webhook, options);
      req.write(data);
      req.end();
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

  // 获取更新历史
  getUpdateHistory() {
    try {
      const logs = fs.readFileSync(this.logPath, 'utf8').split('\n');
      return logs.filter(line => line.includes('✅') || line.includes('⚠️')).slice(-20).reverse();
    } catch (error) {
      return [];
    }
  }
}

// 导出模块
if (typeof module !== 'undefined') {
  module.exports = Updater;
}

// 示例使用
if (typeof require !== 'undefined' && require.main === module) {
  const updater = new Updater();
  console.log('✅ [JEV Plugin v2.0 Updater Initialized]');
}