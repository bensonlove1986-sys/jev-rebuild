// LeadConnector API Client for Cloudflare Workers
export async function callLeadConnector({
  path,
  method = "GET",
  body,
  env,
}) {
  const url = `${env.LEADCONNECTOR_API_BASE}${path}`;

  const headers = {
    "Authorization": `Bearer ${env.LEADCONNECTOR_PRIVATE_TOKEN}`,
    "Accept": "application/json",
    "Content-Type": "application/json",
    "Version": env.LEADCONNECTOR_API_VERSION,
  };

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }

  return {
    ok: res.ok,
    status: res.status,
    data,
  };
}