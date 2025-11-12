/* UTF-8 FIXED BY JEV @ 2025-11-09T15:11:17.813Z */
// JEV 氓庐聣氓聟篓忙聨搂氓聢露氓聶篓忙篓隆氓聺聴
// 猫麓聼猫麓拢URL忙聥娄忙聢陋茫聙聛茅聡聧氓庐職氓聬聭茅垄聞茅聵虏茫聙聛iframe茅職聰莽娄禄氓聮聦氓聠聟氓庐鹿忙聧聲猫聨路

console.log('[JEV][SECURITY] 氓庐聣氓聟篓忙聨搂氓聢露氓聶篓氓聤聽猫陆陆盲赂颅...');

/**
 * 氓庐聣氓聟篓忙聨搂氓聢露氓聶篓氓聭陆氓聬聧莽漏潞茅聴麓
 * @namespace window.JEV_SECURITY
 */
window.JEV_SECURITY = {
    // 莽聸庐忙聽聡忙碌聥猫炉聲茅隆碌茅聺垄URL
    TARGET_TEST_URL: 'https://app.daojiemarketing.com:8000/test_auto_task.html',
    LOCAL_TEST_URL: 'http://localhost:8000/test_auto_task.html',
    
    // 氓庐聣氓聟篓莽聤露忙聙聛
    state: {
        isIsolated: false,
        isLinked: false,
        capturedContent: null,
        originalLocation: null,
        authToken: null,
        blockedRedirects: 0,
        securityLog: []
    },
    
    // iframe氓录聲莽聰篓
    isolatedIframe: null,
    
    /**
     * 氓聢聺氓搂聥氓聦聳氓庐聣氓聟篓忙聨搂氓聢露氓聶篓
     */
    init: function() {
        console.log('[JEV][SECURITY] 氓聢聺氓搂聥氓聦聳氓庐聣氓聟篓忙聨搂氓聢露氓聶篓');
        
        // 淇濆瓨氓聨聼氓搂聥盲陆聧莽陆庐
        this.state.originalLocation = window.location.href;
        
        // 忙鲁篓氓聠聦茅聡聧氓庐職氓聬聭茅垄聞茅聵虏
        this.registerRedirectPrevention();
        
        // 忙鲁篓氓聠聦莽陋聴氓聫拢忙聣聯氓录聙忙聥娄忙聢陋
        this.registerWindowOpenInterception();
        
        // 忙鲁篓氓聠聦氓聠聟氓庐鹿忙聧聲猫聨路
        this.registerContentCapture();
        
        // 忙拢聙忙聼楼忙聵炉氓聬娄茅聹聙猫娄聛茅職聰莽娄禄
        if (this.shouldIsolateCurrentPage()) {
            this.isolatePage();
        }
        
        console.log('[JEV][SECURITY] 氓庐聣氓聟篓忙聨搂氓聢露氓聶篓氓聢聺氓搂聥氓聦聳氓庐聦忙聢聬');
    },
    
    /**
     * 忙拢聙忙聼楼忙聵炉氓聬娄氓潞聰猫炉楼茅職聰莽娄禄氓陆聯氓聣聧茅隆碌茅聺垄
     */
    shouldIsolateCurrentPage: function() {
        const currentUrl = window.location.href;
        return currentUrl.includes('test_auto_task.html');
    },
    
    /**
     * 忙鲁篓氓聠聦茅聡聧氓庐職氓聬聭茅垄聞茅聵虏忙聹潞氓聢露
     */
    registerRedirectPrevention: function() {
        console.log('[JEV][SECURITY] 忙鲁篓氓聠聦茅聡聧氓庐職氓聬聭茅垄聞茅聵虏忙聹潞氓聢露');
        
        // 忙聥娄忙聢陋window.location忙聰鹿氓聫聵
        const originalLocation = Object.getOwnPropertyDescriptor(window, 'location');
        Object.defineProperty(window, 'location', {
            set: (value) => {
                const url = typeof value === 'string' ? value : value.href;
                if (this.isRestrictedRedirect(url)) {
                    this.blockRedirect(url, 'window.location');
                    return;
                }
                originalLocation.set.call(window, value);
            },
            get: () => originalLocation.get.call(window)
        });
        
        // 忙聥娄忙聢陋location.href
        const originalHref = Object.getOwnPropertyDescriptor(window.location, 'href');
        Object.defineProperty(window.location, 'href', {
            set: (value) => {
                if (this.isRestrictedRedirect(value)) {
                    this.blockRedirect(value, 'location.href');
                    return;
                }
                originalHref.set.call(window.location, value);
            },
            get: () => originalHref.get.call(window.location)
        });
        
        // 忙聥娄忙聢陋location.replace
        const originalReplace = window.location.replace;
        window.location.replace = function(url) {
            if (window.JEV_SECURITY.isRestrictedRedirect(url)) {
                window.JEV_SECURITY.blockRedirect(url, 'location.replace');
                return;
            }
            originalReplace.call(window.location, url);
        };
        
        // 忙聥娄忙聢陋meta refresh忙聽聡莽颅戮
        this.interceptMetaRefresh();
        
        // 莽聸聭氓聬卢DOM氓聫聵氓聦聳盲禄楼忙聧聲猫聨路忙聳掳莽職聞meta忙聽聡莽颅戮
        this.observeMetaTags();
    },
    
    /**
     * 忙拢聙忙聼楼忙聵炉氓聬娄盲赂潞氓聫聴茅聶聬茅聡聧氓庐職氓聬聭
     */
    isRestrictedRedirect: function(url) {
        return url === this.TARGET_TEST_URL || url === this.LOCAL_TEST_URL;
    },
    
    /**
     * 茅聵禄忙颅垄茅聡聧氓庐職氓聬聭
     */
    blockRedirect: function(url, source) {
        this.state.blockedRedirects++;
        this.logSecurityEvent('REDIRECT_BLOCKED', {
            url: url,
            source: source,
            timestamp: new Date().toISOString()
        });
        console.warn(`[JEV][SECURITY] 氓路虏茅聵禄忙颅垄茅聡聧氓庐職氓聬聭氓聢掳氓聫聴茅聶聬URL: ${url} (忙聺楼忙潞聬: ${source})`);
        
        // 忙聵戮莽陇潞猫颅娄氓聭聤茅聙職莽聼楼
        if (window.JEV_UI && window.JEV_UI.showError) {
            window.JEV_UI.showError(`氓路虏茅聵禄忙颅垄猫聡陋氓聤篓氓炉录猫聢陋氓聢掳忙碌聥猫炉聲茅隆碌茅聺垄`);
        }
    },
    
    /**
     * 忙聥娄忙聢陋meta refresh忙聽聡莽颅戮
     */
    interceptMetaRefresh: function() {
        const metaTags = document.querySelectorAll('meta[http-equiv="refresh"]');
        metaTags.forEach(tag => {
            const content = tag.getAttribute('content');
            if (content) {
                const match = content.match(/\d+;\s*url=([^\s]+)/i);
                if (match && match[1]) {
                    const url = match[1];
                    if (this.isRestrictedRedirect(url)) {
                        this.blockRedirect(url, 'meta refresh');
                        tag.remove();
                    }
                }
            }
        });
    },
    
    /**
     * 莽聸聭氓聬卢meta忙聽聡莽颅戮氓聫聵氓聦聳
     */
    observeMetaTags: function() {
        const observer = new MutationObserver(mutations => {
            mutations.forEach(mutation => {
                mutation.addedNodes.forEach(node => {
                    if (node.tagName === 'META' && node.httpEquiv === 'refresh') {
                        this.interceptMetaRefresh();
                    }
                });
            });
        });
        
        observer.observe(document.head, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['http-equiv', 'content']
        });
    },
    
    /**
     * 忙鲁篓氓聠聦莽陋聴氓聫拢忙聣聯氓录聙忙聥娄忙聢陋
     */
    registerWindowOpenInterception: function() {
        console.log('[JEV][SECURITY] 忙鲁篓氓聠聦莽陋聴氓聫拢忙聣聯氓录聙忙聥娄忙聢陋');
        
        const originalOpen = window.open;
        window.open = function(url, name, features) {
            if (window.JEV_SECURITY.isRestrictedRedirect(url)) {
                window.JEV_SECURITY.blockRedirect(url, 'window.open');
                return null;
            }
            return originalOpen.call(window, url, name, features);
        };
        
        // 忙聥娄忙聢陋a忙聽聡莽颅戮鐐瑰嚮
        document.addEventListener('click', this.interceptLinkClick.bind(this), true);
    },
    
    /**
     * 忙聥娄忙聢陋茅聯戮忙聨楼鐐瑰嚮
     */
    interceptLinkClick: function(event) {
        const target = event.target.closest('a');
        if (target && target.href) {
            if (this.isRestrictedRedirect(target.href)) {
                event.preventDefault();
                event.stopPropagation();
                this.blockRedirect(target.href, 'link click');
            }
        }
    },
    
    /**
     * 茅職聰莽娄禄茅隆碌茅聺垄氓聢掳iframe盲赂颅
     */
    isolatePage: function() {
        if (this.state.isIsolated) {
            console.warn('[JEV][SECURITY] 茅隆碌茅聺垄氓路虏莽禄聫猫垄芦茅職聰莽娄禄');
            return;
        }
        
        console.log('[JEV][SECURITY] 氓录聙氓搂聥茅隆碌茅聺垄茅職聰莽娄禄');
        
        // 氓聢聸氓禄潞茅職聰莽娄禄iframe
        this.isolatedIframe = document.createElement('iframe');
        this.isolatedIframe.id = 'jev-isolation-frame';
        this.isolatedIframe.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            border: none;
            z-index: 9998;
            background: transparent;
        `;
        
        // 璁剧疆sandbox氓卤聻忙聙搂 - 氓聟聛猫庐赂猫聞職忙聹卢忙聣搂猫隆聦盲陆聠茅聶聬氓聢露氓聟露盲禄聳忙聺聝茅聶聬
        this.isolatedIframe.sandbox.add('allow-scripts');
        this.isolatedIframe.sandbox.add('allow-same-origin');
        this.isolatedIframe.sandbox.add('allow-forms');
        this.isolatedIframe.sandbox.add('allow-popups-to-escape-sandbox');
        
        // 氓聤聽猫陆陆氓聨聼氓搂聥氓聠聟氓庐鹿
        this.isolatedIframe.srcdoc = document.documentElement.outerHTML;
        
        // 淇濆瓨氓陆聯氓聣聧氓聠聟氓庐鹿
        this.state.capturedContent = document.documentElement.outerHTML;
        
        // 忙赂聟莽漏潞氓陆聯氓聣聧茅隆碌茅聺垄氓鹿露忙路禄氓聤聽iframe
        document.body.innerHTML = '';
        document.body.appendChild(this.isolatedIframe);
        
        // 璁剧疆茅職聰莽娄禄莽聤露忙聙聛
        this.state.isIsolated = true;
        this.state.isLinked = true;
        
        this.logSecurityEvent('PAGE_ISOLATED', {
            timestamp: new Date().toISOString(),
            originalUrl: this.state.originalLocation
        });
        
        console.log('[JEV][SECURITY] 茅隆碌茅聺垄茅職聰莽娄禄氓庐聦忙聢聬');
    },
    
    /**
     * 忙鲁篓氓聠聦氓聠聟氓庐鹿忙聧聲猫聨路
     */
    registerContentCapture: function() {
        console.log('[JEV][SECURITY] 忙鲁篓氓聠聦氓聠聟氓庐鹿忙聧聲猫聨路忙聹潞氓聢露');
        
        // 忙聧聲猫聨路茅隆碌茅聺垄氓聠聟氓庐鹿氓聫聵氓聦聳
        const observer = new MutationObserver(mutations => {
            if (!this.state.isIsolated || !this.state.isLinked) return;
            
            const changes = this.processDomMutations(mutations);
            if (changes.length > 0) {
                this.processCapturedContent(changes);
            }
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            characterData: true
        });
        
        // 忙聧聲猫聨路莽聰篓忙聢路盲潞聥盲禄露
        this.captureUserEvents();
    },
    
    /**
     * 氓陇聞莽聬聠DOM氓聫聵氓聦聳
     */
    processDomMutations: function(mutations) {
        const changes = [];
        
        mutations.forEach(mutation => {
            changes.push({
                type: mutation.type,
                target: this.getDomPath(mutation.target),
                added: mutation.addedNodes.length > 0,
                removed: mutation.removedNodes.length > 0,
                timestamp: Date.now()
            });
        });
        
        return changes;
    },
    
    /**
     * 猫聨路氓聫聳DOM猫路炉氓戮聞
     */
    getDomPath: function(element) {
        if (!element) return '';
        
        const path = [];
        let node = element;
        
        while (node && node.nodeType === Node.ELEMENT_NODE) {
            let selector = node.tagName.toLowerCase();
            
            if (node.id) {
                selector += `#${node.id}`;
                path.unshift(selector);
                break;
            } else if (node.className && typeof node.className === 'string') {
                selector += `.${node.className.trim().replace(/\s+/g, '.')}`;
            }
            
            path.unshift(selector);
            node = node.parentNode;
        }
        
        return path.join(' > ');
    },
    
    /**
     * 氓陇聞莽聬聠忙聧聲猫聨路莽職聞氓聠聟氓庐鹿
     */
    processCapturedContent: function(changes) {
        // 猫驴聶茅聡聦氓聫炉盲禄楼忙路禄氓聤聽氓聠聟氓庐鹿氓陇聞莽聬聠茅聙禄猫戮聭
        console.log('[JEV][SECURITY] 氓陇聞莽聬聠忙聧聲猫聨路莽職聞氓聠聟氓庐鹿氓聫聵氓聦聳:', changes);
        
        // 茅聙職莽聼楼忙聫聮盲禄露莽聤露忙聙聛鏇存柊
        if (window.JEV_UI) {
            // 氓聫炉盲禄楼氓聹篓猫驴聶茅聡聦鏇存柊忙聫聮盲禄露莽聤露忙聙聛
        }
    },
    
    /**
     * 忙聧聲猫聨路莽聰篓忙聢路盲潞聥盲禄露
     */
    captureUserEvents: function() {
        const events = ['click', 'keydown', 'keypress', 'keyup', 'mousedown', 'mouseup', 'input'];
        
        events.forEach(eventType => {
            document.addEventListener(eventType, (e) => {
                if (!this.state.isIsolated || !this.state.isLinked) return;
                
                const eventData = {
                    type: eventType,
                    target: this.getDomPath(e.target),
                    timestamp: Date.now()
                };
                
                // 忙聽鹿忙聧庐盲潞聥盲禄露莽卤禄氓聻聥忙路禄氓聤聽莽聣鹿氓庐職鏁版嵁
                if (e.type === 'click') {
                    eventData.x = e.clientX;
                    eventData.y = e.clientY;
                } else if (e.type === 'keydown' || e.type === 'keypress' || e.type === 'keyup') {
                    eventData.key = e.key;
                    eventData.code = e.code;
                } else if (e.type === 'input') {
                    const target = e.target;
                    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
                        eventData.value = target.value.substring(0, 100); // 氓聫陋忙聧聲猫聨路茅聝篓氓聢聠氓聠聟氓庐鹿盲禄楼盲驴聺忙聤陇茅職聬莽搂聛
                    }
                }
                
                this.logSecurityEvent('USER_EVENT', eventData);
                
                // 氓聫炉盲禄楼氓聹篓猫驴聶茅聡聦忙路禄氓聤聽盲潞聥盲禄露氓陇聞莽聬聠茅聙禄猫戮聭
            }, true);
        });
    },
    
    /**
     * 氓庐聻莽聨掳"氓聫聳忙露聢茅聯戮忙聨楼"氓聤聼猫聝陆
     */
    cancelLink: function() {
        console.log('[JEV][SECURITY] 忙聣搂猫隆聦氓聫聳忙露聢茅聯戮忙聨楼忙聯聧盲陆聹');
        
        // 忙赂聟茅聶陇璁よ瘉盲禄陇莽聣聦
        this.clearAuthToken();
        
        // 茅聡聧莽陆庐茅職聰莽娄禄莽聤露忙聙聛
        if (this.state.isIsolated) {
            this.removeIsolation();
        }
        
        // 茅聡聧莽陆庐莽聤露忙聙聛
        this.state.isLinked = false;
        this.state.capturedContent = null;
        
        this.logSecurityEvent('LINK_CANCELLED', {
            timestamp: new Date().toISOString()
        });
        
        // 忙聵戮莽陇潞莽隆庐猫庐陇忙露聢忙聛炉
        if (window.JEV_UI && window.JEV_UI.showError) {
            window.JEV_UI.showError('氓路虏忙聢聬氓聤聼忙聳颅氓录聙盲赂聨忙碌聥猫炉聲茅隆碌茅聺垄莽職聞猫驴聻忙聨楼', 'success');
        }
        
        return true;
    },
    
    /**
     * 莽搂禄茅聶陇茅職聰莽娄禄
     */
    removeIsolation: function() {
        if (this.isolatedIframe && this.isolatedIframe.parentNode) {
            this.isolatedIframe.parentNode.removeChild(this.isolatedIframe);
            this.isolatedIframe = null;
        }
        
        this.state.isIsolated = false;
        
        // 茅聡聧忙聳掳氓聤聽猫陆陆氓聨聼氓搂聥氓聠聟氓庐鹿忙聢聳忙聵戮莽陇潞忙聫聬莽陇潞
        document.body.innerHTML = `
            <div style="
                display: flex;
                justify-content: center;
                align-items: center;
                height: 100vh;
                font-family: Arial, sans-serif;
                color: #00ff99;
                background: #0c120f;
                text-align: center;
                padding: 20px;
            ">
                <div>
                    <h2>猫驴聻忙聨楼氓路虏忙聳颅氓录聙</h2>
                    <p>忙聜篓氓路虏忙聢聬氓聤聼氓聫聳忙露聢盲赂聨忙碌聥猫炉聲茅隆碌茅聺垄莽職聞茅聯戮忙聨楼</p>
                    <button id="jev-reload-btn" style="
                        margin-top: 20px;
                        padding: 10px 20px;
                        background: #00ff99;
                        color: #0c120f;
                        border: none;
                        border-radius: 5px;
                        cursor: pointer;
                        font-weight: bold;
                    ">茅聡聧忙聳掳氓聤聽猫陆陆茅隆碌茅聺垄</button>
                </div>
            </div>
        `;
        
        // 忙路禄氓聤聽茅聡聧忙聳掳氓聤聽猫陆陆忙聦聣茅聮庐盲潞聥盲禄露
        document.getElementById('jev-reload-btn').addEventListener('click', () => {
            window.location.reload();
        });
    },
    
    /**
     * 忙赂聟茅聶陇璁よ瘉盲禄陇莽聣聦
     */
    clearAuthToken: function() {
        // 忙赂聟茅聶陇localStorage盲赂颅莽職聞盲禄陇莽聣聦
        try {
            localStorage.removeItem('jev_auth_token');
            sessionStorage.removeItem('jev_auth_token');
            this.state.authToken = null;
        } catch (error) {
            console.error('[JEV][SECURITY] 忙赂聟茅聶陇璁よ瘉盲禄陇莽聣聦氓陇卤猫麓楼:', error);
        }
    },
    
    /**
     * 猫庐掳氓陆聲氓庐聣氓聟篓盲潞聥盲禄露
     */
    logSecurityEvent: function(eventType, details) {
        const logEntry = {
            eventType,
            details,
            timestamp: new Date().toISOString()
        };
        
        this.state.securityLog.push(logEntry);
        
        // 茅聶聬氓聢露忙聴楼氓驴聴氓陇搂氓掳聫
        if (this.state.securityLog.length > 100) {
            this.state.securityLog.shift();
        }
        
        console.log(`[JEV][SECURITY][${eventType}]`, details);
    },
    
    /**
     * 猫聨路氓聫聳氓庐聣氓聟篓莽聤露忙聙聛
     */
    getSecurityStatus: function() {
        return {
            isIsolated: this.state.isIsolated,
            isLinked: this.state.isLinked,
            blockedRedirects: this.state.blockedRedirects,
            securityEvents: this.state.securityLog.length
        };
    },
    
    /**
     * 忙路禄氓聤聽"氓聫聳忙露聢茅聯戮忙聨楼"忙聦聣茅聮庐氓聢掳UI
     */
    addCancelLinkButton: function() {
        if (!window.JEV_UI || !window.JEV_UI.elements || !window.JEV_UI.elements.container) {
            console.warn('[JEV][SECURITY] UI氓庐鹿氓聶篓忙聹陋忙聣戮氓聢掳茂录聦忙聴聽忙鲁聲忙路禄氓聤聽氓聫聳忙露聢茅聯戮忙聨楼忙聦聣茅聮庐');
            return;
        }
        
        // 忙拢聙忙聼楼忙聦聣茅聮庐忙聵炉氓聬娄氓路虏氓颅聵氓聹篓
        if (document.getElementById('jev-cancel-link-btn')) {
            return;
        }
        
        // 氓聢聸氓禄潞忙聦聣茅聮庐
        const cancelBtn = document.createElement('button');
        cancelBtn.id = 'jev-cancel-link-btn';
        cancelBtn.textContent = '氓聫聳忙露聢茅聯戮忙聨楼';
        cancelBtn.style.cssText = `
            padding: 8px 16px;
            margin-right: 10px;
            background: #ff6b6b;
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 12px;
            font-weight: 500;
            transition: background 0.2s;
        `;
        
        // 忙路禄氓聤聽忙聜卢氓聛聹忙聲聢忙聻聹
        cancelBtn.onmouseover = function() {
            this.style.background = '#ff5252';
        };
        
        cancelBtn.onmouseout = function() {
            this.style.background = '#ff6b6b';
        };
        
        // 忙路禄氓聤聽鐐瑰嚮盲潞聥盲禄露
        cancelBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.cancelLink();
        });
        
        // 忙路禄氓聤聽氓聢掳UI氓庐鹿氓聶篓莽職聞茅聙聜氓陆聯盲陆聧莽陆庐茂录聢盲戮聥氓娄聜氓陇麓茅聝篓忙聢聳氓潞聲茅聝篓茂录聣
        if (window.JEV_UI.elements.footer) {
            window.JEV_UI.elements.footer.insertBefore(cancelBtn, window.JEV_UI.elements.footer.firstChild);
        } else if (window.JEV_UI.elements.header) {
            const controls = window.JEV_UI.elements.header.querySelector('#jev-controls');
            if (controls) {
                controls.insertBefore(cancelBtn, controls.firstChild);
            }
        }
    }
};

// 氓聢聺氓搂聥氓聦聳氓庐聣氓聟篓忙聨搂氓聢露氓聶篓
if (typeof window !== 'undefined') {
    // 莽隆庐盲驴聺氓聹篓DOM氓聤聽猫陆陆氓庐聦忙聢聬氓聬聨氓聢聺氓搂聥氓聦聳
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            window.JEV_SECURITY.init();
        });
    } else {
        window.JEV_SECURITY.init();
    }
}
