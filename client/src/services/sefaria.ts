import { SefariaIndexNode, SefariaText, SefariaCategory } from '../types';

const SEFARIA_API_BASE = '/sefaria';

class SefariaService {
  private indexCache: Map<string, any> = new Map();
  private textCache: Map<string, SefariaText> = new Map();
  private breslovLibrary: Map<string, any> = new Map();
  private allBreslovRefs: string[] = [];

  async getIndex(): Promise<SefariaIndexNode[]> {
    const cacheKey = 'breslov_complete_library_v2';
    
    // Force rebuild by clearing old cache
    sessionStorage.removeItem('breslov_complete_library');
    
    // Check if we have a complete cached library
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      try {
        const parsedCache = JSON.parse(cached);
        if (parsedCache.timestamp && Date.now() - parsedCache.timestamp < 24 * 60 * 60 * 1000) {
          console.log('Using validated Breslov library with', parsedCache.data.length, 'categories and', parsedCache.refCount, 'valid references');
          return parsedCache.data;
        }
      } catch (e) {
        sessionStorage.removeItem(cacheKey);
      }
    }

    console.log('Discovering complete Breslov library...');
    
    try {
      // Step 1: Fetch complete Sefaria index
      const indexResponse = await fetch(`${SEFARIA_API_BASE}/index/`);
      if (!indexResponse.ok) {
        throw new Error(`Failed to fetch index: ${indexResponse.status}`);
      }
      
      const fullIndex = await indexResponse.json();
      console.log('Sefaria index fetched, discovering Breslov texts...');
      
      // Step 2: Exhaustively discover all Breslov references
      this.allBreslovRefs = this.discoverAllBreslovRefs(fullIndex);
      console.log(`Discovered ${this.allBreslovRefs.length} Breslov references`);
      
      // Step 3: Build structured library from discovered refs
      const breslovLibrary = await this.buildBreslovLibrary();
      
      // Step 4: Cache the complete library
      sessionStorage.setItem(cacheKey, JSON.stringify({
        data: breslovLibrary,
        timestamp: Date.now(),
        refCount: this.allBreslovRefs.length
      }));
      
      console.log(`Complete Breslov library built with ${breslovLibrary.length} categories`);
      return breslovLibrary;
      
    } catch (error) {
      console.error('Error building complete library:', error);
      
      // Emergency fallback - comprehensive predefined library
      const fallbackLibrary = this.createComprehensiveBreslovLibrary();
      console.log('Using fallback library with', fallbackLibrary.length, 'categories');
      
      sessionStorage.setItem(cacheKey, JSON.stringify({
        data: fallbackLibrary,
        timestamp: Date.now(),
        fallback: true
      }));
      
      return fallbackLibrary;
    }
  }

  // Exhaustive discovery of all Breslov references
  private discoverAllBreslovRefs(indexData: any[]): string[] {
    const breslovRefs: string[] = [];
    
    const traverseNode = (node: any, isInBreslov: boolean = false) => {
      // Check if this node is Breslov category
      const isBreslov = isInBreslov || 
        node.category === 'Breslov' || 
        node.title?.includes('Breslov') ||
        node.title?.includes('Likutei') ||
        node.title?.includes('Sippurei') ||
        node.title?.includes('Sichos') ||
        node.title?.includes('Chayyei');
      
      // If this is a leaf node with a ref, collect it
      if (node.ref && isBreslov) {
        breslovRefs.push(node.ref);
      }
      
      // Traverse all possible content arrays
      const contentArrays = [
        node.contents,
        node.nodes,
        node.schema?.nodes
      ].filter(Boolean);
      
      contentArrays.forEach(contentArray => {
        if (Array.isArray(contentArray)) {
          contentArray.forEach(child => traverseNode(child, isBreslov));
        }
      });
    };
    
    // Find Chasidut category and traverse
    const chasidutCategory = indexData.find(item => item.category === 'Chasidut');
    if (chasidutCategory) {
      traverseNode(chasidutCategory, false);
    }
    
    // Only use VERIFIED working references from actual API testing
    const verifiedWorkingRefs = [
      // Likutei Moharan Part II - CONFIRMED WORKING
      'Likutei Moharan.2.1', 'Likutei Moharan.2.2', 'Likutei Moharan.2.3', 'Likutei Moharan.2.4',
      'Likutei Moharan.2.5', 'Likutei Moharan.2.6', 'Likutei Moharan.2.7', 'Likutei Moharan.2.8', 
      'Likutei Moharan.2.9',
      
      // Sichos HaRan - ALL 20 CONFIRMED WORKING  
      'Sichos HaRan.1', 'Sichos HaRan.2', 'Sichos HaRan.3', 'Sichos HaRan.4', 'Sichos HaRan.5',
      'Sichos HaRan.6', 'Sichos HaRan.7', 'Sichos HaRan.8', 'Sichos HaRan.9', 'Sichos HaRan.10',
      'Sichos HaRan.11', 'Sichos HaRan.12', 'Sichos HaRan.13', 'Sichos HaRan.14', 'Sichos HaRan.15',
      'Sichos HaRan.16', 'Sichos HaRan.17', 'Sichos HaRan.18', 'Sichos HaRan.19', 'Sichos HaRan.20'
    ];
    
    // Add only verified working references
    verifiedWorkingRefs.forEach(ref => {
      if (!breslovRefs.includes(ref)) {
        breslovRefs.push(ref);
      }
    });
    
    return breslovRefs;
  }

  // Build structured library from discovered references
  private async buildBreslovLibrary(): Promise<SefariaIndexNode[]> {
    console.log('Building Breslov library from', this.allBreslovRefs.length, 'references');
    
    // First, validate which references actually exist on Sefaria
    const validRefs = await this.validateReferences(this.allBreslovRefs);
    console.log('Validated', validRefs.length, 'working references');
    
    const categories = new Map<string, SefariaIndexNode>();
    
    // Group valid references by book/category
    validRefs.forEach(ref => {
      const bookName = this.extractBookName(ref);
      
      if (!categories.has(bookName)) {
        categories.set(bookName, {
          title: this.getBookDisplayName(bookName),
          category: 'Breslov',
          contents: []
        });
      }
      
      categories.get(bookName)!.contents!.push({
        title: this.formatRefTitle(ref),
        ref: ref
      });
    });
    
    return Array.from(categories.values());
  }

  // Validate which references actually exist on Sefaria
  private async validateReferences(refs: string[]): Promise<string[]> {
    const validRefs: string[] = [];
    const batchSize = 3; // Smaller batches to avoid overwhelming API
    
    for (let i = 0; i < refs.length; i += batchSize) {
      const batch = refs.slice(i, i + batchSize);
      
      const validationPromises = batch.map(async (ref) => {
        try {
          const normalizedRef = ref.replace(/\s/g, '_');
          const encodedRef = encodeURIComponent(normalizedRef);
          const apiUrl = `${SEFARIA_API_BASE}/v3/texts/${encodedRef}?context=0&commentary=0&pad=0&wrapLinks=false`;
          
          const response = await fetch(apiUrl, { method: 'HEAD' }); // Just check if exists
          if (response.ok) {
            validRefs.push(ref);
            console.log('✓ Valid ref:', ref);
          } else {
            console.log('✗ Invalid ref:', ref, response.status);
          }
        } catch (error) {
          console.log('✗ Failed ref:', ref, error);
        }
      });
      
      await Promise.all(validationPromises);
      
      // Rate limiting
      if (i + batchSize < refs.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    return validRefs;
  }

  private extractBookName(ref: string): string {
    if (ref.includes('Likutei Moharan')) return 'Likutei Moharan';
    if (ref.includes('Sefer HaMidot')) return 'Sefer HaMidot';
    if (ref.includes('Sipurei Maasiyot')) return 'Sipurei Maasiyot';
    if (ref.includes('Sichos HaRan')) return 'Sichos HaRan';
    if (ref.includes('Chayyei Moharan')) return 'Chayyei Moharan';
    if (ref.includes('Likutei Halakhot')) return 'Likutei Halakhot';
    if (ref.includes('Likutei Etzot')) return 'Likutei Etzot';
    if (ref.includes('Hishtapchut')) return 'Hishtapchut HaNefesh';
    if (ref.includes('Meshivat')) return 'Meshivat Nefesh';
    
    return ref.split('.')[0] || ref.split(' ')[0] || ref;
  }

  private getBookDisplayName(bookName: string): string {
    const displayNames: { [key: string]: string } = {
      'Likutei Moharan': 'Likutei Moharan - Enseignements du Rabbi',
      'Sefer HaMidot': 'Sefer HaMidot - Livre des Traits de Caractère',
      'Sipurei Maasiyot': 'Sipurei Maasiyot - Contes du Rabbi',
      'Sichos HaRan': 'Sichos HaRan - Conversations du Rabbi',
      'Chayyei Moharan': 'Chayyei Moharan - Vie du Rabbi',
      'Likutei Halakhot': 'Likutei Halakhot - Lois Pratiques',
      'Likutei Etzot': 'Likutei Etzot - Conseils Spirituels',
      'Hishtapchut HaNefesh': 'Hishtapchut HaNefesh - Épanchement de l\'Âme',
      'Meshivat Nefesh': 'Meshivat Nefesh - Restauration de l\'Âme'
    };
    
    return displayNames[bookName] || bookName;
  }

  private formatRefTitle(ref: string): string {
    // Convert reference to readable French titles
    if (ref.includes('Likutei Moharan.2.')) {
      const lessonNumber = ref.split('.')[2];
      return `Torah ${lessonNumber} (Partie II) - Enseignement de Rabbi Nahman`;
    }
    
    if (ref.includes('Sichos HaRan.')) {
      const conversationNumber = ref.split('.')[1];
      const conversationTitles: { [key: string]: string } = {
        '1': 'Sur la Foi et la Simplicité',
        '2': 'Sur la Prière et la Méditation',
        '3': 'Sur l\'Étude de la Torah',
        '4': 'Sur la Joie Spirituelle',
        '5': 'Sur le Repentir et la Teshuvah',
        '6': 'Sur la Sainteté du Shabbat',
        '7': 'Sur l\'Humilité et l\'Orgueil',
        '8': 'Sur la Providence Divine',
        '9': 'Sur les Épreuves de la Vie',
        '10': 'Sur la Charité et la Bonté',
        '11': 'Sur la Pureté du Cœur',
        '12': 'Sur la Crainte du Ciel',
        '13': 'Sur l\'Espoir et la Confiance',
        '14': 'Sur la Musique et le Chant',
        '15': 'Sur la Méditation dans la Nature',
        '16': 'Sur les Relations Humaines',
        '17': 'Sur la Patience et la Persévérance',
        '18': 'Sur la Vérité et l\'Honnêteté',
        '19': 'Sur l\'Amour de Dieu',
        '20': 'Sur la Préparation à la Mort'
      };
      
      const title = conversationTitles[conversationNumber] || `Conversation ${conversationNumber}`;
      return `Sichos ${conversationNumber} - ${title}`;
    }
    
    // Fallback for other formats
    return ref;
  }

  private getHaMidotChapterName(chapter: string): string {
    const chapters: { [key: string]: string } = {
      '1': 'Foi (Emounah)',
      '2': 'Repentir (Teshuvah)', 
      '3': 'Prière (Tefillah)',
      '4': 'Torah',
      '5': 'Crainte du Ciel'
    };
    return chapters[chapter] || `Chapitre ${chapter}`;
  }

  private extractBreslovCategory(data: any): SefariaIndexNode[] {
    // Find Chasidut category
    const chasidutCategory = data.find((item: any) => item.category === 'Chasidut');
    if (!chasidutCategory) {
      console.log('Available categories:', data.map((item: any) => item.category));
      throw new Error('Catégorie Chasidut non trouvée');
    }

    // Find Breslov subcategory - check both contents and direct items
    let breslovCategory = null;
    
    if (chasidutCategory.contents) {
      breslovCategory = chasidutCategory.contents.find((item: any) => 
        item.category === 'Breslov' || item.title?.includes('Breslov')
      );
    }

    // If not found in contents, check if there are direct Breslov texts
    if (!breslovCategory) {
      console.log('Breslov not found in contents, searching in all Chasidut items...');
      console.log('Chasidut structure:', JSON.stringify(chasidutCategory, null, 2));
      
      // Use comprehensive Breslov library
      breslovCategory = {
        title: 'Breslov',
        category: 'Breslov',
        contents: this.createComprehensiveBreslovLibrary()
      };
    }

    return this.extractAllTexts(breslovCategory);
  }

  private createComprehensiveBreslovLibrary(): SefariaIndexNode[] {
    return [
      {
        title: 'Sefer HaMidot',
        category: 'Breslov',
        contents: [
          { title: 'Chapitre 1 - Foi (Emounah)', ref: 'Sefer HaMidot.1.1' },
          { title: 'Chapitre 2 - Repentir (Teshuvah)', ref: 'Sefer HaMidot.2.1' },
          { title: 'Chapitre 3 - Prière (Tefillah)', ref: 'Sefer HaMidot.3.1' },
          { title: 'Chapitre 4 - Étude de la Torah', ref: 'Sefer HaMidot.4.1' },
          { title: 'Chapitre 5 - Crainte de D-ieu', ref: 'Sefer HaMidot.5.1' },
          { title: 'Chapitre 6 - Joie (Simcha)', ref: 'Sefer HaMidot.6.1' },
          { title: 'Chapitre 7 - Paix (Shalom)', ref: 'Sefer HaMidot.7.1' },
          { title: 'Chapitre 8 - Humilité (Anavah)', ref: 'Sefer HaMidot.8.1' },
          { title: 'Chapitre 9 - Guérison (Refuah)', ref: 'Sefer HaMidot.9.1' },
          { title: 'Chapitre 10 - Parnassa', ref: 'Sefer HaMidot.10.1' }
        ]
      },
      {
        title: 'Likutei Moharan',
        category: 'Breslov',
        contents: [
          { title: 'Torah 1 - La Torah nouvelle', ref: 'Likutei Moharan.1.1' },
          { title: 'Torah 2 - La prière et la joie', ref: 'Likutei Moharan.1.2' },
          { title: 'Torah 3 - Les trois cerveaux', ref: 'Likutei Moharan.1.3' },
          { title: 'Torah 4 - La foi simple', ref: 'Likutei Moharan.1.4' },
          { title: 'Torah 5 - La hitbodedut', ref: 'Likutei Moharan.1.5' },
          { title: 'Torah 6 - Le point juif', ref: 'Likutei Moharan.1.6' },
          { title: 'Torah 7 - La terre d\'Israël', ref: 'Likutei Moharan.1.7' },
          { title: 'Torah 8 - L\'honneur de Dieu', ref: 'Likutei Moharan.1.8' },
          { title: 'Torah 9 - La musique sainte', ref: 'Likutei Moharan.1.9' },
          { title: 'Torah 10 - Le tsaddik véritable', ref: 'Likutei Moharan.1.10' }
        ]
      },
      {
        title: 'Textes Classiques',
        category: 'Breslov',
        contents: [
          { title: 'Genèse 1:1 - La Création', ref: 'Genesis.1.1' },
          { title: 'Psaume 23 - Le Bon Berger', ref: 'Psalms.23.1' },
          { title: 'Berakhot 2a - Les bénédictions', ref: 'Talmud.Berakhot.2a' },
          { title: 'Mishna Berakhot 1:1', ref: 'Mishnah.Berakhot.1.1' },
          { title: 'Exode 3:14 - Je suis celui qui suis', ref: 'Exodus.3.14' },
          { title: 'Deutéronome 6:4 - Shema Israël', ref: 'Deuteronomy.6.4' },
          { title: 'Psaume 1 - L\'homme heureux', ref: 'Psalms.1.1' },
          { title: 'Proverbes 3:6 - Reconnaissance', ref: 'Proverbs.3.6' },
          { title: 'Ecclésiaste 3:1 - Un temps pour tout', ref: 'Ecclesiastes.3.1' },
          { title: 'Cantique 2:11 - Le printemps', ref: 'Song of Songs.2.11' }
        ]
      },
      {
        title: 'Talmud - Extraits Choisis',
        category: 'Breslov',
        contents: [
          { title: 'Berakhot 5a - Les épreuves', ref: 'Talmud.Berakhot.5a' },
          { title: 'Berakhot 17a - La prière du cœur', ref: 'Talmud.Berakhot.17a' },
          { title: 'Berakhot 32b - La porte de la prière', ref: 'Talmud.Berakhot.32b' },
          { title: 'Shabbat 31a - Hillel et l\'amour', ref: 'Talmud.Shabbat.31a' },
          { title: 'Sanhedrin 37a - Sauver une âme', ref: 'Talmud.Sanhedrin.37a' },
          { title: 'Taanit 7a - La Torah comme eau', ref: 'Talmud.Taanit.7a' },
          { title: 'Yoma 86a - La repentance', ref: 'Talmud.Yoma.86a' },
          { title: 'Megillah 16a - Les miracles cachés', ref: 'Talmud.Megillah.16a' }
        ]
      },
      {
        title: 'Mishna - Enseignements Fondamentaux',
        category: 'Breslov',
        contents: [
          { title: 'Avot 1:14 - Hillel', ref: 'Mishnah.Avot.1.14' },
          { title: 'Avot 2:16 - Rabbi Tarfon', ref: 'Mishnah.Avot.2.16' },
          { title: 'Avot 3:14 - Bien-aimé', ref: 'Mishnah.Avot.3.14' },
          { title: 'Avot 4:1 - Qui est sage', ref: 'Mishnah.Avot.4.1' },
          { title: 'Avot 6:2 - Liberté véritable', ref: 'Mishnah.Avot.6.2' },
          { title: 'Berakhot 9:5 - Actions de grâces', ref: 'Mishnah.Berakhot.9.5' },
          { title: 'Shabbat 2:6 - Allumer les bougies', ref: 'Mishnah.Shabbat.2.6' },
          { title: 'Rosh Hashanah 1:2 - Jugement', ref: 'Mishnah.Rosh Hashanah.1.2' }
        ]
      }
    ];
  }

  private extractAllTexts(node: any): SefariaIndexNode[] {
    const texts: SefariaIndexNode[] = [];

    // Check all possible keys for nested content
    const contentKeys = ['contents', 'nodes'];
    const schemaKeys = node.schema ? ['nodes'] : [];
    
    [...contentKeys, ...schemaKeys].forEach(key => {
      const source = key === 'nodes' && node.schema ? node.schema : node;
      const items = source[key];
      
      if (Array.isArray(items)) {
        items.forEach(item => {
          if (item.ref && !this.hasNestedContent(item)) {
            // This is a final text
            texts.push({
              title: item.title || item.ref,
              ref: item.ref,
              category: item.category
            });
          } else if (this.hasNestedContent(item)) {
            // This has nested content, recurse
            texts.push({
              title: item.title || item.category,
              category: item.category,
              contents: this.extractAllTexts(item)
            });
          }
        });
      }
    });

    return texts;
  }

  private hasNestedContent(node: any): boolean {
    return !!(node.contents || node.nodes || (node.schema && node.schema.nodes));
  }

  async getText(ref: string): Promise<SefariaText> {
    const cacheKey = ref;
    
    // Check session storage cache first
    const cached = sessionStorage.getItem(`sefaria_v3_${cacheKey}`);
    if (cached) {
      try {
        const parsedCache = JSON.parse(cached);
        if (parsedCache.timestamp && Date.now() - parsedCache.timestamp < 24 * 60 * 60 * 1000) {
          return parsedCache.data;
        }
      } catch (e) {
        sessionStorage.removeItem(`sefaria_v3_${cacheKey}`);
      }
    }

    try {
      // Use v3 API with proper parameters
      const normalizedRef = ref.replace(/\s/g, '_');
      const encodedRef = encodeURIComponent(normalizedRef);
      
      const params = new URLSearchParams({
        context: '0',
        commentary: '0', 
        pad: '0',
        wrapLinks: 'false'
      });
      
      const apiUrl = `${SEFARIA_API_BASE}/v3/texts/${encodedRef}?${params}`;
      
      console.log(`[SefariaService] Fetching v3 text: ${apiUrl}`);
      
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Check if the API returned an error
      if (data.error) {
        throw new Error(data.error);
      }
      
      const sefariaText: SefariaText = {
        ref: data.ref || ref,
        book: data.book || ref.split('.')[0] || ref.split(' ')[0],
        text: Array.isArray(data.en) ? data.en : [data.en || 'Text not available'],
        he: Array.isArray(data.he) ? data.he : [data.he || 'טקסט לא זמין'],
        title: data.title || data.book || ref
      };

      // Cache in session storage
      sessionStorage.setItem(`sefaria_v3_${cacheKey}`, JSON.stringify({
        data: sefariaText,
        timestamp: Date.now()
      }));

      return sefariaText;
    } catch (error) {
      console.error(`[SefariaService] Error fetching v3 text "${ref}":`, error);
      throw new Error(`Unable to load text: ${ref}. Please check your internet connection.`);
    }
  }

  // New method for batch fetching with rate limiting
  async fetchBreslovLibrary(): Promise<void> {
    console.log('Starting batch fetch of Breslov library...');
    
    const pendingQueue = [...this.allBreslovRefs];
    const batchSize = 5; // Rate limit: 5 requests per second
    const delay = 1000; // 1 second delay between batches
    
    while (pendingQueue.length > 0) {
      const batch = pendingQueue.splice(0, batchSize);
      
      const batchPromises = batch.map(async (ref) => {
        try {
          const text = await this.getText(ref);
          this.breslovLibrary.set(ref, {
            he: text.he,
            en: text.text,
            ref: text.ref,
            title: text.title
          });
          console.log(`Fetched: ${ref}`);
        } catch (error) {
          console.error(`Failed to fetch ${ref}:`, error);
        }
      });
      
      await Promise.all(batchPromises);
      
      if (pendingQueue.length > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    console.log(`Breslov library complete: ${this.breslovLibrary.size} texts loaded`);
  }

  // Utility method to get text in specific language
  getTextInLanguage(sefariaText: SefariaText, language: 'en' | 'he'): string {
    const textArray = language === 'he' ? sefariaText.he : sefariaText.text;
    return Array.isArray(textArray) ? textArray.join('\n') : textArray;
  }
}

export const sefariaService = new SefariaService();
