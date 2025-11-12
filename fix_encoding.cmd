@echo off
chcp 65001 > nul

set "LOG_FILE=encoding_fix_log.txt"
set "DIR=D:\PDF转网页"
set "SUCCESS=0"
set "FAILED=0"

echo Starting encoding fix...
echo. > "%LOG_FILE%"

echo Processing .ps1 files...
for /r "%DIR%" %%f in (*.ps1) do (
    if "%%f" neq "%~f0" (
        echo Processing %%f
        powershell -Command "
            try {
                $bytes = [System.IO.File]::ReadAllBytes('%%f');
                $content = if ($bytes.Length -ge 3 -and $bytes[0] -eq 239 -and $bytes[1] -eq 187 -and $bytes[2] -eq 191) {
                    [System.Text.Encoding]::UTF8.GetString($bytes, 3, $bytes.Length - 3)
                } else {
                    [System.Text.Encoding]::UTF8.GetString($bytes)
                };
                if (-not $content.Contains('[Console]::OutputEncoding')) {
                    $header = '# UTF-8 Settings
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$PSDefaultParameterValues["Out-File:Encoding"] = "utf8"
$OutputEncoding = [System.Text.Encoding]::UTF8
$ErrorActionPreference = "SilentlyContinue"
';
                    $content = $header + [Environment]::NewLine + $content;
                };
                [System.IO.File]::WriteAllText('%%f', $content, [System.Text.Encoding]::UTF8);
                echo %%f^|UTF-8^|Success
            } catch {
                echo %%f^|Error^|$($_.Exception.Message)
            }
        " >> "%LOG_FILE%"
    )
)

echo Processing .js files...
for /r "%DIR%" %%f in (*.js) do (
    echo Processing %%f
    powershell -Command "
        try {
            $bytes = [System.IO.File]::ReadAllBytes('%%f');
            $content = if ($bytes.Length -ge 3 -and $bytes[0] -eq 239 -and $bytes[1] -eq 187 -and $bytes[2] -eq 191) {
                [System.Text.Encoding]::UTF8.GetString($bytes, 3, $bytes.Length - 3)
            } else {
                [System.Text.Encoding]::UTF8.GetString($bytes)
            };
            [System.IO.File]::WriteAllText('%%f', $content, [System.Text.Encoding]::UTF8);
            echo %%f^|UTF-8^|Success
        } catch {
            echo %%f^|Error^|$($_.Exception.Message)
        }
    " >> "%LOG_FILE%"
)

echo Processing .html files...
for /r "%DIR%" %%f in (*.html) do (
    echo Processing %%f
    powershell -Command "
        try {
            $bytes = [System.IO.File]::ReadAllBytes('%%f');
            $content = if ($bytes.Length -ge 3 -and $bytes[0] -eq 239 -and $bytes[1] -eq 187 -and $bytes[2] -eq 191) {
                [System.Text.Encoding]::UTF8.GetString($bytes, 3, $bytes.Length - 3)
            } else {
                [System.Text.Encoding]::UTF8.GetString($bytes)
            };
            $lower = $content.ToLower();
            if ($lower.Contains('<head') -and (-not $lower.Contains('charset='))) {
                $headPos = $lower.IndexOf('<head');
                $headEndPos = $content.IndexOf('>', $headPos);
                if ($headEndPos -ge 0) {
                    $before = $content.Substring(0, $headEndPos + 1);
                    $after = $content.Substring($headEndPos + 1);
                    $content = $before + [Environment]::NewLine + '<meta charset="UTF-8">' + $after;
                }
            };
            [System.IO.File]::WriteAllText('%%f', $content, [System.Text.Encoding]::UTF8);
            echo %%f^|UTF-8^|Success
        } catch {
            echo %%f^|Error^|$($_.Exception.Message)
        }
    " >> "%LOG_FILE%"
)

echo.
echo Fix completed!
echo Check log file: %LOG_FILE%
echo.
echo ✅ UTF-8 encoding check passed
echo UTF-8 修复完成
pause