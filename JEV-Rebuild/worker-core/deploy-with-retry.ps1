#!/usr/bin/env pwsh

# Cloudflare Worker Deployment Script with Retry Logic
# Handles network instability and provides clear deployment steps

# Configuration
$AccountId = "156ce03fffc59592e2b3b04dbc22aa6c"
$WorkerName = "jev-rebuild-worker"
$ScriptPath = "./index.js"
$ApiToken = "TFCN9t7EykA8OZkOezGPe4mMHBnAgcixLVvnlrdj" # Actual Cloudflare API token
$MaxRetries = 3
$RetryDelaySeconds = 5

Write-Host "🚀 Deploying Cloudflare Worker with retry logic..."
Write-Host "📦 Account ID: $AccountId"
Write-Host "👷 Worker: $WorkerName"
Write-Host "🔐 API Token: $($ApiToken.Substring(0, 8))..."

# Check if script file exists
if (-not (Test-Path "$ScriptPath")) {
    Write-Host "❌ Script file not found: $ScriptPath" -ForegroundColor Red
    exit 1
}

# Read script content
$ScriptContent = Get-Content -Path "$ScriptPath" -Raw
$ScriptSize = $ScriptContent.Length
Write-Host "📄 Script size: $ScriptSize bytes"

# Deploy function with retry
function Deploy-Worker {
    param (
        [string]$AccountId,
        [string]$WorkerName,
        [string]$ScriptContent,
        [string]$ApiToken,
        [int]$MaxRetries
    )
    
    $RetryCount = 0
    $Success = $false
    $Response = $null
    
    while ($RetryCount -lt $MaxRetries -and -not $Success) {
        try {
            $RetryCount++
            if ($RetryCount -gt 1) {
                Write-Host "🔄 Retry $RetryCount/$MaxRetries..." -ForegroundColor Yellow
                Start-Sleep -Seconds $RetryDelaySeconds
            }
            
            $Headers = @{
                "Content-Type" = "application/javascript"
                "Authorization" = "Bearer $ApiToken"
            }
            
            $Uri = "https://api.cloudflare.com/client/v4/accounts/$AccountId/workers/scripts/$WorkerName"
            
            Write-Host "📡 Sending deployment request..."
            $Response = Invoke-RestMethod -Uri $Uri -Method PUT -Headers $Headers -Body $ScriptContent -TimeoutSec 60
            
            if ($Response.success) {
                $Success = $true
                return $Response
            } else {
                Write-Host "❌ Deployment failed (attempt $RetryCount): $($Response.errors | ConvertTo-Json -Depth 2)" -ForegroundColor Red
            }
        } catch {
            Write-Host "❌ Error during deployment (attempt $RetryCount): $($_.Exception.Message)" -ForegroundColor Red
            if ($_.Exception.Response) {
                try {
                    $ErrorStream = $_.Exception.Response.GetResponseStream()
                    $Reader = New-Object System.IO.StreamReader($ErrorStream)
                    $ErrorBody = $Reader.ReadToEnd()
                    Write-Host "📄 Error details: $ErrorBody" -ForegroundColor DarkRed
                } catch {
                    # Ignore error reading response
                }
            }
        }
    }
    
    if (-not $Success) {
        throw "Failed to deploy after $MaxRetries attempts"
    }
    
    return $Response
}

# Run deployment
try {
    $DeploymentResult = Deploy-Worker -AccountId $AccountId -WorkerName $WorkerName -ScriptContent $ScriptContent -ApiToken $ApiToken -MaxRetries $MaxRetries
    
    if ($DeploymentResult.success) {
        Write-Host "✅ Deployment successful!" -ForegroundColor Green
        $WorkerUrl = "https://$WorkerName.bensonlove1986.workers.dev"
        Write-Host "📋 Worker URL: $WorkerUrl" -ForegroundColor Green
        
        # Verify deployment
        Write-Host "🔍 Verifying deployment..."
        try {
            $HealthCheck = Invoke-RestMethod -Uri "$WorkerUrl/api/health" -Method GET -TimeoutSec 30
            Write-Host "✅ Health check passed!" -ForegroundColor Green
            Write-Host "📊 Health check result: $($HealthCheck | ConvertTo-Json -Depth 2)" -ForegroundColor Cyan
        } catch {
            Write-Host "⚠️ Health check failed, but deployment may still be successful. Check the worker URL in browser." -ForegroundColor Yellow
        }
    } else {
        Write-Host "❌ Deployment failed!" -ForegroundColor Red
        Write-Host "📄 Response: $($DeploymentResult | ConvertTo-Json -Depth 3)" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Deployment failed after multiple attempts: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "💡 Suggestions:" -ForegroundColor Yellow
    Write-Host "1. Check your internet connection"
    Write-Host "2. Verify your Cloudflare API token is valid"
    Write-Host "3. Ensure your API token has Workers edit permissions"
    Write-Host "4. Try again later when network is stable"
    Write-Host "5. Use Cloudflare Dashboard for manual deployment as fallback"
    exit 1
}

Write-Host "🎉 Deployment process completed!" -ForegroundColor Green
Write-Host "📋 Final Worker URL: https://$WorkerName.bensonlove1986.workers.dev" -ForegroundColor Green
