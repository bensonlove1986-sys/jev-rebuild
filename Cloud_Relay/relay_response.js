// JEV Cloud Relay v11.0 - Response Module
// AI自动回复与人工回复切换

const https = require('https');
const fs = require('fs');
const path = require('path');

class RelayResponse {
  constructor(config, logger) {
    this.config = config;
    this.logger = logger;
    this.AIMode = config.default_mode || 'auto'; // 'auto' or 'manual'
    this.responseTemplates = this.initializeTemplates();
  }

  initializeTemplates() {
    return {
      inquiry: {
        en: [
          "Thank you for your inquiry! This product is available, delivery within 5 days.",
          "We have this item in stock. Would you like a formal quotation?",
          "This product is ready for shipment. What quantity do you need?"
        ],
        zh: [
          "您询的型号有现货，5天内可发货，谢谢！",
          "我们有这款产品的库存。需要正式报价吗？",
          "该产品可以立即发货。请问您需要多少数量？"
        ],
        vi: [
          "Cảm ơn bạn đã hỏi! Sản phẩm này có sẵn, giao hàng trong 5 ngày.",
          "Chúng tôi có mặt hàng này trong kho. Bạn có muốn nhận báo giá正thức không?"
        ]
      },
      quotation: {
        en: [
          "Here is your quotation. Please review and let me know if you need any adjustments.",
          "I've prepared the quote for you. Is there anything else you need?",
          "Please find the detailed quotation attached. We can proceed once you confirm."
        ],
        zh: [
          "这是您的报价单，请查收。如有任何调整需求请告知。",
          "我已为您准备好报价。还需要其他帮助吗？",
          "详细报价如下，请确认。您确认后我们即可安排。"
        ]
      },
      order: {
        en: [
          "Thank you for your order! We will process it immediately.",
          "Your order has been received. We'll send you the tracking number soon.",
          "We appreciate your business. Your order is being prepared for shipment."
        ],
        zh: [
          "感谢您的订单！我们将立即处理。",
          "您的订单已收到，我们会尽快发送追踪号。",
          "感谢您的惠顾。您的订单正在准备发货中。"
        ]
      },
      'after-sale': {
        en: [
          "I'm sorry to hear about your issue. Let me help you resolve this.",
          "We take customer satisfaction seriously. Please explain the problem in detail.",
          "Our support team is here to assist you. What seems to be the problem?"
        ],
        zh: [
          "很抱歉听到您遇到问题。让我来帮您解决。",
          "我们非常重视客户满意度。请详细说明问题。",
          "我们的支持团队随时为您服务。请问具体是什么问题？"
        ]
      },
      consult: {
        en: [
          "I'd be happy to help you with that. Could you provide more details?",
          "Thank you for your question. Let me check that information for you.",
          "That's a good question. Here's what I can tell you..."
        ],
        zh: [
          "很高兴为您提供帮助。能否提供更多细节？",
          "感谢您的问题。让我为您查询相关信息。",
          "这是个很好的问题。以下是相关信息..."
        ]
      }
    };
  }

