/* UTF-8 FIXED BY JEV @ 2025-11-09T15:11:17.545Z */
import { apiRequest } from './clientBridge.js';

export async function ensureSession() {
  let token = localStorage.getItem('JEV_AGENT_TOKEN');
  if (!token) {
    const code = prompt('猫炉路猫戮聯氓聟楼閭€璇风爜:');
    const valid = await apiRequest('/invites/validate', 'POST', { code });
    if (!valid.success) {
      alert('閭€璇风爜忙聴聽忙聲聢忙聢聳氓路虏猫驴聡忙聹聼');
      return;
    }
    const register = await apiRequest('/agents/register', 'POST', { invite: code });
    if (register.token) {
      localStorage.setItem('JEV_AGENT_TOKEN', register.token);
      alert('忙鲁篓氓聠聦忙聢聬氓聤聼 芒聹聟');
      token = register.token;
    }
  }
  return token;
}

export function logout() {
  localStorage.removeItem('JEV_AGENT_TOKEN');
  alert('氓路虏忙鲁篓茅聰聙');
}
