import { create } from 'zustand';

interface OutboundTranslateState {
  open: boolean;
  customer_id: string | null;
  draftText: string;
  sourceLang: string;
  translations: {
    en?: string;
    hi?: string;
    ar?: string;
    fr?: string;
    es?: string;
    ja?: string;
    ko?: string;
    ur?: string;
    tr?: string;
    de?: string;
  };
  selectedLang: string | null;
  loadingLangs: string[];
  updatedAt: number;
  
  // 客户语言偏好映射，记录每个客户上次选择的目标语言
  customerLangPreferences: Record<string, string>;
  
  // Actions
  openModal: (customer_id: string, draftText: string) => void;
  closeModal: () => void;
  setDraftText: (text: string) => void;
  setSourceLang: (lang: string) => void;
  setTranslation: (lang: string, text: string) => void;
  setSelectedLang: (lang: string | null) => void;
  setLoading: (lang: string, isLoading: boolean) => void;
  clearTranslations: () => void;
  clearAll: () => void;
  // 从localStorage加载
  loadFromStorage: (customer_id: string) => void;
  // 保存到localStorage
  saveToStorage: () => void;
}

// 支持的目标语言
const SUPPORTED_LANGUAGES = ['en', 'hi', 'ar', 'fr', 'es', 'ja', 'ko', 'ur', 'tr', 'de'] as const;

export const useOutboundTranslateStore = create<OutboundTranslateState>((set, get) => ({
  open: false,
  customer_id: null,
  draftText: '',
  sourceLang: 'zh',
  translations: {},
  selectedLang: null,
  loadingLangs: [],
  updatedAt: Date.now(),
  customerLangPreferences: {}, // 初始化客户语言偏好映射
  
  openModal: (customer_id, draftText) => {
    set(() => {
      // 先从localStorage加载草稿
      const storageKey = `outbound_draft:${customer_id}`;
      const storageData = localStorage.getItem(storageKey);
      let translations = {};
      let selectedLang = null;
      
      if (storageData) {
        try {
          const parsed = JSON.parse(storageData);
          if (parsed.translations) {
            translations = parsed.translations;
          }
          if (parsed.selectedLang) {
            selectedLang = parsed.selectedLang;
          }
        } catch (error) {
          console.error('Failed to parse translation draft from storage:', error);
        }
      }
      
      // 从客户语言偏好中加载上次选择的语言
      if (!selectedLang) {
        const langPreference = localStorage.getItem(`customer_lang_preference:${customer_id}`);
        if (langPreference) {
          selectedLang = langPreference;
        }
      }
      
      return {
        open: true,
        customer_id,
        draftText,
        translations,
        selectedLang,
        updatedAt: Date.now(),
      };
    });
  },
  
  closeModal: () => {
    set((state) => {
      // 关闭前保存到localStorage
      if (state.customer_id && state.draftText) {
        get().saveToStorage();
      }
      
      return {
        open: false,
        // 不要清空customer_id和draftText，保持状态
      };
    });
  },
  
  setDraftText: (text) => {
    set(() => ({
      draftText: text,
      updatedAt: Date.now(),
    }));
  },
  
  setSourceLang: (lang) => {
    set(() => ({
      sourceLang: lang,
      updatedAt: Date.now(),
    }));
  },
  
  setTranslation: (lang, text) => {
    set((state) => ({
      translations: {
        ...state.translations,
        [lang]: text,
      },
      updatedAt: Date.now(),
    }));
  },
  
  setSelectedLang: (lang) => {
    set(() => ({
      selectedLang: lang,
      updatedAt: Date.now(),
    }));
  },
  
  setLoading: (lang, isLoading) => {
    set((state) => {
      const loadingLangs = [...state.loadingLangs];
      
      if (isLoading && !loadingLangs.includes(lang)) {
        loadingLangs.push(lang);
      } else if (!isLoading) {
        const index = loadingLangs.indexOf(lang);
        if (index > -1) {
          loadingLangs.splice(index, 1);
        }
      }
      
      return {
        loadingLangs,
      };
    });
  },
  
  clearTranslations: () => {
    set(() => ({
      translations: {},
      selectedLang: null,
      loadingLangs: [],
      updatedAt: Date.now(),
    }));
  },
  
  clearAll: () => {
    set(() => ({
      open: false,
      customer_id: null,
      draftText: '',
      translations: {},
      selectedLang: null,
      loadingLangs: [],
      updatedAt: Date.now(),
    }));
  },
  
  loadFromStorage: (customer_id) => {
    const storageKey = `outbound_draft:${customer_id}`;
    const storageData = localStorage.getItem(storageKey);
    
    if (storageData) {
      try {
        const parsed = JSON.parse(storageData);
        set(() => ({
          customer_id,
          draftText: parsed.draftText || '',
          translations: parsed.translations || {},
          selectedLang: parsed.selectedLang || null,
          updatedAt: parsed.updatedAt || Date.now(),
        }));
      } catch (error) {
        console.error('Failed to load translation draft from storage:', error);
      }
    }
  },
  
  saveToStorage: () => {
    const { customer_id, draftText, translations, selectedLang, updatedAt } = get();
    
    if (customer_id) {
      // 保存翻译草稿
      const storageKey = `outbound_draft:${customer_id}`;
      const storageData = {
        draftText,
        translations,
        selectedLang,
        updatedAt,
      };
      
      try {
        localStorage.setItem(storageKey, JSON.stringify(storageData));
        
        // 保存客户语言偏好
        if (selectedLang) {
          localStorage.setItem(`customer_lang_preference:${customer_id}`, selectedLang);
        }
      } catch (error) {
        console.error('Failed to save translation data to storage:', error);
      }
    }
  },
}));

export { SUPPORTED_LANGUAGES };
