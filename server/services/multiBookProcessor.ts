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
  isRTL?: boolean; // Pour l'hébreu
  cachedTranslation?: string; // Cache de traduction
  translationTimestamp?: number;
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
  private translationCache = new Map<string, { translation: string; timestamp: number }>();
  private translationCacheTimeout = 30 * 60 * 1000; // 30 minutes

  async initialize() {
    if (this.initialized) return;
    
    console.log('[MultiBook] Initialisation du processeur multi-livres...');
    
    // Charger Chayei Moharan français
    await this.loadBook({
      id: 'chayei-moharan-fr',
      title: 'Chayei Moharan',
      titleFrench: 'Chayei Moharan (Vie de Rabbi Nahman)',
      filename: 'CHAYE MOHARAN FR_1751542665093.docx',
      language: 'french'
    });
    
    // Charger tous les livres hébreux
    try {
      const { loadAllHebrewBooks } = await import('../loadHebrewBooks.js');
      await loadAllHebrewBooks();
    } catch (error) {
      console.error('[MultiBook] Erreur chargement livres hébreux:', error);
    }
    
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
            keywords: this.extractKeywords(chunkContent),
            isRTL: this.isHebrewText(chunkContent)
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
    
    // Pour le français
    const frenchWords = text.match(/[A-Z][a-zàâäéèêëïîôùûüÿçœæ]+/g) || [];
    
    // Pour l'hébreu
    const hebrewWords = text.match(/[\u0590-\u05FF]{3,}/g) || [];
    
    frenchWords.forEach(word => {
      if (word.length > 3 && !keywords.includes(word)) {
        keywords.push(word.toLowerCase());
      }
    });
    
    hebrewWords.forEach(word => {
      if (!keywords.includes(word)) {
        keywords.push(word);
      }
    });
    
    return keywords;
  }

  private isHebrewText(text: string): boolean {
    const hebrewChars = (text.match(/[\u0590-\u05FF]/g) || []).length;
    const totalChars = text.length;
    return hebrewChars / totalChars > 0.3; // Plus de 30% de caractères hébreux
  }

  async translateChunk(chunkId: string): Promise<string> {
    // Vérifier le cache
    const cached = this.translationCache.get(chunkId);
    if (cached && Date.now() - cached.timestamp < this.translationCacheTimeout) {
      return cached.translation;
    }

    // Trouver le chunk
    let targetChunk: BookChunk | null = null;
    const books = Array.from(this.books.values());
    for (const book of books) {
      const chunk = book.chunks.find((c: BookChunk) => c.id === chunkId);
      if (chunk) {
        targetChunk = chunk;
        break;
      }
    }

    if (!targetChunk) {
      throw new Error(`Chunk ${chunkId} non trouvé`);
    }

    // Si le chunk n'est pas en hébreu, retourner le contenu original
    if (!targetChunk.isRTL) {
      return targetChunk.content;
    }

    try {
      const prompt = `Traduis ce texte hébreu en français. Reste fidèle au sens spirituel et conserve les références (numéros de versets, etc.).
      
Texte hébreu:
${targetChunk.content}

Instructions:
- Traduction fluide et naturelle en français
- Préserve les numéros de versets/sections
- Garde le sens spirituel profond
- Ne rajoute pas de commentaires`;

      const response = await ai.getGenerativeModel({ model: "gemini-1.5-flash" }).generateContent(prompt);
      const translation = response.response.text() || targetChunk.content;
      
      // Mettre en cache
      this.translationCache.set(chunkId, { translation, timestamp: Date.now() });
      
      return translation;
    } catch (error) {
      console.error(`[MultiBook] Erreur traduction chunk ${chunkId}:`, error);
      return targetChunk.content; // Fallback sur le texte original
    }
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
    const hasHebrewChunks = allChunks.some(chunk => chunk.isRTL);
    
    return `Tu es un compagnon spirituel expert des textes de Rabbi Nahman de Breslov.
Tu as accès à plusieurs livres en hébreu et en français et tu dois répondre de manière conversationnelle et directe.

LIVRES DISPONIBLES:
${bookResults.map(result => `- ${result.bookTitle}: ${result.foundInBook ? 'Contient des informations pertinentes' : 'Aucune information trouvée'}`).join('\n')}

PASSAGES PERTINENTS TROUVÉS:
${allChunks.length > 0 ? 
  allChunks.map((chunk, index) => {
    const book = this.books.get(chunk.bookId);
    return `
--- LIVRE: ${book?.titleFrench} | Lignes ${chunk.startLine}-${chunk.endLine} ${chunk.isRTL ? '(TEXTE HÉBREU)' : ''} ---
${chunk.content}
--- FIN DU PASSAGE ---`;
  }).join('\n') :
  'Aucun passage directement pertinent trouvé dans les textes.'
}

QUESTION: ${query}

INSTRUCTIONS SPÉCIFIQUES:
1. STYLE CONVERSATIONNEL DIRECT:
   - Va droit au but, évite les formulations poétiques
   - Maximum 2-3 phrases par idée principale
   - Exemple: "À Lemberg, le Rabbi a enseigné l'importance de la joie face aux difficultés."
   
2. GESTION DES TEXTES HÉBREUX:
   - Si tu trouves des passages en hébreu, cite-les d'abord en hébreu
   - Donne ensuite une traduction française concise
   - Mentionne toujours la référence exacte (livre, chapitre, verset)
   
3. CITATIONS ET RÉFÉRENCES:
   - Format: "Dans [Livre], chapitre X, verset Y, il est écrit..."
   - Pour l'hébreu: donne d'abord le texte hébreu entre guillemets, puis la traduction
   
4. RÉPONSE DIRECTE:
   - Si trouvé: explique le contexte et la signification en 2-3 phrases maximum
   - Si non trouvé: dis-le clairement en une phrase
   - Évite les longues introductions ou conclusions

${hasHebrewChunks ? `
5. IMPORTANT - TEXTES HÉBREUX PRÉSENTS:
   - Certains passages sont en hébreu original
   - Cite toujours l'hébreu en premier, puis traduis
   - Garde les numéros de versets/sections dans tes citations` : ''}`;
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