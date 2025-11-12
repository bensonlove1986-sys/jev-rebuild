// JEV Global AI Commerce Engine v13.0 - AI Profit Predictor
// 执行边界：STRICT / LOCK=ACTIVE / PATH_LOCK=TRUE

const fs = require('fs');
const path = require('path');

// 加载配置
const configPath = path.join(__dirname, 'commerce_config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

// 汇率数据（模拟实时汇率）
const exchangeRates = {
  'USD': 1.0,
  'RMB': 7.25,
  'INR': 83.50,
  'BDT': 109.50,
  'PKR': 285.00,
  'VND': 24800.00,
  'DZD': 139.50,
  'EUR': 0.92
};

// 历史成交率数据（模拟）
const historicalConversionRates = {
  'USD': 0.68,
  'RMB': 0.72,
  'INR': 0.58,
  'BDT': 0.62,
  'PKR': 0.55,
  'VND': 0.60,
  'DZD': 0.48,
  'EUR': 0.75
};

// 计算利润率
function calculateProfit(cost, sell, currency) {
  if (cost <= 0 || sell <= 0) {
    throw new Error('成本和售价必须大于0');
  }
  
  const margin = ((sell - cost) / cost) * 100;
  const suggestion = margin < 15 ? "⚠️ 利润偏低" : margin > 40 ? "✅ 极佳" : "🟡 可接受";
  
  return { 
    margin: margin.toFixed(2) + "%", 
    suggestion, 
    currency,
    profit_amount: (sell - cost).toFixed(2)
  };
}

// 预测成交概率
function predictConversionRate(quote, currency) {
  const baseRate = historicalConversionRates[currency] || 0.60;
  const margin = parseFloat(quote.profit_margin || '20');
  
  // 利润率对成交率的影响
  let conversionFactor = 1.0;
  if (margin < 10) {
    conversionFactor = 1.15; // 低价提高成交率
  } else if (margin > 50) {
    conversionFactor = 0.85; // 高价降低成交率
  }
  
  // 计算最终成交率
  const predictedRate = (baseRate * conversionFactor * 100).toFixed(1);
  
  let confidenceLevel = "中等";
  if (predictedRate > 70) {
    confidenceLevel = "高";
  } else if (predictedRate < 50) {
    confidenceLevel = "低";
  }
  
  return {
    predicted_conversion_rate: predictedRate + '%',
    confidence_level: confidenceLevel,
    base_conversion_rate: (baseRate * 100).toFixed(1) + '%'
  };
}

// 多币种利润换算
function convertProfit(amount, fromCurrency, toCurrency) {
  if (!exchangeRates[fromCurrency] || !exchangeRates[toCurrency]) {
    throw new Error('不支持的货币类型');
  }
  
  // 先转换为USD，再转换为目标货币
  const amountInUSD = amount / exchangeRates[fromCurrency];
  const amountInTargetCurrency = amountInUSD * exchangeRates[toCurrency];
  
  return {
    from_amount: parseFloat(amount).toFixed(2),
    from_currency: fromCurrency,
    to_amount: amountInTargetCurrency.toFixed(2),
    to_currency: toCurrency,
    exchange_rate: (exchangeRates[toCurrency] / exchangeRates[fromCurrency]).toFixed(4)
  };
}

// 生成价格建议
function suggestPriceRange(cost, currency) {
  const minProfitMargin = config.profit_alert_threshold || 10;
  const maxProfitMargin = 50;
  
  const minPrice = cost * (1 + minProfitMargin / 100);
  const optimalPrice = cost * (1 + 30 / 100); // 30%利润率作为最佳
  const maxPrice = cost * (1 + maxProfitMargin / 100);
  
  return {
    cost_price: cost.toFixed(2),
    min_suggested_price: minPrice.toFixed(2),
    optimal_price: optimalPrice.toFixed(2),
    max_suggested_price: maxPrice.toFixed(2),
    currency,
    min_profit_margin: minProfitMargin + '%',
    optimal_profit_margin: '30%',
    max_profit_margin: maxProfitMargin + '%'
  };
}

// 分析市场竞争情况（模拟）
function analyzeMarketCompetition(productType, country) {
  // 模拟市场竞争数据
  const competitionData = {
    'electronics': { 'CN': 'high', 'IN': 'medium', 'BD': 'medium', 'PK': 'low', 'US': 'high' },
    'textiles': { 'CN': 'high', 'IN': 'high', 'BD': 'high', 'PK': 'medium', 'US': 'low' },
    'machinery': { 'CN': 'medium', 'IN': 'low', 'BD': 'low', 'PK': 'low', 'US': 'medium' },
    'consumer': { 'CN': 'high', 'IN': 'medium', 'BD': 'medium', 'PK': 'medium', 'US': 'high' }
  };
  
  const competitionLevel = competitionData[productType]?.[country] || 'medium';
  
  let pricingStrategy = '';
  switch (competitionLevel) {
    case 'high':
      pricingStrategy = '采用竞争价格策略，利润率控制在15-25%';
      break;
    case 'medium':
      pricingStrategy = '采用均衡价格策略，利润率控制在25-35%';
      break;
    case 'low':
      pricingStrategy = '采用价值定价策略，利润率可控制在35-50%';
      break;
  }
  
  return {
    product_type: productType,
    country: country,
    competition_level: competitionLevel,
    pricing_strategy: pricingStrategy,
    market_advice: `当前市场竞争${competitionLevel === 'high' ? '激烈' : competitionLevel === 'medium' ? '适中' : '较小'}，${pricingStrategy}`
  };
}

// 导出模块
module.exports = {
  calculateProfit,
  predictConversionRate,
  convertProfit,
  suggestPriceRange,
  analyzeMarketCompetition,
  exchangeRates
};