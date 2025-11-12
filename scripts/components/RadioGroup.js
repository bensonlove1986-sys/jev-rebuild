/**
 * RadioGroup组件 - 用于创建一组单选按钮
 * 支持自定义样式、标签、验证和各种交互功能
 */
class RadioGroup extends BaseComponent {
    /**
     * 创建新的RadioGroup实例
     * @param {HTMLElement|string} container - 容器元素或选择器
     * @param {Object} options - 配置选项
     */
    constructor(container, options = {}) {
        super(container, options);
        
        // 默认配置
        this.defaults = {
            // 基础配置
            name: '',              // 单选按钮组的名称
            value: '',             // 当前选中的值
            options: [],           // 选项列表 [{value, label, disabled, checked}, ...]
            
            // 视觉配置
            theme: 'default',      // 'default', 'dark', 'neon'
            size: 'medium',        // 'small', 'medium', 'large'
            
            // 布局配置
            orientation: 'vertical', // 'vertical', 'horizontal'
            labelPosition: 'right',  // 'left', 'right'
            spacing: 'medium',       // 'small', 'medium', 'large'
            
            // 状态配置
            disabled: false,       // 是否禁用整个组
            required: false,       // 是否必填
            
            // 标签配置
            groupLabel: '',        // 组标签文本
            showGroupLabel: false, // 是否显示组标签
            
            // 验证配置
            showValidation: true,  // 是否显示验证状态
            
            // 样式配置
            labelColor: null,      // 标签颜色
            backgroundColor: null, // 背景颜色
            
            // 动画配置
            animation: true,       // 是否启用动画
            
            // 事件回调
            onChange: null,        // 值变化时的回调
            onValidation: null     // 验证状态变化时的回调
        };
        
        // 合并配置
        this.config = Object.assign({}, this.defaults, options);
        
        // 初始化状态
        this._selectedValue = this.config.value;
        this._radioButtons = [];
        this._isValid = true;
        this._validationError = '';
        
        // 创建DOM元素
        this._createElements();
        
        // 应用样式
        this._applyStyles();
        
        // 绑定事件
        this._bindEvents();
        
        // 验证初始状态
        if (this.config.required) {
            this.validate();
        }
    }
    
    /**
     * 创建单选按钮组的DOM元素
     * @private
     */
    _createElements() {
        // 创建主容器
        this.containerElement = this._createElement('div', {
            className: `radio-group-container theme-${this.config.theme} size-${this.config.size} orientation-${this.config.orientation} spacing-${this.config.spacing}`,
            role: 'group',
            'aria-labelledby': this.config.groupLabel ? `radio-group-${this._generateId()}-label` : null,
            'aria-required': this.config.required
        });
        
        // 创建组标签
        if (this.config.showGroupLabel && this.config.groupLabel) {
            this.groupLabelElement = this._createElement('label', {
                id: `radio-group-${this._generateId()}-label`,
                className: 'radio-group-label',
                htmlFor: this.config.name ? `radio-group-${this.config.name}` : null
            });
            this.groupLabelElement.textContent = this.config.groupLabel;
            
            if (this.config.required) {
                const requiredIndicator = this._createElement('span', {
                    className: 'required-indicator'
                });
                requiredIndicator.textContent = '*';
                requiredIndicator.style.marginLeft = '4px';
                this.groupLabelElement.appendChild(requiredIndicator);
            }
            
            this.containerElement.appendChild(this.groupLabelElement);
        }
        
        // 创建选项容器
        this.optionsContainer = this._createElement('div', {
            className: 'radio-options-container',
            id: this.config.name ? `radio-group-${this.config.name}` : null
        });
        
        // 创建单选按钮选项
        this._createRadioButtons();
        
        this.containerElement.appendChild(this.optionsContainer);
        
        // 创建验证错误信息元素
        if (this.config.showValidation) {
            this.errorElement = this._createElement('div', {
                className: 'radio-group-error',
                role: 'alert',
                'aria-live': 'assertive'
            });
            this.containerElement.appendChild(this.errorElement);
        }
        
        // 添加到目标容器
        this.container.appendChild(this.containerElement);
    }
    
