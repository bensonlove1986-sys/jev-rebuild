// JEV AI Commerce Autopilot v13.5 - Core Engine
// 执行边界：STRICT / LOCK=ACTIVE / PATH_LOCK=TRUE

const fs = require('fs');
const path = require('path');

// 导入所有模块
const tracker = require('./autopilot_tracker');
const profiler = require('./autopilot_profiler');
const reminder = require('./autopilot_reminder');

// 加载配置
const configPath = path.join(__dirname, 'autopilot_config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

// 系统统计数据
let systemStats = {
  clients_tracked: 0,
  reminders_sent: 0,
  ai_replies_generated: 0,
  avg_response_time: "1.8h",
  deal_success_rate: "32%",
  learning_updates: 0,
  last_reset: new Date().toISOString()
};

// 核心自动成交引擎类
class AutopilotCore {
  constructor() {
    this.status = 'initializing';
    this.version = 'v13.5';
    this.modules = {};
    this.clients = new Map(); // 跟踪所有客户
    this.initialize();
  }

  // 初始化引擎
  initialize() {
    console.log('========================================');
    console.log('  JEV AI Commerce Autopilot v13.5      ');
    console.log('========================================');
    
    // 初始化各个模块
    this.modules = {
      tracker: tracker,
      profiler: profiler,
      reminder: reminder
    };
    
    console.log('[INFO] All modules loaded successfully');
    console.log(`[INFO] Supported languages: ${config.languages_supported.slice(0, 5).join(', ')}...`);
    console.log(`[INFO] Follow-up intervals: ${config.followup_intervals.join(', ')} hours`);
    console.log(`[INFO] Autopilot mode: ${config.autopilot_mode}`);
    console.log(`[INFO] Lock status: ${config.lock}`);
    
    this.status = 'online';
    this.updateReport();
    this.logActivity('SYSTEM_INITIALIZED', { version: this.version, lock: config.lock });
    
    // 启动定时任务
    this.startScheduledTasks();
    
    console.log('[INFO] Autopilot Core initialized successfully');
    console.log('========================================');
  }

  // 启动定时任务
  startScheduledTasks() {
    // 每小时检查一次需要跟进的客户
    setInterval(() => {
      this.checkFollowUpClients();
    }, 60 * 60 * 1000);
    
    // 每天重置统计
    setInterval(() => {
      const now = new Date();
      if (now.getHours() === 0 && now.getMinutes() === 0) {
        this.resetDailyStats();
      }
    }, 60000);
  }

  // 检查需要跟进的客户
  async checkFollowUpClients() {
    try {
      console.log('[INFO] Checking clients for follow-up...');
      
      // 在实际场景中，这里会从数据库或API获取客户列表
      const clients = this.getClientsForFollowUp();
      
      for (const client of clients) {
        // 生成提醒消息
        const shouldSendReminder = this.modules.tracker.shouldSendReminder(client);
        
        if (shouldSendReminder) {
          await this.modules.reminder.sendReminder(client);
          systemStats.reminders_sent++;
          console.log(`[INFO] Sent reminder to client: ${client.id}`);
        }
      }
      
      this.updateReport();
    } catch (error) {
      console.error(`[ERROR] Failed to check follow-up clients: ${error.message}`);
      this.logActivity('FOLLOWUP_ERROR', { error: error.message });
    }
  }

  // 获取需要跟进的客户（模拟数据）
  getClientsForFollowUp() {
    // 模拟返回几个客户数据
    return Array.from(this.clients.values()).filter(client => {
      const lastContact = new Date(client.last_contact);
      const now = new Date();
      const hoursSinceLastContact = (now - lastContact) / (1000 * 60 * 60);
      
      // 检查是否在跟进间隔内
      return config.followup_intervals.some(interval => {
        return hoursSinceLastContact >= interval && hoursSinceLastContact < interval + 1;
      });
    });
  }

  // 添加新客户到跟踪系统
  addClient(clientData) {
    try {
      // 生成客户画像
      const profile = this.modules.profiler.profileCustomer(clientData.chat_log || '');
      
      const client = {
        id: clientData.id || `client_${Date.now()}`,
        name: clientData.name,
        email: clientData.email,
        product: clientData.product,
        last_contact: new Date().toISOString(),
        contact_count: 1,
        profile: profile,
        status: 'NEW',
        deal_score: 'WARM',
        response_time: null,
        clicked_PI: false,
        message_count: clientData.chat_log ? clientData.chat_log.split('\n').length : 0
      };
      
      this.clients.set(client.id, client);
      systemStats.clients_tracked = this.clients.size;
      
      // 预测成交概率
      client.deal_score = this.modules.tracker.predictDealScore(client);
      
      this.logActivity('CLIENT_ADDED', { client_id: client.id, name: client.name });
      this.updateReport();
      
      return client;
    } catch (error) {
      console.error(`[ERROR] Failed to add client: ${error.message}`);
      this.logActivity('CLIENT_ADD_ERROR', { error: error.message });
      throw error;
    }
  }

  // 处理客户回复
  handleClientResponse(clientId, message) {
    try {
      const client = this.clients.get(clientId);
      if (!client) {
        throw new Error(`Client not found: ${clientId}`);
      }
      
      // 更新客户信息
      const now = new Date();
      const lastContact = new Date(client.last_contact);
      client.response_time = (now - lastContact) / (1000 * 60 * 60); // 小时
      client.last_contact = now.toISOString();
      client.contact_count++;
      client.message_count++;
      
      // 重新生成客户画像
      client.profile = this.modules.profiler.profileCustomer(message);
      
      // 更新成交预测
      client.deal_score = this.modules.tracker.predictDealScore(client);
      
      // 生成AI回复
      const aiReply = this.generateAIReply(client, message);
      systemStats.ai_replies_generated++;
      
      this.logActivity('CLIENT_RESPONSE', { client_id: clientId, response_length: message.length });
      this.updateReport();
      
      return {
        success: true,
        reply: aiReply,
        client_status: client.deal_score
      };
    } catch (error) {
      console.error(`[ERROR] Failed to handle client response: ${error.message}`);
      this.logActivity('RESPONSE_HANDLE_ERROR', { error: error.message });
      return {
        success: false,
        error: error.message
      };
    }
  }

  // 生成AI回复
  generateAIReply(client, message) {
    const status = client.deal_score;
    let reply = '';
    
    switch (status) {
      case 'HOT':
        reply = `Thank you for your interest in our ${client.product}, ${client.name}! I'd be happy to answer any questions you have or help you proceed with placing an order.`;
        break;
      case 'WARM':
        reply = `Hello ${client.name}, thank you for your response about the ${client.product}. Is there any specific aspect you'd like more information about?`;
        break;
      case 'COLD':
        reply = `Hi ${client.name}, just checking in regarding your inquiry about ${client.product}. If you have any questions or need assistance, please let me know.`;
        break;
    }
    
    return reply;
  }

  // 获取系统报告
  getSystemReport() {
    return {
      autopilot_status: this.status,
      ...systemStats,
      system_state: 'stable',
      version: this.version,
      lock: config.lock,
      last_updated: new Date().toISOString()
    };
  }

  // 更新报告文件
  updateReport() {
    const report = this.getSystemReport();
    const reportPath = path.join(__dirname, 'autopilot_report.json');
    
    try {
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    } catch (error) {
      console.error(`[ERROR] Failed to update report: ${error.message}`);
    }
  }

  // 记录活动日志
  logActivity(action, details) {
    const logPath = path.join(__dirname, 'autopilot_audit.log');
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${action} | ${JSON.stringify(details)}\n`;
    
    try {
      fs.appendFileSync(logPath, logEntry);
    } catch (error) {
      console.error(`[ERROR] Failed to log activity: ${error.message}`);
    }
  }

  // 重置每日统计
  resetDailyStats() {
    systemStats = {
      ...systemStats,
      reminders_sent: 0,
      ai_replies_generated: 0,
      last_reset: new Date().toISOString()
    };
    this.updateReport();
    this.logActivity('DAILY_STATS_RESET', {});
  }

  // 导出客户数据
  exportClientData() {
    return Array.from(this.clients.values());
  }
}

// 创建引擎实例
const autopilotCore = new AutopilotCore();

// 导出引擎实例
module.exports = autopilotCore;