# JEV-PluginSync-v1.0 三层通信闭环集成指南

## 1. 架构概述

JEV-PluginSync-v1.0 实现了完整的三层通信闭环系统，确保插件层、本地中继、Worker层和状态层之间的稳定可靠通信。

### 1.1 核心组件

- **插件层**：Tampermonkey脚本或Web UI，用户交互接口
- **本地中继**：消息转发和队列管理，处理网络请求
- **Worker层**：Cloudflare Worker，实现边缘计算和缓存
- **状态层**：持久化存储和状态管理

### 1.2 通信流程

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  插件层     │────▶│  本地中继   │────▶│   Worker    │────▶│   状态层    │
│(Tampermonkey│◀────│    服务     │◀────│   服务      │◀────│             │
│   / Web UI) │     │             │     │             │     │             │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
```

## 2. 快速开始

### 2.1 环境要求

- Node.js 14+
- 浏览器（Chrome/Firefox）
- Tampermonkey浏览器扩展（可选，用于脚本模式）
- 本地开发服务器

### 2.2 文件结构

```
d:\PDF转网页\
├── jev_three_layer_config.js       # 统一配置管理
├── jev_three_layer_integration_test.js  # 集成测试脚本
├── JEV_Client_Plugin\
│   └── jev_plugin_sync_tampermonkey.js  # Tampermonkey脚本
├── JEV_Client_Web\
│   ├── jev_plugin_sync_webui.js    # Web UI同步模块
│   ├── jev_plugin_test_page.html   # Web UI测试页面
│   └── jev_three_layer_test_ui.html # 三层通信测试控制台
├── JEV_Client\
│   └── relay\
│       └── jev_plugin_relay_bridge.js  # 中继桥接模块
└── jev_logs\
    └── communication\             # 通信日志目录
```

### 2.3 配置设置

1. 编辑统一配置文件：

```javascript
// jev_three_layer_config.js 关键配置
const config = {
    endpoints: {
        plugin: { baseUrl: 'http://localhost:8080' },
        relay: { baseUrl: 'http://localhost:3000' },
        worker: { baseUrl: 'https://jevshop.bensonlove1986.workers.dev' }
    },
    security: {
        agentToken: 'jev_cloud_api_key_123456' // 替换为实际密钥
    }
};
```

2. 保存配置：

```javascript
const { jevConfig } = require('./jev_three_layer_config');
await jevConfig.saveConfig();
```

## 3. 组件部署

### 3.1 插件层部署

#### Web UI模式

1. 启动本地Web服务器：

```bash
cd d:\PDF转网页\JEV_Client_Web
npx http-server -p 8080
```

2. 访问测试页面：
   - `http://localhost:8080/jev_plugin_test_page.html` - 基础测试
   - `http://localhost:8080/jev_three_layer_test_ui.html` - 完整测试控制台

#### Tampermonkey脚本模式

1. 打开Tampermonkey仪表板
2. 点击「添加新脚本」
3. 复制粘贴 `jev_plugin_sync_tampermonkey.js` 的内容
4. 点击「文件」→「保存」
5. 在目标网站上启用脚本

### 3.2 本地中继部署

1. 确保中继服务已启动
2. 配置中继端点：

```javascript
// jev_plugin_relay_bridge.js 中的配置
const relayConfig = {
    relayUrl: 'http://localhost:3000',
    pluginSyncUrl: 'http://localhost:8080/api/sync',
    workerUrl: 'https://jevshop.bensonlove1986.workers.dev'
};
```

### 3.3 Worker层配置

确保Cloudflare Worker已部署，并配置以下端点：
- `/status` - 状态检查
- `/sync` - 同步处理
- `/state/check` - 状态层访问

## 4. 三层通信测试

### 4.1 使用Web UI测试控制台

1. 访问 `http://localhost:8080/jev_three_layer_test_ui.html`
2. 确认配置参数
3. 点击「检查服务」验证所有组件状态
4. 点击「开始测试」运行完整的三层通信测试
5. 查看实时结果和性能指标
6. 测试完成后可下载JSON格式的详细报告

### 4.2 使用命令行测试

```bash
node d:\PDF转网页\jev_three_layer_integration_test.js
```

测试结果将保存在 `d:\PDF转网页\jev_logs\communication\` 目录下。

### 4.3 测试参数说明

| 参数 | 说明 | 默认值 |
|------|------|--------|
| testMessageCount | 测试消息数量 | 10 |
| messageInterval | 消息间隔(ms) | 1000 |
| connectionTimeout | 连接超时(ms) | 5000 |
| acceptableLatency | 可接受延迟(ms) | 150 |

## 5. 双模式支持

JEV-PluginSync支持在线/离线双模式操作：

### 5.1 在线模式

默认模式，实时同步数据到云服务器：

```javascript
// 切换到在线模式
pluginSyncManager.switchMode('online');
```

### 5.2 离线模式

网络不可用时自动切换，数据保存在本地队列：

```javascript
// 切换到离线模式
pluginSyncManager.switchMode('offline');

