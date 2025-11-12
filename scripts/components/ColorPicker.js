/**
 * ColorPicker组件 - 用于创建颜色选择器
 * 支持调色板、RGB、HSL、HEX等多种颜色选择方式
 */
class ColorPicker extends BaseComponent {
    /**
     * 创建新的ColorPicker实例
     * @param {HTMLElement|string} container - 容器元素或选择器
     * @param {Object} options - 配置选项
     */
    constructor(container, options = {}) {
        super(container, options);
        
        // 默认配置
        this.defaults = {
            // 基础配置
            value: '#007bff',       // 默认颜色值
            showPreview: true,      // 是否显示颜色预览
            showSwatches: true,     // 是否显示预设颜色
            showInput: true,        // 是否显示输入框
            
            // 预设颜色
            swatches: [             // 预设颜色数组
                '#000000', '#ffffff', '#7f7f7f', '#ff0000', '#00ff00', '#0000ff',
                '#ffff00', '#ff00ff', '#00ffff', '#ff6600', '#66ff00', '#0066ff',
                '#6600ff', '#ff0066', '#00ff66', '#ff66ff', '#66ffff', '#ff9900'
            ],
            
            // 视觉配置
            theme: 'default',       // 'default', 'dark', 'neon'
            size: 'medium',         // 'small', 'medium', 'large'
            
            // 状态配置
            disabled: false,        // 是否禁用
            readonly: false,        // 是否只读
            
            // 功能配置
            showAlpha: false,       // 是否支持透明度
            showHSL: true,          // 是否显示HSL输入
            showRGB: true,          // 是否显示RGB输入
            showHEX: true,          // 是否显示HEX输入
            allowEmpty: false,      // 是否允许清空
            
            // 动画配置
            animation: true,        // 是否启用动画
            transition: true,       // 是否使用过渡效果
            
            // 事件回调
            onChange: null,         // 值变化时的回调
            onOpen: null,           // 打开时的回调
            onClose: null           // 关闭时的回调
        };
        
        // 合并配置
        this.config = Object.assign({}, this.defaults, options);
        
        // 初始化状态
        this._value = this.config.value;
        this._isOpen = false;
        this._colorSpace = 'rgb'; // 当前颜色空间
        
        // 创建DOM元素
        this._createElements();
        
        // 应用样式
        this._applyStyles();
        
        // 绑定事件
        this._bindEvents();
        
        // 初始化颜色值
        this._updateColorDisplay();
    }
    
    /**
     * 创建颜色选择器的DOM元素
     * @private
     */
    _createElements() {
        // 创建主容器
        this.containerElement = this._createElement('div', {
            className: `color-picker-container theme-${this.config.theme} size-${this.config.size}`,
            role: 'group',
            'aria-labelledby': `color-picker-${this._generateId()}-label`
        });
        
        // 创建颜色选择器触发器
        this.triggerElement = this._createElement('div', {
            className: 'color-picker-trigger',
            role: 'button',
            tabIndex: this.config.disabled ? -1 : 0,
            'aria-haspopup': 'dialog',
            'aria-expanded': 'false',
            'aria-disabled': this.config.disabled.toString()
        });
        
        // 创建预览元素
        if (this.config.showPreview) {
            this.previewElement = this._createElement('div', {
                className: 'color-picker-preview',
                style: { backgroundColor: this._value }
            });
            this.triggerElement.appendChild(this.previewElement);
        }
        
        // 创建颜色值文本
        if (this.config.showInput) {
            this.valueTextElement = this._createElement('span', {
                className: 'color-picker-value-text'
            });
            this.triggerElement.appendChild(this.valueTextElement);
        }
        
        // 创建下拉箭头
        this.arrowElement = this._createElement('span', {
            className: 'color-picker-arrow'
        });
        this.arrowElement.textContent = '▼';
        this.triggerElement.appendChild(this.arrowElement);
        
        // 创建弹出面板
        this.panelElement = this._createElement('div', {
            className: 'color-picker-panel',
            role: 'dialog',
            'aria-modal': 'true',
            'aria-hidden': 'true',
            'aria-labelledby': `color-picker-${this._generateId()}-panel-label`
        });
        
        // 创建面板标题
        this.panelTitleElement = this._createElement('div', {
            id: `color-picker-${this._generateId()}-panel-label`,
            className: 'color-picker-panel-title'
        });
        this.panelTitleElement.textContent = '选择颜色';
        this.panelElement.appendChild(this.panelTitleElement);
        
        // 创建主颜色选择区域
        this.colorAreaContainer = this._createElement('div', {
            className: 'color-picker-color-area-container'
        });
        
        // 创建色相选择器
        this.hueSliderContainer = this._createElement('div', {
            className: 'color-picker-hue-slider-container'
        });
        
        // 创建色相滑块
        this.hueSliderElement = this._createElement('div', {
            className: 'color-picker-hue-slider'
        });
        
        // 创建色相滑块指针
        this.huePointerElement = this._createElement('div', {
            className: 'color-picker-hue-pointer'
        });
        this.hueSliderElement.appendChild(this.huePointerElement);
        this.hueSliderContainer.appendChild(this.hueSliderElement);
        
        // 创建饱和度/亮度选择器
        this.slContainer = this._createElement('div', {
            className: 'color-picker-sl-container'
        });
        
        // 创建SL选择器
        this.slElement = this._createElement('div', {
            className: 'color-picker-sl-selector'
        });
        
        // 创建SL选择器指针
        this.slPointerElement = this._createElement('div', {
            className: 'color-picker-sl-pointer'
        });
        this.slElement.appendChild(this.slPointerElement);
        this.slContainer.appendChild(this.slElement);
        
        // 添加到颜色区域容器
        this.colorAreaContainer.appendChild(this.slContainer);
        this.colorAreaContainer.appendChild(this.hueSliderContainer);
        this.panelElement.appendChild(this.colorAreaContainer);
        
        // 创建透明度滑块（如果启用）
        if (this.config.showAlpha) {
            this.alphaSliderContainer = this._createElement('div', {
                className: 'color-picker-alpha-slider-container'
            });
            
            this.alphaSliderElement = this._createElement('div', {
                className: 'color-picker-alpha-slider'
            });
            
            this.alphaPointerElement = this._createElement('div', {
                className: 'color-picker-alpha-pointer'
            });
            this.alphaSliderElement.appendChild(this.alphaPointerElement);
            this.alphaSliderContainer.appendChild(this.alphaSliderElement);
            this.panelElement.appendChild(this.alphaSliderContainer);
        }
        
        // 创建输入区域
        if (this.config.showInput) {
            this.inputsContainer = this._createElement('div', {
                className: 'color-picker-inputs-container'
            });
            
            // 创建RGB输入
            if (this.config.showRGB) {
                this.rgbInputsContainer = this._createElement('div', {
                    className: 'color-picker-rgb-inputs'
                });
                
                this.rInput = this._createInput('r', 'R', 0, 255);
                this.gInput = this._createInput('g', 'G', 0, 255);
                this.bInput = this._createInput('b', 'B', 0, 255);
                
                this.rgbInputsContainer.appendChild(this.rInput.container);
                this.rgbInputsContainer.appendChild(this.gInput.container);
                this.rgbInputsContainer.appendChild(this.bInput.container);
                
                if (this.config.showAlpha) {
                    this.aInput = this._createInput('a', 'A', 0, 100);
                    this.rgbInputsContainer.appendChild(this.aInput.container);
                }
                
                this.inputsContainer.appendChild(this.rgbInputsContainer);
            }
            
            // 创建HEX输入
            if (this.config.showHEX) {
                this.hexInputContainer = this._createElement('div', {
                    className: 'color-picker-hex-input-container'
                });
                
                this.hexLabel = this._createElement('label', {
                    htmlFor: `color-picker-${this._generateId()}-hex`,
                    className: 'color-picker-input-label'
                });
                this.hexLabel.textContent = '#';
                
                this.hexInput = this._createElement('input', {
                    type: 'text',
                    id: `color-picker-${this._generateId()}-hex`,
                    className: 'color-picker-hex-input',
                    maxLength: this.config.showAlpha ? 9 : 7,
                    disabled: this.config.disabled || this.config.readonly
                });
                
                this.hexInputContainer.appendChild(this.hexLabel);
                this.hexInputContainer.appendChild(this.hexInput);
                this.inputsContainer.appendChild(this.hexInputContainer);
            }
            
            // 添加到面板
            this.panelElement.appendChild(this.inputsContainer);
        }
        
        // 创建预设颜色区域
        if (this.config.showSwatches) {
            this.swatchesContainer = this._createElement('div', {
                className: 'color-picker-swatches-container'
            });
            
            // 创建预设颜色网格
            this.swatchesGrid = this._createElement('div', {
                className: 'color-picker-swatches-grid'
            });
            
            // 创建预设颜色
            this.config.swatches.forEach(color => {
                const swatch = this._createElement('div', {
                    className: 'color-picker-swatch',
                    style: { backgroundColor: color },
                    'data-color': color,
                    role: 'button',
                    tabIndex: this.config.disabled ? -1 : 0,
                    'aria-label': `选择颜色 ${color}`
                });
                this.swatchesGrid.appendChild(swatch);
            });
            
            // 添加清空按钮（如果允许）
            if (this.config.allowEmpty) {
                const clearSwatch = this._createElement('div', {
                    className: 'color-picker-swatch color-picker-swatch-clear',
                    'data-color': '',
                    role: 'button',
                    tabIndex: this.config.disabled ? -1 : 0,
                    'aria-label': '清空颜色'
                });
                this.swatchesGrid.appendChild(clearSwatch);
            }
            
            this.swatchesContainer.appendChild(this.swatchesGrid);
            this.panelElement.appendChild(this.swatchesContainer);
        }
        
        // 创建操作按钮区域
        this.buttonsContainer = this._createElement('div', {
            className: 'color-picker-buttons-container'
        });
        
        // 创建确认按钮
        this.applyButton = this._createElement('button', {
            type: 'button',
            className: 'color-picker-button color-picker-apply-button',
            disabled: this.config.disabled
        });
        this.applyButton.textContent = '确认';
        
        // 创建取消按钮
        this.cancelButton = this._createElement('button', {
            type: 'button',
            className: 'color-picker-button color-picker-cancel-button',
            disabled: this.config.disabled
        });
        this.cancelButton.textContent = '取消';
        
        // 添加按钮
        this.buttonsContainer.appendChild(this.applyButton);
        this.buttonsContainer.appendChild(this.cancelButton);
        this.panelElement.appendChild(this.buttonsContainer);
        
        // 添加到主容器
        this.containerElement.appendChild(this.triggerElement);
        this.containerElement.appendChild(this.panelElement);
        
        // 添加到目标容器
        this.container.appendChild(this.containerElement);
    }
    
