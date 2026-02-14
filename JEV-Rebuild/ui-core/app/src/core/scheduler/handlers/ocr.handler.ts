/**
 * OCR Handler
 * 
 * Responsibilities:
 * - Handle OCR result received events
 * - Build patch for OCR-related state updates
 */

/**
 * Handle OCR result received
 * @param result The received OCR result
 * @returns Patch object for state update
 */
export async function handleOCRResultReceived(result: any) {
  console.log("[OCR_RESULT_RECEIVED]", result)
  // 返回 patch 而不是直接修改 store
  return {
    chat: {
      ocrResults: (prev: any) => {
        const existingResults = prev || []
        return [...existingResults, result]
      }
    }
  }
}
