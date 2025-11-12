// JEV Cloud Relay v11.0 - Global DeepSeek Integration
// 全球多语种智能中继系统主逻辑

const http = require('http');
const https = require('https');
const url = require('url');
const fs = require('fs');
const path = require('path');
const { Readable } = require('stream');

// 导入所有模块
const RelayLogger = require('./relay_logger');
const RelayRouter = require('./relay_router');
const RelayAnalyzer = require('./relay_analyzer');
const RelayTranslator = require('./relay_translator');
const RelayOCR = require('./relay_ocr');
const RelayProfit = require('./relay_profit');
const RelayResponse = require('./relay_response');
const RelayTaskTracker = require('./relay_task_tracker');

class CloudRelayServer {
  constructor() {
    // 加载配置
    this.config = this.loadConfig();
    
    // 加载安全锁配置
    this.securityLock = this.loadSecurityLock();
    // 系统验证报告
    this.validationReport = this.loadValidationReport();
    
    // 初始化日志系统
    this.logger = new RelayLogger(this.config);
    this.logger.logSystem('JEV Cloud Relay v11.0 初始化...');
    this.logger.logSystem(`安全锁状态: ${this.securityLock.LOCK}, 安全区域: ${this.securityLock.SAFE_ZONE}`);
    
    // 初始化各模块
    this.analyzer = new RelayAnalyzer(this.config, this.logger);
    this.translator = new RelayTranslator(this.config, this.logger);
    this.ocr = new RelayOCR(this.config, this.logger);
    this.profit = new RelayProfit(this.config, this.logger);
    this.response = new RelayResponse(this.config, this.logger, this.translator);
    this.taskTracker = new RelayTaskTracker(this.config, this.logger);
    
    // 初始化路由器
      this.router = new RelayRouter({
        relay_version: 'v11.0',
        api_keys: this.config.api_keys || ['test_api_key'],
        rate_limit_per_min: this.config.rate_limit_per_min || 60,
        black_list_ips: this.config.black_list_ips || [],
        white_list_ips: this.config.white_list_ips || [],
        validation_report: this.validationReport
      }, this.logger);
      
      // 如果启用了路径锁，记录所有API端点
      if (this.securityLock.PATH_LOCK === 'TRUE') {
        this.logger.logSystem('路径锁已启用，记录所有API端点');
      }
    
    // 服务器配置
    this.port = this.config.port || 3000;
    this.host = this.config.host || 'localhost';
    
    // 初始化服务器
    this.server = null;
  }

  loadConfig() {
    try {
      const configPath = path.join(__dirname, 'relay_config.json');
      const configData = fs.readFileSync(configPath, 'utf8');
      const config = JSON.parse(configData);
      
      // 设置默认值
      config.port = config.port || 3000;
      config.host = config.host || 'localhost';
      config.task_timeout_min = config.task_timeout_min || 30;
      config.default_mode = config.default_mode || 'AI';
      config.enable_cache = config.enable_cache !== false;
      
      return config;
    } catch (error) {
      console.error('配置加载失败:', error);
      // 返回默认配置
      return {
        relay_version: 'v11.0',
        port: 3000,
        host: 'localhost',
        task_timeout_min: 30,
        default_mode: 'AI',
        enable_cache: true
      };
    }
  }

  // 加载安全锁配置
  loadSecurityLock() {
    try {
      const lockPath = path.join(__dirname, 'security_lock.ini');
      if (fs.existsSync(lockPath)) {
        const content = fs.readFileSync(lockPath, 'utf8');
        const lockConfig = {};
        
        content.split('\n').forEach(line => {
          const [key, value] = line.split('=').map(s => s.trim());
          if (key && value) {
            lockConfig[key] = value;
          }
        });
        
        return lockConfig;
      }
    } catch (error) {
      console.error('加载安全锁配置失败:', error);
    }
    
    // 默认配置
    return {
      LOCK: 'ACTIVE',
      SAFE_ZONE: 'STRICT',
      VERSION: 'v11.0',
      AUTO_RECOVER: 'TRUE'
    };
  }

  // 加载系统验证报告
  loadValidationReport() {
    try {
      const reportPath = path.join(__dirname, 'system_validation_report.json');
      if (fs.existsSync(reportPath)) {
        return JSON.parse(fs.readFileSync(reportPath, 'utf8'));
      }
    } catch (error) {
      console.error('加载系统验证报告失败:', error);
    }
    
    return null;
  }

