// Worker API端点修复脚本
// 用途：确保worker_auto_fix.js能够正确响应/ping和/status接口

const fs = require('fs');
const path = require('path');

// 文件路径
const WORKER_FILE_PATH = path.join(__dirname, 'worker_auto_fix.js');
const FIXED_WORKER_PATH = path.join(__dirname, 'worker_auto_fix_fixed.js');

// 核心API端点实现
const API_ENDPOINTS_CODE = `
// 核心API端点处理函数
async function handlePing(request) {
    return new Response(JSON.stringify({
        status: 'ok',
        message: 'Worker is running',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    }), {
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        }
    });
}

async function handleStatus(request) {
    const config = getSecurityConfig();
    return new Response(JSON.stringify({
        status: 'operational',
        environment: config.mode,
        services: {
            kv: !!globalThis.JEV_AI_CACHE,
            r2: !!globalThis.JEV_R2
        },
        timestamp: new Date().toISOString(),
        uptime: process.uptime ? process.uptime() : 'N/A'
    }), {
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        }
    });
}`;

// 修改后的fetch处理函数
const FETCH_HANDLER_CODE = `
async function handleRequest(request) {
    try {
        // 获取请求路径
        const url = new URL(request.url);
        const path = url.pathname;
        
        // CORS处理
        if (request.method === 'OPTIONS') {
            return new Response('', {
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
                }
            });
        }
        
        // API端点路由
        if (path === '/ping') {
            return handlePing(request);
        }
        if (path === '/status') {
            return handleStatus(request);
        }
        
        // 保留原有端点处理
        if (path === '/auto-env') {
            return autoFixEnv(request);
        }
        if (path === '/kv/test') {
            return handleKvTest(request);
        }
        if (path === '/invite') {
            return handleInvite(request);
        }
        if (path === '/sync') {
            return handleSync(request);
        }
        
        // 默认响应
        return new Response(JSON.stringify({
            error: 'Endpoint not found',
            path: path,
            availableEndpoints: ['/ping', '/status', '/auto-env', '/kv/test', '/invite', '/sync']
        }), {
            status: 404,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        });
    } catch (error) {
        console.error('Error handling request:', error);
        return new Response(JSON.stringify({
            error: 'Internal server error',
            message: error.message
        }), {
            status: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        });
    }
}`;

// 主修复函数
function fixWorkerFile() {
    console.log('========================================');
    console.log('        Worker API端点修复              ');
    console.log('========================================');
    
    try {
        // 检查文件是否存在
        if (!fs.existsSync(WORKER_FILE_PATH)) {
            console.error('❌ 未找到worker_auto_fix.js文件');
            return false;
        }
        
        // 读取文件内容
        let content = fs.readFileSync(WORKER_FILE_PATH, 'utf8');
        console.log('✅ 已读取worker_auto_fix.js文件');
        
        // 检查是否已包含API端点
        const hasPingEndpoint = content.includes('path === "/ping"');
        const hasStatusEndpoint = content.includes('path === "/status"');
        
        if (hasPingEndpoint && hasStatusEndpoint) {
            console.log('⚠️  Worker文件中已包含/ping和/status端点');
        } else {
            // 添加API端点函数
            if (!content.includes('function handlePing')) {
                // 在合适位置插入API端点函数
                const securityConfigIndex = content.indexOf('function getSecurityConfig');
                if (securityConfigIndex > 0) {
                    content = content.slice(0, securityConfigIndex) + API_ENDPOINTS_CODE + '\n' + content.slice(securityConfigIndex);
                    console.log('✅ 已添加API端点处理函数');
                } else {
                    // 如果没找到getSecurityConfig，就在文件开头添加
                    content = API_ENDPOINTS_CODE + '\n' + content;
                    console.log('✅ 已在文件开头添加API端点处理函数');
                }
            }
            
            // 替换fetch处理函数
            const fetchHandlerMatch = content.match(/(async function handleRequest\s*\([^)]*\)\s*{[\s\S]*?return)/);
            if (fetchHandlerMatch) {
                content = content.replace(fetchHandlerMatch[0], FETCH_HANDLER_CODE + '\n        return');
                console.log('✅ 已更新fetch处理函数');
            } else {
                // 如果没找到handleRequest，检查是否有fetch事件监听器
                if (content.includes('addEventListener("fetch"')) {
                    // 在fetch事件监听器前添加handleRequest函数
                    const fetchListenerIndex = content.indexOf('addEventListener("fetch"');
                    content = content.slice(0, fetchListenerIndex) + FETCH_HANDLER_CODE + '\n\n' + content.slice(fetchListenerIndex);
                    // 确保fetch事件调用handleRequest
                    content = content.replace(/addEventListener\("fetch",\s*\([^)]*\)\s*=>\s*{[^{]*{[\s\S]*?}}\);?/, 
                        'addEventListener("fetch", (event) => {\n  event.respondWith(handleRequest(event.request));\n});');
                    console.log('✅ 已添加handleRequest函数并更新fetch事件监听器');
                }
            }
        }
        
        // 保存修复后的文件
        fs.writeFileSync(FIXED_WORKER_PATH, content, 'utf8');
        console.log('✅ 已保存修复后的Worker文件到: worker_auto_fix_fixed.js');
        
        // 备份并替换原文件
        const backupPath = WORKER_FILE_PATH + '.backup';
        fs.copyFileSync(WORKER_FILE_PATH, backupPath);
        fs.copyFileSync(FIXED_WORKER_PATH, WORKER_FILE_PATH);
        console.log('✅ 已备份原文件到: worker_auto_fix.js.backup');
        console.log('✅ 已替换worker_auto_fix.js文件');
        
        console.log('\n========================================');
        console.log('        修复完成！                     ');
        console.log('========================================');
        
        return true;
    } catch (error) {
        console.error('❌ 修复过程发生错误:', error.message);
        return false;
    }
}

// 运行修复
const result = fixWorkerFile();
process.exit(result ? 0 : 1);