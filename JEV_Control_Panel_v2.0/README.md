# 🧠 JEV 智能自动化系统 v2.0 Pro (L6.0)

> 遵循模块化架构原则的在线服务助手中控系统

## 📁 项目结构

```
JEV_Control_Panel_v2.0/
 ├── core/                  # 核心逻辑层（通用功能）
 │   ├── config.js          # 全局配置（端口、刷新间隔、API密钥）
 │   ├── api.js             # 所有外部接口封装（统一fetch请求）
 │   ├── logger.js          # 日志模块（系统日志、本地存储、导出功能）
 │   ├── agents.js          # 服务与AI实例状态管理
 │   ├── strategy.js        # 策略与AI决策模块（AI↔人工切换规则）
 │   └── utils.js           # 公共工具函数（时间格式化、随机ID等）
 │
 ├── modules/               # 功能模块层
 │   ├── dashboard.js       # 控制面板UI逻辑（中控核心）
 │   ├── alert.js           # 告警、监控与断线检测
 │   └── analytics.js       # 数据分析与统计模块
 │
 ├── assets/                # 前端资源层
 │   ├── style.css          # 全局样式（深色卡片主题）
 │   └── icons/             # 图标文件
 │
 ├── main.js                # 启动入口
 ├── index.html             # 调试入口
 └── README.md              # 模块说明
```

## 🧩 模块职责说明

### Core 层

| 模块 | 主要职责 | 文件位置 |
|------|---------|----------|
| Config | 集中管理所有配置项 | core/config.js |
| API | 封装所有外部接口请求 | core/api.js |
| Logger | 日志记录与管理 | core/logger.js |
| AgentManager | 客服实例管理 | core/agents.js |
| StrategyManager | 智能策略决策 | core/strategy.js |
| Utils | 通用工具函数 | core/utils.js |

### Modules 层

| 模块 | 主要职责 | 文件位置 |
|------|---------|----------|
| Dashboard | UI渲染与交互 | modules/dashboard.js |
| AlertManager | 监控与告警 | modules/alert.js |
| AnalyticsManager | 数据统计与分析 | modules/analytics.js |

## 🔧 使用方法

### 1. 安装依赖

```bash
# 确保 Node.js 环境
npm install
```

### 2. 启动服务

1. 首先启动 AI 服务端（Python）：
```bash
cd d:\PDF转网页
python jev_ai_service.py
```

2. 启动客服代理：
```bash
cd d:\PDF转网页
powershell -ExecutionPolicy Bypass -File start_agent.ps1
```

3. 打开控制面板：
```bash
cd d:\PDF转网页\JEV_Control_Panel_v2.0
start index.html
```

## ⚙️ 配置说明

所有配置项集中在 `core/config.js` 文件中：

- `API_BASE`: API服务地址（默认：http://localhost:1822）
- `REFRESH_INTERVAL`: 数据刷新间隔（毫秒）
- `HEARTBEAT_INTERVAL`: 心跳检测间隔（毫秒）
- `DEFAULT_MODE`: 默认模式（AI/Human）
- `THEME`: 界面主题（dark/light）
- `CHANNELS`: 支持的通信渠道

## 📋 开发规范

### 模块化原则

1. **职责单一**：每个文件只负责一个功能
2. **独立加载**：模块可独立运行和测试
3. **可替换性**：模块之间低耦合，易于替换
4. **可扩展性**：支持新增功能模块

### 代码规范

1. 所有配置项从 `config.js` 读取，禁止硬编码
2. 所有API请求通过 `api.js` 统一处理
3. UI交互逻辑在 `modules` 层实现
4. 模块间通信使用事件总线或回调
5. 每个文件头部添加标准文档注释

## 🤝 模块通信

模块之间通过以下方式通信：

1. **事件总线**：使用 `window.dispatchEvent` 发布事件
   ```js
   // 发布事件
   window.dispatchEvent(new CustomEvent('jev:agent:updated', { detail: agents }));
   
   // 订阅事件
   window.addEventListener('jev:agent:updated', (e) => {
     const agents = e.detail;
     // 处理更新
   });
   ```

2. **模块导出**：通过单例模式导出模块实例
   ```js
   // 导入模块
   import dashboard from './modules/dashboard.js';
   
   // 调用方法
   dashboard.refreshData();
   ```

## 📝 版本历史

- **L6.0**：重构为模块化架构，支持多渠道接入，集成KV存储功能
- **v2.0 Pro**：增加AI策略管理、数据分析功能
- **v1.0**：基础版客服中控系统

## 📦 后续计划

1. 添加邮件模块（modules/mailer.js）
2. 添加微信接入模块（modules/wechat.js）
3. 添加WhatsApp渠道（modules/whatsapp.js）
4. 扩展Cloudflare Worker支持
5. 扩展KV存储功能，支持批量操作和数据迁移
6. 添加KV数据可视化和监控工具

## 💾 KV存储功能说明

### 功能概述
JEV系统集成了Cloudflare KV存储功能，用于实现：
- UI状态持久化（当前选中分区、模式、主题等）
- 系统配置项保存
- 客服状态摘要存储
- 跨会话数据共享

### 使用方法

#### API接口调用
```javascript
// 保存数据到KV存储
await API.kvSet('ui:last_open_panel', 'service');

// 从KV存储读取数据
const lastPanel = await API.kvGet('ui:last_open_panel');

// 删除KV存储中的数据
await API.kvDel('ui:last_open_panel');

// 批量获取数据
const configData = await API.kvGetBatch(['system:config', 'ui:settings']);

// 批量保存数据
await API.kvSetBatch({
  'system:config': { refreshInterval: 30000 },
  'ui:settings': { theme: 'dark' }
});
```

#### KV测试工具
系统提供了KV功能测试演示页面：
- **kv_test_demo.html**: 可视化测试KV连接状态、读写功能和性能
- **test_kv_demo.js**: 命令行测试脚本，验证KV接口可用性

### 配置说明
KV存储功能在`core/config.js`中可配置：
```javascript
// 在CONFIG对象中可添加以下配置
KV_ENABLED: true,  // 是否启用KV功能
KV_PREFIX: 'jev:'  // KV键名前缀
```

### 故障排查
如遇到KV连接问题，请：
1. 访问`kv_test_demo.html`检查连接状态
2. 确保Cloudflare Worker已正确绑定KV命名空间
3. 验证Worker URL配置是否正确
4. 使用测试页面的"自动修复KV绑定"功能

### 降级方案
当KV服务不可用时，系统会自动降级到localStorage存储，确保基础功能可用。

---

*本项目遵循模块化设计原则，确保代码可维护性和可扩展性。*