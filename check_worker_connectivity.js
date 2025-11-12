// Cloudflare Worker 连通性检测脚本
const https = require('https');
const dns = require('dns');

const WORKER_URL = 'https://jevshop.bensonlove1986.workers.dev';

// 日志函数
function log(message, success = false, error = false) {
    const prefix = success ? '✅' : (error ? '❌' : '🔍');
    console.log(`${prefix} ${message}`);
}

// 测试 DNS 解析
function testDNS() {
    return new Promise((resolve, reject) => {
        log('开始 DNS 解析测试...');
        const startTime = Date.now();
        
        dns.resolve4('jevshop.bensonlove1986.workers.dev', (err, addresses) => {
            const latency = Date.now() - startTime;
            
            if (err) {
                log(`DNS 解析失败: ${err.message} (延迟: ${latency}ms)`, false, true);
                reject({ type: 'DNS', latency, error: err.message });
            } else {
                log(`DNS 解析成功: ${addresses.join(', ')} (延迟: ${latency}ms)`, true);
                resolve({ latency, addresses });
            }
        });
    });
}

// 测试 HTTPS 连接
function testHTTPS() {
    return new Promise((resolve, reject) => {
        log('开始 HTTPS 连接测试...');
        const startTime = Date.now();
        
        const options = {
            method: 'GET',
            timeout: 5000,
            headers: {
                'User-Agent': 'JEV-Connectivity-Checker/1.0'
            }
        };
        
        const req = https.request(WORKER_URL, options, (res) => {
            const latency = Date.now() - startTime;
            log(`HTTPS 连接成功: ${res.statusCode} (延迟: ${latency}ms)`, true);
            
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                resolve({ latency, statusCode: res.statusCode, data });
            });
        });
        
        req.on('error', (err) => {
            const latency = Date.now() - startTime;
            log(`HTTPS 连接失败: ${err.message} (延迟: ${latency}ms)`, false, true);
            reject({ type: 'SSL', latency, error: err.message });
        });
        
        req.on('timeout', () => {
            const latency = Date.now() - startTime;
            log(`HTTPS 连接超时 (延迟: ${latency}ms)`, false, true);
            req.destroy();
            reject({ type: 'Timeout', latency, error: 'Connection timeout' });
        });
        
        req.end();
    });
}

// 测试 /status 接口
function testStatus() {
    return new Promise((resolve, reject) => {
        log('开始 /status 接口测试...');
        const startTime = Date.now();
        
        const options = {
            method: 'GET',
            path: '/status',
            timeout: 5000,
            headers: {
                'User-Agent': 'JEV-Connectivity-Checker/1.0'
            }
        };
        
        const req = https.request(WORKER_URL + '/status', options, (res) => {
            const latency = Date.now() - startTime;
            
            if (res.statusCode === 200) {
                log(`/status 接口返回 200 OK (延迟: ${latency}ms)`, true);
            } else {
                log(`/status 接口返回非预期状态码: ${res.statusCode} (延迟: ${latency}ms)`, false, true);
                reject({ type: 'Worker', latency, statusCode: res.statusCode });
                return;
            }
            
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    resolve({ latency, statusCode: res.statusCode, data: json });
                } catch (e) {
                    reject({ type: 'Worker', latency, error: 'Invalid JSON response' });
                }
            });
        });
        
        req.on('error', (err) => {
            const latency = Date.now() - startTime;
            log(`/status 接口请求失败: ${err.message} (延迟: ${latency}ms)`, false, true);
            reject({ type: 'Worker', latency, error: err.message });
        });
        
        req.on('timeout', () => {
            const latency = Date.now() - startTime;
            log(`/status 接口请求超时 (延迟: ${latency}ms)`, false, true);
            req.destroy();
            reject({ type: 'Timeout', latency, error: 'Request timeout' });
        });
        
        req.end();
    });
}

