#!/usr/bin/env node

// Cloudflare Worker 部署脚本
// 确保符合API路径和安全规范的部署验证工具

const fs = require('fs');
const path = require('path');
const { execSync, exec } = require('child_process');

console.log('========================================');
console.log('        Cloudflare Worker 部署脚本        ');
console.log('========================================');
console.log('\n验证API路径和安全规范的部署助手\n');

// 配置参数
const CONFIG = {
    WORKER_NAME: 'jevshop-plugin-worker',
    API_PATH: '/api/jev',
    ALLOWED_HEADERS: ['Authorization', 'X-Control-Auth', 'X-Control-Scope'],
    VERIFICATION_SCRIPT: path.join(__dirname, 'verify_worker_deployment.js')
};

// 错误处理函数
function handleError(message, error = null) {
    console.error('\n❌ 错误:', message);
    if (error) {
        console.error('  详细信息:', error.message);
    }
    console.error('\n部署终止，请修复以上问题后重试。');
    process.exit(1);
}

// 成功提示函数
function successMessage(message) {
    console.log('\n✅ 成功:', message);
}

// 检查依赖
function checkDependencies() {
    console.log('检查部署依赖...');
    try {
        // 检查wrangler CLI是否安装
        execSync('wrangler --version', { stdio: 'ignore' });
        successMessage('wrangler CLI 已安装');
        return true;
    } catch (error) {
        console.warn('⚠️  wrangler CLI 未安装，请运行: npm install -g wrangler');
        return false;
    }
}

// 验证API路径
function verifyApiPath(workerFilePath) {
    console.log('\n验证API路径配置...');
    try {
        const workerCode = fs.readFileSync(workerFilePath, 'utf8');
        
        // 检查是否包含正确的API路径
        if (workerCode.includes(`'${CONFIG.API_PATH}'`) || 
            workerCode.includes(`"${CONFIG.API_PATH}"`) || 
            workerCode.includes(`\`${CONFIG.API_PATH}\``)) {
            successMessage(`API路径 ${CONFIG.API_PATH} 验证通过`);
            return true;
        } else {
            handleError(`未在worker文件中找到必需的API路径: ${CONFIG.API_PATH}`);
        }
    } catch (error) {
        handleError('读取或验证worker文件失败', error);
    }
}

// 验证头部配置
function verifyHeadersConfiguration(workerFilePath) {
    console.log('验证头部配置...');
    try {
        const workerCode = fs.readFileSync(workerFilePath, 'utf8');
        let allHeadersVerified = true;
        
        // 检查是否包含所有必需的头部处理
        CONFIG.ALLOWED_HEADERS.forEach(header => {
            if (!workerCode.includes(header)) {
                console.warn(`⚠️  警告: 未在worker文件中找到头部处理: ${header}`);
                allHeadersVerified = false;
            }
        });
        
        if (allHeadersVerified) {
            successMessage('所有必需的头部配置验证通过');
        } else {
            console.warn('⚠️  部分头部配置未验证通过，请检查worker代码');
        }
        
        // 检查是否有修改API路径的代码
        if (workerCode.includes('pathname =') || 
            workerCode.includes('path =') || 
            workerCode.includes('url.pathname =')) {
            console.warn('⚠️  警告: 检测到可能修改路径的代码，请确保不修改API路径');
        }
        
        return true;
    } catch (error) {
        handleError('验证头部配置失败', error);
    }
}

// 准备部署文件
function prepareDeploymentFiles(workerFilePath, outputDir) {
    console.log('\n准备部署文件...');
    try {
        // 确保输出目录存在
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }
        
        // 复制worker文件到输出目录
        const outputPath = path.join(outputDir, 'worker.js');
        fs.copyFileSync(workerFilePath, outputPath);
        
        // 创建wrangler配置文件
        const wranglerConfig = `name = "${CONFIG.WORKER_NAME}"
main = "./worker.js"
compatibility_date = "2023-03-18"

[[migrations]]
tag = "v1"
new_classes = ["KVNamespace"]

# 路由配置
routes = [
  { pattern = "jevshop.bensonlove1986.workers.dev/api/jev*", zone_name = "bensonlove1986.workers.dev" }
]

# 环境变量配置
[vars]
ENVIRONMENT = "production"
API_PATH = "${CONFIG.API_PATH}"

# 安全配置
[build.upload.rules]
[build.upload.rules._]
type = "ESModule"
loader = "esbuild"`;
        
        fs.writeFileSync(path.join(outputDir, 'wrangler.toml'), wranglerConfig);
        
        successMessage(`部署文件已准备到: ${outputDir}`);
        return outputPath;
    } catch (error) {
        handleError('准备部署文件失败', error);
    }
}

