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
      const response = await fetch(`${SEFARIA_API_BASE}/index/`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      const breslovTexts = this.extractBreslovCategory(data);
      
      // Cache in session storage
      sessionStorage.setItem(cacheKey, JSON.stringify({
        data: breslovTexts,
        timestamp: Date.now()
      }));
      
      return breslovTexts;
    } catch (error) {
      console.error('Error fetching Sefaria index:', error);
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
      
      // Create a synthetic Breslov category with common Breslov texts
      breslovCategory = {
        title: 'Breslov',
        category: 'Breslov',
        contents: this.createBreslovTextList()
      };
    }

    return this.extractAllTexts(breslovCategory);
  }

  private createBreslovTextList(): SefariaIndexNode[] {
    // Create a list of known Breslov texts based on Sefaria structure
    return [
      {
        title: 'Likutei Moharan',
        ref: 'Likutei Moharan',
        contents: [
          { title: 'Likutei Moharan I, 1', ref: 'Likutei Moharan I, 1' },
          { title: 'Likutei Moharan I, 2', ref: 'Likutei Moharan I, 2' },
          { title: 'Likutei Moharan I, 3', ref: 'Likutei Moharan I, 3' },
          { title: 'Likutei Moharan I, 4', ref: 'Likutei Moharan I, 4' },
          { title: 'Likutei Moharan I, 5', ref: 'Likutei Moharan I, 5' }
        ]
      },
      {
        title: 'Sippurei Maasiyot',
        ref: 'Sippurei Maasiyot',
        contents: [
          { title: 'Histoire 1: Le Roi Perdu', ref: 'Sippurei Maasiyot 1' },
          { title: 'Histoire 2: Le Roi et l\'Empereur', ref: 'Sippurei Maasiyot 2' },
          { title: 'Histoire 3: Le Mendiant Infirme', ref: 'Sippurei Maasiyot 3' }
        ]
      },
      {
        title: 'Likutei Etzot',
        ref: 'Likutei Etzot',
        contents: [
          { title: 'Foi', ref: 'Likutei Etzot, Foi' },
          { title: 'Prière', ref: 'Likutei Etzot, Prière' },
          { title: 'Joie', ref: 'Likutei Etzot, Joie' }
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
    if (this.textCache.has(ref)) {
      return this.textCache.get(ref)!;
    }

    try {
      const encodedRef = ref.replace(/\s/g, '_');
      const response = await fetch(`${SEFARIA_API_BASE}/texts/${encodedRef}?context=1&commentary=0`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      const sefariaText: SefariaText = {
        ref: data.ref || ref,
        book: data.book || ref.split(' ')[0],
        text: Array.isArray(data.text) ? data.text : [data.text || 'Texte non disponible'],
        he: Array.isArray(data.he) ? data.he : [data.he || 'טקסט לא זמין'],
        title: data.title || ref
      };

      this.textCache.set(ref, sefariaText);
      return sefariaText;
    } catch (error) {
      console.error('Error fetching text:', error);
      throw new Error(`Impossible de charger le texte: ${ref}`);
    }
  }

  // Utility method to get text in specific language
  getTextInLanguage(sefariaText: SefariaText, language: 'en' | 'he'): string {
    const textArray = language === 'he' ? sefariaText.he : sefariaText.text;
    return Array.isArray(textArray) ? textArray.join('\n') : textArray;
  }
}

export const sefariaService = new SefariaService();
