// Send WhatsApp message using LeadConnector Private Integration
// This file is not currently in use and will be removed if not needed
// import { callLeadConnector } from "../utils/leadconnector_client";
// import { ok, fail } from '../utils/response.js';

// export async function handleLeadConnectorSend(request, env) {
//   const payload = await request.json();

//   const {
//     locationId,
//     contactId,
//     message,
//   } = payload;

//   if (!locationId || !contactId || !message) {
//     return fail(request, "MISSING_PARAMS", 400);
//   }

//   const result = await callLeadConnector({
//     env,
//     path: "/conversations/messages",
//     method: "POST",
//     body: {
//       locationId,
//       contactId,
//       type: "WhatsApp",
//       channel: "whatsapp",
//       message,
//       messageType: 1 // 普通文本消息
//     },
//   });

//   if (result.ok) {
//     return ok(request, result.data || {}, {}, result.status);
//   } else {
//     return fail(request, result.error || "UNKNOWN_ERROR", result.status, result.data || {});
//   }
// }