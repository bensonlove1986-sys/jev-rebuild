/**
 * JEV Plugin v2.0 - 利润计算与智能报价模块
 * 输入：产品价格、运费、汇率、利润率参数
 * 输出：含利润计算的报价建议
 */

// 汇率配置
const EXCHANGE_RATES = {
  base: 'USD',
  rates: {
    USD: 1.00,
    CNY: 7.25,
    EUR: 0.92,
    GBP: 0.79,
    JPY: 149.50,
    KRW: 1335.00,
    HKD: 7.82,
    CAD: 1.36,
    AUD: 1.53,
    CHF: 0.90,
    SGD: 1.34,
    THB: 35.60,
    MYR: 4.70,
    IDR: 15350.00,
    INR: 83.20,
    BRL: 5.05,
    RUB: 90.50,
    TRY: 28.50,
    ARS: 880.00,
    MXN: 16.80
  }
};

// 利润率配置
const MARGIN_CONFIG = {
  default: {
    min: 0.15,
    max: 0.40,
    recommended: 0.25
  },
  by_product_category: {
    electronics: {
      min: 0.10,
      max: 0.35,
      recommended: 0.20
    },
    clothing: {
      min: 0.20,
      max: 0.50,
      recommended: 0.30
    },
    accessories: {
      min: 0.30,
      max: 0.60,
      recommended: 0.40
    },
    furniture: {
      min: 0.15,
      max: 0.45,
      recommended: 0.28
    },
    beauty: {
      min: 0.25,
      max: 0.65,
      recommended: 0.45
    },
    toys: {
      min: 0.25,
      max: 0.55,
      recommended: 0.35
    },
    books: {
      min: 0.15,
      max: 0.40,
      recommended: 0.25
    },
    sports: {
      min: 0.20,
      max: 0.50,
      recommended: 0.30
    },
    jewelry: {
      min: 0.35,
      max: 0.80,
      recommended: 0.55
    },
    tools: {
      min: 0.20,
      max: 0.45,
      recommended: 0.30
    }
  },
  by_order_amount: [
    { threshold: 0, min: 0.30, max: 0.50, recommended: 0.40 },
    { threshold: 100, min: 0.25, max: 0.45, recommended: 0.35 },
    { threshold: 500, min: 0.20, max: 0.40, recommended: 0.30 },
    { threshold: 1000, min: 0.18, max: 0.35, recommended: 0.28 },
    { threshold: 5000, min: 0.15, max: 0.30, recommended: 0.25 },
    { threshold: 10000, min: 0.12, max: 0.25, recommended: 0.20 }
  ]
};

// 税费配置
const TAX_CONFIG = {
  default_tax_rate: 0.00,
  by_country: {
    US: 0.08,
    CA: 0.13,
    UK: 0.20,
    EU: 0.20,
    JP: 0.10,
    KR: 0.10,
    CN: 0.13,
    AU: 0.10,
    SG: 0.08,
    IN: 0.18,
    BR: 0.12,
    RU: 0.20,
    TR: 0.20
  }
};

// 运费估算配置
const SHIPPING_CONFIG = {
  default_rate: 15.00,
  by_region: {
    north_america: 20.00,
    europe: 25.00,
    asia: 15.00,
    oceania: 30.00,
    africa: 40.00,
    south_america: 35.00
  },
  weight_multiplier: 2.5, // 每公斤增加的运费
  volume_multiplier: 0.5, // 每立方米增加的运费
  free_shipping_threshold: 200.00 // 免运费门槛
};

// 折扣配置
const DISCOUNT_CONFIG = {
  by_quantity: [
    { min: 10, discount: 0.05 },
    { min: 50, discount: 0.10 },
    { min: 100, discount: 0.15 },
    { min: 500, discount: 0.20 },
    { min: 1000, discount: 0.25 }
  ],
  loyalty_discount: 0.03, // 忠诚度折扣
  bulk_order_discount: 0.05 // 大宗订单额外折扣
};

// 日志记录
function logProfitEvent(level, message, details = {}) {
  const timestamp = new Date().toISOString();
  const logMessage = {
    level,
    timestamp,
    message,
    details
  };
  console.log(`[profit_calc] ${JSON.stringify(logMessage)}`);
}

