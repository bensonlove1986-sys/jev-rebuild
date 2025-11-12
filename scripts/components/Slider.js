/**
 * Slider组件 - 可定制的滑块组件
 * 支持单值、范围选择，多种主题、动画效果和交互方式
 */
class Slider extends BaseComponent {
    /**
     * 创建新的Slider实例
     * @param {HTMLElement|string} container - 容器元素或选择器
     * @param {Object} options - 配置选项
     */
    constructor(container, options = {}) {
        super(container, options);
        
        // 默认配置
        this.defaults = {
            // 基础配置
            type: 'single', // 'single' 或 'range'
            min: 0,
            max: 100,
            step: 1,
            value: [0], // 单值时为 [value], 范围时为 [minValue, maxValue]
            disabled: false,
            readonly: false,
            
            // 视觉配置
            theme: 'default', // 'default', 'dark', 'neon'
            size: 'medium', // 'small', 'medium', 'large'
            orientation: 'horizontal', // 'horizontal' 或 'vertical'
            showLabels: true,
            showTicks: false,
            showValue: true,
            valuePosition: 'top', // 'top', 'bottom', 'left', 'right'
            
            // 样式配置
            trackHeight: null, // 轨道高度，会根据size自动设置
            thumbSize: null, // 滑块大小，会根据size自动设置
            color: null, // 自定义颜色
            trackColor: null, // 轨道颜色
            fillColor: null, // 填充颜色
            
            // 交互配置
            tooltip: true,
            tooltipAlwaysVisible: false,
            tooltipFormat: null, // 自定义提示文本格式化函数
            
            // 动画配置
            animation: true,
            animationDuration: 300,
            
            // 限制配置
            lockRange: false, // 锁定范围（在range模式下）
            rangeGap: 0, // 范围间隙
            
            // 事件回调
            onChange: null,
            onInput: null,
            onStart: null,
            onEnd: null
        };
        
        // 合并配置
        this.config = Object.assign({}, this.defaults, options);
        
        // 初始化状态
        this.isDragging = false;
        this.activeThumb = null;
        this.thumbElements = [];
        this.tickElements = [];
        
        // 创建DOM元素
        this._createElements();
        
        // 应用样式
        this._applyStyles();
        
        // 绑定事件
        this._bindEvents();
        
        // 设置初始值
        this._updateValues();
        
        // 初始化工具提示
        if (this.config.tooltip && typeof Tooltip !== 'undefined') {
            this._initTooltips();
        }
    }
    
    /**
     * 创建滑块的DOM元素
     * @private
     */
    _createElements() {
        // 创建主容器
        this.sliderContainer = this._createElement('div', {
            className: `slider-container slider-${this.config.orientation} theme-${this.config.theme} size-${this.config.size}`
        });
        
        // 创建轨道容器
        this.trackContainer = this._createElement('div', {
            className: 'slider-track-container'
        });
        
        // 创建背景轨道
        this.track = this._createElement('div', {
            className: 'slider-track'
        });
        
        // 创建填充轨道
        this.fill = this._createElement('div', {
            className: 'slider-fill'
        });
        
        // 创建滑块元素
        this._createThumbs();
        
        // 创建刻度线
        if (this.config.showTicks) {
            this._createTicks();
        }
        
        // 创建值标签
        if (this.config.showValue) {
            this._createValueLabels();
        }
        
        // 组装DOM结构
        this.track.appendChild(this.fill);
        this.trackContainer.appendChild(this.track);
        this.trackContainer.appendChild(this.thumbElements[0]);
        if (this.config.type === 'range' && this.thumbElements[1]) {
            this.trackContainer.appendChild(this.thumbElements[1]);
        }
        this.sliderContainer.appendChild(this.trackContainer);
        
        // 添加到容器
        this.container.appendChild(this.sliderContainer);
        
        // 添加隐藏的输入字段用于表单提交
        this._createHiddenInputs();
    }
    
    /**
     * 创建滑块元素
     * @private
     */
    _createThumbs() {
        // 单值模式
        if (this.config.type === 'single') {
            const thumb = this._createElement('div', {
                className: 'slider-thumb slider-thumb-min',
                tabIndex: this.config.disabled ? -1 : 0,
                role: 'slider',
                'aria-valuenow': this.config.value[0],
                'aria-valuemin': this.config.min,
                'aria-valuemax': this.config.max,
                'aria-disabled': this.config.disabled
            });
            this.thumbElements.push(thumb);
        } 
        // 范围模式
        else if (this.config.type === 'range') {
            // 最小值滑块
            const minThumb = this._createElement('div', {
                className: 'slider-thumb slider-thumb-min',
                tabIndex: this.config.disabled ? -1 : 0,
                role: 'slider',
                'aria-valuenow': this.config.value[0],
                'aria-valuemin': this.config.min,
                'aria-valuemax': this.config.value[1],
                'aria-disabled': this.config.disabled
            });
            
            // 最大值滑块
            const maxThumb = this._createElement('div', {
                className: 'slider-thumb slider-thumb-max',
                tabIndex: this.config.disabled ? -1 : 0,
                role: 'slider',
                'aria-valuenow': this.config.value[1],
                'aria-valuemin': this.config.value[0],
                'aria-valuemax': this.config.max,
                'aria-disabled': this.config.disabled
            });
            
            this.thumbElements = [minThumb, maxThumb];
        }
    }
    
