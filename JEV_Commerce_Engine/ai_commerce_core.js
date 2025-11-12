// JEV Global AI Commerce Engine v13.0 - Core Engine
// 执行边界：STRICT / LOCK=ACTIVE / PATH_LOCK=TRUE

const fs = require('fs');
const path = require('path');

// 导入所有模块
const quoteEngine = require('./ai_quote_engine');
const profitPredictor = require('./ai_profit_predictor');
const invoiceGenerator = require('./ai_invoice_generator');
const currencyManager = require('./ai_currency_manager');

// 加载配置
const configPath = path.join(__dirname, 'commerce_config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

// 系统统计数据
let systemStats = {
  ai_quotes_today: 0,
  pi_generated: 0,
  invoices_generated: 0,
  profit_alerts: 0,
  ai_recommendations: 0,
  last_reset: new Date().toISOString()
};

// 核心商业引擎类
class CommerceEngine {
  constructor() {
    this.status = 'initializing';
    this.version = 'v13.0';
    this.modules = {};
    this.initialize();
  }

  // 初始化引擎
  initialize() {
    console.log('========================================');
    console.log('  JEV Global AI Commerce Engine v13.0  ');
    console.log('========================================');
    
    // 初始化各个模块
    this.modules = {
      quote: quoteEngine,
      profit: profitPredictor,
      invoice: invoiceGenerator,
      currency: currencyManager
    };
    
    console.log('[INFO] All modules loaded successfully');
    console.log(`[INFO] Supported currencies: ${config.supported_currencies.join(', ')}`);
    console.log(`[INFO] Default currency: ${config.default_currency}`);
    console.log(`[INFO] Lock status: ${config.lock}`);
    
    this.status = 'online';
    this.updateReport();
    this.logActivity('SYSTEM_INITIALIZED', { version: this.version, lock: config.lock });
    
    console.log('[INFO] Commerce Engine initialized successfully');
    console.log('========================================');
  }

  // 处理客户询价
  async processInquiry(inquiry) {
    try {
      // 增加询价统计
      systemStats.ai_quotes_today++;
      
      console.log(`[INFO] Processing inquiry: ${inquiry.substring(0, 60)}...`);
      
      // 生成报价
      const quote = await this.modules.quote.generateQuote(inquiry);
      
      if (quote.success) {
        // 分析报价
        const analysis = this.modules.quote.analyzeQuote(quote);
        
        // 预测成交率
        const conversionPrediction = this.modules.profit.predictConversionRate(
          quote, 
          quote.currency || config.default_currency
        );
        
        // 生成AI建议
        const aiRecommendation = this.generateAIRecommendation(quote, analysis, conversionPrediction);
        systemStats.ai_recommendations++;
        
        // 检查利润警报
        const margin = parseFloat(quote.profit_margin);
        if (margin < config.profit_alert_threshold) {
          systemStats.profit_alerts++;
        }
        
        this.updateReport();
        
        return {
          success: true,
          quote,
          analysis,
          conversion_prediction: conversionPrediction,
          ai_recommendation: aiRecommendation,
          timestamp: new Date().toISOString()
        };
      } else {
        return {
          success: false,
          error: quote.error,
          fallback_data: quote
        };
      }
    } catch (error) {
      console.error(`[ERROR] Failed to process inquiry: ${error.message}`);
      this.logActivity('INQUIRY_ERROR', { error: error.message });
      
      return {
        success: false,
        error: error.message
      };
    }
  }

  // 生成交易方案
  createDealProposal(customer, items, currency = config.default_currency) {
    try {
      // 计算成本和利润
      let totalCost = 0;
      const itemsWithProfit = items.map(item => {
        const cost = item.cost || (item.price * 0.7); // 假设成本是售价的70%
        totalCost += cost * item.qty;
        const profit = this.modules.profit.calculateProfit(
          cost,
          item.price,
          currency
        );
        
        return {
          ...item,
          cost,
          profit
        };
      });
      
      // 生成价格建议
      const priceSuggestions = this.modules.profit.suggestPriceRange(totalCost, currency);
      
      // 获取货币风险评估
      const currencyRisk = this.modules.currency.getCurrencyRiskAlert(currency);
      
      return {
        proposal_id: `PROP-${Date.now()}`,
        customer,
        items: itemsWithProfit,
        currency,
        price_suggestions: priceSuggestions,
        currency_risk: currencyRisk,
        timestamp: new Date().toISOString(),
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24小时后过期
      };
    } catch (error) {
      console.error(`[ERROR] Failed to create deal proposal: ${error.message}`);
      this.logActivity('PROPOSAL_ERROR', { error: error.message });
      throw error;
    }
  }

  // 生成PI
  generateProformaInvoice(customer, items) {
    try {
      const pi = this.modules.invoice.generatePI(customer, items);
      systemStats.pi_generated++;
      this.updateReport();
      
      // 生成HTML版本
      const html = this.modules.invoice.generateInvoiceHTML(pi);
      
      return {
        pi,
        html,
        download_link: `pi_${pi.invoice_id.toLowerCase().replace(/-/g, '_')}.html`
      };
    } catch (error) {
      console.error(`[ERROR] Failed to generate proforma invoice: ${error.message}`);
      this.logActivity('PI_GENERATION_ERROR', { error: error.message });
      throw error;
    }
  }

  // 生成正式发票
  generateCommercialInvoice(piData) {
    try {
      const invoice = this.modules.invoice.generateInvoice(piData);
      systemStats.invoices_generated++;
      this.updateReport();
      
      // 生成HTML版本
      const html = this.modules.invoice.generateInvoiceHTML(invoice);
      
      return {
        invoice,
        html,
        download_link: `invoice_${invoice.invoice_id.toLowerCase().replace(/-/g, '_')}.html`
      };
    } catch (error) {
      console.error(`[ERROR] Failed to generate commercial invoice: ${error.message}`);
      this.logActivity('INVOICE_GENERATION_ERROR', { error: error.message });
      throw error;
    }
  }

  // 生成AI建议话术
  generateAIRecommendation(quote, analysis, conversionPrediction) {
    const margin = parseFloat(quote.profit_margin);
    const conversionRate = parseFloat(conversionPrediction.predicted_conversion_rate);
    
    let opening = '';
    let pricingStrategy = '';
    let closing = '';
    
    // 根据利润率和成交率生成不同的话术
    if (conversionRate > 70) {
      opening = '客户对价格接受度高，建议直接报价';
    } else if (conversionRate < 50) {
      opening = '客户价格敏感度较高，建议强调产品价值';
    } else {
      opening = '客户有一定购买意向，可以正常推进';
    }
    
    if (margin > 40) {
      pricingStrategy = `利润率极佳(${quote.profit_margin})，可以考虑提供5-10%的折扣促进成交`;
    } else if (margin < config.profit_alert_threshold) {
      pricingStrategy = `利润率偏低(${quote.profit_margin})，建议尝试增加附加服务或调整最小订单量`;
    } else {
      pricingStrategy = `利润率适中(${quote.profit_margin})，价格策略合理`;
    }
    
    closing = '建议24小时内跟进客户，确认是否需要进一步调整方案';
    
    return {
      opening,
      pricing_strategy: pricingStrategy,
      closing,
      confidence: conversionPrediction.confidence_level,
      follow_up_time: '24小时内'
    };
  }

  // 获取系统报告
  getSystemReport() {
    return {
      commerce_status: this.status,
      ...systemStats,
      avg_margin: '28.5%', // 模拟数据
      currencies_active: config.supported_currencies.length,
      system_state: 'stable',
      version: this.version,
      lock: config.lock,
      last_updated: new Date().toISOString()
    };
  }

  // 更新报告文件
  updateReport() {
    const report = this.getSystemReport();
    const reportPath = path.join(__dirname, 'commerce_report.json');
    
    try {
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    } catch (error) {
      console.error(`[ERROR] Failed to update report: ${error.message}`);
    }
  }

  // 记录活动日志
  logActivity(action, details) {
    const logPath = path.join(__dirname, 'commerce_audit.log');
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
      ai_quotes_today: 0,
      pi_generated: 0,
      invoices_generated: 0,
      profit_alerts: 0,
      ai_recommendations: 0,
      last_reset: new Date().toISOString()
    };
    this.updateReport();
    this.logActivity('DAILY_STATS_RESET', {});
  }
}

// 创建引擎实例
const commerceEngine = new CommerceEngine();

// 设置每日重置统计
setInterval(() => {
  const now = new Date();
  if (now.getHours() === 0 && now.getMinutes() === 0) {
    commerceEngine.resetDailyStats();
  }
}, 60000); // 每分钟检查一次

// 导出引擎实例
module.exports = commerceEngine;