# JEV 项目重构计划

## 1. 概述

本文档详细说明 JEV 项目的模块化重构计划，旨在实现以下目标：
- 严格遵循单一职责原则
- 增强接口定义与类型系统
- 标准化命名规范
- 优化功能分解与聚合
- 改进 UI 和样式文件组织
- 优化依赖管理
- 提升开发流程
- 统一 UI/UX 标准
- 规范环境配置管理

## 2. 模块重构策略

### 2.1 ui-core.js 分解计划

当前 `ui-core.js` 文件将被分解为以下独立模块：

| 模块名称 | 功能职责 | 文件路径 | 导出对象 |
|---------|---------|---------|----------|
| UI 核心控制器 | 模块生命周期管理、主流程控制 | `scripts/core/ui-controller.js` | `JEV_UI` |
| 容器管理 | UI容器创建与DOM引用管理 | `scripts/core/container-manager.js` | `ContainerManager` |
| 导航控制 | 导航条创建与模块切换 | `scripts/core/navigation-manager.js` | `NavigationManager` |
| 状态管理 | 应用状态保存、加载、更新 | `scripts/core/state-manager.js` | `StateManager` |
| 连接监控 | 连接状态检测与更新 | `scripts/core/connection-monitor.js` | `ConnectionMonitor` |
| 事件处理 | 全局事件绑定与管理 | `scripts/core/event-manager.js` | `EventManager` |
| 模块加载器 | 动态模块加载与卸载 | `scripts/core/module-loader.js` | `ModuleLoader` |

### 2.2 现有模块优化

| 现有模块 | 优化内容 | 新文件路径 |
|---------|---------|----------|
| checkUpdate.js | 重命名、接口增强 | `scripts/modules/check-update.js` |
| jev-translate.js | 代码优化、依赖清理 | `scripts/modules/jev-translate.js` |
| auto_task_runner.js | 重命名、功能拆分 | `scripts/modules/auto-task-runner.js` |
| security_task_integration.js | 重命名、接口标准化 | `scripts/modules/security-task-integration.js` |

## 3. 样式文件组织

### 3.1 ui-style.css 拆分计划

当前 `ui-style.css` 文件将被拆分为以下模块化样式文件：

| 样式文件 | 职责 | 文件路径 |
|---------|------|----------|
| 全局变量 | CSS变量、基础重置 | `styles/globals/variables.css` |
| 基础样式 | 全局样式、通用元素样式 | `styles/globals/base.css` |
| 布局组件 | 布局容器、栅格系统 | `styles/components/layout.css` |
| UI组件 | 按钮、输入框、卡片等 | `styles/components/ui-components.css` |
| 状态样式 | 加载状态、错误提示等 | `styles/components/states.css` |
| 导航样式 | 导航栏、菜单等 | `styles/modules/navigation.css` |
| 聊天模块样式 | 聊天界面特定样式 | `styles/modules/chat-module.css` |
| 翻译模块样式 | 翻译界面特定样式 | `styles/modules/translate-module.css` |
| 工具模块样式 | 工具界面特定样式 | `styles/modules/tools-module.css` |
| 设置模块样式 | 设置界面特定样式 | `styles/modules/settings-module.css` |

### 3.2 入口样式文件

创建主样式入口文件 `styles/main.css`，通过 `@import` 导入所有模块化样式：
```css
/* 导入全局样式 */
@import './globals/variables.css';
@import './globals/base.css';

/* 导入组件样式 */
@import './components/layout.css';
@import './components/ui-components.css';
@import './components/states.css';

/* 导入模块样式 */
@import './modules/navigation.css';
@import './modules/chat-module.css';
@import './modules/translate-module.css';
@import './modules/tools-module.css';
@import './modules/settings-module.css';
```

## 4. 接口定义增强

### 4.1 模块接口标准

所有模块必须实现以下接口：

```javascript
/**
 * 模块接口定义
 * @interface JEVModule
 */
interface JEVModule {
  /**
   * 渲染模块UI
   * @param {HTMLElement} container - 模块容器元素
   */
  render(container: HTMLElement): void;
  
  /**
   * 初始化模块
   * @param {HTMLElement} container - 模块容器元素
   */
  init(container: HTMLElement): Promise<void> | void;
  
  /**
   * 销毁模块
   */
  destroy(): void;
  
  /**
   * 获取模块状态信息
   * @returns {Object} 模块状态对象
   */
  getStateInfo?(): Object;
}
```

### 4.2 核心服务接口

| 服务 | 接口定义 | 文件路径 |
|------|---------|----------|
| 存储服务 | StorageService | `scripts/interfaces/storage.js` |
| 连接服务 | ConnectionService | `scripts/interfaces/connection.js` |
| 工具服务 | UtilsService | `scripts/interfaces/utils.js` |
| 安全服务 | SecurityService | `scripts/interfaces/security.js` |

## 5. 目录结构优化

优化后的目录结构如下：

