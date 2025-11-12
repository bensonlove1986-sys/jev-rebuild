/* UTF-8 FIXED BY JEV @ 2025-11-09T15:11:17.721Z */
/**
 * JEV 忙聽赂氓驴聝忙篓隆氓聺聴氓聤聽猫陆陆氓聶篓
 * @file scripts/core/module-loader.js
 * @created 2023-11-07
 * @description 氓庐聻莽聨掳忙篓隆氓聺聴氓聤篓忙聙聛氓聤聽猫陆陆茫聙聛氓聢聺氓搂聥氓聦聳氓聮聦盲戮聺猫碌聳绠＄悊
 */

/**
 * 忙篓隆氓聺聴氓聤聽猫陆陆氓聶篓莽卤禄
 */
class JEVModuleLoader {
    /**
     * 忙聻聞茅聙聽氓聡陆忙聲掳
     */
    constructor() {
        // 氓路虏氓聤聽猫陆陆莽職聞忙篓隆氓聺聴莽录聯氓颅聵
        this.modules = {};
        // 忙篓隆氓聺聴盲戮聺猫碌聳氓聟鲁莽鲁禄忙聵聽氓掳聞
        this.dependencies = {};
        // 忙篓隆氓聺聴氓聤聽猫陆陆莽聤露忙聙聛
        this.loadingStatus = {};
        // 茅聟聧莽陆庐盲驴隆忙聛炉
        this.config = {};
        // 忙聽赂氓驴聝忙聹聧氓聤隆氓庐聻盲戮聥
        this.coreServices = {};
    }
    
    /**
     * 氓聢聺氓搂聥氓聦聳忙篓隆氓聺聴氓聤聽猫陆陆氓聶篓
     * @param {Object} config - 茅聟聧莽陆庐盲驴隆忙聛炉
     * @param {Object} [coreServices] - 忙聽赂氓驴聝忙聹聧氓聤隆氓庐聻盲戮聥氓炉鹿猫卤隆
     * @returns {Promise<boolean>}
     */
    async initialize(config, coreServices = {}) {
        this.config = config;
        this.coreServices = coreServices;
        
        try {
            // 茅陋聦猫炉聛茅聟聧莽陆庐
            if (!this.config.baseUrl) {
                throw new Error('Missing required configuration: baseUrl');
            }
            
            // 茅垄聞氓聤聽猫陆陆忙聨楼氓聫拢氓庐職盲鹿聣
            await this._preloadInterfaces();
            
            return true;
        } catch (error) {
            console.error('Failed to initialize module loader:', error);
            return false;
        }
    }
    
    /**
     * 茅垄聞氓聤聽猫陆陆忙聨楼氓聫拢氓庐職盲鹿聣
     * @private
     */
    async _preloadInterfaces() {
        const interfaceFiles = [
            'scripts/interfaces/module.js',
            'scripts/interfaces/connection.js',
            'scripts/interfaces/storage.js',
            'scripts/interfaces/security.js'
        ];
        
        for (const file of interfaceFiles) {
            try {
                await this._loadScript(`${this.config.baseUrl}/${file}`);
            } catch (error) {
                console.warn(`Failed to load interface file: ${file}`, error);
            }
        }
    }
    
    /**
     * 氓聤篓忙聙聛氓聤聽猫陆陆猫聞職忙聹卢
     * @param {string} url - 猫聞職忙聹卢URL
     * @returns {Promise}
     * @private
     */
    _loadScript(url) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = url;
            script.async = true;
            
            script.onload = () => resolve();
            script.onerror = () => reject(new Error(`Failed to load script: ${url}`));
            
