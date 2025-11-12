/* UTF-8 FIXED BY JEV @ 2025-11-09T15:11:17.585Z */
/**
 * JEV L5+ 脗路 猫聛聤氓陇漏茅聴颅莽聨炉茅聸聠忙聢聬氓聶篓
 * 猫麓聼猫麓拢忙驴聙忙麓禄氓聮聦猫驴聻忙聨楼忙聣聙忙聹聣L5+忙篓隆氓聺聴茂录聦氓禄潞莽芦聥氓庐聦忙聲麓莽職聞茅聙職盲驴隆茅聯戮猫路炉
 * DAOJIE 芒聠聮 Translate 芒聠聮 AI 芒聠聮 Bridge 芒聠聮 UI
 */

class ChatLoopIntegrator {
    constructor() {
        // 忙篓隆氓聺聴氓聼潞忙聹卢盲驴隆忙聛炉
        this.moduleId = 'chatLoopIntegrator';
        this.moduleName = '猫聛聤氓陇漏茅聴颅莽聨炉茅聸聠忙聢聬氓聶篓';
        this.version = '1.0.0';
        this.type = 'system';
        
        // 忙篓隆氓聺聴盲戮聺猫碌聳茅聟聧莽陆庐
        this.requiredModules = [
            { id: 'DAOJIECollector', name: 'DAOJIE猫聛聤氓陇漏茅聡聡茅聸聠忙篓隆氓聺聴', type: 'collector' },
            { id: 'realtimeTranslate', name: '氓庐聻忙聴露莽驴禄猫炉聭忙篓隆氓聺聴', type: 'assistant' },
            { id: 'aiAutoReply', name: 'AI猫聡陋氓聤篓氓聸聻氓陇聧忙篓隆氓聺聴', type: 'assistant' },
            { id: 'aiBridge', name: 'AI忙隆楼忙聨楼忙篓隆氓聺聴', type: 'bridge' },
            { id: 'uiDashboard', name: 'UI盲禄陋猫隆篓莽聸聵忙篓隆氓聺聴', type: 'ui' },
            { id: 'watchdog', name: 'Watchdog猫聡陋盲驴庐氓陇聧忙篓隆氓聺聴', type: 'system' }
        ];
        
        // 忙篓隆氓聺聴莽聤露忙聙聛猫路聼猫赂陋
        this.moduleStatus = {};
        this.allModulesLoaded = false;
        this.loopInitialized = false;
        
        // 氓聢聺氓搂聥氓聦聳
        this.init();
    }
    
