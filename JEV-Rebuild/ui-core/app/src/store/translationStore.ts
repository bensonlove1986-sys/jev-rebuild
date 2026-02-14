import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface TranslationState {
  open: boolean;
  message_id: string | null;
  customer_id: string | null;
  sourceText: string;
  sourceLang: string;
  translations: {
    zh?: string;
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
  loading: boolean;
  updatedAt: number;
}

interface TranslationActions {
  openModal: (params: {
    message_id: string;
    customer_id: string;
    sourceText: string;
    sourceLang: string;
  }) => void;
  closeModal: () => void;
  setTranslation: (lang: string, text: string) => void;
  setLoading: (loading: boolean) => void;
  reset: () => void;
}

type TranslationStore = TranslationState & TranslationActions;

const initialState: TranslationState = {
  open: false,
  message_id: null,
  customer_id: null,
  sourceText: '',
  sourceLang: '',
  translations: {},
  loading: false,
  updatedAt: Date.now()
};

// 使用localStorage持久化存储
const storage = createJSONStorage(() => localStorage, {
  name: 'translation-store'
});

export const useTranslationStore = create<TranslationStore>()(
  persist(
    (set) => ({
      ...initialState,
      
      openModal: (params) => set({
        open: true,
        message_id: params.message_id,
        customer_id: params.customer_id,
        sourceText: params.sourceText,
        sourceLang: params.sourceLang,
        loading: false,
        updatedAt: Date.now()
      }),
      
      closeModal: () => set(() => ({
        open: false,
        updatedAt: Date.now()
      })),
      
      setTranslation: (lang, text) => set((state) => ({
        translations: {
          ...state.translations,
          [lang]: text
        },
        updatedAt: Date.now()
      })),
      
      setLoading: (loading) => set({
        loading
      }),
      
      reset: () => set({
        ...initialState,
        updatedAt: Date.now()
      })
    }),
    {
      name: 'translation-storage',
      storage,
      // 仅在弹窗打开时恢复数据
      partialize: (state) => ({
        message_id: state.message_id,
        customer_id: state.customer_id,
        sourceText: state.sourceText,
        sourceLang: state.sourceLang,
        translations: state.translations,
        updatedAt: state.updatedAt
      })
    }
  )
);
