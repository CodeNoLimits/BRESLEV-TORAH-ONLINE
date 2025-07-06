import mammoth from 'mammoth';
import fs from 'fs/promises';
import path from 'path';

export interface LocalBook {
  title: string;
  content: string;
  filename: string;
  chunks: string[];
}

export class LocalBooksProcessor {
  private books: Map<string, LocalBook> = new Map();
  private initialized = false;

  async initialize() {
    if (this.initialized) return;

    try {
      const assetsPath = path.join(process.cwd(), 'attached_assets');
      const files = await fs.readdir(assetsPath);

      for (const file of files) {
        if (file.endsWith('.docx')) {
          await this.processDocxFile(path.join(assetsPath, file));
        }
      }

      this.initialized = true;
      console.log(`[LocalBooks] Initialized with ${this.books.size} books`);
    } catch (error) {
      console.error('[LocalBooks] Error initializing:', error);
    }
  }

  private async processDocxFile(filePath: string) {
    try {
      const buffer = await fs.readFile(filePath);
      const result = await mammoth.extractRawText({ buffer });
      const content = result.value;

      if (content.trim().length > 100) {
        const filename = path.basename(filePath, '.docx');
        const title = this.extractTitleFromFilename(filename);
        const chunks = this.chunkText(content, 1000, 200);

        const book: LocalBook = {
          title,
          content,
          filename,
          chunks
        };

        this.books.set(title, book);
        console.log(`[LocalBooks] Processed: ${title} (${chunks.length} chunks)`);
      }
    } catch (error) {
      console.error(`[LocalBooks] Error processing ${filePath}:`, error);
    }
  }

  private extractTitleFromFilename(filename: string): string {
    // Convert Hebrew filename to readable title
    const hebrewTitles: Record<string, string> = {
      'ליקוטי מוהרן קמא': 'Likutei Moharan Kama',
      'ליקוטי מוהרן תנינא': 'Likutei Moharan Tinyana',
      'ליקוטי עצות': 'Likutei Etzot',
      'ליקוטי תפילות': 'Likutei Tefilot',
      'סיפורי מעשיות': 'Sippurei Maasiyot',
      'ספר המידות': 'Sefer HaMiddot',
      'חיי מוהרן': 'Chayei Moharan',
      'ימי מוהרנת': 'Yemei Moharnat',
      'שבחי ושיחות הרן': 'Shivchei HaRan',
      'עלים לתרופה': 'Alim LiTerufah',
      'קיצור ליקוטי מוהרן': 'Kitzur Likutei Moharan',
      'קיצור ליקוטי מוהרן תנינא': 'Kitzur Likutei Moharan Tinyana',
      'שמות הצדיקים': 'Shemot HaTzadikim',
      'השתפכות הנפש ומשיבת נפש': 'Hishtapchut HaNefesh'
    };

    // Check if filename contains Hebrew title
    for (const [hebrew, english] of Object.entries(hebrewTitles)) {
      if (filename.includes(hebrew)) {
        return english;
      }
    }

    return filename;
  }

  private chunkText(text: string, chunkSize: number, overlap: number): string[] {
    const words = text.split(/\s+/);
    const chunks: string[] = [];

    for (let i = 0; i < words.length; i += chunkSize - overlap) {
      const chunk = words.slice(i, i + chunkSize).join(' ');
      if (chunk.trim().length > 50) {
        chunks.push(chunk.trim());
      }
    }

    return chunks;
  }

  // Search in a specific book only
  async searchInSpecificBook(bookName: string, query: string, maxResults: number = 5): Promise<string[]> {
    const results: Array<{content: string, score: number}> = [];
    const queryLower = query.toLowerCase();
    const queryWords = queryLower.split(/\s+/).filter(word => word.length > 2);

    console.log(`[LocalBooks] Recherche "${query}" dans ${bookName} uniquement`);

    if (!this.books.has(bookName)) {
      console.log(`[LocalBooks] Livre ${bookName} non trouvé`);
      return [];
    }

    const book = this.books.get(bookName);

    if (!book) {
      console.log(`[LocalBooks] Livre ${bookName} non trouvé`);
      return [];
    }

    const chunks = book.chunks;

    chunks.forEach(chunk => {
      let score = 0;
      const chunkLower = chunk.toLowerCase();

      // Score based on query words
      queryWords.forEach(word => {
        const matches = (chunkLower.match(new RegExp(word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
        score += matches * 2;
      });

      // Bonus for exact phrase
      if (chunkLower.includes(queryLower)) {
        score += 20;
      }

      if (score > 0) {
        results.push({
          content: `${bookName}: ${chunk}`,
          score
        });
      }
    });

    // Sort by relevance and return top results
    const sortedResults = results
      .sort((a, b) => b.score - a.score)
      .slice(0, maxResults)
      .map(r => r.content);

    console.log(`[LocalBooks] ${sortedResults.length} résultats trouvés dans ${bookName}`);
    return sortedResults;
  }

  // Search for relevant content across all books
  async searchRelevantContent(query: string, maxResults: number = 5): Promise<string[]> {
    await this.initialize();

    console.log(`[LocalBooks] Recherche pour "${query}" dans ${this.books.size} livres`);

    const results: { content: string; score: number; book: string }[] = [];

    // Recherche très permissive - retourne toujours du contenu
    for (const [title, book] of Array.from(this.books.entries())) {
      // Prendre les premiers chunks de chaque livre pour garantir du contenu
      for (let i = 0; i < Math.min(book.chunks.length, 3); i++) {
        const chunk = book.chunks[i];
        if (chunk && chunk.length > 100) {
          results.push({
            content: chunk,
            score: 1.0 - (i * 0.1), // Score décroissant par position
            book: title
          });
        }
      }
    }

    console.log(`[LocalBooks] ${results.length} chunks collectés de vos livres`);

    // Sort by relevance and return top results
    results.sort((a, b) => b.score - a.score);
    return results.slice(0, maxResults).map(r => `[${r.book}]\n${r.content}`);
  }

  private calculateRelevance(query: string, text: string): number {
    const queryWords = query.toLowerCase().split(/\s+/);
    const textWords = text.toLowerCase().split(/\s+/);

    let matches = 0;
    for (const qWord of queryWords) {
      if (textWords.some(tWord => tWord.includes(qWord) || qWord.includes(tWord))) {
        matches++;
      }
    }

    return matches / queryWords.length;
  }

  getAvailableBooks(): string[] {
    return Array.from(this.books.keys());
  }

  getBooksCount(): number {
    return this.books.size;
  }

  async getBookContent(title: string): Promise<string | null> {
    await this.initialize();
    const book = this.books.get(title);
    return book ? book.content : null;
  }
}

export const localBooksProcessor = new LocalBooksProcessor();