export interface ValidationResult {
  valid: boolean;
  message?: string;
  maxSections?: number;
}

export interface BookMeta {
  maxSections: number;
  verified: boolean;
  baseRef: string;
  hebrewTitle: string;
  category: string;
}

export interface BooksMetaResponse {
  books: Record<string, BookMeta>;
  totalBooks: number;
  lastUpdated: string;
  cacheValidityMinutes: number;
}

let metaCache: BooksMetaResponse | null = null;
let cacheTimestamp: number | null = null;

export function clearMetaCache(): void {
  metaCache = null;
  cacheTimestamp = null;
}

export async function fetchBooksMeta(): Promise<BooksMetaResponse> {
  const now = Date.now();
  
  // Check if cache is valid
  if (metaCache && cacheTimestamp) {
    const cacheAge = now - cacheTimestamp;
    const cacheValidityMs = metaCache.cacheValidityMinutes * 60 * 1000;
    
    if (cacheAge < cacheValidityMs) {
      return metaCache;
    }
  }
  
  try {
    const response = await fetch('/api/books/meta');
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    metaCache = data;
    cacheTimestamp = now;
    
    return data;
  } catch (error) {
    throw new Error(`Failed to fetch books metadata: ${error}`);
  }
}

export async function validateRefAsync(bookTitle: string, section: number): Promise<ValidationResult> {
  try {
    const meta = await fetchBooksMeta();
    
    // Check if book exists
    if (!meta.books[bookTitle]) {
      return {
        valid: false,
        message: `Book "${bookTitle}" not found in library`
      };
    }
    
    const book = meta.books[bookTitle];
    
    // Check section number validity
    if (section <= 0) {
      return {
        valid: false,
        message: `Section number must be greater than 0`
      };
    }
    
    // Check if book is verified
    if (!book.verified) {
      return {
        valid: false,
        message: `Book "${bookTitle}" is not fully verified yet`,
        maxSections: book.maxSections
      };
    }
    
    // Check if section exists
    if (section > book.maxSections) {
      return {
        valid: false,
        message: `Section ${section} does not exist in "${bookTitle}". This book has ${book.maxSections} sections maximum.`,
        maxSections: book.maxSections
      };
    }
    
    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      message: `Validation failed due to server error: ${error}`
    };
  }
}

export function generatePath(bookTitle: string, section: number): string {
  const kebabTitle = bookTitle
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  
  return `/docs/${kebabTitle}/${section}`;
}

export async function generateValidatedPath(bookTitle: string, section: number): Promise<{
  path: string | null;
  error?: string;
}> {
  const validation = await validateRefAsync(bookTitle, section);
  
  if (!validation.valid) {
    return {
      path: null,
      error: validation.message
    };
  }
  
  return {
    path: generatePath(bookTitle, section)
  };
}