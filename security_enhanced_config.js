// JEV 系统安全加固配置模块
// 提供高级安全特性，包括访问控制列表、API令牌策略、多因素认证和安全审计

class SecurityEnhancedConfig {
  constructor(env) {
    this.env = env || {};
    this.securityConfig = {
      // 访问控制列表 (ACL) 配置
      acl: {
        enabled: true,
        defaultPolicy: 'deny', // 默认策略: deny (拒绝所有) 或 allow (允许所有)
        rules: [
          // 公共端点 - 允许所有访问
          {
            pathPattern: '/status',
            method: 'GET',
            policy: 'allow',
            description: '系统状态检查 - 公开访问'
          },
          // 读取操作 - 允许所有访问
          {
            pathPattern: '/get',
            method: 'GET',
            policy: 'allow',
            description: '读取数据 - 公开访问'
          },
          // 写入操作 - 需要认证
          {
            pathPattern: '/set',
            method: 'POST',
            policy: 'deny',
            exceptions: [
              { type: 'apiKey', description: '有效的API密钥' },
              { type: 'ip', values: [], description: '白名单IP地址' },
              { type: 'referer', values: [], description: '授权的来源域名' }
            ],
            description: '写入数据 - 需要认证'
          },
          // 管理端点 - 严格限制
          {
            pathPattern: '/admin/*',
            method: 'ALL',
            policy: 'deny',
            exceptions: [
              { type: 'apiKey', description: '管理员API密钥' },
              { type: 'ip', values: ['127.0.0.1'], description: '管理员IP地址' }
            ],
            description: '管理接口 - 严格限制'
          }
        ]
      },
      
      // API 令牌策略
      apiTokens: {
        enabled: true,
        keyLength: 32,
        expiration: {
          default: 30 * 24 * 60 * 60 * 1000, // 默认 30 天
          short: 24 * 60 * 60 * 1000,        // 短期令牌 24 小时
          admin: 7 * 24 * 60 * 60 * 1000     // 管理员令牌 7 天
        },
        rateLimit: {
          enabled: true,
          requests: 100,                     // 每分钟请求数
          windowMs: 60 * 1000,               // 时间窗口
          banDuration: 15 * 60 * 1000        // 超过限制后的禁用时间
        },
        // 令牌存储配置
        storage: {
          type: 'memory', // memory, durable_objects, kv
          prefix: 'api_token_',
          cleanupInterval: 60 * 60 * 1000    // 定期清理过期令牌
        }
      },
      
      // 多因素认证配置
      mfa: {
        enabled: false, // 默认禁用，需要在生产环境中启用
        methods: [
          {
            type: 'totp',
            enabled: false,
            issuer: 'JEV System',
            period: 30,
            digits: 6
          },
          {
            type: 'ip_restriction',
            enabled: true,
            trustedIps: []
          },
          {
            type: 'user_agent',
            enabled: true,
            requiredPatterns: []
          }
        ]
      },
      
      // 安全审计日志
      audit: {
        enabled: true,
        logLevel: 'info', // error, warn, info, debug
        logFormat: 'json',
        includeSensitiveData: false,
        rotation: {
          enabled: true,
          maxSize: 10 * 1024 * 1024, // 10MB
          maxAge: 30 * 24 * 60 * 60 * 1000 // 30 天
        },
        // 需要记录的事件类型
        events: {
          authentication: true,
          authorization: true,
          dataAccess: true,
          configuration: true,
          system: true
        }
      },
      
      // 请求验证
      requestValidation: {
        enabled: true,
        maxBodySize: 1024 * 1024, // 1MB
        allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'HEAD', 'OPTIONS'],
        allowedContentTypes: [
          'application/json',
          'application/x-www-form-urlencoded',
          'multipart/form-data'
        ],
        rateLimiting: {
          enabled: true,
          global: {
            requests: 1000,
            windowMs: 60 * 1000
          },
          perIp: {
            requests: 100,
            windowMs: 60 * 1000
          }
        },
        // 防护措施
        protection: {
          ddos: {
            enabled: true,
            maxConnectionsPerIp: 50,
            suspiciousPatterns: true
          },
          xss: {
            enabled: true,
            sanitizeInputs: true,
            contentSecurityPolicy: true
          },
          csrf: {
            enabled: true,
            checkOrigin: true,
            checkReferer: true
          }
        }
      },
      
      // CORS 配置
      cors: {
        enabled: true,
        allowOrigins: ['*'], // 在生产环境中应该限制为特定域名
        allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowHeaders: [
          'Content-Type',
          'Authorization',
          'X-Requested-With',
          'X-Test-Region'
        ],
        exposeHeaders: [
          'Content-Length',
          'X-Response-Time',
          'X-Request-ID'
        ],
        allowCredentials: true,
        maxAge: 86400
      },
      
      // 敏感数据处理
      sensitiveData: {
        maskFields: [
          'password',
          'token',
          'secret',
          'key',
          'auth',
          'credential'
        ],
        encryption: {
          enabled: true,
          algorithm: 'AES-256-GCM',
          keyRotation: {
            enabled: true,
            interval: 90 * 24 * 60 * 60 * 1000 // 90 天
          }
        }
      }
    };
    
