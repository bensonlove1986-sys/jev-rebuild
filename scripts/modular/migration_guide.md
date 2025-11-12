# 从原始脚本迁移到模块化版本

本指南将帮助您从原始的DAOJIE聊天图片采集脚本迁移到新的模块化版本，确保平滑过渡并充分利用模块化架构带来的优势。

## 迁移前准备

1. **备份原始脚本**
   - 在开始迁移前，请确保备份原始的`daojiem_capture_optimized.user.js`文件

2. **了解模块化架构**
   - 模块化版本采用了清晰的分层架构
   - 核心功能被组织成独立的模块，便于维护和扩展

## 迁移步骤

### 步骤1：使用预构建的模块化用户脚本

最简单的迁移方式是直接使用预构建的模块化用户脚本：

1. 在用户脚本管理器（如Tampermonkey）中禁用原始脚本
2. 安装`daojiem_capture_modular.user.js`脚本
3. 刷新页面并测试功能

### 步骤2：自定义集成（高级用户）

如果您需要更灵活的集成方式，可以按照以下步骤操作：

1. **引入模块化系统**
   在您的自定义脚本中引入模块化系统：

   ```javascript
   // @require      d:\PDF转网页\scripts\modular\index.js
   ```

2. **初始化JEV系统**
   在脚本开始处初始化JEV系统：

   ```javascript
   (async function() {
     // 初始化JEV系统
     await JEV.initialize();
     
     // 您的自定义代码
     // ...
   })();
   ```

## 主要API变更

### 核心功能调用方式变更

#### 图片处理

**原始代码：**
```javascript
// 原始的图片处理调用
processImageToWorker(imageData);
```

**模块化版本：**
```javascript
// 模块化版本的图片处理调用
const result = await JEV.processImage(imageData);
```

#### 翻译功能

**原始代码：**
```javascript
// 原始的翻译调用
updateTranslationUI(element, translation);
```

**模块化版本：**
```javascript
// 模块化版本的翻译调用
JEV.ui.updateTranslationUI(element, translation);
```

#### 上传功能

**原始代码：**
```javascript
// 原始的上传调用（多个不同的上传函数）
uploadWithFetch(data);
uploadWithXHR(data);
// 或者使用PowerShell上传
```

**模块化版本：**
```javascript
// 模块化版本的统一上传调用
const result = await JEV.upload.upload(data);
```

### 配置管理变更

**原始代码：**
```javascript
// 原始的配置变量
let uploadTimeout = 30000;
let serverUrl = 'http://localhost:8000';
```

**模块化版本：**
```javascript
// 模块化版本的配置管理
JEV.config.set('upload.timeout', 45000);
JEV.config.set('worker.url', 'http://localhost:8000');

// 获取配置
const timeout = JEV.config.get('upload.timeout');
```

## 常见问题与解决方案

### 问题1：功能不工作

**解决方案：**
- 检查模块化系统是否正确初始化
- 验证所有依赖模块是否加载成功
- 查看浏览器控制台是否有错误信息

### 问题2：上传失败

**解决方案：**
- 确保`upload.fileFieldName`配置正确（解决422错误）
- 检查上传服务是否正在运行
- 验证网络连接和CORS设置

### 问题3：与其他脚本冲突

**解决方案：**
- 检查是否有命名冲突
- 使用JEV的命名空间功能：`JEV.config.set('namespace', 'myCustomNamespace')`
- 调整脚本的执行顺序

## 自定义与扩展

### 添加自定义模块

您可以扩展模块化系统，添加自己的功能：

```javascript
// 定义自定义模块
const myCustomModule = {
  initialize: function() {
    console.log('自定义模块初始化');
  },
  myFunction: function() {
    return '自定义功能';
  }
};

// 注册到JEV系统
JEV.registerModule('myCustomModule', myCustomModule);

// 使用自定义模块
const result = JEV.myCustomModule.myFunction();
```

### 覆盖默认行为

您可以覆盖现有模块的行为：

```javascript
// 保存原始方法
const originalUpload = JEV.upload.upload;

// 覆盖上传方法
JEV.upload.upload = async function(data, options) {
  console.log('自定义上传逻辑');
  // 可以在此处添加自定义逻辑
  return await originalUpload(data, options);
};
```

## 性能优化建议

1. **仅加载必要的模块**
   - 如果只需要特定功能，可以只引入相关模块

2. **懒加载大型模块**
   - 对于不常用的功能，可以使用按需加载

3. **缓存频繁使用的结果**
   - 使用`JEV.cache`对象缓存频繁使用的数据

## 兼容性注意事项

1. **浏览器支持**
   - 模块化版本支持所有现代浏览器
   - 对于旧浏览器，可能需要添加polyfill

2. **用户脚本管理器兼容性**
   - 与Tampermonkey、Greasemonkey等主流用户脚本管理器兼容

3. **ES6+特性**
   - 模块化版本使用ES6+特性，如果需要支持旧环境，请使用Babel转译

## 回退策略

如果在迁移过程中遇到严重问题，可以快速回退到原始脚本：

1. 禁用模块化版本的脚本
2. 重新启用原始脚本
3. 检查并解决导致迁移失败的问题

## 迁移验证

迁移完成后，请验证以下功能是否正常工作：

- [ ] 图片点击采集功能
- [ ] 图片上传功能
- [ ] OCR识别功能
- [ ] 翻译结果显示
- [ ] UI交互功能
- [ ] 错误处理机制

## 最佳实践

1. **增量迁移**
   - 先在非关键环境中测试模块化版本
   - 逐步将功能从原始脚本迁移到模块化版本

2. **版本控制**
   - 使用版本控制工具管理您的脚本
   - 为每次重要更改创建标签

3. **文档更新**
   - 及时更新您的脚本文档，反映新的API和功能

## 获取帮助

如果在迁移过程中遇到问题，可以：

1. 查看控制台错误日志
2. 参考模块化系统的API文档
3. 使用测试脚本来诊断问题

## 结论

模块化版本提供了更清晰的代码结构、更好的可维护性和扩展性。通过本指南，您应该能够顺利地从原始脚本迁移到模块化版本，并充分利用新架构带来的优势。

祝您使用愉快！