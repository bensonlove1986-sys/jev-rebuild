# Implement WhatsApp Unified Index

## Overview
Replace the existing message merging and historical fetching logic with a comprehensive Unified Index that directly uses Store.Chat and Store.Msg to build a complete, deduplicated index of all chats and messages.

## Implementation Steps

1. **Remove Existing Logic**
   - Remove the message merging engine injection (lines 606-677)
   - Remove the historical message fetching logic (lines 679-753)

2. **Implement Unified Index Injection**
   - Add the provided Unified Index injection code that:
     - Builds a map of all chats from Store.Chat
     - Adds all existing messages from Store.Msg
     - Listens for real-time messages via Store.Msg.on('add')
     - Emits `whatsapp:chat_init` for each chat with history
     - Emits `whatsapp:msg_realtime` for new messages

3. **Update WebSocket Service**
   - Add listeners for new event types:
     - `whatsapp:chat_init` - handles initialized chats with history
     - `whatsapp:msg_realtime` - handles real-time messages
   - Remove or update legacy event handlers as needed
   - Ensure backward compatibility

4. **Test Integration**
   - Verify the Unified Index initializes correctly
   - Ensure historical messages are loaded and deduplicated
   - Verify real-time messages are processed correctly
   - Check that all chats are properly indexed

## Key Files to Modify

1. **`d:\PDF转网页\JEV-Rebuild\worker-core\playwright-whatsapp-engine.js`**
   - Replace message merging and historical fetching logic with Unified Index injection

2. **`d:\PDF转网页\JEV-Rebuild\ui-core\app\src\services\whatsappWebSocket.service.ts`**
   - Add handlers for `whatsapp:chat_init` and `whatsapp:msg_realtime` events
   - Update message processing logic to handle the new message format

## Expected Results

- ✅ Single Source of Truth combining Store.Chat and Store.Msg
- ✅ All historical messages loaded and deduplicated
- ✅ Real-time messages properly handled
- ✅ No DOM dependencies
- ✅ Idempotent implementation
- ✅ UI can directly consume the unified index

## Event Flow

1. Engine initializes, injects Unified Index code
2. Unified Index builds chat map from Store.Chat
3. Unified Index adds all existing messages from Store.Msg
4. Unified Index emits `whatsapp:chat_init` for each chat
5. UI receives chat_init events and updates store
6. Unified Index listens for new messages
7. When new message arrives, Unified Index emits `whatsapp:msg_realtime`
8. UI receives real-time message and updates store

This approach will provide a cleaner, more comprehensive solution that directly addresses the core requirements without relying on DOM interactions.