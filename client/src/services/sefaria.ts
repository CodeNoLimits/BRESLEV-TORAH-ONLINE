import { SefariaIndexNode, SefariaText, SefariaCategory } from '../types';

const SEFARIA_API_BASE = '/api/sefaria';

class SefariaService {
  private indexCache: Map<string, any> = new Map();
  private textCache: Map<string, SefariaText> = new Map();

  async getIndex(): Promise<SefariaIndexNode[]> {
    const cacheKey = 'breslov_texts';
    
    // Check session storage cache first
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      try {
        const parsedCache = JSON.parse(cached);
        if (parsedCache.timestamp && Date.now() - parsedCache.timestamp < 24 * 60 * 60 * 1000) {
          return parsedCache.data;
        }
      } catch (e) {
        sessionStorage.removeItem(cacheKey);
      }
    }

    try {
      // Create comprehensive Breslov library with known texts from Sefaria
      const breslovTexts = this.createComprehensiveBreslovLibrary();
      
      // Cache in session storage
      sessionStorage.setItem(cacheKey, JSON.stringify({
        data: breslovTexts,
        timestamp: Date.now()
      }));
      
      return breslovTexts;
    } catch (error) {
      console.error('Error creating Breslov library:', error);
      throw new Error('Impossible de charger la bibliothèque. Vérifiez votre connexion internet.');
    }
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
      // Properly encode the reference for the API
      const encodedRef = encodeURIComponent(ref);
      const apiUrl = `${SEFARIA_API_BASE}/texts/${encodedRef}`;
      
      console.log(`Fetching text from Sefaria: ${apiUrl}`);
      
      const response = await fetch(apiUrl);
      
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
        text: Array.isArray(data.text) ? data.text : [data.text || 'Text not available'],
        he: Array.isArray(data.he) ? data.he : [data.he || 'טקסט לא זמין'],
        title: data.title || data.book || ref
      };

      // Cache in session storage
      sessionStorage.setItem(`sefaria_text_${cacheKey}`, JSON.stringify({
        data: sefariaText,
        timestamp: Date.now()
      }));

      return sefariaText;
    } catch (error) {
      console.error(`Error fetching text "${ref}":`, error);
      throw new Error(`Unable to load text: ${ref}. Please check your internet connection.`);
    }
  }

  // Utility method to get text in specific language
  getTextInLanguage(sefariaText: SefariaText, language: 'en' | 'he'): string {
    const textArray = language === 'he' ? sefariaText.he : sefariaText.text;
    return Array.isArray(textArray) ? textArray.join('\n') : textArray;
  }
}

export const sefariaService = new SefariaService();
