/**
 * Checkbox组件 - 用于创建单个或多个复选框
 * 支持自定义样式、标签、验证和各种交互功能
 */
class Checkbox extends BaseComponent {
    /**
     * 创建新的Checkbox实例
     * @param {HTMLElement|string} container - 容器元素或选择器
     * @param {Object} options - 配置选项
     */
    constructor(container, options = {}) {
        super(container, options);
        
        // 默认配置
        this.defaults = {
            // 基础配置
            id: '',                 // 复选框ID
            name: '',               // 复选框名称
            value: '',              // 复选框值
            label: '',              // 标签文本
            checked: false,         // 是否默认选中
            
            // 视觉配置
            theme: 'default',       // 'default', 'dark', 'neon'
            size: 'medium',         // 'small', 'medium', 'large'
            labelPosition: 'right', // 'left', 'right', 'top', 'bottom'
            
            // 状态配置
            disabled: false,        // 是否禁用
            required: false,        // 是否必填
            readonly: false,        // 是否只读
            
            // 验证配置
            showValidation: true,   // 是否显示验证状态
            
            // 样式配置
            labelColor: null,       // 标签颜色
            backgroundColor: null,  // 背景颜色
            borderColor: null,      // 边框颜色
            checkColor: null,       // 勾选颜色
            
            // 动画配置
            animation: true,        // 是否启用动画
            
            // 无障碍配置
            ariaLabelledby: '',     // ARIA标签ID
            
            // 事件回调
            onChange: null,         // 值变化时的回调
            onValidation: null      // 验证状态变化时的回调
        };
        
        // 合并配置
        this.config = Object.assign({}, this.defaults, options);
        
        // 初始化状态
        this._checked = this.config.checked;
        this._isValid = true;
        this._validationError = '';
        this._checkedLabel = null;
        
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
     * 创建复选框的DOM元素
     * @private
     */
    _createElements() {
        // 生成唯一ID（如果未提供）
        this._id = this.config.id || `checkbox-${this._generateId()}`;
        
        // 创建主容器
        this.containerElement = this._createElement('div', {
            className: `checkbox-container theme-${this.config.theme} size-${this.config.size} label-position-${this.config.labelPosition}`,
            role: 'group',
            'aria-labelledby': this.config.ariaLabelledby || `${this._id}-label`
        });
        
        // 创建复选框
        this.checkboxElement = this._createElement('input', {
            type: 'checkbox',
            id: this._id,
            name: this.config.name || this._id,
            value: this.config.value,
            checked: this._checked,
            disabled: this.config.disabled,
            readOnly: this.config.readonly
        });
        
        // 设置ARIA属性
        this.checkboxElement.setAttribute('aria-checked', this._checked.toString());
        this.checkboxElement.setAttribute('aria-required', this.config.required.toString());
        
        // 创建标签
        if (this.config.label) {
            this.labelElement = this._createElement('label', {
                id: `${this._id}-label`,
                htmlFor: this._id,
                className: 'checkbox-label'
            });
            this.labelElement.textContent = this.config.label;
            
            // 添加必填指示器
            if (this.config.required) {
                const requiredIndicator = this._createElement('span', {
                    className: 'required-indicator'
                });
                requiredIndicator.textContent = '*';
                requiredIndicator.style.marginLeft = '4px';
                this.labelElement.appendChild(requiredIndicator);
            }
        }
        
        // 添加勾选标记（用于自定义样式）
        this.checkElement = this._createElement('div', {
            className: 'checkbox-check',
            aria-hidden: 'true'
        });
        
        // 根据标签位置添加元素
        this._arrangeElements();
        
        // 创建验证错误信息元素
        if (this.config.showValidation) {
            this.errorElement = this._createElement('div', {
                className: 'checkbox-error',
                role: 'alert',
                'aria-live': 'assertive'
            });
            this.containerElement.appendChild(this.errorElement);
        }
        
        // 添加到目标容器
        this.container.appendChild(this.containerElement);
    }
    
    /**
     * 根据标签位置排列元素
     * @private
     */
    _arrangeElements() {
        // 清空容器
        this.containerElement.innerHTML = '';
        
        // 创建复选框容器（包含输入框和自定义勾选标记）
        this.checkboxWrapper = this._createElement('div', {
            className: 'checkbox-wrapper',
            'data-checked': this._checked
        });
        this.checkboxWrapper.appendChild(this.checkboxElement);
        this.checkboxWrapper.appendChild(this.checkElement);
        
        // 根据标签位置添加元素
        switch (this.config.labelPosition) {
            case 'left':
                if (this.labelElement) {
                    this.containerElement.appendChild(this.labelElement);
                }
                this.containerElement.appendChild(this.checkboxWrapper);
                break;
                
            case 'top':
                if (this.labelElement) {
                    this.containerElement.appendChild(this.labelElement);
                }
                this.containerElement.appendChild(this.checkboxWrapper);
                break;
                
            case 'bottom':
                this.containerElement.appendChild(this.checkboxWrapper);
                if (this.labelElement) {
                    this.containerElement.appendChild(this.labelElement);
                }
                break;
                
            case 'right':
            default:
                this.containerElement.appendChild(this.checkboxWrapper);
                if (this.labelElement) {
                    this.containerElement.appendChild(this.labelElement);
                }
                break;
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
        if (document.getElementById('checkbox-global-styles')) return;
        
        const styles = `
            .checkbox-container {
                display: inline-flex;
                align-items: center;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                margin-bottom: 8px;
            }
            
            /* 标签位置样式 */
            .checkbox-container.label-position-left {
                flex-direction: row-reverse;
            }
            
            .checkbox-container.label-position-left .checkbox-label {
                margin-right: 8px;
                margin-left: 0;
            }
            
            .checkbox-container.label-position-top,
            .checkbox-container.label-position-bottom {
                flex-direction: column;
                align-items: flex-start;
            }
            
            .checkbox-container.label-position-top .checkbox-label {
                margin-bottom: 4px;
                margin-left: 0;
            }
            
            .checkbox-container.label-position-bottom .checkbox-label {
                margin-top: 4px;
                margin-left: 0;
            }
            
            .checkbox-container.label-position-right .checkbox-label {
                margin-left: 8px;
            }
            
            /* 复选框包装器 */
            .checkbox-wrapper {
                position: relative;
                display: inline-block;
                cursor: pointer;
                user-select: none;
                transition: all 0.2s ease;
            }
            
            /* 隐藏原生复选框 */
            .checkbox-wrapper input[type="checkbox"] {
                position: absolute;
                opacity: 0;
                cursor: pointer;
                height: 0;
                width: 0;
            }
            
            /* 自定义复选框 */
            .checkbox-check {
                position: relative;
                display: inline-block;
                border: 2px solid #ccc;
                border-radius: 4px;
                background-color: #fff;
                transition: all 0.2s ease;
            }
            
            /* 尺寸样式 */
            .checkbox-container.size-small .checkbox-check {
                width: 16px;
                height: 16px;
            }
            
            .checkbox-container.size-medium .checkbox-check {
                width: 20px;
                height: 20px;
            }
            
            .checkbox-container.size-large .checkbox-check {
                width: 24px;
                height: 24px;
            }
            
            /* 勾选标记 */
            .checkbox-check::after {
                content: "";
                position: absolute;
                left: 50%;
                top: 50%;
                width: 0;
                height: 0;
                border: solid white;
                border-width: 0 2px 2px 0;
                transform: translate(-50%, -50%) rotate(45deg);
                opacity: 0;
                transition: all 0.2s ease;
            }
            
            .checkbox-container.size-small .checkbox-check::after {
                border-width: 0 1.5px 1.5px 0;
                width: 4px;
                height: 7px;
            }
            
            .checkbox-container.size-medium .checkbox-check::after {
                border-width: 0 2px 2px 0;
                width: 6px;
                height: 10px;
            }
            
            .checkbox-container.size-large .checkbox-check::after {
                border-width: 0 3px 3px 0;
                width: 8px;
                height: 14px;
            }
            
            /* 标签样式 */
            .checkbox-label {
                font-size: 14px;
                color: #333;
                cursor: pointer;
                transition: color 0.2s ease;
                user-select: none;
                line-height: 1.5;
            }
            
            .checkbox-container.size-small .checkbox-label {
                font-size: 12px;
            }
            
            .checkbox-container.size-medium .checkbox-label {
                font-size: 14px;
            }
            
            .checkbox-container.size-large .checkbox-label {
                font-size: 16px;
            }
            
            /* 选中状态 */
            .checkbox-wrapper[data-checked="true"] .checkbox-check {
                background-color: #007bff;
                border-color: #007bff;
            }
            
            .checkbox-wrapper[data-checked="true"] .checkbox-check::after {
                opacity: 1;
                width: 6px;
                height: 10px;
            }
            
            /* 悬停状态 */
            .checkbox-wrapper:not(.disabled):hover .checkbox-check {
                border-color: #007bff;
            }
            
            .checkbox-wrapper:not(.disabled):hover .checkbox-check::after {
                opacity: 0.5;
            }
            
            .checkbox-wrapper:not(.disabled):hover + .checkbox-label {
                color: #007bff;
            }
            
            /* 聚焦状态 */
            .checkbox-wrapper input[type="checkbox"]:focus + .checkbox-check {
                box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.25);
                outline: 2px solid transparent;
            }
            
            /* 禁用状态 */
            .checkbox-wrapper.disabled .checkbox-check {
                opacity: 0.5;
                cursor: not-allowed;
                background-color: #f5f5f5;
            }
            
            .checkbox-wrapper.disabled + .checkbox-label {
                opacity: 0.5;
                cursor: not-allowed;
                color: #666;
            }
            
            /* 深色主题 */
            .checkbox-container.theme-dark .checkbox-label {
                color: #ddd;
            }
            
            .checkbox-container.theme-dark .checkbox-check {
                background-color: #333;
                border-color: #555;
            }
            
            .checkbox-container.theme-dark .checkbox-wrapper[data-checked="true"] .checkbox-check {
                background-color: #00bcd4;
                border-color: #00bcd4;
            }
            
            .checkbox-container.theme-dark .checkbox-wrapper:not(.disabled):hover .checkbox-check {
                border-color: #00bcd4;
            }
            
            .checkbox-container.theme-dark .checkbox-wrapper:not(.disabled):hover + .checkbox-label {
                color: #00bcd4;
            }
            
            .checkbox-container.theme-dark .checkbox-wrapper.disabled .checkbox-check {
                background-color: #222;
            }
            
            /* 霓虹主题 */
            .checkbox-container.theme-neon .checkbox-check {
                border-color: #00ffcc;
                box-shadow: 0 0 5px rgba(0, 255, 204, 0.3);
            }
            
            .checkbox-container.theme-neon .checkbox-wrapper[data-checked="true"] .checkbox-check {
                background-color: #00ffcc;
                border-color: #00ffcc;
                box-shadow: 0 0 10px rgba(0, 255, 204, 0.5);
            }
            
            .checkbox-container.theme-neon .checkbox-check::after {
                border-color: #000;
            }
            
            .checkbox-container.theme-neon .checkbox-wrapper:not(.disabled):hover .checkbox-check {
                border-color: #00ffcc;
                box-shadow: 0 0 8px rgba(0, 255, 204, 0.4);
            }
            
            .checkbox-container.theme-neon .checkbox-wrapper:not(.disabled):hover + .checkbox-label {
                color: #00ffcc;
                text-shadow: 0 0 5px rgba(0, 255, 204, 0.5);
            }
            
            /* 验证状态 */
            .checkbox-container.invalid .checkbox-wrapper {
                outline: 2px solid #dc3545;
                outline-offset: 2px;
                border-radius: 4px;
            }
            
            .checkbox-container.valid .checkbox-wrapper {
                outline: 2px solid #28a745;
                outline-offset: 2px;
                border-radius: 4px;
            }
            
            /* 错误信息样式 */
            .checkbox-error {
                margin-top: 4px;
                font-size: 12px;
                color: #dc3545;
                min-height: 16px;
                width: 100%;
            }
            
            /* 必填指示器 */
            .required-indicator {
                color: #dc3545;
                font-weight: bold;
            }
            
            /* 响应式设计 */
            @media (max-width: 768px) {
                .checkbox-container {
                    margin-bottom: 6px;
                }
                
                .checkbox-label {
                    font-size: 12px;
                }
                
                .checkbox-error {
                    font-size: 11px;
                }
            }
            
            /* 无障碍支持 */
            .checkbox-wrapper:focus-within {
                outline: 2px solid #007bff;
                outline-offset: 2px;
                border-radius: 4px;
            }
            
            /* 高对比度模式 */
            @media (prefers-contrast: high) {
                .checkbox-check {
                    border-width: 3px;
                }
            }
            
            /* 减少动画 */
            @media (prefers-reduced-motion: reduce) {
                .checkbox-wrapper,
                .checkbox-check,
                .checkbox-check::after,
                .checkbox-label {
                    transition: none !important;
                }
            }
        `;
        
        const styleSheet = document.createElement('style');
        styleSheet.id = 'checkbox-global-styles';
        styleSheet.textContent = styles;
        document.head.appendChild(styleSheet);
    }
    
    /**
     * 应用配置样式
     * @private
     */
    _applyConfigStyles() {
        // 设置自定义颜色
        if (this.config.labelColor && this.labelElement) {
            this.labelElement.style.color = this.config.labelColor;
        }
        
        if (this.config.backgroundColor) {
            this.checkboxWrapper.style.backgroundColor = this.config.backgroundColor;
            this.checkboxWrapper.style.padding = '4px';
            this.checkboxWrapper.style.borderRadius = '4px';
        }
        
        if (this.config.borderColor) {
            this.checkElement.style.borderColor = this.config.borderColor;
        }
        
        if (this.config.checkColor) {
            // 为自定义勾选标记创建样式
            const styleId = `checkbox-${this._id}-check-color`;
            let styleSheet = document.getElementById(styleId);
            
            if (!styleSheet) {
                styleSheet = document.createElement('style');
                styleSheet.id = styleId;
                document.head.appendChild(styleSheet);
            }
            
            styleSheet.textContent = `
                #${this._id} + .checkbox-check[data-checked="true"] {
                    background-color: ${this.config.checkColor} !important;
                    border-color: ${this.config.checkColor} !important;
                }
                
                #${this._id} + .checkbox-check::after {
                    border-color: ${this._isLightColor(this.config.checkColor) ? '#000' : '#fff'} !important;
                }
                
                .checkbox-container.theme-neon #${this._id} + .checkbox-check::after {
                    border-color: ${this._isLightColor(this.config.checkColor) ? '#000' : '#fff'} !important;
                }
            `;
        }
        
        // 设置禁用状态
        if (this.config.disabled) {
            this.checkboxWrapper.classList.add('disabled');
        }
    }
    
    /**
     * 绑定事件
     * @private
     */
    _bindEvents() {
        // 变化事件
        this.checkboxElement.addEventListener('change', (event) => this._onChange(event));
        
        // 点击事件（增强可访问性）
        this.checkboxWrapper.addEventListener('click', (event) => this._onClick(event));
        
        // 键盘事件（增强可访问性）
        this.checkboxElement.addEventListener('keydown', (event) => this._onKeyDown(event));
        
        // 鼠标进入/离开事件（增强悬停效果）
        this.checkboxWrapper.addEventListener('mouseenter', () => this._onMouseEnter());
        this.checkboxWrapper.addEventListener('mouseleave', () => this._onMouseLeave());
    }
    
    /**
     * 变化事件处理
     * @private
     * @param {Event} event - 变化事件
     */
    _onChange(event) {
        if (this.config.disabled || this.config.readonly) {
            event.preventDefault();
            return;
        }
        
        const oldValue = this._checked;
        this._checked = event.target.checked;
        
        // 更新UI状态
        this.checkboxWrapper.setAttribute('data-checked', this._checked.toString());
        this.checkboxElement.setAttribute('aria-checked', this._checked.toString());
        
        // 触发验证
        if (this.config.required) {
            this.validate();
        }
        
        // 触发变化回调
        if (this.config.onChange && oldValue !== this._checked) {
            this.config.onChange(this._checked, this.config.value);
        }
    }
    
    /**
     * 点击事件处理
     * @private
     * @param {Event} event - 点击事件
     */
    _onClick(event) {
        if (this.config.disabled || this.config.readonly) {
            return;
        }
        
        // 避免不必要的多次触发
        if (event.target === this.checkboxElement) {
            return;
        }
        
        // 切换选中状态
        this._checked = !this._checked;
        this.checkboxElement.checked = this._checked;
        
        // 更新UI状态
        this.checkboxWrapper.setAttribute('data-checked', this._checked.toString());
        this.checkboxElement.setAttribute('aria-checked', this._checked.toString());
        
        // 触发变化事件
        const changeEvent = new Event('change', { bubbles: true });
        this.checkboxElement.dispatchEvent(changeEvent);
        
        // 聚焦到复选框
        this.checkboxElement.focus();
    }
    
    /**
     * 键盘事件处理
     * @private
     * @param {Event} event - 键盘事件
     */
    _onKeyDown(event) {
        if (this.config.disabled || this.config.readonly) {
            return;
        }
        
        // 支持空格键切换选中状态
        if (event.key === ' ' || event.keyCode === 32) {
            event.preventDefault();
            
            this._checked = !this._checked;
            this.checkboxElement.checked = this._checked;
            
            // 更新UI状态
            this.checkboxWrapper.setAttribute('data-checked', this._checked.toString());
            this.checkboxElement.setAttribute('aria-checked', this._checked.toString());
            
            // 触发变化事件
            const changeEvent = new Event('change', { bubbles: true });
            this.checkboxElement.dispatchEvent(changeEvent);
        }
        
        // 支持回车键切换选中状态
        if (event.key === 'Enter' || event.keyCode === 13) {
            event.preventDefault();
            
            this._checked = !this._checked;
            this.checkboxElement.checked = this._checked;
            
            // 更新UI状态
            this.checkboxWrapper.setAttribute('data-checked', this._checked.toString());
            this.checkboxElement.setAttribute('aria-checked', this._checked.toString());
            
            // 触发变化事件
            const changeEvent = new Event('change', { bubbles: true });
            this.checkboxElement.dispatchEvent(changeEvent);
        }
    }
    
    /**
     * 鼠标进入事件处理
     * @private
     */
    _onMouseEnter() {
        if (this.config.disabled || this.config.readonly) {
            return;
        }
        
        this.checkboxWrapper.classList.add('hover');
    }
    
    /**
     * 鼠标离开事件处理
     * @private
     */
    _onMouseLeave() {
        if (this.config.disabled || this.config.readonly) {
            return;
        }
        
        this.checkboxWrapper.classList.remove('hover');
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
     * 检查颜色是否为亮色
     * @private
     * @param {string} color - 颜色值
     * @returns {boolean} 是否为亮色
     */
    _isLightColor(color) {
        // 简单的颜色亮度检查
        const hex = color.replace('#', '');
        const r = parseInt(hex.substr(0, 2), 16);
        const g = parseInt(hex.substr(2, 2), 16);
        const b = parseInt(hex.substr(4, 2), 16);
        
        // 计算亮度 (0-255)
        const brightness = (r * 299 + g * 587 + b * 114) / 1000;
        
        return brightness > 128;
    }
    
    /**
     * 验证组件
     * @private
     * @returns {boolean} 是否验证通过
     */
    _validate() {
        // 必填验证
        if (this.config.required && !this._checked) {
            this._isValid = false;
            this._validationError = '请选择此选项';
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
     * 设置选中状态
     * @param {boolean} checked - 是否选中
     * @returns {Checkbox} 当前实例，支持链式调用
     */
    setChecked(checked) {
        if (this.config.disabled || this.config.readonly) return this;
        
        const oldValue = this._checked;
        this._checked = !!checked;
        
        // 更新UI状态
        this.checkboxElement.checked = this._checked;
        this.checkboxWrapper.setAttribute('data-checked', this._checked.toString());
        this.checkboxElement.setAttribute('aria-checked', this._checked.toString());
        
        // 触发验证
        if (this.config.required) {
            this.validate();
        }
        
        // 触发变化回调
        if (this.config.onChange && oldValue !== this._checked) {
            this.config.onChange(this._checked, this.config.value);
        }
        
        return this;
    }
    
    /**
     * 获取选中状态
     * @returns {boolean} 当前选中状态
     */
    isChecked() {
        return this._checked;
    }
    
    /**
     * 设置标签文本
     * @param {string} label - 标签文本
     * @returns {Checkbox} 当前实例，支持链式调用
     */
    setLabel(label) {
        this.config.label = label;
        
        if (!this.labelElement) {
            // 创建标签元素
            this.labelElement = this._createElement('label', {
                id: `${this._id}-label`,
                htmlFor: this._id,
                className: 'checkbox-label'
            });
            
            // 更新ARIA标签
            this.containerElement.setAttribute('aria-labelledby', this.labelElement.id);
        }
        
        // 设置标签文本
        this.labelElement.textContent = label;
        
        // 添加必填指示器
        if (this.config.required) {
            let requiredIndicator = this.labelElement.querySelector('.required-indicator');
            
            if (!requiredIndicator) {
                requiredIndicator = this._createElement('span', {
                    className: 'required-indicator'
                });
                requiredIndicator.textContent = '*';
                requiredIndicator.style.marginLeft = '4px';
                this.labelElement.appendChild(requiredIndicator);
            }
        }
        
        // 重新排列元素
        this._arrangeElements();
        
        return this;
    }
    
    /**
     * 获取标签元素
     * @returns {HTMLElement} 标签元素
     */
    getLabel() {
        return this.labelElement;
    }
    
    /**
     * 设置主题
     * @param {string} theme - 主题名称
     * @returns {Checkbox} 当前实例，支持链式调用
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
     * @returns {Checkbox} 当前实例，支持链式调用
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
     * 设置标签位置
     * @param {string} position - 标签位置 ('left', 'right', 'top', 'bottom')
     * @returns {Checkbox} 当前实例，支持链式调用
     */
    setLabelPosition(position) {
        // 移除旧位置类名
        this.containerElement.classList.remove('label-position-left', 'label-position-right', 'label-position-top', 'label-position-bottom');
        
        // 添加新位置类名
        this.config.labelPosition = position;
        this.containerElement.classList.add(`label-position-${position}`);
        
        // 重新排列元素
        this._arrangeElements();
        
        return this;
    }
    
    /**
     * 设置是否禁用
     * @param {boolean} disabled - 是否禁用
     * @returns {Checkbox} 当前实例，支持链式调用
     */
    setDisabled(disabled) {
        this.config.disabled = !!disabled;
        
        // 更新复选框状态
        this.checkboxElement.disabled = disabled;
        
        // 更新容器类名
        if (disabled) {
            this.checkboxWrapper.classList.add('disabled');
        } else {
            this.checkboxWrapper.classList.remove('disabled');
        }
        
        return this;
    }
    
    /**
     * 设置是否只读
     * @param {boolean} readonly - 是否只读
     * @returns {Checkbox} 当前实例，支持链式调用
     */
    setReadonly(readonly) {
        this.config.readonly = !!readonly;
        
        // 更新复选框状态
        this.checkboxElement.readOnly = readonly;
        
        return this;
    }
    
    /**
     * 设置是否必填
     * @param {boolean} required - 是否必填
     * @returns {Checkbox} 当前实例，支持链式调用
     */
    setRequired(required) {
        this.config.required = !!required;
        
        // 更新ARIA属性
        this.checkboxElement.setAttribute('aria-required', required.toString());
        
        // 更新必填指示器
        if (this.labelElement) {
            let requiredIndicator = this.labelElement.querySelector('.required-indicator');
            
            if (required && !requiredIndicator) {
                requiredIndicator = this._createElement('span', {
                    className: 'required-indicator'
                });
                requiredIndicator.textContent = '*';
                requiredIndicator.style.marginLeft = '4px';
                this.labelElement.appendChild(requiredIndicator);
            } else if (!required && requiredIndicator) {
                requiredIndicator.parentNode.removeChild(requiredIndicator);
            }
        }
        
        // 触发验证
        this.validate();
        
        return this;
    }
    
    /**
     * 设置颜色
     * @param {string} checkColor - 选中时的颜色
     * @returns {Checkbox} 当前实例，支持链式调用
     */
    setCheckColor(checkColor) {
        this.config.checkColor = checkColor;
        
        // 为自定义勾选标记创建样式
        const styleId = `checkbox-${this._id}-check-color`;
        let styleSheet = document.getElementById(styleId);
        
        if (!styleSheet) {
            styleSheet = document.createElement('style');
            styleSheet.id = styleId;
            document.head.appendChild(styleSheet);
        }
        
        styleSheet.textContent = `
            #${this._id} + .checkbox-check[data-checked="true"] {
                background-color: ${checkColor} !important;
                border-color: ${checkColor} !important;
            }
            
            #${this._id} + .checkbox-check::after {
                border-color: ${this._isLightColor(checkColor) ? '#000' : '#fff'} !important;
            }
            
            .checkbox-container.theme-neon #${this._id} + .checkbox-check::after {
                border-color: ${this._isLightColor(checkColor) ? '#000' : '#fff'} !important;
            }
        `;
        
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
     * @returns {Checkbox} 当前实例，支持链式调用
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
     * 获取复选框元素
     * @returns {HTMLInputElement} 复选框元素
     */
    getCheckbox() {
        return this.checkboxElement;
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
     * 检查是否只读
     * @returns {boolean} 是否只读
     */
    isReadonly() {
        return this.config.readonly;
    }
    
    /**
     * 刷新组件状态
     * @returns {Checkbox} 当前实例，支持链式调用
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
        this.checkboxElement.removeEventListener('change', this._onChange.bind(this));
        this.checkboxWrapper.removeEventListener('click', this._onClick.bind(this));
        this.checkboxElement.removeEventListener('keydown', this._onKeyDown.bind(this));
        this.checkboxWrapper.removeEventListener('mouseenter', this._onMouseEnter.bind(this));
        this.checkboxWrapper.removeEventListener('mouseleave', this._onMouseLeave.bind(this));
        
        // 移除自定义样式
        const styleId = `checkbox-${this._id}-check-color`;
        const styleSheet = document.getElementById(styleId);
        if (styleSheet) {
            styleSheet.parentNode.removeChild(styleSheet);
        }
        
        // 移除DOM元素
        if (this.containerElement && this.containerElement.parentNode) {
            this.containerElement.parentNode.removeChild(this.containerElement);
        }
        
        // 清除引用
        this.containerElement = null;
        this.checkboxElement = null;
        this.labelElement = null;
        this.checkElement = null;
        this.errorElement = null;
    }
}

// 导出组件
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Checkbox;
} else if (typeof window !== 'undefined') {
    window.Checkbox = Checkbox;
}