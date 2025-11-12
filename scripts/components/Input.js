/**
 * Input组件 - 增强型输入框组件
 * 支持多种输入类型、验证、格式化、图标和交互效果
 */
class Input extends BaseComponent {
    /**
     * 创建新的Input实例
     * @param {HTMLElement|string} container - 容器元素或选择器
     * @param {Object} options - 配置选项
     */
    constructor(container, options = {}) {
        super(container, options);
        
        // 默认配置
        this.defaults = {
            // 基础配置
            type: 'text', // text, password, number, email, tel, url, search, date, time, datetime-local, color
            value: '',
            placeholder: '',
            disabled: false,
            readonly: false,
            required: false,
            name: '',
            id: '',
            min: null,
            max: null,
            step: null,
            minlength: null,
            maxlength: null,
            
            // 视觉配置
            theme: 'default', // 'default', 'dark', 'neon'
            size: 'medium', // 'small', 'medium', 'large'
            variant: 'default', // 'default', 'outlined', 'filled', 'underline'
            
            // 图标配置
            icon: null, // 图标配置对象
            iconPosition: 'left', // 'left', 'right'
            
            // 验证配置
            validation: {
                required: false,
                pattern: null,
                min: null,
                max: null,
                minlength: null,
                maxlength: null,
                custom: null // 自定义验证函数
            },
            validateOnInput: true,
            validateOnBlur: true,
            showValidation: true,
            
            // 格式化配置
            formatter: null, // 输入格式化函数
            parser: null, // 解析函数（从格式化值到实际值）
            
            // 交互配置
            clearable: false,
            autoComplete: 'off',
            spellcheck: false,
            
            // 标签配置
            label: '',
            labelPosition: 'top', // 'top', 'left', 'inside'
            
            // 提示配置
            helpText: '',
            errorText: '',
            
            // 样式配置
            width: 'auto',
            height: 'auto',
            backgroundColor: null,
            textColor: null,
            borderColor: null,
            
            // 动画配置
            animation: true,
            animationDuration: 200,
            
            // 事件回调
            onChange: null,
            onInput: null,
            onFocus: null,
            onBlur: null,
            onKeydown: null,
            onKeyup: null,
            onEnter: null,
            onClear: null,
            onValidation: null
        };
        
        // 合并配置
        this.config = Object.assign({}, this.defaults, options);
        
        // 初始化状态
        this.isFocused = false;
        this.isValid = true;
        this.validationError = '';
        
        // 创建DOM元素
        this._createElements();
        
        // 应用样式
        this._applyStyles();
        
        // 绑定事件
        this._bindEvents();
        
        // 设置初始值
        this._setValue(this.config.value, false);
        
        // 验证初始值
        if (this.config.validation.required) {
            this.validate();
        }
    }
    
