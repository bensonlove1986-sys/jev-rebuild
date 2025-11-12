// JEV 智能客服插件 - 设置模块
const settingsModule = {
    init: function(container) {
        console.log('初始化设置模块');
        this.container = container;
        this.render();
        this.bindEvents();
        this.loadSettings();
    },
    
    render: function() {
        const settingsContent = document.getElementById('settings-content');
        settingsContent.innerHTML = `
            <div class="settings-container">
                <div class="settings-tabs">
                    <button class="tab-btn active" data-tab="account">账号设置</button>
                    <button class="tab-btn" data-tab="kv">KV同步</button>
                    <button class="tab-btn" data-tab="updates">更新检测</button>
                    <button class="tab-btn" data-tab="about">关于</button>
                </div>
                
                <div class="settings-content-area">
                    <!-- 账号设置 -->
                    <div class="tab-content active" id="tab-account">
                        <div class="account-form">
                            <div class="form-group">
                                <label for="api-key">API Key</label>
                                <input type="password" id="api-key" placeholder="输入API Key">
                                <div class="input-hint">用于访问JEV API服务</div>
                            </div>
                            
                            <div class="form-group">
                                <label for="worker-url">Worker URL</label>
                                <input type="text" id="worker-url" placeholder="输入Worker服务器地址">
                                <div class="input-hint">默认为 https://jevshop.workers.dev</div>
                            </div>
                            
                            <div class="form-group">
                                <label for="user-name">用户名</label>
                                <input type="text" id="user-name" placeholder="输入用户名">
                            </div>
                            
                            <div class="form-group">
                                <label for="department">部门</label>
                                <select id="department">
                                    <option value="">请选择部门</option>
                                    <option value="sales">销售部</option>
                                    <option value="support">客服部</option>
                                    <option value="tech">技术部</option>
                                    <option value="admin">行政部</option>
                                </select>
                            </div>
                            
                            <div class="form-group">
                                <label>
                                    <input type="checkbox" id="auto-login">
                                    <span>自动登录</span>
                                </label>
                            </div>
                            
                            <div class="form-group">
                                <label>
                                    <input type="checkbox" id="remember-credentials">
                                    <span>记住凭证</span>
                                </label>
                            </div>
                            
                            <div class="form-actions">
                                <button class="action-btn primary-btn" id="btn-save-account">保存设置</button>
                                <button class="action-btn" id="btn-test-connection">测试连接</button>
                                <button class="action-btn danger-btn" id="btn-logout">退出登录</button>
                            </div>
                        </div>
                    </div>
                    
                    <!-- KV同步设置 -->
                    <div class="tab-content" id="tab-kv">
                        <div class="kv-settings">
                            <div class="kv-status">
                                <h5>K-V Store 状态</h5>
                                <div class="status-info">
                                    <div class="status-item">
                                        <span class="status-label">连接状态：</span>
                                        <span class="status-value connected">已连接</span>
                                    </div>
                                    <div class="status-item">
                                        <span class="status-label">上次同步：</span>
                                        <span class="status-value" id="last-sync">2025-11-06 14:30:22</span>
                                    </div>
                                    <div class="status-item">
                                        <span class="status-label">数据条目：</span>
                                        <span class="status-value" id="kv-items-count">42</span>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="kv-controls">
                                <button class="action-btn" id="btn-sync-now">🔄 立即同步</button>
                                <button class="action-btn" id="btn-clear-cache">🗑️ 清除缓存</button>
                                <button class="action-btn" id="btn-export-kv">📤 导出数据</button>
                                <button class="action-btn" id="btn-import-kv">📥 导入数据</button>
                            </div>
                            
                            <div class="kv-sync-settings">
                                <h5>同步设置</h5>
                                <div class="form-group">
                                    <label for="sync-interval">自动同步间隔</label>
                                    <select id="sync-interval">
                                        <option value="5">5分钟</option>
                                        <option value="15" selected>15分钟</option>
                                        <option value="30">30分钟</option>
                                        <option value="60">1小时</option>
                                        <option value="0">手动同步</option>
                                    </select>
                                </div>
                                
                                <div class="form-group">
                                    <label>
                                        <input type="checkbox" id="sync-on-startup" checked>
                                        <span>启动时自动同步</span>
                                    </label>
                                </div>
                                
                                <div class="form-group">
                                    <label>
                                        <input type="checkbox" id="sync-on-change" checked>
                                        <span>数据变更时同步</span>
                                    </label>
                                </div>
                                
                                <div class="form-actions">
                                    <button class="action-btn primary-btn" id="btn-save-kv-settings">保存设置</button>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- 更新检测设置 -->
                    <div class="tab-content" id="tab-updates">
                        <div class="updates-settings">
                            <div class="update-status">
                                <h5>更新状态</h5>
                                <div class="status-info">
                                    <div class="status-item">
                                        <span class="status-label">当前版本：</span>
                                        <span class="status-value" id="current-version">v1.0.0</span>
                                    </div>
                                    <div class="status-item">
                                        <span class="status-label">最新版本：</span>
                                        <span class="status-value" id="latest-version">v1.0.0</span>
                                    </div>
                                    <div class="status-item">
                                        <span class="status-label">更新状态：</span>
                                        <span class="status-value up-to-date">已是最新版本</span>
                                    </div>
                                    <div class="status-item">
                                        <span class="status-label">检查时间：</span>
                                        <span class="status-value" id="last-check-time">2025-11-06 14:00:00</span>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="update-actions">
                                <button class="action-btn primary-btn" id="btn-check-updates">🔍 检查更新</button>
                                <button class="action-btn" id="btn-download-update" disabled>⬇️ 下载更新</button>
                                <button class="action-btn" id="btn-view-changelog">📝 查看更新日志</button>
                            </div>
                            
                            <div class="update-settings">
                                <h5>更新设置</h5>
                                <div class="form-group">
                                    <label>
                                        <input type="checkbox" id="auto-check-updates" checked>
                                        <span>自动检查更新</span>
                                    </label>
                                </div>
                                
                                <div class="form-group">
                                    <label for="update-check-interval">检查频率</label>
                                    <select id="update-check-interval">
                                        <option value="daily">每天</option>
                                        <option value="weekly" selected>每周</option>
                                        <option value="monthly">每月</option>
                                    </select>
                                </div>
                                
                                <div class="form-group">
                                    <label>
                                        <input type="checkbox" id="auto-update">
                                        <span>自动下载并安装更新</span>
                                    </label>
                                    <div class="input-hint">仅适用于小版本更新</div>
                                </div>
                                
                                <div class="form-actions">
                                    <button class="action-btn primary-btn" id="btn-save-update-settings">保存设置</button>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- 关于 -->
                    <div class="tab-content" id="tab-about">
                        <div class="about-content">
                            <div class="about-header">
                                <div class="about-logo">🌿</div>
                                <h3>JEV 嘉尔威智能客服工具</h3>
                                <div class="version">v1.0.0</div>
                            </div>
                            
                            <div class="about-info">
                                <p>JEV智能客服是一款专为企业打造的智能客服解决方案，集成了AI对话、多语言翻译、图片识别等功能，帮助企业提升客户服务质量和效率。</p>
                                
                                <div class="about-features">
                                    <h4>主要功能</h4>
                                    <ul>
                                        <li>💬 智能对话管理</li>
                                        <li>🌐 多语言实时翻译</li>
                                        <li>📷 图片识别与分析</li>
                                        <li>🧠 AI回复推荐</li>
                                        <li>⚙️ 自定义设置</li>
                                    </ul>
                                </div>
                                
                                <div class="about-contact">
                                    <h4>联系我们</h4>
                                    <p>官方网站：<a href="#" class="about-link">www.jevshop.com</a></p>
                                    <p>技术支持：<a href="#" class="about-link">support@jevshop.com</a></p>
                                    <p>商务合作：<a href="#" class="about-link">business@jevshop.com</a></p>
                                </div>
                                
                                <div class="about-copyright">
                                    <p>© 2025 JEV 嘉尔威科技有限公司. 保留所有权利.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // 添加样式
        this.addStyles();
    },
    
    addStyles: function() {
        const style = document.createElement('style');
        style.textContent = `
            .settings-container {
                height: 100%;
                display: flex;
                flex-direction: column;
            }
            
            .settings-tabs {
                display: flex;
                gap: 10px;
                margin-bottom: 20px;
                border-bottom: 1px solid #0f0;
                padding-bottom: 10px;
            }
            
            .tab-btn {
                background: transparent;
                border: none;
                color: #0a0;
                padding: 8px 20px;
                border-radius: 4px;
                cursor: pointer;
                transition: all 0.3s;
                font-size: 14px;
            }
            
            .tab-btn:hover {
                background: rgba(0, 255, 0, 0.1);
            }
            
            .tab-btn.active {
                background: rgba(0, 255, 0, 0.2);
                color: #0f0;
                font-weight: bold;
                border-bottom: 2px solid #0f0;
            }
            
            .settings-content-area {
                flex: 1;
                overflow-y: auto;
            }
            
            .tab-content {
                display: none;
            }
            
            .tab-content.active {
                display: block;
            }
            
            .form-group {
                margin-bottom: 20px;
            }
            
            .form-group label {
                display: block;
                margin-bottom: 8px;
                color: #0f0;
                font-size: 14px;
                font-weight: 500;
            }
            
            .form-group input[type="text"],
            .form-group input[type="password"],
            .form-group select {
                width: 100%;
                max-width: 400px;
                padding: 8px 12px;
                border: 1px solid #0f0;
                border-radius: 4px;
                background: rgba(0, 10, 0, 0.5);
                color: #0f0;
                font-size: 14px;
                box-sizing: border-box;
            }
            
            .form-group input[type="text"]:focus,
            .form-group input[type="password"]:focus,
            .form-group select:focus {
                outline: none;
                box-shadow: 0 0 8px rgba(0, 255, 0, 0.5);
                border-color: rgba(0, 255, 0, 0.8);
            }
            
            .form-group input[type="checkbox"] {
                accent-color: #0f0;
                margin-right: 8px;
            }
            
            .form-group input[type="checkbox"] + span {
                cursor: pointer;
            }
            
            .input-hint {
                font-size: 12px;
                color: #0a0;
                margin-top: 5px;
                opacity: 0.8;
            }
            
            .form-actions {
                margin-top: 30px;
                display: flex;
                gap: 15px;
            }
            
            .action-btn {
                background: transparent;
                border: 1px solid #0f0;
                color: #0f0;
                padding: 8px 20px;
                border-radius: 4px;
                cursor: pointer;
                transition: all 0.3s;
                font-size: 14px;
            }
            
            .action-btn:hover {
                background: rgba(0, 255, 0, 0.2);
                box-shadow: 0 0 8px rgba(0, 255, 0, 0.5);
            }
            
            .action-btn:disabled {
                opacity: 0.5;
                cursor: not-allowed;
            }
            
            .primary-btn {
                background: rgba(0, 255, 0, 0.1);
                font-weight: bold;
            }
            
            .danger-btn {
                border-color: #f00;
                color: #f00;
            }
            
            .danger-btn:hover {
                background: rgba(255, 0, 0, 0.1);
                box-shadow: 0 0 8px rgba(255, 0, 0, 0.3);
            }
            
            .status-info {
                background: rgba(0, 20, 0, 0.3);
                border: 1px solid #0f0;
                border-radius: 6px;
                padding: 15px;
                margin-bottom: 20px;
            }
            
            .status-item {
                display: flex;
                justify-content: space-between;
                margin-bottom: 10px;
                padding-bottom: 10px;
                border-bottom: 1px solid rgba(0, 255, 0, 0.2);
            }
            
            .status-item:last-child {
                margin-bottom: 0;
                padding-bottom: 0;
                border-bottom: none;
            }
            
            .status-label {
                color: #0a0;
                font-size: 14px;
            }
            
            .status-value {
                font-weight: bold;
                color: #0f0;
            }
            
            .status-value.connected {
                color: #0f0;
            }
            
            .status-value.disconnected {
                color: #f00;
            }
            
            .status-value.up-to-date {
                color: #0f0;
            }
            
            .status-value.update-available {
                color: #ffaa00;
            }
            
            .kv-controls,
            .update-actions {
                display: flex;
                gap: 15px;
                margin-bottom: 30px;
                flex-wrap: wrap;
            }
            
            h5 {
                margin: 0 0 15px 0;
                color: #0f0;
                font-size: 15px;
                border-bottom: 1px solid #0f0;
                padding-bottom: 8px;
            }
            
            /* 关于页面样式 */
            .about-content {
                text-align: center;
                max-width: 600px;
                margin: 0 auto;
            }
            
            .about-header {
                margin-bottom: 30px;
                padding-bottom: 20px;
                border-bottom: 1px solid #0f0;
            }
            
            .about-logo {
                font-size: 64px;
                margin-bottom: 20px;
            }
            
            .about-header h3 {
                margin: 0 0 10px 0;
                color: #0f0;
                font-size: 20px;
            }
            
            .about-info p {
                line-height: 1.6;
                margin-bottom: 20px;
                color: #0f0;
            }
            
            .about-features,
            .about-contact {
                text-align: left;
                margin-bottom: 30px;
                padding: 15px;
                border: 1px solid #0f0;
                border-radius: 6px;
                background: rgba(0, 20, 0, 0.3);
            }
            
            .about-features h4,
            .about-contact h4 {
                margin: 0 0 15px 0;
                color: #0f0;
                font-size: 16px;
            }
            
            .about-features ul {
                margin: 0;
                padding-left: 20px;
            }
            
            .about-features li {
                margin-bottom: 8px;
                color: #0f0;
            }
            
            .about-link {
                color: #0f0;
                text-decoration: none;
                border-bottom: 1px dashed #0f0;
                transition: all 0.3s;
            }
            
            .about-link:hover {
                color: #0a0;
                border-bottom-color: #0a0;
            }
            
            .about-copyright {
                margin-top: 40px;
                padding-top: 20px;
                border-top: 1px solid #0f0;
                font-size: 12px;
                color: #0a0;
                opacity: 0.8;
            }
            
            /* 滚动条样式 */
            .settings-content-area::-webkit-scrollbar {
                width: 8px;
            }
            
            .settings-content-area::-webkit-scrollbar-track {
                background: rgba(0, 20, 0, 0.5);
                border-radius: 4px;
            }
            
            .settings-content-area::-webkit-scrollbar-thumb {
                background: #0f0;
                border-radius: 4px;
            }
            
            .settings-content-area::-webkit-scrollbar-thumb:hover {
                background: #0a0;
            }
            
            /* 响应式调整 */
            @media (max-width: 768px) {
                .settings-tabs {
                    flex-wrap: wrap;
                }
                
                .form-group input[type="text"],
                .form-group input[type="password"],
                .form-group select {
                    max-width: 100%;
                }
                
                .form-actions,
                .kv-controls,
                .update-actions {
                    flex-direction: column;
                }
                
                .action-btn {
                    width: 100%;
                }
            }
        `;
        document.head.appendChild(style);
    },
    
    bindEvents: function() {
        // 选项卡切换
        document.querySelectorAll('.settings-tabs .tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tabName = e.target.dataset.tab;
                this.switchTab(tabName);
            });
        });
        
        // 账号设置按钮
        document.getElementById('btn-save-account').addEventListener('click', () => {
            this.saveAccountSettings();
        });
        
        document.getElementById('btn-test-connection').addEventListener('click', () => {
            this.testConnection();
        });
        
        document.getElementById('btn-logout').addEventListener('click', () => {
            this.logout();
        });
        
        // KV设置按钮
        document.getElementById('btn-sync-now').addEventListener('click', () => {
            this.syncKVNow();
        });
        
        document.getElementById('btn-clear-cache').addEventListener('click', () => {
            this.clearKVCache();
        });
        
        document.getElementById('btn-export-kv').addEventListener('click', () => {
            this.exportKV();
        });
        
        document.getElementById('btn-import-kv').addEventListener('click', () => {
            this.importKV();
        });
        
        document.getElementById('btn-save-kv-settings').addEventListener('click', () => {
            this.saveKVSettings();
        });
        
        // 更新设置按钮
        document.getElementById('btn-check-updates').addEventListener('click', () => {
            this.checkForUpdates();
        });
        
        document.getElementById('btn-download-update').addEventListener('click', () => {
            this.downloadUpdate();
        });
        
        document.getElementById('btn-view-changelog').addEventListener('click', () => {
            this.viewChangelog();
        });
        
        document.getElementById('btn-save-update-settings').addEventListener('click', () => {
            this.saveUpdateSettings();
        });
    },
    
    // 加载设置
    loadSettings: function() {
        // 尝试从localStorage加载设置
        try {
            const savedSettings = localStorage.getItem('JEV_UI_SETTINGS');
            if (savedSettings) {
                const settings = JSON.parse(savedSettings);
                
                // 加载账号设置
                if (settings.account) {
                    if (settings.account.apiKey) document.getElementById('api-key').value = settings.account.apiKey;
                    if (settings.account.workerUrl) document.getElementById('worker-url').value = settings.account.workerUrl;
                    if (settings.account.userName) document.getElementById('user-name').value = settings.account.userName;
                    if (settings.account.department) document.getElementById('department').value = settings.account.department;
                    if (settings.account.autoLogin) document.getElementById('auto-login').checked = settings.account.autoLogin;
                    if (settings.account.rememberCredentials) document.getElementById('remember-credentials').checked = settings.account.rememberCredentials;
                }
                
                // 加载KV设置
                if (settings.kv) {
                    if (settings.kv.syncInterval) document.getElementById('sync-interval').value = settings.kv.syncInterval;
                    if (settings.kv.syncOnStartup) document.getElementById('sync-on-startup').checked = settings.kv.syncOnStartup;
                    if (settings.kv.syncOnChange) document.getElementById('sync-on-change').checked = settings.kv.syncOnChange;
                }
                
                // 加载更新设置
                if (settings.updates) {
                    if (settings.updates.autoCheckUpdates) document.getElementById('auto-check-updates').checked = settings.updates.autoCheckUpdates;
                    if (settings.updates.updateCheckInterval) document.getElementById('update-check-interval').value = settings.updates.updateCheckInterval;
                    if (settings.updates.autoUpdate) document.getElementById('auto-update').checked = settings.updates.autoUpdate;
                }
            }
        } catch (e) {
            console.error('加载设置失败:', e);
        }
    },
    
    // 切换选项卡
    switchTab: function(tabName) {
        // 隐藏所有选项卡内容
        document.querySelectorAll('.settings-content-area .tab-content').forEach(tab => {
            tab.classList.remove('active');
        });
        
        // 移除所有按钮的活跃状态
        document.querySelectorAll('.settings-tabs .tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // 激活选中的选项卡
        const tabContent = document.getElementById(`tab-${tabName}`);
        const tabBtn = document.querySelector(`.settings-tabs .tab-btn[data-tab="${tabName}"]`);
        
        if (tabContent && tabBtn) {
            tabContent.classList.add('active');
            tabBtn.classList.add('active');
        }
    },
    
    // 保存账号设置
    saveAccountSettings: function() {
        const settings = {
            apiKey: document.getElementById('api-key').value,
            workerUrl: document.getElementById('worker-url').value,
            userName: document.getElementById('user-name').value,
            department: document.getElementById('department').value,
            autoLogin: document.getElementById('auto-login').checked,
            rememberCredentials: document.getElementById('remember-credentials').checked
        };
        
        // 保存到localStorage
        this.saveSettings('account', settings);
        alert('账号设置已保存');
    },
    
    // 测试连接
    testConnection: function() {
        const workerUrl = document.getElementById('worker-url').value || 'https://jevshop.workers.dev';
        
        // 显示连接中状态
        const testButton = document.getElementById('btn-test-connection');
        const originalText = testButton.textContent;
        testButton.textContent = '连接中...';
        testButton.disabled = true;
        
        // 模拟连接测试
        setTimeout(() => {
            alert(`连接测试成功！\n服务器地址: ${workerUrl}`);
            testButton.textContent = originalText;
            testButton.disabled = false;
        }, 1500);
    },
    
    // 退出登录
    logout: function() {
        if (confirm('确定要退出登录吗？')) {
            // 清除账号相关设置
            document.getElementById('api-key').value = '';
            document.getElementById('auto-login').checked = false;
            
            // 更新localStorage
            const settings = this.getSettings();
            settings.account = {};
            localStorage.setItem('JEV_UI_SETTINGS', JSON.stringify(settings));
            
            alert('已退出登录');
        }
    },
    
    // 立即同步KV
    syncKVNow: function() {
        const syncButton = document.getElementById('btn-sync-now');
        const originalText = syncButton.textContent;
        syncButton.textContent = '同步中...';
        syncButton.disabled = true;
        
        // 模拟同步过程
        setTimeout(() => {
            // 更新上次同步时间
            const now = new Date().toLocaleString('zh-CN');
            document.getElementById('last-sync').textContent = now;
            
            // 更新数据条目
            const randomCount = Math.floor(Math.random() * 20) + 35;
            document.getElementById('kv-items-count').textContent = randomCount;
            
            alert('KV同步完成');
            syncButton.textContent = originalText;
            syncButton.disabled = false;
        }, 2000);
    },
    
    // 清除缓存
    clearKVCache: function() {
        if (confirm('确定要清除KV缓存吗？这将删除所有本地存储的数据。')) {
            // 模拟清除缓存
            setTimeout(() => {
                document.getElementById('kv-items-count').textContent = '0';
                alert('KV缓存已清除');
            }, 1000);
        }
    },
    
    // 导出KV数据
    exportKV: function() {
        alert('KV数据导出功能将在后续版本中实现');
    },
    
    // 导入KV数据
    importKV: function() {
        alert('KV数据导入功能将在后续版本中实现');
    },
    
    // 保存KV设置
    saveKVSettings: function() {
        const settings = {
            syncInterval: document.getElementById('sync-interval').value,
            syncOnStartup: document.getElementById('sync-on-startup').checked,
            syncOnChange: document.getElementById('sync-on-change').checked
        };
        
        this.saveSettings('kv', settings);
        alert('KV同步设置已保存');
    },
    
    // 检查更新
    checkForUpdates: function() {
        const checkButton = document.getElementById('btn-check-updates');
        const originalText = checkButton.textContent;
        checkButton.textContent = '检查中...';
        checkButton.disabled = true;
        
        // 模拟检查更新
        setTimeout(() => {
            // 更新检查时间
            const now = new Date().toLocaleString('zh-CN');
            document.getElementById('last-check-time').textContent = now;
            
            // 模拟检查结果
            const latestVersion = document.getElementById('latest-version');
            const updateStatus = document.querySelector('.status-value.up-to-date');
            const downloadButton = document.getElementById('btn-download-update');
            
            // 随机决定是否有更新
            const hasUpdate = Math.random() > 0.7; // 30%概率有更新
            
            if (hasUpdate) {
                latestVersion.textContent = 'v1.0.1';
                updateStatus.textContent = '有新版本可用';
                updateStatus.className = 'status-value update-available';
                downloadButton.disabled = false;
                alert('发现新版本 v1.0.1！');
            } else {
                latestVersion.textContent = 'v1.0.0';
                updateStatus.textContent = '已是最新版本';
                updateStatus.className = 'status-value up-to-date';
                downloadButton.disabled = true;
                alert('当前已是最新版本');
            }
            
            checkButton.textContent = originalText;
            checkButton.disabled = false;
        }, 2000);
    },
    
    // 下载更新
    downloadUpdate: function() {
        alert('更新下载功能将在后续版本中实现');
    },
    
    // 查看更新日志
    viewChangelog: function() {
        alert('v1.0.0 更新日志：\n\n1. 新增模块化UI框架\n2. 实现聊天与翻译功能\n3. 添加AI推荐回复功能\n4. 集成图片识别功能\n5. 提供完整的设置管理\n6. 优化黑底绿字视觉风格\n7. 支持窗口拖拽和缩放');
    },
    
    // 保存更新设置
    saveUpdateSettings: function() {
        const settings = {
            autoCheckUpdates: document.getElementById('auto-check-updates').checked,
            updateCheckInterval: document.getElementById('update-check-interval').value,
            autoUpdate: document.getElementById('auto-update').checked
        };
        
        this.saveSettings('updates', settings);
        alert('更新设置已保存');
    },
    
    // 通用设置保存方法
    saveSettings: function(category, data) {
        try {
            const currentSettings = this.getSettings();
            currentSettings[category] = data;
            localStorage.setItem('JEV_UI_SETTINGS', JSON.stringify(currentSettings));
        } catch (e) {
            console.error('保存设置失败:', e);
            alert('保存设置失败');
        }
    },
    
    // 获取所有设置
    getSettings: function() {
        try {
            const settings = localStorage.getItem('JEV_UI_SETTINGS');
            return settings ? JSON.parse(settings) : {};
        } catch (e) {
            console.error('获取设置失败:', e);
            return {};
        }
    }
};

// 导出模块
export default settingsModule;