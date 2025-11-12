// Cloudflare Worker Node.js网络诊断工具
// 用于自动检测代理、DNS和SSL问题

const https = require('https');
const dns = require('dns');

class NetworkDiagnostic {
  constructor() {
    this.results = {
      nodeVersion: process.version,
      workerUrl: 'https://jevshop.bensonlove1986.workers.dev',
      network: {},
      proxy: {},
      dns: {},
      ssl: {},
      conclusions: []
    };
    
    // 打印诊断标题
    console.log('\n' + '='.repeat(60));
    console.log('📡 Cloudflare Worker 网络诊断工具');
    console.log('='.repeat(60) + '\n');
  }
  
  // 检查环境变量
  checkEnvironment() {
    console.log('🔍 检查环境变量...');
    
    const proxyVars = ['HTTP_PROXY', 'HTTPS_PROXY', 'ALL_PROXY', 'NO_PROXY'];
    let hasProxy = false;
    
    proxyVars.forEach(varName => {
      const value = process.env[varName];
      this.results.proxy[varName] = value || '未设置';
      if (value) {
        hasProxy = true;
        console.log(`   ⚠️ ${varName}: ${value}`);
      }
    });
    
    if (hasProxy) {
      this.results.conclusions.push('检测到代理环境变量，可能导致Node.js请求问题');
    } else {
      console.log('   ✅ 未发现代理环境变量');
    }
    
    return Promise.resolve();
  }
  
  // 检测DNS解析
  checkDns() {
    console.log('\n🔍 检查DNS解析...');
    
    return new Promise((resolve) => {
      const hostname = new URL(this.results.workerUrl).hostname;
      console.log(`   解析域名: ${hostname}`);
      
      dns.lookup(hostname, (err, address, family) => {
        if (err) {
          console.log(`   ❌ DNS解析失败: ${err.message}`);
          this.results.dns.error = err.message;
          this.results.conclusions.push('DNS解析失败，可能是DNS配置问题或网络限制');
        } else {
          console.log(`   ✅ DNS解析成功: ${address} (IPv${family})`);
          this.results.dns.address = address;
          this.results.dns.family = family;
        }
        resolve();
      });
    });
  }
  
  // 测试基本网络连接（Google）
  testBasicConnectivity() {
    console.log('\n🔍 测试基本网络连接...');
    
    return new Promise((resolve) => {
      console.log('   连接Google...');
      
      const startTime = Date.now();
      const req = https.get('https://www.google.com/generate_204', {
        timeout: 5000
      }, (res) => {
        const duration = Date.now() - startTime;
        console.log(`   ✅ Google连接成功，状态码: ${res.statusCode} (${duration}ms)`);
        this.results.network.google = {
          success: true,
          statusCode: res.statusCode,
          duration: duration
        };
        res.resume(); // 释放响应流
        resolve();
      });
      
      req.on('error', (error) => {
        console.log(`   ❌ Google连接失败: ${error.message}`);
        this.results.network.google = {
          success: false,
          error: error.message
        };
        this.results.conclusions.push('基本网络连接失败，无法访问外部网站');
        resolve();
      });
      
      req.on('timeout', () => {
        req.destroy();
        console.log('   ❌ Google连接超时');
        this.results.network.google = {
          success: false,
          error: '连接超时'
        };
        this.results.conclusions.push('基本网络连接超时，可能是网络限制或防火墙问题');
        resolve();
      });
    });
  }
  
  // 测试Worker连接
  testWorkerConnectivity() {
    console.log('\n🔍 测试Worker连接...');
    
    return new Promise((resolve) => {
      console.log(`   连接Worker: ${this.results.workerUrl}`);
      
      const startTime = Date.now();
      const req = https.get(`${this.results.workerUrl}/ping`, {
        timeout: 8000,
        headers: {
          'Authorization': 'Bearer jevindustry2025'
        }
      }, (res) => {
        const duration = Date.now() - startTime;
        console.log(`   ✅ Worker连接成功，状态码: ${res.statusCode} (${duration}ms)`);
        this.results.network.worker = {
          success: true,
          statusCode: res.statusCode,
          duration: duration
        };
        res.resume(); // 释放响应流
        resolve();
      });
      
      req.on('error', (error) => {
        console.log(`   ❌ Worker连接失败: ${error.message}`);
        this.results.network.worker = {
          success: false,
          error: error.message
        };
        resolve();
      });
      
      req.on('timeout', () => {
        req.destroy();
        console.log('   ❌ Worker连接超时');
        this.results.network.worker = {
          success: false,
          error: '连接超时'
        };
        resolve();
      });
    });
  }
  