    /**
     * 创建输入框的DOM元素
     * @private
     */
    _createElements() {
        // 创建包装容器
        this.wrapper = this._createElement('div', {
            className: `input-wrapper theme-${this.config.theme} size-${this.config.size} variant-${this.config.variant}`,
            role: 'group',
            'aria-labelledby': this.config.id ? `${this.config.id}-label` : null
        });
        
        // 创建标签
        if (this.config.label && this.config.labelPosition !== 'inside') {
            this.label = this._createElement('label', {
                id: this.config.id ? `${this.config.id}-label` : null,
                className: 'input-label',
                htmlFor: this.config.id || `${this._generateId()}`
            });
            this.label.textContent = this.config.label;
            this.wrapper.appendChild(this.label);
        }
        
        // 创建输入容器
        this.inputContainer = this._createElement('div', {
            className: 'input-container'
        });
        
        // 创建左侧图标
        if (this.config.icon && this.config.iconPosition === 'left') {
            this.leftIcon = this._createIcon(this.config.icon);
            if (this.leftIcon) {
                this.leftIcon.className = 'input-icon input-icon-left';
                this.inputContainer.appendChild(this.leftIcon);
            }
        }
        
        // 创建输入框
        this.input = this._createElement('input', {
            type: this.config.type,
            id: this.config.id || `${this._generateId()}`,
            name: this.config.name,
            placeholder: this.config.labelPosition === 'inside' && this.config.label ? this.config.label : this.config.placeholder,
            disabled: this.config.disabled,
            readOnly: this.config.readonly,
            required: this.config.required,
            min: this.config.min,
            max: this.config.max,
            step: this.config.step,
            minLength: this.config.minlength,
            maxLength: this.config.maxlength,
            autoComplete: this.config.autoComplete,
            spellCheck: this.config.spellcheck,
            className: 'input-field'
        });
        
        // 为输入框添加aria属性
        if (this.config.helpText) {
            this.input.setAttribute('aria-describedby', `${this.input.id}-help`);
        }
        
        this.inputContainer.appendChild(this.input);
        
        // 创建右侧图标
        if (this.config.icon && this.config.iconPosition === 'right') {
            this.rightIcon = this._createIcon(this.config.icon);
            if (this.rightIcon) {
                this.rightIcon.className = 'input-icon input-icon-right';
                this.inputContainer.appendChild(this.rightIcon);
            }
        }
        
        // 创建清除按钮
        if (this.config.clearable) {
            this.clearButton = this._createElement('button', {
                type: 'button',
                className: 'input-clear-button',
                ariaLabel: '清除输入',
                title: '清除输入'
            });
            
            // 创建清除图标
            this.clearIcon = this._createElement('span', {
                className: 'input-clear-icon'
            });
            this.clearIcon.textContent = '×';
            this.clearButton.appendChild(this.clearIcon);
            
            this.inputContainer.appendChild(this.clearButton);
            
            // 初始隐藏清除按钮
            this.clearButton.style.display = 'none';
        }
        
        this.wrapper.appendChild(this.inputContainer);
        
        // 创建帮助文本
        if (this.config.helpText) {
            this.helpElement = this._createElement('div', {
                id: `${this.input.id}-help`,
                className: 'input-help-text'
            });
            this.helpElement.textContent = this.config.helpText;
            this.wrapper.appendChild(this.helpElement);
        }
        
        // 创建错误信息元素
        if (this.config.showValidation) {
            this.errorElement = this._createElement('div', {
                id: `${this.input.id}-error`,
                className: 'input-error-text',
                role: 'alert',
                'aria-live': 'assertive'
            });
            this.wrapper.appendChild(this.errorElement);
        }
        
        // 添加到容器
        this.container.appendChild(this.wrapper);
    }
    
