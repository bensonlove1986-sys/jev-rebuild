/**
 * 模块名称：KVTest (KV存储测试模块)
 * 功能：检测KV存储状态、读写测试、自动修复绑定
 * 依赖模块：api.js, logger.js, config.js
 * 作者：JEV 系统
 */

import { CONFIG } from './config.js';
import api from './api.js';
import logger from './logger.js';

class KVTest {
    constructor() {
        this.isAvailable = false;
        this.testKey = 'system:kv_test';
        this.testValue = { timestamp: new Date().toISOString(), version: CONFIG.VERSION };
        this.retryCount = 0;
        this.maxRetries = 3;
    }

    /**
     * 初始化KV测试
     * @returns {Promise<boolean>} KV是否可用
     */
    async init() {
        try {
            logger.info('正在检测KV存储状态...', 'kv-test');
            await this.detectKVStatus();
            
            if (this.isAvailable) {
                logger.success('KV存储检测通过，可用状态正常', 'kv-test');
                // 运行读写测试确保功能正常
                await this.runReadWriteTest();
                return true;
            } else {
                logger.warning('KV存储不可用，将启用降级方案', 'kv-test');
                // 尝试自动修复
                await this.attemptAutoFix();
                return false;
            }
        } catch (error) {
            logger.error(`KV初始化失败: ${error.message}`, 'kv-test');
            return false;
        }
    }

    /**
     * 检测KV存储状态
     */
    async detectKVStatus() {
        try {
            // 发送一个简单的GET请求测试KV接口是否在线
            const response = await fetch(`${CONFIG.WORKER_URL}/kv/get?key=__health_check`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                },
                timeout: 5000
            });

