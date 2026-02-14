const http = require('http');

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end('<h1>测试服务器运行正常！</h1><p>这是一个简单的测试页面，说明服务器正在运行。</p>');
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url} - 200`);
});

server.listen(3000, '0.0.0.0', () => {
  console.log('\n🚀 最小化测试服务器已启动！');
  console.log('📡 访问地址: http://localhost:3000');
  console.log('📡 或访问: http://127.0.0.1:3000');
  console.log('\n✅ 服务器正在运行，请在浏览器中访问上述地址。\n');
});