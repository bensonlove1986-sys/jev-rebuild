const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const BUILD_DIR = path.resolve(__dirname, '../build');
const APP_DIR = __dirname;

// MIME类型映射
const mimeTypes = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.wav': 'audio/wav',
  '.mp4': 'video/mp4',
  '.woff': 'application/font-woff',
  '.ttf': 'application/font-ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.otf': 'application/font-otf',
  '.wasm': 'application/wasm'
};

const server = http.createServer((req, res) => {
  console.log(`${req.method} ${req.url}`);
  
  // 确定请求的文件路径
  let filePath = '';
  if (req.url === '/' || req.url === '/index.html') {
    filePath = path.join(BUILD_DIR, 'index.html');
    // 如果构建目录不存在，使用开发目录的index.html
    if (!fs.existsSync(filePath)) {
      filePath = path.join(APP_DIR, 'index.html');
    }
  } else {
    filePath = path.join(BUILD_DIR, req.url);
    // 如果构建目录中不存在该文件，尝试从public目录获取
    if (!fs.existsSync(filePath)) {
      filePath = path.join(APP_DIR, 'public', req.url);
    }
  }
  
  // 检查文件是否存在
  if (!fs.existsSync(filePath)) {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'text/plain');
    res.end('404 Not Found');
    return;
  }
  
  // 获取文件扩展名并设置MIME类型
  const extname = String(path.extname(filePath)).toLowerCase();
  const contentType = mimeTypes[extname] || 'application/octet-stream';
  
  // 读取并返回文件
  fs.readFile(filePath, (error, content) => {
    if (error) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'text/plain');
      res.end('500 Internal Server Error');
    } else {
      res.statusCode = 200;
      res.setHeader('Content-Type', contentType);
      res.end(content, 'utf-8');
    }
  });
});

server.listen(PORT, () => {
  console.log(`\n🚀 简单HTTP服务器已启动！`);
  console.log(`📡 监听地址: http://localhost:${PORT}`);
  console.log(`📁 服务目录: ${BUILD_DIR}`);
  console.log(`\n💡 提示: 按 Ctrl+C 停止服务器\n`);
});

// 处理退出信号
process.on('SIGINT', () => {
  console.log('\n⏹️  服务器正在关闭...');
  server.close(() => {
    console.log('✅ 服务器已关闭');
    process.exit(0);
  });
});