  // 尝试禁用TLS验证并重新测试
  testWithoutTLSVerification() {
    console.log('\n🔍 测试禁用TLS验证...');
    
    return new Promise((resolve) => {
      console.log('   临时设置 NODE_TLS_REJECT_UNAUTHORIZED=0');
      console.log('   注意：这仅用于诊断，不要在生产环境中这样做！');
      
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
      
      const req = https.get(`${this.results.workerUrl}/ping`, {
        timeout: 8000,
        headers: {
          'Authorization': 'Bearer jevindustry2025'
        }
      }, (res) => {
        console.log(`   ✅ 禁用TLS验证后连接成功，状态码: ${res.statusCode}`);
        this.results.ssl = {
          verificationDisabled: true,
          success: true,
          statusCode: res.statusCode
        };
        this.results.conclusions.push('TLS证书验证问题 - 禁用验证后可以连接');
        res.resume(); // 释放响应流
        resolve();
      });
      
      req.on('error', (error) => {
        console.log(`   ❌ 禁用TLS验证后仍失败: ${error.message}`);
        this.results.ssl = {
          verificationDisabled: true,
          success: false,
          error: error.message
        };
        resolve();
      });
      
      req.on('timeout', () => {
        req.destroy();
        console.log('   ❌ 禁用TLS验证后仍超时');
        this.results.ssl = {
          verificationDisabled: true,
          success: false,
          error: '连接超时'
        };
        resolve();
      });
    });
  }
  
  // 显示诊断结果
  showResults() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 诊断结果汇总');
    console.log('='.repeat(60));
    
    console.log(`\n📱 Node.js版本: ${this.results.nodeVersion}`);
    
    // 环境变量结果
    console.log('\n🔧 代理环境变量:');
    Object.entries(this.results.proxy).forEach(([key, value]) => {
      console.log(`   ${key}: ${value}`);
    });
    
    // DNS结果
    console.log('\n🌐 DNS解析:');
    if (this.results.dns.error) {
      console.log(`   ❌ 失败: ${this.results.dns.error}`);
    } else if (this.results.dns.address) {
      console.log(`   ✅ 成功: ${this.results.dns.address} (IPv${this.results.dns.family})`);
    } else {
      console.log('   ⚠️ 未测试');
    }
    
    // 网络连接结果
    console.log('\n📡 网络连接:');
    if (this.results.network.google) {
      const google = this.results.network.google;
      if (google.success) {
        console.log(`   ✅ Google: ${google.statusCode} (${google.duration}ms)`);
      } else {
        console.log(`   ❌ Google: ${google.error}`);
      }
    }
    
    if (this.results.network.worker) {
      const worker = this.results.network.worker;
      if (worker.success) {
        console.log(`   ✅ Worker: ${worker.statusCode} (${worker.duration}ms)`);
      } else {
        console.log(`   ❌ Worker: ${worker.error}`);
      }
    }
    
    // SSL结果
    console.log('\n🔒 SSL测试:');
    if (this.results.ssl && this.results.ssl.verificationDisabled) {
      if (this.results.ssl.success) {
        console.log(`   ⚠️ 禁用TLS验证后成功连接`);
      } else {
        console.log(`   ❌ 禁用TLS验证后仍失败: ${this.results.ssl.error}`);
      }
    } else {
      console.log('   ⚠️ 未测试SSL');
    }
    
    // 总结
    console.log('\n💡 诊断结论:');
    if (this.results.conclusions.length > 0) {
      this.results.conclusions.forEach((conclusion, index) => {
        console.log(`   ${index + 1}. ${conclusion}`);
      });
    } else {
      console.log('   ✅ 未发现明显问题');
    }
    
    // 修复建议
    console.log('\n🛠️  修复建议:');
    if (this.results.proxy.HTTPS_PROXY) {
      console.log('   1. 尝试禁用代理:');
      console.log('      set HTTPS_PROXY=');
      console.log('      set HTTP_PROXY=');
    }
    
    if (this.results.ssl && this.results.ssl.success && this.results.ssl.verificationDisabled) {
      console.log('   2. SSL证书问题 - 确保系统时间正确，或考虑使用信任的证书');
    }
    
    if (this.results.network.google && !this.results.network.google.success) {
      console.log('   3. 基本网络连接失败 - 检查防火墙、网络设置或DNS配置');
    }
    
    console.log('\n📝 详细日志:');
    console.log(JSON.stringify(this.results, null, 2));
    
    console.log('\n' + '='.repeat(60));
  }
  
  // 运行完整诊断
  async run() {
    try {
      await this.checkEnvironment();
      await this.checkDns();
      await this.testBasicConnectivity();
      
      // 只有当基本网络连接失败时，才尝试禁用TLS验证
      if (this.results.network.google && !this.results.network.google.success) {
        await this.testWithoutTLSVerification();
      }
      
      this.showResults();
    } catch (error) {
      console.error('\n❌ 诊断过程中发生错误:', error);
    }
  }
}

// 运行诊断
const diagnostic = new NetworkDiagnostic();
diagnostic.run();
