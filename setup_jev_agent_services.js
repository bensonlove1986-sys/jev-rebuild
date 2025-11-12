// JEV Agent Services Setup Script
// This script creates the necessary agent and AI service files for JEV system

const fs = require('fs');
const path = require('path');

// Create directory structure
const jevRoot = 'D:\\JEV';
const agentDir = path.join(jevRoot, 'agent');
const aiDir = path.join(jevRoot, 'ai');

// Create directories if they don't exist
if (!fs.existsSync(jevRoot)) {
    fs.mkdirSync(jevRoot, { recursive: true });
    console.log(`Created root directory: ${jevRoot}`);
}

if (!fs.existsSync(agentDir)) {
    fs.mkdirSync(agentDir, { recursive: true });
    console.log(`Created agent directory: ${agentDir}`);
}

if (!fs.existsSync(aiDir)) {
    fs.mkdirSync(aiDir, { recursive: true });
    console.log(`Created AI directory: ${aiDir}`);
}

// desktopAgent.js content
const desktopAgentContent = '// JEV Desktop Agent Service
// Provides API endpoints for jev_panel.html to connect and check status

const express = require("express");
const cors = require("cors");
const app = express();
const PORT = 1820;

// Middleware
app.use(cors());
app.use(express.json());

// System status
let systemStatus = {
    agentRunning: true,
    workerStatus: "connected",
    version: "2.0",
    uptime: 0,
    lastHeartbeat: new Date().toISOString()
};

// Start uptime counter
let startTime = Date.now();
setInterval(() => {
    systemStatus.uptime = Math.floor((Date.now() - startTime) / 1000);
    systemStatus.lastHeartbeat = new Date().toISOString();
}, 1000);

// API Endpoints

// Ping endpoint - basic health check
app.get("/ping", (req, res) => {
    console.log("Received ping request");
    res.json({
        agent_ok: true,
        port: PORT,
        timestamp: new Date().toISOString()
    });
});

// Status endpoint - detailed system information
app.get("/status", (req, res) => {
    console.log("Received status request");
    res.json({
        status: "online",
        agent: systemStatus,
        worker: {
            connected: true,
            mode: "local",
            latency: Math.floor(Math.random() * 100) // Simulated latency
        },
        jev: {
            mode: "root",
            path: "D:/JEV",
            version: "2.0"
        }
    });
});

// Info endpoint - general information
app.get("/info", (req, res) => {
    res.json({
        service: "JEV Desktop Agent",
        version: "1.0.0",
        description: "Local service for JEV control panel",
        endpoints: ["/ping", "/status", "/info"]
    });
});

// Start server
app.listen(PORT, () => {
    console.log("JEV Desktop Agent running on http://localhost:" + PORT);
    console.log("Available endpoints:");
    console.log("  GET http://localhost:" + PORT + "/ping");
    console.log("  GET http://localhost:" + PORT + "/status");
    console.log("  GET http://localhost:" + PORT + "/info");
    console.log("\nJEV Panel should now show as \"Connected\" when refreshed.");
});

// Handle graceful shutdown
process.on("SIGINT", () => {
    console.log("Shutting down JEV Desktop Agent...");
    process.exit(0);
});
';

// local_ai.js content
const localAiContent = '// JEV Local AI Service
// Provides AI-related endpoints for JEV system

const express = require("express");
const cors = require("cors");
const app = express();
const PORT = 1821;

// Middleware
app.use(cors());
app.use(express.json());

// AI Service status
const aiStatus = {
    serviceRunning: true,
    modelAvailable: true,
    version: "1.0",
    features: ["translation", "analysis", "processing"]
};

// API Endpoints

// Ping endpoint
app.get("/ping", (req, res) => {
    console.log("AI Service ping received");
    res.json({
        ai_service_ok: true,
        port: PORT,
        timestamp: new Date().toISOString()
    });
});

// Status endpoint
app.get("/status", (req, res) => {
    console.log("AI Service status requested");
    res.json({
        status: "operational",
        ai: aiStatus,
        resources: {
            memory_usage: "45%",
            processing_available: true
        }
    });
});

// Simple test endpoint
app.post("/test", (req, res) => {
    const { input } = req.body || {};
    res.json({
        success: true,
        message: "AI service test successful",
        received: input,
        response: "This is a test response from JEV Local AI Service"
    });
});

// Start server
app.listen(PORT, () => {
    console.log("JEV Local AI Service running on http://localhost:" + PORT);
    console.log("Available endpoints:");
    console.log("  GET http://localhost:" + PORT + "/ping");
    console.log("  GET http://localhost:" + PORT + "/status");
    console.log("  POST http://localhost:" + PORT + "/test");
});

