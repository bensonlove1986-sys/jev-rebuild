# 🚀 JEV Client 启动脚本修复完成

## ✅ 修复内容

成功修复了 JEV Client 启动脚本中的路径错误问题：

1. **完全重写了 Start-JEV-Client.bat**：
   - 移除了对错误路径 `\JEV-Client-Server\` 的引用
   - 使用完整绝对路径 `d:\PDF转网页\JEV_Client`
   - 添加了 UTF-8 编码支持（chcp 65001）
   - 增强了错误处理和环境检测
   - 支持 Node.js 和 Python 两种启动方式
   - 自动检查端口状态和文件完整性

2. **新增了 Start-JEV-Client.ps1**：
   - 提供了功能更强大的 PowerShell 启动选项
   - 包含进程管理、端口检测和自动清理功能
   - 更友好的中文界面和错误提示
   - 支持管理员权限下运行

## 📁 可用的启动脚本

| 脚本名称 | 类型 | 推荐使用 | 适用场景 |
|---------|------|---------|----------|
| Start-JEV-Client.bat | 批处理 | ⭐ 推荐 | 普通用户，直接双击运行 |
| Start-JEV-Client.ps1 | PowerShell | ⭐ 高级用户 | 需要更多控制和错误处理 |
| Start-JEV-Online.bat | 批处理 | 可选 | 在线模式启动 |
| Start-Sentinel-Dashboard.bat | 批处理 | 可选 | 监控面板启动 |

## 🖱️ 使用方法

### 方法一：使用批处理脚本（推荐）

1. 打开文件夹：`D:\PDF转网页\JEV_Client`
2. **双击** `Start-JEV-Client.bat`
3. 脚本会自动：
   - 检测运行环境（Node.js/Python）
   - 启动本地服务器（端口 8080）
   - 自动打开浏览器访问登录页面
   - 显示邀请码 `JEV-CLIENT-LOGIN`

### 方法二：使用 PowerShell 脚本（高级用户）

1. 打开文件夹：`D:\PDF转网页\JEV_Client`
2. **右键** `Start-JEV-Client.ps1`
3. 选择 **以管理员身份运行**
4. PowerShell 脚本提供更强大的功能：
   - 自动停止占用端口的进程
   - 更详细的环境检测
   - 增强的错误处理
   - 彩色控制台输出

## 🔍 技术细节

- **解决的核心问题**：避免使用根目录路径 `\JEV-Client-Server\`，改用完整绝对路径
- **启动逻辑优化**：优先使用 Node.js 启动 server.js，失败则回退到 Python 服务器
- **增强的用户体验**：添加进度指示、环境检测、错误提示和使用说明
- **安全改进**：使用正确的路径引用，避免系统路径混淆

## 💡 常见问题解答

**Q: 启动时提示 "找不到路径" 怎么办？**
A: 请确认 `D:\PDF转网页\JEV_Client` 目录存在且包含必要文件

**Q: 端口 8080 被占用怎么办？**
A: PowerShell 脚本会自动检测并停止占用端口的进程，批处理脚本可以手动修改 PORT 变量

**Q: 浏览器没有自动打开登录页面？**
A: 请手动访问 http://localhost:8080/ui/login_portal.html

**Q: Node.js 和 Python 都没有安装怎么办？**
A: 请至少安装其中一种环境，推荐安装 Node.js LTS 版本

## ✅ 任务完成标志

```
✅ JEV Client 启动脚本路径修复完成
```