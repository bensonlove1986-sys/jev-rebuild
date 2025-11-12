/* UTF-8 FIXED BY JEV @ 2025-11-09T15:11:17.771Z */
/**
 * JEV 忙聶潞猫聝陆氓庐垄忙聹聧忙聫聮盲禄露 - 氓颅聵氓聜篓忙篓隆氓聺聴
 * 氓掳聛猫拢聟 localStorage 忙聯聧盲陆聹茂录聦忙聫聬盲戮聸莽禄聼盲赂聙莽職聞氓颅聵氓聜篓忙聨楼氓聫拢
 */

window.JEV_STORAGE = {
    // 氓颅聵氓聜篓氓聣聧莽录聙茂录聦茅聛驴氓聟聧盲赂聨氓聟露盲禄聳氓潞聰莽聰篓氓聠虏莽陋聛
    prefix: 'JEV_',
    
    /**
     * 璁剧疆氓颅聵氓聜篓茅隆鹿
     * @param {string} key - 氓颅聵氓聜篓茅聰庐氓聬聧
     * @param {*} value - 氓颅聵氓聜篓氓聙录茂录聢盲录職猫聡陋氓聤篓氓潞聫氓聢聴氓聦聳盲赂潞JSON茂录聣
     * @param {boolean} raw - 忙聵炉氓聬娄盲禄楼氓聨聼氓搂聥氓颅聴莽卢娄盲赂虏氓陆垄氓录聫氓颅聵氓聜篓茂录聢盲赂聧猫驴聸猫隆聦JSON氓潞聫氓聢聴氓聦聳茂录聣
     * @returns {boolean} 忙聵炉氓聬娄璁剧疆忙聢聬氓聤聼
     */
    set: function(key, value, raw = false) {
        try {
            const storageKey = this.prefix + key;
            const storageValue = raw ? value : JSON.stringify(value);
            localStorage.setItem(storageKey, storageValue);
            console.log('[JEV][storage] 氓颅聵氓聜篓茅隆鹿氓路虏璁剧疆:', key);
            return true;
        } catch (error) {
            console.error('[JEV][storage] 璁剧疆氓颅聵氓聜篓茅隆鹿氓陇卤猫麓楼:', key, error);
            return false;
        }
    },
    
    /**
     * 猫聨路氓聫聳氓颅聵氓聜篓茅隆鹿
     * @param {string} key - 氓颅聵氓聜篓茅聰庐氓聬聧
     * @param {*} defaultValue - 茅禄聵猫庐陇氓聙录茂录聢氓陆聯氓颅聵氓聜篓茅隆鹿盲赂聧氓颅聵氓聹篓忙聴露猫驴聰氓聸聻茂录聣
     * @param {boolean} raw - 忙聵炉氓聬娄盲禄楼氓聨聼氓搂聥氓颅聴莽卢娄盲赂虏氓陆垄氓录聫猫聨路氓聫聳茂录聢盲赂聧猫驴聸猫隆聦JSON氓聫聧氓潞聫氓聢聴氓聦聳茂录聣
     * @returns {*} 氓颅聵氓聜篓氓聙录忙聢聳茅禄聵猫庐陇氓聙录
     */
    get: function(key, defaultValue = null, raw = false) {
        try {
            const storageKey = this.prefix + key;
            const value = localStorage.getItem(storageKey);
            
            if (value === null) {
                return defaultValue;
            }
            
            return raw ? value : JSON.parse(value);
        } catch (error) {
            console.error('[JEV][storage] 猫聨路氓聫聳氓颅聵氓聜篓茅隆鹿氓陇卤猫麓楼:', key, error);
            return defaultValue;
        }
    },
    
    /**
     * 忙拢聙忙聼楼氓颅聵氓聜篓茅隆鹿忙聵炉氓聬娄氓颅聵氓聹篓
     * @param {string} key - 氓颅聵氓聜篓茅聰庐氓聬聧
     * @returns {boolean} 忙聵炉氓聬娄氓颅聵氓聹篓
     */
    has: function(key) {
        try {
            const storageKey = this.prefix + key;
            return localStorage.getItem(storageKey) !== null;
        } catch (error) {
            console.error('[JEV][storage] 忙拢聙忙聼楼氓颅聵氓聜篓茅隆鹿氓陇卤猫麓楼:', key, error);
            return false;
        }
    },
    
    /**
     * 氓聢聽茅聶陇氓颅聵氓聜篓茅隆鹿
     * @param {string} key - 氓颅聵氓聜篓茅聰庐氓聬聧
     * @returns {boolean} 忙聵炉氓聬娄氓聢聽茅聶陇忙聢聬氓聤聼
     */
    remove: function(key) {
        try {
            const storageKey = this.prefix + key;
            localStorage.removeItem(storageKey);
            console.log('[JEV][storage] 氓颅聵氓聜篓茅隆鹿氓路虏氓聢聽茅聶陇:', key);
            return true;
        } catch (error) {
            console.error('[JEV][storage] 氓聢聽茅聶陇氓颅聵氓聜篓茅隆鹿氓陇卤猫麓楼:', key, error);
            return false;
        }
    },
    
    /**
     * 忙赂聟莽漏潞忙聣聙忙聹聣JEV莽聸赂氓聟鲁莽職聞氓颅聵氓聜篓茅隆鹿
     * @returns {boolean} 忙聵炉氓聬娄忙赂聟莽漏潞忙聢聬氓聤聼
     */
    clear: function() {
        try {
            const keys = Object.keys(localStorage);
            let removedCount = 0;
            
            for (const key of keys) {
                if (key.startsWith(this.prefix)) {
                    localStorage.removeItem(key);
                    removedCount++;
                }
            }
            
            console.log('[JEV][storage] 氓路虏忙赂聟莽漏潞忙聣聙忙聹聣JEV氓颅聵氓聜篓茅隆鹿茂录聦氓聟卤', removedCount, '茅隆鹿');
            return true;
        } catch (error) {
            console.error('[JEV][storage] 忙赂聟莽漏潞氓颅聵氓聜篓茅隆鹿氓陇卤猫麓楼:', error);
            return false;
        }
    },
    
    /**
     * 猫聨路氓聫聳忙聣聙忙聹聣JEV莽聸赂氓聟鲁莽職聞氓颅聵氓聜篓茅隆鹿
     * @returns {Object} 氓颅聵氓聜篓茅隆鹿氓炉鹿猫卤隆
     */
    getAll: function() {
        try {
            const result = {};
            const keys = Object.keys(localStorage);
            
            for (const key of keys) {
                if (key.startsWith(this.prefix)) {
                    const originalKey = key.substring(this.prefix.length);
                    try {
                        result[originalKey] = JSON.parse(localStorage.getItem(key));
                    } catch (e) {
                        // 氓娄聜忙聻聹猫搂拢忙聻聬氓陇卤猫麓楼茂录聦氓颅聵氓聜篓盲赂潞氓聨聼氓搂聥氓颅聴莽卢娄盲赂虏
                        result[originalKey] = localStorage.getItem(key);
                    }
                }
            }
            
            return result;
        } catch (error) {
            console.error('[JEV][storage] 猫聨路氓聫聳忙聣聙忙聹聣氓颅聵氓聜篓茅隆鹿氓陇卤猫麓楼:', error);
            return {};
        }
    },
    
    /**
     * 忙聣鹿茅聡聫璁剧疆氓颅聵氓聜篓茅隆鹿
     * @param {Object} items - 茅聰庐氓聙录氓炉鹿氓炉鹿猫卤隆
     * @returns {boolean} 忙聵炉氓聬娄氓聟篓茅聝篓璁剧疆忙聢聬氓聤聼
     */
    bulkSet: function(items) {
        try {
            for (const [key, value] of Object.entries(items)) {
                this.set(key, value);
            }
            return true;
        } catch (error) {
            console.error('[JEV][storage] 忙聣鹿茅聡聫璁剧疆氓颅聵氓聜篓茅隆鹿氓陇卤猫麓楼:', error);
            return false;
        }
    },
    
    /**
     * 忙聣鹿茅聡聫猫聨路氓聫聳氓颅聵氓聜篓茅隆鹿
     * @param {Array<string>} keys - 茅聰庐氓聬聧忙聲掳莽禄聞
     * @returns {Object} 茅聰庐氓聙录氓炉鹿氓炉鹿猫卤隆
     */
    bulkGet: function(keys) {
        const result = {};
        for (const key of keys) {
            result[key] = this.get(key);
        }
        return result;
    },
    
    /**
     * 氓颅聵氓聜篓氓炉鹿猫卤隆盲赂颅氓碌聦氓楼聴莽職聞氓卤聻忙聙搂
     * @param {string} key - 氓颅聵氓聜篓茅聰庐氓聬聧
     * @param {string} path - 氓卤聻忙聙搂猫路炉氓戮聞茂录聢氓娄聜 'user.name'茂录聣
     * @param {*} value - 氓颅聵氓聜篓氓聙录
     * @returns {boolean} 忙聵炉氓聬娄璁剧疆忙聢聬氓聤聼
     */
    setNested: function(key, path, value) {
        try {
            const obj = this.get(key, {});
            const keys = path.split('.');
            let current = obj;
            
            for (let i = 0; i < keys.length - 1; i++) {
                if (!current[keys[i]]) {
                    current[keys[i]] = {};
                }
                current = current[keys[i]];
            }
            
            current[keys[keys.length - 1]] = value;
            return this.set(key, obj);
        } catch (error) {
            console.error('[JEV][storage] 璁剧疆氓碌聦氓楼聴氓卤聻忙聙搂氓陇卤猫麓楼:', key, path, error);
            return false;
        }
    },
    
    /**
     * 猫聨路氓聫聳氓炉鹿猫卤隆盲赂颅氓碌聦氓楼聴莽職聞氓卤聻忙聙搂
     * @param {string} key - 氓颅聵氓聜篓茅聰庐氓聬聧
     * @param {string} path - 氓卤聻忙聙搂猫路炉氓戮聞茂录聢氓娄聜 'user.name'茂录聣
     * @param {*} defaultValue - 茅禄聵猫庐陇氓聙录
     * @returns {*} 氓碌聦氓楼聴氓卤聻忙聙搂氓聙录忙聢聳茅禄聵猫庐陇氓聙录
     */
    getNested: function(key, path, defaultValue = null) {
        try {
            const obj = this.get(key, {});
            const keys = path.split('.');
            let current = obj;
            
            for (const k of keys) {
                if (current === null || current === undefined || !Object.prototype.hasOwnProperty.call(current, k)) {
                    return defaultValue;
                }
                current = current[k];
            }
            
            return current;
        } catch (error) {
            console.error('[JEV][storage] 猫聨路氓聫聳氓碌聦氓楼聴氓卤聻忙聙搂氓陇卤猫麓楼:', key, path, error);
            return defaultValue;
        }
    },
    
    /**
     * 氓炉录氓聡潞忙聣聙忙聹聣JEV氓颅聵氓聜篓鏁版嵁
     * @returns {string} JSON氓颅聴莽卢娄盲赂虏氓陆垄氓录聫莽職聞鏁版嵁
     */
    exportData: function() {
        try {
            const data = this.getAll();
            return JSON.stringify(data, null, 2);
        } catch (error) {
            console.error('[JEV][storage] 氓炉录氓聡潞鏁版嵁氓陇卤猫麓楼:', error);
            return null;
        }
    },
    
    /**
     * 氓炉录氓聟楼JEV氓颅聵氓聜篓鏁版嵁
     * @param {string} jsonData - JSON氓颅聴莽卢娄盲赂虏氓陆垄氓录聫莽職聞鏁版嵁
     * @returns {boolean} 忙聵炉氓聬娄氓炉录氓聟楼忙聢聬氓聤聼
     */
    importData: function(jsonData) {
        try {
            const data = JSON.parse(jsonData);
            return this.bulkSet(data);
        } catch (error) {
            console.error('[JEV][storage] 氓炉录氓聟楼鏁版嵁氓陇卤猫麓楼:', error);
            return false;
        }
    },
    
    /**
     * 猫聨路氓聫聳氓颅聵氓聜篓盲陆驴莽聰篓忙聝聟氓聠碌
     * @returns {Object} 氓颅聵氓聜篓盲陆驴莽聰篓忙聝聟氓聠碌盲驴隆忙聛炉
     */
    getUsageInfo: function() {
        try {
            let totalSize = 0;
            const items = {};
            
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key.startsWith(this.prefix)) {
                    const value = localStorage.getItem(key);
                    const size = new Blob([value]).size;
                    totalSize += size;
                    items[key.substring(this.prefix.length)] = size;
                }
            }
            
            return {
                totalSize,
                totalItems: Object.keys(items).length,
                items
            };
        } catch (error) {
            console.error('[JEV][storage] 猫聨路氓聫聳氓颅聵氓聜篓盲陆驴莽聰篓忙聝聟氓聠碌氓陇卤猫麓楼:', error);
            return null;
        }
    },
    
    /**
     * 淇濆瓨氓赂娄猫驴聡忙聹聼忙聴露茅聴麓莽職聞鏁版嵁
     * @param {string} key - 氓颅聵氓聜篓茅聰庐氓聬聧
     * @param {*} value - 氓颅聵氓聜篓氓聙录
     * @param {number} expireTime - 猫驴聡忙聹聼忙聴露茅聴麓茂录聢忙炉芦莽搂聮茂录聣
     * @returns {boolean} 忙聵炉氓聬娄璁剧疆忙聢聬氓聤聼
     */
    setWithExpire: function(key, value, expireTime) {
        const item = {
            value,
            expire: Date.now() + expireTime
        };
        return this.set(key, item);
    },
    
    /**
     * 猫聨路氓聫聳氓赂娄猫驴聡忙聹聼忙聴露茅聴麓莽職聞鏁版嵁
     * @param {string} key - 氓颅聵氓聜篓茅聰庐氓聬聧
     * @param {*} defaultValue - 茅禄聵猫庐陇氓聙录
     * @returns {*} 鏁版嵁氓聙录忙聢聳茅禄聵猫庐陇氓聙录茂录聢氓娄聜忙聻聹氓路虏猫驴聡忙聹聼氓聢聶猫驴聰氓聸聻茅禄聵猫庐陇氓聙录氓鹿露氓聢聽茅聶陇氓颅聵氓聜篓茅隆鹿茂录聣
     */
    getWithExpire: function(key, defaultValue = null) {
        const item = this.get(key, null);
        
        if (!item || !item.expire) {
            return defaultValue;
        }
        
        if (Date.now() > item.expire) {
            this.remove(key);
            return defaultValue;
        }
        
        return item.value;
    }
};

console.log('[JEV][storage] 氓颅聵氓聜篓忙篓隆氓聺聴氓路虏氓聢聺氓搂聥氓聦聳');