    /**
     * 创建刻度线
     * @private
     */
    _createTicks() {
        const tickCount = Math.floor((this.config.max - this.config.min) / this.config.step) + 1;
        const tickContainer = this._createElement('div', {
            className: 'slider-ticks'
        });
        
        for (let i = 0; i < tickCount; i++) {
            const value = this.config.min + (i * this.config.step);
            const percentage = ((value - this.config.min) / (this.config.max - this.config.min)) * 100;
            
            const tick = this._createElement('div', {
                className: 'slider-tick',
                style: this.config.orientation === 'horizontal' 
                    ? `left: ${percentage}%` 
                    : `bottom: ${percentage}%`
            });
            
            if (this.config.showLabels) {
                const label = this._createElement('div', {
                    className: 'slider-tick-label',
                    style: this.config.orientation === 'horizontal' 
                        ? `left: ${percentage}%` 
                        : `bottom: ${percentage}%`
                });
                label.textContent = value;
                tickContainer.appendChild(label);
            }
            
            tickContainer.appendChild(tick);
        }
        
        this.sliderContainer.appendChild(tickContainer);
        this.tickElements = tickContainer.querySelectorAll('.slider-tick');
    }
    
    /**
     * 创建值标签
     * @private
     */
    _createValueLabels() {
        this.valueLabels = [];
        const labelsContainer = this._createElement('div', {
            className: 'slider-value-labels'
        });
        
        // 单值模式
        if (this.config.type === 'single') {
            const label = this._createElement('div', {
                className: 'slider-value-label',
                style: this.config.orientation === 'horizontal' 
                    ? `left: 0` 
                    : `bottom: 0`
            });
            label.textContent = this.config.value[0];
            labelsContainer.appendChild(label);
            this.valueLabels.push(label);
        }
        // 范围模式
        else if (this.config.type === 'range') {
            // 最小值标签
            const minLabel = this._createElement('div', {
                className: 'slider-value-label slider-value-label-min',
                style: this.config.orientation === 'horizontal' 
                    ? `left: 0` 
                    : `bottom: 0`
            });
            minLabel.textContent = this.config.value[0];
            
            // 最大值标签
            const maxLabel = this._createElement('div', {
                className: 'slider-value-label slider-value-label-max',
                style: this.config.orientation === 'horizontal' 
                    ? `right: 0` 
                    : `top: 0`
            });
            maxLabel.textContent = this.config.value[1];
            
            labelsContainer.appendChild(minLabel);
            labelsContainer.appendChild(maxLabel);
            this.valueLabels = [minLabel, maxLabel];
        }
        
        this.sliderContainer.appendChild(labelsContainer);
    }
    
