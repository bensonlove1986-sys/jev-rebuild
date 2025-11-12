// 翻译功能测试脚本
const http = require('http');

// 测试翻译功能
async function testTranslation() {
  console.log('开始测试翻译功能...');
  
  // 测试用例
  const testCases = [
    { text: 'Hello, this is a test translation.', target_lang: 'zh-CN', description: '英文到中文' },
    { text: '你好，这是一段测试文本。', target_lang: 'en', description: '中文到英文' },
    { text: 'Bonjour, c\'est un test.', target_lang: 'zh-CN', description: '法文到中文' }
  ];
  
  for (const testCase of testCases) {
    console.log(`\n测试 ${testCase.description}:`);
    console.log(`原文: ${testCase.text}`);
    
    try {
      const result = await callTranslateEndpoint(testCase.text, testCase.target_lang);
      console.log(`翻译结果: ${result.translated_text}`);
      console.log(`状态: ${result.success ? '成功' : '失败'}`);
      if (!result.success) {
        console.log(`错误信息: ${result.error}`);
      }
    } catch (error) {
      console.error(`测试失败: ${error.message}`);
    }
  }
  
  console.log('\n翻译功能测试完成！');
}

// 调用翻译端点
function callTranslateEndpoint(text, target_lang) {
  return new Promise((resolve, reject) => {
    try {
      // 创建数据对象
      const dataObj = {
        text: text,
        target_lang: target_lang
      };
      
      // 确保JSON字符串格式正确
      const data = JSON.stringify(dataObj);
      console.log(`发送请求: 文本长度=${text.length}, 目标语言=${target_lang}, JSON长度=${data.length}`);
      
      const options = {
        hostname: 'localhost',
        port: 3000,
        path: '/translate',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data) // 使用Buffer.byteLength获取正确的字节长度
        }
      };
      
      const req = http.request(options, (res) => {
        console.log(`收到响应: 状态码=${res.statusCode}`);
        let responseData = '';
        
        res.on('data', (chunk) => {
          responseData += chunk;
        });
        
        res.on('end', () => {
          console.log(`响应数据长度: ${responseData.length}字符`);
          try {
            const result = JSON.parse(responseData);
            resolve(result);
          } catch (error) {
            console.error(`JSON解析错误: ${error.message}`);
            console.error(`原始响应数据: "${responseData}"`);
            reject(new Error(`解析响应失败: ${error.message}`));
          }
        });
      });
      
      req.on('error', (error) => {
        console.error(`请求错误: ${error.message}`);
        reject(new Error(`请求失败: ${error.message}`));
      });
      
      req.write(data);
      req.end();
    } catch (error) {
      console.error(`准备请求失败: ${error.message}`);
      reject(new Error(`准备请求失败: ${error.message}`));
    }
  });
}

// 运行测试
testTranslation();