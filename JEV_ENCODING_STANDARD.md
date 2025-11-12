# JEV 系统编码规则守则 - 永久系统配置

## 📅 创建日期
`$(Get-Date -Format "yyyy-MM-dd")`

## 🎯 目标
- 彻底消除因编码不一致导致的语法错误、乱码、JSON 异常等问题。
- 确保 TRAE 及其子代理、Worker、插件在任何环境中输出的文本均为 UTF-8 无 BOM 格式。

## 🧩 一、核心规则（永久执行）
1. 所有文件（.ps1 、.js 、.html 、.json 、.md 等）一律使用 **UTF-8 without BOM**。
2. 禁止使用 UTF-16、ANSI、或 UTF-8 with BOM。
3. 在每个 PowerShell 脚本开头自动插入：
   ```powershell
   [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
   $PSDefaultParameterValues['Out-File:Encoding'] = 'utf8'
   $OutputEncoding = [System.Text.Encoding]::UTF8
   ```
4. 读取文件或解析响应时，强制使用 UTF-8。
5. 所有 HTTP 响应统一加头：
   ```
   Content-Type: application/json; charset=utf-8
   ```
6. 所有 HTML 文件自动包含：
   ```html
   <meta charset="UTF-8">
   ```
7. 所有插件、脚本、Worker、日志通信均为 UTF-8 无 BOM。
8. 在执行命令或写文件时，如检测到 BOM 或 非 UTF-8 编码，自动转换并删除 BOM。

## ⚙️ 二、开发环境设置（自动建议执行）
1. 在 VS Code 或其他 IDE 中强制默认保存编码为：
   ```json
   "files.encoding": "utf8"
   ```
2. 关闭自动猜测编码：
   ```json
   "files.autoGuessEncoding": false
   ```
3. 每次生成新文件时自动检测 BOM 并修正。

## 🧠 三、运行时守护
1. 启动 desktopAgent.ps1 时自动检查脚本与日志文件编码。
2. 若发现 UTF-8 with BOM 或 非 UTF-8 文件，立即转换并输出提示：
   ```
   ⚙️ 已修正编码 → UTF-8 无 BOM
   ```
3. 在 TRAE 生成任何新代码时，自动执行编码检测与转换流程。

## ✅ 四、永久策略
- 此规则须写入 TRAE 系统级配置，默认在所有项目模板、自动生成文件、保存逻辑中生效。
- 今后任何文件创建或修改操作，若不符合该规则， TRAE 需自动更正并记录日志。
- 在生成代码、文档或脚本时，TRAE 必须自动附带声明：
  ```
  # Encoding: UTF-8 without BOM
  ```

## 🔄 配置集成
此编码标准文档已作为系统永久配置保存。所有新生成的文件、脚本和组件都将严格遵守以上编码规则。

## 📋 确认状态
✅ JEV 系统编码标准已写入永久配置，所有生成文件将保持 UTF-8 无 BOM 格式。