import { GoogleGenerativeAI } from '@google/generative-ai';
import mammoth from 'mammoth';
import fs from 'fs';
import path from 'path';

const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export interface BookChunk {
  id: string;
  bookId: string;
  content: string;
  startLine: number;
  endLine: number;
  keywords: string[];
}

export interface Book {
  id: string;
  title: string;
  titleFrench: string;
  titleHebrew?: string;
  filename: string;
  language: 'french' | 'hebrew' | 'mixed';
  chunks: BookChunk[];
  lines: string[];
  totalLines: number;
  totalCharacters: number;
  initialized: boolean;
}

export class MultiBookProcessor {
  private books: Map<string, Book> = new Map();
  private initialized = false;

  async initialize() {
    if (this.initialized) return;
    
    console.log('[MultiBook] Initialisation du processeur multi-livres...');
    
    // Pour l'instant, on charge uniquement Chayei Moharan
    await this.loadBook({
      id: 'chayei-moharan-fr',
      title: 'Chayei Moharan',
      titleFrench: 'Chayei Moharan (Vie de Rabbi Nahman)',
      filename: 'CHAYE MOHARAN FR_1751542665093.docx',
      language: 'french'
    });
    
    this.initialized = true;
    console.log(`[MultiBook] Initialisé avec ${this.books.size} livre(s)`);
  }

  async loadBook(bookConfig: {
    id: string;
    title: string;
    titleFrench: string;
    titleHebrew?: string;
    filename: string;
    language: 'french' | 'hebrew' | 'mixed';
  }) {
    const filePath = path.join(process.cwd(), 'attached_assets', bookConfig.filename);
    
    if (!fs.existsSync(filePath)) {
      console.error(`[MultiBook] Fichier non trouvé: ${filePath}`);
      return;
    }

    console.log(`[MultiBook] Chargement du livre: ${bookConfig.title}`);
    
    try {
      const result = await mammoth.extractRawText({ path: filePath });
      const fullText = result.value;
      const lines = fullText.split('\n');
      
      const book: Book = {
        ...bookConfig,
        chunks: [],
        lines,
        totalLines: lines.length,
        totalCharacters: fullText.length,
        initialized: true
      };
      
      // Créer des chunks de 30 lignes avec chevauchement
      const chunkSize = 30;
      const overlap = 5;
      
      for (let i = 0; i < lines.length; i += (chunkSize - overlap)) {
        const endIndex = Math.min(i + chunkSize, lines.length);
        const chunkLines = lines.slice(i, endIndex);
        const chunkContent = chunkLines.join('\n');
        
        if (chunkContent.trim().length > 50) {
          const chunk: BookChunk = {
            id: `${bookConfig.id}_chunk_${i}`,
            bookId: bookConfig.id,
            content: chunkContent,
            startLine: i,
            endLine: endIndex,
            keywords: this.extractKeywords(chunkContent)
          };
          
          book.chunks.push(chunk);
        }
      }
      
      this.books.set(bookConfig.id, book);
      console.log(`[MultiBook] Livre chargé: ${bookConfig.title} - ${lines.length} lignes, ${book.chunks.length} chunks`);
      
    } catch (error) {
      console.error(`[MultiBook] Erreur chargement ${bookConfig.title}:`, error);
    }
  }

  private extractKeywords(text: string): string[] {
    const keywords: string[] = [];
    const importantWords = text.match(/[A-Z][a-zàâäéèêëïîôùûüÿçœæ]+/g) || [];
    
    importantWords.forEach(word => {
      if (word.length > 3 && !keywords.includes(word)) {
        keywords.push(word.toLowerCase());
      }
    });
    
    return keywords;
  }

