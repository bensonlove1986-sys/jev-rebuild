// JEV Plugin v2.0 - 客服邀请码注册与验证管理模块

const fs = require('fs');
const path = require('path');

// 文件路径配置
const CLIENT_PROFILE_PATH = path.join(__dirname, 'client_profile.json');
const AUTH_LOG_PATH = path.join(__dirname, 'auth_log.txt');

// 邀请码验证池（示例）
const VALID_INVITE_CODES = [
  'JEV-CLIENT-001',
  'JEV-CLIENT-002',
  'JEV-CLIENT-003',
  'JEV-CLIENT-004',
  'JEV-CLIENT-005'
];

/**
 * 记录日志到 auth_log.txt
 * @param {string} message - 日志消息
 */
function logAuthEvent(message) {
  try {
    const timestamp = new Date().toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
    const logEntry = `[${timestamp}] ${message}\n`;
    
    // 确保日志文件存在
    if (!fs.existsSync(AUTH_LOG_PATH)) {
      fs.writeFileSync(AUTH_LOG_PATH, '', 'utf8');
    }
    
    fs.appendFileSync(AUTH_LOG_PATH, logEntry, 'utf8');
    console.log(`[AUTH LOG] ${logEntry.trim()}`);
  } catch (error) {
    console.error('写入认证日志失败:', error);
  }
}

/**
 * 读取客户端档案
 * @returns {Object} 客户端档案数据
 */
