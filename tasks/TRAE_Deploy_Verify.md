# 🧠 L10 中控验证任务文件：JEV 云端中控一体化验证任务

> **目标：** 让 TRAE 统一部署并验证所有云端功能（Worker / KV / R2 / AI / 日志 / 匹配 / 发图），然后接入中控面板，实现系统级总调度。

## 🧩 一、系统层级与模块清单

| 层级  | 模块名                      | 功能                    | 状态            | 
| --- | ------------------------ | --------------------- | ------------- | 
| L1  | `/upload-product`        | 上传单张产品图片到 R2          | ✅ 已测试         | 
| L2  | `/batch-upload`          | 批量上传产品图片              | ✅ 已设计         | 
| L3  | `/match-image`           | AI 图片识别 + 型号匹配 + 价格比对 | ✅ 已生成代码       | 
| L4  | `/auto-quote`            | 自动生成报价信息              | ⏳ 即将集成        | 
| L5  | `/send-image`            | 自动向客户发送产品图            | ✅ 已定义         | 
| L6  | `/profit-track`          | 利润计算与趋势分析             | ✅ 已定义         | 
| L7  | `/quote-analyze`         | 报价趋势分析                | ✅ 已定义         | 
| L8  | `/log-event`             | 系统日志接口                | ✅ 已启用         | 
| L9  | `/insight-report`        | 每日报告生成（AI Summary）    | ⏳ 待自动化        | 
| L10 | **中控面板（jev_panel.html）** | 统一监控 + 控制台 + 调试面板     | 🚀 核心阶段（本次执行） | 

## ⚙️ 二、TRAE 执行指令

### 🎯 阶段 1：云端部署与验证

* 上传并激活所有 Worker 模块：
  * `/match-image`
  * `/auto-quote`
  * `/send-image`
  * `/profit-track`
  * `/quote-analyze`
  * `/log-event`
* 验证每个端点返回状态码 200；
* 把结果写入 KV：`log:deploy:YYYY-MM-DD`
* 验证成功后输出：`✅ All modules deployed and verified successfully`

### 🎯 阶段 2：中控 UI 对齐

* 让 jev_panel.html 调用以下端点：

| 模块    | API                               | 用途                      | 
| ----- | --------------------------------- | ----------------------- | 
| 系统检测  | `/check-env`                      | 显示 Worker 环境状态          | 
| KV 连接 | `/get-kv-status`                  | 检查 JEVPI 状态             | 
| R2 状态 | `/r2-status`                      | 检查 jevproductimage 可访问性 | 
| AI 状态 | `http://localhost:1822/heartbeat` | 检查本地 AI 服务              | 
| 匹配验证  | `/match-image`                    | 验证 AI 匹配功能              | 
| 报价分析  | `/profit-track`                   | 验证数据计算功能                |

* 实时显示每个模块状态（绿灯=OK，黄灯=检测中，红灯=错误）；
* UI 增加按钮：
  * “重新验证全部模块”
  * “运行自动匹配测试”
  * “查看日志报告”

### 🎯 阶段 3：智能联动测试

* 从 R2 `products/` 随机取 1 张图；
* 调用 `/match-image`；
* 自动识别型号并触发 `/auto-quote`；
* 调用 `/send-image` 把报价图片发送至测试账号；
* 把整个流程结果写入：`log:match-test:YYYY-MM-DD`；
* 输出汇总结果 JSON：

```json
{
  "worker_status": "ok",
  "r2_access": "ok",
  "ai_status": "online",
  "match_test": "pass",
  "quote_test": "pass",
  "send_image": "ok",
  "summary": "All modules operational and verified"
}
```

## 🧾 三、执行完成效果

系统将实现：

* ☁️ 所有 Worker 接口自动上传并验证
* 💾 KV / R2 / AI 自动联通
* 🧠 /match-image 自动识别验证
* 🧮 /profit-track 自动数据计算验证
* 📊 中控面板实时显示模块状态
* 🔁 TRAE 每天可定时执行系统巡检

中控面板将显示：
```
✅ Worker Connected
✅ KV Connected
✅ R2 Connected
✅ AI Online
✅ Match Engine OK
✅ Profit Tracker OK
```

## 💬 四、后续扩展需求

* 每天自动触发 `/profit-track` + `/quote-analyze` → 写入 `insight_report`
* 每日00:30自动执行系统健康检查 → 推送 Telegram 报告
* 在 jev_panel.html 增加 "重启本地AI" 按钮（调用 `/local/restart-ai`）

## ✅ 五、核心测试流程

```
1️⃣ 从 R2 取出一张产品图；
2️⃣ 调用 /match-image；
3️⃣ 自动识别型号；
4️⃣ 生成报价；
5️⃣ 调用 /send-image；
6️⃣ 向测试联系人发送报价图；
7️⃣ 记录日志至 log:match-test:YYYY-MM-DD。
```

---

> **TRAE 执行总结：** 
> 请 TRAE 全面部署、验证并接入中控，使所有 Worker 模块与 R2、KV、AI 完全联通，
> 让 jev_panel.html 实时反映系统状态并支持一键巡检。