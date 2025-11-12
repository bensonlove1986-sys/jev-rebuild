// JEV Cloudflare Worker 部署验证脚本
// 用于验证worker_final.js文件是否符合部署要求

const fs = require('fs');
const path = require('path');

// 读取worker_final.js文件
const workerFilePath = path.join(__dirname, 'worker_final.js');

function verifyWorkerDeployment() {
  try {
    console.log('=== JEV Cloudflare Worker 部署验证开始 ===\n');
    
    // 检查文件是否存在
    if (!fs.existsSync(workerFilePath)) {
      console.log('❌ 错误: worker_final.js 文件不存在');
      return false;
    }
    
    // 读取文件内容
    const content = fs.readFileSync(workerFilePath, 'utf8');
    
    // 验证项
    const validations = [
      {
        name: 'API路径前缀验证',
        patterns: [
          '/api/jev/ping',
          '/api/jev/ui',
          '/api/jev/agents',
          '/api/jev/log',
          '/api/jev/upload',
          '/api/jev/ocr/result',
          '/api/jev/task/ai',
          '/api/jev/status'
        ],
        expected: true
      },
      {
        name: '原始API路径不存在验证',
        patterns: [
          'path === \'/ping\'',
          'path === \'/ui\'',
          'path === \'/agents\'',
          'path.startsWith(\'/agents/\')',
          'path.startsWith(\'/log\')',
          'path === \'/upload\'',
          'path === \'/ocr/result\'',
          'path === \'/task/ai\'',
          'path === \'/status\''
        ],
        expected: false
      },
      {
        name: '安全头部验证',
        patterns: [
          'Access-Control-Allow-Origin',
          'Access-Control-Allow-Methods',
          'Access-Control-Allow-Headers'
        ],
        expected: true
      },
      {
        name: 'API密钥验证功能',
        patterns: ['validateApiKey'],
        expected: true
      },
      {
        name: '错误处理验证',
        patterns: ['errorResponse'],
        expected: true
      }
    ];
    
    // 执行验证
    let allPassed = true;
    
    validations.forEach(validation => {
      console.log(`检查: ${validation.name}`);
      
      validation.patterns.forEach(pattern => {
        const found = content.includes(pattern);
        const passed = found === validation.expected;
        
        if (!passed) {
          allPassed = false;
          console.log(`  ❌ ${validation.expected ? '缺少' : '存在不应有的'}: ${pattern}`);
        } else {
          console.log(`  ✅ ${pattern}`);
        }
      });
      
      console.log('');
    });
    
    // 检查测试命令示例
    const testCommandsValid = content.includes('/api/jev/ping') && 
                             content.includes('/api/jev/agents/register') &&
                             content.includes('/api/jev/upload') &&
                             content.includes('/api/jev/status');
    
    console.log('检查: 测试命令示例更新');
    if (testCommandsValid) {
      console.log('  ✅ 测试命令示例已更新为/api/jev前缀\n');
    } else {
      allPassed = false;
      console.log('  ❌ 测试命令示例未更新\n');
    }
    
    // 总结
    if (allPassed) {
      console.log('✅ 部署验证通过！worker_final.js 符合Cloudflare Worker部署要求。');
      console.log('\n部署步骤：');
      console.log('1. 登录Cloudflare控制面板');
      console.log('2. 创建Worker或选择现有Worker');
      console.log('3. 复制worker_final.js文件内容到Worker编辑器');
      console.log('4. 配置KV存储：jevui, MEM_STORE');
      console.log('5. 配置R2存储：R2_BUCKET');
      console.log('6. 部署Worker');
      console.log('7. 设置路由规则：/* -> worker_name');
      console.log('8. 测试API响应：curl https://your-worker.dev/api/jev/ping');
      return true;
    } else {
      console.log('❌ 部署验证失败，请修复上述问题后再部署。');
      return false;
    }
    
  } catch (error) {
    console.error('验证过程中发生错误:', error);
    return false;
  } finally {
    console.log('\n=== JEV Cloudflare Worker 部署验证结束 ===');
  }
}

// 执行验证
verifyWorkerDeployment();