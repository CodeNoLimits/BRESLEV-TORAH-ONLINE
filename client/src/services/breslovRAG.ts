
import { breslovCrawler } from './breslovCrawler';
import { breslovComplete } from './breslovComplete';

export interface RAGResult {
  content: string;
  book: string;
  section: string;
  score: number;
  reference: string;
}

class BreslovRAGService {
  private textIndex: Map<string, any> = new Map();
  private isIndexed = false;

  async buildIndex(): Promise<void> {
    if (this.isIndexed) return;
    
    console.log('[BreslovRAG] Building comprehensive text index...');
    
    // Index from crawler cache
    const cache = breslovCrawler.getCache();
    for (const [ref, data] of Object.entries(cache)) {
      if (data?.text && Array.isArray(data.text)) {
        this.textIndex.set(ref, {
          text: data.text,
          he: data.he || [],
          title: ref.replace(/_/g, ' ')
        });
      }
    }
    
    // Index from breslovComplete - DÉSACTIVÉ pour éviter l'erreur
    console.log('[BreslovRAG] Skipping breslovComplete indexing - using crawler cache only');
    
    this.isIndexed = true;
    console.log(`[BreslovRAG] ✅ Index built with ${this.textIndex.size} texts`);
  }

  async search(query: string, maxResults: number = 10): Promise<RAGResult[]> {
    await this.buildIndex();
    
    const queryLower = query.toLowerCase();
    const queryWords = queryLower.split(/\s+/).filter(word => word.length > 2);
    const results: RAGResult[] = [];

    for (const [ref, data] of this.textIndex) {
      if (!data.text) continue;
      
      data.text.forEach((segment: string, index: number) => {
        const segmentLower = segment.toLowerCase();
        let score = 0;

        // Word matching
        queryWords.forEach(word => {
          const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const matches = (segmentLower.match(new RegExp(escapedWord, 'g')) || []).length;
          score += matches * 2;
        });

        // Exact phrase matching
        if (segmentLower.includes(queryLower)) {
          score += 20;
        }

        // Contextual keywords
        const spiritualKeywords = ['torah', 'mitzvah', 'teshuva', 'emunah', 'bitachon', 'kedusha', 'tahara'];
        spiritualKeywords.forEach(keyword => {
          if (segmentLower.includes(keyword) && queryLower.includes(keyword)) {
            score += 5;
          }
        });

        if (score > 0) {
          results.push({
            content: segment.substring(0, 500) + (segment.length > 500 ? '...' : ''),
            book: data.title,
            section: `${index + 1}`,
            score,
            reference: `${ref}:${index + 1}`
          });
        }
      });
    }

    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, maxResults);
  }

  async getRelevantContext(question: string): Promise<string> {
    const results = await this.search(question, 8);
    
    if (results.length === 0) {
      return "Aucun contexte spécifique trouvé dans les textes de Rabbi Nahman.";
    }

    let context = "CONTEXTE AUTHENTIQUE DES ENSEIGNEMENTS DE RABBI NAHMAN:\n\n";
    
    results.forEach((result, index) => {
      context += `${index + 1}. ${result.book} (${result.section}):\n`;
      context += `"${result.content}"\n\n`;
    });

    context += "---\nRéponds uniquement en te basant sur ces textes authentiques.";
    
    return context;
  }
}

export const breslovRAG = new BreslovRAGService();
