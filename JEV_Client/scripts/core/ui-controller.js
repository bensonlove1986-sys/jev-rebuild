/* UTF-8 FIXED BY JEV @ 2025-11-09T15:11:17.726Z */
/**
 * JEV UI忙聨搂氓聢露氓聶篓
 * @file scripts/core/ui-controller.js
 * @created 2023-11-07
 * @description 猫麓聼猫麓拢UI莽禄聞盲禄露绠＄悊茫聙聛氓庐鹿氓聶篓氓聢聸氓禄潞茫聙聛氓炉录猫聢陋忙聨搂氓聢露氓聮聦莽聲聦茅聺垄忙赂虏忙聼聯
 */

/**
 * UI忙聨搂氓聢露氓聶篓莽卤禄
 * @implements {JEVModule}
 */
class UIController {
    /**
     * 忙聻聞茅聙聽氓聡陆忙聲掳
     */
    constructor() {
        // 氓路虏忙鲁篓氓聠聦莽職聞UI莽禄聞盲禄露
        this.components = {};
        // 氓陆聯氓聣聧忙驴聙忙麓禄莽職聞猫搂聠氓聸戮
        this.activeView = null;
        // 氓庐鹿氓聶篓氓聟聝莽麓聽氓录聲莽聰篓
        this.containers = {};
        // UI莽聤露忙聙聛绠＄悊
        this.uiState = {
            isVisible: false,
            currentMode: 'chat',
            theme: 'default'
        };
        // 盲潞聥盲禄露莽聸聭氓聬卢氓聶篓
        this.listeners = {};
    }
    
    /**
     * 氓聢聺氓搂聥氓聦聳UI忙聨搂氓聢露氓聶篓
     * @param {Object} context - 氓聢聺氓搂聥氓聦聳盲赂聤盲赂聥忙聳聡
     * @param {Object} context.config - 茅聟聧莽陆庐盲驴隆忙聛炉
     * @param {Object} context.services - 忙聹聧氓聤隆氓庐聻盲戮聥
     * @param {Object} context.dependencies - 盲戮聺猫碌聳忙篓隆氓聺聴
     * @returns {Promise<boolean>}
     */
    async initialize(context) {
        try {
            this.config = context.config || {};
            this.services = context.services || {};
            this.dependencies = context.dependencies || {};
            
            // 氓聢聺氓搂聥氓聦聳UI氓庐鹿氓聶篓
            await this._initializeContainers();
            
            // 氓聤聽猫陆陆盲赂禄茅垄聵忙聽路氓录聫
            await this.loadTheme(this.uiState.theme);
            
            // 忙鲁篓氓聠聦茅禄聵猫庐陇盲潞聥盲禄露莽聸聭氓聬卢
            this._registerGlobalEvents();
            
            console.log('UI Controller initialized successfully');
            return true;
        } catch (error) {
            console.error('Failed to initialize UI Controller:', error);
            return false;
        }
    }
    
    /**
     * 氓聢聺氓搂聥氓聦聳UI氓庐鹿氓聶篓
     * @private
     */
    async _initializeContainers() {
        // 氓聢聸氓禄潞盲赂禄氓庐鹿氓聶篓
        this.containers.main = this._createElement('div', {
            id: 'jev-main-container',
            className: 'jev-container jev-glass-effect'
        });
        
        // 氓聢聸氓禄潞氓炉录猫聢陋忙聽聫氓庐鹿氓聶篓
        this.containers.navigation = this._createElement('div', {
            id: 'jev-navigation',
            className: 'jev-nav-container'
        });
        this.containers.main.appendChild(this.containers.navigation);
        
        // 氓聢聸氓禄潞氓聠聟氓庐鹿氓庐鹿氓聶篓
        this.containers.content = this._createElement('div', {
            id: 'jev-content',
            className: 'jev-content-container'
        });
        this.containers.main.appendChild(this.containers.content);
        
        // 氓聢聸氓禄潞莽聤露忙聙聛忙聽聫氓庐鹿氓聶篓
        this.containers.statusBar = this._createElement('div', {
            id: 'jev-status-bar',
            className: 'jev-status-bar'
        });
        this.containers.main.appendChild(this.containers.statusBar);
        
        // 忙路禄氓聤聽氓聢掳忙聳聡忙隆拢盲赂颅
        document.body.appendChild(this.containers.main);
    }
    
    /**
     * 氓聢聸氓禄潞DOM氓聟聝莽麓聽
     * @param {string} tagName - HTML忙聽聡莽颅戮氓聬聧
     * @param {Object} attributes - 氓聟聝莽麓聽氓卤聻忙聙搂
     * @returns {HTMLElement}
     * @private
     */
    _createElement(tagName, attributes = {}) {
        const element = document.createElement(tagName);
        
        Object.keys(attributes).forEach(attr => {
            if (attr === 'className') {
                element.className = attributes[attr];
            } else if (attr === 'textContent') {
                element.textContent = attributes[attr];
            } else if (attr === 'innerHTML') {
                element.innerHTML = attributes[attr];
            } else {
                element.setAttribute(attr, attributes[attr]);
            }
        });
        
        return element;
    }
    
