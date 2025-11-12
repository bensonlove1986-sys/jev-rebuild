// Simple script to create JEV services files
const fs = require('fs');
const path = require('path');

// Create directory structure
const jevDir = 'D:/JEV';
const agentDir = path.join(jevDir, 'agent');
const aiDir = path.join(jevDir, 'ai');

console.log('Creating JEV services files...');

// Create directories if they don't exist
if (!fs.existsSync(agentDir)) {
    fs.mkdirSync(agentDir, { recursive: true });
    console.log('Created directory:', agentDir);
}

if (!fs.existsSync(aiDir)) {
    fs.mkdirSync(aiDir, { recursive: true });
    console.log('Created directory:', aiDir);
}

// Function to write file safely
function writeFileSafe(filePath, content) {
    try {
        fs.writeFileSync(filePath, content);
        console.log('Created file:', filePath);
        return true;
    } catch (error) {
        console.error('Error creating file', filePath, ':', error.message);
        return false;
    }
}

// 1. Create desktopAgent.js
const desktopAgentPath = path.join(agentDir, 'desktopAgent.js');
const desktopAgentContent = [
    '// JEV Desktop Agent Service',
    '// Provides API endpoints for jev_panel.html to connect and check status',
    '',
    'const express = require("express");',
    'const cors = require("cors");',
    'const app = express();',
    'const PORT = 1820;',
    '',
    '// Middleware',
    'app.use(cors());',
    'app.use(express.json());',
    '',
    '// System status',
    'let systemStatus = {',
    '    agentRunning: true,',
    '    workerStatus: "connected",',
    '    version: "2.0",',
    '    uptime: 0,',
    '    lastHeartbeat: new Date().toISOString()',
    '};',
    '',
    '// Start uptime counter',
    'let startTime = Date.now();',
    'setInterval(() => {',
    '    systemStatus.uptime = Math.floor((Date.now() - startTime) / 1000);',
    '    systemStatus.lastHeartbeat = new Date().toISOString();',
    '}, 1000);',
    '',
    '// API Endpoints',
    '',
    '// Ping endpoint - basic health check',
    'app.get("/ping", (req, res) => {',
    '    console.log("Received ping request");',
    '    res.json({',
    '        agent_ok: true,',
    '        port: PORT,',
    '        timestamp: new Date().toISOString()',
    '    });',
    '});',
    '',
    '// Status endpoint - detailed system information',
    'app.get("/status", (req, res) => {',
    '    console.log("Received status request");',
    '    res.json({',
    '        status: "online",',
    '        agent: systemStatus,',
    '        worker: {',
    '            connected: true,',
    '            mode: "local",',
    '            latency: Math.floor(Math.random() * 100) // Simulated latency',
    '        },',
    '        jev: {',
    '            mode: "root",',
    '            path: "D:/JEV",',
    '            version: "2.0"',
    '        }',
    '    });',
    '});',
    '',
    '// Info endpoint - general information',
    'app.get("/info", (req, res) => {',
    '    res.json({',
    '        service: "JEV Desktop Agent",',
    '        version: "1.0.0",',
    '        description: "Local service for JEV control panel",',
    '        endpoints: ["/ping", "/status", "/info"]',
    '    });',
    '});',
    '',
    '// Start server',
    'app.listen(PORT, () => {',
    '    console.log("JEV Desktop Agent running on http://localhost:" + PORT);',
    '    console.log("Available endpoints:");',
    '    console.log("  GET http://localhost:" + PORT + "/ping");',
    '    console.log("  GET http://localhost:" + PORT + "/status");',
    '    console.log("  GET http://localhost:" + PORT + "/info");',
    '    console.log("\nJEV Panel should now show as \"Connected\" when refreshed.");',
    '});',
    '',
    '// Handle graceful shutdown',
    'process.on("SIGINT", () => {',
    '    console.log("Shutting down JEV Desktop Agent...");',
    '    process.exit(0);',
    '});'
].join('\n');

writeFileSafe(desktopAgentPath, desktopAgentContent);

