/* UTF-8 FIXED BY JEV @ 2025-11-09T15:11:17.768Z */
/**
 * JEV 猫驴聻忙聨楼忙聹聧氓聤隆氓庐聻莽聨掳
 * 忙聫聬盲戮聸盲赂聨Cloudflare Worker莽職聞莽篓鲁氓庐職茅聙職盲驴隆茂录聦忙聰炉忙聦聛猫聡陋氓聤篓茅聡聧猫驴聻茫聙聛氓驴聝猫路鲁忙拢聙忙碌聥氓聮聦忙露聢忙聛炉茅聵聼氓聢聴
 */

class JEVConnection {
    constructor(config = {}) {
        // 茅聟聧莽陆庐盲驴隆忙聛炉
        this.config = {
            workerUrl: 'https://jevshop.bensonlove1986.workers.dev',
            heartbeatInterval: 30000, // 30莽搂聮氓驴聝猫路鲁茅聴麓茅職聰
            reconnectAttempts: 5,     // 忙聹聙氓陇搂茅聡聧猫驴聻忙卢隆忙聲掳
            reconnectDelay: 2000,     // 茅聡聧猫驴聻氓禄露猫驴聼茂录聢忙炉芦莽搂聮茂录聣
            timeout: 15000,           // 猫炉路忙卤聜猫露聟忙聴露忙聴露茅聴麓
            ...config
        };
        
        // 莽聤露忙聙聛盲驴隆忙聛炉
        this.state = {
            connected: false,
            connecting: false,
            authenticated: false,
            licenseKey: null,
            lastHeartbeat: null,
            reconnectCount: 0,
            latency: 0
        };
        
        // 盲潞聥盲禄露莽聸聭氓聬卢氓聶篓
        this.listeners = {};
        
        // 忙露聢忙聛炉茅聵聼氓聢聴
        this.messageQueue = [];
        
        // 氓庐職忙聴露氓聶篓氓录聲莽聰篓
        this.heartbeatTimer = null;
        this.reconnectTimer = null;
        
        // API 莽芦炉莽聜鹿忙聵聽氓掳聞
        this.endpoints = {
            ping: '/ping',
            auth: '/auth/license',
            messages: '/messages',
            analyze: '/analyze',
            kv: '/kv'
        };
    }
    
    /**
     * 氓聢聺氓搂聥氓聦聳猫驴聻忙聨楼忙聹聧氓聤隆
     * @returns {Promise<boolean>} 氓聢聺氓搂聥氓聦聳忙聵炉氓聬娄忙聢聬氓聤聼
     */
    async initialize() {
        console.log('[JEV Connection] 氓聢聺氓搂聥氓聦聳猫驴聻忙聨楼忙聹聧氓聤隆...');
        
        try {
            // 氓掳聺猫炉聲盲禄聨localStorage忙聛垄氓陇聧璁よ瘉莽聤露忙聙聛
            this.restoreAuthState();
            
            // 氓娄聜忙聻聹忙聹聣淇濆瓨莽職聞忙聨聢忙聺聝盲驴隆忙聛炉茂录聦氓掳聺猫炉聲猫聡陋氓聤篓猫驴聻忙聨楼
            if (this.state.licenseKey) {
                await this.connect();
            }
            
            return true;
        } catch (error) {
            console.error('[JEV Connection] 氓聢聺氓搂聥氓聦聳氓陇卤猫麓楼:', error);
            return false;
        }
    }
    
    /**
     * 忙聛垄氓陇聧璁よ瘉莽聤露忙聙聛
     */
    restoreAuthState() {
        const savedLicense = localStorage.getItem('jev_license');
        if (savedLicense) {
            this.state.licenseKey = savedLicense;
        }
    }
    
    /**
     * 淇濆瓨璁よ瘉莽聤露忙聙聛
     * @param {string} licenseKey - 忙聨聢忙聺聝莽聽聛
     */
    saveAuthState(licenseKey) {
        this.state.licenseKey = licenseKey;
        localStorage.setItem('jev_license', licenseKey);
    }
    
    /**
     * 忙赂聟茅聶陇璁よ瘉莽聤露忙聙聛
     */
    clearAuthState() {
        this.state.licenseKey = null;
        this.state.authenticated = false;
        localStorage.removeItem('jev_license');
    }
    