  async generateReply(data) {
    try {
      const { 
        text, 
        context = {}, 
        language = 'en',
        intent = null,
        customerInfo = {}
      } = data;

      if (!text || typeof text !== 'string') {
        throw new Error('无效的文本输入');
      }

      let reply;
      
      if (this.AIMode === 'auto') {
        // 自动模式：生成AI回复
        reply = await this.generateAIReply(text, context, language, intent, customerInfo);
      } else {
        // 手动模式：提供推荐语
        reply = this.generateRecommendedReply(text, language, intent);
      }

      return {
        reply: reply,
        mode: this.AIMode,
        language: language,
        intent: intent,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      this.logger.logError('生成回复错误:', error);
      return {
        reply: this.getDefaultReply(),
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  async generateAIReply(text, context, language, intent, customerInfo) {
    try {
      if (this.config.deepseek_api_active) {
        // 使用DeepSeek API生成回复
        return await this.callDeepSeekAI(text, context, language, intent, customerInfo);
      } else {
        // 使用模板回复
        return this.getTemplateReply(language, intent || 'consult');
      }
    } catch (error) {
      // 回退到模板回复
      this.logger.logError('DeepSeek AI调用失败，使用模板回复:', error);
      return this.getTemplateReply(language, intent || 'consult');
    }
  }

  async callDeepSeekAI(text, context, language, intent, customerInfo) {
    return new Promise((resolve, reject) => {
      const prompt = this.constructPrompt(text, context, language, intent, customerInfo);
      
      const postData = JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: this.getSystemPrompt(language)
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 200,
        temperature: 0.7
      });

      const options = {
        hostname: 'api.deepseek.com',
        path: '/chat',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.deepseek_api_key}`,
          'Content-Length': Buffer.byteLength(postData)
        }
      };

      const req = https.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            const response = JSON.parse(data);
            
            if (res.statusCode === 200 && response.choices && response.choices[0]) {
              resolve(response.choices[0].message.content.trim());
            } else {
              reject(new Error(`API错误: ${response.error || '未知错误'}`));
            }
          } catch (error) {
            reject(new Error('解析API响应失败'));
          }
        });
      });

      req.on('error', (error) => {
        reject(new Error(`请求失败: ${error.message}`));
      });

      req.write(postData);
      req.end();
    });
  }

  constructPrompt(text, context, language, intent, customerInfo) {
    let prompt = `Customer: ${text}\n\n`;
    
    if (intent) {
      prompt += `Detected intent: ${intent}\n\n`;
    }
    
    if (Object.keys(context).length > 0) {
      prompt += `Context information: ${JSON.stringify(context)}\n\n`;
    }
    
    if (Object.keys(customerInfo).length > 0) {
      prompt += `Customer information: ${JSON.stringify(customerInfo)}\n\n`;
    }
    
    prompt += `Please respond in ${language}. Keep the response concise and helpful.`;
    
    return prompt;
  }

  getSystemPrompt(language) {
    const prompts = {
      en: "You are a helpful customer service assistant for an industrial equipment company. Respond professionally and politely to customer inquiries. Provide accurate information about products, pricing, and services.",
      zh: "你是一家工业设备公司的客户服务助手。请专业、礼貌地回应用户的咨询。提供关于产品、价格和服务的准确信息。",
      vi: "Bạn là một trợ lý dịch vụ khách hàng hữu ích cho một công ty thiết bị công nghiệp. Hãy trả lời chuyên nghiệp và lịch sự về thắc mắc của khách hàng. Cung cấp thông tin chính xác về sản phẩm, giá cả và dịch vụ."
    };
    
    return prompts[language] || prompts.en;
  }

  getTemplateReply(language, intent) {
    const templates = this.responseTemplates[intent] || this.responseTemplates.consult;
    const languageTemplates = templates[language] || templates.en;
    
    // 随机选择一个模板
    const randomIndex = Math.floor(Math.random() * languageTemplates.length);
    return languageTemplates[randomIndex];
  }

  generateRecommendedReply(text, language, intent) {
    return {
      recommended_replies: this.getRecommendedReplies(language, intent),
      confidence: 'medium',
      manual_review_needed: true
    };
  }

  getRecommendedReplies(language, intent) {
    const templates = this.responseTemplates[intent] || this.responseTemplates.consult;
    const languageTemplates = templates[language] || templates.en;
    
    // 返回所有可用模板
    return languageTemplates;
  }

  getDefaultReply() {
    return "Thank you for your message. Our team will get back to you shortly.";
  }

  // 切换AI模式
  switchMode(mode) {
    if (mode === 'auto' || mode === 'manual') {
      this.AIMode = mode;
      this.logger.logSystem(`AI模式已切换至: ${mode}`);
      return { success: true, mode: this.AIMode };
    }
    return { success: false, error: '无效的模式' };
  }

  // 获取当前模式
  getCurrentMode() {
    return this.AIMode;
  }

  // 添加自定义回复模板
  addReplyTemplate(intent, language, template) {
    if (!this.responseTemplates[intent]) {
      this.responseTemplates[intent] = {};
    }
    
    if (!this.responseTemplates[intent][language]) {
      this.responseTemplates[intent][language] = [];
    }
    
    this.responseTemplates[intent][language].push(template);
    return true;
  }

  // 批量生成回复
  async batchGenerateReplies(requests) {
    if (!Array.isArray(requests)) {
      throw new Error('输入必须是请求数组');
    }

    const replies = await Promise.all(
      requests.map(request => this.generateReply(request))
    );

    return {
      replies: replies,
      total: replies.length,
      timestamp: new Date().toISOString()
    };
  }

  // 生成带推荐产品的回复
  async generateReplyWithRecommendations(text, context, language, recommendedProducts) {
    const baseReply = await this.generateReply({ text, context, language });
    
    if (recommendedProducts && recommendedProducts.length > 0) {
      const productText = this.formatProductRecommendations(recommendedProducts, language);
      baseReply.reply += '\n\n' + productText;
      baseReply.has_recommendations = true;
    }
    
    return baseReply;
  }

  formatProductRecommendations(products, language) {
    const prefixes = {
      en: "You might also be interested in:",
      zh: "您可能还对以下产品感兴趣：",
      vi: "Bạn cũng có thể quan tâm đến："
    };
    
    const prefix = prefixes[language] || prefixes.en;
    const productList = products.map(p => `- ${p.name} (${p.code})`).join('\n');
    
    return `${prefix}\n${productList}`;
  }
}

module.exports = RelayResponse;