  async searchAcrossBooks(query: string, bookIds?: string[]): Promise<{
    answer: string;
    bookResults: Array<{
      bookId: string;
      bookTitle: string;
      relevantChunks: BookChunk[];
      foundInBook: boolean;
    }>;
    overallFound: boolean;
  }> {
    await this.initialize();
    
    const booksToSearch = bookIds 
      ? Array.from(this.books.values()).filter(book => bookIds.includes(book.id))
      : Array.from(this.books.values());
    
    console.log(`[MultiBook] Recherche dans ${booksToSearch.length} livre(s): "${query}"`);
    
    const queryLower = query.toLowerCase();
    const queryWords = queryLower.split(' ').filter(w => w.length > 2);
    
    const bookResults = [];
    let allRelevantChunks: BookChunk[] = [];
    
    // Rechercher dans chaque livre
    for (const book of booksToSearch) {
      const scoredChunks = book.chunks.map(chunk => {
        let score = 0;
        const contentLower = chunk.content.toLowerCase();
        
        queryWords.forEach(word => {
          if (contentLower.includes(word)) {
            score += 10;
            const matches = (contentLower.match(new RegExp(word, 'g')) || []).length;
            score += matches * 5;
          }
        });
        
        chunk.keywords.forEach(keyword => {
          if (queryLower.includes(keyword)) {
            score += 15;
          }
        });
        
        return { chunk, score };
      });
      
      const relevantChunks = scoredChunks
        .filter(item => item.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 5)
        .map(item => item.chunk);
      
      bookResults.push({
        bookId: book.id,
        bookTitle: book.titleFrench,
        relevantChunks,
        foundInBook: relevantChunks.length > 0
      });
      
      allRelevantChunks = [...allRelevantChunks, ...relevantChunks];
    }
    
    // Générer la réponse avec Gemini
    const contextForGemini = this.buildGeminiContext(query, bookResults, allRelevantChunks);
    
    try {
      const response = await ai.getGenerativeModel({ model: "gemini-1.5-flash" }).generateContent(contextForGemini);
      const answer = response.response.text() || "Aucune réponse générée";
      
      return {
        answer,
        bookResults,
        overallFound: allRelevantChunks.length > 0
      };
    } catch (error) {
      console.error('[MultiBook] Erreur Gemini:', error);
      
      return {
        answer: "Erreur lors de l'analyse. " + this.generateFallbackAnswer(bookResults),
        bookResults,
        overallFound: allRelevantChunks.length > 0
      };
    }
  }

  private buildGeminiContext(query: string, bookResults: any[], allChunks: BookChunk[]): string {
    return `Tu es un compagnon spirituel expert des textes de Rabbi Nahman de Breslov.
Tu as accès à plusieurs livres et tu dois répondre de manière conversationnelle et profonde.

LIVRES DISPONIBLES:
${bookResults.map(result => `- ${result.bookTitle}: ${result.foundInBook ? 'Contient des informations pertinentes' : 'Aucune information trouvée'}`).join('\n')}

PASSAGES PERTINENTS TROUVÉS:
${allChunks.length > 0 ? 
  allChunks.map((chunk, index) => {
    const book = this.books.get(chunk.bookId);
    return `
--- LIVRE: ${book?.titleFrench} | Lignes ${chunk.startLine}-${chunk.endLine} ---
${chunk.content}
--- FIN DU PASSAGE ---`;
  }).join('\n') :
  'Aucun passage directement pertinent trouvé dans les textes.'
}

QUESTION: ${query}

INSTRUCTIONS:
1. Réponds de manière conversationnelle et chaleureuse
2. Si tu trouves l'information, explique le contexte et la signification spirituelle
3. Cite les livres et les passages spécifiques
4. Si l'information n'est pas trouvée, dis-le clairement mais offre une réflexion basée sur ta connaissance générale des enseignements
5. Fais des liens entre différents livres si pertinent`;
  }

  private generateFallbackAnswer(bookResults: any[]): string {
    const booksWithContent = bookResults.filter(r => r.foundInBook);
    if (booksWithContent.length > 0) {
      return `J'ai trouvé des passages pertinents dans: ${booksWithContent.map(r => r.bookTitle).join(', ')}`;
    }
    return "Je n'ai pas trouvé de passages directement liés à votre question dans les textes disponibles.";
  }

  async searchInSpecificBook(bookId: string, query: string): Promise<{
    answer: string;
    sources: string[];
    relevantChunks: BookChunk[];
    foundInDocument: boolean;
  }> {
    const result = await this.searchAcrossBooks(query, [bookId]);
    const bookResult = result.bookResults[0];
    
    return {
      answer: result.answer,
      sources: bookResult.relevantChunks.map(chunk => `Lignes ${chunk.startLine}-${chunk.endLine}`),
      relevantChunks: bookResult.relevantChunks,
      foundInDocument: bookResult.foundInBook
    };
  }

  getAvailableBooks(): Array<{
    id: string;
    title: string;
    titleFrench: string;
    titleHebrew?: string;
    language: string;
    stats: {
      lines: number;
      chunks: number;
      characters: number;
    };
  }> {
    return Array.from(this.books.values()).map(book => ({
      id: book.id,
      title: book.title,
      titleFrench: book.titleFrench,
      titleHebrew: book.titleHebrew,
      language: book.language,
      stats: {
        lines: book.totalLines,
        chunks: book.chunks.length,
        characters: book.totalCharacters
      }
    }));
  }

  async addNewBook(bookConfig: {
    id: string;
    title: string;
    titleFrench: string;
    titleHebrew?: string;
    filename: string;
    language: 'french' | 'hebrew' | 'mixed';
  }): Promise<boolean> {
    try {
      await this.loadBook(bookConfig);
      return true;
    } catch (error) {
      console.error('[MultiBook] Erreur ajout livre:', error);
      return false;
    }
  }
}

export const multiBookProcessor = new MultiBookProcessor();