// 2. Create local_ai.js
const localAiPath = path.join(aiDir, 'local_ai.js');
const localAiContent = [
    '// JEV Local AI Service',
    '// Provides AI-related endpoints for JEV system',
    '',
    'const express = require("express");',
    'const cors = require("cors");',
    'const app = express();',
    'const PORT = 1821;',
    '',
    '// Middleware',
    'app.use(cors());',
    'app.use(express.json());',
    '',
    '// AI Service status',
    'const aiStatus = {',
    '    serviceRunning: true,',
    '    modelAvailable: true,',
    '    version: "1.0",',
    '    features: ["translation", "analysis", "processing"]',
    '};',
    '',
    '// API Endpoints',
    '',
    '// Ping endpoint',
    'app.get("/ping", (req, res) => {',
    '    console.log("AI Service ping received");',
    '    res.json({',
    '        ai_service_ok: true,',
    '        port: PORT,',
    '        timestamp: new Date().toISOString()',
    '    });',
    '});',
    '',
    '// Status endpoint',
    'app.get("/status", (req, res) => {',
    '    console.log("AI Service status requested");',
    '    res.json({',
    '        status: "operational",',
    '        ai: aiStatus,',
    '        resources: {',
    '            memory_usage: "45%",',
    '            processing_available: true',
    '        }',
    '    });',
    '});',
    '',
    '// Simple test endpoint',
    'app.post("/test", (req, res) => {',
    '    const { input } = req.body || {};',
    '    res.json({',
    '        success: true,',
    '        message: "AI service test successful",',
    '        received: input,',
    '        response: "This is a test response from JEV Local AI Service"',
    '    });',
    '});',
    '',
    '// Start server',
    'app.listen(PORT, () => {',
    '    console.log("JEV Local AI Service running on http://localhost:" + PORT);',
    '    console.log("Available endpoints:");',
    '    console.log("  GET http://localhost:" + PORT + "/ping");',
    '    console.log("  GET http://localhost:" + PORT + "/status");',
    '    console.log("  POST http://localhost:" + PORT + "/test");',
    '});',
    '',
    '// Handle graceful shutdown',
    'process.on("SIGINT", () => {',
    '    console.log("Shutting down JEV Local AI Service...");',
    '    process.exit(0);',
    '});'
].join('\n');

writeFileSafe(localAiPath, localAiContent);

// 3. Create package.json for agent directory
const agentPackagePath = path.join(agentDir, 'package.json');
const agentPackageContent = [
    '{',
    '  "name": "jev-desktop-agent",',
    '  "version": "1.0.0",',
    '  "description": "JEV Desktop Agent Service",',
    '  "main": "desktopAgent.js",',
    '  "scripts": {',
    '    "start": "node desktopAgent.js",',
    '    "test": "node test_connectivity.js"',
    '  },',
    '  "dependencies": {',
    '    "express": "^4.19.2",',
    '    "cors": "^2.8.5"',
    '  }',
    '}'
].join('\n');

writeFileSafe(agentPackagePath, agentPackageContent);

// 4. Create package.json for ai directory
const aiPackagePath = path.join(aiDir, 'package.json');
const aiPackageContent = [
    '{',
    '  "name": "jev-local-ai",',
    '  "version": "1.0.0",',
    '  "description": "JEV Local AI Service",',
    '  "main": "local_ai.js",',
    '  "scripts": {',
    '    "start": "node local_ai.js"',
    '  },',
    '  "dependencies": {',
    '    "express": "^4.19.2",',
    '    "cors": "^2.8.5"',
    '  }',
    '}'
].join('\n');

writeFileSafe(aiPackagePath, aiPackageContent);

// 5. Create start_services.bat
const batPath = path.join(jevDir, 'start_services.bat');
const batContent = [
    '@echo off',
    'echo Starting JEV Services...',
    'echo =========================',
    '',
    'echo Starting Desktop Agent...',
    'cd "agent"',
    'start cmd /k "npm install && npm start"',
    'cd ..',
    '',
    'echo Starting AI Service...',
    'cd "ai"',
    'start cmd /k "npm install && npm start"',
    'cd ..',
    '',
    'echo Services are starting in separate windows.',
    'echo Please wait for both services to initialize.',
    'echo You can access the JEV Panel at D:\JEV\jev_panel.html',
    'timeout /t 5 >nul',
    'start D:\JEV\jev_panel.html',
    'exit'
].join('\r\n');

writeFileSafe(batPath, batContent);

