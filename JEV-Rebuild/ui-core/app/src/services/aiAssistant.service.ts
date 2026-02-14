import { fetchApi } from '../api/apiClient';
import type { Message } from '../api/inbox.api';
import type { ReplyDraft, SessionState } from '../store/aiAssistantStore';
import { dispatch } from '../core/scheduler/system_scheduler';

// 使用回复建议
export function useReplySuggestion(suggestion: string): (inputElement: HTMLTextAreaElement) => void {
  return (inputElement: HTMLTextAreaElement) => {
    inputElement.value = suggestion;
    // 触发输入事件，确保状态更新
    inputElement.dispatchEvent(new Event('input', { bubbles: true }));
    // 聚焦到输入框末尾
    inputElement.focus();
    inputElement.setSelectionRange(suggestion.length, suggestion.length);
  };
}

// 获取AI会话状态
export async function getAISessionState(
  customerId: string,
  controller?: AbortController
): Promise<SessionState> {
  try {
    console.log('[AI_GET_SESSION_STATE_START]', customerId);
    
    // 调用AI获取会话状态API
    const response = await fetchApi<{ ok: boolean; session: SessionState | null }>(`/api/ai/session?customer_id=${customerId}`, {
      method: 'GET'
    }, controller);
    
    console.log('[AI_GET_SESSION_STATE_SUCCESS]', response);
    
    // Dispatch-First: 先通过 system_scheduler 处理 AI 结果
    console.log(
      "[AI_RESULT_CALLER_TRACE]",
      new Error().stack
    )
    dispatch({
      type: "AI_RESULT_RECEIVED",
      payload: {
        type: 'session_state',
        customer_id: customerId,
        result: response.session
      }
    });
    
    return response.session;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.log('[AI_GET_SESSION_STATE_ABORTED]', customerId);
      throw error;
    }
    console.error('[AI_GET_SESSION_STATE_ERROR]', error);
    throw error;
  }
}

// 更新AI会话状态
export async function updateAISessionState(
  customerId: string,
  messages: Message[],
  aiMode?: "A" | "B" | "C",
  controller?: AbortController
): Promise<SessionState> {
  try {
    console.log('[AI_UPDATE_SESSION_STATE_START]', customerId, messages.length);
    
    // 调用AI更新会话状态API
    const response = await fetchApi<{ sessionState: SessionState }>('/api/ai/session/update', {
      method: 'POST',
      body: JSON.stringify({
        customer_id: customerId,
        messages: messages.map(msg => ({
          id: msg.id,
          text: msg.text,
          direction: msg.direction,
          timestamp: msg.timestamp
        })),
        ai_mode: aiMode
      })
    }, controller);
    
    console.log('[AI_UPDATE_SESSION_STATE_SUCCESS]', response);
    
    // Dispatch-First: 先通过 system_scheduler 处理 AI 结果
    console.log(
      "[AI_RESULT_CALLER_TRACE]",
      new Error().stack
    )
    dispatch({
      type: "AI_RESULT_RECEIVED",
      payload: {
        type: 'session_state_update',
        customer_id: customerId,
        result: response.sessionState
      }
    });
    
    return response.sessionState;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.log('[AI_UPDATE_SESSION_STATE_ABORTED]', customerId);
      throw error;
    }
    console.error('[AI_UPDATE_SESSION_STATE_ERROR]', error);
    throw error;
  }
}

// 生成AI回复草稿
export async function generateAIReplyDraft(
  customerId: string,
  basedOnMessageId: string,
  text: string,
  mode?: string,
  toneOverride?: string,
  controller?: AbortController
): Promise<ReplyDraft> {
  try {
    console.log('[AI_GENERATE_REPLY_DRAFT_START]', customerId, basedOnMessageId, mode, toneOverride);
    
    // 系统只允许 AutoDraftEngine 触发 AI Draft
    // 此处不再调用 /api/ai/draft
    console.log('[AI_GENERATE_REPLY_DRAFT_BLOCKED] System only allows AutoDraftEngine to trigger AI Draft');
    
    // 返回空草稿
    const draft: ReplyDraft = {
      reply_to_customer_en: '',
      reply_to_customer_zh: '',
      // 其他必要字段，根据实际情况填写
      id: `draft_${Date.now()}`,
      customer_id: customerId,
      based_on_message_id: basedOnMessageId,
      status: 'blocked',
      created_at: Date.now(),
      updated_at: Date.now(),
      language: 'en',
      confidence: 0,
      intent: 'QUOTE_DRAFT',
      risk_level: 'low',
      auto_send_score: 0
    };
    
    // Dispatch-First: 先通过 system_scheduler 处理 AI 结果
    console.log(
      "[AI_RESULT_CALLER_TRACE]",
      new Error().stack
    )
    dispatch({
      type: "AI_RESULT_RECEIVED",
      payload: {
        type: 'reply_draft',
        customer_id: customerId,
        message_id: basedOnMessageId,
        result: draft
      }
    });
    
    return draft;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.log('[AI_GENERATE_REPLY_DRAFT_ABORTED]', customerId, basedOnMessageId);
      throw error;
    }
    console.error('[AI_GENERATE_REPLY_DRAFT_ERROR]', error);
    throw error;
  }
}