    /**
     * 创建隐藏的输入字段
     * @private
     */
    _createHiddenInputs() {
        if (this.config.type === 'single') {
            this.hiddenInput = this._createElement('input', {
                type: 'hidden',
                name: this.config.name || 'slider',
                value: this.config.value[0]
            });
            this.container.appendChild(this.hiddenInput);
        } else if (this.config.type === 'range') {
            this.minHiddenInput = this._createElement('input', {
                type: 'hidden',
                name: this.config.name ? `${this.config.name}_min` : 'slider_min',
                value: this.config.value[0]
            });
            
            this.maxHiddenInput = this._createElement('input', {
                type: 'hidden',
                name: this.config.name ? `${this.config.name}_max` : 'slider_max',
                value: this.config.value[1]
            });
            
            this.container.appendChild(this.minHiddenInput);
            this.container.appendChild(this.maxHiddenInput);
        }
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
        if (document.getElementById('slider-global-styles')) return;
        
        const styles = `
            .slider-container {
                position: relative;
                display: inline-block;
                user-select: none;
            }
            
            .slider-horizontal {
                width: 100%;
                height: 40px;
            }
            
            .slider-vertical {
                width: 40px;
                height: 200px;
            }
            
            .slider-track-container {
                position: absolute;
                overflow: visible;
            }
            
            .slider-horizontal .slider-track-container {
                top: 50%;
                left: 0;
                right: 0;
                height: 4px;
                margin-top: -2px;
            }
            
            .slider-vertical .slider-track-container {
                left: 50%;
                top: 0;
                bottom: 0;
                width: 4px;
                margin-left: -2px;
            }
            
            .slider-track {
                position: absolute;
                background: #ddd;
                border-radius: 2px;
            }
            
            .slider-horizontal .slider-track {
                top: 0;
                left: 0;
                right: 0;
                height: 100%;
            }
            
            .slider-vertical .slider-track {
                top: 0;
                left: 0;
                bottom: 0;
                width: 100%;
            }
            
            .slider-fill {
                position: absolute;
                background: #007bff;
                border-radius: 2px;
            }
            
            .slider-horizontal .slider-fill {
                top: 0;
                left: 0;
                height: 100%;
            }
            
            .slider-vertical .slider-fill {
                bottom: 0;
                left: 0;
                width: 100%;
            }
            
            .slider-thumb {
                position: absolute;
                background: #fff;
                border: 2px solid #007bff;
                border-radius: 50%;
                cursor: pointer;
                outline: none;
                transition: all 0.2s ease;
            }
            
            .slider-horizontal .slider-thumb {
                top: 50%;
                transform: translate(-50%, -50%);
            }
            
            .slider-vertical .slider-thumb {
                left: 50%;
                transform: translate(-50%, 50%);
            }
            
            .slider-thumb:hover {
                transform: translate(-50%, -50%) scale(1.1);
                box-shadow: 0 0 10px rgba(0, 123, 255, 0.5);
            }
            
            .slider-thumb:active {
                transform: translate(-50%, -50%) scale(1.2);
                box-shadow: 0 0 15px rgba(0, 123, 255, 0.7);
            }
            
            .slider-container.disabled .slider-track {
                background: #e0e0e0;
            }
            
            .slider-container.disabled .slider-fill {
                background: #999;
            }
            
            .slider-container.disabled .slider-thumb {
                background: #ccc;
                border-color: #999;
                cursor: not-allowed;
            }
            
            /* 尺寸样式 */
            .slider-container.size-small .slider-thumb {
                width: 16px;
                height: 16px;
            }
            
            .slider-container.size-medium .slider-thumb {
                width: 20px;
                height: 20px;
            }
            
            .slider-container.size-large .slider-thumb {
                width: 24px;
                height: 24px;
            }
            
            /* 主题样式 */
            .slider-container.theme-dark .slider-track {
                background: #444;
            }
            
            .slider-container.theme-dark .slider-fill {
                background: #009688;
            }
            
            .slider-container.theme-dark .slider-thumb {
                background: #222;
                border-color: #009688;
            }
            
            .slider-container.theme-neon .slider-track {
                background: #333;
            }
            
            .slider-container.theme-neon .slider-fill {
                background: #00ffcc;
                box-shadow: 0 0 10px #00ffcc;
            }
            
            .slider-container.theme-neon .slider-thumb {
                background: #00ffcc;
                border-color: #00ffcc;
                box-shadow: 0 0 15px #00ffcc;
            }
            
            /* 刻度线样式 */
            .slider-ticks {
                position: absolute;
                pointer-events: none;
            }
            
            .slider-horizontal .slider-ticks {
                top: 50%;
                left: 0;
                right: 0;
                height: 100%;
                margin-top: -2px;
            }
            
            .slider-vertical .slider-ticks {
                left: 50%;
                top: 0;
                bottom: 0;
                width: 100%;
                margin-left: -2px;
            }
            
            .slider-tick {
                position: absolute;
                background: #ddd;
            }
            
            .slider-horizontal .slider-tick {
                top: -4px;
                bottom: -4px;
                width: 1px;
            }
            
            .slider-vertical .slider-tick {
                left: -4px;
                right: -4px;
                height: 1px;
            }
            
            .slider-tick-label {
                position: absolute;
                font-size: 12px;
                color: #666;
                white-space: nowrap;
                pointer-events: none;
                transform: translate(-50%, 100%);
                margin-top: 5px;
            }
            
            .slider-vertical .slider-tick-label {
                transform: translate(-100%, -50%);
                margin-top: 0;
                margin-left: -5px;
            }
            
            /* 值标签样式 */
            .slider-value-labels {
                position: absolute;
                width: 100%;
                height: 100%;
                pointer-events: none;
            }
            
            .slider-value-label {
                position: absolute;
                font-size: 14px;
                font-weight: bold;
                color: #333;
                white-space: nowrap;
                transform: translate(-50%, -100%);
                margin-top: -5px;
            }
            
            .slider-horizontal .slider-value-label-min {
                transform: translate(-50%, -100%);
            }
            
            .slider-horizontal .slider-value-label-max {
                transform: translate(50%, -100%);
            }
            
            .slider-vertical .slider-value-label {
                transform: translate(-100%, -50%);
                margin-left: -10px;
            }
            
            .slider-vertical .slider-value-label-min {
                transform: translate(-100%, -50%);
            }
            
            .slider-vertical .slider-value-label-max {
                transform: translate(-100%, 50%);
            }
            
            /* 工具提示样式 */
            .slider-tooltip {
                position: absolute;
                background: #333;
                color: white;
                padding: 4px 8px;
                border-radius: 4px;
                font-size: 12px;
                pointer-events: none;
                z-index: 1000;
                white-space: nowrap;
                opacity: 0;
                transition: opacity 0.2s ease;
            }
            
            .slider-tooltip.visible {
                opacity: 1;
            }
            
            /* 响应式设计 */
            @media (max-width: 768px) {
                .slider-vertical {
                    height: 150px;
                }
                
                .slider-tick-label {
                    font-size: 10px;
                }
                
                .slider-value-label {
                    font-size: 12px;
                }
            }
        `;
        
        const styleSheet = document.createElement('style');
        styleSheet.id = 'slider-global-styles';
        styleSheet.textContent = styles;
        document.head.appendChild(styleSheet);
    }
    
    /**
     * 应用配置样式
     * @private
     */
    _applyConfigStyles() {
        // 设置轨道高度
        const trackHeight = this.config.trackHeight || {
            'small': 2,
            'medium': 4,
            'large': 6
        }[this.config.size];
        
        if (this.config.orientation === 'horizontal') {
            this.trackContainer.style.height = `${trackHeight}px`;
            this.track.style.height = `${trackHeight}px`;
            this.fill.style.height = `${trackHeight}px`;
        } else {
            this.trackContainer.style.width = `${trackHeight}px`;
            this.track.style.width = `${trackHeight}px`;
            this.fill.style.width = `${trackHeight}px`;
        }
        
        // 设置滑块大小
        const thumbSize = this.config.thumbSize || {
            'small': 16,
            'medium': 20,
            'large': 24
        }[this.config.size];
        
        this.thumbElements.forEach(thumb => {
            thumb.style.width = `${thumbSize}px`;
            thumb.style.height = `${thumbSize}px`;
        });
        
        // 应用自定义颜色
        if (this.config.color) {
            this.fill.style.backgroundColor = this.config.color;
            this.thumbElements.forEach(thumb => {
                thumb.style.borderColor = this.config.color;
            });
        }
        
        if (this.config.trackColor) {
            this.track.style.backgroundColor = this.config.trackColor;
        }
        
        if (this.config.fillColor) {
            this.fill.style.backgroundColor = this.config.fillColor;
        }
        
        // 应用禁用状态
        if (this.config.disabled) {
            this.sliderContainer.classList.add('disabled');
        }
    }
    