// 参数验证
function validateParameters(params) {
  const { basePrice, shipping, margin } = params;
  
  // 验证基础价格
  if (basePrice === undefined || basePrice === null || basePrice < 0) {
    throw new Error('Invalid base price: must be a non-negative number');
  }
  
  // 验证运费
  if (shipping !== undefined && shipping !== null && shipping < 0) {
    throw new Error('Invalid shipping cost: must be a non-negative number');
  }
  
  // 验证利润率
  if (margin !== undefined && margin !== null) {
    if (typeof margin !== 'number' || margin < 0 || margin > 1) {
      throw new Error('Invalid margin: must be a number between 0 and 1');
    }
  }
  
  return true;
}

// 获取汇率
function getExchangeRate(fromCurrency, toCurrency) {
  if (!fromCurrency || !toCurrency) {
    throw new Error('Currency codes are required');
  }
  
  const fromRate = EXCHANGE_RATES.rates[fromCurrency.toUpperCase()];
  const toRate = EXCHANGE_RATES.rates[toCurrency.toUpperCase()];
  
  if (!fromRate || !toRate) {
    throw new Error(`Unsupported currency: ${!fromRate ? fromCurrency : toCurrency}`);
  }
  
  // 先转换为基础货币，再转换为目标货币
  return toRate / fromRate;
}

// 货币转换
function convertCurrency(amount, fromCurrency, toCurrency) {
  const rate = getExchangeRate(fromCurrency, toCurrency);
  return amount * rate;
}

// 获取产品类别的利润率配置
function getMarginConfigByCategory(category) {
  if (!category) {
    return MARGIN_CONFIG.default;
  }
  
  const categoryConfig = MARGIN_CONFIG.by_product_category[category.toLowerCase()];
  return categoryConfig || MARGIN_CONFIG.default;
}

// 根据订单金额获取利润率配置
function getMarginConfigByOrderAmount(amount) {
  const configs = MARGIN_CONFIG.by_order_amount;
  
  // 找到适用于当前金额的配置
  for (let i = configs.length - 1; i >= 0; i--) {
    if (amount >= configs[i].threshold) {
      return configs[i];
    }
  }
  
  return configs[0]; // 返回默认配置
}

// 计算推荐利润率
function calculateRecommendedMargin(params) {
  const { category, quantity, basePrice } = params;
  
  // 基础推荐利润率（基于产品类别）
  const categoryConfig = getMarginConfigByCategory(category);
  let recommendedMargin = categoryConfig.recommended;
  
  // 根据订单金额调整
  const orderAmount = basePrice * (quantity || 1);
  const amountConfig = getMarginConfigByOrderAmount(orderAmount);
  
  // 结合类别和订单金额的利润率
  recommendedMargin = (recommendedMargin + amountConfig.recommended) / 2;
  
  // 根据数量应用折扣影响
  if (quantity && quantity > 1) {
    const applicableDiscount = DISCOUNT_CONFIG.by_quantity
      .filter(d => quantity >= d.min)
      .reduce((max, d) => Math.max(max, d.discount), 0);
    
    // 数量折扣会略微降低推荐利润率
    recommendedMargin = Math.max(recommendedMargin - applicableDiscount * 0.5, 0.1);
  }
  
  // 确保在合理范围内
  const minMargin = Math.min(categoryConfig.min, amountConfig.min);
  const maxMargin = Math.max(categoryConfig.max, amountConfig.max);
  
  return {
    recommended: Math.max(minMargin, Math.min(maxMargin, recommendedMargin)),
    min: minMargin,
    max: maxMargin
  };
}

// 估算运费
function calculateShipping(params) {
  const { weight, volume, region, orderAmount, freeShippingThreshold } = params;
  
  // 如果订单金额达到免运费门槛，返回0
  if (orderAmount >= (freeShippingThreshold || SHIPPING_CONFIG.free_shipping_threshold)) {
    return 0;
  }
  
  // 基础运费
  let baseShipping = SHIPPING_CONFIG.default_rate;
  
  // 根据地区调整
  if (region && SHIPPING_CONFIG.by_region[region.toLowerCase()]) {
    baseShipping = SHIPPING_CONFIG.by_region[region.toLowerCase()];
  }
  
  // 根据重量调整
  if (weight) {
    baseShipping += weight * SHIPPING_CONFIG.weight_multiplier;
  }
  
  // 根据体积调整
  if (volume) {
    baseShipping += volume * SHIPPING_CONFIG.volume_multiplier;
  }
  
  return Math.max(0, baseShipping);
}

