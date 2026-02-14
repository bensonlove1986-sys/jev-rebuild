// 热更新失效配置
if (import.meta.hot) {
  import.meta.hot.accept();
  import.meta.hot.dispose(() => {
    // 清理所有eventBus和pluginEventHub监听器
    console.log('[HMR_DISPOSE] App: cleaning up eventBus and pluginEventHub listeners');
  });
}

import React, { useEffect, useState, createContext, useContext } from 'react';
import { ConfigProvider, Spin, Alert, App as AntdApp } from 'antd';
import { MainLayout } from './layouts/MainLayout';
import { useModuleStore } from './store/moduleStore';
import { useCustomersStore } from './store/customersStore';
import { useSystemStore } from './store/systemStore';
import { useChatStore } from './modules/chat_modular/store/chatStore';
import { useContactStore } from './modules/chat_modular/store/contactStore';
import { usePresenceStore } from './store/presenceStore';
import { moduleRegistry } from './modules/moduleRegistry';
import whatsAppInboxService from './services/WhatsAppInboxService';
import DeepSeekChatWindow from './modules/chat_modular/components/DeepSeekChatWindow';

// 确保服务实例在全局可访问
if (typeof window !== 'undefined') {
  window.whatsAppInboxService = whatsAppInboxService;
  window.__WhatsAppInboxServiceInstance = whatsAppInboxService;
}
import './styles/global.css';



// 强制确认：打印API_BASE和环境信息
import { API_BASE } from './config/api';
console.log('[API_BASE_CHECK]', API_BASE);
console.log('[ENV_MODE]', import.meta.env.MODE);
console.log('[ENV_VARS]', import.meta.env);

// 创建DeepSeek全局状态上下文
export const DeepSeekContext = createContext<{
  deepSeekOpen: boolean;
  setDeepSeekOpen: (open: boolean) => void;
}>({  deepSeekOpen: false,
  setDeepSeekOpen: () => {}
});

// 创建翻译全局状态上下文
export const TranslationContext = createContext<{
  translateOpen: boolean;
  setTranslateOpen: (open: boolean) => void;
  translateText: string;
  setTranslateText: (text: string) => void;
}>({  translateOpen: false,
  setTranslateOpen: () => {},
  translateText: "",
  setTranslateText: () => {}
});

