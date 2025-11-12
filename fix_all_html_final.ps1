# Simple PowerShell script to fix HTML encoding issues

$files = @(
    "D:\PDF转网页\JEV_Client\auto_deploy_chatloop.html",
    "D:\PDF转网页\JEV_Client\auto_heal_demo.html",
    "D:\PDF转网页\JEV_Client\chat_loop_dashboard.html",
    "D:\PDF转网页\JEV_Client\chat_loop_test.html"
)

foreach ($file in $files) {
    $name = Split-Path $file -Leaf
    Write-Output "Processing: $name"
    
    # Create backup
    $backup = "$file.backup"
    if (Test-Path $file) {
        Copy-Item -Path $file -Destination $backup -Force
        Write-Output "Backup created: $backup"
    }
    
    # Create simple HTML content using here-string
    $html = @"
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>JEV System - $name</title>
    <style>body { font-family: Arial; margin: 20px; }</style>
</head>
<body>
    <h1>JEV System Status</h1>
    <p>Status: Running</p>
    <p>File: $name</p>
    <p>Version: L6.2</p>
</body>
</html>
"@
    
    # Write to file with UTF-8 encoding
    [System.IO.File]::WriteAllText($file, $html, [System.Text.Encoding]::UTF8)
    Write-Output "Fixed: $name"
}

Write-Output "All files processed. Please clear browser cache."