    /**
     * 猫驴聻忙聨楼氓聢掳Worker
     * @returns {Promise<boolean>} 猫驴聻忙聨楼忙聵炉氓聬娄忙聢聬氓聤聼
     */
    async connect() {
        if (this.state.connecting || this.state.connected) {
            return this.state.connected;
        }
        
        this.state.connecting = true;
        this.emit('connectionChange', 'connecting');
        
        try {
            // 氓聟聢氓掳聺猫炉聲ping忙碌聥猫炉聲
            const pingResult = await this.ping();
            
            if (pingResult) {
                this.state.connected = true;
                this.state.connecting = false;
                this.state.reconnectCount = 0;
                this.emit('connectionChange', 'connected');
                
                // 氓聬炉氓聤篓氓驴聝猫路鲁忙拢聙忙碌聥
                this.startHeartbeat();
                
                // 氓陇聞莽聬聠茅聵聼氓聢聴盲赂颅莽職聞忙露聢忙聛炉
                this.processMessageQueue();
                
                return true;
            } else {
                throw new Error('Ping忙碌聥猫炉聲氓陇卤猫麓楼');
            }
        } catch (error) {
            console.error('[JEV Connection] 猫驴聻忙聨楼氓陇卤猫麓楼:', error);
            this.state.connecting = false;
            this.state.connected = false;
            this.emit('connectionChange', 'disconnected');
            
            // 氓掳聺猫炉聲茅聡聧猫驴聻
            this.scheduleReconnect();
            
            return false;
        }
    }
    
    /**
     * 忙聳颅氓录聙猫驴聻忙聨楼
     */
    disconnect() {
        // 忙赂聟茅聶陇氓庐職忙聴露氓聶篓
        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
            this.heartbeatTimer = null;
        }
        
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
        
        // 鏇存柊莽聤露忙聙聛
        this.state.connected = false;
        this.state.connecting = false;
        
        // 猫搂娄氓聫聭忙聳颅氓录聙猫驴聻忙聨楼盲潞聥盲禄露
        this.emit('connectionChange', 'disconnected');
        
