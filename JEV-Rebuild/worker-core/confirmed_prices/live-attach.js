/**
 * Inserted into the live jev-rebuild-worker module.
 * Uses the existing session, commercial-read, and procurement-write helpers.
 * Stores rows in R2 key confirmed-prices/v1.json. Never seeds SAMPLE rows.
 */
const PAGE_HTML = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex, nofollow" />
<title>确认价价库 · JVTOOLS</title>
<style>
  body { margin: 0; font-family: "PingFang SC", "Microsoft YaHei", sans-serif; background: #f3f5f7; color: #1c2430; }
  header { background: #10243a; color: #fff; padding: 16px 20px; }
  header a { color: #b7d7c4; text-decoration: none; font-size: 13px; }
  h1 { margin: 6px 0 0; font-size: 22px; }
  .sub { margin: 4px 0 0; color: #c5d0dc; font-size: 13px; }
  main { max-width: 1180px; margin: 0 auto; padding: 16px; }
  .safety { background: #e8f6ee; color: #146b38; border: 1px solid #b7e0c6; border-radius: 10px; padding: 10px 12px; font-size: 13px; }
  .bar { display: flex; gap: 8px; margin: 12px 0; }
  input, select, button { font: inherit; }
  input[type="search"], input, select { border: 1px solid #d5dbe3; border-radius: 8px; padding: 8px 10px; background: #fff; }
  input[type="search"] { flex: 1; }
  button { border: 0; border-radius: 8px; padding: 8px 14px; background: #1c8c45; color: #fff; cursor: pointer; }
  button.ghost { background: #e8edf2; color: #243140; }
  button.copy { background: #1a6fbf; }
  table { width: 100%; border-collapse: collapse; background: #fff; }
  th, td { text-align: left; padding: 10px 8px; border-bottom: 1px solid #eef1f4; font-size: 13px; }
  th { background: #f7f9fb; color: #526173; }
  .price { color: #1a6fbf; font-weight: 700; }
  .tag { border-radius: 999px; padding: 2px 8px; font-size: 12px; }
  .tag.confirmed { background: #e5f6ec; color: #157a3d; }
  .tag.pending_list { background: #fff4e2; color: #e09212; }
  .empty, .login, .writer, .error { background: #fff; border-radius: 12px; padding: 16px; margin-top: 12px; }
  .empty { text-align: center; }
  .empty .en, .meta, footer { color: #66788a; font-size: 13px; }
  .grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
  label { display: flex; flex-direction: column; gap: 4px; font-size: 12px; color: #526173; }
  @media (max-width: 860px) { table { display: none; } .grid { grid-template-columns: 1fr; } }
</style>
</head>
<body>
<header>
  <a href="/tools">← 返回 JVTOOLS</a>
  <h1>确认价价库</h1>
  <p class="sub">按型号查看未税确认价与待确认挂牌 · 业务只读</p>
</header>
<main>
  <div class="safety">WhatsApp 一键：只带 型号 + 可报未税价 · 不带店铺进货链 / 成本</div>
  <div id="app"></div>
  <footer>底注：成本价不在此页显示；写入仅「报价资料汇总」可改 · 业务只读</footer>
</main>
<script>
const EMPTY_CN = "还没有该型号的确认价。请走询价流程，确认后由汇总入库。";
const EMPTY_EN = "No confirmed price for this model yet. Send it through inquiry; pricing team will add it after confirmation.";
const CHANNEL = { taobao: "淘宝", "1688": "1688", official_agent: "官网代理", other: "其他" };
const STATUS = { confirmed: "已确认", pending_list: "挂牌待确认" };
function token() {
  try {
    const raw = localStorage.getItem("jev-auth-store-v3");
    const data = raw ? JSON.parse(raw) : null;
    return (data && data.state && data.state.sessionToken) || "";
  } catch (e) { return ""; }
}
function money(row) {
  const n = Number(row.exTaxUnitPrice);
  return (Number.isFinite(n) ? n.toFixed(2) : "") + " " + (row.currency || "CNY");
}
async function api(path, options) {
  const headers = Object.assign({ Authorization: "Bearer " + token() }, (options && options.headers) || {});
  const res = await fetch(path, Object.assign({}, options || {}, { headers: headers }));
  const body = await res.json().catch(function () { return { ok: false, error: "Bad response" }; });
  body.status = res.status;
  return body;
}
const app = document.getElementById("app");
let rows = [];
let canWrite = false;
let query = "";
let notice = "";
let formOpen = false;
function renderLogin() {
  app.innerHTML = '<section class="login"><h2>请先登录 JVTOOLS</h2><p>确认价价库只对已登录的内部业务账号开放。</p><p><a href="/tools">打开 /tools 登录</a></p></section>';
}
function actions(row) {
  return '<button class="wa" data-act="wa" data-id="' + row.id + '">→ WhatsApp</button> <button class="copy" data-act="copy" data-id="' + row.id + '">复制型号+价</button>';
}
function render() {
  const filtered = rows.filter(function (row) { return !query || String(row.model || "").toLowerCase().indexOf(query.toLowerCase()) >= 0; });
  let html = '<div class="bar"><input id="q" type="search" placeholder="输入型号，如 E3Z-D61" value="' + query.replace(/"/g, "&quot;") + '" /><button id="search" type="button">查询 Search</button></div>';
  html += '<div class="meta">' + (canWrite ? "报价资料汇总 · 可写入" : "业务员 · 只读 · Sales · View only") + '</div>';
  if (!filtered.length) html += '<div class="empty"><p>' + EMPTY_CN + '</p><p class="en">' + EMPTY_EN + '</p></div>';
  else {
    html += '<table><thead><tr><th>型号</th><th>状态</th><th>未税单价</th><th>渠道</th><th>店名/代理</th><th>链接</th><th>确认日期</th><th>询价人</th><th>订单号</th><th>操作</th></tr></thead><tbody>';
    filtered.forEach(function (row) {
      html += '<tr><td>' + row.model + '</td><td><span class="tag ' + row.status + '">' + (STATUS[row.status] || row.status) + '</span></td><td class="price">' + money(row) + '</td><td>' + (CHANNEL[row.channel] || row.channel) + '</td><td>' + (row.shopOrAgentName || "") + '</td><td>' + (row.shopOrProductLink || "") + '</td><td>' + (row.confirmedDate || "") + '</td><td>' + (row.inquiredBy || "") + '</td><td>' + (row.orderRef || "—") + '</td><td>' + actions(row) + '</td></tr>';
    });
    html += '</tbody></table>';
  }
  if (!canWrite) html += '<p class="meta">你只有查看权限；改价请联系报价资料汇总。 View only. Ask pricing team to edit.</p>';
  if (canWrite) {
    html += '<section class="writer"><h3>汇总入库</h3>';
    if (!formOpen) html += '<button id="add" type="button">新增确认价</button>';
    else html += '<div class="grid"><label>型号<input id="f-model" /></label><label>状态<select id="f-status"><option value="confirmed">已确认</option><option value="pending_list">挂牌待确认</option></select></label><label>未税单价<input id="f-price" /></label><label>币种<input id="f-currency" value="CNY" /></label><label>渠道<select id="f-channel"><option value="taobao">淘宝</option><option value="1688">1688</option><option value="official_agent">官网代理</option><option value="other">其他</option></select></label><label>店名/代理<input id="f-shop" /></label><label>链接或电话/邮箱<input id="f-link" /></label><label>确认日期<input id="f-date" placeholder="YYYY-MM-DD" /></label><label>询价人<input id="f-by" /></label><label>订单号<input id="f-order" /></label></div><p><button id="save" type="button">保存</button> <button id="cancel" class="ghost" type="button">取消</button></p>';
    html += '</section>';
  }
  if (notice) html += '<div class="error">' + notice + '</div>';
  app.innerHTML = html;
  document.getElementById("search").onclick = function () { query = document.getElementById("q").value.trim(); notice = ""; load(); };
  app.querySelectorAll("button[data-act]").forEach(function (btn) {
    btn.onclick = function () { act(btn.getAttribute("data-act"), btn.getAttribute("data-id")); };
  });
  const add = document.getElementById("add");
  if (add) add.onclick = function () { formOpen = true; notice = ""; render(); };
  const cancel = document.getElementById("cancel");
  if (cancel) cancel.onclick = function () { formOpen = false; render(); };
  const save = document.getElementById("save");
  if (save) save.onclick = saveRow;
}
async function act(kind, id) {
  const row = rows.find(function (item) { return item.id === id; });
  const share = row && row.share;
  if (!share || !share.quotable || !share.customerText || !share.copyText) {
    notice = (share && share.pendingNotice) || "挂牌待确认，勿直接报给客户。";
    render();
    return;
  }
  if (kind === "copy") {
    try { await navigator.clipboard.writeText(share.copyText); notice = "已复制：" + share.copyText; }
    catch (e) { notice = share.copyText; }
    render();
    return;
  }
  window.open(share.whatsappUrl, "_blank", "noopener");
}
async function saveRow() {
  const body = {
    model: document.getElementById("f-model").value,
    status: document.getElementById("f-status").value,
    exTaxUnitPrice: document.getElementById("f-price").value,
    currency: document.getElementById("f-currency").value || "CNY",
    channel: document.getElementById("f-channel").value,
    shopOrAgentName: document.getElementById("f-shop").value,
    shopOrProductLink: document.getElementById("f-link").value,
    confirmedDate: document.getElementById("f-date").value,
    inquiredBy: document.getElementById("f-by").value,
    orderRef: document.getElementById("f-order").value
  };
  const result = await api("/api/confirmed-prices", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!result.ok) { notice = result.error || "保存失败"; render(); return; }
  formOpen = false;
  notice = "已入库";
  await load();
}
async function load() {
  const result = await api("/api/confirmed-prices" + (query ? ("?model=" + encodeURIComponent(query)) : ""));
  if (result.status === 401) { renderLogin(); return; }
  if (!result.ok) { notice = result.error || "价库暂时不可用"; rows = []; canWrite = false; render(); return; }
  rows = result.rows || [];
  canWrite = !!result.canWrite;
  notice = "";
  render();
}
if (!token()) renderLogin();
else load();
</script>
</body>
</html>`;

async function handleConfirmedPricesRoute(request, env) {
  const KEY = "confirmed-prices/v1.json";
  const blocked = ["costPrice", "cost", "costCurrency", "margin", "profit", "supplierCost", "bestSupplierQuote", "procurementNote", "procurementPriceMemory", "defaultMarginRate", "minimumSellPrice"];
  const statuses = { confirmed: 1, pending_list: 1 };
  const channels = { taobao: 1, "1688": 1, official_agent: 1, other: 1 };

  function clean(value, max) {
    if (value == null) return "";
    return String(value).replace(/\s+/g, " ").trim().slice(0, max);
  }
  function line(value, max) {
    return String(value == null ? "" : value).replace(/[\r\n\t]+/g, " ").trim().slice(0, max);
  }
  function json(body, status) {
    return new Response(JSON.stringify(body), {
      status: status || 200,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "no-store",
        "x-robots-tag": "noindex, nofollow"
      }
    });
  }
  function share(row) {
    const model = line(row && row.model, 80);
    const n = Number(row && row.exTaxUnitPrice);
    const amount = Number.isFinite(n) ? n.toFixed(2) : "";
    const currency = line((row && row.currency) || "CNY", 8).toUpperCase() || "CNY";
    const quotable = !!(row && row.status === "confirmed" && model && amount);
    const customerText = quotable ? ("Need " + model + "? Ex-tax from " + amount + " " + currency + ". Qty + nameplate → quote.") : null;
    const copyText = quotable ? (model + " 未税 " + amount + " " + currency) : null;
    return {
      quotable: quotable,
      customerText: customerText,
      copyText: copyText,
      whatsappUrl: customerText ? ("https://wa.me/?text=" + encodeURIComponent(customerText)) : null,
      pendingNotice: quotable ? null : "挂牌待确认，勿直接报给客户。"
    };
  }
  function publicRow(row) {
    return {
      id: row.id,
      model: row.model,
      status: row.status,
      exTaxUnitPrice: row.exTaxUnitPrice,
      currency: row.currency,
      channel: row.channel,
      shopOrAgentName: row.shopOrAgentName,
      shopOrProductLink: row.shopOrProductLink,
      confirmedDate: row.confirmedDate,
      inquiredBy: row.inquiredBy,
      orderRef: row.orderRef || "",
      leadTime: row.leadTime || "",
      qtyNote: row.qtyNote || "",
      notes: row.notes || "",
      productImagePath: row.productImagePath || "",
      updatedBy: row.updatedBy || "",
      updatedAt: row.updatedAt || "",
      createdBy: row.createdBy || "",
      createdAt: row.createdAt || "",
      sample: false,
      share: share(row)
    };
  }
  function actor(user) {
    return clean(user.username || user.userId || "unknown", 80);
  }
  function canWrite(user) {
    if (canUserUseProcurementData(user)) return true;
    const role = clean(user.role, 64).toLowerCase();
    return role === "pricing_summary" || role === "pricing-summary" || role === "price_writer" || role === "quotation_summary";
  }
  function normalize(input) {
    const errors = [];
    const source = input && typeof input === "object" ? input : {};
    const out = {};
    out.model = clean(source.model, 80);
    if (!out.model) errors.push("model is required");
    out.status = clean(source.status, 32);
    if (!statuses[out.status]) errors.push("status must be confirmed or pending_list");
    const price = Number(source.exTaxUnitPrice);
    if (!Number.isFinite(price) || price < 0) errors.push("exTaxUnitPrice must be a number >= 0");
    else out.exTaxUnitPrice = Math.round(price * 100) / 100;
    out.currency = clean(source.currency || "CNY", 8).toUpperCase() || "CNY";
    if (!/^[A-Z]{3}$/.test(out.currency)) errors.push("currency must be a 3-letter code");
    out.channel = clean(source.channel, 32);
    if (!channels[out.channel]) errors.push("channel must be taobao, 1688, official_agent, or other");
    out.shopOrAgentName = clean(source.shopOrAgentName, 120);
    if (!out.shopOrAgentName) errors.push("shopOrAgentName is required");
    out.shopOrProductLink = clean(source.shopOrProductLink, 300);
    if (!out.shopOrProductLink) errors.push("shopOrProductLink is required");
    out.confirmedDate = clean(source.confirmedDate, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(out.confirmedDate)) errors.push("confirmedDate must be YYYY-MM-DD");
    out.inquiredBy = clean(source.inquiredBy, 80);
    if (!out.inquiredBy) errors.push("inquiredBy is required");
    out.orderRef = clean(source.orderRef, 40);
    out.leadTime = clean(source.leadTime, 80);
    out.qtyNote = clean(source.qtyNote, 120);
    out.notes = clean(source.notes, 500);
    out.productImagePath = clean(source.productImagePath, 300);
    return { errors: errors, value: out };
  }

  try {
    const url = new URL(request.url);
    let path = url.pathname;
    if (path.length > 1 && path.endsWith("/")) path = path.slice(0, -1);
    if ((path === "/api/confirmed-prices/ui" || path === "/tools/price-library") && request.method === "GET") {
      return new Response(PAGE_HTML, {
        status: 200,
        headers: {
          "content-type": "text/html; charset=utf-8",
          "cache-control": "no-store",
          "x-robots-tag": "noindex, nofollow"
        }
      });
    }
    let kind = "";
    let id = "";
    if (path === "/api/confirmed-prices") kind = "collection";
    else if (path === "/api/confirmed-prices/me") kind = "me";
    else if (path.startsWith("/api/confirmed-prices/")) {
      kind = "item";
      id = decodeURIComponent(path.slice("/api/confirmed-prices/".length));
    } else return json({ ok: false, error: "Not Found" }, 404);

    const session = await requireAuthSession(request, env);
    const user = session && session.user ? session.user : null;
    if (!user) return json({ ok: false, error: "Unauthorized" }, 401);
    const write = canWrite(user);
    const read = write || canUserViewInternalCommercials(user);
    if (!read) return json({ ok: false, error: "Forbidden" }, 403);

    if (kind === "me" && request.method === "GET") {
      return json({ ok: true, canWrite: write, role: user.role || "", platformRole: user.platformRole || "", userId: user.userId || "", sample: false });
    }

    const stored = await readJsonObject(env, KEY);
    const rows = !stored ? [] : Array.isArray(stored) ? stored.slice() : (Array.isArray(stored.rows) ? stored.rows.slice() : []);

    if (kind === "collection" && request.method === "GET") {
      const query = (url.searchParams.get("model") || url.searchParams.get("q") || "").trim().toLowerCase();
      const filtered = query ? rows.filter((row) => String(row.model || "").toLowerCase().includes(query)) : rows;
      return json({ ok: true, canWrite: write, count: filtered.length, rows: filtered.map(publicRow), sample: false });
    }

    if (kind === "collection" && request.method === "POST") {
      if (!write) return json({ ok: false, error: "Forbidden" }, 403);
      const body = await request.json().catch(() => null);
      if (!body || typeof body !== "object" || Array.isArray(body)) return json({ ok: false, error: "Invalid JSON" }, 400);
      for (let i = 0; i < blocked.length; i++) {
        if (Object.prototype.hasOwnProperty.call(body, blocked[i])) {
          return json({ ok: false, error: "Field " + blocked[i] + " is not part of the confirmed price library" }, 400);
        }
      }
      const parsed = normalize(body);
      if (parsed.errors.length) return json({ ok: false, error: parsed.errors.join("; ") }, 400);
      const now = new Date().toISOString();
      const name = actor(user);
      const row = Object.assign({ id: "cp_" + crypto.randomUUID(), createdBy: name, createdAt: now, updatedBy: name, updatedAt: now }, parsed.value);
      rows.unshift(row);
      await writeJsonObject(env, KEY, { schemaVersion: 1, rows: rows });
      return json({ ok: true, canWrite: true, row: publicRow(row) }, 201);
    }

    if (kind === "item" && request.method === "GET") {
      const row = rows.find((item) => item.id === id);
      if (!row) return json({ ok: false, error: "Not Found" }, 404);
      return json({ ok: true, canWrite: write, row: publicRow(row) });
    }

    if (kind === "item" && (request.method === "PATCH" || request.method === "PUT")) {
      if (!write) return json({ ok: false, error: "Forbidden" }, 403);
      const index = rows.findIndex((item) => item.id === id);
      if (index < 0) return json({ ok: false, error: "Not Found" }, 404);
      const body = await request.json().catch(() => null);
      if (!body || typeof body !== "object" || Array.isArray(body)) return json({ ok: false, error: "Invalid JSON" }, 400);
      for (let i = 0; i < blocked.length; i++) {
        if (Object.prototype.hasOwnProperty.call(body, blocked[i])) {
          return json({ ok: false, error: "Field " + blocked[i] + " is not part of the confirmed price library" }, 400);
        }
      }
      const parsed = normalize(Object.assign({}, rows[index], body));
      if (parsed.errors.length) return json({ ok: false, error: parsed.errors.join("; ") }, 400);
      const row = Object.assign({}, rows[index], parsed.value, { updatedBy: actor(user), updatedAt: new Date().toISOString() });
      rows[index] = row;
      await writeJsonObject(env, KEY, { schemaVersion: 1, rows: rows });
      return json({ ok: true, canWrite: true, row: publicRow(row) });
    }

    if (kind === "item" && request.method === "DELETE") {
      if (!write) return json({ ok: false, error: "Forbidden" }, 403);
      const index = rows.findIndex((item) => item.id === id);
      if (index < 0) return json({ ok: false, error: "Not Found" }, 404);
      const removed = rows.splice(index, 1)[0];
      await writeJsonObject(env, KEY, { schemaVersion: 1, rows: rows });
      return json({ ok: true, deletedId: removed.id });
    }

    return json({ ok: false, error: "Method Not Allowed" }, 405);
  } catch (err) {
    return json({ ok: false, error: "Confirmed price library failed" }, 500);
  }
}