    /**
     * 绑定事件
     * @private
     */
    _bindEvents() {
        // 滑块拖拽事件
        this.thumbElements.forEach((thumb, index) => {
            // 鼠标事件
            thumb.addEventListener('mousedown', (e) => this._onThumbMouseDown(e, thumb, index));
            
            // 触摸事件
            thumb.addEventListener('touchstart', (e) => this._onThumbTouchStart(e, thumb, index));
            
            // 键盘事件
            thumb.addEventListener('keydown', (e) => this._onThumbKeyDown(e, index));
        });
        
        // 轨道点击事件
        this.track.addEventListener('click', (e) => this._onTrackClick(e));
        
        // 全局鼠标/触摸事件
        document.addEventListener('mousemove', (e) => this._onMouseMove(e));
        document.addEventListener('mouseup', (e) => this._onMouseUp(e));
        document.addEventListener('touchmove', (e) => this._onTouchMove(e));
        document.addEventListener('touchend', (e) => this._onTouchEnd(e));
    }
    
    /**
     * 初始化工具提示
     * @private
     */
    _initTooltips() {
        this.tooltips = [];
        
        this.thumbElements.forEach((thumb, index) => {
            const tooltip = new Tooltip(thumb, {
                content: this.config.value[index].toString(),
                position: this.config.orientation === 'horizontal' ? 'top' : 'left',
                trigger: this.config.tooltipAlwaysVisible ? 'manual' : 'hover',
                showDelay: 0,
                hideDelay: 0,
                theme: this.config.theme
            });
            
            this.tooltips.push(tooltip);
            
            if (this.config.tooltipAlwaysVisible) {
                tooltip.show();
            }
        });
    }
    
    /**
     * 更新滑块位置和值
     * @private
     */
    _updateValues() {
        if (this.config.type === 'single') {
            this._updateSingleValue();
        } else if (this.config.type === 'range') {
            this._updateRangeValues();
        }
    }
    
    /**
     * 更新单值模式的滑块位置和值
     * @private
     */
    _updateSingleValue() {
        const value = this.config.value[0];
        const percentage = this._getValuePercentage(value);
        
        // 更新填充轨道
        if (this.config.orientation === 'horizontal') {
            this.fill.style.width = `${percentage}%`;
        } else {
            this.fill.style.height = `${percentage}%`;
        }
        
        // 更新滑块位置
        const thumb = this.thumbElements[0];
        if (this.config.orientation === 'horizontal') {
            thumb.style.left = `${percentage}%`;
        } else {
            thumb.style.bottom = `${percentage}%`;
        }
        
        // 更新ARIA属性
        thumb.setAttribute('aria-valuenow', value);
        
        // 更新隐藏输入
        if (this.hiddenInput) {
            this.hiddenInput.value = value;
        }
        
        // 更新值标签
        if (this.valueLabels && this.valueLabels[0]) {
            if (this.config.orientation === 'horizontal') {
                this.valueLabels[0].style.left = `${percentage}%`;
            } else {
                this.valueLabels[0].style.bottom = `${percentage}%`;
            }
            this.valueLabels[0].textContent = value;
        }
        
        // 更新工具提示
        if (this.tooltips && this.tooltips[0]) {
            const tooltipText = this.config.tooltipFormat 
                ? this.config.tooltipFormat(value) 
                : value.toString();
            this.tooltips[0].setContent(tooltipText);
        }
    }
    
