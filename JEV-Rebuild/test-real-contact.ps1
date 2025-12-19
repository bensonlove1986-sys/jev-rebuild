# PowerShell script to test with real contactId

# Configuration
$workerUrl = "https://jev-rebuild-worker.bensonlove1986.workers.dev/api/daojie/conversations/messages"

# Real contactId from the task description
$realContactId = "GakCvF3msAuChq2DtER9"

# Test message
$testMessage = "ping"

# Request payload - minimal fields only
$payload = @{
    contactId = $realContactId
    message = $testMessage
}

# Convert to JSON
$jsonPayload = $payload | ConvertTo-Json

# Send request
Write-Host "Testing with real contactId: $realContactId"
Write-Host "Sending request to: $workerUrl"
Write-Host "Payload: $jsonPayload"
Write-Host "Headers: Content-Type: application/json (NO Authorization header sent)"

# Use try-catch to handle the response
Try {
    $response = Invoke-RestMethod -Uri $workerUrl -Method POST -Body $jsonPayload -ContentType "application/json"
    Write-Host "\n✅ Success! Response: $response"
    Write-Host "\n✅ Test PASSED! Message sent successfully with real contactId."
} Catch {
    $errorDetails = $_.ErrorDetails.Message
    $statusCode = $_.Exception.Response.StatusCode.Value__
    Write-Host "\nResponse Status: $statusCode"
    Write-Host "Response Body: $errorDetails"
    
    if ($statusCode -eq 200 -or $statusCode -eq 201) {
        Write-Host "\n✅ Test PASSED! Message sent successfully."
    } elseif ($statusCode -eq 400) {
        Write-Host "\n⚠️  Bad request (400) - This might be expected if the contactId is not valid in the current environment."
        Write-Host "   Check the error message: $errorDetails"
    } elseif ($statusCode -eq 401) {
        Write-Host "\n❌ Test FAILED! 401 Invalid JWT error still occurs."
    } else {
        Write-Host "\n❌ Test FAILED! Unexpected error occurred."
    }
}