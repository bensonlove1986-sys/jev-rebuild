const http = require('http');

console.log('\n🔧 正在启动测试服务器...');

const server = http.createServer((req, res) => {
  console.log(`📡 ${new Date().toLocaleTimeString()} - ${req.method} ${req.url}`);
  
  if (req.url === '/favicon.ico') {
    res.writeHead(204);
    res.end();
    return;
  }
  
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>测试服务器</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          text-align: center;
          padding: 50px;
          background-color: #f0f0f0;
        }
        h1 {
          color: #4CAF50;
        }
        .container {
          background-color: white;
          padding: 20px;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          max-width: 600px;
          margin: 0 auto;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>✅ 测试服务器运行正常！</h1>
        <p>服务器正在 <strong>http://localhost:3000</strong> 运行</p>
        <p>当前时间: ${new Date().toLocaleString()}</p>
        <p>您的请求已成功处理！</p>
      </div>
    </body>
    </html>
  `);
});

server.listen(3000, '0.0.0.0', () => {
  console.log('\n🚀 测试服务器已成功启动！');
  console.log('📡 访问地址: http://localhost:3000');
  console.log('📡 或访问: http://127.0.0.1:3000');
  console.log('📡 或访问: http://0.0.0.0:3000');
  console.log('\n💡 提示: 按 Ctrl+C 停止服务器');
  console.log('\n✅ 服务器正在等待请求...\n');
});