// 润色AI回复
export async function improveAIReply(
  customerId: string,
  replyText: string,
  controller?: AbortController
): Promise<string> {
  try {
    console.log('[AI_IMPROVE_REPLY_START]', customerId);
    
    // 调用AI润色回复API
    const response = await fetchApi<{ improved_text: string }>('/api/ai/reply/improve', {
      method: 'POST',
      body: JSON.stringify({
        customer_id: customerId,
        reply_text: replyText
      })
    }, controller);
    
    console.log('[AI_IMPROVE_REPLY_SUCCESS]', response);
    
    // Dispatch-First: 先通过 system_scheduler 处理 AI 结果
    console.log(
      "[AI_RESULT_CALLER_TRACE]",
      new Error().stack
    )
    dispatch({
      type: "AI_RESULT_RECEIVED",
      payload: {
        type: 'improved_reply',
        customer_id: customerId,
        result: response.improved_text
      }
    });
    
    return response.improved_text;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.log('[AI_IMPROVE_REPLY_ABORTED]', customerId);
      throw error;
    }
    console.error('[AI_IMPROVE_REPLY_ERROR]', error);
    throw error;
  }
}

// 切换回复语气
export async function changeReplyTone(
  customerId: string,
  replyText: string,
  tone: string,
  controller?: AbortController
): Promise<string> {
  try {
    console.log('[AI_CHANGE_REPLY_TONE_START]', customerId, tone);
    
    // 调用AI切换回复语气API
    const response = await fetchApi<{ changed_text: string }>('/api/ai/reply/change-tone', {
      method: 'POST',
      body: JSON.stringify({
        customer_id: customerId,
        reply_text: replyText,
        tone
      })
    }, controller);
    
    console.log('[AI_CHANGE_REPLY_TONE_SUCCESS]', response);
    
    // Dispatch-First: 先通过 system_scheduler 处理 AI 结果
    console.log(
      "[AI_RESULT_CALLER_TRACE]",
      new Error().stack
    )
    dispatch({
      type: "AI_RESULT_RECEIVED",
      payload: {
        type: 'changed_tone',
        customer_id: customerId,
        result: response.changed_text
      }
    });
    
    return response.changed_text;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.log('[AI_CHANGE_REPLY_TONE_ABORTED]', customerId, tone);
      throw error;
    }
    console.error('[AI_CHANGE_REPLY_TONE_ERROR]', error);
    throw error;
  }
}

// 更新草稿状态
export async function updateDraftStatus(
  customerId: string,
  draftId: string,
  status: 'generated' | 'approved' | 'sent' | 'discarded',
  controller?: AbortController
): Promise<ReplyDraft> {
  try {
    console.log('[AI_UPDATE_DRAFT_STATUS_START]', customerId, draftId, status);
    
    // 调用更新草稿状态API
    const response = await fetchApi<{ draft: ReplyDraft }>('/api/ai/draft/update-status', {
      method: 'POST',
      body: JSON.stringify({
        draft_id: draftId,
        status
      })
    }, controller);
    
    console.log('[AI_UPDATE_DRAFT_STATUS_SUCCESS]', response);
    
    // Dispatch-First: 先通过 system_scheduler 处理 AI 结果
    console.log(
      "[AI_RESULT_CALLER_TRACE]",
      new Error().stack
    )
    dispatch({
      type: "AI_RESULT_RECEIVED",
      payload: {
        type: 'draft_status_update',
        customer_id: customerId,
        result: response.draft
      }
    });
    
    return response.draft;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.log('[AI_UPDATE_DRAFT_STATUS_ABORTED]', customerId, draftId, status);
      throw error;
    }
    console.error('[AI_UPDATE_DRAFT_STATUS_ERROR]', error);
    throw error;
  }
}