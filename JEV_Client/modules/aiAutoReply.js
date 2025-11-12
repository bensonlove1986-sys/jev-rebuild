/* UTF-8 FIXED BY JEV @ 2025-11-09T15:11:17.548Z */
/**
 * JEV L5+ 脗路 AI猫聡陋氓聤篓氓聸聻氓陇聧忙篓隆氓聺聴
 * 氓聼潞盲潞聨盲赂聤盲赂聥忙聳聡莽聰聼忙聢聬猫聡陋莽聞露氓聸聻氓陇聧茂录聦忙聰炉忙聦聛忙篓隆忙聺驴氓聦聳氓聮聦AI忙聨楼氓聫拢
 * 氓陇聞莽聬聠忙聺楼猫聡陋莽驴禄猫炉聭忙篓隆氓聺聴莽職聞忙露聢忙聛炉氓鹿露莽聰聼忙聢聬忙聶潞猫聝陆氓聸聻氓陇聧
 */

class AIAutoReplyModule {
    constructor() {
        // 忙篓隆氓聺聴氓聼潞忙聹卢盲驴隆忙聛炉
        this.moduleId = 'aiAutoReply';
        this.moduleName = 'AI猫聡陋氓聤篓氓聸聻氓陇聧忙篓隆氓聺聴';
        this.version = '1.0.0';
        this.type = 'assistant';
        this.isActive = false;
        
        // 茅聟聧莽陆庐氓聫聜忙聲掳
        this.responseTemplates = this.loadTemplates();
        this.maxContextLength = 5;
        this.contextWindow = new Map(); // 忙聦聣氓炉鹿猫炉聺ID氓颅聵氓聜篓盲赂聤盲赂聥忙聳聡
        
        // 莽聤露忙聙聛猫路聼猫赂陋
        this.heartbeatInterval = null;
        this.lastActivityTime = Date.now();
        this.replyCount = 0;
        this.failedCount = 0;
        
        // 氓聢聺氓搂聥氓聦聳
        this.init();
    }
    
    /**
     * 氓聢聺氓搂聥氓聦聳忙篓隆氓聺聴
     */
    init() {
        console.log(`[L5][aiAutoReply] 氓聢聺氓搂聥氓聦聳AI猫聡陋氓聤篓氓聸聻氓陇聧忙篓隆氓聺聴 v${this.version}`);
        
        // 莽隆庐盲驴聺氓聟篓氓卤聙JEV氓聭陆氓聬聧莽漏潞茅聴麓氓颅聵氓聹篓
        if (!window.JEV) {
            window.JEV = {};
        }
        
        if (!window.JEV.MODULES) {
            window.JEV.MODULES = {};
        }
        
        // 忙鲁篓氓聠聦氓聢掳JEV忙篓隆氓聺聴莽鲁禄莽禄聼
        window.JEV.MODULES[this.moduleId] = this;
        
        // 忙驴聙忙麓禄忙篓隆氓聺聴
        this.activate();
        
        // 莽聸聭氓聬卢忙露聢忙聛炉氓聢聠氓聫聭盲潞聥盲禄露
        this.setupEventListeners();
        
        // 氓聬炉氓聤篓氓驴聝猫路鲁
        this.startHeartbeat();
        
        console.log(`[L5][aiAutoReply] 忙篓隆氓聺聴氓聢聺氓搂聥氓聦聳氓庐聦忙聢聬`);
    }
    
    /**
     * 忙驴聙忙麓禄忙篓隆氓聺聴
     */
    activate() {
        this.isActive = true;
        this.log('芒聹聟 忙篓隆氓聺聴氓路虏忙驴聙忙麓禄');
        this.updateStatus();
    }
    
