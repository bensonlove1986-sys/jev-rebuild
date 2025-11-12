Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "JEV CLIENT RECOVERY CHECK" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan

# Create logs directory
$logDir = "D:\PDF转网页\logs"
if (-not (Test-Path $logDir)) {
    New-Item -ItemType Directory -Path $logDir -Force | Out-Null
}

# Set log file
$logFile = "$logDir\jev_client_recovery.log"

# Log header
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
"$timestamp" | Out-File -FilePath $logFile -Force
"JEV CLIENT CHECK STARTED" | Out-File -FilePath $logFile -Append

# 1. Check if Start-JEV-Client.bat exists
Write-Host "1. Checking Start-JEV-Client.bat..." -ForegroundColor Yellow
"1. Checking Start-JEV-Client.bat..." | Out-File -FilePath $logFile -Append

$startupScriptPath = "D:\PDF转网页\JEV_Client\Start-JEV-Client.bat"
if (Test-Path $startupScriptPath) {
    Write-Host "OK: Start-JEV-Client.bat exists" -ForegroundColor Green
    "OK: Start-JEV-Client.bat exists" | Out-File -FilePath $logFile -Append
} else {
    Write-Host "ERROR: Start-JEV-Client.bat not found" -ForegroundColor Red
    "ERROR: Start-JEV-Client.bat not found" | Out-File -FilePath $logFile -Append
    
    # Create default startup script
    Write-Host "Creating default startup script..." -ForegroundColor Yellow
    "Creating default startup script..." | Out-File -FilePath $logFile -Append
    
    # Create JEV_Client directory if it doesn't exist
    $jevClientDir = "D:\PDF转网页\JEV_Client"
    if (-not (Test-Path $jevClientDir)) {
        New-Item -ItemType Directory -Path $jevClientDir -Force | Out-Null
    }
    
    @"
@echo off
cd /d "D:\PDF转网页\JEV_Client"
node server.js
"@ | Out-File -FilePath $startupScriptPath -Encoding ASCII
    
    Write-Host "OK: Created default startup script" -ForegroundColor Green
    "OK: Created default startup script" | Out-File -FilePath $logFile -Append
}

# 2. Check port 8080
Write-Host "`n2. Checking port 8080..." -ForegroundColor Yellow
"`n2. Checking port 8080..." | Out-File -FilePath $logFile -Append

$portListening = $false
try {
    $netstatOutput = netstat -ano | findstr "8080"
    if ($netstatOutput) {
        $portListening = $true
        Write-Host "OK: Port 8080 is listening" -ForegroundColor Green
        "OK: Port 8080 is listening" | Out-File -FilePath $logFile -Append
    } else {
        Write-Host "ERROR: Port 8080 not listening" -ForegroundColor Red
        "ERROR: Port 8080 not listening" | Out-File -FilePath $logFile -Append
    }
} catch {
    Write-Host "ERROR: Failed to check port status" -ForegroundColor Red
    "ERROR: Failed to check port status" | Out-File -FilePath $logFile -Append
}

# 3. Restart service if not running
if (-not $portListening) {
    Write-Host "`n3. Attempting to restart service..." -ForegroundColor Yellow
    "`n3. Attempting to restart service..." | Out-File -FilePath $logFile -Append
    
    try {
        # Ensure server.js exists or create a basic one
        $serverJsPath = "D:\PDF转网页\JEV_Client\server.js"
        if (-not (Test-Path $serverJsPath)) {
            Write-Host "Creating basic server.js file..." -ForegroundColor Yellow
            "Creating basic server.js file..." | Out-File -FilePath $logFile -Append
            
            @"
const http = require('http');
const port = 8080;

const server = http.createServer((req, res) => {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/plain');
  res.end('JEV Client Server Running\n');
});

server.listen(port, () => {
  console.log(`Server running at http://localhost:${port}/`);
});
"@ | Out-File -FilePath $serverJsPath -Encoding ASCII
        }
        
        # Start the service in a new window
        Start-Process cmd.exe -ArgumentList "/c cd /d D:\PDF转网页\JEV_Client && node server.js" -WindowStyle Normal
        
        # Wait a few seconds for the server to start
        Write-Host "Waiting for server to start..." -ForegroundColor Yellow
        Start-Sleep -Seconds 3
        
        # Check if port is now listening
        $netstatOutput = netstat -ano | findstr "8080"
        if ($netstatOutput) {
            Write-Host "OK: Service restarted successfully" -ForegroundColor Green
            "OK: Service restarted successfully" | Out-File -FilePath $logFile -Append
        } else {
            Write-Host "ERROR: Service restart failed" -ForegroundColor Red
            "ERROR: Service restart failed" | Out-File -FilePath $logFile -Append
        }
    } catch {
        Write-Host "ERROR: Failed to restart service: $_" -ForegroundColor Red
        "ERROR: Failed to restart service: $_" | Out-File -FilePath $logFile -Append
    }
} else {
    Write-Host "`n3. Service already running" -ForegroundColor Green
    "`n3. Service already running" | Out-File -FilePath $logFile -Append
}

# 4. Final status report
Write-Host "`n4. Status report saved to:" -ForegroundColor Yellow
Write-Host "$logFile" -ForegroundColor Cyan

# Update log with final status
"`n4. Final status:" | Out-File -FilePath $logFile -Append
$netstatOutput = netstat -ano | findstr "8080"
if ($netstatOutput) {
    Write-Host "OK: Service status: Running" -ForegroundColor Green
    "OK: Service status: Running" | Out-File -FilePath $logFile -Append
} else {
    Write-Host "ERROR: Service status: Not running" -ForegroundColor Red
    "ERROR: Service status: Not running" | Out-File -FilePath $logFile -Append
}

"CHECK COMPLETED" | Out-File -FilePath $logFile -Append
Write-Host "`nCHECK COMPLETED" -ForegroundColor Cyan

# Pause to keep window open
Read-Host -Prompt "Press Enter to continue"