// 主应用内容组件
const AppContent: React.FC = () => {
  const { currentModule } = useModuleStore();
  const { checkHealth, getStatus, startPeriodicHealthCheck } = useSystemStore();
  const { loadContactsFromAPI } = useContactStore();
  const { startRadarPolling } = usePresenceStore();
  const [appInitDone, setAppInitDone] = useState(false);
  const [moduleComponent, setModuleComponent] = useState<React.ReactNode>(null);
  const [deepSeekOpen, setDeepSeekOpen] = useState(false);
  const [translateOpen, setTranslateOpen] = useState(false);
  const [translateText, setTranslateText] = useState("");
  
  // 用于日志降噪的 ref
  const lastLogTimeRef = React.useRef<number>(0);
  const lastModuleRef = React.useRef<string>(currentModule);
  
  // 调试日志降噪：只在模块切换时打印，或在 dev 模式下节流
  useEffect(() => {
    const now = Date.now();
    const isModuleChanged = currentModule !== lastModuleRef.current;
    const isDevMode = import.meta.env.MODE === 'development';
    const isTimeElapsed = now - lastLogTimeRef.current > 1000; // 1秒节流
    
    if (isModuleChanged || (isDevMode && isTimeElapsed)) {
      console.log('[APP_DEBUG] Current module:', currentModule);
      lastLogTimeRef.current = now;
      lastModuleRef.current = currentModule;
    }
  }, [currentModule]);

  // 应用初始化，只执行一次
  useEffect(() => {
    const initializeApp = async () => {
      // 使用单例 guard 确保只初始化一次
      if ((window as any).__APP_INIT_DONE__) {
        console.log('[APP_INIT] Application already initialized, skipping');
        setAppInitDone(true);
        return;
      }
      
      console.log('[APP_INIT] Starting application initialization');
      (window as any).__APP_INIT_DONE__ = true;
      
      // 首先确保聊天数据从localStorage加载完成
      console.log('[APP_INIT] Ensuring chat data is loaded from localStorage');
      
      // 执行服务器探活（不阻断UI）
      console.log('[APP_INIT] Checking server health');
      await Promise.allSettled([
        checkHealth(),
        getStatus()
      ]);
      
      // 加载联系人列表
      try {
        console.log('[CONTACT_LIST_LOAD_START] Loading contacts from API');
        await loadContactsFromAPI();
        console.log('[CONTACT_LIST_LOAD_COMPLETE] Contact loading completed');
      } catch (error) {
        console.error('[CONTACT_LIST_LOAD_ERROR] Error loading contacts:', error);
      }
      
      // 启动周期性健康检查
      console.log('[APP_INIT] Starting periodic health check');
      startPeriodicHealthCheck();
      
      // 启动 Presence Radar 轮询
         console.log('[APP_INIT] Starting Presence Radar polling');
         // 使用 getState() 直接调用，避免依赖数组问题
         usePresenceStore.getState().startRadarPolling();
         
         // 初始化 WhatsAppInboxService（单例启动）
         console.log('[APP_INIT] Initializing WhatsAppInboxService (singleton start)');
         if (whatsAppInboxService && typeof whatsAppInboxService.init === 'function') {
           console.log('[APP_INIT] Calling whatsAppInboxService.init()');
           whatsAppInboxService.init();
           console.log('[APP_INIT] WhatsAppInboxService initialized successfully');
         } else {
           console.error('[APP_INIT_ERROR] WhatsAppInboxService not available or init method missing');
         }
         
         console.log('[APP_INIT] Application initialization completed');
         setAppInitDone(true);
    };

    initializeApp();
  }, []); // 空依赖数组，确保只执行一次

  // 根据当前模块动态加载组件
  useEffect(() => {
    const loadModule = async () => {
      console.log('[APP_DEBUG] Loading module:', currentModule);
      try {
        // 获取当前模块配置
        const moduleConfig = moduleRegistry.getModule(currentModule);
        console.log('[APP_DEBUG] Module config:', moduleConfig);
        if (moduleConfig) {
          // 动态导入模块组件
          console.log('[APP_DEBUG] Importing component:', moduleConfig.component);
          const ModuleComponent = await moduleConfig.component();
          console.log('[APP_DEBUG] Component imported successfully:', ModuleComponent);
          setModuleComponent(<ModuleComponent />);
          console.log('[APP_DEBUG] Module component set successfully');
        } else {
          console.error(`[MODULE_LOAD_ERROR] Module ${currentModule} not found in registry`);
          setModuleComponent(null);
        }
      } catch (error) {
        console.error(`[MODULE_LOAD_ERROR] Failed to load module ${currentModule}:`, error);
        setModuleComponent(null);
      }
    };

    loadModule();
  }, [currentModule]);

  return (
    <DeepSeekContext.Provider value={{ deepSeekOpen, setDeepSeekOpen }}>
      <TranslationContext.Provider value={{ translateOpen, setTranslateOpen, translateText, setTranslateText }}>
        <MainLayout>
          {moduleComponent}
        </MainLayout>
        {deepSeekOpen && (
          <DeepSeekChatWindow onClose={() => setDeepSeekOpen(false)} />
        )}
      </TranslationContext.Provider>
    </DeepSeekContext.Provider>
  );
};

// 加入明确日志
if (typeof window !== 'undefined') {
  const location = window.location;
  
  // 加入明确日志
  console.info('[ENV_CHECK]', {
    ui_origin: location.origin,
    mode: 'PRODUCTION'
  });
}

const App: React.FC = () => {
  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#1890ff',
        },
      }}
    >
      <AntdApp>
        <AppContent />
      </AntdApp>
    </ConfigProvider>
  );
};

export default App;
