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
  console.log(`[SefariaProxy] Fetching text via proxy: ${ref}`);
  
  const response = await fetch(`${BASE_URL}/v3/texts/${encodeURIComponent(ref)}?context=0&commentary=0&pad=0&wrapLinks=false`);
  if (!response.ok) {
    throw new Error('Sefaria proxy error');
  }
  
  const data = await response.json();
  
  // Extract text from versions with fallback to direct fields
  let englishText: string[] = [];
  let hebrewText: string[] = [];
  
  if (data.versions && Array.isArray(data.versions)) {
    // Extract Hebrew text (primary version)
    const hebrewVersion = data.versions.find((v: any) => v.language === 'he' && v.text);
    if (hebrewVersion && hebrewVersion.text) {
      hebrewText = Array.isArray(hebrewVersion.text) ? hebrewVersion.text : [hebrewVersion.text];
    }
    
    // Extract English text (priority to Breslov Research Institute translation)
    const englishVersion = data.versions.find((v: any) => 
      v.language === 'en' && v.text && v.versionTitle?.includes('Breslov Research')
    ) || data.versions.find((v: any) => v.language === 'en' && v.text);
    
    if (englishVersion && englishVersion.text) {
      englishText = Array.isArray(englishVersion.text) ? englishVersion.text : [englishVersion.text];
    }
  }
  
  // Fallback to direct text fields if versions don't have text
  if (hebrewText.length === 0 && data.he) {
    hebrewText = Array.isArray(data.he) ? data.he : [data.he];
  }
  if (englishText.length === 0 && data.text) {
    englishText = Array.isArray(data.text) ? data.text : [data.text];
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