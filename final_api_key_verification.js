// 最终API密钥验证脚本
// 用途：确认所有API密钥已正确更新，特别是JEV_API_KEY已从默认值更改为新的安全值

const fs = require('fs');
const path = require('path');

// 配置文件路径
const ENV_FILE_PATH = path.join(__dirname, '.env');
const WORKER_JS_PATH = path.join(__dirname, 'worker.js');

// 预期的API密钥值
const EXPECTED_VALUES = {
    'JEV_API_KEY': 'JEV_2025_SECURE_7PqR2tY9wZ',
    'DAOJIE_API_KEY': 'DAOJIE_2025_PROD_8KzX5mW3qL'
};

// 已知的默认值（需要被替换的）
const DEFAULT_VALUES = {
    'JEV_API_KEY': 'JEV_2025_AI_SYS_A92jskL0xY',
    'DAOJIE_API_KEY': 'daojie-api-key-012',
    'DEFAULT_DAOJIE_PLACEHOLDER': 'your_api_key_here'
};

// 读取.env文件并解析API密钥
function readEnvFile() {
    try {
        if (!fs.existsSync(ENV_FILE_PATH)) {
            console.error(`❌ 未找到.env文件: ${ENV_FILE_PATH}`);
            return null;
        }
        
        const envContent = fs.readFileSync(ENV_FILE_PATH, 'utf8');
        const config = {};
        
        const lines = envContent.split('\n');
        lines.forEach(line => {
            if (line.trim() && !line.trim().startsWith('#')) {
                const match = line.match(/^(\w+)="([^"]*)"$/);
                if (match && match[1] && match[2]) {
                    config[match[1]] = match[2];
                }
            }
        });
        
        return config;
    } catch (error) {
        console.error(`❌ 读取.env文件失败: ${error.message}`);
        return null;
    }
}

// 检查worker.js中的默认值
function checkWorkerDefaults() {
    try {
        if (!fs.existsSync(WORKER_JS_PATH)) {
            console.warn(`⚠️  未找到worker.js文件: ${WORKER_JS_PATH}`);
            return null;
        }
        
        const workerContent = fs.readFileSync(WORKER_JS_PATH, 'utf8');
        const findings = {};
        
        // 检查JEV_API_KEY默认值
        if (workerContent.includes(`JEV_API_KEY: '${DEFAULT_VALUES.JEV_API_KEY}'`)) {
            findings.jevApiKeyDefault = true;
        }
        
        // 检查DAOJIE_API_KEY默认值
        if (workerContent.includes(`DAOJIE_API_KEY: '${DEFAULT_VALUES.DAOJIE_API_KEY}'`)) {
            findings.daojieApiKeyDefault = true;
        }
        
        return findings;
    } catch (error) {
        console.error(`❌ 读取worker.js文件失败: ${error.message}`);
        return null;
    }
}

// 验证API密钥配置
function verifyApiKeys() {
    console.log('========================================');
    console.log('       API密钥最终验证报告              ');
    console.log('========================================');
    
    // 1. 读取.env文件配置
    const envConfig = readEnvFile();
    if (!envConfig) {
        console.error('验证失败：无法读取环境配置');
        return false;
    }
    
    // 2. 检查worker.js中的默认值
    const workerDefaults = checkWorkerDefaults();
    
    // 3. 验证关键API密钥
    console.log('\n【关键API密钥验证】');
    let allKeysValid = true;
    
    // 验证JEV_API_KEY
    console.log('\nJEV_API_KEY 验证:');
    if (envConfig.JEV_API_KEY) {
        if (envConfig.JEV_API_KEY === DEFAULT_VALUES.JEV_API_KEY) {
            console.log(`❌ 错误: JEV_API_KEY 仍然使用默认值`);
            allKeysValid = false;
        } else if (envConfig.JEV_API_KEY === EXPECTED_VALUES.JEV_API_KEY) {
            console.log(`✓ 成功: JEV_API_KEY 已更新为新的安全值`);
        } else {
            console.log(`✓ 信息: JEV_API_KEY 使用了自定义值 (非默认值)`);
        }
    } else {
        console.log(`❌ 错误: JEV_API_KEY 未配置`);
        allKeysValid = false;
    }
    
    // 验证DAOJIE_API_KEY
    console.log('\nDAOJIE_API_KEY 验证:');
    if (envConfig.DAOJIE_API_KEY) {
        if (envConfig.DAOJIE_API_KEY === DEFAULT_VALUES.DAOJIE_API_KEY || 
            envConfig.DAOJIE_API_KEY === DEFAULT_VALUES.DEFAULT_DAOJIE_PLACEHOLDER) {
            console.log(`❌ 错误: DAOJIE_API_KEY 仍然使用默认值或占位符`);
            allKeysValid = false;
        } else if (envConfig.DAOJIE_API_KEY === EXPECTED_VALUES.DAOJIE_API_KEY) {
            console.log(`✓ 成功: DAOJIE_API_KEY 已更新为新的安全值`);
        } else {
            console.log(`✓ 信息: DAOJIE_API_KEY 使用了自定义值 (非默认值/占位符)`);
        }
    } else {
        console.log(`❌ 错误: DAOJIE_API_KEY 未配置`);
        allKeysValid = false;
    }
    
    // 4. 检查其他API密钥的存在性
    console.log('\n【其他API密钥检查】');
    const requiredKeys = ['ADMIN_TOKEN', 'API_KEY', 'LEADCONNECTOR_API_KEY'];
    requiredKeys.forEach(key => {
        if (envConfig[key]) {
            console.log(`✓ ${key}: 已配置`);
        } else {
            console.log(`❌ ${key}: 未配置`);
            allKeysValid = false;
        }
    });
    
    // 5. 检查MODE配置
    console.log('\n【环境模式检查】');
    if (envConfig.MODE && envConfig.MODE.toLowerCase() === 'production') {
        console.log(`✓ MODE: 已正确设置为 production`);
    } else {
        console.log(`⚠️  MODE: 当前设置为 ${envConfig.MODE || '未设置'}，建议在生产环境中设置为 production`);
    }
    
    // 6. 生成摘要
    console.log('\n========================================');
    console.log('               验证摘要                 ');
    console.log('========================================');
    
    console.log(`\n✅ 已验证的API密钥总数: ${Object.keys(envConfig).filter(key => key.includes('API_KEY') || key.includes('TOKEN')).length}`);
    
    // 检查是否仍有默认值存在于.env中
    let hasDefaultsInEnv = false;
    Object.values(DEFAULT_VALUES).forEach(defaultValue => {
        Object.values(envConfig).forEach(envValue => {
            if (envValue === defaultValue) {
                hasDefaultsInEnv = true;
            }
        });
    });
    
    if (hasDefaultsInEnv) {
        console.log('❌ 警告: .env文件中仍存在一些默认值');
    } else {
        console.log('✓ 良好: .env文件中没有发现默认值');
    }
    
    // 最终状态
    if (allKeysValid) {
        console.log('\n🎉 验证成功! 所有关键API密钥已正确配置。');
    } else {
        console.log('\n❌ 验证失败! 发现一些需要修复的问题。');
    }
    
    console.log('\n建议:');
    console.log('1. 重启所有相关服务以应用新的API密钥配置');
    console.log('2. 保存.env.backup文件作为备份');
    console.log('3. 定期更新API密钥以提高安全性');
    console.log('4. 确保.env文件未被提交到版本控制系统');
    
    return allKeysValid;
}

// 运行验证
const verificationResult = verifyApiKeys();

// 输出退出代码
process.exit(verificationResult ? 0 : 1);