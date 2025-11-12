// JEV系统管理面板启动脚本
// 使用Node.js内置http模块托管静态文件

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

// 服务器配置
const PORT = 8080;
const HOST = 'localhost';
const PUBLIC_DIR = process.cwd();

// MIME类型映射
const mimeTypes = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.txt': 'text/plain'
};

// 创建HTTP服务器
const server = http.createServer((req, res) => {
    try {
        // 解析请求的URL
        const parsedUrl = url.parse(req.url);
        
        // 获取请求的文件路径
        let filePath = path.join(PUBLIC_DIR, parsedUrl.pathname);
        
        // 处理目录请求，默认显示index.html或重定向到管理面板
        if (fs.statSync(filePath).isDirectory()) {
            if (filePath.endsWith('/')) {
                filePath += 'index.html';
            } else {
                // 重定向到管理面板
                res.writeHead(302, {
                    'Location': '/jev_admin_dashboard.html'
                });
                res.end();
                return;
            }
        }
        
        // 读取文件内容
        fs.readFile(filePath, (err, data) => {
            if (err) {
                // 文件不存在，返回404错误
                if (err.code === 'ENOENT') {
                    res.writeHead(404, { 'Content-Type': 'text/html' });
                    res.end('<h1>404 Not Found</h1><p>请求的文件不存在</p>');
                } else {
                    // 其他错误
                    res.writeHead(500, { 'Content-Type': 'text/html' });
                    res.end('<h1>500 Internal Server Error</h1>');
                }
                return;
            }
            
            // 获取文件扩展名，设置正确的Content-Type
            const extname = path.extname(filePath);
            const contentType = mimeTypes[extname] || 'application/octet-stream';
            
            // 发送文件内容
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(data);
        });
    } catch (error) {
        // 捕获其他异常
        console.error('处理请求时出错:', error);
        res.writeHead(500, { 'Content-Type': 'text/html' });
        res.end('<h1>500 Internal Server Error</h1>');
    }
});

// 启动服务器
server.listen(PORT, HOST, () => {
    console.log('========================================');
    console.log('      JEV系统管理面板已启动            ');
    console.log('========================================');
    console.log(`服务器运行在 http://${HOST}:${PORT}`);
    console.log(`管理面板地址: http://${HOST}:${PORT}/jev_admin_dashboard.html`);
    console.log('');
    console.log('注意: 请确保JEV系统的中继服务器、中控端和客户端已经运行。');
    console.log('');
    console.log('按 Ctrl+C 停止服务器');
    console.log('========================================');
    
    // 尝试自动打开浏览器
    try {
        const { exec } = require('child_process');
        const command = process.platform === 'win32' 
            ? `start http://${HOST}:${PORT}/jev_admin_dashboard.html`
            : `open http://${HOST}:${PORT}/jev_admin_dashboard.html`;
        
        exec(command, (error) => {
            if (error) {
                console.log('自动打开浏览器失败，请手动访问上述地址');
            }
        });
    } catch (e) {
        console.log('自动打开浏览器失败，请手动访问上述地址');
    }
});

// 错误处理
server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
        console.error(`错误: 端口 ${PORT} 已被占用，请关闭占用该端口的程序后重试`);
    } else {
        console.error('启动服务器时出错:', error);
    }
    process.exit(1);
});