// 计算税费
function calculateTax(subtotal, country) {
  if (!subtotal || subtotal <= 0) {
    return 0;
  }
  
  // 获取税率
  let taxRate = TAX_CONFIG.default_tax_rate;
  if (country && TAX_CONFIG.by_country[country.toUpperCase()]) {
    taxRate = TAX_CONFIG.by_country[country.toUpperCase()];
  }
  
  return subtotal * taxRate;
}

// 计算数量折扣
function calculateQuantityDiscount(basePrice, quantity) {
  if (!quantity || quantity <= 1) {
    return 0;
  }
  
  // 找到适用的最高折扣
  const applicableDiscount = DISCOUNT_CONFIG.by_quantity
    .filter(d => quantity >= d.min)
    .reduce((max, d) => Math.max(max, d.discount), 0);
  
  return applicableDiscount;
}

// 计算附加折扣
function calculateAdditionalDiscounts(isLoyaltyCustomer, isBulkOrder) {
  let additionalDiscount = 0;
  
  if (isLoyaltyCustomer) {
    additionalDiscount += DISCOUNT_CONFIG.loyalty_discount;
  }
  
  if (isBulkOrder) {
    additionalDiscount += DISCOUNT_CONFIG.bulk_order_discount;
  }
  
  return additionalDiscount;
}

// 计算价格建议
function calculatePriceSuggestions(subtotal, marginConfig) {
  const { min, max, recommended } = marginConfig;
  
  // 根据利润率计算最终价格
  const calculatePrice = (margin) => subtotal / (1 - margin);
  
  return {
    min_price: calculatePrice(min),
    max_price: calculatePrice(max),
    recommended_price: calculatePrice(recommended)
  };
}