    /**
     * 更新范围模式的滑块位置和值
     * @private
     */
    _updateRangeValues() {
        const minValue = this.config.value[0];
        const maxValue = this.config.value[1];
        const minPercentage = this._getValuePercentage(minValue);
        const maxPercentage = this._getValuePercentage(maxValue);
        
        // 更新填充轨道
        if (this.config.orientation === 'horizontal') {
            this.fill.style.left = `${minPercentage}%`;
            this.fill.style.width = `${maxPercentage - minPercentage}%`;
        } else {
            this.fill.style.bottom = `${minPercentage}%`;
            this.fill.style.height = `${maxPercentage - minPercentage}%`;
        }
        
        // 更新最小滑块
        const minThumb = this.thumbElements[0];
        if (this.config.orientation === 'horizontal') {
            minThumb.style.left = `${minPercentage}%`;
        } else {
            minThumb.style.bottom = `${minPercentage}%`;
        }
        minThumb.setAttribute('aria-valuenow', minValue);
        minThumb.setAttribute('aria-valuemin', this.config.min);
        minThumb.setAttribute('aria-valuemax', maxValue);
        
        // 更新最大滑块
        const maxThumb = this.thumbElements[1];
        if (this.config.orientation === 'horizontal') {
            maxThumb.style.left = `${maxPercentage}%`;
        } else {
            maxThumb.style.bottom = `${maxPercentage}%`;
        }
        maxThumb.setAttribute('aria-valuenow', maxValue);
        maxThumb.setAttribute('aria-valuemin', minValue);
        maxThumb.setAttribute('aria-valuemax', this.config.max);
        
        // 更新隐藏输入
        if (this.minHiddenInput) {
            this.minHiddenInput.value = minValue;
        }
        if (this.maxHiddenInput) {
            this.maxHiddenInput.value = maxValue;
        }
        
        // 更新值标签
        if (this.valueLabels && this.valueLabels[0]) {
            if (this.config.orientation === 'horizontal') {
                this.valueLabels[0].style.left = `${minPercentage}%`;
                this.valueLabels[1].style.right = `${100 - maxPercentage}%`;
            } else {
                this.valueLabels[0].style.bottom = `${minPercentage}%`;
                this.valueLabels[1].style.top = `${100 - maxPercentage}%`;
            }
            this.valueLabels[0].textContent = minValue;
            this.valueLabels[1].textContent = maxValue;
        }
        
        // 更新工具提示
        if (this.tooltips) {
            const minTooltipText = this.config.tooltipFormat 
                ? this.config.tooltipFormat(minValue) 
                : minValue.toString();
            const maxTooltipText = this.config.tooltipFormat 
                ? this.config.tooltipFormat(maxValue) 
                : maxValue.toString();
            
            this.tooltips[0].setContent(minTooltipText);
            this.tooltips[1].setContent(maxTooltipText);
        }
    }
    
    /**
     * 根据值计算百分比位置
     * @private
     * @param {number} value - 滑块值
     * @returns {number} 百分比位置
     */
    _getValuePercentage(value) {
        return ((value - this.config.min) / (this.config.max - this.config.min)) * 100;
    }
    
    /**
     * 根据位置计算值
     * @private
     * @param {number} position - 位置（像素）
     * @returns {number} 对应的值
     */
    _getPositionValue(position) {
        let trackSize;
        if (this.config.orientation === 'horizontal') {
            trackSize = this.track.offsetWidth;
        } else {
            trackSize = this.track.offsetHeight;
        }
        
        const percentage = Math.max(0, Math.min(100, (position / trackSize) * 100));
        const value = this.config.min + (percentage / 100) * (this.config.max - this.config.min);
        
        // 按步长调整值
        return Math.round(value / this.config.step) * this.config.step;
    }
    
    /**
     * 获取鼠标/触摸事件的位置
     * @private
     * @param {Event} event - 事件对象
     * @returns {number} 位置（像素）
     */
    _getEventPosition(event) {
        const rect = this.track.getBoundingClientRect();
        let clientPos;
        
        if (event.type.includes('mouse')) {
            clientPos = this.config.orientation === 'horizontal' 
                ? event.clientX 
                : event.clientY;
        } else if (event.type.includes('touch')) {
            const touch = event.touches[0] || event.changedTouches[0];
            clientPos = this.config.orientation === 'horizontal' 
                ? touch.clientX 
                : touch.clientY;
        }
        
        if (this.config.orientation === 'horizontal') {
            return clientPos - rect.left;
        } else {
            return clientPos - rect.top;
        }
    }
    
    /**
     * 限制范围值
     * @private
     * @param {number} minValue - 最小值
     * @param {number} maxValue - 最大值
     * @returns {Array} 限制后的[minValue, maxValue]
     */
    _limitRangeValues(minValue, maxValue) {
        // 确保最小值不大于最大值
        if (minValue > maxValue) {
            [minValue, maxValue] = [maxValue, minValue];
        }
        
        // 应用范围间隙限制
        if (this.config.lockRange && this.config.rangeGap > 0) {
            const range = maxValue - minValue;
            if (range < this.config.rangeGap) {
                const center = (minValue + maxValue) / 2;
                minValue = center - this.config.rangeGap / 2;
                maxValue = center + this.config.rangeGap / 2;
            }
        }
        
        // 确保在最小/最大值范围内
        minValue = Math.max(this.config.min, minValue);
        maxValue = Math.min(this.config.max, maxValue);
        
        return [minValue, maxValue];
    }
    
    /**
     * 鼠标按下事件处理
     * @private
     * @param {MouseEvent} event - 鼠标事件
     * @param {HTMLElement} thumb - 滑块元素
     * @param {number} index - 滑块索引
     */
    _onThumbMouseDown(event, thumb, index) {
        if (this.config.disabled || this.config.readonly) return;
        
        event.preventDefault();
        this.isDragging = true;
        this.activeThumb = index;
        thumb.classList.add('active');
        
        // 触发开始回调
        if (this.config.onStart) {
            this.config.onStart(this.config.value);
        }
    }
    
    /**
     * 触摸开始事件处理
     * @private
     * @param {TouchEvent} event - 触摸事件
     * @param {HTMLElement} thumb - 滑块元素
     * @param {number} index - 滑块索引
     */
    _onThumbTouchStart(event, thumb, index) {
        if (this.config.disabled || this.config.readonly) return;
        
        event.preventDefault();
        this.isDragging = true;
        this.activeThumb = index;
        thumb.classList.add('active');
        
        // 触发开始回调
        if (this.config.onStart) {
            this.config.onStart(this.config.value);
        }
    }
    