    // 从环境变量加载配置
    this.loadFromEnvironment();
    
    // 初始化安全存储
    this.initializeSecurityStorage();
    
    // 初始化计数器和状态
    this.ipRateLimits = new Map();
    this.tokenRateLimits = new Map();
    this.suspiciousActivities = new Map();
  }
  
  // 从环境变量加载配置
  loadFromEnvironment() {
    // 加载 ACL 配置
    if (this.env.ACL_ENABLED !== undefined) {
      this.securityConfig.acl.enabled = this.env.ACL_ENABLED === 'true';
    }
    
    // 加载 API 令牌配置
    if (this.env.API_TOKEN_ENABLED !== undefined) {
      this.securityConfig.apiTokens.enabled = this.env.API_TOKEN_ENABLED === 'true';
    }
    
    // 加载 MFA 配置
    if (this.env.MFA_ENABLED !== undefined) {
      this.securityConfig.mfa.enabled = this.env.MFA_ENABLED === 'true';
    }
    
    // 加载审计配置
    if (this.env.AUDIT_ENABLED !== undefined) {
      this.securityConfig.audit.enabled = this.env.AUDIT_ENABLED === 'true';
    }
    
    // 加载允许的 IP 地址
    if (this.env.ALLOWED_IPS) {
      const allowedIps = this.env.ALLOWED_IPS.split(',');
      // 更新 ACL 规则中的 IP 白名单
      this.securityConfig.acl.rules.forEach(rule => {
        if (rule.exceptions) {
          rule.exceptions.forEach(exception => {
            if (exception.type === 'ip') {
              exception.values = allowedIps;
            }
          });
        }
      });
      // 更新 MFA 信任 IP
      this.securityConfig.mfa.methods.forEach(method => {
        if (method.type === 'ip_restriction') {
          method.trustedIps = allowedIps;
        }
      });
    }
    
    // 加载 CORS 配置
    if (this.env.CORS_ORIGINS) {
      this.securityConfig.cors.allowOrigins = this.env.CORS_ORIGINS.split(',');
    }
    
    // 加载 API 密钥（用于测试）
    if (this.env.API_KEYS) {
      this.validApiKeys = new Set(this.env.API_KEYS.split(','));
    } else {
      // 默认测试 API 密钥
      this.validApiKeys = new Set(['test_api_key_123', 'admin_api_key_456']);
    }
  }
  
  // 初始化安全存储
  initializeSecurityStorage() {
    // 根据配置的存储类型初始化
    switch (this.securityConfig.apiTokens.storage.type) {
      case 'memory':
        this.tokenStorage = new Map();
        break;
      case 'durable_objects':
        // 这里应该使用 Durable Objects 存储
        this.tokenStorage = this.env.SECURITY_STORAGE || new Map();
        break;
      case 'kv':
        // 这里应该使用 Cloudflare KV
        this.tokenStorage = this.env.SECURITY_KV || new Map();
        break;
      default:
        this.tokenStorage = new Map();
    }
    
    // 启动定期清理任务
    this.startCleanupTask();
  }
  
  // 启动定期清理任务
  startCleanupTask() {
    if (this.securityConfig.apiTokens.storage.cleanupInterval > 0) {
      // 在 Cloudflare Workers 中，我们不能使用 setInterval
      // 但可以在请求处理过程中检查并清理过期令牌
      this.lastCleanupTime = Date.now();
    }
  }
  
  // 清理过期令牌
  cleanupExpiredTokens() {
    const now = Date.now();
    const cleanupInterval = this.securityConfig.apiTokens.storage.cleanupInterval;
    
    // 检查是否需要清理
    if (!this.lastCleanupTime || (now - this.lastCleanupTime) > cleanupInterval) {
      const expiredKeys = [];
      
      // 在内存存储中清理
      if (this.tokenStorage instanceof Map) {
        for (const [key, tokenData] of this.tokenStorage.entries()) {
          if (tokenData.expiresAt && now > tokenData.expiresAt) {
            expiredKeys.push(key);
          }
        }
        
        // 删除过期令牌
        expiredKeys.forEach(key => this.tokenStorage.delete(key));
      }
      
      // 更新最后清理时间
      this.lastCleanupTime = now;
    }
  }
  
  // 验证 API 令牌
  async validateApiToken(token) {
    if (!token || !this.securityConfig.apiTokens.enabled) {
      return { valid: false, reason: 'API 令牌验证未启用或令牌为空' };
    }
    
    // 简单验证 - 检查是否在有效令牌列表中
    if (this.validApiKeys.has(token)) {
      // 检查令牌速率限制
      const rateLimitResult = this.checkTokenRateLimit(token);
      if (!rateLimitResult.allowed) {
        return { valid: false, reason: `令牌速率限制: ${rateLimitResult.reason}` };
      }
      
      // 记录令牌使用
      this.recordTokenUsage(token);
      
      return { 
        valid: true, 
        tokenInfo: {
          type: token.startsWith('admin') ? 'admin' : 'standard',
          permissions: token.startsWith('admin') ? ['read', 'write', 'admin'] : ['read', 'write']
        }
      };
    }
    
    // 从存储中验证令牌
    const tokenKey = `${this.securityConfig.apiTokens.storage.prefix}${token}`;
    const storedToken = await this.getTokenFromStorage(tokenKey);
    
    if (storedToken) {
      // 检查令牌是否过期
      if (storedToken.expiresAt && Date.now() > storedToken.expiresAt) {
        // 删除过期令牌
        await this.removeTokenFromStorage(tokenKey);
        return { valid: false, reason: '令牌已过期' };
      }
      
      // 检查令牌速率限制
      const rateLimitResult = this.checkTokenRateLimit(token);
      if (!rateLimitResult.allowed) {
        return { valid: false, reason: `令牌速率限制: ${rateLimitResult.reason}` };
      }
      
      // 记录令牌使用
      this.recordTokenUsage(token);
      
      return { valid: true, tokenInfo: storedToken };
    }
    
    return { valid: false, reason: '无效的令牌' };
  }
  
  // 从存储获取令牌
  async getTokenFromStorage(tokenKey) {
    if (this.tokenStorage instanceof Map) {
      return this.tokenStorage.get(tokenKey);
    }
    // 这里可以添加 Durable Objects 或 KV 的获取逻辑
    return null;
  }
  
  // 从存储移除令牌
  async removeTokenFromStorage(tokenKey) {
    if (this.tokenStorage instanceof Map) {
      return this.tokenStorage.delete(tokenKey);
    }
    // 这里可以添加 Durable Objects 或 KV 的删除逻辑
    return false;
  }
  
  // 检查令牌速率限制
  checkTokenRateLimit(token) {
    const now = Date.now();
    const windowMs = this.securityConfig.apiTokens.rateLimit.windowMs;
    const maxRequests = this.securityConfig.apiTokens.rateLimit.requests;
    
    if (!this.tokenRateLimits.has(token)) {
      this.tokenRateLimits.set(token, { count: 0, startTime: now });
    }
    
    const limitInfo = this.tokenRateLimits.get(token);
    
    // 检查时间窗口是否重置
    if (now - limitInfo.startTime > windowMs) {
      limitInfo.count = 0;
      limitInfo.startTime = now;
    }
    
    // 检查是否超过限制
    if (limitInfo.count >= maxRequests) {
      // 检查是否在禁用期内
      if (limitInfo.bannedUntil && now < limitInfo.bannedUntil) {
        const remaining = Math.ceil((limitInfo.bannedUntil - now) / 1000);
        return { 
          allowed: false, 
          reason: `令牌已被临时禁用，剩余 ${remaining} 秒`,
          retryAfter: remaining
        };
      } else if (!limitInfo.bannedUntil) {
        // 首次超过限制，设置禁用期
        limitInfo.bannedUntil = now + this.securityConfig.apiTokens.rateLimit.banDuration;
        const banDuration = Math.ceil(this.securityConfig.apiTokens.rateLimit.banDuration / 1000);
        return { 
          allowed: false, 
          reason: `令牌已被临时禁用 ${banDuration} 秒`,
          retryAfter: banDuration
        };
      } else {
        // 禁用期已过，重置计数
        limitInfo.count = 0;
        limitInfo.bannedUntil = null;
        limitInfo.startTime = now;
      }
    }
    
    return { allowed: true };
  }
  
  // 记录令牌使用
  recordTokenUsage(token) {
    const limitInfo = this.tokenRateLimits.get(token);
    if (limitInfo) {
      limitInfo.count++;
    }
  }
  
  // 验证 IP 地址
  validateIpAddress(ip, allowedIps = []) {
    // 检查 IP 是否在白名单中
    return allowedIps.includes(ip) || allowedIps.includes('*');
  }
  
  // 验证引用来源
  validateReferer(referer, allowedReferers = []) {
    if (!referer) return allowedReferers.length === 0;
    
    // 检查引用来源是否匹配白名单模式
    return allowedReferers.some(pattern => {
      if (pattern === '*') return true;
      return referer.includes(pattern);
    });
  }
  
  // 检查 IP 速率限制
  checkIpRateLimit(ip) {
    const now = Date.now();
    const windowMs = this.securityConfig.requestValidation.rateLimiting.perIp.windowMs;
    const maxRequests = this.securityConfig.requestValidation.rateLimiting.perIp.requests;
    
    if (!this.ipRateLimits.has(ip)) {
      this.ipRateLimits.set(ip, { count: 0, startTime: now });
    }
    
    const limitInfo = this.ipRateLimits.get(ip);
    
    // 检查时间窗口是否重置
    if (now - limitInfo.startTime > windowMs) {
      limitInfo.count = 0;
      limitInfo.startTime = now;
    }
    
    // 检查是否超过限制
    if (limitInfo.count >= maxRequests) {
      return { 
        allowed: false, 
        reason: 'IP 速率限制',
        retryAfter: Math.ceil((limitInfo.startTime + windowMs - now) / 1000)
      };
    }
    
    // 增加计数
    limitInfo.count++;
    
    return { allowed: true };
  }
  
  // 检查全局速率限制
  checkGlobalRateLimit() {
    // 全局速率限制可以使用 Cloudflare 的 Rate Limiting 功能
    // 这里仅作为示例实现
    return { allowed: true };
  }
  
  // 检测可疑活动
  detectSuspiciousActivity(request, ip) {
    const now = Date.now();
    const activityKey = `${ip}_${request.method}_${request.url}`;
    
    if (!this.suspiciousActivities.has(activityKey)) {
      this.suspiciousActivities.set(activityKey, { count: 0, lastActivity: now });
    }
    
    const activityInfo = this.suspiciousActivities.get(activityKey);
    
    // 重置长时间未活动的计数
    if (now - activityInfo.lastActivity > 60000) { // 1 分钟
      activityInfo.count = 0;
    }
    
    // 增加活动计数
    activityInfo.count++;
    activityInfo.lastActivity = now;
    
    // 检测异常模式
    if (activityInfo.count > 50) { // 1 分钟内超过 50 次相同请求
      return {
        suspicious: true,
        type: 'frequent_requests',
        score: 80,
        description: '短时间内频繁请求相同资源'
      };
    }
    
    // 检查请求路径是否包含可疑模式
    const suspiciousPatterns = [
      /\.php$/i,
      /\.asp$/i,
      /\.jsp$/i,
      /\.env/i,
      /admin/i,
      /login/i,
      /config/i,
      /backup/i,
      /dump/i,
      /\.git/i
    ];
    
    for (const pattern of suspiciousPatterns) {
      if (pattern.test(request.url)) {
        return {
          suspicious: true,
          type: 'suspicious_path',
          score: 90,
          description: `请求包含可疑路径模式: ${pattern}`
        };
      }
    }
    
    return { suspicious: false };
  }
  
  // 应用 ACL 规则
  applyAclRules(request, ip) {
    if (!this.securityConfig.acl.enabled) {
      return { allowed: true, reason: 'ACL 未启用' };
    }
    
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;
    
    // 查找匹配的规则
    let matchingRule = null;
    
    for (const rule of this.securityConfig.acl.rules) {
      // 检查路径匹配
      let pathMatches = false;
      
      if (rule.pathPattern.endsWith('*')) {
        // 前缀匹配
        const prefix = rule.pathPattern.slice(0, -1);
        pathMatches = path.startsWith(prefix);
      } else {
        // 精确匹配
        pathMatches = path === rule.pathPattern;
      }
      
      // 检查方法匹配
      const methodMatches = rule.method === 'ALL' || rule.method === method;
      
      if (pathMatches && methodMatches) {
        matchingRule = rule;
        break;
      }
    }
    
    // 如果没有匹配的规则，应用默认策略
    if (!matchingRule) {
      const allowed = this.securityConfig.acl.defaultPolicy === 'allow';
      return {
        allowed,
        reason: `没有匹配的 ACL 规则，应用默认策略: ${this.securityConfig.acl.defaultPolicy}`
      };
    }
    
    // 如果规则明确允许，直接通过
    if (matchingRule.policy === 'allow') {
      return {
        allowed: true,
        reason: `ACL 规则允许访问: ${matchingRule.description}`
      };
    }
    
    // 如果规则拒绝，但有例外条件
    if (matchingRule.policy === 'deny' && matchingRule.exceptions) {
      for (const exception of matchingRule.exceptions) {
        // 检查 API 密钥例外
        if (exception.type === 'apiKey') {
          const authHeader = request.headers.get('Authorization');
          if (authHeader) {
            // 提取令牌（Bearer token 格式）
            const token = authHeader.replace(/^Bearer\s+/i, '');
            const tokenValidation = this.validateApiToken(token);
            if (tokenValidation.valid) {
              return {
                allowed: true,
                reason: `API 密钥验证通过: ${exception.description}`,
                tokenInfo: tokenValidation.tokenInfo
              };
            }
          }
        }
        
        // 检查 IP 例外
        if (exception.type === 'ip' && exception.values && exception.values.length > 0) {
          if (this.validateIpAddress(ip, exception.values)) {
            return {
              allowed: true,
              reason: `IP 在白名单中: ${exception.description}`
            };
          }
        }
        
        // 检查引用来源例外
        if (exception.type === 'referer' && exception.values && exception.values.length > 0) {
          const referer = request.headers.get('Referer');
          if (this.validateReferer(referer, exception.values)) {
            return {
              allowed: true,
              reason: `引用来源验证通过: ${exception.description}`
            };
          }
        }
      }
    }
    
    // 所有例外条件都未满足，拒绝访问
    return {
      allowed: false,
      reason: `ACL 规则拒绝访问: ${matchingRule.description}`
    };
  }
  
  // 应用请求验证
  async validateRequest(request, ip) {
    // 清理过期令牌
    this.cleanupExpiredTokens();
    
    // 检查请求方法
    if (!this.securityConfig.requestValidation.allowedMethods.includes(request.method)) {
      return {
        valid: false,
        status: 405,
        message: `不允许的请求方法: ${request.method}`
      };
    }
    
    // 检查请求大小（对于非 GET 请求）
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      const contentLength = request.headers.get('Content-Length');
      if (contentLength) {
        const length = parseInt(contentLength, 10);
        if (length > this.securityConfig.requestValidation.maxBodySize) {
          return {
            valid: false,
            status: 413,
            message: '请求体过大'
          };
        }
      }
    }
    
    // 检查内容类型（对于非 GET 请求）
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      const contentType = request.headers.get('Content-Type');
      if (contentType) {
        const allowed = this.securityConfig.requestValidation.allowedContentTypes.some(allowedType => 
          contentType.includes(allowedType)
        );
        if (!allowed) {
          return {
            valid: false,
            status: 415,
            message: `不支持的内容类型: ${contentType}`
          };
        }
      }
    }
    
    // 检查 IP 速率限制
    const ipRateLimit = this.checkIpRateLimit(ip);
    if (!ipRateLimit.allowed) {
      return {
        valid: false,
        status: 429,
        message: 'IP 速率限制已超出',
        headers: { 'Retry-After': ipRateLimit.retryAfter.toString() }
      };
    }
    
    // 检查全局速率限制
    const globalRateLimit = this.checkGlobalRateLimit();
    if (!globalRateLimit.allowed) {
      return {
        valid: false,
        status: 429,
        message: '全局速率限制已超出'
      };
    }
    
    // 检测可疑活动
    if (this.securityConfig.requestValidation.protection.ddos.enabled) {
      const suspiciousActivity = this.detectSuspiciousActivity(request, ip);
      if (suspiciousActivity.suspicious) {
        // 记录可疑活动
        this.logSuspiciousActivity(request, ip, suspiciousActivity);
        
        // 对于高风险活动，直接拒绝
        if (suspiciousActivity.score > 85) {
          return {
            valid: false,
            status: 403,
            message: '检测到可疑活动'
          };
        }
      }
    }
    
    // 应用 CORS 预检请求处理
    if (request.method === 'OPTIONS') {
      return {
        valid: true,
        corsPreflight: true
      };
    }
    
    return { valid: true };
  }
  
  // 应用 CORS 头
  applyCorsHeaders(response, request) {
    if (!this.securityConfig.cors.enabled) {
      return response;
    }
    
    // 创建响应副本以修改头信息
    const modifiedResponse = new Response(response.body, response);
    const origin = request.headers.get('Origin');
    
    // 设置 CORS 头
    if (origin) {
      const allowed = this.securityConfig.cors.allowOrigins.includes('*') || 
                     this.securityConfig.cors.allowOrigins.includes(origin);
      
      if (allowed) {
        modifiedResponse.headers.set('Access-Control-Allow-Origin', allowed ? origin : this.securityConfig.cors.allowOrigins[0]);
        
        if (this.securityConfig.cors.allowCredentials) {
          modifiedResponse.headers.set('Access-Control-Allow-Credentials', 'true');
        }
        
        if (this.securityConfig.cors.maxAge > 0) {
          modifiedResponse.headers.set('Access-Control-Max-Age', this.securityConfig.cors.maxAge.toString());
        }
      }
    }
    
    // 设置允许的方法
    if (this.securityConfig.cors.allowMethods.length > 0) {
      modifiedResponse.headers.set('Access-Control-Allow-Methods', this.securityConfig.cors.allowMethods.join(', '));
    }
    
    // 设置允许的头
    if (this.securityConfig.cors.allowHeaders.length > 0) {
      modifiedResponse.headers.set('Access-Control-Allow-Headers', this.securityConfig.cors.allowHeaders.join(', '));
    }
    
    // 设置暴露的头
    if (this.securityConfig.cors.exposeHeaders.length > 0) {
      modifiedResponse.headers.set('Access-Control-Expose-Headers', this.securityConfig.cors.exposeHeaders.join(', '));
    }
    
    return modifiedResponse;
  }
  
  // 创建 CORS 预检响应
  createCorsPreflightResponse(request) {
    if (!this.securityConfig.cors.enabled) {
      return new Response(null, { status: 403 });
    }
    
    const response = new Response(null, { status: 204 });
    const origin = request.headers.get('Origin');
    const accessControlRequestMethod = request.headers.get('Access-Control-Request-Method');
    const accessControlRequestHeaders = request.headers.get('Access-Control-Request-Headers');
    
    // 设置 CORS 预检响应头
    if (origin) {
      const allowed = this.securityConfig.cors.allowOrigins.includes('*') || 
                     this.securityConfig.cors.allowOrigins.includes(origin);
      
      if (allowed) {
        response.headers.set('Access-Control-Allow-Origin', origin);
        
        if (this.securityConfig.cors.allowCredentials) {
          response.headers.set('Access-Control-Allow-Credentials', 'true');
        }
      }
    }
    
    if (accessControlRequestMethod) {
      response.headers.set('Access-Control-Allow-Methods', this.securityConfig.cors.allowMethods.join(', '));
    }
    
    if (accessControlRequestHeaders) {
      response.headers.set('Access-Control-Allow-Headers', this.securityConfig.cors.allowHeaders.join(', '));
    }
    
    if (this.securityConfig.cors.maxAge > 0) {
      response.headers.set('Access-Control-Max-Age', this.securityConfig.cors.maxAge.toString());
    }
    
    return response;
  }
  
  // 记录审计日志
  logAuditEvent(eventType, request, details = {}) {
    if (!this.securityConfig.audit.enabled) {
      return;
    }
    
    // 检查是否应该记录此类事件
    if (!this.securityConfig.audit.events[eventType]) {
      return;
    }
    
    const ip = this.getClientIp(request);
    const userAgent = request.headers.get('User-Agent');
    const timestamp = new Date().toISOString();
    const url = new URL(request.url);
    
    // 构建日志条目
    const logEntry = {
      timestamp,
      eventType,
      request: {
        method: request.method,
        path: url.pathname,
        query: this.maskSensitiveData(url.searchParams),
        userAgent,
        ip
      },
      details: this.maskSensitiveData(details)
    };
    
    // 根据配置的日志格式输出
    if (this.securityConfig.audit.logFormat === 'json') {
      console.log(JSON.stringify(logEntry));
    } else {
      console.log(`[${timestamp}] [${eventType}] ${request.method} ${url.pathname} - ${JSON.stringify(logEntry.details)}`);
    }
  }
  
  // 记录可疑活动
  logSuspiciousActivity(request, ip, activityInfo) {
    const timestamp = new Date().toISOString();
    const url = new URL(request.url);
    
    const logEntry = {
      timestamp,
      type: 'suspicious_activity',
      request: {
        method: request.method,
        path: url.pathname,
        ip
      },
      activity: activityInfo
    };
    
    console.warn('SECURITY ALERT:', JSON.stringify(logEntry));
  }
  
  // 屏蔽敏感数据
  maskSensitiveData(data) {
    if (!this.securityConfig.sensitiveData.maskFields.length) {
      return data;
    }
    
    if (typeof data === 'string') {
      // 屏蔽字符串中的敏感字段
      let maskedData = data;
      this.securityConfig.sensitiveData.maskFields.forEach(field => {
        const regex = new RegExp(`"${field}":\s*"[^"]*"`, 'gi');
        maskedData = maskedData.replace(regex, `"${field}":"***MASKED***"`);
      });
      return maskedData;
    }
    
    if (typeof data === 'object' && data !== null) {
      // 深拷贝对象以避免修改原始数据
      const maskedData = Array.isArray(data) ? [] : {};
      
      for (const key in data) {
        if (Object.hasOwnProperty.call(data, key)) {
          // 检查键是否为敏感字段
          if (this.securityConfig.sensitiveData.maskFields.some(field => 
              key.toLowerCase().includes(field.toLowerCase())
            )) {
            maskedData[key] = '***MASKED***';
          } else if (typeof data[key] === 'object' && data[key] !== null) {
            // 递归处理嵌套对象
            maskedData[key] = this.maskSensitiveData(data[key]);
          } else {
            maskedData[key] = data[key];
          }
        }
      }
      
      return maskedData;
    }
    
    return data;
  }
  
  // 获取客户端 IP 地址
  getClientIp(request) {
    // Cloudflare Workers 中获取客户端 IP 的方法
    return request.headers.get('CF-Connecting-IP') || 
           request.headers.get('X-Forwarded-For')?.split(',')[0].trim() || 
           'unknown';
  }
  
  // 安全中间件 - 处理请求
  async handleRequest(request) {
    try {
      // 获取客户端 IP
      const ip = this.getClientIp(request);
      
      // 验证请求
      const validationResult = await this.validateRequest(request, ip);
      if (!validationResult.valid) {
        // 记录授权失败
        this.logAuditEvent('authorization', request, {
          success: false,
          reason: validationResult.message,
          status: validationResult.status
        });
        
        // 创建错误响应
        const response = new Response(JSON.stringify({
          success: false,
          error: validationResult.message,
          timestamp: new Date().toISOString()
        }), {
          status: validationResult.status,
          headers: {
            'Content-Type': 'application/json',
            ...validationResult.headers
          }
        });
        
        return this.applyCorsHeaders(response, request);
      }
      
      // 处理 CORS 预检请求
      if (validationResult.corsPreflight) {
        return this.createCorsPreflightResponse(request);
      }
      
      // 应用 ACL 规则
      const aclResult = this.applyAclRules(request, ip);
      if (!aclResult.allowed) {
        // 记录授权失败
        this.logAuditEvent('authorization', request, {
          success: false,
          reason: aclResult.reason,
          status: 403
        });
        
        // 创建拒绝响应
        const response = new Response(JSON.stringify({
          success: false,
          error: '访问被拒绝',
          reason: aclResult.reason,
          timestamp: new Date().toISOString()
        }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        });
        
        return this.applyCorsHeaders(response, request);
      }
      
      // 记录授权成功
      this.logAuditEvent('authorization', request, {
        success: true,
        reason: aclResult.reason,
        tokenInfo: aclResult.tokenInfo
      });
      
      // 请求验证通过，继续处理
      return {
        allowed: true,
        ip,
        tokenInfo: aclResult.tokenInfo,
        securityInfo: {
          validated: true,
          aclApplied: true
        }
      };
    } catch (error) {
      console.error('安全中间件错误:', error);
      
      // 创建错误响应
      const response = new Response(JSON.stringify({
        success: false,
        error: '安全验证过程中发生错误',
        timestamp: new Date().toISOString()
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
      
      return this.applyCorsHeaders(response, request);
    }
  }
}

// 导出安全配置类
module.exports = SecurityEnhancedConfig;