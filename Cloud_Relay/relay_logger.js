// JEV Cloud Relay v11.0 - Logger Module
// 系统日志与请求追踪

const fs = require('fs');
const path = require('path');

class RelayLogger {
  constructor(config) {
    this.config = config;
    this.logPath = config.log_path || './relay_log.txt';
    this.securityLogPath = config.security_log_path || './relay_security_log.txt';
    this.logLevels = ['debug', 'info', 'warn', 'error'];
    this.currentLevel = 'info';
    this.logRotationSize = 10 * 1024 * 1024; // 10MB
    this.consoleLogging = true;
    
    // 确保日志目录存在
    this.ensureLogDirectory();
  }

  ensureLogDirectory() {
    const logDir = path.dirname(this.logPath);
    if (logDir && !fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    
    const securityLogDir = path.dirname(this.securityLogPath);
    if (securityLogDir && !fs.existsSync(securityLogDir)) {
      fs.mkdirSync(securityLogDir, { recursive: true });
    }
  }

  generateLogEntry(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const entry = {
      timestamp: timestamp,
      level: level,
      message: message
    };
    
    if (data) {
      entry.data = data;
    }
    
    return JSON.stringify(entry);
  }

  writeToLogFile(filePath, entry) {
    try {
      // 检查文件大小，进行日志轮转
      this.checkLogRotation(filePath);
      
      fs.appendFileSync(filePath, entry + '\n', 'utf8');
    } catch (error) {
      console.error('写入日志失败:', error);
    }
  }

  checkLogRotation(filePath) {
    try {
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        if (stats.size > this.logRotationSize) {
          const rotatedPath = filePath + '.' + new Date().getTime() + '.bak';
          fs.renameSync(filePath, rotatedPath);
          this.consoleLog('warn', `日志已轮转: ${filePath} → ${rotatedPath}`);
        }
      }
    } catch (error) {
      console.error('日志轮转失败:', error);
    }
  }

  consoleLog(level, message, data = null) {
    if (!this.consoleLogging) return;
    
    const logLevelIndex = this.logLevels.indexOf(level);
    const currentLevelIndex = this.logLevels.indexOf(this.currentLevel);
    
    if (logLevelIndex >= currentLevelIndex) {
      const timestamp = new Date().toISOString();
      const color = this.getLevelColor(level);
      
      console.log(
        `${color}[${timestamp}] [${level.toUpperCase()}] ${message}${data ? ' ' + JSON.stringify(data) : ''}\x1b[0m`
      );
    }
  }

  getLevelColor(level) {
    const colors = {
      debug: '\x1b[36m', // Cyan
      info: '\x1b[32m',  // Green
      warn: '\x1b[33m',  // Yellow
      error: '\x1b[31m'  // Red
    };
    return colors[level] || '\x1b[0m';
  }

  // 系统日志
  logSystem(message, data = null) {
    const entry = this.generateLogEntry('info', `[SYSTEM] ${message}`, data);
    this.writeToLogFile(this.logPath, entry);
    this.consoleLog('info', `[SYSTEM] ${message}`, data);
  }

  // Relay日志
  logRelay(message, data = null) {
    const entry = this.generateLogEntry('info', `[RELAY] ${message}`, data);
    this.writeToLogFile(this.logPath, entry);
    this.consoleLog('info', `[RELAY] ${message}`, data);
  }

  // AI日志
  logAI(message, data = null) {
    const entry = this.generateLogEntry('info', `[AI] ${message}`, data);
    this.writeToLogFile(this.logPath, entry);
    this.consoleLog('info', `[AI] ${message}`, data);
  }

  // 错误日志
  logError(message, error = null) {
    const data = error ? {
      message: error.message,
      stack: error.stack
    } : null;
    
    const entry = this.generateLogEntry('error', `[ERROR] ${message}`, data);
    this.writeToLogFile(this.logPath, entry);
    this.consoleLog('error', `[ERROR] ${message}`, data);
  }

  // 安全日志
  logSecurity(message, data = null) {
    const entry = this.generateLogEntry('warn', `[SECURITY] ${message}`, data);
    this.writeToLogFile(this.securityLogPath, entry);
    this.writeToLogFile(this.logPath, entry);
    this.consoleLog('warn', `[SECURITY] ${message}`, data);
  }

