# JEV Daojie Message System - Freeze Report

## 📍 Version Status

**Status:** Frozen & Production Ready

**Baseline:** Verified stable version with successful message delivery to official Daojie UI

**Declaration:**
> 本版本为"可商业使用稳定版本"，允许部署与复制

## 🔗 Sending Chain Diagram

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────────────────────┐
│                 │     │                 │     │                                 │
│     UI Layer    │     │   Worker Core   │     │   Daojie Official API          │
│                 │     │                 │     │                                 │
└─────────────────┘     └─────────────────┘     └─────────────────────────────────┘
        │                         │                                 │
        │  POST /api/daojie/conversations/messages                  │
        │  Body: { contactId, message }                             │
        ├───────────────────────────────────────────────────────────┤
        │                          │                                │
        │                          │  1. Validate contactId/message │
        │                          │  2. Check forbidden fields     │
        │                          │  3. Inject PIT_JWT            │
        │                          │  4. Build standard payload     │
        │                          ├────────────────────────────────┤
        │                          │                                │
        │                          │  POST /conversations/messages  │
        │                          │  Headers: Authorization Bearer │
        │                          │  Body: { locationId, contactId, type, message, channel, MessageType, whatsapp } │
        │                          ├────────────────────────────────┤
        │                          │                                │
        │                          │  200/201 + { traceId, messageId, conversationId } │
        │                          │                                │
        ├──────────────────────────┼────────────────────────────────┤
        │                          │                                │
        │  200/201 + { traceId, messageId, conversationId }        │
        │                          │                                │
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────────────────────┐
│                 │     │                 │     │                                 │
│     UI Layer    │     │   Worker Core   │     │   Daojie Official API          │
│                 │     │                 │     │                                 │
└─────────────────┘     └─────────────────┘     └─────────────────────────────────┘
```

## 📋 Responsibility Boundaries

### 1. UI Layer

**Allowed Actions:**
- Send messages using selectedCustomer.id as contactId
- Send minimal payload: { contactId, message }
- Display message status (sending/sent/failed)
- Show conversation history

**Forbidden Actions:**
- ❌ Send conversationId
- ❌ Send locationId
- ❌ Send Authorization header
- ❌ Use test-xxx contactId
- ❌ Modify message structure

### 2. Worker Core

**Core Responsibilities:**
- Validate UI payload: contactId & message required
- Check forbidden fields (conversationId, locationId, authorization)
- Inject PIT_JWT from environment variables
- Build standard Daojie API payload
- Forward requests to Daojie Official API
- Return original status & body from external API
- Maintain CORS headers
- Log essential information (traceId, contactId, status)

**Security Measures:**
- Reject forbidden fields with 400: { error: "forbidden_field_detected" }
- No JWT exposure in logs
- Limited response body logging (only traceId)

### 3. External API

**Daojie Official API:**
- Endpoint: https://services.leadconnectorhq.com/conversations/messages
- Authentication: Bearer <PIT_JWT>
- Required Headers: Content-Type + Version 2021-07-28
- Response: 200/201 with conversationId, messageId, traceId

## ✅ Resolved Issues

| Issue Type | Original Error | Root Cause | Solution |
|------------|----------------|------------|----------|
| 🔒 Authentication | 401 Invalid JWT | UI not sending JWT, Worker using invalid key | Worker injects PIT_JWT from env variables |
| 📇 Data Validation | 400 Contact not found | UI using test contactId, missing real customer data | UI uses selectedCustomer.id as real contactId |
| 🔧 Payload Structure | 500 Internal Server Error | Invalid payload format | Strictly follow Daojie UI successful payload structure |
| 🛡️ Security | Authorization header exposure | UI sending JWT directly | Worker handles JWT internally, UI prohibited from sending |
| 🔍 Debugging | Excessive logging | Full JWT & response body in logs | Log downgrade: only traceId, contactId, status |
| 📋 Route Management | Uncontrolled routes | Multiple unused routes | Frozen route whitelist, only allowed routes permitted |

## 📄 API Whitelist (Frozen)

Generated file: `api_whitelist_frozen.json`

**Allowed Routes:**

| Method | Path | Description |
|--------|------|-------------|
| POST | /api/daojie/conversations/messages | Send WhatsApp messages to customers |
| GET | /api/status | System status check |
| GET | /ws/daojie | WebSocket connection for real-time updates |
| POST | /api/inbound/daojie | Receive inbound messages from Daojie |
| POST | /api/translate | Basic translation service |
| POST | /api/translate/business | Business translation with reply drafts |

**Forbidden Actions:**
- ❌ Add new routes
- ❌ Restore removed routes
- ❌ Rename existing routes
- ❌ Change route methods

## 🎯 Core Behaviors (Frozen)

### 1. Worker Behavior

**Accepts UI Payload:**
```json
{
  "contactId": "string",
  "message": "string"
}
```

**Forbidden Fields:**
- conversationId
- locationId
- authorization

**Internal Injection:**
- locationId: Worker fixed value
- Authorization: Bearer <PIT_JWT> from env
- No conversationId in external request

### 2. UI Behavior

**Sends Only:**
- contactId = selectedCustomer.id (real customer ID)
- message = input content

**No Transmission Of:**
- JWT tokens
- conversationId
- locationId

## 🔐 Security Hardening

**Worker Security Features:**

1. **Forbidden Field Detection:**
   - Rejects payloads containing conversationId, locationId, or authorization
   - Returns 400: `{ "error": "forbidden_field_detected" }`

2. **JWT Protection:**
   - No JWT exposure in logs
   - JWT only stored in environment variables
   - No UI access to JWT

3. **Input Validation:**
   - contactId required
   - message required
   - Strict payload structure

## 📊 Logging Policy

**Retained Logs:**
- traceId
- contactId
- HTTP status codes
- Request/response timing

**Removed/Downgraded Logs:**
- ❌ JWT plaintext
- ❌ Complete external API response body
- ❌ Sensitive authentication details

## 🧪 Verification Results

**Manual Testing:**
- ✅ UI sends message successfully
- ✅ Message appears in official Daojie UI
- ✅ Returns 200/201 status
- ✅ No 401/400/500 errors
- ✅ Same contactId can send multiple messages

**Automated Testing:**
- ✅ Route whitelist verification passed
- ✅ Security hardening verification passed
- ✅ Log downgrade verification passed

## 🚀 Deployment Checklist

1. **Environment Variables:**
   - ✅ PIT_JWT configured
   - ✅ DAIJIE_LOCATION_ID optional (defaults to: 3SsfTbU1lmAPpkG9iB6C)

2. **Route Configuration:**
   - ✅ Only allowed routes exposed
   - ✅ CORS headers configured
   - ✅ OPTIONS requests handled

3. **Security Settings:**
   - ✅ Forbidden fields protection enabled
   - ✅ JWT injection secured
   - ✅ Logs properly restricted

4. **Monitoring:**
   - ✅ Essential logs retained
   - ✅ Traceability via traceId
   - ✅ ContactId logged for debugging

## 📌 Conclusion

This version of the JEV Daojie Message System has been thoroughly verified, secured, and frozen. It meets all production requirements and has successfully delivered messages to the official Daojie UI. The system follows strict security protocols, maintains minimal exposure, and provides reliable message delivery functionality.

**Freeze Date:** 2025-12-16

**Version:** Stable v1.0

**Approved for Production Deployment:** ✅