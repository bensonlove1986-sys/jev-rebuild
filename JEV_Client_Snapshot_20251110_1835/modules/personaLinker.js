/* UTF-8 FIXED BY JEV @ 2025-11-09T15:11:17.631Z */
// JEV L8.6 Persona Linker Module
// Multi-agent persona and tone style synchronization

(function() {
    'use strict';
    
    // 盲潞潞忙聽录忙篓隆忙聺驴氓庐職盲鹿聣
    const personaTemplates = {
        zh: {
            TRAE: {
                persona: '氓聢聠忙聻聬氓聻聥',
                tone: '盲赂聯盲赂職氓庐垄猫搂聜',
                style: '猫炉娄莽禄聠氓聢聠忙聻聬茂录聦鏁版嵁忙聰炉忙聦聛',
                greeting: '忙聜篓氓楼陆茂录聦忙聢聭忙聵炉TRAE氓聢聠忙聻聬氓聤漏忙聣聥茫聙聜',
                signature: '芒聙聰 鏁版嵁氓聢聠忙聻聬莽禄聯忙聻聹'
            },
            DeepSeek: {
                persona: '茅聰聙氓聰庐氓聻聥',
                tone: '莽聝颅忙聝聟氓聫聥氓楼陆',
                style: '莽搂炉忙聻聛氓录聲氓炉录茂录聦猫搂拢氓聠鲁忙聳鹿忙隆聢氓炉录氓聬聭',
                greeting: '忙聜篓氓楼陆茂录聛氓戮聢茅芦聵氓聟麓盲赂潞忙聜篓忙聫聬盲戮聸氓赂庐氓聤漏茫聙聜',
                signature: '芒聙聰 茅職聫忙聴露盲赂潞忙聜篓忙聹聧氓聤隆'
            },
            LocalAgent: {
                persona: '忙聣搂猫隆聦氓聻聥',
                tone: '莽聸麓忙聨楼莽庐聙忙麓聛',
                style: '猫隆聦氓聤篓氓炉录氓聬聭茂录聦茅芦聵忙聲聢氓庐聻莽聰篓',
                greeting: '忙聢聭忙聵炉LocalAgent茂录聦猫炉路茅聴庐茅聹聙猫娄聛盲禄聙盲鹿聢氓赂庐氓聤漏茂录聼',
                signature: '芒聙聰 盲禄禄氓聤隆忙聣搂猫隆聦盲赂颅'
            }
        },
        en: {
            TRAE: {
                persona: 'Analytical',
                tone: 'Professional & Objective',
                style: 'Detailed analysis with data support',
                greeting: 'Hello, I am TRAE analysis assistant.',
                signature: '芒聙聰 Data Analysis Result'
            },
            DeepSeek: {
                persona: 'Sales',
                tone: 'Enthusiastic & Friendly',
                style: 'Solution-oriented with positive guidance',
                greeting: 'Hello! I\'m happy to help you.',
                signature: '芒聙聰 Always at your service'
            },
            LocalAgent: {
                persona: 'Execution',
                tone: 'Direct & Concise',
                style: 'Action-oriented and efficient',
                greeting: 'I am LocalAgent, how can I assist you?',
                signature: '芒聙聰 Task in progress'
            }
        }
    };
    
    // 氓陆聯氓聣聧盲潞潞忙聽录莽聤露忙聙聛
    const personaState = {
        currentLang: 'zh',
        agents: {
            TRAE: { ...personaTemplates.zh.TRAE },
            DeepSeek: { ...personaTemplates.zh.DeepSeek },
            LocalAgent: { ...personaTemplates.zh.LocalAgent }
        },
        isSynchronized: true
    };
    
    /**
     * 氓聬聦忙颅楼忙聣聙忙聹聣忙聶潞猫聝陆盲陆聯莽職聞盲潞潞忙聽录氓聢掳忙聦聡氓庐職猫炉颅猫篓聙
     * @param {string} lang - 莽聸庐忙聽聡猫炉颅猫篓聙 'zh' 忙聢聳 'en'
     */
    function syncPersonasToLanguage(lang) {
        if (personaTemplates[lang]) {
            Object.keys(personaState.agents).forEach(agentName => {
                if (personaTemplates[lang][agentName]) {
                    personaState.agents[agentName] = { ...personaTemplates[lang][agentName] };
                }
            });
            
            personaState.currentLang = lang;
            personaState.isSynchronized = true;
            
            console.log(`[L8.6][PersonaLinker] 盲潞潞忙聽录氓聬聦忙颅楼氓聢掳${lang === 'zh' ? '盲赂颅忙聳聡' : '猫聥卤忙聳聡'}氓庐聦忙聢聬`);
            
            // 猫搂娄氓聫聭盲潞潞忙聽录氓聬聦忙颅楼氓庐聦忙聢聬盲潞聥盲禄露
            dispatchPersonaSyncEvent(lang);
        }
    }
    
    /**
     * 猫聨路氓聫聳忙聦聡氓庐職忙聶潞猫聝陆盲陆聯莽職聞盲潞潞忙聽录茅聟聧莽陆庐
     * @param {string} agentName - 忙聶潞猫聝陆盲陆聯氓聬聧莽搂掳
     * @returns {Object} - 忙聶潞猫聝陆盲陆聯盲潞潞忙聽录茅聟聧莽陆庐
     */
    function getAgentPersona(agentName) {
        return personaState.agents[agentName] || null;
    }
    
    /**
     * 猫聨路氓聫聳忙聣聙忙聹聣忙聶潞猫聝陆盲陆聯莽職聞盲潞潞忙聽录莽聤露忙聙聛
     * @returns {Object} - 忙聣聙忙聹聣忙聶潞猫聝陆盲陆聯莽職聞盲潞潞忙聽录茅聟聧莽陆庐
     */
    function getAllPersonas() {
        return { ...personaState.agents };
    }
    
    /**
     * 忙聽鹿忙聧庐盲潞潞忙聽录莽卤禄氓聻聥忙聽录氓录聫氓聦聳忙露聢忙聛炉
     * @param {string} agentName - 忙聶潞猫聝陆盲陆聯氓聬聧莽搂掳
     * @param {string} message - 氓聨聼氓搂聥忙露聢忙聛炉
     * @returns {string} - 忙聽录氓录聫氓聦聳氓聬聨莽職聞忙露聢忙聛炉
     */
    function formatMessageByPersona(agentName, message) {
        const persona = getAgentPersona(agentName);
        if (!persona || !message) {
            return message;
        }
        
        // 忙聽鹿忙聧庐盲赂聧氓聬聦莽職聞盲潞潞忙聽录莽卤禄氓聻聥猫驴聸猫隆聦忙露聢忙聛炉忙聽录氓录聫氓聦聳
        switch (persona.persona) {
            case '氓聢聠忙聻聬氓聻聥':
            case 'Analytical':
                return formatAnalyticalMessage(message, persona);
            
            case '茅聰聙氓聰庐氓聻聥':
            case 'Sales':
                return formatSalesMessage(message, persona);
            
            case '忙聣搂猫隆聦氓聻聥':
            case 'Execution':
                return formatExecutionMessage(message, persona);
            
            default:
                return message;
        }
    }
    
    /**
     * 忙聽录氓录聫氓聦聳氓聢聠忙聻聬氓聻聥盲潞潞忙聽录忙露聢忙聛炉
     */
    function formatAnalyticalMessage(message, persona) {
        // 忙路禄氓聤聽氓聢聠忙聻聬忙聽聡猫庐掳氓聮聦忙聙禄莽禄聯
        return `${message}\n\n${persona.signature}`;
    }
    
    /**
     * 忙聽录氓录聫氓聦聳茅聰聙氓聰庐氓聻聥盲潞潞忙聽录忙露聢忙聛炉
     */
    function formatSalesMessage(message, persona) {
        // 忙路禄氓聤聽氓聫聥氓楼陆茅聴庐氓聙聶氓聮聦氓录聲氓炉录
        return `${message}\n\n${persona.signature}`;
    }
    
    /**
     * 忙聽录氓录聫氓聦聳忙聣搂猫隆聦氓聻聥盲潞潞忙聽录忙露聢忙聛炉
     */
    function formatExecutionMessage(message, persona) {
        // 莽聸麓忙聨楼莽庐聙忙麓聛茂录聦忙路禄氓聤聽忙聣搂猫隆聦莽聤露忙聙聛
        return `${message} ${persona.signature}`;
    }
    
    /**
     * 忙拢聙忙碌聥氓鹿露猫搂拢氓聠鲁盲潞潞忙聽录氓聠虏莽陋聛
     * @returns {boolean} - 忙聵炉氓聬娄忙拢聙忙碌聥氓聢掳氓鹿露猫搂拢氓聠鲁盲潞聠氓聠虏莽陋聛
     */
    function resolvePersonaConflicts() {
        // 忙拢聙忙聼楼忙聣聙忙聹聣忙聶潞猫聝陆盲陆聯猫炉颅猫篓聙忙聵炉氓聬娄盲赂聙猫聡麓
        const languages = new Set();
        Object.values(personaState.agents).forEach(agent => {
            languages.add(personaState.currentLang);
        });
        
        if (languages.size > 1) {
            // 忙拢聙忙碌聥氓聢掳猫炉颅猫篓聙盲赂聧盲赂聙猫聡麓茂录聦莽禄聼盲赂聙氓聢掳盲赂禄猫娄聛猫炉颅猫篓聙
            const mainLang = personaState.currentLang;
            syncPersonasToLanguage(mainLang);
            
            console.warn('[L8.6][PersonaLinker] 忙拢聙忙碌聥氓聢掳盲潞潞忙聽录氓聠虏莽陋聛茂录聦氓路虏猫聡陋氓聤篓猫掳聝氓聮聦');
            
            // 猫搂娄氓聫聭氓聠虏莽陋聛猫搂拢氓聠鲁盲潞聥盲禄露
            const event = new CustomEvent('persona-conflict-resolved', {
                detail: {
                    lang: mainLang,
                    conflictDetected: true
                }
            });
            document.dispatchEvent(event);
            
            return true;
        }
        
        return false;
    }
    
    /**
     * 猫搂娄氓聫聭盲潞潞忙聽录氓聬聦忙颅楼盲潞聥盲禄露
     * @param {string} lang - 氓聬聦忙颅楼莽職聞猫炉颅猫篓聙
     */
    function dispatchPersonaSyncEvent(lang) {
        const event = new CustomEvent('persona-synchronized', {
            detail: {
                lang: lang,
                personas: getAllPersonas()
            }
        });
        document.dispatchEvent(event);
    }
    
    /**
     * 猫聨路氓聫聳氓陆聯氓聣聧盲潞潞忙聽录氓聬聦忙颅楼莽聤露忙聙聛
     * @returns {Object} - 盲潞潞忙聽录莽聤露忙聙聛氓炉鹿猫卤隆
     */
    function getPersonaState() {
        return { ...personaState };
    }
    
    // 莽聸聭氓聬卢猫炉颅猫篓聙氓聫聵忙聸麓盲潞聥盲禄露
    document.addEventListener('lang-change', (event) => {
        const newLang = event.detail.lang;
        console.log(`[L8.6][PersonaLinker] 氓聯聧氓潞聰猫炉颅猫篓聙氓聫聵忙聸麓: ${newLang}`);
        syncPersonasToLanguage(newLang);
    });
    
    // 氓炉录氓聡潞API
    window.JEV_PersonaLinker = {
        syncPersonasToLanguage,
        getAgentPersona,
        getAllPersonas,
        formatMessageByPersona,
        resolvePersonaConflicts,
        getPersonaState
    };
    
    // 氓聢聺氓搂聥氓聦聳
    console.log('[L8.6][PersonaLinker] 忙篓隆氓聺聴氓聢聺氓搂聥氓聦聳氓庐聦忙聢聬');
})();