// 网络恢复后，自动同步离线队列
pluginSyncManager.syncOfflineQueue();
```

### 5.3 自动模式切换

系统会根据网络状态自动切换模式：

```javascript
// 配置自动切换参数
const dualModeConfig = {
    autoSwitchToOffline: true,
    connectionCheckInterval: 5000,
    consecutiveFailuresThreshold: 3
};
```

## 6. 安全配置

### 6.1 API令牌管理

确保所有组件使用相同的Agent Token进行身份验证：

```javascript
// 在配置中设置
security: {
    agentToken: 'your-secure-token-here',
    // 其他安全设置...
}
```

### 6.2 请求验证

所有通信都包含请求签名和时间戳验证，防止重放攻击。

### 6.3 CORS配置

确保在Worker中正确配置了CORS头：

```javascript
// Worker中的CORS配置
addEventListener('fetch', event => {
    event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
    // 处理请求...
    return new Response(responseBody, {
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, X-Agent-Token'
        }
    });
}
```

## 7. 日志与监控

### 7.1 日志配置

```javascript
// 日志配置示例
logging: {
    enabled: true,
    logLevel: 'info', // error, warn, info, debug
    logToFile: true,
    logFilePath: 'd:/PDF转网页/jev_logs/communication/',
    maxLogFiles: 5
}
```

### 7.2 关键日志类型

- 通信状态变化
- 消息发送/接收记录
- 错误和异常
- 模式切换事件
- 性能指标

### 7.3 性能监控

系统自动收集以下指标：
- 消息延迟（按层和端到端）
- 成功率和错误率
- 吞吐量（消息/秒）
- 队列长度

## 8. 故障排除

### 8.1 常见问题

#### 8.1.1 连接失败

- 检查各服务是否已启动
- 验证端点URL配置是否正确
- 确认网络连接和防火墙设置
- 检查Agent Token是否有效

#### 8.1.2 同步延迟高

- 检查网络连接质量
- 调整批量发送参数
- 验证Worker部署区域是否合适
- 考虑增加本地缓存

#### 8.1.3 消息丢失

- 启用离线队列功能
- 检查队列大小限制设置
- 验证持久化存储配置
- 查看错误日志中的详细信息

### 8.2 调试模式

启用调试日志以获取详细信息：

```javascript
// 启用调试模式
jevConfig.updateConfig({
    logging: {
        logLevel: 'debug',
        logToConsole: true
    }
});
```

## 9. 集成最佳实践

### 9.1 启动顺序

1. 确保Worker服务可用
2. 启动本地中继服务
3. 初始化插件层（Web UI或Tampermonkey）
4. 运行连接检查验证所有组件

### 9.2 性能优化

- 使用消息批处理减少请求次数
- 启用压缩降低带宽使用
- 合理设置心跳间隔，避免过多空请求
- 调整重试策略和超时设置

### 9.3 高可用性

- 实现自动重连机制
- 配置双模式无缝切换
- 定期备份配置和状态数据
- 监控系统健康状态

## 10. 版本兼容性

### 10.1 版本要求

- JEV-PluginSync: v1.0+
- Cloudflare Worker: 支持ES6+
- 浏览器: Chrome 80+, Firefox 75+, Edge 80+
- Tampermonkey: v4.12+

### 10.2 升级注意事项

- 升级前备份配置和数据
- 确保所有组件使用兼容版本
- 升级后运行完整的集成测试
- 检查日志中是否有兼容性警告

## 11. 支持与维护

### 11.1 联系方式

- 技术支持：jev-support@example.com
- GitHub仓库：https://github.com/jev-sync/plugin-integration

### 11.2 更新日志

#### v1.0.0
- 初始版本发布
- 支持三层通信闭环
- 实现双模式（在线/离线）操作
- 提供Web UI和Tampermonkey两种集成方式

## 12. 附录

### 12.1 API参考

#### 插件层API

```javascript
// 初始化插件同步
const pluginSync = new JEVPluginSync(config);

// 发送同步请求
await pluginSync.syncData(data);

// 检查通信状态
const status = await pluginSync.checkStatus();

// 执行对齐测试
const alignmentResult = await pluginSync.runAlignmentTest();
```

#### 中继桥接API

```javascript
// 初始化中继桥接
const relayBridge = new JEVPluginRelayBridge(config);

// 发送消息到中继
const result = await relayBridge.sendMessage(message);

// 检查连接状态
const isConnected = await relayBridge.checkConnection();
```

### 12.2 配置模板

完整的配置文件示例可参考 `jev_three_layer_config.js`，包含所有可用配置项及其默认值。

### 12.3 测试用例

集成测试脚本包含以下测试用例：
- 服务状态检查
- 单链路通信测试（插件→中继→Worker→状态层）
- 端到端消息传递测试
- 延迟和吞吐量测量
- 错误恢复测试

---

*本指南适用于JEV-PluginSync-v1.0版本，最后更新日期：2024年*
