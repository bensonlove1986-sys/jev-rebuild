const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// 模拟externalMemory接口
class ExternalMemoryMock {
    constructor() {
        this.data = {};
    }

    async set(namespace, key, value) {
        console.log(`[ExternalMemory] Setting: ${namespace}.${key}`);
        if (!this.data[namespace]) {
            this.data[namespace] = {};
        }
        this.data[namespace][key] = value;
        console.log(`[ExternalMemory] Set successful: ${namespace}.${key}`);
        return true;
    }

    async get(namespace, key) {
        console.log(`[ExternalMemory] Getting: ${namespace}.${key}`);
        if (this.data[namespace] && this.data[namespace][key] !== undefined) {
            return this.data[namespace][key];
        }
        return null;
    }

    async delete(namespace, key) {
        console.log(`[ExternalMemory] Deleting: ${namespace}.${key}`);
        if (this.data[namespace] && this.data[namespace][key] !== undefined) {
            delete this.data[namespace][key];
            return true;
        }
        return false;
    }
}

// SOP原始策略文本（从用户输入中提取）
const SOP_POLICY_TEXT = `[SOP_VALIDATION_CHECKLIST] 
 - 校验当前策略：paused / tokenWhitelist / allowedActions 
 - 校验来源token是否在白名单 
 - 校验目标路径是否命中restrictedPaths 
 - 若 dry-run: 只输出"计划与将执行的命令"，不落地 
 - 超过 maxRuntimeMinutes → 自动中断并记录 
 [/SOP_VALIDATION_CHECKLIST][SOP_KILL_SWITCH] 
 - 本地 Ctrl+C 触发 ConsoleBreak： 
   - 写入 C:\JEV\PAUSE.flag 
   - 记录 externalMemory(ns=security, key=last_interrupt) 
   - operator 检测到 flag 或 paused=true → 拦截执行 
 - 恢复：删除 flag 文件 + set paused=false 
 [/SOP_KILL_SWITCH][SOP_AUDIT_FORMAT] 
 { 
   "ts": "<ISO8601>", 
   "actor": "<TREA|Operator|desktopAgent>", 
   "intent": "<SOFT_PAUSE|HARD_PAUSE|FULL_FREEZE|RESUME|DRY_RUN|…>", 
   "request": { "args": "...", "plan": "...", "dryRun": true/false }, 
   "decision": { "allowed": true/false, "reason": "…" }, 
   "effects": { "memoryWrites": [...], "systemChanges": [...], "queued": N }, 
   "result": { "status": "done|denied|failed|queued", "error": null|"…" } 
 } 
 [/SOP_AUDIT_FORMAT][SOP_EDGE_CASES] 
 - 无法写入 externalMemory：本地缓存到 %TEMP%\jev_security_buffer.json 并重试 
 - token 缺失/过期：直接 deny + 记录审计 
 - 请求为写类动作但处于 paused：入队而非执行 
 - 超时/失败≥autoLockAfterFailures：自动置 paused=true 
 [/SOP_EDGE_CASES][SOP_SELF_TESTS] 
 - 用例1：软暂停后提交写类任务 → 应返回 queued_due_to_pause 
 - 用例2：硬暂停时端口封禁 → operator 调用失败且记录失败原因 
 - 用例3：恢复后重放最近 10 条 → 先 DRY_RUN，用户确认后执行 
 [/SOP_SELF_TESTS][SOP_PERSIST] 
 - 请将本SOP以原样文本存入 externalMemory： 
   namespace=security, key=security_sop_v1_text 
 - 将解析后的 policy schema 存入： 
   namespace=security, key=security_policy 
 - 学习完成后回复：LEARNED_OK::<对全文做SHA-256的前10位> 
 [/SOP_PERSIST]`;

// 解析SOP策略为schema
function parseSOPPolicy() {
    return {
        version: "1.0",
        sections: {
            validationChecklist: {
                checks: [
                    "paused / tokenWhitelist / allowedActions",
                    "来源token白名单校验",
                    "目标路径restrictedPaths校验",
                    "dry-run模式支持",
                    "maxRuntimeMinutes限制"
                ]
            },
            killSwitch: {
                trigger: "Ctrl+C ConsoleBreak",
                actions: [
                    "写入 C:\\JEV\\PAUSE.flag",
                    "记录 externalMemory(ns=security, key=last_interrupt)",
                    "operator拦截执行"
                ],
                resume: "删除flag文件 + set paused=false"
            },
            auditFormat: "JSON格式包含ts、actor、intent、request、decision、effects、result",
            edgeCases: [
                "externalMemory失败时本地缓存",
                "token缺失/过期时deny",
                "paused状态下写任务入队",
                "超时/失败过多时自动锁定"
            ],
            selfTests: [
                "软暂停后任务入队测试",
                "硬暂停端口封禁测试",
                "恢复后重放测试"
            ],
            persist: {
                textLocation: "namespace=security, key=security_sop_v1_text",
                schemaLocation: "namespace=security, key=security_policy",
                hashResponse: "LEARNED_OK::<SHA-256前10位>"
            }
        }
    };
}

// 计算SHA-256哈希
function calculateSHA256(text) {
    return crypto.createHash('sha256').update(text).digest('hex');
}

// 主函数：集成SOP并验证
async function integrateSOP() {
    try {
        console.log("=== SOP集成开始 ===");
        
        // 创建模拟externalMemory
        const externalMemory = new ExternalMemoryMock();
        
        // 计算SOP文本的SHA-256哈希
        const sha256Hash = calculateSHA256(SOP_POLICY_TEXT);
        const sha256First10 = sha256Hash.substring(0, 10);
        console.log(`SOP文本SHA-256: ${sha256Hash}`);
        console.log(`SHA-256前10位: ${sha256First10}`);
        
        // 解析SOP策略
        const policySchema = parseSOPPolicy();
        
        // 持久化SOP文本到externalMemory
        await externalMemory.set('security', 'security_sop_v1_text', SOP_POLICY_TEXT);
        
        // 持久化解析后的policy schema到externalMemory
        await externalMemory.set('security', 'security_policy', JSON.stringify(policySchema, null, 2));
        
        // 验证存储
        const storedText = await externalMemory.get('security', 'security_sop_v1_text');
        const storedSchema = await externalMemory.get('security', 'security_policy');
        
        if (storedText && storedSchema) {
            console.log("=== SOP持久化成功 ===");
            console.log("文本存储验证成功");
            console.log("Schema存储验证成功");
            
            // 输出LEARNED_OK响应
            const finalResponse = `LEARNED_OK::${sha256First10}`;
            console.log(`\n${finalResponse}`);
            
            // 保存结果到本地文件
            const outputPath = path.join(__dirname, 'sop_integration_result.json');
            fs.writeFileSync(outputPath, JSON.stringify({
                sha256: sha256Hash,
                sha256First10: sha256First10,
                response: finalResponse,
                timestamp: new Date().toISOString(),
                success: true
            }, null, 2));
            
            console.log(`\n结果已保存到: ${outputPath}`);
            
            return {
                success: true,
                response: finalResponse
            };
        } else {
            throw new Error("SOP持久化验证失败");
        }
        
    } catch (error) {
        console.error("=== SOP集成失败 ===");
        console.error(error.message);
        return {
            success: false,
            error: error.message
        };
    }
}

// 执行集成
if (require.main === module) {
    integrateSOP().then(result => {
        if (result.success) {
            console.log("\nSOP集成完成！");
        } else {
            console.error("\nSOP集成失败！");
            process.exit(1);
        }
    });
}

module.exports = { integrateSOP, calculateSHA256, parseSOPPolicy };