    /**
     * 氓聤聽猫陆陆氓聸聻氓陇聧忙篓隆忙聺驴
     */
    loadTemplates() {
        return {
            greeting: [
                '忙聜篓氓楼陆茂录聛忙卢垄猫驴聨氓聮篓猫炉垄茂录聦猫炉路茅聴庐忙聹聣盲禄聙盲鹿聢氓聫炉盲禄楼氓赂庐氓聤漏忙聜篓莽職聞茂录聼',
                '忙聜篓氓楼陆茂录聦氓戮聢茅芦聵氓聟麓盲赂潞忙聜篓忙聹聧氓聤隆茂录聛猫炉路茅聴庐忙聹聣盲禄聙盲鹿聢茅聹聙猫娄聛氓赂庐氓聤漏莽職聞茂录聼',
                '盲陆聽氓楼陆茂录聦忙卢垄猫驴聨忙聺楼氓聢掳忙聢聭盲禄卢莽職聞氓庐垄忙聹聧盲赂颅氓驴聝茂录聛'
            ],
            price: [
                '盲禄路忙聽录氓娄聜盲赂聥茂录職忙聽聡氓聡聠忙卢戮脗楼199茂录聦茅芦聵莽潞搂忙卢戮脗楼299茂录聦猫卤陋氓聧聨忙卢戮脗楼399茫聙聜',
                '忙聽鹿忙聧庐忙聜篓莽職聞茅聹聙忙卤聜茂录聦忙聢聭盲禄卢忙聹聣氓陇職盲赂陋盲禄路盲陆聧莽職聞茅聙聣忙聥漏茂录聦氓聟路盲陆聯氓聫炉盲禄楼氓聫聜猫聙聝忙聢聭盲禄卢莽職聞盲潞搂氓聯聛茅隆碌茅聺垄茫聙聜',
                '忙聢聭盲禄卢莽職聞盲禄路忙聽录茅聺聻氓赂赂忙聹聣莽芦聻盲潞聣氓聤聸茂录聦氓聼潞莽隆聙莽聣聢猫碌路盲禄路盲禄聟盲赂潞脗楼199茫聙聜'
            ],
            inquiry: [
                '忙聞聼猫掳垄忙聜篓莽職聞氓聮篓猫炉垄茂录聛忙聢聭茅聹聙猫娄聛盲潞聠猫搂拢忙聸麓氓陇職莽禄聠猫聤聜忙聣聧猫聝陆莽禄聶忙聜篓忙聸麓氓聡聠莽隆庐莽職聞氓聸聻氓陇聧茫聙聜',
                '猫炉路莽篓聧莽颅聣茂录聦忙聢聭忙颅拢氓聹篓盲赂潞忙聜篓忙聼楼猫炉垄莽聸赂氓聟鲁盲驴隆忙聛炉...',
                '氓聟鲁盲潞聨猫驴聶盲赂陋茅聴庐茅垄聵茂录聦忙聢聭氓禄潞猫庐庐忙聜篓氓聫炉盲禄楼忙聼楼莽聹聥忙聢聭盲禄卢莽職聞FAQ茅隆碌茅聺垄茂录聦茅聜拢茅聡聦忙聹聣猫炉娄莽禄聠猫炉麓忙聵聨茫聙聜'
            ],
            thanks: [
                '盲赂聧氓庐垄忙掳聰茂录聛氓娄聜忙聻聹猫驴聵忙聹聣氓聟露盲禄聳茅聴庐茅垄聵茂录聦茅職聫忙聴露忙卢垄猫驴聨氓聮篓猫炉垄茫聙聜',
                '氓戮聢茅芦聵氓聟麓猫聝陆氓赂庐氓聢掳忙聜篓茂录聛莽楼聺忙聜篓忙聹聣忙聞聣氓驴芦莽職聞盲赂聙氓陇漏茂录聛',
                '盲赂聧莽聰篓猫掳垄茂录聛忙聹聼氓戮聟氓聠聧忙卢隆盲赂潞忙聜篓忙聹聧氓聤隆茂录聛'
            ],
            default: [
                '忙聞聼猫掳垄忙聜篓莽職聞莽聲聶猫篓聙茂录聦忙聢聭盲禄卢盲录職氓掳陆氓驴芦氓聸聻氓陇聧忙聜篓茂录聛',
                '忙聢聭氓路虏莽禄聫忙聰露氓聢掳忙聜篓莽職聞忙露聢忙聛炉茂录聦忙颅拢氓聹篓氓陇聞莽聬聠盲赂颅...',
                '猫炉路莽篓聧莽颅聣莽聣聡氓聢禄茂录聦忙聢聭忙颅拢氓聹篓盲赂潞忙聜篓氓聡聠氓陇聡氓聸聻氓陇聧茫聙聜'
            ]
        };
    }
    