    /**
     * 氓聢聺氓搂聥氓聦聳茅聸聠忙聢聬氓聶篓
     */
    init() {
        console.log(`[L5][ChatLoopIntegrator] 氓聢聺氓搂聥氓聦聳猫聛聤氓陇漏茅聴颅莽聨炉茅聸聠忙聢聬氓聶篓 v${this.version}`);
        
        // 莽隆庐盲驴聺氓聟篓氓卤聙JEV氓聭陆氓聬聧莽漏潞茅聴麓氓颅聵氓聹篓
        if (!window.JEV) {
            window.JEV = {};
        }
        
        if (!window.JEV.MODULES) {
            window.JEV.MODULES = {};
        }
        
        if (!window.JEV.L5Modules) {
            window.JEV.L5Modules = {};
        }
        
        // 忙鲁篓氓聠聦氓聢掳JEV忙篓隆氓聺聴莽鲁禄莽禄聼
        window.JEV.MODULES[this.moduleId] = this;
        
        // 忙拢聙忙聼楼茅隆碌茅聺垄氓聤聽猫陆陆莽聤露忙聙聛
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.onDocumentReady();
            });
        } else {
            this.onDocumentReady();
        }
    }
    
    /**
     * 忙聳聡忙隆拢氓聤聽猫陆陆氓庐聦忙聢聬氓聬聨忙聣搂猫隆聦
     */
    onDocumentReady() {
        console.log('[L5][ChatLoopIntegrator] 忙聳聡忙隆拢氓聤聽猫陆陆氓庐聦忙聢聬茂录聦氓录聙氓搂聥氓聤聽猫陆陆忙篓隆氓聺聴');
        
        // 氓聤聽猫陆陆忙聣聙茅聹聙莽職聞忙篓隆氓聺聴忙聳聡盲禄露
        this.loadModuleFiles().then(() => {
            console.log('[L5][ChatLoopIntegrator] 忙聣聙忙聹聣忙篓隆氓聺聴忙聳聡盲禄露氓聤聽猫陆陆氓庐聦忙聢聬');
            
            // 莽颅聣氓戮聟忙篓隆氓聺聴氓聢聺氓搂聥氓聦聳
            this.waitForModules().then(() => {
                console.log('[L5][ChatLoopIntegrator] 忙聣聙忙聹聣忙篓隆氓聺聴氓聢聺氓搂聥氓聦聳氓庐聦忙聢聬');
                this.allModulesLoaded = true;
                
                // 氓禄潞莽芦聥茅聙職盲驴隆茅聯戮猫路炉
                this.setupCommunicationChain();
                
                // 忙鲁篓氓聠聦氓驴聝猫路鲁盲赂聨Watchdog
                this.registerHeartbeats();
                
                // 氓聢聺氓搂聥氓聦聳氓庐聦忙聢聬
                this.loopInitialized = true;
                this.log('芒聹聟 忙聶潞猫聝陆氓庐垄忙聹聧茅聴颅莽聨炉莽鲁禄莽禄聼氓聢聺氓搂聥氓聦聳氓庐聦忙聢聬');
                
                // 猫搂娄氓聫聭氓聢聺氓搂聥氓聦聳氓庐聦忙聢聬盲潞聥盲禄露
                this.triggerLoopInitialized();
            }).catch(error => {
                this.log(`忙篓隆氓聺聴氓聢聺氓搂聥氓聦聳氓陇卤猫麓楼: ${error.message}`, 'error');
            });
        }).catch(error => {
            this.log(`忙篓隆氓聺聴忙聳聡盲禄露氓聤聽猫陆陆氓陇卤猫麓楼: ${error.message}`, 'error');
        });
    }
    
    /**
     * 氓聤聽猫陆陆忙篓隆氓聺聴忙聳聡盲禄露
     */
    async loadModuleFiles() {
        const moduleFiles = [
            // 氓聛聡猫庐戮DAojieCollector_v1.1氓路虏莽禄聫氓聤聽猫陆陆茂录聦猫驴聶茅聡聦氓聫陋氓聤聽猫陆陆氓聟露盲禄聳忙篓隆氓聺聴
            { id: 'realtimeTranslate', path: './modules/realtimeTranslate.js' },
            { id: 'aiAutoReply', path: './modules/aiAutoReply.js' },
            { id: 'aiBridge', path: './modules/aiBridge.js' },
            { id: 'uiDashboard', path: './modules/uiDashboard.js' },
            { id: 'watchdog', path: './modules/watchdog.js' }
        ];
        
        const loadPromises = moduleFiles.map(module => {
            return this.loadScript(module.path).then(() => {
                this.log(`忙篓隆氓聺聴忙聳聡盲禄露氓聤聽猫陆陆忙聢聬氓聤聼: ${module.id}`);
            }).catch(error => {
                this.log(`忙篓隆氓聺聴忙聳聡盲禄露氓聤聽猫陆陆氓陇卤猫麓楼: ${module.id} - ${error.message}`, 'warn');
                // 缁х画忙聣搂猫隆聦茂录聦氓聧鲁盲陆驴忙聼聬盲潞聸忙篓隆氓聺聴氓聤聽猫陆陆氓陇卤猫麓楼
            });
        });
        
        await Promise.allSettled(loadPromises);
    }
    
    /**
     * 氓聤篓忙聙聛氓聤聽猫陆陆猫聞職忙聹卢
     */
    loadScript(src) {
        return new Promise((resolve, reject) => {
            // 忙拢聙忙聼楼猫聞職忙聹卢忙聵炉氓聬娄氓路虏莽禄聫氓聤聽猫陆陆
            const existingScript = document.querySelector(`script[src="${src}"]`);
            if (existingScript) {
                resolve();
                return;
            }
            
            const script = document.createElement('script');
            script.src = src;
            script.async = true;
            
            script.onload = () => resolve();
            script.onerror = (error) => reject(error);
            
            document.head.appendChild(script);
        });
    }
    
    /**
     * 莽颅聣氓戮聟忙聣聙忙聹聣忙篓隆氓聺聴氓聢聺氓搂聥氓聦聳
     */
    waitForModules() {
        return new Promise((resolve, reject) => {
            let checkInterval;
            let checkCount = 0;
            const maxChecks = 20; // 忙聹聙氓陇職忙拢聙忙聼楼20忙卢隆
            
            checkInterval = setInterval(() => {
                checkCount++;
                
                // 忙拢聙忙聼楼忙聣聙忙聹聣氓驴聟茅聹聙忙篓隆氓聺聴忙聵炉氓聬娄氓路虏氓聤聽猫陆陆
                let allLoaded = true;
                const missingModules = [];
                
                this.requiredModules.forEach(module => {
                    if (!window.JEV.MODULES || !window.JEV.MODULES[module.id]) {
                        allLoaded = false;
                        missingModules.push(module.id);
                    }
                });
                
                if (allLoaded) {
                    clearInterval(checkInterval);
                    resolve();
                } else if (checkCount >= maxChecks) {
                    clearInterval(checkInterval);
                    reject(new Error(`忙篓隆氓聺聴氓聤聽猫陆陆猫露聟忙聴露茂录聦莽录潞氓掳聭忙篓隆氓聺聴: ${missingModules.join(', ')}`));
                } else {
                    this.log(`莽颅聣氓戮聟忙篓隆氓聺聴氓聤聽猫陆陆... 莽录潞氓掳聭: ${missingModules.join(', ')}`);
                }
            }, 1000); // 忙炉聫莽搂聮忙拢聙忙聼楼盲赂聙忙卢隆
        });
    }
    
    /**
     * 氓禄潞莽芦聥茅聙職盲驴隆茅聯戮猫路炉
     */
    setupCommunicationChain() {
        console.log('[L5][ChatLoopIntegrator] 氓禄潞莽芦聥茅聙職盲驴隆茅聯戮猫路炉...');
        
        // 1. 茅聟聧莽陆庐DAOJIECollector忙露聢忙聛炉猫陆卢氓聫聭氓聢掳realtimeTranslate
        this.setupDAOJIECollectorForwarding();
        
        // 2. 茅聟聧莽陆庐realtimeTranslate忙露聢忙聛炉猫陆卢氓聫聭氓聢掳aiAutoReply
        this.setupRealtimeTranslateForwarding();
        
        // 3. 茅聟聧莽陆庐aiAutoReply氓聸聻氓陇聧氓聫聭茅聙聛氓聢掳DAOJIE
        this.setupAIAutoReplyForwarding();
        
        // 4. 茅聟聧莽陆庐莽禄聼盲赂聙莽職聞忙露聢忙聛炉氓聢聠氓聫聭忙聹潞氓聢露
        this.setupMessageDispatchSystem();
        
        // 5. 茅聟聧莽陆庐JEV_CONNECTION猫路炉莽聰卤
        this.setupJEVConnectionRouting();
        
        this.log('芒聹聟 茅聙職盲驴隆茅聯戮猫路炉氓禄潞莽芦聥氓庐聦忙聢聬');
    }
    
    /**
     * 茅聟聧莽陆庐DAOJIECollector忙露聢忙聛炉猫陆卢氓聫聭
     */
    setupDAOJIECollectorForwarding() {
        try {
            const daojieCollector = window.JEV.DAOJIECollector || window.JEV.MODULES.DAOJIECollector;
            
            if (daojieCollector) {
                // 璁剧疆忙露聢忙聛炉氓陇聞莽聬聠氓聡陆忙聲掳
                daojieCollector.onMessage = async (msg) => {
                    this.log(`忙聨楼忙聰露氓聢掳忙聺楼猫聡陋DAOJIE莽職聞忙露聢忙聛炉: ${this.truncateText(msg.text || msg.content, 50)}`);
                    
                    // 猫陆卢氓聫聭氓聢掳realtimeTranslate忙篓隆氓聺聴
                    this.dispatchMessage('DAOJIECollector', 'realtimeTranslate', msg);
                    
                    // 猫搂娄氓聫聭盲潞聥盲禄露
                    const event = new CustomEvent('jev:daojie:message', {
                        detail: msg
                    });
                    document.dispatchEvent(event);
                };
                
                // 茅聟聧莽陆庐氓陋聮盲陆聯氓陇聞莽聬聠
                daojieCollector.onMediaDetected = async (mediaInfo) => {
                    this.log(`忙拢聙忙碌聥氓聢掳氓陋聮盲陆聯忙聳聡盲禄露: ${mediaInfo.type}`);
                    
                    // 茅聶聞氓聤聽氓陋聮盲陆聯盲驴隆忙聛炉氓鹿露猫陆卢氓聫聭
                    const enhancedMedia = {
                        ...mediaInfo,
                        has_media: true,
                        media_url: mediaInfo.url
                    };
                    
                    this.dispatchMessage('DAOJIECollector', 'realtimeTranslate', enhancedMedia);
                };
                
                this.log('芒聹聟 DAOJIECollector猫陆卢氓聫聭茅聟聧莽陆庐氓庐聦忙聢聬');
            }
        } catch (error) {
            this.log(`DAOJIECollector茅聟聧莽陆庐氓陇卤猫麓楼: ${error.message}`, 'error');
        }
    }
    
    /**
     * 茅聟聧莽陆庐realtimeTranslate忙露聢忙聛炉猫陆卢氓聫聭
     */
    setupRealtimeTranslateForwarding() {
        try {
            const translateModule = window.JEV.MODULES.realtimeTranslate;
            
            if (translateModule) {
                // 莽聸聭氓聬卢莽驴禄猫炉聭氓庐聦忙聢聬盲潞聥盲禄露
                document.addEventListener('jev:translate:result', (event) => {
                    const translatedMessage = event.detail;
                    this.log(`莽驴禄猫炉聭氓庐聦忙聢聬: ${translatedMessage.original} -> ${translatedMessage.translated}`);
                    
                    // 猫陆卢氓聫聭氓聢掳aiAutoReply忙篓隆氓聺聴
                    this.dispatchMessage('realtimeTranslate', 'aiAutoReply', translatedMessage);
                });
                
                this.log('芒聹聟 realtimeTranslate猫陆卢氓聫聭茅聟聧莽陆庐氓庐聦忙聢聬');
            }
        } catch (error) {
            this.log(`realtimeTranslate茅聟聧莽陆庐氓陇卤猫麓楼: ${error.message}`, 'error');
        }
    }
    
    /**
     * 茅聟聧莽陆庐aiAutoReply氓聸聻氓陇聧猫陆卢氓聫聭
     */
    setupAIAutoReplyForwarding() {
        try {
            const replyModule = window.JEV.MODULES.aiAutoReply;
            
            if (replyModule) {
                // 莽聸聭氓聬卢AI氓聸聻氓陇聧盲潞聥盲禄露
                document.addEventListener('jev:ai:reply', (event) => {
                    const reply = event.detail;
                    this.log(`AI氓聸聻氓陇聧莽聰聼忙聢聬: ${this.truncateText(reply.text || reply, 50)}`);
                    
                    // 茅聙職猫驴聡aiBridge猫陆卢氓聫聭氓聢掳DAOJIE
                    if (window.JEV.MODULES.aiBridge) {
                        window.JEV.MODULES.aiBridge.handleBridgeForward('DAOJIE', 'sendMessage', reply);
                    } else {
                        // 莽聸麓忙聨楼盲陆驴莽聰篓JEV_CONNECTION
                        this.forwardToDAOJIE('sendMessage', reply);
                    }
                });
                
                this.log('芒聹聟 aiAutoReply猫陆卢氓聫聭茅聟聧莽陆庐氓庐聦忙聢聬');
            }
        } catch (error) {
            this.log(`aiAutoReply茅聟聧莽陆庐氓陇卤猫麓楼: ${error.message}`, 'error');
        }
    }
    
    /**
     * 璁剧疆莽禄聼盲赂聙莽職聞忙露聢忙聛炉氓聢聠氓聫聭莽鲁禄莽禄聼
     */
    setupMessageDispatchSystem() {
        // 氓庐聻莽聨掳忙篓隆氓聺聴茅聴麓忙露聢忙聛炉氓聢聠氓聫聭莽職聞忙聽赂氓驴聝氓聤聼猫聝陆
        window.JEV.sendMessage = (from, to, data) => {
            this.dispatchMessage(from, to, data);
        };
        
        // 氓聟篓氓卤聙忙露聢忙聛炉猫庐垄茅聵聟忙聹潞氓聢露
        window.JEV.subscribe = (moduleId, callback) => {
            const handler = (event) => {
                const { from, to, data } = event.detail;
                if (to === moduleId) {
                    callback(from, data);
                }
            };
            
            document.addEventListener('jev:modules:dispatch', handler);
            
            // 猫驴聰氓聸聻氓聫聳忙露聢猫庐垄茅聵聟氓聡陆忙聲掳
            return () => {
                document.removeEventListener('jev:modules:dispatch', handler);
            };
        };
        
        this.log('芒聹聟 忙露聢忙聛炉氓聢聠氓聫聭莽鲁禄莽禄聼茅聟聧莽陆庐氓庐聦忙聢聬');
    }
    
    /**
     * 璁剧疆JEV_CONNECTION猫路炉莽聰卤
     */
    setupJEVConnectionRouting() {
        if (window.JEV_CONNECTION) {
            // 茅聟聧莽陆庐忙篓隆氓聺聴猫路炉莽聰卤
            window.JEV_CONNECTION.addRoute('/modules/dispatch', (data) => {
                const { from, to, data: messageData } = data;
                this.dispatchMessage(from, to, messageData);
            });
            
            // 茅聟聧莽陆庐AI猫路炉莽聰卤
            window.JEV_CONNECTION.addRoute('/ai/*', (path, data) => {
                if (window.JEV.MODULES.aiBridge) {
                    const endpoint = path.replace('/ai/', '');
                    return window.JEV.MODULES.aiBridge.handleAIRequest(endpoint, data);
                }
            });
            
            // 茅聟聧莽陆庐忙隆楼忙聨楼猫路炉莽聰卤
            window.JEV_CONNECTION.addRoute('/bridge/forward', (data) => {
                if (window.JEV.MODULES.aiBridge) {
                    const { target, action, data: forwardData } = data;
                    return window.JEV.MODULES.aiBridge.handleBridgeForward(target, action, forwardData);
                }
            });
            
            this.log('芒聹聟 JEV_CONNECTION猫路炉莽聰卤茅聟聧莽陆庐氓庐聦忙聢聬');
        }
    }
    
    /**
     * 忙鲁篓氓聠聦氓驴聝猫路鲁盲赂聨Watchdog
     */
    registerHeartbeats() {
        // 盲赂潞忙炉聫盲赂陋忙篓隆氓聺聴茅聟聧莽陆庐氓驴聝猫路鲁莽聸聭忙聨搂
        this.requiredModules.forEach(module => {
            const moduleInstance = window.JEV.MODULES[module.id];
            
            if (moduleInstance) {
                // 莽芦聥氓聧鲁氓聫聭茅聙聛盲赂聙忙卢隆氓驴聝猫路鲁
                this.sendModuleHeartbeat(module.id);
                
                // 璁剧疆氓庐職忙聹聼氓驴聝猫路鲁茂录聢氓娄聜忙聻聹忙篓隆氓聺聴忙虏隆忙聹聣猫聡陋氓路卤莽職聞氓驴聝猫路鲁忙聹潞氓聢露茂录聣
                if (!moduleInstance.heartbeatInterval) {
                    setInterval(() => {
                        this.sendModuleHeartbeat(module.id);
                    }, 30000); // 忙炉聫30莽搂聮
                }
            }
        });
        
        // 茅聟聧莽陆庐Watchdog莽聸聭忙聨搂
        const watchdog = window.JEV.MODULES.watchdog;
        if (watchdog) {
            // 忙鲁篓氓聠聦忙聣聙忙聹聣忙篓隆氓聺聴氓聢掳Watchdog
            this.requiredModules.forEach(module => {
                watchdog.triggerHeartbeat(module.id);
            });
            
            this.log('芒聹聟 Watchdog莽聸聭忙聨搂茅聟聧莽陆庐氓庐聦忙聢聬');
        }
        
        this.log('芒聹聟 氓驴聝猫路鲁忙鲁篓氓聠聦氓庐聦忙聢聬');
    }
    
    /**
     * 氓聫聭茅聙聛忙篓隆氓聺聴氓驴聝猫路鲁
     */
    sendModuleHeartbeat(moduleId) {
        const event = new CustomEvent('jev:module:heartbeat', {
            detail: {
                moduleId: moduleId,
                status: 'active',
                timestamp: Date.now()
            }
        });
        document.dispatchEvent(event);
    }
    
    /**
     * 氓聢聠氓聫聭忙露聢忙聛炉
     */
    dispatchMessage(from, to, data) {
        // 猫搂娄氓聫聭忙露聢忙聛炉氓聢聠氓聫聭盲潞聥盲禄露
        const event = new CustomEvent('jev:modules:dispatch', {
            detail: {
                from: from,
                to: to,
                data: data,
                timestamp: Date.now()
            }
        });
        document.dispatchEvent(event);
        
        // 氓聬聦忙聴露氓掳聺猫炉聲莽聸麓忙聨楼猫掳聝莽聰篓莽聸庐忙聽聡忙篓隆氓聺聴茂录聢氓娄聜忙聻聹氓颅聵氓聹篓茂录聣
        const targetModule = window.JEV.MODULES[to];
        if (targetModule && targetModule.handleMessage) {
            try {
                targetModule.handleMessage(from, data);
            } catch (error) {
                this.log(`莽聸麓忙聨楼猫掳聝莽聰篓忙篓隆氓聺聴${to}氓陇卤猫麓楼: ${error.message}`, 'warn');
            }
        }
    }
    
    /**
     * 猫陆卢氓聫聭氓聢掳DAOJIE
     */
    forwardToDAOJIE(action, data) {
        if (window.JEV_CONNECTION) {
            return window.JEV_CONNECTION.send('/bridge/forward', {
                target: 'DAOJIE',
                action: action,
                data: data
            });
        } else {
            // 忙篓隆忙聥聼猫陆卢氓聫聭
            this.log(`忙篓隆忙聥聼猫陆卢氓聫聭氓聢掳DAOJIE: ${action}`, 'info');
            
            // 猫搂娄氓聫聭盲潞聥盲禄露盲禄楼盲戮驴UI氓聫炉盲禄楼忙聧聲猫聨路
            const event = new CustomEvent('jev:daojie:action', {
                detail: { action, data }
            });
            document.dispatchEvent(event);
        }
    }
    
    /**
     * 猫搂娄氓聫聭茅聴颅莽聨炉氓聢聺氓搂聥氓聦聳氓庐聦忙聢聬盲潞聥盲禄露
     */
    triggerLoopInitialized() {
        const event = new CustomEvent('jev:chatloop:initialized', {
            detail: {
                modules: this.requiredModules.map(module => module.id),
                timestamp: Date.now()
            }
        });
        document.dispatchEvent(event);
        
        // 猫戮聯氓聡潞氓聢聺氓搂聥氓聦聳氓庐聦忙聢聬忙聴楼氓驴聴
        this.log('芒聹聟 [L5][ChatLoop] 忙聶潞猫聝陆氓庐垄忙聹聧茅聴颅莽聨炉莽鲁禄莽禄聼氓路虏氓聬炉氓聤篓');
        this.log('冒聼聯聤 忙篓隆氓聺聴莽聤露忙聙聛:');
        
        this.requiredModules.forEach(module => {
            const status = window.JEV.MODULES[module.id] ? '芒聹聟 氓路虏氓聤聽猫陆陆' : '芒聺聦 忙聹陋氓聤聽猫陆陆';
            this.log(`  - ${module.name}: ${status}`);
        });
    }
    
    /**
     * 猫驴聬猫隆聦氓庐聦忙聲麓忙碌聥猫炉聲
     */
    runTest() {
        this.log('冒聼聰聧 氓录聙氓搂聥茅聴颅莽聨炉莽鲁禄莽禄聼忙碌聥猫炉聲...');
        
        // 忙碌聥猫炉聲忙露聢忙聛炉忙碌聛猫陆卢
        const testMessage = {
            text: 'Hello, how much?',
            sender: 'customer',
            timestamp: Date.now()
        };
        
        this.log(`忙碌聥猫炉聲忙露聢忙聛炉: ${testMessage.text}`);
        
        // 忙篓隆忙聥聼DAOJIE忙露聢忙聛炉
        if (window.JEV.DAOJIECollector && window.JEV.DAOJIECollector.onMessage) {
            window.JEV.DAOJIECollector.onMessage(testMessage);
        } else {
            // 莽聸麓忙聨楼氓聢聠氓聫聭忙碌聥猫炉聲忙露聢忙聛炉
            this.dispatchMessage('DAOJIECollector', 'realtimeTranslate', testMessage);
        }
        
        this.log('忙碌聥猫炉聲氓庐聦忙聢聬茂录聦猫搂聜氓炉聼忙露聢忙聛炉忙碌聛猫陆卢...');
    }
    
    /**
     * 莽聰聼忙聢聬猫驴聬猫隆聦忙聤楼氓聭聤
     */
    generateReport() {
        const watchdog = window.JEV.MODULES.watchdog;
        if (watchdog && watchdog.manualGenerateReport) {
            return watchdog.manualGenerateReport();
        } else {
            this.log('忙聴聽忙鲁聲莽聰聼忙聢聬忙聤楼氓聭聤茂录聦Watchdog忙篓隆氓聺聴盲赂聧氓聫炉莽聰篓', 'warn');
            return null;
        }
    }
    
    /**
     * 猫庐掳氓陆聲忙聴楼氓驴聴
     */
    log(message, level = 'info') {
        const logLevel = {
            info: 'INFO',
            warn: 'WARN',
            error: 'ERROR'
        }[level] || 'INFO';
        
        console.log(`[L5][ChatLoopIntegrator][${logLevel}] ${message}`);
        
        // 氓聠聶氓聟楼氓聢掳JEV_LOGS
        if (window.JEV_LOGS && window.JEV_LOGS.push) {
            window.JEV_LOGS.push({
                timestamp: new Date().toISOString(),
                module: this.moduleId,
                level: logLevel,
                message: message
            });
        }
    }
    
    /**
     * 忙聢陋忙聳颅忙聳聡忙聹卢
     */
    truncateText(text, maxLength) {
        if (!text) return '';
        return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    }
    
    /**
     * 猫聨路氓聫聳茅聸聠忙聢聬氓聶篓莽聤露忙聙聛
     */
    getStatus() {
        return {
            initialized: this.loopInitialized,
            allModulesLoaded: this.allModulesLoaded,
            modules: this.requiredModules.map(module => ({
                id: module.id,
                name: module.name,
                loaded: !!window.JEV.MODULES[module.id]
            }))
        };
    }
    
    /**
     * 氓聛聹忙颅垄茅聸聠忙聢聬氓聶篓
     */
    stop() {
        this.log('氓聛聹忙颅垄茅聸聠忙聢聬氓聶篓');
        
        // 氓聛聹忙颅垄忙聣聙忙聹聣忙篓隆氓聺聴
        this.requiredModules.forEach(module => {
            const moduleInstance = window.JEV.MODULES[module.id];
            if (moduleInstance && moduleInstance.stop) {
                try {
                    moduleInstance.stop();
                } catch (error) {
                    this.log(`氓聛聹忙颅垄忙篓隆氓聺聴${module.id}氓陇卤猫麓楼: ${error.message}`, 'warn');
                }
            }
        });
    }
}

// 氓聢聺氓搂聥氓聦聳茅聸聠忙聢聬氓聶篓
if (typeof window !== 'undefined') {
    // 莽颅聣氓戮聟DOM氓聤聽猫陆陆氓庐聦忙聢聬
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            window.JEV_ChatLoopIntegrator = new ChatLoopIntegrator();
        });
    } else {
        window.JEV_ChatLoopIntegrator = new ChatLoopIntegrator();
    }
}

// 氓炉录氓聡潞忙篓隆氓聺聴盲驴隆忙聛炉
export const moduleInfo = {
    id: 'chatLoopIntegrator',
    name: '猫聛聤氓陇漏茅聴颅莽聨炉茅聸聠忙聢聬氓聶篓',
    version: '1.0.0',
    type: 'system',
    dependencies: [],
    entry: './modules/chatLoopIntegrator.js'
};