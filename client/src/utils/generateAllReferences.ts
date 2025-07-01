import { BRESLOV_BOOKS, BreslovBookConfig } from '../../../server/src/data/BRESLOV_BOOKS.js';

export interface BreslovReference {
  ref: string;
  title: string;
  book: string;
  section: number;
  hebrewTitle: string;
  category: string;
  verified: boolean;
}

const CACHE_VERSION = 2; // Increment to clear obsolete cache
const CACHE_KEY = `breslov_references_v${CACHE_VERSION}`;

export function generateAllReferences(): BreslovReference[] {
  // Clear obsolete localStorage cache
  clearObsoleteCache();
  
  const allReferences: BreslovReference[] = [];
  
  BRESLOV_BOOKS.forEach(book => {
    // Only generate references for verified books to avoid 404s
    if (!book.verified) {
      console.log(`[generateAllReferences] Skipping unverified book: ${book.title}`);
      return;
    }
    
    for (let section = 1; section <= book.maxSections; section++) {
      const ref = `${book.baseRef}.${section}`;
      
      allReferences.push({
        ref,
        title: `${book.title} ${section}`,
        book: book.title,
        section,
        hebrewTitle: `${book.hebrewTitle} ${section}`,
        category: book.category,
        verified: book.verified
      });
    }
  });
  
  console.log(`[generateAllReferences] Generated ${allReferences.length} references from ${BRESLOV_BOOKS.length} books`);
  
  // Cache the generated references
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      version: CACHE_VERSION,
      timestamp: Date.now(),
      references: allReferences
    }));
    console.log(`[generateAllReferences] Cached ${allReferences.length} references`);
  } catch (error) {
    console.warn('[generateAllReferences] Failed to cache references:', error);
  }
  
  return allReferences;
}

export function getCachedReferences(): BreslovReference[] | null {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;
    
    const data = JSON.parse(cached);
    if (data.version !== CACHE_VERSION) {
      console.log('[getCachedReferences] Cache version mismatch, invalidating');
      localStorage.removeItem(CACHE_KEY);
      return null;
    }
    
    // Cache is valid for 24 hours
    const age = Date.now() - data.timestamp;
    if (age > 24 * 60 * 60 * 1000) {
      console.log('[getCachedReferences] Cache expired');
      localStorage.removeItem(CACHE_KEY);
      return null;
    }
    
    return data.references;
  } catch (error) {
    console.warn('[getCachedReferences] Failed to read cache:', error);
    return null;
  }
}

export function getAllReferences(): BreslovReference[] {
  const cached = getCachedReferences();
  if (cached) {
    console.log(`[getAllReferences] Using cached references: ${cached.length} items`);
    return cached;
  }
  
  return generateAllReferences();
}

function clearObsoleteCache() {
  const keysToRemove: string[] = [];
  
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith('breslov_references_v') && key !== CACHE_KEY) {
      keysToRemove.push(key);
    }
  }
  
  keysToRemove.forEach(key => {
    localStorage.removeItem(key);
    console.log(`[clearObsoleteCache] Removed obsolete cache: ${key}`);
  });
  
  if (keysToRemove.length > 0) {
    console.log(`[clearObsoleteCache] Cleared ${keysToRemove.length} obsolete cache entries`);
  }
}

export function getBookStatistics(): Record<string, number> {
  const stats: Record<string, number> = {};
  
  BRESLOV_BOOKS.forEach(book => {
    stats[book.title] = book.maxSections;
  });
  
  return stats;
}

export function getTotalReferenceCount(): number {
  return BRESLOV_BOOKS
    .filter(book => book.verified)
    .reduce((total, book) => total + book.maxSections, 0);
}