    /**
     * 键盘事件处理
     * @private
     * @param {KeyboardEvent} event - 键盘事件
     * @param {number} index - 滑块索引
     */
    _onThumbKeyDown(event, index) {
        if (this.config.disabled || this.config.readonly) return;
        
        let newValue = [...this.config.value];
        let step = this.config.step;
        
        // 根据按键计算新值
        switch (event.key) {
            case 'ArrowLeft':
            case 'ArrowDown':
                newValue[index] = Math.max(this.config.min, newValue[index] - step);
                break;
            case 'ArrowRight':
            case 'ArrowUp':
                newValue[index] = Math.min(this.config.max, newValue[index] + step);
                break;
            case 'Home':
                newValue[index] = this.config.min;
                break;
            case 'End':
                newValue[index] = this.config.max;
                break;
            case 'PageUp':
                step = step * 10;
                newValue[index] = Math.min(this.config.max, newValue[index] + step);
                break;
            case 'PageDown':
                step = step * 10;
                newValue[index] = Math.max(this.config.min, newValue[index] - step);
                break;
            default:
                return;
        }
        
        event.preventDefault();
        
        // 范围模式下需要限制范围
        if (this.config.type === 'range') {
            newValue = this._limitRangeValues(newValue[0], newValue[1]);
        }
        
        // 更新值并触发回调
        this.config.value = newValue;
        this._updateValues();
        
        // 触发输入回调
        if (this.config.onInput) {
            this.config.onInput(newValue);
        }
        
        // 触发变化回调
        if (this.config.onChange) {
            this.config.onChange(newValue);
        }
    }
    
    /**
     * 轨道点击事件处理
     * @private
     * @param {MouseEvent} event - 鼠标事件
     */
    _onTrackClick(event) {
        if (this.config.disabled || this.config.readonly) return;
        
        // 计算点击位置对应的值
        const position = this._getEventPosition(event);
        const value = this._getPositionValue(position);
        
        if (this.config.type === 'single') {
            // 单值模式
            this.config.value = [value];
        } else if (this.config.type === 'range') {
            // 范围模式 - 选择最近的滑块
            const currentValues = this.config.value;
            const minDistance = Math.min(
                Math.abs(value - currentValues[0]),
                Math.abs(value - currentValues[1])
            );
            
            const newValues = [...currentValues];
            if (Math.abs(value - currentValues[0]) === minDistance) {
                newValues[0] = value;
            } else {
                newValues[1] = value;
            }
            
            // 限制范围
            this.config.value = this._limitRangeValues(newValues[0], newValues[1]);
        }
        
        // 更新值并触发回调
        this._updateValues();
        
        // 触发输入回调
        if (this.config.onInput) {
            this.config.onInput(this.config.value);
        }
        
        // 触发变化回调
        if (this.config.onChange) {
            this.config.onChange(this.config.value);
        }
    }
    
    /**
     * 鼠标移动事件处理
     * @private
     * @param {MouseEvent} event - 鼠标事件
     */
    _onMouseMove(event) {
        if (!this.isDragging) return;
        
        event.preventDefault();
        
        // 计算移动位置对应的值
        const position = this._getEventPosition(event);
        const value = this._getPositionValue(position);
        
        const newValues = [...this.config.value];
        newValues[this.activeThumb] = value;
        
        // 范围模式下需要限制范围
        if (this.config.type === 'range') {
            this.config.value = this._limitRangeValues(newValues[0], newValues[1]);
        } else {
            this.config.value = newValues;
        }
        
        // 更新值并触发回调
        this._updateValues();
        
        // 触发输入回调
        if (this.config.onInput) {
            this.config.onInput(this.config.value);
        }
    }
    
    /**
     * 触摸移动事件处理
     * @private
     * @param {TouchEvent} event - 触摸事件
     */
    _onTouchMove(event) {
        if (!this.isDragging) return;
        
        event.preventDefault();
        
        // 计算移动位置对应的值
        const position = this._getEventPosition(event);
        const value = this._getPositionValue(position);
        
        const newValues = [...this.config.value];
        newValues[this.activeThumb] = value;
        
        // 范围模式下需要限制范围
        if (this.config.type === 'range') {
            this.config.value = this._limitRangeValues(newValues[0], newValues[1]);
        } else {
            this.config.value = newValues;
        }
        
        // 更新值并触发回调
        this._updateValues();
        
        // 触发输入回调
        if (this.config.onInput) {
            this.config.onInput(this.config.value);
        }
    }
    
    /**
     * 鼠标释放事件处理
     * @private
     * @param {MouseEvent} event - 鼠标事件
     */
    _onMouseUp(event) {
        if (!this.isDragging) return;
        
        this.isDragging = false;
        
        // 移除活动状态
        this.thumbElements.forEach(thumb => {
            thumb.classList.remove('active');
        });
        
        // 触发结束回调
        if (this.config.onEnd) {
            this.config.onEnd(this.config.value);
        }
        
        // 触发变化回调
        if (this.config.onChange) {
            this.config.onChange(this.config.value);
        }
    }
    
    /**
     * 触摸结束事件处理
     * @private
     * @param {TouchEvent} event - 触摸事件
     */
    _onTouchEnd(event) {
        if (!this.isDragging) return;
        
        this.isDragging = false;
        
        // 移除活动状态
        this.thumbElements.forEach(thumb => {
            thumb.classList.remove('active');
        });
        
        // 触发结束回调
        if (this.config.onEnd) {
            this.config.onEnd(this.config.value);
        }
        
        // 触发变化回调
        if (this.config.onChange) {
            this.config.onChange(this.config.value);
        }
    }
    
