# JEV 项目命名规范文档

## 1. 文件命名规范

### JavaScript 文件
- **使用 kebab-case 命名法**（全小写，单词间用连字符连接）
- **示例**：
  - `ui-core.js` → `ui-core.js`（已符合规范）
  - `checkUpdate.js` → `check-update.js`
  - `security_task_int.js` → `security-task-int.js`
  - `auto_task_runner.js` → `auto-task-runner.js`

### CSS 文件
- **使用 kebab-case 命名法**
- **模块相关 CSS 文件**应包含模块名称
- **示例**：
  - `ui-style.css` → `ui-style.css`（已符合规范）
  - 新文件：`chat-module.css`, `settings-panel.css`, `shared-components.css`

### HTML 文件
- **使用 kebab-case 命名法**
- **组件化 HTML 文件**应有清晰的功能描述
- **示例**：
  - `index.html` → `index.html`（已符合规范）
  - 新文件：`chat-panel.html`, `settings-form.html`, `loading-spinner.html`

## 2. 变量与函数命名

### 变量命名
- **使用 camelCase 命名法**（首字母小写，后续单词首字母大写）
- **常量**使用 `UPPER_SNAKE_CASE`（全大写，单词间用下划线连接）
- **私有变量**前缀建议使用下划线 `_privateVar`
- **示例**：
  - `connectionStatus` ✓
  - `API_ENDPOINT` ✓
  - `_internalCounter` ✓

### 函数/方法命名
- **使用 camelCase 命名法**
- **描述性动词开头**
- **布尔返回值函数**建议使用 `is`, `has`, `can` 等前缀
- **示例**：
  - `loadModule()` ✓
  - `isConnected()` ✓
  - `hasPermission()` ✓

### 类与构造函数命名
- **使用 PascalCase 命名法**（所有单词首字母大写）
- **示例**：
  - `class UIManager` ✓
  - `function ConnectionHandler()` ✓

## 3. 模块与命名空间命名

### 命名空间
- **使用 PascalCase 命名法**
- **遵循语义化**，清晰表达模块功能
- **示例**：
  - `window.JEV_UI` ✓
  - `window.JEV_MODULES` ✓
  - `window.JEV_SECURITY` ✓

### 模块标识
- **使用 kebab-case 命名法**
- **示例**：
  - `jev-translate` ✓
  - `ai-recommendation` ✓
  - `settings-manager` ✓

## 4. CSS 类名命名

- **使用 kebab-case 命名法**
- **采用 BEM-like 风格**（Block-Element-Modifier）
  - `jev-card` (Block)
  - `jev-card__header` (Element)
  - `jev-card--highlighted` (Modifier)
- **状态类名**建议使用语义化前缀：
  - `is-active`
  - `has-error`
  - `can-expand`
- **示例**：
  - `jev-nav-item` ✓
  - `jev-message__avatar` ✓
  - `jev-button--primary` ✓

## 5. 注释规范

### 文件头部注释
- **每个文件**应包含标准化的头部注释
- **包含信息**：文件描述、创建日期、修改历史（可选）
- **格式**：
```javascript
/**
 * JEV 模块名称 - 功能描述
 * @file 文件路径
 * @created 2023-XX-XX
 */
```

### JSDoc 注释
- **公共方法/函数**必须添加 JSDoc 注释
- **类、接口、枚举**必须添加 JSDoc 注释
- **示例**：
```javascript
/**
 * 初始化UI控制器
 * @param {HTMLElement} container - 容器元素
 * @returns {Promise<void>}
 * @throws {Error} 当容器不存在时抛出错误
 */
async function initUI(container) { /* ... */ }
```

## 6. 目录结构规范

### 目录命名
- **使用 kebab-case 命名法**
- **描述性**，反映目录内容
- **示例**：
  - `scripts/modules/` ✓
  - `scripts/lib/` ✓
  - `styles/components/` ✓

### 模块组织
- **按功能域划分**目录
- **相关文件**放在同一目录下
- **示例结构**：
```
/scripts/
  /core/         # 核心功能模块
  /modules/      # 业务功能模块
  /lib/          # 工具库
  /components/   # UI组件
  /services/     # 服务层
  /styles/       # 样式文件
    /components/ # 组件样式
    /modules/    # 模块样式
    /utils/      # 工具样式
```

## 7. 配置项命名

### 配置键名
- **使用 camelCase 命名法**
- **环境变量**使用 `UPPER_SNAKE_CASE`
- **示例**：
  - `workerBaseUrl` ✓
  - `LOCAL_AGENT_URL` ✓

## 8. 实施指南

1. **现有文件**重命名时，确保同步更新所有引用
2. **新文件**创建时严格遵守命名规范
3. **代码审查**时将命名规范作为检查项之一
4. **定期检查**，确保规范持续执行

本命名规范自发布之日起生效，团队所有成员必须严格遵守。