function readClientProfile() {
  try {
    if (!fs.existsSync(CLIENT_PROFILE_PATH)) {
      // 创建默认配置
      const defaultProfile = {
        metadata: {
          systemName: "JEV Plugin 控制中心",
          version: "2.0.0",
          lastUpdated: new Date().toISOString(),
          description: "客服人员档案数据库",
          totalClients: 0,
          activeClients: 0
        },
        clients: [],
        systemConfig: {
          security: {
            encryptionEnabled: true,
            lastKeyRotation: new Date().toISOString()
          },
          defaults: {
            licenseDurationDays: 365,
            maxDevicesPerLicense: 3
          },
          allowedDomains: ["@jevshop.com", "@example.com"]
        },
        schemaVersion: "1.0.0"
      };
      fs.writeFileSync(CLIENT_PROFILE_PATH, JSON.stringify(defaultProfile, null, 2), 'utf8');
      return defaultProfile;
    }
    
    const data = fs.readFileSync(CLIENT_PROFILE_PATH, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('读取客户端档案失败:', error);
    return {
      metadata: {
        systemName: "JEV Plugin 控制中心",
        version: "2.0.0",
        lastUpdated: new Date().toISOString(),
        description: "客服人员档案数据库",
        totalClients: 0,
        activeClients: 0
      },
      clients: []
    };
  }
}

/**
 * 保存客户端档案
 * @param {Object} profile - 客户端档案数据
 */
function saveClientProfile(profile) {
  try {
    profile.metadata.lastUpdated = new Date().toISOString();
    profile.metadata.totalClients = profile.clients.length;
    profile.metadata.activeClients = profile.clients.filter(client => client.online).length;
    
    fs.writeFileSync(CLIENT_PROFILE_PATH, JSON.stringify(profile, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('保存客户端档案失败:', error);
    return false;
  }
}

/**
 * 验证邀请码
 * @param {string} code - 邀请码
 * @returns {Object} 验证结果
 */
function verifyInvite(code) {
  console.log(`[验证邀请码] 检查: ${code}`);
  
  // 基本验证
  if (!code || typeof code !== 'string' || code.trim().length === 0) {
    return {
      success: false,
      message: '邀请码不能为空'
    };
  }
  
  const trimmedCode = code.trim();
  
  // 检查邀请码是否在有效池
  if (!VALID_INVITE_CODES.includes(trimmedCode)) {
    logAuthEvent(`邀请码验证失败 | 邀请码: ${trimmedCode} | 原因: 无效邀请码`);
    return {
      success: false,
      message: '无效的邀请码'
    };
  }
  
  // 检查邀请码是否已被使用
  const profile = readClientProfile();
  const existingClient = profile.clients.find(client => client.invite_code === trimmedCode);
  
  if (existingClient) {
    logAuthEvent(`邀请码验证失败 | 邀请码: ${trimmedCode} | 原因: 邀请码已被使用`);
    return {
      success: false,
      message: '邀请码已被使用'
    };
  }
  
  logAuthEvent(`邀请码验证成功 | 邀请码: ${trimmedCode}`);
  return {
    success: true,
    message: '邀请码有效'
  };
}

/**
 * 生成唯一客户端ID
 * @returns {string} 客户端ID
 */
function generateClientId() {
  const profile = readClientProfile();
  const existingIds = profile.clients.map(client => client.client_id);
  let counter = 1;
  
  while (true) {
    const clientId = `CX${counter.toString().padStart(3, '0')}`;
    if (!existingIds.includes(clientId)) {
      return clientId;
    }
    counter++;
  }
}

/**
 * 生成License Key
 * @param {string} clientId - 客户端ID
 * @returns {string} License Key
 */
function generateLicenseKey(clientId) {
  const timestamp = Math.floor(Date.now() / 1000);
  return `JEV-${clientId}-${timestamp}`;
}

/**
 * 注册客户端
 * @param {string} inviteCode - 邀请码
 * @param {string} deviceId - 设备ID
 * @returns {Object} 注册结果
 */
function registerClient(inviteCode, deviceId) {
  console.log(`[客户端注册] 邀请码: ${inviteCode}, 设备ID: ${deviceId}`);
  
  // 验证输入参数
  if (!inviteCode || !deviceId) {
    return {
      success: false,
      message: '邀请码和设备ID不能为空'
    };
  }
  
  // 验证邀请码
  const verifyResult = verifyInvite(inviteCode);
  if (!verifyResult.success) {
    return verifyResult;
  }
  
  // 生成客户端信息
  const clientId = generateClientId();
  const licenseKey = generateLicenseKey(clientId);
  const registerTime = new Date().toISOString();
  
  const newClient = {
    client_id: clientId,
    invite_code: inviteCode,
    device_id: deviceId,
    license_key: licenseKey,
    register_time: registerTime,
    online: true,
    last_sync: registerTime
  };
  
  // 保存到档案
  const profile = readClientProfile();
  profile.clients.push(newClient);
  
  if (saveClientProfile(profile)) {
    const logMessage = `注册成功 | 客服ID: ${clientId} | 邀请码: ${inviteCode} | License: ${licenseKey}`;
    logAuthEvent(logMessage);
    
    return {
      success: true,
      license_key: licenseKey,
      relay_url: "https://jevshop.workers.dev/api/relay",
      message: '注册成功'
    };
  } else {
    return {
      success: false,
      message: '保存注册信息失败'
    };
  }
}

/**
 * 获取已注册客户端列表
 * @returns {Array} 客户端列表
 */
function getRegisteredClients() {
  try {
    const profile = readClientProfile();
    return profile.clients;
  } catch (error) {
    console.error('获取客户端列表失败:', error);
    return [];
  }
}

/**
 * 更新客户端状态
 * @param {string} clientId - 客户端ID
 * @param {Object} updates - 更新的字段
 */
function updateClientStatus(clientId, updates) {
  try {
    const profile = readClientProfile();
    const clientIndex = profile.clients.findIndex(client => client.client_id === clientId);
    
    if (clientIndex !== -1) {
      profile.clients[clientIndex] = { ...profile.clients[clientIndex], ...updates };
      if (updates.online !== undefined || updates.last_sync !== undefined) {
        profile.clients[clientIndex].last_sync = updates.last_sync || new Date().toISOString();
      }
      saveClientProfile(profile);
      return true;
    }
    return false;
  } catch (error) {
    console.error('更新客户端状态失败:', error);
    return false;
  }
}

/**
 * 检查License是否有效
 * @param {string} licenseKey - License Key
 * @returns {boolean} 是否有效
 */
function validateLicense(licenseKey) {
  try {
    const profile = readClientProfile();
    return profile.clients.some(client => client.license_key === licenseKey);
  } catch (error) {
    console.error('验证License失败:', error);
    return false;
  }
}

// 导出API模块
module.exports = {
  verifyInvite,
  registerClient,
  getRegisteredClients,
  updateClientStatus,
  validateLicense,
  logAuthEvent
};

// 示例使用
if (require.main === module) {
  console.log('JEV Plugin v2.0 - 邀请码管理模块测试');
  
  // 测试验证邀请码
  const verifyTest = verifyInvite('JEV-CLIENT-004');
  console.log('验证邀请码测试:', verifyTest);
  
  // 测试注册客户端
  if (verifyTest.success) {
    const registerTest = registerClient('JEV-CLIENT-004', 'TEST-DEVICE-001');
    console.log('注册客户端测试:', registerTest);
  }
  
  // 获取客户端列表
  console.log('已注册客户端列表:', getRegisteredClients());
}