// JEV AI Commerce Autopilot v13.5 - Order Tracker
// 执行边界：STRICT / LOCK=ACTIVE / PATH_LOCK=TRUE

const fs = require('fs');
const path = require('path');

// 加载配置
const configPath = path.join(__dirname, 'autopilot_config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

// 订单追踪模块
class OrderTracker {
  constructor() {
    this.trackingData = new Map();
    this.learningModels = {};
    this.initializeLearningModels();
  }

  // 初始化学习模型
  initializeLearningModels() {
    // 模拟学习模型数据
    this.learningModels = {
      response_time_weight: 0.3,
      message_count_weight: 0.2,
      pi_click_weight: 0.4,
      contact_count_weight: 0.1
    };
  }

  // 预测成交分数
  predictDealScore(history) {
    let score = 50; // 基础分
    
    // 分析各种因素对成交的影响
    if (history.response_time && history.response_time < 5) {
      score += 20; // 快速回复加20分
    }
    
    if (history.message_count > 10) {
      score += 10; // 消息量大加10分
    }
    
    if (history.clicked_PI) {
      score += 15; // 点击PI加15分
    }
    
    if (history.contact_count > 3) {
      score += 10; // 多次联系加10分
    }
    
    // 根据得分确定客户状态
    if (score > 70) return "HOT";
    else if (score > 50) return "WARM";
    else return "COLD";
  }

  // 判断是否应该发送提醒
  shouldSendReminder(client) {
    const lastContact = new Date(client.last_contact);
    const now = new Date();
    const hoursSinceLastContact = (now - lastContact) / (1000 * 60 * 60);
    
    // 检查是否在配置的跟进间隔内
    return config.followup_intervals.some(interval => {
      return hoursSinceLastContact >= interval && 
             hoursSinceLastContact < interval + 1 && 
             client.status !== 'CLOSED' && 
             client.status !== 'COMPLETED';
    });
  }

  // 更新客户状态
  updateClientStatus(clientId, status) {
    if (this.trackingData.has(clientId)) {
      const data = this.trackingData.get(clientId);
      data.status = status;
      data.last_update = new Date().toISOString();
      this.trackingData.set(clientId, data);
      return true;
    }
    return false;
  }

  // 记录PI查看
  recordPIClick(clientId) {
    if (this.trackingData.has(clientId)) {
      const data = this.trackingData.get(clientId);
      data.clicked_PI = true;
      data.pi_click_time = new Date().toISOString();
      this.trackingData.set(clientId, data);
    }
  }

  // 获取客户跟踪历史
  getTrackingHistory(clientId) {
    return this.trackingData.get(clientId) || null;
  }

  // 分析成交失败原因
  analyzeFailedDeal(clientId, clientHistory) {
    const reasons = [];
    
    // 分析各种失败因素
    if (clientHistory.response_time > 24) {
      reasons.push("Slow response time");
    }
    
    if (clientHistory.message_count < 5) {
      reasons.push("Insufficient communication");
    }
    
    if (!clientHistory.clicked_PI) {
      reasons.push("PI not viewed");
    }
    
    return {
      client_id: clientId,
      failure_reasons: reasons,
      suggestions: this.generateImprovementSuggestions(reasons)
    };
  }

  // 生成改进建议
  generateImprovementSuggestions(failureReasons) {
    const suggestions = [];
    
    if (failureReasons.includes("Slow response time")) {
      suggestions.push("Try to respond within 2 hours for new inquiries");
    }
    
    if (failureReasons.includes("Insufficient communication")) {
      suggestions.push("Ask more open-ended questions to understand client needs");
    }
    
    if (failureReasons.includes("PI not viewed")) {
      suggestions.push("Highlight the PI link and explain its importance");
    }
    
    return suggestions;
  }

  // 学习成功成交的模式
  learnFromSuccessfulDeals(successfulClients) {
    // 模拟学习过程
    console.log(`[INFO] Learning from ${successfulClients.length} successful deals`);
    
    // 更新学习模型权重
    this.learningModels.response_time_weight += 0.01;
    
    // 记录学习更新
    return {
      update_time: new Date().toISOString(),
      successful_count: successfulClients.length,
      model_version: "v1.1"
    };
  }

  // 获取预测报告
  getPredictionReport() {
    const hotCount = Array.from(this.trackingData.values()).filter(d => 
      d.deal_score === 'HOT'
    ).length;
    
    const warmCount = Array.from(this.trackingData.values()).filter(d => 
      d.deal_score === 'WARM'
    ).length;
    
    const coldCount = Array.from(this.trackingData.values()).filter(d => 
      d.deal_score === 'COLD'
    ).length;
    
    return {
      hot_clients: hotCount,
      warm_clients: warmCount,
      cold_clients: coldCount,
      total_clients: hotCount + warmCount + coldCount,
      prediction_accuracy: "78%", // 模拟数据
      last_updated: new Date().toISOString()
    };
  }
}

// 创建并导出跟踪器实例
const tracker = new OrderTracker();

// 导出关键函数
module.exports = {
  predictDealScore: tracker.predictDealScore.bind(tracker),
  shouldSendReminder: tracker.shouldSendReminder.bind(tracker),
  updateClientStatus: tracker.updateClientStatus.bind(tracker),
  recordPIClick: tracker.recordPIClick.bind(tracker),
  analyzeFailedDeal: tracker.analyzeFailedDeal.bind(tracker),
  learnFromSuccessfulDeals: tracker.learnFromSuccessfulDeals.bind(tracker),
  getPredictionReport: tracker.getPredictionReport.bind(tracker)
};