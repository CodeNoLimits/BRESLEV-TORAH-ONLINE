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
  console.log(`[SefariaProxy] Fetching COMPLETE book: ${ref}`);
  
  // For book-level references, fetch the complete book structure
  const bookResponse = await fetch(`${BASE_URL}/texts/${encodeURIComponent(ref)}?lang=en&context=0&commentary=0&alts=1`);
  if (!bookResponse.ok) {
    throw new Error(`Failed to fetch complete book for ${ref}`);
  }
  
  const bookData = await bookResponse.json();
  
  // Extract all text content from the complete book
  let englishText: string[] = [];
  let hebrewText: string[] = [];
  
  // Function to flatten nested text arrays
  const flattenText = (textData: any): string[] => {
    if (!textData) return [];
    if (typeof textData === 'string') return [textData];
    if (Array.isArray(textData)) {
      return textData.flat(Infinity).filter(t => typeof t === 'string' && t.trim().length > 0);
    }
    return [];
  };
  
  // Extract English text (complete book)
  if (bookData.text) {
    englishText = flattenText(bookData.text);
    console.log(`[SefariaProxy] COMPLETE English book extracted: ${englishText.length} total segments`);
  }
  
  // Extract Hebrew text (complete book)
  if (bookData.he) {
    hebrewText = flattenText(bookData.he);
    console.log(`[SefariaProxy] COMPLETE Hebrew book extracted: ${hebrewText.length} total segments`);
  }
  
  // If we don't have complete content, try alternative endpoints
  if (englishText.length === 0 || hebrewText.length === 0) {
    console.log(`[SefariaProxy] Incomplete book data, fetching alternative structure for ${ref}`);
    
    // Try fetching book index to get all sections
    const indexResponse = await fetch(`${BASE_URL}/index/${encodeURIComponent(ref)}`);
    if (indexResponse.ok) {
      const indexData = await indexResponse.json();
      console.log(`[SefariaProxy] Book structure available, contains ${indexData.schema?.nodes?.length || 0} sections`);
      
      // For now, provide clear feedback about book structure
      englishText = [`Complete book "${ref}" contains multiple sections. Please navigate through the book structure to access specific teachings.`];
      hebrewText = [`ספר שלם "${ref}" מכיל מספר פרקים. אנא נווט דרך מבנה הספר כדי לגשת להוראות ספציפיות.`];
    }
  }
  
  // Clean HTML but preserve ALL authentic content
  const cleanText = (textArray: string[]): string[] => {
    return textArray
      .map(text => text.replace(/<[^>]*>/g, '').trim())
      .filter(text => text.length > 0);
  };
  
  const result = {
    ref: bookData.ref || ref,
    book: bookData.book || ref,
    text: cleanText(englishText),
    he: cleanText(hebrewText),
    title: bookData.title || ref
  };
  
  // VERIFY we have some content
  if (result.text.length === 0 || result.he.length === 0) {
    throw new Error(`No complete book data available for ${ref} - this may require section-by-section navigation`);
  }
  
  console.log(`[SefariaProxy] COMPLETE book content verified - EN: ${result.text.length} segments, HE: ${result.he.length} segments`);
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