    /**
     * 创建颜色输入控件
     * @private
     * @param {string} type - 输入类型 (r, g, b, a, h, s, l)
     * @param {string} label - 标签文本
     * @param {number} min - 最小值
     * @param {number} max - 最大值
     * @returns {Object} 输入控件对象
     */
    _createInput(type, label, min, max) {
        const container = this._createElement('div', {
            className: `color-picker-${type}-input-container`
        });
        
        const inputLabel = this._createElement('label', {
            htmlFor: `color-picker-${this._generateId()}-${type}`,
            className: 'color-picker-input-label'
        });
        inputLabel.textContent = label;
        
        const input = this._createElement('input', {
            type: 'number',
            id: `color-picker-${this._generateId()}-${type}`,
            className: 'color-picker-number-input',
            min: min,
            max: max,
            value: 0,
            disabled: this.config.disabled || this.config.readonly
        });
        
        container.appendChild(inputLabel);
        container.appendChild(input);
        
        return { container, input };
    }
    
    /**
     * 应用样式
     * @private
     */
    _applyStyles() {
        // 注入全局样式
        this._addGlobalStyles();
        
        // 应用配置样式
        this._applyConfigStyles();
    }
    
    /**
     * 注入全局样式
     * @private
     */
    _addGlobalStyles() {
        if (document.getElementById('color-picker-global-styles')) return;
        
        const styles = `
            .color-picker-container {
                position: relative;
                display: inline-block;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                user-select: none;
            }
            
            /* 触发器样式 */
            .color-picker-trigger {
                display: flex;
                align-items: center;
                padding: 6px 12px;
                border: 1px solid #ddd;
                border-radius: 4px;
                background-color: #fff;
                cursor: pointer;
                transition: all 0.2s ease;
                outline: none;
            }
            
            .color-picker-trigger:hover:not(.disabled) {
                border-color: #007bff;
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            }
            
            .color-picker-trigger:focus:not(.disabled) {
                border-color: #007bff;
                box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
            }
            
            .color-picker-trigger.disabled {
                opacity: 0.6;
                cursor: not-allowed;
                background-color: #f5f5f5;
            }
            
            /* 预览样式 */
            .color-picker-preview {
                width: 20px;
                height: 20px;
                border: 1px solid #ddd;
                border-radius: 2px;
                margin-right: 8px;
                box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.5);
            }
            
            /* 颜色值文本 */
            .color-picker-value-text {
                font-size: 12px;
                color: #333;
                margin-right: 8px;
                font-family: monospace;
            }
            
            /* 箭头样式 */
            .color-picker-arrow {
                font-size: 8px;
                color: #666;
                margin-left: 4px;
                transition: transform 0.2s ease;
            }
            
            .color-picker-container.open .color-picker-arrow {
                transform: rotate(180deg);
            }
            
            /* 面板样式 */
            .color-picker-panel {
                position: absolute;
                top: 100%;
                left: 0;
                z-index: 1000;
                min-width: 280px;
                background-color: #fff;
                border: 1px solid #ddd;
                border-radius: 4px;
                box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
                padding: 16px;
                display: none;
                max-height: 400px;
                overflow-y: auto;
                outline: none;
            }
            
            .color-picker-container.open .color-picker-panel {
                display: block;
                animation: color-picker-panel-fade-in 0.2s ease;
            }
            
            /* 面板标题 */
            .color-picker-panel-title {
                font-size: 14px;
                font-weight: 500;
                color: #333;
                margin-bottom: 12px;
                text-align: center;
            }
            
            /* 颜色区域容器 */
            .color-picker-color-area-container {
                display: flex;
                margin-bottom: 16px;
                gap: 12px;
            }
            
            /* SL选择器容器 */
            .color-picker-sl-container {
                flex: 1;
                position: relative;
            }
            
            /* SL选择器 */
            .color-picker-sl-selector {
                width: 100%;
                height: 200px;
                border: 1px solid #ddd;
                border-radius: 4px;
                position: relative;
                background: linear-gradient(to right, white, red),
                            linear-gradient(to bottom, transparent, black);
                background-blend-mode: multiply;
                cursor: crosshair;
            }
            
            /* SL指针 */
            .color-picker-sl-pointer {
                position: absolute;
                width: 16px;
                height: 16px;
                border: 2px solid white;
                border-radius: 50%;
                box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.3);
                transform: translate(-50%, -50%);
                pointer-events: none;
            }
            
            /* 色相滑块容器 */
            .color-picker-hue-slider-container {
                width: 24px;
                position: relative;
            }
            
            /* 色相滑块 */
            .color-picker-hue-slider {
                height: 200px;
                border: 1px solid #ddd;
                border-radius: 4px;
                background: linear-gradient(to bottom, 
                    #ff0000 0%, 
                    #ffff00 16.67%, 
                    #00ff00 33.33%, 
                    #00ffff 50%, 
                    #0000ff 66.67%, 
                    #ff00ff 83.33%, 
                    #ff0000 100%);
                position: relative;
                cursor: pointer;
            }
            
            /* 色相指针 */
            .color-picker-hue-pointer {
                position: absolute;
                left: 0;
                width: 100%;
                height: 4px;
                background-color: white;
                box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.3);
                pointer-events: none;
                transform: translateY(-50%);
            }
            
            /* 透明度滑块容器 */
            .color-picker-alpha-slider-container {
                margin-bottom: 16px;
            }
            
            /* 透明度滑块 */
            .color-picker-alpha-slider {
                height: 20px;
                border: 1px solid #ddd;
                border-radius: 4px;
                background: linear-gradient(90deg, transparent, currentColor),
                            repeating-linear-gradient(45deg, #ccc 0px, #ccc 5px, #fff 5px, #fff 10px);
                position: relative;
                cursor: pointer;
            }
            
            /* 透明度指针 */
            .color-picker-alpha-pointer {
                position: absolute;
                top: 0;
                width: 4px;
                height: 100%;
                background-color: white;
                box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.3);
                pointer-events: none;
                transform: translateX(-50%);
            }
            
            /* 输入区域容器 */
            .color-picker-inputs-container {
                margin-bottom: 16px;
            }
            
            /* RGB输入容器 */
            .color-picker-rgb-inputs {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(50px, 1fr));
                gap: 8px;
                margin-bottom: 12px;
            }
            
            /* 输入容器 */
            .color-picker-r-input-container,
            .color-picker-g-input-container,
            .color-picker-b-input-container,
            .color-picker-a-input-container {
                display: flex;
                flex-direction: column;
                gap: 4px;
            }
            
            /* 输入标签 */
            .color-picker-input-label {
                font-size: 12px;
                color: #666;
                font-weight: 500;
                text-align: center;
            }
            
            /* 数字输入 */
            .color-picker-number-input {
                padding: 4px;
                border: 1px solid #ddd;
                border-radius: 2px;
                font-size: 12px;
                text-align: center;
                outline: none;
                transition: border-color 0.2s ease;
            }
            
            .color-picker-number-input:focus {
                border-color: #007bff;
            }
            
            /* HEX输入容器 */
            .color-picker-hex-input-container {
                display: flex;
                align-items: center;
                gap: 4px;
            }
            
            .color-picker-hex-input-container .color-picker-input-label {
                flex-shrink: 0;
            }
            
            /* HEX输入 */
            .color-picker-hex-input {
                flex: 1;
                padding: 6px 8px;
                border: 1px solid #ddd;
                border-radius: 2px;
                font-size: 14px;
                font-family: monospace;
                outline: none;
                transition: border-color 0.2s ease;
            }
            
            .color-picker-hex-input:focus {
                border-color: #007bff;
            }
            
            /* 预设颜色容器 */
            .color-picker-swatches-container {
                margin-bottom: 16px;
            }
            
            /* 预设颜色网格 */
            .color-picker-swatches-grid {
                display: grid;
                grid-template-columns: repeat(6, 1fr);
                gap: 4px;
            }
            
            /* 预设颜色 */
            .color-picker-swatch {
                width: 24px;
                height: 24px;
                border: 1px solid #ddd;
                border-radius: 2px;
                cursor: pointer;
                transition: transform 0.1s ease, box-shadow 0.1s ease;
                position: relative;
                outline: none;
            }
            
            .color-picker-swatch:hover:not(.disabled) {
                transform: scale(1.1);
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
            }
            
            .color-picker-swatch:focus:not(.disabled) {
                outline: 2px solid #007bff;
                outline-offset: 1px;
            }
            
            /* 清空颜色 */
            .color-picker-swatch-clear {
                background-color: transparent;
                background-image: linear-gradient(45deg, #ccc 25%, transparent 25%, transparent 75%, #ccc 75%, #ccc),
                                  linear-gradient(45deg, #ccc 25%, transparent 25%, transparent 75%, #ccc 75%, #ccc);
                background-size: 10px 10px;
                background-position: 0 0, 5px 5px;
            }
            
            /* 按钮容器 */
            .color-picker-buttons-container {
                display: flex;
                justify-content: flex-end;
                gap: 8px;
            }
            
            /* 按钮样式 */
            .color-picker-button {
                padding: 6px 12px;
                border: 1px solid #ddd;
                border-radius: 4px;
                background-color: #f5f5f5;
                color: #333;
                font-size: 14px;
                cursor: pointer;
                transition: all 0.2s ease;
                outline: none;
            }
            
            .color-picker-button:hover:not(:disabled) {
                background-color: #e9e9e9;
                border-color: #ccc;
            }
            
            .color-picker-button:focus:not(:disabled) {
                border-color: #007bff;
                box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
            }
            
            .color-picker-button:disabled {
                opacity: 0.6;
                cursor: not-allowed;
            }
            
            /* 确认按钮 */
            .color-picker-apply-button {
                background-color: #007bff;
                border-color: #007bff;
                color: white;
            }
            
            .color-picker-apply-button:hover:not(:disabled) {
                background-color: #0069d9;
                border-color: #0062cc;
            }
            
            /* 深色主题 */
            .color-picker-container.theme-dark .color-picker-trigger,
            .color-picker-container.theme-dark .color-picker-panel {
                background-color: #333;
                border-color: #555;
                color: #ddd;
            }
            
            .color-picker-container.theme-dark .color-picker-value-text {
                color: #ddd;
            }
            
            .color-picker-container.theme-dark .color-picker-panel-title {
                color: #ddd;
            }
            
            .color-picker-container.theme-dark .color-picker-input-label {
                color: #aaa;
            }
            
            .color-picker-container.theme-dark .color-picker-number-input,
            .color-picker-container.theme-dark .color-picker-hex-input {
                background-color: #444;
                border-color: #555;
                color: #ddd;
            }
            
            .color-picker-container.theme-dark .color-picker-button {
                background-color: #444;
                border-color: #555;
                color: #ddd;
            }
            
            .color-picker-container.theme-dark .color-picker-button:hover:not(:disabled) {
                background-color: #555;
                border-color: #666;
            }
            
            /* 霓虹主题 */
            .color-picker-container.theme-neon .color-picker-panel {
                box-shadow: 0 0 20px rgba(0, 255, 204, 0.3);
            }
            
            .color-picker-container.theme-neon .color-picker-trigger:hover:not(.disabled) {
                box-shadow: 0 0 10px rgba(0, 255, 204, 0.3);
                border-color: #00ffcc;
            }
            
            .color-picker-container.theme-neon .color-picker-apply-button {
                background-color: #00ffcc;
                border-color: #00ffcc;
                color: #000;
            }
            
            .color-picker-container.theme-neon .color-picker-apply-button:hover:not(:disabled) {
                background-color: #00e6b8;
                border-color: #00e6b8;
                box-shadow: 0 0 10px rgba(0, 255, 204, 0.5);
            }
            
            /* 尺寸样式 */
            .color-picker-container.size-small .color-picker-trigger {
                padding: 4px 8px;
                font-size: 12px;
            }
            
            .color-picker-container.size-small .color-picker-preview {
                width: 16px;
                height: 16px;
            }
            
            .color-picker-container.size-small .color-picker-panel {
                min-width: 240px;
                padding: 12px;
            }
            
            .color-picker-container.size-small .color-picker-sl-selector,
            .color-picker-container.size-small .color-picker-hue-slider {
                height: 150px;
            }
            
            .color-picker-container.size-large .color-picker-trigger {
                padding: 8px 16px;
                font-size: 16px;
            }
            
            .color-picker-container.size-large .color-picker-preview {
                width: 24px;
                height: 24px;
            }
            
            .color-picker-container.size-large .color-picker-panel {
                min-width: 320px;
                padding: 20px;
            }
            
            .color-picker-container.size-large .color-picker-sl-selector,
            .color-picker-container.size-large .color-picker-hue-slider {
                height: 240px;
            }
            
            /* 动画 */
            @keyframes color-picker-panel-fade-in {
                from {
                    opacity: 0;
                    transform: translateY(-10px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
            
            /* 响应式设计 */
            @media (max-width: 768px) {
                .color-picker-panel {
                    position: fixed;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    width: 90vw;
                    max-width: 300px;
                    margin: 0;
                    min-width: auto;
                }
                
                .color-picker-color-area-container {
                    flex-direction: column;
                }
                
                .color-picker-hue-slider-container {
                    width: 100%;
                    height: 24px;
                }
                
                .color-picker-hue-slider {
                    height: 100%;
                    background: linear-gradient(to right, 
                        #ff0000 0%, 
                        #ffff00 16.67%, 
                        #00ff00 33.33%, 
                        #00ffff 50%, 
                        #0000ff 66.67%, 
                        #ff00ff 83.33%, 
                        #ff0000 100%);
                }
                
                .color-picker-hue-pointer {
                    width: 100%;
                    height: 4px;
                    left: 0;
                    top: 50%;
                    transform: translateX(-50%);
                }
            }
            
            /* 无障碍支持 */
            .color-picker-trigger:focus,
            .color-picker-button:focus,
            .color-picker-swatch:focus {
                outline: 2px solid #007bff;
                outline-offset: 2px;
            }
            
            /* 高对比度模式 */
            @media (prefers-contrast: high) {
                .color-picker-trigger,
                .color-picker-panel,
                .color-picker-button {
                    border-width: 2px;
                }
            }
            
            /* 减少动画 */
            @media (prefers-reduced-motion: reduce) {
                .color-picker-panel {
                    animation: none !important;
                }
                
                .color-picker-trigger,
                .color-picker-button,
                .color-picker-swatch,
                .color-picker-arrow {
                    transition: none !important;
                }
            }
        `;
        
        const styleSheet = document.createElement('style');
        styleSheet.id = 'color-picker-global-styles';
        styleSheet.textContent = styles;
        document.head.appendChild(styleSheet);
    }
    
