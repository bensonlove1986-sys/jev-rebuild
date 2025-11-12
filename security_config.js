// JEV 安全配置
const securityConfig = {
  api_keys: {
    jev_api_key: "JEV_API_KEY_2025_XXXXXXXX",
    admin_token: "ADMIN_TOKEN_2025_YYYYYYYY",
    api_key: "GENERAL_API_KEY_2025_ZZZZZZZZ",
    // 状态层API密钥
    state_layer_keys: ["jev-api-key-123", "jev-production-key", "jev-worker-key"]
  },
  security: {
    session_timeout: 3600,
    max_login_attempts: 5,
    password_policy: {
      min_length: 8,
      require_uppercase: true,
      require_lowercase: true,
      require_digit: true,
      require_special: true
    },
    token_expiration: 86400,
    refresh_token_expiration: 604800
  },
  encryption: {
    algorithm: "AES-256-GCM",
    key_length: 256,
    key_storage: "secure_vault",
    iv_length: 12,
    tag_length: 16
  },
  key_rotation: {
    enabled: true,
    rotation_interval_days: 90,
    previous_keys_count: 3,
    auto_rotate: true
  },
  cors: {
    allowed_origins: ["http://localhost:8000", "https://localhost:8000", "https://jevshop.bensonlove1986.workers.dev"],
    allowed_methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowed_headers: ["Content-Type", "Authorization", "X-Auth-Key", "X-Operation-Verification"],
    expose_headers: ["X-Total-Count", "X-Page", "X-Per-Page"],
    allow_credentials: true,
    max_age: 86400
  },
  rate_limiting: {
    enabled: true,
    max_requests: 100,
    time_window: 60,
    burst_limit: 50,
    whitelisted_ips: [],
    error_message: "请求过于频繁，请稍后再试",
    // 状态层API的特殊限制
    state_layer_endpoints: {
      '/set': { max_requests: 50, time_window: 60 },
      '/get': { max_requests: 200, time_window: 60 },
      '/list': { max_requests: 30, time_window: 60 },
      '/delete': { max_requests: 20, time_window: 60 }
    },
    // 基于API密钥的限制
    per_api_key_limits: {
      max_requests: 500,
      time_window: 60
    }
  },
  logging: {
    enabled: true,
    sensitive_fields: ["password", "token", "secret", "credit_card"],
    log_level: "info",
    log_format: "json",
    // 状态层特定的日志配置
    state_layer_logging: {
      enabled: true,
      log_sensitive_data: false,
      log_performance_metrics: true
    }
  },
  authentication: {
    methods: ["password", "token", "api_key"],
    two_factor: {
      enabled: false,
      methods: ["email", "sms"]
    },
    password_reset: {
      token_expiration: 3600,
      max_attempts: 3
    },
    // 状态层认证配置
    state_layer: {
      header_name: "Authorization",
      supported_schemes: ["Bearer", "ApiKey"],
      allow_basic_auth: false
    }
  },
  audit: {
    enabled: true,
    log_actions: ["login", "logout", "create", "update", "delete", "admin_action"],
    retention_days: 90,
    // 状态层特定的审计配置
    state_layer_actions: ["set", "get", "delete", "list", "batch_operation"]
  },
  ip_security: {
    block_malicious_ips: true,
    max_failed_attempts: 10,
    block_duration_minutes: 30,
    // IP白名单配置
    whitelist: {
      enabled: true,
      allowed_ips: [
        "192.168.1.1",
        "192.168.1.2",
        "127.0.0.1",
        // Cloudflare IP ranges would go here
      ],
      bypass_authentication: false
    }
  },
  headers: {
    strict_transport_security: "max-age=31536000; includeSubDomains",
    content_security_policy: "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; font-src 'self'",
    x_frame_options: "DENY",
    x_xss_protection: "1; mode=block",
    x_content_type_options: "nosniff",
    referrer_policy: "strict-origin-when-cross-origin"
  },
  // 状态层特定配置
  state_layer: {
    enabled: true,
    url: "https://jevshop.bensonlove1986.workers.dev",
    timeout_ms: 5000,
    retry_count: 3,
    retry_delay_ms: 1000,
    cache_enabled: true,
    cache_ttl_ms: 300000, // 5分钟
    max_cache_items: 1000,
    // 敏感操作配置
    sensitive_operations: ["/delete", "/batch/delete", "/reset"],
    verification_header: "X-Operation-Verification",
    // 数据验证规则
    validation_rules: {
      max_key_length: 100,
      max_value_size_kb: 100,
      allowed_key_pattern: /^[a-zA-Z0-9_\-:\.]+$/,
      max_batch_size: 100
    }
  },
  // 插件系统安全配置
  plugin_system: {
    enabled: true,
    require_authentication: true,
    allowed_origins: [],
    api_endpoints: [
      "/api/jev/plugin/state/get",
      "/api/jev/plugin/state/set",
      "/api/jev/plugin/state/list"
    ],
    rate_limit: {
      max_requests: 200,
      time_window: 60
    }
  },
  // AI模块安全配置
  ai_module: {
    require_authentication: true,
    rate_limit: {
      max_requests: 50,
      time_window: 60
    },
    session_timeout_ms: 3600000, // 1小时
    max_context_size_kb: 500
  }
};

