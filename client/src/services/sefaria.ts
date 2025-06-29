import { SefariaIndexNode, SefariaText, SefariaCategory } from '../types';

const SEFARIA_API_BASE = '/sefaria';

class SefariaService {
  private indexCache: Map<string, any> = new Map();
  private textCache: Map<string, SefariaText> = new Map();
  private breslovLibrary: Map<string, any> = new Map();
  private allBreslovRefs: string[] = [];

  async getIndex(): Promise<SefariaIndexNode[]> {
    const cacheKey = 'breslov_official_catalog_v3';
    
    // Force complete rebuild with new official catalog
    sessionStorage.removeItem('breslov_complete_library');
    sessionStorage.removeItem('breslov_complete_library_v2');
    
    // Check if we have the official catalog
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      try {
        const parsedCache = JSON.parse(cached);
        if (parsedCache.timestamp && Date.now() - parsedCache.timestamp < 6 * 60 * 60 * 1000) { // 6 hour cache
          console.log('Using official Breslov catalog with', parsedCache.data.length, 'works');
          return parsedCache.data;
        }
      } catch (e) {
        sessionStorage.removeItem(cacheKey);
      }
    }

    console.log('Building official Breslov catalog directly...');
    
    // Create the 9 official Breslov works structure
    const officialBreslovCatalog: SefariaIndexNode[] = [
      {
        title: 'Œuvres Fondamentales',
        category: 'Breslov',
        contents: [
          { title: 'Likutei Moharan - Enseignements Principaux', ref: 'Likutei Moharan' },
          { title: 'Sefer HaMiddot - Livre des Traits', ref: 'Sefer HaMiddot' },
          { title: 'Sippurei Maasiyot - Contes Merveilleux', ref: 'Sippurei Maasiyot' },
          { title: 'Sichot HaRan - Conversations du Rabbi', ref: 'Sichot HaRan' }
        ]
      },
      {
        title: 'Pratique Spirituelle',
        category: 'Breslov',
        contents: [
          { title: 'Likkutei Etzot - Recueil de Conseils', ref: 'Likkutei Etzot' },
          { title: 'Likutei Halakhot - Lois Commentées', ref: 'Likutei Halakhot' },
          { title: 'Likutei Tefilot - Prières', ref: 'Likutei Tefilot' }
        ]
      },
      {
        title: 'Biographie et Récits',
        category: 'Breslov',
        contents: [
          { title: 'Chayei Moharan - La Vie de Rabbi Nahman', ref: 'Chayei Moharan' },
          { title: 'Shivchei HaRan - Louanges du Rabbi', ref: 'Shivchei HaRan' }
        ]
      }
    ];
    
    // Cache the official catalog
    sessionStorage.setItem(cacheKey, JSON.stringify({
      data: officialBreslovCatalog,
      timestamp: Date.now(),
      source: 'official_sefaria_catalog'
    }));
    
