# DAOJIE 聊天图片采集 - 模块化系统

这是DAOJIE聊天图片采集脚本的模块化重写版本，采用现代JavaScript模块化架构，提供更清晰的代码结构、更好的可维护性和扩展性。

## 架构设计

模块化系统采用分层架构，主要包含以下核心模块：

```
modular/
├── app.js              # 主应用模块，整合所有子模块
├── config.js           # 配置管理模块
├── logger.js           # 日志管理模块
├── utils.js            # 工具函数模块
├── uploader.js         # 上传管理模块
├── worker.js           # Worker通信模块
├── ui.js               # UI管理模块
├── index.js            # 入口文件，提供统一导出
├── example.js          # 使用示例
└── README.md           # 文档（当前文件）
```

## 模块说明

### 1. config.js - 配置管理模块

集中管理所有配置项，提供统一的配置访问接口。

**主要功能：**
- 统一配置管理
- 默认配置设置
- 配置验证和类型检查
- 配置持久化（可选）

### 2. logger.js - 日志管理模块

提供统一的日志记录接口，支持不同日志级别和格式化。

**主要功能：**
- 多级日志支持（debug, info, warn, error）
- 结构化日志记录
- 支持日志过滤
- 浏览器控制台适配

### 3. utils.js - 工具函数模块

提供通用的工具函数，供其他模块使用。

**主要功能：**
- 安全执行
- 安全属性访问
- 数据格式化
- 唯一ID生成
- 延迟和重试
- 节流和防抖
- Base64转换
- URL验证

### 4. uploader.js - 上传管理模块

整合所有上传相关功能，提供统一的上传接口和智能模式选择。

**主要功能：**
- 支持多种上传方式（Fetch API, XMLHttpRequest）
- 智能上传模式选择
- 上传重试机制
- 上传统计
- 上传进度监控（可选）

### 5. worker.js - Worker通信模块

管理与后台服务的通信，提供统一的调用接口。

**主要功能：**
- 支持多种通信方式
- 错误处理和重试
- 请求超时控制
- 图片处理接口

### 6. ui.js - UI管理模块

处理用户界面相关操作，提供统一的UI交互接口。

**主要功能：**
- 对话框创建
- 翻译结果显示
- HTML转义
- 全局UI修复
- 动画效果支持

### 7. app.js - 主应用模块

整合所有子模块，提供统一的应用接口。

**主要功能：**
- 初始化管理
- 图片处理流程协调
- 翻译功能整合
- 统一窗口创建
- 全局错误处理

### 8. index.js - 入口文件

作为整个模块化系统的统一入口点，提供与原始脚本兼容的接口。

**主要功能：**
- 统一导出
- 自动初始化
- 向后兼容支持
- 全局变量注册

## 使用方法

### 1. 直接在浏览器中使用（用户脚本）

使用模块化版本的用户脚本：`daojiem_capture_modular.user.js`

```javascript
// 在Tampermonkey或其他用户脚本管理器中安装此脚本
// @require      d:\PDF转网页\scripts\modular\index.js
```

### 2. 在自定义项目中使用

导入整个JEV对象或特定模块：

```javascript
// 导入整个JEV对象
import JEV from './modular/index.js';

// 初始化
await JEV.initialize();

// 处理图片
const result = await JEV.processImage(imageData);
```

```javascript
// 导入特定模块
import { uploader, worker, ui } from './modular/index.js';

// 使用特定模块
const stats = uploader.getStats();
```

## 主要API

### 核心功能

#### JEV.initialize(options)
初始化JEV系统
- **参数：** `options` - 初始化选项对象
- **返回：** `Promise<boolean>` - 初始化是否成功

#### JEV.processImage(imageData, options)
处理图片（上传、OCR、翻译）
- **参数：**
  - `imageData` - 图片数据（File, Blob或Data URL）
  - `options` - 处理选项
- **返回：** `Promise<Object>` - 处理结果

