import { safeFetch } from './apiClient';

export interface PresenceRadarItem {
  customer_id: string;
  message_id: string;
  source: string;
  ts: number;
  stored_at: number;
}

export interface PresenceRadarResponse {
  ok: boolean;
  radar: PresenceRadarItem[];
}

/**
 * 获取 Presence Radar 数据
 * @returns Presence Radar 响应
 */
export async function getPresenceRadar(): Promise<PresenceRadarResponse> {
  try {
    console.log('[RADAR_FETCH_START]');
    
    // 使用 safeFetch 发送请求到 /api/presence/radar
    const response = await safeFetch('/api/presence/radar', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data: PresenceRadarResponse = await response.json();
    
    // 确保 data.radar 存在
    if (!data.radar) {
      data.radar = [];
    }
    
    console.log('[RADAR_FETCH_OK]', data.radar.length);
    console.log('[RADAR_RENDER_COUNT]', data.radar.length);
    console.log('[RADAR_FETCH_DATA]', data);
    
    return data;
  } catch (error) {
    console.error('[RADAR_FETCH_ERROR]', error);
    // 错误时返回空数组
    return { ok: false, radar: [] };
  }
}