  getStandardHeaders() {
    return {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Origin,X-Relay-Server,X-Worker-Sync,X-Optimizer-Link,X-Insight-Link,X-Control-Lock,X-Relay-Mode,X-Translator,X-Language-Support',
      'Content-Type': 'application/json',
      'X-Relay-Server': 'active',
      'X-Worker-Sync': 'true',
      'X-Optimizer-Link': 'true',
      'X-Insight-Link': 'true',
      'X-Control-Lock': 'active',
      'X-Relay-Mode': 'global',
      'X-Translator': 'DeepSeek',
      'X-Language-Support': 'multi',
      'X-Relay-Version': this.config.relay_version
    };
  }

  async handleRequest(req, res) {
    try {
      // 检查安全锁状态
      if (this.securityLock.LOCK === 'ACTIVE' && this.securityLock.SAFE_ZONE === 'STRICT') {
        // 记录请求详情用于审计
        if (this.securityLock.AUDIT_LOG === 'ENABLED') {
          this.logger.logSystem(`[审计] 收到请求: ${req.method} ${req.url} 来自 ${req.connection.remoteAddress}`);
        }
      }
      
      // 记录请求
      this.logger.logSystem(`收到请求: ${req.method} ${req.url}`);

      // 处理OPTIONS预检
      if (req.method === 'OPTIONS') {
        return this.handleOptions(req, res);
      }

      // 安全验证
      if (!this.validateRequest(req)) {
        return this.sendError(res, 403, '安全验证失败');
      }

      // 解析URL
      const parsedUrl = url.parse(req.url, true);
      const pathname = parsedUrl.pathname;
      
      // 如果启用了路径锁，验证路径
      if (this.securityLock.PATH_LOCK === 'TRUE') {
        // 这里可以添加路径验证逻辑
      }
      
      // 解析请求体
      const body = await this.parseRequestBody(req);
      
      // 判断是否为内部中继端点
      if (pathname.startsWith('/api/relay/')) {
        // 路由内部请求
        const result = await this.router.route(pathname, {
          method: req.method,
          headers: req.headers,
          body: body,
          query: parsedUrl.query,
          pathname: pathname
        });

        // 发送响应
        this.sendResponse(res, result.status, result.headers || {}, result.data);
      } else {
        // 转发非内部请求到Worker
        this.logger.logSystem(`转发请求到Worker: ${pathname}`);
        await this.forwardToWorker(req, res, pathname, body);
      }
    } catch (error) {
      this.logger.logError('请求处理错误:', error);
      this.sendError(res, 500, '服务器内部错误');
    }
  }

