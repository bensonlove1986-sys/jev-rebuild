const http = require('http');
const PORT = 3000;

// 创建HTTP服务器
const server = http.createServer((req, res) => {
    // 设置CORS头
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-JEV-Security-Token');
    
    // 处理预检请求
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }
    
    // 模拟ping接口
    if (req.url === '/ping') {
        // 记录请求头
        console.log(`[收到请求] ${req.method} ${req.url}`);
        console.log('[请求头] X-JEV-Security-Token:', req.headers['x-jev-security-token']);
        
        // 设置响应状态和内容
        res.writeHead(200, { 'Content-Type': 'application/json' });
        const response = JSON.stringify({
            success: true,
            worker: 'online',
            timestamp: new Date().toISOString(),
            message: 'JEV Worker 通信正常',
            latency: 95
        });
        res.end(response);
        
        console.log('[响应] 200 OK - Worker Online');
        return;
    }
    
    // 模拟worker信息接口
    if (req.url === '/worker/status') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            status: 'online',
            version: 'v2.0',
            uptime: process.uptime()
        }));
        return;
    }
    
    // 处理其他路径
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not Found' }));
});

// 启动服务器
server.listen(PORT, () => {
    console.log('====================================');
    console.log('      JEV 模拟中间层服务');
    console.log('====================================');
    console.log(`[服务] 已启动，监听端口: ${PORT}`);
    console.log(`[服务] 可用接口: http://localhost:${PORT}/ping`);
    console.log(`[服务] 可用接口: http://localhost:${PORT}/worker/status`);
    console.log('====================================');
    console.log('服务运行中...');
});

// 处理关闭信号
process.on('SIGINT', () => {
    console.log('\n正在关闭服务...');
    server.close(() => {
        console.log('服务已关闭');
        process.exit(0);
    });
});