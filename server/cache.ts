
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

export const cacheService = {
  get: (key: string) => {
    const cachedItem = cache.get(key);
    if (!cachedItem) return null;

    // Check if cache has expired
    if (Date.now() - cachedItem.timestamp > CACHE_TTL_MS) {
      cache.delete(key);
      return null;
    }

    console.log(`[Cache] HIT for ${key}`);
    return cachedItem.data;
  },

  set: (key: string, data: any) => {
    console.log(`[Cache] SET for ${key}`);
    cache.set(key, { data, timestamp: Date.now() });
  },

  clear: () => {
    cache.clear();
    console.log(`[Cache] CLEARED`);
  },

  size: () => cache.size
};
