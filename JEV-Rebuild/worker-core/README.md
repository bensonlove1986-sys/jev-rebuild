# JEV Worker Core

Cloudflare Worker for JEV (Joint Enterprise Venture) project.

## Required Environment Variables

These variables must be set in Cloudflare Worker Settings → Variables:

- `PIT_JWT` - JWT token for PIT API authentication
- `PIT_BASE_URL` - Base URL for PIT API (e.g., `https://services.leadconnectorhq.com`)
- `DAIJIE_LOCATION_ID` - Location ID for Daojie integration

## API Routes

### POST /api/daojie/pit/reply

Send WhatsApp messages via PIT API.

**Request Body:**
```json
{
  "contactId": "string",
  "locationId": "string",
  "message": "string",
  "useTemplate": false,
  "messageType": "template",
  "template": {
    "name": "string",
    "language": "string",
    "components": []
  }
}
```

**Response:**
```json
{
  "ok": true,
  "messageId": "string",
  "conversationId": "string",
  "type": "WhatsApp",
  "channel": "whatsapp",
  "contactId": "string",
  "message": "string",
  "createdAt": 1234567890
}
```

**Error Responses:**
```json
{
  "ok": false,
  "error": "ENV_MISSING",
  "missing": ["PIT_JWT"]
}
```

## Deployment

```bash
npm run deploy
```

## Logging

Important log events:

- `[ENV_MISSING]` - Missing required environment variables
- `[PIT_UI_PAYLOAD]` - UI payload received
- `[PIT_FETCH_START]` - PIT API fetch started
- `[PIT_OUTBOUND_HTTP_STATUS]` - PIT API response status
- `[PIT_OUTBOUND_RESPONSE_BODY]` - PIT API response body