    /**
     * 璁剧疆盲潞聥盲禄露莽聸聭氓聬卢氓聶篓
     */
    setupEventListeners() {
        // 莽聸聭氓聬卢忙露聢忙聛炉氓聢聠氓聫聭盲潞聥盲禄露
        document.addEventListener('jev:modules:dispatch', (event) => {
            const { from, to, data } = event.detail;
            
            // 氓聫陋氓陇聞莽聬聠氓聫聭茅聙聛莽禄聶忙聹卢忙篓隆氓聺聴莽職聞忙露聢忙聛炉
            if (to === this.moduleId) {
                this.handleIncomingMessage(from, data);
            }
        });
        
        // 氓娄聜忙聻聹忙聹聣JEV_CONNECTION茂录聦盲陆驴莽聰篓氓庐聝莽聸聭氓聬卢忙篓隆氓聺聴氓聢聠氓聫聭
        if (window.JEV_CONNECTION) {
            // 莽聸聭氓聬卢/module/dispatch猫路炉氓戮聞
            window.JEV_CONNECTION.on('/modules/dispatch', (data) => {
                const { from, to, data: messageData } = data;
                
                // 氓聫陋氓陇聞莽聬聠氓聫聭茅聙聛莽禄聶忙聹卢忙篓隆氓聺聴莽職聞忙露聢忙聛炉
                if (to === this.moduleId) {
                    this.handleIncomingMessage(from, messageData);
                }
            });
        }
    }
    
    /**
     * 氓陇聞莽聬聠忙聨楼忙聰露氓聢掳莽職聞忙露聢忙聛炉
     */
    async handleIncomingMessage(from, messageData) {
        if (!this.isActive) return;
        
        this.log(`忙聰露氓聢掳忙聺楼猫聡陋${from}莽職聞忙露聢忙聛炉: ${messageData.translated || messageData.text}`);
        this.lastActivityTime = Date.now();
        
        try {
            // 猫聨路氓聫聳氓炉鹿猫炉聺ID茂录聢氓娄聜忙聻聹忙虏隆忙聹聣氓聢聶莽聰聼忙聢聬茂录聣
            const conversationId = messageData.conversationId || this.generateConversationId();
            
            // 鏇存柊盲赂聤盲赂聥忙聳聡
            this.updateContext(conversationId, messageData);
            
            // 莽聰聼忙聢聬氓聸聻氓陇聧
            const reply = await this.generateReply(messageData, conversationId);
            
            // 氓聫聭茅聙聛氓聸聻氓陇聧
            await this.sendReplyToDAOJIE(reply, conversationId, messageData);
            
            // 娣诲姞氓聸聻氓陇聧猫庐隆忙聲掳
            this.replyCount++;
            
            // 鏇存柊莽聤露忙聙聛
            this.updateStatus();
            
        } catch (error) {
            this.log(`氓聸聻氓陇聧氓陇聞莽聬聠氓陇卤猫麓楼: ${error.message}`, 'error');
            this.failedCount++;
            
            // 氓掳聺猫炉聲氓聫聭茅聙聛茅聰聶猫炉炉氓聸聻氓陇聧
            try {
                await this.sendErrorReply(error, messageData);
            } catch (err) {
                this.log(`茅聰聶猫炉炉氓聸聻氓陇聧氓聫聭茅聙聛氓陇卤猫麓楼: ${err.message}`, 'error');
            }
        }
    }
    
