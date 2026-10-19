/**
 * Attach the confirmed-price library to the live worker without replacing it
 * with this repo's worker-core bundle.
 *
 * Requires a Cloudflare API token that can edit Workers scripts and routes
 * on account 156ce03fffc59592e2b3b04dbc22aa6c (Bensonlove1986@gmail.com's Account).
 * Storage is the existing R2 binding MEDIA, object confirmed-prices/v1.json.
 * The live worker has no KV binding. Do not add MESSAGES_KV.
 * The connected MCP token can read this script but cannot upload it:
 * multipart/form-data, application/javascript, and text/javascript return
 * "No access to the specified resource." Other content types reach the API and
 * return 10001 Content-Type must be multipart/form-data. KV create returns
 * 10000 Authentication error. This script keeps every current binding.
 *
 *   CLOUDFLARE_API_TOKEN=... node JEV-Rebuild/confirmed-prices-live/attach.mjs
 */
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ACCOUNT = process.env.CLOUDFLARE_ACCOUNT_ID || "156ce03fffc59592e2b3b04dbc22aa6c";
const ZONE = "6c2c9a492fc671c89075108f0195087a";
const SCRIPT = "jev-rebuild-worker";
const UI_SCRIPT = "jev-confirmed-prices-ui";
const TOKEN = process.env.CLOUDFLARE_API_TOKEN || "";
const here = dirname(fileURLToPath(import.meta.url));

if (!TOKEN) {
  console.error("Missing CLOUDFLARE_API_TOKEN. Need Workers Scripts Edit and Workers Routes Edit.");
  process.exit(1);
}

async function cf(path, { method = "GET", body, form } = {}) {
  const headers = { Authorization: `Bearer ${TOKEN}` };
  let payload;
  if (form) payload = form;
  else if (body !== undefined) {
    headers["content-type"] = "application/json";
    payload = JSON.stringify(body);
  }
  const response = await fetch(`https://api.cloudflare.com/client/v4${path}`, { method, headers, body: payload });
  const text = await response.text();
  let json = null;
  try { json = JSON.parse(text); } catch { json = null; }
  if (!response.ok || (json && json.success === false)) {
    const detail = json ? JSON.stringify(json.errors || json) : text.slice(0, 400);
    throw new Error(`${method} ${path} -> ${response.status} ${detail}`);
  }
  return json ? json.result : text;
}

function extractModule(raw) {
  const start = raw.indexOf("\r\n\r\n");
  if (start < 0) throw new Error("Worker content is not a multipart module");
  let js = raw.slice(start + 4);
  const end = js.lastIndexOf("\r\n--");
  if (end > 0) js = js.slice(0, end);
  return js;
}

async function uploadVersion(scriptName, filename, source, metadata) {
  const form = new FormData();
  form.append("metadata", new Blob([JSON.stringify(metadata)], { type: "application/json" }));
  form.append(filename, new Blob([source], { type: "application/javascript+module" }), filename);
  return cf(`/accounts/${ACCOUNT}/workers/scripts/${scriptName}/versions`, { method: "POST", form });
}

async function deploy(scriptName, versionId, message) {
  return cf(`/accounts/${ACCOUNT}/workers/scripts/${scriptName}/deployments`, {
    method: "POST",
    body: {
      strategy: "percentage",
      versions: [{ version_id: versionId, percentage: 100 }],
      annotations: { "workers/message": message },
    },
  });
}

