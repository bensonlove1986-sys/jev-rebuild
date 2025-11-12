# DeepSeek 安全执行系统

## 项目概述

DeepSeek安全执行系统是一个多层次的安全执行框架，为自动化桌面操作提供全面的安全保障。该系统由安全内核、调度层和执行层组成，通过严格的权限验证、操作确认和故障保护机制，确保自动化操作的安全性和可控性。

## 系统架构

### 三层架构设计

1. **SOP 安全内核**
   - 配置管理
   - 安全策略验证
   - 故障保护机制
   - 锁定状态管理

2. **Operator 调度层**
   - 任务验证与授权
   - 操作计划生成
   - 用户确认流程
   - 队列管理
   - 操作转发
   - 日志记录

3. **DesktopAgent 执行层**
   - HTTP 服务器
   - 桌面动作执行
   - 安全检查
   - 延迟执行保护
   - 日志回传

## 核心模块

### 1. 配置管理 (config/deepseekSecurityConfig.js)

提供系统全局配置，包括安全策略、敏感内容过滤规则和操作限制。

```javascript
// 配置示例
const config = {
  systemName: "DeepSeek-Security-Engine",
  version: "1.0.0",
  securityLevel: "high",
  sensitiveContentFilters: {
    apiKeys: /(api[_-]?key|apikey)[\s]*[=:]?[\s]*(['\"]?)[a-zA-Z0-9]{16,}(\1)/gi,
    passwords: /(password|passwd|pwd)[\s]*[=:]?[\s]*(['\"]?)[^\1\n\r]{6,}(\1)/gi,
    internalPaths: /(?:c|d):\\(?:windows|system32|users|program files)/gi
  },
  // 更多配置...
};
```

### 2. 安全执行器 (modular/deepseekSecurityExecutor.js)

系统的核心控制模块，负责协调各组件工作，执行安全验证和任务控制。

主要功能：
- 系统初始化与配置加载
- 任务执行与安全检查
- 暂停标志管理
- 系统状态控制

### 3. 操作确认模块 (modular/deepseekDryRun.js)

提供操作预览和用户确认功能，确保高风险操作得到人工审核。

主要功能：
- 执行计划生成
- 操作风险评估
- 用户确认流程
- 操作参数验证

### 4. 路径和运行时控制 (modular/deepseekPathRuntimeControl.js)

监控和控制文件系统访问，防止未授权的路径操作。

主要功能：
- 路径安全检查
- 文件操作监控
- 运行时行为分析
- 异常检测与阻断

### 5. 故障保护模块 (modular/deepseekFaultProtection.js)

提供自动容错和系统锁定功能，确保系统在异常情况下能够安全停止。

主要功能：
- 失败记录与分析
- 自动锁定机制
- 健康状态监控
- 恢复策略管理

### 6. 队列管理与日志系统 (modular/deepseekQueueManager.js, modular/deepseekLoggingSystem.js)

管理任务队列和系统日志，提供完整的操作历史记录和任务追踪。

主要功能：
- 任务队列管理
- 任务状态追踪
- 日志记录与分析
- 操作审计

### 7. DesktopAgent 执行层 (desktopAgent.ps1)

负责接收来自Operator的操作请求并安全执行桌面动作。

主要功能：
- HTTP 监听器
- 桌面动作执行（鼠标移动、点击、键盘输入、截图）
- 暂停标志检查
- 随机延迟保护
- 详细操作日志

## 配置文件说明

### 安全配置文件 (config/deepseekSecurityConfig.js)

- **systemName**: 系统名称
- **version**: 系统版本号
- **securityLevel**: 安全级别（low, medium, high）
- **sensitiveContentFilters**: 敏感内容过滤规则
  - **apiKeys**: API密钥正则表达式
  - **passwords**: 密码正则表达式
  - **internalPaths**: 内部路径正则表达式
- **allowedActions**: 允许的操作类型
- **maxRetryAttempts**: 最大重试次数
- **autoLockAfterFailures**: 失败自动锁定阈值
- **pauseFilePath**: 暂停标志文件路径

