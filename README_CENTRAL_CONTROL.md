# 中央控制系统使用说明

## 系统概述

这个中央控制系统提供了UI与后端服务的连接管理功能，支持以下关键端点：
- `/ping` - 用于连接状态检查
- `/status` - 返回系统运行状态
- `/connect` - 用于UI注册连接
- `/heartbeat` - 维持连接活跃

## 重要说明：端口变更

**由于端口1818被系统进程（System PID: 4）占用**，修复后的中央控制系统使用 **端口1820**。

## 启动系统

使用以下命令启动中央控制系统：

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "D:\PDF转网页\central_control_system_fixed.ps1"
```

启动后，系统将在以下地址运行：
- 主地址：http://localhost:1820/
- 可用端点：http://localhost:1820/ping, http://localhost:1820/status, etc.

## 测试连接

### 测试 `/ping` 端点

```powershell
Invoke-WebRequest -Uri http://localhost:1820/ping -Method Get -ContentType application/json
```

预期返回：
```json
{"ok":true,"time":"2025-11-05T10:26:00"}
```

### 测试 `/status` 端点

```powershell
Invoke-WebRequest -Uri http://localhost:1820/status -Method Get -ContentType application/json
```

## UI 连接配置

如果UI需要连接到中央控制系统，请确保UI配置指向以下地址：
- WebSocket连接：ws://localhost:1820/
- API调用基础URL：http://localhost:1820/

## 日志文件

系统日志保存在以下位置：
- `D:\PDF转网页\central_control.log`

## 端口冲突解决方法

如果需要使用其他端口，可以修改 `central_control_system_fixed.ps1` 文件中的 $PORT 变量：

```powershell
# 配置
$PORT = 1820  # 将此值改为所需的端口
```

修改后重启服务即可。

## 功能特性

1. **完整的连接管理**：支持UI和代理连接的注册、状态跟踪和心跳维持
2. **详细的日志记录**：记录所有连接事件和错误信息
3. **向后兼容性**：保留了原有的 `/central-control` 相关端点
4. **CORS支持**：允许跨域请求，便于前端UI调用

## 常见问题

### Q: 启动时遇到端口被占用错误

A: 使用以下命令查看端口占用情况，然后选择一个未被使用的端口：

```powershell
Get-NetTCPConnection -LocalPort 端口号
```

### Q: UI显示"Disconnected"但系统正在运行

A: 确保UI配置使用了正确的端口（1820），并且 `/ping` 端点返回正确的JSON响应。