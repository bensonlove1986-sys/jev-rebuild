// JEV-UI-Origin-v9.3 动画效果模块

/**
 * JEV动画系统核心类
 * 提供页面过渡、交互动效和视觉反馈
 */
class JevAnimations {
    constructor() {
        this.initialized = false;
        this.activeAnimations = new Map();
        this.animationFrameId = null;
        this.scrollAnimations = [];
        this.mutationObserver = null;
    }

    /**
     * 初始化动画系统
     */
    init() {
        if (this.initialized) return;
        
        // 添加CSS变量
        this.addAnimationCSS();
        
        // 设置事件监听
        this.setupEventListeners();
        
        // 初始化滚动动画
        this.initScrollAnimations();
        
        // 设置元素观察器
        this.setupElementObserver();
        
        this.initialized = true;
        console.log('JEV动画系统初始化完成');
    }

    /**
     * 添加动画相关的CSS
     */
    addAnimationCSS() {
        if (document.getElementById('jev-animation-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'jev-animation-styles';
        style.textContent = `
            /* 核心动画类 */
            .jev-fade-in {
                animation: jevFadeIn 0.5s ease forwards;
            }
            
            .jev-fade-out {
                animation: jevFadeOut 0.5s ease forwards;
            }
            
            .jev-slide-in-up {
                animation: jevSlideInUp 0.5s ease forwards;
            }
            
            .jev-slide-in-down {
                animation: jevSlideInDown 0.5s ease forwards;
            }
            
            .jev-slide-in-left {
                animation: jevSlideInLeft 0.5s ease forwards;
            }
            
            .jev-slide-in-right {
                animation: jevSlideInRight 0.5s ease forwards;
            }
            
            .jev-slide-out-up {
                animation: jevSlideOutUp 0.5s ease forwards;
            }
            
            .jev-slide-out-down {
                animation: jevSlideOutDown 0.5s ease forwards;
            }
            
            .jev-slide-out-left {
                animation: jevSlideOutLeft 0.5s ease forwards;
            }
            
            .jev-slide-out-right {
                animation: jevSlideOutRight 0.5s ease forwards;
            }
            
            .jev-pulse {
                animation: jevPulse 2s infinite;
            }
            
            .jev-pulse-fast {
                animation: jevPulse 0.5s infinite;
            }
            
            .jev-bounce {
                animation: jevBounce 1s ease infinite;
            }
            
            .jev-bounce-in {
                animation: jevBounceIn 0.6s ease forwards;
            }
            
            .jev-bounce-out {
                animation: jevBounceOut 0.6s ease forwards;
            }
            
            .jev-zoom-in {
                animation: jevZoomIn 0.5s ease forwards;
            }
            
            .jev-zoom-out {
                animation: jevZoomOut 0.5s ease forwards;
            }
            
            .jev-rotate {
                animation: jevRotate 2s linear infinite;
            }
            
            .jev-flip {
                animation: jevFlip 0.6s ease forwards;
            }
            
            .jev-shake {
                animation: jevShake 0.5s ease-in-out;
            }
            
            .jev-wobble {
                animation: jevWobble 1s ease-in-out;
            }
            
            .jev-slide-up {
                animation: jevSlideUp 0.5s ease forwards;
            }
            
            /* 悬停动画 */
            .jev-hover-lift {
                transition: transform 0.3s ease, box-shadow 0.3s ease;
            }
            
            .jev-hover-lift:hover {
                transform: translateY(-5px);
                box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
            }
            
            .jev-hover-scale {
                transition: transform 0.3s ease;
            }
            
            .jev-hover-scale:hover {
                transform: scale(1.05);
            }
            
            .jev-hover-fade {
                transition: opacity 0.3s ease, transform 0.3s ease;
            }
            
            .jev-hover-fade:hover {
                opacity: 0.8;
                transform: translateY(-2px);
            }
            
            /* 加载动画 */
            .jev-loader {
                border: 3px solid rgba(56, 189, 248, 0.2);
                border-radius: 50%;
                border-top: 3px solid var(--primary-color, #38bdf8);
                width: 30px;
                height: 30px;
                animation: jevSpin 1s linear infinite;
            }
            
            .jev-loader-lg {
                width: 50px;
                height: 50px;
            }
            
            .jev-loader-sm {
                width: 20px;
                height: 20px;
            }
            
            /* 呼吸灯效果 */
            .jev-breathe {
                animation: jevBreathe 3s ease-in-out infinite;
            }
            
            /* 波纹效果 */
            .jev-ripple-container {
                position: relative;
                overflow: hidden;
            }
            
            .jev-ripple {
                position: absolute;
                border-radius: 50%;
                background-color: rgba(255, 255, 255, 0.3);
                transform: scale(0);
                animation: jevRipple 0.6s linear;
                pointer-events: none;
            }
            
            /* 骨架屏动画 */
            .jev-skeleton {
                background: linear-gradient(90deg, #1e293b 25%, #334155 50%, #1e293b 75%);
                background-size: 200% 100%;
                animation: jevSkeleton 1.5s infinite;
            }
            
            /* 滚动渐入效果 */
            .jev-scroll-reveal {
                opacity: 0;
                transform: translateY(30px);
                transition: opacity 0.6s ease, transform 0.6s ease;
            }
            
            .jev-scroll-reveal.visible {
                opacity: 1;
                transform: translateY(0);
            }
            
            /* 进度条动画 */
            .jev-progress {
                position: relative;
                height: 4px;
                background-color: rgba(56, 189, 248, 0.2);
                border-radius: 2px;
                overflow: hidden;
            }
            
            .jev-progress-bar {
                position: absolute;
                top: 0;
                left: 0;
                height: 100%;
                background-color: var(--primary-color, #38bdf8);
                border-radius: 2px;
                transition: width 0.3s ease;
            }
            
            /* 通知动画 */
            .jev-notification {
                animation: jevNotificationIn 0.3s ease forwards;
            }
            
            .jev-notification.out {
                animation: jevNotificationOut 0.3s ease forwards;
            }
            
            /* 关键帧动画 */
            @keyframes jevFadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            
            @keyframes jevFadeOut {
                from { opacity: 1; }
                to { opacity: 0; }
            }
            
            @keyframes jevSlideInUp {
                from { 
                    opacity: 0;
                    transform: translateY(30px);
                }
                to { 
                    opacity: 1;
                    transform: translateY(0);
                }
            }
            
            @keyframes jevSlideInDown {
                from { 
                    opacity: 0;
                    transform: translateY(-30px);
                }
                to { 
                    opacity: 1;
                    transform: translateY(0);
                }
            }
            
            @keyframes jevSlideInLeft {
                from { 
                    opacity: 0;
                    transform: translateX(-30px);
                }
                to { 
                    opacity: 1;
                    transform: translateX(0);
                }
            }
            
            @keyframes jevSlideInRight {
                from { 
                    opacity: 0;
                    transform: translateX(30px);
                }
                to { 
                    opacity: 1;
                    transform: translateX(0);
                }
            }
            
            @keyframes jevSlideOutUp {
                from { 
                    opacity: 1;
                    transform: translateY(0);
                }
                to { 
                    opacity: 0;
                    transform: translateY(-30px);
                }
            }
            
            @keyframes jevSlideOutDown {
                from { 
                    opacity: 1;
                    transform: translateY(0);
                }
                to { 
                    opacity: 0;
                    transform: translateY(30px);
                }
            }
            
            @keyframes jevSlideOutLeft {
                from { 
                    opacity: 1;
                    transform: translateX(0);
                }
                to { 
                    opacity: 0;
                    transform: translateX(-30px);
                }
            }
            
            @keyframes jevSlideOutRight {
                from { 
                    opacity: 1;
                    transform: translateX(0);
                }
                to { 
                    opacity: 0;
                    transform: translateX(30px);
                }
            }
            
            @keyframes jevPulse {
                0% { transform: scale(1); opacity: 1; }
                50% { transform: scale(1.05); opacity: 0.8; }
                100% { transform: scale(1); opacity: 1; }
            }
            
            @keyframes jevBounce {
                0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
                40% { transform: translateY(-20px); }
                60% { transform: translateY(-10px); }
            }
            
            @keyframes jevBounceIn {
                0% { 
                    opacity: 0;
                    transform: scale(0.3);
                }
                50% { 
                    opacity: 1;
                    transform: scale(1.05);
                }
                70% { transform: scale(0.9); }
                100% { transform: scale(1); }
            }
            
            @keyframes jevBounceOut {
                20% { transform: scale(0.9); }
                50%, 55% { 
                    opacity: 1;
                    transform: scale(1.1);
                }
                100% { 
                    opacity: 0;
                    transform: scale(0.3);
                }
            }
            
            @keyframes jevZoomIn {
                from { 
                    opacity: 0;
                    transform: scale(0.8);
                }
                to { 
                    opacity: 1;
                    transform: scale(1);
                }
            }
            
            @keyframes jevZoomOut {
                from { 
                    opacity: 1;
                    transform: scale(1);
                }
                to { 
                    opacity: 0;
                    transform: scale(0.8);
                }
            }
            
            @keyframes jevRotate {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
            }
            
            @keyframes jevFlip {
                from { transform: perspective(400px) rotateY(0); }
                to { transform: perspective(400px) rotateY(360deg); }
            }
            
            @keyframes jevShake {
                0%, 100% { transform: translateX(0); }
                10%, 30%, 50%, 70%, 90% { transform: translateX(-10px); }
                20%, 40%, 60%, 80% { transform: translateX(10px); }
            }
            
            @keyframes jevWobble {
                0% { transform: translateX(0); }
                15% { transform: translateX(-25px) rotate(-5deg); }
                30% { transform: translateX(20px) rotate(3deg); }
                45% { transform: translateX(-15px) rotate(-3deg); }
                60% { transform: translateX(10px) rotate(2deg); }
                75% { transform: translateX(-5px) rotate(-1deg); }
                100% { transform: translateX(0); }
            }
            
            @keyframes jevSlideUp {
                from { transform: translateY(100%); }
                to { transform: translateY(0); }
            }
            
            @keyframes jevSpin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
            
            @keyframes jevBreathe {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.5; }
            }
            
            @keyframes jevRipple {
                to {
                    transform: scale(4);
                    opacity: 0;
                }
            }
            
            @keyframes jevSkeleton {
                0% { background-position: 200% 0; }
                100% { background-position: -200% 0; }
            }
            
            @keyframes jevNotificationIn {
                from { 
                    opacity: 0;
                    transform: translateY(20px) translateX(100%);
                }
                to { 
                    opacity: 1;
                    transform: translateY(0) translateX(0);
                }
            }
            
            @keyframes jevNotificationOut {
                from { 
                    opacity: 1;
                    transform: translateY(0) translateX(0);
                }
                to { 
                    opacity: 0;
                    transform: translateY(20px) translateX(100%);
                }
            }
        `;
        
        document.head.appendChild(style);
    }

    /**
     * 设置事件监听
     */
    setupEventListeners() {
        // 滚动事件监听
        window.addEventListener('scroll', this.handleScroll.bind(this), { passive: true });
        
        // 调整窗口大小事件
        window.addEventListener('resize', this.handleResize.bind(this), { passive: true });
        
        // 点击事件（用于波纹效果）
        document.addEventListener('click', this.handleClick.bind(this));
    }

    /**
     * 初始化滚动动画
     */
    initScrollAnimations() {
        // 查找所有需要滚动动画的元素
        this.updateScrollElements();
    }

    /**
     * 更新滚动动画元素
     */
    updateScrollElements() {
        const elements = document.querySelectorAll('.jev-scroll-reveal');
        this.scrollAnimations = Array.from(elements);
        
        // 立即检查一次，确保初始可见元素正常显示
        this.checkScrollAnimations();
    }

    /**
     * 检查滚动动画
     */
    checkScrollAnimations() {
        this.scrollAnimations.forEach((element, index) => {
            if (this.isElementInViewport(element) && !element.classList.contains('visible')) {
                // 为元素添加延迟，创建级联效果
                const delay = index * 100;
                
                setTimeout(() => {
                    element.classList.add('visible');
                }, delay);
            }
        });
    }

    /**
     * 处理滚动事件
     */
    handleScroll() {
        if (!this.animationFrameId) {
            this.animationFrameId = requestAnimationFrame(() => {
                this.checkScrollAnimations();
                this.animationFrameId = null;
            });
        }
    }

    /**
     * 处理调整窗口大小事件
     */
    handleResize() {
        this.checkScrollAnimations();
    }

    /**
     * 处理点击事件（添加波纹效果）
     */
    handleClick(event) {
        const target = event.target;
        
        // 为带有jev-ripple属性的元素添加波纹效果
        if (target.hasAttribute('data-jev-ripple')) {
            this.createRipple(target, event);
        }
        
        // 为带有jev-ripple-container类的元素添加波纹效果
        const rippleContainer = target.closest('.jev-ripple-container');
        if (rippleContainer) {
            this.createRipple(rippleContainer, event);
        }
    }

    /**
     * 创建波纹效果
     */
    createRipple(element, event) {
        // 确保元素相对定位
        if (window.getComputedStyle(element).position === 'static') {
            element.style.position = 'relative';
        }
        
        const rect = element.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const x = event.clientX - rect.left - size / 2;
        const y = event.clientY - rect.top - size / 2;
        
        const ripple = document.createElement('span');
        ripple.classList.add('jev-ripple');
        ripple.style.width = ripple.style.height = `${size}px`;
        ripple.style.left = `${x}px`;
        ripple.style.top = `${y}px`;
        
        // 设置波纹颜色（如果有指定）
        const rippleColor = element.getAttribute('data-jev-ripple-color');
        if (rippleColor) {
            ripple.style.backgroundColor = rippleColor;
        }
        
        // 添加波纹
        element.appendChild(ripple);
        
        // 动画结束后移除波纹
        setTimeout(() => {
            ripple.remove();
        }, 600);
    }

    /**
     * 设置元素观察器
     */
    setupElementObserver() {
        if (!('MutationObserver' in window)) return;
        
        this.mutationObserver = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                // 检查是否有新元素添加
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === 1) { // 元素节点
                            // 检查新添加的元素是否包含滚动动画元素
                            const newScrollElements = node.querySelectorAll('.jev-scroll-reveal');
                            if (newScrollElements.length > 0) {
                                this.updateScrollElements();
                            }
                        }
                    });
                }
            });
        });
        
        // 开始观察文档变化
        this.mutationObserver.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    /**
     * 检查元素是否在视口中
     */
    isElementInViewport(element) {
        const rect = element.getBoundingClientRect();
        return (
            rect.top <= (window.innerHeight || document.documentElement.clientHeight) * 0.8 &&
            rect.bottom >= 0 &&
            rect.left <= (window.innerWidth || document.documentElement.clientWidth) &&
            rect.right >= 0
        );
    }

    /**
     * 为元素添加动画
     */
    animateElement(element, animationClass, callback) {
        if (typeof element === 'string') {
            element = document.querySelector(element);
        }
        
        if (!element) return;
        
        // 移除可能存在的旧动画类
        const oldAnimations = Array.from(element.classList).filter(cls => 
            cls.startsWith('jev-') && 
            (cls.includes('fade') || 
             cls.includes('slide') || 
             cls.includes('bounce') || 
             cls.includes('zoom') || 
             cls.includes('flip') || 
             cls.includes('shake') || 
             cls.includes('wobble'))
        );
        
        oldAnimations.forEach(cls => element.classList.remove(cls));
        
        // 强制重绘
        void element.offsetWidth;
        
        // 添加新动画类
        element.classList.add(animationClass);
        
        // 获取动画持续时间
        const style = window.getComputedStyle(element);
        const animationDuration = style.animationDuration || '0.5s';
        const durationMs = parseFloat(animationDuration) * 1000;
        
        // 设置动画完成后的回调
        const animationId = setTimeout(() => {
            // 移除动画类（如果不是无限动画）
            if (!animationClass.includes('pulse') && 
                !animationClass.includes('bounce') && 
                !animationClass.includes('rotate') && 
                !animationClass.includes('breathe') && 
                !animationClass.includes('spin')) {
                element.classList.remove(animationClass);
            }
            
            // 执行回调
            if (typeof callback === 'function') {
                callback();
            }
        }, durationMs + 10);
        
        // 保存动画ID以便后续可以取消
        this.activeAnimations.set(element, animationId);
        
        return animationId;
    }

    /**
     * 停止元素的动画
     */
    stopAnimation(element) {
        if (typeof element === 'string') {
            element = document.querySelector(element);
        }
        
        if (!element) return;
        
        // 清除超时
        const animationId = this.activeAnimations.get(element);
        if (animationId) {
            clearTimeout(animationId);
            this.activeAnimations.delete(element);
        }
        
        // 移除所有动画类
        const animationClasses = Array.from(element.classList).filter(cls => 
            cls.startsWith('jev-') && 
            (cls.includes('fade') || 
             cls.includes('slide') || 
             cls.includes('bounce') || 
             cls.includes('zoom') || 
             cls.includes('flip') || 
             cls.includes('shake') || 
             cls.includes('wobble') || 
             cls.includes('pulse') || 
             cls.includes('rotate') || 
             cls.includes('breathe') || 
             cls.includes('spin'))
        );
        
        animationClasses.forEach(cls => element.classList.remove(cls));
    }

    /**
     * 创建页面过渡效果
     */
    pageTransition(container, content, transitionType = 'fade') {
        return new Promise((resolve) => {
            if (typeof container === 'string') {
                container = document.querySelector(container);
            }
            
            if (!container) {
                resolve();
                return;
            }
            
            const oldContent = container.firstElementChild;
            
            // 如果没有旧内容，直接插入新内容
            if (!oldContent) {
                container.appendChild(content);
                content.classList.add(`jev-${transitionType}-in`);
                
                setTimeout(() => {
                    content.classList.remove(`jev-${transitionType}-in`);
                    resolve();
                }, 500);
                
                return;
            }
            
            // 为旧内容添加离开动画
            oldContent.classList.add(`jev-${transitionType}-out`);
            
            // 等待旧内容动画完成
            setTimeout(() => {
                // 隐藏旧内容
                oldContent.style.display = 'none';
                
                // 准备新内容
                content.style.display = 'none';
                container.appendChild(content);
                
                // 强制重绘
                void content.offsetWidth;
                
                // 显示新内容并添加进入动画
                content.style.display = '';
                content.classList.add(`jev-${transitionType}-in`);
                
                // 等待新内容动画完成
                setTimeout(() => {
                    // 清理
                    content.classList.remove(`jev-${transitionType}-in`);
                    container.removeChild(oldContent);
                    
                    resolve();
                }, 500);
            }, 500);
        });
    }

    /**
     * 创建加载动画
     */
    createLoader(parent, size = 'default') {
        const loader = document.createElement('div');
        loader.className = `jev-loader ${size === 'large' ? 'jev-loader-lg' : size === 'small' ? 'jev-loader-sm' : ''}`;
        
        if (parent) {
            if (typeof parent === 'string') {
                parent = document.querySelector(parent);
            }
            
            if (parent) {
                parent.appendChild(loader);
            }
        }
        
        return loader;
    }

    /**
     * 创建骨架屏
     */
    createSkeleton(parent, width = '100%', height = '20px', borderRadius = '4px') {
        const skeleton = document.createElement('div');
        skeleton.className = 'jev-skeleton';
        skeleton.style.width = width;
        skeleton.style.height = height;
        skeleton.style.borderRadius = borderRadius;
        
        if (parent) {
            if (typeof parent === 'string') {
                parent = document.querySelector(parent);
            }
            
            if (parent) {
                parent.appendChild(skeleton);
            }
        }
        
        return skeleton;
    }

    /**
     * 创建通知动画
     */
    showNotification(message, type = 'info', duration = 3000) {
        // 创建通知容器（如果不存在）
        let notificationContainer = document.getElementById('jev-notification-container');
        if (!notificationContainer) {
            notificationContainer = document.createElement('div');
            notificationContainer.id = 'jev-notification-container';
            notificationContainer.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 9999;
                display: flex;
                flex-direction: column;
                gap: 10px;
            `;
            document.body.appendChild(notificationContainer);
        }
        
        // 创建通知元素
        const notification = document.createElement('div');
        notification.className = 'jev-notification';
        
        // 设置通知样式
        const bgColor = 
            type === 'success' ? 'var(--success-color, #10b981)' :
            type === 'error' ? 'var(--error-color, #ef4444)' :
            type === 'warning' ? 'var(--warning-color, #f59e0b)' :
            'var(--info-color, #38bdf8)';
        
        notification.style.cssText = `
            padding: 12px 16px;
            background-color: ${bgColor};
            color: white;
            border-radius: 8px;
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
            display: flex;
            align-items: center;
            gap: 10px;
            min-width: 250px;
            max-width: 400px;
        `;
        
        // 设置图标
        const icon = document.createElement('span');
        icon.textContent = 
            type === 'success' ? '✓' :
            type === 'error' ? '✗' :
            type === 'warning' ? '!' :
            'ℹ';
        
        // 设置消息文本
        const messageText = document.createElement('span');
        messageText.textContent = message;
        messageText.style.flex = '1';
        
        // 组装通知
        notification.appendChild(icon);
        notification.appendChild(messageText);
        
        // 添加到容器
        notificationContainer.appendChild(notification);
        
        // 设置自动关闭
        setTimeout(() => {
            notification.classList.add('out');
            
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, duration);
        
        return notification;
    }

    /**
     * 清理资源
     */
    destroy() {
        // 取消动画帧
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
        }
        
        // 清除所有活动的动画
        this.activeAnimations.forEach((animationId) => {
            clearTimeout(animationId);
        });
        this.activeAnimations.clear();
        
        // 停止元素观察器
        if (this.mutationObserver) {
            this.mutationObserver.disconnect();
        }
        
        // 移除事件监听
        window.removeEventListener('scroll', this.handleScroll);
        window.removeEventListener('resize', this.handleResize);
        document.removeEventListener('click', this.handleClick);
        
        // 移除样式
        const styleElement = document.getElementById('jev-animation-styles');
        if (styleElement) {
            styleElement.remove();
        }
        
        this.initialized = false;
        console.log('JEV动画系统已销毁');
    }
}

/**
 * 初始化JEV动画系统
 */
function initJevAnimations() {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            window.jevAnimations = new JevAnimations();
            window.jevAnimations.init();
        });
    } else {
        window.jevAnimations = new JevAnimations();
        window.jevAnimations.init();
    }
}

// 导出初始化函数
export { initJevAnimations, JevAnimations };

// 如果直接在浏览器中运行，自动初始化
if (typeof window !== 'undefined' && typeof module === 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        initJevAnimations();
    });
}