// 安全验证函数
function validateApiKey(request) {
  const authHeader = request.headers.get(securityConfig.authentication.state_layer.header_name);
  
  if (!authHeader) {
    return { valid: false, error: 'Missing authorization header' };
  }
  
  // 支持 Bearer 和直接密钥格式
  let apiKey;
  if (authHeader.startsWith('Bearer ')) {
    apiKey = authHeader.substring(7).trim();
  } else {
    apiKey = authHeader.trim();
  }
  
  const isValid = securityConfig.api_keys.state_layer_keys.includes(apiKey);
  
  return { 
    valid: isValid, 
    apiKey: isValid ? apiKey : null,
    error: isValid ? null : 'Invalid API key'
  };
}

// IP白名单检查函数
function checkIpWhitelist(request) {
  if (!securityConfig.ip_security.whitelist.enabled) {
    return { allowed: true };
  }
  
  // 获取客户端IP
  const clientIp = request.headers.get('CF-Connecting-IP') || 
                  request.headers.get('X-Forwarded-For') ||
                  request.connection?.remoteAddress;
  
  if (!clientIp) {
    return { allowed: false, error: 'Unable to determine client IP' };
  }
  
  // 检查是否在白名单中
  const isAllowed = securityConfig.ip_security.whitelist.allowed_ips.some(allowedIp => {
    // 支持精确匹配
    return clientIp === allowedIp;
  });
  
  return {
    allowed: isAllowed,
    clientIp,
    bypassAuthentication: isAllowed && securityConfig.ip_security.whitelist.bypass_authentication,
    error: isAllowed ? null : 'IP address not whitelisted'
  };
}

// 敏感操作验证
function verifySensitiveOperation(request) {
  const path = new URL(request.url).pathname;
  
  // 检查是否为敏感操作
  const isSensitive = securityConfig.state_layer.sensitive_operations.some(sensitivePath => 
    path.endsWith(sensitivePath)
  );
  
  if (!isSensitive) {
    return { verified: true };
  }
  
  // 检查验证头
  const verificationHeader = request.headers.get(securityConfig.state_layer.verification_header);
  
  if (!verificationHeader) {
    return { verified: false, error: 'Missing verification header for sensitive operation' };
  }
  
  // 简单验证 - 在生产环境中应使用更复杂的验证逻辑
  const isValid = verificationHeader === 'CONFIRMED';
  
  return {
    verified: isValid,
    error: isValid ? null : 'Invalid verification for sensitive operation'
  };
}

// 数据验证函数
function validateStateLayerData(data, operation) {
  // 验证key长度
  if (data.key && data.key.length > securityConfig.state_layer.validation_rules.max_key_length) {
    return {
      valid: false,
      error: `Key length exceeds maximum allowed length of ${securityConfig.state_layer.validation_rules.max_key_length} characters`
    };
  }
  
  // 验证key格式
  if (data.key && !securityConfig.state_layer.validation_rules.allowed_key_pattern.test(data.key)) {
    return {
      valid: false,
      error: 'Key contains invalid characters'
    };
  }
  
  // 验证value大小
  if (data.value) {
    const valueSize = JSON.stringify(data.value).length;
    if (valueSize > securityConfig.state_layer.validation_rules.max_value_size_kb * 1024) {
      return {
        valid: false,
        error: `Value size exceeds maximum allowed size of ${securityConfig.state_layer.validation_rules.max_value_size_kb}KB`
      };
    }
  }
  
  // 验证批处理大小
  if (operation === 'batch' && Array.isArray(data.items) && 
      data.items.length > securityConfig.state_layer.validation_rules.max_batch_size) {
    return {
      valid: false,
      error: `Batch size exceeds maximum allowed size of ${securityConfig.state_layer.validation_rules.max_batch_size}`
    };
  }
  
  return { valid: true };
}

// 导出配置和函数
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    securityConfig,
    validateApiKey,
    checkIpWhitelist,
    verifySensitiveOperation,
    validateStateLayerData
  };
} else if (typeof window !== 'undefined') {
  window.securityConfig = securityConfig;
  window.validateApiKey = validateApiKey;
  window.checkIpWhitelist = checkIpWhitelist;
  window.verifySensitiveOperation = verifySensitiveOperation;
  window.validateStateLayerData = validateStateLayerData;
}