    // ===== 公共方法 =====
    
    /**
     * 设置滑块值
     * @param {number|Array} value - 单值模式下为number，范围模式下为[min, max]数组
     * @returns {Slider} 当前实例，支持链式调用
     */
    setValue(value) {
        if (this.config.disabled || this.config.readonly) return this;
        
        if (this.config.type === 'single') {
            this.config.value = [Number(value) || 0];
        } else if (this.config.type === 'range' && Array.isArray(value) && value.length >= 2) {
            this.config.value = this._limitRangeValues(Number(value[0]) || 0, Number(value[1]) || 0);
        }
        
        this._updateValues();
        
        // 触发变化回调
        if (this.config.onChange) {
            this.config.onChange(this.config.value);
        }
        
        return this;
    }
    
    /**
     * 获取滑块值
     * @returns {number|Array} 单值模式下返回number，范围模式下返回[min, max]数组
     */
    getValue() {
        return this.config.type === 'single' ? this.config.value[0] : this.config.value;
    }
    
    /**
     * 设置最小值
     * @param {number} min - 最小值
     * @returns {Slider} 当前实例，支持链式调用
     */
    setMin(min) {
        this.config.min = Number(min) || 0;
        
        // 确保当前值在有效范围内
        if (this.config.type === 'single') {
            this.config.value[0] = Math.max(this.config.min, this.config.value[0]);
        } else if (this.config.type === 'range') {
            this.config.value[0] = Math.max(this.config.min, this.config.value[0]);
            this.config.value = this._limitRangeValues(this.config.value[0], this.config.value[1]);
        }
        
        this._updateValues();
        
        // 更新ARIA属性
        this.thumbElements.forEach(thumb => {
            thumb.setAttribute('aria-valuemin', this.config.min);
        });
        
        return this;
    }
    
    /**
     * 设置最大值
     * @param {number} max - 最大值
     * @returns {Slider} 当前实例，支持链式调用
     */
    setMax(max) {
        this.config.max = Number(max) || 100;
        
        // 确保当前值在有效范围内
        if (this.config.type === 'single') {
            this.config.value[0] = Math.min(this.config.max, this.config.value[0]);
        } else if (this.config.type === 'range') {
            this.config.value[1] = Math.min(this.config.max, this.config.value[1]);
            this.config.value = this._limitRangeValues(this.config.value[0], this.config.value[1]);
        }
        
        this._updateValues();
        
        // 更新ARIA属性
        this.thumbElements.forEach(thumb => {
            thumb.setAttribute('aria-valuemax', this.config.max);
        });
        
        return this;
    }
    
    /**
     * 设置步长
     * @param {number} step - 步长
     * @returns {Slider} 当前实例，支持链式调用
     */
    setStep(step) {
        this.config.step = Number(step) || 1;
        
        // 重新调整当前值
        if (this.config.type === 'single') {
            this.config.value[0] = Math.round(this.config.value[0] / this.config.step) * this.config.step;
        } else if (this.config.type === 'range') {
            this.config.value[0] = Math.round(this.config.value[0] / this.config.step) * this.config.step;
            this.config.value[1] = Math.round(this.config.value[1] / this.config.step) * this.config.step;
        }
        
        this._updateValues();
        
        return this;
    }
    
    /**
     * 设置启用/禁用状态
     * @param {boolean} disabled - 是否禁用
     * @returns {Slider} 当前实例，支持链式调用
     */
    setDisabled(disabled) {
        this.config.disabled = !!disabled;
        
        // 更新类名
        if (this.config.disabled) {
            this.sliderContainer.classList.add('disabled');
        } else {
            this.sliderContainer.classList.remove('disabled');
        }
        
        // 更新ARIA属性
        this.thumbElements.forEach(thumb => {
            thumb.setAttribute('aria-disabled', this.config.disabled);
            thumb.tabIndex = this.config.disabled ? -1 : 0;
        });
        
        return this;
    }
    
    /**
     * 设置只读状态
     * @param {boolean} readonly - 是否只读
     * @returns {Slider} 当前实例，支持链式调用
     */
    setReadonly(readonly) {
        this.config.readonly = !!readonly;
        return this;
    }
    
    /**
     * 设置主题
     * @param {string} theme - 主题名称
     * @returns {Slider} 当前实例，支持链式调用
     */
    setTheme(theme) {
        // 移除旧主题类名
        this.sliderContainer.classList.remove('theme-default', 'theme-dark', 'theme-neon');
        
        // 添加新主题类名
        this.config.theme = theme;
        this.sliderContainer.classList.add(`theme-${theme}`);
        
        // 更新工具提示主题
        if (this.tooltips) {
            this.tooltips.forEach(tooltip => {
                tooltip.setTheme(theme);
            });
        }
        
        return this;
    }
    
    /**
     * 设置尺寸
     * @param {string} size - 尺寸名称
     * @returns {Slider} 当前实例，支持链式调用
     */
    setSize(size) {
        // 移除旧尺寸类名
        this.sliderContainer.classList.remove('size-small', 'size-medium', 'size-large');
        
        // 添加新尺寸类名
        this.config.size = size;
        this.sliderContainer.classList.add(`size-${size}`);
        
        // 重新应用尺寸相关样式
        this._applyConfigStyles();
        
        return this;
    }
    
    /**
     * 设置颜色
     * @param {string} color - 颜色值
     * @returns {Slider} 当前实例，支持链式调用
     */
    setColor(color) {
        this.config.color = color;
        this._applyConfigStyles();
        return this;
    }
    
