// API KEY 修复脚本
// 用途：更新.env文件中的API密钥，将默认值和占位符替换为安全的自定义值

const fs = require('fs');
const path = require('path');

// 配置文件路径
const ENV_FILE_PATH = path.join(__dirname, '.env');
const BACKUP_FILE_PATH = path.join(__dirname, '.env.backup');

// 新的API密钥值
const NEW_API_KEYS = {
    // 将占位符替换为实际值
    'DAOJIE_API_KEY': 'DAOJIE_2025_PROD_8KzX5mW3qL',
    
    // 将默认值替换为新的安全值
    'JEV_API_KEY': 'JEV_2025_SECURE_7PqR2tY9wZ',
    
    // 保留现有的自定义值，但可以选择更新
    // 'ADMIN_TOKEN': 'new_admin_token_value', // 保持现有的自定义值
    
    // 添加缺失的必需API密钥
    'LEADCONNECTOR_API_KEY': 'LEAD_2025_CONNECT_3aB7cD9eF',
    'DAOIJE_WABA_TOKEN': 'DAOIJE_2025_WABA_5gH9iJ2kL',
    'API_KEY': 'API_2025_MAIN_1mN3oP5qR',
    'GOOGLE_API_KEY': 'GOOGLE_2025_SERVICE_7sT9uV2wX',
    'DEEPSEEK_API_KEY': 'DEEPSEEK_2025_AI_4yZ6aB8cD',
    
    // 确保MODE设置正确
    'MODE': 'production'
};

// 生成随机字符串（用于演示如何创建随机API密钥）
function generateRandomString(length = 32) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

// 备份.env文件
function backupEnvFile() {
    try {
        if (fs.existsSync(ENV_FILE_PATH)) {
            fs.copyFileSync(ENV_FILE_PATH, BACKUP_FILE_PATH);
            console.log(`已备份.env文件到: ${BACKUP_FILE_PATH}`);
            return true;
        } else {
            console.log('未找到.env文件，无法备份');
            return false;
        }
    } catch (error) {
        console.error(`备份.env文件失败: ${error.message}`);
        return false;
    }
}

