// JEV 智能客服插件 UI 核心模块
window.JEV_UI = {
    activeModule: 'chat',
    modules: {},
    isMinimized: false,
    isResizing: false,
    originalSize: null,
    currentPosition: { x: 0, y: 0 },
    dragStart: { x: 0, y: 0 },
    resizeStart: { x: 0, y: 0, width: 0, height: 0 },
    
    // 初始化函数
    init: async function() {
        console.log('初始化 JEV 智能客服 UI...');
        this.loadSavedState();
        await this.loadModules();
        this.render();
        this.bindEvents();
        this.checkVersion();
    },
    
    // 加载模块
    loadModules: async function() {
        try {
            // 动态导入各个模块
            const modulePromises = [
                import('./ui-chat.js').then(m => { this.modules.chat = m; }),
                import('./ui-ai.js').then(m => { this.modules.ai = m; }),
                import('./ui-image.js').then(m => { this.modules.image = m; }),
                import('./ui-settings.js').then(m => { this.modules.settings = m; })
            ];
            
            await Promise.all(modulePromises);
            console.log('模块加载完成:', Object.keys(this.modules));
        } catch (error) {
            console.error('模块加载失败:', error);
        }
    },
    
    // 渲染UI
    render: function() {
        this.switchModule(this.activeModule);
        this.updateStatus();
    },
    
    // 绑定事件
    bindEvents: function() {
        // 窗口拖拽
        const header = document.getElementById('jev-header');
        const container = document.getElementById('jev-container');
        
        header.addEventListener('mousedown', this.handleDragStart.bind(this));
        document.addEventListener('mousemove', this.handleDragMove.bind(this));
        document.addEventListener('mouseup', this.handleDragEnd.bind(this));
        
        // 窗口控制按钮
        document.getElementById('btn-minimize').addEventListener('click', this.toggleMinimize.bind(this));
        document.getElementById('btn-resize').addEventListener('click', this.toggleResize.bind(this));
        document.getElementById('btn-close').addEventListener('click', this.handleClose.bind(this));
        
        // 模块切换
        document.querySelectorAll('.jev-nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const moduleName = e.target.dataset.module;
                this.switchModule(moduleName);
            });
        });
        
        // 调整窗口大小（右下角拖拽）
        container.addEventListener('mousedown', (e) => {
            // 检查是否点击了右下角附近
            const rect = container.getBoundingClientRect();
            if (e.clientX >= rect.right - 20 && e.clientY >= rect.bottom - 20) {
                e.preventDefault();
                this.isResizing = true;
                this.resizeStart = {
                    x: e.clientX,
                    y: e.clientY,
                    width: container.offsetWidth,
                    height: container.offsetHeight
                };
            }
        });
    },
    
    // 切换模块
    switchModule: function(moduleName) {
        // 隐藏所有模块
        document.querySelectorAll('.jev-module').forEach(module => {
            module.classList.remove('active');
        });
        document.querySelectorAll('.jev-nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // 激活指定模块
        const moduleElement = document.getElementById(`jev-module-${moduleName}`);
        const navButton = document.querySelector(`.jev-nav-btn[data-module="${moduleName}"]`);
        
        if (moduleElement && navButton) {
            moduleElement.classList.add('active');
            navButton.classList.add('active');
            this.activeModule = moduleName;
            
            // 调用模块的初始化函数（如果存在）
            if (this.modules[moduleName] && this.modules[moduleName].init) {
                this.modules[moduleName].init(moduleElement);
            }
            
            console.log(`切换到模块: ${moduleName}`);
        }
    },
    
    // 拖拽开始
    handleDragStart: function(e) {
        e.preventDefault();
        const container = document.getElementById('jev-container');
        const rect = container.getBoundingClientRect();
        
        this.dragStart = {
            x: e.clientX,
            y: e.clientY
        };
        
        document.body.style.userSelect = 'none';
    },
    
    // 拖拽移动
    handleDragMove: function(e) {
        if (this.dragStart.x !== 0 || this.dragStart.y !== 0) {
            const container = document.getElementById('jev-container');
            const dx = e.clientX - this.dragStart.x;
            const dy = e.clientY - this.dragStart.y;
            
            const currentTransform = container.style.transform || 'translate(-50%, -50%)';
            let x = 0, y = 0;
            
            if (currentTransform.includes('translate')) {
                const match = currentTransform.match(/translate\(([^,]+), ([^)]+)\)/);
                if (match) {
                    x = parseFloat(match[1]) + dx;
                    y = parseFloat(match[2]) + dy;
                }
            }
            
            container.style.transform = `translate(${x}px, ${y}px)`;
            
            this.dragStart = {
                x: e.clientX,
                y: e.clientY
            };
        } else if (this.isResizing) {
            // 调整窗口大小
            const container = document.getElementById('jev-container');
            const dx = e.clientX - this.resizeStart.x;
            const dy = e.clientY - this.resizeStart.y;
            
            let newWidth = this.resizeStart.width + dx;
            let newHeight = this.resizeStart.height + dy;
            
            // 设置最小尺寸限制
            newWidth = Math.max(newWidth, 400);
            newHeight = Math.max(newHeight, 300);
            
            container.style.width = `${newWidth}px`;
            container.style.height = `${newHeight}px`;
            container.style.transform = 'none';
        }
    },
    
    // 拖拽结束
    handleDragEnd: function() {
        this.dragStart = { x: 0, y: 0 };
        this.isResizing = false;
        document.body.style.userSelect = '';
        this.saveState();
    },
    
    // 最小化/还原窗口
    toggleMinimize: function() {
        const container = document.getElementById('jev-container');
        const content = document.querySelector('.jev-content');
        const nav = document.querySelector('.jev-nav');
        const footer = document.querySelector('.jev-footer');
        
        if (this.isMinimized) {
            // 还原窗口
            content.style.display = 'block';
            nav.style.display = 'flex';
            footer.style.display = 'flex';
            if (this.originalSize) {
                container.style.width = this.originalSize.width;
                container.style.height = this.originalSize.height;
            }
        } else {
            // 最小化窗口
            this.originalSize = {
                width: container.style.width || '800px',
                height: container.style.height || '600px'
            };
            container.style.width = '800px';
            container.style.height = '80px';
            content.style.display = 'none';
            nav.style.display = 'none';
            footer.style.display = 'none';
        }
        
        this.isMinimized = !this.isMinimized;
        this.saveState();
    },
    
    // 切换窗口大小
    toggleResize: function() {
        const container = document.getElementById('jev-container');
        const currentWidth = parseInt(container.style.width || '800');
        
        if (currentWidth < 1000) {
            // 最大化
            container.style.width = '1000px';
            container.style.height = '800px';
        } else {
            // 还原默认大小
            container.style.width = '800px';
            container.style.height = '600px';
        }
        
        container.style.transform = 'none';
        this.saveState();
    },
    
    // 关闭窗口
    handleClose: function() {
        const container = document.getElementById('jev-container');
        // 在实际插件中，这里应该隐藏整个插件或关闭窗口
        if (confirm('确定要关闭JEV智能客服工具吗？')) {
            container.style.display = 'none';
        }
    },
    
    // 保存状态到localStorage
    saveState: function() {
        const container = document.getElementById('jev-container');
        const state = {
            activeModule: this.activeModule,
            position: container.style.transform,
            size: {
                width: container.style.width,
                height: container.style.height
            },
            isMinimized: this.isMinimized,
            originalSize: this.originalSize
        };
        
        try {
            localStorage.setItem('JEV_UI_STATE', JSON.stringify(state));
        } catch (e) {
            console.error('保存状态失败:', e);
        }
    },
    
    // 从localStorage加载状态
    loadSavedState: function() {
        try {
            const savedState = localStorage.getItem('JEV_UI_STATE');
            if (savedState) {
                const state = JSON.parse(savedState);
                const container = document.getElementById('jev-container');
                
                if (state.position) container.style.transform = state.position;
                if (state.size) {
                    if (state.size.width) container.style.width = state.size.width;
                    if (state.size.height) container.style.height = state.size.height;
                }
                if (state.activeModule) this.activeModule = state.activeModule;
                this.isMinimized = state.isMinimized || false;
                this.originalSize = state.originalSize;
            }
        } catch (e) {
            console.error('加载状态失败:', e);
        }
    },
    
    // 更新状态栏
    updateStatus: function() {
        // 这里模拟状态更新，实际应该通过API获取
        setInterval(() => {
            // 模拟状态变化
        }, 5000);
    },
    
    // 检查更新
    checkVersion: function() {
        // 模拟版本检查
        setTimeout(() => {
            console.log('检查更新完成');
            // 实际实现中应该调用:
            // fetch('https://control.jevshop.workers.dev/version')
            //   .then(response => response.json())
            //   .then(data => {
            //     if (data.version !== '1.0.0') {
            //       showUpdateNotification();
            //     }
            //   });
        }, 2000);
    },
    
    // 模拟API调用的工具函数
    apiCall: function(endpoint, data = {}) {
        // 这里返回模拟数据，实际应该调用真实API
        console.log(`模拟调用API: ${endpoint}`, data);
        
        // 返回Promise以模拟异步操作
        return Promise.resolve({ success: true, data: {} });
    }
};

// 导出JEV_UI对象供其他模块使用
try {
    module.exports = JEV_UI;
} catch (e) {
    // 在浏览器环境中，module.exports不存在，忽略错误
}