// 主利润计算函数
function calcProfit(basePrice, shipping, margin, options = {}) {
  try {
    // 验证参数
    validateParameters({ basePrice, shipping, margin });
    
    // 解构选项
    const {
      currency = 'USD',
      targetCurrency = currency,
      quantity = 1,
      category,
      region,
      weight,
      volume,
      country,
      isLoyaltyCustomer = false,
      isBulkOrder = false,
      freeShippingThreshold,
      includeTax = false
    } = options;
    
    // 记录输入参数
    logProfitEvent('info', 'Calculating profit', {
      basePrice,
      shipping,
      margin,
      options
    });
    
    // 如果未指定margin，使用推荐利润率
    let effectiveMargin = margin;
    let marginInfo = null;
    
    if (!effectiveMargin) {
      marginInfo = calculateRecommendedMargin({
        category,
        quantity,
        basePrice
      });
      effectiveMargin = marginInfo.recommended;
    }
    
    // 计算总成本
    const totalCost = basePrice * quantity;
    
    // 计算运费（如果未提供）
    const shippingCost = shipping !== undefined && shipping !== null 
      ? shipping 
      : calculateShipping({
          weight,
          volume,
          region,
          orderAmount: totalCost,
          freeShippingThreshold
        });
    
    // 计算小计（成本+运费）
    const subtotal = totalCost + shippingCost;
    
    // 计算数量折扣
    const quantityDiscount = calculateQuantityDiscount(basePrice, quantity);
    
    // 计算附加折扣
    const additionalDiscount = calculateAdditionalDiscounts(isLoyaltyCustomer, isBulkOrder);
    
    // 总折扣率
    const totalDiscount = quantityDiscount + additionalDiscount;
    
    // 根据利润率计算最终价格
    let finalPrice = subtotal / (1 - effectiveMargin);
    
    // 应用折扣
    if (totalDiscount > 0) {
      finalPrice = finalPrice * (1 - totalDiscount);
    }
    
    // 计算税费
    const tax = includeTax ? calculateTax(finalPrice, country) : 0;
    
    // 如果需要货币转换
    let convertedPrice = finalPrice;
    let convertedTax = tax;
    let conversionRate = 1;
    
    if (currency !== targetCurrency) {
      conversionRate = getExchangeRate(currency, targetCurrency);
      convertedPrice = convertCurrency(finalPrice, currency, targetCurrency);
      convertedTax = convertCurrency(tax, currency, targetCurrency);
    }
    
    // 计算利润
    const profitAmount = finalPrice - subtotal;
    const convertedProfitAmount = convertCurrency(profitAmount, currency, targetCurrency);
    
    // 计算实际利润率
    const actualProfitPercent = subtotal > 0 ? (profitAmount / subtotal) * 100 : 0;
    
    // 计算价格建议（如果未指定margin）
    let priceSuggestions = null;
    if (!margin && marginInfo) {
      priceSuggestions = calculatePriceSuggestions(subtotal, marginInfo);
      
      // 转换价格建议到目标货币
      if (currency !== targetCurrency) {
        priceSuggestions = {
          min_price: convertCurrency(priceSuggestions.min_price, currency, targetCurrency),
          max_price: convertCurrency(priceSuggestions.max_price, currency, targetCurrency),
          recommended_price: convertCurrency(priceSuggestions.recommended_price, currency, targetCurrency)
        };
      }
    }
    
    // 构建结果
    const result = {
      final_price: Number(convertedPrice.toFixed(2)),
      currency: targetCurrency,
      profit_percent: Number(actualProfitPercent.toFixed(2)),
      profit_amount: Number(convertedProfitAmount.toFixed(2)),
      cost_breakdown: {
        product_cost: Number(convertCurrency(totalCost, currency, targetCurrency).toFixed(2)),
        shipping_cost: Number(convertCurrency(shippingCost, currency, targetCurrency).toFixed(2)),
        total_cost: Number(convertCurrency(subtotal, currency, targetCurrency).toFixed(2))
      },
      discount_info: {
        quantity_discount: Number((quantityDiscount * 100).toFixed(2)),
        additional_discount: Number((additionalDiscount * 100).toFixed(2)),
        total_discount_percent: Number((totalDiscount * 100).toFixed(2)),
        discount_amount: Number(convertCurrency(finalPrice * totalDiscount / (1 - totalDiscount), currency, targetCurrency).toFixed(2))
      },
      tax_info: {
        tax_rate: country && TAX_CONFIG.by_country[country.toUpperCase()] 
          ? Number((TAX_CONFIG.by_country[country.toUpperCase()] * 100).toFixed(2)) 
          : 0,
        tax_amount: Number(convertedTax.toFixed(2)),
        price_with_tax: Number((convertedPrice + convertedTax).toFixed(2))
      },
      quantity,
      margin_applied: Number((effectiveMargin * 100).toFixed(2)),
      conversion_info: currency !== targetCurrency ? {
        original_currency: currency,
        conversion_rate: Number(conversionRate.toFixed(4))
      } : null,
      timestamp: new Date().toISOString()
    };
    
    // 添加价格建议（如果有）
    if (priceSuggestions) {
      result.price_suggestions = priceSuggestions;
    }
    
    // 记录成功结果
    logProfitEvent('info', 'Profit calculation completed successfully', {
      final_price: result.final_price,
      profit_percent: result.profit_percent
    });
    
    // 移除null值
    Object.keys(result).forEach(key => {
      if (result[key] === null) {
        delete result[key];
      }
    });
    
    return result;
  } catch (error) {
    logProfitEvent('error', 'Profit calculation failed', { error: error.message });
    throw new Error(`Profit calculation failed: ${error.message}`);
  }
}