// 更新.env文件
function updateEnvFile() {
    try {
        let envContent = '';
        const existingKeys = {};
        
        // 读取现有内容
        if (fs.existsSync(ENV_FILE_PATH)) {
            envContent = fs.readFileSync(ENV_FILE_PATH, 'utf8');
            
            // 解析现有键值对
            const lines = envContent.split('\n');
            lines.forEach(line => {
                if (line.trim() && !line.trim().startsWith('#')) {
                    const [key, value] = line.split('=').map(part => part.trim());
                    if (key && value) {
                        const cleanValue = value.replace(/^"|"$/g, '').replace(/^'|'$/g, '');
                        existingKeys[key] = cleanValue;
                    }
                }
            });
        }
        
        // 更新或添加新的API密钥
        Object.keys(NEW_API_KEYS).forEach(key => {
            // 只有当键不存在或值是占位符/默认值时才更新
            if (!existingKeys[key] || 
                existingKeys[key].toLowerCase().includes('your_') ||
                existingKeys[key].toLowerCase().includes('placeholder') ||
                existingKeys[key].toLowerCase().includes('default') ||
                existingKeys[key] === 'daojie-api-key-012' || // worker.js中的默认值
                existingKeys[key] === 'JEV_2025_AI_SYS_A92jskL0xY' // 原默认值
            ) {
                existingKeys[key] = NEW_API_KEYS[key];
            }
        });
        
        // 生成新的.env文件内容
        let newEnvContent = '';
        newEnvContent += '# JEV 系统 API 密钥配置\n';
        newEnvContent += '# 最后更新时间: ' + new Date().toLocaleString('zh-CN') + '\n';
        newEnvContent += '# 注意: 请勿将此文件提交到版本控制系统\n\n';
        
        // 按字母顺序排序键名
        const sortedKeys = Object.keys(existingKeys).sort();
        sortedKeys.forEach(key => {
            // 对敏感密钥添加注释
            if (key.includes('API_KEY') || key.includes('TOKEN')) {
                newEnvContent += `# ${key} - 敏感信息，请勿分享\n`;
            }
            newEnvContent += `${key}="${existingKeys[key]}"\n`;
        });
        
        // 写入新内容
        fs.writeFileSync(ENV_FILE_PATH, newEnvContent, 'utf8');
        console.log(`\n已成功更新.env文件`);
        console.log(`更新的密钥:`);
        
        // 显示更新的密钥（值显示为部分隐藏）
        Object.keys(NEW_API_KEYS).forEach(key => {
            if (!existingKeys[key] || existingKeys[key] !== NEW_API_KEYS[key]) {
                const hiddenValue = NEW_API_KEYS[key].length > 8 ? 
                    NEW_API_KEYS[key].substring(0, 4) + '********' + NEW_API_KEYS[key].substring(NEW_API_KEYS[key].length - 4) : 
                    '********';
                console.log(`  - ${key}: ${hiddenValue}`);
            }
        });
        
        console.log(`\n注意事项:`);
        console.log(`1. 已生成.env.backup备份文件`);
        console.log(`2. 某些现有自定义密钥未被修改（如ADMIN_TOKEN）`);
        console.log(`3. 请确保应用程序重新加载以使用新的API密钥`);
        console.log(`4. 出于安全考虑，生产环境中应使用更强的随机密钥`);
        
        return true;
    } catch (error) {
        console.error(`更新.env文件失败: ${error.message}`);
        // 如果失败，尝试恢复备份
        try {
            if (fs.existsSync(BACKUP_FILE_PATH)) {
                fs.copyFileSync(BACKUP_FILE_PATH, ENV_FILE_PATH);
                console.log('已从备份恢复.env文件');
            }
        } catch (restoreError) {
            console.error(`恢复备份失败: ${restoreError.message}`);
        }
        return false;
    }
}

// 验证更新后的.env文件
function verifyUpdatedEnvFile() {
    try {
        console.log(`\n开始验证更新后的.env文件...`);
        
        const envContent = fs.readFileSync(ENV_FILE_PATH, 'utf8');
        const issues = [];
        
        // 检查JEV_API_KEY是否已更新
        if (envContent.includes('JEV_API_KEY="JEV_2025_AI_SYS_A92jskL0xY"')) {
            issues.push('JEV_API_KEY 未被更新');
        }
        
        // 检查DAOJIE_API_KEY是否已更新
        if (envContent.includes('DAOJIE_API_KEY="your_api_key_here"')) {
            issues.push('DAOJIE_API_KEY 未被更新');
        }
        
        // 检查是否包含所有必需的API密钥
        const requiredKeys = ['DAOJIE_API_KEY', 'JEV_API_KEY', 'LEADCONNECTOR_API_KEY', 'API_KEY'];
        requiredKeys.forEach(key => {
            if (!envContent.includes(`${key}="`)) {
                issues.push(`${key} 未在.env文件中找到`);
            }
        });
        
        // 显示验证结果
        if (issues.length === 0) {
            console.log('✓ 验证通过！所有API密钥已正确更新');
        } else {
            console.log('! 验证发现以下问题:');
            issues.forEach(issue => {
                console.log(`  - ${issue}`);
            });
        }
        
        return issues.length === 0;
    } catch (error) {
        console.error(`验证.env文件失败: ${error.message}`);
        return false;
    }
}

// 运行修复流程
console.log('开始修复API密钥配置...');

// 1. 备份现有文件
const backupSuccess = backupEnvFile();

// 2. 更新.env文件
if (backupSuccess) {
    const updateSuccess = updateEnvFile();
    
    // 3. 验证更新
    if (updateSuccess) {
        verifyUpdatedEnvFile();
    }
}

console.log(`\n修复完成。请重启相关服务以应用新的API密钥配置。`);