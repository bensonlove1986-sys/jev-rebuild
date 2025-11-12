# JEV客服系统 - Daojie聊天模块

## 模块简介

本模块为JEV客服系统提供了与Daojie平台聊天功能的无缝集成，在显相层右下角添加聊天按钮，并通过iframe嵌入Daojie平台聊天界面。

## 功能特点

- 右下角浮动"💬 聊天"按钮，支持一键打开聊天窗口
- 状态灯实时显示聊天模块连接状态
- 安全的iframe嵌入，防止跨域脚本攻击
- 完整的错误处理与加载状态管理（5秒超时检测）
- 详细的操作日志记录（写入localStorage）
- 自动初始化，无需额外配置

## 文件结构

```
JEV_Client_Web/
├── modules/
│   ├── daojie_chat_panel.js     # 核心模块文件
│   └── README_daojie_chat.md    # 模块说明文档
├── daojie_chat_integration_example.html  # 集成示例
└── test_daojie_chat.html        # 功能测试页面
```

## 安装与集成

### 步骤1：确保模块文件存在

将 `daojie_chat_panel.js` 文件放置在JEV系统的 `/modules/` 目录下。

### 步骤2：在JEV系统页面中添加模块引用

将以下代码添加到JEV系统显相层HTML文件的 `<head>` 或 `<body>` 结束标签前：

```html
<!-- JEV Daojie 聊天模块集成 -->
<script type="text/javascript" src="/modules/daojie_chat_panel.js"></script>
```

### 完整集成示例

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>JEV 客服系统动态显相版</title>
    
    <!-- 其他现有CSS和JS引用 -->
    
    <!-- JEV Daojie 聊天模块集成 -->
    <script type="text/javascript" src="/modules/daojie_chat_panel.js"></script>
</head>
<body>
    <!-- JEV系统现有内容 -->
    
    <!-- 状态显相面板 -->
    <div id="jev-status-panel">
        <!-- 现有状态面板内容 -->
        <!-- Daojie聊天状态将自动添加到此处 -->
    </div>
</body>
</html>
```

## 安全特性

- **X-Agent-Token**：模块头部已添加 `X-Agent-Token: jev-secure-key-001`，用于未来的安全扩展
- **跨域安全**：禁止iframe与父页面跨域执行脚本
- **HTTPS支持**：所有资源使用HTTPS协议
- **日志安全**：详细日志写入localStorage，确保敏感信息不泄露

## 日志记录

模块会记录以下操作日志到localStorage：

- 模块加载时间
- 聊天按钮点击次数
- iframe加载状态
- 加载成功/失败信息

日志键格式：`jev_chat_module_log_<timestamp>`

## 故障排除

### 常见问题

1. **聊天窗口加载失败**
   - 检查网络连接
   - 确认Daojie平台(`https://app.daojiemarketing.com/`)可访问
   - 查看浏览器控制台错误信息

2. **聊天按钮不显示**
   - 确认模块文件路径正确
   - 检查是否有JavaScript错误阻止了模块初始化

3. **状态灯显示红色**
   - 表示加载超时或失败
   - 等待一段时间后重试，或检查网络连接

### 调试方法

1. 打开浏览器控制台，查看是否有相关错误信息
2. 检查localStorage中的日志记录
3. 确认`#jev-status-panel`元素存在于页面中

## 测试

可以使用以下页面进行功能测试：

- `test_daojie_chat.html` - 完整功能测试页面，模拟JEV系统环境
- `daojie_chat_integration_example.html` - 集成指南与示例页面

## 技术规范

- 兼容性：支持所有现代浏览器（Chrome、Firefox、Safari、Edge）
- 响应式设计：适配不同屏幕尺寸
- 性能优化：最小化DOM操作，减少资源消耗
- 代码规范：遵循ES6标准，使用模块化设计

## 版本信息

- 版本：1.0.0
- 创建日期：2025-07-17
- 维护者：JEV系统开发团队

## 注意事项

1. 确保JEV系统页面中存在ID为`jev-status-panel`的元素，用于显示聊天状态
2. 由于浏览器安全策略，某些跨域操作可能受到限制
3. 如果Daojie平台有访问限制，可能需要额外的授权配置
4. 定期清理localStorage中的旧日志，避免占用过多存储空间

## 升级与扩展

未来版本可能包括：
- 自定义聊天按钮样式
- 多语言支持
- 更详细的统计分析
- 与JEV系统的深度集成

---

如有任何问题或需要支持，请联系JEV系统开发团队。