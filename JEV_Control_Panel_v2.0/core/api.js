/**
 * 模块名称：API（通信模块）
 * 功能：封装所有外部接口请求，统一处理错误和响应
 * 依赖模块：config.js, logger.js
 * 作者：JEV 系统
 */

import { CONFIG } from './config.js';
import logger from './logger.js';

class API {
    constructor() {
        this.apiBase = CONFIG.API_BASE;
        this.workerUrl = CONFIG.WORKER_URL;
        this.imageApi = CONFIG.IMAGE_API;
        this.agentId = null;
    }

    /**
     * 设置当前客服ID
     */
    setAgentId(agentId) {
        this.agentId = agentId;
    }

    /**
     * 通用请求方法
     * @param {string} endpoint - API端点
     * @param {Object} options - 请求选项
     * @param {boolean} useWorker - 是否使用Worker
     */
    async request(endpoint, options = {}, useWorker = false) {
        const url = useWorker ? 
            `${this.workerUrl}${endpoint}` : 
            `${this.apiBase}${endpoint}`;
        
        try {
            const defaultOptions = {
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                },
                ...options
            };

            // 添加API密钥认证（对于Worker请求）
            if (useWorker || endpoint.includes('/ai/') || endpoint.includes('/analyze-image-url') || endpoint.includes('/upload-to-r2')) {
                defaultOptions.headers['X-Auth-Key'] = CONFIG.API_KEY || 'JEV_2025_AI_SYS_A92jskL0xY';
            }

            logger.info(`发送请求: ${url}`, 'api');
            const response = await fetch(url, defaultOptions);

            if (!response.ok) {
                throw new Error(`HTTP错误! 状态码: ${response.status}`);
            }

            // 检查响应是否为空
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                const data = await response.json();
                logger.info(`请求成功: ${endpoint}`, 'api');
                return data;
            } else {
                const text = await response.text();
                logger.warning(`非JSON响应: ${text}`, 'api');
                return { success: true, message: text };
            }
        } catch (error) {
            logger.error(`请求失败: ${endpoint} - ${error.message}`, 'api');
            return { success: false, error: error.message };
        }
    }

    /**
     * GET请求
     */
    async get(endpoint, useWorker = false) {
        return this.request(endpoint, { method: 'GET' }, useWorker);
    }

    /**
     * POST请求
     */
    async post(endpoint, data = {}, useWorker = false) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(data)
        }, useWorker);
    }

    // === AI服务端接口 ===

    /**
     * 检查服务是否在线
     */
    async ping() {
        return this.get('/ping');
    }

    /**
     * 注册客服
     * @param {string} agentId - 客服ID
     * @param {string} mode - 模式：AI或Human
     */
    async registerAgent(agentId, mode = 'AI') {
        return this.post('/register_agent', { agent_id: agentId, mode });
    }

    /**
     * 获取所有客服状态
     */
    async getAgents() {
        return this.get('/get_agents');
    }

    /**
     * 设置客服模式
     * @param {string} agentId - 客服ID
     * @param {string} mode - 模式：AI或Human
     */
    async setMode(agentId, mode) {
        return this.post('/set_mode', { agent_id: agentId, mode });
    }

    /**
     * 发送回复
     * @param {Object} data - 回复数据
     */
    async reply(data) {
        return this.post('/reply', data);
    }

    /**
     * 发送心跳包
     * @param {string} agentId - 客服ID
     */
    async heartbeat(agentId) {
        return this.post('/heartbeat', { agent_id: agentId });
    }

    /**
     * 智能分配客服（预留接口）
     * @param {Object} data - 分配请求数据
     */
    async autoAssign(data) {
        return this.post('/auto_assign', data);
    }

    /**
     * 分析消息（预留接口）
     * @param {string} message - 待分析消息
     */
    async analyzeMessage(message) {
        return this.post('/analyze_message', { message });
    }

    // === Cloudflare Worker接口 ===

    /**
     * 上传图片到R2存储
     * @param {FormData} formData - 包含文件的FormData
     */
    async uploadToR2(formData) {
        const url = `${this.imageApi}/upload-to-r2`;
        
        try {
            logger.info(`上传图片到R2`, 'api');
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'X-Auth-Key': CONFIG.API_KEY || 'JEV_2025_AI_SYS_A92jskL0xY'
                },
                body: formData
            });

            if (!response.ok) {
                throw new Error(`上传失败! 状态码: ${response.status}`);
            }

            const data = await response.json();
            logger.success(`图片上传成功`, 'api');
            return data;
        } catch (error) {
            logger.error(`图片上传失败: ${error.message}`, 'api');
            return { success: false, error: error.message };
        }
    }

    /**
     * 分析图片URL（OCR识别）
     * @param {string} imageUrl - 图片URL
     */
    async analyzeImageUrl(imageUrl) {
        return this.post('/analyze-image-url', { image_url: imageUrl }, true);
    }

    /**
     * 批量设置所有客服模式
     * @param {string} mode - 目标模式
     */
    async setAllAgentsMode(mode) {
        try {
            const agents = await this.getAgents();
            if (!agents.success || !Array.isArray(agents.agents)) {
                throw new Error('获取客服列表失败');
            }

            const promises = agents.agents.map(agent => 
                this.setMode(agent.agent_id, mode)
            );

            await Promise.all(promises);
            return { success: true, message: `已将所有客服设置为${mode}模式` };
        } catch (error) {
            logger.error(`批量设置模式失败: ${error.message}`, 'api');
            return { success: false, error: error.message };
        }
    }

    /**
     * 从KV获取数据
     * @param {string} key - 键名
     * @returns {Promise<any>} 存储的值
     */
    async kvGet(key) {
        try {
            logger.info(`从KV获取数据: ${key}`, 'kv');
            const response = await fetch(`${CONFIG.WORKER_URL}/kv/get?key=${encodeURIComponent(key)}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`KV获取失败: ${response.status}`);
            }

            const data = await response.json();
            return data.value;
        } catch (error) {
            logger.error(`KV获取错误: ${error.message}`, 'kv');
            // 返回null而不是抛出错误，允许调用者处理
            return null;
        }
    }

    /**
     * 写入KV数据
     * @param {string} key - 键名
     * @param {any} value - 要存储的值
     * @returns {Promise<{ok: boolean, error?: string}>} 操作结果
     */
    async kvSet(key, value) {
        try {
            logger.info(`写入KV数据: ${key}`, 'kv');
            const response = await fetch(`${CONFIG.WORKER_URL}/kv/set`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ key, value })
            });

            if (!response.ok) {
                throw new Error(`KV写入失败: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            logger.error(`KV写入错误: ${error.message}`, 'kv');
            return { ok: false, error: error.message };
        }
    }

    /**
     * 删除KV数据
     * @param {string} key - 键名
     * @returns {Promise<{ok: boolean, error?: string}>} 操作结果
     */
    async kvDel(key) {
        try {
            logger.info(`删除KV数据: ${key}`, 'kv');
            const response = await fetch(`${CONFIG.WORKER_URL}/kv/del?key=${encodeURIComponent(key)}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`KV删除失败: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            logger.error(`KV删除错误: ${error.message}`, 'kv');
            return { ok: false, error: error.message };
        }
    }

    /**
     * 批量获取KV数据
     * @param {string[]} keys - 键名数组
     * @returns {Promise<Record<string, any>>} 键值对映射
     */
    async kvGetBatch(keys) {
        try {
            logger.info(`批量获取KV数据: ${keys.length}个键`, 'kv');
            const results = {};
            
            // 并发获取所有键
            const promises = keys.map(async (key) => {
                const value = await this.kvGet(key);
                results[key] = value;
            });
            
            await Promise.all(promises);
            return results;
        } catch (error) {
            logger.error(`KV批量获取错误: ${error.message}`, 'kv');
            return {};
        }
    }

    /**
     * 批量写入KV数据
     * @param {Record<string, any>} keyValuePairs - 键值对映射
     * @returns {Promise<{success: string[], failed: {key: string, error: string}[]}>} 操作结果
     */
    async kvSetBatch(keyValuePairs) {
        try {
            logger.info(`批量写入KV数据: ${Object.keys(keyValuePairs).length}个键值对`, 'kv');
            const success = [];
            const failed = [];
            
            // 并发写入所有键值对
            const promises = Object.entries(keyValuePairs).map(async ([key, value]) => {
                const result = await this.kvSet(key, value);
                if (result.ok) {
                    success.push(key);
                } else {
                    failed.push({ key, error: result.error || 'Unknown error' });
                }
            });
            
            await Promise.all(promises);
            return { success, failed };
        } catch (error) {
            logger.error(`KV批量写入错误: ${error.message}`, 'kv');
            return { success: [], failed: [] };
        }
    }
}

// 导出单例实例
const api = new API();
export default api;
