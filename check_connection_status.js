// 连接状态检查脚本
// 用途：验证系统各功能模块之间的连接状态、数据传输通道和接口调用

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { execSync, exec } = require('child_process');

// 服务配置信息
const SERVICES = {
    webServer: {
        name: 'Web服务器',
        url: 'http://localhost:1819/JEV_Client/ui/panel.html',
        description: '主Web服务'
    },
    jevClient: {
        name: 'JEV客户端',
        url: 'http://localhost:8080/ui/login_portal.html',
        description: 'JEV客户端服务'
    },
    jevOnline: {
        name: 'JEV在线服务',
        url: 'http://localhost:8080/ui/online_launcher_dashboard.html',
        description: 'JEV在线功能服务'
    }
};

// API端点
const API_ENDPOINTS = [
    {
        name: 'Worker Ping接口',
        url: 'http://localhost:1819/ping',
        method: 'GET',
        description: 'Worker健康检查接口'
    },
    {
        name: 'Worker Status接口',
        url: 'http://localhost:1819/status',
        method: 'GET',
        description: 'Worker状态检查接口'
    }
];

// 日志文件路径
const LOG_FILES = [
    path.join(__dirname, 'logs', 'jev_server.log'),
    path.join(__dirname, 'JEV_Client', 'logs', 'client.log'),
    path.join(__dirname, 'outputs', 'prod_ping.txt')
];

// 检查HTTP(S)服务状态
async function checkHttpService(service) {
    console.log(`\n🔍 检查服务: ${service.name} (${service.url})`);
    
    try {
        const protocol = service.url.startsWith('https') ? https : http;
        
        return new Promise((resolve) => {
            const timeout = setTimeout(() => {
                resolve({
                    service: service.name,
                    status: '❌ 失败',
                    reason: '连接超时',
                    details: `${service.name} 连接超时 (>5000ms)`
                });
            }, 5000);
            
            const req = protocol.get(service.url, (res) => {
                clearTimeout(timeout);
                
                let status = '✅ 成功';
                let reason = '连接成功';
                let details = `${service.name} 响应状态码: ${res.statusCode}`;
                
                if (res.statusCode >= 400) {
                    status = '⚠️  警告';
                    reason = '请求成功但状态码异常';
                }
                
                resolve({
                    service: service.name,
                    status,
                    reason,
                    details,
                    statusCode: res.statusCode
                });
            });
            
            req.on('error', (err) => {
                clearTimeout(timeout);
                resolve({
                    service: service.name,
                    status: '❌ 失败',
                    reason: '连接错误',
                    details: `${service.name} 连接失败: ${err.message}`
                });
            });
        });
    } catch (error) {
        return {
            service: service.name,
            status: '❌ 失败',
            reason: '未知错误',
            details: `${service.name} 检查失败: ${error.message}`
        };
    }
}

// 发送API请求
async function testApiEndpoint(endpoint) {
    console.log(`\n🔍 测试API: ${endpoint.name} (${endpoint.url})`);
    
    try {
        const protocol = endpoint.url.startsWith('https') ? https : http;
        
        return new Promise((resolve) => {
            const timeout = setTimeout(() => {
                resolve({
                    endpoint: endpoint.name,
                    status: '❌ 失败',
                    reason: '请求超时',
                    details: `${endpoint.name} 请求超时 (>3000ms)`
                });
            }, 3000);
            
            const options = {
                method: endpoint.method,
                headers: {
                    'Content-Type': 'application/json'
                }
            };
            
            const req = protocol.request(endpoint.url, options, (res) => {
                clearTimeout(timeout);
                
                let data = '';
                res.on('data', (chunk) => {
                    data += chunk;
                });
                
                res.on('end', () => {
                    let status = '✅ 成功';
                    let reason = 'API调用成功';
                    let details = `${endpoint.name} 响应状态码: ${res.statusCode}`;
                    
                    if (res.statusCode >= 400) {
                        status = '⚠️  警告';
                        reason = 'API调用返回错误状态码';
                    }
                    
                    try {
                        const jsonData = JSON.parse(data);
                        details += `, 响应内容类型: JSON`;
                    } catch (e) {
                        details += `, 响应内容类型: 非JSON`;
                    }
                    
                    resolve({
                        endpoint: endpoint.name,
                        status,
                        reason,
                        details,
                        statusCode: res.statusCode,
                        responseLength: data.length
                    });
                });
            });
            
            req.on('error', (err) => {
                clearTimeout(timeout);
                resolve({
                    endpoint: endpoint.name,
                    status: '❌ 失败',
                    reason: 'API调用错误',
                    details: `${endpoint.name} 调用失败: ${err.message}`
                });
            });
            
            req.end();
        });
    } catch (error) {
        return {
            endpoint: endpoint.name,
            status: '❌ 失败',
            reason: '未知错误',
            details: `${endpoint.name} 测试失败: ${error.message}`
        };
    }
}

