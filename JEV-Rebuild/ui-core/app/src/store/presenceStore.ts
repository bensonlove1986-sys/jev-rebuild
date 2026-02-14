import { create } from 'zustand';
import { getPresenceRadar, type PresenceRadarItem } from '../api/presence.api';
import { useChatStore } from '../modules/chat_modular/store/chatStore';
import whatsAppInboxService from '../services/WhatsAppInboxService';
import { normalizeCustomerId } from '../utils/customerId';

interface PresenceState {
  radarData: PresenceRadarItem[];
  isLoading: boolean;
  error: string | null;
  lastFetchedAt: number | null;
  
  // 操作函数
  fetchRadarData: () => Promise<void>;
  startRadarPolling: () => void;
  stopRadarPolling: () => void;
  clearRadarData: () => void;
}

export const usePresenceStore = create<PresenceState>((set, get) => {
  let pollingInterval: ReturnType<typeof setInterval> | null = null;
  
  // 本地在线状态跟踪，避免重复调用markOnline
  const onlineCustomers = new Set<string>();

  // 触发历史消息拉取（已禁用，仅保留函数结构防回归）
  const triggerHistoryPull = async (customerId: string) => {
    if ((window as any).__DEV_DEBUG__) {
      console.warn('[RADAR_HISTORY_PULL_BLOCKED]', {customer_id: customerId});
    }
    return;
    try {
      if ((window as any).__DEV_DEBUG__) {
        console.debug('[HISTORY_AUTO_PULL_TRIGGERED] Triggering history pull for:', customerId);
      }
      await whatsAppInboxService.loadCustomerHistory(customerId);
      if ((window as any).__DEV_DEBUG__) {
        console.debug('[HISTORY_AUTO_PULL_COMPLETED] History pull completed for:', customerId);
      }
    } catch (error) {
      console.error('[HISTORY_AUTO_PULL_ERROR] Failed to pull history:', error);
    }
  };

  return {
    radarData: [],
    isLoading: false,
    error: null,
    lastFetchedAt: null,

    fetchRadarData: async () => {
      set({ isLoading: true, error: null });
      
      try {
        const response = await getPresenceRadar();
        
        // 只有当数据真正变化时才更新状态，避免无限循环
        const currentData = get().radarData;
        const dataChanged = JSON.stringify(response.radar) !== JSON.stringify(currentData);
        
        if (dataChanged) {
          set({
            radarData: response.radar,
            isLoading: false,
            lastFetchedAt: Date.now(),
          });
          if ((window as any).__DEV_DEBUG__) {
            console.debug('[RADAR_STORE_UPDATED]', response.radar.length);
          }
          
          // 当 Radar 收到新客户时，标记为在线
            const chatStore = useChatStore.getState();
            response.radar.forEach(radarItem => {
              // 统一客户 ID 格式
              const normalizedCustomerId = normalizeCustomerId(radarItem.customer_id);
              if ((window as any).__DEV_DEBUG__) {
                console.debug('[CANONICAL_APPLIED]', radarItem.customer_id, '→', normalizedCustomerId);
              }
              
              // 检查客户是否已经在线，避免重复调用markOnline
              const alreadyOnline = onlineCustomers.has(normalizedCustomerId);
              if ((window as any).__DEV_DEBUG__) {
                console.debug('[RADAR_ONLINE_CHECK]', normalizedCustomerId, 'alreadyOnline:', alreadyOnline);
              }
              
              // 只标记在线，不直接添加聊天
              if (chatStore.markOnline && !alreadyOnline) {
                chatStore.markOnline(normalizedCustomerId);
                onlineCustomers.add(normalizedCustomerId);
                if ((window as any).__DEV_DEBUG__) {
                  console.debug('[RADAR_TO_CHAT] Marked customer as online:', normalizedCustomerId);
                  
                  // 每20次调用打印一次调用栈（采样）
                  if (Math.random() < 0.05) {
                    console.debug('[RADAR_TO_CHAT_TRACE]');
                    console.trace();
                  }
                }
              }
              
              // 触发历史消息拉取
              triggerHistoryPull(normalizedCustomerId);
            });
        } else {
          set({ isLoading: false });
          if ((window as any).__DEV_DEBUG__) {
            console.debug('[RADAR_STORE_NO_CHANGE] Data unchanged, skipping update');
          }
        }
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : 'Failed to fetch radar data',
          isLoading: false,
        });
      }
    },

    startRadarPolling: () => {
      // 清除现有定时器
      if (pollingInterval) {
        clearInterval(pollingInterval);
        pollingInterval = null;
      }
      
      // 立即执行一次
      get().fetchRadarData();
      
      // 设置每 10 秒轮询一次
      pollingInterval = setInterval(() => {
        get().fetchRadarData();
      }, 10000);
      
      if ((window as any).__DEV_DEBUG__) {
        console.debug('[RADAR_POLLING_STARTED] Every 10 seconds');
      }
    },

    stopRadarPolling: () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
        pollingInterval = null;
        if ((window as any).__DEV_DEBUG__) {
          console.debug('[RADAR_POLLING_STOPPED]');
        }
      }
    },

    clearRadarData: () => {
      set({
        radarData: [],
        error: null,
        lastFetchedAt: null,
      });
    },
  };
});
