// JEV L8.9.6-invite · 邀请码注册系统 - Cloudflare Worker实现

// 全局错误处理
addEventListener('error', async (event) => {
  console.error('Worker error:', event.error);
  try {
    await logError('InviteSystem', 'Global', event.error.message);
  } catch (logErr) {
    console.error('日志记录失败:', logErr);
  }
});

addEventListener('unhandledrejection', async (event) => {
  console.error('Unhandled Promise rejection:', event.reason);
  try {
    await logError('InviteSystem', 'Promise', event.reason.message || String(event.reason));
  } catch (logErr) {
    console.error('日志记录失败:', logErr);
  }
});

// 获取安全配置函数
function getSecurityConfig(env = null) {
  const currentEnv = env || (typeof cloudflare !== 'undefined' ? cloudflare.env : (typeof self !== 'undefined' ? self : (typeof global !== 'undefined' ? global : (typeof window !== 'undefined' ? window : {}))));
  
  const defaultOrigins = [
    'https://app.daojiemarketing.com',
    'https://jevshop.bensonlove1986.workers.dev',
    'http://localhost',
    'http://localhost:3000'
  ];
  
  let allowedOrigins = defaultOrigins;
  if (currentEnv.ALLOW_ORIGIN) {
    if (currentEnv.ALLOW_ORIGIN === '*') {
      allowedOrigins = ['*'];
    } else {
      const customOrigins = currentEnv.ALLOW_ORIGIN.split(',').map(origin => origin.trim());
      allowedOrigins = [...new Set([...customOrigins, ...defaultOrigins])];
    }
  }
  
  return {
    ADMIN_TOKEN: currentEnv.ADMIN_TOKEN || env?.ADMIN_TOKEN || 'jev-admin-token-2025',
    API_KEY: currentEnv.API_KEY || env?.API_KEY || 'api-key-456',
    ALLOWED_ORIGINS: allowedOrigins.filter(Boolean),
    MODE: currentEnv.MODE || env?.MODE || 'development',
    CORS_ENABLED: true,
    CORS_MAX_AGE: 86400
  };
}

// KV命名空间常量
const KV_NAMESPACES = {
  INVITE: 'INVITE_KV',
  SYSTEM: 'JEV_SYS_KV',
  LOG: 'JEV_LOG_KV'
};

// 统一响应格式函数
function createResponse(success, data = null, error = null, headers = {}, env = null) {
  const response = {
    success,
    data: success ? data : null,
    error: success ? null : error
  };
  
  const responseHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, DELETE, PUT',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Token-Id',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block'
  };
  
  const securityConfig = getSecurityConfig(env);
  
  if (headers['Access-Control-Allow-Origin']) {
  } else if (securityConfig.ALLOW_ORIGIN) {
    responseHeaders['Access-Control-Allow-Origin'] = securityConfig.ALLOW_ORIGIN;
  } else {
    responseHeaders['Access-Control-Allow-Origin'] = '*';
  }
  
  Object.assign(responseHeaders, headers);
  
  return new Response(JSON.stringify(response), {
    headers: responseHeaders
  });
}

// 处理OPTIONS请求
function handleOptions(request, env = null) {
  const securityConfig = getSecurityConfig(env);
  const origin = request.headers.get('Origin');
  const requestHeaders = request.headers.get('Access-Control-Request-Headers');
  
  const headers = {
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, DELETE, PUT, PATCH',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Token-Id',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': String(securityConfig.CORS_MAX_AGE || 86400),
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block'
  };
  
  if (requestHeaders) {
    headers['Access-Control-Allow-Headers'] = requestHeaders;
  }
  
  if (origin) {
    const isAllowed = securityConfig.ALLOWED_ORIGINS.some(allowedOrigin => {
      if (allowedOrigin === '*') return true;
      return origin === allowedOrigin || 
             (allowedOrigin.includes('*') && 
              origin.endsWith(allowedOrigin.substring(allowedOrigin.indexOf('*') + 1)));
    });
    
    if (isAllowed) {
      headers['Access-Control-Allow-Origin'] = origin;
    } else if (securityConfig.ALLOWED_ORIGINS.includes('*')) {
      headers['Access-Control-Allow-Origin'] = '*';
    }
  } else {
    headers['Access-Control-Allow-Origin'] = '*';
  }
  
  return new Response(null, { headers });
}

