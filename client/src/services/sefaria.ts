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
      console.log(`[SefariaService] Using cached authentic text for ${ref}`);
      return this.textCache.get(cacheKey)!;
    }

    console.log(`[SefariaService] Fetching COMPLETE authentic text via proxy for ${ref}`);
    const text = await getTextContent(ref);
    
    // Verify we received complete authentic content
    if (!text.text || text.text.length === 0 || !text.he || text.he.length === 0) {
      throw new Error(`CRITICAL: Incomplete authentic text received for ${ref}. Refusing to display partial content.`);
    }
    
    // Cache only complete authentic content
    this.textCache.set(cacheKey, text);
    console.log(`[SefariaService] Cached COMPLETE authentic text for ${ref}: EN(${text.text.length}) HE(${text.he.length})`);
    
    return text;
  }

  getTextInLanguage(sefariaText: SefariaText, language: 'en' | 'he' | 'fr'): string {
    if (language === 'fr') {
      // Pour le français, utiliser l'anglais comme base et indiquer qu'une traduction est nécessaire
      const textArray = sefariaText.text;
      return textArray.join('\n\n');
    }
    
    const textArray = language === 'he' ? sefariaText.he : sefariaText.text;
    return textArray.join('\n\n');
  }

  async getTranslatedText(sefariaText: SefariaText, targetLanguage: 'fr'): Promise<string> {
    // Pour le français, nous utilisons l'IA pour traduire le texte anglais
    const englishText = this.getTextInLanguage(sefariaText, 'en');
    
    if (targetLanguage === 'fr') {
      // Retourner le texte avec une note de traduction pour l'IA
      return `[TEXTE À TRADUIRE EN FRANÇAIS]\n${englishText}\n[FIN DU TEXTE]`;
    }
    
    return englishText;
  }

  async fetchBreslovLibrary(): Promise<void> {
    // This method is kept for compatibility but uses proxy
    await this.getIndex();
  }
}

export const sefariaService = new SefariaService();