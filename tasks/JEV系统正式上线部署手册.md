# JEV 系统正式上线部署手册

**版本**: 1.0.0  
**发布日期**: 2025-11-16  
**文档状态**: 正式版  
**作者**: JEV System Core Team

## 📋 文档目录

1. [系统概述](#系统概述)
2. [部署前准备](#部署前准备)
3. [部署阶段结构](#部署阶段结构)
4. [详细部署步骤](#详细部署步骤)
   - [1. 确认生产域名](#1-确认生产域名)
   - [2. 检查并同步环境变量](#2-检查并同步环境变量)
   - [3. 配置Cron调度](#3-配置cron调度)
   - [4. 部署本地节点](#4-部署本地节点)
   - [5. 部署Web UI](#5-部署web-ui)
5. [最终验证清单](#最终验证清单)
6. [生产监控建议](#生产监控建议)
7. [系统拓扑](#系统拓扑)
8. [故障排查](#故障排查)
9. [常见问题](#常见问题)

## 系统概述

JEV系统是一个高度自动化的智能决策与执行平台，集成了Cloudflare Worker云端控制、本地Agent执行、KV持久化存储和多渠道通知功能。系统从L1到L7.5已完成全部核心模块开发，现在需要从开发环境迁移到稳定的生产环境。

系统主要功能：
- 智能分析与洞察生成
- 自动决策与参数优化
- 本地服务控制与管理
- 多渠道通知与报告
- 自我修复与系统维护

## 部署前准备

### 硬件要求

1. **Cloudflare Workers**
   - 付费计划（Worker Bundled或Enterprise）
   - KV存储空间充足
   - Pages或R2访问权限

2. **本地服务器**
   - Windows Server 2016+ 或 Windows 10/11
   - 4GB+ RAM
   - 50GB+ 存储空间
   - Node.js 16+
   - PM2或类似进程管理工具

### 软件准备

1. **Cloudflare工具链**
   - Wrangler CLI最新版
   - Cloudflare Dashboard访问权限

2. **本地依赖**
   - Node.js环境
   - PowerShell 5.1+
   - PM2

### 配置文件准备

1. `worker.js` - 完整的Worker代码（包含L7.5功能）
2. `desktopAgent.exe` - 本地Agent可执行文件
3. `local_ai.js` - 本地AI服务
4. `jev_panel.html` - 控制面板UI

## 部署阶段结构

| 模块                                    | 当前状态        | 上线动作                            | 目标       |
| ------------------------------------- | ----------- | ------------------------------- | -------- |
| 🧩 **Cloudflare Worker 主控端**          | ✅ 已完成L7.5逻辑 | 上传并绑定正式域名                       | 公网入口稳定   |
| 🗄️ **KV 存储 (JEVPI)**                 | ✅ 已测试可读写    | 确认命名空间在生产环境可访问                  | 持久状态中心   |
| ⚙️ **Local Agent (desktopAgent.exe)** | ⚙️ 需常驻后台    | 注册为系统服务或定时守护                    | 本地执行节点   |
| 🧠 **Local AI (local_ai.js)**         | ✅ 已调通接口     | 设置开机自启 + 健康检测                   | 智能推理节点   |
| 💻 **控制面板 (jev_panel.html)**          | ✅ 已验证UI     | 上传至 Workers Site / R2 / Pages   | Web仪表可视化 |
| 🔔 **通知渠道 (Telegram/Email/Slack)**    | ✅ 测试通过      | 填写生产环境变量                        | 外部状态报告   |
| ⏱️ **Cron Scheduler**                 | ⏳ 待配置       | Cloudflare Dashboard → Triggers | 自动运行每日循环 |

## 详细部署步骤

### 1. 确认生产域名

**默认域名**: `https://jevshop.bensonlove1986.workers.dev/`

**自定义域名配置（可选）**:

1. 在Cloudflare控制面板中，导航至 **Workers & Pages** > **Triggers**
2. 点击 **Custom Domains** > **Add Custom Domain**
3. 输入域名：`api.jevshop.com`
4. 按照提示完成DNS配置
5. 添加Route规则:
   ```
   api.jevshop.com/*
   ```

### 2. 检查并同步环境变量

登录Cloudflare Dashboard，导航至Worker > Settings > Variables，确认以下变量已正确配置：

| 环境变量名 | 值 | 类型 |
|------------|-----|------|
| DAOJIE_WEBHOOK_URL | `https://services.leadconnectorhq.com/hooks/...` | 字符串 |
| DAOJIE_WABA_TOKEN | （您的API令牌） | 字符串 |
| TELEGRAM_TOKEN | （您的Telegram Bot令牌） | 字符串 |
| TELEGRAM_CHAT_ID | （您的聊天ID） | 字符串 |
| JEV_API_KEY | `JEV_2025_AI_SYS_A92jskL0xY` | 字符串 |
| MAIL_API_URL | （邮件API地址） | 字符串 |
| MAIL_API_KEY | （邮件API密钥） | 字符串 |
| REPORT_EMAIL_TO | （报告接收邮箱） | 字符串 |

**KV绑定检查**:
- 确认KV命名空间 `JEVPI` 已正确绑定到Worker
- 对于R2存储，确保已添加 `JEV_PANEL_BUCKET` 绑定

### 3. 配置Cron调度

在Cloudflare Worker > Triggers > Cron Triggers中添加以下调度规则：

| Cron表达式 | 执行任务 | 描述 |
|------------|---------|------|
| `0 0 * * *` | `/insight-report` | 生成洞察报告 |
| `5 0 * * *` | `/insight-pdf` | 生成PDF报告 |
| `10 0 * * *` | `/distribute-report` | 分发日报 |
| `15 0 * * *` | `/auto-decision` | 运行决策引擎 |
| `20 0 * * *` | `/auto-command` | 执行指令循环 |

### 4. 部署本地节点

#### 4.1 Agent常驻部署

1. 创建安装目录：
   ```powershell
   mkdir -p "C:\ProgramData\JEV\agent"
   ```

2. 复制Agent文件：
   ```powershell
   Copy-Item "D:\PDF转网页\desktopAgent.exe" "C:\ProgramData\JEV\agent\"
   ```

3. 创建系统服务计划任务：
   ```powershell
   schtasks /create /tn "JEVAgent" /tr "C:\ProgramData\JEV\agent\desktopAgent.exe" /sc onstart /ru SYSTEM /rl highest /f
   ```

4. 立即启动服务：
   ```powershell
   schtasks /run /tn "JEVAgent"
   ```

#### 4.2 Local AI服务部署

1. 创建AI服务目录：
   ```powershell
   mkdir -p "C:\ProgramData\JEV\ai"
   ```

2. 复制AI服务文件：
   ```powershell
   Copy-Item "D:\PDF转网页\local_ai.js" "C:\ProgramData\JEV\ai\"
   ```

3. 安装PM2（如果尚未安装）：
   ```powershell
   npm install -g pm2
   ```

4. 使用PM2启动服务：
   ```powershell
   cd "C:\ProgramData\JEV\ai"
   pm2 start local_ai.js --name jev-ai -- --port 1822
   ```

5. 设置PM2开机自启：
   ```powershell
   pm2 save
   pm2 startup
   ```

### 5. 部署Web UI

#### 选项A: Cloudflare Pages方式

1. 进入面板目录：
   ```powershell
   cd "D:\JEV\panel"
   ```

2. 初始化Git仓库（如果尚未初始化）：
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   ```

3. 发布到Cloudflare Pages：
   ```bash
   wrangler pages publish . --project-name jev-panel
   ```

#### 选项B: R2 + Worker方式

1. 上传HTML文件到R2：
   ```bash
   wrangler r2 object put jev-panel/jev_panel.html --file="D:\JEV\jev_panel.html"
   ```

2. 更新Worker代码，添加面板路由：
   ```javascript
   if (path === "/panel") {
     const html = await env.JEV_PANEL_BUCKET.get("jev_panel.html");
     return new Response(html.body, { headers: { "Content-Type": "text/html" } });
   }
   ```

3. 部署更新后的Worker：
   ```bash
   wrangler deploy
   ```

## 最终验证清单

部署完成后，请执行以下验证测试，确保所有组件正常工作：

✅ **健康检查**
- [ ] `/ping` → 正常返回
- [ ] `/check-env` → 返回已加载变量
- [ ] `/log-event?today` → 有日志内容

✅ **核心功能验证**
- [ ] `/insight-report` → 正常生成报告
- [ ] `/insight-pdf` → 能下载PDF报告
- [ ] `/distribute-report` → Telegram/邮件收到报告

✅ **智能决策链**
- [ ] `/auto-decision` → 生成决策日志
- [ ] `/auto-command` → 执行并记录动作

✅ **本地服务检查**
- [ ] 本地Agent端口1820可访问
- [ ] 本地AI端口1822可访问
- [ ] 服务设置为开机自启

✅ **UI面板访问**
- [ ] Pages/R2部署的面板可正常访问
- [ ] 面板能显示系统状态

## 生产监控建议

为确保系统稳定运行，建议配置以下监控策略：

### 1. Cloudflare级别监控

- 开启Cloudflare Logs，设置每小时状态统计
- 配置Worker错误告警
- 设置KV存储使用量监控

### 2. 本地系统监控

创建`watchdog.ps1`监控脚本，放置在`C:\ProgramData\JEV\monitoring\`目录：

```powershell
# watchdog.ps1 - JEV服务监控脚本

function Check-ServiceAndRestart {
    param(
        [string]$ServiceName,
        [int]$Port
    )
    
    $running = Test-NetConnection -ComputerName localhost -Port $Port -InformationLevel Quiet
    
    if (-not $running) {
        Write-Output "[$(Get-Date)] $ServiceName (Port $Port) 未运行，尝试重启..."
        
        if ($ServiceName -eq "JEVAgent") {
            schtasks /run /tn "JEVAgent"
        } elseif ($ServiceName -eq "JEVAI") {
            pm2 restart jev-ai
        }
        
        # 触发auto-command执行系统恢复
        Invoke-RestMethod -Uri "https://jevshop.bensonlove1986.workers.dev/auto-command" -Method Get
    }
    
    return $running
}

# 主监控循环
while ($true) {
    $agentStatus = Check-ServiceAndRestart "JEVAgent" 1820
    $aiStatus = Check-ServiceAndRestart "JEVAI" 1822
    
    # 记录状态到日志
    $status = if ($agentStatus -and $aiStatus) { "正常" } else { "异常" }
    Write-Output "[$(Get-Date)] 系统状态: $status" | Out-File -Append "C:\ProgramData\JEV\logs\watchdog.log"
    
    # 每5分钟检查一次
    Start-Sleep -Seconds 300
}
```

将监控脚本设置为系统服务：

```powershell
schtasks /create /tn "JEVWatchdog" /tr "powershell -ExecutionPolicy Bypass -File C:\ProgramData\JEV\monitoring\watchdog.ps1" /sc onstart /ru SYSTEM /rl highest /f
```

### 3. 数据备份策略

- 配置KV自动归档到R2存储
- 设置每周自动备份本地配置
- 建立日志轮转机制

## 系统拓扑

```
┌───────────────┐
│  Facebook / WhatsApp Leads │
└───────────────┘
          ↓
    [Daojie Webhook]
          ↓
 ┌────────────────────────┐
 │  JEV Worker (Cloudflare) │
 ├────────────────────────┤
 │  /analyze-image  /auto-decision  │
 │  /insight-pdf    /distribute     │
 │  KV:JEVPI  +  Cron Schedules    │
 └────────────────────────┘
          ↓
 ┌───────────────┐      ┌───────────────┐
 │ Local Agent 1820 │ ↔ │ Local AI 1822 │
 └───────────────┘      └───────────────┘
          ↓
     Telegram / Mail / Slack
```

## 故障排查

### 1. Worker相关问题

| 问题 | 可能原因 | 解决方案 |
|------|---------|----------|
| Worker不响应 | 部署失败或资源超限 | 检查Cloudflare Dashboard错误日志，重新部署 |
| KV读写失败 | 命名空间绑定错误 | 确认JEVPI命名空间正确绑定 |
| 环境变量不可用 | 变量未正确设置 | 验证环境变量是否正确添加并已部署 |

### 2. 本地服务问题

| 问题 | 可能原因 | 解决方案 |
|------|---------|----------|
| Agent未启动 | 计划任务未创建或权限不足 | 重新创建计划任务，使用SYSTEM权限 |
| AI服务崩溃 | 端口冲突或内存不足 | 检查端口占用，增加系统资源 |
| 本地服务无法连接 | 防火墙阻止或IP限制 | 配置防火墙规则，允许端口访问 |

### 3. 通知系统问题

| 问题 | 可能原因 | 解决方案 |
|------|---------|----------|
| Telegram未收到消息 | Token或Chat ID错误 | 验证Telegram凭据，检查网络连接 |
| 邮件发送失败 | API密钥或配置错误 | 验证邮件服务配置，检查日志 |

## 常见问题

### 1. 如何更新Worker代码？

使用Wrangler CLI更新：
```bash
wrangler deploy
```

### 2. 如何查看系统日志？

- Worker日志：Cloudflare Dashboard > Workers > Logs
- 本地Agent日志：`C:\ProgramData\JEV\logs\agent.log`
- 本地AI日志：使用`pm2 logs jev-ai`查看
- KV日志：通过API访问`/log-event`端点

### 3. 如何手动触发Cron任务？

可以直接访问相应端点手动触发：
```
https://jevshop.bensonlove1986.workers.dev/insight-report
```

### 4. 如何恢复系统到之前的配置？

从KV备份中恢复配置：
```
GET /restore-config?date=YYYY-MM-DD
```

## 部署完成后，你将拥有：

* **100%自动化运行闭环**
* **自我学习 + 自我调优 + 自我汇报 + 自主执行**
* **统一的云端控制台与可视化监控**
* **分布式本地节点执行能力**
* **外部系统联通 (Daojie / CRM / Telegram)**

---

**文档版权**: © 2025 JEV System Core Team. All Rights Reserved.
**联系方式**: system-core@jevshop.com
**紧急支持**: support@jevshop.com

---

*本手册会随着系统迭代更新，请定期检查最新版本。*