    /**
     * 应用配置样式
     * @private
     */
    _applyConfigStyles() {
        // 设置禁用状态
        if (this.config.disabled) {
            this.triggerElement.classList.add('disabled');
            this.triggerElement.tabIndex = -1;
            this.triggerElement.setAttribute('aria-disabled', 'true');
        }
    }
    
    /**
     * 绑定事件
     * @private
     */
    _bindEvents() {
        // 点击触发器切换面板
        this.triggerElement.addEventListener('click', (event) => this._onTriggerClick(event));
        
        // 键盘事件（触发器）
        this.triggerElement.addEventListener('keydown', (event) => this._onTriggerKeyDown(event));
        
        // 点击面板外部关闭面板
        document.addEventListener('click', (event) => this._onDocumentClick(event));
        
        // 键盘事件（面板）
        this.panelElement.addEventListener('keydown', (event) => this._onPanelKeyDown(event));
        
        // 预设颜色点击事件
        if (this.config.showSwatches && this.swatchesGrid) {
            this.swatchesGrid.addEventListener('click', (event) => this._onSwatchClick(event));
        }
        
        // 按钮点击事件
        this.applyButton.addEventListener('click', () => this._onApplyClick());
        this.cancelButton.addEventListener('click', () => this._onCancelClick());
        
        // 输入框事件
        if (this.hexInput) {
            this.hexInput.addEventListener('input', () => this._onHexInput());
        }
        
        // RGB输入事件
        if (this.rInput) {
            this.rInput.input.addEventListener('input', () => this._onRGBInput());
        }
        if (this.gInput) {
            this.gInput.input.addEventListener('input', () => this._onRGBInput());
        }
        if (this.bInput) {
            this.bInput.input.addEventListener('input', () => this._onRGBInput());
        }
        if (this.aInput) {
            this.aInput.input.addEventListener('input', () => this._onRGBInput());
        }
        
        // 颜色选择器交互事件
        if (this.slElement) {
            this.slElement.addEventListener('mousedown', (event) => this._onSlMouseDown(event));
            this.slElement.addEventListener('touchstart', (event) => this._onSlTouchStart(event));
        }
        
        if (this.hueSliderElement) {
            this.hueSliderElement.addEventListener('mousedown', (event) => this._onHueMouseDown(event));
            this.hueSliderElement.addEventListener('touchstart', (event) => this._onHueTouchStart(event));
        }
        
        if (this.alphaSliderElement) {
            this.alphaSliderElement.addEventListener('mousedown', (event) => this._onAlphaMouseDown(event));
            this.alphaSliderElement.addEventListener('touchstart', (event) => this._onAlphaTouchStart(event));
        }
    }
    
