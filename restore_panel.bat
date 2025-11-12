@echo off
cls
echo 开始恢复JEV控制面板...

REM 设置目录和文件路径
set "PANEL_DIR=D:\JEV\panel"
set "HTML_FILE=%PANEL_DIR%\jev_panel.html"
set "JS_FILE=%PANEL_DIR%\jev_panel.js"
set "SYNC_FILE=%PANEL_DIR%\jev_sync.js"

REM 检查目录是否存在
if not exist "%PANEL_DIR%" (
    echo 错误: JEV面板目录不存在!
    echo 请确保D:\JEV\panel目录已创建。
    pause
    exit /b 1
)

REM 备份当前文件
if exist "%HTML_FILE%" (
    set "BACKUP_FILE=%HTML_FILE%.bak_%date:~0,4%%date:~5,2%%date:~8,2%_%time:~0,2%%time:~3,2%%time:~6,2%"
    copy "%HTML_FILE%" "%BACKUP_FILE%" >nul
    echo 已备份当前面板文件
)

REM 创建HTML文件
( 
    echo ^<!DOCTYPE html^>
    echo ^<html lang="zh-CN"^>
    echo ^<head^>
    echo     ^<meta charset="UTF-8"^>
    echo     ^<meta name="viewport" content="width=device-width, initial-scale=1.0"^>
    echo     ^<title^>JEV 控制面板^</title^>
    echo     ^<style^>
    echo         body {
    echo             font-family: Arial, sans-serif;
    echo             margin: 0;
    echo             padding: 20px;
    echo             background-color: #f0f0f0;
    echo         }
    echo         .container {
    echo             max-width: 1000px;
    echo             margin: 0 auto;
    echo             background-color: white;
    echo             padding: 30px;
    echo             border-radius: 10px;
    echo             box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    echo         }
    echo         h1 {
    echo             color: #333;
    echo             text-align: center;
    echo         }
    echo         .status-grid {
    echo             display: grid;
    echo             grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    echo             gap: 20px;
    echo             margin: 30px 0;
    echo         }
    echo         .status-card {
    echo             background-color: #f9f9f9;
    echo             padding: 20px;
    echo             border-radius: 8px;
    echo             border-left: 4px solid #4CAF50;
    echo         }
    echo         .status-card.error {
    echo             border-left-color: #f44336;
    echo         }
    echo         .status-card.warning {
    echo             border-left-color: #ff9800;
    echo         }
    echo         .status-title {
    echo             font-weight: bold;
    echo             margin-bottom: 10px;
    echo             color: #333;
    echo         }
    echo         .status-value {
    echo             font-size: 18px;
    echo             color: #555;
    echo         }
    echo         .button-group {
    echo             display: flex;
    echo             gap: 10px;
    echo             margin: 20px 0;
    echo         }
    echo         button {
    echo             padding: 10px 20px;
    echo             background-color: #4CAF50;
    echo             color: white;
    echo             border: none;
    echo             border-radius: 5px;
    echo             cursor: pointer;
    echo             font-size: 16px;
    echo         }
    echo         button:hover {
    echo             background-color: #45a049;
    echo         }
    echo         button:disabled {
    echo             background-color: #cccccc;
    echo             cursor: not-allowed;
    echo         }
    echo         .log-area {
    echo             background-color: #f5f5f5;
    echo             padding: 15px;
    echo             border-radius: 5px;
    echo             max-height: 300px;
    echo             overflow-y: auto;
    echo             font-family: monospace;
    echo             white-space: pre-wrap;
    echo         }
    echo         .api-section {
    echo             margin-top: 30px;
    echo             padding: 20px;
    echo             background-color: #f9f9f9;
    echo             border-radius: 8px;
    echo         }
    echo         .form-group {
    echo             margin-bottom: 15px;
    echo         }
    echo         label {
    echo             display: block;
    echo             margin-bottom: 5px;
    echo             font-weight: bold;
    echo         }
    echo         input[type=\"text\"], textarea {
    echo             width: 100%%;
    echo             padding: 8px;
    echo             border: 1px solid #ddd;
    echo             border-radius: 4px;
    echo         }
    echo         textarea {
    echo             min-height: 100px;
    echo         }
    echo     ^</style^>
    echo ^</head^>
    echo ^<body^>
    echo     ^<div class="container"^>
    echo         ^<h1^>JEV 控制面板^</h1^
    echo         
    echo         ^<div class="status-grid"^>
    echo             ^<div class="status-card" id="agent-status"^>
    echo                 ^<div class="status-title"^>Agent 状态^</div^
    echo                 ^<div class="status-value"^>检查中...^</div^
    echo             ^</div^
    echo             ^<div class="status-card" id="ai-status"^>
    echo                 ^<div class="status-title"^>AI 服务状态^</div^
    echo                 ^<div class="status-value"^>检查中...^</div^
    echo             ^</div^
    echo             ^<div class="status-card" id="worker-status"^>
    echo                 ^<div class="status-title"^>Worker 状态^</div^
    echo                 ^<div class="status-value"^>检查中...^</div^
    echo             ^</div^
    echo             ^<div class="status-card" id="connection-status"^>
    echo                 ^<div class="status-title"^>连接状态^</div^
    echo                 ^<div class="status-value"^>检查中...^</div^
    echo             ^</div^
    echo         ^</div^
    echo         
    echo         ^<div class="button-group"^>
    echo             ^<button id="check-all"^>检查所有状态^</button^
    echo             ^<button id="start-agent"^>启动 Agent^</button^
    echo             ^<button id="start-ai"^>启动 AI 服务^</button^
    echo             ^<button id="restart-all"^>重启所有^</button^
    echo         ^</div^
    echo         
    echo         ^<div class="api-section"^>
    echo             ^<h2^>API 测试^</h2^
    echo             ^<div class="form-group"^>
    echo                 ^<label for="api-endpoint"^>端点:^</label^
    echo                 ^<input type="text" id="api-endpoint" value="/health" placeholder="/api/端点"^>
    echo             ^</div^
    echo             ^<div class="form-group"^>
    echo                 ^<label for="api-body"^>请求体:^</label^
    echo                 ^<textarea id="api-body"^>{"test": "data"}^</textarea^
    echo             ^</div^
    echo             ^<button id="send-api"^>发送请求^</button^
    echo             
    echo             ^<h3^>响应:^</h3^
    echo             ^<div class="log-area" id="api-response"^>等待响应...^</div^
    echo         ^</div^
    echo         
    echo         ^<h2^>系统日志^</h2^
    echo         ^<div class="log-area" id="system-logs"^>加载日志中...^</div^
    echo     ^</div^
    echo     
    echo     ^<script src="jev_panel.js"^>^</script^
    echo ^</body^>
    echo ^</html^
) > "%HTML_FILE%"