// 验证管理员权限
async function validateAdminToken(request, env = null) {
  const securityConfig = getSecurityConfig(env);
  const authHeader = request.headers.get('Authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { valid: false, error: 'Missing or invalid authorization header' };
  }
  
  const token = authHeader.substring(7);
  if (token !== securityConfig.ADMIN_TOKEN) {
    return { valid: false, error: 'Invalid admin token' };
  }
  
  return { valid: true };
}

// 日志记录函数
async function logError(component, operation, message, env = null) {
  try {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      component,
      operation,
      message,
      severity: 'error'
    };
    
    const logKey = `error:${timestamp}:${Math.random().toString(36).substr(2, 9)}`;
    
    // 尝试写入KV
    try {
      const kv = getKVNamespace(KV_NAMESPACES.LOG, env);
      if (kv && typeof kv.put === 'function') {
        await kv.put(logKey, JSON.stringify(logEntry));
      }
    } catch (kvError) {
      console.warn('KV日志写入失败:', kvError);
      // 使用模拟KV作为后备
      if (!global.mockLogs) global.mockLogs = [];
      global.mockLogs.push(logEntry);
    }
    
    console.error(`[${timestamp}] ${component}.${operation}: ${message}`);
  } catch (err) {
    console.error('日志记录过程出错:', err);
  }
}

// 审计日志函数
async function logAudit(action, details, env = null) {
  try {
    const timestamp = new Date().toISOString();
    const auditEntry = {
      timestamp,
      action,
      details,
      version: 'L8.9.6-invite'
    };
    
    const auditKey = `audit:${timestamp}:${Math.random().toString(36).substr(2, 9)}`;
    
    // 尝试写入KV
    try {
      const kv = getKVNamespace(KV_NAMESPACES.INVITE, env);
      if (kv && typeof kv.put === 'function') {
        await kv.put(auditKey, JSON.stringify(auditEntry));
      }
    } catch (kvError) {
      console.warn('审计日志写入失败:', kvError);
      // 使用模拟KV作为后备
      if (!global.mockAudits) global.mockAudits = [];
      global.mockAudits.push(auditEntry);
    }
    
    console.log(`[AUDIT] ${action}:`, details);
  } catch (err) {
    console.error('审计日志记录过程出错:', err);
  }
}

// 获取KV命名空间
function getKVNamespace(namespace, env = null) {
  // 在实际环境中，从env获取KV命名空间
  if (env && env[namespace]) {
    return env[namespace];
  }
  
  // 模拟KV实现（开发环境用）
  if (!global.mockKV) {
    global.mockKV = {};
  }
  
  if (!global.mockKV[namespace]) {
    global.mockKV[namespace] = {
      store: {},
      async get(key) {
        return this.store[key] || null;
      },
      async put(key, value) {
        this.store[key] = value;
      },
      async delete(key) {
        delete this.store[key];
      },
      async list(options = {}) {
        const keys = Object.keys(this.store).filter(key => {
          if (options.prefix && !key.startsWith(options.prefix)) return false;
          return true;
        });
        return {
          keys: keys.map(key => ({ name: key })),
          list_complete: true
        };
      }
    };
  }
  
  return global.mockKV[namespace];
}

// 生成安全随机邀请码
function generateInviteCode() {
  // 使用安全字符集，避免易混淆字符（如0/O/1/l）
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'AGT-';
  
  // 生成4位字符
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(crypto.getRandomValues(new Uint32Array(1))[0] / (0xffffffff + 1) * chars.length));
  }
  code += '-';
  
  // 再生成4位字符
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(crypto.getRandomValues(new Uint32Array(1))[0] / (0xffffffff + 1) * chars.length));
  }
  
  return code;
}

