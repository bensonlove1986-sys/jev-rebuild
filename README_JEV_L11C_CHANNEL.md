# JEV L11C 系统通道层闭环 - 技术文档

## 📋 文档概述

本文档详细说明JEV L11C系统的通道层闭环设计，确保**TRAE、中控、Worker、KV、客服插件**之间每条通道都真实可连、可测、可控。文档包含系统架构、接口配置、安全策略和验证方法。

## 🧩 系统架构

### 五大通道设计

| 通道编号     | 名称                | 方向                 | 职责              | 涉及模块                                                 |
| -------- | ----------------- | ------------------ | --------------- | ---------------------------------------------------- |
| **CH-1** | `MonitorChannel`  | 中控 ↔ Worker ↔ KV   | 系统健康检测、心跳、自修复   | jev_panel.html、worker.js                             |
| **CH-2** | `AgentChannel`    | 客服插件 ↔ Worker ↔ 中控 | 客服注册、心跳、状态、消息上报 | agent_frontline.user.js、monitor_agent.html、worker.js |
| **CH-3** | `AIAssistChannel` | Worker → 客服插件      | AI 回复建议、报价草案推送  | worker.js、agent_frontline.user.js                    |
| **CH-4** | `TRAEChannel`     | TRAE ↔ 中控          | 版本注册、模块更新、任务调度  | index.html、worker.js、TRAE                            |
| **CH-5** | `AuditChannel`    | 各模块 → KV           | 异常日志、延迟报告、事件追踪  | 所有模块、KV                                              |

## 📡 接口连通性测试

### 测试工具说明

JEV L11C系统提供两种测试方式验证通道连通性：

1. **网页版测试工具**：`jev_api_test.html` - 图形化界面，支持单接口测试和批量测试
2. **PowerShell脚本**：`jev_connection_test.ps1` - 命令行测试，适合自动化验证

### 测试准备

1. 确保Worker服务已启动并运行在 `https://jevshop.bensonlove1986.workers.dev`
2. 准备相应的认证令牌：
   - 管理员令牌：`jev-admin-token-2025`
   - 监控令牌：`testtoken`
3. 确保KV存储服务正常可用

### 使用网页测试工具

1. 打开 `jev_api_test.html` 文件
2. 在测试配置区域输入正确的Worker URL和令牌
3. 点击「运行所有测试」执行完整测试，或点击每个接口的「测试」按钮单独测试
4. 查看测试结果，绿色表示成功，红色表示失败

### 使用PowerShell脚本

1. 打开PowerShell终端
2. 导航到脚本所在目录
3. 执行命令：
   ```powershell
   .\jev_connection_test.ps1
   ```
4. 脚本将自动测试所有16个接口并生成测试报告

## 🔧 接口清单与连通性验证

### MonitorChannel (CH-1)

| 接口路径 | 方法 | 验证标准 | 正常响应示例 |
|--------|-----|---------|------------|
| `/ping` | GET | 返回200状态码和`{ok:true}` | `{"ok":true, "ts":1234567890}` |
| `/kv-test` | GET | 返回200状态码和健康状态 | `{"ok":true, "status":"Healthy"}` |
| `/heartbeat` | GET | 返回200状态码和在线状态 | `{"ok":true, "uptime":"active"}` |
| `/meta/kv-latency` | GET | 返回200状态码和延迟数据 | `{"latency_ms":8}` |

### AgentChannel (CH-2)

| 接口路径 | 方法 | 验证标准 | 认证要求 |
|--------|-----|---------|--------|
| `/agents/register` | POST | 返回200状态码和agent_id | Invite Code |
| `/agent/heartbeat` | POST | 返回200状态码和`{ok:true}` | X-Monitor-Token |
| `/message/ingest` | POST | 返回200状态码和`{ok:true}` | X-Monitor-Token |
| `/reply/ack` | POST | 返回200状态码和`{ok:true}` | X-Monitor-Token |
| `/conversations/summary` | GET | 返回200状态码和会话数据 | X-Admin-Token |
| `/agents/status` | GET | 返回200状态码和客服状态 | X-Admin-Token |