    /**
     * 忙鲁篓氓聠聦氓聟篓氓卤聙盲潞聥盲禄露莽聸聭氓聬卢
     * @private
     */
    _registerGlobalEvents() {
        // 莽陋聴氓聫拢氓陇搂氓掳聫氓聫聵氓聦聳氓陇聞莽聬聠
        window.addEventListener('resize', () => this._handleResize());
        
        // 茅聰庐莽聸聵氓驴芦忙聧路茅聰庐氓陇聞莽聬聠
        document.addEventListener('keydown', (e) => this._handleKeydown(e));
    }
    
    /**
     * 莽陋聴氓聫拢氓陇搂氓掳聫氓聫聵氓聦聳氓陇聞莽聬聠
     * @private
     */
    _handleResize() {
        this.emit('resize', {
            width: window.innerWidth,
            height: window.innerHeight
        });
        
        // 茅聙職莽聼楼忙聣聙忙聹聣忙麓禄猫路聝莽禄聞盲禄露
        Object.values(this.components).forEach(component => {
            if (component.handleResize) {
                component.handleResize();
            }
        });
    }
    
    /**
     * 茅聰庐莽聸聵盲潞聥盲禄露氓陇聞莽聬聠
     * @param {KeyboardEvent} event - 茅聰庐莽聸聵盲潞聥盲禄露
     * @private
     */
    _handleKeydown(event) {
        // 氓庐聻莽聨掳茅聰庐莽聸聵氓驴芦忙聧路茅聰庐氓陇聞莽聬聠茅聙禄猫戮聭
        if (event.ctrlKey && event.shiftKey && event.key === 'J') {
            this.toggleVisibility();
            event.preventDefault();
        }
    }
    
    /**
     * 忙鲁篓氓聠聦UI莽禄聞盲禄露
     * @param {string} componentName - 莽禄聞盲禄露氓聬聧莽搂掳
     * @param {Object} component - 莽禄聞盲禄露氓庐聻盲戮聥
     * @param {Object} options - 莽禄聞盲禄露茅聙聣茅隆鹿
     */
    registerComponent(componentName, component, options = {}) {
        if (this.components[componentName]) {
            console.warn(`Component ${componentName} is already registered`);
            return;
        }
        
        this.components[componentName] = component;
        
        // 氓聢聺氓搂聥氓聦聳莽禄聞盲禄露
        if (component.initialize && !options.lazyInit) {
            component.initialize({
                container: this.containers.content,
                services: this.services,
                uiController: this
            });
        }
        
        console.log(`Component registered: ${componentName}`);
    }
    
    /**
     * 忙赂虏忙聼聯猫搂聠氓聸戮
     * @param {string} viewName - 猫搂聠氓聸戮氓聬聧莽搂掳
     * @param {Object} [data] - 猫搂聠氓聸戮鏁版嵁
     * @returns {Promise<boolean>}
     */
    async renderView(viewName, data = {}) {
        try {
            const component = this.components[viewName];
            if (!component) {
                throw new Error(`View component not found: ${viewName}`);
            }
            
            // 茅職聬猫聴聫氓陆聯氓聣聧忙麓禄猫路聝猫搂聠氓聸戮
            if (this.activeView && this.activeView !== component && this.activeView.hide) {
                this.activeView.hide();
            }
            
            // 忙赂虏忙聼聯忙聳掳猫搂聠氓聸戮
            await component.render(this.containers.content, data);
            this.activeView = component;
            this.uiState.currentMode = viewName;
            
            this.emit('viewChanged', { viewName, data });
            return true;
        } catch (error) {
            console.error(`Failed to render view ${viewName}:`, error);
            return false;
        }
    }
    
    /**
     * 氓聤聽猫陆陆盲赂禄茅垄聵
     * @param {string} themeName - 盲赂禄茅垄聵氓聬聧莽搂掳
     * @returns {Promise<boolean>}
     */
    async loadTheme(themeName) {
        try {
            const themePath = `${this.config.baseUrl}/styles/themes/${themeName}.css`;
            
            // 莽搂禄茅聶陇忙聴搂盲赂禄茅垄聵
            const oldTheme = document.getElementById('jev-theme-stylesheet');
            if (oldTheme) {
                oldTheme.remove();
            }
            
            // 氓聤聽猫陆陆忙聳掳盲赂禄茅垄聵
            return new Promise((resolve, reject) => {
                const link = document.createElement('link');
                link.id = 'jev-theme-stylesheet';
                link.rel = 'stylesheet';
                link.href = themePath;
                
                link.onload = () => {
                    this.uiState.theme = themeName;
                    this.emit('themeChanged', { theme: themeName });
                    resolve(true);
                };
                
                link.onerror = () => reject(new Error(`Failed to load theme: ${themeName}`));
                
                document.head.appendChild(link);
            });
        } catch (error) {
            console.error(`Failed to load theme ${themeName}:`, error);
            return false;
        }
    }
    
