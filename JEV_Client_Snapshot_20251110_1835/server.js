/* UTF-8 FIXED BY JEV @ 2025-11-09T15:11:17.842Z */
const { TextDecoder, TextEncoder } = require('util');
Object.assign(globalThis, { TextDecoder, TextEncoder });
process.env.NODE_ENV = "utf8";
const decoder = new TextDecoder("utf-8");
const encoder = new TextEncoder();

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8080;
const PUBLIC_DIR = __dirname;

// UTF-8编码优化的MIME类型映射
const mimeTypes = {
  '.html': 'text/html; charset=UTF-8',
  '.js': 'application/javascript; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.json': 'application/json; charset=UTF-8',
  '.txt': 'text/plain; charset=UTF-8',
  '.svg': 'image/svg+xml; charset=UTF-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon'
};

// 统一的Cache-Control头
const CACHE_CONTROL = 'no-store, no-cache, must-revalidate, max-age=0';

// 路径穿越保护
function isPathTraversal(filePath) {
  try {
    const normalizedPath = path.normalize(filePath);
    return !normalizedPath.startsWith(PUBLIC_DIR);
  } catch (e) {
    return true;
  }
}

const server = http.createServer((req, res) => {
  try {
    // 禁止访问备份目录
    if (req.url.match(/^\/_backup/) || req.url.includes('..')) {
      res.writeHead(403, {
        "Content-Type": "text/plain; charset=UTF-8",
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        "X-Relay-Encoding-Lock": "UTF8-LOCKED"
      });
      res.end("访问被拒绝");
      return;
    }
    
    // 处理/ui和/diagnostics路径映射
    let filePath;
    if (req.url.startsWith('/ui/')) {
      filePath = path.join(PUBLIC_DIR, 'ui', req.url.substring(4));
    } else if (req.url.startsWith('/diagnostics/')) {
      filePath = path.join(PUBLIC_DIR, 'diagnostics', req.url.substring(12));
    } else {
      filePath = path.join(PUBLIC_DIR, req.url === '/' ? 'index.html' : req.url);
    }
    
    // 路径穿越保护检查
    if (isPathTraversal(filePath)) {
      res.writeHead(403, {
        "Content-Type": "text/plain; charset=UTF-8",
        "Cache-Control": CACHE_CONTROL
      });
      res.end("访问被拒绝");
      return;
    }
    
    // 处理目录请求，自动查找index.html
    if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
      filePath = path.join(filePath, 'index.html');
    }
    
    // 处理不带扩展名的请求，尝试添加.js扩展名
    if (!fs.existsSync(filePath) && !path.extname(filePath)) {
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
          const indexPath = path.join(PUBLIC_DIR, 'index.html');
          fs.readFile(indexPath, (indexErr, indexData) => {
            if (indexErr) {
                res.writeHead(404, {
                  "Content-Type": "text/plain; charset=UTF-8",
                  "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
                  "X-Relay-Encoding-Lock": "UTF8-LOCKED"
                });
                res.end("找不到文件");
              return;
            }
            res.writeHead(200, {
              "Content-Type": "text/html; charset=UTF-8",
              "Cache-Control": CACHE_CONTROL
            });
            res.end(indexData);
          });
        } else {
          res.writeHead(404, {
            "Content-Type": "text/plain; charset=UTF-8",
            "Cache-Control": CACHE_CONTROL
          });
          res.end("找不到文件");
        }
        return;
      }

      // 获取文件扩展名并设置正确的Content-Type（带UTF-8编码）
      const extname = path.extname(filePath).toLowerCase();
      const contentType = mimeTypes[extname] || 'text/plain; charset=UTF-8';
      
      res.writeHead(200, { 
        "Content-Type": contentType,
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        "X-Relay-Encoding-Lock": "UTF8-LOCKED"
      });
      res.end(data);
    });
  } catch (error) {
      res.writeHead(500, {
        "Content-Type": "text/plain; charset=UTF-8",
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        "X-Relay-Encoding-Lock": "UTF8-LOCKED"
      });
      res.end("服务器内部错误");
    console.error('Server error:', error);
  }
});

server.listen(PORT, () => {
  console.log(`✅ JEV Client UTF-8 服务已启动`);
  console.log(`访问地址: http://localhost:${PORT}`);
});