# DeepSeek 安全执行系统 - 安装与集成指南

## 目录

- [系统要求](#系统要求)
- [准备工作](#准备工作)
- [安装步骤](#安装步骤)
- [配置详解](#配置详解)
- [启动系统](#启动系统)
- [测试验证](#测试验证)
- [故障排除](#故障排除)
- [安全最佳实践](#安全最佳实践)

## 系统要求

### 硬件要求
- 处理器：Intel Core i5 或同等性能以上
- 内存：8GB RAM 或更多
- 存储空间：至少 1GB 可用空间

### 软件要求
- **操作系统**：Windows 10/11
- **Node.js**：v18.0.0 或更高版本
- **PowerShell**：7.0 或更高版本
- **防火墙配置**：允许 1818 端口入站连接

## 准备工作

### 1. 安装 Node.js

1. 访问 [Node.js 官方网站](https://nodejs.org/)
2. 下载并安装最新的 LTS 版本（v18 或更高）
3. 安装完成后，打开命令提示符验证安装：
   ```bash
   node -v
   npm -v
   ```
   确保显示的版本号符合要求

### 2. 安装 PowerShell 7+

1. 访问 [PowerShell 官方 GitHub 发布页](https://github.com/PowerShell/PowerShell/releases/latest)
2. 下载适用于 Windows 的安装包（.msi 文件）
3. 运行安装程序并按照提示完成安装
4. 安装完成后，打开 PowerShell 7 验证：
   ```powershell
   $PSVersionTable
   ```
   确保 `PSVersion` 显示 7.0 或更高版本

### 3. 配置防火墙

1. 打开 Windows Defender 防火墙
2. 点击「高级设置」
3. 选择「入站规则」→「新建规则」
4. 规则类型选择「端口」，点击「下一步」
5. 选择「TCP」，输入「特定本地端口」为 `1818`，点击「下一步」
6. 选择「允许连接」，点击「下一步」
7. 选择应用规则的网络类型，点击「下一步」
8. 为规则命名（如「DeepSeek DesktopAgent 1818 端口」），点击「完成」

## 安装步骤

### 1. 准备项目文件

确保所有 DeepSeek 安全执行系统的文件已正确放置在以下目录结构中：

```
PDF转网页/
├── scripts/
│   ├── config/
│   │   └── deepseekSecurityConfig.js
│   ├── modular/
│   │   ├── deepseekSecurityExecutor.js
│   │   ├── deepseekDryRun.js
│   │   ├── deepseekPathRuntimeControl.js
│   │   ├── deepseekFaultProtection.js
│   │   ├── deepseekQueueManager.js
│   │   ├── deepseekLoggingSystem.js
│   │   └── operator.js
│   └── tests/
│       └── deepseekSecurityTests.js
├── desktopAgent.ps1
├── README.md
└── INSTALLATION_GUIDE.md
```

### 2. 安装依赖包（如果需要）

如果 Operator 调度层需要额外的 npm 包，请在项目根目录运行：

```bash
cd PDF转网页
npm install
```

## 配置详解

### 1. 安全配置文件 (deepseekSecurityConfig.js)

编辑 `scripts/config/deepseekSecurityConfig.js` 文件，设置以下关键参数：

```javascript
// 基本配置
const config = {
  // 系统标识
  systemName: "DeepSeek-Security-Engine",
  version: "1.0.0",
  
  // 安全级别
  securityLevel: "high", // low, medium, high
  
  // 是否暂停系统（必须设置为 false 才能启用系统）
  paused: false,
  
  // 允许的 token 白名单（必须包含 TREA_MAIN）
  tokenWhitelist: ["TREA_MAIN", "ADMIN_TOKEN"],
  
  // 敏感内容过滤规则
  sensitiveContentFilters: {
    apiKeys: /(api[_-]?key|apikey)[\s]*[=:]?[\s]*(['\"]?)[a-zA-Z0-9]{16,}(\1)/gi,
    passwords: /(password|passwd|pwd)[\s]*[=:]?[\s]*(['\"]?)[^\1\n\r]{6,}(\1)/gi,
    internalPaths: /(?:c|d):\\(?:windows|system32|users|program files)/gi
  },
  
  // 允许的操作类型
  allowedActions: ["move", "click", "type", "capture"],
  
  // 重试和失败处理
  maxRetryAttempts: 3,
  autoLockAfterFailures: 3,
  
  // 暂停标志文件路径
  pauseFilePath: "C:\\JEV\\PAUSE.flag",
  
  // 锁定状态文件路径
  lockStatePath: "C:\\JEV\\LOCK.state",
  
  // 日志配置
  logging: {
    enabled: true,
    level: "info", // debug, info, warn, error
    directory: "C:\\JEV\\Logs",
    maxFileSize: 10 * 1024 * 1024, // 10MB
    maxFiles: 5
  },
  
  // DesktopAgent 配置
  desktopAgent: {
    endpoint: "http://localhost:1818/execute",
    timeout: 30000, // 30秒超时
    retryInterval: 5000 // 5秒重试间隔
  },
  
  // 路径控制配置
  pathControl: {
    enabled: true,
    allowedBasePaths: ["D:\\PDF转网页"],
    blockExternalPaths: true,
    maxFileSize: 50 * 1024 * 1024 // 50MB
  },
  
  // 确认流程配置
  confirmation: {
    requiredActions: ["click", "type"], // 需要人工确认的操作
    timeout: 60000, // 60秒超时
    autoApproveSmallActions: true
  }
};

module.exports = config;
```

### 2. DesktopAgent 配置

编辑 `desktopAgent.ps1` 文件顶部的配置参数：

```powershell
# 配置参数
$PORT = 1818
$BASE_PATH = "http://localhost:$PORT"
$EXECUTE_ENDPOINT = "/execute"
$PAUSE_FLAG_PATH = "C:\JEV\PAUSE.flag"
$LOG_DIR = "C:\JEV\Logs"
$MIN_DELAY = 200  # 最小延迟时间(毫秒)
$MAX_DELAY = 500  # 最大延迟时间(毫秒)
```

## 启动系统

### 1. 启动 DesktopAgent 执行层

**重要：必须以管理员身份运行 PowerShell！**

1. 右键点击「开始」菜单，选择「Windows PowerShell (管理员)」
2. 切换到 PowerShell 7（如果默认不是）：
   ```powershell
   pwsh
   ```
3. 导航到项目目录并启动 DesktopAgent：
   ```powershell
   cd D:\PDF转网页
   .\desktopAgent.ps1
   ```

成功启动后，会显示以下信息：

```
========================================
      DeepSeek Desktop Agent
========================================
监听地址: http://localhost:1818/execute
暂停标志路径: C:\JEV\PAUSE.flag
日志目录: C:\JEV\Logs
========================================
按 Ctrl+C 停止服务
========================================
```

### 2. 启动 Operator 调度层

1. 打开一个新的命令提示符或 PowerShell 窗口
2. 导航到项目目录并启动 Operator：
   ```bash
   cd D:\PDF转网页
   node scripts\modular\operator.js
   ```

## 测试验证

### 1. 基本功能测试

创建一个测试脚本来验证系统是否正常工作：

```javascript
// test_deepseek.js
const axios = require('axios');

async function testMoveAction() {
  try {
    const response = await axios.post('http://localhost:1818/execute', {
      token: 'TREA_MAIN',
      action: {
        type: 'move',
        x: 500,
        y: 500
      },
      confirmRequired: true
    });
    
    console.log('测试结果:', response.data);
  } catch (error) {
    console.error('测试失败:', error.message);
  }
}

testMoveAction();
```

运行测试脚本：

```bash
node test_deepseek.js
```

### 2. 系统集成测试

运行内置的测试套件：

```bash
node scripts\tests\deepseekSecurityTests.js
```

## 故障排除

### 1. DesktopAgent 启动失败

- **端口占用问题**：
  - 检查 1818 端口是否被占用：
    ```powershell
    Get-NetTCPConnection -LocalPort 1818
    ```
  - 如果被占用，修改 `desktopAgent.ps1` 中的 `$PORT` 变量为其他端口（如 1819 或 1820）

- **权限问题**：
  - 确保以管理员身份运行 PowerShell
  - 检查日志目录 `C:\JEV\Logs` 的写入权限

- **PowerShell 版本问题**：
  - 确认使用的是 PowerShell 7+：
    ```powershell
    $PSVersionTable.PSVersion
    ```

### 2. Operator 调度层错误

- **配置验证失败**：
  - 检查 `deepseekSecurityConfig.js` 文件格式是否正确
  - 确保 `paused` 设置为 `false`
  - 确保 `tokenWhitelist` 包含 `TREA_MAIN`

- **连接 DesktopAgent 失败**：
  - 确认 DesktopAgent 正在运行
  - 检查防火墙设置
  - 验证 endpoint 配置是否匹配 DesktopAgent 的端口

### 3. 系统暂停或锁定

- **暂停状态**：
  - 检查是否存在暂停标志文件：
    ```powershell
    Test-Path "C:\JEV\PAUSE.flag"
    ```
  - 如果存在，删除该文件：
    ```powershell
    Remove-Item -Path "C:\JEV\PAUSE.flag" -Force
    ```

- **锁定状态**：
  - 检查是否存在锁定状态文件：
    ```powershell
    Test-Path "C:\JEV\LOCK.state"
    ```
  - 查看锁定原因：
    ```powershell
    Get-Content -Path "C:\JEV\LOCK.state"
    ```
  - 修复问题后删除锁定文件

## 🧪 集成测试

### 运行测试套件

1. 确保所有组件已正确安装
2. 启动桌面执行代理：
   ```powershell
   .\desktopAgent.ps1
   ```
3. 在新的终端中运行集成测试：
   ```bash
   node --experimental-modules scripts/tests/integrationTest.js
   ```

### 测试内容验证

集成测试将验证以下系统功能：
- 安全验证系统
- 用户确认流程
- 鼠标键盘操作执行
- 错误处理机制
- 日志记录功能

## 🔗 系统集成示例

### 自定义应用集成

要将DeepSeek安全执行系统集成到您的应用中，可以使用以下模式：

```javascript
// 引入operator模块
import { executeTask } from './scripts/modular/operator.js';

// 创建安全任务执行函数
async function performSecureAction(action, data) {
  const taskId = `app_task_${Date.now()}`;
  const result = await executeTask({
    id: taskId,
    token: 'TREA_MAIN', // 使用有效的授权令牌
    action: action,
    data: data
  });
  
  return result;
}

// 使用示例
performSecureAction('move', { x: 100, y: 200 })
  .then(result => console.log('操作结果:', result));
```

### API参考

- **executeTask(task)**: 执行安全任务
  - **task.id**: 任务唯一标识符
  - **task.token**: 授权令牌
  - **task.action**: 动作类型
  - **task.data**: 动作参数

### 安全最佳实践

1. **令牌管理**: 安全存储授权令牌，避免硬编码
2. **参数验证**: 在调用前验证所有输入参数
3. **错误处理**: 实现完善的错误捕获和处理逻辑
4. **会话管理**: 定期更新任务标识符
5. **权限最小化**: 仅请求必要的操作权限

## 安全最佳实践

1. **最小权限原则**
   - 只将必要的 token 添加到白名单
   - 限制允许的操作类型
   - 设置严格的路径控制规则

2. **定期审查**
   - 定期检查日志文件
   - 审查异常操作模式
   - 更新安全配置以应对新威胁

3. **应急响应**
   - 熟悉暂停系统的方法
   - 建立锁定状态下的恢复流程
   - 准备备用的操作验证机制

4. **备份与恢复**
   - 定期备份配置文件
   - 建立日志归档机制
   - 测试恢复流程

## 常见问题解答

### Q: 如何修改默认端口？
A: 修改 `desktopAgent.ps1` 中的 `$PORT` 变量，并确保在 `deepseekSecurityConfig.js` 的 `desktopAgent.endpoint` 中更新相应的端口。

### Q: 如何启用调试日志？
A: 在 `deepseekSecurityConfig.js` 中，将 `logging.level` 设置为 `debug`，并确保 `logging.enabled` 为 `true`。

### Q: 系统自动锁定后如何恢复？
A: 1. 检查锁定原因（查看 `C:\JEV\LOCK.state`）
   2. 修复导致锁定的问题
   3. 删除锁定状态文件
   4. 重启系统

### Q: 如何配置不需要人工确认的操作？
A: 在 `deepseekSecurityConfig.js` 中，修改 `confirmation.requiredActions` 数组，移除不需要确认的操作类型。

---

*文档版本: 1.0.0*
*最后更新: $(Get-Date -Format "yyyy-MM-dd")*