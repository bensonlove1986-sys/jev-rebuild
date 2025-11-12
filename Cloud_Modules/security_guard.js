/**
 * JEV Plugin v2.0 - 云端安全审计与防护模块
 * 审计所有模块调用日志
 * 过滤高频异常请求 / Token 滥用
 * 检测非法 payload / SQL-like 注入
 * 输出警报到 control_dashboard.html
 */

// 系统配置
const SECURITY_CONFIG = {
  // 安全模式配置
  securityMode: {
    CURRENT: 'ACTIVE', // ACTIVE, MONITOR, DISABLED
    LOG_LEVEL: 'WARN', // DEBUG, INFO, WARN, ERROR, FATAL
    BLOCK_THRESHOLD: 10, // 触发阻止的违规次数
    BLOCK_DURATION: 3600000, // 阻止时长（毫秒）
    MAX_REQUESTS_PER_MINUTE: 60, // 每分钟最大请求数
    MAX_REQUESTS_PER_HOUR: 1000, // 每小时最大请求数
    MAX_CONCURRENT_REQUESTS: 10 // 最大并发请求数
  },
  
  // 监控配置
  monitoring: {
    ENABLED: true,
    LOG_TO_FILE: true,
    SEND_ALERTS: true,
    ALERT_THRESHOLD: 5, // 触发警报的违规次数
    ALERT_COOLDOWN: 300000 // 警报冷却时间（毫秒）
  },
  
  // 日志配置
  logging: {
    LOG_DIR: '/logs/',
    LOG_FILE: 'security_log.txt',
    MAX_LOG_SIZE: 52428800, // 50MB
    LOG_ROTATION: true,
    RETENTION_DAYS: 30
  },
  
  // 黑名单配置
  blacklist: {
    MAX_SIZE: 1000,
    DEFAULT_BLOCK_DURATION: 86400000, // 24小时
    AUTO_EXPIRE: true
  },
  
  // 白名单配置
  whitelist: {
    ENABLED: true,
    DEFAULT_WHITELISTED_IPS: ['127.0.0.1', '::1'],
    DEFAULT_WHITELISTED_MODULES: ['health_check', 'status']
  },
  
  // 异常检测配置
  anomalyDetection: {
    ENABLED: true,
    BASELINE_PERIOD: 24 * 60 * 60 * 1000, // 24小时基准
    DEVIATION_THRESHOLD: 3.0, // 标准差倍数
    MIN_SAMPLES: 100
  },
  
  // 注入攻击检测配置
  injectionProtection: {
    SQL_ENABLED: true,
    NODE_PATH_ENABLED: true,
    COMMAND_INJECTION_ENABLED: true,
    XSS_ENABLED: true,
    HTML_INJECTION_ENABLED: true,
    PATTERN_MATCHING_ENABLED: true
  },
  
  // 速率限制配置
  rateLimiting: {
    ENABLED: true,
    BY_IP: true,
    BY_USER: true,
    BY_MODULE: true,
    BY_ENDPOINT: true,
    WINDOW_SIZE: 60000, // 1分钟窗口
    BUCKET_SIZE: 60, // 桶大小
    REFILL_RATE: 1 // 每秒填充率
  },
  
  // 令牌安全配置
  tokenSecurity: {
    VALIDATE_TOKENS: true,
    MAX_TOKEN_AGE: 3600000, // 1小时
    CHECK_REVOCATION: true,
    REQUIRE_SIGNATURE: true,
    ALLOW_TOKEN_REFRESH: true
  },
  
  // 数据脱敏配置
  dataMasking: {
    ENABLED: true,
    SENSITIVE_FIELDS: ['password', 'token', 'api_key', 'secret', 'credit_card', 'ssn', 'email', 'phone'],
    MASK_PATTERN: '****',
    PARTIAL_MASK_RATIO: 0.7 // 部分掩码比例
  },
  
  // 警报通知配置
  alerts: {
    NOTIFICATION_CHANNELS: ['console', 'log_file', 'dashboard'],
    SEVERITY_LEVELS: {
      LOW: { code: 1, color: '#9E9E9E' },
      MEDIUM: { code: 2, color: '#FF9800' },
      HIGH: { code: 3, color: '#F44336' },
      CRITICAL: { code: 4, color: '#D32F2F' }
    }
  }
};

// 内存存储（由于无法写入本地文件，使用内存存储模拟）
let securityStore = {
  // 请求计数
  requestCounts: {
    byMinute: new Map(),
    byHour: new Map(),
    concurrent: 0
  },
  
  // 黑名单
  blacklist: new Map(),
  
  // 白名单
  whitelist: {
    ips: new Set(SECURITY_CONFIG.whitelist.DEFAULT_WHITELISTED_IPS),
    modules: new Set(SECURITY_CONFIG.whitelist.DEFAULT_WHITELISTED_MODULES)
  },
  
  // 违规记录
  violations: new Map(),
  
  // 速率限制桶
  rateLimitBuckets: new Map(),
  
  // 警报记录
  alerts: [],
  
  // 最后警报时间
  lastAlertTime: 0,
  
  // 安全事件统计
  securityMetrics: {
    totalRequests: 0,
    blockedRequests: 0,
    allowedRequests: 0,
    violationsDetected: 0,
    injectionAttempts: 0,
    rateLimitExceeded: 0,
    blacklistHits: 0,
    alertsTriggered: 0,
    byModule: {},
    byType: {}
  },
  
  // 审计日志
  auditLogs: [],
  
  // 令牌存储
  tokenStore: {
    activeTokens: new Map(),
    revokedTokens: new Set()
  }
};

// SQL注入模式
const SQL_INJECTION_PATTERNS = [
  /\bSELECT\b.*\bFROM\b/i,
  /\bINSERT\b.*\bINTO\b/i,
  /\bUPDATE\b.*\bSET\b/i,
  /\bDELETE\b.*\bFROM\b/i,
  /\bDROP\b.*\bTABLE\b/i,
  /\bCREATE\b.*\bTABLE\b/i,
  /\bALTER\b.*\bTABLE\b/i,
  /\bEXEC\b|\bEXECUTE\b/i,
  /\bUNION\b.*\bSELECT\b/i,
  /\bOR\b.*[0-9]\s*=\s*[0-9]/i,
  /\bAND\b.*[0-9]\s*=\s*[0-9]/i,
  /\b--|#|\/\*/,
  /xp_cmdshell|sp_executesql/i,
  /\b;\b|\bx\b/i,
  /\bBEGIN\b.*\bTRAN\b/i,
  /\bCOMMIT\b|\bROLLBACK\b/i,
  /\bSAVE\b.*\bPOINT\b/i
];

