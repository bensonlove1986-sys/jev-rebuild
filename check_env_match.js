// 环境匹配检查脚本
// 用途：验证.env文件、worker_auto_fix.js和wrangler.toml之间的配置一致性

const fs = require('fs');
const path = require('path');

// 配置文件路径
const ENV_FILE_PATH = path.join(__dirname, '.env');
const WORKER_FILE_PATH = path.join(__dirname, 'worker_auto_fix.js');
const WRANGLER_FILE_PATH = path.join(__dirname, 'wrangler.toml');

// 预期的配置项
const EXPECTED_CONFIG = {
    // API密钥
    'JEV_API_KEY': 'JEV_2025_SECURE_7PqR2tY9wZ',
    'DAOJIE_API_KEY': 'DAOJIE_2025_PROD_8KzX5mW3qL',
    'ADMIN_TOKEN': 'admin_secure_token_2025',
    'LEADCONNECTOR_API_KEY': 'LEAD_2025_CONNECT_3aB7cD9eF',
    'DAOIJE_WABA_TOKEN': 'DAOIJE_2025_WABA_5gH9iJ2kL',
    'API_KEY': 'API_2025_MAIN_1mN3oP5qR',
    'GOOGLE_API_KEY': 'GOOGLE_2025_SERVICE_7sT9uV2wX',
    'DEEPSEEK_API_KEY': 'DEEPSEEK_2025_AI_4yZ6aB8cD',
    
    // 环境配置
    'MODE': 'production',
    'ALLOW_ORIGIN': 'https://jev-client.pages.dev',
    
    // Cloudflare配置
    'ACCOUNT_ID': '156ce03fffc59592e2b3b04dbc22aa6c'
};

