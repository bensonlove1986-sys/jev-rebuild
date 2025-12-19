# Test POST /api/daojie/conversations/messages
Write-Host "=== Testing POST /api/daojie/conversations/messages ==="

$testData = @{
    conversationId = "123"
    contactId = "456"
    locationId = "3SsfTbU1lmAPpkG9iB6C"
    message = "test message"
}

$jsonData = ConvertTo-Json $testData
Write-Host "Request Body: $jsonData"

try {
    $response = Invoke-RestMethod -Uri "http://localhost:8787/api/daojie/conversations/messages" -Method POST -ContentType "application/json" -Body $jsonData
    Write-Host "Response Status: Success"
    Write-Host "Response Body: $($response | ConvertTo-Json)"
} catch {
    Write-Host "Error: $_"
    if ($_.Exception.Response) {
        $statusCode = $_.Exception.Response.StatusCode.value__
        $responseContent = $_.Exception.Response.GetResponseStream() | 
            New-Object System.IO.StreamReader | 
            ReadToEnd
        Write-Host "Status Code: $statusCode"
        Write-Host "Response Content: $responseContent"
    }
}

Write-Host "`n=== Testing POST /api/translate/business ==="

$translateTestData = @{
    text = "Hello, how are you?"
    target = "zh"
}

$translateJsonData = ConvertTo-Json $translateTestData
Write-Host "Request Body: $translateJsonData"

try {
    $translateResponse = Invoke-RestMethod -Uri "http://localhost:8787/api/translate/business" -Method POST -ContentType "application/json" -Body $translateJsonData
    Write-Host "Response Status: Success"
    Write-Host "Response Body: $($translateResponse | ConvertTo-Json)"
} catch {
    Write-Host "Error: $_"
    if ($_.Exception.Response) {
        $statusCode = $_.Exception.Response.StatusCode.value__
        $responseContent = $_.Exception.Response.GetResponseStream() | 
            New-Object System.IO.StreamReader | 
            ReadToEnd
        Write-Host "Status Code: $statusCode"
        Write-Host "Response Content: $responseContent"
    }
}