    /**
     * 触发器点击事件处理
     * @private
     * @param {Event} event - 点击事件
     */
    _onTriggerClick(event) {
        event.stopPropagation();
        
        if (this.config.disabled) {
            return;
        }
        
        this.toggle();
    }
    
    /**
     * 触发器键盘事件处理
     * @private
     * @param {Event} event - 键盘事件
     */
    _onTriggerKeyDown(event) {
        if (this.config.disabled) {
            return;
        }
        
        // 支持空格键和回车键打开面板
        if (event.key === ' ' || event.key === 'Enter' || event.keyCode === 32 || event.keyCode === 13) {
            event.preventDefault();
            this.toggle();
        }
    }
    
    /**
     * 文档点击事件处理（用于关闭面板）
     * @private
     * @param {Event} event - 点击事件
     */
    _onDocumentClick(event) {
        if (this._isOpen && !this.containerElement.contains(event.target)) {
            this.close();
        }
    }
    
    /**
     * 面板键盘事件处理
     * @private
     * @param {Event} event - 键盘事件
     */
    _onPanelKeyDown(event) {
        // 支持ESC键关闭面板
        if (event.key === 'Escape' || event.keyCode === 27) {
            event.preventDefault();
            this.close();
            this.triggerElement.focus();
        }
        
        // 支持Enter键确认选择
        if (event.key === 'Enter' || event.keyCode === 13) {
            event.preventDefault();
            this._onApplyClick();
        }
    }
    