// 生成单个邀请码
async function generateSingleInvite(options, env = null) {
  const kv = getKVNamespace(KV_NAMESPACES.INVITE, env);
  const code = generateInviteCode();
  const now = new Date().toISOString();
  
  // 检查码是否已存在（极低概率）
  let existing = await kv.get(`invite:${code}`);
  while (existing) {
    console.warn(`邀请码冲突: ${code}，重新生成`);
    code = generateInviteCode();
    existing = await kv.get(`invite:${code}`);
  }
  
  const inviteData = {
    code,
    created_at: now,
    uses_allowed: options.uses_allowed || 1,
    uses_count: 0,
    expires_at: options.expires_at,
    note: options.note || '',
    role: options.role || 'user',
    status: 'active',
    metadata: options.metadata || {}
  };
  
  // 保存邀请码
  await kv.put(`invite:${code}`, JSON.stringify(inviteData));
  
  // 更新索引
  const indexJson = await kv.get('invite:index');
  let index = indexJson ? JSON.parse(indexJson) : [];
  index.push(code);
  await kv.put('invite:index', JSON.stringify(index));
  
  // 记录审计日志
  await logAudit('invite.generate', {
    code,
    uses_allowed: inviteData.uses_allowed,
    expires_at: inviteData.expires_at,
    note: inviteData.note,
    role: inviteData.role
  }, env);
  
  return inviteData;
}

// 批量生成邀请码
async function generateBatchInvites(count, options, env = null) {
  const invites = [];
  
  for (let i = 0; i < count; i++) {
    try {
      const invite = await generateSingleInvite(options, env);
      invites.push(invite);
    } catch (error) {
      console.error(`生成邀请码失败 (${i+1}/${count}):`, error);
      // 继续生成其他邀请码
    }
  }
  
  // 记录批量生成的审计日志
  if (invites.length > 0) {
    await logAudit('invite.generate_batch', {
      count: invites.length,
      uses_allowed: options.uses_allowed || 1,
      expires_at: options.expires_at,
      note: options.note || '',
      role: options.role || 'user'
    }, env);
  }
  
  return invites;
}

// 验证邀请码
async function validateInviteCode(code, env = null) {
  const kv = getKVNamespace(KV_NAMESPACES.INVITE, env);
  const inviteDataStr = await kv.get(`invite:${code}`);
  
  if (!inviteDataStr) {
    return { valid: false, error: '邀请码不存在' };
  }
  
  const inviteData = JSON.parse(inviteDataStr);
  
  // 检查状态
  if (inviteData.status !== 'active') {
    return { valid: false, error: '邀请码已被撤销' };
  }
  
  // 检查过期时间
  if (inviteData.expires_at) {
    const now = new Date();
    const expiry = new Date(inviteData.expires_at);
    if (now > expiry) {
      return { valid: false, error: '邀请码已过期' };
    }
  }
  
  // 检查使用次数
  if (inviteData.uses_allowed > 0 && inviteData.uses_count >= inviteData.uses_allowed) {
    return { valid: false, error: '邀请码已达到使用次数上限' };
  }
  
  // 验证成功，但不增加使用次数（只有在实际注册时才增加）
  return { 
    valid: true, 
    data: {
      code: inviteData.code,
      role: inviteData.role,
      remaining_uses: inviteData.uses_allowed > 0 ? inviteData.uses_allowed - inviteData.uses_count : Infinity,
      expires_at: inviteData.expires_at,
      note: inviteData.note
    }
  };
}

