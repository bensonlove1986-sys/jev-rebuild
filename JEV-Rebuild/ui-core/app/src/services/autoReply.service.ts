// 自动回复服务
// 基于DeepSeek API生成拟人化回复建议

import { translateText } from './translate.service';
import { safeFetch } from '@/main';

// 自动回复场景类型 - 按照需求更新为指定的场景
export type AutoReplyScene = '首次联系' | '询价' | '技术确认' | '交期/物流' | '样品请求' | '跟进' | '售后' | '未明确';

// 自动回复请求参数
export interface GenerateAutoReplyParams {
  originalMessage: string;
  translatedZh?: string;
  targetLanguage: string;
  scene?: AutoReplyScene;
  customerId?: string; // 添加客户ID参数
}

// 自动回复响应结果
export interface AutoReplyResult {
  replyZh: string;
  replyTranslated: string;
}

// 场景映射到中文描述（因为类型已经是中文，所以直接返回自身）
const sceneToChinese: Record<AutoReplyScene, string> = {
  '首次联系': '首次联系',
  '询价': '询价',
  '技术确认': '技术确认',
  '交期/物流': '交期/物流',
  '样品请求': '样品请求',
  '跟进': '跟进',
  '售后': '售后',
  '未明确': '未明确'
};

// 场景推荐请求参数
export interface RecommendSceneParams {
  conversationHistory: string[]; // 最近200条有效聊天消息
}

// 场景推荐响应结果
export interface RecommendSceneResult {
  scene: AutoReplyScene;
}

// 推荐场景 - 调用DeepSeek API获取推荐场景
export async function recommendScene(params: RecommendSceneParams): Promise<RecommendSceneResult> {
  try {
    // 参数验证
    if (!params.conversationHistory || params.conversationHistory.length === 0) {
      console.log('[SCENE_RECOMMENDATION] No conversation history provided, returning default scene');
      return { scene: '未明确' };
    }
    
    // 准备调用DeepSeek API
    const requestData = {
      conversation_history: params.conversationHistory,
      requirement: '仅返回一个scene字段，值为：首次联系、询价、技术确认、交期/物流、样品请求、跟进、售后、未明确之一，不生成其他内容'
    };
    
    console.log('[SCENE_RECOMMENDATION_REQUEST]', { conversationHistoryLength: params.conversationHistory.length });
    
    // 调用场景推荐API
    const response = await safeFetch('/api/ai/recommend-scene', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData)
    });
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      console.error('[SCENE_RECOMMENDATION_API_ERROR]', { status: response.status, statusText: response.statusText, errorText });
      throw new Error(`Failed to call scene recommendation API: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    console.log('[SCENE_RECOMMENDATION_RESPONSE]', { recommendedScene: data.scene });
    
    // 验证返回的场景是否在允许的列表中
    const validScenes: AutoReplyScene[] = ['首次联系', '询价', '技术确认', '交期/物流', '样品请求', '跟进', '售后', '未明确'];
    const recommendedScene = data.scene as AutoReplyScene;
    
    if (validScenes.includes(recommendedScene)) {
      return { scene: recommendedScene };
    } else {
      console.warn('[SCENE_RECOMMENDATION_INVALID_SCENE]', { recommendedScene, validScenes });
      return { scene: '未明确' };
    }
  } catch (error) {
    console.error('[SCENE_RECOMMENDATION_ERROR]', { 
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    
    // 兜底返回未明确
    return { scene: '未明确' };
  }
}

// 生成自动回复 - 调用DeepSeek独立路由
export async function generateAutoReply(params: GenerateAutoReplyParams): Promise<AutoReplyResult> {
  // 禁止任何兜底逻辑，必须返回真实DeepSeek结果
  if (!params.originalMessage || !params.targetLanguage) {
    const error = new Error('Missing required parameters: originalMessage and targetLanguage are required');
    console.error('[GENERATE_AUTOREPLY_PARAM_ERROR]', { 
      error: error.message,
      params: params
    });
    throw error;
  }
  
  // 准备调用DeepSeek API
  const requestData = {
    customer_id: params.customerId || 'unknown', // 使用真实客户ID
    scenario: sceneToChinese[params.scene || '未明确'],
    language: params.targetLanguage,
    last_message: params.originalMessage
  };
  
  console.log('[DEEPSEEK_REQUEST]', {
    url: '/api/ai/autoreply',
    params: {
      scene: params.scene,
      targetLanguage: params.targetLanguage,
      customerId: params.customerId,
      originalMessageLength: params.originalMessage.length
    }
  });
  
  try {
    // 调用DeepSeek独立路由
    const response = await safeFetch('/api/ai/autoreply', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData)
    });
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      const error = new Error(`Failed to call DeepSeek API: ${response.statusText}`);
      console.error('[DEEPSEEK_API_ERROR]', { 
        error: error.message,
        status: response.status,
        statusText: response.statusText,
        errorText
      });
      throw error;
    }
    
    const data = await response.json();
    
    console.log('[DEEPSEEK_RESPONSE]', {
      replyZh: data.replyZh?.length ? `${data.replyZh.slice(0, 50)}...` : 'empty',
      replyTranslated: data.replyTranslated?.length ? `${data.replyTranslated.slice(0, 50)}...` : 'empty'
    });
    
    // 验证返回结果
    if (!data.replyZh || !data.replyTranslated) {
      const error = new Error('DeepSeek API returned invalid response');
      console.error('[DEEPSEEK_RESPONSE_INVALID]', { 
        error: error.message,
        data: data
      });
      throw error;
    }
    
    return {
      replyZh: data.replyZh,
      replyTranslated: data.replyTranslated
    };
  } catch (error) {
    console.error('[GENERATE_AUTOREPLY_ERROR]', { 
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      params: params
    });
    throw error;
  }
}
