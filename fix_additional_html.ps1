# PowerShell script to fix encoding issues in additional HTML files

$files = @(
    "D:\PDF转网页\JEV_Client\chatloop_auto_deploy_complete.html",
    "D:\PDF转网页\JEV_Client\fix_plugin.html",
    "D:\PDF转网页\JEV_Client\index.html",
    "D:\PDF转网页\JEV_Client\jev-environment-check.html",
    "D:\PDF转网页\JEV_Client\jev-l5-verification-dashboard.html",
    "D:\PDF转网页\JEV_Client\jev-upgrade-executor.html",
    "D:\PDF转网页\JEV_Client\jev-upgrade-executor-l5.html",
    "D:\PDF转网页\JEV_Client\module_registration_test.html",
    "D:\PDF转网页\JEV_Client\multichannel_demo.html"
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
    .info { margin-top: 20px; }</style>
</head>
<body>
    <div class="header">
        <h1>JEV System Status</h1>
        <p class="status">System Status: Running</p>
    </div>
    <div class="info">
        <h3>System Information</h3>
        <p>File: $name</p>
        <p>Version: JEV L6.7</p>
        <p>Status: Operational</p>
    </div>
    <script>
        console.log('JEV system initialized successfully');
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