// 使用邀请码（在实际注册时调用）
async function useInviteCode(code, env = null) {
  const kv = getKVNamespace(KV_NAMESPACES.INVITE, env);
  const inviteDataStr = await kv.get(`invite:${code}`);
  
  if (!inviteDataStr) {
    return { success: false, error: '邀请码不存在' };
  }
  
  const inviteData = JSON.parse(inviteDataStr);
  
  // 先验证
  const validation = await validateInviteCode(code, env);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }
  
  // 增加使用次数
  inviteData.uses_count += 1;
  
  // 保存更新后的数据
  await kv.put(`invite:${code}`, JSON.stringify(inviteData));
  
  // 记录审计日志
  await logAudit('invite.used', {
    code,
    new_uses_count: inviteData.uses_count,
    role: inviteData.role
  }, env);
  
  return { 
    success: true, 
    data: {
      code: inviteData.code,
      role: inviteData.role,
      remaining_uses: inviteData.uses_allowed > 0 ? inviteData.uses_allowed - inviteData.uses_count : Infinity,
      used_at: new Date().toISOString()
    }
  };
}

// 撤销邀请码
async function revokeInviteCode(code, env = null) {
  const kv = getKVNamespace(KV_NAMESPACES.INVITE, env);
  const inviteDataStr = await kv.get(`invite:${code}`);
  
  if (!inviteDataStr) {
    return { success: false, error: '邀请码不存在' };
  }
  
  const inviteData = JSON.parse(inviteDataStr);
  
  // 检查是否已经撤销
  if (inviteData.status === 'revoked') {
    return { success: false, error: '邀请码已经被撤销' };
  }
  
  // 更新状态为已撤销
  inviteData.status = 'revoked';
  inviteData.revoked_at = new Date().toISOString();
  
  // 保存更新后的数据
  await kv.put(`invite:${code}`, JSON.stringify(inviteData));
  
  // 记录审计日志
  await logAudit('invite.revoked', {
    code,
    role: inviteData.role,
    uses_count: inviteData.uses_count
  }, env);
  
  return { 
    success: true, 
    data: {
      code: inviteData.code,
      revoked_at: inviteData.revoked_at,
      previous_status: 'active'
    }
  };
}

// 获取邀请码列表
async function listInvites(filters = {}, env = null) {
  const kv = getKVNamespace(KV_NAMESPACES.INVITE, env);
  const indexJson = await kv.get('invite:index');
  const index = indexJson ? JSON.parse(indexJson) : [];
  
  const invites = [];
  
  for (const code of index) {
    try {
      const inviteDataStr = await kv.get(`invite:${code}`);
      if (inviteDataStr) {
        const inviteData = JSON.parse(inviteDataStr);
        
        // 应用过滤器
        if (filters.status && inviteData.status !== filters.status) continue;
        if (filters.role && inviteData.role !== filters.role) continue;
        
        // 检查过期状态（对于活跃的邀请码）
        if (inviteData.status === 'active' && inviteData.expires_at) {
          const now = new Date();
          const expiry = new Date(inviteData.expires_at);
          if (now > expiry) {
            inviteData.status = 'expired';
            // 这里可以选择更新KV中的状态
          }
        }
        
        invites.push(inviteData);
      }
    } catch (error) {
      console.error(`获取邀请码信息失败 (${code}):`, error);
    }
  }
  
  // 按创建时间倒序排序
  invites.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  
  return invites;
}

// 生成CSV导出数据
function generateCSV(invites) {
  const headers = ['Code', 'Created At', 'Uses Allowed', 'Uses Count', 'Status', 'Expires At', 'Note', 'Role'];
  const rows = [headers.join(',')];
  
  for (const invite of invites) {
    const row = [
      invite.code,
      invite.created_at,
      invite.uses_allowed,
      invite.uses_count,
      invite.status,
      invite.expires_at || '',
      `"${invite.note.replace(/"/g, '""')}"`, // 转义CSV中的引号
      invite.role
    ];
    rows.push(row.join(','));
  }
  
  return rows.join('\n');
}

