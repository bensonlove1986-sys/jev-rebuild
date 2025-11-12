# JEV Relay Stabilizer - Startup Script
# v1.0 - Environment check and forwarding service startup

Write-Host "===========================================" -ForegroundColor Cyan
Write-Host "        JEV Relay Stabilizer v1.0         " -ForegroundColor Cyan
Write-Host "===========================================" -ForegroundColor Cyan

# Set script paths
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$serverScript = Join-Path $scriptDir "relay_server.js"
$configFile = Join-Path $scriptDir "relay_config.json"

# Check if Node.js is installed
Write-Host "[Check] Verifying Node.js environment..." -ForegroundColor Yellow
try {
    $nodeVersion = (node -v).Trim()
    if ($nodeVersion.StartsWith("v")) {
        Write-Host "[Success] Node.js installed: $nodeVersion" -ForegroundColor Green
    } else {
        throw "Invalid Node.js version output"
    }
} catch {
    Write-Host "[Error] Node.js not installed or inaccessible" -ForegroundColor Red
    Write-Host "Please install Node.js first before running this script." -ForegroundColor Yellow
    Write-Host "Download: https://nodejs.org/en/download/" -ForegroundColor Yellow
    Write-Host "Press any key to exit..."
    $null = $Host.UI.RawUI.ReadKey('NoEcho,IncludeKeyDown')
    exit 1
}

# Check if server script exists
if (-not (Test-Path $serverScript)) {
    Write-Host "[Error] Server script not found: $serverScript" -ForegroundColor Red
    exit 1
}

# Check if config file exists
if (-not (Test-Path $configFile)) {
    Write-Host "[Error] Config file not found: $configFile" -ForegroundColor Red
    exit 1
}

# Read config file to display port information
try {
    $config = Get-Content $configFile -Raw | ConvertFrom-Json
    $port = $config.relay_port
    Write-Host "[Config] Relay service will start on port $port" -ForegroundColor Cyan
} catch {
    Write-Host "[Warning] Cannot read config file, using default config" -ForegroundColor Yellow
    $port = 8080
}

# Check if port is available
try {
    $listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Any, $port)
    $listener.Start()
    $listener.Stop()
    Write-Host "[Check] Port $port is available" -ForegroundColor Green
} catch {
    Write-Host "[Error] Port $port is already in use" -ForegroundColor Red
    Write-Host "Please close the service occupying this port first, or modify the port number in the config file." -ForegroundColor Yellow
    exit 1
}

Write-Host "" -ForegroundColor White
Write-Host "[Start] Starting JEV Relay service..." -ForegroundColor Cyan
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host "  Press Ctrl+C to stop service  " -ForegroundColor Yellow
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host "" -ForegroundColor White

# Start Node.js server directly in this window
try {
    Write-Host "[Info] Relay service address: http://localhost:$port/api/relay" -ForegroundColor Cyan
    Write-Host "[Info] Health check address: http://localhost:$port/api/relay/ping" -ForegroundColor Cyan
    Write-Host "[Info] Log file: D:\PDF转网页\JEV_Client\diagnostics\relay_log.txt" -ForegroundColor Cyan
    Write-Host "" -ForegroundColor White
    
    # Change to script directory and run node server
    Set-Location $scriptDir
    Write-Host "[Starting] Running Node.js server..." -ForegroundColor Green
    node $serverScript
    
} catch {
    Write-Host "[Error] Failed to start service: $_" -ForegroundColor Red
    exit 1
}