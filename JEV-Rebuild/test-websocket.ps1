# Test WebSocket connection to the /stream endpoint
$wsUrl = "wss://jev-rebuild-worker.bensonlove1986.workers.dev/stream"

Write-Host "Testing WebSocket connection to: $wsUrl"
Write-Host "======================================="

# Create a WebSocket client
$ws = New-Object System.Net.WebSockets.ClientWebSocket
$cts = New-Object System.Threading.CancellationTokenSource

# Connect to the WebSocket endpoint
try {
    Write-Host "Connecting..."
    $connectTask = $ws.ConnectAsync($wsUrl, $cts.Token)
    
    # Wait for connection with timeout
    try {
        $success = $connectTask.Wait(10000)
        if (-not $success) {
            Write-Host "❌ Connection timed out after 10 seconds"
            $cts.Cancel()
            return
        }
        
        # Check if there was an exception
        if ($connectTask.Exception) {
            Write-Host "❌ Connection task failed with exception:"
            $connectTask.Exception.InnerExceptions | ForEach-Object {
                Write-Host "  - $($_.Message)"
                Write-Host "    Stack trace: $($_.StackTrace)"
            }
            return
        }
        
        if ($ws.State -eq [System.Net.WebSockets.WebSocketState]::Open) {
            Write-Host "✅ WebSocket connection successful!"
            Write-Host "Connection state: $($ws.State)"
            
            # Send a test message
            $message = "Hello from PowerShell!"
            $buffer = [System.Text.Encoding]::UTF8.GetBytes($message)
            $segment = New-Object System.ArraySegment[byte] -ArgumentList $buffer
            $sendTask = $ws.SendAsync($segment, [System.Net.WebSockets.WebSocketMessageType]::Text, $true, $cts.Token)
            
            if ($sendTask.Wait(5000)) {
                Write-Host "✅ Test message sent: $message"
            } else {
                Write-Host "❌ Failed to send test message"
            }
            
            # Try to receive a message
            $receiveBuffer = New-Object System.ArraySegment[byte] -ArgumentList (New-Object byte[] 1024)
            $receiveTask = $ws.ReceiveAsync($receiveBuffer, $cts.Token)
            
            if ($receiveTask.Wait(5000)) {
                $receivedData = $receiveBuffer.Array[0..($receiveTask.Result.Count-1)]
                $receivedMessage = [System.Text.Encoding]::UTF8.GetString($receivedData)
                Write-Host "✅ Received message: $receivedMessage"
            } else {
                Write-Host "⚠️ No message received within timeout"
            }
            
            # Close the connection
            $closeTask = $ws.CloseAsync([System.Net.WebSockets.WebSocketCloseStatus]::NormalClosure, "Test completed", $cts.Token)
            $closeTask.Wait(2000)
            Write-Host "Connection closed"
        } else {
            Write-Host "❌ WebSocket connection failed with state: $($ws.State)"
        }
    } catch {
        Write-Host "❌ Error during connection: $($_.Exception.Message)"
        Write-Host "Stack trace: $($_.Exception.StackTrace)"
    }
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)"
    Write-Host "Stack trace: $($_.Exception.StackTrace)"
} finally {
    if ($ws) {
        if ($ws.State -ne [System.Net.WebSockets.WebSocketState]::Closed) {
            $ws.Dispose()
        }
    }
    if ($cts) {
        $cts.Dispose()
    }
}

Write-Host "======================================="
Write-Host "Test completed"
