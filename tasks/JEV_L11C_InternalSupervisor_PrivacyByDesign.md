# JEV L11C · 中控内部监控插件（Privacy-by-Design）

**目标**：在不采集任何个人隐私与消息内容的前提下，实现对系统健康（Worker/KV/R2/AI/客服插件）的**实时可视化监控 + 异常检测 + 自修复 + 合规留痕**。
**范围**：仅用于公司内部运营与试运行阶段；**不对外上报**、**不跨域输出**任何监控数据。

---

## 1) 隐私与合规红线

1. **不记录消息内容**：禁止存储/传输 customer text、media body、email、phone 等内容字段。
2. **身份脱敏**：客服、客户仅用匿名 ID（`agent_id`, `customer_tag`）表示，禁止真实姓名/手机号。
3. **最小化采集**：仅采集**事件级**指标（计数、延迟、状态），不采集原文内容。
4. **传输安全**：所有上报走 **HTTPS + Bearer Token**，拒绝无 Token 请求（返回 403）。
5. **存储策略**：监控日志默认 **KV 30 天保留**，到期自动清理；重要快照可选 **R2 备份**。
6. **内部使用**：UI 顶部显著标注“**内部监控（试运行）**”；不开放跨域查询。
7. **可审计**：所有检测结果与自修复动作记录到 KV（只存事件摘要）。

---

## 2) 监控总体结构

```
[ 中控 jev_panel.html ]
  ├─ 🛰️ Supervisor Panel（系统健康汇总）
  ├─ ⚠️ Alerts Feed（异常事件流）
  └─ 📊 Usage Monitor（KV/R2 资源用量）

        │ 内部 API 调用（HTTPS + Token）
        ▼
[ Worker /supervisor-* API ]
  ├─ /supervisor-status  → 健康快照（合规汇总字段）
  ├─ /system-usage       → KV/R2 用量（非敏感统计）
  ├─ /alert-log          → 异常队列（仅摘要）
  ├─ /cleanup-supervisor → 定时清理过期日志（≥30天）
  └─ /restart-module     → 自修复入口（AI/Agent）
```

---

## 3) 数据模型（只允许如下字段）

### 3.1 事件上报

```json
{
  "event_type": "agent_heartbeat | message_sent | ai_request | ai_failure | kv_write_error | r2_quota_warning",
  "agent_id": "agent_Alice",
  "customer_tag": "cust_48219",
  "count": 1,
  "latency_ms": 240,
  "status": "ok | warn | error",
  "timestamp": "2025-11-06T16:12:33Z"
}
```

### 3.2 Supervisor 状态快照

```json
{
  "system": "JEV",
  "worker_uptime": "3h 45m",
  "ai_calls_hour": 16,
  "ai_failures_hour": 0,
  "kv_reads_min": 22,
  "kv_writes_min": 5,
  "r2_space_mb": 72.5,
  "agents_online": 3,
  "alerts_active": 0,
  "status": "ok | warn | error",
  "timestamp": "2025-11-06T16:12:00Z"
}
```

### 3.3 异常日志

```json
{
  "type": "ai_timeout | agent_offline | kv_anomaly | r2_over_quota",
  "severity": "low | medium | high",
  "agent_id": "agent_Bob",
  "info": "consecutive timeouts: 5",
  "time": "2025-11-06T16:15:02Z"
}
```

---

## 4) Worker 端 API

* `/supervisor-status`
* `/system-usage`
* `/alert-log?limit=50`
* `/supervisor-event`
* `/restart-module`
* `/cleanup-supervisor`

所有端点均需 `Authorization: Bearer ${JEV_AGENT_KEY}`。

KV 命名规范：

* `snap:supervisor:YYYY-MM-DDTHH:MM`
* `alert:supervisor:${ts}`
* `repair:${date}`

---

## 5) 触发阈值与自修复策略

| 指标         | 正常     | 预警         | 触发修复      |
| ---------- | ------ | ---------- | --------- |
| AI 失败率（1h） | <10%   | ≥10%       | 连续失败 ≥5 次 |
| 客服心跳       | ≤30s/次 | >30s       | >60s 离线   |
| KV 写入延迟    | <500ms | 500–2000ms | >2000ms   |
| R2 容量      | <500MB | 500–900MB  | ≥900MB    |

自修复动作：写入日志 `repair:${date}` 并调用 `/restart-module`。

---

## 6) 中控 UI 集成

```html
<div id="supervisor-panel" class="panel-section">
  <h3>🛰️ 系统内部监控（隐私模式）</h3>
  <div id="sup-summary"></div>
  <div id="sup-usage"></div>
  <div id="sup-alerts" class="alerts"></div>
  <div class="notice">⚖️ 本面板仅显示事件级统计，不含任何消息内容或个人隐私。</div>
</div>
```

刷新逻辑每 30 秒运行，调用 `/supervisor-status`、`/system-usage`、`/alert-log`。

样式：

```css
.panel-section { background:#0b0b0b; color:#d7ffe0; border:1px solid #333; border-radius:12px; padding:12px; }
.alerts { color:#ff6b6b; margin-top:8px; }
.notice { color:#9aa; font-size:12px; margin-top:8px; }
```

---

## 7) 安全与反滥用

* 拦截含 `message|text|email|phone|media|body|content` 字段的请求。
* 同一 agent_id 事件上报频率 ≤ 60 次/分钟。
* 所有日志脱敏存储。
* 仅 HTTPS 访问。

---

## 8) 清理与留痕

* 每日定时 `/cleanup-supervisor` 清理 ≥30 天的日志。
* 当天快照保留 24h（每分钟覆盖写）。
* 自修复记录保留 30 天。

---

## 9) 自检清单

* [ ] 未采集任何消息内容或个人数据
* [ ] `/supervisor-status` 响应正常
* [ ] 异常触发自动修复
* [ ] 客服离线 >60s 报警
* [ ] 每日快照写入 KV 并清理
* [ ] UI 顶部标识"⚖️ 内部监控（隐私模式）"

---

## 10) 环境参数

* `JEV_AGENT_KEY`
* `SUP_AI_FAIL_THRESHOLD=5`
* `SUP_AGENT_OFFLINE_SEC=60`
* `SUP_LOG_TTL_DAYS=30`
* `SUP_R2_WARN_MB=900`

---

**执行目标：** 构建一个隐私优先、自动化、合规安全的中控监控插件，
实现"自检测、自报警、自修复"，同时确保**零隐私数据采集**、**零外部输出**。