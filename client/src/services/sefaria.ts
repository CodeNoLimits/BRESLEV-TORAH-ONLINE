import { SefariaIndexNode, SefariaText, SefariaCategory } from '../types';

const SEFARIA_API_BASE = 'https://www.sefaria.org/api';

class SefariaService {
  private indexCache: Map<string, any> = new Map();
  private textCache: Map<string, SefariaText> = new Map();

  async getIndex(): Promise<SefariaIndexNode[]> {
    const cacheKey = 'main_index';
    
    if (this.indexCache.has(cacheKey)) {
      return this.indexCache.get(cacheKey);
    }

    try {
      const response = await fetch(`${SEFARIA_API_BASE}/index/`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      const breslovTexts = this.extractBreslovCategory(data);
      
      this.indexCache.set(cacheKey, breslovTexts);
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
      throw new Error('Catégorie Chasidut non trouvée');
    }

    // Find Breslov subcategory
    const breslovCategory = chasidutCategory.contents?.find((item: any) => 
      item.category === 'Breslov' || item.title?.includes('Breslov')
    );

    if (!breslovCategory) {
      throw new Error('Catégorie Breslov non trouvée');
    }

    return this.extractAllTexts(breslovCategory);
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