async function attachApi() {
  const deployments = await cf(`/accounts/${ACCOUNT}/workers/scripts/${SCRIPT}/deployments`);
  const current = (deployments.deployments || [])[0];
  const previous = current && current.versions && current.versions.find((item) => item.percentage > 0);
  const previousId = previous && previous.version_id;
  console.log("current deployment", current && current.id, previousId);
  const raw = await cf(`/accounts/${ACCOUNT}/workers/scripts/${SCRIPT}/content/v2`);
  let js = extractModule(raw);
  const marker = "const pathname = url.pathname;\n  let response;\n  if (pathname === ROUTES.AUTH_LOGIN)";
  const router = "async function router(request, env, ctx) {";
  if (!js.includes("handleConfirmedPricesRoute")) {
    if (js.split(marker).length !== 2 || js.split(router).length !== 2) {
      throw new Error("Live router marker not found. Refusing to upload.");
    }
    if (!js.includes("ChatRoomDO") || !js.includes("function requireAuthSession")) {
      throw new Error("Live worker is missing expected helpers. Refusing to upload.");
    }
    const handler = await readFile(join(here, "../worker-core/confirmed_prices/live-attach.js"), "utf8");
    const call = "const pathname = url.pathname;\n  if (pathname === \"/api/confirmed-prices\" || pathname.startsWith(\"/api/confirmed-prices/\")) {\n    return addCorsHeaders(await handleConfirmedPricesRoute(request, env));\n  }\n  let response;\n  if (pathname === ROUTES.AUTH_LOGIN)";
    js = js.replace(router, `${handler.trim()}\n${router}`).replace(marker, call);
    const metadata = {
      main_module: "index.js",
      compatibility_date: "2024-01-01",
      compatibility_flags: [],
      keep_bindings: ["secret_text", "plain_text", "durable_object_namespace", "r2_bucket", "kv_namespace"],
      annotations: {
        "workers/message": "Isolated attach /api/confirmed-prices. Empty R2 confirmed-prices/v1.json. No sample rows.",
        "workers/tag": "confirmed-prices-attach",
      },
    };
    const uploaded = await uploadVersion(SCRIPT, "index.js", js, metadata);
    const versionId = uploaded.id || uploaded.version_id;
    console.log("uploaded version", versionId);
    await deploy(SCRIPT, versionId, `Promote isolated /api/confirmed-prices. Rollback version ${previousId}.`);
  } else {
    console.log("confirmed-prices route already present");
  }
  const products = await fetch("https://jv-automation.com/api/products").then((res) => res.json());
  const prices = await fetch("https://jv-automation.com/api/confirmed-prices");
  const pricesBody = await prices.json();
  console.log("products", products);
  console.log("confirmed-prices", prices.status, pricesBody);
  if (products.version !== "3.2" || products.error !== "Unauthorized") {
    if (previousId) {
      console.error("products API changed; rolling back", previousId);
      await deploy(SCRIPT, previousId, "Rollback confirmed-prices attach; products API changed.");
    }
    throw new Error("products API did not stay on version 3.2");
  }
  if (prices.status !== 401) throw new Error(`expected 401 from /api/confirmed-prices, got ${prices.status}`);
  const page = await fetch("https://jv-automation.com/api/confirmed-prices/ui");
  const html = await page.text();
  console.log("page", page.status, html.includes("确认价价库"), html.includes("SAMPLE"));
  if (page.status !== 200 || !html.includes("确认价价库") || html.includes("SAMPLE")) {
    throw new Error("price library page missing or still showing SAMPLE");
  }
}

async function attachUi() {
  const source = await readFile(join(here, "ui-worker.js"), "utf8");
  const uploaded = await uploadVersion(UI_SCRIPT, "index.js", source, {
    main_module: "index.js",
    compatibility_date: "2024-01-01",
    compatibility_flags: [],
    annotations: { "workers/message": "Confirmed price library page and /tools nav entry. No sample data." },
  });
  const versionId = uploaded.id || uploaded.version_id;
  await deploy(UI_SCRIPT, versionId, "Serve /tools/price-library and inject 确认价价库 on /tools.");
  const patterns = ["jv-automation.com/tools", "jv-automation.com/tools/", "jv-automation.com/tools/price-library*"];
  const existing = await cf(`/zones/${ZONE}/workers/routes`);
  for (const pattern of patterns) {
    if ((existing || []).some((route) => route.pattern === pattern)) continue;
    await cf(`/zones/${ZONE}/workers/routes`, { method: "POST", body: { pattern, script: UI_SCRIPT } });
    console.log("route", pattern);
  }
  const tools = await fetch("https://jv-automation.com/tools");
  const html = await tools.text();
  const page = await fetch("https://jv-automation.com/tools/price-library/");
  console.log("tools", tools.status, tools.headers.get("x-jev-price-library"), html.includes("main-20261019"));
  console.log("page", page.status, page.headers.get("x-jev-price-library"));
  if (!html.includes("main-20261019") || !html.includes("确认价价库")) {
    const routes = await cf(`/zones/${ZONE}/workers/routes`);
    for (const route of routes || []) {
      if (route.script === UI_SCRIPT && route.pattern === "jv-automation.com/tools") {
        await cf(`/zones/${ZONE}/workers/routes/${route.id}`, { method: "DELETE" });
        console.error("removed /tools route because the workbench HTML was not preserved");
      }
    }
    throw new Error("/tools HTML check failed");
  }
}

await attachApi();
await attachUi();
console.log("done");
