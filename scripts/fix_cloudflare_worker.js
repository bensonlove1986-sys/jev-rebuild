// Cloudflare Worker 诊断与修复指南脚本
// 提供详细的诊断信息和精确的手动修复步骤

const https = require('https');

// 配置信息
const CONFIG = {
    apiToken: 'Sxhnh_R5uV-AD-WembMoyDj36WJgYne57k-oeuGn',
    workerName: 'jevshop',
  scriptName: 'jevshop',
    requiredWebhookSecret: 'jevindustry2025',
    workerUrl: 'https://jevshop.bensonlove1986.workers.dev'
};

// 工具函数
function log(message, type = 'info') {
    const timestamp = new Date().toLocaleString('zh-CN');
    const prefix = {
        info: 'ℹ️',
        success: '✅',
        error: '❌',
        warning: '⚠️'
    }[type] || 'ℹ️';
    console.log(`[${timestamp}] ${prefix} ${message}`);
}

// 发送 Cloudflare API 请求
function sendCloudflareRequest(endpoint, method = 'GET') {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'api.cloudflare.com',
            path: `/client/v4${endpoint}`,
            method: method,
            headers: {
                'Authorization': `Bearer ${CONFIG.apiToken}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        };

        const req = https.request(options, (res) => {
            let responseData = '';
            
            res.on('data', (chunk) => {
                responseData += chunk;
            });
            
            res.on('end', () => {
                try {
                    const parsedData = JSON.parse(responseData);
                    if (parsedData.success) {
                        resolve(parsedData.result);
                    } else {
                        reject(new Error(`API Error: ${JSON.stringify(parsedData.errors, null, 2)}`));
                    }
                } catch (e) {
                    reject(new Error(`Failed to parse response: ${e.message}`));
                }
            });
        });
        
        req.on('error', (error) => {
            reject(new Error(`Request error: ${error.message}`));
        });
        
        req.end();
    });
}

// 获取账户 ID 和信息
async function getAccountInfo() {
    log('正在获取 Cloudflare 账户信息...');
    try {
        const accounts = await sendCloudflareRequest('/accounts');
        if (accounts && accounts.length > 0) {
            const account = accounts[0];
            log(`✅ 成功获取账户信息:`, 'success');
            log(`   账户 ID: ${account.id}`);
            log(`   账户名称: ${account.name}`);
            return account;
        } else {
            throw new Error('未找到 Cloudflare 账户');
        }
    } catch (error) {
        log(`❌ 获取账户信息失败: ${error.message}`, 'error');
        return null;
    }
}

// 获取 Workers 列表
async function getWorkersList(accountId) {
    log('正在获取 Workers 列表...');
    try {
        const workers = await sendCloudflareRequest(`/accounts/${accountId}/workers/scripts`);
        log(`✅ 成功获取 ${workers.length} 个 Worker:`, 'success');
        workers.forEach((worker, index) => {
            log(`   ${index + 1}. ${worker.name}`);
        });
        return workers;
    } catch (error) {
        log(`❌ 获取 Workers 列表失败: ${error.message}`, 'error');
        return [];
    }
}

// 测试 Worker 连接性
async function testWorkerConnection() {
    log(`正在测试 Worker 连接性: ${CONFIG.workerUrl}`);
    
    const endpoints = [
        { path: '/ping', method: 'GET' },
        { path: '/test-vision?mode=ping', method: 'GET', tryWithoutAuth: true },
        { path: '/analyze-image', method: 'POST', body: { image_b64: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=' } }
    ];
    
    let finalStatusCode = null;
    
    for (const endpoint of endpoints) {
        log(`\n测试端点: ${endpoint.path}`);
        
        // 对于支持无认证测试的端点，先尝试无认证请求
        if (endpoint.tryWithoutAuth) {
            try {
                log(`尝试无认证请求...`, 'info');
                const noAuthStatus = await makeRequest(endpoint.path, endpoint.method, endpoint.body, false);
                if (noAuthStatus && noAuthStatus >= 200 && noAuthStatus < 300) {
                    finalStatusCode = noAuthStatus;
                    continue; // 成功了就不需要再尝试带认证的请求
                }
            } catch (error) {
                log(`⚠️ 无认证请求失败: ${error.message || '未知错误'}`, 'warning');
                // 继续尝试带认证的请求
            }
        }
        
        // 尝试带认证的请求
        try {
            log(`尝试带认证请求...`, 'info');
            const statusCode = await makeRequest(endpoint.path, endpoint.method, endpoint.body, true);
            if (statusCode) {
                finalStatusCode = statusCode;
            }
        } catch (error) {
            log(`❌ 错误: ${error.message || '未知错误'}`, 'error');
        }
    }
    
    return finalStatusCode;
}

// 辅助函数：发送HTTP请求
function makeRequest(path, method, body, useAuth) {
    return new Promise((resolve, reject) => {
        try {
            const url = new URL(`${CONFIG.workerUrl}${path}`);
            
            const options = {
                hostname: url.hostname,
                port: 443,
                path: url.pathname + url.search,
                method: method,
                headers: {
                    'Content-Type': 'application/json'
                },
                timeout: 5000
            };
            
            if (useAuth) {
                options.headers['Authorization'] = `Bearer ${CONFIG.requiredWebhookSecret}`;
            }
            
            if (method === 'POST' && body) {
                const bodyStr = JSON.stringify(body);
                // 使用Web标准API替代Node.js的Buffer
                options.headers['Content-Length'] = new TextEncoder().encode(bodyStr).byteLength;
            }

            const req = https.request(options, (res) => {
                let responseData = '';
                
                res.on('data', (chunk) => {
                    responseData += chunk;
                });
                
                res.on('end', () => {
                    const status = res.statusCode;
                    
                    if (status === 401) {
                        log(`⚠️ 授权失败：WEBHOOK_SECRET 不匹配`, 'warning');
                    } else if (status >= 200 && status < 300) {
                        log(`✅ 成功: HTTP ${status}`, 'success');
                        try {
                            const data = JSON.parse(responseData);
                            log(`   响应内容: ${Object.keys(data).join(', ')}`);
                        } catch (e) {
                            log(`   返回数据: 非JSON格式`);
                        }
                    } else {
                        log(`❌ 失败: HTTP ${status}`, 'error');
                    }
                    
                    resolve(status);
                });
            });
            
            req.on('error', (error) => {
                reject(new Error(error.message));
            });
            
            req.on('timeout', () => {
                reject(new Error(`连接超时（5秒）`));
                req.destroy();
            });
            
            if (method === 'POST' && body) {
                req.write(JSON.stringify(body));
            }
            
            req.end();
        } catch (error) {
            reject(new Error(error.message));
        }
    });
}

// 生成详细的手动修复指南
function generateFixGuide(accountInfo, workers) {
    console.log('\n' + '=' * 70);
    console.log('📋 详细手动修复指南');
    console.log('=' * 70);
    
    console.log('\n1️⃣ 登录 Cloudflare 控制台');
    console.log('   🔗 访问: https://dash.cloudflare.com');
    console.log('   📝 使用您的账户凭证登录');
    console.log(`   👤 账户: ${accountInfo?.name || '未知'} (${accountInfo?.id || '未知'})`);
    
    console.log('\n2️⃣ 导航到 Workers');
    console.log('   📂 在左侧菜单中点击「Workers & Pages」');
    console.log(`   🔍 找到并点击 Worker: "${CONFIG.workerName}"`);
    
    if (workers.length > 0) {
        console.log('   \n   📋 您账户中的 Workers:');
        workers.forEach((worker, index) => {
            const workerName = worker.name || worker || '未知名称';
            console.log(`     - ${workerName}`);
        });
    }
    
    console.log('\n3️⃣ 更新环境变量');
    console.log('   🛠️  点击顶部的「Settings」选项卡');
    console.log('   📊 选择左侧的「Variables」');
    console.log('   🔑 找到或添加名为「WEBHOOK_SECRET」的变量');
    console.log(`   ✍️  将值设置为: ${CONFIG.requiredWebhookSecret}`);
    console.log('   🔒 确保旁边的锁定图标已启用（保密）');
    console.log('   💾 点击「Save and Deploy」保存更改');
    
    console.log('\n4️⃣ 部署和验证 Worker');
    console.log('   ▶️  确保 Worker 已成功部署（查看部署状态）');
    console.log('   🔧 使用 Worker 连通性检测工具重新测试');
    console.log(`   🌐 Worker URL: ${CONFIG.workerUrl}`);
    console.log(`   🔑 使用的密钥: ${CONFIG.requiredWebhookSecret}`);
    
    console.log('\n5️⃣ Worker 连接超时解决方案');
    console.log('   • 检查 Worker 代码中是否包含 /ping 端点');
    console.log('   • 验证 Worker 部署状态是否为「Active」');
    console.log('   • 检查 Worker 是否存在代码错误导致无法正常启动');
    console.log('   • 确认 Worker URL 是否正确无误');
    console.log('   • 尝试通过浏览器直接访问 Worker URL 查看是否有响应');
    
    console.log('\n6️⃣ 常见问题排查');
    console.log('   • 网络连接问题：检查防火墙设置，确保 443 端口可访问');
    console.log('   • API Token 权限：确认 Token 具有 Workers 读取权限');
    console.log('   • Worker 名称：确认使用正确的 Worker 名称和路由');
    console.log('   • Cloudflare 服务状态：检查 Cloudflare 服务是否正常');
    
    console.log('\n' + '=' * 70);
}

// 执行诊断
async function runDiagnostics() {
    console.clear();
    console.log('=' * 70);
    console.log('🔍 Cloudflare Worker 诊断与修复工具');
    console.log('=' * 70);
    console.log(`• Worker 名称: ${CONFIG.workerName}`);
    console.log(`• Worker URL: ${CONFIG.workerUrl}`);
    console.log(`• 所需密钥: ${CONFIG.requiredWebhookSecret}`);
    console.log('=' * 70);
    
    // 1. 获取账户信息
    const accountInfo = await getAccountInfo();
    
    // 2. 获取 Workers 列表
    let workers = [];
    if (accountInfo) {
        workers = await getWorkersList(accountInfo.id);
    }
    
    // 3. 测试 Worker 连接性
    const statusCode = await testWorkerConnection();
    
    // 4. 生成修复指南
    generateFixGuide(accountInfo, workers);
    
    // 5. 总结
    console.log('\n📊 诊断总结');
    console.log('─────────────────────────────────────────────────────');
    
    if (statusCode === 200) {
        console.log('✅ Worker 连接正常，无需修复');
    } else if (statusCode === 401) {
        console.log('❌ 需要修复: WEBHOOK_SECRET 不匹配，请按照上方指南操作');
    } else {
        console.log('❓ 无法确定状态，请按照上方指南检查 Worker 配置');
    }
    
    console.log('\n🎯 修复完成后，建议重新运行此工具进行验证');
}

// 执行诊断
runDiagnostics();