    /**
     * 创建单选按钮
     * @private
     */
    _createRadioButtons() {
        // 清空容器
        this.optionsContainer.innerHTML = '';
        this._radioButtons = [];
        
        // 创建每个选项
        this.config.options.forEach((option, index) => {
            // 创建选项容器
            const optionContainer = this._createElement('div', {
                className: 'radio-option-container',
                'data-value': option.value
            });
            
            // 创建单选按钮
            const radio = this._createElement('input', {
                type: 'radio',
                name: this.config.name || `radio-group-${this._generateId()}`,
                id: `${this.config.name || 'radio'}-${option.value || index}`,
                value: option.value,
                checked: option.checked || (this._selectedValue === option.value),
                disabled: this.config.disabled || option.disabled
            });
            
            // 设置ARIA属性
            radio.setAttribute('aria-checked', (option.checked || (this._selectedValue === option.value)).toString());
            
            // 创建标签
            const label = this._createElement('label', {
                htmlFor: radio.id,
                className: 'radio-label'
            });
            label.textContent = option.label;
            
            // 根据标签位置添加元素
            if (this.config.labelPosition === 'left') {
                optionContainer.appendChild(label);
                optionContainer.appendChild(radio);
            } else {
                optionContainer.appendChild(radio);
                optionContainer.appendChild(label);
            }
            
            // 添加到选项容器
            this.optionsContainer.appendChild(optionContainer);
            
            // 保存引用
            this._radioButtons.push({
                radio,
                label,
                container: optionContainer,
                value: option.value,
                disabled: option.disabled
            });
            
            // 如果选中了此选项，更新状态
            if (radio.checked) {
                this._selectedValue = option.value;
            }
        });
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
        if (document.getElementById('radio-group-global-styles')) return;
        
        const styles = `
            .radio-group-container {
                display: inline-block;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            }
            
            .radio-group-label {
                display: block;
                margin-bottom: 8px;
                font-weight: 500;
                font-size: 14px;
                color: #333;
            }
            
            .radio-options-container {
                display: contents;
            }
            
            .radio-option-container {
                display: flex;
                align-items: center;
                margin-bottom: 6px;
                cursor: pointer;
                transition: all 0.2s ease;
            }
            
            /* 垂直布局 */
            .radio-group-container.orientation-vertical .radio-option-container {
                display: flex;
                flex-direction: row;
                width: 100%;
            }
            
            /* 水平布局 */
            .radio-group-container.orientation-horizontal .radio-options-container {
                display: flex;
                flex-wrap: wrap;
                gap: 16px;
            }
            
            .radio-group-container.orientation-horizontal .radio-option-container {
                margin-bottom: 0;
            }
            
            /* 间距样式 */
            .radio-group-container.spacing-small .radio-option-container {
                margin-bottom: 4px;
            }
            
            .radio-group-container.spacing-medium .radio-option-container {
                margin-bottom: 8px;
            }
            
            .radio-group-container.spacing-large .radio-option-container {
                margin-bottom: 12px;
            }
            
            /* 单选按钮样式 */
            .radio-option-container input[type="radio"] {
                position: relative;
                margin: 0;
                cursor: pointer;
                accent-color: #007bff;
                transition: all 0.2s ease;
            }
            
            /* 尺寸样式 */
            .radio-group-container.size-small input[type="radio"] {
                width: 14px;
                height: 14px;
            }
            
            .radio-group-container.size-medium input[type="radio"] {
                width: 16px;
                height: 16px;
            }
            
            .radio-group-container.size-large input[type="radio"] {
                width: 20px;
                height: 20px;
            }
            
            /* 标签样式 */
            .radio-label {
                margin-left: 8px;
                margin-right: 8px;
                font-size: 14px;
                color: #333;
                cursor: pointer;
                transition: color 0.2s ease;
                user-select: none;
            }
            
            .radio-group-container.size-small .radio-label {
                font-size: 12px;
            }
            
            .radio-group-container.size-medium .radio-label {
                font-size: 14px;
            }
            
            .radio-group-container.size-large .radio-label {
                font-size: 16px;
            }
            
            /* 左侧标签 */
            .radio-group-container labelPosition-left .radio-label {
                margin-right: 8px;
                margin-left: 0;
            }
            
            /* 右侧标签 */
            .radio-group-container labelPosition-right .radio-label {
                margin-left: 8px;
                margin-right: 0;
            }
            
            /* 交互状态 */
            .radio-option-container:hover input[type="radio"] + .radio-label {
                color: #007bff;
            }
            
            .radio-option-container input[type="radio"]:focus + .radio-label {
                outline: 2px solid #007bff;
                outline-offset: 2px;
            }
            
            /* 禁用状态 */
            .radio-option-container input[type="radio"]:disabled {
                opacity: 0.5;
                cursor: not-allowed;
            }
            
            .radio-option-container input[type="radio"]:disabled + .radio-label {
                color: #6c757d;
                cursor: not-allowed;
            }
            
            /* 深色主题 */
            .radio-group-container.theme-dark .radio-group-label,
            .radio-group-container.theme-dark .radio-label {
                color: #ddd;
            }
            
            .radio-group-container.theme-dark input[type="radio"] {
                accent-color: #00bcd4;
            }
            
            .radio-group-container.theme-dark .radio-option-container:hover input[type="radio"] + .radio-label {
                color: #00bcd4;
            }
            
            .radio-group-container.theme-dark .radio-option-container input[type="radio"]:focus + .radio-label {
                outline-color: #00bcd4;
            }
            
            /* 霓虹主题 */
            .radio-group-container.theme-neon input[type="radio"] {
                accent-color: #00ffcc;
                box-shadow: 0 0 5px rgba(0, 255, 204, 0.5);
            }
            
            .radio-group-container.theme-neon .radio-option-container:hover input[type="radio"] + .radio-label {
                color: #00ffcc;
            }
            
            .radio-group-container.theme-neon .radio-option-container input[type="radio"]:focus + .radio-label {
                outline-color: #00ffcc;
                box-shadow: 0 0 8px rgba(0, 255, 204, 0.3);
            }
            
            /* 验证状态 */
            .radio-group-container.invalid {
                border-left: 3px solid #dc3545;
                padding-left: 8px;
            }
            
            .radio-group-container.valid {
                border-left: 3px solid #28a745;
                padding-left: 8px;
            }
            
            /* 错误信息样式 */
            .radio-group-error {
                margin-top: 8px;
                font-size: 12px;
                color: #dc3545;
                min-height: 16px;
            }
            
            /* 响应式设计 */
            @media (max-width: 768px) {
                .radio-group-container.orientation-horizontal .radio-options-container {
                    flex-direction: column;
                    gap: 0;
                }
                
                .radio-group-container.orientation-horizontal .radio-option-container {
                    margin-bottom: 6px;
                }
                
                .radio-group-label {
                    font-size: 12px;
                }
                
                .radio-label {
                    font-size: 12px;
                }
                
                .radio-group-error {
                    font-size: 11px;
                }
            }
            
            /* 无障碍支持 */
            .radio-option-container:focus-within {
                outline: 2px solid #007bff;
                outline-offset: 2px;
                border-radius: 2px;
            }
            
            /* 高对比度模式 */
            @media (prefers-contrast: high) {
                .radio-option-container input[type="radio"] {
                    border: 2px solid currentColor;
                }
            }
            
            /* 减少动画 */
            @media (prefers-reduced-motion: reduce) {
                .radio-option-container,
                .radio-label,
                input[type="radio"] {
                    transition: none;
                }
            }
        `;
        
        const styleSheet = document.createElement('style');
        styleSheet.id = 'radio-group-global-styles';
        styleSheet.textContent = styles;
        document.head.appendChild(styleSheet);
    }
    
