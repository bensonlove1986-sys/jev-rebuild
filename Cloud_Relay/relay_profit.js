// JEV Cloud Relay v11.0 - Profit Module
// 报价与利润计算模块

const fs = require('fs');
const path = require('path');
const https = require('https');

class RelayProfit {
  constructor(config, logger) {
    this.config = config;
    this.logger = logger;
    this.profitLogPath = config.profit_log_path || './relay_profit_log.txt';
    this.productDatabase = this.initializeProductDatabase();
    this.exchangeRates = this.initializeExchangeRates();
    this.piTemplatePath = path.join(__dirname, 'templates', 'pi_template.html');
  }

  initializeProductDatabase() {
    // 初始化产品数据库（实际应用中应从Worker或数据库获取）
    return {
      'E2E-X3D1-N': { buy_price: 1.25, category: 'sensor', stock: 1000 },
      'FX3U-16MR': { buy_price: 230.50, category: 'plc', stock: 50 },
      'C-200': { buy_price: 45.75, category: 'controller', stock: 200 },
      'E5CC-RX2ASM-800': { buy_price: 89.90, category: 'temperature', stock: 150 },
      'GV2-ME16C': { buy_price: 56.20, category: 'motor', stock: 80 }
    };
  }

  initializeExchangeRates() {
    // 初始化汇率（实际应用中应从API获取最新汇率）
    return {
      'USD': 1.0,
      'CNY': 7.25,
      'EUR': 0.92,
      'GBP': 0.79,
      'JPY': 150.25,
      'AUD': 1.52,
      'SGD': 1.35,
      'INR': 83.45,
      'BDT': 109.85,
      'VND': 24500.0
    };
  }