#### JEV.translateText(text, options)
翻译文本
- **参数：**
  - `text` - 要翻译的文本
  - `options` - 翻译选项
- **返回：** `Promise<Object>` - 翻译结果

#### JEV.createUnifiedWindow()
创建JEV统一窗口
- **返回：** `HTMLElement|null` - 创建的窗口元素

### UI相关API

#### JEV.ui.createInputDialog(options)
创建输入对话框
- **参数：** `options` - 对话框选项
- **返回：** `Promise<Object>` - 用户输入结果

#### JEV.ui.createCommandDialog(options)
创建命令执行对话框
- **参数：** `options` - 对话框选项
- **返回：** `Promise<Object>` - 用户操作结果

#### JEV.ui.updateTranslationUI(element, translation)
更新翻译UI显示
- **参数：**
  - `element` - 要更新的元素
  - `translation` - 翻译结果

### 上传相关API

#### JEV.upload.upload(data, options)
上传数据
- **参数：**
  - `data` - 要上传的数据
  - `options` - 上传选项
- **返回：** `Promise<Object>` - 上传结果

#### JEV.upload.getStats()
获取上传统计
- **返回：** `Object` - 上传统计信息

### Worker相关API

#### JEV.worker.callWorker(method, data, options)
调用Worker方法
- **参数：**
  - `method` - 方法名
  - `data` - 调用数据
  - `options` - 调用选项
- **返回：** `Promise<Object>` - 调用结果

#### JEV.worker.processImage(imageData, options)
处理图片
- **参数：**
  - `imageData` - 图片数据
  - `options` - 处理选项
- **返回：** `Promise<Object>` - 处理结果

## 配置项说明

可以通过 `JEV.config.get()` 获取配置，通过 `JEV.config.set()` 设置配置。

### 主要配置项

#### upload
```javascript
{
  baseUrl: 'http://localhost:8000/upload', // 上传基础URL
  timeout: 30000,                          // 超时时间（毫秒）
  maxRetries: 3,                          // 最大重试次数
  retryDelay: 1000,                       // 重试延迟（毫秒）
  fileFieldName: 'file'                   // 文件字段名
}
```

#### worker
```javascript
{
  mode: 'local',                           // 工作模式（local, webworker, iframe）
  url: 'http://localhost:8000',           // Worker服务URL
  timeout: 60000                          // 超时时间（毫秒）
}
```

#### ui
```javascript
{
  theme: 'default',                        // UI主题
  defaultDialogWidth: '400px'              // 默认对话框宽度
}
```

## 向后兼容性

模块化版本提供了与原始脚本兼容的API，确保现有功能可以正常工作。同时，通过新的模块化架构，提高了代码的可维护性和扩展性。

## 优化亮点

1. **模块化架构**：清晰的代码分层，降低耦合度
2. **统一接口**：提供一致的API，简化使用
3. **智能降级**：自动检测环境并选择最佳实现
4. **完善的错误处理**：统一的错误处理机制
5. **性能优化**：减少冗余代码，提高执行效率
6. **可扩展性**：易于添加新功能和模块

## 调试指南

1. **启用调试日志**：`JEV.config.set('debug', true)`
2. **查看统计信息**：`JEV.upload.getStats()`
3. **检查应用状态**：`JEV.getState()`
4. **重置应用**：`JEV.reset()`

## 故障排除

### 常见问题

1. **上传失败（422错误）**
   - 问题：服务器返回422 Unprocessable Entity
   - 解决：确保`fileFieldName`配置正确（默认为'file'）

2. **Worker连接失败**
   - 问题：无法连接到Worker服务
   - 解决：检查Worker服务是否运行，URL配置是否正确

3. **图片处理超时**
   - 问题：处理大图片时超时
   - 解决：增加`worker.timeout`配置值

## 贡献指南

欢迎对模块化系统进行改进和扩展！

1. 遵循现有代码风格和命名规范
2. 为新功能添加详细文档
3. 确保向后兼容性
4. 进行充分测试

## 许可证

MIT License