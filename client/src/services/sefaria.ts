import { SefariaIndexNode, SefariaText } from '../types';
import { getCachedBreslovIndex, getTextContent } from './sefariaProxy';

class SefariaService {
  private textCache: Map<string, SefariaText> = new Map();

  async getIndex(): Promise<SefariaIndexNode[]> {
    console.log('[SefariaService] Getting Breslov index via proxy');
    return getCachedBreslovIndex();
  }

  async getText(ref: string): Promise<SefariaText> {
    const cacheKey = ref;
    
    // Check cache first
    if (this.textCache.has(cacheKey)) {
      console.log(`[SefariaService] Using cached text for ${ref}`);
      return this.textCache.get(cacheKey)!;
    }

    try {
      console.log(`[SefariaService] Fetching text via proxy for ${ref}`);
      const text = await getTextContent(ref);
      
      // Cache the result
      this.textCache.set(cacheKey, text);
      
      return text;
    } catch (error) {
      console.error(`[SefariaService] Error fetching text "${ref}":`, error);
      throw new Error(`Unable to load text: ${ref}. Please check your connection.`);
    }
  }

  getTextInLanguage(sefariaText: SefariaText, language: 'en' | 'he'): string {
    const textArray = language === 'he' ? sefariaText.he : sefariaText.text;
    return textArray.join('\n\n');
  }

  async fetchBreslovLibrary(): Promise<void> {
    // This method is kept for compatibility but uses proxy
    await this.getIndex();
  }
}

export const sefariaService = new SefariaService();