Write-Host "Verifying JEV Worker Environment..." -ForegroundColor Cyan

# Verify worker.js exists
if (Test-Path -Path ".\worker.js") {
    Write-Host "✓ worker.js exists" -ForegroundColor Green
} else {
    Write-Host "✗ worker.js not found" -ForegroundColor Red
    exit 1
}

# Verify wrangler.toml exists
if (Test-Path -Path ".\wrangler.toml") {
    Write-Host "✓ wrangler.toml exists" -ForegroundColor Green
} else {
    Write-Host "✗ wrangler.toml not found" -ForegroundColor Red
    exit 1
}

# Check environment variables
Write-Host "Checking environment variables..." -ForegroundColor Cyan
$envVars = @("CLOUDFLARE_ACCOUNT_ID", "CLOUDFLARE_API_TOKEN", "DAOJIE_API_KEY")
$missingVars = @()

foreach ($var in $envVars) {
    if (-not (Test-Path "env:$var")) {
        $missingVars += $var
    } else {
        Write-Host "✓ $var is set" -ForegroundColor Green
    }
}

if ($missingVars.Count -gt 0) {
    Write-Host "✗ Missing environment variables: $($missingVars -join ', ')" -ForegroundColor Red
    Write-Host "Please set these variables before deployment." -ForegroundColor Yellow
}

Write-Host "Worker environment verification completed." -ForegroundColor Cyan