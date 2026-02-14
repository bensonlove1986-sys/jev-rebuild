# 实现OCR结果的DeepSeek分析和显示功能

## 目标
1. 确保OCR识别的结果能够被DeepSeek分析
2. 确保分析结果显示在用户选择的div中（image-ocr-display）
3. 确保结果返回中文

## 实现步骤

### 1. 添加分析状态和结果存储
- 在DeepSeekPanel组件中添加新的状态变量：
  - `ocrAnalysisStatus`: 存储分析状态（idle/processing/success/error）
  - `ocrAnalysisResult`: 存储分析结果
  - `ocrAnalysisError`: 存储分析错误信息

### 2. 实现DeepSeek分析函数
- 添加`analyzeOcrResult`函数：
  - 接收OCR结果文本作为参数
  - 调用DeepSeek API进行分析
  - 使用中文提示词确保结果返回中文
  - 处理API响应和错误
  - 更新分析状态和结果

### 3. 集成分析触发逻辑
- 在OCR识别成功后自动触发分析
- 添加手动触发分析的按钮
- 确保分析只在有OCR结果时执行

### 4. 修改显示逻辑
- 更新`image-ocr-display` div的渲染逻辑：
  - 显示OCR识别结果
  - 显示DeepSeek分析状态
  - 显示DeepSeek分析结果（包括结构化数据和业务解释）
  - 确保分析结果以中文显示

### 5. 优化用户体验
- 添加分析进度指示器
- 添加错误处理和提示
- 确保分析结果清晰易读
- 保持与现有UI风格一致

## 技术实现要点
- 使用现有的`safeFetch`函数调用DeepSeek API
- 构建合适的分析提示词，确保返回结构化的中文结果
- 处理API响应的解析和错误处理
- 确保状态管理的一致性和可靠性
- 保持代码风格与现有代码一致

## 预期结果
- OCR识别成功后，自动或手动触发DeepSeek分析
- 分析结果显示在image-ocr-display div中
- 分析结果为中文，包含结构化的产品信息和业务解释
- 用户可以清晰看到OCR结果和对应的DeepSeek分析