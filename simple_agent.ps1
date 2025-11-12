Write-Host "===================================="
Write-Host "      JEV Desktop Agent v2.0"
Write-Host "===================================="

# Check config file
if (-not (Test-Path "config.json")) {
    Write-Host "[CONFIG] Creating default config file..."
    @{
        worker_url = "https://jevshop.bensonlove1986.workers.dev"
        execute_endpoint = "/execute"
        modules_endpoint = "/modules"
        last_sync = (Get-Date -Format o)
    } | ConvertTo-Json | Out-File "config.json" -Encoding utf8
    Write-Host "[CONFIG] Config file created"
}

# Read config
Write-Host "[CONFIG] Loading config..."
$config = Get-Content "config.json" -Raw | ConvertFrom-Json

Write-Host "[SERVICE] Started successfully!"
Write-Host "[SERVICE] Worker URL: $($config.worker_url)"
Write-Host "[SERVICE] Log directory: D:\PDF转网页\logs"
Write-Host "===================================="
Write-Host "Available commands:"
Write-Host "1. Execute task (execute)"
Write-Host "2. View modules (modules)"
Write-Host "3. Exit (exit)"
Write-Host "===================================="

# Main loop
while ($true) {
    $command = Read-Host "Enter command"
    
    switch ($command.ToLower()) {
        "execute" {
            $taskName = Read-Host "Enter task name"
            Write-Host "[TASK] Executing: $taskName"
            
            # Build request
            $requestBody = @{
                task = $taskName
                timestamp = (Get-Date -Format o)
            } | ConvertTo-Json
            
            try {
                $response = Invoke-RestMethod -Uri "$($config.worker_url)$($config.execute_endpoint)" `
                                            -Method POST `
                                            -ContentType "application/json" `
                                            -Body $requestBody
                Write-Host "[TASK] Execution successful!"
                Write-Host "[RESPONSE] $($response | ConvertTo-Json -Depth 3)"
            } catch {
                Write-Host "[ERROR] Task execution failed: $($_.Exception.Message)"
            }
        }
        "modules" {
            Write-Host "[MODULES] Getting available modules..."
            try {
                $response = Invoke-RestMethod -Uri "$($config.worker_url)$($config.modules_endpoint)" `
                                            -Method GET
                Write-Host "[MODULES] Available modules:"
                $response | ForEach-Object { Write-Host "  - $_" }
            } catch {
                Write-Host "[ERROR] Failed to get modules: $($_.Exception.Message)"
            }
        }
        "exit" {
            Write-Host "[EXIT] Shutting down..."
            break
        }
        default {
            Write-Host "[ERROR] Unknown command, please retry"
        }
    }
}

Write-Host "[EXIT] Service stopped"
