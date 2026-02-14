import { create } from 'zustand';
import { healthCheck, getSystemStatus, type HealthStatus, type SystemStatus } from '../api/system.api';

interface SystemState {
  isHealthy: boolean;
  status: SystemStatus;
  health: HealthStatus | null;
  lastCheckAt: number | null;
  isLoading: boolean;
  error: string | null;
  autoTranslate: boolean; // 自动翻译开关
  // 界面尺寸和缩放状态
  uiSize: {
    width: number;
    height: number;
    scale: number;
  };
  // 拖拽状态
  isResizing: boolean;
  // 操作函数
  checkHealth: () => Promise<void>;
  getStatus: () => Promise<void>;
  startPeriodicHealthCheck: () => void;
  stopPeriodicHealthCheck: () => void;
  setAutoTranslate: (enabled: boolean) => void; // 设置自动翻译状态
  // 界面尺寸操作
  updateUISize: (size: Partial<SystemState['uiSize']>) => void;
  setIsResizing: (isResizing: boolean) => void;
  resetUISize: () => void;
  // 缩放操作
  zoomIn: () => void;
  zoomOut: () => void;
}

// 从localStorage加载UI尺寸设置
const loadUISizeFromStorage = (): SystemState['uiSize'] => {
  try {
    const saved = localStorage.getItem('jev_ui_size');
    if (saved) {
      const parsed = JSON.parse(saved);
      // 验证格式
      if (
        parsed.width && typeof parsed.width === 'number' &&
        parsed.height && typeof parsed.height === 'number' &&
        parsed.scale && typeof parsed.scale === 'number'
      ) {
        return parsed;
      }
    }
  } catch (error) {
    console.error('Failed to load UI size from storage:', error);
  }
  // 默认值
  return {
    width: window.innerWidth,
    height: window.innerHeight,
    scale: 1
  };
};

// 保存UI尺寸设置到localStorage
const saveUISizeToStorage = (size: SystemState['uiSize']) => {
  try {
    localStorage.setItem('jev_ui_size', JSON.stringify(size));
  } catch (error) {
    console.error('Failed to save UI size to storage:', error);
  }
};

export const useSystemStore = create<SystemState>((set, get) => {
  let healthCheckInterval: ReturnType<typeof setInterval> | null = null;

  return {
    isHealthy: false,
    status: {} as SystemStatus,
    health: null,
    lastCheckAt: null,
    isLoading: false,
    error: null,
    autoTranslate: true, // 默认开启自动翻译
    uiSize: loadUISizeFromStorage(), // 从localStorage加载
    isResizing: false,

    checkHealth: async () => {
      set({ isLoading: true, error: null });
      
      try {
        const result = await healthCheck();
        set({ 
          health: result, 
          isHealthy: result.status === 'ok', 
          lastCheckAt: Date.now(),
          isLoading: false 
        });
      } catch (error) {
        set({ 
          isHealthy: false, 
          health: null,
          lastCheckAt: Date.now(),
          error: error instanceof Error ? error.message : 'Failed to check health',
          isLoading: false
        });
      }
    },

    getStatus: async () => {
      set({ isLoading: true, error: null });
      
      try {
        const data = await getSystemStatus();
        set({ status: data, isLoading: false });
      } catch (error) {
        set({ 
          status: {} as SystemStatus, 
          error: error instanceof Error ? error.message : 'Failed to get status',
          isLoading: false
        });
      }
    },

    startPeriodicHealthCheck: () => {
      // Clear existing interval if any
      if (healthCheckInterval) {
        clearInterval(healthCheckInterval);
      }
      
      // Check health immediately
      get().checkHealth();
      
      // Set up periodic check every 30 seconds
      healthCheckInterval = setInterval(() => {
        get().checkHealth();
      }, 30000);
    },

    stopPeriodicHealthCheck: () => {
      if (healthCheckInterval) {
        clearInterval(healthCheckInterval);
        healthCheckInterval = null;
      }
    },

    setAutoTranslate: (enabled: boolean) => {
      set({ autoTranslate: enabled });
    },

    // 更新UI尺寸
    updateUISize: (size: Partial<SystemState['uiSize']>) => {
      set(state => {
        const newSize = {
          ...state.uiSize,
          ...size
        };
        // 保存到localStorage
        saveUISizeToStorage(newSize);
        return {
          uiSize: newSize
        };
      });
    },

    // 设置拖拽状态
    setIsResizing: (isResizing: boolean) => {
      set({ isResizing });
    },

    // 重置UI尺寸
    resetUISize: () => {
      const defaultSize = {
        width: window.innerWidth,
        height: window.innerHeight,
        scale: 1
      };
      set({ uiSize: defaultSize });
      saveUISizeToStorage(defaultSize);
    },

    // 放大
    zoomIn: () => {
      set(state => {
        const newScale = Math.min(state.uiSize.scale + 0.1, 2);
        const newSize = {
          ...state.uiSize,
          scale: newScale
        };
        saveUISizeToStorage(newSize);
        return {
          uiSize: newSize
        };
      });
    },

    // 缩小
    zoomOut: () => {
      set(state => {
        const newScale = Math.max(state.uiSize.scale - 0.1, 0.5);
        const newSize = {
          ...state.uiSize,
          scale: newScale
        };
        saveUISizeToStorage(newSize);
        return {
          uiSize: newSize
        };
      });
    }
  };
});
