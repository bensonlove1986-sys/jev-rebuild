# JEV 执行系统 - 自然语言控制系统

## 简介

这个项目实现了一个基于自然语言的 JEV 执行系统控制系统，可以通过简单的自然语言命令来启动、关闭、重启 JEV 执行系统，以及检查其状态和查看日志。

## 文件结构

- `jev_control_system.ps1` - 主控制脚本，实现自然语言命令识别和执行
- `jev_demo.ps1` - 演示脚本，展示如何使用控制命令
- `desktopAgent.ps1` - JEV 执行系统主程序（需单独提供）

## 核心功能

### 启动命令
- **启动 JEV 执行系统**
- **启动 JEV 中控机**
- **唤醒中控系统**

### 关闭命令
- **关闭 JEV 执行系统**
- **关闭中控机**

### 重启命令
- **重启中控机**

### 状态检测命令
- **检测中控状态**

### 日志查看命令
- **查看系统日志**

## 使用方法

### 方法1：交互式模式

直接运行主控制脚本进入交互式模式：

```powershell
powershell -ExecutionPolicy Bypass -File "D:\PDF转网页\jev_control_system.ps1"
```

然后在交互式界面中输入自然语言命令。

### 方法2：直接命令模式

使用以下格式直接执行特定命令：

```powershell
powershell -ExecutionPolicy Bypass -File "D:\PDF转网页\jev_control_system.ps1" "您的命令"
```

例如：
```powershell
powershell -ExecutionPolicy Bypass -File "D:\PDF转网页\jev_control_system.ps1" "启动 JEV 执行系统"
powershell -ExecutionPolicy Bypass -File "D:\PDF转网页\jev_control_system.ps1" "检测中控状态"
powershell -ExecutionPolicy Bypass -File "D:\PDF转网页\jev_control_system.ps1" "查看系统日志"
```

### 方法3：运行演示脚本

运行演示脚本来体验所有功能：

```powershell
powershell -ExecutionPolicy Bypass -File "D:\PDF转网页\jev_demo.ps1"
```

## 配置说明

在 `jev_control_system.ps1` 文件中，您可以修改以下配置参数：

- `$AGENT_SCRIPT_PATH` - JEV 执行系统脚本路径
- `$AGENT_PORT` - JEV 执行系统监听端口
- `$AGENT_STATUS_URL` - 状态检查 URL
- `$AGENT_LOGS_URL` - 日志获取 URL
- `$LOG_PATH` - 日志文件路径

## 自动化集成

您可以将此控制系统与其他自动化工具集成，例如：

1. **语音助手**：通过语音识别转换为文本命令，然后调用此脚本
2. **定时任务**：使用 Windows 任务计划程序定期执行状态检查或日志备份
3. **监控系统**：结合监控工具实现自动重启和状态报告

## 故障排除

### 常见问题

1. **启动失败**
   - 检查 `desktopAgent.ps1` 文件是否存在
   - 确认文件路径是否正确
   - 检查端口 1818 是否被其他程序占用

2. **状态检测失败**
   - 确认服务是否已成功启动
   - 检查防火墙是否阻止了端口访问
   - 验证 URL 是否正确配置

3. **日志查看失败**
   - 确认日志文件路径是否正确
   - 检查日志文件权限

## 版本信息

- **版本**：1.0
- **作者**：JEV 系统团队
- **最后更新**：$(Get-Date -Format "yyyy-MM-dd")

## 版权信息

© 2024 JEV 系统团队. 保留所有权利。
