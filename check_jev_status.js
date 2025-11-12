// JEV系统状态监控脚本
// 用于检查所有组件的运行状态和连接情况

const http = require('http');
const fs = require('fs');
const path = require('path');

console.log('==========================================');
console.log('        JEV系统状态监控工具');
console.log('==========================================\n');

// 组件配置
const components = [
    {
        name: '中继服务器',
        url: 'http://localhost:3000/api/relay/ping',
        description: '系统通信核心组件'
    },
    {
        name: '中控端',
        url: 'http://localhost:4000/api/health',
        description: '系统管理和控制中心'
    },
    {
        name: '客户端',
        url: 'http://localhost:5000/api/client/status',
        description: '终端用户界面组件'
    }
];

// 简化的fetch函数
function fetch(url) {
    return new Promise((resolve, reject) => {
        http.get(url, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                resolve({
                    statusCode: res.statusCode,
                    data: data
                });
            });
        }).on('error', (err) => {
            reject(err);
        });
    });
}

// 检查组件状态
async function checkComponentStatus(component) {
    console.log(`检查 ${component.name} (${component.description})...`);
    console.log(`  URL: ${component.url}`);
    
    try {
        const response = await fetch(component.url);
        
        if (response.statusCode === 200) {
            try {
                const jsonData = JSON.parse(response.data);
                console.log(`  状态: ✅ 正常运行`);
                console.log(`  响应: ${JSON.stringify(jsonData)}`);
                return true;
            } catch (e) {
                console.log(`  状态: ⚠️ 返回了数据但格式无效`);
                console.log(`  响应内容: ${response.data.substring(0, 100)}...`);
                return false;
            }
        } else {
            console.log(`  状态: ❌ 请求失败 (HTTP ${response.statusCode})`);
            return false;
        }
    } catch (error) {
        console.log(`  状态: ❌ 连接失败`);
        console.log(`  错误: ${error.message}`);
        return false;
    }
}

// 检查内部API通信
async function checkInternalCommunication() {
    console.log('\n==========================================');
    console.log('         检查内部组件通信...');
    console.log('==========================================\n');
    
    try {
        console.log('检查中控端系统状态API...');
        const response = await fetch('http://localhost:4000/api/status');
        
        if (response.statusCode === 200) {
            const statusData = JSON.parse(response.data);
            console.log('中控端系统状态:');
            console.log(`  Worker: ${statusData.worker}`);
            console.log(`  Relay: ${statusData.relay}`);
            console.log(`  Clients: ${statusData.clients}`);
            console.log(`  System State: ${statusData.systemState}`);
            console.log(`  Lock: ${statusData.lock}`);
            console.log(`  Version: ${statusData.version}`);
        }
    } catch (error) {
        console.log(`内部通信检查失败: ${error.message}`);
    }
}

// 主函数
async function main() {
    let successCount = 0;
    
    for (const component of components) {
        const success = await checkComponentStatus(component);
        if (success) successCount++;
        console.log('');
    }
    
    // 检查内部通信
    await checkInternalCommunication();
    
    // 总体状态
    console.log('\n==========================================');
    console.log('              总体状态报告');
    console.log('==========================================');
    console.log(`系统健康度: ${Math.round((successCount / components.length) * 100)}% (${successCount}/${components.length} 组件正常)`);
    
    if (successCount === components.length) {
        console.log('✅ JEV系统所有组件运行正常，可以正常使用。');
    } else {
        console.log('❌ 部分组件运行异常，建议检查相关服务。');
    }
    
    console.log('\n提示：');
    console.log('1. 如遇组件无法访问，请检查对应服务是否正常启动');
    console.log('2. 可使用 start_jev_system.bat 一键重启所有服务');
    console.log('3. 查看各组件日志获取详细错误信息');
    console.log('==========================================');
}

// 执行检查
main();