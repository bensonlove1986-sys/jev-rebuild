// 测试脚本：验证DeepSeek完整工作流程

// 测试服务器URL
const SERVER_URL = 'https://jev-rebuild-worker.bensonlove1986.workers.dev';

// 测试数据
const testOcrText = `MEAN WELL
RSP-2400-48
INPUT: 90-264VAC 50/60Hz
OUTPUT: 48VDC 50A
MAX POWER: 2400W
EFFICIENCY: 90%
OPERATING TEMP: -30~+70°C
CERTIFICATIONS: CE, UL, CCC
MODEL: RSP-2400-48
SERIAL NO: 20240101001
MANUFACTURER: MEAN WELL
`;

const testChatId = 'test_chat_123';
const testMessageId = 'test_message_123';

// 测试DeepSeek普通聊天功能
async function testDeepSeekChat() {
  console.log('=== 测试DeepSeek普通聊天功能 ===');
  
  try {
    const response = await fetch(`${SERVER_URL}/api/deepseek/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: 'Hello, how are you?'
      })
    });
    
    const result = await response.json();
    console.log('DeepSeek普通聊天结果:', result);
    
    if (result.ok && result.response) {
      console.log('✅ DeepSeek普通聊天功能测试通过');
      return result.response;
    } else {
      console.log('❌ DeepSeek普通聊天功能测试失败');
      return null;
    }
  } catch (error) {
    console.error('❌ DeepSeek普通聊天功能测试错误:', error.message);
    return null;
  }
}

// 测试DeepSeek OCR分析功能
async function testDeepSeekOcrAnalysis() {
  console.log('\n=== 测试DeepSeek OCR分析功能 ===');
  
  try {
    const response = await fetch(`${SERVER_URL}/api/deepseek/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        type: 'ocr_analysis',
        message_id: testMessageId,
        content: testOcrText,
        prompt: '请用中文分析该工业产品，输出结构化信息：型号、品牌、类别、关键参数、应用场景'
      })
    });
    
    const result = await response.json();
    console.log('DeepSeek OCR分析结果:', result);
    
    if (result.ok && result.reply) {
      console.log('✅ DeepSeek OCR分析功能测试通过');
      return result.reply;
    } else {
      console.log('❌ DeepSeek OCR分析功能测试失败');
      return null;
    }
  } catch (error) {
    console.error('❌ DeepSeek OCR分析功能测试错误:', error.message);
    return null;
  }
}

// 测试AI建议回复生成功能
async function testAiDraftGeneration(analysisResult) {
  console.log('\n=== 测试AI建议回复生成功能 ===');
  
  try {
    const response = await fetch(`${SERVER_URL}/api/ai/draft`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        chat_id: testChatId,
        new_customer_messages: [{
          message_id: testMessageId,
          text: `产品分析结果：${analysisResult}`,
          language: 'zh'
        }],
        reply_language: 'en',
        explain_language: 'zh'
      })
    });
    
    const result = await response.json();
    console.log('AI建议回复生成结果:', result);
    
    if (result.success && result.draft) {
      console.log('✅ AI建议回复生成功能测试通过');
      console.log('生成的英文回复:', result.draft);
      console.log('生成的中文翻译:', result.chineseTranslation);
      return result;
    } else {
      console.log('❌ AI建议回复生成功能测试失败');
      return null;
    }
  } catch (error) {
    console.error('❌ AI建议回复生成功能测试错误:', error.message);
    return null;
  }
}

// 运行完整测试流程
async function runFullTestWorkflow() {
  console.log('开始测试DeepSeek完整工作流程...\n');
  
  // 1. 测试DeepSeek普通聊天功能
  await testDeepSeekChat();
  
  // 2. 测试DeepSeek OCR分析功能
  const analysisResult = await testDeepSeekOcrAnalysis();
  
  // 3. 测试AI建议回复生成功能
  if (analysisResult) {
    await testAiDraftGeneration(analysisResult);
  }
  
  console.log('\n=== 测试完成 ===');
  console.log('请检查以上测试结果，确保所有功能都正常运行。');
}

// 执行测试
runFullTestWorkflow();
