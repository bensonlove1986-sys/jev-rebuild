# JEV 自动图片采集模块

## 模块概述

**jev_auto_collector_smooth.js** 是一个高性能、不卡顿的自动图片采集模块，专为 JEV 系统设计，能够在浏览器中自动识别并上传网页上的图片到 Worker 进行分析和存档。模块采用异步批处理机制，确保页面流畅运行的同时完成图片采集任务。

## 核心功能

### 1. 智能图片识别与上传
- 自动扫描网页上的 `<img>` 标签
- 每 8 秒执行一次扫描任务
- 每次最多处理 5 张未上传图片
- 异步上传，不阻塞主线程
- 使用 `dataset.collected="1"` 标记已处理图片

### 2. 高性能与防卡顿设计
- 异步批处理机制，分批处理图片
- 每张图片上传后等待 200ms 的节流机制
- 轻量级 DOM 更新，使用 textContent 而非 innerHTML
- 延迟检测与优化显示

### 3. 用户界面元素
- 圆角玻璃拟态风格的控制按钮
- 显相层实时状态显示
- 采集计数与延迟监控
- 状态切换动画效果

### 4. 安全策略
- 域名白名单机制（jevshop.com, app.daojiemarketing.com）
- 禁止访问本地环境（localhost, 127.0.0.1）
- HTTPS 加密通信
- 日志安全存储（localStorage）
- 请求头安全认证

## 安装与使用

### 快速集成

将模块添加到你的 HTML 页面中：

```html
<script src="/modules/jev_auto_collector_smooth.js"></script>
```

模块加载后会自动初始化并开始采集工作（默认状态为 ON）。

### 手动控制 API

模块在全局对象 `window.JEVCollectorAPI` 中提供了以下控制方法：

```javascript
// 切换采集状态（开启/关闭）
window.JEVCollectorAPI.toggleCollection();

// 获取当前状态信息
const status = window.JEVCollectorAPI.getStatus();
/* 返回值格式：
{
  isRunning: true/false,
  collectedCount: 123,
  currentDelay: 56,
  lastScanTime: 1621234567890
}
*/

// 手动触发一次扫描
window.JEVCollectorAPI.scanImages();

// 重置采集计数器
window.JEVCollectorAPI.resetCounter();
```

## 事件监听

模块会在状态发生变化时触发自定义事件：

```javascript
window.addEventListener('jev_collector_updated', (event) => {
  console.log(event.detail);
  /* event.detail 包含：
  {
    type: 'scan' | 'upload' | 'status_change' | 'error',
    message: '详细信息',
    data: { ...相关数据 }
  }
  */
});
```

## 配置参数

模块内部使用以下配置参数（目前为硬编码，未来可扩展为配置文件）：

| 参数 | 值 | 说明 |
|------|-----|------|
| SCAN_INTERVAL | 8000 | 扫描间隔（毫秒） |
| BATCH_SIZE | 5 | 每批处理图片数量 |
| THROTTLE_DELAY | 200 | 图片上传间隔（毫秒） |
| WORKER_URL | https://jevshop.bensonlove1986.workers.dev/analyze-image | Worker 上传地址 |
| ALLOWED_DOMAINS | ['jevshop.com', 'app.daojiemarketing.com'] | 允许的域名列表 |

## 安全特性

### 请求头设置
每次上传请求包含以下安全头：

```
Content-Type: application/json
X-Agent-Token: jev-secure-key-001
X-System-Layer: plugin
```

### 数据安全
- 不上传本地文件系统文件
- 所有通信使用 HTTPS
- 避免跨域安全问题
- 日志存储在浏览器 localStorage 中，键名格式为 `jev_auto_log_<timestamp>`

## 测试功能

模块提供了专门的测试页面 `/test_auto_collector.html`，用于：

1. 验证模块功能正确性
2. 模拟 Worker 响应
3. 测试性能和延迟
4. 监控日志和错误处理

测试页面包含：
- 模块状态控制面板
- 动态测试图片生成
- Worker 响应模拟
- 详细操作日志
- 性能指标监控

## 性能优化

### 防卡顿策略
1. **异步处理**：所有耗时操作使用 async/await
2. **批处理**：限制每次扫描数量
3. **节流控制**：上传间隔确保不造成网络拥堵
4. **轻量更新**：最小化 DOM 操作，使用 textContent
5. **内存管理**：清理无用引用，避免内存泄漏

### 延迟监控
模块会实时监控操作延迟，并在显相层显示，确保性能符合要求（<100ms）。

## 错误处理

模块包含完善的错误处理机制：

1. 域名验证失败时停止执行
2. 上传失败时记录日志并重试
3. 网络错误时降级处理
4. 资源加载失败时优雅退出

## 日志记录

### 本地日志
模块将日志存储在浏览器的 localStorage 中，键名为 `jev_auto_log_<timestamp>`。日志内容包括：
- 操作类型
- 时间戳
- 执行状态
- 相关数据

### 显相层日志
重要操作会在显相层界面显示，包括：
- 模块启动信息
- 当前域名
- 采集频率和延迟
- 运行状态

## 集成注意事项

1. **域名限制**：模块仅在白名单域名下自动运行，其他域名需通过测试模式使用
2. **HTTPS 要求**：确保页面使用 HTTPS 协议，否则可能无法正常与 Worker 通信
3. **权限问题**：某些浏览器可能限制对 `dataset` 的修改，需确保页面安全策略允许
4. **性能考量**：在图片密集型网站上使用时，可能需要调整批处理大小和扫描间隔

## 故障排除

### 常见问题

1. **模块不启动**
   - 检查域名是否在白名单中
   - 确认 HTTPS 连接正常
   - 查看控制台是否有错误信息

2. **图片不上传**
   - 检查网络连接
   - 确认 Worker URL 可访问
   - 查看请求头中的 Token 是否正确

3. **页面卡顿**
   - 减少页面图片数量
   - 考虑降低扫描频率
   - 检查浏览器内存占用

### 调试方法
使用测试页面进行功能验证：
1. 访问 `/test_auto_collector.html`
2. 检查模块状态面板
3. 查看操作日志
4. 模拟各种场景进行测试

## 版本信息

- **版本**：1.0.0
- **发布日期**：2023-06-15
- **开发团队**：JEV 系统开发组
- **兼容性**：支持所有现代浏览器（Chrome, Firefox, Safari, Edge）

---

*本模块是 JEV 系统的一部分，旨在提供高性能、安全的图片自动采集功能。如有问题，请联系开发团队。*