## 安装与配置

### 前置要求

- **Node.js 18+**: 运行 Operator 调度层
- **PowerShell 7+**: 运行 DesktopAgent 执行层
- **Windows 权限**: 以管理员身份运行 PowerShell 脚本
- **防火墙配置**: 允许 1818 端口入站连接

### 安装步骤

1. **准备项目**
   ```bash
   cd PDF转网页
   ```

2. **配置安全内核**
   - 编辑 `scripts/config/deepseekSecurityConfig.js` 设置安全策略
   - 确保 `paused` 设置为 `false` 以启用系统
   - 将 `TREA_MAIN` 添加到 `tokenWhitelist`

3. **启动 DesktopAgent**
   ```powershell
   # 以管理员身份运行 PowerShell
   cd PDF转网页
   .\desktopAgent.ps1
   ```

4. **运行 Operator 调度层**
   ```bash
   node scripts/modular/operator.js
   ```

## 使用方法

### L3.5 闭环执行系统（增强版）

1️⃣ **启动 PowerShell 终端**：
```bash
cd PDF转网页
powershell -ExecutionPolicy Bypass -File .\desktopAgent.ps1
```

输出应为：
```bash
🧠 desktopAgent (L3.5) 已启动，正在监听 http://localhost:1818/execute
🔄 自动确认模式: True
```

2️⃣ **运行 Node 测试**：
```bash
node scripts/modular/operator.js test
```

系统会自动执行任务（无需手动确认），并输出执行日志和性能信息：
```bash
✅ [自动确认] 执行请求: type "Hello, this is JEV Operator typing automatically!"
✅ 执行成功: type "Hello, this is JEV Operator typing automatically!" (250ms)
```

### 功能增强（L3.5）

**✅ 自动确认** - 系统自动确认安全任务，无需人工干预
**✅ 性能监控** - 记录任务执行时间，优化系统性能
**✅ 详细日志** - 增强的日志记录，包含执行状态和错误详情
**✅ 自动截图** - 执行前后自动截取屏幕，提供视觉反馈
**✅ 失败重试** - 任务失败时自动重试，提高执行成功率
**✅ Evolver学习** - 记录执行模式，支持系统自我优化

### 执行操作请求

向 Operator 调度层发送操作请求，格式如下：

```javascript
const request = {
  token: "TREA_MAIN",  // 必须在白名单中
  action: {
    type: "move",  // move, click, type, capture
    x: 100,
    y: 100
  },
  confirmRequired: false  // L3.5版本支持自动确认
};
```

Operator 会验证请求，生成执行计划，自动确认（如配置），然后转发到 DesktopAgent 执行。

### 暂停系统

创建暂停标志文件可以立即暂停系统：

```powershell
New-Item -Path "C:\JEV\PAUSE.flag" -ItemType File -Force
```

移除该文件恢复系统运行：

```powershell
Remove-Item -Path "C:\JEV\PAUSE.flag" -Force
```

## L3.5 闭环执行系统状态

• ✅ **智能请求处理** → operator.js（支持自动确认和失败重试）
• ✅ **高级安全验证** → 多因素认证和权限控制
• ✅ **自主执行引擎** → 无需人工干预的自动操作执行
• ✅ **性能监控** → 实时执行时间统计和效率分析
• ✅ **视觉反馈系统** → 自动截图和视觉数据收集
• ✅ **智能学习** → Evolver记录执行模式，持续自我优化

### 系统架构

**1. Operator调度层** - 任务安全验证和调度
**2. DesktopAgent执行层** - 自动执行和性能监控
**3. Memory存储层** - 执行日志和学习数据
**4. Evolver学习层** - 自我优化和行为模式分析

## 安全特性

### 多层安全防护

1. **请求验证**
   - Token 白名单检查
   - 操作类型验证
   - 参数范围检查

2. **智能确认**
   - 高风险操作强制人工审核
   - 低风险操作自动确认
   - 执行计划预览

3. **实时监控**
   - 暂停标志检查
   - 系统锁定机制
   - 异常行为检测