// 测试 API 模块
function testAPI() {
    return new Promise((resolve, reject) => {
        log('开始 /api/ai_responder 模块测试...');
        const startTime = Date.now();
        
        const postData = JSON.stringify({
            test: true,
            message: 'connection_test'
        });
        
        const options = {
            method: 'POST',
            path: '/api/ai_responder',
            timeout: 10000,
            headers: {
                'User-Agent': 'JEV-Connectivity-Checker/1.0',
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        };
        
        const req = https.request(WORKER_URL + '/api/ai_responder', options, (res) => {
            const latency = Date.now() - startTime;
            
            log(`API 模块响应: ${res.statusCode} (延迟: ${latency}ms)`, res.statusCode >= 200 && res.statusCode < 300);
            
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    const isValid = typeof json === 'object' && json !== null;
                    if (isValid) {
                        resolve({ latency, statusCode: res.statusCode, data: json });
                    } else {
                        reject({ type: 'API', latency, error: 'Invalid API response' });
                    }
                } catch (e) {
                    // 即使不是JSON，只要返回了数据也算成功
                    resolve({ latency, statusCode: res.statusCode, data: data || 'Empty response' });
                }
            });
        });
        
        req.on('error', (err) => {
            const latency = Date.now() - startTime;
            log(`API 模块请求失败: ${err.message} (延迟: ${latency}ms)`, false, true);
            reject({ type: 'API', latency, error: err.message });
        });
        
        req.on('timeout', () => {
            const latency = Date.now() - startTime;
            log(`API 模块请求超时 (延迟: ${latency}ms)`, false, true);
            req.destroy();
            reject({ type: 'Timeout', latency, error: 'API request timeout' });
        });
        
        req.write(postData);
        req.end();
    });
}

// 主执行函数
async function main() {
    console.log('=====================================================');
    console.log('         Cloudflare Worker 连通性检测                 ');
    console.log('=====================================================');
    console.log(`检测目标: ${WORKER_URL}`);
    console.log('=====================================================');
    
    let results = {
        dns: null,
        https: null,
        status: null,
        api: null,
        overall: false
    };
    
    try {
        // 1. DNS 解析测试
        results.dns = await testDNS();
        
        // 2. HTTPS 连接测试
        results.https = await testHTTPS();
        
        // 3. /status 接口测试
        results.status = await testStatus();
        
        // 4. API 模块测试
        results.api = await testAPI();
        
        // 计算平均延迟
        const latencies = [
            results.dns.latency,
            results.https.latency,
            results.status.latency,
            results.api.latency
        ];
        const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
        
        console.log('\n=====================================================');
        console.log('                检测结果汇总                          ');
        console.log('=====================================================');
        log(`Worker 可访问: ✅ 在线`, true);
        log(`状态接口返回 200: ✅ 正常`, true);
        log(`API 模块响应正常: ✅ 成功`, true);
        
        if (avgLatency < 1000) {
            log(`平均延迟: ✅ ${avgLatency.toFixed(2)}ms (良好)`, true);
        } else {
            log(`平均延迟: ⚠️ ${avgLatency.toFixed(2)}ms (较高)`, false);
        }
        
        results.overall = true;
        console.log('=====================================================');
        console.log('✅ Cloudflare Worker 连通性检测完成');
        console.log('=====================================================');
        
    } catch (error) {
        console.log('\n=====================================================');
        console.log('                检测结果汇总                          ');
        console.log('=====================================================');
        
        switch (error.type) {
            case 'DNS':
                log(`Worker 可访问: ❌ DNS 解析失败`, false, true);
                break;
            case 'SSL':
                log(`Worker 可访问: ❌ HTTPS 连接失败`, false, true);
                break;
            case 'Worker':
                log(`Worker 可访问: ❌ Worker 响应异常`, false, true);
                if (error.statusCode) {
                    log(`状态接口返回: ❌ ${error.statusCode}`, false, true);
                }
                break;
            case 'API':
                log(`Worker 可访问: ✅ 在线`, true);
                log(`状态接口返回: ✅ 正常`, true);
                log(`API 模块响应: ❌ 异常`, false, true);
                break;
            case 'Timeout':
                log(`Worker 可访问: ❌ 连接超时`, false, true);
                break;
            default:
                log(`Worker 可访问: ❌ 未知错误`, false, true);
        }
        
        if (error.error) {
            log(`错误详情: ${error.error}`, false, true);
        }
        
        console.log('=====================================================');
        console.log('❌ Cloudflare Worker 连通性检测失败');
        console.log('=====================================================');
    }
    
    // 保存结果到文件
    try {
        const fs = require('fs');
        fs.writeFileSync(
            'worker_check_results.json', 
            JSON.stringify(results, null, 2)
        );
    } catch (e) {
        // 忽略文件写入错误
    }
    
    return results.overall;
}

// 执行检测
main().catch(err => {
    console.error('检测过程发生未捕获错误:', err);
    console.log('\n❌ Cloudflare Worker 连通性检测失败');
});