    /**
     * 预设颜色点击事件处理
     * @private
     * @param {Event} event - 点击事件
     */
    _onSwatchClick(event) {
        const swatch = event.target.closest('.color-picker-swatch');
        if (swatch && !this.config.disabled) {
            const color = swatch.getAttribute('data-color');
            
            // 更新临时值
            this._tempValue = color;
            this._updateColorDisplay(true);
            
            // 触发变化回调
            if (this.config.onChange) {
                this.config.onChange(color);
            }
        }
    }
    
    /**
     * 确认按钮点击事件处理
     * @private
     */
    _onApplyClick() {
        if (this.config.disabled) {
            return;
        }
        
        // 如果有临时值，使用临时值
        if (this._tempValue !== undefined) {
            this._value = this._tempValue;
            delete this._tempValue;
        }
        
        // 关闭面板
        this.close();
    }
    
    /**
     * 取消按钮点击事件处理
     * @private
     */
    _onCancelClick() {
        // 清除临时值
        delete this._tempValue;
        
        // 更新显示
        this._updateColorDisplay();
        
        // 关闭面板
        this.close();
    }
    
    /**
     * HEX输入事件处理
     * @private
     */
    _onHexInput() {
        if (this.config.disabled || this.config.readonly) {
            return;
        }
        
        let value = this.hexInput.value.trim();
        
        // 验证HEX格式
        if (/^#[0-9A-F]{6}$/i.test(value) || 
            (this.config.showAlpha && /^#[0-9A-F]{8}$/i.test(value))) {
            
            // 更新临时值
            this._tempValue = value;
            this._updateColorDisplay(true);
            
            // 触发变化回调
            if (this.config.onChange) {
                this.config.onChange(value);
            }
        }
    }
    
    /**
     * RGB输入事件处理
     * @private
     */
    _onRGBInput() {
        if (this.config.disabled || this.config.readonly) {
            return;
        }
        
        // 获取RGB值
        const r = parseInt(this.rInput.input.value) || 0;
        const g = parseInt(this.gInput.input.value) || 0;
        const b = parseInt(this.bInput.input.value) || 0;
        let a = 1;
        
        // 获取透明度值（如果启用）
        if (this.config.showAlpha && this.aInput) {
            a = parseInt(this.aInput.input.value) / 100 || 0;
        }
        
        // 转换为HEX格式
        let hex = this._rgbToHex(r, g, b);
        
        // 添加透明度（如果启用）
        if (this.config.showAlpha) {
            const alphaHex = Math.round(a * 255).toString(16).padStart(2, '0');
            hex += alphaHex;
        }
        
        // 更新临时值
        this._tempValue = `#${hex}`;
        this._updateColorDisplay(true);
        
        // 触发变化回调
        if (this.config.onChange) {
            this.config.onChange(`#${hex}`);
        }
    }
    
    /**
     * SL选择器鼠标按下事件处理
     * @private
     * @param {Event} event - 鼠标事件
     */
    _onSlMouseDown(event) {
        if (this.config.disabled || this.config.readonly) {
            return;
        }
        
        event.preventDefault();
        this._updateSlPosition(event.clientX, event.clientY);
        
        // 添加移动和释放事件
        document.addEventListener('mousemove', this._onSlMouseMove = (e) => this._onSlMouseMove(e));
        document.addEventListener('mouseup', this._onSlMouseUp = () => this._onSlMouseUp());
    }
    
    /**
     * SL选择器鼠标移动事件处理
     * @private
     * @param {Event} event - 鼠标事件
     */
    _onSlMouseMove(event) {
        this._updateSlPosition(event.clientX, event.clientY);
    }
    
    /**
     * SL选择器鼠标释放事件处理
     * @private
     */
    _onSlMouseUp() {
        // 移除事件监听器
        document.removeEventListener('mousemove', this._onSlMouseMove);
        document.removeEventListener('mouseup', this._onSlMouseUp);
    }
    
    /**
     * SL选择器触摸开始事件处理
     * @private
     * @param {Event} event - 触摸事件
     */
    _onSlTouchStart(event) {
        if (this.config.disabled || this.config.readonly) {
            return;
        }
        
        event.preventDefault();
        const touch = event.touches[0];
        this._updateSlPosition(touch.clientX, touch.clientY);
        
        // 添加移动和释放事件
        document.addEventListener('touchmove', this._onSlTouchMove = (e) => this._onSlTouchMove(e));
        document.addEventListener('touchend', this._onSlTouchEnd = () => this._onSlTouchEnd());
    }
    
    /**
     * SL选择器触摸移动事件处理
     * @private
     * @param {Event} event - 触摸事件
     */
    _onSlTouchMove(event) {
        const touch = event.touches[0];
        this._updateSlPosition(touch.clientX, touch.clientY);
    }
    
    /**
     * SL选择器触摸结束事件处理
     * @private
     */
    _onSlTouchEnd() {
        // 移除事件监听器
        document.removeEventListener('touchmove', this._onSlTouchMove);
        document.removeEventListener('touchend', this._onSlTouchEnd);
    }
    
    /**
     * 更新SL选择器位置
     * @private
     * @param {number} clientX - 客户端X坐标
     * @param {number} clientY - 客户端Y坐标
     */
    _updateSlPosition(clientX, clientY) {
        const rect = this.slElement.getBoundingClientRect();
        let x = Math.max(0, Math.min(clientX - rect.left, rect.width));
        let y = Math.max(0, Math.min(clientY - rect.top, rect.height));
        
        // 计算饱和度和亮度
        const saturation = x / rect.width;
        const lightness = 1 - (y / rect.height);
        
        // 更新SL指针位置
        this.slPointerElement.style.left = `${x}px`;
        this.slPointerElement.style.top = `${y}px`;
        
        // 更新颜色
        this._updateColorFromHSL(this._currentHue || 0, saturation, lightness);
    }
    
    /**
     * 色相滑块鼠标按下事件处理
     * @private
     * @param {Event} event - 鼠标事件
     */
    _onHueMouseDown(event) {
        if (this.config.disabled || this.config.readonly) {
            return;
        }
        
        event.preventDefault();
        this._updateHuePosition(event.clientY);
        
        // 添加移动和释放事件
        document.addEventListener('mousemove', this._onHueMouseMove = (e) => this._onHueMouseMove(e));
        document.addEventListener('mouseup', this._onHueMouseUp = () => this._onHueMouseUp());
    }
    
    /**
     * 色相滑块鼠标移动事件处理
     * @private
     * @param {Event} event - 鼠标事件
     */
    _onHueMouseMove(event) {
        this._updateHuePosition(event.clientY);
    }
    
    /**
     * 色相滑块鼠标释放事件处理
     * @private
     */
    _onHueMouseUp() {
        // 移除事件监听器
        document.removeEventListener('mousemove', this._onHueMouseMove);
        document.removeEventListener('mouseup', this._onHueMouseUp);
    }
    
    /**
     * 色相滑块触摸开始事件处理
     * @private
     * @param {Event} event - 触摸事件
     */
    _onHueTouchStart(event) {
        if (this.config.disabled || this.config.readonly) {
            return;
        }
        
        event.preventDefault();
        const touch = event.touches[0];
        this._updateHuePosition(touch.clientY);
        
        // 添加移动和释放事件
        document.addEventListener('touchmove', this._onHueTouchMove = (e) => this._onHueTouchMove(e));
        document.addEventListener('touchend', this._onHueTouchEnd = () => this._onHueTouchEnd());
    }
    
    /**
     * 色相滑块触摸移动事件处理
     * @private
     * @param {Event} event - 触摸事件
     */
    _onHueTouchMove(event) {
        const touch = event.touches[0];
        this._updateHuePosition(touch.clientY);
    }
    
    /**
     * 色相滑块触摸结束事件处理
     * @private
     */
    _onHueTouchEnd() {
        // 移除事件监听器
        document.removeEventListener('touchmove', this._onHueTouchMove);
        document.removeEventListener('touchend', this._onHueTouchEnd);
    }
    
    /**
     * 更新色相滑块位置
     * @private
     * @param {number} clientY - 客户端Y坐标
     */
    _updateHuePosition(clientY) {
        const rect = this.hueSliderElement.getBoundingClientRect();
        let y = Math.max(0, Math.min(clientY - rect.top, rect.height));
        
        // 计算色相
        this._currentHue = 360 - (y / rect.height * 360);
        
        // 更新色相指针位置
        this.huePointerElement.style.top = `${y}px`;
        
        // 更新SL选择器背景色
        this.slElement.style.background = `linear-gradient(to right, white, hsl(${this._currentHue}, 100%, 50%)), linear-gradient(to bottom, transparent, black)`;
        
        // 更新颜色
        this._updateColorFromHSL(this._currentHue, this._currentSaturation || 1, this._currentLightness || 0.5);
    }
    
    /**
     * 透明度滑块鼠标按下事件处理
     * @private
     * @param {Event} event - 鼠标事件
     */
    _onAlphaMouseDown(event) {
        if (this.config.disabled || this.config.readonly || !this.config.showAlpha) {
            return;
        }
        
        event.preventDefault();
        this._updateAlphaPosition(event.clientX);
        
        // 添加移动和释放事件
        document.addEventListener('mousemove', this._onAlphaMouseMove = (e) => this._onAlphaMouseMove(e));
        document.addEventListener('mouseup', this._onAlphaMouseUp = () => this._onAlphaMouseUp());
    }
    
    /**
     * 透明度滑块鼠标移动事件处理
     * @private
     * @param {Event} event - 鼠标事件
     */
    _onAlphaMouseMove(event) {
        this._updateAlphaPosition(event.clientX);
    }
    
    /**
     * 透明度滑块鼠标释放事件处理
     * @private
     */
    _onAlphaMouseUp() {
        // 移除事件监听器
        document.removeEventListener('mousemove', this._onAlphaMouseMove);
        document.removeEventListener('mouseup', this._onAlphaMouseUp);
    }
    
    /**
     * 透明度滑块触摸开始事件处理
     * @private
     * @param {Event} event - 触摸事件
     */
    _onAlphaTouchStart(event) {
        if (this.config.disabled || this.config.readonly || !this.config.showAlpha) {
            return;
        }
        
        event.preventDefault();
        const touch = event.touches[0];
        this._updateAlphaPosition(touch.clientX);
        
        // 添加移动和释放事件
        document.addEventListener('touchmove', this._onAlphaTouchMove = (e) => this._onAlphaTouchMove(e));
        document.addEventListener('touchend', this._onAlphaTouchEnd = () => this._onAlphaTouchEnd());
    }
    
    /**
     * 透明度滑块触摸移动事件处理
     * @private
     * @param {Event} event - 触摸事件
     */
    _onAlphaTouchMove(event) {
        const touch = event.touches[0];
        this._updateAlphaPosition(touch.clientX);
    }
    
    /**
     * 透明度滑块触摸结束事件处理
     * @private
     */
    _onAlphaTouchEnd() {
        // 移除事件监听器
        document.removeEventListener('touchmove', this._onAlphaTouchMove);
        document.removeEventListener('touchend', this._onAlphaTouchEnd);
    }
    
    /**
     * 更新透明度滑块位置
     * @private
     * @param {number} clientX - 客户端X坐标
     */
    _updateAlphaPosition(clientX) {
        const rect = this.alphaSliderElement.getBoundingClientRect();
        let x = Math.max(0, Math.min(clientX - rect.left, rect.width));
        
        // 计算透明度
        const alpha = x / rect.width;
        
        // 更新透明度指针位置
        this.alphaPointerElement.style.left = `${x}px`;
        
        // 更新颜色
        if (this._currentHue !== undefined && this._currentSaturation !== undefined && this._currentLightness !== undefined) {
            this._updateColorFromHSL(this._currentHue, this._currentSaturation, this._currentLightness, alpha);
        }
    }
    
    /**
     * 更新颜色显示
     * @private
     * @param {boolean} isTemp - 是否是临时值
     */
    _updateColorDisplay(isTemp = false) {
        const color = isTemp ? this._tempValue : this._value;
        
        // 更新预览
        if (this.previewElement) {
            this.previewElement.style.backgroundColor = color || 'transparent';
        }
        
        // 更新值文本
        if (this.valueTextElement) {
            this.valueTextElement.textContent = color || '';
        }
        
        // 更新HEX输入
        if (this.hexInput) {
            this.hexInput.value = color || '';
        }
        
        // 解析颜色并更新RGB输入
        if (color) {
            const rgb = this._hexToRgb(color);
            if (rgb) {
                if (this.rInput) this.rInput.input.value = rgb.r;
                if (this.gInput) this.gInput.input.value = rgb.g;
                if (this.bInput) this.bInput.input.value = rgb.b;
                if (this.aInput && rgb.a !== undefined) {
                    this.aInput.input.value = Math.round(rgb.a * 100);
                }
                
                // 更新HSL值（用于滑块位置）
                const hsl = this._rgbToHsl(rgb.r, rgb.g, rgb.b);
                this._currentHue = hsl.h;
                this._currentSaturation = hsl.s;
                this._currentLightness = hsl.l;
                
                // 更新滑块位置
                this._updateSliderPositions();
            }
        }
    }
    
    /**
     * 更新滑块位置
     * @private
     */
    _updateSliderPositions() {
        // 更新色相滑块
        if (this.hueSliderElement && this.huePointerElement && this._currentHue !== undefined) {
            const rect = this.hueSliderElement.getBoundingClientRect();
            const y = rect.height - (this._currentHue / 360 * rect.height);
            this.huePointerElement.style.top = `${y}px`;
            this.slElement.style.background = `linear-gradient(to right, white, hsl(${this._currentHue}, 100%, 50%)), linear-gradient(to bottom, transparent, black)`;
        }
        
        // 更新SL选择器
        if (this.slElement && this.slPointerElement && this._currentSaturation !== undefined && this._currentLightness !== undefined) {
            const rect = this.slElement.getBoundingClientRect();
            const x = this._currentSaturation * rect.width;
            const y = (1 - this._currentLightness) * rect.height;
            this.slPointerElement.style.left = `${x}px`;
            this.slPointerElement.style.top = `${y}px`;
        }
        
        // 更新透明度滑块
        if (this.alphaSliderElement && this.alphaPointerElement && this.config.showAlpha) {
            const rect = this.alphaSliderElement.getBoundingClientRect();
            const color = this._tempValue || this._value;
            const rgb = this._hexToRgb(color);
            const alpha = rgb && rgb.a !== undefined ? rgb.a : 1;
            const x = alpha * rect.width;
            this.alphaPointerElement.style.left = `${x}px`;
            this.alphaSliderElement.style.color = `hsl(${this._currentHue}, ${this._currentSaturation * 100}%, ${this._currentLightness * 100}%)`;
        }
    }
    
    /**
     * 从HSL更新颜色
     * @private
     * @param {number} h - 色相
     * @param {number} s - 饱和度
     * @param {number} l - 亮度
     * @param {number} a - 透明度
     */
    _updateColorFromHSL(h, s, l, a = 1) {
        // 保存当前HSL值
        this._currentHue = h;
        this._currentSaturation = s;
        this._currentLightness = l;
        
        // 转换为RGB
        const rgb = this._hslToRgb(h, s, l);
        
        // 转换为HEX
        let hex = this._rgbToHex(rgb.r, rgb.g, rgb.b);
        
        // 添加透明度（如果启用）
        if (this.config.showAlpha) {
            const alphaHex = Math.round(a * 255).toString(16).padStart(2, '0');
            hex += alphaHex;
        }
        
        // 更新临时值
        this._tempValue = `#${hex}`;
        
        // 更新显示
        this._updateColorDisplay(true);
        
        // 触发变化回调
        if (this.config.onChange) {
            this.config.onChange(`#${hex}`);
        }
    }
    
    /**
     * 生成唯一ID
     * @private
     * @returns {string} 唯一ID
     */
    _generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
    }
    
