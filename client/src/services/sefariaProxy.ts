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
  
  // Transform raw Sefaria data to our format with normalized references
  const breslovBooks: SefariaIndexNode[] = [];
  
  if (Array.isArray(data)) {
    data.forEach((item: any) => {
      // Create normalized reference for each book
      let normalizedRef = '';
      
      if (item.title === 'Likutei Moharan') {
        normalizedRef = 'Likutei_Moharan.1';
      } else if (item.title === 'Sichot HaRan') {
        normalizedRef = 'Sichot_HaRan.1';
      } else if (item.title === 'Sippurei Maasiyot') {
        normalizedRef = 'Sippurei_Maasiyot.1';
      } else if (item.title === 'Sefer HaMiddot') {
        normalizedRef = 'Sefer_HaMiddot.1';
      } else if (item.title === 'Likutei Tefilot') {
        normalizedRef = 'Likutei_Tefilot.1';
      } else if (item.title === 'Chayei Moharan') {
        normalizedRef = 'Chayei_Moharan.1';
      } else if (item.title === 'Shivchei HaRan') {
        normalizedRef = 'Shivchei_HaRan.1';
      } else if (item.title === 'Likutei Halakhot') {
        normalizedRef = 'Likutei_Halakhot.1';
      } else if (item.title === 'Likkutei Etzot') {
        normalizedRef = 'Likkutei_Etzot.1';
      } else {
        normalizedRef = `${item.title.replace(/\s/g, '_')}.1`;
      }
      
      breslovBooks.push({
        title: item.title,
        ref: normalizedRef,
        category: 'Breslov'
      });
    });
  }
  
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