// 智能报价函数（提供更全面的报价建议）
async function smartQuote(productInfo, customerInfo) {
  try {
    // 验证必需参数
    if (!productInfo || !productInfo.price) {
      throw new Error('Product info with price is required');
    }
    
    const {
      price: basePrice,
      category,
      weight,
      volume,
      quantity = 1
    } = productInfo;
    
    const {
      country,
      region,
      currency = 'USD',
      isReturningCustomer = false,
      orderHistory = []
    } = customerInfo || {};
    
    // 判断是否为大宗订单
    const isBulkOrder = quantity >= 50;
    
    // 计算客户价值分数（1-10）
    let customerValueScore = 1;
    if (orderHistory && orderHistory.length > 0) {
      const totalOrders = orderHistory.length;
      const totalSpent = orderHistory.reduce((sum, order) => sum + (order.amount || 0), 0);
      customerValueScore = Math.min(10, Math.max(1, Math.round(totalOrders * 0.5 + totalSpent / 1000)));
    }
    
    // 根据客户价值调整忠诚度折扣
    const isLoyaltyCustomer = isReturningCustomer || customerValueScore >= 5;
    
    // 使用calcProfit计算基础报价
    const baseQuote = calcProfit(basePrice, undefined, undefined, {
      currency,
      quantity,
      category,
      region,
      weight,
      volume,
      country,
      isLoyaltyCustomer,
      isBulkOrder,
      includeTax: true
    });
    
    // 生成多个报价方案
    const quoteOptions = [];
    
    // 1. 标准报价
    quoteOptions.push({
      type: 'standard',
      ...baseQuote,
      description: 'Standard pricing with recommended profit margin',
      is_recommended: true
    });
    
    // 2. 激进报价（更高利润率）
    if (baseQuote.price_suggestions) {
      const aggressiveMargin = (baseQuote.margin_applied / 100) * 1.2; // 增加20%
      const aggressiveQuote = calcProfit(basePrice, undefined, aggressiveMargin, {
        currency,
        quantity,
        category,
        region,
        weight,
        volume,
        country,
        isLoyaltyCustomer: false, // 不提供忠诚度折扣
        isBulkOrder: false, // 不提供大宗订单折扣
        includeTax: true
      });
      
      quoteOptions.push({
        type: 'aggressive',
        ...aggressiveQuote,
        description: 'Premium pricing with higher profit margin',
        is_recommended: false
      });
    }
    
    // 3. 保守报价（更低利润率，更高竞争力）
    if (baseQuote.price_suggestions) {
      const conservativeMargin = (baseQuote.margin_applied / 100) * 0.8; // 减少20%
      const conservativeQuote = calcProfit(basePrice, undefined, conservativeMargin, {
        currency,
        quantity,
        category,
        region,
        weight,
        volume,
        country,
        isLoyaltyCustomer: true,
        isBulkOrder: true,
        includeTax: true
      });
      
      quoteOptions.push({
        type: 'conservative',
        ...conservativeQuote,
        description: 'Competitive pricing with lower profit margin',
        is_recommended: false
      });
    }
    
    // 生成智能建议
    let smartSuggestion = "Standard pricing is recommended for this order.";
    
    if (customerValueScore >= 8) {
      smartSuggestion = "This is a high-value customer. Consider offering the conservative pricing to strengthen the relationship.";
    } else if (isBulkOrder) {
      smartSuggestion = "This is a bulk order. The conservative pricing strategy may help secure the deal while maintaining reasonable profit.";
    } else if (customerValueScore <= 3 && !isReturningCustomer) {
      smartSuggestion = "New customer with low value score. The standard pricing balances profitability with competitive positioning.";
    }
    
    // 构建完整的智能报价结果
    const smartQuoteResult = {
      product_info: {
        category,
        quantity,
        base_price: basePrice,
        currency
      },
      customer_info: {
        country,
        region,
        is_returning: isReturningCustomer,
        value_score: customerValueScore,
        order_history_count: orderHistory ? orderHistory.length : 0
      },
      quote_options: quoteOptions,
      recommended_option: quoteOptions.find(opt => opt.is_recommended) || quoteOptions[0],
      smart_suggestion,
      validity_hours: 24,
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    };
    
    logProfitEvent('info', 'Smart quote generated', {
      recommended_price: smartQuoteResult.recommended_option.final_price,
      quote_options_count: quoteOptions.length
    });
    
    return smartQuoteResult;
  } catch (error) {
    logProfitEvent('error', 'Smart quote generation failed', { error: error.message });
    throw new Error(`Smart quote generation failed: ${error.message}`);
  }
}