  async calculateProfit(data) {
    try {
      const { product, region = 'Global', currency = 'USD', quantity = 1 } = data;
      
      if (!product) {
        throw new Error('产品型号不能为空');
      }

      // 获取产品信息
      const productInfo = this.productDatabase[product] || await this.fetchProductInfo(product);
      
      if (!productInfo) {
        throw new Error(`未找到产品信息: ${product}`);
      }

      // 计算价格和利润
      const buyPrice = productInfo.buy_price;
      const sellPrice = this.calculateSellPrice(buyPrice, region, productInfo.category);
      const profitRate = this.calculateProfitRate(buyPrice, sellPrice);
      
      // 转换货币
      const convertedSellPrice = this.convertCurrency(sellPrice, 'USD', currency);
      
      // 计算总价
      const totalPrice = convertedSellPrice * quantity;
      const totalProfit = (sellPrice - buyPrice) * quantity;
      
      // 生成推荐价格
      const recommendation = this.generatePriceRecommendation(sellPrice, productInfo.stock);
      
      const result = {
        product: product,
        buy_price: buyPrice,
        sell_price: sellPrice,
        converted_sell_price: convertedSellPrice.toFixed(2),
        profit_rate: profitRate + '%',
        region: region,
        currency: currency,
        quantity: quantity,
        total_price: totalPrice.toFixed(2),
        total_profit: totalProfit.toFixed(2),
        stock: productInfo.stock || 'unknown',
        recommendation: recommendation,
        timestamp: new Date().toISOString()
      };

      // 记录利润计算日志
      this.logProfitCalculation(result);
      
      return result;
    } catch (error) {
      this.logger.logError('利润计算错误:', error);
      return {
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  calculateSellPrice(buyPrice, region, category) {
    // 基础利润率
    let baseMargin = 1.5; // 50%利润
    
    // 根据地区调整
    const regionMargins = {
      'Bangladesh': 1.8,
      'India': 1.7,
      'Vietnam': 1.65,
      'Europe': 1.4,
      'North America': 1.45,
      'Global': 1.5
    };
    
    // 根据类别调整
    const categoryMargins = {
      'sensor': 1.8,
      'plc': 1.4,
      'controller': 1.5,
      'temperature': 1.6,
      'motor': 1.55
    };
    
    const regionFactor = regionMargins[region] || 1.5;
    const categoryFactor = categoryMargins[category] || 1.5;
    
    // 综合计算
    const finalMargin = (baseMargin + regionFactor + categoryFactor) / 3;
    
    return Math.round(buyPrice * finalMargin * 100) / 100;
  }

  calculateProfitRate(buyPrice, sellPrice) {
    return Math.round(((sellPrice - buyPrice) / buyPrice) * 100);
  }

  convertCurrency(amount, fromCurrency, toCurrency) {
    if (fromCurrency === toCurrency) return amount;
    
    const fromRate = this.exchangeRates[fromCurrency];
    const toRate = this.exchangeRates[toCurrency];
    
    if (!fromRate || !toRate) {
      this.logger.logError(`不支持的货币: ${fromCurrency} 或 ${toCurrency}`);
      return amount;
    }
    
    // 先转换为USD，再转换为目标货币
    const amountInUSD = amount / fromRate;
    const convertedAmount = amountInUSD * toRate;
    
    return Math.round(convertedAmount * 100) / 100;
  }

  generatePriceRecommendation(sellPrice, stock) {
    if (stock > 500) {
      return `建议价格区间: ${(sellPrice * 0.95).toFixed(2)}~${(sellPrice * 1.05).toFixed(2)} USD (库存充足)`;
    } else if (stock > 100) {
      return `建议价格区间: ${sellPrice.toFixed(2)}~${(sellPrice * 1.1).toFixed(2)} USD (库存适中)`;
    } else if (stock > 0) {
      return `建议价格区间: ${(sellPrice * 1.05).toFixed(2)}~${(sellPrice * 1.15).toFixed(2)} USD (库存较少)`;
    } else {
      return '库存不足，建议先确认库存';
    }
  }

  async fetchProductInfo(productCode) {
    try {
      // 从Worker获取产品信息
      const workerUrl = this.config.worker_target;
      if (!workerUrl) {
        return null;
      }
      
      // 实际应用中应实现HTTP请求
      // 这里返回null，使用本地数据库
      return null;
    } catch (error) {
      this.logger.logError('获取产品信息失败:', error);
      return null;
    }
  }

  logProfitCalculation(result) {
    try {
      const logEntry = {
        ...result,
        calculated_at: new Date().toISOString()
      };

      fs.appendFileSync(
        this.profitLogPath,
        JSON.stringify(logEntry) + '\n',
        'utf8'
      );
      
      this.logger.logRelay(`利润计算: ${result.product}, 利润率: ${result.profit_rate}`);
    } catch (error) {
      this.logger.logError('记录利润计算日志失败:', error);
    }
  }

  async generatePI(data) {
    try {
      const { 
        product, 
        customerName, 
        customerEmail, 
        quantity = 1, 
        region = 'Global',
        currency = 'USD',
        deliveryTime = '5 days'
      } = data;
      
      // 计算价格信息
      const profitInfo = await this.calculateProfit({ product, region, currency, quantity });
      
      // 读取模板
      let template = this.readPITemplate();
      
      // 替换模板变量
      const piContent = this.replaceTemplateVariables(template, {
        product,
        customerName,
        customerEmail,
        quantity,
        unitPrice: profitInfo.converted_sell_price,
        totalPrice: profitInfo.total_price,
        currency,
        deliveryTime,
        profitRate: profitInfo.profit_rate,
        piDate: new Date().toLocaleDateString(),
        piNumber: this.generatePINumber()
      });
      
      // 保存PI文件
      const piFilename = `PI_${product}_${Date.now()}.html`;
      const piPath = path.join(__dirname, 'outputs', piFilename);
      
      // 确保outputs目录存在
      const outputsDir = path.join(__dirname, 'outputs');
      if (!fs.existsSync(outputsDir)) {
        fs.mkdirSync(outputsDir, { recursive: true });
      }
      
      fs.writeFileSync(piPath, piContent);
      
      return {
        pi_number: this.generatePINumber(),
        pi_path: piPath,
        pi_filename: piFilename,
        product,
        customerName,
        totalAmount: profitInfo.total_price,
        currency,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      this.logger.logError('生成PI失败:', error);
      return {
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  readPITemplate() {
    try {
      if (fs.existsSync(this.piTemplatePath)) {
        return fs.readFileSync(this.piTemplatePath, 'utf8');
      }
      
      // 返回默认模板
      return this.getDefaultPITemplate();
    } catch (error) {
      this.logger.logError('读取PI模板失败:', error);
      return this.getDefaultPITemplate();
    }
  }

  getDefaultPITemplate() {
    return `<!DOCTYPE html>
<html>
<head>
  <title>Proforma Invoice</title>
  <style>body { font-family: Arial, sans-serif; margin: 40px; }</style>
</head>
<body>
  <h1>Proforma Invoice</h1>
  <p>PI Number: {{piNumber}}</p>
  <p>Date: {{piDate}}</p>
  <h2>Customer: {{customerName}}</h2>
  <h3>Order Details</h3>
  <table border="1" cellpadding="5">
    <tr>
      <th>Product</th>
      <th>Quantity</th>
      <th>Unit Price ({{currency}})</th>
      <th>Total ({{currency}})</th>
    </tr>
    <tr>
      <td>{{product}}</td>
      <td>{{quantity}}</td>
      <td>{{unitPrice}}</td>
      <td>{{totalPrice}}</td>
    </tr>
  </table>
  <p>Delivery Time: {{deliveryTime}}</p>
</body>
</html>`;
  }

  replaceTemplateVariables(template, variables) {
    let result = template;
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      result = result.replace(regex, value || '');
    }
    return result;
  }

  generatePINumber() {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `PI-${year}${month}${day}-${random}`;
  }

  // 更新产品数据库
  updateProductDatabase(products) {
    if (Array.isArray(products)) {
      products.forEach(product => {
        if (product.code) {
          this.productDatabase[product.code] = {
            buy_price: product.buy_price,
            category: product.category,
            stock: product.stock
          };
        }
      });
    }
  }

  // 更新汇率
  updateExchangeRates(rates) {
    Object.assign(this.exchangeRates, rates);
  }
}

module.exports = RelayProfit;