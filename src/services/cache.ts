import Database from 'better-sqlite3';
import path from 'path';

const db = new Database(path.join(process.cwd(), 'cache.db'));

db.exec(`CREATE TABLE IF NOT EXISTS breslov_cache (
  textId TEXT PRIMARY KEY,
  payload TEXT NOT NULL,
  updated_at INTEGER NOT NULL
)`);

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export async function getOrFetch<T>(ref: string, fetcher: () => Promise<T>): Promise<T> {
  const row = db.prepare('SELECT payload, updated_at FROM breslov_cache WHERE textId = ?').get(ref);
  const now = Date.now();
  if (row) {
    const age = now - row.updated_at;
    if (age < ONE_DAY_MS) {
      try {
        return JSON.parse(row.payload) as T;
      } catch {
        // fallthrough to refetch on parse errors
      }
    }
  }

  const payload = await fetcher();
  db.prepare(
    'INSERT OR REPLACE INTO breslov_cache(textId, payload, updated_at) VALUES (?, ?, ?)'
  ).run(ref, JSON.stringify(payload), now);
  return payload;
}
