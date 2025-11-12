// JEV Worker 通知脚本
// 功能：读取检测报告，发送WhatsApp告警通知

const fs = require('fs');
const path = require('path');
const https = require('https');

// 配置参数
const REPORT_DIR = 'D:\\JEV';
const DAOJIE_API_KEY = 'YOUR_DAOJIE_API_KEY'; // 请替换为实际的API密钥
const WHATSAPP_CONFIG = {
    locationId: '3SsfTbU1lmAPpkG9iB6C',
    toNumber: '+8615757759002',
    apiUrl: 'https://services.leadconnectorhq.com/conversations/messages'
};

/**
 * 读取最新的检测报告
 */
function getLatestReport() {
    try {
        const files = fs.readdirSync(REPORT_DIR);
        const reportFiles = files.filter(file => file.startsWith('verify_result_') && file.endsWith('.json'));
        
        if (reportFiles.length === 0) {
            console.log('[通知] 未找到检测报告文件');
            return null;
        }
        
        // 按文件名排序，获取最新的报告
        reportFiles.sort((a, b) => {
            return new Date(b.replace('verify_result_', '').replace('.json', '').replace('_', ' ')) - 
                   new Date(a.replace('verify_result_', '').replace('.json', '').replace('_', ' '));
        });
        
        const latestFile = path.join(REPORT_DIR, reportFiles[0]);
        const content = fs.readFileSync(latestFile, 'utf8');
        
        console.log(`[通知] 读取报告: ${reportFiles[0]}`);
        return JSON.parse(content);
    } catch (error) {
        console.error(`[通知] 读取报告失败: ${error.message}`);
        return null;
    }
}

/**
 * 构建通知消息
 */
function buildNotificationMessage(report, status) {
    if (status === 'success') {
        return '✅ JEV Worker系统一切正常';
    }
    
    let message = '🚨 检测到JEV Worker服务异常：\n';
    
    if (report && report.results) {
        const failedEndpoints = report.results.filter(result => !result.success);
        
        if (failedEndpoints.length > 0) {
            failedEndpoints.forEach(endpoint => {
                message += `- ${endpoint.endpoint}: ${endpoint.error}\n`;
            });
        } else {
            message += '- 未知错误\n';
        }
    } else {
        message += '- 无法读取报告内容\n';
    }
    
    message += `\n检测时间: ${new Date().toLocaleString('zh-CN')}`;
    return message;
}

/**
 * 发送WhatsApp消息
 */
function sendWhatsappMessage(message) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: new URL(WHATSAPP_CONFIG.apiUrl).hostname,
            path: new URL(WHATSAPP_CONFIG.apiUrl).pathname,
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${DAOJIE_API_KEY}`,
                'Version': '2021-07-28',
                'Content-Type': 'application/json'
            }
        };
        
        const body = JSON.stringify({
            locationId: WHATSAPP_CONFIG.locationId,
            toNumber: WHATSAPP_CONFIG.toNumber,
            message: message
        });
        
        const req = https.request(options, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                console.log(`[通知] 消息发送成功，状态码: ${res.statusCode}`);
                resolve({ success: true, statusCode: res.statusCode });
            });
        });
        
        req.on('error', (error) => {
            console.error(`[通知] 消息发送失败: ${error.message}`);
            reject(error);
        });
        
        req.write(body);
        req.end();
    });
}

/**
 * 主函数
 */
async function main() {
    const status = process.argv[2] || 'fail';
    console.log(`[通知] 开始发送${status === 'success' ? '正常' : '告警'}通知`);
    
    // 获取最新报告
    const report = getLatestReport();
    
    // 构建消息
    const message = buildNotificationMessage(report, status);
    
    // 发送消息
    try {
        await sendWhatsappMessage(message);
        console.log(`[通知] ${status === 'success' ? '正常' : '告警'}通知发送完成`);
    } catch (error) {
        console.error(`[通知] 发送失败: ${error.message}`);
        process.exit(1);
    }
}

// 执行主函数
main();