    /**
     * HEX转RGB
     * @private
     * @param {string} hex - HEX颜色值
     * @returns {Object|null} RGB颜色对象
     */
    _hexToRgb(hex) {
        // 移除#号
        hex = hex.replace('#', '');
        
        // 解析RGB值
        let r = 0, g = 0, b = 0, a = undefined;
        
        if (hex.length === 6) {
            // 标准HEX
            r = parseInt(hex.substring(0, 2), 16);
            g = parseInt(hex.substring(2, 4), 16);
            b = parseInt(hex.substring(4, 6), 16);
        } else if (hex.length === 8) {
            // HEXA (带透明度)
            r = parseInt(hex.substring(0, 2), 16);
            g = parseInt(hex.substring(2, 4), 16);
            b = parseInt(hex.substring(4, 6), 16);
            a = parseInt(hex.substring(6, 8), 16) / 255;
        } else if (hex.length === 3) {
            // 简写HEX
            r = parseInt(hex.substring(0, 1) + hex.substring(0, 1), 16);
            g = parseInt(hex.substring(1, 2) + hex.substring(1, 2), 16);
            b = parseInt(hex.substring(2, 3) + hex.substring(2, 3), 16);
        } else {
            return null;
        }
        
        return { r, g, b, a };
    }
    
    /**
     * RGB转HEX
     * @private
     * @param {number} r - 红色通道值
     * @param {number} g - 绿色通道值
     * @param {number} b - 蓝色通道值
     * @returns {string} HEX颜色值
     */
    _rgbToHex(r, g, b) {
        // 确保值在有效范围内
        r = Math.max(0, Math.min(255, Math.round(r)));
        g = Math.max(0, Math.min(255, Math.round(g)));
        b = Math.max(0, Math.min(255, Math.round(b)));
        
        // 转换为HEX
        const rHex = r.toString(16).padStart(2, '0');
        const gHex = g.toString(16).padStart(2, '0');
        const bHex = b.toString(16).padStart(2, '0');
        
        return `${rHex}${gHex}${bHex}`.toUpperCase();
    }
    
