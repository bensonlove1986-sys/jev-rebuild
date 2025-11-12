const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

// 服务器配置
const PORT = 8080;
const ROOT_DIR = path.join(__dirname);

// MIME类型映射
const mimeTypes = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml; charset=utf-8',
    '.ico': 'image/x-icon'
};

// 创建服务器
const server = http.createServer((req, res) => {
    console.log(`收到请求: ${req.method} ${req.url}`);
    
    // 解析请求URL
    const parsedUrl = url.parse(req.url);
    let filePath = path.join(ROOT_DIR, parsedUrl.pathname);
    
    // 如果路径是目录，尝试提供index.html或重定向到登录页面
    if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
        if (req.url.endsWith('/')) {
            filePath += 'index.html';
        } else {
            // 如果是根目录，重定向到登录页面
            if (req.url === '/') {
                res.writeHead(302, {
                    'Location': '/ui/login_portal.html'
                });
                res.end();
                return;
            }
            filePath += '/index.html';
        }
    }
    
    // 读取文件并发送
    fs.readFile(filePath, (err, data) => {
        if (err) {
            console.error(`文件读取错误: ${err.message}`);
            res.writeHead(404, {
                'Content-Type': 'text/plain; charset=utf-8'
            });
            res.end('404 Not Found');
            return;
        }
        
        // 设置MIME类型
        const ext = path.extname(filePath);
        const contentType = mimeTypes[ext] || 'application/octet-stream';
        
        // 发送文件
        res.writeHead(200, {
            'Content-Type': contentType,
            'Content-Length': data.length
        });
        res.end(data);
        console.log(`成功发送文件: ${filePath}`);
    });
});

// 启动服务器
server.listen(PORT, () => {
    console.log(`简化版静态文件服务器已启动`);
    console.log(`访问地址: http://localhost:${PORT}`);
    console.log(`服务根目录: ${ROOT_DIR}`);
});

// 错误处理
server.on('error', (err) => {
    console.error(`服务器错误: ${err.message}`);
});