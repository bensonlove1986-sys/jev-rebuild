// API KEY 环境检测脚本
// 用途：检测本地环境的API KEY配置、头部设置和验证机制

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

// 配置文件路径
const ENV_FILE_PATH = path.join(__dirname, '.env');
const WORKER_JS_PATH = path.join(__dirname, 'worker.js');
const REPORT_FILE = path.join(__dirname, 'api_key_verification_report.json');

// 检测结果
const report = {
    timestamp: new Date().toISOString(),
    environment: {},
    api_keys: {},
    header_verification: {},
    issues: [],
    recommendations: []
};

// 读取.env文件
function readEnvFile() {
    try {
        if (fs.existsSync(ENV_FILE_PATH)) {
            const envContent = fs.readFileSync(ENV_FILE_PATH, 'utf8');
            const lines = envContent.split('\n').filter(line => line.trim() && !line.trim().startsWith('#'));
            
            lines.forEach(line => {
                const [key, value] = line.split('=').map(part => part.trim());
                if (key && value) {
                    // 移除引号
                    const cleanValue = value.replace(/^"|"$/g, '').replace(/^'|'$/g, '');
                    report.environment[key] = cleanValue;
                    
                    // 识别API密钥
                    if (key.includes('API_KEY') || key.includes('TOKEN')) {
                        report.api_keys[key] = {
                            value: cleanValue,
                            is_placeholder: cleanValue.toLowerCase().includes('your_') || cleanValue.toLowerCase().includes('placeholder'),
                            length: cleanValue.length
                        };
                    }
                }
            });
        } else {
            report.issues.push('未找到.env文件');
        }
    } catch (error) {
        report.issues.push(`读取.env文件失败: ${error.message}`);
    }
}

// 读取worker.js中的验证逻辑
function analyzeWorkerJs() {
    try {
        if (fs.existsSync(WORKER_JS_PATH)) {
            const workerContent = fs.readFileSync(WORKER_JS_PATH, 'utf8');
            
            // 分析validateRequest函数
            if (workerContent.includes('validateRequest')) {
                report.header_verification.auth_methods = [];
                
                if (workerContent.includes('authHeader && authHeader.startsWith(\'Bearer \')')) {
                    report.header_verification.auth_methods.push('Authorization: Bearer');
                }
                
                if (workerContent.includes('xAuthKey = request.headers.get(\'X-Auth-Key\')')) {
                    report.header_verification.auth_methods.push('X-Auth-Key');
                }
                
                if (workerContent.includes('xAdminToken = request.headers.get(\'X-Admin-Token\')')) {
                    report.header_verification.auth_methods.push('X-Admin-Token');
                }
                
                if (workerContent.includes('xMonitorToken = request.headers.get(\'X-Monitor-Token\')')) {
                    report.header_verification.auth_methods.push('X-Monitor-Token');
                }
                
                // 检查必需头部配置
                report.header_verification.required_headers_supported = workerContent.includes('REQUIRED_HEADERS');
            }
            
            // 分析getSecurityConfig函数
            if (workerContent.includes('getSecurityConfig')) {
                report.header_verification.origin_check_enabled = workerContent.includes('securityConfig.MODE !== \'development\'');
            }
        } else {
            report.issues.push('未找到worker.js文件');
        }
    } catch (error) {
        report.issues.push(`读取worker.js文件失败: ${error.message}`);
    }
}

// 检查API密钥有效性
function checkApiKeysValidity() {
    Object.keys(report.api_keys).forEach(key => {
        const apiKeyInfo = report.api_keys[key];
        
        if (apiKeyInfo.is_placeholder) {
            report.issues.push(`${key} 包含占位符值，请更新为实际密钥`);
            report.recommendations.push(`更新 ${key} 为有效的API密钥`);
        }
        
        if (apiKeyInfo.length < 8) {
            report.issues.push(`${key} 的值太短，可能不是有效的API密钥`);
            report.recommendations.push(`确保 ${key} 是长度足够的安全密钥`);
        }
    });
}

// 检查环境配置
function checkEnvironmentConfig() {
    const mode = report.environment.MODE;
    const allowOrigin = report.environment.ALLOW_ORIGIN;
    
    if (mode === 'production' && (!allowOrigin || allowOrigin === '*')) {
        report.issues.push('生产环境配置使用了通配符Origin (*)，这可能存在安全风险');
        report.recommendations.push('在生产环境中，应该指定具体的允许来源域名');
    }
    
    // 检查JEV_API_KEY是否设置
    if (!report.api_keys.JEV_API_KEY) {
        report.issues.push('未配置JEV_API_KEY');
        report.recommendations.push('请在.env文件中设置JEV_API_KEY');
    }
}

// 生成检测报告
function generateReport() {
    // 汇总结果
    report.summary = {
        total_api_keys: Object.keys(report.api_keys).length,
        placeholder_keys: Object.values(report.api_keys).filter(k => k.is_placeholder).length,
        auth_methods_count: report.header_verification.auth_methods ? report.header_verification.auth_methods.length : 0,
        issues_count: report.issues.length,
        recommendations_count: report.recommendations.length,
        status: report.issues.length === 0 ? 'ok' : 'warning'
    };
    
    // 写入报告文件
    try {
        fs.writeFileSync(REPORT_FILE, JSON.stringify(report, null, 2), 'utf8');
        console.log(`\nAPI KEY 检测报告已生成: ${REPORT_FILE}`);
        console.log(`\n=== 检测摘要 ===`);
        console.log(`状态: ${report.summary.status === 'ok' ? '✓ 正常' : '! 警告'}`);
        console.log(`API密钥数量: ${report.summary.total_api_keys}`);
        console.log(`占位符密钥: ${report.summary.placeholder_keys}`);
        console.log(`支持的认证方式: ${report.summary.auth_methods_count}`);
        console.log(`发现问题: ${report.summary.issues_count}`);
        console.log(`\n=== 推荐修复 ===`);
        report.recommendations.forEach((rec, index) => {
            console.log(`${index + 1}. ${rec}`);
        });
        
        if (report.issues.length > 0) {
            console.log(`\n=== 发现的问题 ===`);
            report.issues.forEach((issue, index) => {
                console.log(`${index + 1}. ${issue}`);
            });
        }
        
    } catch (error) {
        console.error(`写入报告失败: ${error.message}`);
    }
}

// 运行检测
console.log('开始API KEY环境检测...');
readEnvFile();
analyzeWorkerJs();
checkApiKeysValidity();
checkEnvironmentConfig();
generateReport();