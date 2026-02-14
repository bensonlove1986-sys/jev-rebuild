/**
 * Presence Handler
 * 
 * Responsibilities:
 * - Handle presence updated events
 * - Build patch for presence-related state updates
 */

/**
 * Handle presence updated
 * @param presence The presence data
 * @returns Patch object for state update
 */
export async function handlePresenceUpdated(presence: any) {
  console.log("[PRESENCE_UPDATED]", presence)
  // 返回 patch 而不是直接修改 store
  return {
    chat: {
      presence
    }
  }
}
