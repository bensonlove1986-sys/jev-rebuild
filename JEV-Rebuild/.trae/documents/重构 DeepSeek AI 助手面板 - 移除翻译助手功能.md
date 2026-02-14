# 重构计划：DeepSeek AI 助手面板

## 目标
移除翻译助手功能，只保留 AI 回复生成功能

## 重构步骤

### 1. 清理状态变量
- 移除翻译相关的状态变量：
  - `inputText` - 原文输入
  - `translatedText` - 翻译结果
  - `isTranslating` - 翻译中状态
  - `targetLanguage` - 目标语言

### 2. 清理函数
- 移除翻译相关的函数：
  - `handleTranslate` - 处理翻译逻辑
  - `handleCopyText` - 处理复制文本

### 3. 清理 UI 组件
- 移除翻译助手模块的渲染函数：
  - `renderTranslationModule` - 渲染翻译助手界面
- 修改模块切换标签：
  - 移除"翻译助手"标签
  - 只保留"AI 回复"标签
  - 移除标签切换逻辑

### 4. 清理类型定义
- 修改 `PanelState` 接口：
  - 移除 `activeModule` 字段
  - 移除 `targetLanguage` 字段

### 5. 简化组件逻辑
- 移除模块切换相关的状态管理
- 直接默认显示 AI 回复模块
- 简化 localStorage 存储的状态结构

### 6. 重新构建
- 运行 `npm run build` 重新构建项目
- 验证服务器运行状态

## 预期结果
- DeepSeek AI 助手面板只显示 AI 回复生成功能
- 界面更加简洁，专注于 AI 回复功能
- 保留所有其他核心功能：
  - 面板头部控制（固定/浮动、弹出窗口、关闭）
  - 状态持久化
  - chat_id 强绑定
  - 安全的发送控制流程

## 技术影响
- 代码量减少，维护性提高
- 界面更加简洁直观
- 移除了未使用的功能和状态