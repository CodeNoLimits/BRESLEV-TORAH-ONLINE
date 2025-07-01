interface BookMeta {
  maxSections: number;
  verified: boolean;
  baseRef: string;
  hebrewTitle: string;
  category: string;
}

interface MetaResponse {
  books: Record<string, BookMeta>;
  totalBooks: number;
  lastUpdated: string;
  cacheValidityMinutes: number;
}

// Cache with 5-minute TTL
let metaCache: { data: MetaResponse; timestamp: number } | null = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

export async function fetchBooksMeta(): Promise<MetaResponse> {
  // Check cache first
  if (metaCache && Date.now() - metaCache.timestamp < CACHE_DURATION) {
    console.debug('[validateRef] Using cached meta data');
    return metaCache.data;
  }

  try {
    console.debug('[validateRef] Fetching fresh meta data from server');
    const response = await fetch('/api/books/meta');
    
    if (!response.ok) {
      throw new Error(`Meta API returned ${response.status}`);
    }
    
    const data: MetaResponse = await response.json();
    
    // Update cache
    metaCache = {
      data,
      timestamp: Date.now()
    };
    
    console.debug('[validateRef] Cached meta data for', Object.keys(data.books).length, 'books');
    return data;
    
  } catch (error) {
    console.error('[validateRef] Failed to fetch meta data:', error);
    
    // Return cached data if available, even if expired
    if (metaCache) {
      console.warn('[validateRef] Using expired cache due to fetch error');
      return metaCache.data;
    }
    
    throw error;
  }
}

export async function validateRefAsync(bookTitle: string, sectionNumber: number): Promise<{ valid: boolean; message?: string; maxSections?: number }> {
  try {
    const meta = await fetchBooksMeta();
    const bookMeta = meta.books[bookTitle];
    
    if (!bookMeta) {
      return {
        valid: false,
        message: `Book "${bookTitle}" not found in library`,
      };
    }
    
    if (!bookMeta.verified) {
      return {
        valid: false,
        message: `Book "${bookTitle}" is not fully verified on Sefaria`,
        maxSections: bookMeta.maxSections
      };
    }
    
    if (sectionNumber < 1) {
      return {
        valid: false,
        message: 'Section number must be greater than 0',
        maxSections: bookMeta.maxSections
      };
    }
    
    if (sectionNumber > bookMeta.maxSections) {
      return {
        valid: false,
        message: `Section ${sectionNumber} does not exist. ${bookTitle} has ${bookMeta.maxSections} sections maximum`,
        maxSections: bookMeta.maxSections
      };
    }
    
    return { valid: true };
    
  } catch (error) {
    console.error('[validateRef] Validation error:', error);
    return {
      valid: false,
      message: 'Unable to validate reference due to server error'
    };
  }
}

export function generatePath(bookTitle: string, sectionNumber: number): string {
  // Convert to kebab-case for URL-friendly format
  const kebabTitle = bookTitle
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]/g, '');
  
  return `/docs/${kebabTitle}/${sectionNumber}`;
}

export async function generateValidatedPath(bookTitle: string, sectionNumber: number): Promise<{ path: string | null; error?: string }> {
  const validation = await validateRefAsync(bookTitle, sectionNumber);
  
  if (!validation.valid) {
    return {
      path: null,
      error: validation.message
    };
  }
  
  return {
    path: generatePath(bookTitle, sectionNumber)
  };
}

// Clear cache manually if needed
export function clearMetaCache(): void {
  metaCache = null;
  console.debug('[validateRef] Meta cache cleared');
}