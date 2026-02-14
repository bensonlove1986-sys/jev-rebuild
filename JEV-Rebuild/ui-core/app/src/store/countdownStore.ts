import { create } from 'zustand';

// 定义倒计时状态接口
interface CountdownState {
  // 倒计时存储，以chat_id为key
  countdowns: Record<string, {
    type: 'send' | 'generate';
    start_time: number; // 开始时间（timestamp）
    duration: number; // 持续时间（秒）
    draft_id: string; // 关联的草稿ID
    status: 'active' | 'completed' | 'cancelled'; // 倒计时状态
  }>;
  
  // 操作方法
  addCountdown: (chatId: string, countdown: {
    type: 'send' | 'generate';
    duration: number;
    draft_id: string;
  }) => void;
  
  cancelCountdown: (chatId: string) => void;
  
  completeCountdown: (chatId: string) => void;
  
  getCountdown: (chatId: string) => {
    type: 'send' | 'generate';
    start_time: number;
    duration: number;
    draft_id: string;
    status: 'active' | 'completed' | 'cancelled';
    remaining_time: number;
  } | null;
  
  clearAllCountdowns: () => void;
}

export const useCountdownStore = create<CountdownState>((set, get) => ({
  // 初始状态
  countdowns: {},
  
  // 添加倒计时
  addCountdown: (chatId, countdown) => set((state) => ({
    countdowns: {
      ...state.countdowns,
      [chatId]: {
        ...countdown,
        start_time: Date.now(),
        status: 'active'
      }
    }
  })),
  
  // 取消倒计时
  cancelCountdown: (chatId) => set((state) => {
    if (!state.countdowns[chatId]) return state;
    
    return {
      countdowns: {
        ...state.countdowns,
        [chatId]: {
          ...state.countdowns[chatId],
          status: 'cancelled'
        }
      }
    };
  }),
  
  // 完成倒计时
  completeCountdown: (chatId) => set((state) => {
    if (!state.countdowns[chatId]) return state;
    
    return {
      countdowns: {
        ...state.countdowns,
        [chatId]: {
          ...state.countdowns[chatId],
          status: 'completed'
        }
      }
    };
  }),
  
  // 获取倒计时（包含剩余时间计算）
  getCountdown: (chatId) => {
    const state = get();
    const countdown = state.countdowns[chatId];
    
    if (!countdown) return null;
    
    // 计算剩余时间（秒）
    const now = Date.now();
    const elapsed = Math.floor((now - countdown.start_time) / 1000);
    const remaining_time = Math.max(0, countdown.duration - elapsed);
    
    // 打印剩余时间变化日志
    console.log(`[COUNTDOWN_TICKING] ChatId: ${chatId}, Type: ${countdown.type}, Remaining: ${remaining_time}s`);
    
    return {
      ...countdown,
      remaining_time
    };
  },
  
  // 清空所有倒计时
  clearAllCountdowns: () => set({ countdowns: {} })
}));