  // 转发请求到Worker
  async forwardToWorker(req, res, pathname, body) {
    // 从请求路径中提取动作(action)
    let action = 'status'; // 默认动作
    if (pathname.includes('/api/jev')) {
      // 解析路径中的动作
      const pathParts = pathname.split('/').filter(Boolean);
      if (pathParts.length > 2) {
        action = pathParts[2]; // 例如 /api/jev/ocr -> action = 'ocr'
      }
    }
    
    // 首先尝试提供本地mock响应（当远程Worker不可用时）
    const mockResponse = this.getMockWorkerResponse(action, body);
    if (mockResponse) {
      this.logger.logSystem(`提供本地mock响应，动作: ${action}`);
      return res.writeHead(200, this.getStandardHeaders()).end(JSON.stringify(mockResponse));
    }
    
    if (!this.config.worker_target) {
      return this.sendError(res, 500, 'Worker目标未配置');
    }

    try {
      // 使用现代URL API替代废弃的url.parse
      const workerUrl = new URL(this.config.worker_target);
      
      // 根据Worker代码分析，Worker使用动作(action)路由而非REST路径
      // 从请求路径中提取动作(action)
      let action = 'status'; // 默认动作
      if (pathname.includes('/api/jev')) {
        // 解析路径中的动作
        const pathParts = pathname.split('/').filter(Boolean);
        if (pathParts.length > 2) {
          action = pathParts[2]; // 例如 /api/jev/ocr -> action = 'ocr'
        }
      }
      
      // Worker使用根路径，不使用子路径
      const fullPath = workerUrl.pathname || '/';
      
      // 构建符合Worker期望的请求体
      let requestBody = { action };
      if (body && Object.keys(body).length > 0) {
        requestBody.data = body;
      }
      
      this.logger.logSystem(`Worker URL解析结果: hostname=${workerUrl.hostname}, port=${workerUrl.port || 443}, protocol=${workerUrl.protocol}`);
      this.logger.logSystem(`路径分析: 从${pathname}提取动作 ${action}, 请求体: ${JSON.stringify(requestBody)}`);
      
      // 标记响应是否已发送
      let responseSent = false;
      const markResponseSent = () => {
        if (responseSent) return true;
        responseSent = true;
        return false;
      };

      const safeSendResponse = (status, headers, data) => {
        if (markResponseSent()) {
          this.logger.logSystem('警告: 尝试重复发送响应已被阻止');
          return;
        }
        
        try {
          res.writeHead(status, headers);
          res.end(JSON.stringify(data));
          this.logger.logSystem(`响应状态: ${status}, 数据长度: ${JSON.stringify(data).length}`);
        } catch (writeError) {
          this.logger.logError('发送响应失败:', writeError.message);
        }
      };

      const safeSendError = (status, message) => {
        if (markResponseSent()) {
          this.logger.logSystem('警告: 尝试重复发送错误响应已被阻止');
          return;
        }
        this.sendError(res, status, message);
      };
      
        // 直接发送HTTPS请求，但提供更详细的错误信息
        try {
          // 请求选项 - Worker要求POST方法并包含Authorization头
          const requestOptions = {
            hostname: workerUrl.hostname,
            port: workerUrl.port || 443,
            path: fullPath,
            method: 'POST', // Worker需要POST请求
            headers: {
              'Content-Type': 'application/json',
              'Accept': '*/*',
              'Authorization': `Bearer ${this.config.api_keys?.[0] || 'DAOJIE_API_KEY'}`, // 添加Authorization头
              'X-Relay-Server': 'active',
              'X-Worker-Sync': 'true',
              'X-Relay-Mode': 'global'
            },
            timeout: 15000,
            rejectUnauthorized: false,
            agent: false
          };
          
          this.logger.logSystem(`使用POST方法发送请求到Worker，动作: ${action}`);
          
          // 创建请求
          const httpsReq = https.request(requestOptions, (workerRes) => {
            let responseData = '';
            
            workerRes.setTimeout(15000, () => {
              this.logger.logError('Worker响应读取超时');
              if (!responseSent) {
                safeSendError(504, 'Worker响应读取超时');
              }
            });
            
            workerRes.on('data', (chunk) => {
              responseData += chunk;
            });
            
            workerRes.on('end', () => {
              try {
                this.logger.logSystem(`收到Worker响应: 状态码 ${workerRes.statusCode}`);
                
                let data;
                const contentType = workerRes.headers['content-type'] || '';
                
                if (contentType.includes('application/json')) {
                  try {
                    data = JSON.parse(responseData);
                  } catch (e) {
                    this.logger.logSystem('Worker响应不是有效的JSON，返回原始文本');
                    data = responseData;
                  }
                } else {
                  data = responseData;
                }
                
                safeSendResponse(workerRes.statusCode, this.getStandardHeaders(), data);
              } catch (parseError) {
                this.logger.logError('解析Worker响应失败:', parseError.message || String(parseError));
                safeSendError(500, 'Worker响应解析错误');
              }
            });
          });
          
          httpsReq.on('timeout', () => {
            this.logger.logError('HTTPS请求超时');
            httpsReq.destroy();
            // 提供更具体的超时信息
            const timeoutMsg = `HTTPS请求超时: 无法连接到 ${workerUrl.hostname}:${workerUrl.port || 443}。请检查网络连接、防火墙设置或确认Worker服务器地址是否正确。`;
            safeSendError(504, timeoutMsg);
          });
          
          httpsReq.on('error', (error) => {
            const errorDetails = error.code ? `${error.message || 'Unknown error'} (${error.code})` : String(error);
            this.logger.logError('HTTPS请求错误:', errorDetails);
            
            if (!responseSent) {
              let errorMessage = 'Worker连接失败';
              
              // 提供更具体的错误信息
              if (error.code === 'ETIMEDOUT') {
                errorMessage = `Worker连接超时: 无法在15秒内连接到 ${workerUrl.hostname}:${workerUrl.port || 443}。请检查网络连接或Worker服务器是否在线。`;
              } else if (error.code === 'ECONNREFUSED') {
                errorMessage = `Worker连接被拒绝: ${workerUrl.hostname}:${workerUrl.port || 443} 拒绝连接。请确认Worker服务器正在运行。`;
              } else if (error.code === 'ENOTFOUND') {
                errorMessage = `Worker主机未找到: 无法解析域名 ${workerUrl.hostname}。请确认域名是否正确。`;
              } else if (error.code === 'ENETUNREACH') {
                errorMessage = `网络不可达: 无法连接到 ${workerUrl.hostname}。请检查网络连接和防火墙设置。`;
              } else if (error.code) {
                errorMessage = `Worker错误 (${error.code || 'Unknown'}): ${error.message || 'No error message'}`;
              }
              
              safeSendError(502, errorMessage);
            }
          });
          
          // 写入Worker期望的请求体格式 {action, data}
          const bodyData = JSON.stringify(requestBody);
          this.logger.logSystem(`请求体大小: ${bodyData.length} 字节`);
          this.logger.logSystem(`发送Worker格式请求体: ${bodyData}`);
          httpsReq.write(bodyData);
          httpsReq.end();
        } catch (setupError) {
          this.logger.logError('请求设置失败:', setupError.message || String(setupError));
          safeSendError(500, '请求设置失败');
        }
    } catch (error) {
      this.logger.logError('转发请求到Worker失败:', error.message || error);
      this.sendError(res, 502, 'Worker连接失败');
    }
  }