### AIAssistChannel (CH-3)

| 接口路径 | 方法 | 验证标准 | 认证要求 |
|--------|-----|---------|--------|
| `/ai/suggest-reply` | POST | 返回200状态码和建议内容 | X-Monitor-Token |
| `/media/ocr` | POST | 返回200状态码和OCR结果 | X-Monitor-Token |

### TRAEChannel (CH-4)

| 接口路径 | 方法 | 验证标准 | 认证要求 |
|--------|-----|---------|--------|
| `/meta/summary` | GET | 返回200状态码和系统状态 | X-Admin-Token |
| `/meta/versions` | GET | 返回200状态码和版本信息 | X-Admin-Token |
| `/system/restart` | POST | 返回200状态码和`{ok:true}` | X-Admin-Token |

### AuditChannel (CH-5)

| 接口路径 | 方法 | 验证标准 | 认证要求 |
|--------|-----|---------|--------|
| `/log/write` | POST | 返回200状态码和`{ok:true}` | X-Monitor-Token |

## 🔒 安全验证策略

1. **统一签名头**：`X-Token-Id` + `X-Signature` = HMAC(path+ts+secret)
2. **Token 有效期**：7天，过期进入只读模式
3. **域名白名单**：`app.daojiemarketing.com`、`jevshop.bensonlove1986.workers.dev`、`localhost`
4. **CORS**：仅对已签名请求允许跨域访问
5. **速率限制**：每Agent每15秒AI调用一次，每2秒心跳一次
6. **脱敏保障**：上传日志和事件流均不包含正文或隐私字段

## ✅ 连通性验证成功标志

系统通道层闭环成功的验证标准：

1. 打开 `index.html`：所有模块卡片均显示 🟢 状态
2. 打开 `jev_panel.html`：Worker/KV状态正常，无告警信息
3. 运行测试工具：所有16个接口测试均通过
4. KV命名空间中持续更新心跳数据
5. 测试脚本显示成功率达到100%

## 🗄 KV存储验证

验证KV存储是否正常工作的方法：

1. 运行 `/kv-test` 接口测试
2. 检查KV命名空间中是否有以下前缀的数据：
   - `SYS_` - Worker状态和系统心跳（5分钟过期）
   - `AGT_` - 客服心跳和事件流（30分钟过期）
   - `LOG_` - 异常日志和错误记录（24小时过期）
   - `VER_` - 模块版本和更新时间（7天过期）

## 🔄 常见问题排查

### 接口测试失败原因

1. **认证问题**：检查令牌是否正确，特别是`X-Monitor-Token`和`X-Admin-Token`
2. **网络问题**：确认Worker服务是否正常运行，URL是否正确
3. **CORS问题**：检查是否在允许的域名白名单内访问
4. **KV连接问题**：使用`/kv-test`接口验证KV存储健康状态
5. **超时问题**：网络延迟可能导致请求超时，可以增加超时时间

### 恢复步骤

1. 重启Worker服务
2. 验证KV存储连接
3. 检查防火墙和网络设置
4. 重新生成认证令牌
5. 重新运行测试工具验证连通性

## 📊 部署与维护

### 部署检查清单

- [ ] Worker服务部署到`jevshop.bensonlove1986.workers.dev`
- [ ] KV存储服务配置完成并可用
- [ ] 安全策略和令牌已正确设置
- [ ] 所有16个接口已通过连通性测试
- [ ] 中控系统首页显示所有模块正常

### 定期维护

1. 每日运行连通性测试脚本验证通道健康
2. 每周检查KV存储空间和过期策略
3. 每月更新令牌和安全配置
4. 监控接口响应时间和错误率

---

**版本**: L11C · 2025-11-06
**状态**: 文档已完成
**作者**: JEV System Team