    /**
     * 创建图标元素
     * @private
     * @param {string|Object} iconConfig - 图标配置
     * @returns {HTMLElement|null} 图标元素
     */
    _createIcon(iconConfig) {
        if (!iconConfig) return null;
        
        let iconElement;
        
        if (typeof iconConfig === 'string') {
            // 如果是字符串，创建span元素
            iconElement = this._createElement('span');
            iconElement.innerHTML = iconConfig; // 支持HTML字符串作为图标
        } else if (iconConfig.element) {
            // 如果是DOM元素
            iconElement = iconConfig.element;
        } else {
            // 创建默认图标容器
            iconElement = this._createElement('span');
            if (iconConfig.text) {
                iconElement.textContent = iconConfig.text;
            }
        }
        
        return iconElement;
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
        if (document.getElementById('input-global-styles')) return;
        
        const styles = `
            .input-wrapper {
                position: relative;
                display: inline-block;
                width: 100%;
                max-width: 100%;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            }
            
            .input-label {
                display: block;
                margin-bottom: 4px;
                font-size: 14px;
                font-weight: 500;
                color: #333;
                cursor: pointer;
                transition: color 0.2s ease;
            }
            
            .input-container {
                position: relative;
                display: flex;
                align-items: center;
                transition: all 0.2s ease;
            }
            
            .input-field {
                width: 100%;
                padding: 10px 12px;
                font-size: 14px;
                line-height: 1.5;
                color: #333;
                background-color: #fff;
                border: 1px solid #ddd;
                border-radius: 4px;
                transition: all 0.2s ease;
                outline: none;
                box-sizing: border-box;
            }
            
            /* 尺寸样式 */
            .input-wrapper.size-small .input-field {
                padding: 6px 8px;
                font-size: 12px;
            }
            
            .input-wrapper.size-medium .input-field {
                padding: 8px 12px;
                font-size: 14px;
            }
            
            .input-wrapper.size-large .input-field {
                padding: 12px 16px;
                font-size: 16px;
            }
            
            /* 变体样式 */
            .input-wrapper.variant-outlined .input-field {
                background-color: transparent;
                border-width: 1px;
            }
            
            .input-wrapper.variant-filled .input-field {
                background-color: #f5f5f5;
                border-width: 1px;
            }
            
            .input-wrapper.variant-underline .input-field {
                background-color: transparent;
                border: none;
                border-bottom: 1px solid #ddd;
                border-radius: 0;
                padding-left: 0;
                padding-right: 0;
            }
            
            /* 状态样式 */
            .input-field:focus {
                border-color: #007bff;
                box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.1);
            }
            
            .input-wrapper.focused .input-field {
                border-color: #007bff;
                box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.1);
            }
            
            .input-field:disabled {
                background-color: #f8f9fa;
                color: #6c757d;
                cursor: not-allowed;
                opacity: 0.65;
            }
            
            .input-field:read-only {
                background-color: #f8f9fa;
                cursor: default;
            }
            
            /* 验证状态样式 */
            .input-wrapper.invalid .input-field {
                border-color: #dc3545;
                box-shadow: 0 0 0 2px rgba(220, 53, 69, 0.1);
            }
            
            .input-wrapper.valid .input-field {
                border-color: #28a745;
                box-shadow: 0 0 0 2px rgba(40, 167, 69, 0.1);
            }
            
            /* 图标样式 */
            .input-icon {
                position: absolute;
                display: flex;
                align-items: center;
                justify-content: center;
                width: 20px;
                height: 20px;
                pointer-events: none;
                color: #666;
            }
            
            .input-icon-left {
                left: 12px;
            }
            
            .input-icon-right {
                right: 12px;
            }
            
            /* 调整带图标的输入框内边距 */
            .input-container:has(.input-icon-left) .input-field {
                padding-left: 36px;
            }
            
            .input-container:has(.input-icon-right) .input-field {
                padding-right: 36px;
            }
            
            /* 清除按钮样式 */
            .input-clear-button {
                position: absolute;
                right: 8px;
                width: 24px;
                height: 24px;
                padding: 0;
                background: none;
                border: none;
                border-radius: 50%;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                color: #666;
                font-size: 18px;
                line-height: 1;
                transition: all 0.2s ease;
                opacity: 0.7;
            }
            
            .input-clear-button:hover {
                background-color: #f0f0f0;
                color: #333;
                opacity: 1;
            }
            
            .input-clear-button:focus {
                outline: 2px solid #007bff;
                outline-offset: 2px;
            }
            
            /* 调整带清除按钮的输入框内边距 */
            .input-container:has(.input-clear-button) .input-field {
                padding-right: 40px;
            }
            
            /* 帮助文本样式 */
            .input-help-text {
                margin-top: 4px;
                font-size: 12px;
                color: #6c757d;
            }
            
            /* 错误信息样式 */
            .input-error-text {
                margin-top: 4px;
                font-size: 12px;
                color: #dc3545;
                min-height: 16px;
            }
            
            /* 主题样式 */
            .input-wrapper.theme-dark {
                color-scheme: dark;
            }
            
            .input-wrapper.theme-dark .input-label {
                color: #ddd;
            }
            
            .input-wrapper.theme-dark .input-field {
                color: #fff;
                background-color: #333;
                border-color: #555;
            }
            
            .input-wrapper.theme-dark .input-field:focus {
                border-color: #00bcd4;
                box-shadow: 0 0 0 2px rgba(0, 188, 212, 0.2);
            }
            
            .input-wrapper.theme-dark .input-field:disabled {
                background-color: #222;
                color: #777;
            }
            
            .input-wrapper.theme-dark .input-field:read-only {
                background-color: #222;
            }
            
            .input-wrapper.theme-dark .input-icon {
                color: #999;
            }
            
            .input-wrapper.theme-dark .input-help-text {
                color: #999;
            }
            
            .input-wrapper.theme-neon .input-field:focus {
                border-color: #00ffcc;
                box-shadow: 0 0 0 2px rgba(0, 255, 204, 0.3);
            }
            
            .input-wrapper.theme-neon.invalid .input-field {
                border-color: #ff6b6b;
                box-shadow: 0 0 0 2px rgba(255, 107, 107, 0.3);
            }
            
            /* 动画 */
            .input-field {
                transition: all 0.2s ease;
            }
            
            /* 响应式设计 */
            @media (max-width: 768px) {
                .input-wrapper {
                    width: 100%;
                }
                
                .input-label {
                    font-size: 12px;
                }
                
                .input-help-text,
                .input-error-text {
                    font-size: 11px;
                }
            }
            
            /* 无障碍支持 */
            .input-field:focus-visible {
                outline: 2px solid #007bff;
                outline-offset: 2px;
            }
            
            /* 高对比度模式 */
            @media (prefers-contrast: high) {
                .input-field {
                    border-width: 2px;
                }
            }
            
            /* 减少动画 */
            @media (prefers-reduced-motion: reduce) {
                .input-field,
                .input-wrapper,
                .input-container {
                    transition: none;
                }
            }
        `;
        
        const styleSheet = document.createElement('style');
        styleSheet.id = 'input-global-styles';
        styleSheet.textContent = styles;
        document.head.appendChild(styleSheet);
    }
    