// 检查端口占用情况
function checkPortStatus(port) {
    try {
        if (process.platform === 'win32') {
            const output = execSync(`netstat -ano | findstr :${port}`, { encoding: 'utf8' });
            return output.trim() !== '';
        } else {
            const output = execSync(`lsof -i :${port}`, { encoding: 'utf8' });
            return output.trim() !== '';
        }
    } catch (error) {
        return false;
    }
}

// 检查日志文件
function checkLogFiles() {
    console.log('\n📋 检查日志文件状态');
    
    const results = [];
    
    LOG_FILES.forEach(logPath => {
        try {
            if (fs.existsSync(logPath)) {
                const stats = fs.statSync(logPath);
                results.push({
                    file: path.basename(logPath),
                    status: '✅ 存在',
                    size: `${(stats.size / 1024).toFixed(2)} KB`,
                    modified: new Date(stats.mtime).toLocaleString()
                });
            } else {
                results.push({
                    file: path.basename(logPath),
                    status: '❌ 缺失',
                    size: 'N/A',
                    modified: 'N/A'
                });
            }
        } catch (error) {
            results.push({
                file: path.basename(logPath),
                status: '❌ 错误',
                size: 'N/A',
                modified: 'N/A',
                error: error.message
            });
        }
    });
    
    return results;
}

// 检查服务进程
function checkRunningProcesses() {
    console.log('\n🔍 检查运行中的进程');
    
    const processesToCheck = [
        { name: 'Start-JEV-Client.bat', cmd: 'Start-JEV-Client' },
        { name: 'start_jev_online.py', cmd: 'start_jev_online' },
        { name: 'start_web_server.py', cmd: 'start_web_server' }
    ];
    
    const results = [];
    
    processesToCheck.forEach(process => {
        try {
            if (process.platform === 'win32') {
                const output = execSync(`tasklist | findstr "${process.cmd}"`, { encoding: 'utf8' });
                results.push({
                    process: process.name,
                    status: output.trim() ? '✅ 运行中' : '❌ 未运行'
                });
            } else {
                // 模拟结果，在Windows上无法直接获取
                results.push({
                    process: process.name,
                    status: '⚠️  无法确认'
                });
            }
        } catch (error) {
            results.push({
                process: process.name,
                status: '❌ 未运行'
            });
        }
    });
    
    return results;
}

// 检查环境变量
function checkEnvironmentVariables() {
    console.log('\n📋 检查环境变量状态');
    
    const envVars = ['MODE', 'ALLOW_ORIGIN', 'JEV_API_KEY', 'ACCOUNT_ID'];
    const results = [];
    
    try {
        const envFile = fs.readFileSync(path.join(__dirname, '.env'), 'utf8');
        
        envVars.forEach(varName => {
            const regex = new RegExp(`${varName}="([^"]*)"`);
            const match = envFile.match(regex);
            
            if (match && match[1]) {
                const value = match[1];
                let status = '✅ 已配置';
                let securityLevel = '正常';
                
                if (value.includes('default') || value.includes('placeholder')) {
                    status = '⚠️  警告';
                    securityLevel = '使用了默认值或占位符';
                }
                
                results.push({
                    variable: varName,
                    status,
                    value: value.length > 15 ? value.substring(0, 15) + '...' : value,
                    securityLevel
                });
            } else {
                results.push({
                    variable: varName,
                    status: '❌ 未配置',
                    value: 'N/A',
                    securityLevel: '缺失'
                });
            }
        });
    } catch (error) {
        results.push({
            variable: 'ENV_FILE',
            status: '❌ 错误',
            value: 'N/A',
            error: error.message
        });
    }
    
    return results;
}

// 检查文件存在性
function checkKeyFiles() {
    console.log('\n📋 检查关键文件状态');
    
    const keyFiles = [
        { name: 'Worker文件', path: path.join(__dirname, 'worker_auto_fix.js') },
        { name: '配置文件', path: path.join(__dirname, 'wrangler.toml') },
        { name: '环境文件', path: path.join(__dirname, '.env') },
        { name: '检查脚本', path: path.join(__dirname, 'check_env_match.js') }
    ];
    
    const results = [];
    
    keyFiles.forEach(file => {
        try {
            if (fs.existsSync(file.path)) {
                results.push({
                    file: file.name,
                    path: file.path,
                    status: '✅ 存在'
                });
            } else {
                results.push({
                    file: file.name,
                    path: file.path,
                    status: '❌ 缺失'
                });
            }
        } catch (error) {
            results.push({
                file: file.name,
                path: file.path,
                status: '❌ 错误',
                error: error.message
            });
        }
    });
    
    return results;
}

// 生成连接状态报告
function generateConnectionReport(results) {
    const report = {
        timestamp: new Date().toISOString(),
        summary: {
            services: {
                total: results.services.length,
                success: results.services.filter(r => r.status.includes('✅')).length,
                warning: results.services.filter(r => r.status.includes('⚠️')).length,
                failed: results.services.filter(r => r.status.includes('❌')).length
            },
            apis: {
                total: results.apis.length,
                success: results.apis.filter(r => r.status.includes('✅')).length,
                warning: results.apis.filter(r => r.status.includes('⚠️')).length,
                failed: results.apis.filter(r => r.status.includes('❌')).length
            }
        },
        details: results
    };
    
    return report;
}

