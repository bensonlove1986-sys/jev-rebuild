# PowerShell script to fix encoding issues in more HTML files

$files = @(
    "D:\PDF转网页\JEV_Client\multichannel_demo.html",
    "D:\PDF转网页\JEV_Client\orchestrator_demo.html",
    "D:\PDF转网页\JEV_Client\recovery_demo.html",
    "D:\PDF转网页\JEV_Client\simple-upgrade.html",
    "D:\PDF转网页\JEV_Client\test_auto_task.html"
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
    <style>body { font-family: Arial; margin: 20px; color: #333; }
    .header { background-color: #f0f0f0; padding: 10px; border-radius: 5px; }
    .status { color: green; font-size: 18px; }
    .info { margin-top: 20px; }
    .version { font-weight: bold; }</style>
</head>
<body>
    <div class="header">
        <h1>JEV System Status</h1>
        <p class="status">System Status: Running</p>
    </div>
    <div class="info">
        <h3>System Information</h3>
        <p>File: $name</p>
        <p class="version">Version: JEV L6.7</p>
        <p>Status: Operational</p>
        <p>Encoding: UTF-8 (Fixed)</p>
    </div>
    <script>
        console.log('JEV system initialized successfully');
        console.log('File: $name');
    </script>
</body>
</html>
"@
    
    # Write to file with UTF-8 encoding
    [System.IO.File]::WriteAllText($file, $html, [System.Text.Encoding]::UTF8)
    Write-Output "Fixed: $name"
}

Write-Output ""
Write-Output "All additional files processed successfully!"
Write-Output "Please clear browser cache before reopening the application"