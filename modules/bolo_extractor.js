// JEV插件整合项目 - BOLO地址精准提取模块

// 初始化JEV命名空间
window.JEV = window.JEV || {};

class BoloAddressExtractor {
    constructor() {
        // 初始化配置
        this.config = {
            addressPatterns: [
                /\b(\d{1,5}\s+[A-Za-z\s\.-]+)\b/, // 基本地址模式
                /\b([A-Za-z\s\.-]+\s+\d{1,5})\b/, // 反向地址模式
                /\b(\d{1,5}\s+[A-Za-z\s\.-]+,\s*[A-Za-z\s\.-]+,\s*\d{5}(-\d{4})?)\b/, // 完整地址带邮编
                /\b([A-Za-z\s\.-]+,\s*[A-Za-z\s\.-]+,\s*\d{5}(-\d{4})?)\b/ // 城市州邮编
            ],
            streetTypes: [
                'Street', 'St', 'Avenue', 'Ave', 'Boulevard', 'Blvd',
                'Drive', 'Dr', 'Road', 'Rd', 'Lane', 'Ln', 'Way', 'Plaza', 'Pl'
            ],
            countryCodes: ['US', 'UK', 'CA', 'AU', 'DE', 'FR']
        };
        
        // 处理统计信息
        this.stats = {
            totalCalls: 0,
            successfulExtractions: 0,
            failedExtractions: 0,
            totalProcessingTime: 0,
            lastExtractionTime: 0,
            cacheHits: 0,
            cacheMisses: 0
        };
        
        // 本地缓存系统
        this.cache = {
            data: new Map(),
            maxSize: 50,
            ttl: 15 * 60 * 1000, // 15分钟缓存过期时间
            lastAccess: new Map() // 记录最后访问时间，用于LRU淘汰
        };
        
        console.log('[BOLO Extractor] Module initialized');
        console.log('[BOLO Extractor] 缓存系统已初始化，最大缓存项数:', this.cache.maxSize);
    }
    
    // 核心地址提取方法（带缓存）
    extractAddress(domNode) {
        // 增加调用计数
        this.stats.totalCalls++;
        
        // 生成缓存键
        const cacheKey = this.generateCacheKey(domNode);
        
        // 检查缓存
        const cachedResult = this.getFromCache(cacheKey);
        if (cachedResult) {
            this.stats.cacheHits++;
            console.log(`[BOLO Extractor] Cache hit for address extraction`);
            
            // 更新统计信息
            if (cachedResult.success) {
                this.stats.successfulExtractions++;
            } else {
                this.stats.failedExtractions++;
            }
            this.stats.lastExtractionTime = 0; // 表示是缓存命中
            
            return cachedResult;
        }
        
        // 缓存未命中，执行实际提取
        this.stats.cacheMisses++;
        const startTime = performance.now();
        
        try {
            // 参数验证
            if (!domNode || typeof domNode !== 'object') {
                console.error('[BOLO Extractor] Invalid DOM node provided');
                
                const errorResult = {
                    success: false,
                    error: 'Invalid DOM node',
                    raw_data: null
                };
                
                // 缓存错误结果
                this.saveToCache(cacheKey, errorResult, 60 * 1000); // 1分钟
                this.stats.failedExtractions++;
                
                return errorResult;
            }
            
            // 获取原始HTML内容
            const rawData = domNode.outerHTML || domNode.innerHTML || domNode.textContent || '';
            
            // 获取文本内容用于地址提取
            let textContent = domNode.textContent || domNode.innerText || '';
            
            // 提取地址
            const addressResult = this.detectAndFormatAddress(textContent);
            
            const endTime = performance.now();
            const processingTime = endTime - startTime;
            this.stats.totalProcessingTime += processingTime;
            this.stats.lastExtractionTime = processingTime;
            
            let result;
            
            if (addressResult.success) {
                console.log(`[BOLO Extractor] Address extracted: "${addressResult.address}"`);
                console.log('[BOLO Extractor] 地址提取成功');
                this.stats.successfulExtractions++;
                
                result = {
                    success: true,
                    address: addressResult.address,
                    raw_data: rawData,
                    processingTime: processingTime
                };
            } else {
                console.log('[BOLO Extractor] 地址提取失败');
                this.stats.failedExtractions++;
                
                result = {
                    success: false,
                    error: addressResult.error || 'No valid address found',
                    raw_data: rawData,
                    processingTime: processingTime
                };
            }
            
            // 保存到缓存
            this.saveToCache(cacheKey, result);
            
            return result;
        } catch (error) {
            console.error('[BOLO Extractor] Error during extraction:', error);
            
            const endTime = performance.now();
            const processingTime = endTime - startTime;
            this.stats.totalProcessingTime += processingTime;
            this.stats.lastExtractionTime = processingTime;
            this.stats.failedExtractions++;
            
            const errorResult = {
                success: false,
                error: error.message || 'Extraction failed',
                raw_data: null,
                processingTime: processingTime
            };
            
            // 缓存错误结果
            this.saveToCache(cacheKey, errorResult, 60 * 1000); // 1分钟
            
            return errorResult;
        }
    }
    
