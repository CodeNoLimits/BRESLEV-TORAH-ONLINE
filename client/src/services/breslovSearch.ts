import { BreslovCrawler } from "./breslovCrawler";

export interface SearchResult {
  book: string;
  ref: string;
  title: string;
  content: string;
  relevanceScore: number;
}

export class BreslovSearchEngine {
  private crawler: BreslovCrawler;
  private searchableTexts: Map<string, any> = new Map();

  constructor() {
    this.crawler = new BreslovCrawler();
  }

  async initialize(): Promise<void> {
    console.log("[BreslovSearch] Initializing search engine...");

    // Preload all essential texts for searching
    const essentialBooks = [
      "Likutei_Moharan.1",
      "Likutei_Moharan.2",
      "Sichot_HaRan.1",
      "Sippurei_Maasiyot.1",
      "Likutei_Moharan.3",
      "Likutei_Moharan.4",
      "Likutei_Moharan.5",
    ];

    for (const ref of essentialBooks) {
      try {
        const text = await this.crawler.getTextByRef(ref);
        if (text && text.text && text.text.length > 0) {
          this.searchableTexts.set(ref, text);
          console.log(
            `[BreslovSearch] Loaded ${ref}: ${text.text.length} segments`,
          );
        } else {
          console.warn(`[BreslovSearch] No content found for ${ref}`);
        }
      } catch (error) {
        console.warn(`[BreslovSearch] Failed to load ${ref}:`, error);
      }
    }

    console.log(
      `[BreslovSearch] Search engine ready with ${this.searchableTexts.size} books`,
    );
  }

  async searchAcrossLibrary(
    query: string,
    maxResults: number = 5,
  ): Promise<SearchResult[]> {
    console.log(`[BreslovSearch] Searching for: "${query}"`);

    const results: SearchResult[] = [];
    const queryLower = query.toLowerCase();
    const queryWords = queryLower
      .split(/\s+/)
      .filter((word) => word.length > 2);

    for (const [ref, textData] of Array.from(this.searchableTexts.entries())) {
      if (!textData.text || textData.text.length === 0) continue;

      const bookName = this.getBookDisplayName(ref);

      // Search through all segments
      textData.text.forEach((segment: string, index: number) => {
        const segmentLower = segment.toLowerCase();
        let relevanceScore = 0;

        // Calculate relevance based on word matches
        queryWords.forEach((word) => {
          const matches = (segmentLower.match(new RegExp(word, "g")) || [])
            .length;
          relevanceScore += matches;
        });

        // Boost score for exact phrase matches
        if (segmentLower.includes(queryLower)) {
          relevanceScore += 10;
        }

        if (relevanceScore > 0) {
          results.push({
            book: bookName,
            ref: `${ref}:${index + 1}`,
            title: `${bookName} - Segment ${index + 1}`,
            content:
              segment.substring(0, 300) + (segment.length > 300 ? "..." : ""),
            relevanceScore,
          });
        }
      });
    }

    // Sort by relevance and return top results
    return results
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, maxResults);
  }

  private getBookDisplayName(ref: string): string {
    const bookNames: Record<string, string> = {
      "Likutei_Moharan.1": "Likutei Moharan I",
      "Likutei_Moharan.2": "Likutei Moharan II",
      "Likutei_Moharan.3": "Likutei Moharan III",
      "Likutei_Moharan.4": "Likutei Moharan IV",
      "Likutei_Moharan.5": "Likutei Moharan V",
      "Sichot_HaRan.1": "Sichot HaRan I",
      "Sippurei_Maasiyot.1": "Sippurei Maasiyot I",
    };

    return bookNames[ref] || ref.replace(/_/g, " ");
  }

  async generateContextualPrompt(userQuestion: string): Promise<string> {
    const searchResults = await this.searchAcrossLibrary(userQuestion, 3);

    if (searchResults.length === 0) {
      return `QUESTION: ${userQuestion}

CONTEXTE: Aucun texte spécifique trouvé dans la bibliothèque Breslov. Réponds selon les enseignements généraux de Rabbi Nahman.`;
    }

    let contextualPrompt = `QUESTION: ${userQuestion}

CONTEXTE - Textes pertinents trouvés dans la bibliothèque Breslov:

`;

    searchResults.forEach((result, index) => {
      contextualPrompt += `${index + 1}. ${result.title}:
"${result.content}"

`;
    });

    contextualPrompt += `Réponds à la question en te basant sur ces textes authentiques de Rabbi Nahman de Breslov.`;

    return contextualPrompt;
  }

  getLoadedBooks(): string[] {
    return Array.from(this.searchableTexts.keys());
  }
}

// Global search engine instance
export const breslovSearch = new BreslovSearchEngine();
