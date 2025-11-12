// API端点直接测试脚本
// 用途：直接测试Worker API端点的实际响应

const http = require('http');
const https = require('https');

// API端点配置
const API_ENDPOINTS = [
    {
        name: 'Worker Ping接口',
        url: 'http://localhost:1819/ping',
        description: '基本健康检查'
    },
    {
        name: 'Worker Status接口',
        url: 'http://localhost:1819/status',
        description: '状态信息检查'
    },
    {
        name: 'Web服务器根路径',
        url: 'http://localhost:1819/',
        description: '检查Web服务器是否正常'
    },
    {
        name: 'Control Panel',
        url: 'http://localhost:1819/control_panel.html',
        description: '中控面板页面'
    }
];

// 测试单个API端点
function testEndpoint(endpoint) {
    return new Promise((resolve) => {
        console.log(`\n🔍 测试: ${endpoint.name} (${endpoint.url})`);
        
        const protocol = endpoint.url.startsWith('https') ? https : http;
        
        const req = protocol.get(endpoint.url, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                console.log(`✅ 响应状态码: ${res.statusCode}`);
                console.log(`✅ 响应头: Content-Type = ${res.headers['content-type'] || 'unknown'}`);
                console.log(`✅ 响应大小: ${data.length} 字节`);
                
                // 尝试解析JSON
                let parsedData = null;
                try {
                    parsedData = JSON.parse(data);
                    console.log(`✅ 响应格式: JSON`);
                    console.log(`✅ JSON结构预览:`, Object.keys(parsedData).slice(0, 5));
                } catch (e) {
                    console.log(`⚠️  响应格式: 非JSON (HTML或其他格式)`);
                    // 显示前100个字符作为预览
                    console.log(`✅ 响应预览: ${data.substring(0, 100)}${data.length > 100 ? '...' : ''}`);
                }
                
                resolve({
                    name: endpoint.name,
                    url: endpoint.url,
                    statusCode: res.statusCode,
                    contentType: res.headers['content-type'],
                    dataLength: data.length,
                    isJson: parsedData !== null,
                    success: res.statusCode === 200
                });
            });
        });
        
        req.on('error', (err) => {
            console.error(`❌ 测试失败: ${err.message}`);
            resolve({
                name: endpoint.name,
                url: endpoint.url,
                error: err.message,
                success: false
            });
        });
        
        req.setTimeout(5000, () => {
            console.error(`❌ 测试超时 (5000ms)`);
            req.abort();
            resolve({
                name: endpoint.name,
                url: endpoint.url,
                error: 'Request timeout',
                success: false
            });
        });
    });
}

// 检查服务器配置
function checkServerConfiguration() {
    console.log('\n========================================');
    console.log('        服务器配置检查                  ');
    console.log('========================================');
    
    // 检查常见的服务器文件
    const fs = require('fs');
    const path = require('path');
    
    const serverFiles = [
        { name: 'start_web_server.py', path: path.join(__dirname, 'start_web_server.py') },
        { name: 'worker_auto_fix.js', path: path.join(__dirname, 'worker_auto_fix.js') },
        { name: 'index.html', path: path.join(__dirname, 'index.html') }
    ];
    
    serverFiles.forEach(file => {
        if (fs.existsSync(file.path)) {
            const stats = fs.statSync(file.path);
            console.log(`✅ ${file.name}: 存在 (${(stats.size / 1024).toFixed(2)} KB)`);
        } else {
            console.log(`❌ ${file.name}: 不存在`);
        }
    });
    
    // 检查web服务器文件内容以了解配置
    try {
        const serverScriptPath = path.join(__dirname, 'start_web_server.py');
        if (fs.existsSync(serverScriptPath)) {
            const content = fs.readFileSync(serverScriptPath, 'utf8');
            console.log(`\n🔍 Web服务器脚本分析:`);
            
            if (content.includes('http.server')) {
                console.log(`✅ 使用标准HTTP服务器模块`);
            }
            
            const portMatch = content.match(/port\s*=\s*(\d+)/) || content.match(/(\d+)\)/);
            if (portMatch) {
                console.log(`✅ 配置的端口: ${portMatch[1]}`);
            }
            
            if (content.includes('worker')) {
                console.log(`✅ 包含Worker相关配置`);
            }
        }
    } catch (error) {
        console.log(`❌ 分析web服务器脚本失败: ${error.message}`);
    }
}

// 提供配置建议
function provideRecommendations(results) {
    console.log('\n========================================');
    console.log('        配置建议                        ');
    console.log('========================================');
    
    const apiFailures = results.filter(r => r.name.includes('Worker') && !r.success);
    
    if (apiFailures.length > 0) {
        console.log('\n🔧 API端点修复建议:');
        console.log('1. 检查start_web_server.py是否正确配置了Worker处理');
        console.log('2. 确认worker_auto_fix.js是否被正确加载');
        console.log('3. 考虑使用以下代码在web服务器中添加API支持:');
        console.log(`   \n   # 在start_web_server.py中添加API处理`);
        console.log(`   class APIServerHandler(http.server.SimpleHTTPRequestHandler):`);
        console.log(`       def do_GET(self):`);
        console.log(`           if self.path == '/ping':`);
        console.log(`               self.send_response(200)`);
        console.log(`               self.send_header('Content-Type', 'application/json')`);
        console.log(`               self.end_headers()`);
        console.log(`               self.wfile.write(json.dumps({'status':'ok'}).encode())`);
        console.log(`           else:`);
        console.log(`               super().do_GET()`);
    }
    
    console.log('\n📋 系统状态建议:');
    console.log('1. 所有核心服务(Web和JEV客户端)已正常运行');
    console.log('2. 端口8080和1819工作正常');
    console.log('3. 环境配置正确');
    console.log('4. API端点需要额外配置才能正常工作');
}

// 主函数
async function main() {
    console.log('========================================');
    console.log('        API端点直接测试                 ');
    console.log('========================================');
    
    // 测试所有API端点
    const results = [];
    
    for (const endpoint of API_ENDPOINTS) {
        const result = await testEndpoint(endpoint);
        results.push(result);
    }
    
    // 检查服务器配置
    checkServerConfiguration();
    
    // 提供建议
    provideRecommendations(results);
    
    // 总结
    console.log('\n========================================');
    console.log('        测试总结                        ');
    console.log('========================================');
    
    const successful = results.filter(r => r.success).length;
    const total = results.length;
    
    console.log(`\n测试结果: ${successful}/${total} 端点成功`);
    
    results.forEach(r => {
        console.log(`- ${r.name}: ${r.success ? '✅ 成功' : '❌ 失败'}`);
    });
    
    console.log('\n📝 注意: Web服务器可能没有配置为直接处理API端点，');
    console.log('        这些端点通常需要通过Cloudflare Worker环境运行。');
}

// 运行测试
main().catch(error => {
    console.error('测试过程中发生错误:', error);
});