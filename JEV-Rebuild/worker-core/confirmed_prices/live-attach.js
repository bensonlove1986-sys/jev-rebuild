/**
 * Inserted into the live jev-rebuild-worker module.
 * Uses the existing session, commercial-read, and procurement-write helpers.
 * Stores rows in R2 key confirmed-prices/v1.json. Never seeds SAMPLE rows.
 */
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
