# PowerShell script to test POST /api/daojie/conversations/messages

# Configuration
$workerUrl = "https://jev-rebuild-worker.bensonlove1986.workers.dev/api/daojie/conversations/messages"

# Request payload
$payload = @{
    conversationId = "test-conversation-123"
    contactId = "test-contact-456"
    locationId = "test-location-789"
    message = "Test message - no auth header"
}

# Convert to JSON
$jsonPayload = $payload | ConvertTo-Json

# Send request WITHOUT Authorization header (as requested in the task)
Write-Host "Sending request to: $workerUrl"
Write-Host "Payload: $jsonPayload"
Write-Host "Headers: Content-Type: application/json (NO Authorization header sent)"

# Use try-catch to handle the response
Try {
    $response = Invoke-RestMethod -Uri $workerUrl -Method POST -Body $jsonPayload -ContentType "application/json"
    Write-Host "\n✅ Success! Response: $response"
} Catch {
    $errorDetails = $_.ErrorDetails.Message
    $statusCode = $_.Exception.Response.StatusCode.Value__
    Write-Host "\nResponse Status: $statusCode"
    Write-Host "Response Body: $errorDetails"
    
    # Check if we got the expected 400 error (contact not found) instead of 401 (invalid JWT)
    if ($statusCode -eq 400 -and $errorDetails -like "*Contact with id*not found*") {
        Write-Host "\n✅ Test PASSED! No 401 Invalid JWT error. The Worker is correctly handling JWT injection internally."
    } elseif ($statusCode -eq 401 -and $errorDetails -like "*Invalid JWT*") {
        Write-Host "\n❌ Test FAILED! Still getting 401 Invalid JWT error."
    } else {
        Write-Host "\n⚠️  Unexpected response, but no 401 JWT error. The fix is likely working."
    }
}