    /**
     * 莽聰聼忙聢聬氓炉鹿猫炉聺ID
     */
    generateConversationId() {
        return `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    /**
     * 鏇存柊盲赂聤盲赂聥忙聳聡莽陋聴氓聫拢
     */
    updateContext(conversationId, messageData) {
        if (!this.contextWindow.has(conversationId)) {
            this.contextWindow.set(conversationId, []);
        }
        
        const context = this.contextWindow.get(conversationId);
        context.push({
            role: 'user',
            content: messageData.translated || messageData.text,
            timestamp: Date.now()
        });
        
        // 茅聶聬氓聢露盲赂聤盲赂聥忙聳聡茅聲驴氓潞娄
        if (context.length > this.maxContextLength) {
            context.splice(0, context.length - this.maxContextLength);
        }
        
        this.contextWindow.set(conversationId, context);
    }
    
    /**
     * 莽聰聼忙聢聬氓聸聻氓陇聧
     */
    async generateReply(messageData, conversationId) {
        const text = messageData.translated || messageData.text;
        const context = this.contextWindow.get(conversationId) || [];
        
        // 氓掳聺猫炉聲盲陆驴莽聰篓AI忙聨楼氓聫拢莽聰聼忙聢聬氓聸聻氓陇聧
        try {
            const aiReply = await this.generateAIReply(text, context);
            if (aiReply) {
                this.log('AI莽聰聼忙聢聬氓聸聻氓陇聧忙聢聬氓聤聼');
                return aiReply;
            }
        } catch (error) {
            this.log(`AI氓聸聻氓陇聧莽聰聼忙聢聬氓陇卤猫麓楼茂录聦盲陆驴莽聰篓忙篓隆忙聺驴氓聸聻氓陇聧: ${error.message}`, 'warn');
        }
        
        // 氓娄聜忙聻聹AI莽聰聼忙聢聬氓陇卤猫麓楼茂录聦盲陆驴莽聰篓忙篓隆忙聺驴氓聸聻氓陇聧
        return this.getTemplateReply(text);
    }
    
    /**
     * 盲陆驴莽聰篓AI莽聰聼忙聢聬氓聸聻氓陇聧
     */
    async generateAIReply(text, context) {
        if (window.JEV_CONNECTION) {
            const prompt = this.buildPrompt(text, context);
            
            try {
                const response = await window.JEV_CONNECTION.send('/ai/suggest-reply', {
                    prompt: prompt
                });
                
                if (response && response.reply) {
                    // 鏇存柊盲赂聤盲赂聥忙聳聡
                    this.addAssistantResponseToContext(context, response.reply);
                    return response.reply;
                }
            } catch (error) {
                // 氓掳聺猫炉聲氓陇聡莽聰篓猫路炉氓戮聞
                try {
                    const response = await window.JEV_CONNECTION.send('/task/ai', {
                        task: 'reply',
                        input: text,
                        context: context
                    });
                    
                    if (response && response.output) {
                        this.addAssistantResponseToContext(context, response.output);
                        return response.output;
                    }
                } catch (innerError) {
                    throw innerError;
                }
            }
        }
        
        // 忙篓隆忙聥聼AI氓聸聻氓陇聧茂录聢盲陆聹盲赂潞忙聹聙氓聬聨莽職聞氓陇聡茅聙聣茂录聣
        return this.mockAIReply(text);
    }
    
    /**
     * 忙聻聞氓禄潞AI忙聫聬莽陇潞猫炉聧
     */
    buildPrompt(text, context) {
        let prompt = `盲陆聽忙聵炉JEV氓庐垄忙聹聧氓聤漏忙聣聥茂录聦猫炉路莽聰篓莽庐聙忙麓聛氓聫聥氓楼陆莽職聞猫炉颅猫篓聙氓聸聻氓陇聧氓庐垄忙聢路茂录職\n"${text}"`;
        
        // 忙路禄氓聤聽盲赂聤盲赂聥忙聳聡
        if (context && context.length > 1) {
            prompt += '\n\n盲赂聤盲赂聥忙聳聡盲驴隆忙聛炉茂录職';
            context.slice(-2).forEach((msg, index) => {
                prompt += `\n${index === 0 ? '氓庐垄忙聢路: ' : ''}${msg.content}`;
            });
        }
        
        prompt += '\n\n猫炉路盲驴聺忙聦聛氓聸聻氓陇聧猫聡陋莽聞露茫聙聛盲赂聯盲赂職茂录聦莽卢娄氓聬聢氓庐垄忙聹聧氓聹潞忙聶炉茫聙聜';
        return prompt;
    }
    
    /**
     * 忙路禄氓聤聽氓聤漏忙聣聥氓聸聻氓陇聧氓聢掳盲赂聤盲赂聥忙聳聡
     */
    addAssistantResponseToContext(context, reply) {
        context.push({
            role: 'assistant',
            content: reply,
            timestamp: Date.now()
        });
    }
    
    /**
     * 猫聨路氓聫聳忙篓隆忙聺驴氓聸聻氓陇聧
     */
    getTemplateReply(text) {
        const lowerText = text.toLowerCase();
        
        // 忙聽鹿忙聧庐氓聟鲁茅聰庐猫炉聧茅聙聣忙聥漏忙篓隆忙聺驴
        if (lowerText.includes('hello') || lowerText.includes('hi') || 
            lowerText.includes('盲陆聽氓楼陆') || lowerText.includes('忙聜篓氓楼陆')) {
            return this.getRandomTemplate('greeting');
        }
        
        if (lowerText.includes('price') || lowerText.includes('cost') || 
            lowerText.includes('氓陇職氓掳聭茅聮卤') || lowerText.includes('盲禄路忙聽录')) {
            return this.getRandomTemplate('price');
        }
        
        if (lowerText.includes('thank') || lowerText.includes('thanks') || 
            lowerText.includes('猫掳垄猫掳垄') || lowerText.includes('忙聞聼猫掳垄')) {
            return this.getRandomTemplate('thanks');
        }
        
        // 茅禄聵猫庐陇氓聸聻氓陇聧
        return this.getRandomTemplate('default');
    }
    
    /**
     * 盲禄聨忙篓隆忙聺驴忙聲掳莽禄聞盲赂颅茅職聫忙聹潞茅聙聣忙聥漏盲赂聙盲赂陋
     */
    getRandomTemplate(category) {
        const templates = this.responseTemplates[category] || this.responseTemplates.default;
        const randomIndex = Math.floor(Math.random() * templates.length);
        return templates[randomIndex];
    }
    
    /**
     * 忙篓隆忙聥聼AI氓聸聻氓陇聧
     */
    mockAIReply(text) {
        // 莽庐聙氓聧聲莽職聞忙篓隆忙聥聼氓聸聻氓陇聧茅聙禄猫戮聭
        this.log('盲陆驴莽聰篓忙篓隆忙聥聼AI氓聸聻氓陇聧', 'warn');
        
        if (text.includes('氓陇職氓掳聭茅聮卤') || text.includes('price')) {
            return '忙聜篓氓楼陆茂录聦忙聢聭盲禄卢莽職聞盲潞搂氓聯聛盲禄路忙聽录盲禄聨199氓聟聝猫碌路茂录聦氓聟路盲陆聯氓聫聳氓聠鲁盲潞聨忙聜篓茅聙聣忙聥漏莽職聞氓聻聥氓聫路氓聮聦茅聟聧莽陆庐茫聙聜猫炉路茅聴庐忙聜篓氓炉鹿氓聯陋忙卢戮盲潞搂氓聯聛忙聞聼氓聟麓猫露拢茂录聼';
        }
        
        if (text.includes('盲陆聽氓楼陆') || text.includes('hello')) {
            return '忙聜篓氓楼陆茂录聛忙卢垄猫驴聨忙聺楼氓聢掳JEV氓庐垄忙聹聧盲赂颅氓驴聝茂录聦忙聢聭忙聵炉忙聜篓莽職聞忙聶潞猫聝陆氓聤漏忙聣聥茫聙聜猫炉路茅聴庐忙聹聣盲禄聙盲鹿聢氓聫炉盲禄楼氓赂庐氓聤漏忙聜篓莽職聞氓聬聴茂录聼';
        }
        
        return '忙聞聼猫掳垄忙聜篓莽職聞氓聮篓猫炉垄茂录聛忙聢聭盲禄卢盲录職氓掳陆氓驴芦盲赂潞忙聜篓忙聫聬盲戮聸猫炉娄莽禄聠盲驴隆忙聛炉茫聙聜忙聜篓猫驴聵忙聹聣氓聟露盲禄聳茅聴庐茅垄聵氓聬聴茂录聼';
    }
    
    /**
     * 氓聫聭茅聙聛氓聸聻氓陇聧氓聢掳DAOJIE
     */
    async sendReplyToDAOJIE(reply, conversationId, originalMessage) {
        const replyData = {
            text: reply,
            conversationId: conversationId,
            originalMessageId: originalMessage.id,
            timestamp: Date.now(),
            source: 'aiAutoReply',
            type: 'reply'
        };
        
        // 茅聙職猫驴聡盲赂陇莽搂聧忙聳鹿氓录聫氓聫聭茅聙聛
        
        // 1. 猫搂娄氓聫聭猫聡陋氓庐職盲鹿聣盲潞聥盲禄露
        const event = new CustomEvent('jev:bridge:forward', {
            detail: {
                target: 'DAOJIE',
                action: 'sendMessage',
                data: replyData
            }
        });
        document.dispatchEvent(event);
        
        // 2. 氓娄聜忙聻聹忙聹聣JEV_CONNECTION茂录聦茅聙職猫驴聡氓庐聝氓聫聭茅聙聛
        if (window.JEV_CONNECTION) {
            await window.JEV_CONNECTION.send('/bridge/forward', {
                target: 'DAOJIE',
                action: 'sendMessage',
                data: replyData
            });
        }
        
        this.log(`氓聸聻氓陇聧氓路虏氓聫聭茅聙聛氓聢掳DAOJIE: ${reply.substring(0, 30)}...`);
        
        // 茅聙職莽聼楼UI鏇存柊
        this.notifyUIUpdate(originalMessage, reply);
    }
    
    /**
     * 氓聫聭茅聙聛茅聰聶猫炉炉氓聸聻氓陇聧
     */
    async sendErrorReply(error, messageData) {
        const errorReply = {
            text: '氓戮聢忙聤卤忙颅聣茂录聦莽鲁禄莽禄聼忙職聜忙聴露忙聴聽忙鲁聲氓陇聞莽聬聠忙聜篓莽職聞猫炉路忙卤聜茂录聦猫炉路莽篓聧氓聬聨氓聠聧猫炉聲茫聙聜',
            error: error.message,
            timestamp: Date.now(),
            type: 'error'
        };
        
        if (window.JEV_CONNECTION) {
            try {
                await window.JEV_CONNECTION.send('/bridge/forward', {
                    target: 'DAOJIE',
                    action: 'sendMessage',
                    data: errorReply
                });
            } catch (err) {
                // 猫庐掳氓陆聲盲陆聠盲赂聧忙聤聸氓聡潞茂录聦茅聛驴氓聟聧氓戮陋莽聨炉茅聰聶猫炉炉
                this.log(`茅聰聶猫炉炉氓聸聻氓陇聧氓聫聭茅聙聛氓陇卤猫麓楼: ${err.message}`, 'error');
            }
        }
    }
    
    /**
     * 茅聙職莽聼楼UI鏇存柊
     */
    notifyUIUpdate(originalMessage, reply) {
        const event = new CustomEvent('jev:ai:reply:sent', {
            detail: {
                originalMessage: originalMessage,
                reply: reply,
                timestamp: Date.now()
            }
        });
        document.dispatchEvent(event);
    }
    
    /**
     * 氓聬炉氓聤篓氓驴聝猫路鲁
     */
    startHeartbeat() {
        this.heartbeatInterval = setInterval(() => {
            this.sendHeartbeat();
        }, 30000); // 忙炉聫30莽搂聮氓聫聭茅聙聛盲赂聙忙卢隆氓驴聝猫路鲁
    }
    
    /**
     * 氓聫聭茅聙聛氓驴聝猫路鲁
     */
    async sendHeartbeat() {
        try {
            // 氓聫聭茅聙聛氓驴聝猫路鲁氓聢掳JEV莽鲁禄莽禄聼
            if (window.JEV && window.JEV.KV) {
                await window.JEV.KV.set(`module_heartbeat_${this.moduleId}`, {
                    timestamp: Date.now(),
                    status: 'active',
                    replyCount: this.replyCount,
                    failedCount: this.failedCount,
                    version: this.version
                });
            }
            
            // 猫搂娄氓聫聭氓驴聝猫路鲁盲潞聥盲禄露
            const event = new CustomEvent('jev:module:heartbeat', {
                detail: {
                    moduleId: this.moduleId,
                    status: 'active',
                    timestamp: Date.now()
                }
            });
            document.dispatchEvent(event);
            
        } catch (error) {
            this.log(`氓驴聝猫路鲁氓聫聭茅聙聛氓陇卤猫麓楼: ${error.message}`, 'warn');
        }
    }
    
    /**
     * 鏇存柊忙篓隆氓聺聴莽聤露忙聙聛
     */
    updateStatus() {
        const status = {
            moduleId: this.moduleId,
            name: this.moduleName,
            version: this.version,
            type: this.type,
            isActive: this.isActive,
            lastActivityTime: this.lastActivityTime,
            replyCount: this.replyCount,
            failedCount: this.failedCount
        };
        
        // 鏇存柊氓聢掳window.JEV莽聤露忙聙聛
        if (window.JEV && window.JEV.L5Modules) {
            window.JEV.L5Modules[this.moduleId] = status;
        }
        
        // 猫搂娄氓聫聭莽聤露忙聙聛鏇存柊盲潞聥盲禄露
        const event = new CustomEvent('jev:module:status', {
            detail: status
        });
        document.dispatchEvent(event);
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
        
        console.log(`[L5][aiAutoReply][${logLevel}] ${message}`);
        
        // 氓掳聺猫炉聲氓聠聶氓聟楼氓聢掳JEV_LOGS
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
     * 猫聨路氓聫聳忙篓隆氓聺聴盲驴隆忙聛炉
     */
    getModuleInfo() {
        return {
            id: this.moduleId,
            name: this.moduleName,
            version: this.version,
            type: this.type,
            isActive: this.isActive,
            replyCount: this.replyCount,
            failedCount: this.failedCount,
            lastActivityTime: this.lastActivityTime
        };
    }
    
    /**
     * 氓聛聹忙颅垄忙篓隆氓聺聴
     */
    stop() {
        this.isActive = false;
        
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
        
        // 忙赂聟莽漏潞盲赂聤盲赂聥忙聳聡莽陋聴氓聫拢
        this.contextWindow.clear();
        
        this.log('忙篓隆氓聺聴氓路虏氓聛聹忙颅垄');
        this.updateStatus();
    }
}

// 氓聢聺氓搂聥氓聦聳忙篓隆氓聺聴
if (typeof window !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            new AIAutoReplyModule();
        });
    } else {
        new AIAutoReplyModule();
    }
}

// 氓炉录氓聡潞忙篓隆氓聺聴盲驴隆忙聛炉
export const moduleInfo = {
    id: 'aiAutoReply',
    name: 'AI猫聡陋氓聤篓氓聸聻氓陇聧忙篓隆氓聺聴',
    version: '1.0.0',
    type: 'assistant',
    dependencies: [],
    entry: './modules/aiAutoReply.js'
};