echo ✓ HTML文件已创建

REM 创建JS文件
( 
    echo // JEV 控制面板 JavaScript
    echo 
    echo // 配置
    echo const AGENT_URL = "http://localhost:1820";
    echo const AI_URL = "http://localhost:1822";
    echo const WORKER_URL = "https://jevshop.bensonlove1986.workers.dev";
    echo 
    echo // DOM 元素
    echo const agentStatus = document.getElementById("agent-status");
    echo const aiStatus = document.getElementById("ai-status");
    echo const workerStatus = document.getElementById("worker-status");
    echo const connectionStatus = document.getElementById("connection-status");
    echo const systemLogs = document.getElementById("system-logs");
    echo const apiResponse = document.getElementById("api-response");
    echo 
    echo // 初始化面板
    echo function initPanel() {
    echo     // 设置事件监听器
    echo     document.getElementById("check-all").addEventListener("click", checkAllStatus);
    echo     document.getElementById("start-agent").addEventListener("click", startAgent);
    echo     document.getElementById("start-ai").addEventListener("click", startAIService);
    echo     document.getElementById("restart-all").addEventListener("click", restartAllServices);
    echo     document.getElementById("send-api").addEventListener("click", sendApiRequest);
    echo     
    echo     // 初始状态检查
    echo     checkAllStatus();
    echo     
    echo     // 每10秒自动刷新
    echo     setInterval(checkAllStatus, 10000);
    echo }
    echo 
    echo // 检查所有服务状态
    echo async function checkAllStatus() {
    echo     log("正在检查所有服务状态...");
    echo     
    echo     // 检查 Agent 状态
    echo     checkAgentStatus();
    echo     
    echo     // 检查 AI 服务状态
    echo     checkAIStatus();
    echo     
    echo     // 检查 Worker 状态
    echo     checkWorkerStatus();
    echo     
    echo     // 更新整体连接状态
    echo     updateConnectionStatus();
    echo }
    echo 
    echo // 检查 Agent 状态
    echo async function checkAgentStatus() {
    echo     try {
    echo         const response = await fetch(AGENT_URL + "/health");
    echo         if (response.ok) {
    echo             const data = await response.json();
    echo             updateStatusCard(agentStatus, "在线", "success");
    echo             log("Agent 在线 - " + data.timestamp);
    echo         } else {
    echo             updateStatusCard(agentStatus, "离线", "error");
    echo             log("Agent 离线");
    echo         }
    echo     } catch (error) {
    echo         updateStatusCard(agentStatus, "离线", "error");
    echo         log("检查 Agent 错误: " + error.message);
    echo     }
    echo }
    echo 
    echo // 检查 AI 服务状态
    echo async function checkAIStatus() {
    echo     try {
    echo         const response = await fetch(AI_URL + "/health");
    echo         if (response.ok) {
    echo             const data = await response.json();
    echo             updateStatusCard(aiStatus, "在线", "success");
    echo             log("AI 服务在线 - " + data.timestamp);
    echo         } else {
    echo             updateStatusCard(aiStatus, "离线", "error");
    echo             log("AI 服务离线");
    echo         }
    echo     } catch (error) {
    echo         updateStatusCard(aiStatus, "离线", "error");
    echo         log("检查 AI 服务错误: " + error.message);
    echo     }
    echo }
    echo 
    echo // 检查 Worker 状态
    echo async function checkWorkerStatus() {
    echo     try {
    echo         const startTime = Date.now();
    echo         const response = await fetch(WORKER_URL, { method: "HEAD" });
    echo         const endTime = Date.now();
    echo         const latency = endTime - startTime;
    echo         
    echo         updateStatusCard(workerStatus, "在线 (" + latency + "ms)", "success");
    echo         log("Worker 在线 - 延迟: " + latency + "ms");
    echo     } catch (error) {
    echo         updateStatusCard(workerStatus, "离线", "error");
    echo         log("检查 Worker 错误: " + error.message);
    echo     }
    echo }
    echo 
    echo // 更新整体连接状态
    echo function updateConnectionStatus() {
    echo     const agentOnline = agentStatus.classList.contains("success");
    echo     const aiOnline = aiStatus.classList.contains("success");
    echo     const workerOnline = workerStatus.classList.contains("success");
    echo     
    echo     if (agentOnline && aiOnline && workerOnline) {
    echo         updateStatusCard(connectionStatus, "所有系统正常", "success");
    echo     } else if (workerOnline) {
    echo         updateStatusCard(connectionStatus, "本地服务问题", "warning");
    echo     } else {
    echo         updateStatusCard(connectionStatus, "连接问题", "error");
    echo     }
    echo }
    echo 
    echo // 更新状态卡片
    echo function updateStatusCard(card, status, type) {
    echo     // 移除所有状态类
    echo     card.classList.remove("success", "warning", "error");
    echo     
    echo     // 添加新状态类
    echo     if (type) {
    echo         card.classList.add(type);
    echo     }
    echo     
    echo     // 更新状态值
    echo     const valueElement = card.querySelector(".status-value");
    echo     if (valueElement) {
    echo         valueElement.textContent = status;
    echo     }
    echo }
    echo 
    echo // 启动 Agent 服务
    echo async function startAgent() {
    echo     log("尝试启动 Agent...");
    echo     // 在实际实现中，这会触发 Agent 启动
    echo     alert("要启动 Agent，请在 D:\\JEV\\agent\\ 目录中运行 start_agent.bat");
    echo     setTimeout(checkAgentStatus, 3000);
    echo }
    echo 
    echo // 启动 AI 服务
    echo async function startAIService() {
    echo     log("尝试启动 AI 服务...");
    echo     // 在实际实现中，这会触发 AI 服务启动
    echo     alert("要启动 AI 服务，请在 D:\\JEV\\ai\\ 目录中运行 start_ai.bat");
    echo     setTimeout(checkAIStatus, 3000);
    echo }
    echo 
    echo // 重启所有服务
    echo function restartAllServices() {
    echo     log("尝试重启所有服务...");
    echo     startAgent();
    echo     startAIService();
    echo }
    echo 
    echo // 发送 API 请求
    echo async function sendApiRequest() {
    echo     const endpoint = document.getElementById("api-endpoint").value;
    echo     const bodyText = document.getElementById("api-body").value;
    echo     
    echo     try {
    echo         const body = JSON.parse(bodyText);
    echo         log("正在向 " + endpoint + " 发送 API 请求");
    echo         
    echo         let url;
    echo         if (endpoint.startsWith("/ai")) {
    echo             url = AI_URL + endpoint.replace("/ai", "");
    echo         } else {
    echo             url = AGENT_URL + endpoint;
    echo         }
    echo         
    echo         const response = await fetch(url, {
    echo             method: "POST",
    echo             headers: {
    echo                 "Content-Type": "application/json"
    echo             },
    echo             body: JSON.stringify(body)
    echo         });
    echo         
    echo         const result = await response.json();
    echo         apiResponse.textContent = JSON.stringify(result, null, 2);
    echo         log("API 请求成功完成");
    echo     } catch (error) {
    echo         apiResponse.textContent = "错误: " + error.message;
    echo         log("API 请求错误: " + error.message);
    echo     }
    echo }
    echo 
    echo // 记录消息到系统日志区域
    echo function log(message) {
    echo     const timestamp = new Date().toLocaleString();
    echo     systemLogs.textContent += "[" + timestamp + "] " + message + "\n";
    echo     systemLogs.scrollTop = systemLogs.scrollHeight;
    echo }
    echo 
    echo // 页面加载时初始化面板
    echo window.addEventListener("DOMContentLoaded", initPanel);
) > "%JS_FILE%"

echo ✓ JavaScript文件已创建

echo. 
echo 恢复完成！
echo. 
echo 请按照以下步骤操作:
echo 1. 关闭所有浏览器窗口
echo 2. 重新打开浏览器
echo 3. 访问: file:///D:/JEV/panel/jev_panel.html
echo. 
echo 控制面板现在应该恢复到中文界面和原始样式。

pause