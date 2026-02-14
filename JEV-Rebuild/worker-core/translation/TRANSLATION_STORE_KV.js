// TRANSLATION_STORE_KV.js - 翻译结果权威存储

import { DATA_VERSION, withV } from '../utils/version.js';

/**
 * TRANSLATION_STORE_KV - 翻译结果权威存储
 * 负责管理翻译结果的存储和查询，确保翻译状态的一致性
 */
export class TRANSLATION_STORE_KV {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.translations = new Map(); // 内存缓存，translationKey -> translationData
  }

  /**
   * 生成翻译存储键
   * @param {string} messageId 消息 ID
   * @param {string} targetLang 目标语言
   * @returns {string} 翻译存储键
   */
  generateTranslationKey(messageId, targetLang) {
    return withV(`tr:${messageId}:${targetLang.toLowerCase()}`);
  }

  /**
   * 从持久化存储加载翻译数据
   */
  async loadTranslations() {
    try {
      const storedTranslations = await this.state.storage.get('translations');
      if (storedTranslations) {
        const translationsData = JSON.parse(storedTranslations);
        this.translations = new Map(Object.entries(translationsData));
        console.log('[TRANSLATION_STORE_LOAD] Loaded', this.translations.size, 'translations');
      }
    } catch (error) {
      console.error('[TRANSLATION_STORE_LOAD_ERROR]', error.message);
    }
  }

  /**
   * 持久化翻译数据到存储
   */
  async saveTranslations() {
    try {
      const translationsData = Object.fromEntries(this.translations);
      await this.state.storage.put('translations', JSON.stringify(translationsData));
      console.log('[TRANSLATION_STORE_SAVE] Saved', this.translations.size, 'translations');
    } catch (error) {
      console.error('[TRANSLATION_STORE_SAVE_ERROR]', error.message);
    }
  }

  /**
   * 存储翻译结果
   * @param {string} messageId 消息 ID
   * @param {string} targetLang 目标语言
   * @param {Object} translationData 翻译数据
   * @returns {Object} 操作结果
   */
  async storeTranslation(messageId, targetLang, translationData) {
    await this.loadTranslations();

    if (!messageId || !targetLang) {
      console.error('[TRANSLATION_STORE_ERROR] Missing required parameters');
      return {
        ok: false,
        error: 'MISSING_REQUIRED_PARAMS'
      };
    }

    const translationKey = this.generateTranslationKey(messageId, targetLang);
    const normalizedTranslation = this.normalizeTranslationData(translationData);

    // 存储翻译结果
    this.translations.set(translationKey, normalizedTranslation);
    await this.saveTranslations();

    console.log('[TRANSLATION_STORE_SUCCESS] Stored translation:', translationKey);

    return {
      ok: true,
      translation_key: translationKey,
      ...normalizedTranslation
    };
  }

  /**
   * 获取翻译结果
   * @param {string} messageId 消息 ID
   * @param {string} targetLang 目标语言
   * @returns {Object} 翻译结果
   */
  async getTranslation(messageId, targetLang) {
    await this.loadTranslations();

    if (!messageId || !targetLang) {
      console.error('[TRANSLATION_STORE_ERROR] Missing required parameters');
      return null;
    }

    const translationKey = this.generateTranslationKey(messageId, targetLang);
    const translation = this.translations.get(translationKey);

    console.log('[TRANSLATION_STORE_GET] Retrieved translation:', translationKey, translation ? 'found' : 'not found');

    return translation || null;
  }

  /**
   * 获取消息的所有翻译
   * @param {string} messageId 消息 ID
   * @returns {Array} 翻译列表
   */
  async getTranslationsByMessageId(messageId) {
    await this.loadTranslations();

    if (!messageId) {
      console.error('[TRANSLATION_STORE_ERROR] Missing messageId');
      return [];
    }

    const messageTranslations = Array.from(this.translations.entries())
      .filter(([key]) => key.startsWith(`${DATA_VERSION}:tr:${messageId}:`))
      .map(([key, value]) => ({
        translation_key: key,
        ...value
      }));

    console.log('[TRANSLATION_STORE_GET_BY_MESSAGE] Retrieved', messageTranslations.length, 'translations for message:', messageId);

    return messageTranslations;
  }

  /**
   * 删除翻译结果
   * @param {string} messageId 消息 ID
   * @param {string} targetLang 目标语言
   * @returns {Object} 操作结果
   */
  async deleteTranslation(messageId, targetLang) {
    await this.loadTranslations();

    if (!messageId || !targetLang) {
      console.error('[TRANSLATION_STORE_ERROR] Missing required parameters');
      return {
        ok: false,
        error: 'MISSING_REQUIRED_PARAMS'
      };
    }

    const translationKey = this.generateTranslationKey(messageId, targetLang);
    const deleted = this.translations.delete(translationKey);

    if (deleted) {
      await this.saveTranslations();
      console.log('[TRANSLATION_STORE_DELETE_SUCCESS] Deleted translation:', translationKey);
      return {
        ok: true,
        translation_key: translationKey,
        deleted: true
      };
    } else {
      console.log('[TRANSLATION_STORE_DELETE_ERROR] Translation not found:', translationKey);
      return {
        ok: false,
        error: 'TRANSLATION_NOT_FOUND'
      };
    }
  }

  /**
   * 批量删除消息的所有翻译
   * @param {string} messageId 消息 ID
   * @returns {Object} 操作结果
   */
  async deleteTranslationsByMessageId(messageId) {
    await this.loadTranslations();

    if (!messageId) {
      console.error('[TRANSLATION_STORE_ERROR] Missing messageId');
      return {
        ok: false,
        error: 'MISSING_MESSAGE_ID'
      };
    }

    const messageTranslationKeys = Array.from(this.translations.keys())
      .filter(key => key.startsWith(`${DATA_VERSION}:tr:${messageId}:`));

    messageTranslationKeys.forEach(key => this.translations.delete(key));
    
    if (messageTranslationKeys.length > 0) {
      await this.saveTranslations();
    }

    console.log('[TRANSLATION_STORE_DELETE_BY_MESSAGE] Deleted', messageTranslationKeys.length, 'translations for message:', messageId);

    return {
      ok: true,
      message_id: messageId,
      deleted_count: messageTranslationKeys.length
    };
  }

  /**
   * 标准化翻译数据
   * @param {Object} translationData 原始翻译数据
   * @returns {Object} 标准化后的翻译数据
   */
  normalizeTranslationData(translationData) {
    return {
      translated_text: translationData.translated_text || translationData.text || '',
      original_text: translationData.original_text || '',
      source_lang: translationData.source_lang || 'auto',
      target_lang: translationData.target_lang || '',
      status: translationData.status || 'completed',
      error: translationData.error || null,
      timestamp: translationData.timestamp || Date.now(),
      updated_at: Date.now(),
      ...translationData // 保留其他字段
    };
  }

  /**
   * HTTP 请求处理
   * @param {Request} request HTTP 请求
   * @returns {Response} HTTP 响应
   */
  async fetch(request) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    console.log('[TRANSLATION_STORE_FETCH] Received request:', { method, path });

    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': '*',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Credentials': 'true'
    };

    if (method === 'OPTIONS') {
      return new Response(null, {
        status: 200,
        headers: corsHeaders
      });
    }

    // /store - 存储翻译结果
    if (method === 'POST' && path === '/store') {
      try {
        const data = await request.json();
        const { message_id, target_lang, ...translationData } = data;

        if (!message_id || !target_lang) {
          return new Response(JSON.stringify({
            ok: false,
            error: 'MISSING_REQUIRED_PARAMS'
          }), {
            status: 400,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json'
            }
          });
        }

        const result = await this.storeTranslation(message_id, target_lang, translationData);

        return new Response(JSON.stringify(result), {
          status: result.ok ? 200 : 500,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        });
      } catch (error) {
        console.error('[TRANSLATION_STORE_STORE_ERROR]', error.message);
        return new Response(JSON.stringify({
          ok: false,
          error: error.message
        }), {
          status: 500,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        });
      }
    }

    // /get - 获取翻译结果
    if (method === 'GET' && path === '/get') {
      try {
        const messageId = url.searchParams.get('message_id');
        const targetLang = url.searchParams.get('target_lang');

        if (!messageId || !targetLang) {
          return new Response(JSON.stringify({
            ok: false,
            error: 'MISSING_REQUIRED_PARAMS'
          }), {
            status: 400,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json'
            }
          });
        }

        const translation = await this.getTranslation(messageId, targetLang);

        return new Response(JSON.stringify({
          ok: true,
          translation: translation
        }), {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        });
      } catch (error) {
        console.error('[TRANSLATION_STORE_GET_ERROR]', error.message);
        return new Response(JSON.stringify({
          ok: false,
          error: error.message,
          translation: null
        }), {
          status: 500,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        });
      }
    }

    // /message/:messageId - 获取消息的所有翻译
    if (method === 'GET' && path.match(/^\/message\//)) {
      try {
        const messageId = path.split('/')[2];
        const translations = await this.getTranslationsByMessageId(messageId);

        return new Response(JSON.stringify({
          ok: true,
          translations: translations,
          total: translations.length
        }), {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        });
      } catch (error) {
        console.error('[TRANSLATION_STORE_GET_BY_MESSAGE_ERROR]', error.message);
        return new Response(JSON.stringify({
          ok: false,
          error: error.message,
          translations: []
        }), {
          status: 500,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        });
      }
    }

    // /delete - 删除翻译结果
    if (method === 'DELETE' && path === '/delete') {
      try {
        const data = await request.json();
        const { message_id, target_lang } = data;

        if (!message_id || !target_lang) {
          return new Response(JSON.stringify({
            ok: false,
            error: 'MISSING_REQUIRED_PARAMS'
          }), {
            status: 400,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json'
            }
          });
        }

        const result = await this.deleteTranslation(message_id, target_lang);

        return new Response(JSON.stringify(result), {
          status: result.ok ? 200 : 500,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        });
      } catch (error) {
        console.error('[TRANSLATION_STORE_DELETE_ERROR]', error.message);
        return new Response(JSON.stringify({
          ok: false,
          error: error.message
        }), {
          status: 500,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        });
      }
    }

    // /delete-message/:messageId - 删除消息的所有翻译
    if (method === 'DELETE' && path.match(/^\/delete-message\//)) {
      try {
        const messageId = path.split('/')[2];
        const result = await this.deleteTranslationsByMessageId(messageId);

        return new Response(JSON.stringify(result), {
          status: result.ok ? 200 : 500,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        });
      } catch (error) {
        console.error('[TRANSLATION_STORE_DELETE_BY_MESSAGE_ERROR]', error.message);
        return new Response(JSON.stringify({
          ok: false,
          error: error.message
        }), {
          status: 500,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        });
      }
    }

    // 404
    return new Response('Not Found', {
      status: 404,
      headers: corsHeaders
    });
  }
}

/**
 * TRANSLATION_STORE_KV 工厂函数
 * @param {Object} env 环境变量
 * @returns {Function} KV 构造函数
 */
export function createTranslationStoreKV(env) {
  return class extends TRANSLATION_STORE_KV {
    constructor(state) {
      super(state, env);
    }
  };
}