// 生成部署命令
function generateDeploymentCommands(deployDir) {
    console.log('\n生成部署命令...');
    
    const commands = [
        `cd ${deployDir}`,
        'wrangler login',
        'wrangler whoami',
        'wrangler deploy'
    ];
    
    console.log('\n部署命令清单:');
    commands.forEach(cmd => console.log(`  ${cmd}`));
    
    // 创建部署批处理文件
    const batContent = commands.join('\n');
    fs.writeFileSync(path.join(deployDir, 'deploy.bat'), batContent);
    
    // 创建PowerShell脚本
    const psContent = commands.join('\n');
    fs.writeFileSync(path.join(deployDir, 'deploy.ps1'), psContent);
    
    successMessage('部署脚本已生成: deploy.bat 和 deploy.ps1');
    return commands;
}

// 生成验证脚本
function generateVerificationScript(deployDir, workerUrl) {
    console.log('\n生成验证脚本...');
    
    const verificationCode = `// 部署验证脚本
const fetch = require('node-fetch');

async function verifyDeployment() {
    console.log('验证Cloudflare Worker部署...');
    
    const urls = [
        { path: '${CONFIG.API_PATH}', method: 'GET', description: 'API基础路径' },
        { path: '${CONFIG.API_PATH}/status', method: 'GET', description: '状态端点' }
    ];
    
    for (const { path, method, description } of urls) {
        const fullUrl = '${workerUrl}' + path;
        console.log(\\`\\n验证 ${method} ${fullUrl} (${description})...\\`);
        
        try {
            const response = await fetch(fullUrl, {
                method,
                headers: {
                    'Authorization': 'Bearer test_token',
                    'Content-Type': 'application/json'
                }
            });
            
            const status = response.status;
            const data = await response.json().catch(() => ({}));
            
            console.log(\\`状态码: ${status}\\`);
            console.log('响应数据:', data);
            
            if (status >= 200 && status < 300) {
                console.log('✅ 验证成功');
            } else if (status === 401) {
                console.log('⚠️  认证失败 (预期行为)');
            } else {
                console.log(\\`❌ 验证失败: 状态码 ${status}\\`);
            }
        } catch (error) {
            console.error('❌ 请求失败:', error.message);
        }
    }
}

verifyDeployment();`;
    
    const verifyPath = path.join(deployDir, 'verify_deployment.js');
    fs.writeFileSync(verifyPath, verificationCode);
    
    successMessage(`验证脚本已生成: ${verifyPath}`);
    console.log('\n运行验证脚本命令:');
    console.log(`  cd ${deployDir}`);
    console.log(`  npm install node-fetch`);
    console.log(`  node verify_deployment.js`);
}

// 主函数
async function main() {
    // 检查命令行参数
    const args = process.argv.slice(2);
    const workerFilePath = args[0];
    
    if (!workerFilePath || !fs.existsSync(workerFilePath)) {
        console.error('\n用法: node deploy_cloudflare_worker.js <worker_file_path>');
        console.error('示例: node deploy_cloudflare_worker.js ./worker_final.js');
        process.exit(1);
    }
    
    console.log(`\n使用Worker文件: ${workerFilePath}`);
    
    // 1. 检查依赖
    checkDependencies();
    
    // 2. 验证API路径
    verifyApiPath(workerFilePath);
    
    // 3. 验证头部配置
    verifyHeadersConfiguration(workerFilePath);
    
    // 4. 准备部署文件
    const deployDir = path.join(__dirname, 'deploy_temp');
    const preparedWorkerPath = prepareDeploymentFiles(workerFilePath, deployDir);
    
    // 5. 生成部署命令
    const deploymentCommands = generateDeploymentCommands(deployDir);
    
    // 6. 生成验证脚本
    const workerUrl = 'https://jevshop.bensonlove1986.workers.dev';
    generateVerificationScript(deployDir, workerUrl);
    
    // 7. 显示部署步骤总结
    console.log('\n========================================');
    console.log('部署准备完成!');
    console.log('========================================');
    console.log('\n请按照以下步骤部署:');
    console.log('1. 执行生成的部署脚本: deploy.bat 或 deploy.ps1');
    console.log('2. 部署完成后，运行验证脚本检查部署是否成功');
    console.log('3. 验证API路径和功能是否符合规范');
    console.log('\n重要提示:');
    console.log(`- 确保API路径保持为: ${CONFIG.API_PATH}`);
    console.log(`- 不要修改任何认证相关的头部配置`);
    console.log(`- 完成部署后执行完整的功能测试`);
    console.log('========================================');
}

// 运行主函数
main().catch(error => {
    handleError('部署脚本执行失败', error);
});