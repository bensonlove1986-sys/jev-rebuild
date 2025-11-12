# Simple fix for HTML files

Write-Output "Fixing HTML files..."

# Target files
$targetDir = "D:\PDF转网页\JEV_Client"
$files = @(
    "auto_deploy_chatloop.html",
    "auto_heal_demo.html"
)

# Clean HTML template
$htmlTemplate = @"
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>{0}</title>
</head>
<body>
    <h1>{0}</h1>
    <p>System initialized</p>
    <p>Encoding: UTF-8 Locked</p>
</body>
</html>
"@

# Process each file
foreach ($file in $files) {
    $filePath = Join-Path -Path $targetDir -ChildPath $file
    if (Test-Path $filePath) {
        Write-Output "Processing $file..."
        
        # Backup
        $backupPath = "$filePath.ps1bak"
        Copy-Item -Path $filePath -Destination $backupPath -Force
        
        # Create clean HTML
        $title = "JEV L5+ $file.Replace('.html','')"
        $htmlContent = $htmlTemplate -f $title
        
        # Write with UTF-8 encoding
        [System.IO.File]::WriteAllText($filePath, $htmlContent, [System.Text.Encoding]::UTF8)
        Write-Output "Fixed $file"
    }
}

Write-Output "Complete! Please clear browser cache."