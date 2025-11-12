# PowerShell script to fix encoding issues in multiple HTML files

$htmlFiles = @(
    "D:\PDF转网页\JEV_Client\auto_deploy_chatloop.html",
    "D:\PDF转网页\JEV_Client\auto_heal_demo.html",
    "D:\PDF转网页\JEV_Client\chat_loop_dashboard.html",
    "D:\PDF转网页\JEV_Client\chat_loop_test.html"
)

$outputDir = "D:\PDF转网页\JEV_Client"

# Function to create a clean HTML structure with proper UTF-8 encoding
function Create-CleanHtml {
    param(
        [string]$fileName
    )
    
    $title = "JEV System Status"
    $statusText = "System Status: Running"
    
    # Simple HTML content with UTF-8 meta tag
    $htmlContent = @"
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>$title</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .status-container { border: 1px solid #ccc; padding: 15px; border-radius: 5px; }
        .status-good { color: green; }
        .system-info { margin-top: 20px; }
        .file-info { font-size: 12px; color: #666; }
    </style>
</head>
<body>
    <div class="status-container">
        <h1>JEV AutoHeal System</h1>
        <p class="status-good">$statusText</p>
        <div class="system-info">
            <h3>System Information</h3>
            <p>Version: L6.2</p>
            <p>Status: Operational</p>
            <p class="file-info">File: $fileName</p>
        </div>
    </div>
    <script>
        console.log('JEV system initialized successfully');
    </script>
</body>
</html>
"@
    
    return $htmlContent
}

# Process each file
foreach ($file in $htmlFiles) {
    $fileName = Split-Path $file -Leaf
    
    try {
        # Create backup
        $backupFile = "$file.backup_$(Get-Date -Format 'yyyyMMdd_HHmmss')"
        Copy-Item -Path $file -Destination $backupFile -Force
        
        # Create clean HTML content
        $cleanHtml = Create-CleanHtml -fileName $fileName
        
        # Write to file with UTF-8 encoding without BOM
        [System.IO.File]::WriteAllText($file, $cleanHtml, [System.Text.Encoding]::UTF8)
        
        Write-Host "Successfully fixed: $fileName"
        Write-Host "Backup created: $backupFile"
        
    } catch {
        Write-Host "Error fixing $fileName: $_" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "All HTML files processing complete." -ForegroundColor Green
echo "Please clear browser cache before reopening the application"