// 读取.env文件
function readEnvFile() {
    try {
        if (!fs.existsSync(ENV_FILE_PATH)) {
            console.error(`❌ 未找到.env文件`);
            return null;
        }
        
        const content = fs.readFileSync(ENV_FILE_PATH, 'utf8');
        const config = {};
        
        const lines = content.split('\n');
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

// 读取wrangler.toml文件
function readWranglerFile() {
    try {
        if (!fs.existsSync(WRANGLER_FILE_PATH)) {
            console.error(`❌ 未找到wrangler.toml文件`);
            return null;
        }
        
        const content = fs.readFileSync(WRANGLER_FILE_PATH, 'utf8');
        const config = {};
        
        // 提取main设置
        const mainMatch = content.match(/main\s*=\s*"([^"]*)"/);
        if (mainMatch && mainMatch[1]) {
            config.main = mainMatch[1];
        }
        
        // 提取vars部分
        const varsMatch = content.match(/\[vars\]([\s\S]*?)(\[|$)/);
        if (varsMatch && varsMatch[1]) {
            const varsContent = varsMatch[1];
            const varLines = varsContent.split('\n');
            varLines.forEach(line => {
                if (line.trim() && !line.trim().startsWith('#')) {
                    const match = line.match(/^(\w+)\s*=\s*"([^"]*)"/);
                    if (match && match[1] && match[2]) {
                        config[match[1]] = match[2];
                    }
                }
            });
        }
        
        // 检查KV命名空间配置
        const kvNamespaces = ['JEV_AI_CACHE', 'JEV_LOGS', 'JEV_GLOBAL_CONFIG', 'JEV_PLUGIN_STATE'];
        kvNamespaces.forEach(ns => {
            if (content.includes(`binding = "${ns}"`)) {
                config[`kv_${ns}`] = true;
            }
        });
        
        return config;
    } catch (error) {
        console.error(`❌ 读取wrangler.toml文件失败: ${error.message}`);
        return null;
    }
}

// 检查worker文件
function checkWorkerFile() {
    try {
        if (!fs.existsSync(WORKER_FILE_PATH)) {
            console.error(`❌ 未找到worker_auto_fix.js文件`);
            return null;
        }
        
        const content = fs.readFileSync(WORKER_FILE_PATH, 'utf8');
        const checks = {};
        
        // 检查核心端点
        const endpoints = ['/ping', '/status', '/auto-env', '/kv/test', '/invite', '/sync'];
        endpoints.forEach(endpoint => {
            checks[`endpoint_${endpoint.replace('/', '_')}`] = content.includes(`path === "${endpoint}"`);
        });
        
        // 检查核心函数
        const functions = ['checkEnv', 'autoFixEnv', 'handleKvTest', 'handleInvite', 'handleSync'];
        functions.forEach(func => {
            checks[`function_${func}`] = content.includes(`function ${func}`);
        });
        
        return checks;
    } catch (error) {
        console.error(`❌ 检查worker文件失败: ${error.message}`);
        return null;
    }
}

// 比较配置
function compareConfigs(envConfig, wranglerConfig) {
    const results = {
        matched: [],
        mismatched: [],
        missing: []
    };
    
    Object.keys(EXPECTED_CONFIG).forEach(key => {
        // 检查.env文件
        if (!envConfig[key]) {
            results.missing.push(`.env文件中缺少 ${key}`);
        } else if (envConfig[key] !== EXPECTED_CONFIG[key]) {
            results.mismatched.push(`.env文件中 ${key} 值不匹配 (当前: ${envConfig[key]}, 预期: ${EXPECTED_CONFIG[key]})`);
        } else {
            results.matched.push(`.env文件中 ${key} 匹配`);
        }
        
        // 检查wrangler.toml（如果适用）
        if (key !== 'ALLOW_ORIGIN' || envConfig[key] === '*') { // ALLOW_ORIGIN可能在wrangler中配置不同
            if (wranglerConfig[key] && wranglerConfig[key] !== EXPECTED_CONFIG[key]) {
                results.mismatched.push(`wrangler.toml中 ${key} 值不匹配 (当前: ${wranglerConfig[key]}, 预期: ${EXPECTED_CONFIG[key]})`);
            }
        }
    });
    
    // 检查wrangler.toml主文件配置
    if (wranglerConfig.main !== 'worker_auto_fix.js') {
        results.mismatched.push(`wrangler.toml中 main 设置错误 (当前: ${wranglerConfig.main}, 预期: worker_auto_fix.js)`);
    } else {
        results.matched.push(`wrangler.toml中 main 设置正确`);
    }
    
    // 检查KV命名空间配置
    const kvNamespaces = ['JEV_AI_CACHE', 'JEV_LOGS', 'JEV_GLOBAL_CONFIG', 'JEV_PLUGIN_STATE'];
    kvNamespaces.forEach(ns => {
        if (wranglerConfig[`kv_${ns}`]) {
            results.matched.push(`wrangler.toml中 ${ns} KV命名空间已配置`);
        } else {
            results.missing.push(`wrangler.toml中缺少 ${ns} KV命名空间配置`);
        }
    });
    
    return results;
}

// 检查Worker实现
function validateWorkerImplementation(workerChecks) {
    const results = {
        passed: [],
        failed: []
    };
    
    Object.keys(workerChecks).forEach(check => {
        if (workerChecks[check]) {
            const item = check.replace('endpoint_', '').replace('function_', '').replace('_', '/');
            results.passed.push(`Worker中存在 ${item}`);
        } else {
            const item = check.replace('endpoint_', '').replace('function_', '').replace('_', '/');
            results.failed.push(`Worker中缺少 ${item}`);
        }
    });
    
    return results;
}

// 生成总体状态
function generateOverallStatus(compareResults, workerResults) {
    const totalMismatched = compareResults.mismatched.length + workerResults.failed.length;
    const totalMissing = compareResults.missing.length;
    const totalIssues = totalMismatched + totalMissing;
    
    if (totalIssues === 0) {
        return {
            status: '✓ 环境完全匹配',
            level: 'success'
        };
    } else if (totalIssues <= 3) {
        return {
            status: `⚠️  环境基本匹配，但存在 ${totalIssues} 个问题`,
            level: 'warning'
        };
    } else {
        return {
            status: `❌ 环境匹配失败，存在 ${totalIssues} 个问题`,
            level: 'error'
        };
    }
}

// 主检查函数
function checkEnvironment() {
    console.log('========================================');
    console.log('        环境配置匹配检查报告            ');
    console.log('========================================');
    
    // 读取所有配置
    const envConfig = readEnvFile();
    const wranglerConfig = readWranglerFile();
    const workerChecks = checkWorkerFile();
    
    if (!envConfig || !wranglerConfig || !workerChecks) {
        console.error('\n❌ 无法读取配置文件，检查失败');
        return false;
    }
    
    // 比较配置
    const compareResults = compareConfigs(envConfig, wranglerConfig);
    const workerResults = validateWorkerImplementation(workerChecks);
    
    // 输出匹配结果
    console.log('\n【配置匹配检查】');
    
    if (compareResults.matched.length > 0) {
        console.log('\n✅ 匹配项:');
        compareResults.matched.forEach(item => console.log(`  ${item}`));
    }
    
    if (compareResults.mismatched.length > 0) {
        console.log('\n❌ 不匹配项:');
        compareResults.mismatched.forEach(item => console.log(`  ${item}`));
    }
    
    if (compareResults.missing.length > 0) {
        console.log('\n⚠️  缺失项:');
        compareResults.missing.forEach(item => console.log(`  ${item}`));
    }
    
    // 输出Worker实现检查
    console.log('\n【Worker实现检查】');
    
    if (workerResults.passed.length > 0) {
        console.log('\n✅ 已实现:');
        workerResults.passed.forEach(item => console.log(`  ${item}`));
    }
    
    if (workerResults.failed.length > 0) {
        console.log('\n❌ 未实现:');
        workerResults.failed.forEach(item => console.log(`  ${item}`));
    }
    
    // 生成总体状态
    const overallStatus = generateOverallStatus(compareResults, workerResults);
    
    console.log('\n========================================');
    console.log(`        整体状态: ${overallStatus.status}        `);
    console.log('========================================');
    
    // 生成报告文件
    const report = {
        timestamp: new Date().toISOString(),
        overall_status: overallStatus.level,
        config_comparison: compareResults,
        worker_implementation: workerResults,
        environment_status: overallStatus.status
    };
    
    try {
        fs.writeFileSync('env_match_report.json', JSON.stringify(report, null, 2), 'utf8');
        console.log('\n✅ 环境匹配报告已保存到: env_match_report.json');
    } catch (err) {
        console.error(`\n❌ 保存报告失败: ${err.message}`);
    }
    
    return overallStatus.level === 'success';
}

// 运行检查
const result = checkEnvironment();

// 退出代码
process.exit(result ? 0 : 1);