    /**
     * RGB转HSL
     * @private
     * @param {number} r - 红色通道值
     * @param {number} g - 绿色通道值
     * @param {number} b - 蓝色通道值
     * @returns {Object} HSL颜色对象
     */
    _rgbToHsl(r, g, b) {
        // 归一化RGB值
        r /= 255;
        g /= 255;
        b /= 255;
        
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        let h = 0, s = 0;
        let l = (max + min) / 2;
        
        if (max !== min) {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            
            switch (max) {
                case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                case g: h = (b - r) / d + 2; break;
                case b: h = (r - g) / d + 4; break;
            }
            
            h *= 60;
        }
        
        return { h, s, l };
    }
    
    /**
     * HSL转RGB
     * @private
     * @param {number} h - 色相
     * @param {number} s - 饱和度
     * @param {number} l - 亮度
     * @returns {Object} RGB颜色对象
     */
    _hslToRgb(h, s, l) {
        let r, g, b;
        
        if (s === 0) {
            r = g = b = l; // 灰度
        } else {
            const hue2rgb = (p, q, t) => {
                if (t < 0) t += 1;
                if (t > 1) t -= 1;
                if (t < 1/6) return p + (q - p) * 6 * t;
                if (t < 1/2) return q;
                if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
                return p;
            };
            
            const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            const p = 2 * l - q;
            
            r = hue2rgb(p, q, h / 360 + 1/3);
            g = hue2rgb(p, q, h / 360);
            b = hue2rgb(p, q, h / 360 - 1/3);
        }
        
        return {
            r: Math.round(r * 255),
            g: Math.round(g * 255),
            b: Math.round(b * 255)
        };
    }
    
    // ===== 公共方法 =====
    
    /**
     * 打开颜色选择器面板
     * @returns {ColorPicker} 当前实例，支持链式调用
     */
    open() {
        if (this.config.disabled || this._isOpen) return this;
        
        // 保存当前值作为初始值（用于取消操作）
        this._initialValue = this._value;
        this._tempValue = undefined;
        
        // 更新状态
        this._isOpen = true;
        
        // 更新UI状态
        this.containerElement.classList.add('open');
        this.triggerElement.setAttribute('aria-expanded', 'true');
        this.panelElement.setAttribute('aria-hidden', 'false');
        
        // 初始化滑块位置
        this._updateSliderPositions();
        
        // 触发打开回调
        if (this.config.onOpen) {
            this.config.onOpen(this);
        }
        
        return this;
    }
    
    /**
     * 关闭颜色选择器面板
     * @returns {ColorPicker} 当前实例，支持链式调用
     */
    close() {
        if (!this._isOpen) return this;
        
        // 更新状态
        this._isOpen = false;
        
        // 更新UI状态
        this.containerElement.classList.remove('open');
        this.triggerElement.setAttribute('aria-expanded', 'false');
        this.panelElement.setAttribute('aria-hidden', 'true');
        
        // 触发关闭回调
        if (this.config.onClose) {
            this.config.onClose(this);
        }
        
        return this;
    }
    
    /**
     * 切换颜色选择器面板的打开/关闭状态
     * @returns {ColorPicker} 当前实例，支持链式调用
     */
    toggle() {
        if (this._isOpen) {
            this.close();
        } else {
            this.open();
        }
        return this;
    }
    
    /**
     * 设置颜色值
     * @param {string} color - 颜色值（HEX格式）
     * @returns {ColorPicker} 当前实例，支持链式调用
     */
    setValue(color) {
        this._value = color;
        this._updateColorDisplay();
        return this;
    }
    
    /**
     * 获取当前颜色值
     * @returns {string} 颜色值（HEX格式）
     */
    getValue() {
        return this._value;
    }
    
