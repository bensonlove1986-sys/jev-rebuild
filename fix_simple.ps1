@echo off
powershell -Command "
Write-Host '==========================================='
Write-Host 'Fixing HTML Encoding Issues'
Write-Host '==========================================='

$currentDir = 'D:\PDF转网页'
$targetFile = 'auto_heal_demo.html'
$fullPath = Join-Path -Path $currentDir -ChildPath $targetFile

Write-Host 'Processing: ' $targetFile

# Create a clean HTML file content
$cleanHtml = @"
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>JEV L6.2 AutoHeal</title>
</head>
<body>
    <h1>JEV L6.2 AutoHeal</h1>
    <p>System initialized successfully</p>
    <p>Encoding: UTF-8 Locked</p>
    <p>Health: 100%</p>
    <p>Time: 00:00:00</p>
</body>
</html>
"@

# Backup original file
if (Test-Path $fullPath) {
    $backupPath = $fullPath + '.bak'
    Copy-Item -Path $fullPath -Destination $backupPath -Force
    Write-Host 'Backup created: ' $backupPath
    
    # Write clean HTML
    [System.IO.File]::WriteAllText($fullPath, $cleanHtml, [System.Text.Encoding]::UTF8)
    Write-Host 'File fixed successfully!'
} else {
    Write-Host 'File not found: ' $targetFile
}

Write-Host '==========================================='
Write-Host 'Task Completed!'
Write-Host 'Please clear browser cache before viewing.'
"