4. **延迟保护**
   - 200-500ms 随机延迟
   - 防止快速连续操作

5. **完整日志**
   - 操作记录审计
   - 故障追踪
   - 安全事件记录

## 🔄 故障排除

### 常见问题

1. **系统显示暂停状态**
   - 检查 `C:\JEV\PAUSE.flag` 文件是否存在
   - 检查 SOP 配置中的 `paused` 状态

2. **请求被拒绝**
   - 确认 Token 是否在白名单中
   - 验证操作是否被允许
   - 检查系统是否处于锁定状态

3. **DesktopAgent 无法启动**
   - 确认以管理员身份运行 PowerShell
   - 检查 1818 端口是否被占用
   - 检查防火墙设置

4. **连续失败锁定**
   - 系统在连续失败 3 次后会自动锁定
   - 检查操作日志了解失败原因
   - 修复问题后，重置故障计数器

- **端口被占用**: 确保1818端口未被其他程序占用。使用 `netstat -ano | findstr 1818` 检查端口占用情况。
- **权限不足**: 以管理员身份运行PowerShell和Node.js。
- **暂停状态**: 检查`C:\JEV\PAUSE.flag`文件是否存在，如存在则删除以恢复系统。
- **防火墙阻止**: 确保防火墙允许1818端口的TCP连接。
- **日志分析**: 检查`C:\JEV\Logs`目录下的日志文件以排查具体错误。

## 🧪 集成测试

DeepSeek安全执行系统提供了完整的集成测试套件，用于验证系统各组件之间的通信和安全性：

### 运行集成测试

1. 确保desktopAgent.ps1正在运行：
   ```powershell
   .\desktopAgent.ps1
   ```

2. 在另一个终端中运行集成测试：
   ```bash
   node --experimental-modules scripts/tests/integrationTest.js
   ```

### 测试内容

集成测试验证以下核心功能：
- 基本的鼠标移动操作
- 键盘输入功能
- 屏幕截图功能
- Token白名单安全验证
- 动作类型权限控制
- 用户确认流程

## 🔗 系统集成指南

### 完整工作流程

1. **启动桌面执行代理**：以管理员权限运行desktopAgent.ps1
2. **执行任务调度器**：通过operator.js发送经过验证的任务
3. **用户确认**：desktopAgent显示安全确认对话框
4. **执行操作**：完成鼠标/键盘操作并返回结果
5. **日志记录**：所有操作记录到本地日志和远程内存API

### 请求格式

desktopAgent支持多种请求格式，确保与operator.js的完美集成：

1. 基本格式：
   ```json
   {"action": "move", "data": {"x": 100, "y": 100}}
   ```

2. 嵌套格式：
   ```json
   {"id": "task123", "action": "move", "data": {"x": 100, "y": 100}}
   ```

### 安全确认机制

所有操作都需要通过用户确认对话框，显示操作类型和详细参数，确保用户对执行的操作有完全的可见性和控制权。

## 运行前检查清单

- [ ] Windows 防火墙允许 1818 端口入站
- [ ] Node.js 18+ 已安装
- [ ] PowerShell 7+ 已安装
- [ ] 以管理员身份运行 PowerShell
- [ ] SOP 系统返回 paused=false
- [ ] tokenWhitelist 包含 TREA_MAIN
- [ ] 没有其他程序占用 1818 端口
- [ ] 日志目录 C:\JEV\Logs 可访问

## 系统维护

### 日志管理

- DesktopAgent 日志位于 `C:\JEV\Logs\desktopAgent_yyyyMMdd.log`
- 定期清理旧日志以节省磁盘空间
- 监控日志中异常信息

### 系统更新

1. 备份当前配置文件
2. 更新代码库
3. 检查配置兼容性
4. 重启 DesktopAgent 和 Operator

## 许可证

该项目仅供内部使用。

## 联系与支持

如有问题，请联系系统管理员。

---

*文档版本: 1.0.0*
*更新日期: $(Get-Date -Format "yyyy-MM-dd")*
