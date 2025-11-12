# JEV系统使用指南

## 系统概述

JEV系统是一个完整的分布式应用系统，包含以下核心组件：

1. **中继服务器（Cloud Relay v11.0）** - 系统通信核心，负责组件间的消息转发和路由
2. **中控端（Control Center v9.8）** - 系统管理和控制中心，提供API和管理界面
3. **客户端（Client v7.0）** - 终端用户界面组件，与用户交互

## 快速开始

### 一键启动系统

双击运行 `start_jev_system.bat` 文件，系统将自动启动所有组件：

```
start_jev_system.bat
```

### 检查系统状态

运行状态监控工具检查系统健康情况：

```
node check_jev_status.js
```

## 访问各组件

### 中继服务器
- 地址：http://localhost:3000
- 健康检查：http://localhost:3000/api/relay/ping

### 中控端
- 控制面板：http://localhost:4000
- 健康检查：http://localhost:4000/api/health
- 系统状态：http://localhost:4000/api/status
- 代理管理：http://localhost:4000/api/agents

### 客户端
- 状态API：http://localhost:5000/api/client/status

## 常见操作

### 重启单个组件

**重启中继服务器：**
```bash
cd Cloud_Relay
node cloud_relay.js
```

**重启中控端：**
```bash
cd JEV_ControlCenter
node server.js
```

**重启客户端：**
```bash
cd JEV_Client
node start_client.js
```

### 验证系统通信

使用以下命令验证各组件之间的通信是否正常：

```bash
# 测试中继服务器
curl http://localhost:3000/api/relay/ping

# 测试中控端
curl http://localhost:4000/api/health

# 测试客户端
curl http://localhost:5000/api/client/status
```

## 故障排查

### 组件无法访问
- 确认服务是否正常启动
- 检查端口是否被占用
- 查看服务日志获取错误信息

### 通信失败
- 检查防火墙设置
- 确认各组件的URL配置是否正确
- 重启相关组件

### 常见错误
- `Error: connect ECONNREFUSED` - 服务未启动或端口未监听
- `404 Not Found` - 请求的API路径不存在
- `500 Internal Server Error` - 服务内部错误，请查看服务日志

## 日志查看

各组件的日志会输出到对应的终端窗口。如需保存日志，可以将输出重定向到文件：

```bash
node cloud_relay.js > relay.log 2>&1
```

## 注意事项

1. 请确保Node.js环境已正确安装
2. 系统正常运行需要三个组件同时启动
3. 端口3000、4000、5000需要保持可用
4. 如需修改端口配置，请同步更新所有组件的相关设置

## 联系与支持

如有任何问题，请检查系统日志并参考相关文档。