# Release Notes

## Date: 2025-12-19

## Changes

### Backend (Worker)

1. **API**: `/api/inbox/customers`
   - Updated to prioritize customer profile display_name when available
   - Display_name priority: customer_profile.display_name > index display_name > customer_id
   - Ensured consistent display_name across all customer-related fields (name, customer_name)

2. **Customer Profile**: 
   - Enhanced getCustomerProfile integration
   - Improved display_name inheritance

### Frontend (UI)

1. **WorkspaceLayout**: 
   - Added cache busting to customers API requests
   - Added verification logs: [CUSTOMERS_FETCH_URL], [CUSTOMERS_FETCH_RESP_FIRST]
   - Ensured proper array sorting with new array references
   - Added cache: "no-store" to fetch requests

2. **ChatPanel**: 
   - Fixed sender name in message bubbles
   - Implemented proper display_name calculation

3. **CrmPanel**: 
   - Ensured customer list uses display_name
   - Fixed customer info panel display

## Deployment Details

- **Script Version**: fdbd03af-8f4c-4a15-be9e-698531e1b2c6
- **Command**: `wrangler deploy`
- **Environment**: Production

## Verification

API: `https://jev-rebuild-worker.bensonlove1986.workers.dev/api/inbox/customers`

Expected response: Customers array with correct display_name fields, including "Benson Sensor" and other real customer names.