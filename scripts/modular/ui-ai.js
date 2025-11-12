// JEV 智能客服插件 - AI推荐模块
const aiModule = {
    init: function(container) {
        console.log('初始化AI推荐模块');
        this.container = container;
        this.render();
        this.bindEvents();
        // 生成模拟推荐
        this.generateRecommendations();
    },
    
    render: function() {
        const aiRecommendations = document.getElementById('ai-recommendations');
        aiRecommendations.innerHTML = `
            <div class="ai-recommendations-container">
                <div class="ai-header">
                    <h4>AI推荐回复建议</h4>
                    <div class="ai-stats">
                        <span>推荐准确率：98%</span>
                        <span>响应速度：0.8s</span>
                    </div>
                </div>
                
                <div class="recommendations-grid">
                    <div class="recommendation-card" id="rec-card-1">
                        <div class="rec-header">
                            <span class="rec-label">推荐 1</span>
                            <span class="rec-confidence">置信度：95%</span>
                        </div>
                        <div class="rec-content" id="rec-content-1">
                            <!-- 推荐内容将动态生成 -->
                        </div>
                        <div class="rec-actions">
                            <button class="rec-btn adopt-btn" data-rec="1">采纳</button>
                            <button class="rec-btn modify-btn" data-rec="1">修改</button>
                        </div>
                    </div>
                    
                    <div class="recommendation-card" id="rec-card-2">
                        <div class="rec-header">
                            <span class="rec-label">推荐 2</span>
                            <span class="rec-confidence">置信度：87%</span>
                        </div>
                        <div class="rec-content" id="rec-content-2">
                            <!-- 推荐内容将动态生成 -->
                        </div>
                        <div class="rec-actions">
                            <button class="rec-btn adopt-btn" data-rec="2">采纳</button>
                            <button class="rec-btn modify-btn" data-rec="2">修改</button>
                        </div>
                    </div>
                    
                    <div class="recommendation-card" id="rec-card-3">
                        <div class="rec-header">
                            <span class="rec-label">推荐 3</span>
                            <span class="rec-confidence">置信度：82%</span>
                        </div>
                        <div class="rec-content" id="rec-content-3">
                            <!-- 推荐内容将动态生成 -->
                        </div>
                        <div class="rec-actions">
                            <button class="rec-btn adopt-btn" data-rec="3">采纳</button>
                            <button class="rec-btn modify-btn" data-rec="3">修改</button>
                        </div>
                    </div>
                </div>
                
                <div class="ai-footer">
                    <div class="analysis-info">
                        <h5>客户意图分析</h5>
                        <div id="intent-analysis" class="intent-analysis">
                            <!-- 意图分析将动态生成 -->
                        </div>
                    </div>
                    <div class="ai-actions">
                        <button id="btn-refresh-recommendations" class="refresh-btn">🔄 刷新推荐</button>
                        <button id="btn-view-history" class="history-btn">📋 历史记录</button>
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
            .ai-recommendations-container {
                height: 100%;
                display: flex;
                flex-direction: column;
            }
            
            .ai-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 20px;
                padding-bottom: 10px;
                border-bottom: 1px solid #0f0;
            }
            
            .ai-header h4 {
                margin: 0;
                color: #0f0;
                font-size: 16px;
            }
            
            .ai-stats {
                display: flex;
                gap: 20px;
                font-size: 12px;
                color: #0a0;
            }
            
            .recommendations-grid {
                display: grid;
                grid-template-columns: 1fr;
                gap: 15px;
                flex: 1;
                overflow-y: auto;
                margin-bottom: 20px;
            }
            
            .recommendation-card {
                border: 1px solid #0f0;
                border-radius: 6px;
                padding: 15px;
                background: rgba(0, 20, 0, 0.3);
                transition: all 0.3s;
            }
            
            .recommendation-card:hover {
                box-shadow: 0 0 15px rgba(0, 255, 0, 0.2);
                border-color: rgba(0, 255, 0, 0.8);
            }
            
            .rec-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 10px;
            }
            
            .rec-label {
                font-weight: bold;
                color: #0f0;
                font-size: 14px;
            }
            
            .rec-confidence {
                font-size: 12px;
                color: #0a0;
                background: rgba(0, 255, 0, 0.1);
                padding: 2px 8px;
                border-radius: 12px;
            }
            
            .rec-content {
                min-height: 60px;
                margin-bottom: 10px;
                font-size: 14px;
                line-height: 1.5;
            }
            
            .rec-actions {
                display: flex;
                gap: 10px;
                justify-content: flex-end;
            }
            
            .rec-btn {
                background: transparent;
                border: 1px solid #0f0;
                color: #0f0;
                padding: 4px 12px;
                border-radius: 4px;
                cursor: pointer;
                transition: all 0.3s;
                font-size: 12px;
            }
            
            .rec-btn:hover {
                background: rgba(0, 255, 0, 0.2);
                box-shadow: 0 0 6px rgba(0, 255, 0, 0.5);
            }
            
            .adopt-btn {
                background: rgba(0, 255, 0, 0.1);
            }
            
            .ai-footer {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                padding-top: 15px;
                border-top: 1px solid #0f0;
            }
            
            .analysis-info {
                flex: 1;
                margin-right: 20px;
            }
            
            .analysis-info h5 {
                margin: 0 0 10px 0;
                color: #0f0;
                font-size: 14px;
            }
            
            .intent-analysis {
                background: rgba(0, 255, 0, 0.05);
                border: 1px dashed #0f0;
                border-radius: 4px;
                padding: 10px;
                font-size: 13px;
                min-height: 40px;
            }
            
            .ai-actions {
                display: flex;
                flex-direction: column;
                gap: 10px;
            }
            
            .refresh-btn,
            .history-btn {
                background: transparent;
                border: 1px solid #0f0;
                color: #0f0;
                padding: 8px 16px;
                border-radius: 4px;
                cursor: pointer;
                transition: all 0.3s;
                font-size: 13px;
            }
            
            .refresh-btn:hover,
            .history-btn:hover {
                background: rgba(0, 255, 0, 0.2);
                box-shadow: 0 0 8px rgba(0, 255, 0, 0.5);
            }
            
            .refresh-btn {
                background: rgba(0, 255, 0, 0.1);
                font-weight: bold;
            }
            
            /* 滚动条样式 */
            .recommendations-grid::-webkit-scrollbar {
                width: 8px;
            }
            
            .recommendations-grid::-webkit-scrollbar-track {
                background: rgba(0, 20, 0, 0.5);
                border-radius: 4px;
            }
            
            .recommendations-grid::-webkit-scrollbar-thumb {
                background: #0f0;
                border-radius: 4px;
            }
            
            .recommendations-grid::-webkit-scrollbar-thumb:hover {
                background: #0a0;
            }
            
            /* 响应式调整 */
            @media (min-width: 768px) {
                .recommendations-grid {
                    grid-template-columns: repeat(3, 1fr);
                }
            }
        `;
        document.head.appendChild(style);
    },
    
    bindEvents: function() {
        // 绑定刷新推荐按钮
        document.getElementById('btn-refresh-recommendations').addEventListener('click', () => {
            this.refreshRecommendations();
        });
        
        // 绑定历史记录按钮
        document.getElementById('btn-view-history').addEventListener('click', () => {
            this.viewHistory();
        });
        
        // 绑定采纳按钮
        document.querySelectorAll('.adopt-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const recId = e.target.dataset.rec;
                this.adoptRecommendation(recId);
            });
        });
        
        // 绑定修改按钮
        document.querySelectorAll('.modify-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const recId = e.target.dataset.rec;
                this.modifyRecommendation(recId);
            });
        });
    },
    
    // 生成模拟推荐
    generateRecommendations: function() {
        // 模拟推荐内容
        const recommendations = [
            {
                content: '您好！感谢您对我们AI客服解决方案的关注。针对您的需求，我推荐我们的企业版解决方案，它提供完整的API集成、自定义训练和优先支持服务。价格方面，我们提供灵活的订阅模式，起价为每月¥5,000。您希望我为您安排产品演示吗？',
                intent: '客户主要关注产品定价和集成方案，表现出明确的购买意向。建议提供具体价格区间和集成细节，并主动推进销售流程。'
            },
            {
                content: '非常高兴为您介绍我们的AI客服产品。对于系统集成问题，我们支持多种标准接口，包括REST API、Webhook和常用CRM系统的直接对接。我们的技术团队可以提供完整的集成文档和免费的集成支持服务。您目前使用的是什么系统呢？',
                intent: '客户关心系统兼容性和集成难度，属于技术评估阶段。需要提供具体的技术细节和成功案例，消除客户疑虑。'
            },
            {
                content: '您好！关于免费试用，我们提供14天的全功能体验期，无需信用卡。试用期间，您可以测试所有核心功能，包括智能问答、多轮对话和数据分析。此外，我们还提供专业的实施顾问一对一指导。您可以在我们的官网直接注册，或者我帮您安排专属客户经理为您服务。',
                intent: '客户处于初期了解阶段，对产品效果存在顾虑。提供低风险的试用方案和专业支持，有助于促进客户尝试。'
            }
        ];
        
        // 更新推荐内容
        recommendations.forEach((rec, index) => {
            const recId = index + 1;
            const contentElement = document.getElementById(`rec-content-${recId}`);
            if (contentElement) {
                contentElement.textContent = rec.content;
            }
        });
        
        // 更新意图分析
        const intentElement = document.getElementById('intent-analysis');
        if (intentElement) {
            intentElement.textContent = recommendations[0].intent;
        }
    },
    
    // 刷新推荐
    refreshRecommendations: function() {
        // 显示加载状态
        document.querySelectorAll('.rec-content').forEach(el => {
            el.textContent = '正在生成新推荐...';
        });
        
        // 模拟刷新延迟
        setTimeout(() => {
            // 生成新的模拟推荐
            const newRecommendations = [
                '根据您的需求，我建议您考虑我们的标准版AI客服解决方案，它包含基础的智能问答功能，每月仅需¥2,000。如果您的业务增长，可以随时升级到企业版。我们还提供30天无理由退款保证，让您可以放心试用。',
                '我们的AI客服系统部署非常灵活，可以选择云端SaaS模式或本地部署。云端模式即开即用，本地部署则提供更高的数据安全性。根据您的业务规模，我可以为您定制最合适的方案。您更倾向于哪种部署方式呢？',
                '关于客户支持，我们提供7×24小时的技术支持服务。对于企业客户，我们还提供专属客户经理和优先响应机制。我们的平均问题解决时间不超过30分钟，客户满意度达到95%以上。您有任何具体问题，我都可以为您解答。'
            ];
            
            // 更新推荐内容
            newRecommendations.forEach((rec, index) => {
                const recId = index + 1;
                const contentElement = document.getElementById(`rec-content-${recId}`);
                if (contentElement) {
                    contentElement.textContent = rec;
                }
            });
            
            // 更新置信度
            const confidenceValues = ['92%', '88%', '85%'];
            document.querySelectorAll('.rec-confidence').forEach((el, index) => {
                el.textContent = `置信度：${confidenceValues[index]}`;
            });
        }, 1200);
    },
    
    // 采纳推荐
    adoptRecommendation: function(recId) {
        const contentElement = document.getElementById(`rec-content-${recId}`);
        if (contentElement) {
            const recommendationText = contentElement.textContent;
            
            // 显示采纳成功提示
            const cardElement = document.getElementById(`rec-card-${recId}`);
            cardElement.style.boxShadow = '0 0 20px rgba(0, 255, 0, 0.5)';
            cardElement.style.borderColor = '#0f0';
            
            // 模拟复制到聊天模块
            console.log('推荐已采纳:', recommendationText);
            
            // 3秒后恢复样式
            setTimeout(() => {
                cardElement.style.boxShadow = '';
                cardElement.style.borderColor = '';
            }, 3000);
            
            // 切换到聊天模块
            if (window.JEV_UI && window.JEV_UI.switchModule) {
                window.JEV_UI.switchModule('chat');
                // 尝试将推荐内容设置到聊天输入框
                const replyTextarea = document.getElementById('reply-textarea');
                if (replyTextarea) {
                    replyTextarea.value = recommendationText;
                }
            }
        }
    },
    
    // 修改推荐
    modifyRecommendation: function(recId) {
        const contentElement = document.getElementById(`rec-content-${recId}`);
        if (contentElement) {
            const currentText = contentElement.textContent;
            
            // 切换到可编辑状态
            const textarea = document.createElement('textarea');
            textarea.value = currentText;
            textarea.className = 'rec-edit-textarea';
            textarea.style.width = '100%';
            textarea.style.height = '100px';
            textarea.style.border = '1px solid #0f0';
            textarea.style.borderRadius = '4px';
            textarea.style.background = 'rgba(0, 10, 0, 0.5)';
            textarea.style.color = '#0f0';
            textarea.style.padding = '8px';
            textarea.style.fontFamily = 'inherit';
            textarea.style.fontSize = '14px';
            
            // 保存原内容
            contentElement.dataset.originalContent = currentText;
            contentElement.innerHTML = '';
            contentElement.appendChild(textarea);
            textarea.focus();
            
            // 创建保存和取消按钮
            const actionsDiv = document.createElement('div');
            actionsDiv.className = 'edit-actions';
            actionsDiv.innerHTML = `
                <button class="save-btn" data-rec="${recId}">保存</button>
                <button class="cancel-btn" data-rec="${recId}">取消</button>
            `;
            
            // 添加按钮样式
            const style = document.createElement('style');
            style.textContent = `
                .edit-actions {
                    display: flex;
                    gap: 10px;
                    margin-top: 10px;
                    justify-content: flex-end;
                }
                .save-btn, .cancel-btn {
                    background: transparent;
                    border: 1px solid #0f0;
                    color: #0f0;
                    padding: 4px 12px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 12px;
                }
                .save-btn:hover, .cancel-btn:hover {
                    background: rgba(0, 255, 0, 0.2);
                }
                .save-btn {
                    background: rgba(0, 255, 0, 0.1);
                }
            `;
            document.head.appendChild(style);
            
            contentElement.appendChild(actionsDiv);
            
            // 绑定保存按钮事件
            document.querySelector(`.save-btn[data-rec="${recId}"]`).addEventListener('click', () => {
                const newText = textarea.value;
                contentElement.innerHTML = newText;
            });
            
            // 绑定取消按钮事件
            document.querySelector(`.cancel-btn[data-rec="${recId}"]`).addEventListener('click', () => {
                contentElement.innerHTML = contentElement.dataset.originalContent;
            });
        }
    },
    
    // 查看历史记录
    viewHistory: function() {
        alert('查看历史记录功能将在后续版本中实现');
        // 实际实现中应该显示历史推荐记录的弹窗
    }
};

// 导出模块
export default aiModule;