  // 分析日志
  logAnalytics(message, data = null) {
    const entry = this.generateLogEntry('info', `[ANALYTICS] ${message}`, data);
    this.writeToLogFile(this.logPath, entry);
    this.consoleLog('debug', `[ANALYTICS] ${message}`, data);
  }

  // 调试日志
  logDebug(message, data = null) {
    const entry = this.generateLogEntry('debug', `[DEBUG] ${message}`, data);
    this.writeToLogFile(this.logPath, entry);
    this.consoleLog('debug', `[DEBUG] ${message}`, data);
  }

  // 设置日志级别
  setLogLevel(level) {
    if (this.logLevels.includes(level)) {
      this.currentLevel = level;
      this.logSystem(`日志级别已设置为: ${level}`);
      return true;
    }
    return false;
  }

  // 启用/禁用控制台日志
  setConsoleLogging(enabled) {
    this.consoleLogging = enabled;
    this.logSystem(`控制台日志已${enabled ? '启用' : '禁用'}`);
  }

  // 获取日志统计
  getLogStatistics() {
    try {
      if (fs.existsSync(this.logPath)) {
        const logContent = fs.readFileSync(this.logPath, 'utf8');
        const lines = logContent.split('\n').filter(line => line.trim());
        const stats = {
          total_lines: lines.length,
          level_counts: {},
          last_updated: new Date().toISOString()
        };

        // 统计各级别日志数量
        lines.forEach(line => {
          try {
            const entry = JSON.parse(line);
            if (entry.level) {
              stats.level_counts[entry.level] = (stats.level_counts[entry.level] || 0) + 1;
            }
          } catch (e) {
            // 忽略无效的日志行
          }
        });

        return stats;
      }
      return { total_lines: 0, level_counts: {}, last_updated: new Date().toISOString() };
    } catch (error) {
      this.logError('获取日志统计失败:', error);
      return { error: error.message };
    }
  }

  // 清理旧日志
  cleanOldLogs(days = 7) {
    try {
      const cutoffTime = Date.now() - (days * 24 * 60 * 60 * 1000);
      const logDir = path.dirname(this.logPath);
      
      if (fs.existsSync(logDir)) {
        const files = fs.readdirSync(logDir);
        files.forEach(file => {
          if (file.startsWith('relay_log') && file.endsWith('.bak')) {
            const filePath = path.join(logDir, file);
            const stats = fs.statSync(filePath);
            
            if (stats.mtimeMs < cutoffTime) {
              fs.unlinkSync(filePath);
              this.logSystem(`已删除旧日志: ${file}`);
            }
          }
        });
      }
      
      return { success: true, message: `已清理${days}天前的日志` };
    } catch (error) {
      this.logError('清理旧日志失败:', error);
      return { success: false, error: error.message };
    }
  }

  // 导出日志
  exportLogs(startTime = null, endTime = null) {
    try {
      if (!fs.existsSync(this.logPath)) {
        return { success: false, error: '日志文件不存在' };
      }

      const logContent = fs.readFileSync(this.logPath, 'utf8');
      const lines = logContent.split('\n').filter(line => line.trim());
      let filteredLines = lines;

      // 按时间范围过滤
      if (startTime || endTime) {
        filteredLines = lines.filter(line => {
          try {
            const entry = JSON.parse(line);
            const entryTime = new Date(entry.timestamp).getTime();
            
            if (startTime && entryTime < startTime) return false;
            if (endTime && entryTime > endTime) return false;
            
            return true;
          } catch (e) {
            return false;
          }
        });
      }

      const exportPath = this.logPath + '.export.' + Date.now() + '.json';
      fs.writeFileSync(exportPath, JSON.stringify(filteredLines, null, 2));

      return { success: true, export_path: exportPath, line_count: filteredLines.length };
    } catch (error) {
      this.logError('导出日志失败:', error);
      return { success: false, error: error.message };
    }
  }

  // 记录API请求
  logAPIRequest(method, url, statusCode, responseTime) {
    const data = {
      method: method,
      url: url,
      status_code: statusCode,
      response_time: responseTime + 'ms'
    };
    
    this.logRelay(`API请求: ${method} ${url} ${statusCode}`, data);
  }

  // 记录性能指标
  logPerformance(operation, durationMs) {
    const data = {
      operation: operation,
      duration_ms: durationMs
    };
    
    this.logAnalytics(`性能指标: ${operation}`, data);
  }
}

module.exports = RelayLogger;