// 保存报告到文件
function saveReport(report) {
    try {
        const reportPath = path.join(__dirname, 'connection_status_report.json');
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');
        console.log(`\n✅ 连接状态报告已保存到: ${reportPath}`);
        return reportPath;
    } catch (error) {
        console.error(`\n❌ 保存报告失败: ${error.message}`);
        return null;
    }
}

// 打印总结
function printSummary(report) {
    console.log('\n========================================');
    console.log('        连接状态检查总结                ');
    console.log('========================================');
    
    const { summary } = report;
    
    console.log(`\n服务状态统计:`);
    console.log(`  总服务数: ${summary.services.total}`);
    console.log(`  成功: ${summary.services.success}`);
    console.log(`  警告: ${summary.services.warning}`);
    console.log(`  失败: ${summary.services.failed}`);
    
    console.log(`\nAPI状态统计:`);
    console.log(`  总API数: ${summary.apis.total}`);
    console.log(`  成功: ${summary.apis.success}`);
    console.log(`  警告: ${summary.apis.warning}`);
    console.log(`  失败: ${summary.apis.failed}`);
    
    // 计算整体状态
    const totalFailed = summary.services.failed + summary.apis.failed;
    const totalWarning = summary.services.warning + summary.apis.warning;
    
    if (totalFailed > 0) {
        console.log('\n整体状态: ❌ 存在严重连接问题');
    } else if (totalWarning > 0) {
        console.log('\n整体状态: ⚠️  存在警告但基本可用');
    } else {
        console.log('\n整体状态: ✅ 所有连接正常');
    }
}

// 主函数
async function main() {
    console.log('========================================');
    console.log('        系统连接状态检查                ');
    console.log('========================================');
    
    // 检查服务状态
    console.log('\n📡 正在检查Web服务状态...');
    const servicePromises = Object.values(SERVICES).map(checkHttpService);
    const serviceResults = await Promise.all(servicePromises);
    
    // 检查API端点
    console.log('\n🔌 正在测试API端点...');
    const apiPromises = API_ENDPOINTS.map(testApiEndpoint);
    const apiResults = await Promise.all(apiPromises);
    
    // 检查端口状态
    console.log('\n⚡ 检查关键端口状态');
    const ports = [8080, 1819, 1820];
    const portResults = [];
    
    ports.forEach(port => {
        const isRunning = checkPortStatus(port);
        portResults.push({
            port,
            status: isRunning ? '✅ 占用' : '❌ 空闲',
            message: isRunning ? `端口 ${port} 正在使用中` : `端口 ${port} 未被占用`
        });
    });
    
    // 其他检查
    const logResults = checkLogFiles();
    const processResults = checkRunningProcesses();
    const envResults = checkEnvironmentVariables();
    const fileResults = checkKeyFiles();
    
    // 输出详细结果
    console.log('\n========================================');
    console.log('        详细检查结果                    ');
    console.log('========================================');
    
    // 服务状态
    console.log('\n【Web服务状态】');
    serviceResults.forEach(result => {
        console.log(`  ${result.service}: ${result.status}`);
        console.log(`    ${result.details}`);
    });
    
    // API状态
    console.log('\n【API端点状态】');
    apiResults.forEach(result => {
        console.log(`  ${result.endpoint}: ${result.status}`);
        console.log(`    ${result.details}`);
    });
    
    // 端口状态
    console.log('\n【端口状态】');
    portResults.forEach(result => {
        console.log(`  端口 ${result.port}: ${result.status}`);
    });
    
    // 进程状态
    console.log('\n【进程状态】');
    processResults.forEach(result => {
        console.log(`  ${result.process}: ${result.status}`);
    });
    
    // 环境变量
    console.log('\n【环境变量】');
    envResults.forEach(result => {
        console.log(`  ${result.variable}: ${result.status}`);
        if (result.value !== 'N/A') {
            console.log(`    值: ${result.value} (安全级别: ${result.securityLevel})`);
        }
    });
    
    // 文件状态
    console.log('\n【关键文件】');
    fileResults.forEach(result => {
        console.log(`  ${result.file}: ${result.status}`);
    });
    
    // 日志文件
    console.log('\n【日志文件】');
    logResults.forEach(result => {
        console.log(`  ${result.file}: ${result.status}`);
        if (result.size !== 'N/A') {
            console.log(`    大小: ${result.size}, 修改时间: ${result.modified}`);
        }
    });
    
    // 生成报告
    const allResults = {
        services: serviceResults,
        apis: apiResults,
        ports: portResults,
        processes: processResults,
        environment: envResults,
        files: fileResults,
        logs: logResults
    };
    
    const report = generateConnectionReport(allResults);
    saveReport(report);
    printSummary(report);
    
    // 返回退出码
    const totalFailed = report.summary.services.failed + report.summary.apis.failed;
    return totalFailed === 0 ? 0 : 1;
}

// 运行主函数
main().then(exitCode => {
    process.exit(exitCode);
}).catch(error => {
    console.error(`\n❌ 检查过程发生错误: ${error.message}`);
    process.exit(1);
});