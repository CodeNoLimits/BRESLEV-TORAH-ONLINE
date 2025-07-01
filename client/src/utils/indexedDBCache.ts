// IndexedDB cache for Sefaria texts with 24h TTL
const DB_NAME = 'SefariaTextCache';
const DB_VERSION = 1;
const STORE_NAME = 'texts';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

interface CachedText {
  key: string;
  data: any;
  timestamp: number;
  expiry: number;
}

class IndexedDBCache {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'key' });
          store.createIndex('expiry', 'expiry', { unique: false });
        }
      };
    });
  }

  async get(key: string): Promise<any | null> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(key);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const result = request.result as CachedText;
        
        if (!result) {
          resolve(null);
          return;
        }

        // Check if expired
        if (Date.now() > result.expiry) {
          this.delete(key); // Clean up expired entry
          resolve(null);
          return;
        }

        console.log(`[IndexedDBCache] ✅ Cache hit for: ${key}`);
        resolve(result.data);
      };
    });
  }

  async set(key: string, data: any): Promise<void> {
    if (!this.db) await this.init();

    const now = Date.now();
    const cachedText: CachedText = {
      key,
      data,
      timestamp: now,
      expiry: now + CACHE_DURATION
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(cachedText);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        console.log(`[IndexedDBCache] ✅ Cached: ${key} (expires in 24h)`);
        resolve();
      };
    });
  }

  async delete(key: string): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(key);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async cleanup(): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('expiry');
      const request = index.openCursor(IDBKeyRange.upperBound(Date.now()));

      request.onerror = () => reject(request.error);
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        } else {
          console.log('[IndexedDBCache] ✅ Cleanup completed');
          resolve();
        }
      };
    });
  }
}

export const textCache = new IndexedDBCache();

// Cached fetch wrapper for Sefaria API
export async function fetchWithCache(url: string): Promise<any> {
  const cacheKey = url;
  
  try {
    // Try cache first
    const cached = await textCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Fetch from API
    console.log(`[IndexedDBCache] Cache miss, fetching: ${url}`);
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Cache the result
    await textCache.set(cacheKey, data);
    
    return data;
  } catch (error) {
    console.error('[IndexedDBCache] Fetch error:', error);
    throw error;
  }
}

// Initialize cache and cleanup on app start
textCache.init().then(() => {
  textCache.cleanup();
}).catch(console.error);