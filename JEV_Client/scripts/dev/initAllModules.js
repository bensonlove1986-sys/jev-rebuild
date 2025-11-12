/* UTF-8 FIXED BY JEV @ 2025-11-09T15:11:17.730Z */
// JEV 忙聶潞猫聝陆氓庐垄忙聹聧忙聫聮盲禄露 - 忙篓隆氓聺聴莽禄聼盲赂聙忙拢聙忙碌聥猫聞職忙聹卢
// 莽聰篓盲潞聨忙拢聙忙碌聥忙聣聙忙聹聣忙篓隆氓聺聴忙聵炉氓聬娄忙颅拢氓赂赂氓聤聽猫陆陆茂录聦氓鹿露盲禄聟氓聹篓莽聣鹿氓庐職莽陆聭莽芦聶盲赂聤氓聤聽猫陆陆氓聤聼猫聝陆忙篓隆氓聺聴

(function() {
    'use strict';
    
    // 忙拢聙忙聼楼氓陆聯氓聣聧莽陆聭茅隆碌忙聵炉氓聬娄盲赂潞莽聸庐忙聽聡莽陆聭氓聺聙
    if (window.location.hostname !== "app.daojiemarketing.com") {
        console.log('[JEV][Check] 氓陆聯氓聣聧盲赂聧忙聵炉莽聸庐忙聽聡莽陆聭莽芦聶茂录聦猫路鲁猫驴聡氓聤聼猫聝陆忙篓隆氓聺聴氓聤聽猫陆陆');
        return;
    }
    
    console.log('[JEV][Check] 氓陆聯氓聣聧盲赂潞莽聸庐忙聽聡莽陆聭莽芦聶茂录聦氓录聙氓搂聥忙拢聙忙碌聥忙篓隆氓聺聴莽聤露忙聙聛...');
    
    // 氓陆漏猫聣虏忙聴楼氓驴聴猫戮聟氓聤漏氓聡陆忙聲掳
    const Logger = {
        success: (message) => console.log(`%c芒聹聟 ${message}`, 'color: #00ff99'),
        error: (message) => console.log(`%c芒聺聦 ${message}`, 'color: #ff6b6b'),
        info: (message) => console.log(`冒聼聯聥 ${message}`)
    };
    
    // 忙拢聙忙碌聥莽禄聯忙聻聹忙卤聡忙聙禄氓炉鹿猫卤隆
    const moduleStatus = {
        loaded: [],
        failed: []
    };
    
    // 猫娄聛忙拢聙忙碌聥莽職聞忙篓隆氓聺聴氓聢聴猫隆篓
    const modulesToCheck = [
        'connection.js',
        'storage.js',
        'utils.js',
        'ui-core.js',
        'chat.js',
        'ai.js',
        'translate.js',
        'tools.js',
        'settings.js',
        'checkUpdate.js'
    ];
    
    // 氓聤聽猫陆陆猫聛聤氓陇漏忙篓隆氓聺聴
    function loadChatModule() {
        console.log('[JEV][DEV] 氓聤聽猫陆陆猫聛聤氓陇漏忙篓隆氓聺聴');
        const script = document.createElement('script');
        script.src = "scripts/modules/chat.js";
        document.body.appendChild(script);
    }
    
    // 氓聤聽猫陆陆AI忙聨篓猫聧聬忙篓隆氓聺聴
    function loadAIRecommendation() {
        console.log('[JEV][DEV] 氓聤聽猫陆陆AI忙聨篓猫聧聬忙篓隆氓聺聴');
        const script = document.createElement('script');
        script.src = "scripts/modules/ai.js";
        document.body.appendChild(script);
    }
    
    // 氓聤聽猫陆陆莽驴禄猫炉聭忙篓隆氓聺聴
    function loadTranslateModule() {
        console.log('[JEV][DEV] 氓聤聽猫陆陆莽驴禄猫炉聭忙篓隆氓聺聴');
        const script = document.createElement('script');
        script.src = "scripts/modules/translate.js";
        document.body.appendChild(script);
    }
    
    // 氓聤聽猫陆陆猫聡陋氓聤篓氓聦聳盲禄禄氓聤隆忙聣搂猫隆聦氓聶篓
    function loadAutoTaskRunner() {
        console.log('[JEV][DEV] 氓聤聽猫陆陆猫聡陋氓聤篓氓聦聳盲禄禄氓聤隆忙聣搂猫隆聦氓聶篓');
        const script = document.createElement('script');
        script.src = "scripts/auto_task_runner.js";
        script.onload = () => {
            console.log('[JEV][DEV] 猫聡陋氓聤篓氓聦聳盲禄禄氓聤隆忙聣搂猫隆聦氓聶篓氓聤聽猫陆陆氓庐聦忙聢聬');
        };
        document.body.appendChild(script);
    }
    
    // 忙拢聙忙碌聥忙篓隆氓聺聴氓聤聽猫陆陆莽聤露忙聙聛
    function checkModuleLoading() {
        Logger.info('=== JEV 忙篓隆氓聺聴氓聤聽猫陆陆莽聤露忙聙聛忙聤楼氓聭聤 ===');
        
        modulesToCheck.forEach(moduleName => {
            // 忙拢聙忙聼楼盲赂聧氓聬聦莽卤禄氓聻聥莽職聞忙篓隆氓聺聴
            if (moduleName.includes('ui-core')) {
                // UI忙聽赂氓驴聝忙篓隆氓聺聴
                if (window.JEV_UI && typeof window.JEV_UI.init === 'function') {
                    Logger.success(`${moduleName} 氓聤聽猫陆陆忙聢聬氓聤聼`);
                    moduleStatus.loaded.push(moduleName);
                } else {
                    Logger.error(`${moduleName} 氓聤聽猫陆陆氓陇卤猫麓楼`);
                    moduleStatus.failed.push(moduleName);
                }
            } else if (moduleName.includes('.js')) {
                // 氓聟露盲禄聳忙篓隆氓聺聴忙拢聙忙聼楼
                const moduleKey = moduleName.replace('.js', '');
                if (window.JEV_MODULES && window.JEV_MODULES[moduleKey]) {
                    Logger.success(`${moduleName} 氓聤聽猫陆陆忙聢聬氓聤聼`);
                    moduleStatus.loaded.push(moduleName);
                } else {
                    Logger.error(`${moduleName} 氓聤聽猫陆陆氓陇卤猫麓楼`);
                    moduleStatus.failed.push(moduleName);
                }
            }
        });
        
        // 猫戮聯氓聡潞忙聙禄莽禄聯
        Logger.info(`忙聙禄猫搂聢: 忙聢聬氓聤聼 ${moduleStatus.loaded.length}/${modulesToCheck.length}`);
        if (moduleStatus.failed.length > 0) {
            Logger.error(`忙聹陋氓聤聽猫陆陆忙篓隆氓聺聴: ${moduleStatus.failed.join(', ')}`);
        } else {
            Logger.success('忙聣聙忙聹聣忙篓隆氓聺聴氓聤聽猫陆陆忙颅拢氓赂赂茂录聛');
        }
    }
    
    // 氓聫陋氓聹篓莽聸庐忙聽聡莽陆聭莽芦聶氓聤聽猫陆陆氓聤聼猫聝陆忙篓隆氓聺聴
    loadChatModule();
    loadAIRecommendation();
    loadTranslateModule();
    loadAutoTaskRunner();
    
    // 氓禄露猫驴聼忙聣搂猫隆聦忙拢聙忙碌聥茂录聦莽隆庐盲驴聺忙聣聙忙聹聣忙篓隆氓聺聴忙聹聣忙聴露茅聴麓氓聤聽猫陆陆
    setTimeout(checkModuleLoading, 3000);
})();