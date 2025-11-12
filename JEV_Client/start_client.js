// JEV Client 启动脚本
// 初始化客户端并连接到中继服务器

const http = require('http');
const fs = require('fs');
const path = require('path');
const JEVModuleManager = require('./main.js').JEVModuleManager;

const CLIENT_PORT = 5000;
const RELAY_URL = 'https://jevshop.bensonlove1986.workers.dev';
const CONTROL_URL = 'https://jevshop.bensonlove1986.workers.dev';

console.log('[JEV Client] 初始化客户端模块管理器...');
const moduleManager = new JEVModuleManager();

// 初始化客户端
async function initializeClient() {
    try {
        console.log('[JEV Client] 开始初始化流程...');
        await moduleManager.initialize();
        console.log('[JEV Client] 模块管理器初始化完成！');
        
        // 连接到中继服务器
        const relayStatus = await testRelayConnection();
        console.log('[JEV Client] 中继服务器连接状态:', relayStatus ? '成功' : '失败');
        
        // 连接到中控端
        const controlStatus = await testControlConnection();
        console.log('[JEV Client] 中控端连接状态:', controlStatus ? '成功' : '失败');
        
        console.log('[JEV Client] 客户端初始化完成！');
        return { relayStatus, controlStatus };
    } catch (error) {
        console.error('[JEV Client] 初始化失败:', error);
        return { relayStatus: false, controlStatus: false, error: error.message };
    }
}

// 测试中继服务器连接
async function testRelayConnection() {
    return new Promise((resolve) => {
        const options = {
            hostname: 'jevshop.bensonlove1986.workers.dev',
            path: '/ping',
            headers: {
                'X-Agent-Token': 'jev-secure-key-001',
                'X-System-Layer': 'plugin'
            }
        };
        
        http.get(options, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                try {
                    const response = JSON.parse(data);
                    resolve(response.success === true);
                } catch (e) {
                    resolve(false);
                }
            });
        }).on('error', () => resolve(false));
    });
}

// 测试中控端连接
async function testControlConnection() {
    return new Promise((resolve) => {
        const options = {
            hostname: 'jevshop.bensonlove1986.workers.dev',
            path: '/status',
            headers: {
                'X-Agent-Token': 'jev-secure-key-001',
                'X-System-Layer': 'plugin'
            }
        };
        
        http.get(options, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                try {
                    const response = JSON.parse(data);
                    resolve(response.success === true);
                } catch (e) {
                    resolve(false);
                }
            });
        }).on('error', () => resolve(false));
    });
}

// 创建临时客户端服务器用于测试
const clientServer = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');
    
    if (req.url === '/api/client/status') {
        res.end(JSON.stringify({
            status: 'running',
            version: 'v7.0',
            modulesLoaded: moduleManager.modules.length || 0
        }));
    } else {
        res.statusCode = 404;
        res.end(JSON.stringify({ error: 'Not found' }));
    }
});

// 启动客户端
async function startClient() {
    try {
        await initializeClient();
        
        // 启动测试服务器
        clientServer.listen(CLIENT_PORT, () => {
            console.log(`[JEV Client] 测试服务器已启动: http://localhost:${CLIENT_PORT}`);
            console.log(`[JEV Client] 客户端状态: http://localhost:${CLIENT_PORT}/api/client/status`);
        });
        
        // 模拟定期同步
        setInterval(async () => {
            console.log('[JEV Client] 执行定期同步检查...');
        }, 30000);
        
    } catch (error) {
        console.error('[JEV Client] 启动失败:', error);
    }
}

// 启动客户端
startClient();