const STORAGE_KEY = 'confirmed-prices/v1.json';

function rowsFromStored(stored) {
  if (Array.isArray(stored)) return stored;
  if (stored && Array.isArray(stored.rows)) return stored.rows;
  return [];
}

export function createPriceStore(env) {
  const media = env && env.MEDIA && typeof env.MEDIA.get === 'function' ? env.MEDIA : null;
  const kv = (env && (env.KV || env.MESSAGES_KV)) || null;
  const memory = { rows: null };

  async function readAll() {
    if (media) {
      const object = await media.get(STORAGE_KEY);
      if (!object) return [];
      const text = await object.text();
      if (!text || !String(text).trim()) return [];
      return rowsFromStored(JSON.parse(text));
    }
    if (kv) {
      const stored = await kv.get(STORAGE_KEY, 'json');
      return rowsFromStored(stored);
    }
    return memory.rows ? memory.rows.slice() : [];
  }

  async function writeAll(rows) {
    const payload = JSON.stringify({ schemaVersion: 1, rows });
    if (media) {
      await media.put(STORAGE_KEY, payload);
      return;
    }
    if (kv) {
      await kv.put(STORAGE_KEY, payload);
      return;
    }
    memory.rows = rows.slice();
  }

  return {
    async list() {
      return readAll();
    },
    async save(rows) {
      await writeAll(rows);
    },
  };
}

export { STORAGE_KEY };