// 命令注入模式
const COMMAND_INJECTION_PATTERNS = [
  /\bcat\b|\bls\b|\bls\b -la|\bcp\b|\bmv\b|\brm\b/i,
  /\becho\b|\bprintf\b/i,
  /\bchmod\b|\bchown\b/i,
  /\bwhoami\b|\bid\b/i,
  /\buname\b|\bos\b/i,
  /\bfind\b|\bgrep\b/i,
  /\bwget\b|\bcurl\b/i,
  /\bnslookup\b|\bdig\b/i,
  /\bping\b|\btraceroute\b/i,
  /\bsystem\(|\bexec\(|\bpassthru\(|\bshell_exec\(|\bproc_open\(/i,
  /\beval\(|\bassert\(/i,
  /\b\$\(.*\)\b|\`.*\`/,
  /\b&&|\b\|\||\b;|\b<|\b>|\b\|/i,
  /\b\\x|\b\\u|\b\\0/i,
  /\b\.\.\//i,
  /\bfile:\/\//i
];

// XSS攻击模式
const XSS_PATTERNS = [
  /<script[^>]*>.*?<\/script>/i,
  /<iframe[^>]*>.*?<\/iframe>/i,
  /<img[^>]*onerror[^>]*>/i,
  /<body[^>]*onload[^>]*>/i,
  /javascript:[^\s]*/i,
  /data:text\/html[^\s]*/i,
  /vbscript:[^\s]*/i,
  /onerror\s*=\s*/i,
  /onload\s*=\s*/i,
  /onclick\s*=\s*/i,
  /onmouseover\s*=\s*/i,
  /onfocus\s*=\s*/i,
  /onblur\s*=\s*/i,
  /<\s*svg[^>]*>/i,
  /<\s*object[^>]*>/i,
  /<\s*embed[^>]*>/i
];

// HTML注入模式
const HTML_INJECTION_PATTERNS = [
  /<[^>]*>/g,
  /&lt;[^&gt;]*&gt;/g,
  /&#[0-9]+;/g,
  /&#x[0-9a-fA-F]+;/g,
  /&[a-zA-Z]+;/g
];

// Node.js路径遍历模式
const NODE_PATH_TRAVERSAL_PATTERNS = [
  /\.\.\//g,
  /\.\.\\/g,
  /%2e%2e%2f/gi,
  /%2e%2e%5c/gi,
  /%c0%ae%c0%ae%2f/gi,
  /%c0%ae%c0%ae%5c/gi,
  /\/etc\//i,
  /\/proc\//i,
  /\/sys\//i,
  /\/dev\//i,
  /\/tmp\//i,
  /\/var\/tmp\//i,
  /^c:\/windows\//i,
  /^c:\/system32\//i,
  /^c:\/winnt\//i
];

// 敏感数据模式
const SENSITIVE_DATA_PATTERNS = {
  EMAIL: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
  PHONE: /\b(?:\+?\d{1,3}[-. ]?)?\(?\d{3}\)?[-. ]?\d{3}[-. ]?\d{4}\b/g,
  CREDIT_CARD: /\b(?:\d{4}[- ]?){3}\d{4}\b/g,
  SSN: /\b\d{3}[- ]?\d{2}[- ]?\d{4}\b/g,
  API_KEY: /\b(api[_-]?key|apikey)\s*[:=]\s*['"]?[A-Za-z0-9]{16,}['"]?\b/gi,
  TOKEN: /\b(token|jwt|bearer)\s*[:=]\s*['"]?[A-Za-z0-9._-]{30,}['"]?\b/gi,
  PASSWORD: /\b(password|pwd)\s*[:=]\s*['"]?[A-Za-z0-9!@#$%^&*()]{6,}['"]?\b/gi
};

// 生成唯一ID
function generateId(prefix = 'security') {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substr(2, 9);
  return `${prefix}_${timestamp}_${random}`;
}

// 获取当前时间戳（分钟级）
function getCurrentMinuteKey() {
  return Math.floor(Date.now() / 60000);
}

// 获取当前时间戳（小时级）
function getCurrentHourKey() {
  return Math.floor(Date.now() / 3600000);
}

// 清理过期的请求计数
function cleanupRequestCounts() {
  const currentMinute = getCurrentMinuteKey();
  const currentHour = getCurrentHourKey();
  
  // 清理过期的分钟计数
  for (const [key, ipMap] of securityStore.requestCounts.byMinute.entries()) {
    if (key < currentMinute - 10) { // 保留最近10分钟
      securityStore.requestCounts.byMinute.delete(key);
    }
  }
  
  // 清理过期的小时计数
  for (const [key, ipMap] of securityStore.requestCounts.byHour.entries()) {
    if (key < currentHour - 24) { // 保留最近24小时
      securityStore.requestCounts.byHour.delete(key);
    }
  }
}

// 清理过期的黑名单
function cleanupBlacklist() {
  const now = Date.now();
  const expiredEntries = [];
  
  for (const [key, entry] of securityStore.blacklist.entries()) {
    if (entry.expires && entry.expires < now) {
      expiredEntries.push(key);
    }
  }
  
  expiredEntries.forEach(key => {
    securityStore.blacklist.delete(key);
    logSecurityEvent('INFO', `Blacklist entry expired: ${key}`);
  });
  
  // 限制黑名单大小
  if (securityStore.blacklist.size > SECURITY_CONFIG.blacklist.MAX_SIZE) {
    const oldestEntries = Array.from(securityStore.blacklist.entries())
      .sort((a, b) => (a[1].addedAt || 0) - (b[1].addedAt || 0))
      .slice(0, securityStore.blacklist.size - SECURITY_CONFIG.blacklist.MAX_SIZE);
    
    oldestEntries.forEach(([key]) => {
      securityStore.blacklist.delete(key);
    });
    
    logSecurityEvent('WARN', `Blacklist size exceeded, removed ${oldestEntries.length} oldest entries`);
  }
}

// 清理过期的违规记录
function cleanupViolations() {
  const now = Date.now();
  const expiredEntries = [];
  
  for (const [key, violations] of securityStore.violations.entries()) {
    const recentViolations = violations.filter(v => now - v.timestamp < 86400000); // 保留最近24小时
    
    if (recentViolations.length === 0) {
      expiredEntries.push(key);
    } else {
      securityStore.violations.set(key, recentViolations);
    }
  }
  
  expiredEntries.forEach(key => {
    securityStore.violations.delete(key);
  });
}

// 清理过期的速率限制桶
function cleanupRateLimitBuckets() {
  const now = Date.now();
  const expiredKeys = [];
  
  for (const [key, bucket] of securityStore.rateLimitBuckets.entries()) {
    if (now - bucket.lastRefill > SECURITY_CONFIG.rateLimiting.WINDOW_SIZE * 2) {
      expiredKeys.push(key);
    }
  }
  
  expiredKeys.forEach(key => {
    securityStore.rateLimitBuckets.delete(key);
  });
}

// 清理过期的令牌
function cleanupTokens() {
  const now = Date.now();
  const expiredTokens = [];
  
  for (const [token, info] of securityStore.tokenStore.activeTokens.entries()) {
    if (info.expires && info.expires < now) {
      expiredTokens.push(token);
      securityStore.tokenStore.revokedTokens.add(token);
    }
  }
  
  expiredTokens.forEach(token => {
    securityStore.tokenStore.activeTokens.delete(token);
  });
  
  // 限制撤销令牌集合大小
  if (securityStore.tokenStore.revokedTokens.size > 10000) {
    const oldestTokens = Array.from(securityStore.tokenStore.revokedTokens)
      .slice(0, securityStore.tokenStore.revokedTokens.size - 10000);
    
    oldestTokens.forEach(token => {
      securityStore.tokenStore.revokedTokens.delete(token);
    });
  }
}

// 清理过期数据
function cleanupExpiredData() {
  cleanupRequestCounts();
  cleanupBlacklist();
  cleanupViolations();
  cleanupRateLimitBuckets();
  cleanupTokens();
  
  // 限制审计日志大小
  if (securityStore.auditLogs.length > 10000) {
    securityStore.auditLogs = securityStore.auditLogs.slice(-10000);
  }
  
  // 限制警报大小
  if (securityStore.alerts.length > 1000) {
    securityStore.alerts = securityStore.alerts.slice(-1000);
  }
}

// 日志记录
function logSecurityEvent(level, message, details = {}) {
  const timestamp = new Date().toISOString();
  const logMessage = {
    level,
    timestamp,
    message,
    module: 'security_guard',
    details
  };
  
  // 根据日志级别过滤
  const levelOrder = { 'DEBUG': 0, 'INFO': 1, 'WARN': 2, 'ERROR': 3, 'FATAL': 4 };
  const currentLevelOrder = levelOrder[SECURITY_CONFIG.securityMode.LOG_LEVEL] || 1;
  
  if (levelOrder[level] >= currentLevelOrder) {
    console.log(`[security_guard] ${JSON.stringify(logMessage)}`);
  }
  
  // 保存到审计日志
  securityStore.auditLogs.push(logMessage);
  
  // 如果是错误或致命级别，记录到警报
  if (level === 'ERROR' || level === 'FATAL') {
    triggerAlert(level === 'FATAL' ? 'CRITICAL' : 'HIGH', message, details);
  }
}

// 触发警报
function triggerAlert(severity, message, details = {}) {
  // 检查冷却时间
  const now = Date.now();
  if (now - securityStore.lastAlertTime < SECURITY_CONFIG.monitoring.ALERT_COOLDOWN) {
    return; // 在冷却期内，不触发警报
  }
  
  // 验证严重性
  const validSeverities = Object.keys(SECURITY_CONFIG.alerts.SEVERITY_LEVELS);
  if (!validSeverities.includes(severity)) {
    severity = 'MEDIUM';
  }
  
  const alertId = generateId('alert');
  const alert = {
    id: alertId,
    severity,
    message,
    timestamp: new Date().toISOString(),
    details,
    severityCode: SECURITY_CONFIG.alerts.SEVERITY_LEVELS[severity].code,
    severityColor: SECURITY_CONFIG.alerts.SEVERITY_LEVELS[severity].color
  };
  
  // 保存警报
  securityStore.alerts.unshift(alert);
  securityStore.securityMetrics.alertsTriggered++;
  securityStore.lastAlertTime = now;
  
  // 输出警报到配置的通道
  SECURITY_CONFIG.alerts.NOTIFICATION_CHANNELS.forEach(channel => {
    switch (channel) {
      case 'console':
        console.error(`[SECURITY ALERT - ${severity}] ${message}`);
        console.error(JSON.stringify(details, null, 2));
        break;
      case 'log_file':
        // 由于无法写入文件，仅记录到内存
        logSecurityEvent('ERROR', `ALERT - ${severity}: ${message}`, details);
        break;
      case 'dashboard':
        // 触发到dashboard的通知（模拟）
        simulateDashboardNotification(alert);
        break;
    }
  });
  
  return alertId;
}

// 模拟dashboard通知
function simulateDashboardNotification(alert) {
  logSecurityEvent('INFO', 'Alert sent to control dashboard', {
    alertId: alert.id,
    severity: alert.severity
  });
}

// 数据脱敏
function maskSensitiveData(data, fields = SECURITY_CONFIG.dataMasking.SENSITIVE_FIELDS) {
  if (!SECURITY_CONFIG.dataMasking.ENABLED || !data) {
    return data;
  }
  
  // 处理字符串
  if (typeof data === 'string') {
    let maskedData = data;
    
    // 应用敏感字段模式
    Object.entries(SENSITIVE_DATA_PATTERNS).forEach(([type, pattern]) => {
      maskedData = maskedData.replace(pattern, (match) => {
        // 部分掩码
        if (match.length > 8) {
          const visibleChars = Math.floor(match.length * (1 - SECURITY_CONFIG.dataMasking.PARTIAL_MASK_RATIO));
          const prefix = match.substring(0, Math.floor(visibleChars / 2));
          const suffix = match.substring(match.length - Math.floor(visibleChars / 2));
          return prefix + SECURITY_CONFIG.dataMasking.MASK_PATTERN + suffix;
        }
        return SECURITY_CONFIG.dataMasking.MASK_PATTERN;
      });
    });
    
    return maskedData;
  }
  
  // 处理对象
  if (typeof data === 'object' && data !== null) {
    const maskedObject = Array.isArray(data) ? [] : {};
    
    for (const [key, value] of Object.entries(data)) {
      // 检查键是否是敏感字段
      const isSensitiveKey = fields.some(field => 
        key.toLowerCase().includes(field.toLowerCase())
      );
      
      if (isSensitiveKey && typeof value === 'string') {
        maskedObject[key] = SECURITY_CONFIG.dataMasking.MASK_PATTERN;
      } else if (typeof value === 'object' && value !== null) {
        maskedObject[key] = maskSensitiveData(value, fields);
      } else {
        maskedObject[key] = value;
      }
    }
    
    return maskedObject;
  }
  
  return data;
}

// 检查是否在白名单中
function isWhitelisted(ip, module) {
  if (!SECURITY_CONFIG.whitelist.ENABLED) {
    return false;
  }
  
  return securityStore.whitelist.ips.has(ip) || 
         securityStore.whitelist.modules.has(module);
}

// 检查是否在黑名单中
function isBlacklisted(ip) {
  const entry = securityStore.blacklist.get(ip);
  if (!entry) return false;
  
  // 检查是否过期
  if (entry.expires && entry.expires < Date.now()) {
    securityStore.blacklist.delete(ip);
    return false;
  }
  
  return true;
}

// 添加到黑名单
function addToBlacklist(ip, reason = 'Security violation', duration = SECURITY_CONFIG.blacklist.DEFAULT_BLOCK_DURATION) {
  const expires = Date.now() + duration;
  securityStore.blacklist.set(ip, {
    ip,
    reason,
    addedAt: new Date().toISOString(),
    expires,
    expiresAt: new Date(expires).toISOString()
  });
  
  logSecurityEvent('WARN', `IP added to blacklist`, {
    ip,
    reason,
    duration,
    expiresAt: new Date(expires).toISOString()
  });
  
  triggerAlert('HIGH', `IP ${ip} blocked`, {
    reason,
    duration,
    expiresAt: new Date(expires).toISOString()
  });
}

// 从黑名单中移除
function removeFromBlacklist(ip) {
  if (securityStore.blacklist.delete(ip)) {
    logSecurityEvent('INFO', `IP removed from blacklist`, { ip });
    return true;
  }
  return false;
}

// 添加到白名单
function addToWhitelist(type, value) {
  if (type === 'ip') {
    securityStore.whitelist.ips.add(value);
    logSecurityEvent('INFO', `IP added to whitelist`, { ip: value });
    return true;
  } else if (type === 'module') {
    securityStore.whitelist.modules.add(value);
    logSecurityEvent('INFO', `Module added to whitelist`, { module: value });
    return true;
  }
  return false;
}

// 从白名单中移除
function removeFromWhitelist(type, value) {
  if (type === 'ip') {
    if (securityStore.whitelist.ips.delete(value)) {
      logSecurityEvent('INFO', `IP removed from whitelist`, { ip: value });
      return true;
    }
  } else if (type === 'module') {
    if (securityStore.whitelist.modules.delete(value)) {
      logSecurityEvent('INFO', `Module removed from whitelist`, { module: value });
      return true;
    }
  }
  return false;
}

// 记录请求计数
function recordRequestCount(ip) {
  const currentMinute = getCurrentMinuteKey();
  const currentHour = getCurrentHourKey();
  
  // 记录分钟级别计数
  if (!securityStore.requestCounts.byMinute.has(currentMinute)) {
    securityStore.requestCounts.byMinute.set(currentMinute, new Map());
  }
  const minuteMap = securityStore.requestCounts.byMinute.get(currentMinute);
  minuteMap.set(ip, (minuteMap.get(ip) || 0) + 1);
  
  // 记录小时级别计数
  if (!securityStore.requestCounts.byHour.has(currentHour)) {
    securityStore.requestCounts.byHour.set(currentHour, new Map());
  }
  const hourMap = securityStore.requestCounts.byHour.get(currentHour);
  hourMap.set(ip, (hourMap.get(ip) || 0) + 1);
  
  // 增加并发计数
  securityStore.requestCounts.concurrent++;
  
  // 更新统计
  securityStore.securityMetrics.totalRequests++;
}

// 减少并发计数
function decrementConcurrentCount() {
  if (securityStore.requestCounts.concurrent > 0) {
    securityStore.requestCounts.concurrent--;
  }
}

// 获取IP请求计数
function getIpRequestCounts(ip) {
  const currentMinute = getCurrentMinuteKey();
  const currentHour = getCurrentHourKey();
  
  let minuteCount = 0;
  let hourCount = 0;
  
  // 获取分钟计数
  for (let i = currentMinute - 10; i <= currentMinute; i++) {
    const minuteMap = securityStore.requestCounts.byMinute.get(i);
    if (minuteMap && minuteMap.has(ip)) {
      minuteCount += minuteMap.get(ip);
    }
  }
  
  // 获取小时计数
  for (let i = currentHour - 24; i <= currentHour; i++) {
    const hourMap = securityStore.requestCounts.byHour.get(i);
    if (hourMap && hourMap.has(ip)) {
      hourCount += hourMap.get(ip);
    }
  }
  
  return {
    minuteCount,
    hourCount,
    concurrent: securityStore.requestCounts.concurrent
  };
}

// 检查速率限制
function checkRateLimit(ip, module = 'general') {
  if (!SECURITY_CONFIG.rateLimiting.ENABLED) {
    return { allowed: true };
  }
  
  const now = Date.now();
  const key = `${ip}:${module}`;
  
  // 获取或创建速率限制桶
  let bucket = securityStore.rateLimitBuckets.get(key);
  if (!bucket) {
    bucket = {
      tokens: SECURITY_CONFIG.rateLimiting.BUCKET_SIZE,
      lastRefill: now
    };
    securityStore.rateLimitBuckets.set(key, bucket);
  }
  
  // 计算应该补充的令牌
  const elapsedTime = now - bucket.lastRefill;
  const newTokens = Math.floor(elapsedTime * SECURITY_CONFIG.rateLimiting.REFILL_RATE / 1000);
  
  if (newTokens > 0) {
    bucket.tokens = Math.min(bucket.tokens + newTokens, SECURITY_CONFIG.rateLimiting.BUCKET_SIZE);
    bucket.lastRefill = now;
  }
  
  // 检查是否有足够的令牌
  if (bucket.tokens >= 1) {
    bucket.tokens -= 1;
    return { allowed: true, remaining: bucket.tokens };
  }
  
  // 速率限制超出
  securityStore.securityMetrics.rateLimitExceeded++;
  logSecurityEvent('WARN', 'Rate limit exceeded', {
    ip,
    module,
    remaining: bucket.tokens
  });
  
  return { 
    allowed: false, 
    remaining: bucket.tokens,
    retryAfter: Math.ceil((1 - bucket.tokens) * 1000 / SECURITY_CONFIG.rateLimiting.REFILL_RATE)
  };
}

// 检查请求频率
function checkRequestFrequency(ip) {
  const counts = getIpRequestCounts(ip);
  
  if (counts.minuteCount > SECURITY_CONFIG.securityMode.MAX_REQUESTS_PER_MINUTE) {
    return { 
      allowed: false, 
      reason: 'Too many requests per minute',
      count: counts.minuteCount,
      limit: SECURITY_CONFIG.securityMode.MAX_REQUESTS_PER_MINUTE
    };
  }
  
  if (counts.hourCount > SECURITY_CONFIG.securityMode.MAX_REQUESTS_PER_HOUR) {
    return { 
      allowed: false, 
      reason: 'Too many requests per hour',
      count: counts.hourCount,
      limit: SECURITY_CONFIG.securityMode.MAX_REQUESTS_PER_HOUR
    };
  }
  
  if (counts.concurrent > SECURITY_CONFIG.securityMode.MAX_CONCURRENT_REQUESTS) {
    return { 
      allowed: false, 
      reason: 'Too many concurrent requests',
      count: counts.concurrent,
      limit: SECURITY_CONFIG.securityMode.MAX_CONCURRENT_REQUESTS
    };
  }
  
  return { allowed: true, counts };
}

// 检测SQL注入
function detectSqlInjection(input) {
  if (!SECURITY_CONFIG.injectionProtection.SQL_ENABLED || !input || typeof input !== 'string') {
    return null;
  }
  
  for (const pattern of SQL_INJECTION_PATTERNS) {
    if (pattern.test(input)) {
      return {
        type: 'sql_injection',
        pattern: pattern.toString(),
        match: input.match(pattern)[0]
      };
    }
  }
  
  return null;
}

// 检测命令注入
function detectCommandInjection(input) {
  if (!SECURITY_CONFIG.injectionProtection.COMMAND_INJECTION_ENABLED || !input || typeof input !== 'string') {
    return null;
  }
  
  for (const pattern of COMMAND_INJECTION_PATTERNS) {
    if (pattern.test(input)) {
      return {
        type: 'command_injection',
        pattern: pattern.toString(),
        match: input.match(pattern)[0]
      };
    }
  }
  
  return null;
}

// 检测XSS攻击
function detectXss(input) {
  if (!SECURITY_CONFIG.injectionProtection.XSS_ENABLED || !input || typeof input !== 'string') {
    return null;
  }
  
  for (const pattern of XSS_PATTERNS) {
    if (pattern.test(input)) {
      return {
        type: 'xss',
        pattern: pattern.toString(),
        match: input.match(pattern)[0]
      };
    }
  }
  
  return null;
}

// 检测HTML注入
function detectHtmlInjection(input) {
  if (!SECURITY_CONFIG.injectionProtection.HTML_INJECTION_ENABLED || !input || typeof input !== 'string') {
    return null;
  }
  
  for (const pattern of HTML_INJECTION_PATTERNS) {
    if (pattern.test(input)) {
      return {
        type: 'html_injection',
        pattern: pattern.toString(),
        match: input.match(pattern)[0]
      };
    }
  }
  
  return null;
}

// 检测路径遍历
function detectPathTraversal(input) {
  if (!SECURITY_CONFIG.injectionProtection.NODE_PATH_ENABLED || !input || typeof input !== 'string') {
    return null;
  }
  
  for (const pattern of NODE_PATH_TRAVERSAL_PATTERNS) {
    if (pattern.test(input)) {
      return {
        type: 'path_traversal',
        pattern: pattern.toString(),
        match: input.match(pattern)[0]
      };
    }
  }
  
  return null;
}

// 扫描输入中的安全威胁
function scanForThreats(input) {
  if (!input) return [];
  
  const threats = [];
  
  // 处理不同类型的输入
  if (typeof input === 'string') {
    // 扫描字符串
    const sqlThreat = detectSqlInjection(input);
    if (sqlThreat) threats.push(sqlThreat);
    
    const cmdThreat = detectCommandInjection(input);
    if (cmdThreat) threats.push(cmdThreat);
    
    const xssThreat = detectXss(input);
    if (xssThreat) threats.push(xssThreat);
    
    const htmlThreat = detectHtmlInjection(input);
    if (htmlThreat) threats.push(htmlThreat);
    
    const pathThreat = detectPathTraversal(input);
    if (pathThreat) threats.push(pathThreat);
  } else if (typeof input === 'object' && input !== null) {
    // 递归扫描对象
    for (const value of Object.values(input)) {
      if (typeof value === 'string' || (typeof value === 'object' && value !== null)) {
        threats.push(...scanForThreats(value));
      }
    }
  }
  
  return threats;
}

// 记录违规
function recordViolation(ip, violation) {
  const key = ip;
  const now = Date.now();
  
  if (!securityStore.violations.has(key)) {
    securityStore.violations.set(key, []);
  }
  
  const violations = securityStore.violations.get(key);
  violations.push({
    timestamp: now,
    ...violation
  });
  
  // 更新统计
  securityStore.securityMetrics.violationsDetected++;
  
  if (violation.type === 'sql_injection' || 
      violation.type === 'command_injection' ||
      violation.type === 'xss' ||
      violation.type === 'html_injection' ||
      violation.type === 'path_traversal') {
    securityStore.securityMetrics.injectionAttempts++;
  }
  
  // 检查是否需要加入黑名单
  const recentViolations = violations.filter(v => now - v.timestamp < 3600000); // 最近1小时
  if (recentViolations.length >= SECURITY_CONFIG.securityMode.BLOCK_THRESHOLD) {
    addToBlacklist(ip, 'Multiple security violations', SECURITY_CONFIG.securityMode.BLOCK_DURATION);
  }
}

// 验证令牌
function validateToken(token) {
  if (!SECURITY_CONFIG.tokenSecurity.VALIDATE_TOKENS || !token) {
    return { valid: false, reason: 'Token validation disabled or token missing' };
  }
  
  // 检查是否已撤销
  if (securityStore.tokenStore.revokedTokens.has(token)) {
    return { valid: false, reason: 'Token has been revoked' };
  }
  
  // 检查活动令牌
  const tokenInfo = securityStore.tokenStore.activeTokens.get(token);
  if (!tokenInfo) {
    return { valid: false, reason: 'Token not found' };
  }
  
  // 检查是否过期
  if (tokenInfo.expires && tokenInfo.expires < Date.now()) {
    // 标记为已撤销
    securityStore.tokenStore.revokedTokens.add(token);
    securityStore.tokenStore.activeTokens.delete(token);
    return { valid: false, reason: 'Token has expired' };
  }
  
  // 检查签名（模拟）
  if (SECURITY_CONFIG.tokenSecurity.REQUIRE_SIGNATURE && !tokenInfo.signatureValid) {
    return { valid: false, reason: 'Invalid token signature' };
  }
  
  return { valid: true, tokenInfo };
}

// 注册令牌
function registerToken(token, tokenInfo) {
  if (!SECURITY_CONFIG.tokenSecurity.VALIDATE_TOKENS) {
    return false;
  }
  
  const expires = tokenInfo.expires || Date.now() + SECURITY_CONFIG.tokenSecurity.MAX_TOKEN_AGE;
  
  securityStore.tokenStore.activeTokens.set(token, {
    ...tokenInfo,
    registeredAt: Date.now(),
    expires
  });
  
  return true;
}

// 撤销令牌
function revokeToken(token) {
  if (!SECURITY_CONFIG.tokenSecurity.VALIDATE_TOKENS) {
    return false;
  }
  
  if (securityStore.tokenStore.activeTokens.has(token)) {
    securityStore.tokenStore.activeTokens.delete(token);
    securityStore.tokenStore.revokedTokens.add(token);
    logSecurityEvent('INFO', 'Token revoked', { token: maskSensitiveData(token) });
    return true;
  }
  
  return false;
}

// 安全审计
async function auditRequest(request, response, next) {
  try {
    const startTime = Date.now();
    const { ip = 'unknown', module = 'unknown', endpoint = 'unknown', payload = {}, headers = {} } = request;
    
    // 记录请求计数
    recordRequestCount(ip);
    
    // 安全模式检查
    if (SECURITY_CONFIG.securityMode.CURRENT === 'DISABLED') {
      decrementConcurrentCount();
      return { allowed: true, bypassed: true, reason: 'Security disabled' };
    }
    
    // 白名单检查
    if (isWhitelisted(ip, module)) {
      securityStore.securityMetrics.allowedRequests++;
      decrementConcurrentCount();
      return { allowed: true, whitelisted: true };
    }
    
    // 黑名单检查
    if (isBlacklisted(ip)) {
      securityStore.securityMetrics.blockedRequests++;
      securityStore.securityMetrics.blacklistHits++;
      decrementConcurrentCount();
      return {
        allowed: false,
        reason: 'IP is blacklisted',
        statusCode: 403
      };
    }
    
    // 令牌验证
    if (SECURITY_CONFIG.tokenSecurity.VALIDATE_TOKENS) {
      const token = headers.authorization?.split(' ')[1] || payload.token;
      if (token) {
        const tokenValidation = validateToken(token);
        if (!tokenValidation.valid) {
          securityStore.securityMetrics.blockedRequests++;
          decrementConcurrentCount();
          return {
            allowed: false,
            reason: tokenValidation.reason,
            statusCode: 401
          };
        }
      } else {
        securityStore.securityMetrics.blockedRequests++;
        decrementConcurrentCount();
        return {
          allowed: false,
          reason: 'Token required',
          statusCode: 401
        };
      }
    }
    
    // 速率限制检查
    const rateLimitCheck = checkRateLimit(ip, module);
    if (!rateLimitCheck.allowed) {
      securityStore.securityMetrics.blockedRequests++;
      decrementConcurrentCount();
      return {
        allowed: false,
        reason: 'Rate limit exceeded',
        statusCode: 429,
        retryAfter: rateLimitCheck.retryAfter
      };
    }
    
    // 请求频率检查
    const frequencyCheck = checkRequestFrequency(ip);
    if (!frequencyCheck.allowed) {
      recordViolation(ip, {
        type: 'rate_limit_violation',
        reason: frequencyCheck.reason,
        count: frequencyCheck.count,
        limit: frequencyCheck.limit
      });
      
      securityStore.securityMetrics.blockedRequests++;
      decrementConcurrentCount();
      return {
        allowed: false,
        reason: frequencyCheck.reason,
        statusCode: 429
      };
    }
    
    // 扫描payload中的威胁
    const threats = scanForThreats(payload);
    if (threats.length > 0) {
      // 记录所有威胁
      threats.forEach(threat => {
        recordViolation(ip, threat);
      });
      
      // 触发警报
      triggerAlert('HIGH', 'Security threats detected in request', {
        ip,
        module,
        endpoint,
        threats: threats.map(t => ({ type: t.type, match: maskSensitiveData(t.match) }))
      });
      
      // 在MONITOR模式下允许请求但记录
      if (SECURITY_CONFIG.securityMode.CURRENT === 'MONITOR') {
        securityStore.securityMetrics.allowedRequests++;
        decrementConcurrentCount();
        return {
          allowed: true,
          monitored: true,
          threats: threats.map(t => t.type)
        };
      } else {
        securityStore.securityMetrics.blockedRequests++;
        decrementConcurrentCount();
        return {
          allowed: false,
          reason: 'Security threats detected',
          threats: threats.map(t => t.type),
          statusCode: 403
        };
      }
    }
    
    // 检查模块访问权限（模拟）
    const moduleAccessCheck = checkModuleAccess(ip, module);
    if (!moduleAccessCheck.allowed) {
      securityStore.securityMetrics.blockedRequests++;
      decrementConcurrentCount();
      return {
        allowed: false,
        reason: moduleAccessCheck.reason,
        statusCode: 403
      };
    }
    
    // 记录审计日志
    const auditLog = {
      id: generateId('audit'),
      timestamp: new Date().toISOString(),
      ip,
      module,
      endpoint,
      status: 'allowed',
      processingTime: Date.now() - startTime
    };
    
    securityStore.auditLogs.push(auditLog);
    securityStore.securityMetrics.allowedRequests++;
    
    // 更新模块统计
    if (!securityStore.securityMetrics.byModule[module]) {
      securityStore.securityMetrics.byModule[module] = { requests: 0, blocked: 0 };
    }
    securityStore.securityMetrics.byModule[module].requests++;
    
    decrementConcurrentCount();
    
    return {
      allowed: true,
      auditId: auditLog.id,
      processingTime: auditLog.processingTime
    };
  } catch (error) {
    logSecurityEvent('ERROR', 'Error in security audit', {
      error: error.message,
      stack: error.stack
    });
    
    decrementConcurrentCount();
    
    return {
      allowed: true, // 安全检查失败时默认允许通过
      securityError: error.message
    };
  }
}

// 检查模块访问权限（模拟）
function checkModuleAccess(ip, module) {
  // 模拟模块访问控制
  const restrictedModules = ['admin', 'config', 'security'];
  const allowedIps = ['127.0.0.1', '::1'];
  
  if (restrictedModules.includes(module) && !allowedIps.includes(ip)) {
    return {
      allowed: false,
      reason: `Module ${module} access restricted`
    };
  }
  
  return { allowed: true };
}

// 安全处理响应
function secureResponse(response) {
  if (!response || typeof response !== 'object') {
    return response;
  }
  
  // 移除敏感信息
  const secureResponse = { ...response };
  
  // 脱敏敏感字段
  if (secureResponse.data) {
    secureResponse.data = maskSensitiveData(secureResponse.data);
  }
  
  // 添加安全头（模拟）
  if (!secureResponse.headers) {
    secureResponse.headers = {};
  }
  
  secureResponse.headers['X-Security-Checked'] = 'true';
  secureResponse.headers['X-Content-Type-Options'] = 'nosniff';
  secureResponse.headers['X-Frame-Options'] = 'DENY';
  secureResponse.headers['X-XSS-Protection'] = '1; mode=block';
  secureResponse.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains';
  
  return secureResponse;
}

// 获取安全状态
function getSecurityStatus() {
  const now = new Date();
  const minuteCounts = {};
  const currentMinute = getCurrentMinuteKey();
  
  // 获取最近5分钟的请求计数
  for (let i = currentMinute - 4; i <= currentMinute; i++) {
    const minuteMap = securityStore.requestCounts.byMinute.get(i);
    if (minuteMap) {
      minuteCounts[new Date(i * 60000).toISOString()] = Object.fromEntries(minuteMap);
    }
  }
  
  return {
    status: SECURITY_CONFIG.securityMode.CURRENT,
    logLevel: SECURITY_CONFIG.securityMode.LOG_LEVEL,
    metrics: {
      ...securityStore.securityMetrics,
      currentTime: now.toISOString(),
      uptime: process.uptime(),
      concurrentRequests: securityStore.requestCounts.concurrent,
      blacklistSize: securityStore.blacklist.size,
      whitelistSize: {
        ips: securityStore.whitelist.ips.size,
        modules: securityStore.whitelist.modules.size
      },
      recentRequests: minuteCounts
    },
    configuration: {
      rateLimit: {
        enabled: SECURITY_CONFIG.rateLimiting.ENABLED,
        maxRequestsPerMinute: SECURITY_CONFIG.securityMode.MAX_REQUESTS_PER_MINUTE,
        maxRequestsPerHour: SECURITY_CONFIG.securityMode.MAX_REQUESTS_PER_HOUR,
        maxConcurrentRequests: SECURITY_CONFIG.securityMode.MAX_CONCURRENT_REQUESTS
      },
      injectionProtection: {
        sql: SECURITY_CONFIG.injectionProtection.SQL_ENABLED,
        command: SECURITY_CONFIG.injectionProtection.COMMAND_INJECTION_ENABLED,
        xss: SECURITY_CONFIG.injectionProtection.XSS_ENABLED,
        html: SECURITY_CONFIG.injectionProtection.HTML_INJECTION_ENABLED,
        pathTraversal: SECURITY_CONFIG.injectionProtection.NODE_PATH_ENABLED
      }
    }
  };
}

// 获取安全警报
function getSecurityAlerts(limit = 50) {
  return securityStore.alerts.slice(0, limit);
}

// 获取审计日志
function getAuditLogs(options = {}) {
  const { limit = 50, offset = 0, level, module, ip } = options;
  
  let filteredLogs = securityStore.auditLogs;
  
  if (level) {
    filteredLogs = filteredLogs.filter(log => log.level === level);
  }
  
  if (module) {
    filteredLogs = filteredLogs.filter(log => log.details?.module === module);
  }
  
  if (ip) {
    filteredLogs = filteredLogs.filter(log => log.details?.ip === ip);
  }
  
  // 排序（最新的在前）
  filteredLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  
  const paginatedLogs = filteredLogs.slice(offset, offset + limit);
  
  return {
    logs: paginatedLogs,
    total: filteredLogs.length,
    page: Math.floor(offset / limit) + 1,
    pages: Math.ceil(filteredLogs.length / limit)
  };
}

// 获取黑名单
function getBlacklist() {
  const now = Date.now();
  const activeEntries = [];
  
  for (const [ip, entry] of securityStore.blacklist.entries()) {
    if (!entry.expires || entry.expires >= now) {
      activeEntries.push(entry);
    }
  }
  
  return activeEntries;
}

// 获取白名单
function getWhitelist() {
  return {
    ips: Array.from(securityStore.whitelist.ips),
    modules: Array.from(securityStore.whitelist.modules)
  };
}

// 更新安全配置
function updateSecurityConfig(newConfig) {
  try {
    // 验证配置
    if (newConfig.securityMode) {
      if (['ACTIVE', 'MONITOR', 'DISABLED'].includes(newConfig.securityMode.CURRENT)) {
        SECURITY_CONFIG.securityMode.CURRENT = newConfig.securityMode.CURRENT;
      }
      if (['DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL'].includes(newConfig.securityMode.LOG_LEVEL)) {
        SECURITY_CONFIG.securityMode.LOG_LEVEL = newConfig.securityMode.LOG_LEVEL;
      }
      if (newConfig.securityMode.MAX_REQUESTS_PER_MINUTE && newConfig.securityMode.MAX_REQUESTS_PER_MINUTE > 0) {
        SECURITY_CONFIG.securityMode.MAX_REQUESTS_PER_MINUTE = newConfig.securityMode.MAX_REQUESTS_PER_MINUTE;
      }
    }
    
    logSecurityEvent('INFO', 'Security configuration updated', {
      updatedFields: Object.keys(newConfig)
    });
    
    return { success: true, config: { ...SECURITY_CONFIG } };
  } catch (error) {
    logSecurityEvent('ERROR', 'Failed to update security configuration', {
      error: error.message
    });
    return { success: false, error: error.message };
  }
}

// 重置安全统计
function resetSecurityMetrics() {
  securityStore.securityMetrics = {
    totalRequests: 0,
    blockedRequests: 0,
    allowedRequests: 0,
    violationsDetected: 0,
    injectionAttempts: 0,
    rateLimitExceeded: 0,
    blacklistHits: 0,
    alertsTriggered: 0,
    byModule: {},
    byType: {}
  };
  
  logSecurityEvent('INFO', 'Security metrics reset');
  return { success: true };
}

// 模拟攻击检测（用于测试）
function simulateAttackDetection(type) {
  const mockIp = '192.168.1.100';
  let payload, threat;
  
  switch (type) {
    case 'sql_injection':
      payload = "1' OR '1'='1";
      threat = detectSqlInjection(payload);
      break;
    case 'command_injection':
      payload = "; ls -la";
      threat = detectCommandInjection(payload);
      break;
    case 'xss':
      payload = "<script>alert('XSS')</script>";
      threat = detectXss(payload);
      break;
    case 'path_traversal':
      payload = "../../../etc/passwd";
      threat = detectPathTraversal(payload);
      break;
    default:
      return { success: false, error: 'Unknown attack type' };
  }
  
  if (threat) {
    recordViolation(mockIp, threat);
    triggerAlert('HIGH', `Simulated ${type} attack detected`, {
      ip: mockIp,
      payload: maskSensitiveData(payload),
      threat
    });
    
    return { success: true, detected: true, threat };
  }
  
  return { success: false, detected: false };
}

// 健康检查
function healthCheck() {
  try {
    // 检查内存存储
    const isStoreHealthy = securityStore && 
                          securityStore.requestCounts && 
                          securityStore.blacklist && 
                          securityStore.whitelist && 
                          securityStore.violations;
    
    // 检查配置
    const isConfigHealthy = SECURITY_CONFIG && 
                           SECURITY_CONFIG.securityMode;
    
    const status = isStoreHealthy && isConfigHealthy ? 'healthy' : 'unhealthy';
    
    return {
      status,
      securityMode: SECURITY_CONFIG.securityMode.CURRENT,
      logLevel: SECURITY_CONFIG.securityMode.LOG_LEVEL,
      modules: {
        rateLimiting: SECURITY_CONFIG.rateLimiting.ENABLED,
        injectionProtection: SECURITY_CONFIG.injectionProtection.SQL_ENABLED || 
                             SECURITY_CONFIG.injectionProtection.COMMAND_INJECTION_ENABLED ||
                             SECURITY_CONFIG.injectionProtection.XSS_ENABLED,
        tokenValidation: SECURITY_CONFIG.tokenSecurity.VALIDATE_TOKENS,
        monitoring: SECURITY_CONFIG.monitoring.ENABLED
      },
      resourceUsage: {
        blacklistSize: securityStore.blacklist.size,
        whitelistSize: securityStore.whitelist.ips.size + securityStore.whitelist.modules.size,
        auditLogSize: securityStore.auditLogs.length,
        alertsSize: securityStore.alerts.length
      },
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    logSecurityEvent('ERROR', 'Security guard health check failed', {
      error: error.message
    });
    return {
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

// 导出主要功能
export async function auditRequest(request) {
  return await auditRequest(request);
}

// 导出所有功能
module.exports = {
  // 核心安全功能
  auditRequest,
  secureResponse,
  scanForThreats,
  maskSensitiveData,
  
  // 黑白名单管理
  isWhitelisted,
  isBlacklisted,
  addToBlacklist,
  removeFromBlacklist,
  addToWhitelist,
  removeFromWhitelist,
  getBlacklist,
  getWhitelist,
  
  // 令牌管理
  validateToken,
  registerToken,
  revokeToken,
  
  // 安全监控
  getSecurityStatus,
  getSecurityAlerts,
  getAuditLogs,
  triggerAlert,
  
  // 配置管理
  updateSecurityConfig,
  resetSecurityMetrics,
  
  // 测试功能
  simulateAttackDetection,
  
  // 系统功能
  healthCheck,
  cleanupExpiredData,
  
  // 配置信息
  getConfig: () => ({ ...SECURITY_CONFIG })
};

// ES模块导出
exports.default = {
  auditRequest,
  secureResponse,
  scanForThreats,
  maskSensitiveData,
  isWhitelisted,
  isBlacklisted,
  addToBlacklist,
  removeFromBlacklist,
  addToWhitelist,
  removeFromWhitelist,
  getBlacklist,
  getWhitelist,
  validateToken,
  registerToken,
  revokeToken,
  getSecurityStatus,
  getSecurityAlerts,
  getAuditLogs,
  triggerAlert,
  updateSecurityConfig,
  resetSecurityMetrics,
  simulateAttackDetection,
  healthCheck,
  cleanupExpiredData,
  getConfig: () => ({ ...SECURITY_CONFIG })
};

// 初始化
function initializeSecurityGuard() {
  logSecurityEvent('INFO', 'Security guard initialized', {
    securityMode: SECURITY_CONFIG.securityMode.CURRENT,
    logLevel: SECURITY_CONFIG.securityMode.LOG_LEVEL,
    features: {
      rateLimiting: SECURITY_CONFIG.rateLimiting.ENABLED,
      injectionProtection: SECURITY_CONFIG.injectionProtection.SQL_ENABLED,
      tokenValidation: SECURITY_CONFIG.tokenSecurity.VALIDATE_TOKENS,
      monitoring: SECURITY_CONFIG.monitoring.ENABLED
    }
  });
  
  // 启动定期清理
  setInterval(cleanupExpiredData, 600000); // 每10分钟清理一次
  
  // 初始清理
  cleanupExpiredData();
}

// 自初始化
initializeSecurityGuard();