    /**
     * 忙聵戮莽陇潞UI
     */
    show() {
        if (this.containers.main) {
            this.containers.main.classList.remove('jev-hidden');
            this.uiState.isVisible = true;
            this.emit('visibilityChanged', { visible: true });
        }
    }
    
    /**
     * 茅職聬猫聴聫UI
     */
    hide() {
        if (this.containers.main) {
            this.containers.main.classList.add('jev-hidden');
            this.uiState.isVisible = false;
            this.emit('visibilityChanged', { visible: false });
        }
    }
    
    /**
     * 氓聢聡忙聧垄UI氓聫炉猫搂聛忙聙搂
     */
    toggleVisibility() {
        if (this.uiState.isVisible) {
            this.hide();
        } else {
            this.show();
        }
    }
    
    /**
     * 鏇存柊莽聤露忙聙聛忙聽聫
     * @param {string} status - 莽聤露忙聙聛忙聳聡忙聹卢
     * @param {string} [statusType] - 莽聤露忙聙聛莽卤禄氓聻聥 (info, warning, error, success)
     */
    updateStatus(status, statusType = 'info') {
        if (this.containers.statusBar) {
            this.containers.statusBar.textContent = status;
            this.containers.statusBar.className = `jev-status-bar jev-status-${statusType}`;
            
            // 猫聡陋氓聤篓忙赂聟茅聶陇莽聤露忙聙聛
            setTimeout(() => {
                if (this.containers.statusBar) {
                    this.containers.statusBar.textContent = '';
                    this.containers.statusBar.className = 'jev-status-bar';
                }
            }, 5000);
        }
    }
    
    /**
     * 忙路禄氓聤聽盲潞聥盲禄露莽聸聭氓聬卢氓聶篓
     * @param {string} eventName - 盲潞聥盲禄露氓聬聧莽搂掳
     * @param {Function} listener - 盲潞聥盲禄露氓陇聞莽聬聠氓聡陆忙聲掳
     */
    on(eventName, listener) {
        if (!this.listeners[eventName]) {
            this.listeners[eventName] = [];
        }
        this.listeners[eventName].push(listener);
    }
    
    /**
     * 莽搂禄茅聶陇盲潞聥盲禄露莽聸聭氓聬卢氓聶篓
     * @param {string} eventName - 盲潞聥盲禄露氓聬聧莽搂掳
     * @param {Function} listener - 盲潞聥盲禄露氓陇聞莽聬聠氓聡陆忙聲掳
     */
    off(eventName, listener) {
        if (!this.listeners[eventName]) return;
        
        const index = this.listeners[eventName].indexOf(listener);
        if (index > -1) {
            this.listeners[eventName].splice(index, 1);
        }
    }
    
    /**
     * 猫搂娄氓聫聭盲潞聥盲禄露
     * @param {string} eventName - 盲潞聥盲禄露氓聬聧莽搂掳
     * @param {Object} data - 盲潞聥盲禄露鏁版嵁
     */
    emit(eventName, data = {}) {
        if (!this.listeners[eventName]) return;
        
        this.listeners[eventName].forEach(listener => {
            try {
                listener(data);
            } catch (error) {
                console.error(`Error in event listener for ${eventName}:`, error);
            }
        });
    }
    
    /**
     * 猫聨路氓聫聳UI莽聤露忙聙聛盲驴隆忙聛炉
     * @returns {Object}
     */
    getStateInfo() {
        return {
            ...this.uiState,
            activeComponents: Object.keys(this.components),
            activeView: this.activeView ? this.activeView.name || 'unknown' : null,
            containerExists: !!this.containers.main
        };
    }
    
    /**
     * 茅聰聙忙炉聛UI忙聨搂氓聢露氓聶篓
     * @returns {Promise<boolean>}
     */
    async destroy() {
        try {
            // 茅聰聙忙炉聛忙聣聙忙聹聣莽禄聞盲禄露
            for (const component of Object.values(this.components)) {
                if (component.destroy) {
                    await component.destroy();
                }
            }
            
            // 莽搂禄茅聶陇氓庐鹿氓聶篓氓聟聝莽麓聽
            if (this.containers.main && this.containers.main.parentNode) {
                this.containers.main.parentNode.removeChild(this.containers.main);
            }
            
            // 忙赂聟莽漏潞莽聤露忙聙聛
            this.components = {};
            this.containers = {};
            this.listeners = {};
            this.activeView = null;
            
            console.log('UI Controller destroyed successfully');
            return true;
        } catch (error) {
            console.error('Failed to destroy UI Controller:', error);
            return false;
        }
    }
}

// 氓炉录氓聡潞UI忙聨搂氓聢露氓聶篓
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = UIController;
} else if (typeof window !== 'undefined') {
    window.JEV_MODULES = window.JEV_MODULES || {};
    window.JEV_MODULES.core = window.JEV_MODULES.core || {};
    window.JEV_MODULES.core.UIController = UIController;
}