    /**
     * 设置轨道颜色
     * @param {string} color - 颜色值
     * @returns {Slider} 当前实例，支持链式调用
     */
    setTrackColor(color) {
        this.config.trackColor = color;
        this.track.style.backgroundColor = color;
        return this;
    }
    
    /**
     * 设置填充颜色
     * @param {string} color - 颜色值
     * @returns {Slider} 当前实例，支持链式调用
     */
    setFillColor(color) {
        this.config.fillColor = color;
        this.fill.style.backgroundColor = color;
        return this;
    }
    
    /**
     * 设置是否显示工具提示
     * @param {boolean} tooltip - 是否显示工具提示
     * @returns {Slider} 当前实例，支持链式调用
     */
    setTooltip(tooltip) {
        this.config.tooltip = !!tooltip;
        
        // 初始化或销毁工具提示
        if (tooltip && !this.tooltips && typeof Tooltip !== 'undefined') {
            this._initTooltips();
        } else if (!tooltip && this.tooltips) {
            this.tooltips.forEach(tooltip => tooltip.destroy());
            this.tooltips = null;
        }
        
        return this;
    }
    
    /**
     * 设置工具提示是否始终可见
     * @param {boolean} alwaysVisible - 是否始终可见
     * @returns {Slider} 当前实例，支持链式调用
     */
    setTooltipAlwaysVisible(alwaysVisible) {
        this.config.tooltipAlwaysVisible = !!alwaysVisible;
        
        if (this.tooltips) {
            this.tooltips.forEach(tooltip => {
                if (alwaysVisible) {
                    tooltip.setTrigger('manual');
                    tooltip.show();
                } else {
                    tooltip.setTrigger('hover');
                    tooltip.hide();
                }
            });
        }
        
        return this;
    }
    
    /**
     * 设置工具提示格式化函数
     * @param {Function} formatFunction - 格式化函数
     * @returns {Slider} 当前实例，支持链式调用
     */
    setTooltipFormat(formatFunction) {
        this.config.tooltipFormat = formatFunction;
        
        // 更新工具提示内容
        if (this.tooltips) {
            if (this.config.type === 'single') {
                const tooltipText = formatFunction(this.config.value[0]);
                this.tooltips[0].setContent(tooltipText);
            } else if (this.config.type === 'range') {
                const minTooltipText = formatFunction(this.config.value[0]);
                const maxTooltipText = formatFunction(this.config.value[1]);
                this.tooltips[0].setContent(minTooltipText);
                this.tooltips[1].setContent(maxTooltipText);
            }
        }
        
        return this;
    }
    
    /**
     * 设置是否显示值标签
     * @param {boolean} show - 是否显示
     * @returns {Slider} 当前实例，支持链式调用
     */
    setShowValue(show) {
        this.config.showValue = !!show;
        
        if (show && !this.valueLabels) {
            this._createValueLabels();
        } else if (!show && this.valueLabels) {
            const labelsContainer = this.valueLabels[0]?.parentElement;
            if (labelsContainer) {
                labelsContainer.remove();
            }
            this.valueLabels = null;
        }
        
        return this;
    }
    
    /**
     * 设置是否显示刻度线
     * @param {boolean} show - 是否显示
     * @returns {Slider} 当前实例，支持链式调用
     */
    setShowTicks(show) {
        this.config.showTicks = !!show;
        
        if (show && !this.tickElements.length) {
            this._createTicks();
        } else if (!show && this.tickElements.length) {
            const ticksContainer = this.tickElements[0]?.parentElement;
            if (ticksContainer) {
                ticksContainer.remove();
            }
            this.tickElements = [];
        }
        
        return this;
    }
    
    /**
     * 获取滑块元素
     * @returns {HTMLElement} 滑块容器元素
     */
    getElement() {
        return this.sliderContainer;
    }
    
    /**
     * 获取轨道元素
     * @returns {HTMLElement} 轨道元素
     */
    getTrack() {
        return this.track;
    }
    
    /**
     * 获取滑块元素列表
     * @returns {Array} 滑块元素数组
     */
    getThumbs() {
        return this.thumbElements;
    }
    
    /**
     * 刷新滑块状态
     * @returns {Slider} 当前实例，支持链式调用
     */
    refresh() {
        this._updateValues();
        return this;
    }
    
    /**
     * 销毁滑块组件
     */
    destroy() {
        // 销毁工具提示
        if (this.tooltips) {
            this.tooltips.forEach(tooltip => tooltip.destroy());
        }
        
        // 移除事件监听器
        document.removeEventListener('mousemove', this._onMouseMove.bind(this));
        document.removeEventListener('mouseup', this._onMouseUp.bind(this));
        document.removeEventListener('touchmove', this._onTouchMove.bind(this));
        document.removeEventListener('touchend', this._onTouchEnd.bind(this));
        
        // 移除DOM元素
        if (this.sliderContainer && this.sliderContainer.parentNode) {
            this.sliderContainer.parentNode.removeChild(this.sliderContainer);
        }
        
        // 清除引用
        this.sliderContainer = null;
        this.track = null;
        this.fill = null;
        this.thumbElements = [];
        this.valueLabels = [];
        this.tickElements = [];
        this.tooltips = null;
    }
}

// 导出组件
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Slider;
} else if (typeof window !== 'undefined') {
    window.Slider = Slider;
}