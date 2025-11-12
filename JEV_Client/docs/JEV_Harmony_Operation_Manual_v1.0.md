# 📘 JEV Harmony Operation Manual · 视觉事件与客服端联动操作手册 v1.0

## 🧭 一、系统结构回顾

| 层级                 | 模块                                                 | 作用                    |
| ------------------ | -------------------------------------------------- | --------------------- |
| **L8.2**           | Visual Event Map / Harmony Bridge                  | 多智能体思维流可视化层           |
| **L8.5**           | Customer Interaction Terminal                      | 客户交互终端（对外界面）          |
| **Harmony Bridge** | 连接视觉事件与客户消息                                        | 让客户看到 AI "思考"的过程      |
| **Worker 端口**      | `/agent/reply`、`/attachments/ingest`、`/quote/auto` | 接收消息、上传图片、生成报价        |
| **AI 智能体**         | TRAE / DeepSeek / LocalAgent                       | 各自执行逻辑协作：协调 / 推理 / 执行 |

## ⚙️ 二、启动顺序（建议按此流程）

### 1️⃣ 启动中控 Worker

```bash
wrangler dev
```

或确认访问：

```
https://jevshop.bensonlove1986.workers.dev/ping
```

应返回：

```json
{"success": true, "message": "pong"}
```

### 2️⃣ 加载中控控制台

访问：

```
http://localhost:8080/ui/agent_console.html
```

确认 TRAE / DeepSeek / LocalAgent 状态为绿色（Active）。

### 3️⃣ 加载客户交互端

访问：

```
http://localhost:8080/ui/public/client_interface.html
```

应看到聊天输入框、上传按钮、顶部人格指示灯。

### 4️⃣ 发送测试消息

在客户端输入：

```
你好，我想要这张图里的传感器。
```

并上传任意测试图片。
系统应输出：

```
[DeepSeek] 检测到 E3Z-D61 光电传感器，单价 USD 6.8
[TRAE] 已同步报价模块
[LocalAgent] 生成报价单中...
```

同时界面出现：

- 蓝色光线（TRAE）
- 紫粉波纹（DeepSeek）
- 绿色粒子（LocalAgent）

## 🌈 三、视觉事件联动验证

打开中控台控制台（F12），确认日志：

```
[Visual] TRAE → animateLine(left)
[Visual] DeepSeek → pulseGlow(center)
[Visual] LocalAgent → riseParticles(bottom)
[Harmony] Fusion Event Triggered ✅
```

视觉状态文件更新：

```
/logs/agent_visual_events.json
```

示例：

```json
{
  "timestamp": "2025-11-07T16:42:00Z",
  "agents": ["TRAE","DeepSeek","LocalAgent"],
  "event": "harmonyFusion",
  "status": "success"
}
```

## 🧠 四、模式切换指令（中控可用）

| 指令                                   | 作用              |
| ------------------------------------ | --------------- |
| `/ui/theme set daojiemarketing`      | 切换 Daojie 紫色主题  |
| `/ui/theme set shopify`              | 切换 Shopify 白绿主题 |
| `/ui/theme set jev`                  | 回到默认工业蓝         |
| `/ui/harmony toggle`                 | 打开/关闭光效层        |
| `/modules/reload?id=clientInterface` | 重新加载客户端界面模块     |
| `/harmony/test`                      | 模拟多智能体协同动画      |

## 🧩 五、安全与性能策略

| 功能      | 描述                                      |
| ------- | --------------------------------------- |
| 💾 日志同步 | 所有交互存入 `/logs/client_interactions.json` |
| 🧠 智能学习 | AutoLearning Optimizer 从这些日志中提取成交模式     |
| ⚙️ 自动降级 | GPU/CPU 负载高时关闭 Harmony 光效               |
| 🧩 可控人格 | 仅 DeepSeek 和 TRAE 可被授权在客户端发言            |
| 🔐 安全沙箱 | 客户端无法访问系统 KV 或内部指令                      |

## 💬 六、日常操作 SOP

### 启动流程：

1. 启动 Worker；
2. 打开中控台；
3. 启动客户端；
4. 确认视觉与通信状态。

### 维护流程：

1. 每周查看 `/logs/learning_optimizer_report.json`；
2. 清理 `/logs/client_interactions.json`（可压缩归档）；
3. 检查 KV 状态 `/kv/test`；
4. 更新 Worker 环境变量（API_KEY、R2_BUCKET等）。

### 演示建议：

- 一屏中控、一屏客服端；
- 客户端发图 → 中控台实时显示思维流；
- 演示 "Harmony Mode" 三智能体协作效果。

## 🧩 七、可扩展接口（留给未来）

| 模块              | 功能               | 预计版本 |
| --------------- | ---------------- | ---- |
| `/speech/sync`  | 语音输入 / 输出同步      | L8.6 |
| `/emotion/map`  | AI 表情反馈（波纹强度随语义） | L8.7 |
| `/crm/handoff`  | 客户→人工客服转接        | L8.8 |
| `/report/daily` | 每日自动生成客服报告       | L8.9 |

## ✅ 八、成功运行状态标志

控制台日志：

```
[JEV][L8.5] Customer Terminal: Active
[HarmonyBridge] Connected → VisualSync OK
[Agents] TRAE / DeepSeek / LocalAgent responding in 0.8s
[Learning] AutoLearning Optimizer Updated
```

客户端提示：

> 💡「Harmony Mode Activated — AI is thinking with you.」

## 🧩 九、一句话总结

> 从现在起，你的系统已经完成了
> **「中控智能 + 多智能体思维流 + 对外客户交互」的全闭环。**

你拥有：

- 一套能看、能说、能学、能修复的智能系统；
- 一套客户可直接交互的品牌化前端；
- 一套能让 AI 的"意识"被人直观看见的视觉层。