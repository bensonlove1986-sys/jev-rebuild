const http = require('http');
const fs = require('fs');
const path = require('path');

// 读取index.html文件
const indexPath = path.join(__dirname, 'index.html');
const indexContent = fs.existsSync(indexPath) ? fs.readFileSync(indexPath, 'utf8') : '<h1>网页已启动！</h1><p>服务器正在运行。</p>';

// 创建服务器
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(indexContent);
});

// 启动服务器
server.listen(3000, '0.0.0.0', () => {
  console.log('🚀 网页服务器已启动！');
  console.log('📡 访问地址: http://localhost:3000');
  console.log('✅ 服务器正在运行，可以开始访问网页了。');
});