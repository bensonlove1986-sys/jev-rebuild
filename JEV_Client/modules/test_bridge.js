/* UTF-8 FIXED BY JEV @ 2025-11-09T15:11:17.635Z */
// 忙碌聥猫炉聲Bridge忙篓隆氓聺聴忙聵炉氓聬娄忙颅拢莽隆庐氓聤聽猫陆陆氓聮聦氓聢聺氓搂聥氓聦聳

// 氓掳聺猫炉聲氓炉录氓聟楼忙聣聙忙聹聣忙篓隆氓聺聴
let modulesLoaded = 0;
const totalModules = 4;

try {
  import('./clientBridge.js').then(() => {
    console.log('[L8.9.8] clientBridge 忙篓隆氓聺聴氓路虏氓聤聽猫陆陆');
    modulesLoaded++;
    checkAllLoaded();
  });
} catch (e) {
  console.error('[L8.9.8] clientBridge 忙篓隆氓聺聴氓聤聽猫陆陆氓陇卤猫麓楼:', e);
}

try {
  import('./clientEventSync.js').then(() => {
    console.log('[L8.9.8] clientEventSync 忙篓隆氓聺聴氓路虏氓聤聽猫陆陆');
    modulesLoaded++;
    checkAllLoaded();
  });
} catch (e) {
  console.error('[L8.9.8] clientEventSync 忙篓隆氓聺聴氓聤聽猫陆陆氓陇卤猫麓楼:', e);
}

try {
  import('./agentSession.js').then(() => {
    console.log('[L8.9.8] agentSession 忙篓隆氓聺聴氓路虏氓聤聽猫陆陆');
    modulesLoaded++;
    checkAllLoaded();
  });
} catch (e) {
  console.error('[L8.9.8] agentSession 忙篓隆氓聺聴氓聤聽猫陆陆氓陇卤猫麓楼:', e);
}

try {
  import('./daoCollectorBridge.js').then(() => {
    console.log('[L8.9.8] daoCollectorBridge 忙篓隆氓聺聴氓路虏氓聤聽猫陆陆');
    modulesLoaded++;
    checkAllLoaded();
  });
} catch (e) {
  console.error('[L8.9.8] daoCollectorBridge 忙篓隆氓聺聴氓聤聽猫陆陆氓陇卤猫麓楼:', e);
}

function checkAllLoaded() {
  if (modulesLoaded === totalModules) {
    // 猫戮聯氓聡潞忙聹聙莽禄聢忙聢聬氓聤聼忙聴楼氓驴聴茂录聦猫驴聶忙聵炉JSON忙篓隆忙聺驴盲赂颅忙聹聼忙聹聸莽職聞猫戮聯氓聡潞
    console.log('[L8.9.8][Bridge] 氓聢聺氓搂聥氓聦聳氓庐聦忙聢聬 芒聹聟 茅聙職盲驴隆茫聙聛氓聬聦忙颅楼茫聙聛盲录職猫炉聺茫聙聛猫陆卢氓聫聭忙篓隆氓聺聴氓路虏忙鲁篓氓聠聦');
  }
}
