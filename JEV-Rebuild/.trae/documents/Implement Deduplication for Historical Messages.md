1. **Add a message cache system**:
   - Create a global map to store unique messages by their message_id
   - Use message_id as the primary key for deduplication
   - Ensure the cache persists across multiple calls to __JEV_GET_MESSAGES__

2. **Modify the __JEV_GET_MESSAGES__ function**:
   - Before adding messages to the result array, check if they're already in the cache
   - Only add new messages that aren't already cached
   - Update the cache with new messages as they're extracted
   - Return the deduplicated messages sliced to the requested limit

3. **Implement cache management**:
   - Ensure the cache is properly initialized
   - Clear old cache entries if needed to prevent memory issues
   - Add logging to track cache usage and deduplication effectiveness

4. **Test the implementation**:
   - Verify that duplicate messages are properly filtered
   - Ensure message extraction still works correctly
   - Check that performance is not negatively impacted

5. **Update documentation**:
   - Add comments explaining the deduplication mechanism
   - Document how the cache works and when it's cleared

**Files to modify**: `d:/PDF转网页/JEV-Rebuild/worker-core/playwright-whatsapp-engine.js`

**Key changes**:
- Add a global MESSAGE_CACHE Map to track unique messages
- Modify __JEV_GET_MESSAGES__ to use the cache for deduplication
- Ensure cache entries include all necessary message data
- Add logging to monitor deduplication

This implementation will ensure that when historical messages are extracted, duplicate messages are filtered out, providing a clean and consistent message history.