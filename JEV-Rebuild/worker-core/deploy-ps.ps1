# PowerShell deployment script for Cloudflare Worker

# Configuration
$config = @{
    accountId = '156ce03fffc59592e2b3b04dbc22aa6c'
    workerName = 'jev-rebuild-worker'
    scriptPath = '.\index.js'
    apiToken = 'YOUR_CLOUDFLARE_API_TOKEN' # Replace with your actual token
}

Write-Host '🚀 Deploying worker via Cloudflare API...'

try {
    # Read script content
    $scriptContent = Get-Content -Path $config.scriptPath -Raw
    Write-Host "📄 Script size: $($scriptContent.Length) bytes"
    
    # API request
    $uri = "https://api.cloudflare.com/client/v4/accounts/$($config.accountId)/workers/scripts/$($config.workerName)"
    $headers = @{
        'Authorization' = "Bearer $($config.apiToken)"
        'Content-Type' = 'application/javascript'
    }
    
    Write-Host "📡 Sending request to $uri"
    
    # Send request
    $response = Invoke-WebRequest -Uri $uri -Method PUT -Headers $headers -Body $scriptContent -UseBasicParsing
    
    Write-Host "✅ Deployment successful!"
    Write-Host "📡 Status code: $($response.StatusCode)"
    
    # Parse response
    $result = $response.Content | ConvertFrom-Json
    if ($result.success) {
        Write-Host "🌐 Worker URL: $($result.result.url)"
    } else {
        Write-Host "❌ Deployment failed: $($result.errors)"
    }
    
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)"
    Write-Host "🔍 Check your network connection or API token"
}