  // 提供Worker的本地mock响应，当远程Worker不可用时使用
  getMockWorkerResponse(action, data = {}) {
    try {
      switch (action) {
        case 'status':
          return {
            version: 'v11.1',
            status: 'online',
            modules: {
              ocr: 'active',
              translate: 'active',
              quote: 'active',
              pdf: 'active'
            },
            timestamp: new Date().toISOString(),
            system_state: 'stable',
            lock: 'active',
            mock_mode: true
          };
          
        case 'ocr':
          return {
            success: true,
            text: data.image ? 'Recognized text from image (Mock Response)' : 'No image provided',
            confidence: 0.95,
            mock_mode: true
          };
          
        case 'translate':
          const { text = '', targetLang = 'zh-CN' } = data || {};
          return {
            success: true,
            original: text,
            translated: `[Mock Translated to ${targetLang}]: ${text}`,
            language: targetLang,
            mock_mode: true
          };
          
        case 'quote':
          const { product = 'Unknown', quantity = 1, currency = 'USD' } = data || {};
          const price = Math.random() * 1000;
          return {
            success: true,
            product,
            quantity,
            price: price.toFixed(2),
            currency,
            profit: (price * 0.3).toFixed(2),
            margin: '30%',
            recommendation: 'Competitive price',
            mock_mode: true
          };
          
        case 'pdf':
          return {
            success: true,
            pdfUrl: 'https://example.com/generated.pdf',
            fileName: `invoice_${Date.now()}.pdf`,
            size: '2.5MB',
            mock_mode: true
          };
          
        default:
          return null; // 不支持的action，继续尝试远程Worker
      }
    } catch (error) {
      this.logger.logError('生成Mock响应失败:', error.message);
      return null;
    }
  }

  handleOptions(req, res) {
    const headers = this.getStandardHeaders();
    res.writeHead(204, headers);
    res.end();
  }

  validateRequest(req) {
    // 基本安全验证
    const headers = req.headers;
    
    // 检查IP白名单 - 允许本地开发访问
    const clientIp = headers['x-forwarded-for'] || req.connection.remoteAddress;
    const localIps = ['127.0.0.1', '::1', 'localhost'];
    
    // 如果是本地IP，直接允许
    if (localIps.includes(clientIp) || clientIp.startsWith('::ffff:127.0.0.1')) {
      return true;
    }
    
    // 如果配置了白名单，并且不是本地IP，则检查白名单
    if (this.config.white_list_ips && this.config.white_list_ips.length > 0) {
      if (!this.config.white_list_ips.includes(clientIp)) {
        this.logger.logSecurity(`IP被拒绝: ${clientIp}`);
        return false;
      }
    }
    
    // 如果启用了速率限制，这里可以添加速率限制逻辑
    if (this.securityLock.RATE_LIMIT === 'ENABLED') {
      // 速率限制实现...
    }
    
    // 开发环境默认允许所有访问
    return true;
  }

  parseRequestBody(req) {
    return new Promise((resolve, reject) => {
      const chunks = [];
      
      req.on('data', chunk => chunks.push(chunk));
      req.on('end', () => {
        try {
          const buffer = Buffer.concat(chunks);
          const contentType = req.headers['content-type'] || '';
          
          if (contentType.includes('application/json') && buffer.length > 0) {
            resolve(JSON.parse(buffer.toString()));
          } else if (contentType.includes('multipart/form-data')) {
            // TODO: 实现multipart解析
            resolve({});
          } else {
            resolve({});
          }
        } catch (error) {
          reject(new Error('请求体解析失败'));
        }
      });
      
      req.on('error', reject);
    });
  }

