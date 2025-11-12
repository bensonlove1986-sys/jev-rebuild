/* UTF-8 FIXED BY JEV @ 2025-11-09T15:11:17.807Z */
// JEV 氓庐垄忙聹聧忙聫聮盲禄露 - 氓掳聫氓路楼氓聟路忙篓隆氓聺聴

(function() {
    'use strict';
    
    console.log('[JEV][tools] 氓聤聽猫陆陆氓掳聫氓路楼氓聟路忙篓隆氓聺聴...');
    
    // 氓掳聫氓路楼氓聟路忙篓隆氓聺聴氓炉鹿猫卤隆
    window.JEV_MODULES = window.JEV_MODULES || {};
    window.JEV_MODULES['tools'] = {
        container: null,
        activeTool: 'converter',
        lastActiveTool: 'converter',
        
        // 忙赂虏忙聼聯忙篓隆氓聺聴
        render: function(container) {
            console.log('[JEV][tools] 忙赂虏忙聼聯氓掳聫氓路楼氓聟路忙篓隆氓聺聴');
            this.container = container;
            
            // 氓聢聸氓禄潞氓掳聫氓路楼氓聟路氓庐鹿氓聶篓
            const toolsContainer = document.createElement('div');
            toolsContainer.className = 'jev-tools-container';
            toolsContainer.innerHTML = `
                <div class="jev-tools-header">
                    <h2 style="margin: 0 0 20px 0; font-size: 20px; color: #00ff99;">
                        氓庐聻莽聰篓氓掳聫氓路楼氓聟路
                    </h2>
                    <p style="margin: 0 0 24px 0; color: #b8f5c4; font-size: 14px;">
                        忙卤聡莽聨聡猫陆卢忙聧垄茫聙聛氓聧聲盲陆聧忙聧垄莽庐聴茫聙聛忙聴露茅聴麓猫庐隆莽庐聴莽颅聣氓赂赂莽聰篓氓路楼氓聟路
                    </p>
                </div>
                
                <div class="jev-tools-tabs">
                    <div class="jev-tool-tab active" data-tool="converter">
                        <span>氓聧聲盲陆聧忙聧垄莽庐聴</span>
                    </div>
                    <div class="jev-tool-tab" data-tool="currency">
                        <span>忙卤聡莽聨聡猫陆卢忙聧垄</span>
                    </div>
                    <div class="jev-tool-tab" data-tool="time">
                        <span>忙聴露茅聴麓氓路楼氓聟路</span>
                    </div>
                    <div class="jev-tool-tab" data-tool="text">
                        <span>忙聳聡忙聹卢氓陇聞莽聬聠</span>
                    </div>
                </div>
                
                <div class="jev-tools-content" id="jev-tools-content">
                    <!-- 氓路楼氓聟路氓聠聟氓庐鹿氓掳聠氓聹篓猫驴聶茅聡聦氓聤篓忙聙聛氓聤聽猫陆陆 -->
                </div>
            `;
            
            container.appendChild(toolsContainer);
            
            // 忙路禄氓聤聽氓路楼氓聟路忙篓隆氓聺聴忙聽路氓录聫
            this.addToolsStyles();
            
            // 氓聢聺氓搂聥氓聦聳忙聵戮莽陇潞茅禄聵猫庐陇氓路楼氓聟路
            this.loadTool('converter');
        },
        
        // 忙路禄氓聤聽氓路楼氓聟路忙聽路氓录聫
        addToolsStyles: function() {
            const style = document.createElement('style');
            style.textContent = `
                /* 氓掳聫氓路楼氓聟路茅聙職莽聰篓忙聽路氓录聫 */
                .jev-tools-container {
                    height: 100%;
                    display: flex;
                    flex-direction: column;
                }
                
                .jev-tools-tabs {
                    display: flex;
                    gap: 4px;
                    background: rgba(10, 25, 15, 0.6);
                    border-radius: 10px;
                    margin-bottom: 24px;
                    padding: 6px;
                    backdrop-filter: blur(5px);
                    border: 1px solid rgba(0, 255, 140, 0.1);
                }
                
                .jev-tool-tab {
                    flex: 1;
                    padding: 12px 16px;
                    text-align: center;
                    cursor: pointer;
                    border-radius: 8px;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    user-select: none;
                    border: 1px solid transparent;
                    background: rgba(10, 25, 15, 0.3);
                    color: #b8f5c4;
                    font-weight: 500;
                    position: relative;
                    overflow: hidden;
                }
                
                .jev-tool-tab:hover {
                    background: rgba(0, 255, 140, 0.1);
                    border-color: rgba(0, 255, 140, 0.3);
                    transform: translateY(-1px);
                }
                
                .jev-tool-tab.active {
                    background: rgba(0, 255, 140, 0.2);
                    border-color: rgba(0, 255, 140, 0.5);
                    color: #00ff99;
                    box-shadow: 0 4px 12px rgba(0, 255, 140, 0.25);
                    transform: translateY(-2px);
                }
                
                .jev-tool-tab.active::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    height: 3px;
                    background: linear-gradient(90deg, #00ff99, #4da6ff);
                }
                
                .jev-tools-content {
                    flex: 1;
                    overflow-y: auto;
                    padding: 0 2px;
                    border-radius: 8px;
                }
                
                /* 茅聙職莽聰篓氓路楼氓聟路猫隆篓氓聧聲忙聽路氓录聫 */
                .jev-tool-form {
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                }
                
                .jev-tool-form-group {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }
                
                .jev-tool-form-group label {
                    font-weight: 500;
                    color: #b8f5c4;
                    font-size: 14px;
                }
                
                .jev-tool-form-row {
                    display: flex;
                    gap: 12px;
                    align-items: flex-end;
                }
                
                .jev-tool-form-row .jev-tool-form-group {
                    flex: 1;
                }
                
                .jev-tool-input {
                    padding: 12px 16px;
                    background: rgba(10, 25, 15, 0.7);
                    border: 1px solid rgba(0, 255, 140, 0.2);
                    border-radius: 8px;
                    color: #fff;
                    font-size: 14px;
                    font-family: inherit;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    width: 100%;
                    box-sizing: border-box;
                    backdrop-filter: blur(5px);
                }
                
                .jev-tool-input:focus {
                    outline: none;
                    border-color: rgba(0, 255, 140, 0.5);
                    box-shadow: 0 0 12px rgba(0, 255, 140, 0.3);
                    background: rgba(10, 25, 15, 0.9);
                    transform: translateY(-1px);
                }
                
                .jev-tool-select {
                    padding: 12px 16px;
                    background: rgba(10, 25, 15, 0.7);
                    border: 1px solid rgba(0, 255, 140, 0.2);
                    border-radius: 8px;
                    color: #fff;
                    font-size: 14px;
                    cursor: pointer;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    width: 100%;
                    box-sizing: border-box;
                    backdrop-filter: blur(5px);
                    font-family: inherit;
                }
                
                .jev-tool-select:focus {
                    outline: none;
                    border-color: rgba(0, 255, 140, 0.5);
                    box-shadow: 0 0 12px rgba(0, 255, 140, 0.3);
                    transform: translateY(-1px);
                }
                
                .jev-tool-button {
                    padding: 12px 24px;
                    background: rgba(0, 255, 140, 0.2);
                    border: 1px solid rgba(0, 255, 140, 0.3);
                    border-radius: 8px;
                    color: #00ff99;
                    font-size: 14px;
                    cursor: pointer;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    font-weight: 600;
                    position: relative;
                    overflow: hidden;
                    backdrop-filter: blur(5px);
                    font-family: inherit;
                }
                
                .jev-tool-button:hover {
                    background: rgba(0, 255, 140, 0.3);
                    box-shadow: 0 4px 16px rgba(0, 255, 140, 0.4);
                    border-color: rgba(0, 255, 140, 0.5);
                    transform: translateY(-2px);
                }
                
                .jev-tool-button:active {
                    transform: translateY(0);
                    box-shadow: 0 2px 8px rgba(0, 255, 140, 0.4);
                }
                
                .jev-tool-result {
                    margin-top: 24px;
                    padding: 20px;
                    background: rgba(10, 25, 15, 0.7);
                    border: 1px solid rgba(0, 255, 140, 0.2);
                    border-radius: 10px;
                    backdrop-filter: blur(5px);
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                }
                
                .jev-tool-result:hover {
                    box-shadow: 0 6px 20px rgba(0, 255, 140, 0.15);
                    border-color: rgba(0, 255, 140, 0.3);
                }
                
                .jev-tool-result-title {
                    font-size: 16px;
                    font-weight: 600;
                    color: #00ff99;
                    margin-bottom: 12px;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                
                .jev-tool-result-content {
                    font-size: 15px;
                    color: #e0ffe5;
                    line-height: 1.6;
                }
                
                .jev-tool-result-highlight {
                    font-size: 18px;
                    font-weight: 700;
                    color: #00ff99;
                    margin: 12px 0;
                    padding: 8px 12px;
                    background: rgba(0, 255, 140, 0.1);
                    border-radius: 6px;
                    text-align: center;
                    border-radius: 8px;
                }
                
                .jev-tool-result-label {
                    font-size: 12px;
                    color: #66b878;
                    margin-bottom: 8px;
                }
                
                .jev-tool-result-value {
                    font-size: 18px;
                    color: #00ff99;
                    font-weight: 500;
                }
                
                .jev-tool-icon-button {
                    background: none;
                    border: none;
                    color: #00ff99;
                    cursor: pointer;
                    font-size: 16px;
                    padding: 8px;
                    border-radius: 4px;
                    transition: background 0.3s ease;
                }
                
                .jev-tool-icon-button:hover {
                    background: rgba(0, 255, 140, 0.2);
                }
                
                .jev-tool-swap-icon {
                    transform: rotate(90deg);
                }
                
                .jev-tool-info {
                    font-size: 12px;
                    color: #66b878;
                    margin-top: 8px;
                    padding: 8px;
                    background: rgba(10, 25, 15, 0.5);
                    border-radius: 4px;
                    border-left: 3px solid rgba(0, 255, 140, 0.5);
                }
            `;
            document.head.appendChild(style);
        },
        
        // 氓聢聺氓搂聥氓聦聳忙篓隆氓聺聴
        init: function() {
            console.log('[JEV][tools] 氓聢聺氓搂聥氓聦聳氓掳聫氓路楼氓聟路忙篓隆氓聺聴');
            
            // 莽禄聭氓庐職盲潞聥盲禄露
            this.bindEvents();
            
            // 忙聛垄氓陇聧盲赂聤忙卢隆盲陆驴莽聰篓莽職聞氓路楼氓聟路
            if (window.JEV_STORAGE && window.JEV_STORAGE.getItem) {
                const lastTool = window.JEV_STORAGE.getItem('JEV_LAST_ACTIVE_TOOL');
                if (lastTool && ['converter', 'currency', 'time', 'text'].includes(lastTool)) {
                    this.activeTool = lastTool;
                    this.loadTool(lastTool);
                }
            }
        },
        
        // 茅聰聙忙炉聛忙篓隆氓聺聴
        destroy: function() {
            console.log('[JEV][tools] 茅聰聙忙炉聛氓掳聫氓路楼氓聟路忙篓隆氓聺聴');
            
            // 淇濆瓨氓陆聯氓聣聧氓路楼氓聟路莽聤露忙聙聛
            if (window.JEV_STORAGE && window.JEV_STORAGE.setItem) {
                window.JEV_STORAGE.setItem('JEV_LAST_ACTIVE_TOOL', this.activeTool);
            }
            
            // 忙赂聟莽聬聠氓录聲莽聰篓
            this.container = null;
        },
        
        // 莽禄聭氓庐職盲潞聥盲禄露
        bindEvents: function() {
            const tabs = document.querySelectorAll('.jev-tool-tab');
            tabs.forEach(tab => {
                tab.addEventListener('click', () => {
                    const toolName = tab.dataset.tool;
                    this.loadTool(toolName);
                });
            });
        },
        
        // 氓聤聽猫陆陆忙聦聡氓庐職氓路楼氓聟路
        loadTool: function(toolName) {
            if (this.activeTool === toolName) return;
            
            console.log(`[JEV][tools] 氓聤聽猫陆陆氓路楼氓聟路: ${toolName}`);
            
            // 鏇存柊忙驴聙忙麓禄莽聤露忙聙聛
            document.querySelectorAll('.jev-tool-tab').forEach(tab => {
                if (tab.dataset.tool === toolName) {
                    tab.classList.add('active');
                } else {
                    tab.classList.remove('active');
                }
            });
            
            this.activeTool = toolName;
            const contentContainer = document.getElementById('jev-tools-content');
            contentContainer.innerHTML = '<div style="display: flex; align-items: center; justify-content: center; padding: 40px; color: #00ff99;">氓聤聽猫陆陆氓路楼氓聟路盲赂颅...</div>';
            
            // 氓禄露猫驴聼氓聤聽猫陆陆盲禄楼忙聵戮莽陇潞氓聤篓莽聰禄忙聲聢忙聻聹
            setTimeout(() => {
                switch(toolName) {
                    case 'converter':
                        this.renderConverterTool();
                        break;
                    case 'currency':
                        this.renderCurrencyTool();
                        break;
                    case 'time':
                        this.renderTimeTool();
                        break;
                    case 'text':
                        this.renderTextTool();
                        break;
                    default:
                        contentContainer.innerHTML = '<div style="text-align: center; padding: 40px; color: #ff3b3b;">氓路楼氓聟路盲赂聧氓颅聵氓聹篓</div>';
                }
            }, 300);
        },
        
        // 忙赂虏忙聼聯氓聧聲盲陆聧忙聧垄莽庐聴氓路楼氓聟路
        renderConverterTool: function() {
            const contentContainer = document.getElementById('jev-tools-content');
            contentContainer.innerHTML = `
                <div class="jev-tool-form">
                    <div class="jev-tool-form-group">
                        <label>茅聙聣忙聥漏氓聧聲盲陆聧莽卤禄氓聻聥</label>
                        <select class="jev-tool-select" id="converter-type">
                            <option value="length">茅聲驴氓潞娄</option>
                            <option value="weight">茅聡聧茅聡聫</option>
                            <option value="area">茅聺垄莽搂炉</option>
                            <option value="volume">盲陆聯莽搂炉</option>
                            <option value="temperature">忙赂漏氓潞娄</option>
                        </select>
                    </div>
                    
                    <div class="jev-tool-form-row">
                        <div class="jev-tool-form-group">
                            <label>盲禄聨</label>
                            <div style="display: flex; gap: 8px;">
                                <input type="number" class="jev-tool-input" id="converter-from-value" value="1" placeholder="猫戮聯氓聟楼忙聲掳氓聙录">
                                <select class="jev-tool-select" id="converter-from-unit" style="width: auto; min-width: 100px;">
                                    <!-- 氓聧聲盲陆聧茅聙聣茅隆鹿氓掳聠氓聤篓忙聙聛氓聤聽猫陆陆 -->
                                </select>
                            </div>
                        </div>
                        
                        <button class="jev-tool-icon-button" id="converter-swap">
                            芒聡聞
                        </button>
                        
                        <div class="jev-tool-form-group">
                            <label>氓聢掳</label>
                            <div style="display: flex; gap: 8px;">
                                <input type="number" class="jev-tool-input" id="converter-to-value" readonly placeholder="莽禄聯忙聻聹">
                                <select class="jev-tool-select" id="converter-to-unit" style="width: auto; min-width: 100px;">
                                    <!-- 氓聧聲盲陆聧茅聙聣茅隆鹿氓掳聠氓聤篓忙聙聛氓聤聽猫陆陆 -->
                                </select>
                            </div>
                        </div>
                    </div>
                    
                    <button class="jev-tool-button" id="converter-calculate">猫庐隆莽庐聴</button>
                    
                    <div id="converter-result" class="jev-tool-result" style="display: none;">
                        <div class="jev-tool-result-label">猫陆卢忙聧垄莽禄聯忙聻聹</div>
                        <div class="jev-tool-result-value" id="converter-result-text"></div>
                    </div>
                    
                    <div class="jev-tool-info">
                        冒聼聮隆 忙聫聬莽陇潞茂录職猫戮聯氓聟楼忙聲掳氓聙录氓聬聨鐐瑰嚮猫庐隆莽庐聴忙聦聣茅聮庐忙聢聳莽聸麓忙聨楼忙聦聣Enter茅聰庐猫驴聸猫隆聦忙聧垄莽庐聴茫聙聜鐐瑰嚮芒聡聞氓聫炉盲潞聮忙聧垄氓聧聲盲陆聧茫聙聜
                    </div>
                </div>
            `;
            
            // 氓聤聽猫陆陆氓聧聲盲陆聧茅聙聣茅隆鹿
            this.loadConverterUnits('length');
            
            // 莽禄聭氓庐職盲潞聥盲禄露
            document.getElementById('converter-type').addEventListener('change', (e) => {
                this.loadConverterUnits(e.target.value);
            });
            
            document.getElementById('converter-calculate').addEventListener('click', () => {
                this.calculateConversion();
            });
            
            document.getElementById('converter-from-value').addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    this.calculateConversion();
                }
            });
            
            document.getElementById('converter-swap').addEventListener('click', () => {
                this.swapConverterUnits();
            });
            
            document.getElementById('converter-from-unit').addEventListener('change', this.calculateConversion.bind(this));
            document.getElementById('converter-to-unit').addEventListener('change', this.calculateConversion.bind(this));
        },
        
        // 氓聤聽猫陆陆忙聧垄莽庐聴氓聧聲盲陆聧茅聙聣茅隆鹿
        loadConverterUnits: function(type) {
            const units = this.getConverterUnits(type);
            const fromUnitSelect = document.getElementById('converter-from-unit');
            const toUnitSelect = document.getElementById('converter-to-unit');
            
            fromUnitSelect.innerHTML = '';
            toUnitSelect.innerHTML = '';
            
            units.forEach(unit => {
                const fromOption = document.createElement('option');
                fromOption.value = unit.value;
                fromOption.textContent = unit.label;
                fromUnitSelect.appendChild(fromOption);
                
                const toOption = document.createElement('option');
                toOption.value = unit.value;
                toOption.textContent = unit.label;
                toUnitSelect.appendChild(toOption);
            });
            
            // 璁剧疆茅禄聵猫庐陇莽聸庐忙聽聡氓聧聲盲陆聧
            if (units.length > 1) {
                toUnitSelect.selectedIndex = 1;
            }
            
            // 猫聡陋氓聤篓猫庐隆莽庐聴
            this.calculateConversion();
        },
        
        // 猫聨路氓聫聳忙聧垄莽庐聴氓聧聲盲陆聧茅聟聧莽陆庐
        getConverterUnits: function(type) {
            const unitConfigs = {
                length: [
                    { value: 'meter', label: '莽卤鲁 (m)' },
                    { value: 'kilometer', label: '氓聧聝莽卤鲁 (km)' },
                    { value: 'centimeter', label: '氓聨聵莽卤鲁 (cm)' },
                    { value: 'millimeter', label: '忙炉芦莽卤鲁 (mm)' },
                    { value: 'inch', label: '猫聥卤氓炉赂 (in)' },
                    { value: 'foot', label: '猫聥卤氓掳潞 (ft)' },
                    { value: 'yard', label: '莽聽聛 (yd)' }
                ],
                weight: [
                    { value: 'kilogram', label: '氓聧聝氓聟聥 (kg)' },
                    { value: 'gram', label: '氓聟聥 (g)' },
                    { value: 'milligram', label: '忙炉芦氓聟聥 (mg)' },
                    { value: 'pound', label: '莽拢聟 (lb)' },
                    { value: 'ounce', label: '莽聸聨氓聫赂 (oz)' }
                ],
                area: [
                    { value: 'square_meter', label: '氓鹿鲁忙聳鹿莽卤鲁 (m脗虏)' },
                    { value: 'square_kilometer', label: '氓鹿鲁忙聳鹿氓聧聝莽卤鲁 (km脗虏)' },
                    { value: 'square_centimeter', label: '氓鹿鲁忙聳鹿氓聨聵莽卤鲁 (cm脗虏)' },
                    { value: 'square_millimeter', label: '氓鹿鲁忙聳鹿忙炉芦莽卤鲁 (mm脗虏)' },
                    { value: 'square_inch', label: '氓鹿鲁忙聳鹿猫聥卤氓炉赂 (in脗虏)' },
                    { value: 'square_foot', label: '氓鹿鲁忙聳鹿猫聥卤氓掳潞 (ft脗虏)' },
                    { value: 'acre', label: '猫聥卤盲潞漏 (acre)' },
                    { value: 'hectare', label: '氓聟卢茅隆路 (ha)' }
                ],
                volume: [
                    { value: 'cubic_meter', label: '莽芦聥忙聳鹿莽卤鲁 (m脗鲁)' },
                    { value: 'cubic_centimeter', label: '莽芦聥忙聳鹿氓聨聵莽卤鲁 (cm脗鲁)' },
                    { value: 'liter', label: '氓聧聡 (L)' },
                    { value: 'milliliter', label: '忙炉芦氓聧聡 (mL)' },
                    { value: 'cubic_inch', label: '莽芦聥忙聳鹿猫聥卤氓炉赂 (in脗鲁)' },
                    { value: 'cubic_foot', label: '莽芦聥忙聳鹿猫聥卤氓掳潞 (ft脗鲁)' },
                    { value: 'gallon_us', label: '莽戮聨氓聢露氓聤聽盲禄聭 (gal)' },
                    { value: 'gallon_uk', label: '猫聥卤氓聢露氓聤聽盲禄聭 (gal)' }
                ],
                temperature: [
                    { value: 'celsius', label: '忙聭聞忙掳聫氓潞娄 (脗掳C)' },
                    { value: 'fahrenheit', label: '氓聧聨忙掳聫氓潞娄 (脗掳F)' },
                    { value: 'kelvin', label: '氓录聙氓掳聰忙聳聡 (K)' }
                ]
            };
            
            return unitConfigs[type] || [];
        },
        
        // 猫庐隆莽庐聴氓聧聲盲陆聧忙聧垄莽庐聴
        calculateConversion: function() {
            const typeSelect = document.getElementById('converter-type');
            const fromValue = parseFloat(document.getElementById('converter-from-value').value);
            const fromUnit = document.getElementById('converter-from-unit').value;
            const toUnit = document.getElementById('converter-to-unit').value;
            
            if (isNaN(fromValue)) {
                return;
            }
            
            let result;
            const type = typeSelect.value;
            
            // 忙赂漏氓潞娄猫陆卢忙聧垄茅聹聙猫娄聛莽聣鹿忙庐聤氓陇聞莽聬聠
            if (type === 'temperature') {
                result = this.convertTemperature(fromValue, fromUnit, toUnit);
            } else {
                // 氓聟露盲禄聳氓聧聲盲陆聧猫陆卢忙聧垄
                const baseValue = this.toBaseUnit(fromValue, fromUnit, type);
                result = this.fromBaseUnit(baseValue, toUnit, type);
            }
            
            // 忙聵戮莽陇潞莽禄聯忙聻聹
            document.getElementById('converter-to-value').value = result.toFixed(8).replace(/\.?0+$/, '');
            
            const fromUnitLabel = Array.from(document.getElementById('converter-from-unit').options)
                .find(option => option.value === fromUnit).text;
            const toUnitLabel = Array.from(document.getElementById('converter-to-unit').options)
                .find(option => option.value === toUnit).text;
            
            const resultText = `${fromValue} ${fromUnitLabel.split(' ')[1]} = ${result.toFixed(8).replace(/\.?0+$/, '')} ${toUnitLabel.split(' ')[1]}`;
            document.getElementById('converter-result-text').textContent = resultText;
            document.getElementById('converter-result').style.display = 'block';
        },
        
        // 忙赂漏氓潞娄猫陆卢忙聧垄
        convertTemperature: function(value, fromUnit, toUnit) {
            if (fromUnit === toUnit) return value;
            
            // 氓聟聢猫陆卢忙聧垄盲赂潞忙聭聞忙掳聫氓潞娄
            let celsius;
            switch (fromUnit) {
                case 'celsius':
                    celsius = value;
                    break;
                case 'fahrenheit':
                    celsius = (value - 32) * 5 / 9;
                    break;
                case 'kelvin':
                    celsius = value - 273.15;
                    break;
            }
            
            // 氓聠聧盲禄聨忙聭聞忙掳聫氓潞娄猫陆卢忙聧垄盲赂潞莽聸庐忙聽聡氓聧聲盲陆聧
            switch (toUnit) {
                case 'celsius':
                    return celsius;
                case 'fahrenheit':
                    return celsius * 9 / 5 + 32;
                case 'kelvin':
                    return celsius + 273.15;
            }
        },
        
        // 猫陆卢忙聧垄氓聢掳氓聼潞忙聹卢氓聧聲盲陆聧
        toBaseUnit: function(value, unit, type) {
            const baseConversions = {
                length: {
                    meter: 1,
                    kilometer: 1000,
                    centimeter: 0.01,
                    millimeter: 0.001,
                    inch: 0.0254,
                    foot: 0.3048,
                    yard: 0.9144
                },
                weight: {
                    kilogram: 1,
                    gram: 0.001,
                    milligram: 0.000001,
                    pound: 0.453592,
                    ounce: 0.0283495
                },
                area: {
                    square_meter: 1,
                    square_kilometer: 1000000,
                    square_centimeter: 0.0001,
                    square_millimeter: 0.000001,
                    square_inch: 0.00064516,
                    square_foot: 0.092903,
                    acre: 4046.86,
                    hectare: 10000
                },
                volume: {
                    cubic_meter: 1,
                    cubic_centimeter: 0.000001,
                    liter: 0.001,
                    milliliter: 0.000001,
                    cubic_inch: 0.0000163871,
                    cubic_foot: 0.0283168,
                    gallon_us: 0.00378541,
                    gallon_uk: 0.00454609
                }
            };
            
            const conversionFactor = baseConversions[type][unit];
            return value * conversionFactor;
        },
        
        // 盲禄聨氓聼潞忙聹卢氓聧聲盲陆聧猫陆卢忙聧垄
        fromBaseUnit: function(value, unit, type) {
            const baseConversions = {
                length: {
                    meter: 1,
                    kilometer: 0.001,
                    centimeter: 100,
                    millimeter: 1000,
                    inch: 39.3701,
                    foot: 3.28084,
                    yard: 1.09361
                },
                weight: {
                    kilogram: 1,
                    gram: 1000,
                    milligram: 1000000,
                    pound: 2.20462,
                    ounce: 35.274
                },
                area: {
                    square_meter: 1,
                    square_kilometer: 0.000001,
                    square_centimeter: 10000,
                    square_millimeter: 1000000,
                    square_inch: 1550,
                    square_foot: 10.7639,
                    acre: 0.000247105,
                    hectare: 0.0001
                },
                volume: {
                    cubic_meter: 1,
                    cubic_centimeter: 1000000,
                    liter: 1000,
                    milliliter: 1000000,
                    cubic_inch: 61023.7,
                    cubic_foot: 35.3147,
                    gallon_us: 264.172,
                    gallon_uk: 219.969
                }
            };
            
            const conversionFactor = baseConversions[type][unit];
            return value * conversionFactor;
        },
        
        // 盲潞聮忙聧垄忙聧垄莽庐聴氓聧聲盲陆聧
        swapConverterUnits: function() {
            const fromUnitSelect = document.getElementById('converter-from-unit');
            const toUnitSelect = document.getElementById('converter-to-unit');
            
            const tempUnit = fromUnitSelect.value;
            fromUnitSelect.value = toUnitSelect.value;
            toUnitSelect.value = tempUnit;
            
            this.calculateConversion();
        },
        
        // 忙赂虏忙聼聯忙卤聡莽聨聡猫陆卢忙聧垄氓路楼氓聟路
        renderCurrencyTool: function() {
            const contentContainer = document.getElementById('jev-tools-content');
            contentContainer.innerHTML = `
                <div class="jev-tool-form">
                    <div class="jev-tool-form-row">
                        <div class="jev-tool-form-group">
                            <label>盲禄聨猫麓搂氓赂聛</label>
                            <div style="display: flex; gap: 8px;">
                                <input type="number" class="jev-tool-input" id="currency-from-value" value="1" placeholder="猫戮聯氓聟楼茅聡聭茅垄聺">
                                <select class="jev-tool-select" id="currency-from" style="width: auto; min-width: 100px;">
                                    <option value="CNY">CNY (盲潞潞忙掳聭氓赂聛)</option>
                                    <option value="USD">USD (莽戮聨氓聟聝)</option>
                                    <option value="EUR">EUR (忙卢搂氓聟聝)</option>
                                    <option value="JPY">JPY (忙聴楼氓聟聝)</option>
                                    <option value="GBP">GBP (猫聥卤茅聲聭)</option>
                                    <option value="KRW">KRW (茅聼漏氓聟聝)</option>
                                    <option value="HKD">HKD (忙赂炉氓赂聛)</option>
                                </select>
                            </div>
                        </div>
                        
                        <button class="jev-tool-icon-button" id="currency-swap">
                            芒聡聞
                        </button>
                        
                        <div class="jev-tool-form-group">
                            <label>氓聢掳猫麓搂氓赂聛</label>
                            <div style="display: flex; gap: 8px;">
                                <input type="number" class="jev-tool-input" id="currency-to-value" readonly placeholder="莽禄聯忙聻聹">
                                <select class="jev-tool-select" id="currency-to" style="width: auto; min-width: 100px;">
                                    <option value="USD">USD (莽戮聨氓聟聝)</option>
                                    <option value="CNY">CNY (盲潞潞忙掳聭氓赂聛)</option>
                                    <option value="EUR">EUR (忙卢搂氓聟聝)</option>
                                    <option value="JPY">JPY (忙聴楼氓聟聝)</option>
                                    <option value="GBP">GBP (猫聥卤茅聲聭)</option>
                                    <option value="KRW">KRW (茅聼漏氓聟聝)</option>
                                    <option value="HKD">HKD (忙赂炉氓赂聛)</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    
                    <button class="jev-tool-button" id="currency-convert">猫陆卢忙聧垄</button>
                    
                    <div id="currency-result" class="jev-tool-result" style="display: none;">
                        <div class="jev-tool-result-label">猫陆卢忙聧垄莽禄聯忙聻聹</div>
                        <div class="jev-tool-result-value" id="currency-result-text"></div>
                    </div>
                    
                    <div id="currency-rate-info" class="jev-tool-info">
                        冒聼聮隆 盲陆驴莽聰篓忙篓隆忙聥聼忙卤聡莽聨聡鏁版嵁茂录聦盲禄聟盲戮聸氓聫聜猫聙聝茫聙聜氓庐聻茅聶聟忙卤聡莽聨聡氓聫炉猫聝陆忙聹聣忙聣聙盲赂聧氓聬聦茫聙聜
                    </div>
                </div>
            `;
            
            // 莽禄聭氓庐職盲潞聥盲禄露
            document.getElementById('currency-convert').addEventListener('click', () => {
                this.convertCurrency();
            });
            
            document.getElementById('currency-from-value').addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    this.convertCurrency();
                }
            });
            
            document.getElementById('currency-swap').addEventListener('click', () => {
                this.swapCurrency();
            });
            
            document.getElementById('currency-from').addEventListener('change', this.convertCurrency.bind(this));
            document.getElementById('currency-to').addEventListener('change', this.convertCurrency.bind(this));
            
            // 猫聡陋氓聤篓猫陆卢忙聧垄
            this.convertCurrency();
        },
        
        // 猫陆卢忙聧垄猫麓搂氓赂聛
        convertCurrency: function() {
            const fromValue = parseFloat(document.getElementById('currency-from-value').value);
            const fromCurrency = document.getElementById('currency-from').value;
            const toCurrency = document.getElementById('currency-to').value;
            
            if (isNaN(fromValue)) {
                return;
            }
            
            // 忙篓隆忙聥聼忙卤聡莽聨聡鏁版嵁
            const rates = {
                CNY: { USD: 0.1386, EUR: 0.1282, JPY: 20.28, GBP: 0.1099, KRW: 181.5, HKD: 1.084 },
                USD: { CNY: 7.215, EUR: 0.925, JPY: 146.3, GBP: 0.793, KRW: 1309, HKD: 7.820 },
                EUR: { CNY: 7.801, USD: 1.081, JPY: 158.2, GBP: 0.857, KRW: 1416, HKD: 8.458 },
                JPY: { CNY: 0.0493, USD: 0.00684, EUR: 0.00632, GBP: 0.00542, KRW: 8.950, HKD: 0.0535 },
                GBP: { CNY: 9.100, USD: 1.260, EUR: 1.167, JPY: 184.5, KRW: 1652, HKD: 9.863 },
                KRW: { CNY: 0.00551, USD: 0.000764, EUR: 0.000706, JPY: 0.1117, GBP: 0.000605, HKD: 0.00597 },
                HKD: { CNY: 0.922, USD: 0.1279, EUR: 0.1182, JPY: 18.68, GBP: 0.1014, KRW: 167.5 }
            };
            
            let result;
            if (fromCurrency === toCurrency) {
                result = fromValue;
            } else if (rates[fromCurrency] && rates[fromCurrency][toCurrency]) {
                result = fromValue * rates[fromCurrency][toCurrency];
            } else {
                // 茅聙職猫驴聡USD盲赂颅猫陆卢
                const usdRate = rates[fromCurrency]?.USD || 0;
                const targetRate = rates.USD?.[toCurrency] || 0;
                result = fromValue * usdRate * targetRate;
            }
            
            // 忙聵戮莽陇潞莽禄聯忙聻聹
            document.getElementById('currency-to-value').value = result.toFixed(2);
            
            const fromCurrencyLabel = Array.from(document.getElementById('currency-from').options)
                .find(option => option.value === fromCurrency).text;
            const toCurrencyLabel = Array.from(document.getElementById('currency-to').options)
                .find(option => option.value === toCurrency).text;
            
            const resultText = `${fromValue} ${fromCurrency} = ${result.toFixed(2)} ${toCurrency}`;
            document.getElementById('currency-result-text').textContent = resultText;
            document.getElementById('currency-result').style.display = 'block';
        },
        
        // 盲潞聮忙聧垄猫麓搂氓赂聛
        swapCurrency: function() {
            const fromCurrencySelect = document.getElementById('currency-from');
            const toCurrencySelect = document.getElementById('currency-to');
            
            const tempCurrency = fromCurrencySelect.value;
            fromCurrencySelect.value = toCurrencySelect.value;
            toCurrencySelect.value = tempCurrency;
            
            this.convertCurrency();
        },
        
        // 忙赂虏忙聼聯忙聴露茅聴麓氓路楼氓聟路
        renderTimeTool: function() {
            const contentContainer = document.getElementById('jev-tools-content');
            contentContainer.innerHTML = `
                <div class="jev-tool-form">
                    <div class="jev-tool-form-group">
                        <label>茅聙聣忙聥漏氓路楼氓聟路莽卤禄氓聻聥</label>
                        <select class="jev-tool-select" id="time-tool-type">
                            <option value="timestamp">忙聴露茅聴麓忙聢鲁猫陆卢忙聧垄</option>
                            <option value="datetime">忙聴楼忙聹聼忙聴露茅聴麓猫庐隆莽庐聴</option>
                            <option value="timezone">忙聴露氓聦潞猫陆卢忙聧垄</option>
                        </select>
                    </div>
                    
                    <div id="timestamp-converter" style="display: block;">
                        <div class="jev-tool-form-row">
                            <div class="jev-tool-form-group">
                                <label>Unix忙聴露茅聴麓忙聢鲁 (莽搂聮)</label>
                                <input type="number" class="jev-tool-input" id="timestamp-input" value="${Math.floor(Date.now() / 1000)}" placeholder="猫戮聯氓聟楼忙聴露茅聴麓忙聢鲁">
                            </div>
                            
                            <div class="jev-tool-form-group">
                                <label>氓陆聯氓聣聧忙聴露茅聴麓忙聢鲁</label>
                                <button class="jev-tool-button" id="current-timestamp">猫聨路氓聫聳氓陆聯氓聣聧</button>
                            </div>
                        </div>
                        
                        <button class="jev-tool-button" id="timestamp-convert">猫陆卢忙聧垄</button>
                        
                        <div id="timestamp-result" class="jev-tool-result" style="display: none;">
                            <div class="jev-tool-result-label">猫陆卢忙聧垄莽禄聯忙聻聹</div>
                            <div class="jev-tool-result-value" id="timestamp-result-text"></div>
                        </div>
                    </div>
                    
                    <div id="datetime-calculator" style="display: none;">
                        <div class="jev-tool-form-group">
                            <label>氓录聙氓搂聥忙聴楼忙聹聼忙聴露茅聴麓</label>
                            <input type="datetime-local" class="jev-tool-input" id="datetime-start">
                        </div>
                        
                        <div class="jev-tool-form-group">
                            <label>猫庐隆莽庐聴莽卤禄氓聻聥</label>
                            <select class="jev-tool-select" id="datetime-operation">
                                <option value="add">娣诲姞</option>
                                <option value="subtract">氓聡聫氓掳聭</option>
                                <option value="diff">忙聴露茅聴麓氓路庐</option>
                            </select>
                        </div>
                        
                        <div class="jev-tool-form-row">
                            <div class="jev-tool-form-group">
                                <label>忙聲掳茅聡聫</label>
                                <input type="number" class="jev-tool-input" id="datetime-value" value="1" placeholder="猫戮聯氓聟楼忙聲掳茅聡聫">
                            </div>
                            
                            <div class="jev-tool-form-group">
                                <label>氓聧聲盲陆聧</label>
                                <select class="jev-tool-select" id="datetime-unit">
                                    <option value="day">氓陇漏</option>
                                    <option value="hour">氓掳聫忙聴露</option>
                                    <option value="minute">氓聢聠茅聮聼</option>
                                    <option value="second">莽搂聮</option>
                                </select>
                            </div>
                        </div>
                        
                        <div id="datetime-end-group" class="jev-tool-form-group" style="display: none;">
                            <label>莽禄聯忙聺聼忙聴楼忙聹聼忙聴露茅聴麓</label>
                            <input type="datetime-local" class="jev-tool-input" id="datetime-end">
                        </div>
                        
                        <button class="jev-tool-button" id="datetime-calculate">猫庐隆莽庐聴</button>
                        
                        <div id="datetime-result" class="jev-tool-result" style="display: none;">
                            <div class="jev-tool-result-label">猫庐隆莽庐聴莽禄聯忙聻聹</div>
                            <div class="jev-tool-result-value" id="datetime-result-text"></div>
                        </div>
                    </div>
                    
                    <div id="timezone-converter" style="display: none;">
                        <div class="jev-tool-form-group">
                            <label>忙潞聬忙聴露氓聦潞忙聴露茅聴麓</label>
                            <input type="datetime-local" class="jev-tool-input" id="timezone-source-datetime">
                        </div>
                        
                        <div class="jev-tool-form-row">
                            <div class="jev-tool-form-group">
                                <label>忙潞聬忙聴露氓聦潞</label>
                                <select class="jev-tool-select" id="timezone-source">
                                    <option value="UTC+8">UTC+8 (氓聦聴盲潞卢忙聴露茅聴麓)</option>
                                    <option value="UTC-5">UTC-5 (莽潞陆莽潞娄忙聴露茅聴麓)</option>
                                    <option value="UTC+0">UTC+0 (忙聽录忙聻聴氓篓聛忙虏禄)</option>
                                    <option value="UTC+9">UTC+9 (盲赂聹盲潞卢忙聴露茅聴麓)</option>
                                    <option value="UTC+1">UTC+1 (忙卢搂忙麓虏盲赂颅茅聝篓)</option>
                                </select>
                            </div>
                            
                            <div class="jev-tool-form-group">
                                <label>莽聸庐忙聽聡忙聴露氓聦潞</label>
                                <select class="jev-tool-select" id="timezone-target">
                                    <option value="UTC-5">UTC-5 (莽潞陆莽潞娄忙聴露茅聴麓)</option>
                                    <option value="UTC+8">UTC+8 (氓聦聴盲潞卢忙聴露茅聴麓)</option>
                                    <option value="UTC+0">UTC+0 (忙聽录忙聻聴氓篓聛忙虏禄)</option>
                                    <option value="UTC+9">UTC+9 (盲赂聹盲潞卢忙聴露茅聴麓)</option>
                                    <option value="UTC+1">UTC+1 (忙卢搂忙麓虏盲赂颅茅聝篓)</option>
                                </select>
                            </div>
                        </div>
                        
                        <button class="jev-tool-button" id="timezone-convert">猫陆卢忙聧垄</button>
                        
                        <div id="timezone-result" class="jev-tool-result" style="display: none;">
                            <div class="jev-tool-result-label">猫陆卢忙聧垄莽禄聯忙聻聹</div>
                            <div class="jev-tool-result-value" id="timezone-result-text"></div>
                        </div>
                    </div>
                </div>
            `;
            
            // 璁剧疆茅禄聵猫庐陇忙聴楼忙聹聼忙聴露茅聴麓
            const now = new Date();
            const formattedNow = now.toISOString().slice(0, 16);
            document.getElementById('datetime-start').value = formattedNow;
            document.getElementById('datetime-end').value = formattedNow;
            document.getElementById('timezone-source-datetime').value = formattedNow;
            
            // 莽禄聭氓庐職盲潞聥盲禄露
            document.getElementById('time-tool-type').addEventListener('change', (e) => {
                this.showTimeToolPanel(e.target.value);
            });
            
            document.getElementById('current-timestamp').addEventListener('click', () => {
                document.getElementById('timestamp-input').value = Math.floor(Date.now() / 1000);
                this.convertTimestamp();
            });
            
            document.getElementById('timestamp-convert').addEventListener('click', this.convertTimestamp.bind(this));
            document.getElementById('timestamp-input').addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    this.convertTimestamp();
                }
            });
            
            document.getElementById('datetime-operation').addEventListener('change', (e) => {
                document.getElementById('datetime-end-group').style.display = e.target.value === 'diff' ? 'block' : 'none';
            });
            
            document.getElementById('datetime-calculate').addEventListener('click', this.calculateDatetime.bind(this));
            document.getElementById('timezone-convert').addEventListener('click', this.convertTimezone.bind(this));
            
            // 猫聡陋氓聤篓猫陆卢忙聧垄忙聴露茅聴麓忙聢鲁
            this.convertTimestamp();
        },
        
        // 忙聵戮莽陇潞忙聴露茅聴麓氓路楼氓聟路茅聺垄忙聺驴
        showTimeToolPanel: function(type) {
            document.getElementById('timestamp-converter').style.display = type === 'timestamp' ? 'block' : 'none';
            document.getElementById('datetime-calculator').style.display = type === 'datetime' ? 'block' : 'none';
            document.getElementById('timezone-converter').style.display = type === 'timezone' ? 'block' : 'none';
        },
        
        // 猫陆卢忙聧垄忙聴露茅聴麓忙聢鲁
        convertTimestamp: function() {
            const timestampInput = document.getElementById('timestamp-input');
            const timestamp = parseInt(timestampInput.value);
            
            if (isNaN(timestamp)) {
                return;
            }
            
            const date = new Date(timestamp * 1000);
            const formattedDate = this.formatDateTime(date);
            
            document.getElementById('timestamp-result-text').textContent = formattedDate;
            document.getElementById('timestamp-result').style.display = 'block';
        },
        
        // 忙聽录氓录聫氓聦聳忙聴楼忙聹聼忙聴露茅聴麓
        formatDateTime: function(date) {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            const seconds = String(date.getSeconds()).padStart(2, '0');
            
            return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
        },
        
        // 猫庐隆莽庐聴忙聴楼忙聹聼忙聴露茅聴麓
        calculateDatetime: function() {
            const operation = document.getElementById('datetime-operation').value;
            const startDatetime = document.getElementById('datetime-start').value;
            const endDatetime = document.getElementById('datetime-end').value;
            const value = parseInt(document.getElementById('datetime-value').value);
            const unit = document.getElementById('datetime-unit').value;
            
            if (!startDatetime || isNaN(value)) {
                return;
            }
            
            let result;
            const startDate = new Date(startDatetime);
            
            if (operation === 'diff') {
                // 猫庐隆莽庐聴忙聴露茅聴麓氓路庐
                if (!endDatetime) return;
                const endDate = new Date(endDatetime);
                const diffMs = Math.abs(endDate - startDate);
                
                switch (unit) {
                    case 'day':
                        result = (diffMs / (1000 * 60 * 60 * 24)).toFixed(2) + ' 氓陇漏';
                        break;
                    case 'hour':
                        result = (diffMs / (1000 * 60 * 60)).toFixed(2) + ' 氓掳聫忙聴露';
                        break;
                    case 'minute':
                        result = (diffMs / (1000 * 60)).toFixed(2) + ' 氓聢聠茅聮聼';
                        break;
                    case 'second':
                        result = (diffMs / 1000).toFixed(2) + ' 莽搂聮';
                        break;
                }
            } else {
                // 娣诲姞忙聢聳氓聡聫氓掳聭忙聴露茅聴麓
                const sign = operation === 'add' ? 1 : -1;
                let newDate = new Date(startDate);
                
                switch (unit) {
                    case 'day':
                        newDate.setDate(newDate.getDate() + sign * value);
                        break;
                    case 'hour':
                        newDate.setHours(newDate.getHours() + sign * value);
                        break;
                    case 'minute':
                        newDate.setMinutes(newDate.getMinutes() + sign * value);
                        break;
                    case 'second':
                        newDate.setSeconds(newDate.getSeconds() + sign * value);
                        break;
                }
                
                result = this.formatDateTime(newDate);
            }
            
            document.getElementById('datetime-result-text').textContent = result;
            document.getElementById('datetime-result').style.display = 'block';
        },
        
        // 猫陆卢忙聧垄忙聴露氓聦潞
        convertTimezone: function() {
            const sourceDatetime = document.getElementById('timezone-source-datetime').value;
            const sourceTimezone = document.getElementById('timezone-source').value;
            const targetTimezone = document.getElementById('timezone-target').value;
            
            if (!sourceDatetime) {
                return;
            }
            
            // 猫搂拢忙聻聬忙聴露氓聦潞氓聛聫莽搂禄
            const sourceOffset = this.parseTimezoneOffset(sourceTimezone);
            const targetOffset = this.parseTimezoneOffset(targetTimezone);
            
            // 猫陆卢忙聧垄忙聴露茅聴麓
            const sourceDate = new Date(sourceDatetime);
            const utcTime = new Date(sourceDate.getTime() - sourceOffset * 60 * 60 * 1000);
            const targetTime = new Date(utcTime.getTime() + targetOffset * 60 * 60 * 1000);
            
            const result = this.formatDateTime(targetTime);
            document.getElementById('timezone-result-text').textContent = result;
            document.getElementById('timezone-result').style.display = 'block';
        },
        
        // 猫搂拢忙聻聬忙聴露氓聦潞氓聛聫莽搂禄
        parseTimezoneOffset: function(timezone) {
            const match = timezone.match(/UTC([+-]\d+)/);
            return match ? parseInt(match[1]) : 0;
        },
        
        // 忙赂虏忙聼聯忙聳聡忙聹卢氓陇聞莽聬聠氓路楼氓聟路
        renderTextTool: function() {
            const contentContainer = document.getElementById('jev-tools-content');
            contentContainer.innerHTML = `
                <div class="jev-tool-form">
                    <div class="jev-tool-form-group">
                        <label>猫戮聯氓聟楼忙聳聡忙聹卢</label>
                        <textarea class="jev-tool-input" id="text-input" rows="5" placeholder="猫戮聯氓聟楼猫娄聛氓陇聞莽聬聠莽職聞忙聳聡忙聹卢...">猫驴聶忙聵炉盲赂聙忙庐碌莽陇潞盲戮聥忙聳聡忙聹卢茂录聦莽聰篓盲潞聨忙录聰莽陇潞忙聳聡忙聹卢氓陇聞莽聬聠氓路楼氓聟路莽職聞氓聤聼猫聝陆茫聙聜</textarea>
                    </div>
                    
                    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-bottom: 16px;">
                        <button class="jev-tool-button" id="text-upper">猫陆卢氓陇搂氓聠聶</button>
                        <button class="jev-tool-button" id="text-lower">猫陆卢氓掳聫氓聠聶</button>
                        <button class="jev-tool-button" id="text-trim">氓聨禄茅聶陇莽漏潞忙聽录</button>
                        <button class="jev-tool-button" id="text-reverse">氓聫聧猫陆卢忙聳聡忙聹卢</button>
                        <button class="jev-tool-button" id="text-count">缁熻氓颅聴忙聲掳</button>
                        <button class="jev-tool-button" id="text-copy">氓陇聧氓聢露莽禄聯忙聻聹</button>
                    </div>
                    
                    <div class="jev-tool-form-group">
                        <label>氓陇聞莽聬聠莽禄聯忙聻聹</label>
                        <textarea class="jev-tool-input" id="text-output" rows="5" readonly></textarea>
                    </div>
                    
                    <div class="jev-tool-info">
                        冒聼聮隆 忙聫聬莽陇潞茂录職茅聙聣忙聥漏盲赂聙盲赂陋忙聯聧盲陆聹忙聦聣茅聮庐茂录聦氓炉鹿猫戮聯氓聟楼忙聳聡忙聹卢猫驴聸猫隆聦氓陇聞莽聬聠茫聙聜氓陇聞莽聬聠氓聬聨莽職聞莽禄聯忙聻聹盲录職忙聵戮莽陇潞氓聹篓盲赂聥忙聳鹿忙聳聡忙聹卢忙隆聠盲赂颅茫聙聜
                    </div>
                </div>
            `;
            
            // 莽禄聭氓庐職盲潞聥盲禄露
            document.getElementById('text-upper').addEventListener('click', () => {
                this.processText('upper');
            });
            
            document.getElementById('text-lower').addEventListener('click', () => {
                this.processText('lower');
            });
            
            document.getElementById('text-trim').addEventListener('click', () => {
                this.processText('trim');
            });
            
            document.getElementById('text-reverse').addEventListener('click', () => {
                this.processText('reverse');
            });
            
            document.getElementById('text-count').addEventListener('click', () => {
                this.processText('count');
            });
            
            document.getElementById('text-copy').addEventListener('click', () => {
                this.copyTextResult();
            });
        },
        
        // 氓陇聞莽聬聠忙聳聡忙聹卢
        processText: function(action) {
            const input = document.getElementById('text-input').value;
            let result = '';
            
            switch (action) {
                case 'upper':
                    result = input.toUpperCase();
                    break;
                case 'lower':
                    result = input.toLowerCase();
                    break;
                case 'trim':
                    result = input.replace(/\s+/g, ' ').trim();
                    break;
                case 'reverse':
                    result = input.split('').reverse().join('');
                    break;
                case 'count':
                    const totalChars = input.length;
                    const chineseChars = (input.match(/[\u4e00-\u9fa5]/g) || []).length;
                    const englishChars = (input.match(/[a-zA-Z]/g) || []).length;
                    const numbers = (input.match(/\d/g) || []).length;
                    const spaces = (input.match(/\s/g) || []).length;
                    const words = input.trim().split(/\s+/).filter(w => w.length > 0).length;
                    
                    result = `忙聙禄氓颅聴莽卢娄忙聲掳: ${totalChars}\n` +
                            `盲赂颅忙聳聡氓颅聴莽卢娄: ${chineseChars}\n` +
                            `猫聥卤忙聳聡氓颅聴莽卢娄: ${englishChars}\n` +
                            `忙聲掳氓颅聴氓颅聴莽卢娄: ${numbers}\n` +
                            `莽漏潞忙聽录氓颅聴莽卢娄: ${spaces}\n` +
                            `氓聧聲猫炉聧忙聲掳茅聡聫: ${words}`;
                    break;
            }
            
            document.getElementById('text-output').value = result;
        },
        
        // 氓陇聧氓聢露忙聳聡忙聹卢莽禄聯忙聻聹
        copyTextResult: function() {
            const output = document.getElementById('text-output');
            output.select();
            output.setSelectionRange(0, 99999);
            
            try {
                document.execCommand('copy');
                this.showNotification('忙聳聡忙聹卢氓路虏氓陇聧氓聢露氓聢掳氓聣陋猫麓麓忙聺驴');
            } catch (err) {
                console.error('[JEV][tools] 氓陇聧氓聢露氓陇卤猫麓楼:', err);
            }
        },
        
        // 忙聵戮莽陇潞茅聙職莽聼楼
        showNotification: function(message) {
            const notification = document.createElement('div');
            notification.className = 'jev-tools-notification';
            notification.textContent = message;
            notification.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: rgba(0, 255, 140, 0.2);
                border: 1px solid rgba(0, 255, 140, 0.4);
                color: #00ff99;
                padding: 12px 24px;
                border-radius: 8px;
                box-shadow: 0 4px 15px rgba(0, 255, 140, 0.3);
                z-index: 10000;
                animation: jev-tools-slideIn 0.3s ease-out;
            `;
            
            document.body.appendChild(notification);
            
            setTimeout(() => {
                notification.style.animation = 'jev-tools-slideOut 0.3s ease-in';
                setTimeout(() => {
                    document.body.removeChild(notification);
                }, 300);
            }, 2000);
            
            // 忙路禄氓聤聽氓聤篓莽聰禄忙聽路氓录聫
            const style = document.createElement('style');
            style.textContent = `
                @keyframes jev-tools-slideIn {
                    from {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }
                @keyframes jev-tools-slideOut {
                    from {
                        transform: translateX(0);
                        opacity: 1;
                    }
                    to {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                }
            `;
            document.head.appendChild(style);
        }
    };
    
    console.log('[JEV][tools] 氓掳聫氓路楼氓聟路忙篓隆氓聺聴氓聤聽猫陆陆氓庐聦忙聢聬');
    
})();