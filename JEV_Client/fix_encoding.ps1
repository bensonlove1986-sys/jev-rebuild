# Simple Encoding Fix Script
Write-Host "Starting encoding fix..."

# Base paths
$basePath = "D:\PDF转网页"
$clientPath = "$basePath\JEV_Client"
$diagnosticsPath = "$clientPath\diagnostics"

# Ensure diagnostics directory exists
if (-not (Test-Path $diagnosticsPath)) {
    New-Item -ItemType Directory -Path $diagnosticsPath -Force | Out-Null
    Write-Host "Created diagnostics directory: $diagnosticsPath"
}

# Record timestamp
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
Write-Host "Start time: $timestamp"

# Fix function
function Fix-Encoding {
    param (
        [string]$filePath
    )
    
    try {
        # Read file
        $content = Get-Content $filePath -Raw
        
        # Check for corruption
        if ($content -match "\?\?\?" -or $content -match "") {
            Write-Host "Found corruption: $filePath"
            # Create backup
            Copy-Item $filePath "$filePath.bak" -Force
            # Clean and save as UTF-8
            Set-Content -Path $filePath -Value $content -Encoding UTF8
            Write-Host "Fixed: $filePath"
            return 1
        }
    } catch {
        Write-Host "Error processing: $filePath"
    }
    return 0
}

# Scan and fix
Write-Host "\nScanning JEV_Client directory..."
$fixedCount = 0
$totalCount = 0

$files = Get-ChildItem -Path $clientPath -Recurse -Include *.html,*.js,*.css,*.json -ErrorAction SilentlyContinue
$totalCount = $files.Count
Write-Host "Found $totalCount files"

foreach ($file in $files) {
    $fixedCount += Fix-Encoding $file.FullName
}

# Generate report
$report = @{
    task = "JEV-ENCODING-FIX"
    timestamp = $timestamp
    totalFiles = $totalCount
    fixedFiles = $fixedCount
    status = if ($fixedCount -gt 0) { "repaired" } else { "clean" }
}

$report | ConvertTo-Json | Out-File "$diagnosticsPath\encoding_fix_report.json" -Encoding UTF8

# Write log
Add-Content -Path "$diagnosticsPath\encoding_guard_log.txt" -Value "[$timestamp] Encoding fix: Fixed $fixedCount/$totalCount files"

# Show summary
Write-Host "\n===================================="
Write-Host "Fix completed!"
Write-Host "Total scanned: $totalCount files"
Write-Host "Fixed: $fixedCount files"
Write-Host "Report: $diagnosticsPath\encoding_fix_report.json"
Write-Host "===================================="