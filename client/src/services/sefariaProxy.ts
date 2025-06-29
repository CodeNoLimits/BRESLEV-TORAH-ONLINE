import { SefariaIndexNode, SefariaText } from '../types';

// Base URL for proxy - NO direct calls to sefaria.org
const BASE_URL = '/sefaria-api';

// Fonction pour extraire tous les textes Breslov récursivement
const extractAllTextRefs = (nodes: any[]): SefariaIndexNode[] => {
    let allRefs: SefariaIndexNode[] = [];
    if (!nodes || !Array.isArray(nodes)) return allRefs;

    for (const node of nodes) {
        if (node.ref) {
            allRefs.push({ 
                title: node.title, 
                ref: node.ref,
                category: 'Breslov'
            });
        }
        if (node.contents) {
            allRefs = allRefs.concat(extractAllTextRefs(node.contents));
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
  console.log(`[SefariaProxy] Fetching complete Sefaria index via proxy`);
  
  const response = await fetch(`${BASE_URL}/index`);
  if (!response.ok) {
    throw new Error('Index error');
  }
  
  const fullIndex = await response.json();
  const breslovBooks = getFullBreslovLibrary(fullIndex);
  
  console.log(`[SefariaProxy] Breslov library extracted: ${breslovBooks.length} books`);
  return breslovBooks;
};

export const getTextContent = async (ref: string): Promise<SefariaText> => {
  console.log(`[SefariaProxy] Fetching text via proxy: ${ref}`);
  
  const response = await fetch(`${BASE_URL}/v3/texts/${encodeURIComponent(ref)}?context=0&commentary=0&pad=0&wrapLinks=false`);
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
      hebrewText = Array.isArray(hebrewVersion.text) ? hebrewVersion.text : [hebrewVersion.text];
    }
    
    const englishVersion = data.versions.find((v: any) => v.language === 'en');
    if (englishVersion && englishVersion.text) {
      englishText = Array.isArray(englishVersion.text) ? englishVersion.text : [englishVersion.text];
    }
  }
  
  // Clean HTML and normalize text
  const cleanText = (textArray: string[]): string[] => {
    return textArray
      .map(text => text ? text.replace(/<[^>]*>/g, '').trim() : '')
      .filter(text => text.length > 0);
  };
  
  return {
    ref: data.ref || ref,
    book: data.book || ref.split('.')[0],
    text: cleanText(englishText),
    he: cleanText(hebrewText),
    title: data.title || ref
  };
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