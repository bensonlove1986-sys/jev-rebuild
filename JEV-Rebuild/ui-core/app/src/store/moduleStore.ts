import { create } from 'zustand';

// 定义模块类型
export type ModuleType = 'chat' | 'chat_v3' | 'chat_modular' | 'customers' | 'orders' | 'ai' | 'system' | 'products' | 'browser' | 'pi' | 'shopify' | 'facebook' | 'youtube' | 'contact';

interface ModuleState {
  currentModule: ModuleType;
  setModule: (module: ModuleType) => void;
}

export const useModuleStore = create<ModuleState>((set) => ({
  // 设置默认模块为chat，这是我们已经注册的聊天模块
  currentModule: 'chat' as ModuleType,
  setModule: (module) => set({ currentModule: module }),
}));
