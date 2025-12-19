#!/usr/bin/env pwsh

<#
.SYNOPSIS
Verifies local port usage for JEV UI release pipeline.

.DESCRIPTION
Checks if any processes are using ports 3001 or 3002, and verifies that only one static server is using port 3000.

.EXAMPLE
.verify_ports.ps1
#>

function Log {
    param(
        [string]$Message,
        [string]$Color = "White"
    )
    Write-Host "[$(Get-Date -Format 'HH:mm:ss')] $Message" -ForegroundColor $Color
}

function ErrorLog {
    param([string]$Message)
    Log "ERROR: $Message" "Red"
}

function SuccessLog {
    param([string]$Message)
    Log "✅ $Message" "Green"
}

function WarnLog {
    param([string]$Message)
    Log "⚠️  $Message" "Yellow"
}

# Main script
Log "Starting JEV UI Port Verification..."

# Step 1: Check for processes using ports 3001 or 3002
Log "Checking for processes using ports 3001-3002..."
$portsToCheck = @(3001, 3002)
$processesFound = $false

foreach ($port in $portsToCheck) {
    $processes = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    if ($processes) {
        $processesFound = $true
        WarnLog "Port $port is in use by the following process(es):"
        foreach ($process in $processes) {
            $processName = (Get-Process -Id $process.OwningProcess -ErrorAction SilentlyContinue).Name
            WarnLog "  - PID: $($process.OwningProcess), Name: $processName"
        }
    } else {
        SuccessLog "Port $port is not in use"
    }
}

if (-not $processesFound) {
    SuccessLog "No processes found using ports 3001-3002"
}

# Step 2: Check port 3000 usage
Log "\nChecking port 3000 usage..."
$port3000Processes = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue

if (-not $port3000Processes) {
    WarnLog "Port 3000 is not in use - no static server running"
} else {
        $uniquePids = $port3000Processes | Select-Object -ExpandProperty OwningProcess -Unique
        $processCount = $uniquePids.Count
        if ($processCount -eq 1) {
            $processName = (Get-Process -Id $uniquePids[0] -ErrorAction SilentlyContinue).Name
            SuccessLog "Port 3000 is in use by a single process: PID $($uniquePids[0]), Name: $processName"
        } else {
            ErrorLog "Port 3000 is being used by $processCount processes! This is not allowed."
            foreach ($pid in $uniquePids) {
                $processName = (Get-Process -Id $pid -ErrorAction SilentlyContinue).Name
                WarnLog "  - PID: $pid, Name: $processName"
            }
        }
}

# Step 3: Check for startup scripts using non-standard ports
Log "\nChecking for startup scripts with non-standard ports..."
$scriptsToCheck = Get-ChildItem -Path . -Recurse -Include "*.ps1", "*.sh", "*.js" | Where-Object {
    # Exclude node_modules directory
    $_.FullName -notmatch "\\node_modules\\" -and
    $_.FullName -notmatch "\\.git\\" -and
    ($_.Name -like "*start*" -or $_.Name -like "*server*" -or $_.Name -like "*dev*" -or $_.Name -like "*vite*" -or $_.Name -like "*webpack*")
}

$nonStandardPorts = @()
foreach ($script in $scriptsToCheck) {
    try {
        $content = Get-Content -Path $script.FullName -ErrorAction SilentlyContinue
        if ($content -match "300[12]" -and $content -notmatch "3000") {
            $nonStandardPorts += $script.FullName
        }
    } catch {
        # Skip files that can't be read
    }
}

if ($nonStandardPorts.Count -gt 0) {
    WarnLog "Found scripts that might use non-standard ports (3001/3002):"
    foreach ($script in $nonStandardPorts) {
        WarnLog "  - $script"
    }
} else {
    SuccessLog "No scripts found using non-standard ports"
}

# Step 4: Provide commands to kill processes
Log "\n=== Commands to Kill Processes ==="
Log "To kill a process using a specific port:" "Cyan"
Log "  netstat -ano | findstr :<PORT>   # Find PID"
Log "  taskkill /PID <PID> /F           # Kill process"
Log ""
Log "Example to kill process on port 3001:" "Cyan"
Log "  netstat -ano | findstr :3001"
Log "  taskkill /PID <found_pid> /F"
Log ""

# Final summary
Log "=== Port Verification Summary ===" "Cyan"
$port3000Status = $port3000Processes -ne $null
$port3000ProcessCount = if ($port3000Status) {$uniquePids.Count} else {0}

if ($processesFound -or ($port3000Status -and $port3000ProcessCount -ne 1) -or ($nonStandardPorts.Count -gt 0)) {
    ErrorLog "Port verification failed - issues found!"
    exit 1
} else {
    SuccessLog "Port verification passed - all ports are properly configured!"
    exit 0
}