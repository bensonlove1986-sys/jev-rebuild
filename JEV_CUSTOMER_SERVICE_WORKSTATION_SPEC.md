# JEV 客服侧高效率工作台 - 产品功能清单与实施规范

## 系统架构概览

```
UI (Web 界面) ↔ Worker (中间层) ↔ Agent(1820)/AI(1822)
```

## 1) 多渠道统一收件箱（Omnichannel Inbox）

### 功能描述
- **支持渠道**：WhatsApp WABA、网页聊天窗（Daojie）、Email（只读/转接）、Facebook/Instagram 私信（可扩展）
- **会话聚合**：按联系人聚合不同渠道的对话串，同一手机号/邮箱自动归并
- **快速筛选**：未读、@我、待回复、超时、已升级、含图片/含报价请求
- **重要度排序**：按最近消息时间 + 客户价值(国家/历史订单/标签)排序
- **SLA 计时**：每个会话显示"首次响应计时""解决时长"，可设置红黄灯阈值

### 接口定义
```
GET /conversations?assignee=me&status=open
POST /log
```

### 数据结构
```javascript
// 会话数据结构
{
  conversation_id: "conv_12345",
  contact_id: "contact_67890",
  channels: ["whatsapp", "webchat"],
  latest_message: {
    text: "你好，我需要报价...",
    timestamp: "2024-01-15T10:30:00Z",
    channel: "whatsapp"
  },
  status: "open",
  assignee: "agent_001",
  tags: ["India", "Sensor", "NewLead"],
  sla: {
    first_response_time: 120, // 秒
    resolution_time: 3600,
    status: "warning" // normal, warning, critical
  },
  unread_count: 2
}
```

## 2) 一键翻译 / 多语言助手

### 功能描述
- **自动识别**：客户语言（支持印地语、乌尔都语、越南语、阿拉伯语、英文等）
- **翻译功能**：单键翻译入站消息为中文；单键把中文回复生成客户语言
- **语气风格**：支持专业/友好/技术向/极简预设

### 交互设计
- 消息气泡内右键「翻译为中文」「回复用客户语言」
- 快捷键：`Alt+T` 翻译入站，`Alt+Shift+T` 翻译出站

### 接口定义
```
POST /task/ai { task:"translate", input, model:"deepseek-chat" }
```

## 3) 图片识别 → 半自动报价

### 功能描述
- **图片识别**：拖入/粘贴图片，自动 OCR 识别型号、品牌、数量、规格
- **结构化**：识别结果结构化到临时报价表（可编辑）
- **匹配功能**：一键匹配品类/品牌（JEV 自有/兼容替代）
- **自动补齐**：常见电压/接口/线长/保护等级等缺省项
- **多币种换算**：USD/CNY/INR/PKR/BDT/VND/MYR/DZD，支持费率缓存与手改

### 流程定义
1. 客户发图 → R2 存储（`uploads/`）
2. `POST /task/ai { task:"ocr_extract", url }` → 返回结构化 JSON
3. `POST /ocr/result` 保存结果
4. UI 填入「报价草稿」

### 数据结构
```javascript
// OCR 识别结果
{
  items: [
    {
      brand: "SICK",
      model: "WL100-2P430",
      quantity: 5,
      spec: "Photoelectric Sensor",
      voltage: "24V DC",
      ip_rating: "IP67"
    }
  ],
  confidence: 0.92
}
```

## 4) 报价助手（Quote Builder）

### 功能描述
- **模板化报价**：轻报价（聊天内短格式）/正式PI（含抬头、条款、银行信息）
- **成本计算**：进货价 + 包装 + 管理/渠道 + 物流（实重/材积重、DDU/DDP）→ 自动毛利
- **一键生成**：
  * 聊天用短报价（多语言）
  * PDF/Word 版 PI（自动编号、时间戳、付款方式、有效期）
  * 付款链接（占位）

### 接口定义
```
POST /task/ai { task:"quote_draft", items:[...] }
POST /r2/upload
```

### 数据结构
```javascript
// 行项目字段
{
  sku: "SICK-WL100-2P430",
  brand: "SICK",
  model: "WL100-2P430",
  spec: "Photoelectric Sensor, 24V DC, IP67",
  qty: 5,
  unit_price: 85.50,
  currency: "USD",
  lead_time: "10-15 days",
  warranty: "12 months",
  alt_model: "WL100-2N130",
  cost_price: 65.00,
  packaging: 2.50,
  logistics: 8.00
}
```

## 5) 智能话术 & 模板（Snippets / Canned Responses）

### 功能描述
- **分类**：首次问候、报价引导、索取规格、支付说明、售后保障、物流说明、跟进提醒
- **自动变量**：`{{customer_name}} {{country}} {{lead_time}} {{quote_no}}`
- **多语言同步**：点击语言切换，自动保持语义一致

### 接口定义
```
GET/POST /ui/snippets
POST /task/ai { task:"localize_snippet", tone:"friendly" }
```

