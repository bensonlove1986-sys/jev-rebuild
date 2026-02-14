/**
 * Message Handler
 * 
 * Responsibilities:
 * - Handle WebSocket message received events
 * - Build patch for message-related state updates
 */

/**
 * Handle WebSocket message received
 * @param message The received message
 * @returns Patch object for state update
 */
export async function handleWSMessageReceived(message: any) {
  console.log("[WS_MESSAGE_RECEIVED]", message)
  // 返回 patch 而不是直接修改 store
  return {
    chat: {
      messages: (prev: any) => {
        const existingMessages = prev || []
        return [...existingMessages, message]
      }
    }
  }
}
