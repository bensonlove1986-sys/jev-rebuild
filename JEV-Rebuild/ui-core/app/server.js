// 简单的HTTP服务器，用于测试项目访问
import { createServer } from 'http';
import { readFile, readdir } from 'fs/promises';
import { extname, join } from 'path';

const PORT = 3000;
const PUBLIC_DIR = './';

// MIME类型映射
const mimeTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.jsx': 'text/javascript',
  '.ts': 'text/typescript',
  '.tsx': 'text/tsx',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain',
  '.md': 'text/markdown'
};

// 创建HTTP服务器
const server = createServer(async (req, res) => {
  console.log(`${new Date().toISOString()}: ${req.method} ${req.url}`);
  
  let filePath = req.url;
  
  // 默认访问index.html
  if (filePath === '/') {
    filePath = '/index.html';
  }
  
  // 构建完整的文件路径
  let fullPath;
  
  // 处理 public 目录中的文件
  if (filePath.startsWith('/public/')) {
    fullPath = join('./', filePath);
  } else if (filePath.endsWith('.svg') || filePath.endsWith('.mp3')) {
    // 尝试从 public 目录查找静态文件
    const publicPath = join('./public', filePath);
    try {
      // 检查文件是否存在
      await readFile(publicPath);
      fullPath = publicPath;
    } catch {
      // 如果不存在，使用原始路径
      fullPath = join(PUBLIC_DIR, filePath);
    }
  } else {
    fullPath = join(PUBLIC_DIR, filePath);
  }
  
  try {
    // 读取文件
    const content = await readFile(fullPath);
    
    // 获取MIME类型
    const ext = extname(fullPath).toLowerCase();
    const contentType = mimeTypes[ext] || 'application/octet-stream';
    
    // 设置响应头
    res.writeHead(200, { 'Content-Type': contentType });
    
    // 发送文件内容
    res.end(content);
  } catch (error) {
    console.error(`Error serving file ${fullPath}: ${error.message}`);
    
    if (error.code === 'ENOENT') {
      // 文件不存在
      res.writeHead(404, { 'Content-Type': 'text/html' });
      res.end('<h1>404 - File Not Found</h1>');
    } else {
      // 其他错误
      res.writeHead(500, { 'Content-Type': 'text/html' });
      res.end('<h1>500 - Internal Server Error</h1>');
    }
  }
});

// 启动服务器
server.listen(PORT, () => {
  console.log(`Simple HTTP Server running at http://localhost:${PORT}`);
  console.log(`Serving files from: ${PUBLIC_DIR}`);
});

// 处理SIGINT信号（Ctrl+C）
process.on('SIGINT', () => {
  console.log('\nShutting down server...');
  server.close(() => {
    console.log('Server shut down successfully.');
    process.exit(0);
  });
});