    console.log(`Official Breslov catalog ready with ${officialBreslovCatalog.length} categories and 9 authentic works`);
    return officialBreslovCatalog;
  }

  // Exhaustive discovery of ALL Breslov references using multiple strategies
  private discoverAllBreslovRefs(indexData: any[]): string[] {
    const breslovRefs: string[] = [];
    const discoveredTitles = new Set<string>();
    
    console.log('Starting comprehensive Breslov discovery...');
    
    const traverseNode = (node: any, path: string = '', isInBreslov: boolean = false) => {
      // Multiple checks for Breslov content
      const title = node.title || node.name || '';
      const category = node.category || '';
      const currentPath = path ? `${path} > ${title}` : title;
      
      const isBreslov = isInBreslov || 
        category === 'Breslov' ||
        category === 'Chasidut' ||
        title.includes('Breslov') ||
        title.includes('Likutei') ||
        title.includes('Sipurei') ||
        title.includes('Sichos') ||
        title.includes('Chayyei') ||
        title.includes('Sefer HaMidot') ||
        title.includes('Rabbi Nachman') ||
        title.includes('Nahman') ||
        title.includes('Uman') ||
        currentPath.includes('Breslov') ||
        currentPath.includes('Nachman');
      
      if (isBreslov) {
        console.log(`Found Breslov content: ${title} (${currentPath})`);
        
        // Collect the main title
        if (title && !discoveredTitles.has(title)) {
          discoveredTitles.add(title);
          breslovRefs.push(title);
        }
        
        // If this has a ref, collect it
        if (node.ref) {
          breslovRefs.push(node.ref);
        }
      }
      
      // Traverse all possible content arrays
      const contentArrays = [
        node.contents,
        node.nodes,
        node.schema?.nodes,
        node.children
      ].filter(Boolean);
      
      contentArrays.forEach(contentArray => {
        if (Array.isArray(contentArray)) {
          contentArray.forEach(child => traverseNode(child, currentPath, isBreslov));
        }
      });
    };
    
    // Strategy 1: Search in Chasidut category
    const chasidutCategory = indexData.find(item => item.category === 'Chasidut');
    if (chasidutCategory) {
      console.log('Exploring Chasidut category...');
      traverseNode(chasidutCategory, 'Chasidut', false);
    }
    
    // Strategy 2: Direct search for known Breslov titles
    console.log('Searching for direct Breslov titles...');
    indexData.forEach(item => {
      const title = item.title || item.name || '';
      if (title.includes('Likutei') || title.includes('Sichos') || title.includes('Sipurei') || 
          title.includes('Chayyei') || title.includes('Sefer HaMidot') || title.includes('Nachman')) {
        traverseNode(item, '', true);
      }
    });
    
    // Strategy 3: Add OFFICIAL Breslov catalog from Sefaria Chasidut > Breslov section
    const officialBreslovCatalog = [
      'Chayei Moharan',       // La Vie de Rabbénou
      'Likkutei Etzot',       // Recueil de conseils  
      'Likutei Halakhot',     // Halakhot commentées par Rabbi Nathan
      'Likutei Moharan',      // Enseignements principaux I & II
      'Likutei Tefilot',      // Prières de Rabbi Nathan
      'Sefer HaMiddot',       // Alphabeta / Livre des attributs
      'Shivchei HaRan',       // Louanges de Rabbénou
      'Sichot HaRan',         // Entretiens de Rabbénou
      'Sippurei Maasiyot'     // Contes merveilleux
    ];
    
    console.log('Adding official Breslov catalog...');
    officialBreslovCatalog.forEach(work => {
      if (!breslovRefs.includes(work)) {
        breslovRefs.push(work);
        console.log(`Added official work: ${work}`);
      }
    });
    
    console.log(`Discovered ${breslovRefs.length} total Breslov references`);
    console.log('Sample discoveries:', breslovRefs.slice(0, 10));
    
    return breslovRefs;
  }

  // Build official Breslov catalog directly without validation
  private buildOfficialBreslovCatalog(): SefariaIndexNode[] {
    console.log('Building official Breslov library...');
    
    // Use the 9 official Breslov works
    const officialWorks = [
      {
        title: 'Chayei Moharan - La Vie de Rabbi Nahman',
        ref: 'Chayei Moharan',
        description: 'Biographie et vie quotidienne du Rabbi'
      },
      {
        title: 'Likkutei Etzot - Recueil de Conseils',
        ref: 'Likkutei Etzot',
        description: 'Conseils pratiques pour la vie spirituelle'
      },
      {
        title: 'Likutei Halakhot - Lois Commentées',
        ref: 'Likutei Halakhot',
        description: 'Halakhot selon l\'enseignement de Rabbi Nahman'
      },
      {
        title: 'Likutei Moharan - Enseignements Principaux',
        ref: 'Likutei Moharan',
        description: 'Les enseignements centraux de Rabbi Nahman'
      },
      {
        title: 'Likutei Tefilot - Prières',
        ref: 'Likutei Tefilot',
        description: 'Prières basées sur les enseignements'
      },
      {
        title: 'Sefer HaMiddot - Livre des Traits',
        ref: 'Sefer HaMiddot',
        description: 'Guide alphabétique des traits de caractère'
      },
      {
        title: 'Shivchei HaRan - Louanges',
        ref: 'Shivchei HaRan',
        description: 'Récits et louanges du Rabbi'
      },
      {
        title: 'Sichot HaRan - Conversations',
        ref: 'Sichot HaRan',
        description: 'Conversations et discussions du Rabbi'
      },
      {
        title: 'Sippurei Maasiyot - Contes',
        ref: 'Sippurei Maasiyot',
        description: 'Les contes merveilleux de Rabbi Nahman'
      }
    ];

    // Create structured library
    const breslovLibrary: SefariaIndexNode[] = [
      {
        title: 'Œuvres Fondamentales',
        category: 'Breslov',
        contents: [
          { title: officialWorks[3].title, ref: officialWorks[3].ref },
          { title: officialWorks[5].title, ref: officialWorks[5].ref },
          { title: officialWorks[8].title, ref: officialWorks[8].ref },
          { title: officialWorks[7].title, ref: officialWorks[7].ref }
        ]
      },
      {
        title: 'Pratique Spirituelle',
        category: 'Breslov',
        contents: [
          { title: officialWorks[1].title, ref: officialWorks[1].ref },
          { title: officialWorks[2].title, ref: officialWorks[2].ref },
          { title: officialWorks[4].title, ref: officialWorks[4].ref }
        ]
      },
      {
        title: 'Biographie et Récits',
        category: 'Breslov',
        contents: [
          { title: officialWorks[0].title, ref: officialWorks[0].ref },
          { title: officialWorks[6].title, ref: officialWorks[6].ref }
        ]
      }
    ];
    
    console.log('Official Breslov library built with', breslovLibrary.length, 'categories and', 
                breslovLibrary.reduce((total, cat) => total + (cat.contents?.length || 0), 0), 'works');
    
    return breslovLibrary;
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

  // Get the first available section reference for a book
  private async getFirstSectionRef(bookTitle: string): Promise<string> {
    try {
      // First try to get the book's index to find valid references
      const indexUrl = `${SEFARIA_API_BASE}/v3/texts/${encodeURIComponent(bookTitle)}?commentary=0&context=0`;
      console.log(`[SefariaService] Getting index for: ${indexUrl}`);
      
      const response = await fetch(indexUrl, {
        headers: { 'Accept': 'application/json' }
      });
      
      if (response.ok) {
        const data = await response.json();
        
        // If we got actual text content, return the book title as-is
        if (data.versions && data.versions.length > 0) {
          return bookTitle;
        }
      }
    } catch (error) {
      console.log(`[SefariaService] Could not get index for ${bookTitle}, using fallback references`);
    }
    
    // Use known working references for each book
    const knownRefs: { [key: string]: string } = {
      'Likutei Moharan': 'Likutei Moharan, I, 1',
      'Sichot HaRan': 'Sichot HaRan 1',
      'Sippurei Maasiyot': 'Sippurei Maasiyot, The Lost Princess',
      'Chayei Moharan': 'Chayei Moharan 1:1',
      'Shivchei HaRan': 'Shivchei HaRan 1',
      'Likutei Halakhot': 'Likutei Halakhot, Orach Chaim, Tefillah 1',
      'Likutei Tefilot': 'Likutei Tefilot 1',
      'Sefer HaMiddot': 'Sefer HaMiddot, Truth 1',
      'Likkutei Etzot': 'Likkutei Etzot, Emunah 1'
    };
    
    return knownRefs[bookTitle] || bookTitle;
  }

  async getText(ref: string): Promise<SefariaText> {
    const cacheKey = ref;
    
    // Check cache first
    const cached = sessionStorage.getItem(`sefaria_text_${cacheKey}`);
    if (cached) {
      try {
        const parsedCache = JSON.parse(cached);
        if (parsedCache.timestamp && Date.now() - parsedCache.timestamp < 24 * 60 * 60 * 1000) {
          return parsedCache.data;
        }
      } catch (e) {
        sessionStorage.removeItem(`sefaria_text_${cacheKey}`);
      }
    }

    try {
      // Use known working references for each Breslov book
      const breslovRefs: { [key: string]: string } = {
        'Likutei Moharan': 'Likutei Moharan, I, 1',
        'Sichot HaRan': 'Sichot HaRan 1',
        'Sippurei Maasiyot': 'Sippurei Maasiyot, The Lost Princess',
        'Chayei Moharan': 'Chayei Moharan 1:1',
        'Shivchei HaRan': 'Shivchei HaRan 1',
        'Likutei Halakhot': 'Likutei Halakhot, Orach Chaim, Tefillah 1',
        'Likutei Tefilot': 'Likutei Tefilot 1',
        'Sefer HaMiddot': 'Sefer HaMiddot, Truth 1',
        'Likkutei Etzot': 'Likkutei Etzot, Emunah 1'
      };
      
      const textRef = breslovRefs[ref] || ref;
      console.log(`[SefariaService] Fetching real text for ${ref} using ref: ${textRef}`);
      
      // Use proxy to fetch from Sefaria v3 API
      const response = await fetch(`${SEFARIA_API_BASE}/v3/texts/${encodeURIComponent(textRef)}?commentary=0&context=0`, {
        method: 'GET',
        headers: { 
          'Accept': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      console.log(`[SefariaService] API Response for ${textRef}:`, data);
      
      // Extract text content from v3 API response
      let englishText: string[] = [];
      let hebrewText: string[] = [];
      
      // V3 API format - check for versions array
      if (data.versions && Array.isArray(data.versions)) {
        console.log(`[SefariaService] Found ${data.versions.length} versions`);
        
        data.versions.forEach((version: any, index: number) => {
          console.log(`[SefariaService] Version ${index}:`, version.versionTitle, version.language);
          
          if (version.language === 'en' && version.text) {
            const text = Array.isArray(version.text) ? version.text : [version.text];
            englishText = text.filter((t: any) => t && t.trim().length > 0);
            console.log(`[SefariaService] English text found: ${englishText.length} segments`);
          }
          
          if (version.language === 'he' && version.text) {
            const text = Array.isArray(version.text) ? version.text : [version.text];
            hebrewText = text.filter((t: any) => t && t.trim().length > 0);
            console.log(`[SefariaService] Hebrew text found: ${hebrewText.length} segments`);
          }
        });
      }
      
      // If no versions found, check direct fields
      if (englishText.length === 0 && hebrewText.length === 0) {
        console.log(`[SefariaService] No versions found, checking direct fields`);
        
        if (data.text) {
          englishText = Array.isArray(data.text) ? data.text : [data.text];
        }
        if (data.he) {
          hebrewText = Array.isArray(data.he) ? data.he : [data.he];
        }
        if (data.en) {
          englishText = Array.isArray(data.en) ? data.en : [data.en];
        }
      }
      
      // Clean HTML and empty entries
      const cleanText = (textArray: string[]): string[] => {
        return textArray
          .map(text => text ? text.replace(/<[^>]*>/g, '').trim() : '')
          .filter(text => text.length > 0);
      };
      
      englishText = cleanText(englishText);
      hebrewText = cleanText(hebrewText);
      
      console.log(`[SefariaService] Final text: EN=${englishText.length} segments, HE=${hebrewText.length} segments`);
      
      // If still no content, this reference doesn't exist on Sefaria
      if (englishText.length === 0 && hebrewText.length === 0) {
        throw new Error(`No text content available for ${textRef} on Sefaria`);
      }
      
      const sefariaText: SefariaText = {
        ref: textRef,
        book: ref,
        text: englishText,
        he: hebrewText,
        title: `${ref} - ${textRef}`
      };
      
      console.log(`[SefariaService] Successfully loaded authentic text for ${ref}:`, {
        actualRef: textRef,
        englishSegments: englishText.length,
        hebrewSegments: hebrewText.length,
        title: sefariaText.title
      });

      // Cache successful results
      sessionStorage.setItem(`sefaria_text_${cacheKey}`, JSON.stringify({
        data: sefariaText,
        timestamp: Date.now()
      }));

      return sefariaText;
      
    } catch (error) {
      console.error(`[SefariaService] Error fetching authentic text "${ref}":`, error);
      throw new Error(`Unable to load text: ${ref}. This text may not be available on Sefaria.`);
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