    /**
     * 应用配置样式
     * @private
     */
    _applyConfigStyles() {
        // 设置自定义颜色
        if (this.config.labelColor) {
            const labels = this.containerElement.querySelectorAll('.radio-label, .radio-group-label');
            labels.forEach(label => {
                label.style.color = this.config.labelColor;
            });
        }
        
        if (this.config.backgroundColor) {
            this.containerElement.style.backgroundColor = this.config.backgroundColor;
            this.containerElement.style.padding = '12px';
            this.containerElement.style.borderRadius = '4px';
        }
    }
    
    /**
     * 绑定事件
     * @private
     */
    _bindEvents() {
        // 为每个单选按钮绑定事件
        this._radioButtons.forEach(item => {
            item.radio.addEventListener('change', (event) => this._onRadioChange(event, item));
        });
        
        // 为选项容器绑定点击事件以增强可访问性
        this.optionsContainer.addEventListener('click', (event) => this._onContainerClick(event));
    }
    
    /**
     * 单选按钮变化事件处理
     * @private
     * @param {Event} event - 变化事件
     * @param {Object} item - 单选按钮项
     */
    _onRadioChange(event, item) {
        if (event.target.checked) {
            // 更新选中值
            const oldValue = this._selectedValue;
            this._selectedValue = item.value;
            
            // 更新所有单选按钮的ARIA状态
            this._radioButtons.forEach(radioItem => {
                radioItem.radio.setAttribute('aria-checked', (radioItem.value === this._selectedValue).toString());
            });
            
            // 触发验证
            if (this.config.required) {
                this.validate();
            }
            
            // 触发变化回调
            if (this.config.onChange && oldValue !== this._selectedValue) {
                this.config.onChange(this._selectedValue, oldValue);
            }
        }
    }
    
