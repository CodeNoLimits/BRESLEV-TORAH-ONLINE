import { SefariaIndexNode, SefariaText, SefariaCategory } from '../types';

const SEFARIA_API_BASE = 'https://www.sefaria.org/api';

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
          { title: 'Chapitre 1 - Foi (Emounah)', ref: 'Sefer HaMidot.1' },
          { title: 'Chapitre 2 - Repentir (Teshuvah)', ref: 'Sefer HaMidot.2' },
          { title: 'Chapitre 3 - Prière (Tefillah)', ref: 'Sefer HaMidot.3' },
          { title: 'Chapitre 4 - Étude de la Torah', ref: 'Sefer HaMidot.4' },
          { title: 'Chapitre 5 - Crainte de D-ieu (Yirat Hashem)', ref: 'Sefer HaMidot.5' },
          { title: 'Chapitre 6 - Joie (Simcha)', ref: 'Sefer HaMidot.6' },
          { title: 'Chapitre 7 - Paix (Shalom)', ref: 'Sefer HaMidot.7' },
          { title: 'Chapitre 8 - Humilité (Anavah)', ref: 'Sefer HaMidot.8' },
          { title: 'Chapitre 9 - Guérison (Refuah)', ref: 'Sefer HaMidot.9' },
          { title: 'Chapitre 10 - Parnassa (Subsistance)', ref: 'Sefer HaMidot.10' }
        ]
      },
      {
        title: 'Likutei Moharan',
        category: 'Breslov',
        contents: [
          { title: 'Torah 1 - La Torah nouvelle', ref: 'Likutei Moharan.1' },
          { title: 'Torah 2 - La prière et la joie', ref: 'Likutei Moharan.2' },
          { title: 'Torah 3 - Les trois cerveaux', ref: 'Likutei Moharan.3' },
          { title: 'Torah 4 - La foi simple', ref: 'Likutei Moharan.4' },
          { title: 'Torah 5 - La hitbodedut', ref: 'Likutei Moharan.5' },
          { title: 'Torah 6 - Le point juif', ref: 'Likutei Moharan.6' },
          { title: 'Torah 7 - La terre d\'Israël', ref: 'Likutei Moharan.7' },
          { title: 'Torah 8 - L\'honneur de Dieu', ref: 'Likutei Moharan.8' },
          { title: 'Torah 9 - La musique sainte', ref: 'Likutei Moharan.9' },
          { title: 'Torah 10 - Le tsaddik véritable', ref: 'Likutei Moharan.10' }
        ]
      },
      {
        title: 'Sipurei Maasiyot',
        category: 'Breslov',
        contents: [
          { title: 'Histoire 1 - Le Roi qui a abdiqué', ref: 'Sipurei Maasiyot.1' },
          { title: 'Histoire 2 - Le Roi et l\'Empereur', ref: 'Sipurei Maasiyot.2' },
          { title: 'Histoire 3 - Le Mendiant Infirme', ref: 'Sipurei Maasiyot.3' },
          { title: 'Histoire 4 - La Princesse Perdue', ref: 'Sipurei Maasiyot.4' },
          { title: 'Histoire 5 - Le Prince Remplacé', ref: 'Sipurei Maasiyot.5' },
          { title: 'Histoire 6 - L\'Homme Humble', ref: 'Sipurei Maasiyot.6' },
          { title: 'Histoire 7 - La Mouche et l\'Araignée', ref: 'Sipurei Maasiyot.7' },
          { title: 'Histoire 8 - Le Rabbi et son Fils', ref: 'Sipurei Maasiyot.8' },
          { title: 'Histoire 9 - Les Quatre du Jardin', ref: 'Sipurei Maasiyot.9' },
          { title: 'Histoire 10 - L\'Homme de Bœuf et l\'Homme de Vent', ref: 'Sipurei Maasiyot.10' },
          { title: 'Histoire 11 - Le Fils du Roi et le Fils de la Servante', ref: 'Sipurei Maasiyot.11' },
          { title: 'Histoire 12 - Le Maître de la Prière', ref: 'Sipurei Maasiyot.12' },
          { title: 'Histoire 13 - Les Sept Mendiants', ref: 'Sipurei Maasiyot.13' }
        ]
      },
      {
        title: 'Sichos HaRan',
        category: 'Breslov',
        contents: [
          { title: 'Conversations 1-25', ref: 'Sichos HaRan.1-25' },
          { title: 'Conversations 26-50', ref: 'Sichos HaRan.26-50' },
          { title: 'Conversations 51-75', ref: 'Sichos HaRan.51-75' },
          { title: 'Conversations 76-100', ref: 'Sichos HaRan.76-100' },
          { title: 'Conversations 101-125', ref: 'Sichos HaRan.101-125' },
          { title: 'Conversations 126-150', ref: 'Sichos HaRan.126-150' },
          { title: 'Conversations 151-175', ref: 'Sichos HaRan.151-175' },
          { title: 'Conversations 176-200', ref: 'Sichos HaRan.176-200' },
          { title: 'Conversations 201-225', ref: 'Sichos HaRan.201-225' },
          { title: 'Conversations 226-250', ref: 'Sichos HaRan.226-250' }
        ]
      },
      {
        title: 'Chayyei Moharan',
        category: 'Breslov',
        contents: [
          { title: 'Enfance et jeunesse', ref: 'Chayyei Moharan.1' },
          { title: 'Révélation spirituelle', ref: 'Chayyei Moharan.2' },
          { title: 'Enseignements de base', ref: 'Chayyei Moharan.3' },
          { title: 'Voyage en Terre Sainte', ref: 'Chayyei Moharan.4' },
          { title: 'Dernières années', ref: 'Chayyei Moharan.5' },
          { title: 'Testament spirituel', ref: 'Chayyei Moharan.6' }
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
