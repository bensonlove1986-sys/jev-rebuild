# 问题分析

用户反馈 `textarea` 背景输入文字看不清，这是因为在 TranslationPopup 组件中，textarea 元素缺少明确的背景色和文字颜色设置。当页面背景或主题变化时，可能导致文字与背景对比度不足，影响可读性。

# 解决方案

修改 TranslationPopup.tsx 文件中的 textarea 元素样式，添加明确的 backgroundColor 和 color 属性，确保文字在任何情况下都能清晰显示。

# 具体修改

1. 打开 `d:\PDF转网页\JEV-Rebuild\ui-core\app\src\modules\chat_modular\components\TranslationPlugin\TranslationPopup.tsx` 文件

2. 找到 textarea 元素的 style 对象（第 136-148 行）

3. 添加以下样式属性：

   * `backgroundColor: '#ffffff'` - 设置白色背景

   * `color: '#333333'` - 设置深灰色文字

   * `border: '1px solid #e0e0e0'` - 保持现有边框设置

4. 确保修改后的样式对象包含所有必要的属性，以确保 textarea 显示清晰。

# 预期效果

* ✅ textarea 背景为白色

* ✅ 文字为深灰色

* ✅ 文字与背景对比度足够，清晰可读

* ✅ 在任何页面背景

