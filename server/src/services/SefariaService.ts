import fetch from 'node-fetch';
import { AppError } from '../middleware/errorHandler.js';
import { db, books, chapters } from '../db/index.js';
import { eq } from 'drizzle-orm';

const SEFARIA_BASE_URL = 'https://www.sefaria.org/api';

interface SefariaTextResponse {
  ref: string;
  heRef: string;
  text: string | string[];
  he: string | string[];
  versions: any[];
  book: string;
  sections: number[];
  next?: string;
  prev?: string;
}

interface SefariaIndex {
  title: string;
  heTitle: string;
  categories: string[];
  authors?: string[];
}

export class SefariaService {
  private static instance: SefariaService;
  
  private constructor() {}
  
  static getInstance(): SefariaService {
    if (!SefariaService.instance) {
      SefariaService.instance = new SefariaService();
    }
    return SefariaService.instance;
  }

  /**
   * Get all Breslev books from Sefaria index
   */
  async getBreslevBooks(): Promise<SefariaIndex[]> {
    try {
      const response = await fetch(`${SEFARIA_BASE_URL}/index`);
      if (!response.ok) {
        throw new AppError('Failed to fetch Sefaria index', response.status);
      }
      
      const allBooks = await response.json() as SefariaIndex[];
      
      // Filter for Breslev/Nachman texts
      return allBooks.filter(book => 
        book.categories.includes('Chasidut') && 
        (book.authors?.includes('Nachman of Breslov') ||
         book.title.includes('Likutei Moharan') ||
         book.title.includes('Chayei Moharan') ||
         book.title.includes('Sichot HaRan') ||
         book.title.includes('Sefer HaMiddot') ||
         book.title.includes('Kitzur Likutei Moharan'))
      );
    } catch (error) {
      console.error('Error fetching Breslev books:', error);
      throw new AppError('Impossible de récupérer les livres de Rabbi Nahman', 500);
    }
  }

  /**
   * Get text with context from Sefaria
   */
  async getText(ref: string): Promise<SefariaTextResponse> {
    try {
      // Check cache first
      const cachedChapter = await db.query.chapters.findFirst({
        where: eq(chapters.sefariaRef, ref)
      });

      if (cachedChapter) {
        return {
          ref: cachedChapter.sefariaRef,
          heRef: cachedChapter.sefariaRef,
          text: cachedChapter.contentEn,
          he: cachedChapter.contentHe,
          versions: [],
          book: ref.split(' ')[0],
          sections: this.parseSections(ref)
        };
      }

      // Fetch from Sefaria API
      const params = new URLSearchParams({
        commentary: '0',
        context: '1',
        pad: '0',
        wrapLinks: '0'
      });

      const response = await fetch(`${SEFARIA_BASE_URL}/texts/${encodeURIComponent(ref)}?${params}`);
      
      if (!response.ok) {
        throw new AppError(`Failed to fetch text: ${ref}`, response.status);
      }

      const data = await response.json() as SefariaTextResponse;
      
      // Cache the result
      await this.cacheChapter(data);
      
      return data;
    } catch (error) {
      console.error('Error fetching text:', error);
      throw new AppError('Impossible de récupérer le texte demandé', 500);
    }
  }

  /**
   * Search texts in Sefaria
   */
  async searchTexts(query: string, filters?: { book?: string; exact?: boolean }) {
    try {
      const params = new URLSearchParams({
        q: query,
        size: '20',
        filters: filters?.book ? `path:${filters.book}` : ''
      });

      const response = await fetch(`${SEFARIA_BASE_URL}/search-wrapper?${params}`);
      
      if (!response.ok) {
        throw new AppError('Search failed', response.status);
      }

      return await response.json();
    } catch (error) {
      console.error('Error searching texts:', error);
      throw new AppError('Recherche impossible', 500);
    }
  }

  /**
   * Get table of contents for a book
   */
  async getBookContents(bookTitle: string) {
    try {
      const response = await fetch(`${SEFARIA_BASE_URL}/index/${encodeURIComponent(bookTitle)}`);
      
      if (!response.ok) {
        throw new AppError(`Book not found: ${bookTitle}`, response.status);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching book contents:', error);
      throw new AppError('Impossible de récupérer le contenu du livre', 500);
    }
  }

  /**
   * Cache chapter data in database
   */
  private async cacheChapter(data: SefariaTextResponse) {
    try {
      const bookTitle = data.book;
      const chapterNumber = data.sections[0] || 1;
      
      // Ensure book exists
      let book = await db.query.books.findFirst({
        where: eq(books.sefariaRef, bookTitle)
      });

      if (!book) {
        // Create book entry
        const [newBook] = await db.insert(books).values({
          sefariaRef: bookTitle,
          titleHe: data.heRef.split(' ')[0],
          titleEn: bookTitle,
          content: { chapters: [] }
        }).returning();
        book = newBook;
      }

      // Insert chapter (skip if exists)
      await db.insert(chapters).values({
        bookId: book.id,
        chapterNumber,
        sefariaRef: data.ref,
        contentHe: Array.isArray(data.he) ? data.he.join(' ') : data.he,
        contentEn: Array.isArray(data.text) ? data.text.join(' ') : data.text,
        metadata: { 
          versions: data.versions,
          next: data.next,
          prev: data.prev 
        }
      }).onConflictDoNothing();
    } catch (error) {
      console.error('Error caching chapter:', error);
      // Don't throw - caching failure shouldn't break the request
    }
  }

  /**
   * Parse section numbers from reference
   */
  private parseSections(ref: string): number[] {
    const parts = ref.split(' ');
    const sections = [];
    
    for (let i = 1; i < parts.length; i++) {
      const num = parseInt(parts[i]);
      if (!isNaN(num)) {
        sections.push(num);
      }
    }
    
    return sections;
  }
}