// 处理生成邀请码请求
async function handleGenerateInvite(request, env = null) {
  // 验证管理员权限
  const adminValidation = await validateAdminToken(request, env);
  if (!adminValidation.valid) {
    return createResponse(false, null, adminValidation.error, null, env);
  }
  
  try {
    const data = await request.json();
    
    // 验证请求参数
    if (!data) {
      return createResponse(false, null, 'Invalid request data', null, env);
    }
    
    // 批量生成
    if (data.batch_count && Number.isInteger(data.batch_count) && data.batch_count > 0) {
      const count = Math.min(data.batch_count, 100); // 限制单次批量生成数量
      const options = {
        uses_allowed: data.uses_allowed,
        expires_at: data.expires_at,
        note: data.note,
        role: data.role
      };
      
      const invites = await generateBatchInvites(count, options, env);
      
      // 如果请求CSV格式
      if (data.format === 'csv') {
        const csv = generateCSV(invites);
        const headers = {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="invites_${new Date().toISOString().split('T')[0]}.csv"`
        };
        return new Response(csv, { headers });
      }
      
      return createResponse(true, {
        count: invites.length,
        invites: invites.map(inv => ({
          code: inv.code,
          created_at: inv.created_at,
          expires_at: inv.expires_at
        }))
      }, null, null, env);
    }
    
    // 单个生成
    const options = {
      uses_allowed: data.uses_allowed,
      expires_at: data.expires_at,
      note: data.note,
      role: data.role,
      metadata: data.metadata
    };
    
    const invite = await generateSingleInvite(options, env);
    return createResponse(true, invite, null, null, env);
  } catch (error) {
    await logError('InviteSystem', 'Generate', error.message, env);
    return createResponse(false, null, `生成邀请码失败: ${error.message}`, null, env);
  }
}

// 处理验证邀请码请求
async function handleValidateInvite(request, env = null) {
  try {
    const data = await request.json();
    
    if (!data || !data.code) {
      return createResponse(false, null, '邀请码不能为空', null, env);
    }
    
    // 验证邀请码格式
    if (!/^AGT-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(data.code)) {
      return createResponse(false, null, '邀请码格式不正确', null, env);
    }
    
    const result = await validateInviteCode(data.code, env);
    
    if (result.valid) {
      return createResponse(true, result.data, null, null, env);
    } else {
      return createResponse(false, null, result.error, null, env);
    }
  } catch (error) {
    await logError('InviteSystem', 'Validate', error.message, env);
    return createResponse(false, null, `验证邀请码失败: ${error.message}`, null, env);
  }
}

// 处理撤销邀请码请求
async function handleRevokeInvite(request, env = null) {
  // 验证管理员权限
  const adminValidation = await validateAdminToken(request, env);
  if (!adminValidation.valid) {
    return createResponse(false, null, adminValidation.error, null, env);
  }
  
  try {
    const data = await request.json();
    
    if (!data || !data.code) {
      return createResponse(false, null, '邀请码不能为空', null, env);
    }
    
    const result = await revokeInviteCode(data.code, env);
    
    if (result.success) {
      return createResponse(true, result.data, null, null, env);
    } else {
      return createResponse(false, null, result.error, null, env);
    }
  } catch (error) {
    await logError('InviteSystem', 'Revoke', error.message, env);
    return createResponse(false, null, `撤销邀请码失败: ${error.message}`, null, env);
  }
}

// 处理获取邀请码列表请求
async function handleListInvites(request, env = null) {
  // 验证管理员权限
  const adminValidation = await validateAdminToken(request, env);
  if (!adminValidation.valid) {
    return createResponse(false, null, adminValidation.error, null, env);
  }
  
  try {
    // 解析URL查询参数
    const url = new URL(request.url);
    const filters = {
      status: url.searchParams.get('status') || null,
      role: url.searchParams.get('role') || null
    };
    
    // 获取格式参数
    const format = url.searchParams.get('format') || 'json';
    
    const invites = await listInvites(filters, env);
    
    // CSV格式导出
    if (format === 'csv') {
      const csv = generateCSV(invites);
      const headers = {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="invites_list_${new Date().toISOString().split('T')[0]}.csv"`
      };
      return new Response(csv, { headers });
    }
    
    // JSON格式
    return createResponse(true, {
      total: invites.length,
      invites: invites.map(inv => ({
        code: inv.code,
        created_at: inv.created_at,
        uses_allowed: inv.uses_allowed,
        uses_count: inv.uses_count,
        status: inv.status,
        expires_at: inv.expires_at,
        note: inv.note,
        role: inv.role,
        revoked_at: inv.revoked_at
      }))
    }, null, null, env);
  } catch (error) {
    await logError('InviteSystem', 'List', error.message, env);
    return createResponse(false, null, `获取邀请码列表失败: ${error.message}`, null, env);
  }
}

// 处理代理注册请求（包含邀请码验证）
async function handleAgentRegisterWithInvite(request, env = null) {
  try {
    const data = await request.json();
    
    if (!data) {
      return createResponse(false, null, 'Invalid request data', null, env);
    }
    
    // 验证邀请码
    if (!data.invite_code) {
      return createResponse(false, null, '邀请码不能为空', null, env);
    }
    
    const inviteValidation = await validateInviteCode(data.invite_code, env);
    if (!inviteValidation.valid) {
      return createResponse(false, null, `邀请码验证失败: ${inviteValidation.error}`, null, env);
    }
    
    // 使用邀请码（增加使用次数）
    const useResult = await useInviteCode(data.invite_code, env);
    if (!useResult.success) {
      return createResponse(false, null, `使用邀请码失败: ${useResult.error}`, null, env);
    }
    
    // 这里可以继续处理代理注册逻辑
    // 为了演示，我们返回成功信息
    return createResponse(true, {
      message: '代理注册成功',
      invite_info: useResult.data,
      role: inviteValidation.data.role
    }, null, null, env);
  } catch (error) {
    await logError('InviteSystem', 'AgentRegister', error.message, env);
    return createResponse(false, null, `代理注册失败: ${error.message}`, null, env);
  }
}

// 主请求处理函数
async function handleRequest(request, env = null) {
  const url = new URL(request.url);
  
  // 处理OPTIONS请求
  if (request.method === 'OPTIONS') {
    return handleOptions(request, env);
  }
  
  // API路由处理
  try {
    // 邀请码管理接口
    if (url.pathname === '/invites/generate' && request.method === 'POST') {
      return handleGenerateInvite(request, env);
    }
    
    if (url.pathname === '/invites/validate' && request.method === 'POST') {
      return handleValidateInvite(request, env);
    }
    
    if (url.pathname === '/invites/revoke' && request.method === 'POST') {
      return handleRevokeInvite(request, env);
    }
    
    if (url.pathname === '/invites/list' && request.method === 'GET') {
      return handleListInvites(request, env);
    }
    
    // 带邀请码的代理注册接口
    if (url.pathname === '/agents/register' && request.method === 'POST') {
      return handleAgentRegisterWithInvite(request, env);
    }
    
    // 健康检查接口
    if (url.pathname === '/invites/health' && request.method === 'GET') {
      return createResponse(true, {
        status: 'ok',
        version: 'L8.9.6-invite',
        timestamp: new Date().toISOString()
      }, null, null, env);
    }
    
    // 404 - 未找到接口
    return createResponse(false, null, 'API endpoint not found', null, env);
  } catch (error) {
    await logError('InviteSystem', 'RequestHandler', error.message, env);
    return createResponse(false, null, `Internal server error: ${error.message}`, null, env);
  }
}

// 注册事件监听器
if (typeof addEventListener !== 'undefined') {
  addEventListener('fetch', (event) => {
    event.respondWith(handleRequest(event.request, event.env));
  });
} else if (typeof module !== 'undefined' && module.exports) {
  // Node.js 导出
  module.exports = { handleRequest };
}

// 模拟环境（开发用）
if (typeof cloudflare === 'undefined') {
  (typeof self !== 'undefined' ? self : (typeof global !== 'undefined' ? global : {})).cloudflare = {
    env: {
      ADMIN_TOKEN: 'jev-admin-token-2025',
      API_KEY: 'api-key-456',
      MODE: 'development',
      ALLOW_ORIGIN: '*'
    }
  };
}
