/* UTF-8 FIXED BY JEV @ 2025-11-09T15:11:17.844Z */
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8080;
const PUBLIC_DIR = __dirname;

// UTF-8编码优化的MIME类型映射
const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
  // 禁止访问备份目录
  if (req.url.match(/^\/_backup/)) {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("404 Not Found");
    return;
  }
  
  let filePath = path.join(PUBLIC_DIR, req.url === '/' ? 'index.html' : req.url);
  
  // 处理目录请求，自动查找index.html
  try {
    if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
      filePath = path.join(filePath, 'index.html');
    }
    
    // 处理不带扩展名的请求，尝试添加.js扩展名
    if (fs.existsSync(filePath) === false && !path.extname(filePath)) {
      const jsFilePath = filePath + '.js';
      if (fs.existsSync(jsFilePath)) {
        filePath = jsFilePath;
      }
    }
    
    // 读取文件
    fs.readFile(filePath, (err, data) => {
      if (err) {
      // 如果请求的不是根路径且文件不存在，回落到index.html
      if (req.url !== '/' && req.url !== '/index.html') {
        filePath = path.join(PUBLIC_DIR, 'index.html');
        fs.readFile(filePath, (indexErr, indexData) => {
          if (indexErr) {
            res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
            res.end("404 Not Found");
            return;
          }
          res.writeHead(200, {
            "Content-Type": "text/html; charset=utf-8",
            "Cache-Control": "no-store, no-cache, must-revalidate"
          });
          res.end(indexData);
        });
      } else {
        res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("404 Not Found");
      }
      return;
    }

      // 获取文件扩展名并设置正确的Content-Type（带UTF-8编码）
      const extname = path.extname(filePath).toLowerCase();
      const contentType = mimeTypes[extname] || 'text/plain; charset=utf-8';
      
      // 生成简单的ETag
      const fileSize = data.length;
      const fileMtime = fs.statSync(filePath).mtime.getTime();
      const etag = `"${fileSize}-${fileMtime}"`;

      res.writeHead(200, { 
        "Content-Type": contentType,
        "Cache-Control": "no-store, no-cache, must-revalidate",
        "ETag": etag,
        "Pragma": "no-cache"
      });
      res.end(data);
    });
  } catch (error) {
    res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Internal Server Error");
    console.error('Server error:', error);
  }
});

server.listen(PORT, () => {
  console.log(`[JEV] Server running on http://localhost:${PORT}`);
  console.log('[JEV UTF-8] Server header patched ✅');
  console.log('[JEV UTF-8] HTTP 头修复完成 ✅');
});