    // 检测并格式化地址
    detectAndFormatAddress(text) {
        // 移除多余空白字符
        text = text.replace(/\s+/g, ' ').trim();
        
        // 尝试使用多种正则表达式模式匹配地址
        const addressPatterns = [
            // 英文地址模式：数字 街道名, 城市, 州/省 邮编, 国家
            /(\d+\s+[\w\s]+(?:St|Street|Ave|Avenue|Blvd|Boulevard|Dr|Drive|Rd|Road|Ln|Lane)\s*,\s*[\w\s]+\s*,\s*[A-Z]{2}\s*\d{5}(?:-\d{4})?\s*(?:,\s*[\w\s]+)?)/i,
            
            // 中文地址模式：省市区+街道+门牌号
            /([\u4e00-\u9fa5]+[省市县区]\s*[\u4e00-\u9fa5]+[市县区]?\s*[\u4e00-\u9fa5]+[街道路巷弄]?\s*\d+[号号楼单元室]?)/,
            
            // 更通用的地址模式
            /([\w\u4e00-\u9fa5]+[街道路巷弄]\s*\d+[号号楼单元室]?\s*,?\s*[\w\u4e00-\u9fa5]+)/,
            
            // 包含邮政编码的地址
            /(.*?\d{5,6}.*?)/
        ];
        
        // 尝试匹配地址
        for (const pattern of addressPatterns) {
            const match = text.match(pattern);
            if (match && match[1]) {
                const rawAddress = match[1];
                const formattedAddress = this.formatAddress(rawAddress);
                
                // 验证格式化后的地址
                if (this.validateAddress(formattedAddress)) {
                    return {
                        success: true,
                        address: formattedAddress
                    };
                }
            }
        }
        
        // 如果没有找到匹配的地址，尝试使用关键词匹配
        const addressKeywords = ['街', '路', '巷', '弄', '道', '大道', '大街', 'Street', 'St', 'Avenue', 'Ave', 'Road', 'Rd', 'Drive', 'Dr'];
        for (const keyword of addressKeywords) {
            const keywordIndex = text.indexOf(keyword);
            if (keywordIndex !== -1) {
                // 提取包含关键词的片段
                let start = Math.max(0, keywordIndex - 50);
                let end = Math.min(text.length, keywordIndex + 50);
                let potentialAddress = text.substring(start, end);
                
                // 清理并格式化
                potentialAddress = this.formatAddress(potentialAddress);
                
                if (this.validateAddress(potentialAddress) && potentialAddress.length > 5) {
                    return {
                        success: true,
                        address: potentialAddress
                    };
                }
            }
        }
        
        return {
            success: false,
            error: 'No address pattern matched'
        };
    }
    
    // 格式化地址
    formatAddress(address) {
        // 移除多余的空格和符号
        let formatted = address
            .replace(/\s+/g, ' ')  // 替换多个空格为单个空格
            .replace(/[,，\s]+$/, '')  // 移除末尾的逗号和空格
            .replace(/^[,，\s]+/, '')  // 移除开头的逗号和空格
            .replace(/[\s]*[,，][\s]*/g, ', ')  // 规范逗号格式
            .trim();
        
        return formatted;
    }
    
    // 验证地址格式
    validateAddress(address) {
        if (!address || typeof address !== 'string' || address.length < 5) {
            return false;
        }
        
        // 基本验证：包含至少一个数字或常见地址关键词
        const hasNumber = /\d/.test(address);
        const hasAddressKeyword = /[街道路巷弄道大道大街StStreetAveAvenueRdRoadDrDrive]/i.test(address);
        
        // 检查是否包含明显非地址的内容
        const invalidPatterns = [
            /@[\w.]+/,  // 邮箱
            /https?:\/\//,  // URL
            /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i  // 邮箱格式
        ];
        
        for (const pattern of invalidPatterns) {
            if (pattern.test(address)) {
                return false;
            }
        }
        
        // 地址必须包含数字或地址关键词
        return hasNumber || hasAddressKeyword;
    }
    
    // 识别地址组成部分
    parseAddressComponents(address) {
        const components = {
            country: null,
            province: null,
            city: null,
            district: null,
            street: null,
            number: null,
            postalCode: null
        };
        
        // 提取邮政编码
        const postalCodeMatch = address.match(/\b\d{5,6}\b/);
        if (postalCodeMatch) {
            components.postalCode = postalCodeMatch[0];
        }
        
        // 提取门牌号
        const numberMatch = address.match(/\b\d+[号号楼单元室]?\b/);
        if (numberMatch) {
            components.number = numberMatch[0];
        }
        
        // 可以根据需要扩展更多组件识别逻辑
        
        return components;
    }
    
    // 获取平均处理时间
    getAverageProcessingTime() {
        // 只计算实际处理的请求，排除缓存命中
        const actualProcessingCalls = this.stats.cacheMisses;
        return actualProcessingCalls > 0 
            ? this.stats.totalProcessingTime / actualProcessingCalls 
            : 0;
    }
    
