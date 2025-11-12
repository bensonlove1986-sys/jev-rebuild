// API KEY 详细验证脚本
// 用途：验证所有API密钥的有效性，并与worker.js中的默认值进行比对

const fs = require('fs');
const path = require('path');

// 配置文件路径
const ENV_FILE_PATH = path.join(__dirname, '.env');
const WORKER_JS_PATH = path.join(__dirname, 'worker.js');
const REPORT_FILE = path.join(__dirname, 'api_key_validation_detailed.json');

// 验证结果
const validation = {
    timestamp: new Date().toISOString(),
    env_file_keys: {},
    worker_default_keys: {},
    validation_results: {},
    issues: [],
    recommendations: []
};

// 读取.env文件中的API密钥
function readEnvFileKeys() {
    try {
        if (fs.existsSync(ENV_FILE_PATH)) {
            const envContent = fs.readFileSync(ENV_FILE_PATH, 'utf8');
            const lines = envContent.split('\n').filter(line => line.trim() && !line.trim().startsWith('#'));
            
            lines.forEach(line => {
                const [key, value] = line.split('=').map(part => part.trim());
                if (key && value) {
                    // 移除引号
                    const cleanValue = value.replace(/^"|"$/g, '').replace(/^'|'$/g, '');
                    if (key.includes('API_KEY') || key.includes('TOKEN')) {
                        validation.env_file_keys[key] = {
                            value: cleanValue,
                            is_placeholder: cleanValue.toLowerCase().includes('your_') || 
                                          cleanValue.toLowerCase().includes('placeholder') ||
                                          cleanValue.toLowerCase().includes('default'),
                            is_default: false, // 将在后续比对中设置
                            length: cleanValue.length
                        };
                    }
                }
            });
        } else {
            validation.issues.push('未找到.env文件');
        }
    } catch (error) {
        validation.issues.push(`读取.env文件失败: ${error.message}`);
    }
}

