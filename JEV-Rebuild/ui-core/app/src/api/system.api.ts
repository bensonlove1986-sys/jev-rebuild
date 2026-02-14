import { fetchApi } from './apiClient';

export interface HealthStatus {
  status: string;
  timestamp: number;
  worker_version?: string;
}

export interface SystemStatus {
  status: string;
  world_count?: number;
  worker_version?: string;
  build_time?: number;
}

// 健康检查
export async function healthCheck(): Promise<HealthStatus> {
  return fetchApi<HealthStatus>('/api/health');
}

// 获取系统状态
export async function getSystemStatus(): Promise<SystemStatus> {
  return fetchApi<SystemStatus>('/api/status');
}