// Handle graceful shutdown
process.on("SIGINT", () => {
    console.log("Shutting down JEV Local AI Service...");
    process.exit(0);
});
';

// package.json content for agent directory
const packageJsonContent = `{
  "name": "jev-agent-services",
  "version": "1.0.0",
  "description": "JEV Agent and AI Services",
  "main": "desktopAgent.js",
  "scripts": {
    "start-agent": "node desktopAgent.js",
    "start-ai": "node ../ai/local_ai.js",
    "start-all": "concurrently \"node desktopAgent.js\" \"node ../ai/local_ai.js\""
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5"
  },
  "devDependencies": {
    "concurrently": "^8.2.2"
  }
}`;

// Start script for both services
const startServicesScript = `@echo off
cls
echo Starting JEV Services...
echo =========================

rem Check if Node.js is installed
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed. Please install Node.js first.
    pause
    exit /b 1
)

cd /d "%~dp0"

rem Check if node_modules exists, if not, install dependencies
dir node_modules >nul 2>&1
if %errorlevel% neq 0 (
    echo Installing dependencies...
    npm install
    if %errorlevel% neq 0 (
        echo ERROR: Failed to install dependencies.
        pause
        exit /b 1
    )
)

rem Start both services
echo Starting JEV Desktop Agent and AI Service...
call npm run start-all

pause`;

// Write files
try {
    // Write desktopAgent.js
    const desktopAgentPath = path.join(agentDir, 'desktopAgent.js');
    fs.writeFileSync(desktopAgentPath, desktopAgentContent, 'utf8');
    console.log(`Created: ${desktopAgentPath}`);
    
    // Write local_ai.js
    const localAiPath = path.join(aiDir, 'local_ai.js');
    fs.writeFileSync(localAiPath, localAiContent, 'utf8');
    console.log(`Created: ${localAiPath}`);
    
    // Write package.json
    const packageJsonPath = path.join(agentDir, 'package.json');
    fs.writeFileSync(packageJsonPath, packageJsonContent, 'utf8');
    console.log(`Created: ${packageJsonPath}`);
    
    // Write start script
    const startScriptPath = path.join(agentDir, 'start_services.bat');
    fs.writeFileSync(startScriptPath, startServicesScript, 'utf8');
    console.log(`Created: ${startScriptPath}`);
    
    // Create a simple test script to verify connectivity
    const testScriptContent = 'const https = require("https");
const http = require("http");

function testEndpoint(url) {
    return new Promise((resolve) => {
        const protocol = url.startsWith("https") ? https : http;
        
        console.log("Testing: " + url);
        protocol.get(url, (res) => {
            let data = "";
            res.on("data", (chunk) => { data += chunk; });
            res.on("end", () => {
                try {
                    resolve({ success: true, data: JSON.parse(data) });
                } catch (e) {
                    resolve({ success: false, error: "Invalid JSON response" });
                }
            });
        }).on("error", (e) => {
            resolve({ success: false, error: e.message });
        });
    });
}

async function runTests() {
    console.log("Testing JEV Services Connectivity...");
    console.log("==================================");
    
    const agentPing = await testEndpoint("http://localhost:1820/ping");
    const agentStatus = await testEndpoint("http://localhost:1820/status");
    const aiPing = await testEndpoint("http://localhost:1821/ping");
    
    console.log("\nResults:");
    console.log("- Agent Ping:", agentPing.success ? "✅ SUCCESS" : "❌ FAILED");
    console.log("- Agent Status:", agentStatus.success ? "✅ SUCCESS" : "❌ FAILED");
    console.log("- AI Service Ping:", aiPing.success ? "✅ SUCCESS" : "❌ FAILED");
    
    if (agentPing.success && agentStatus.success) {
        console.log("\n✅ JEV Agent Services are running correctly!");
        console.log("Please refresh jev_panel.html to see the Connected status.");
    } else {
        console.log("\n❌ Some services are not available. Please check if the services are running.");
    }
}

runTests();';
    
    const testScriptPath = path.join(agentDir, 'test_connectivity.js');
    fs.writeFileSync(testScriptPath, testScriptContent, 'utf8');
    console.log(`Created: ${testScriptPath}`);
    
    console.log('\n✅ JEV Agent Services setup completed successfully!');
    console.log('\nTo start the services:');
    console.log(`1. Open command prompt and navigate to: ${agentDir}`);
    console.log(`2. Run: start_services.bat`);
    console.log('3. After services start, refresh jev_panel.html to see the Connected status');
    
} catch (error) {
    console.error('❌ Error setting up JEV Agent Services:', error.message);
    process.exit(1);
}