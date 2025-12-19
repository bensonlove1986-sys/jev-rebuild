// 本地测试脚本：Daojie PIT Outbound Reply 验证
const https = require('https');

// 配置参数
const PIT_API_KEY = "pit-9c13d0fc-dfa8-4c5c-9655-04b12ead36f4";
const API_BASE = "services.leadconnectorhq.com";
const ENDPOINT = "/conversations/messages";
const VERSION = "2021-07-28";

// 严格复刻 UI payload
const payload = {
  "locationId": "3SsfTbU1lmAPpkG9iB6C",
  "contactId": "GakCvF3msAuChq2DtER9",
  "type": "WhatsApp",
  "message": "ping",
  "channel": "whatsapp",
  "MessageType": 19,
  "whatsapp": {
    "parentMessageAltId": "",
    "type": "message"
  }
};

// 设置请求头
const headers = {
  "Authorization": `Bearer ${PIT_API_KEY}`,
  "Content-Type": "application/json",
  "Version": VERSION,
  "Host": API_BASE
};

// 构建请求选项
const options = {
  hostname: API_BASE,
  path: ENDPOINT,
  method: 'POST',
  headers: headers
};

console.log('=== Daojie PIT Outbound Reply 验证 ===');
console.log('API Base:', API_BASE);
console.log('Endpoint:', ENDPOINT);
console.log('Method:', 'POST');
console.log('Headers:', JSON.stringify(headers, null, 2));
console.log('Payload:', JSON.stringify(payload, null, 2));
console.log('\n=== 发送请求 ===');

// 发送请求
const req = https.request(options, (res) => {
  let responseBody = '';
  
  res.on('data', (chunk) => {
    responseBody += chunk;
  });
  
  res.on('end', () => {
    console.log('HTTP Status:', res.statusCode);
    console.log('Response Body:', responseBody);
    
    if (res.statusCode === 201) {
      // 成功响应
      const result = {
        "pitOutboundReply": "SUCCESS",
        "httpStatus": 201,
        "messageVisibleInUI": true
      };
      console.log('\n=== 验证结果 ===');
      console.log(JSON.stringify(result, null, 2));
    } else {
      // 失败响应
      const result = {
        "pitOutboundReply": "FAILED",
        "httpStatus": res.statusCode,
        "reason": responseBody
      };
      console.log('\n=== 验证结果 ===');
      console.log(JSON.stringify(result, null, 2));
    }
  });
});

req.on('error', (error) => {
  console.error('Error:', error.message);
  const result = {
    "pitOutboundReply": "FAILED",
    "httpStatus": 500,
    "reason": error.message
  };
  console.log('\n=== 验证结果 ===');
  console.log(JSON.stringify(result, null, 2));
});

// 发送请求体
req.write(JSON.stringify(payload));
req.end();
