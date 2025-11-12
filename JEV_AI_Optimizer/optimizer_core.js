// === JEV AI Optimizer v9.9 ===
// 自学习系统主控制器

// 导入分析器和训练器模块
import { analyzeDialogues } from "./optimizer_analyzer.js";
import { trainPrompts } from "./optimizer_trainer.js";

/**
 * 主优化器函数
 * 协调对话分析和提示词训练过程
 */
async function runOptimizer() {
  try {
    console.log("[Optimizer] Starting self-learning...");
    
    // 记录开始日志
    await logMessage("系统启动: JEV AI Optimizer v9.9");
    
    // 步骤1: 分析对话日志
    const startTime = Date.now();
    console.log("[Optimizer] 阶段1 → 收集客服日志");
    console.log("[Optimizer] 阶段2 → 分析对话关键词与语气");
    
    const insights = await analyzeDialogues();
    
    // 步骤2: 训练优化提示词
    console.log("[Optimizer] 阶段3 → 生成AI优化报告");
    const report = await trainPrompts(insights);
    
    // 步骤3: 保存报告
    console.log("[Optimizer] 阶段4 → 更新AI提示模板");
    await saveReport(report);
    
    // 步骤4: 更新系统状态
    console.log("[Optimizer] 阶段5 → 输出最终报告");
    await updateSystemState();
    
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;
    
    await logMessage(`优化完成: 耗时 ${duration.toFixed(2)}s`);
    console.log(`[Optimizer] Done. Report saved. 耗时: ${duration.toFixed(2)}s`);
    
    return report;
  } catch (error) {
    console.error("[Optimizer ERROR]", error);
    await logMessage(`错误: ${error.message}`);
    throw error;
  }
}

/**
 * 保存优化报告
 */
async function saveReport(report) {
  try {
    // 在浏览器环境中模拟文件保存
    const reportPath = "./optimizer_report.json";
    console.log(`[Optimizer] 保存报告到: ${reportPath}`);
    
    // 添加状态信息
    report.status = "AI model updated successfully";
    report.optimizer_version = "v9.9";
    report.lock_status = "active";
    
    // 转换为JSON字符串
    const reportJson = JSON.stringify(report, null, 2);
    
    // 尝试保存到本地文件（浏览器环境中通过下载实现）
    downloadFile(reportJson, "optimizer_report.json", "application/json");
    
    // 同时尝试通过API保存到服务器
    try {
      await fetch("/api/save-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: reportJson
      });
    } catch (e) {
      console.log("[Optimizer] 服务器保存失败，已通过本地下载保存报告");
    }
    
    // 更新AI回复模板
    await updateAIReplies(report);
    
    return report;
  } catch (error) {
    console.error("[Optimizer] 保存报告失败:", error);
    throw error;
  }
}

/**
 * 更新AI回复模板
 */
async function updateAIReplies(report) {
  try {
    // 生成新的AI回复模板
    const aiReplies = {
      version: "v9.9",
      timestamp: new Date().toISOString(),
      top_keywords: report.top_keywords,
      top_phrases: report.top_phrases,
      suggestions: report.suggestions,
      templates: {
        greeting: ["Welcome! How may I assist you today?", "Hello! What can I help you with?"],
        pricing: ["Our pricing is competitive at ${price}.", "We offer excellent value at ${price}."],
        closing: ["Thank you for your inquiry!", "Is there anything else I can help you with?"]
      }
    };
    
    // 尝试保存到服务器配置
    try {
      await fetch("/api/update-ai-replies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(aiReplies)
      });
      console.log("[Optimizer] AI回复模板已更新");
    } catch (e) {
      console.log("[Optimizer] AI回复模板服务器更新失败，使用本地缓存");
    }
    
    // 保存到本地文件（浏览器下载）
    downloadFile(JSON.stringify(aiReplies, null, 2), "ai_replies.json", "application/json");
    
    return aiReplies;
  } catch (error) {
    console.error("[Optimizer] 更新AI回复模板失败:", error);
    throw error;
  }
}

/**
 * 更新系统状态
 */
async function updateSystemState() {
  try {
    const systemState = {
      system_state: "self_learning",
      ai_optimizer: "active",
      lock: "active",
      version: "v9.9",
      last_updated: new Date().toISOString()
    };
    
    console.log("[Optimizer] 系统状态已更新:", systemState);
    
    // 尝试通过API更新状态
    try {
      await fetch("/api/update-system-state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(systemState)
      });
    } catch (e) {
      console.log("[Optimizer] 系统状态服务器更新失败，状态已记录");
    }
    
    return systemState;
  } catch (error) {
    console.error("[Optimizer] 更新系统状态失败:", error);
    throw error;
  }
}

/**
 * 记录日志消息
 */
async function logMessage(message) {
  try {
    const logEntry = `[${new Date().toISOString()}] ${message}\n`;
    console.log(logEntry.trim());
    
    // 在浏览器环境中，我们可以使用localStorage存储日志
    let logs = localStorage.getItem("optimizer_logs") || "";
    logs += logEntry;
    localStorage.setItem("optimizer_logs", logs);
    
    // 限制日志大小
    if (logs.length > 100000) {
      logs = logs.substring(logs.length - 100000);
      localStorage.setItem("optimizer_logs", logs);
    }
    
    // 尝试通过API保存日志
    try {
      await fetch("/api/log-message", {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: logEntry
      });
    } catch (e) {
      // 忽略API调用错误，因为我们已经在本地存储了日志
    }
    
    return logEntry;
  } catch (error) {
    console.error("[Optimizer] 日志记录失败:", error);
  }
}

/**
 * 下载文件辅助函数（浏览器环境）
 */
function downloadFile(content, filename, contentType) {
  const a = document.createElement('a');
  const file = new Blob([content], { type: contentType });
  a.href = URL.createObjectURL(file);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

// 提供定期执行功能
function scheduleOptimizer() {
  // 从配置中读取学习间隔
  const config = {
    learning_interval_hours: 6
  };
  
  const interval = config.learning_interval_hours * 60 * 60 * 1000;
  console.log(`[Optimizer] 将每 ${config.learning_interval_hours} 小时自动运行一次`);
  
  // 设置定时器
  setInterval(runOptimizer, interval);
}

// 导出核心功能
export { runOptimizer, scheduleOptimizer, logMessage };

// 如果直接运行此文件，启动优化器
if (import.meta.main) {
  runOptimizer();
  scheduleOptimizer();
}

// 为浏览器环境提供全局访问
window.JEV_AI_Optimizer = {
  run: runOptimizer,
  schedule: scheduleOptimizer
};