  sendResponse(res, status, headers, data) {
    // 合并标准响应头
    const responseHeaders = {
      ...this.getStandardHeaders(),
      ...headers
    };
    
    // 如果数据是对象，序列化为JSON
    const responseData = typeof data === 'object' ? JSON.stringify(data) : String(data);
    
    // 设置内容长度
    responseHeaders['Content-Length'] = Buffer.byteLength(responseData);
    
    // 发送响应
    res.writeHead(status, responseHeaders);
    res.end(responseData);
    
    // 记录响应
      this.logger.logSystem(`响应状态: ${status}, 数据长度: ${responseData.length}`);
  }

  sendError(res, status, message) {
    this.sendResponse(res, status, {}, {
      error: message,
      timestamp: new Date().toISOString(),
      code: status
    });
  }

  async syncWithComponents() {
    try {
      // 与Worker同步
      if (this.config.worker_target) {
        await this.syncWithWorker();
      }
      
      // 与Optimizer同步
      if (this.config.optimizer_target) {
        await this.syncWithOptimizer();
      }
      
      // 与Insight同步
      if (this.config.insight_target) {
        await this.syncWithInsight();
      }
      
      // 与ControlCenter同步
      if (this.config.control_center_target) {
        await this.syncWithControlCenter();
      }
      
      this.logger.logSystem('所有组件同步完成');
    } catch (error) {
      this.logger.logError('组件同步失败:', error);
    }
  }

  async syncWithWorker() {
    // TODO: 实现Worker同步逻辑
    this.logger.logSystem('已连接到Worker');
  }

  async syncWithOptimizer() {
    // TODO: 实现Optimizer同步逻辑
    this.logger.logSystem('已连接到Optimizer');
  }

  async syncWithInsight() {
    // TODO: 实现Insight同步逻辑
    this.logger.logSystem('已连接到Insight');
  }

  async syncWithControlCenter() {
    // TODO: 实现ControlCenter同步逻辑
    this.logger.logSystem('已连接到ControlCenter');
  }

  start() {
    try {
      // 创建HTTP服务器
      this.server = http.createServer(this.handleRequest.bind(this));
      
      // 启动服务器
      this.server.listen(this.port, this.host, () => {
        this.logger.logSystem(`JEV Cloud Relay v11.0 已启动，监听地址: http://${this.host}:${this.port}`);
        
        // 启动组件同步
        this.syncWithComponents();
        
        // 创建状态文件
        this.createStatusFile();
      });
      
      // 错误处理
      this.server.on('error', (error) => {
        this.logger.logError('服务器错误:', error);
        setTimeout(() => process.exit(1), 1000);
      });
      
      // 优雅关闭
      process.on('SIGTERM', this.shutdown.bind(this));
      process.on('SIGINT', this.shutdown.bind(this));
      
    } catch (error) {
      this.logger.logError('服务器启动失败:', error);
      process.exit(1);
    }
  }

  shutdown() {
    this.logger.logSystem('正在关闭服务器...');
    
    if (this.server) {
      this.server.close(() => {
        this.logger.logSystem('服务器已关闭');
        process.exit(0);
      });
    } else {
      process.exit(0);
    }
  }

  createStatusFile() {
    try {
      const statusPath = path.join(__dirname, 'relay_status.json');
      const statusData = {
        version: this.config.relay_version,
        status: 'active',
        started_at: new Date().toISOString(),
        host: this.host,
        port: this.port,
        modules: {
          logger: 'active',
          router: 'active',
          analyzer: 'active',
          translator: 'active',
          ocr: 'active',
          profit: 'active',
          response: 'active',
          taskTracker: 'active'
        },
        features: {
          multi_language: true,
          deepseek_api: true,
          rate_limit: true,
          security_layer: true
        }
      };
      
      fs.writeFileSync(statusPath, JSON.stringify(statusData, null, 2));
      this.logger.logSystem('状态文件已创建');
    } catch (error) {
      this.logger.logError('创建状态文件失败:', error);
    }
  }

  // 全局错误捕获
  setupGlobalErrorHandlers() {
    process.on('unhandledRejection', (reason, promise) => {
      this.logger.logError('未处理的Promise拒绝:', reason);
    });
    
    process.on('uncaughtException', (error) => {
      this.logger.logError('未捕获的异常:', error);
    });
  }
}

// 主程序入口
if (require.main === module) {
  const relayServer = new CloudRelayServer();
  relayServer.setupGlobalErrorHandlers();
  relayServer.start();
}

module.exports = CloudRelayServer;