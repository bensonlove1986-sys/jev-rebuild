// JEV Cloud Relay v11.0 - Analyzer Module
// 语义理解与客户意图识别

const fs = require('fs');
const path = require('path');

class RelayAnalyzer {
  constructor(config, logger) {
    this.config = config;
    this.logger = logger;
    this.intentKeywords = this.initializeKeywords();
    this.reportPath = path.join(__dirname, 'relay_analyze_report.json');
  }

  initializeKeywords() {
    return {
      inquiry: ['price', 'cost', 'how much', 'available', 'stock', '报价', '多少钱', '有货', '库存', '单价', '价格'],
      quotation: ['quote', 'quotation', 'formal price', 'offer', 'Quotation', '报价单', '正式报价', '价格单', '发报价'],
      order: ['order', 'purchase', 'buy', 'place order', '下单', '购买', '订单', '订购'],
      'after-sale': ['warranty', 'return', 'refund', 'problem', 'issue', 'defect', '售后', '保修', '退换', '问题', '故障'],
      consult: ['question', 'ask', 'consult', 'info', 'information', '咨询', '了解', '请问', '说明'],
      chitchat: ['hello', 'hi', 'hey', 'greeting', 'morning', 'afternoon', '晚上好', '你好', '嗨', '您好'],
      complaint: ['complain', 'complaint', 'bad', 'poor', 'terrible', '投诉', '不好', '很差', '糟糕'],
      'follow-up': ['tracking', 'status', 'progress', 'update', '跟进', '状态', '进度', '更新']
    };
  }

  async analyze(text) {
    try {
      if (!text || typeof text !== 'string') {
        throw new Error('无效的文本输入');
      }

      const lowerText = text.toLowerCase();
      const result = this.detectIntent(lowerText);
      
      // 记录分析结果
      this.logAnalysis(result, text);
      
      return result;
    } catch (error) {
      this.logger.logError('分析错误:', error);
      return this.getDefaultResult(text);
    }
  }

  detectIntent(text) {
    let maxScore = 0;
    let detectedIntent = 'consult'; // 默认意图
    const foundKeywords = [];

    // 遍历所有意图类型进行匹配
    for (const [intent, keywords] of Object.entries(this.intentKeywords)) {
      const score = this.calculateScore(text, keywords);
      const keywordsInText = keywords.filter(keyword => text.includes(keyword.toLowerCase()));
      
      if (score > maxScore) {
        maxScore = score;
        detectedIntent = intent;
        foundKeywords.length = 0;
        foundKeywords.push(...keywordsInText);
      } else if (score === maxScore && score > 0) {
        // 分数相同时，合并关键词
        foundKeywords.push(...keywordsInText);
      }
    }

    // 去重关键词
    const uniqueKeywords = [...new Set(foundKeywords)];
    
    return {
      intent: detectedIntent,
      keywords: uniqueKeywords,
      urgency: this.detectUrgency(text),
      recommended_action: this.getRecommendedAction(detectedIntent),
      confidence: Math.min(maxScore * 100, 100).toFixed(2) + '%',
      timestamp: new Date().toISOString()
    };
  }

  calculateScore(text, keywords) {
    let score = 0;
    const totalKeywords = keywords.length;
    
    if (totalKeywords === 0) return 0;

    // 统计匹配的关键词数量
    const matchedCount = keywords.filter(keyword => 
      text.toLowerCase().includes(keyword.toLowerCase())
    ).length;

    // 基础分数：匹配的关键词比例
    score = matchedCount / totalKeywords;

    // 特殊词加分
    const urgentWords = ['urgent', '紧急', 'quickly', '迅速', 'asap', '立即'];
    const urgentMatch = urgentWords.some(word => text.includes(word));
    if (urgentMatch) score += 0.2;

    return Math.min(score, 1.0);
  }

  detectUrgency(text) {
    const urgentWords = ['urgent', '紧急', 'quickly', '迅速', 'asap', '立即'];
    const mediumWords = ['soon', '尽快', 'within', '在...内', '等待'];

    if (urgentWords.some(word => text.includes(word))) {
      return 'high';
    } else if (mediumWords.some(word => text.includes(word))) {
      return 'medium';
    }
    return 'low';
  }

  getRecommendedAction(intent) {
    const actionMap = {
      inquiry: 'send quotation',
      quotation: 'prepare formal quote',
      order: 'process order',
      'after-sale': 'handle complaint',
      consult: 'provide information',
      chitchat: 'greet customer',
      complaint: 'escalate support',
      'follow-up': 'update status'
    };
    
    return actionMap[intent] || 'provide assistance';
  }

  getDefaultResult(text) {
    return {
      intent: 'consult',
      keywords: [],
      urgency: 'low',
      recommended_action: 'provide information',
      confidence: '0%',
      timestamp: new Date().toISOString()
    };
  }

  logAnalysis(result, originalText) {
    try {
      // 记录分析日志
      this.logger.logAI(`意图识别: ${result.intent}, 置信度: ${result.confidence}`);
      
      // 更新分析报告
      this.updateAnalysisReport(result);
      
      // 保存详细分析记录
      this.saveDetailedAnalysis(result, originalText);
    } catch (error) {
      this.logger.logError('记录分析结果失败:', error);
    }
  }

  updateAnalysisReport(result) {
    try {
      let report = {};
      
      // 读取现有报告
      if (fs.existsSync(this.reportPath)) {
        const existing = fs.readFileSync(this.reportPath, 'utf8');
        report = JSON.parse(existing);
      }
      
      // 更新统计信息
      report.last_analysis = result;
      report.total_analyses = (report.total_analyses || 0) + 1;
      report.intent_counts = report.intent_counts || {};
      report.intent_counts[result.intent] = (report.intent_counts[result.intent] || 0) + 1;
      report.timestamp = new Date().toISOString();
      
      // 保存报告
      fs.writeFileSync(this.reportPath, JSON.stringify(report, null, 2));
    } catch (error) {
      throw new Error('更新分析报告失败');
    }
  }

  saveDetailedAnalysis(result, originalText) {
    try {
      const analysisRecord = {
        text: originalText,
        analysis: result,
        timestamp: new Date().toISOString()
      };
      
      const logEntry = JSON.stringify(analysisRecord) + '\n';
      const logPath = path.join(__dirname, 'relay_analysis_log.txt');
      
      fs.appendFileSync(logPath, logEntry);
    } catch (error) {
      throw new Error('保存详细分析失败');
    }
  }

  // 批量分析文本
  async batchAnalyze(texts) {
    if (!Array.isArray(texts)) {
      throw new Error('输入必须是文本数组');
    }
    
    const results = await Promise.all(
      texts.map(text => this.analyze(text))
    );
    
    return {
      results: results,
      total: results.length,
      timestamp: new Date().toISOString()
    };
  }

  // 获取意图统计
  getIntentStatistics() {
    try {
      if (fs.existsSync(this.reportPath)) {
        const report = JSON.parse(fs.readFileSync(this.reportPath, 'utf8'));
        return report.intent_counts || {};
      }
      return {};
    } catch (error) {
      this.logger.logError('获取意图统计失败:', error);
      return {};
    }
  }

  // 自定义关键词（用于动态更新）
  updateKeywords(intent, keywords) {
    if (this.intentKeywords.hasOwnProperty(intent)) {
      this.intentKeywords[intent] = [...new Set([...this.intentKeywords[intent], ...keywords])];
      return true;
    }
    return false;
  }
}

module.exports = RelayAnalyzer;