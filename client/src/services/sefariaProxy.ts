import { SefariaIndexNode, SefariaText } from '../types';

// New proxy-based Sefaria service following exact instructions
export const getTextContent = async (ref: string): Promise<SefariaText> => {
  console.log(`[SefariaProxy] Fetching text: ${ref}`);
  
  const response = await fetch(`/api/sefaria/texts/${encodeURIComponent(ref)}`);
  if (!response.ok) {
    throw new Error('Sefaria proxy error');
  }
  
  const data = await response.json();
  
  // Extract text from versions
  let englishText: string[] = [];
  let hebrewText: string[] = [];
  
  if (data.versions && Array.isArray(data.versions)) {
    const hebrewVersion = data.versions.find((v: any) => v.language === 'he');
    if (hebrewVersion && hebrewVersion.text) {
      hebrewText = Array.isArray(hebrewVersion.text) ? [hebrewVersion.text] : [hebrewVersion.text];
    }
    
    const englishVersion = data.versions.find((v: any) => v.language === 'en');
    if (englishVersion && englishVersion.text) {
      englishText = Array.isArray(englishVersion.text) ? [englishVersion.text] : [englishVersion.text];
    }
  }
  
  return {
    ref: data.ref || ref,
    book: data.book || ref.split('.')[0],
    text: englishText,
    he: hebrewText,
    title: data.title || ref
  };
};

export const getBreslovIndex = async (): Promise<SefariaIndexNode[]> => {
  console.log(`[SefariaProxy] Fetching Breslov index`);
  
  const response = await fetch('/api/sefaria/breslov-index');
  if (!response.ok) {
    throw new Error('Index error');
  }
  
  const data = await response.json();
  
  // The server already provides correctly formatted books
  const breslovBooks: SefariaIndexNode[] = data.map((item: any) => ({
    title: item.title,
    ref: item.ref,
    category: 'Breslov'
  }));
  
  console.log(`[SefariaProxy] Breslov index processed: ${breslovBooks.length} books`);
  return breslovBooks;
};

// Cache management
let breslovIndexCache: { data: SefariaIndexNode[], timestamp: number } | null = null;
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

export const getCachedBreslovIndex = async (): Promise<SefariaIndexNode[]> => {
  if (breslovIndexCache && Date.now() - breslovIndexCache.timestamp < CACHE_DURATION) {
    console.log('[SefariaProxy] Using cached Breslov index');
    return breslovIndexCache.data;
  }
  
  const data = await getBreslovIndex();
  breslovIndexCache = { data, timestamp: Date.now() };
  return data;
};