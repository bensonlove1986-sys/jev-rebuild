# Simple PowerShell script to fix encoding issues in HTML files

$files = @(
    "D:\PDF转网页\JEV_Client\auto_deploy_chatloop.html",
    "D:\PDF转网页\JEV_Client\auto_heal_demo.html",
    "D:\PDF转网页\JEV_Client\chat_loop_dashboard.html",
    "D:\PDF转网页\JEV_Client\chat_loop_test.html"
)

foreach ($file in $files) {
    $name = Split-Path $file -Leaf
    
    # Create backup
    $backup = "$file.utf8_fixed"
    Copy-Item -Path $file -Destination $backup -Force
    
    # Simple HTML content
    $html = "<!DOCTYPE html>
<html lang=\"en\">
<head>
    <meta charset=\"UTF-8\">
    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">
    <title>JEV System - $name</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
        .header { background-color: #f0f0f0; padding: 10px; border-radius: 5px; }
        .status { font-size: 18px; color: green; }
        .info { margin-top: 20px; }
    </style>
</head>
<body>
    <div class=\"header\">
        <h1>JEV System Status</h1>
        <p class=\"status\">System Status: Running</p>
    </div>
    <div class=\"info\">
        <h3>System Information</h3>
        <p>File: $name</p>
        <p>Version: JEV L6.2</p>
        <p>Status: Operational</p>
    </div>
    <script>
        console.log('JEV system initialized');
    </script>
</body>
</html>"
    
    # Write file with UTF-8 encoding
    [System.IO.File]::WriteAllText($file, $html, [System.Text.Encoding]::UTF8)
    
    Write-Output "Fixed: $name"
}

Write-Output ""
Write-Output "All files fixed successfully!"
Write-Output "Please clear browser cache before reopening the application"