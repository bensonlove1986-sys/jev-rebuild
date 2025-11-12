// Cloudflare Worker Node.js测试工具
// 用于在命令行环境中测试Worker连接性

const https = require('https');

class WorkerConnectionTester {
  constructor() {
    this.config = {
      workerUrl: 'https://jevshop.bensonlove1986.workers.dev',
      webhookSecret: 'jevindustry2025',
      timeout: 5000
    };
    
    // 诊断信息
    console.log('\n🔍 Worker连接测试工具 - 增强版');
    console.log('Node.js版本:', process.version);
    console.log('目标URL:', this.config.workerUrl);
    console.log('网络模式: 强制IPv4');
  }

  // 设置配置
  setConfig(workerUrl, webhookSecret) {
    if (workerUrl) this.config.workerUrl = workerUrl.replace(/\/$/, '');
    if (webhookSecret) this.config.webhookSecret = webhookSecret;
  }

  // 发送HTTP请求
  makeRequest(url, options, body = null) {
    return new Promise((resolve, reject) => {
      try {
        const parsedUrl = new URL(url);
        // 强制使用IPv4，禁用代理
        const reqOptions = {
          hostname: parsedUrl.hostname,
          port: 443,
          path: parsedUrl.pathname + parsedUrl.search,
          method: options.method || 'GET',
          headers: options.headers || {},
          timeout: this.config.timeout,
          family: 4, // 强制使用IPv4
          agent: false // 禁用默认代理
        };
        
        console.log(`\n发起请求: ${reqOptions.method} ${url}`);
        console.log('请求选项:', JSON.stringify(reqOptions, null, 2));
        console.log('连接目标:', `${parsedUrl.hostname}:${reqOptions.port} (IPv4)`);

        const req = https.request(reqOptions, (res) => {
          let data = '';
          res.on('data', (chunk) => {
            data += chunk;
          });
          
          res.on('end', () => {
            resolve({
              statusCode: res.statusCode,
              headers: res.headers,
              data: data
            });
          });
        });

        req.on('error', (error) => {
          reject(new Error(error.message));
        });

        req.on('timeout', () => {
          reject(new Error(`连接超时（${this.config.timeout}ms）`));
          req.destroy();
        });

        if (body) {
          req.write(JSON.stringify(body));
        }

        req.end();
      } catch (error) {
        reject(new Error(error.message));
      }
    });
  }

