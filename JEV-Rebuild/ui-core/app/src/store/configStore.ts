import { create } from 'zustand';
// Zustand v5中，persist middleware已内置，无需单独导入

// 监控配置类型
export interface MonitorConfig {
  // 监控开关
  isEnabled: boolean;
  // 监控频率（毫秒）
  monitorInterval: number;
  // 监控类型：['text', 'image']
  monitorTypes: string[];
  // 目标URL
  targetUrl: string;
  // 是否启用节流
  enableThrottling: boolean;
  // 图片压缩质量 (0-1)
  imageQuality: number;
  // 最大监控历史记录数
  maxHistoryCount: number;
}

// 默认配置
const defaultConfig: MonitorConfig = {
  isEnabled: false,
  monitorInterval: 3000,
  monitorTypes: ['text', 'image'],
  targetUrl: 'https://app.daojiemarketing.com/v2/location/3SsfTbU1lmAPpkG9iB6C/conversations/conversations',
  enableThrottling: true,
  imageQuality: 0.7,
  maxHistoryCount: 100
};

// 配置存储接口
export interface ConfigStore {
  // 监控配置
  monitorConfig: MonitorConfig;
  // 更新监控配置
  updateMonitorConfig: (updates: Partial<MonitorConfig>) => void;
  // 重置监控配置到默认值
  resetMonitorConfig: () => void;
}

// 创建配置存储
export const useConfigStore = create<ConfigStore>()(
  (set) => ({
    monitorConfig: defaultConfig,
    updateMonitorConfig: (updates) => set((state) => ({
      monitorConfig: { ...state.monitorConfig, ...updates }
    })),
    resetMonitorConfig: () => set({ monitorConfig: defaultConfig })
  })
);
