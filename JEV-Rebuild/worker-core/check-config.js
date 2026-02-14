// 测试脚本：检查JWT token和位置ID配置
import fs from 'fs';
import path from 'path';

// 读取wrangler.toml配置
const wranglerConfigPath = path.join(process.cwd(), 'wrangler.toml');
const wranglerConfig = fs.readFileSync(wranglerConfigPath, 'utf8');

// 解析wrangler.toml配置
function parseWranglerConfig(config) {
  const vars = {};
  const lines = config.split('\n');
  let inVarsSection = false;
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    
    if (trimmedLine === '[vars]') {
      inVarsSection = true;
      continue;
    }
    
    if (inVarsSection && trimmedLine && !trimmedLine.startsWith('#') && !trimmedLine.startsWith('[')) {
      const [key, value] = trimmedLine.split('=').map(v => v.trim());
      // 移除引号
      const cleanValue = value.replace(/['"]/g, '');
      vars[key] = cleanValue;
    } else if (inVarsSection && trimmedLine.startsWith('[')) {
      break;
    }
  }
  
  return vars;
}

const vars = parseWranglerConfig(wranglerConfig);
console.log('[CONFIG_CHECK] Loaded vars:', vars);

// 检查JWT token和位置ID配置
async function checkJWTandLocation() {
  const PIT_JWT = vars.PIT_JWT;
  const DAOJIE_LOCATION_ID = vars.DAOJIE_LOCATION_ID;
  
  if (!PIT_JWT) {
    console.error('[CONFIG_CHECK] ❌ PIT_JWT not found in wrangler.toml');
    return { ok: false, error: 'PIT_JWT_MISSING' };
  }
  
  if (!DAOJIE_LOCATION_ID) {
    console.error('[CONFIG_CHECK] ❌ DAOJIE_LOCATION_ID not found in wrangler.toml');
    return { ok: false, error: 'LOCATION_ID_MISSING' };
  }
  
  console.log('[CONFIG_CHECK] ✅ JWT and Location ID found in wrangler.toml');
  console.log('[CONFIG_CHECK] JWT:', PIT_JWT.substring(0, 20) + '...');
  console.log('[CONFIG_CHECK] Location ID:', DAOJIE_LOCATION_ID);
  
  // 测试1：验证JWT是否有效（获取位置信息）
  console.log('\n[TEST 1] Testing JWT validity for location access...');
  try {
    // 尝试获取位置信息或与位置相关的资源
    const locationTestResponse = await fetch('https://services.leadconnectorhq.com/locations/' + DAOJIE_LOCATION_ID, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${PIT_JWT}`,
        'Version': '2021-07-28',
        'Content-Type': 'application/json'
      }
    });
    
    const responseText = await locationTestResponse.text();
    console.log('[TEST 1] Response Status:', locationTestResponse.status, locationTestResponse.statusText);
    
    if (locationTestResponse.ok) {
      console.log('[TEST 1] ✅ JWT has access to the specified location!');
      try {
        const locationData = JSON.parse(responseText);
        console.log('[TEST 1] Location Name:', locationData.name || locationData.locationName || 'unknown');
        console.log('[TEST 1] Location ID:', locationData.id || locationData.locationId || 'unknown');
      } catch (parseError) {
        console.log('[TEST 1] ✅ JWT is valid but response parsing failed:', parseError.message);
      }
      return { ok: true, status: 'JWT_VALID' };
    } else {
      console.log('[TEST 1] ❌ JWT does not have access to the specified location');
      console.log('[TEST 1] Response:', responseText);
      
      // 尝试解析错误信息
      try {
        const errorData = JSON.parse(responseText);
        console.log('[TEST 1] Error Code:', errorData.code || errorData.errorCode || 'unknown');
        console.log('[TEST 1] Error Message:', errorData.message || errorData.error || 'unknown');
      } catch (parseError) {
        console.log('[TEST 1] Error parsing error response:', parseError.message);
      }
      return { ok: false, status: 'JWT_INVALID', error: responseText };
    }
  } catch (error) {
    console.error('[TEST 1] ❌ Network error:', error.message);
    return { ok: false, status: 'NETWORK_ERROR', error: error.message };
  }
}

// 执行检查
checkJWTandLocation();
