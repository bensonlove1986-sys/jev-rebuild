/**
 * JEV Plugin v2.0 - 云端通信模块
 * 负责插件与云端Relay/Worker的安全通信
 */

// 全局配置常量
const JEV_RELAY_CONFIG = {
  BASE_URL: 'https://jevshop.workers.dev/api',
  TIMEOUT: 8000, // 8秒超时
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000
};

/**
 * 生成或获取设备ID
 * @returns {string} 设备唯一标识符
 */
function getDeviceId() {
  let deviceId = GM_getValue("jev_plugin_device_id");
  if (!deviceId) {
    // 生成一个简单的UUID
    deviceId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
    GM_setValue("jev_plugin_device_id", deviceId);
  }
  return deviceId;
}

/**
 * 发送请求到云端Relay
 * @param {string} endpoint - API端点
 * @param {Object} payload - 请求数据
 * @param {number} retryCount - 当前重试次数
 * @returns {Promise<Object>} 响应数据
 */
async function relayCall(endpoint, payload = {}, retryCount = 0) {
  try {
    const licenseKey = GM_getValue("jev_plugin_license") || "";
    const deviceId = getDeviceId();
    
    // 设置请求参数
    const url = `${JEV_RELAY_CONFIG.BASE_URL}/${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      'X-License-Key': licenseKey,
      'X-Device-ID': deviceId
    };
    
    // 创建带超时的fetch请求
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), JEV_RELAY_CONFIG.TIMEOUT);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    // 记录成功日志
    console.log(`[JEV Relay] endpoint=${endpoint} → status: success`);
    
    return data;
    
  } catch (error) {
    // 记录失败日志
    console.error(`[JEV Relay] endpoint=${endpoint} → status: fail, error: ${error.message}`);
    
    // 重试机制
    if (retryCount < JEV_RELAY_CONFIG.MAX_RETRIES && !error.name.includes('AbortError')) {
      retryCount++;
      console.log(`[JEV Relay] Retrying ${endpoint} (${retryCount}/${JEV_RELAY_CONFIG.MAX_RETRIES})...`);
      
      // 等待重试延迟
      await new Promise(resolve => setTimeout(resolve, JEV_RELAY_CONFIG.RETRY_DELAY));
      return relayCall(endpoint, payload, retryCount);
    }
    
    throw error;
  }
}

/**
 * 检查网络连接状态
 * @returns {Promise<boolean>} 连接状态
 */
async function checkConnection() {
  try {
    const response = await fetch(JEV_RELAY_CONFIG.BASE_URL, {
      method: 'HEAD',
      timeout: 2000
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * 测试授权状态
 * @returns {Promise<Object>} 授权状态
 */
async function testAuth() {
  try {
    return await relayCall('auth_test');
  } catch (error) {
    console.error('[JEV Relay] Auth test failed:', error);
    return { valid: false, error: error.message };
  }
}

// 导出模块方法
const relayConnector = {
  relayCall,
  checkConnection,
  testAuth,
  getDeviceId
};

// 全局导出
if (typeof window !== 'undefined') {
  window.relayConnector = relayConnector;
}

// 模块导出
module.exports = relayConnector;
