/**
 * KV上传测试脚本
 * 功能：测试Cloudflare Worker的KV存储功能并上传JEV提示词协议
 */

const fs = require('fs');
const https = require('https');

// 读取协议文件
function readProtocolFile() {
    try {
        const content = fs.readFileSync('d:\\PDF转网页\\jev_prompt_protocol.json', 'utf8');
        return JSON.parse(content);
    } catch (error) {
        console.error('读取协议文件失败:', error.message);
        return null;
    }
}

// 测试Worker连接
testWorkerConnection();

async function testWorkerConnection() {
    console.log('开始测试Worker连接...');
    
    // 测试ping端点
    testEndpoint('ping', 'GET');
    
    // 测试kv-test端点
    setTimeout(() => {
        testEndpoint('kv-test', 'GET');
    }, 1000);
    
    // 测试上传协议
    setTimeout(() => {
        uploadProtocol();
    }, 2000);
}

function testEndpoint(endpoint, method) {
    const options = {
        hostname: 'jevshop.bensonlove1986.workers.dev',
        port: 443,
        path: `/${endpoint}`,
        method: method,
        headers: {
            'Content-Type': 'application/json'
        }
    };
    
    const req = https.request(options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
            data += chunk;
        });
        
        res.on('end', () => {
            console.log(`/${endpoint} 响应 (状态码: ${res.statusCode}):`);
            try {
                console.log(JSON.parse(data));
            } catch {
                console.log(data);
            }
        });
    });
    
    req.on('error', (error) => {
        console.error(`/${endpoint} 请求失败:`, error.message);
    });
    
    req.end();
}

function uploadProtocol() {
    console.log('尝试上传JEV提示词协议...');
    
    const protocol = readProtocolFile();
    if (!protocol) return;
    
    // 由于Worker没有直接的配置上传端点，我们尝试使用/ui端点作为替代
    const options = {
        hostname: 'jevshop.bensonlove1986.workers.dev',
        port: 443,
        path: '/ui',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(JSON.stringify(protocol))
        }
    };
    
    const req = https.request(options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
            data += chunk;
        });
        
        res.on('end', () => {
            console.log('协议上传响应 (状态码: ' + res.statusCode + '):');
            try {
                console.log(JSON.parse(data));
            } catch {
                console.log(data);
            }
            
            // 尝试读取上传的数据
            if (res.statusCode === 200) {
                setTimeout(() => {
                    testEndpoint('ui', 'GET');
                }, 1000);
            }
        });
    });
    
    req.on('error', (error) => {
        console.error('协议上传失败:', error.message);
    });
    
    req.write(JSON.stringify(protocol));
    req.end();
}

console.log('脚本执行完成，请查看输出结果。');