  // 测试/ping端点
  async testPing() {
    console.log('\n🔍 测试 /ping 端点');
    const url = `${this.config.workerUrl}/ping`;
    
    try {
      const response = await this.makeRequest(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.config.webhookSecret}`,
          'Content-Type': 'application/json'
        }
      });

      console.log(`📊 状态码: ${response.statusCode}`);
      
      if (response.data) {
        try {
          const jsonData = JSON.parse(response.data);
          console.log(`📋 返回数据: ${JSON.stringify(jsonData, null, 2)}`);
        } catch (e) {
          console.log(`📋 返回数据: ${response.data}`);
        }
      }

      if (response.statusCode === 200) {
        console.log('✅ /ping 端点测试成功');
        return true;
      } else if (response.statusCode === 401) {
        console.log('❌ /ping 端点授权失败 - 请检查WEBHOOK_SECRET是否正确');
        return false;
      } else {
        console.log(`❌ /ping 端点测试失败 - HTTP ${response.statusCode}`);
        return false;
      }
    } catch (error) {
      console.log(`❌ 连接错误: ${error.message}`);
      return false;
    }
  }

  // 测试/test-vision端点
  async testTestVision() {
    console.log('\n🔍 测试 /test-vision 端点');
    const url = `${this.config.workerUrl}/test-vision?mode=ping`;
    
    // 先尝试无认证请求
    try {
      console.log('   尝试无认证请求...');
      const noAuthResponse = await this.makeRequest(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (noAuthResponse.statusCode === 200) {
        console.log(`📊 状态码: ${noAuthResponse.statusCode}`);
        if (noAuthResponse.data) {
          try {
            const jsonData = JSON.parse(noAuthResponse.data);
            console.log(`📋 返回数据: ${JSON.stringify(jsonData, null, 2)}`);
          } catch (e) {
            console.log(`📋 返回数据: ${noAuthResponse.data}`);
          }
        }
        console.log('✅ /test-vision 端点无认证访问成功');
        return true;
      }
    } catch (error) {
      console.log(`   ⚠️ 无认证请求失败: ${error.message}`);
    }

    // 再尝试带认证请求
    try {
      console.log('   尝试带认证请求...');
      const response = await this.makeRequest(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.config.webhookSecret}`,
          'Content-Type': 'application/json'
        }
      });

      console.log(`📊 状态码: ${response.statusCode}`);
      
      if (response.data) {
        try {
          const jsonData = JSON.parse(response.data);
          console.log(`📋 返回数据: ${JSON.stringify(jsonData, null, 2)}`);
        } catch (e) {
          console.log(`📋 返回数据: ${response.data}`);
        }
      }

      if (response.statusCode === 200) {
        console.log('✅ /test-vision 端点测试成功');
        return true;
      } else {
        console.log(`❌ /test-vision 端点测试失败 - HTTP ${response.statusCode}`);
        return false;
      }
    } catch (error) {
      console.log(`❌ 连接错误: ${error.message}`);
      return false;
    }
  }

  // 测试/analyze-image端点
  async testAnalyzeImage() {
    console.log('\n🔍 测试 /analyze-image 端点');
    const url = `${this.config.workerUrl}/analyze-image`;
    
    try {
      const response = await this.makeRequest(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.webhookSecret}`,
          'Content-Type': 'application/json'
        }
      }, {
        image_b64: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='
      });

      console.log(`📊 状态码: ${response.statusCode}`);
      
      if (response.data) {
        try {
          const jsonData = JSON.parse(response.data);
          console.log(`📋 返回数据: ${JSON.stringify(jsonData, null, 2)}`);
        } catch (e) {
          console.log(`📋 返回数据: ${response.data}`);
        }
      }

      if (response.statusCode >= 200 && response.statusCode < 300) {
        console.log('✅ /analyze-image 端点测试成功');
        return true;
      } else if (response.statusCode === 401) {
        console.log('❌ /analyze-image 端点授权失败 - 请检查WEBHOOK_SECRET是否正确');
        return false;
      } else {
        console.log(`❌ /analyze-image 端点测试失败 - HTTP ${response.statusCode}`);
        return false;
      }
    } catch (error) {
      console.log(`❌ 连接错误: ${error.message}`);
      return false;
    }
  }

  // 运行所有测试
  async runAllTests() {
    console.log('================================================================');
    console.log('📡 Cloudflare Worker 连接性测试工具');
    console.log('================================================================');
    console.log(`🔗 Worker URL: ${this.config.workerUrl}`);
    console.log(`🔒 使用密钥: ${this.config.webhookSecret}`);
    console.log('================================================================');

    let pingResult = false;
    let testVisionResult = false;
    let analyzeImageResult = false;

    try {
      // 运行测试
      pingResult = await this.testPing();
      testVisionResult = await this.testTestVision();
      analyzeImageResult = await this.testAnalyzeImage();
    } catch (error) {
      console.log(`\n❌ 测试过程中发生错误: ${error.message}`);
    }

    // 显示摘要
    console.log('\n================================================================');
    console.log('📊 测试摘要');
    console.log('================================================================');
    console.log(`✅ /ping: ${pingResult ? '成功' : '失败'}`);
    console.log(`✅ /test-vision: ${testVisionResult ? '成功' : '失败'}`);
    console.log(`✅ /analyze-image: ${analyzeImageResult ? '成功' : '失败'}`);
    
    const totalTests = 3;
    const passedTests = [pingResult, testVisionResult, analyzeImageResult].filter(Boolean).length;
    
    console.log(`\n📈 总体结果: ${passedTests}/${totalTests} 测试通过`);
    
    if (passedTests === totalTests) {
      console.log('🎉 Worker连接状态正常！');
    } else if (pingResult) {
      console.log('⚠️ Worker基本连接正常，但部分功能可能存在问题');
    } else {
      console.log('❌ Worker连接失败，请检查以下项目：');
      console.log('   1. Worker URL是否正确');
      console.log('   2. WEBHOOK_SECRET是否正确');
      console.log('   3. Worker是否已成功部署并正在运行');
      console.log('   4. 网络连接是否正常');
    }
    
    return {
      ping: pingResult,
      testVision: testVisionResult,
      analyzeImage: analyzeImageResult
    };
  }
}

// 运行测试
async function main() {
  const tester = new WorkerConnectionTester();
  
  // 可选：如果需要自定义配置，可以取消下面的注释并修改
  // tester.setConfig('https://your-custom-worker-url.workers.dev', 'your-custom-secret');
  
  await tester.runAllTests();
}

main().catch(error => {
  console.error('❌ 测试工具执行失败:', error);
  process.exit(1);
});