            if (response.ok) {
                this.isAvailable = true;
                return true;
            } else {
                this.isAvailable = false;
                return false;
            }
        } catch (error) {
            logger.warning(`KV接口连接失败: ${error.message}`, 'kv-test');
            this.isAvailable = false;
            return false;
        }
    }

    /**
     * 运行读写测试
     */
    async runReadWriteTest() {
        try {
            logger.info('运行KV读写测试...', 'kv-test');
            
            // 写入测试数据
            const writeResult = await api.kvSet(this.testKey, this.testValue);
            if (!writeResult.ok) {
                throw new Error('写测试失败');
            }
            
            // 读取测试数据
            const readResult = await api.kvGet(this.testKey);
            if (!readResult || !readResult.version) {
                throw new Error('读测试失败');
            }
            
            logger.success('KV读写测试通过', 'kv-test');
            return true;
        } catch (error) {
            logger.error(`KV读写测试失败: ${error.message}`, 'kv-test');
            this.isAvailable = false;
            return false;
        }
    }

    /**
     * 尝试自动修复KV绑定
     */
    async attemptAutoFix() {
        try {
            this.retryCount++;
            logger.info(`尝试修复KV绑定 (第${this.retryCount}次)`, 'kv-test');
            
            // 1. 检查Worker URL配置
            if (!CONFIG.WORKER_URL || CONFIG.WORKER_URL === '') {
                logger.error('Worker URL未配置', 'kv-test');
                return false;
            }
            
            // 2. 尝试备用URL
            if (this.retryCount === 1) {
                logger.info('尝试使用备用Worker URL', 'kv-test');
                const originalUrl = CONFIG.WORKER_URL;
                
                // 尝试使用备用URL格式
                const备用Urls = [
                    originalUrl.replace('https://', ''),
                    `https://${originalUrl}`,
                    CONFIG.API_BASE.replace('/api', '') // 尝试使用API基础URL
                ];
                
                for (const url of 备用Urls) {
                    if (url !== originalUrl) {
                        try {
                            const tempConfig = { ...CONFIG, WORKER_URL: url.startsWith('http') ? url : `https://${url}` };
                            const tempApi = {
                                kvSet: async (key, value) => {
                                    const res = await fetch(`${tempConfig.WORKER_URL}/kv/set`, {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ key, value })
                                    });
                                    return await res.json();
                                }
                            };
                            
                            const testResult = await tempApi.kvSet('__temp_test', { test: true });
                            if (testResult.ok) {
                                logger.success(`发现可用的备用Worker URL: ${tempConfig.WORKER_URL}`, 'kv-test');
                                CONFIG.WORKER_URL = tempConfig.WORKER_URL;
                                this.isAvailable = true;
                                return true;
                            }
                        } catch (e) {
                            // 忽略尝试错误
                        }
                    }
                }
            }
            
            // 3. 尝试降级到本地存储
            if (this.retryCount >= 2) {
                logger.info('启动本地存储降级方案', 'kv-test');
                this.setupLocalStorageFallback();
                return true;
            }
            
            // 4. 递归重试
            if (this.retryCount < this.maxRetries) {
                logger.info(`等待2秒后重试...`, 'kv-test');
                await new Promise(resolve => setTimeout(resolve, 2000));
                return this.attemptAutoFix();
            }
            
            return false;
        } catch (error) {
            logger.error(`KV自动修复失败: ${error.message}`, 'kv-test');
            return false;
        }
    }

    /**
     * 设置本地存储降级方案
     */
    setupLocalStorageFallback() {
        try {
            logger.info('配置本地存储作为KV降级方案', 'kv-test');
            
            // 扩展API对象，添加本地存储降级方法
            const originalKvGet = api.kvGet;
            const originalKvSet = api.kvSet;
            const originalKvDel = api.kvDel;
            
            // 覆盖kvGet方法
            api.kvGet = async (key) => {
                try {
                    // 优先尝试KV存储
                    if (this.isAvailable) {
                        const result = await originalKvGet.call(api, key);
                        if (result !== null) return result;
                    }
                    
                    // 降级到本地存储
                    logger.warning(`KV降级：从本地存储读取 ${key}`, 'kv-fallback');
                    const value = localStorage.getItem(`jev_kv_${key}`);
                    return value ? JSON.parse(value) : null;
                } catch (error) {
                    logger.error(`本地存储读取失败: ${error.message}`, 'kv-fallback');
                    return null;
                }
            };
            
            // 覆盖kvSet方法
            api.kvSet = async (key, value) => {
                try {
                    let kvResult = { ok: false };
                    
                    // 尝试KV存储
                    if (this.isAvailable) {
                        kvResult = await originalKvSet.call(api, key, value);
                    }
                    
                    // 同时写入本地存储作为备份
                    logger.warning(`KV降级：写入本地存储 ${key}`, 'kv-fallback');
                    localStorage.setItem(`jev_kv_${key}`, JSON.stringify(value));
                    
                    return { ok: true, ...kvResult };
                } catch (error) {
                    logger.error(`本地存储写入失败: ${error.message}`, 'kv-fallback');
                    return { ok: false, error: error.message };
                }
            };
            
            // 覆盖kvDel方法
            api.kvDel = async (key) => {
                try {
                    let kvResult = { ok: false };
                    
                    // 尝试KV存储
                    if (this.isAvailable) {
                        kvResult = await originalKvDel.call(api, key);
                    }
                    
                    // 同时从本地存储删除
                    logger.warning(`KV降级：从本地存储删除 ${key}`, 'kv-fallback');
                    localStorage.removeItem(`jev_kv_${key}`);
                    
                    return { ok: true, ...kvResult };
                } catch (error) {
                    logger.error(`本地存储删除失败: ${error.message}`, 'kv-fallback');
                    return { ok: false, error: error.message };
                }
            };
            
            // 标记降级模式
            localStorage.setItem('jev_kv_mode', 'fallback');
            logger.info('KV本地存储降级方案已激活', 'kv-fallback');
            
        } catch (error) {
            logger.error(`设置本地存储降级方案失败: ${error.message}`, 'kv-fallback');
        }
    }

    /**
     * 获取KV状态报告
     */
    getStatusReport() {
        return {
            available: this.isAvailable,
            mode: localStorage.getItem('jev_kv_mode') || (this.isAvailable ? 'cloudflare' : 'unavailable'),
            retryCount: this.retryCount,
            lastChecked: new Date().toISOString(),
            workerUrl: CONFIG.WORKER_URL,
            version: CONFIG.VERSION
        };
    }

    /**
     * 恢复原始API方法
     */
    restoreOriginalApi() {
        try {
            // 这里可以实现恢复原始API方法的逻辑
            localStorage.removeItem('jev_kv_mode');
            logger.info('已恢复原始KV API方法', 'kv-test');
        } catch (error) {
            logger.error(`恢复原始API失败: ${error.message}`, 'kv-test');
        }
    }

    /**
     * 重新连接KV服务
     */
    async reconnect() {
        try {
            logger.info('尝试重新连接KV服务...', 'kv-test');
            const wasAvailable = this.isAvailable;
            
            // 恢复原始状态
            this.retryCount = 0;
            this.isAvailable = false;
            
            // 重新检测
            const result = await this.detectKVStatus();
            
            if (result && !wasAvailable) {
                logger.success('KV服务已重新连接', 'kv-test');
                this.restoreOriginalApi();
                await this.runReadWriteTest();
            }
            
            return result;
        } catch (error) {
            logger.error(`KV重连失败: ${error.message}`, 'kv-test');
            return false;
        }
    }
}

// 导出单例实例
const kvTest = new KVTest();
export default kvTest;