    /**
     * 容器点击事件处理（增强可访问性）
     * @private
     * @param {Event} event - 点击事件
     */
    _onContainerClick(event) {
        // 如果点击的是标签，已经会自动选中对应单选按钮
        // 这里处理点击选项容器其他区域的情况
        const optionContainer = event.target.closest('.radio-option-container');
        if (optionContainer && !optionContainer.querySelector('input[type="radio"]:disabled')) {
            const radio = optionContainer.querySelector('input[type="radio"]');
            if (radio) {
                radio.checked = true;
                const changeEvent = new Event('change', { bubbles: true });
                radio.dispatchEvent(changeEvent);
                radio.focus();
            }
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
     * 验证组件
     * @private
     * @returns {boolean} 是否验证通过
     */
    _validate() {
        // 必填验证
        if (this.config.required && !this._selectedValue) {
            this._isValid = false;
            this._validationError = '请选择一个选项';
        } else {
            this._isValid = true;
            this._validationError = '';
        }
        
        // 更新UI状态
        this.containerElement.classList.remove('valid', 'invalid');
        
        if (!this._isValid) {
            this.containerElement.classList.add('invalid');
            if (this.errorElement) {
                this.errorElement.textContent = this._validationError;
            }
        } else {
            this.containerElement.classList.add('valid');
            if (this.errorElement) {
                this.errorElement.textContent = '';
            }
        }
        
        // 触发验证回调
        if (this.config.onValidation) {
            this.config.onValidation(this._isValid, this._validationError);
        }
        
        return this._isValid;
    }
    
    // ===== 公共方法 =====
    
    /**
     * 设置选中的值
     * @param {string} value - 要选中的值
     * @returns {RadioGroup} 当前实例，支持链式调用
     */
    setValue(value) {
        if (this.config.disabled) return this;
        
        const oldValue = this._selectedValue;
        this._selectedValue = value;
        
        // 更新单选按钮状态
        this._radioButtons.forEach(item => {
            if (!item.disabled && !this.config.disabled) {
                item.radio.checked = (item.value === value);
                item.radio.setAttribute('aria-checked', (item.value === value).toString());
            }
        });
        
        // 触发验证
        if (this.config.required) {
            this.validate();
        }
        
        // 触发变化回调
        if (this.config.onChange && oldValue !== value) {
            this.config.onChange(value, oldValue);
        }
        
        return this;
    }
    
    /**
     * 获取选中的值
     * @returns {string} 当前选中的值
     */
    getValue() {
        return this._selectedValue;
    }
    
    /**
     * 设置选项列表
     * @param {Array} options - 选项列表
     * @returns {RadioGroup} 当前实例，支持链式调用
     */
    setOptions(options) {
        this.config.options = options;
        
        // 重新创建单选按钮
        this._createRadioButtons();
        
        // 重新绑定事件
        this._bindEvents();
        
        // 触发验证
        if (this.config.required) {
            this.validate();
        }
        
        return this;
    }
    
    /**
     * 添加选项
     * @param {Object} option - 要添加的选项
     * @returns {RadioGroup} 当前实例，支持链式调用
     */
    addOption(option) {
        this.config.options.push(option);
        
        // 重新创建单选按钮
        this._createRadioButtons();
        
        // 重新绑定事件
        this._bindEvents();
        
        return this;
    }
    
    /**
     * 移除选项
     * @param {string} value - 要移除的选项的值
     * @returns {RadioGroup} 当前实例，支持链式调用
     */
    removeOption(value) {
        const index = this.config.options.findIndex(option => option.value === value);
        
        if (index !== -1) {
            this.config.options.splice(index, 1);
            
            // 如果移除的是当前选中的选项，重置选中状态
            if (value === this._selectedValue) {
                this._selectedValue = '';
            }
            
            // 重新创建单选按钮
            this._createRadioButtons();
            
            // 重新绑定事件
            this._bindEvents();
            
            // 触发验证
            if (this.config.required) {
                this.validate();
            }
        }
        
        return this;
    }
    
    /**
     * 设置组标签
     * @param {string} label - 组标签文本
     * @returns {RadioGroup} 当前实例，支持链式调用
     */
    setGroupLabel(label) {
        this.config.groupLabel = label;
        
        if (this.groupLabelElement) {
            // 移除现有标签
            this.groupLabelElement.parentNode.removeChild(this.groupLabelElement);
        }
        
        // 创建新标签
        if (label && this.config.showGroupLabel) {
            this.groupLabelElement = this._createElement('label', {
                id: `radio-group-${this._generateId()}-label`,
                className: 'radio-group-label',
                htmlFor: this.config.name ? `radio-group-${this.config.name}` : null
            });
            this.groupLabelElement.textContent = label;
            
            if (this.config.required) {
                const requiredIndicator = this._createElement('span', {
                    className: 'required-indicator'
                });
                requiredIndicator.textContent = '*';
                requiredIndicator.style.marginLeft = '4px';
                this.groupLabelElement.appendChild(requiredIndicator);
            }
            
            // 插入到选项容器之前
            this.containerElement.insertBefore(this.groupLabelElement, this.optionsContainer);
            
            // 更新ARIA标签
            this.containerElement.setAttribute('aria-labelledby', this.groupLabelElement.id);
        } else {
            this.containerElement.removeAttribute('aria-labelledby');
        }
        
        return this;
    }
    
    /**
     * 设置是否显示组标签
     * @param {boolean} show - 是否显示组标签
     * @returns {RadioGroup} 当前实例，支持链式调用
     */
    setShowGroupLabel(show) {
        this.config.showGroupLabel = !!show;
        
        if (show && this.config.groupLabel && !this.groupLabelElement) {
            // 创建并显示标签
            this.setGroupLabel(this.config.groupLabel);
        } else if (!show && this.groupLabelElement) {
            // 移除标签
            this.groupLabelElement.parentNode.removeChild(this.groupLabelElement);
            this.groupLabelElement = null;
            this.containerElement.removeAttribute('aria-labelledby');
        }
        
        return this;
    }
    
    /**
     * 设置主题
     * @param {string} theme - 主题名称
     * @returns {RadioGroup} 当前实例，支持链式调用
     */
    setTheme(theme) {
        // 移除旧主题类名
        this.containerElement.classList.remove('theme-default', 'theme-dark', 'theme-neon');
        
        // 添加新主题类名
        this.config.theme = theme;
        this.containerElement.classList.add(`theme-${theme}`);
        
        return this;
    }
    
    /**
     * 设置尺寸
     * @param {string} size - 尺寸名称
     * @returns {RadioGroup} 当前实例，支持链式调用
     */
    setSize(size) {
        // 移除旧尺寸类名
        this.containerElement.classList.remove('size-small', 'size-medium', 'size-large');
        
        // 添加新尺寸类名
        this.config.size = size;
        this.containerElement.classList.add(`size-${size}`);
        
        return this;
    }
    
    /**
     * 设置方向
     * @param {string} orientation - 方向 ('vertical' 或 'horizontal')
     * @returns {RadioGroup} 当前实例，支持链式调用
     */
    setOrientation(orientation) {
        // 移除旧方向类名
        this.containerElement.classList.remove('orientation-vertical', 'orientation-horizontal');
        
        // 添加新方向类名
        this.config.orientation = orientation;
        this.containerElement.classList.add(`orientation-${orientation}`);
        
        return this;
    }
    
    /**
     * 设置标签位置
     * @param {string} position - 标签位置 ('left' 或 'right')
     * @returns {RadioGroup} 当前实例，支持链式调用
     */
    setLabelPosition(position) {
        // 移除旧位置类名
        this.containerElement.classList.remove('labelPosition-left', 'labelPosition-right');
        
        // 添加新位置类名
        this.config.labelPosition = position;
        this.containerElement.classList.add(`labelPosition-${position}`);
        
        // 重新排列元素
        this._radioButtons.forEach(item => {
            const container = item.container;
            container.innerHTML = '';
            
            if (position === 'left') {
                container.appendChild(item.label);
                container.appendChild(item.radio);
            } else {
                container.appendChild(item.radio);
                container.appendChild(item.label);
            }
        });
        
        return this;
    }
    
    /**
     * 设置间距
     * @param {string} spacing - 间距大小 ('small', 'medium', 'large')
     * @returns {RadioGroup} 当前实例，支持链式调用
     */
    setSpacing(spacing) {
        // 移除旧间距类名
        this.containerElement.classList.remove('spacing-small', 'spacing-medium', 'spacing-large');
        
        // 添加新间距类名
        this.config.spacing = spacing;
        this.containerElement.classList.add(`spacing-${spacing}`);
        
        return this;
    }
    
    /**
     * 设置是否禁用
     * @param {boolean} disabled - 是否禁用
     * @returns {RadioGroup} 当前实例，支持链式调用
     */
    setDisabled(disabled) {
        this.config.disabled = !!disabled;
        
        // 更新所有单选按钮的禁用状态
        this._radioButtons.forEach(item => {
            if (!item.disabled) { // 只有当选项本身不禁用时才更新
                item.radio.disabled = disabled;
            }
        });
        
        // 更新容器类名
        if (disabled) {
            this.containerElement.classList.add('disabled');
        } else {
            this.containerElement.classList.remove('disabled');
        }
        
        return this;
    }
    
    /**
     * 设置是否必填
     * @param {boolean} required - 是否必填
     * @returns {RadioGroup} 当前实例，支持链式调用
     */
    setRequired(required) {
        this.config.required = !!required;
        
        // 更新ARIA属性
        this.containerElement.setAttribute('aria-required', required);
        
        // 更新必填指示器
        if (this.groupLabelElement) {
            let requiredIndicator = this.groupLabelElement.querySelector('.required-indicator');
            
            if (required && !requiredIndicator) {
                requiredIndicator = this._createElement('span', {
                    className: 'required-indicator'
                });
                requiredIndicator.textContent = '*';
                requiredIndicator.style.marginLeft = '4px';
                this.groupLabelElement.appendChild(requiredIndicator);
            } else if (!required && requiredIndicator) {
                requiredIndicator.parentNode.removeChild(requiredIndicator);
            }
        }
        
        // 触发验证
        this.validate();
        
        return this;
    }
    
    /**
     * 验证组件
     * @returns {boolean} 是否验证通过
     */
    validate() {
        return this._validate();
    }
    
    /**
     * 设置错误信息
     * @param {string} error - 错误信息
     * @returns {RadioGroup} 当前实例，支持链式调用
     */
    setError(error) {
        this._isValid = !error;
        this._validationError = error || '';
        
        // 更新UI状态
        this.containerElement.classList.remove('valid', 'invalid');
        
        if (error) {
            this.containerElement.classList.add('invalid');
            if (this.errorElement) {
                this.errorElement.textContent = error;
            }
        } else {
            this.containerElement.classList.add('valid');
            if (this.errorElement) {
                this.errorElement.textContent = '';
            }
        }
        
        return this;
    }
    
    /**
     * 获取所有单选按钮元素
     * @returns {Array} 单选按钮项数组
     */
    getRadioButtons() {
        return this._radioButtons;
    }
    
    /**
     * 获取主容器元素
     * @returns {HTMLElement} 主容器元素
     */
    getElement() {
        return this.containerElement;
    }
    
    /**
     * 检查是否有效
     * @returns {boolean} 是否有效
     */
    isValid() {
        return this._isValid;
    }
    
    /**
     * 检查是否禁用
     * @returns {boolean} 是否禁用
     */
    isDisabled() {
        return this.config.disabled;
    }
    
    /**
     * 刷新组件状态
     * @returns {RadioGroup} 当前实例，支持链式调用
     */
    refresh() {
        this.validate();
        return this;
    }
    
    /**
     * 销毁组件
     */
    destroy() {
        // 移除事件监听器
        this._radioButtons.forEach(item => {
            if (item.radio) {
                item.radio.removeEventListener('change', this._onRadioChange.bind(this));
            }
        });
        
        if (this.optionsContainer) {
            this.optionsContainer.removeEventListener('click', this._onContainerClick.bind(this));
        }
        
        // 移除DOM元素
        if (this.containerElement && this.containerElement.parentNode) {
            this.containerElement.parentNode.removeChild(this.containerElement);
        }
        
        // 清除引用
        this.containerElement = null;
        this.groupLabelElement = null;
        this.optionsContainer = null;
        this.errorElement = null;
        this._radioButtons = [];
    }
}

// 导出组件
if (typeof module !== 'undefined' && module.exports) {
    module.exports = RadioGroup;
} else if (typeof window !== 'undefined') {
    window.RadioGroup = RadioGroup;
}