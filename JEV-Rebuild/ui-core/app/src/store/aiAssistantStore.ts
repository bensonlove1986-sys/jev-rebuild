import { create } from 'zustand';

// 定义ReplyDraft类型
interface ReplyDraft {
  draft_id: string;
  customer_id: string;
  based_on_message_id: string;
  reply_text_target_lang: string;
  reply_text_cn: string;
  tone: string;
  intent: string;
  required_fields: string[];
  confidence: number;
  status: 'generated' | 'approved' | 'sent' | 'discarded';
  created_at: number;
}

// 定义SessionState类型
interface SessionState {
  customer_id: string;
  last_seen_message_id: string;
  last_seen_message_ts: number;
  memory_summary: string;
  facts: {
    company: string;
    country: string;
    product_models: string[];
    quantity: number;
    delivery_time: string;
    payment_preference: string;
  };
  open_questions: string[];
  stage: string;
  language_pref: string;
  policy_flags: string[];
  ai_mode: "A" | "B" | "C";
  last_ai_reply_hash: string;
  processed_event_keys: string[];
}

interface AIAssistantState {
  // 显示状态
  isVisible: boolean;
  
  // 对话信息
  conversationId: string | null;
  
  // 生成AI回复
  isGenerating: boolean;
  
  // AI会话状态
  sessionState: SessionState | null;
  
  // AI回复草稿
  replyDraft: ReplyDraft | null;
  
  // 状态控制
  setIsVisible: (visible: boolean) => void;
  toggleVisibility: () => void;
  setConversationId: (id: string | null) => void;
  setSessionState: (sessionState: SessionState | null) => void;
  setReplyDraft: (draft: ReplyDraft | null) => void;
  clearState: () => void;
}

export const useAIAssistantStore = create<AIAssistantState>((set) => ({
  // 初始状态
  isVisible: false,
  conversationId: null,
  isGenerating: false,
  sessionState: null,
  replyDraft: null,
  
  // 状态更新函数
  setIsVisible: (visible) => set({ isVisible: visible }),
  
  toggleVisibility: () => set((state) => ({ isVisible: !state.isVisible })),
  
  setConversationId: (id) => set({ conversationId: id }),
  
  setSessionState: (sessionState) => set({ sessionState }),
  
  setReplyDraft: (draft) => set({ replyDraft: draft }),
  
  clearState: () => set({
    isVisible: false,
    conversationId: null,
    isGenerating: false,
    sessionState: null,
    replyDraft: null
  })
}));

export type { ReplyDraft, SessionState };

