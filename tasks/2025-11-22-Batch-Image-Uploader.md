# JEV L9.6 批量图片上传系统（Batch Image Uploader）

## 📋 任务概述

开发JEV系统的批量产品图片上传功能，支持三种不同的上传方式，并实现自动生成公共URL及可选的数据库关联功能，以提高产品图片管理效率。

## 🎯 核心目标

1. 提供多种批量上传产品图片的方法，满足不同场景需求
2. 自动为上传图片生成公共访问URL
3. （可选）实现图片与产品型号的自动关联存储
4. 优化用户体验，支持从控制台、命令行和Web界面三种方式操作

## 🔧 技术方案

### 🅰️ 方式一：Cloudflare R2控制台批量上传

**适用场景**：简单的手动批量上传（几十张图片）

**实现步骤**：
1. 打开Cloudflare Dashboard → R2 → jevproductimage
2. 点击右上角"Upload object"
3. 在文件选择框中多选图片文件
4. 设置路径为`products/`
5. 执行上传

**特点**：
- 零代码实现
- 操作简单直观
- 适合一次性小批量上传
- 自动生成公共URL格式：`https://cdn.jevshop.com/products/<文件名>`

### 🅱️ 方式二：Wrangler CLI批量同步

**适用场景**：大批量图片上传（上百张图片）

**实现步骤**：
1. 准备本地图片文件夹（如`D:\JEV\images\products\`）
2. 执行批量上传命令：
   - 方式一：`wrangler r2 object put jevproductimage --file="D:\JEV\images\products" --multipart`
   - 方式二（更精确控制）：`for %f in (D:\JEV\images\products\*.jpg) do wrangler r2 object put jevproductimage/products/%~nxf --file="%f"`

**特点**：
- 命令行操作，适合自动化脚本
- 上传速度快，支持大量文件
- 适合初始数据批量导入

### 🤖 方式三：Worker API批量上传接口

**适用场景**：集成到jev_panel或自动化系统

**接口规范**：
1. 路径：`/batch-upload`
2. 方法：POST
3. Content-Type：multipart/form-data
4. 表单字段：`files[]`（支持多文件）
5. 上传限制：最多20张图片

**实现功能**：
- 自动保存至R2 bucket：`jevproductimage`
- 保存路径：`products/<原文件名>`
- 自动识别Content-Type
- 返回所有上传图片的公共URL

**返回格式**：
```json
{
  "success": true,
  "uploaded": [
    { "name": "E2E-X3D1-N.jpg", "url": "https://cdn.jevshop.com/products/E2E-X3D1-N.jpg" },
    { "name": "MU12X30SB.jpg", "url": "https://cdn.jevshop.com/products/MU12X30SB.jpg" }
  ]
}
```

### 📦 扩展功能：自动写入数据库

**功能说明**：
将上传的图片与产品型号进行自动关联，并存储到KV数据库中，以便在报价逻辑中使用。

**实现代码**：
```js
// 上传完成后，自动写入KV存储
await env.JEVPI.put("product_image_map", JSON.stringify({
  "E2E-X3D1-N": "https://cdn.jevshop.com/products/E2E-X3D1-N.jpg",
  "MU12X30SB": "https://cdn.jevshop.com/products/MU12X30SB.jpg"
}));

// 报价逻辑中使用
const imgMap = await env.JEVPI.get("product_image_map", { type: "json" });
quote.image_url = imgMap[model];
```

## 📝 开发计划

1. **第一阶段**：实现Worker `/batch-upload`接口
   - 支持多文件FormData上传
   - 实现R2存储逻辑
   - 返回标准JSON响应格式

2. **第二阶段**：jev_panel集成
   - 在控制面板添加批量上传界面
   - 支持拖拽上传功能
   - 显示上传进度和状态

3. **第三阶段**：（可选）自动关联数据库
   - 实现文件名到型号的自动提取
   - 写入KV存储
   - 在报价系统中集成图片URL

## 🚀 集成建议

1. 先通过R2控制台上传少量测试图片，验证URL可访问性
2. 开发并测试Worker批量上传接口
3. 在jev_panel中添加批量上传界面
4. （可选）实现自动关联数据库功能

## 📊 各方式对比

| 模式 | 上传方式 | 难度 | 推荐场景 |
|------|---------|------|----------|
| 控制台网页 | 手动选多张文件 | ⭐ | 小批量 |
| CLI命令行 | 批量同步文件夹 | ⭐⭐ | 大批量 |
| Worker API | 自动化上传接口 | ⭐⭐⭐ | 集成jev_panel / TRAE |

## 🔗 相关文档

- Cloudflare R2文档
- Wrangler CLI使用指南
- jev_panel.html集成指南

---

**任务优先级**: 高

**预计完成时间**: 3个工作日

**依赖项**:
- Cloudflare Worker环境
- R2存储桶权限
- jev_panel.html访问权限