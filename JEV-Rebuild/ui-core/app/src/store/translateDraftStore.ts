// 翻译草稿存储
// 用于持久化每个客户的翻译草稿

// 翻译草稿类型
export interface TranslateDraft {
  draftSourceText: string;    // 中文草稿
  translatedText: string;     // 翻译结果
  targetLang: string;         // 目标语言
  updatedAt: number;          // 更新时间
}

// 翻译草稿存储类
export class TranslateDraftStore {
  private readonly STORAGE_KEY_PREFIX = 'chat:translate:draft:';
  
  // 获取特定客户的翻译草稿
  getDraft(customerId: string): TranslateDraft | null {
    try {
      const key = this.getStorageKey(customerId);
      const draftJson = localStorage.getItem(key);
      
      if (draftJson) {
        const draft = JSON.parse(draftJson) as TranslateDraft;
        return draft;
      }
      
      return null;
    } catch (error) {
      console.error('[TRANSLATE_DRAFT_ERROR] Failed to get draft:', error);
      return null;
    }
  }
  
  // 保存特定客户的翻译草稿
  saveDraft(customerId: string, draft: Partial<TranslateDraft>): void {
    try {
      const key = this.getStorageKey(customerId);
      const currentDraft = this.getDraft(customerId) || {
        draftSourceText: '',
        translatedText: '',
        targetLang: 'auto',
        updatedAt: Date.now()
      };
      
      const updatedDraft: TranslateDraft = {
        ...currentDraft,
        ...draft,
        updatedAt: Date.now()
      };
      
      localStorage.setItem(key, JSON.stringify(updatedDraft));
      
      // 触发自定义事件，通知相关组件草稿已更新
      this.emitDraftUpdated(customerId, updatedDraft);
    } catch (error) {
      console.error('[TRANSLATE_DRAFT_ERROR] Failed to save draft:', error);
    }
  }
  
  // 清除特定客户的翻译草稿
  clearDraft(customerId: string): void {
    try {
      const key = this.getStorageKey(customerId);
      localStorage.removeItem(key);
      
      // 触发自定义事件，通知相关组件草稿已清除
      this.emitDraftUpdated(customerId, null);
    } catch (error) {
      console.error('[TRANSLATE_DRAFT_ERROR] Failed to clear draft:', error);
    }
  }
  
  // 获取存储键
  private getStorageKey(customerId: string): string {
    return `${this.STORAGE_KEY_PREFIX}${customerId}`;
  }
  
  // 触发草稿更新事件
  private emitDraftUpdated(customerId: string, draft: TranslateDraft | null): void {
    const event = new CustomEvent('translateDraftUpdated', {
      detail: {
        customerId,
        draft
      }
    });
    
    window.dispatchEvent(event);
  }
  
  // 监听草稿更新事件
  onDraftUpdated(callback: (customerId: string, draft: TranslateDraft | null) => void): () => void {
    const handleEvent = (event: Event) => {
      const customEvent = event as CustomEvent<{ customerId: string; draft: TranslateDraft | null }>;
      callback(customEvent.detail.customerId, customEvent.detail.draft);
    };
    
    window.addEventListener('translateDraftUpdated', handleEvent);
    
    // 返回取消监听函数
    return () => {
      window.removeEventListener('translateDraftUpdated', handleEvent);
    };
  }
}

// 创建单例实例
export const translateDraftStore = new TranslateDraftStore();
