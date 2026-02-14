// CONTACT_INDEX_KV.js - 联系人索引权威存储

import { normalizeCustomerId } from '../utils/customerId.js';
import { DATA_VERSION, withV } from '../utils/version.js';

/**
 * CONTACT_INDEX_KV - 联系人索引权威存储
 * 负责维护联系人的最新消息时间戳、预览和未读计数
 */
export class CONTACT_INDEX_KV {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.contacts = new Map(); // 内存缓存，customer_id -> contactInfo
  }

  /**
   * 从持久化存储加载联系人数据
   */
  async loadContacts() {
    try {
      const storedContacts = await this.state.storage.get('contacts');
      if (storedContacts) {
        const contactsData = JSON.parse(storedContacts);
        this.contacts = new Map(Object.entries(contactsData));
        console.log('[CONTACT_INDEX_LOAD] Loaded', this.contacts.size, 'contacts');
      }
    } catch (error) {
      console.error('[CONTACT_INDEX_LOAD_ERROR]', error.message);
    }
  }

  /**
   * 持久化联系人数据到存储
   */
  async saveContacts() {
    try {
      const contactsData = Object.fromEntries(this.contacts);
      await this.state.storage.put('contacts', JSON.stringify(contactsData));
      console.log('[CONTACT_INDEX_SAVE] Saved', this.contacts.size, 'contacts');
    } catch (error) {
      console.error('[CONTACT_INDEX_SAVE_ERROR]', error.message);
    }
  }

  /**
   * 更新联系人信息
   * @param {Object} updateData 更新数据
   * @returns {Object} 操作结果
   */
  async updateContact(updateData) {
    await this.loadContacts();

    const { customer_id, last_message_ts, last_preview, unread_count } = updateData;

    if (!customer_id) {
      console.error('[CONTACT_INDEX_UPDATE_ERROR] Missing customer_id');
      return {
        ok: false,
        error: 'MISSING_CUSTOMER_ID'
      };
    }

    const normalizedCustomerId = normalizeCustomerId(customer_id);
    const existingContact = this.contacts.get(normalizedCustomerId) || {};

    // 更新联系人信息
    const updatedContact = {
      customer_id: normalizedCustomerId,
      last_message_ts: last_message_ts || existingContact.last_message_ts || 0,
      last_preview: last_preview || existingContact.last_preview || '',
      unread_count: typeof unread_count === 'number' ? unread_count : existingContact.unread_count || 0,
      updated_at: Date.now(),
      created_at: existingContact.created_at || Date.now(),
      ...existingContact // 保留其他字段
    };

    this.contacts.set(normalizedCustomerId, updatedContact);
    await this.saveContacts();

    console.log('[CONTACT_INDEX_UPDATE_SUCCESS] Updated contact:', normalizedCustomerId);

    return {
      ok: true,
      customer_id: normalizedCustomerId,
      ...updatedContact
    };
  }

  /**
   * 获取联系人信息
   * @param {string} customerId 客户ID
   * @returns {Object} 联系人信息
   */
  async getContact(customerId) {
    await this.loadContacts();

    const normalizedCustomerId = normalizeCustomerId(customerId);
    const contact = this.contacts.get(normalizedCustomerId);

    console.log('[CONTACT_INDEX_GET] Retrieved contact:', normalizedCustomerId, contact ? 'found' : 'not found');

    return contact || null;
  }

  /**
   * 获取所有联系人
   * @returns {Array} 联系人列表
   */
  async getAllContacts() {
    await this.loadContacts();

    const contactsArray = Array.from(this.contacts.values())
      .sort((a, b) => b.last_message_ts - a.last_message_ts); // 按最后消息时间戳排序

    console.log('[CONTACT_INDEX_GET_ALL] Retrieved', contactsArray.length, 'contacts');

    return contactsArray;
  }

  /**
   * 重置未读计数
   * @param {string} customerId 客户ID
   * @returns {Object} 操作结果
   */
  async resetUnreadCount(customerId) {
    await this.loadContacts();

    const normalizedCustomerId = normalizeCustomerId(customerId);
    const existingContact = this.contacts.get(normalizedCustomerId);

    if (!existingContact) {
      console.error('[CONTACT_INDEX_RESET_UNREAD_ERROR] Contact not found:', normalizedCustomerId);
      return {
        ok: false,
        error: 'CONTACT_NOT_FOUND'
      };
    }

    existingContact.unread_count = 0;
    existingContact.updated_at = Date.now();

    this.contacts.set(normalizedCustomerId, existingContact);
    await this.saveContacts();

    console.log('[CONTACT_INDEX_RESET_UNREAD_SUCCESS] Reset unread count for:', normalizedCustomerId);

    return {
      ok: true,
      customer_id: normalizedCustomerId,
      unread_count: 0
    };
  }

  /**
   * 删除联系人
   * @param {string} customerId 客户ID
   * @returns {Object} 操作结果
   */
  async deleteContact(customerId) {
    await this.loadContacts();

    const normalizedCustomerId = normalizeCustomerId(customerId);
    const deleted = this.contacts.delete(normalizedCustomerId);

    if (deleted) {
      await this.saveContacts();
      console.log('[CONTACT_INDEX_DELETE_SUCCESS] Deleted contact:', normalizedCustomerId);
      return {
        ok: true,
        customer_id: normalizedCustomerId,
        deleted: true
      };
    } else {
      console.log('[CONTACT_INDEX_DELETE_ERROR] Contact not found:', normalizedCustomerId);
      return {
        ok: false,
        error: 'CONTACT_NOT_FOUND'
      };
    }
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

    console.log('[CONTACT_INDEX_FETCH] Received request:', { method, path });

    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Credentials': 'true'
    };

    if (method === 'OPTIONS') {
      return new Response(null, {
        status: 200,
        headers: corsHeaders
      });
    }

    // /update - 更新联系人
    if (method === 'POST' && path === '/update') {
      try {
        const updateData = await request.json();
        const result = await this.updateContact(updateData);

        return new Response(JSON.stringify(result), {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        });
      } catch (error) {
        console.error('[CONTACT_INDEX_UPDATE_ERROR]', error.message);
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

    // /contacts - 获取所有联系人
    if (method === 'GET' && path === '/contacts') {
      try {
        const contacts = await this.getAllContacts();

        return new Response(JSON.stringify({
          ok: true,
          contacts: contacts,
          total: contacts.length
        }), {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        });
      } catch (error) {
        console.error('[CONTACT_INDEX_GET_ALL_ERROR]', error.message);
        return new Response(JSON.stringify({
          ok: false,
          error: error.message,
          contacts: []
        }), {
          status: 500,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        });
      }
    }

    // /contact/:customerId - 获取单个联系人
    if (method === 'GET' && path.match(/^\/contact\//)) {
      try {
        const customerId = path.split('/')[2];
        const contact = await this.getContact(customerId);

        return new Response(JSON.stringify({
          ok: true,
          contact: contact
        }), {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        });
      } catch (error) {
        console.error('[CONTACT_INDEX_GET_ERROR]', error.message);
        return new Response(JSON.stringify({
          ok: false,
          error: error.message,
          contact: null
        }), {
          status: 500,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        });
      }
    }

    // /reset-unread - 重置未读计数
    if (method === 'POST' && path === '/reset-unread') {
      try {
        const data = await request.json();
        const customerId = data.customer_id;
        const result = await this.resetUnreadCount(customerId);

        return new Response(JSON.stringify(result), {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        });
      } catch (error) {
        console.error('[CONTACT_INDEX_RESET_UNREAD_ERROR]', error.message);
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

    // /delete - 删除联系人
    if (method === 'DELETE' && path === '/delete') {
      try {
        const data = await request.json();
        const customerId = data.customer_id;
        const result = await this.deleteContact(customerId);

        return new Response(JSON.stringify(result), {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        });
      } catch (error) {
        console.error('[CONTACT_INDEX_DELETE_ERROR]', error.message);
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
 * CONTACT_INDEX_KV 工厂函数
 * @param {Object} env 环境变量
 * @returns {Function} KV 构造函数
 */
export function createContactIndexKV(env) {
  return class extends CONTACT_INDEX_KV {
    constructor(state) {
      super(state, env);
    }
  };
}
