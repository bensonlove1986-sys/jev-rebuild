// JEV Global AI Commerce Engine v13.0 - AI Currency Manager
// 执行边界：STRICT / LOCK=ACTIVE / PATH_LOCK=TRUE

const fs = require('fs');
const path = require('path');

// 加载配置
const configPath = path.join(__dirname, 'commerce_config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

// 模拟实时汇率数据
let exchangeRates = {
  'USD': 1.0,
  'RMB': 7.25,
  'INR': 83.50,
  'BDT': 109.50,
  'PKR': 285.00,
  'VND': 24800.00,
  'DZD': 139.50,
  'EUR': 0.92
};

// 汇率历史记录（用于趋势分析）
let rateHistory = [];

// 货币符号映射
const currencySymbols = {
  'USD': '$',
  'RMB': '¥',
  'INR': '₹',
  'BDT': '৳',
  'PKR': '₨',
  'VND': '₫',
  'DZD': 'دج',
  'EUR': '€'
};

// 货币名称映射
const currencyNames = {
  'USD': 'US Dollar',
  'RMB': 'Chinese Yuan',
  'INR': 'Indian Rupee',
  'BDT': 'Bangladeshi Taka',
  'PKR': 'Pakistani Rupee',
  'VND': 'Vietnamese Dong',
  'DZD': 'Algerian Dinar',
  'EUR': 'Euro'
};

// 更新汇率（模拟实时更新）
function updateExchangeRates() {
  console.log('[INFO] Updating exchange rates...');
  
  // 模拟汇率波动（±2%范围内）
  Object.keys(exchangeRates).forEach(currency => {
    if (currency !== 'USD') { // USD作为基准货币，保持不变
      const fluctuation = (Math.random() - 0.5) * 0.04; // ±2%
      exchangeRates[currency] = exchangeRates[currency] * (1 + fluctuation);
    }
  });
  
  // 记录历史数据
  const timestamp = new Date().toISOString();
  rateHistory.push({
    timestamp,
    rates: { ...exchangeRates }
  });
  
  // 保留最近100条历史记录
  if (rateHistory.length > 100) {
    rateHistory = rateHistory.slice(-100);
  }
  
  // 记录更新日志
  logActivity('EXCHANGE_RATES_UPDATED', {
    timestamp,
    base_currency: 'USD'
  });
  
  return exchangeRates;
}

// 货币转换
function convertCurrency(amount, fromCurrency, toCurrency) {
  if (!exchangeRates[fromCurrency] || !exchangeRates[toCurrency]) {
    throw new Error(`不支持的货币类型: ${fromCurrency} 或 ${toCurrency}`);
  }
  
  // 先转换为USD，再转换为目标货币
  const amountInUSD = amount / exchangeRates[fromCurrency];
  const convertedAmount = amountInUSD * exchangeRates[toCurrency];
  
  return {
    from_amount: parseFloat(amount).toFixed(2),
    from_currency: fromCurrency,
    to_amount: convertedAmount.toFixed(2),
    to_currency: toCurrency,
    exchange_rate: (exchangeRates[toCurrency] / exchangeRates[fromCurrency]).toFixed(4),
    timestamp: new Date().toISOString()
  };
}

// 获取所有支持的货币
function getSupportedCurrencies() {
  return config.supported_currencies.map(currency => ({
    code: currency,
    symbol: currencySymbols[currency],
    name: currencyNames[currency],
    rate_to_usd: exchangeRates[currency].toFixed(4)
  }));
}

// 分析汇率趋势
function analyzeRateTrend(baseCurrency, targetCurrency, days = 7) {
  // 由于是模拟环境，我们生成一些随机趋势数据
  const now = new Date();
  const trendData = [];
  
  for (let i = days; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    
    // 生成随机但有趋势的数据
    const baseRate = exchangeRates[targetCurrency] / exchangeRates[baseCurrency];
    const variation = (Math.sin(i / 2) * 0.01) + ((Math.random() - 0.5) * 0.005);
    const rate = baseRate * (1 + variation);
    
    trendData.push({
      date: date.toISOString().split('T')[0],
      rate: rate.toFixed(4),
      change_percent: ((variation) * 100).toFixed(2)
    });
  }
  
  // 分析趋势
  const latestRate = parseFloat(trendData[trendData.length - 1].rate);
  const oldestRate = parseFloat(trendData[0].rate);
  const overallChange = ((latestRate - oldestRate) / oldestRate) * 100;
  
  let trendDirection = 'stable';
  let recommendation = '';
  
  if (overallChange > 1) {
    trendDirection = 'upward';
    recommendation = `${targetCurrency} 相对 ${baseCurrency} 升值，建议考虑锁定当前汇率或加速收款`;
  } else if (overallChange < -1) {
    trendDirection = 'downward';
    recommendation = `${targetCurrency} 相对 ${baseCurrency} 贬值，建议等待更有利的汇率再进行兑换`;
  } else {
    recommendation = `汇率相对稳定，可根据业务需求进行兑换`;
  }
  
  return {
    base_currency: baseCurrency,
    target_currency: targetCurrency,
    trend_direction: trendDirection,
    overall_change_percent: overallChange.toFixed(2),
    latest_rate: latestRate.toFixed(4),
    recommendation,
    trend_data: trendData
  };
}

// 获取汇率风险提示
function getCurrencyRiskAlert(currency) {
  // 模拟风险评估
  const volatilityScores = {
    'USD': 2,
    'EUR': 3,
    'RMB': 2,
    'INR': 4,
    'BDT': 5,
    'PKR': 6,
    'VND': 4,
    'DZD': 5
  };
  
  const score = volatilityScores[currency] || 3;
  let riskLevel = 'low';
  let alertMessage = '';
  
  if (score >= 5) {
    riskLevel = 'high';
    alertMessage = `${currency} 汇率波动较大，建议采取风险对冲措施`;
  } else if (score >= 3) {
    riskLevel = 'medium';
    alertMessage = `${currency} 汇率有一定波动性，建议定期监控`;
  } else {
    riskLevel = 'low';
    alertMessage = `${currency} 汇率相对稳定`;
  }
  
  return {
    currency,
    risk_level: riskLevel,
    volatility_score: score,
    alert_message: alertMessage,
    recommendation: riskLevel === 'high' ? '考虑使用远期合约锁定汇率' : '常规监控即可'
  };
}

// 格式化带货币符号的金额
function formatCurrency(amount, currency) {
  const symbol = currencySymbols[currency] || currency;
  const formattedAmount = parseFloat(amount).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  
  // 根据货币习惯放置符号
  const symbolAfter = ['DZD'];
  if (symbolAfter.includes(currency)) {
    return `${formattedAmount} ${symbol}`;
  } else {
    return `${symbol}${formattedAmount}`;
  }
}

// 日志记录
function logActivity(action, details) {
  const logPath = path.join(__dirname, 'commerce_audit.log');
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ${action} | ${JSON.stringify(details)}\n`;
  
  try {
    fs.appendFileSync(logPath, logEntry);
    console.log(`[LOG] ${action} recorded`);
  } catch (error) {
    console.error(`[ERROR] Failed to log activity: ${error.message}`);
  }
}

// 初始化时更新一次汇率
updateExchangeRates();

// 设置定时更新汇率（每小时）
setInterval(updateExchangeRates, 3600000);

// 导出模块
module.exports = {
  convertCurrency,
  getSupportedCurrencies,
  analyzeRateTrend,
  getCurrencyRiskAlert,
  formatCurrency,
  updateExchangeRates,
  exchangeRates
};