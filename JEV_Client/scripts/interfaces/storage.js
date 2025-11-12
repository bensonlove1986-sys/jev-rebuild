/* UTF-8 FIXED BY JEV @ 2025-11-09T15:11:17.760Z */
/**
 * JEV 氓颅聵氓聜篓忙聹聧氓聤隆忙聨楼氓聫拢氓庐職盲鹿聣
 * @file scripts/interfaces/storage.js
 * @created 2023-11-07
 */

/**
 * 氓颅聵氓聜篓忙聹聧氓聤隆忙聨楼氓聫拢
 * @interface StorageService
 */
class StorageService {
    /**
     * 氓聢聺氓搂聥氓聦聳氓颅聵氓聜篓忙聹聧氓聤隆
     * @returns {Promise<boolean>} 氓聢聺氓搂聥氓聦聳忙聵炉氓聬娄忙聢聬氓聤聼
     */
    async initialize() {
        throw new Error('Method initialize() must be implemented');
    }
    
    /**
     * 淇濆瓨鏁版嵁
     * @param {string} key - 氓颅聵氓聜篓茅聰庐氓聬聧
     * @param {*} value - 猫娄聛氓颅聵氓聜篓莽職聞氓聙录
     * @param {Object} [options] - 氓颅聵氓聜篓茅聙聣茅隆鹿
     * @param {number} [options.expiry] - 猫驴聡忙聹聼忙聴露茅聴麓(忙炉芦莽搂聮)
     * @param {boolean} [options.persistent] - 忙聵炉氓聬娄忙聦聛盲鹿聟氓颅聵氓聜篓
     * @returns {Promise<boolean>} 氓颅聵氓聜篓忙聵炉氓聬娄忙聢聬氓聤聼
     * @throws {Error} 氓陆聯氓颅聵氓聜篓氓陇卤猫麓楼忙聴露忙聤聸氓聡潞茅聰聶猫炉炉
     */
    async set(key, value, options = {}) {
        throw new Error('Method set() must be implemented');
    }
    
    /**
     * 猫聨路氓聫聳鏁版嵁
     * @param {string} key - 氓颅聵氓聜篓茅聰庐氓聬聧
     * @param {*} [defaultValue] - 茅禄聵猫庐陇氓聙录茂录聦氓陆聯茅聰庐盲赂聧氓颅聵氓聹篓忙聴露猫驴聰氓聸聻
     * @returns {Promise<*>} 氓颅聵氓聜篓莽職聞氓聙录忙聢聳茅禄聵猫庐陇氓聙录
     */
    async get(key, defaultValue = null) {
        throw new Error('Method get() must be implemented');
    }
    
    /**
     * 氓聢聽茅聶陇鏁版嵁
     * @param {string} key - 氓颅聵氓聜篓茅聰庐氓聬聧
     * @returns {Promise<boolean>} 氓聢聽茅聶陇忙聵炉氓聬娄忙聢聬氓聤聼
     */
    async remove(key) {
        throw new Error('Method remove() must be implemented');
    }
    
    /**
     * 忙赂聟茅聶陇忙聣聙忙聹聣鏁版嵁
     * @param {string} [prefix] - 氓聫炉茅聙聣莽職聞茅聰庐氓聬聧氓聣聧莽录聙茂录聦氓聫陋忙赂聟茅聶陇氓聦鹿茅聟聧氓聣聧莽录聙莽職聞茅聰庐
     * @returns {Promise<boolean>} 忙赂聟茅聶陇忙聵炉氓聬娄忙聢聬氓聤聼
     */
    async clear(prefix = '') {
        throw new Error('Method clear() must be implemented');
    }
    
    /**
     * 忙拢聙忙聼楼茅聰庐忙聵炉氓聬娄氓颅聵氓聹篓
     * @param {string} key - 氓颅聵氓聜篓茅聰庐氓聬聧
     * @returns {Promise<boolean>} 茅聰庐忙聵炉氓聬娄氓颅聵氓聹篓
     */
    async has(key) {
        throw new Error('Method has() must be implemented');
    }
    
    /**
     * 猫聨路氓聫聳忙聣聙忙聹聣茅聰庐氓聬聧
     * @param {string} [prefix] - 氓聫炉茅聙聣莽職聞茅聰庐氓聬聧氓聣聧莽录聙茂录聦氓聫陋猫驴聰氓聸聻氓聦鹿茅聟聧氓聣聧莽录聙莽職聞茅聰庐
     * @returns {Promise<string[]>} 茅聰庐氓聬聧忙聲掳莽禄聞
     */
    async getAllKeys(prefix = '') {
        throw new Error('Method getAllKeys() must be implemented');
    }
    
    /**
     * 忙聣鹿茅聡聫猫聨路氓聫聳鏁版嵁
     * @param {string[]} keys - 茅聰庐氓聬聧忙聲掳莽禄聞
     * @returns {Promise<Object>} 茅聰庐氓聙录氓炉鹿氓炉鹿猫卤隆
     */
    async getMultiple(keys) {
        throw new Error('Method getMultiple() must be implemented');
    }
    
    /**
     * 忙聣鹿茅聡聫淇濆瓨鏁版嵁
     * @param {Object} keyValuePairs - 茅聰庐氓聙录氓炉鹿氓炉鹿猫卤隆
     * @returns {Promise<boolean>} 忙聣鹿茅聡聫氓颅聵氓聜篓忙聵炉氓聬娄忙聢聬氓聤聼
     */
    async setMultiple(keyValuePairs) {
        throw new Error('Method setMultiple() must be implemented');
    }
    
    /**
     * 氓炉录氓聡潞忙聣聙忙聹聣鏁版嵁
     * @returns {Promise<Object>} 氓炉录氓聡潞莽職聞鏁版嵁氓炉鹿猫卤隆
     */
    async exportData() {
        throw new Error('Method exportData() must be implemented');
    }
    
    /**
     * 氓炉录氓聟楼鏁版嵁
     * @param {Object} data - 猫娄聛氓炉录氓聟楼莽職聞鏁版嵁氓炉鹿猫卤隆
     * @param {boolean} [overwrite] - 忙聵炉氓聬娄猫娄聠莽聸聳莽聨掳忙聹聣鏁版嵁
     * @returns {Promise<boolean>} 氓炉录氓聟楼忙聵炉氓聬娄忙聢聬氓聤聼
     */
    async importData(data, overwrite = true) {
        throw new Error('Method importData() must be implemented');
    }
}

// 氓炉录氓聡潞忙聨楼氓聫拢氓庐職盲鹿聣
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = { StorageService };
} else if (typeof window !== 'undefined') {
    window.JEV_MODULES = window.JEV_MODULES || {};
    window.JEV_MODULES.interfaces = window.JEV_MODULES.interfaces || {};
    window.JEV_MODULES.interfaces.StorageService = StorageService;
}
