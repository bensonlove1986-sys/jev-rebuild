# 客户姓名显示 Freeze 文档

## 允许
- 新增姓名来源字段
- 优化 stable_name 填充逻辑

## 禁止
- 修改姓名显示优先级
- 使用 customer_id 作为 fallback
- 在组件内私自解析姓名

## 回归检查点
- 刷新页面后姓名不变化
- 新老客户均优先显示 stable_name
- 客户列表与聊天窗口显示一致
- 不因端口/缓存/热更新导致姓名回退

## 姓名显示优先级
1. mappedName
2. stable_name
3. customer_name
4. real_name
5. display_name
6. ""

## 后端保障
- 所有 `/api/inbox/customers` 返回必须包含 `stable_name` 字段
- 若不存在真实姓名，允许为空，但不得回退为 ID

## 服务运行唯一性
- UI：3000（Vite）
- API：8787（Worker dev）
- 禁止 3001 / 其他 http-server 残留进程

## 硬性约束
- 不修改任何通道逻辑
- 不影响 inbox / pull / send
- 不引入 mock / fallback / simulate
- 不改部署路径、命名、端口策略

## 自证日志要求
- 至少包含：`[CUSTOMER_NAME_RESOLVED]`, `[CUSTOMER_NAME_SOURCE]=stable_name|customer_name|real_name`, `[CUSTOMER_NAME_RENDERED]`

## 完成标志
CUSTOMER_DISPLAY_NAME_FREEZE: PASS