        console.log('[JEV Connection] 氓路虏忙聳颅氓录聙猫驴聻忙聨楼');
    }
    
    /**
     * 忙聨聢忙聺聝茅陋聦猫炉聛
     * @param {string} licenseKey - 忙聨聢忙聺聝莽聽聛
     * @returns {Promise<Object>} 忙聨聢忙聺聝莽禄聯忙聻聹
     */
    async authenticate(licenseKey) {
        try {
            const response = await this.request(this.endpoints.auth, {
                method: 'POST',
                body: JSON.stringify({ license: licenseKey })
            });
            
            if (response && response.success) {
                this.saveAuthState(licenseKey);
                this.state.authenticated = true;
                
                // 猫驴聻忙聨楼忙聢聬氓聤聼氓聬聨猫搂娄氓聫聭璁よ瘉忙聢聬氓聤聼盲潞聥盲禄露
                this.emit('authSuccess', response);
                
                // 氓娄聜忙聻聹氓掳職忙聹陋猫驴聻忙聨楼茂录聦氓掳聺猫炉聲猫驴聻忙聨楼
                if (!this.state.connected) {
                    await this.connect();
                }
                
                return response;
            } else {
                throw new Error(response?.message || '忙聨聢忙聺聝氓陇卤猫麓楼');
            }
        } catch (error) {
            this.emit('authError', error);
            throw error;
        }
    }
    
    /**
     * Ping忙碌聥猫炉聲茂录聦忙拢聙忙聼楼猫驴聻忙聨楼莽聤露忙聙聛
     * @returns {Promise<boolean>} 忙聵炉氓聬娄猫驴聻茅聙職
     */
    async ping() {
        try {
            const startTime = Date.now();
            
            const response = await this.request(this.endpoints.ping, {
                method: 'GET',
                skipAuth: true // ping猫炉路忙卤聜盲赂聧茅聹聙猫娄聛璁よ瘉
            });
            
            const endTime = Date.now();
            this.state.latency = endTime - startTime;
            this.state.lastHeartbeat = new Date();
            
            return response && response.success === true;
        } catch (error) {
            console.error('[JEV Connection] Ping氓陇卤猫麓楼:', error);
            return false;
        }
    }
    
    /**
     * 氓聫聭茅聙聛忙露聢忙聛炉氓聢掳Worker
     * @param {Object} message - 忙露聢忙聛炉氓聠聟氓庐鹿
     * @returns {Promise<Object>} 氓聯聧氓潞聰莽禄聯忙聻聹
     */
    async send(message) {
        // 氓娄聜忙聻聹忙聹陋猫驴聻忙聨楼茂录聦氓掳聠忙露聢忙聛炉氓聤聽氓聟楼茅聵聼氓聢聴
        if (!this.state.connected && !this.state.connecting) {
            return new Promise((resolve) => {
                this.messageQueue.push({ message, resolve });
                this.connect();
            });
        }
        
        try {
            const endpoint = message.type === 'analyze' ? this.endpoints.analyze : this.endpoints.messages;
            const response = await this.request(endpoint, {
                method: 'POST',
                body: JSON.stringify(message)
            });
            
            return response;
        } catch (error) {
            console.error('[JEV Connection] 氓聫聭茅聙聛忙露聢忙聛炉氓陇卤猫麓楼:', error);
            
            // 氓聤聽氓聟楼茅聡聧猫炉聲茅聵聼氓聢聴
            this.messageQueue.push({ message, resolve: () => {} });
            
            // 猫搂娄氓聫聭茅聰聶猫炉炉盲潞聥盲禄露
            this.emit('error', error);
            
            // 氓掳聺猫炉聲茅聡聧猫驴聻
            if (this.state.connected) {
                this.scheduleReconnect();
            }
            
            return { success: false, error: error.message };
        }
    }
    
    /**
     * 茅聙職莽聰篓猫炉路忙卤聜忙聳鹿忙鲁聲
     * @param {string} endpoint - API莽芦炉莽聜鹿
     * @param {Object} options - 猫炉路忙卤聜茅聙聣茅隆鹿
     * @returns {Promise<Object>} 氓聯聧氓潞聰莽禄聯忙聻聹
     */
    async request(endpoint, options = {}) {
        const url = `${this.config.workerUrl}${endpoint}`;
        
        // 忙聻聞氓禄潞猫炉路忙卤聜茅聟聧莽陆庐
        const requestConfig = {
            method: options.method || 'GET',
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };
        
        // 忙路禄氓聤聽璁よ瘉氓陇麓茂录聢茅聶陇茅聺聻忙聵聨莽隆庐猫路鲁猫驴聡茂录聣
        if (!options.skipAuth && this.state.licenseKey) {
            requestConfig.headers['Authorization'] = `Bearer ${this.state.licenseKey}`;
        }
        
        // 璁剧疆猫露聟忙聴露
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('猫炉路忙卤聜猫露聟忙聴露')), this.config.timeout);
        });
        
        try {
            // 氓聫聭茅聙聛猫炉路忙卤聜茂录聢氓赂娄猫露聟忙聴露忙聨搂氓聢露茂录聣
            const response = await Promise.race([
                fetch(url, requestConfig),
                timeoutPromise
            ]);
            
            // 忙拢聙忙聼楼氓聯聧氓潞聰莽聤露忙聙聛
            if (!response.ok) {
                throw new Error(`HTTP茅聰聶猫炉炉! 莽聤露忙聙聛: ${response.status}`);
            }
            
            // 猫搂拢忙聻聬JSON氓聯聧氓潞聰
            const data = await response.json();
            return data;
        } catch (error) {
            console.error(`[JEV Connection] 猫炉路忙卤聜氓陇卤猫麓楼 (${endpoint}):`, error);
            throw error;
        }
    }
    
    /**
     * 氓聬炉氓聤篓氓驴聝猫路鲁忙拢聙忙碌聥
     */
    startHeartbeat() {
        // 忙赂聟茅聶陇莽聨掳忙聹聣氓庐職忙聴露氓聶篓
        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
        }
        
        // 璁剧疆忙聳掳莽職聞氓驴聝猫路鲁氓庐職忙聴露氓聶篓
        this.heartbeatTimer = setInterval(async () => {
            try {
                const success = await this.ping();
                
                if (!success) {
                    console.warn('[JEV Connection] 氓驴聝猫路鲁忙拢聙忙碌聥氓陇卤猫麓楼');
                    this.scheduleReconnect();
                }
            } catch (error) {
                console.error('[JEV Connection] 氓驴聝猫路鲁忙拢聙忙碌聥氓录聜氓赂赂:', error);
                this.scheduleReconnect();
            }
        }, this.config.heartbeatInterval);
        
        console.log('[JEV Connection] 氓驴聝猫路鲁忙拢聙忙碌聥氓路虏氓聬炉氓聤篓');
    }
    
    /**
     * 氓庐聣忙聨聮茅聡聧猫驴聻
     */
    scheduleReconnect() {
        // 氓娄聜忙聻聹氓路虏莽禄聫猫戮戮氓聢掳忙聹聙氓陇搂茅聡聧猫驴聻忙卢隆忙聲掳茂录聦氓聛聹忙颅垄茅聡聧猫驴聻
        if (this.state.reconnectCount >= this.config.reconnectAttempts) {
            console.error('[JEV Connection] 氓路虏猫戮戮氓聢掳忙聹聙氓陇搂茅聡聧猫驴聻忙卢隆忙聲掳茂录聦氓聛聹忙颅垄茅聡聧猫驴聻');
            this.disconnect();
            this.emit('maxReconnectAttemptsReached', this.config.reconnectAttempts);
            return;
        }
        
        // 氓娄聜忙聻聹氓路虏莽禄聫忙聹聣茅聡聧猫驴聻氓庐職忙聴露氓聶篓氓聹篓猫驴聬猫隆聦茂录聦盲赂聧茅聡聧氓陇聧璁剧疆
        if (this.reconnectTimer) {
            return;
        }
        
        // 娣诲姞茅聡聧猫驴聻猫庐隆忙聲掳
        this.state.reconnectCount++;
        
        // 猫庐隆莽庐聴茅聡聧猫驴聻氓禄露猫驴聼茂录聢忙聦聡忙聲掳茅聙聙茅聛驴茂录聣
        const delay = this.config.reconnectDelay * Math.pow(2, this.state.reconnectCount - 1);
        
        console.log(`[JEV Connection] ${delay}ms氓聬聨氓掳聺猫炉聲莽卢卢${this.state.reconnectCount}忙卢隆茅聡聧猫驴聻...`);
        
        // 璁剧疆茅聡聧猫驴聻氓庐職忙聴露氓聶篓
        this.reconnectTimer = setTimeout(async () => {
            this.reconnectTimer = null;
            await this.connect();
        }, delay);
    }
    
    /**
     * 氓陇聞莽聬聠忙露聢忙聛炉茅聵聼氓聢聴
     */
    processMessageQueue() {
        if (!this.state.connected || this.messageQueue.length === 0) {
            return;
        }
        
        console.log(`[JEV Connection] 氓陇聞莽聬聠${this.messageQueue.length}忙聺隆茅聵聼氓聢聴忙露聢忙聛炉...`);
        
        // 盲赂麓忙聴露淇濆瓨茅聵聼氓聢聴氓鹿露忙赂聟莽漏潞
        const queue = [...this.messageQueue];
        this.messageQueue = [];
        
        // 茅聙聬盲赂陋氓聫聭茅聙聛茅聵聼氓聢聴盲赂颅莽職聞忙露聢忙聛炉
        queue.forEach(async ({ message, resolve }) => {
            try {
                const response = await this.send(message);
                resolve(response);
            } catch (error) {
                console.error('[JEV Connection] 茅聵聼氓聢聴忙露聢忙聛炉氓聫聭茅聙聛氓陇卤猫麓楼:', error);
                // 氓陇卤猫麓楼莽職聞忙露聢忙聛炉茅聡聧忙聳掳氓聤聽氓聟楼茅聵聼氓聢聴
                this.messageQueue.push({ message, resolve });
            }
        });
    }
    
    /**
     * 猫聨路氓聫聳猫驴聻忙聨楼莽聤露忙聙聛
     * @returns {Object} 猫驴聻忙聨楼莽聤露忙聙聛盲驴隆忙聛炉
     */
    getStatus() {
        return {
            connected: this.state.connected,
            authenticated: this.state.authenticated,
            latency: this.state.latency,
            lastHeartbeat: this.state.lastHeartbeat,
            reconnectCount: this.state.reconnectCount
        };
    }
    
    /**
     * 鏇存柊茅聟聧莽陆庐
     * @param {Object} newConfig - 忙聳掳莽職聞茅聟聧莽陆庐
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        
        // 氓娄聜忙聻聹鏇存柊盲潞聠workerUrl茂录聦茅聡聧忙聳掳猫驴聻忙聨楼
        if (newConfig.workerUrl && newConfig.workerUrl !== this.config.workerUrl) {
            this.disconnect();
            this.connect();
        }
        
        // 氓娄聜忙聻聹鏇存柊盲潞聠氓驴聝猫路鲁茅聴麓茅職聰茂录聦茅聡聧忙聳掳璁剧疆氓庐職忙聴露氓聶篓
        if (newConfig.heartbeatInterval) {
            this.startHeartbeat();
        }
    }
    
    // 盲潞聥盲禄露莽聸聭氓聬卢氓聶篓忙聳鹿忙鲁聲
    
    /**
     * 忙路禄氓聤聽盲潞聥盲禄露莽聸聭氓聬卢氓聶篓
     * @param {string} event - 盲潞聥盲禄露氓聬聧莽搂掳
     * @param {Function} callback - 氓聸聻猫掳聝氓聡陆忙聲掳
     */
    on(event, callback) {
        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }
        
        this.listeners[event].push(callback);
        
        // 茅聯戮氓录聫猫掳聝莽聰篓忙聰炉忙聦聛
        return this;
    }
    
    /**
     * 莽搂禄茅聶陇盲潞聥盲禄露莽聸聭氓聬卢氓聶篓
     * @param {string} event - 盲潞聥盲禄露氓聬聧莽搂掳
     * @param {Function} callback - 氓聸聻猫掳聝氓聡陆忙聲掳
     */
    off(event, callback) {
        if (this.listeners[event]) {
            this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
        }
        
        // 茅聯戮氓录聫猫掳聝莽聰篓忙聰炉忙聦聛
        return this;
    }
    
    /**
     * 猫搂娄氓聫聭盲潞聥盲禄露
     * @param {string} event - 盲潞聥盲禄露氓聬聧莽搂掳
     * @param {*} data - 盲潞聥盲禄露鏁版嵁
     */
    emit(event, data) {
        console.log(`[JEV Connection] 猫搂娄氓聫聭盲潞聥盲禄露: ${event}`, data);
        
        if (this.listeners[event]) {
            this.listeners[event].forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`[JEV Connection] 盲潞聥盲禄露氓陇聞莽聬聠茅聰聶猫炉炉 (${event}):`, error);
                }
            });
        }
    }
    
    /**
     * 盲赂聙忙卢隆忙聙搂盲潞聥盲禄露莽聸聭氓聬卢氓聶篓
     * @param {string} event - 盲潞聥盲禄露氓聬聧莽搂掳
     * @param {Function} callback - 氓聸聻猫掳聝氓聡陆忙聲掳
     */
    once(event, callback) {
        const onceCallback = (data) => {
            this.off(event, onceCallback);
            callback(data);
        };
        
        this.on(event, onceCallback);
        
        // 茅聯戮氓录聫猫掳聝莽聰篓忙聰炉忙聦聛
        return this;
    }
}

// 氓聢聸氓禄潞氓聟篓氓卤聙猫驴聻忙聨楼氓庐聻盲戮聥
window.JEV_CONNECTION = new JEVConnection();

// 氓炉录氓聡潞猫驴聻忙聨楼莽卤禄盲戮聸氓聟露盲禄聳忙篓隆氓聺聴盲陆驴莽聰篓
if (typeof module !== 'undefined' && module.exports) {
    module.exports = JEVConnection;
} else if (typeof define === 'function' && define.amd) {
    define(() => JEVConnection);
}