```
/JEV_Client/
├─ jev-chatbot-plugin.user.js     # 主入口文件（重命名）
├─ index.html                     # 入口HTML
├─ /scripts/
│   ├─ /core/                     # 核心功能模块
│   │   ├─ ui-controller.js       # UI控制器
│   │   ├─ container-manager.js   # 容器管理器
│   │   ├─ navigation-manager.js  # 导航管理器
│   │   ├─ state-manager.js       # 状态管理器
│   │   ├─ connection-monitor.js  # 连接监控器
│   │   ├─ event-manager.js       # 事件管理器
│   │   └─ module-loader.js       # 模块加载器
│   ├─ /modules/                  # 业务功能模块
│   │   ├─ jev-translate.js       # 翻译模块
│   │   ├─ chat.js                # 聊天模块
│   │   ├─ ai.js                  # AI推荐模块
│   │   ├─ tools.js               # 工具模块
│   │   ├─ settings.js            # 设置模块
│   │   ├─ check-update.js        # 版本检测模块（重命名）
│   │   ├─ auto-task-runner.js    # 自动任务执行器（重命名）
│   │   └─ security-task-integration.js # 安全任务集成（重命名）
│   ├─ /lib/                      # 工具库
│   │   ├─ connection.js          # 通信连接
│   │   ├─ storage.js             # 存储管理
│   │   └─ utils.js               # 工具函数
│   ├─ /interfaces/               # 接口定义
│   │   ├─ module.js              # 模块接口
│   │   ├─ storage.js             # 存储接口
│   │   ├─ connection.js          # 连接接口
│   │   └─ security.js            # 安全接口
│   └─ /dev/                      # 开发工具
│       └─ init-all-modules.js    # 模块初始化脚本（重命名）
├─ /styles/
│   ├─ main.css                   # 主样式入口
│   ├─ /globals/                  # 全局样式
│   │   ├─ variables.css          # CSS变量
│   │   └─ base.css               # 基础样式
│   ├─ /components/               # 组件样式
│   │   ├─ layout.css             # 布局组件
│   │   ├─ ui-components.css      # UI组件
│   │   └─ states.css             # 状态样式
│   └─ /modules/                  # 模块样式
│       ├─ navigation.css         # 导航样式
│       ├─ chat-module.css        # 聊天模块样式
│       ├─ translate-module.css   # 翻译模块样式
│       ├─ tools-module.css       # 工具模块样式
│       └─ settings-module.css    # 设置模块样式
├─ /components/                   # HTML组件
│   ├─ chat-panel.html            # 聊天面板组件
│   ├─ settings-form.html         # 设置表单组件
│   └─ loading-spinner.html       # 加载指示器组件
├─ /config/                       # 配置文件
│   ├─ development.js             # 开发环境配置
│   ├─ testing.js                 # 测试环境配置
│   └─ production.js              # 生产环境配置
└─ /docs/                         # 文档
    ├─ NAMING_CONVENTIONS.md      # 命名规范
    ├─ REFACTORING_PLAN.md        # 重构计划
    └─ API_DOCUMENTATION.md       # API文档
```

## 6. 依赖管理策略

### 6.1 依赖关系图

创建模块依赖关系图：

```
主入口 (jev-chatbot-plugin.user.js)
    ├── 核心模块
    │   ├── UI控制器 (ui-controller.js)
    │   │   ├── 容器管理器 (container-manager.js)
    │   │   ├── 导航管理器 (navigation-manager.js)
    │   │   ├── 状态管理器 (state-manager.js)
    │   │   ├── 连接监控器 (connection-monitor.js)
    │   │   ├── 事件管理器 (event-manager.js)
    │   │   └── 模块加载器 (module-loader.js)
    │   └── 接口定义 (interfaces/)
    ├── 业务模块
    │   ├── 翻译模块 (jev-translate.js)
    │   ├── 聊天模块 (chat.js)
    │   ├── AI模块 (ai.js)
    │   ├── 工具模块 (tools.js)
    │   ├── 设置模块 (settings.js)
    │   └── 其他模块
    └── 工具库
        ├── 连接库 (connection.js)
        ├── 存储库 (storage.js)
        └── 工具库 (utils.js)
```

### 6.2 导入导出策略

- 使用 ES6 模块系统 (import/export)
- 避免循环依赖
- 模块间通过明确定义的接口通信
- 业务模块依赖核心模块，核心模块不依赖业务模块

## 7. 实施步骤

### 7.1 第一阶段：准备工作
1. 创建命名规范文档 ✓
2. 创建重构计划文档 ✓
3. 建立新的目录结构
4. 设置构建工具配置

### 7.2 第二阶段：核心模块重构
1. 拆分 ui-core.js 为多个核心模块
2. 实现标准接口定义
3. 增强 JSDoc 注释

### 7.3 第三阶段：样式重构
1. 拆分 ui-style.css 为模块化样式文件
2. 创建主样式入口文件
3. 更新引用路径

### 7.4 第四阶段：业务模块优化
1. 重命名模块文件，遵循命名规范
2. 优化模块代码，增强接口
3. 更新模块间依赖

### 7.5 第五阶段：HTML组件化
1. 创建组件化HTML文件
2. 实现组件加载机制
3. 更新页面引用

### 7.6 第六阶段：配置管理
1. 创建环境配置文件
2. 实现配置加载机制
3. 更新代码使用配置

### 7.7 第七阶段：测试与验证
1. 单元测试
2. 集成测试
3. 性能测试
4. 兼容性测试

### 7.8 第八阶段：文档更新
1. 更新 API 文档
2. 更新使用文档
3. 更新部署文档

## 8. 质量保证措施

### 8.1 代码审查
- 每次重构提交后必须进行代码审查
- 审查重点：单一职责原则、接口定义、命名规范

### 8.2 测试策略
- 为每个核心模块编写单元测试
- 为关键功能编写集成测试
- 确保重构前后功能一致性

### 8.3 回滚计划
- 每次重构前备份关键文件
- 保持版本控制系统的完整性
- 制定详细的回滚步骤

## 9. 完成标准

1. 所有模块严格遵循单一职责原则
2. 所有公共接口都有完整的JSDoc注释
3. 所有文件、变量、函数命名符合规范
4. 样式文件完全模块化
5. 依赖关系清晰，无循环依赖
6. 所有测试用例通过
7. 文档完整且最新

---

本文档将作为重构工作的指南，确保所有重构工作按照统一的标准和方向进行。