// 从worker.js中提取默认API密钥
function extractWorkerDefaultKeys() {
    try {
        if (fs.existsSync(WORKER_JS_PATH)) {
            const workerContent = fs.readFileSync(WORKER_JS_PATH, 'utf8');
            
            // 提取getSecurityConfig函数中的默认值
            const getSecurityConfigMatch = workerContent.match(/function getSecurityConfig\([^)]*\)\s*{[\s\S]*?return\s*{([\s\S]*?)}\s*};?/);
            if (getSecurityConfigMatch && getSecurityConfigMatch[1]) {
                const configBody = getSecurityConfigMatch[1];
                
                // 匹配所有的API密钥和TOKEN配置
                const keyValueMatches = configBody.match(/(\w+?)\s*:\s*currentEnv\.\1\s*\|\|\s*env\?\.\1\s*\|\|\s*['"](.+?)['"]/g);
                
                if (keyValueMatches) {
                    keyValueMatches.forEach(match => {
                        const parts = match.split(':').map(p => p.trim());
                        if (parts.length === 2) {
                            const key = parts[0];
                            // 提取默认值
                            const defaultValueMatch = parts[1].match(/['"](.+?)['"]/);
                            if (defaultValueMatch && defaultValueMatch[1]) {
                                const defaultValue = defaultValueMatch[1];
                                validation.worker_default_keys[key] = defaultValue;
                            }
                        }
                    });
                }
            }
            
            // 也检查cloudflare默认环境中的值
            const cloudflareEnvMatch = workerContent.match(/cloudflare\s*:\s*{\s*env\s*:\s*{([\s\S]*?)}\s*}/);
            if (cloudflareEnvMatch && cloudflareEnvMatch[1]) {
                const envBody = cloudflareEnvMatch[1];
                const envKeyValueMatches = envBody.match(/(\w+?)\s*:\s*['"](.+?)['"]/g);
                
                if (envKeyValueMatches) {
                    envKeyValueMatches.forEach(match => {
                        const parts = match.split(':').map(p => p.trim());
                        if (parts.length === 2) {
                            const key = parts[0];
                            const defaultValue = parts[1].replace(/['"]/g, '');
                            // 只有当之前没有找到默认值时才设置
                            if (!validation.worker_default_keys[key]) {
                                validation.worker_default_keys[key] = defaultValue;
                            }
                        }
                    });
                }
            }
        } else {
            validation.issues.push('未找到worker.js文件');
        }
    } catch (error) {
        validation.issues.push(`读取worker.js文件失败: ${error.message}`);
    }
}

// 验证API密钥
function validateApiKeys() {
    // 验证.env文件中的密钥
    Object.keys(validation.env_file_keys).forEach(key => {
        const envKeyInfo = validation.env_file_keys[key];
        const workerDefaultValue = validation.worker_default_keys[key];
        
        validation.validation_results[key] = {
            env_value: envKeyInfo.value,
            worker_default: workerDefaultValue || '未在worker.js中找到',
            is_placeholder: envKeyInfo.is_placeholder,
            is_default_value: workerDefaultValue && envKeyInfo.value === workerDefaultValue,
            status: 'unknown'
        };
        
        const result = validation.validation_results[key];
        
        if (result.is_placeholder) {
            result.status = 'placeholder';
            validation.issues.push(`${key} 包含占位符值: ${result.env_value}`);
            validation.recommendations.push(`更新 ${key} 为实际的API密钥`);
        } else if (result.is_default_value) {
            result.status = 'default';
            validation.issues.push(`${key} 仍使用默认值: ${result.env_value}`);
            validation.recommendations.push(`${key} 应该使用非默认的安全密钥`);
        } else if (!workerDefaultValue) {
            result.status = 'unknown_worker';
            validation.issues.push(`${key} 在worker.js中未找到对应的默认配置`);
            validation.recommendations.push(`确认 ${key} 是否需要在worker.js中配置`);
        } else {
            result.status = 'custom';
        }
    });
    
    // 检查worker.js中有但.env文件中没有的密钥
    Object.keys(validation.worker_default_keys).forEach(key => {
        if (!validation.env_file_keys[key]) {
            validation.validation_results[key] = {
                env_value: '未在.env文件中配置',
                worker_default: validation.worker_default_keys[key],
                is_placeholder: false,
                is_default_value: false,
                status: 'missing'
            };
            validation.issues.push(`${key} 在.env文件中缺失，worker.js中使用默认值: ${validation.worker_default_keys[key]}`);
            validation.recommendations.push(`在.env文件中配置 ${key} 以覆盖默认值`);
        }
    });
}

// 生成验证报告
function generateValidationReport() {
    // 汇总统计
    const stats = {
        total_keys_checked: Object.keys(validation.validation_results).length,
        placeholder_keys: Object.values(validation.validation_results).filter(r => r.status === 'placeholder').length,
        default_keys: Object.values(validation.validation_results).filter(r => r.status === 'default').length,
        missing_keys: Object.values(validation.validation_results).filter(r => r.status === 'missing').length,
        custom_keys: Object.values(validation.validation_results).filter(r => r.status === 'custom').length,
        unknown_worker_keys: Object.values(validation.validation_results).filter(r => r.status === 'unknown_worker').length,
        issues_count: validation.issues.length,
        recommendations_count: validation.recommendations.length,
        overall_status: validation.issues.length === 0 ? 'ok' : 'warning'
    };
    
    validation.statistics = stats;
    
    // 写入报告文件
    try {
        fs.writeFileSync(REPORT_FILE, JSON.stringify(validation, null, 2), 'utf8');
        console.log(`\n=== API KEY 详细验证报告 ===`);
        console.log(`报告保存至: ${REPORT_FILE}`);
        console.log(`\n=== 验证统计 ===`);
        console.log(`总检查密钥数: ${stats.total_keys_checked}`);
        console.log(`占位符密钥: ${stats.placeholder_keys}`);
        console.log(`默认值密钥: ${stats.default_keys}`);
        console.log(`缺失密钥: ${stats.missing_keys}`);
        console.log(`自定义密钥: ${stats.custom_keys}`);
        console.log(`未知worker密钥: ${stats.unknown_worker_keys}`);
        console.log(`整体状态: ${stats.overall_status === 'ok' ? '✓ 正常' : '! 警告'}`);
        
        console.log(`\n=== 发现的问题 ===`);
        if (validation.issues.length > 0) {
            validation.issues.forEach((issue, index) => {
                console.log(`${index + 1}. ${issue}`);
            });
        } else {
            console.log('未发现问题');
        }
        
        console.log(`\n=== 推荐操作 ===`);
        if (validation.recommendations.length > 0) {
            validation.recommendations.forEach((rec, index) => {
                console.log(`${index + 1}. ${rec}`);
            });
        } else {
            console.log('无需特别操作');
        }
        
        console.log(`\n=== 详细验证结果 ===`);
        Object.keys(validation.validation_results).forEach(key => {
            const result = validation.validation_results[key];
            let statusText = '未知';
            switch(result.status) {
                case 'placeholder': statusText = '❌ 占位符'; break;
                case 'default': statusText = '⚠️ 默认值'; break;
                case 'missing': statusText = '❌ 缺失'; break;
                case 'custom': statusText = '✓ 自定义'; break;
                case 'unknown_worker': statusText = '? 未知worker配置'; break;
            }
            console.log(`\n${key}:`);
            console.log(`  状态: ${statusText}`);
            console.log(`  .env值: ${result.env_value}`);
            console.log(`  worker默认: ${result.worker_default}`);
        });
        
    } catch (error) {
        console.error(`写入报告失败: ${error.message}`);
    }
}

// 运行验证
console.log('开始API KEY详细验证...');
readEnvFileKeys();
extractWorkerDefaultKeys();
validateApiKeys();
generateValidationReport();