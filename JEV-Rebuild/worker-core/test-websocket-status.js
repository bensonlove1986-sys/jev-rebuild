import https from 'https';

// WebSocket 握手请求参数
const options = {
  hostname: 'jev-rebuild-worker.bensonlove1986.workers.dev',
  port: 443,
  path: '/stream',
  method: 'GET',
  headers: {
    'Upgrade': 'websocket',
    'Connection': 'Upgrade',
    'Sec-WebSocket-Key': 'dGhlIHNhbXBsZSBub25jZQ==',
    'Sec-WebSocket-Version': '13'
  }
};

console.log('测试 WebSocket 握手请求...');
console.log('请求 URL:', `https://${options.hostname}${options.path}`);
console.log('请求头:', options.headers);
console.log('');

const req = https.request(options, (res) => {
  console.log('=== 响应信息 ===');
  console.log('状态码:', res.statusCode);
  console.log('状态消息:', res.statusMessage);
  console.log('响应头:', res.headers);
  console.log('');
  
  if (res.statusCode === 101) {
    console.log('✅ 测试通过: 服务器返回了正确的 101 Switching Protocols 状态码');
  } else {
    console.log('❌ 测试失败: 服务器返回了错误的状态码，期望 101，实际得到', res.statusCode);
  }
  
  // 监听响应数据（虽然 WebSocket 握手后会切换协议，但我们只需要状态码）
  res.on('data', (d) => {
    console.log('收到响应数据:', d.length, '字节');
  });
});

req.on('error', (e) => {
  console.error('❌ 请求错误:', e.message);
});

// 发送请求
req.end();