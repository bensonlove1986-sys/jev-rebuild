# JEV-PluginSync-v1.0 三层通信闭环系统

## 📋 项目概述

JEV-PluginSync-v1.0 是一个高性能、高可靠性的三层通信闭环系统，专为JEV插件生态设计，实现了插件层（Tampermonkey/Web UI）、本地中继层和Cloudflare Worker层的无缝通信。系统支持在线/离线双模式切换、智能故障恢复、实时监控和全面的错误处理机制。

## 🚀 快速开始

### 环境要求

- **Node.js**: v14.0+（用于本地中继服务）
- **浏览器**: Chrome 90+ 或 Firefox 88+（支持现代JavaScript特性）
- **Cloudflare Worker**: 配置好的Cloudflare账户

### 安装步骤

1. **克隆项目文件**

```bash
# 确保所有文件已复制到本地目录
dir d:\PDF转网页
```

2. **安装依赖**

```bash
cd d:\PDF转网页
npm install http-server
```

3. **启动系统**

使用一键启动脚本启动整个系统：

```bash
start_three_layer_communication.bat
```

## 📁 文件结构

```
d:\PDF转网页\
├── JEV_Client_Plugin\            # 插件层实现
│   └── jev_plugin_sync_tampermonkey.js  # Tampermonkey插件通信模块
├── JEV_Client_Web\               # Web UI实现
│   ├── jev_plugin_sync_webui.js  # Web UI通信模块
│   ├── jev_three_layer_test_ui.html    # 测试控制台
│   └── jev_three_layer_integration_test.js  # 集成测试
├── JEV_Client\relay\            # 本地中继实现
│   └── jev_plugin_relay_bridge.js      # 中继桥接模块
├── jev_three_layer_config.js     # 全局配置文件
├── jev_three_layer_monitor.js    # 监控模块
├── jev_three_layer_error_handler.js    # 错误处理模块
├── jev_three_layer_test_suite.js       # 完整测试套件
├── jev_three_layer_integration_demo.js # 集成演示应用
├── start_three_layer_communication.bat # 一键启动脚本
└── jev_logs\                     # 日志目录
    └── communication\            # 通信日志
```

## 🔧 核心组件

### 1. 配置管理 (jev_three_layer_config.js)

集中管理所有通信配置，包括端点设置、安全参数和通信选项。支持动态配置加载和验证。

**主要功能：**
- 端点配置管理
- 安全设置
- 通信参数调整
- 双模式配置

### 2. 监控系统 (jev_three_layer_monitor.js)

实时监控三层通信状态、性能指标和健康状况，提供告警机制。

**主要功能：**
- 实时状态监控
- 性能指标收集
- 健康状态评估
- 告警通知

### 3. 错误处理 (jev_three_layer_error_handler.js)

智能错误处理和故障恢复机制，确保系统在异常情况下的稳定性。

**主要功能：**
- 电路断路器模式
- 智能重试策略
- 自动降级机制
- 离线模式管理

### 4. 测试套件 (jev_three_layer_test_suite.js)

全面的自动化测试功能，验证系统各组件的功能和性能。

**主要测试类型：**
- 连接测试
- 通信功能测试
- 错误处理测试
- 性能测试
- 可靠性测试
- 集成测试

### 5. 集成演示 (jev_three_layer_integration_demo.js)

展示如何整合所有组件的完整演示应用，提供最佳实践参考。

**主要特性：**
- 完整通信流程演示
- 双模式切换
- 数据同步管理
- 事件处理

## 💻 使用指南

### 1. 启动通信系统

```bash
# 运行一键启动脚本
start_three_layer_communication.bat
```

脚本会：
- 启动Web UI测试服务器
- 提示检查本地中继服务
- 打开测试控制台

### 2. 配置系统

编辑 `jev_three_layer_config.js` 文件，根据您的环境设置配置：

```javascript
const config = {
  relayEndpoint: 'http://localhost:3000',  // 本地中继地址
  workerEndpoint: 'https://your-worker.workers.dev',  // Worker地址
  logLevel: 'info',  // 日志级别
  security: {
    enableEncryption: true,
    useJwt: true
  }
};
```

### 3. 在插件中集成

**Tampermonkey插件：**

```javascript
// @require      http://localhost:8080/jev_plugin_sync_tampermonkey.js

// 初始化插件同步组件
const pluginSync = new JEVPluginSync({
  pluginId: 'my-plugin',
  relayEndpoint: 'http://localhost:3000'
});

// 发送消息
pluginSync.sendMessage({
  type: 'data_update',
  payload: { key: 'value' }
});
```

**Web UI应用：**

```javascript
// 加载通信模块
<script src="http://localhost:8080/jev_plugin_sync_webui.js"></script>

// 初始化通信组件
const jevSync = new JEVPluginSync();

// 监听消息
jevSync.on('message', (data) => {
  console.log('收到消息:', data);
});
```

### 4. 运行测试

#### Web UI测试

打开浏览器访问：
http://localhost:8080/jev_three_layer_test_ui.html

#### 命令行测试

```bash
node jev_three_layer_integration_test.js
```

## 📊 监控与维护

### 查看状态

通过监控模块获取当前系统状态：

```javascript
const monitor = new JEVThreeLayerMonitor();
monitor.startMonitoring();

// 监听状态更新
monitor.on('statusUpdate', (status) => {
  console.log('系统状态:', status);
});
```

### 日志查看

日志文件位于：
`d:\PDF转网页\jev_logs\communication\`

## 🔄 双模式支持

### 在线模式

系统正常连接到所有层，实时同步数据。

### 离线模式

当关键连接断开时，系统自动切换到离线模式：
- 数据自动缓存到本地
- 操作加入同步队列
- 恢复连接后自动同步

## 🛡️ 安全特性

- 通信加密支持
- JWT令牌验证
- 请求签名和验证
- 敏感数据保护

## 🔧 故障排除

### 常见问题

1. **无法连接到中继服务**
   - 检查本地中继服务是否已启动
   - 验证中继端点配置是否正确

2. **Worker连接失败**
   - 检查网络连接
   - 验证Worker URL是否正确
   - 检查Cloudflare Worker是否正常运行

3. **同步队列积压**
   - 检查网络连接状态
   - 手动触发同步操作
   - 清理过期队列项

## 📈 性能优化

### 最佳实践

1. **消息批处理**：合并小消息以减少网络请求
2. **合理设置缓存TTL**：避免频繁缓存失效
3. **优化重试策略**：根据操作类型调整重试参数
4. **监控资源使用**：定期检查内存和网络使用情况

## 📋 版本兼容性

- **插件层**：支持Tampermonkey 4.12+ 和现代浏览器
- **中继层**：支持Node.js 14.0+ 环境
- **Worker层**：支持Cloudflare Worker最新运行时

## 🤝 贡献指南

欢迎贡献代码或提出改进建议！

1. Fork项目
2. 创建功能分支
3. 提交更改
4. 运行测试确保一切正常
5. 提交Pull Request

## 📄 许可证

本项目采用MIT许可证。详见LICENSE文件。

## 📞 支持

如有问题或建议，请联系项目维护团队。

---

*JEV-PluginSync-v1.0 三层通信闭环系统 - 高性能、高可靠的跨层通信解决方案*