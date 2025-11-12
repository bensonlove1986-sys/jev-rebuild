// JEV AI Commerce Autopilot v13.5 - Smart Reminder
// 执行边界：STRICT / LOCK=ACTIVE / PATH_LOCK=TRUE

const fs = require('fs');
const path = require('path');

// 加载配置
const configPath = path.join(__dirname, 'autopilot_config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

// 智能提醒模块
class SmartReminder {
  constructor() {
    this.templates = this.initializeTemplates();
    this.reminderHistory = new Map();
  }

  // 初始化提醒模板
  initializeTemplates() {
    return {
      initial_followup: {
        en: "Hello {{name}}, thank you for your inquiry about {{product}}. I wanted to check if you have any questions or need further information.",
        zh: "您好 {{name}}，感谢您对{{product}}的咨询。我想了解您是否有任何问题或需要更多信息。",
        vi: "Xin chào {{name}}, cảm ơn bạn đã hỏi về {{product}}. Tôi muốn kiểm tra xem bạn có bất kỳ câu hỏi nào hay cần thêm thông tin không.",
        bn: "হ্যালো {{name}}, {{product}} সম্পর্কে আপনার প্রশ্নের জন্য ধন্যবাদ। আপনার কি কোনো প্রশ্ন আছে বা আরও তথ্য দরকার?",
        ur: "ہیلو {{name}}، {{product}} کے بارے میں آپ کی استفسار کا شکریہ۔ میں چیک کرنا چاہتا ہوں کہ کیا آپ کے پاس کوئی سوال ہے یا مزید معلومات کی ضرورت ہے۔",
        hi: "नमस्ते {{name}}，{{product}} के बारे में आपकी जानकारी के लिए धन्यवाद। मैं जांचना चाहता हूं कि क्या आपके कोई सवाल हैं या आपको और जानकारी चाहिए।"
      },
      pi_followup: {
        en: "Hi {{name}}, I wanted to follow up on the proforma invoice I sent you for {{product}}. Please let me know if you need any clarification.",
        zh: "您好 {{name}}，我想跟进一下我发送给您的{{product}}形式发票。如果您需要任何澄清，请告诉我。",
        vi: "Xin chào {{name}}, tôi muốn theo dõi hóa đơn sơ thảo mà tôi đã gửi cho bạn về {{product}}. Vui lòng cho tôi biết nếu bạn cần bất kỳ sự làm rõ nào.",
        bn: "হাই {{name}}，আমি আপনাকে {{product}} এর জন্য প্রোফর্মা ইনভয়েস পাঠিয়েছিলাম সেই বিষয়ে ফলো আপ করতে চাই। আপনার কি কোনো ব্যাখ্যা দরকার তা জানান।",
        ur: "ہائے {{name}}，میں آپ کو {{product}} کے لیے بھیجا گیا پرو فارما انوائس پر تالứ کریں گا۔ اگر آپ کو کوئی وضاحت کی ضرورت ہو تو مجھے بتائیں۔",
        hi: "नमस्ते {{name}}，मैं आपको {{product}} के लिए भेजे गए प्रोफॉर्मा इनवॉइस पर फॉलो अप करना चाहता हूं। यदि आपको कोई स्पष्टीकरण चाहिए तो मुझे बताएं।"
      },
      payment_reminder: {
        en: "Dear {{name}}, this is a gentle reminder regarding your payment for {{product}}. Your prompt attention would be appreciated.",
        zh: "尊敬的{{name}}，这是关于您购买{{product}}的付款提醒。感谢您的及时处理。",
        vi: "Kính gửi {{name}}, đây là một lời nhắc nhẹ nhàng liên quan đến thanh toán của bạn cho {{product}}. Sự chú ý kịp thời của bạn sẽ được đánh giá cao.",
        bn: "প্রিয় {{name}}，এটি আপনার {{product}} এর জন্য পেমেন্ট সম্পর্কে একটি মৃদু স্মরণ। আপনার দ্রুত গমনকার্য প্রশংসিত হবে।",
        ur: "پیارے {{name}}，یہ آپ کے {{product}} کے لیے ادائیگی سے متعلق ایک نرم یادداشت ہے۔ آپ کی فوری توجہ کی تعریف کی جائے گی۔",
        hi: "प्रिय {{name}}，यह आपके {{product}} के भुगतान के संबंध में एक कोमल अनुस्मारक है। आपका तुरंत ध्यान सराहनीय होगा।"
      },
      final_reminder: {
        en: "Hello {{name}}, I wanted to check in one last time regarding your interest in {{product}}. Is there anything I can help you with today?",
        zh: "您好 {{name}}，我想最后一次询问您对{{product}}的兴趣。今天有什么我可以帮助您的吗？",
        vi: "Xin chào {{name}}, tôi muốn kiểm tra một lần cuối cùng liên quan đến sở thích của bạn về {{product}}. Có gì tôi có thể giúp bạn hôm nay?",
        bn: "হ্যালো {{name}}，আমি আপনার {{product}} এর প্রতি আগ্রহ সম্পর্কে শেষবার চেক-ইন করতে চাই। আজ আপনার জন্য কিছু করতে পারি?",
        ur: "ہیلو {{name}}，میں آپ کی {{product}} میں دلچسپی کے بارے میں آخری بار چیک ان کرنا چاہتا ہوں۔ آج میں آپ کی کسی بھی چیز میں مدد کر سکتا ہوں؟",
        hi: "नमस्ते {{name}}，मैं आपके {{product}} में रुचि के संबंध में आखिरी बार चेक इन करना चाहता हूं। क्या आज मैं आपकी कोई मदद कर सकता हूं?"
      }
    };
  }

  // 发送智能提醒
  async sendReminder(client) {
    try {
      // 生成提醒消息
      const message = await this.generateMessage(client);
      
      // 调用relay发送消息
      console.log(`[INFO] Sending reminder to client ${client.id}: ${message.substring(0, 50)}...`);
      
      // 模拟发送请求
      const response = {
        success: true,
        message_id: `msg_${Date.now()}`,
        timestamp: new Date().toISOString()
      };
      
      // 记录提醒历史
      this.recordReminderHistory(client.id, message, response);
      
      // 记录操作日志
      this.logAction(client.id, "reminder_sent", { message_id: response.message_id });
      
      return response;
    } catch (error) {
      console.error(`[ERROR] Failed to send reminder to client ${client.id}: ${error.message}`);
      this.logAction(client.id, "reminder_failed", { error: error.message });
      throw error;
    }
  }

  // 生成提醒消息
  async generateMessage(client) {
    // 确定提醒类型
    const reminderType = this.determineReminderType(client);
    
    // 确定语言
    const language = client.language || 'en';
    
    // 获取对应的模板
    let template = this.templates[reminderType][language] || 
                   this.templates[reminderType].en; // 默认为英语
    
    // 替换模板变量
    let message = template
      .replace(/{{name}}/g, client.name || 'Valued Customer')
      .replace(/{{product}}/g, client.product || 'our products');
    
    // 根据客户状态和画像调整消息
    message = this.personalizeMessage(message, client);
    
    return message;
  }

  // 确定提醒类型
  determineReminderType(client) {
    const contactCount = client.contact_count || 0;
    
    if (contactCount === 1) {
      return 'initial_followup';
    } else if (contactCount === 2) {
      return 'pi_followup';
    } else if (contactCount === 3) {
      return 'payment_reminder';
    } else {
      return 'final_reminder';
    }
  }

  // 个性化消息
  personalizeMessage(message, client) {
    let personalizedMessage = message;
    
    // 根据客户状态添加不同的结尾
    switch (client.deal_score) {
      case 'HOT':
        personalizedMessage += " I'm available for an immediate call if you'd like to discuss further.";
        break;
      case 'WARM':
        personalizedMessage += " Please let me know if you need any additional information.";
        break;
      case 'COLD':
        personalizedMessage += " No pressure at all, just wanted to check in.";
        break;
    }
    
    // 根据紧急程度调整语调
    if (client.profile && client.profile.urgency_level === 'high') {
      personalizedMessage = personalizedMessage.replace('I wanted to check', "I'm urgently checking");
    }
    
    return personalizedMessage;
  }

  // 记录提醒历史
  recordReminderHistory(clientId, message, response) {
    if (!this.reminderHistory.has(clientId)) {
      this.reminderHistory.set(clientId, []);
    }
    
    const history = this.reminderHistory.get(clientId);
    history.push({
      timestamp: new Date().toISOString(),
      message: message,
      response: response,
      reminder_type: this.determineReminderType({ contact_count: history.length + 1 })
    });
    
    // 保留最近10条记录
    if (history.length > 10) {
      history.shift();
    }
    
    this.reminderHistory.set(clientId, history);
  }

  // 获取提醒历史
  getReminderHistory(clientId) {
    return this.reminderHistory.get(clientId) || [];
  }

  // 批量发送提醒
  async sendBulkReminders(clients) {
    const results = [];
    
    for (const client of clients) {
      try {
        const result = await this.sendReminder(client);
        results.push({
          client_id: client.id,
          success: true,
          message_id: result.message_id
        });
      } catch (error) {
        results.push({
          client_id: client.id,
          success: false,
          error: error.message
        });
      }
    }
    
    return results;
  }

  // 分析提醒效果
  analyzeReminderEffectiveness(clientId) {
    const history = this.getReminderHistory(clientId);
    
    if (history.length === 0) {
      return null;
    }
    
    const sentCount = history.length;
    const successCount = history.filter(h => h.response.success).length;
    const avgResponseTime = 'N/A'; // 在实际场景中可以计算
    
    return {
      client_id: clientId,
      reminders_sent: sentCount,
      reminders_delivered: successCount,
      delivery_rate: `${Math.round((successCount / sentCount) * 100)}%`,
      avg_response_time: avgResponseTime,
      last_reminder: history[history.length - 1].timestamp
    };
  }

  // 记录操作日志
  logAction(clientId, action, details = {}) {
    const logPath = path.join(__dirname, 'autopilot_audit.log');
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${action} | client_id=${clientId} | ${JSON.stringify(details)}\n`;
    
    try {
      fs.appendFileSync(logPath, logEntry);
    } catch (error) {
      console.error(`[ERROR] Failed to log action: ${error.message}`);
    }
  }

  // 翻译消息（模拟DeepSeek翻译）
  async translateMessage(text, targetLanguage) {
    // 模拟翻译过程
    console.log(`[INFO] Translating message to ${targetLanguage}`);
    
    // 在实际场景中，这里会调用DeepSeek API
    return text; // 返回原文作为模拟
  }
}

// 创建并导出提醒器实例
const reminder = new SmartReminder();

// 导出关键函数
module.exports = {
  sendReminder: reminder.sendReminder.bind(reminder),
  generateMessage: reminder.generateMessage.bind(reminder),
  sendBulkReminders: reminder.sendBulkReminders.bind(reminder),
  analyzeReminderEffectiveness: reminder.analyzeReminderEffectiveness.bind(reminder),
  getReminderHistory: reminder.getReminderHistory.bind(reminder)
};