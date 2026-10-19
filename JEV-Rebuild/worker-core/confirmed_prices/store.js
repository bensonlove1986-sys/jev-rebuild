const STORAGE_KEY = 'confirmed-prices:v1';

export function createPriceStore(env) {
  const kv = (env && (env.KV || env.MESSAGES_KV)) || null;
  const memory = { rows: null };

  async function readAll() {
    if (kv) {
      const stored = await kv.get(STORAGE_KEY, 'json');
      return Array.isArray(stored) ? stored : [];
    }
    return memory.rows ? memory.rows.slice() : [];
  }

  async function writeAll(rows) {
    if (kv) {
      await kv.put(STORAGE_KEY, JSON.stringify(rows));
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
