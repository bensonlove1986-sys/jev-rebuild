/* UTF-8 FIXED BY JEV @ 2025-11-09T15:11:17.752Z */
/**
 * JEV 忙篓隆氓聺聴忙聨楼氓聫拢氓庐職盲鹿聣
 * @file scripts/interfaces/module.js
 * @created 2023-11-07
 */

/**
 * JEV 忙篓隆氓聺聴忙聨楼氓聫拢
 * @interface JEVModule
 */
class JEVModule {
    /**
     * 忙赂虏忙聼聯忙篓隆氓聺聴UI
     * @param {HTMLElement} container - 忙篓隆氓聺聴氓庐鹿氓聶篓氓聟聝莽麓聽
     */
    render(container) {
        throw new Error('Method render() must be implemented');
    }
    
    /**
     * 氓聢聺氓搂聥氓聦聳忙篓隆氓聺聴
     * @param {HTMLElement} container - 忙篓隆氓聺聴氓庐鹿氓聶篓氓聟聝莽麓聽
     * @returns {Promise<void> | void}
     */
    init(container) {
        throw new Error('Method init() must be implemented');
    }
    
    /**
     * 茅聰聙忙炉聛忙篓隆氓聺聴
     */
    destroy() {
        throw new Error('Method destroy() must be implemented');
    }
    
    /**
     * 猫聨路氓聫聳忙篓隆氓聺聴莽聤露忙聙聛盲驴隆忙聛炉
     * @returns {Object} 忙篓隆氓聺聴莽聤露忙聙聛氓炉鹿猫卤隆
     */
    getStateInfo() {
        return {};
    }
}

// 氓炉录氓聡潞忙聨楼氓聫拢氓庐職盲鹿聣
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = { JEVModule };
} else if (typeof window !== 'undefined') {
    window.JEV_MODULES = window.JEV_MODULES || {};
    window.JEV_MODULES.interfaces = window.JEV_MODULES.interfaces || {};
    window.JEV_MODULES.interfaces.JEVModule = JEVModule;
}
