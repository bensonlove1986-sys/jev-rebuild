# PowerShell script to test POST /api/daojie/conversations/messages

# Configuration
$workerUrl = "https://jev-rebuild-worker.bensonlove1986.workers.dev/api/daojie/conversations/messages"  

# PIT JWT - use the one from the wrangler.toml
$pitJwt = "pit-9c13d0fc-dfa8-4c5c-9655-04b12ead36f4" 

# Request payload
$payload = @{
    conversationId = "test-conversation-123"
    contactId = "test-contact-456"
    locationId = "test-location-789"
    message = "Test message from PowerShell script"
}

# Convert to JSON
$jsonPayload = $payload | ConvertTo-Json

# Send request
Write-Host "Sending request to: $workerUrl"
Write-Host "Payload: $jsonPayload"

$response = Invoke-RestMethod -Uri $workerUrl -Method POST -Body $jsonPayload -ContentType "application/json" -Headers @{"Authorization" = "Bearer $pitJwt"}

# Show response
Write-Host "Response: $response"