    // 获取当前统计信息
    getStats() {
        return {
            ...this.stats,
            averageProcessingTime: this.getAverageProcessingTime(),
            successRate: this.stats.totalCalls > 0 
                ? (this.stats.successfulExtractions / this.stats.totalCalls) * 100 
                : 0,
            cacheHitRate: this.stats.totalCalls > 0
                ? (this.stats.cacheHits / this.stats.totalCalls) * 100
                : 0,
            currentCacheSize: this.cache.data.size
        };
    }
    
    // 生成缓存键
    generateCacheKey(domNode) {
        if (!domNode || !domNode.textContent) {
            return 'invalid_node';
        }
        
        // 使用文本内容生成缓存键，限制长度
        let text = domNode.textContent.trim();
        if (text.length > 500) {
            text = text.substring(0, 500) + '...';
        }
        
        // 加入节点类型和ID等信息增强唯一性
        const nodeInfo = [
            domNode.tagName,
            domNode.id || 'no_id',
            Array.from(domNode.classList).join('.') || 'no_class'
        ].join('_');
        
        return `${nodeInfo}_${this.hashCode(text)}`;
    }
    
    // 简单的哈希函数
    hashCode(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // 转换为32位整数
        }
        return hash.toString(16);
    }
    
    // 从缓存获取
    getFromCache(key) {
        const cachedItem = this.cache.data.get(key);
        if (!cachedItem) {
            return null;
        }
        
        // 检查是否过期
        if (Date.now() > cachedItem.expiry) {
            this.cache.data.delete(key);
            this.cache.lastAccess.delete(key);
            return null;
        }
        
        // 更新最后访问时间（用于LRU）
        this.cache.lastAccess.set(key, Date.now());
        
        // 返回缓存的结果（深拷贝避免引用问题）
        return JSON.parse(JSON.stringify(cachedItem.value));
    }
    
    // 保存到缓存
    saveToCache(key, value, customTtl = null) {
        // 检查缓存大小，如果超过限制则删除最旧的项
        if (this.cache.data.size >= this.cache.maxSize) {
            this.evictLeastRecentlyUsed();
        }
        
        // 计算过期时间
        const expiry = Date.now() + (customTtl || this.cache.ttl);
        
        // 保存缓存项（深拷贝避免引用问题）
        this.cache.data.set(key, {
            value: JSON.parse(JSON.stringify(value)),
            expiry: expiry
        });
        
        // 记录最后访问时间
        this.cache.lastAccess.set(key, Date.now());
    }
    
    // 淘汰最久未使用的缓存项（LRU策略）
    evictLeastRecentlyUsed() {
        let oldestKey = null;
        let oldestTime = Infinity;
        
        // 找出最久未使用的项
        for (const [key, time] of this.cache.lastAccess.entries()) {
            if (time < oldestTime) {
                oldestTime = time;
                oldestKey = key;
            }
        }
        
        // 删除最旧的项
        if (oldestKey) {
            this.cache.data.delete(oldestKey);
            this.cache.lastAccess.delete(oldestKey);
            console.log(`[BOLO Extractor] Cache evicted: ${oldestKey}`);
        }
    }
    
    // 清除缓存
    clearCache() {
        const oldSize = this.cache.data.size;
        this.cache.data.clear();
        this.cache.lastAccess.clear();
        console.log(`[BOLO Extractor] Cache cleared, removed ${oldSize} items`);
    }
    
    // 设置缓存大小
    setCacheSize(maxSize) {
        if (typeof maxSize === 'number' && maxSize > 0) {
            this.cache.maxSize = maxSize;
            
            // 如果当前缓存大小超过新的限制，淘汰多余的项
            while (this.cache.data.size > maxSize) {
                this.evictLeastRecentlyUsed();
            }
            
            console.log(`[BOLO Extractor] Cache size set to: ${maxSize}`);
        }
    }
    
    // 设置缓存过期时间（毫秒）
    setCacheTtl(ttl) {
        if (typeof ttl === 'number' && ttl > 0) {
            this.cache.ttl = ttl;
            console.log(`[BOLO Extractor] Cache TTL set to: ${ttl}ms`);
        }
    }
}

// 创建实例并导出
const boloExtractor = new BoloAddressExtractor();

// 注册到控制器（如果控制器已加载）
if (window.JEV && JEV.Controller) {
    JEV.Controller.registerModule('boloExtractor', {
        onInit: () => console.log('[BOLO Extractor] Registered with controller'),
        extractAddress: (domNode) => boloExtractor.extractAddress(domNode),
        validateAddress: (address) => boloExtractor.validateAddress(address)
    });
    
    // 监听提取地址事件
    JEV.Controller.on('extractAddress', (data) => {
        if (data && data.domNode) {
            const result = boloExtractor.extractAddress(data.domNode);
            // 触发结果事件
            JEV.Controller.emit('addressExtracted', result);
        }
    });
}

// 导出模块
window.BOLO = window.BOLO || {};
window.BOLO.AddressExtractor = boloExtractor;
