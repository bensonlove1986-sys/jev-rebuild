// Daojie PIT Outbound Reply 测试脚本

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  // 配置参数
  const PIT_API_KEY = "pit-9c13d0fc-dfa8-4c5c-9655-04b12ead36f4";
  const API_BASE = "https://services.leadconnectorhq.com";
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
    "Version": VERSION
  };
  
  try {
    console.log('Sending PIT API request...');
    console.log('URL:', `${API_BASE}${ENDPOINT}`);
    console.log('Headers:', headers);
    console.log('Payload:', payload);
    
    const response = await fetch(`${API_BASE}${ENDPOINT}`, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(payload)
    });
    
    const responseBody = await response.text();
    
    console.log('Response Status:', response.status);
    console.log('Response Body:', responseBody);
    
    if (response.status === 201) {
      // 成功响应
      return new Response(JSON.stringify({
        "pitOutboundReply": "SUCCESS",
        "httpStatus": 201,
        "messageVisibleInUI": true
      }, null, 2), {
        headers: { 'Content-Type': 'application/json' }
      });
    } else {
      // 失败响应
      return new Response(JSON.stringify({
        "pitOutboundReply": "FAILED",
        "httpStatus": response.status,
        "reason": responseBody
      }, null, 2), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
  } catch (error) {
    console.error('Error:', error);
    
    return new Response(JSON.stringify({
      "pitOutboundReply": "FAILED",
      "httpStatus": 500,
      "reason": error.message
    }, null, 2), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