### 数据结构
```javascript
// 模板结构
{
  snippet_id: "greeting_001",
  category: "greeting",
  text: "Hello {{customer_name}}, thank you for contacting us from {{country}}.",
  variables: ["customer_name", "country"],
  translations: {
    "zh": "您好{{customer_name}}，感谢您从{{country}}联系我们。",
    "hi": "नमस्ते {{customer_name}}，{{country}} से हमसे संपर्क करने के लिए धन्यवाद।"
  },
  tone: "friendly"
}
```

## 6) 24小时规则/消息模板（WhatsApp WABA 合规）

### 功能描述
- **会话窗口倒计时**：显示距离 24h 关闭还剩多久
- **模板消息**：过期后仅允许模板消息（HSM）发送；支持模板库 & 动态变量
- **超时提醒**：会话标红 + 按钮"发送模板消息"

### 接口定义
```
GET /conversations/:id/window
POST /whatsapp/send_template { template_id, lang, params }
```

## 7) 标签与自动路由（Routing / Tagging）

### 功能描述
- **自动标签**：来自国家/语言/产品线自动打标签
- **智能分配**：按国家/时区把会话分配到对应客服组
- **手动转交**：附带转交备注

### 接口定义
```
POST /log
POST /agents/register
```

## 8) 客户档案卡（Customer 360）

### 功能描述
- **基本信息**：姓名、国家/城市、WhatsApp、邮箱、公司
- **历史**：对话数、下单历史、平均客单价、上次询价时间
- **潜力评分**：AI 基于用词/频率/国家/品类给出 0–100 分与成交概率
- **待办**：当前报价单、待确认项、催款/回访时间

### 接口定义
```
GET /customer/:id
POST /task/ai { task:"lead_score", transcript:[...] }
```

### 数据结构
```javascript
// 客户档案
{
  customer_id: "contact_67890",
  name: "Raj Patel",
  country: "India",
  city: "Mumbai",
  whatsapp: "+919876543210",
  email: "raj@example.com",
  company: "ABC Industries",
  conversation_count: 8,
  order_history: ["PO-2023-123", "PO-2023-456"],
  avg_order_value: 2500,
  last_inquiry: "2024-01-10T08:30:00Z",
  lead_score: 78,
  closing_probability: 0.65,
  todos: ["等待规格确认", "发送更新报价"]
}
```

## 9) 物流/税务/合规模块（边报边答）

### 功能描述
- **物流费估算**：国家 + 重量/体积 → DHL/UPS 估算
- **关税/HS Code**：常见工业品经验规则 + 免责声明
- **发货周期**：依据库存/采购周期，自动计算预计出货日 & 到达日

### 接口定义
```
POST /task/ai { task:"shipping_est", country, weight, volume, incoterm }
```

## 10) 跟进提醒 & 自动化

### 功能描述
- **提醒机制**："未回复10分钟"提醒、3天未成交自动跟进脚本（多语言）
- **催清单**：客户未补充规格时的自动追问
- **回访模板**：成交后7天/30天回访

### 接口定义
```
POST /ui/heartbeat
```

## 11) 内容库 / 数据表单

### 功能描述
- **规格问卷**：常见规格问卷（多语言表单）一键发送
- **技术资料**：规格图/接线图/安装示意一键发送

### 接口定义
```
GET /r2/list?prefix=kb/
GET /r2/get?key=kb/xxx.png
```

## 12) 附件与文件

### 功能描述
- **文件存储**：聊天文件自动存 R2，生成可分享短链（带过期时间）
- **图片处理**：自动压缩+加水印（可选）再发客户
- **PDF合并**：客户发来的多张图→自动合并为 PDF

### 接口定义
```
POST /upload
POST /r2/transform
```

## 13) 情绪/意图识别（优先级排序）

### 功能描述
- **情绪识别**：消息实时情绪分析，愤怒/紧急/困惑→对话置顶
- **意图分类**：报价/售后/投诉/催货/技术咨询

### 接口定义
```
POST /task/ai { task:"intent_and_sentiment", text }
```

### 数据结构
```javascript
// 情绪意图识别结果
{
  sentiment: "angry", // happy, neutral, frustrated, angry, urgent
  intent: "complaint", // quote, support, complaint, follow_up, technical
  confidence: 0.85,
  priority: "high",
  suggested_response: "I apologize for the inconvenience. Let me check this for you immediately."
}
```

## 14) 审批/协作

### 功能描述
- **审批流程**：报价超权限→主管审批（弹窗@主管；通过后自动回填）
- **内部协作**：会话内@同事，生成内部备注（客户不可见）

### 接口定义
```
POST /log { level:"approval", message }
POST /r2/save { key:"approvals/...", json }
```

## 15) 键盘快捷键 & 宏

### 功能描述
- **常用快捷键**：`R` 回复、`G` 插入问候、`Q` 新建报价、`Ctrl+Enter` 发送、`/` 打开命令面板
- **自定义宏**：`/pi` 生成 PI；`/addr` 插入公司收款信息；`/ship` 询问发货方式

### 接口定义
```
GET/POST /ui/shortcuts
```

## 16) 实时看板 & 统计

