import { create } from 'zustand';

// WebSocket 运行时状态接口
interface WSRuntimeState {
  // 连接状态
  status: 'connecting' | 'connected' | 'closed';
  // 最后一次 pong 时间戳
  lastPongTs: number;
  // 最后一次 ping 时间戳
  lastPingTs: number;
  // 重连尝试次数
  reconnectAttempt: number;
  // 最后一次关闭代码
  lastCloseCode: number | null;
  
  // 操作方法
  setStatus: (status: 'connecting' | 'connected' | 'closed') => void;
  setLastPongTs: (ts: number) => void;
  setLastPingTs: (ts: number) => void;
  incrementReconnectAttempt: () => void;
  resetReconnectAttempt: () => void;
  setLastCloseCode: (code: number) => void;
}

// 创建 wsRuntimeStore
export const useWSRuntimeStore = create<WSRuntimeState>((set) => ({
  // 初始状态
  status: 'closed',
  lastPongTs: 0,
  lastPingTs: 0,
  reconnectAttempt: 0,
  lastCloseCode: null,
  
  // 操作方法
  setStatus: (status) => set({ status }),
  setLastPongTs: (ts) => set({ lastPongTs: ts }),
  setLastPingTs: (ts) => set({ lastPingTs: ts }),
  incrementReconnectAttempt: () => set((state) => ({
    reconnectAttempt: state.reconnectAttempt + 1
  })),
  resetReconnectAttempt: () => set({ reconnectAttempt: 0 }),
  setLastCloseCode: (code) => set({ lastCloseCode: code }),
}));

// 导出获取 store 实例的函数（用于非组件环境）
export function getWSRuntimeStore() {
  return useWSRuntimeStore;
}

// 导出 store 的原始实例（用于非组件环境）
export const wsRuntimeStore = useWSRuntimeStore;