// 价格敏感度分析
function analyzePriceSensitivity(params) {
  try {
    const {
      basePrice,
      category,
      quantity = 1,
      targetProfitRange = { min: 0.15, max: 0.35 }
    } = params;
    
    if (!basePrice || basePrice <= 0) {
      throw new Error('Valid base price is required');
    }
    
    // 模拟不同价格点的需求弹性
    const elasticity = getCategoryElasticity(category);
    
    // 生成价格敏感度数据
    const sensitivityData = [];
    
    // 测试不同的利润率点
    for (let margin = targetProfitRange.min; margin <= targetProfitRange.max; margin += 0.02) {
      const price = basePrice * quantity / (1 - margin);
      const profit = price - basePrice * quantity;
      
      // 计算预估销量变化（基于价格弹性）
      const priceRatio = price / (basePrice * quantity);
      const estimatedDemandChange = Math.pow(priceRatio, -elasticity);
      
      // 计算预估总销量
      const estimatedQuantity = quantity * estimatedDemandChange;
      
      // 计算预估总收入和总利润
      const estimatedRevenue = price * estimatedQuantity / quantity;
      const estimatedTotalProfit = estimatedRevenue - basePrice * estimatedQuantity;
      
      // 计算利润最大化指数
      const profitIndex = estimatedTotalProfit / (basePrice * quantity);
      
      sensitivityData.push({
        margin: Number((margin * 100).toFixed(2)),
        price: Number(price.toFixed(2)),
        estimated_quantity: Number(estimatedQuantity.toFixed(2)),
        estimated_revenue: Number(estimatedRevenue.toFixed(2)),
        estimated_profit: Number(estimatedTotalProfit.toFixed(2)),
        profit_index: Number(profitIndex.toFixed(3))
      });
    }
    
    // 找到利润最大化的价格点
    const optimalPoint = sensitivityData.reduce(
      (max, current) => current.estimated_profit > max.estimated_profit ? current : max
    );
    
    return {
      base_price: basePrice,
      base_quantity: quantity,
      category,
      elasticity,
      sensitivity_data: sensitivityData,
      optimal_price_point: optimalPoint,
      recommended_strategy: getRecommendationStrategy(optimalPoint, sensitivityData),
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    logProfitEvent('error', 'Price sensitivity analysis failed', { error: error.message });
    throw new Error(`Price sensitivity analysis failed: ${error.message}`);
  }
}

// 获取产品类别的价格弹性
function getCategoryElasticity(category) {
  // 价格弹性系数：奢侈品 > 耐用品 > 必需品
  const elasticityByCategory = {
    electronics: 1.5,
    clothing: 1.2,
    accessories: 1.8,
    furniture: 0.8,
    beauty: 0.7,
    toys: 1.3,
    books: 0.4,
    sports: 1.0,
    jewelry: 2.0,
    tools: 0.9
  };
  
  return elasticityByCategory[category?.toLowerCase()] || 1.0;
}

// 获取推荐策略
function getRecommendationStrategy(optimalPoint, sensitivityData) {
  // 分析最优价格点的位置
  const firstPoint = sensitivityData[0];
  const lastPoint = sensitivityData[sensitivityData.length - 1];
  
  // 判断最优价格在范围内的位置
  if (optimalPoint.margin === firstPoint.margin) {
    return "Price skimming recommended: Higher elasticity suggests customers are price-sensitive. Set lower prices to maximize volume.";
  } else if (optimalPoint.margin === lastPoint.margin) {
    return "Penetration pricing recommended: Lower elasticity suggests customers are less price-sensitive. Set higher prices to maximize profit margin.";
  } else {
    return `Optimal pricing strategy: Set price at ${optimalPoint.price} with ${optimalPoint.margin}% margin to balance volume and profit.`;
  }
}

// 更新汇率
function updateExchangeRate(currency, rate) {
  try {
    if (!currency || typeof rate !== 'number' || rate <= 0) {
      throw new Error('Valid currency code and positive exchange rate are required');
    }
    
    EXCHANGE_RATES.rates[currency.toUpperCase()] = rate;
    logProfitEvent('info', 'Exchange rate updated', { currency, rate });
    
    return {
      success: true,
      currency: currency.toUpperCase(),
      rate,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    logProfitEvent('error', 'Failed to update exchange rate', { error: error.message });
    throw error;
  }
}

// 获取当前汇率表
function getExchangeRates() {
  return { ...EXCHANGE_RATES };
}

// 健康检查
function healthCheck() {
  try {
    // 简单的计算测试
    const testResult = calcProfit(100, 15, 0.25, {
      currency: 'USD',
      quantity: 1
    });
    
    // 验证结果
    const isValid = testResult && 
      typeof testResult.final_price === 'number' && 
      typeof testResult.profit_percent === 'number' &&
      testResult.final_price > 0;
    
    if (!isValid) {
      throw new Error('Health check calculation test failed');
    }
    
    return {
      status: 'healthy',
      supported_currencies: Object.keys(EXCHANGE_RATES.rates).length,
      supported_categories: Object.keys(MARGIN_CONFIG.by_product_category).length,
      test_calculation: {
        price: testResult.final_price,
        profit_percent: testResult.profit_percent
      },
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    logProfitEvent('error', 'Health check failed', { error: error.message });
    return {
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

// 模块导出
module.exports = {
  calcProfit,
  smartQuote,
  analyzePriceSensitivity,
  updateExchangeRate,
  getExchangeRates,
  healthCheck
};

// 导出为ES模块
exports.default = {
  calcProfit,
  smartQuote,
  analyzePriceSensitivity,
  updateExchangeRate,
  getExchangeRates,
  healthCheck
};
