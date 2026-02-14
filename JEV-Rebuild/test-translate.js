const https = require('https');
const http = require('http');

// 测试翻译API
const testTranslateAPI = () => {
  const options = {
    hostname: 'localhost',
    port: 8787,
    path: '/api/translate/text',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    }
  };

  const req = http.request(options, (res) => {
    let data = '';

    res.on('data', (chunk) => {
      data += chunk;
    });

    res.on('end', () => {
      try {
        const result = JSON.parse(data);
        console.log('Translation API Response:', JSON.stringify(result, null, 2));
        
        // 检查翻译结果是否正确返回
        if (result.ok === true) {
          const translatedText = result.translated_text || result.translatedText || result.text || result.translated;
          console.log('\n✅ Translation Successful!');
          console.log(`Translated Text: ${translatedText}`);
        } else {
          console.log('\n❌ Translation Failed!');
        }
      } catch (error) {
        console.error('Error parsing JSON:', error);
        console.log('Raw response:', data);
      }
    });
  });

  req.on('error', (error) => {
    console.error('API Request Error:', error);
  });

  // 发送测试请求
  req.write(JSON.stringify({
    text: 'Hello, how are you?',
    to: 'zh'
  }));
  req.end();
};

// 运行测试
testTranslateAPI();
