// Sefaria service - direct client calls (no proxy needed due to CORS)
export interface SefariaText {
  ref: string;
  text: string[];
  he: string[];
  title: string;
}

export interface SefariaIndexNode {
  title: string;
  ref?: string;
  contents?: SefariaIndexNode[];
  nodes?: SefariaIndexNode[];
  schema?: { nodes?: SefariaIndexNode[] };
  category?: string;
}

class SefariaDirectClient {
  private cache = new Map<string, { data: any; expires: number }>();
  private readonly TTL = 3600000; // 1 hour

  // Fetch section with V3/V1 fallback
  async fetchSection(tref: string): Promise<SefariaText> {
    const cacheKey = tref;
    const cached = this.cache.get(cacheKey);
    
    if (cached && cached.expires > Date.now()) {
      console.log(`[SefariaClient] Cache hit for: ${tref}`);
      return this.formatResponse(cached.data, tref);
    }

    try {
      // Convert ref format: "Likutei Moharan 1:1" → "Likutei_Moharan.1.1"
      const encodedRef = tref.replace(/\s+/g, '_').replace(/:/g, '.');
      
      // Try V3 first
      let url = `https://www.sefaria.org/api/v3/texts/${encodedRef}?context=0&commentary=0&pad=0&wrapLinks=false`;
      console.log(`[SefariaClient] Fetching V3: ${url}`);
      
      let response = await fetch(url);
      
      if (!response.ok && response.status === 404) {
        // Fallback to V1
        url = `https://www.sefaria.org/api/texts/${encodedRef}?context=0&commentary=0`;
        console.log(`[SefariaClient] Fallback to V1: ${url}`);
        response = await fetch(url);
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Cache the response
      this.cache.set(cacheKey, {
        data,
        expires: Date.now() + this.TTL
      });

      console.log(`[SefariaClient] Successfully fetched: ${tref}`);
      return this.formatResponse(data, tref);

    } catch (error) {
      console.error('[SefariaClient]', tref, error);
      throw new Error(`Impossible de charger "${tref}" (${error instanceof Error ? error.message : 'Unknown error'})`);
    }
  }

  // Format response to consistent structure
  private formatResponse(data: any, tref: string): SefariaText {
    // Handle V3 response format
    if (data.versions && data.versions.length > 0) {
      const hebrewVersion = data.versions.find((v: any) => v.language === 'he');
      const englishVersion = data.versions.find((v: any) => v.language === 'en');
      
      return {
        ref: tref,
        title: data.title || tref,
        text: englishVersion?.text || [],
        he: hebrewVersion?.text || []
      };
    }
    
    // Handle V1 response format
    return {
      ref: tref,
      title: data.title || tref,
      text: Array.isArray(data.text) ? data.text : [data.text].filter(Boolean),
      he: Array.isArray(data.he) ? data.he : [data.he].filter(Boolean)
    };
  }

  // Load Breslov library from index
  async getBreslovLibrary(): Promise<SefariaIndexNode[]> {
    try {
      console.log('[SefariaClient] Loading Breslov library from index');
      const response = await fetch('https://www.sefaria.org/api/index');
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const index = await response.json();
      
      // Navigate to Chasidut > Breslov
      const chasidut = index.find((c: any) => c.category === 'Chasidut');
      if (!chasidut?.contents) {
        throw new Error('Chasidut category not found');
      }

      const breslov = chasidut.contents.find((c: any) => c.category === 'Breslov');
      if (!breslov?.contents) {
        throw new Error('Breslov category not found');
      }

      // Extract all texts with refs
      const breslovTexts = this.extractTextsWithRefs(breslov.contents);
      console.log(`[SefariaClient] Found ${breslovTexts.length} Breslov texts`);
      
      return breslovTexts;

    } catch (error) {
      console.error('[SefariaClient] Failed to load Breslov library:', error);
      throw error;
    }
  }

  // Extract known Breslov texts with proper refs
  private extractTextsWithRefs(nodes: any[]): SefariaIndexNode[] {
    const breslovBooks = [
      { title: 'Likutei Moharan', ref: 'Likutei Moharan 1:1' },
      { title: 'Sichot HaRan', ref: 'Sichot HaRan 1' },
      { title: 'Sippurei Maasiyot', ref: 'Sippurei Maasiyot 1:1' },
      { title: 'Chayei Moharan', ref: 'Chayei Moharan 1:1' },
      { title: 'Shivchei HaRan', ref: 'Shivchei HaRan 1' },
      { title: 'Sefer HaMiddot', ref: 'Sefer HaMiddot, Anger 1' },
      { title: 'Likutei Tefilot', ref: 'Likutei Tefilot 1:1' },
      { title: 'Likutei Halakhot', ref: 'Likutei Halakhot, Orach Chaim, Tefillat Shacharit 1:1' },
      { title: 'Likkutei Etzot', ref: 'Likkutei Etzot, Anger 1' }
    ];

    console.log(`[SefariaClient] Using predefined Breslov references`);
    return breslovBooks;
  }
}

export const sefariaClient = new SefariaDirectClient();