    /**
     * 设置主题
     * @param {string} theme - 主题名称 ('default', 'dark', 'neon')
     * @returns {ColorPicker} 当前实例，支持链式调用
     */
    setTheme(theme) {
        if (['default', 'dark', 'neon'].includes(theme)) {
            this.containerElement.classList.remove(`theme-${this.config.theme}`);
            this.config.theme = theme;
            this.containerElement.classList.add(`theme-${this.config.theme}`);
        }
        return this;
    }
    
    /**
     * 设置尺寸
     * @param {string} size - 尺寸名称 ('small', 'medium', 'large')
     * @returns {ColorPicker} 当前实例，支持链式调用
     */
    setSize(size) {
        if (['small', 'medium', 'large'].includes(size)) {
            this.containerElement.classList.remove(`size-${this.config.size}`);
            this.config.size = size;
            this.containerElement.classList.add(`size-${this.config.size}`);
        }
        return this;
    }
    
    /**
     * 设置是否禁用
     * @param {boolean} disabled - 是否禁用
     * @returns {ColorPicker} 当前实例，支持链式调用
     */
    setDisabled(disabled) {
        this.config.disabled = !!disabled;
        
        if (this.config.disabled) {
            this.triggerElement.classList.add('disabled');
            this.triggerElement.tabIndex = -1;
            this.triggerElement.setAttribute('aria-disabled', 'true');
            
            if (this.hexInput) this.hexInput.disabled = true;
            if (this.rInput) this.rInput.input.disabled = true;
            if (this.gInput) this.gInput.input.disabled = true;
            if (this.bInput) this.bInput.input.disabled = true;
            if (this.aInput) this.aInput.input.disabled = true;
            
            this.applyButton.disabled = true;
            this.cancelButton.disabled = true;
            
            // 关闭面板
            this.close();
        } else {
            this.triggerElement.classList.remove('disabled');
            this.triggerElement.tabIndex = 0;
            this.triggerElement.setAttribute('aria-disabled', 'false');
            
            if (this.hexInput) this.hexInput.disabled = false;
            if (this.rInput) this.rInput.input.disabled = false;
            if (this.gInput) this.gInput.input.disabled = false;
            if (this.bInput) this.bInput.input.disabled = false;
            if (this.aInput) this.aInput.input.disabled = false;
            
            this.applyButton.disabled = false;
            this.cancelButton.disabled = false;
        }
        
        return this;
    }
    
    /**
     * 设置是否只读
     * @param {boolean} readonly - 是否只读
     * @returns {ColorPicker} 当前实例，支持链式调用
     */
    setReadonly(readonly) {
        this.config.readonly = !!readonly;
        
        if (this.hexInput) this.hexInput.readOnly = this.config.readonly;
        if (this.rInput) this.rInput.input.readOnly = this.config.readonly;
        if (this.gInput) this.gInput.input.readOnly = this.config.readonly;
        if (this.bInput) this.bInput.input.readOnly = this.config.readonly;
        if (this.aInput) this.aInput.input.readOnly = this.config.readonly;
        
        return this;
    }
    
    /**
     * 设置预设颜色
     * @param {Array<string>} swatches - 预设颜色数组
     * @returns {ColorPicker} 当前实例，支持链式调用
     */
    setSwatches(swatches) {
        if (Array.isArray(swatches) && this.config.showSwatches && this.swatchesGrid) {
            this.config.swatches = swatches;
            
            // 清空现有预设颜色
            this.swatchesGrid.innerHTML = '';
            
            // 添加新的预设颜色
            this.config.swatches.forEach(color => {
                const swatch = this._createElement('div', {
                    className: 'color-picker-swatch',
                    style: { backgroundColor: color },
                    'data-color': color,
                    role: 'button',
                    tabIndex: this.config.disabled ? -1 : 0,
                    'aria-label': `选择颜色 ${color}`
                });
                this.swatchesGrid.appendChild(swatch);
            });
            
            // 添加清空按钮（如果允许）
            if (this.config.allowEmpty) {
                const clearSwatch = this._createElement('div', {
                    className: 'color-picker-swatch color-picker-swatch-clear',
                    'data-color': '',
                    role: 'button',
                    tabIndex: this.config.disabled ? -1 : 0,
                    'aria-label': '清空颜色'
                });
                this.swatchesGrid.appendChild(clearSwatch);
            }
        }
        
        return this;
    }
    
    /**
     * 设置是否显示透明度选项
     * @param {boolean} showAlpha - 是否显示透明度
     * @returns {ColorPicker} 当前实例，支持链式调用
     */
    setShowAlpha(showAlpha) {
        if (this.config.showAlpha !== showAlpha) {
            this.config.showAlpha = !!showAlpha;
            
            // 重新初始化组件
            this._reinitialize();
        }
        return this;
    }
    
    /**
     * 设置是否允许清空颜色
     * @param {boolean} allowEmpty - 是否允许清空
     * @returns {ColorPicker} 当前实例，支持链式调用
     */
    setAllowEmpty(allowEmpty) {
        this.config.allowEmpty = !!allowEmpty;
        
        // 更新预设颜色区域
        this.setSwatches(this.config.swatches);
        
        return this;
    }
    
    /**
     * 获取当前颜色选择器面板是否打开
     * @returns {boolean} 是否打开
     */
    isOpen() {
        return this._isOpen;
    }
    
    /**
     * 获取颜色选择器的主容器元素
     * @returns {HTMLElement} 主容器元素
     */
    getElement() {
        return this.containerElement;
    }
    
    /**
     * 重新初始化颜色选择器
     * @private
     */
    _reinitialize() {
        // 保存当前值
        const currentValue = this._value;
        
        // 移除DOM元素
        if (this.containerElement && this.containerElement.parentNode) {
            this.containerElement.parentNode.removeChild(this.containerElement);
        }
        
        // 重新创建DOM元素
        this._createElements();
        
        // 应用样式
        this._applyStyles();
        
        // 绑定事件
        this._bindEvents();
        
        // 恢复当前值
        this._value = currentValue;
        this._updateColorDisplay();
    }
    
    /**
     * 销毁颜色选择器，移除DOM元素和事件监听器
     */
    destroy() {
        // 移除事件监听器
        document.removeEventListener('click', this._onDocumentClick);
        
        // 移除DOM元素
        if (this.containerElement && this.containerElement.parentNode) {
            this.containerElement.parentNode.removeChild(this.containerElement);
        }
        
        // 清理引用
        this.containerElement = null;
        this.triggerElement = null;
        this.previewElement = null;
        this.valueTextElement = null;
        this.arrowElement = null;
        this.panelElement = null;
        this.panelTitleElement = null;
        this.colorAreaContainer = null;
        this.slContainer = null;
        this.slElement = null;
        this.slPointerElement = null;
        this.hueSliderContainer = null;
        this.hueSliderElement = null;
        this.huePointerElement = null;
        this.alphaSliderContainer = null;
        this.alphaSliderElement = null;
        this.alphaPointerElement = null;
        this.inputsContainer = null;
        this.rgbInputsContainer = null;
        this.rInput = null;
        this.gInput = null;
        this.bInput = null;
        this.aInput = null;
        this.hexInputContainer = null;
        this.hexLabel = null;
        this.hexInput = null;
        this.swatchesContainer = null;
        this.swatchesGrid = null;
        this.buttonsContainer = null;
        this.applyButton = null;
        this.cancelButton = null;
    }
}

// 导出组件
window.ColorPicker = ColorPicker;
       