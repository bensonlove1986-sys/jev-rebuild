import { create } from 'zustand';

interface AutoEngineState {
  auto_reply: boolean;
  auto_generate: boolean;
  auto_send: boolean;
  delayMode: 'manual' | 'immediate' | 'delay';
  fixedGenerateTime: number;
  useRandomGenerateTime: boolean;
  minRandomGenerateTime: number;
  maxRandomGenerateTime: number;
  fixedReplyTime: number;
  useRandomReplyTime: boolean;
  minRandomTime: number;
  maxRandomTime: number;
}

interface AutoEngineStore {
  state: AutoEngineState;
  lastProcessedId: string | null;
  lastSendTimestamp: number;
  setAutoReply: (value: boolean) => void;
  setAutoGenerate: (value: boolean) => void;
  setAutoSend: (value: boolean) => void;
  updateState: (newState: Partial<AutoEngineState>) => void;
  setLastProcessedId: (id: string) => void;
  setLastSendTimestamp: (timestamp: number) => void;
  checkSendGate: (replyDelay: number) => boolean;
}

// 从localStorage加载设置
const loadFromStorage = (): AutoEngineState => {
  try {
    const saved = localStorage.getItem('auto_engine_settings');
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (error) {
    console.error('[AUTO_ENGINE_STORAGE_ERROR] Failed to load settings:', error);
  }
  // 默认设置：生成AI建议回复，但不自动发送
  return {
    auto_reply: false,
    auto_generate: true,
    auto_send: false,
    delayMode: 'immediate',
    fixedGenerateTime: 2,
    useRandomGenerateTime: false,
    minRandomGenerateTime: 2,
    maxRandomGenerateTime: 120,
    fixedReplyTime: 2,
    useRandomReplyTime: false,
    minRandomTime: 2,
    maxRandomTime: 120
  };
};

// 保存设置到localStorage
const saveToStorage = (state: AutoEngineState) => {
  try {
    localStorage.setItem('auto_engine_settings', JSON.stringify(state));
  } catch (error) {
    console.error('[AUTO_ENGINE_STORAGE_ERROR] Failed to save settings:', error);
  }
};

const useAutoEngineStore = create<AutoEngineStore>((set, get) => ({
  state: loadFromStorage(),
  lastProcessedId: null,
  lastSendTimestamp: 0,
  setAutoReply: (value: boolean) => set((state) => {
    const newState = {
      ...state.state,
      auto_reply: value
    };
    saveToStorage(newState);
    console.log('[AUTO_ENGINE_STATE]', newState);
    return { state: newState };
  }),
  setAutoGenerate: (value: boolean) => set((state) => {
    const newState = {
      ...state.state,
      auto_generate: value
    };
    saveToStorage(newState);
    console.log('[AUTO_ENGINE_STATE]', newState);
    return { state: newState };
  }),
  setAutoSend: (value: boolean) => set((state) => {
    const newState = {
      ...state.state,
      auto_send: value
    };
    saveToStorage(newState);
    console.log('[AUTO_ENGINE_STATE]', newState);
    return { state: newState };
  }),
  setDelayMode: (value: 'manual' | 'immediate' | 'delay') => set((state) => {
    const newState = {
      ...state.state,
      delayMode: value
    };
    saveToStorage(newState);
    console.log('[AUTO_ENGINE_STATE]', newState);
    return { state: newState };
  }),
  setFixedGenerateTime: (value: number) => set((state) => {
    const newState = {
      ...state.state,
      fixedGenerateTime: value
    };
    saveToStorage(newState);
    console.log('[AUTO_ENGINE_STATE]', newState);
    return { state: newState };
  }),
  setFixedReplyTime: (value: number) => set((state) => {
    const newState = {
      ...state.state,
      fixedReplyTime: value
    };
    saveToStorage(newState);
    console.log('[AUTO_ENGINE_STATE]', newState);
    return { state: newState };
  }),
  setUseRandomReplyTime: (value: boolean) => set((state) => {
    const newState = {
      ...state.state,
      useRandomReplyTime: value
    };
    saveToStorage(newState);
    console.log('[AUTO_ENGINE_STATE]', newState);
    return { state: newState };
  }),
  setMinRandomTime: (value: number) => set((state) => {
    const newState = {
      ...state.state,
      minRandomTime: value
    };
    saveToStorage(newState);
    console.log('[AUTO_ENGINE_STATE]', newState);
    return { state: newState };
  }),
  setMaxRandomTime: (value: number) => set((state) => {
    const newState = {
      ...state.state,
      maxRandomTime: value
    };
    saveToStorage(newState);
    console.log('[AUTO_ENGINE_STATE]', newState);
    return { state: newState };
  }),
  setUseRandomGenerateTime: (value: boolean) => set((state) => {
    const newState = {
      ...state.state,
      useRandomGenerateTime: value
    };
    saveToStorage(newState);
    console.log('[AUTO_ENGINE_STATE]', newState);
    return { state: newState };
  }),
  setMinRandomGenerateTime: (value: number) => set((state) => {
    const newState = {
      ...state.state,
      minRandomGenerateTime: value
    };
    saveToStorage(newState);
    console.log('[AUTO_ENGINE_STATE]', newState);
    return { state: newState };
  }),
  setMaxRandomGenerateTime: (value: number) => set((state) => {
    const newState = {
      ...state.state,
      maxRandomGenerateTime: value
    };
    saveToStorage(newState);
    console.log('[AUTO_ENGINE_STATE]', newState);
    return { state: newState };
  }),
  updateState: (newState: Partial<AutoEngineState>) => set((state) => {
    const updatedState = {
      ...state.state,
      ...newState
    };
    saveToStorage(updatedState);
    console.log('[AUTO_ENGINE_STATE]', updatedState);
    return { state: updatedState };
  }),
  setLastProcessedId: (id: string) => set(() => {
    console.log('[AUTO_ENGINE_SET_LAST_PROCESSED]', id);
    return { lastProcessedId: id };
  }),
  setLastSendTimestamp: (timestamp: number) => set(() => {
    return { lastSendTimestamp: timestamp };
  }),
  checkSendGate: (replyDelay: number) => {
    const state = get();
    const now = Date.now();
    const minDelay = replyDelay * 1000;
    
    console.log('[AUTO_ENGINE_DELAY_APPLIED]', replyDelay);
    
    let allowed, reason;
    if (now - state.lastSendTimestamp < minDelay) {
      console.log('[AUTO_ENGINE_SEND_BLOCKED]');
      allowed = false;
      reason = 'delay_not_passed';
      console.log("[AUTO_ENGINE_GATE_RESULT]", {
        allowed,
        reason,
        auto_send: state.state.auto_send
      });
      return false;
    } else {
      console.log('[AUTO_ENGINE_SEND_ALLOWED]');
      allowed = true;
      reason = 'delay_passed';
      console.log("[AUTO_ENGINE_GATE_RESULT]", {
        allowed,
        reason,
        auto_send: state.state.auto_send
      });
      set({ lastSendTimestamp: now });
      return true;
    }
  }
}));

export { useAutoEngineStore };