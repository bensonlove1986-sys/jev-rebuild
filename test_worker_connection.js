// Worker连接全面测试脚本
// 功能：验证本地环境与Worker之间的连接初始化、数据传输和双向通信功能

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

// 配置信息
const CONFIG = {
    // 本地Worker端点（根据实际配置调整）
    localWorkerUrls: {
        ping: 'http://localhost:1819/ping',
        status: 'http://localhost:1819/status',
        // 如果有其他API端点，可以添加在这里
    },
    // 测试参数
    testParams: {
        retryCount: 5,           // 稳定性测试的重试次数
        timeoutMs: 5000,         // 超时时间
        payloadSizes: [          // 测试不同大小的数据包
            { size: 'small', data: { message: 'Hello' } },
            { size: 'medium', data: { message: 'Medium payload with some additional data', timestamp: Date.now(), values: Array(100).fill(1) } },
            { size: 'large', data: { message: 'Large payload test', dataArray: Array(1000).fill({ id: 1, value: 'test' }) } }
        ]
    }
};

// 测试结果统计
let testStats = {
    totalTests: 0,
    passedTests: 0,
    failedTests: 0,
    startTime: Date.now(),
    results: []
};

// HTTP请求函数
async function makeHttpRequest(url, options = {}) {
    const protocol = url.startsWith('https') ? https : http;
    
    return new Promise((resolve, reject) => {
        const req = protocol.request(url, options, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                resolve({
                    statusCode: res.statusCode,
                    headers: res.headers,
                    data: data,
                    size: data.length
                });
            });
        });
        
        req.on('error', (error) => {
            reject(error);
        });
        
        // 处理请求体
        if (options.body) {
            req.write(JSON.stringify(options.body));
        }
        
        req.end();
    });
}

// 测试连接初始化
async function testConnectionInitialization() {
    console.log('\n========================================');
    console.log('1. 测试连接初始化过程');
    console.log('========================================');
    
    for (const [endpoint, url] of Object.entries(CONFIG.localWorkerUrls)) {
        try {
            testStats.totalTests++;
            console.log(`\n🔍 测试端点: ${endpoint} (${url})`);
            
            const startTime = Date.now();
            const response = await makeHttpRequest(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            });
            const latency = Date.now() - startTime;
            
            console.log(`✅ 连接成功: ${endpoint}`);
            console.log(`   状态码: ${response.statusCode}`);
            console.log(`   响应大小: ${response.size} 字节`);
            console.log(`   延迟: ${latency} ms`);
            
            // 验证JSON格式响应
            try {
                const jsonData = JSON.parse(response.data);
                console.log(`   JSON结构: ${Object.keys(jsonData).join(', ')}`);
                testStats.passedTests++;
                testStats.results.push({
                    test: `初始化-${endpoint}`,
                    status: 'passed',
                    latency: latency,
                    details: `状态码: ${response.statusCode}`
                });
            } catch (e) {
                console.error(`❌ 响应不是有效的JSON格式`);
                testStats.failedTests++;
                testStats.results.push({
                    test: `初始化-${endpoint}`,
                    status: 'failed',
                    error: '响应不是有效的JSON格式'
                });
            }
        } catch (error) {
            console.error(`❌ 连接失败: ${endpoint}`);
            console.error(`   错误: ${error.message}`);
            testStats.failedTests++;
            testStats.results.push({
                test: `初始化-${endpoint}`,
                status: 'failed',
                error: error.message
            });
        }
    }
}

// 测试数据传输通道
async function testDataTransfer() {
    console.log('\n========================================');
    console.log('2. 测试数据传输通道');
    console.log('========================================');
    
    // 测试不同大小的数据包
    for (const payload of CONFIG.testParams.payloadSizes) {
        try {
            testStats.totalTests++;
            console.log(`\n🔍 测试${payload.size}数据包传输`);
            
            // 使用ping端点测试，因为它应该接受并回显数据
            const url = CONFIG.localWorkerUrls.ping;
            const payloadStr = JSON.stringify(payload.data);
            
            console.log(`   发送数据大小: ${payloadStr.length} 字节`);
            
            const startTime = Date.now();
            const response = await makeHttpRequest(url, {
                method: 'POST', // 如果服务器支持POST
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: payload.data
            });
            const latency = Date.now() - startTime;
            
            console.log(`✅ 数据传输成功`);
            console.log(`   状态码: ${response.statusCode}`);
            console.log(`   响应大小: ${response.size} 字节`);
            console.log(`   传输延迟: ${latency} ms`);
            
            testStats.passedTests++;
            testStats.results.push({
                test: `数据传输-${payload.size}`,
                status: 'passed',
                latency: latency,
                payloadSize: payloadStr.length,
                responseSize: response.size
            });
        } catch (error) {
            console.error(`❌ 数据传输失败: ${payload.size}数据包`);
            console.error(`   错误: ${error.message}`);
            testStats.failedTests++;
            testStats.results.push({
                test: `数据传输-${payload.size}`,
                status: 'failed',
                error: error.message
            });
        }
    }
}