### 功能描述
- **个人统计**：处理会话数、首次响应时间、平均解决时长、转化率
- **团队统计**：渠道分布、国家分布、热门品类、毛利贡献
- **问题热词**：基于 AI 摘要统计客户问得最多的规格/痛点

### 接口定义
```
GET /status
GET /log?source=...
```

## 17) 安全与合规

### 功能描述
- **操作审计**：导出操作日志
- **权限控制**：按角色限制操作权限
- **数据脱敏**：敏感字段掩码显示

## 18) 断网/降级策略

### 功能描述
- **降级方案**：Worker 不可用→降级到本地直连；本地离线→保持只读
- **自动重连**：5s→15s→30s→60s→5min 指数退避

## 界面布局详细规范

### 顶栏（固定）
- Worker🟢 / Agent🟢 / AI🟢 状态指示器
- 24h窗口倒计时
- R2用量监控
- "检测连接/刷新"按钮
- 主题切换
- 当前客服信息

### 左列（客户列表）
- 搜索框（支持客户名/国家/标签/关键词）
- 筛选器（未读/待回复/含图片/模板可用）
- 列表项：
  * 国家旗帜
  * 客户名称/公司
  * 标签（彩色）
  * 最后一句摘要
  * SLA状态灯（绿/黄/红）
  * 未读数标记

### 中列（对话区）
- 消息气泡（区分渠道来源）
- 翻译按钮（每条消息右上角）
- "抽取型号/规格"按钮（图片消息下方）
- 附件条（显示R2链接，支持预览）
- 底部输入框：
  * 模板/变量插入下拉菜单
  * AI润色按钮
  * 发送按钮（支持客户语言选择）
  * 文件上传按钮

### 右列（功能侧栏）
- 客户档案卡（可编辑）
- 报价草稿表（可加行/删行/自动计算）
- 物流估算卡
- 模板库（分类显示，支持搜索）
- 待办/提醒列表

### 底部浮动
- "一键生成 PI"
- "一键发送模板"
- "发送替代型号方案"

## 核心接口映射

### 统一请求头
```
X-Auth-Key: JEV_2025_AI_SYS_A92jskL0xY
Content-Type: application/json
```

### 详细接口清单

1. **翻译接口**
```
POST /task/ai
{
  "task": "translate",
  "input": "Hello world",
  "lang_to": "zh"
}
```

2. **OCR 提取接口**
```
POST /task/ai
{
  "task": "ocr_extract",
  "url": "https://r2.example.com/uploads/image1.jpg"
}

POST /ocr/result
{
  "conversation_id": "conv_12345",
  "result": {...}
}
```

3. **报价草稿接口**
```
POST /task/ai
{
  "task": "quote_draft",
  "items": [...],
  "format": "light"
}
```

4. **指令转发接口**
```
POST /agent/command
{
  "command": "open_folder",
  "args": ["D:\\JEV\\quotes"]
}
```

5. **模板发送接口**
```
POST /whatsapp/send_template
{
  "template_id": "follow_up_001",
  "lang": "hi",
  "params": {"customer_name": "Raj", "days": "3"}
}
```

6. **文件上传接口**
```
POST /upload
(FormData with file)
```

7. **日志接口**
```
POST /log
{
  "source": "control_panel",
  "level": "info",
  "message": "Quote sent to customer",
  "conversation_id": "conv_12345"
}
```

8. **心跳接口**
```
POST /ui/heartbeat
{
  "ui_id": "ui_abc123",
  "linked_agent": "agent_001",
  "active_conversation": "conv_12345"
}
```

9. **状态查询接口**
```
GET /status
GET /agents
GET /log?source=control_panel&limit=50
```

## 部署与集成说明

### 前端部署
1. 静态文件部署到 Cloudflare Pages 或兼容的静态托管服务
2. 配置 CORS 允许 Worker 域名访问
3. 支持 PWA 安装

### Worker 部署
1. 部署到 Cloudflare Workers
2. 配置 KV 命名空间：`jevui`（存储模板、快捷键等）
3. 配置 R2 存储桶：用于文件存储
4. 设置环境变量：
   * `JEV_API_KEY`
   * `AI_SERVICE_URL`
   * `AGENT_SERVICE_URL`

### Agent/AI 服务部署
1. 确保 1820 (Agent) 和 1822 (AI) 服务正常运行
2. 配置防火墙允许 Worker IP 访问
3. 实现必要的认证机制

## 性能与安全考虑

### 性能优化
1. 使用 WebSocket 保持实时连接
2. 实现消息批量处理
3. 缓存常用数据（汇率、模板、产品信息）
4. 图片懒加载与压缩

### 安全措施
1. 所有接口强制使用 HTTPS
2. API Key 定期轮换
3. 敏感操作记录审计日志
4. 实施速率限制防止滥用

## 后续功能规划

1. 集成支付系统
2. 自动生成合同
3. 客户满意度调查
4. 高级报表与分析
5. 移动端适配

---

本规范文档作为 JEV 客服侧高效率工作台的产品功能清单与实施规范，详细定义了所有功能需求、接口规范、数据结构和界面布局，可直接用于指导开发团队进行实施。