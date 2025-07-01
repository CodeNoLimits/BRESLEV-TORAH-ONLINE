import { SefariaIndexNode, SefariaText } from '../types';

// Base URL for proxy - NO direct calls to sefaria.org
const BASE_URL = '/sefaria-api';

// Fonction pour extraire tous les textes Breslov récursivement
const extractAllTextRefs = (nodes: any[]): SefariaIndexNode[] => {
    let allRefs: SefariaIndexNode[] = [];
    if (!nodes || !Array.isArray(nodes)) return allRefs;

    for (const node of nodes) {
        // Debug log pour voir la structure
        console.log('[SefariaProxy] Processing node:', { title: node.title, ref: node.ref, hasContents: !!node.contents });
        
        if (node.ref) {
            allRefs.push({ 
                title: node.title, 
                ref: node.ref,
                category: 'Breslov'
            });
        }
        if (node.contents && Array.isArray(node.contents)) {
            allRefs = allRefs.concat(extractAllTextRefs(node.contents));
        }
        // Vérifier aussi node.nodes pour certaines structures
        if (node.nodes && Array.isArray(node.nodes)) {
            allRefs = allRefs.concat(extractAllTextRefs(node.nodes));
        }
    }
    return allRefs;
};

/**
 * Isole la catégorie Breslev et extrait toutes ses références de texte.
 * @param {Array} fullIndex - La réponse JSON complète de l'endpoint /api/index.
 * @returns {Array} Une liste d'objets { title, ref } pour toute la bibliothèque Breslev.
 */
const getFullBreslovLibrary = (fullIndex: any[]): SefariaIndexNode[] => {
    try {
        console.log('[SefariaProxy] Searching for Breslov in index structure');
        
        // Search for Chasidut category
        const chasidutCategory = fullIndex.find(cat => cat.category === "Chasidut");
        if (!chasidutCategory) {
            console.log('[SefariaProxy] Chasidut category not found');
            return [];
        }
        
        console.log('[SefariaProxy] Found Chasidut category');
        
        // Search for Breslov subcategory
        const breslovCategory = chasidutCategory.contents?.find((subCat: any) => subCat.category === "Breslov");
        if (!breslovCategory) {
            console.log('[SefariaProxy] Breslov category not found in Chasidut');
            console.log('[SefariaProxy] Available categories:', chasidutCategory.contents?.map((c: any) => c.category));
            return [];
        }
        
        console.log('[SefariaProxy] Found Breslov category');
        
        // Extract all text references
        const breslovBooks = extractAllTextRefs(breslovCategory.contents || []);
        console.log(`[SefariaProxy] Extracted ${breslovBooks.length} Breslov books`);
        
        return breslovBooks;

    } catch (error) {
        console.error("[SefariaProxy] Error parsing Breslov library:", error);
        return [];
    }
};

export const getBreslovIndex = async (): Promise<SefariaIndexNode[]> => {
  console.log(`[SefariaProxy] Loading complete Breslov library from Sefaria`);
  
  // ALL 9 authentic Breslov books - accessing complete books, not individual verses
  const breslovBooks: SefariaIndexNode[] = [
    { title: 'Likutei Moharan', ref: 'Likutei Moharan', category: 'Breslov' },
    { title: 'Sichot HaRan', ref: 'Sichot HaRan', category: 'Breslov' },
    { title: 'Sippurei Maasiyot', ref: 'Sippurei Maasiyot', category: 'Breslov' },
    { title: 'Chayei Moharan', ref: 'Chayei Moharan', category: 'Breslov' },
    { title: 'Shivchei HaRan', ref: 'Shivchei HaRan', category: 'Breslov' },
    { title: 'Sefer HaMiddot', ref: 'Sefer HaMiddot', category: 'Breslov' },
    { title: 'Likutei Tefilot', ref: 'Likutei Tefilot', category: 'Breslov' },
    { title: 'Likutei Halakhot', ref: 'Likutei Halakhot', category: 'Breslov' },
    { title: 'Likkutei Etzot', ref: 'Likkutei Etzot', category: 'Breslov' }
  ];
  
  console.log(`[SefariaProxy] Complete Breslov library: ${breslovBooks.length} authentic books loaded`);
  return breslovBooks;
};

export const getTextContent = async (ref: string): Promise<SefariaText> => {
  console.log(`[SefariaProxy] Using new complete text extraction system for: ${ref}`);
  
  // Check if this is a Breslov book - use the new complete text extractor
  const breslovBooks = ['Likutei Moharan', 'Sichot HaRan', 'Sippurei Maasiyot', 'Chayei Moharan', 'Shivchei HaRan'];
  const bookTitle = breslovBooks.find(book => ref.includes(book));
  
  if (bookTitle) {
    try {
      // Extract section number if present
      const sectionMatch = ref.match(/(\d+)$/);
      const section = sectionMatch ? sectionMatch[1] : null;
      
      const endpoint = section 
        ? `/api/complete-text/${encodeURIComponent(bookTitle)}/${section}`
        : `/api/complete-text/${encodeURIComponent(bookTitle)}`;
      
      console.log(`[SefariaProxy] Fetching complete Breslov text from: ${endpoint}`);
      
      const response = await fetch(endpoint);
      if (response.ok) {
        const completeText = await response.json();
        console.log(`[SefariaProxy] COMPLETE Breslov text retrieved - EN: ${completeText.text.length} segments, HE: ${completeText.he.length} segments`);
        return completeText;
      }
    } catch (error) {
      console.log(`[SefariaProxy] Complete text extractor failed, falling back to standard proxy`);
    }
  }
  
  // Fallback to standard Sefaria proxy
  console.log(`[SefariaProxy] Using standard proxy for: ${ref}`);
  
  const response = await fetch(`${BASE_URL}/texts/${encodeURIComponent(ref)}?lang=en&context=0&commentary=0&alts=1`);
  if (!response.ok) {
    throw new Error(`Failed to fetch text for ${ref}`);
  }
  
  const data = await response.json();
  
  // Extract text content
  const extractText = (textData: any): string[] => {
    if (!textData) return [];
    if (typeof textData === 'string') return [textData.trim()].filter(t => t);
    if (Array.isArray(textData)) {
      return textData.flat(Infinity).filter(t => typeof t === 'string' && t.trim());
    }
    return [];
  };
  
  const englishText = extractText(data.text);
  const hebrewText = extractText(data.he);
  
  // Clean HTML tags
  const cleanText = (texts: string[]): string[] => {
    return texts
      .map(text => text.replace(/<[^>]*>/g, '').trim())
      .filter(text => text.length > 0);
  };
  
  const result = {
    ref: data.ref || ref,
    book: data.book || ref.split(' ')[0],
    text: cleanText(englishText),
    he: cleanText(hebrewText),
    title: data.title || ref
  };
  
  if (result.text.length === 0) {
    throw new Error(`No text content available for ${ref}`);
  }
  
  console.log(`[SefariaProxy] Standard text retrieved - EN: ${result.text.length} segments, HE: ${result.he.length} segments`);
  return result;
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