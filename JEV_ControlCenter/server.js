// JEV Control Center Server
// 启动中控端API服务并暴露RESTful接口

const http = require('http');
const fs = require('fs');
const path = require('path');
const JEV_API = require('./control_api.js');

const PORT = 4000;
const HOST = 'localhost';

// 创建HTTP服务器
const server = http.createServer(async (req, res) => {
    // 设置CORS头
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-JEV-Version, X-Control-Scope, X-Relay-Mode');
    
    // 处理OPTIONS请求
    if (req.method === 'OPTIONS') {
        res.statusCode = 200;
        res.end();
        return;
    }
    
    // 解析请求路径
    const url = req.url;
    console.log(`[JEV Control] 收到请求: ${req.method} ${url}`);
    
    // 处理API路由
    try {
        // 健康检查
        if (url === '/api/health') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                status: 'ok',
                service: 'JEV Control Center',
                version: 'v9.8'
            }));
            return;
        }
        
        // 系统状态
        if (url === '/api/status' && req.method === 'GET') {
            const status = await JEV_API.getSystemStatus();
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(status));
            return;
        }
        
        // 加载代理配置
        if (url === '/api/agents' && req.method === 'GET') {
            const agents = await JEV_API.loadAgentConfig();
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(agents));
            return;
        }
        
        // 同步代理
        if (url.startsWith('/api/agents/sync/') && req.method === 'POST') {
            const agentId = url.split('/').pop();
            const result = await JEV_API.syncAgent(agentId);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(result));
            return;
        }
        
        // 重启代理
        if (url.startsWith('/api/agents/restart/') && req.method === 'POST') {
            const agentId = url.split('/').pop();
            const result = await JEV_API.restartAgent(agentId);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(result));
            return;
        }
        
        // 静态文件服务（用于UI界面）
        let filePath = '.' + url;
        if (filePath === './') filePath = './control_dashboard.html';
        
        const extname = path.extname(filePath);
        let contentType = 'text/html';
        
        const mimeTypes = {
            '.js': 'text/javascript',
            '.css': 'text/css',
            '.json': 'application/json',
            '.png': 'image/png',
            '.jpg': 'image/jpg',
            '.gif': 'image/gif',
            '.svg': 'image/svg+xml'
        };
        
        contentType = mimeTypes[extname] || 'text/html';
        
        fs.readFile(filePath, (error, content) => {
            if (error) {
                if (error.code === 'ENOENT') {
                    res.writeHead(404, { 'Content-Type': 'text/html' });
                    res.end('404 页面未找到', 'utf-8');
                } else {
                    res.writeHead(500);
                    res.end('服务器错误: ' + error.code + '\n');
                }
            } else {
                res.writeHead(200, { 'Content-Type': contentType });
                res.end(content, 'utf-8');
            }
        });
    } catch (error) {
        console.error('[JEV Control] 处理请求错误:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            success: false,
            error: error.message || 'Internal server error'
        }));
    }
});

// 启动服务器
server.listen(PORT, HOST, () => {
    console.log(`[JEV Control Center] 服务器已启动，监听地址: http://${HOST}:${PORT}`);
    console.log(`[JEV Control Center] 健康检查: http://${HOST}:${PORT}/api/health`);
    console.log(`[JEV Control Center] 系统状态: http://${HOST}:${PORT}/api/status`);
    console.log(`[JEV Control Center] 控制面板: http://${HOST}:${PORT}`);
});

// 错误处理
server.on('error', (error) => {
    console.error('[JEV Control] 服务器错误:', error);
});