// 测试稳定性（多次请求）
async function testStability() {
    console.log('\n========================================');
    console.log('3. 测试连接稳定性（多次请求）');
    console.log('========================================');
    
    const url = CONFIG.localWorkerUrls.ping;
    const retryCount = CONFIG.testParams.retryCount;
    
    console.log(`🔍 执行${retryCount}次连续请求测试`);
    
    let successCount = 0;
    const latencies = [];
    
    for (let i = 1; i <= retryCount; i++) {
        try {
            testStats.totalTests++;
            const startTime = Date.now();
            const response = await makeHttpRequest(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            });
            const latency = Date.now() - startTime;
            latencies.push(latency);
            
            successCount++;
            testStats.passedTests++;
            
            console.log(`✅ 请求 ${i}/${retryCount}: 成功 (${latency} ms)`);
            testStats.results.push({
                test: `稳定性-${i}`,
                status: 'passed',
                latency: latency
            });
        } catch (error) {
            console.error(`❌ 请求 ${i}/${retryCount}: 失败 - ${error.message}`);
            testStats.failedTests++;
            testStats.results.push({
                test: `稳定性-${i}`,
                status: 'failed',
                error: error.message
            });
        }
    }
    
    // 计算统计信息
    if (latencies.length > 0) {
        const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
        const minLatency = Math.min(...latencies);
        const maxLatency = Math.max(...latencies);
        
        console.log(`\n📊 稳定性统计:`);
        console.log(`   成功率: ${(successCount / retryCount * 100).toFixed(2)}% (${successCount}/${retryCount})`);
        console.log(`   平均延迟: ${avgLatency.toFixed(2)} ms`);
        console.log(`   最小延迟: ${minLatency} ms`);
        console.log(`   最大延迟: ${maxLatency} ms`);
    }
}

// 测试双向通信（如果支持）
async function testBidirectionalCommunication() {
    console.log('\n========================================');
    console.log('4. 测试双向通信功能');
    console.log('========================================');
    
    try {
        testStats.totalTests++;
        // 使用ping和status端点模拟双向通信
        console.log('🔍 测试ping-pong双向通信模式');
        
        // 先发送ping
        const pingStart = Date.now();
        const pingResponse = await makeHttpRequest(CONFIG.localWorkerUrls.ping, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });
        const pingTime = Date.now() - pingStart;
        
        // 再获取status
        const statusStart = Date.now();
        const statusResponse = await makeHttpRequest(CONFIG.localWorkerUrls.status, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });
        const statusTime = Date.now() - statusStart;
        
        console.log(`✅ ping请求成功: ${pingTime} ms`);
        console.log(`✅ status请求成功: ${statusTime} ms`);
        console.log(`✅ 双向通信测试通过`);
        
        testStats.passedTests++;
        testStats.results.push({
            test: '双向通信',
            status: 'passed',
            pingLatency: pingTime,
            statusLatency: statusTime
        });
    } catch (error) {
        console.error(`❌ 双向通信测试失败`);
        console.error(`   错误: ${error.message}`);
        testStats.failedTests++;
        testStats.results.push({
            test: '双向通信',
            status: 'failed',
            error: error.message
        });
    }
}

// 生成连接报告
function generateConnectionReport() {
    console.log('\n========================================');
    console.log('5. 连接测试报告');
    console.log('========================================');
    
    const totalTime = (Date.now() - testStats.startTime) / 1000;
    const passRate = (testStats.passedTests / testStats.totalTests * 100).toFixed(2);
    
    console.log(`\n📋 测试概览:`);
    console.log(`   总测试数: ${testStats.totalTests}`);
    console.log(`   通过测试: ${testStats.passedTests}`);
    console.log(`   失败测试: ${testStats.failedTests}`);
    console.log(`   成功率: ${passRate}%`);
    console.log(`   总耗时: ${totalTime.toFixed(2)} 秒`);
    
    // 确定整体状态
    let overallStatus = 'ok';
    let statusMessage = '✓ 连接正常';
    
    if (testStats.failedTests > 0) {
        if (passRate >= 70) {
            overallStatus = 'warning';
            statusMessage = '⚠️  连接不稳定';
        } else {
            overallStatus = 'error';
            statusMessage = '❌ 连接失败';
        }
    }
    
    console.log(`\n📊 整体状态: ${statusMessage}`);
    
    // 保存详细报告
    const report = {
        timestamp: new Date().toISOString(),
        overallStatus,
        passRate: parseFloat(passRate),
        testStats: {
            total: testStats.totalTests,
            passed: testStats.passedTests,
            failed: testStats.failedTests,
            duration: totalTime
        },
        results: testStats.results,
        environment: {
            nodeVersion: process.version,
            platform: process.platform
        }
    };
    
    const reportPath = path.join(__dirname, 'worker_connection_report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n✅ 详细报告已保存至: ${reportPath}`);
    
    return overallStatus === 'ok';
}

// 主函数
async function main() {
    console.log('========================================');
    console.log('   Worker连接全面测试工具');
    console.log('========================================');
    console.log('测试本地环境与Worker之间的连接状态...');
    
    try {
        // 运行各项测试
        await testConnectionInitialization();
        await testDataTransfer();
        await testStability();
        await testBidirectionalCommunication();
        
        // 生成报告并返回结果
        const success = generateConnectionReport();
        
        // 根据测试结果设置退出码
        process.exit(success ? 0 : 1);
    } catch (error) {
        console.error('\n❌ 测试过程中发生错误:', error);
        process.exit(1);
    }
}

// 运行测试
main();
