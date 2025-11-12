/* UTF-8 FIXED BY JEV @ 2025-11-09T15:11:17.774Z */
/**
 * JEV 忙聶潞猫聝陆氓庐垄忙聹聧忙聫聮盲禄露 - 氓路楼氓聟路氓聡陆忙聲掳茅聸聠氓聬聢忙篓隆氓聺聴
 * 忙聫聬盲戮聸茅聙職莽聰篓莽職聞猫戮聟氓聤漏忙聳鹿忙鲁聲氓聮聦氓路楼氓聟路氓聡陆忙聲掳
 */

window.JEV_UTILS = {
    /**
     * 莽聰聼忙聢聬氓聰炉盲赂聙ID
     * @param {string} prefix - ID氓聣聧莽录聙
     * @returns {string} 氓聰炉盲赂聙ID
     */
    generateId: function(prefix = 'jev') {
        return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    },
    
    /**
     * 茅聵虏忙聤聳氓聡陆忙聲掳
     * @param {Function} func - 猫娄聛忙聣搂猫隆聦莽職聞氓聡陆忙聲掳
     * @param {number} delay - 氓禄露猫驴聼忙聴露茅聴麓茂录聢忙炉芦莽搂聮茂录聣
     * @returns {Function} 茅聵虏忙聤聳氓聬聨莽職聞氓聡陆忙聲掳
     */
    debounce: function(func, delay) {
        let timeoutId;
        return function(...args) {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func.apply(this, args), delay);
        };
    },
    
    /**
     * 猫聤聜忙碌聛氓聡陆忙聲掳
     * @param {Function} func - 猫娄聛忙聣搂猫隆聦莽職聞氓聡陆忙聲掳
     * @param {number} limit - 忙聴露茅聴麓茅聶聬氓聢露茂录聢忙炉芦莽搂聮茂录聣
     * @returns {Function} 猫聤聜忙碌聛氓聬聨莽職聞氓聡陆忙聲掳
     */
    throttle: function(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },
    
    /**
     * 忙聽录氓录聫氓聦聳忙聴楼忙聹聼忙聴露茅聴麓
     * @param {Date|string|number} date - 忙聴楼忙聹聼氓炉鹿猫卤隆茫聙聛忙聴露茅聴麓忙聢鲁忙聢聳忙聴楼忙聹聼氓颅聴莽卢娄盲赂虏
     * @param {string} format - 忙聽录氓录聫氓聦聳忙篓隆忙聺驴
     * @returns {string} 忙聽录氓录聫氓聦聳氓聬聨莽職聞忙聴楼忙聹聼氓颅聴莽卢娄盲赂虏
     */
    formatDateTime: function(date, format = 'YYYY-MM-DD HH:mm:ss') {
        const d = new Date(date);
        
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        const seconds = String(d.getSeconds()).padStart(2, '0');
        
        return format
            .replace('YYYY', year)
            .replace('MM', month)
            .replace('DD', day)
            .replace('HH', hours)
            .replace('mm', minutes)
            .replace('ss', seconds);
    },
    
    /**
     * 忙聽录氓录聫氓聦聳忙聳聡盲禄露氓陇搂氓掳聫
     * @param {number} bytes - 氓颅聴猫聤聜忙聲掳
     * @param {number} decimals - 氓掳聫忙聲掳盲陆聧忙聲掳
     * @returns {string} 忙聽录氓录聫氓聦聳氓聬聨莽職聞忙聳聡盲禄露氓陇搂氓掳聫
     */
    formatFileSize: function(bytes, decimals = 2) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    },
    
    /**
     * 忙路卤忙聥路猫麓聺氓炉鹿猫卤隆
     * @param {*} obj - 猫娄聛忙聥路猫麓聺莽職聞氓炉鹿猫卤隆
     * @returns {*} 忙聥路猫麓聺氓聬聨莽職聞氓炉鹿猫卤隆
     */
    deepClone: function(obj) {
        if (obj === null || typeof obj !== 'object') return obj;
        if (obj instanceof Date) return new Date(obj.getTime());
        if (obj instanceof Array) return obj.map(item => this.deepClone(item));
        
        const clonedObj = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                clonedObj[key] = this.deepClone(obj[key]);
            }
        }
        return clonedObj;
    },
    
    /**
     * 氓聬聢氓鹿露氓炉鹿猫卤隆
     * @param {Object} target - 莽聸庐忙聽聡氓炉鹿猫卤隆
     * @param {...Object} sources - 忙潞聬氓炉鹿猫卤隆
     * @returns {Object} 氓聬聢氓鹿露氓聬聨莽職聞氓炉鹿猫卤隆
     */
    mergeObjects: function(target, ...sources) {
        if (!sources.length) return target;
        const source = sources.shift();
        
        if (target instanceof Object && source instanceof Object) {
            for (const key in source) {
                if (source.hasOwnProperty(key)) {
                    if (source[key] instanceof Object) {
                        if (!target[key]) Object.assign(target, { [key]: {} });
                        this.mergeObjects(target[key], source[key]);
                    } else {
                        Object.assign(target, { [key]: source[key] });
                    }
                }
            }
        }
        
        return this.mergeObjects(target, ...sources);
    },
    
    /**
     * 茅陋聦猫炉聛茅聜庐莽庐卤忙聽录氓录聫
     * @param {string} email - 茅聜庐莽庐卤氓聹掳氓聺聙
     * @returns {boolean} 忙聵炉氓聬娄忙聹聣忙聲聢
     */
    isValidEmail: function(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    },
    
    /**
     * 茅陋聦猫炉聛URL忙聽录氓录聫
     * @param {string} url - URL氓聹掳氓聺聙
     * @returns {boolean} 忙聵炉氓聬娄忙聹聣忙聲聢
     */
    isValidUrl: function(url) {
        try {
            new URL(url);
            return true;
        } catch (error) {
            return false;
        }
    },
    
    /**
     * 忙聢陋忙聳颅忙聳聡忙聹卢
     * @param {string} text - 猫娄聛忙聢陋忙聳颅莽職聞忙聳聡忙聹卢
     * @param {number} maxLength - 忙聹聙氓陇搂茅聲驴氓潞娄
     * @param {string} suffix - 氓聬聨莽录聙
     * @returns {string} 忙聢陋忙聳颅氓聬聨莽職聞忙聳聡忙聹卢
     */
    truncateText: function(text, maxLength = 100, suffix = '...') {
        if (!text || typeof text !== 'string') return '';
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength - suffix.length) + suffix;
    },
    
    /**
     * HTML猫陆卢盲鹿聣
     * @param {string} str - 猫娄聛猫陆卢盲鹿聣莽職聞氓颅聴莽卢娄盲赂虏
     * @returns {string} 猫陆卢盲鹿聣氓聬聨莽職聞氓颅聴莽卢娄盲赂虏
     */
    escapeHtml: function(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    },
    
    /**
     * HTML猫搂拢莽聽聛
     * @param {string} str - 猫娄聛猫搂拢莽聽聛莽職聞氓颅聴莽卢娄盲赂虏
     * @returns {string} 猫搂拢莽聽聛氓聬聨莽職聞氓颅聴莽卢娄盲赂虏
     */
    unescapeHtml: function(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.innerHTML = str;
        return div.textContent || div.innerText || '';
    },
    
    /**
     * 莽聰聼忙聢聬茅職聫忙聹潞茅垄聹猫聣虏
     * @param {boolean} alpha - 忙聵炉氓聬娄氓聦聟氓聬芦茅聙聫忙聵聨氓潞娄
     * @returns {string} 茅垄聹猫聣虏氓聙录
     */
    generateRandomColor: function(alpha = false) {
        const r = Math.floor(Math.random() * 255);
        const g = Math.floor(Math.random() * 255);
        const b = Math.floor(Math.random() * 255);
        
        if (alpha) {
            const a = Math.random().toFixed(2);
            return `rgba(${r}, ${g}, ${b}, ${a})`;
        }
        
        return `rgb(${r}, ${g}, ${b})`;
    },
    
    /**
     * 猫聨路氓聫聳忙碌聫猫搂聢氓聶篓猫炉颅猫篓聙
     * @returns {string} 猫炉颅猫篓聙盲禄拢莽聽聛
     */
    getBrowserLanguage: function() {
        return navigator.language || navigator.userLanguage || 'zh-CN';
    },
    
    /**
     * 猫聨路氓聫聳猫庐戮氓陇聡盲驴隆忙聛炉
     * @returns {Object} 猫庐戮氓陇聡盲驴隆忙聛炉
     */
    getDeviceInfo: function() {
        return {
            isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
            isTablet: /iPad|Android(?!.*Mobile)/i.test(navigator.userAgent),
            isDesktop: !/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
            browser: this.getBrowserName(),
            os: this.getOsName(),
            screen: {
                width: window.screen.width,
                height: window.screen.height,
                pixelRatio: window.devicePixelRatio
            },
            userAgent: navigator.userAgent
        };
    },
    
    /**
     * 猫聨路氓聫聳忙碌聫猫搂聢氓聶篓氓聬聧莽搂掳
     * @returns {string} 忙碌聫猫搂聢氓聶篓氓聬聧莽搂掳
     */
    getBrowserName: function() {
        const userAgent = navigator.userAgent;
        if (userAgent.includes('Firefox')) return 'Firefox';
        if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) return 'Chrome';
        if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) return 'Safari';
        if (userAgent.includes('Edg')) return 'Edge';
        if (userAgent.includes('MSIE') || userAgent.includes('Trident/')) return 'Internet Explorer';
        return 'Unknown';
    },
    
    /**
     * 猫聨路氓聫聳忙聯聧盲陆聹莽鲁禄莽禄聼氓聬聧莽搂掳
     * @returns {string} 忙聯聧盲陆聹莽鲁禄莽禄聼氓聬聧莽搂掳
     */
    getOsName: function() {
        const userAgent = navigator.userAgent;
        if (userAgent.includes('Windows')) return 'Windows';
        if (userAgent.includes('Macintosh')) return 'macOS';
        if (userAgent.includes('Linux')) return 'Linux';
        if (userAgent.includes('Android')) return 'Android';
        if (userAgent.includes('iPhone') || userAgent.includes('iPad') || userAgent.includes('iPod')) return 'iOS';
        return 'Unknown';
    },
    
    /**
     * 氓鹿鲁忙禄聭忙禄職氓聤篓氓聢掳氓聟聝莽麓聽
     * @param {HTMLElement} element - 莽聸庐忙聽聡氓聟聝莽麓聽
     * @param {Object} options - 忙禄職氓聤篓茅聙聣茅隆鹿
     */
    scrollToElement: function(element, options = {}) {
        const { behavior = 'smooth', block = 'top', inline = 'nearest' } = options;
        
        if (element && element.scrollIntoView) {
            element.scrollIntoView({ behavior, block, inline });
        }
    },
    
    /**
     * 忙拢聙忙聼楼氓聟聝莽麓聽忙聵炉氓聬娄氓聹篓氓聫炉猫搂聠氓聦潞氓聼聼氓聠聟
     * @param {HTMLElement} element - 猫娄聛忙拢聙忙聼楼莽職聞氓聟聝莽麓聽
     * @returns {boolean} 忙聵炉氓聬娄氓聹篓氓聫炉猫搂聠氓聦潞氓聼聼氓聠聟
     */
    isElementInViewport: function(element) {
        if (!element) return false;
        
        const rect = element.getBoundingClientRect();
        return (
            rect.top >= 0 &&
            rect.left >= 0 &&
            rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
            rect.right <= (window.innerWidth || document.documentElement.clientWidth)
        );
    },
    
    /**
     * 盲赂聥猫陆陆忙聳聡盲禄露
     * @param {string} url - 忙聳聡盲禄露URL
     * @param {string} filename - 忙聳聡盲禄露氓聬聧
     */
    downloadFile: function(url, filename) {
        const link = document.createElement('a');
        link.href = url;
        link.download = filename || 'download';
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    },
    
    /**
     * 氓掳聠鏁版嵁氓炉录氓聡潞盲赂潞JSON忙聳聡盲禄露
     * @param {*} data - 猫娄聛氓炉录氓聡潞莽職聞鏁版嵁
     * @param {string} filename - 忙聳聡盲禄露氓聬聧
     */
    exportToJson: function(data, filename = 'data.json') {
        const jsonStr = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        this.downloadFile(url, filename);
        setTimeout(() => URL.revokeObjectURL(url), 100);
    },
    
    /**
     * 盲禄聨JSON忙聳聡盲禄露氓炉录氓聟楼鏁版嵁
     * @param {Function} callback - 氓聸聻猫掳聝氓聡陆忙聲掳
     */
    importFromJson: function(callback) {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        input.onchange = function(event) {
            const file = event.target.files[0];
            if (!file) return;
            
            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    const data = JSON.parse(e.target.result);
                    callback(null, data);
                } catch (error) {
                    callback(error, null);
                }
            };
            reader.readAsText(file);
        };
        
        input.click();
    },
    
    /**
     * 氓陇聧氓聢露忙聳聡忙聹卢氓聢掳氓聣陋猫麓麓忙聺驴
     * @param {string} text - 猫娄聛氓陇聧氓聢露莽職聞忙聳聡忙聹卢
     * @returns {Promise<boolean>} 忙聵炉氓聬娄氓陇聧氓聢露忙聢聬氓聤聼
     */
    copyToClipboard: async function(text) {
        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(text);
                return true;
            } else {
                // 氓聸聻茅聙聙忙聳鹿忙鲁聲
                const textArea = document.createElement('textarea');
                textArea.value = text;
                textArea.style.position = 'fixed';
                textArea.style.left = '-999999px';
                textArea.style.top = '-999999px';
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                
                try {
                    document.execCommand('copy');
                    return true;
                } catch (error) {
                    console.error('[JEV][utils] 氓陇聧氓聢露氓陇卤猫麓楼:', error);
                    return false;
                } finally {
                    document.body.removeChild(textArea);
                }
            }
        } catch (error) {
            console.error('[JEV][utils] 氓陇聧氓聢露氓陇卤猫麓楼:', error);
            return false;
        }
    },
    
    /**
     * 茅聵虏忙聤聳莽職聞氓禄露猫驴聼忙聣搂猫隆聦
     * @param {Function} callback - 氓聸聻猫掳聝氓聡陆忙聲掳
     * @param {number} delay - 氓禄露猫驴聼忙聴露茅聴麓
     * @returns {Promise} Promise氓炉鹿猫卤隆
     */
    delay: function(callback, delay) {
        return new Promise((resolve) => {
            setTimeout(() => {
                if (typeof callback === 'function') {
                    const result = callback();
                    resolve(result);
                } else {
                    resolve();
                }
            }, delay);
        });
    },
    
    /**
     * 忙聣鹿茅聡聫忙聣搂猫隆聦氓录聜忙颅楼氓聡陆忙聲掳
     * @param {Array<Function>} functions - 氓录聜忙颅楼氓聡陆忙聲掳忙聲掳莽禄聞
     * @param {number} limit - 氓鹿露氓聫聭茅聶聬氓聢露
     * @returns {Promise<Array>} 莽禄聯忙聻聹忙聲掳莽禄聞
     */
    asyncParallel: async function(functions, limit = 5) {
        const results = [];
        const executing = new Set();
        const queue = [...functions];
        
        async function execute() {
            if (queue.length === 0) return;
            
            const func = queue.shift();
            const promise = Promise.resolve().then(() => func());
            
            results.push(promise);
            executing.add(promise);
            
            const clean = () => executing.delete(promise);
            promise.then(clean).catch(clean);
            
            if (executing.size >= limit) {
                await Promise.race(executing);
            }
            
            await execute();
        }
        
        await execute();
        return Promise.all(results);
    },
    
    /**
     * 氓戮陋莽聨炉忙聣搂猫隆聦氓录聜忙颅楼氓聡陆忙聲掳莽聸麓氓聢掳忙聺隆盲禄露忙禄隆猫露鲁
     * @param {Function} action - 猫娄聛忙聣搂猫隆聦莽職聞氓录聜忙颅楼氓聡陆忙聲掳
     * @param {Function} condition - 忙聺隆盲禄露氓聡陆忙聲掳
     * @param {Object} options - 茅聙聣茅隆鹿
     * @returns {Promise} Promise氓炉鹿猫卤隆
     */
    asyncUntil: async function(action, condition, options = {}) {
        const { interval = 1000, timeout = 30000, maxAttempts = 10 } = options;
        let attempts = 0;
        const startTime = Date.now();
        
        async function loop() {
            // 忙拢聙忙聼楼猫露聟忙聴露
            if (Date.now() - startTime > timeout) {
                throw new Error('氓录聜忙颅楼忙聯聧盲陆聹猫露聟忙聴露');
            }
            
            // 忙拢聙忙聼楼忙聹聙氓陇搂氓掳聺猫炉聲忙卢隆忙聲掳
            if (maxAttempts && attempts >= maxAttempts) {
                throw new Error(`氓路虏猫戮戮氓聢掳忙聹聙氓陇搂氓掳聺猫炉聲忙卢隆忙聲掳 ${maxAttempts}`);
            }
            
            attempts++;
            
            // 忙聣搂猫隆聦氓聤篓盲陆聹
            const result = await action(attempts);
            
            // 忙拢聙忙聼楼忙聺隆盲禄露
            const shouldContinue = await condition(result, attempts);
            
            if (shouldContinue) {
                await this.delay(() => {}, interval);
                return loop();
            }
            
            return result;
        }
        
        return loop();
    },
    
    /**
     * 猫聨路氓聫聳URL氓聫聜忙聲掳
     * @param {string} url - URL氓颅聴莽卢娄盲赂虏茂录聢氓聫炉茅聙聣茂录聦茅禄聵猫庐陇盲赂潞氓陆聯氓聣聧URL茂录聣
     * @returns {Object} 氓聫聜忙聲掳氓炉鹿猫卤隆
     */
    getUrlParams: function(url = window.location.href) {
        const params = {};
        const searchParams = new URL(url).searchParams;
        
        for (const [key, value] of searchParams.entries()) {
            params[key] = value;
        }
        
        return params;
    },
    
    /**
     * 璁剧疆URL氓聫聜忙聲掳
     * @param {Object} params - 猫娄聛璁剧疆莽職聞氓聫聜忙聲掳
     * @param {string} url - URL氓颅聴莽卢娄盲赂虏茂录聢氓聫炉茅聙聣茂录聦茅禄聵猫庐陇盲赂潞氓陆聯氓聣聧URL茂录聣
     * @returns {string} 忙聳掳莽職聞URL
     */
    setUrlParams: function(params, url = window.location.href) {
        const urlObj = new URL(url);
        
        for (const [key, value] of Object.entries(params)) {
            urlObj.searchParams.set(key, value);
        }
        
        return urlObj.toString();
    },
    
    /**
     * 莽搂禄茅聶陇URL氓聫聜忙聲掳
     * @param {string|Array} keys - 猫娄聛莽搂禄茅聶陇莽職聞氓聫聜忙聲掳氓聬聧
     * @param {string} url - URL氓颅聴莽卢娄盲赂虏茂录聢氓聫炉茅聙聣茂录聦茅禄聵猫庐陇盲赂潞氓陆聯氓聣聧URL茂录聣
     * @returns {string} 忙聳掳莽職聞URL
     */
    removeUrlParams: function(keys, url = window.location.href) {
        const urlObj = new URL(url);
        const keyArray = Array.isArray(keys) ? keys : [keys];
        
        keyArray.forEach(key => {
            urlObj.searchParams.delete(key);
        });
        
        return urlObj.toString();
    },
    
    /**
     * 氓聢聸氓禄潞DOM氓聟聝莽麓聽
     * @param {string} tagName - 忙聽聡莽颅戮氓聬聧
     * @param {Object} attributes - 氓卤聻忙聙搂氓炉鹿猫卤隆
     * @param {Array<HTMLElement|string>} children - 氓颅聬氓聟聝莽麓聽
     * @returns {HTMLElement} 氓聢聸氓禄潞莽職聞氓聟聝莽麓聽
     */
    createElement: function(tagName, attributes = {}, children = []) {
        const element = document.createElement(tagName);
        
        // 璁剧疆氓卤聻忙聙搂
        for (const [key, value] of Object.entries(attributes)) {
            if (key === 'className') {
                element.className = value;
            } else if (key === 'style' && typeof value === 'object') {
                Object.assign(element.style, value);
            } else if (key === 'dataset' && typeof value === 'object') {
                Object.assign(element.dataset, value);
            } else if (key === 'events' && typeof value === 'object') {
                for (const [event, handler] of Object.entries(value)) {
                    element.addEventListener(event, handler);
                }
            } else {
                element.setAttribute(key, value);
            }
        }
        
        // 忙路禄氓聤聽氓颅聬氓聟聝莽麓聽
        children.forEach(child => {
            if (typeof child === 'string' || typeof child === 'number') {
                element.appendChild(document.createTextNode(child));
            } else if (child instanceof Node) {
                element.appendChild(child);
            }
        });
        
        return element;
    },
    
    /**
     * 氓庐聣氓聟篓氓聹掳猫搂拢忙聻聬JSON
     * @param {string} jsonStr - JSON氓颅聴莽卢娄盲赂虏
     * @param {*} defaultValue - 茅禄聵猫庐陇氓聙录
     * @returns {*} 猫搂拢忙聻聬氓聬聨莽職聞氓聙录忙聢聳茅禄聵猫庐陇氓聙录
     */
    safeJsonParse: function(jsonStr, defaultValue = null) {
        try {
            return JSON.parse(jsonStr);
        } catch (error) {
            console.error('[JEV][utils] JSON猫搂拢忙聻聬氓陇卤猫麓楼:', error);
            return defaultValue;
        }
    },
    
    /**
     * 忙聣搂猫隆聦氓庐聣氓聟篓莽職聞氓聡陆忙聲掳猫掳聝莽聰篓
     * @param {Function} func - 猫娄聛忙聣搂猫隆聦莽職聞氓聡陆忙聲掳
     * @param {Array} args - 氓聫聜忙聲掳忙聲掳莽禄聞
     * @param {*} defaultValue - 茅禄聵猫庐陇猫驴聰氓聸聻氓聙录
     * @returns {*} 氓聡陆忙聲掳猫驴聰氓聸聻氓聙录忙聢聳茅禄聵猫庐陇氓聙录
     */
    safeCall: function(func, args = [], defaultValue = null) {
        try {
            if (typeof func === 'function') {
                return func(...args);
            }
            return defaultValue;
        } catch (error) {
            console.error('[JEV][utils] 氓聡陆忙聲掳猫掳聝莽聰篓氓陇卤猫麓楼:', error);
            return defaultValue;
        }
    },
    
    /**
     * 猫聨路氓聫聳茅職聫忙聹潞忙聲掳
     * @param {number} min - 忙聹聙氓掳聫氓聙录
     * @param {number} max - 忙聹聙氓陇搂氓聙录
     * @param {boolean} isInteger - 忙聵炉氓聬娄猫驴聰氓聸聻忙聲麓忙聲掳
     * @returns {number} 茅職聫忙聹潞忙聲掳
     */
    getRandomNumber: function(min, max, isInteger = true) {
        const random = Math.random() * (max - min) + min;
        return isInteger ? Math.floor(random) : random;
    },
    
    /**
     * 忙聣聯盲鹿卤忙聲掳莽禄聞
     * @param {Array} array - 猫娄聛忙聣聯盲鹿卤莽職聞忙聲掳莽禄聞
     * @returns {Array} 忙聣聯盲鹿卤氓聬聨莽職聞忙聲掳莽禄聞
     */
    shuffleArray: function(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    },
    
    /**
     * 忙聽录氓录聫氓聦聳忙聴露茅聴麓氓路庐
     * @param {number} seconds - 莽搂聮忙聲掳
     * @returns {string} 忙聽录氓录聫氓聦聳氓聬聨莽職聞忙聴露茅聴麓氓路庐
     */
    formatDuration: function(seconds) {
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        
        let result = '';
        if (days > 0) result += `${days}氓陇漏`;
        if (hours > 0) result += `${hours}氓掳聫忙聴露`;
        if (minutes > 0) result += `${minutes}氓聢聠茅聮聼`;
        if (remainingSeconds > 0) result += `${remainingSeconds}莽搂聮`;
        
        return result || '0莽搂聮';
    }
};

console.log('[JEV][utils] 氓路楼氓聟路氓聡陆忙聲掳忙篓隆氓聺聴氓路虏氓聤聽猫陆陆');