// 6. Create test_connectivity.js
const testPath = path.join(agentDir, 'test_connectivity.js');
const testContent = [
    'const https = require("https");',
    'const http = require("http");',
    '',
    'function testEndpoint(url) {',
    '    return new Promise((resolve) => {',
    '        const protocol = url.startsWith("https") ? https : http;',
    '        ',
    '        console.log("Testing: " + url);',
    '        protocol.get(url, (res) => {',
    '            let data = "";',
    '            res.on("data", (chunk) => { data += chunk; });',
    '            res.on("end", () => {',
    '                try {',
    '                    resolve({ success: true, data: JSON.parse(data) });',
    '                } catch (e) {',
    '                    resolve({ success: false, error: "Invalid JSON response" });',
    '                }',
    '            });',
    '        }).on("error", (e) => {',
    '            resolve({ success: false, error: e.message });',
    '        });',
    '    });',
    '}',
    '',
    'async function runTests() {',
    '    console.log("Testing JEV Services Connectivity...");',
    '    console.log("==================================");',
    '    ',
    '    const agentPing = await testEndpoint("http://localhost:1820/ping");',
    '    const agentStatus = await testEndpoint("http://localhost:1820/status");',
    '    const aiPing = await testEndpoint("http://localhost:1821/ping");',
    '    ',
    '    console.log("\nResults:");',
    '    console.log("- Agent Ping:", agentPing.success ? "✅ SUCCESS" : "❌ FAILED");',
    '    console.log("- Agent Status:", agentStatus.success ? "✅ SUCCESS" : "❌ FAILED");',
    '    console.log("- AI Service Ping:", aiPing.success ? "✅ SUCCESS" : "❌ FAILED");',
    '    ',
    '    if (agentPing.success && agentStatus.success) {',
    '        console.log("\n✅ JEV Agent Services are running correctly!");',
    '        console.log("Please refresh jev_panel.html to see the Connected status.");',
    '    } else {',
    '        console.log("\n❌ Some services are not available. Please check if the services are running.");',
    '    }',
    '}',
    '',
    'runTests();'
].join('\n');

writeFileSafe(testPath, testContent);

// 7. Create a simple Python web server script as fallback
const pythonServerPath = path.join(jevDir, 'start_server.py');
const pythonContent = [
    '# Simple HTTP server to test JEV panel connectivity',
    '# Run with: python start_server.py',
    '',
    'import http.server',
    'import socketserver',
    'import json',
    'from datetime import datetime',
    '',
    'PORT = 1820',
    '',
    'class MyHandler(http.server.BaseHTTPRequestHandler):',
    '    def do_GET(self):',
    '        if self.path == "/ping":',
    '            self.send_response(200)',
    '            self.send_header("Content-type", "application/json")',
    '            self.send_header("Access-Control-Allow-Origin", "*")',
    '            self.end_headers()',
    '            response = {',
    '                "agent_ok": True,',
    '                "port": PORT,',
    '                "timestamp": datetime.now().isoformat()',
    '            }',
    '            self.wfile.write(json.dumps(response).encode())',
    '        elif self.path == "/status":',
    '            self.send_response(200)',
    '            self.send_header("Content-type", "application/json")',
    '            self.send_header("Access-Control-Allow-Origin", "*")',
    '            self.end_headers()',
    '            response = {',
    '                "status": "online",',
    '                "agent": {',
    '                    "agentRunning": True,',
    '                    "workerStatus": "connected",',
    '                    "version": "2.0",',
    '                    "uptime": 0,',
    '                    "lastHeartbeat": datetime.now().isoformat()',
    '                },',
    '                "worker": {',
    '                    "connected": True,',
    '                    "mode": "local",',
    '                    "latency": 42',
    '                },',
    '                "jev": {',
    '                    "mode": "root",',
    '                    "path": "D:/JEV",',
    '                    "version": "2.0"',
    '                }',
    '            }',
    '            self.wfile.write(json.dumps(response).encode())',
    '        else:',
    '            self.send_response(404)',
    '            self.end_headers()',
    '',
    'with socketserver.TCPServer(("", PORT), MyHandler) as httpd:',
    '    print(f"JEV Test Server running on port {PORT}")',
    '    print("Available endpoints:")',
    '    print(f"  GET http://localhost:{PORT}/ping")',
    '    print(f"  GET http://localhost:{PORT}/status")',
    '    print("\nJEV Panel should now show as \"Connected\" when refreshed.")',
    '    print("Press Ctrl+C to stop the server")',
    '    httpd.serve_forever()'
].join('\n');

writeFileSafe(pythonServerPath, pythonContent);

console.log('\n✅ JEV Services files created successfully!');
console.log('');
console.log('Next steps:');
console.log('1. To start the Node.js services, run: D:\\JEV\\start_services.bat');
console.log('2. As a fallback, you can run the Python test server with: python D:\\JEV\\start_server.py');
console.log('3. After starting the services, refresh D:\\JEV\\jev_panel.html to see the Connected status');
