// JEV Plugin v2.0 - 自动报警模块
const fs = require('fs');
const path = require('path');

class AlertEngine {
  constructor() {
    this.alertLogPath = path.join(__dirname, 'alerts_log.txt');
    this.alertCache = new Map(); // 用于去重，记录最近30分钟的报警
    this.initAlertLog();
  }

  // 初始化报警日志文件
  initAlertLog() {
    if (!fs.existsSync(this.alertLogPath)) {
      fs.writeFileSync(this.alertLogPath, '=== JEV Plugin v2.0 报警与异常日志 ===\n\n', 'utf8');
    }
  }

  // 通用报警接口
  async sendAlert(type, message, data = {}) {
    // 检查是否在30分钟冷却期内
    const cacheKey = `${type}:${message.substring(0, 50)}`;
    const now = Date.now();
    const lastAlertTime = this.alertCache.get(cacheKey);
    
    if (lastAlertTime && (now - lastAlertTime) < 30 * 60 * 1000) {
      console.log(`[报警冷却] ${message}`);
      return { success: false, reason: 'cooling_period' };
    }

    // 记录到缓存
    this.alertCache.set(cacheKey, now);
    
    // 记录到日志
    const timestamp = new Date().toLocaleString('zh-CN');
    const logMessage = `[${timestamp}] ⚠️ [${type}] ${message}`;
    this.logAlert(logMessage);
    
    // 发送到各个渠道
    const promises = [];
    
    // 发送邮件
    promises.push(this.sendEmail(type, message, data));
    
    // 发送Webhook
    promises.push(this.sendWebhook(type, message, data));
    
    // 发送WhatsApp
    promises.push(this.sendWhatsApp(type, message, data));
    
    try {
      await Promise.all(promises);
      return { success: true };
    } catch (error) {
      console.error('报警发送失败:', error);
      return { success: false, error: error.message };
    }
  }

  // 记录报警到日志文件
  logAlert(message) {
    try {
      fs.appendFileSync(this.alertLogPath, message + '\n', 'utf8');
      console.log(message);
    } catch (error) {
      console.error('写入报警日志失败:', error);
    }
  }

  // 发送邮件报警
  async sendEmail(type, message, data) {
    try {
      // 模拟邮件发送
      console.log(`[邮件] 发送至 admin@jevshop.com: [${type}] ${message}`);
      // 实际环境中这里应该集成真实的邮件发送库
      return { channel: 'email', success: true };
    } catch (error) {
      console.error('邮件发送失败:', error);
      return { channel: 'email', success: false, error: error.message };
    }
  }

  // 发送Webhook报警
  async sendWebhook(type, message, data) {
    try {
      const webhookUrl = 'https://control.jevshop.workers.dev/api/alert';
      const payload = {
        type,
        message,
        data,
        timestamp: new Date().toISOString()
      };
      
      // 模拟HTTP请求
      console.log(`[Webhook] POST 到 ${webhookUrl}`, JSON.stringify(payload));
      // 实际环境中这里应该使用axios或fetch发送HTTP请求
      return { channel: 'webhook', success: true };
    } catch (error) {
      console.error('Webhook发送失败:', error);
      return { channel: 'webhook', success: false, error: error.message };
    }
  }

  // 发送WhatsApp报警
  async sendWhatsApp(type, message, data) {
    try {
      // 模拟WhatsApp API调用
      console.log(`[WhatsApp] 通过DAOJIE API推送: [${type}] ${message}`);
      // 实际环境中这里应该集成真实的WhatsApp API
      return { channel: 'whatsapp', success: true };
    } catch (error) {
      console.error('WhatsApp发送失败:', error);
      return { channel: 'whatsapp', success: false, error: error.message };
    }
  }

  // 清理过期的报警缓存
  cleanupCache() {
    const now = Date.now();
    for (const [key, timestamp] of this.alertCache.entries()) {
      if (now - timestamp > 30 * 60 * 1000) {
        this.alertCache.delete(key);
      }
    }
  }

  // 获取最近的报警记录
  getRecentAlerts(count = 10) {
    try {
      const logs = fs.readFileSync(this.alertLogPath, 'utf8').split('\n');
      const alerts = logs.filter(line => line.startsWith('[') && line.includes('⚠️'));
      return alerts.slice(-count).reverse();
    } catch (error) {
      console.error('读取报警记录失败:', error);
      return [];
    }
  }
}

// 导出模块
if (typeof module !== 'undefined') {
  module.exports = AlertEngine;
} else {
  // 浏览器环境
  window.AlertEngine = AlertEngine;
}

// 示例使用
if (typeof require !== 'undefined' && require.main === module) {
  const engine = new AlertEngine();
  engine.sendAlert('ERR_TEST', '测试报警消息', { test: true });
}