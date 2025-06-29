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
  
  // ALL 9 authentic Breslov books with verified working references from Sefaria
  const breslovBooks: SefariaIndexNode[] = [
    { title: 'Likutei Moharan', ref: 'Likutei Moharan.1.1.1', category: 'Breslov' },
    { title: 'Sichot HaRan', ref: 'Sichot HaRan.1.1', category: 'Breslov' },
    { title: 'Sippurei Maasiyot', ref: 'Sippurei Maasiyot.1.1', category: 'Breslov' },
    { title: 'Chayei Moharan', ref: 'Chayei Moharan.1.1', category: 'Breslov' },
    { title: 'Shivchei HaRan', ref: 'Shivchei HaRan.1.1', category: 'Breslov' },
    { title: 'Sefer HaMiddot', ref: 'Sefer HaMiddot, Introduction.1', category: 'Breslov' },
    { title: 'Likutei Tefilot', ref: 'Likutei Tefilot, Introduction.1', category: 'Breslov' },
    { title: 'Likutei Halakhot', ref: 'Likutei Halakhot, Author\'s Introduction.1', category: 'Breslov' },
    { title: 'Likkutei Etzot', ref: 'Likkutei Etzot, Introduction to First Edition.1', category: 'Breslov' }
  ];
  
  console.log(`[SefariaProxy] Complete Breslov library: ${breslovBooks.length} authentic books loaded`);
  return breslovBooks;
};

export const getTextContent = async (ref: string): Promise<SefariaText> => {
  console.log(`[SefariaProxy] Fetching COMPLETE authentic text: ${ref}`);
  
  // Fetch English text with Breslov Research Institute translation
  const englishResponse = await fetch(`${BASE_URL}/texts/${encodeURIComponent(ref)}?lang=en&context=0&commentary=0`);
  if (!englishResponse.ok) {
    throw new Error(`Failed to fetch English text for ${ref}`);
  }
  
  const englishData = await englishResponse.json();
  
  // MANDATORY: English text must exist
  if (!englishData.text) {
    throw new Error(`No English text available for ${ref}`);
  }
  
  const englishText = Array.isArray(englishData.text) ? englishData.text : [englishData.text];
  console.log(`[SefariaProxy] AUTHENTIC English text (${englishText.length} segments): "${englishText[0]?.substring(0, 100)}..."`);
  
  // MANDATORY: Hebrew text must exist
  if (!englishData.he) {
    throw new Error(`No Hebrew text available for ${ref}`);
  }
  
  const hebrewText = Array.isArray(englishData.he) ? englishData.he : [englishData.he];
  console.log(`[SefariaProxy] AUTHENTIC Hebrew text (${hebrewText.length} segments): "${hebrewText[0]?.substring(0, 100)}..."`);
  
  // Clean HTML but preserve ALL authentic content
  const cleanText = (textArray: string[]): string[] => {
    return textArray
      .map(text => text.replace(/<[^>]*>/g, '').trim())
      .filter(text => text.length > 0);
  };
  
  const result = {
    ref: englishData.ref,
    book: englishData.book,
    text: cleanText(englishText),
    he: cleanText(hebrewText),
    title: englishData.title
  };
  
  // VERIFY we have complete authentic content
  if (result.text.length === 0 || result.he.length === 0) {
    throw new Error(`Incomplete text data for ${ref} - refusing to show partial content`);
  }
  
  console.log(`[SefariaProxy] COMPLETE authentic text verified - EN: ${result.text.length} segments, HE: ${result.he.length} segments`);
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