            document.head.appendChild(script);
        });
    }
    
    /**
     * 氓聤聽猫陆陆CSS忙聽路氓录聫忙聳聡盲禄露
     * @param {string} url - CSS忙聳聡盲禄露URL
     * @returns {Promise}
     */
    _loadStyle(url) {
        return new Promise((resolve, reject) => {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = url;
            
            link.onload = () => resolve();
            link.onerror = () => reject(new Error(`Failed to load style: ${url}`));
            
            document.head.appendChild(link);
        });
    }
    
    /**
     * 忙鲁篓氓聠聦忙篓隆氓聺聴
     * @param {string} moduleName - 忙篓隆氓聺聴氓聬聧莽搂掳
     * @param {Object} moduleDef - 忙篓隆氓聺聴氓庐職盲鹿聣
     * @param {Array} [deps] - 盲戮聺猫碌聳忙篓隆氓聺聴氓聢聴猫隆篓
     */
    registerModule(moduleName, moduleDef, deps = []) {
        if (this.modules[moduleName]) {
            console.warn(`Module ${moduleName} is already registered`);
            return;
        }
        
        this.modules[moduleName] = moduleDef;
        this.dependencies[moduleName] = deps;
        this.loadingStatus[moduleName] = 'registered';
        
        console.log(`Module registered: ${moduleName}`);
    }
    
    /**
     * 氓聤聽猫陆陆忙篓隆氓聺聴
     * @param {string} moduleName - 忙篓隆氓聺聴氓聬聧莽搂掳
     * @returns {Promise<Object>}
     */
    async loadModule(moduleName) {
        // 忙拢聙忙聼楼忙篓隆氓聺聴忙聵炉氓聬娄氓路虏氓聤聽猫陆陆
        if (this.modules[moduleName] && this.loadingStatus[moduleName] === 'loaded') {
            return this.modules[moduleName];
        }
        
        // 忙拢聙忙聼楼忙篓隆氓聺聴忙聵炉氓聬娄氓路虏忙鲁篓氓聠聦
        if (!this.modules[moduleName]) {
            throw new Error(`Module not registered: ${moduleName}`);
        }
        
        try {
            this.loadingStatus[moduleName] = 'loading';
            
            // 氓聤聽猫陆陆盲戮聺猫碌聳忙篓隆氓聺聴
            const deps = this.dependencies[moduleName] || [];
            const loadedDeps = {};
            
            for (const dep of deps) {
                loadedDeps[dep] = await this.loadModule(dep);
            }
            
            // 氓聢聺氓搂聥氓聦聳忙篓隆氓聺聴
            const module = this.modules[moduleName];
            if (module.initialize) {
                await module.initialize({
                    config: this.config,
                    services: this.coreServices,
                    dependencies: loadedDeps
                });
            }
            
            this.loadingStatus[moduleName] = 'loaded';
            console.log(`Module loaded: ${moduleName}`);
            
            return module;
        } catch (error) {
            this.loadingStatus[moduleName] = 'failed';
            console.error(`Failed to load module ${moduleName}:`, error);
            throw error;
        }
    }
    
    /**
     * 忙聣鹿茅聡聫氓聤聽猫陆陆忙篓隆氓聺聴
     * @param {Array} moduleNames - 忙篓隆氓聺聴氓聬聧莽搂掳忙聲掳莽禄聞
     * @returns {Promise<Object>}
     */
    async loadModules(moduleNames) {
        const loadedModules = {};
        
        for (const moduleName of moduleNames) {
            loadedModules[moduleName] = await this.loadModule(moduleName);
        }
        
        return loadedModules;
    }
    
    /**
     * 猫聨路氓聫聳氓路虏氓聤聽猫陆陆莽職聞忙篓隆氓聺聴
     * @param {string} moduleName - 忙篓隆氓聺聴氓聬聧莽搂掳
     * @returns {Object|null}
     */
    getModule(moduleName) {
        return this.modules[moduleName] || null;
    }
    
    /**
     * 猫聨路氓聫聳忙聣聙忙聹聣忙篓隆氓聺聴莽聤露忙聙聛
     * @returns {Object}
     */
    getModulesStatus() {
        const status = {};
        
        Object.keys(this.modules).forEach(moduleName => {
            status[moduleName] = {
                status: this.loadingStatus[moduleName] || 'unknown',
                dependencies: this.dependencies[moduleName] || []
            };
        });
        
        return status;
    }
    
    /**
     * 茅聡聤忙聰戮忙篓隆氓聺聴猫碌聞忙潞聬
     * @param {string} moduleName - 忙篓隆氓聺聴氓聬聧莽搂掳
     */
    async unloadModule(moduleName) {
        if (!this.modules[moduleName]) {
            return;
        }
        
        try {
            const module = this.modules[moduleName];
            if (module.destroy) {
                await module.destroy();
            }
            
            delete this.modules[moduleName];
            delete this.dependencies[moduleName];
            delete this.loadingStatus[moduleName];
            
            console.log(`Module unloaded: ${moduleName}`);
        } catch (error) {
            console.error(`Failed to unload module ${moduleName}:`, error);
        }
    }
}

// 氓炉录氓聡潞忙篓隆氓聺聴氓聤聽猫陆陆氓聶篓
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = JEVModuleLoader;
} else if (typeof window !== 'undefined') {
    window.JEV_MODULES = window.JEV_MODULES || {};
    window.JEV_MODULES.core = window.JEV_MODULES.core || {};
    window.JEV_MODULES.core.ModuleLoader = JEVModuleLoader;
    
    // 氓聢聸氓禄潞茅禄聵猫庐陇氓庐聻盲戮聥
    window.JEV = window.JEV || {};
    window.JEV.moduleLoader = new JEVModuleLoader();
}