    /**
     * 应用配置样式
     * @private
     */
    _applyConfigStyles() {
        // 设置宽度和高度
        if (this.config.width !== 'auto') {
            this.wrapper.style.width = this.config.width;
        }
        
        if (this.config.height !== 'auto') {
            this.inputContainer.style.height = this.config.height;
            this.input.style.height = this.config.height;
        }
        
        // 设置自定义颜色
        if (this.config.backgroundColor) {
            this.input.style.backgroundColor = this.config.backgroundColor;
        }
        
        if (this.config.textColor) {
            this.input.style.color = this.config.textColor;
        }
        
        if (this.config.borderColor) {
            this.input.style.borderColor = this.config.borderColor;
        }
        
        // 处理标签位置为inside的情况
        if (this.config.label && this.config.labelPosition === 'inside') {
            this.input.setAttribute('placeholder', this.config.label);
        }
    }
    
    /**
     * 绑定事件
     * @private
     */
    _bindEvents() {
        // 输入事件
        this.input.addEventListener('input', (e) => this._onInput(e));
        
        // 变化事件
        this.input.addEventListener('change', (e) => this._onChange(e));
        
        // 焦点事件
        this.input.addEventListener('focus', (e) => this._onFocus(e));
        
        // 失焦事件
        this.input.addEventListener('blur', (e) => this._onBlur(e));
        
        // 键盘事件
        this.input.addEventListener('keydown', (e) => this._onKeydown(e));
        
        this.input.addEventListener('keyup', (e) => this._onKeyup(e));
        
        // 清除按钮事件
        if (this.clearButton) {
            this.clearButton.addEventListener('click', () => this._onClearClick());
        }
        
        // 图标点击事件
        if (this.rightIcon && !this.config.disabled) {
            this.rightIcon.addEventListener('click', (e) => this._onIconClick(e));
        }
    }
    
    /**
     * 生成唯一ID
     * @private
     * @returns {string} 唯一ID
     */
    _generateId() {
        return `input-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
    
    /**
     * 设置输入框的值
     * @private
     * @param {string} value - 要设置的值
     * @param {boolean} triggerEvents - 是否触发事件
     */
    _setValue(value, triggerEvents = true) {
        const formattedValue = this.config.formatter ? this.config.formatter(value) : value;
        this.input.value = formattedValue;
        
        // 更新清除按钮的可见性
        if (this.clearButton) {
            this.clearButton.style.display = value && value !== '' ? 'flex' : 'none';
        }
        
        // 触发事件
        if (triggerEvents) {
            const event = new Event('change', { bubbles: true });
            this.input.dispatchEvent(event);
        }
    }
    
    /**
     * 获取输入框的值
     * @private
     * @returns {string} 输入框的值
     */
    _getValue() {
        const value = this.input.value;
        return this.config.parser ? this.config.parser(value) : value;
    }
    
    /**
     * 输入事件处理
     * @private
     * @param {Event} event - 输入事件
     */
    _onInput(event) {
        const value = this._getValue();
        
        // 更新清除按钮的可见性
        if (this.clearButton) {
            this.clearButton.style.display = value && value !== '' ? 'flex' : 'none';
        }
        
        // 输入时验证
        if (this.config.validateOnInput) {
            this.validate();
        }
        
        // 触发输入回调
        if (this.config.onInput) {
            this.config.onInput(value, event);
        }
    }
    
    /**
     * 变化事件处理
     * @private
     * @param {Event} event - 变化事件
     */
    _onChange(event) {
        const value = this._getValue();
        
        // 触发变化回调
        if (this.config.onChange) {
            this.config.onChange(value, event);
        }
    }
    
    /**
     * 焦点事件处理
     * @private
     * @param {Event} event - 焦点事件
     */
    _onFocus(event) {
        this.isFocused = true;
        this.wrapper.classList.add('focused');
        
        // 触发焦点回调
        if (this.config.onFocus) {
            this.config.onFocus(event);
        }
    }
    
    /**
     * 失焦事件处理
     * @private
     * @param {Event} event - 失焦事件
     */
    _onBlur(event) {
        this.isFocused = false;
        this.wrapper.classList.remove('focused');
        
        // 失焦时验证
        if (this.config.validateOnBlur) {
            this.validate();
        }
        
        // 触发失焦回调
        if (this.config.onBlur) {
            this.config.onBlur(event);
        }
    }
    
    /**
     * 键盘按下事件处理
     * @private
     * @param {KeyboardEvent} event - 键盘事件
     */
    _onKeydown(event) {
        // 触发键盘按下回调
        if (this.config.onKeydown) {
            this.config.onKeydown(event);
        }
        
        // Enter键特殊处理
        if (event.key === 'Enter') {
            if (this.config.onEnter) {
                this.config.onEnter(event);
            }
        }
    }
    
    /**
     * 键盘释放事件处理
     * @private
     * @param {KeyboardEvent} event - 键盘事件
     */
    _onKeyup(event) {
        // 触发键盘释放回调
        if (this.config.onKeyup) {
            this.config.onKeyup(event);
        }
    }
    
    /**
     * 清除按钮点击事件处理
     * @private
     */
    _onClearClick() {
        this.setValue('');
        
        // 聚焦输入框
        this.input.focus();
        
        // 触发清除回调
        if (this.config.onClear) {
            this.config.onClear();
        }
    }
    
    /**
     * 图标点击事件处理
     * @private
     * @param {Event} event - 点击事件
     */
    _onIconClick(event) {
        event.stopPropagation();
        
        // 可以在这里添加图标的自定义点击处理逻辑
        // 如果需要的话，可以通过配置添加onIconClick回调
    }
    
    /**
     * 验证输入值
     * @private
     * @returns {boolean} 验证是否通过
     */
    _validateValue(value) {
        const validation = this.config.validation;
        
        // 必需字段验证
        if (validation.required && (!value || value.trim() === '')) {
            this.validationError = '此字段为必填项';
            return false;
        }
        
        // 模式验证
        if (validation.pattern && value) {
            const regex = new RegExp(validation.pattern);
            if (!regex.test(value)) {
                this.validationError = '输入格式不正确';
                return false;
            }
        }
        
        // 最小值验证（数字）
        if (validation.min !== null && value && !isNaN(value)) {
            if (Number(value) < validation.min) {
                this.validationError = `最小值为 ${validation.min}`;
                return false;
            }
        }
        
        // 最大值验证（数字）
        if (validation.max !== null && value && !isNaN(value)) {
            if (Number(value) > validation.max) {
                this.validationError = `最大值为 ${validation.max}`;
                return false;
            }
        }
        
        // 最小长度验证
        if (validation.minlength !== null && value) {
            if (value.length < validation.minlength) {
                this.validationError = `最小长度为 ${validation.minlength} 个字符`;
                return false;
            }
        }
        
        // 最大长度验证
        if (validation.maxlength !== null && value) {
            if (value.length > validation.maxlength) {
                this.validationError = `最大长度为 ${validation.maxlength} 个字符`;
                return false;
            }
        }
        
        // 自定义验证
        if (validation.custom && typeof validation.custom === 'function') {
            const customResult = validation.custom(value);
            if (customResult !== true) {
                this.validationError = customResult || '输入验证失败';
                return false;
            }
        }
        
        // 验证通过
        this.validationError = '';
        return true;
    }
    
    // ===== 公共方法 =====
    
    /**
     * 设置输入框的值
     * @param {string} value - 要设置的值
     * @returns {Input} 当前实例，支持链式调用
     */
    setValue(value) {
        if (this.config.disabled || this.config.readonly) return this;
        
        this._setValue(value);
        return this;
    }
    
    /**
     * 获取输入框的值
     * @returns {string} 输入框的值
     */
    getValue() {
        return this._getValue();
    }
    
    /**
     * 设置占位符文本
     * @param {string} placeholder - 占位符文本
     * @returns {Input} 当前实例，支持链式调用
     */
    setPlaceholder(placeholder) {
        this.config.placeholder = placeholder;
        this.input.placeholder = placeholder;
        return this;
    }
    
    /**
     * 设置标签文本
     * @param {string} label - 标签文本
     * @returns {Input} 当前实例，支持链式调用
     */
    setLabel(label) {
        this.config.label = label;
        
        if (this.label) {
            this.label.textContent = label;
        } else if (label && this.config.labelPosition !== 'inside') {
            this.label = this._createElement('label', {
                id: this.config.id ? `${this.config.id}-label` : null,
                className: 'input-label',
                htmlFor: this.input.id
            });
            this.label.textContent = label;
            this.wrapper.insertBefore(this.label, this.inputContainer);
        }
        
        if (this.config.labelPosition === 'inside') {
            this.input.placeholder = label;
        }
        
        return this;
    }
    
    /**
     * 设置帮助文本
     * @param {string} text - 帮助文本
     * @returns {Input} 当前实例，支持链式调用
     */
    setHelpText(text) {
        this.config.helpText = text;
        
        if (this.helpElement) {
            this.helpElement.textContent = text;
        } else if (text) {
            this.helpElement = this._createElement('div', {
                id: `${this.input.id}-help`,
                className: 'input-help-text'
            });
            this.helpElement.textContent = text;
            this.input.setAttribute('aria-describedby', `${this.input.id}-help`);
            
            if (this.errorElement) {
                this.wrapper.insertBefore(this.helpElement, this.errorElement);
            } else {
                this.wrapper.appendChild(this.helpElement);
            }
        }
        
        return this;
    }
    
    /**
     * 设置错误信息
     * @param {string} text - 错误信息
     * @returns {Input} 当前实例，支持链式调用
     */
    setErrorText(text) {
        this.config.errorText = text;
        
        if (this.errorElement) {
            this.errorElement.textContent = text;
            
            // 如果有错误信息，设置为无效状态
            if (text) {
                this.isValid = false;
                this.wrapper.classList.remove('valid');
                this.wrapper.classList.add('invalid');
            }
        }
        
        return this;
    }
    
    /**
     * 验证输入值
     * @returns {boolean} 验证是否通过
     */
    validate() {
        const value = this._getValue();
        this.isValid = this._validateValue(value);
        
        // 更新UI状态
        this.wrapper.classList.remove('valid', 'invalid');
        
        if (this.isValid) {
            this.wrapper.classList.add('valid');
            if (this.errorElement) {
                this.errorElement.textContent = '';
            }
        } else {
            this.wrapper.classList.add('invalid');
            if (this.errorElement) {
                this.errorElement.textContent = this.config.errorText || this.validationError;
            }
        }
        
        // 触发验证回调
        if (this.config.onValidation) {
            this.config.onValidation(this.isValid, this.validationError);
        }
        
        return this.isValid;
    }
    
    /**
     * 设置启用/禁用状态
     * @param {boolean} disabled - 是否禁用
     * @returns {Input} 当前实例，支持链式调用
     */
    setDisabled(disabled) {
        this.config.disabled = !!disabled;
        this.input.disabled = disabled;
        
        if (disabled) {
            this.wrapper.classList.add('disabled');
        } else {
            this.wrapper.classList.remove('disabled');
        }
        
        return this;
    }
    
    /**
     * 设置只读状态
     * @param {boolean} readonly - 是否只读
     * @returns {Input} 当前实例，支持链式调用
     */
    setReadonly(readonly) {
        this.config.readonly = !!readonly;
        this.input.readOnly = readonly;
        
        return this;
    }
    
    /**
     * 设置主题
     * @param {string} theme - 主题名称
     * @returns {Input} 当前实例，支持链式调用
     */
    setTheme(theme) {
        // 移除旧主题类名
        this.wrapper.classList.remove('theme-default', 'theme-dark', 'theme-neon');
        
        // 添加新主题类名
        this.config.theme = theme;
        this.wrapper.classList.add(`theme-${theme}`);
        
        return this;
    }
    
    /**
     * 设置尺寸
     * @param {string} size - 尺寸名称
     * @returns {Input} 当前实例，支持链式调用
     */
    setSize(size) {
        // 移除旧尺寸类名
        this.wrapper.classList.remove('size-small', 'size-medium', 'size-large');
        
        // 添加新尺寸类名
        this.config.size = size;
        this.wrapper.classList.add(`size-${size}`);
        
        return this;
    }
    
    /**
     * 设置变体
     * @param {string} variant - 变体名称
     * @returns {Input} 当前实例，支持链式调用
     */
    setVariant(variant) {
        // 移除旧变体类名
        this.wrapper.classList.remove('variant-default', 'variant-outlined', 'variant-filled', 'variant-underline');
        
        // 添加新变体类名
        this.config.variant = variant;
        this.wrapper.classList.add(`variant-${variant}`);
        
        return this;
    }
    
    /**
     * 设置图标
     * @param {string|Object} icon - 图标配置
     * @param {string} [position] - 图标位置
     * @returns {Input} 当前实例，支持链式调用
     */
    setIcon(icon, position) {
        this.config.icon = icon;
        if (position) {
            this.config.iconPosition = position;
        }
        
        // 移除旧图标
        if (this.leftIcon && this.leftIcon.parentNode) {
            this.inputContainer.removeChild(this.leftIcon);
            this.leftIcon = null;
        }
        
        if (this.rightIcon && this.rightIcon.parentNode) {
            this.inputContainer.removeChild(this.rightIcon);
            this.rightIcon = null;
        }
        
        // 创建新图标
        const newIcon = this._createIcon(icon);
        if (newIcon) {
            newIcon.className = `input-icon input-icon-${this.config.iconPosition}`;
            
            if (this.config.iconPosition === 'left') {
                this.inputContainer.insertBefore(newIcon, this.input);
                this.leftIcon = newIcon;
            } else {
                // 插入到清除按钮之前
                if (this.clearButton) {
                    this.inputContainer.insertBefore(newIcon, this.clearButton);
                } else {
                    this.inputContainer.appendChild(newIcon);
                }
                this.rightIcon = newIcon;
                
                // 绑定点击事件
                newIcon.addEventListener('click', (e) => this._onIconClick(e));
            }
        }
        
        return this;
    }
    
    /**
     * 设置是否可清除
     * @param {boolean} clearable - 是否可清除
     * @returns {Input} 当前实例，支持链式调用
     */
    setClearable(clearable) {
        this.config.clearable = !!clearable;
        
        if (clearable && !this.clearButton) {
            this.clearButton = this._createElement('button', {
                type: 'button',
                className: 'input-clear-button',
                ariaLabel: '清除输入',
                title: '清除输入'
            });
            
            this.clearIcon = this._createElement('span', {
                className: 'input-clear-icon'
            });
            this.clearIcon.textContent = '×';
            this.clearButton.appendChild(this.clearIcon);
            
            this.clearButton.addEventListener('click', () => this._onClearClick());
            
            // 初始隐藏
            this.clearButton.style.display = this.input.value && this.input.value !== '' ? 'flex' : 'none';
            
            if (this.rightIcon) {
                this.inputContainer.insertBefore(this.clearButton, this.rightIcon.nextSibling);
            } else {
                this.inputContainer.appendChild(this.clearButton);
            }
        } else if (!clearable && this.clearButton) {
            this.inputContainer.removeChild(this.clearButton);
            this.clearButton = null;
            this.clearIcon = null;
        }
        
        return this;
    }
    
    /**
     * 设置验证规则
     * @param {Object} validation - 验证规则对象
     * @returns {Input} 当前实例，支持链式调用
     */
    setValidation(validation) {
        this.config.validation = Object.assign({}, this.config.validation, validation);
        return this;
    }
    
    /**
     * 设置输入格式化函数
     * @param {Function} formatter - 格式化函数
     * @returns {Input} 当前实例，支持链式调用
     */
    setFormatter(formatter) {
        this.config.formatter = formatter;
        
        // 使用新的格式化函数重新格式化当前值
        const currentValue = this._getValue();
        if (formatter) {
            this.input.value = formatter(currentValue);
        }
        
        return this;
    }
    
    /**
     * 设置值解析函数
     * @param {Function} parser - 解析函数
     * @returns {Input} 当前实例，支持链式调用
     */
    setParser(parser) {
        this.config.parser = parser;
        return this;
    }
    
    /**
     * 聚焦输入框
     * @returns {Input} 当前实例，支持链式调用
     */
    focus() {
        if (!this.config.disabled) {
            this.input.focus();
        }
        return this;
    }
    
    /**
     * 失焦输入框
     * @returns {Input} 当前实例，支持链式调用
     */
    blur() {
        this.input.blur();
        return this;
    }
    
    /**
     * 选择输入框内容
     * @returns {Input} 当前实例，支持链式调用
     */
    select() {
        if (!this.config.disabled && !this.config.readonly) {
            this.input.select();
        }
        return this;
    }
    
    /**
     * 清除输入框内容
     * @returns {Input} 当前实例，支持链式调用
     */
    clear() {
        this.setValue('');
        return this;
    }
    
    /**
     * 获取输入框元素
     * @returns {HTMLElement} 输入框元素
     */
    getInput() {
        return this.input;
    }
    
    /**
     * 获取包装元素
     * @returns {HTMLElement} 包装元素
     */
    getElement() {
        return this.wrapper;
    }
    
    /**
     * 检查输入框是否有效
     * @returns {boolean} 是否有效
     */
    isValid() {
        return this.isValid;
    }
    
    /**
     * 检查输入框是否被禁用
     * @returns {boolean} 是否禁用
     */
    isDisabled() {
        return this.config.disabled;
    }
    
    /**
     * 检查输入框是否只读
     * @returns {boolean} 是否只读
     */
    isReadonly() {
        return this.config.readonly;
    }
    
    /**
     * 刷新输入框状态
     * @returns {Input} 当前实例，支持链式调用
     */
    refresh() {
        this.validate();
        
        // 更新清除按钮的可见性
        if (this.clearButton) {
            this.clearButton.style.display = this.input.value && this.input.value !== '' ? 'flex' : 'none';
        }
        
        return this;
    }
    
    /**
     * 销毁输入框组件
     */
    destroy() {
        // 移除事件监听器
        if (this.input) {
            this.input.removeEventListener('input', this._onInput.bind(this));
            this.input.removeEventListener('change', this._onChange.bind(this));
            this.input.removeEventListener('focus', this._onFocus.bind(this));
            this.input.removeEventListener('blur', this._onBlur.bind(this));
            this.input.removeEventListener('keydown', this._onKeydown.bind(this));
            this.input.removeEventListener('keyup', this._onKeyup.bind(this));
        }
        
        if (this.clearButton) {
            this.clearButton.removeEventListener('click', this._onClearClick.bind(this));
        }
        
        if (this.rightIcon) {
            this.rightIcon.removeEventListener('click', this._onIconClick.bind(this));
        }
        
        // 移除DOM元素
        if (this.wrapper && this.wrapper.parentNode) {
            this.wrapper.parentNode.removeChild(this.wrapper);
        }
        
        // 清除引用
        this.wrapper = null;
        this.input = null;
        this.label = null;
        this.inputContainer = null;
        this.leftIcon = null;
        this.rightIcon = null;
        this.clearButton = null;
        this.clearIcon = null;
        this.helpElement = null;
        this.errorElement = null;
    }
}

// 导出组件
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Input;
} else if (typeof window !== 'undefined') {
    window.Input = Input;
}