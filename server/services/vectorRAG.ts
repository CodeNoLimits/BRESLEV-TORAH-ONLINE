import { db } from '../db';
import { sql } from 'drizzle-orm';
import { localBooksProcessor } from './localBooksProcessor';

interface SearchResult {
  content: string;
  hebrewContent?: string;
  source: {
    book: string;
    chapter: string;
    section: string;
    reference: string;
  };
  score: number;
  metadata?: any;
}

export class VectorRAGService {
  private initialized = false;

  async initializeEmbeddings(): Promise<void> {
    if (this.initialized) return;
    
    console.log('[VectorRAG] Initialisation du service...');
    
    // Vérifier si pgvector est disponible
    try {
      await db.execute(sql`CREATE EXTENSION IF NOT EXISTS vector`);
      console.log('[VectorRAG] Extension pgvector activée');
    } catch (error) {
      console.warn('[VectorRAG] pgvector non disponible, fallback sur recherche lexicale');
    }

    // Créer la table si elle n'existe pas
    await this.createEmbeddingsTable();
    
    // Vérifier si on a déjà des embeddings
    const count = await this.getEmbeddingsCount();
    console.log(`[VectorRAG] ${count} embeddings existants`);
    
    if (count === 0) {
      console.log('[VectorRAG] Lancement ingestion initiale...');
      await this.ingestAllBooks();
    }
    
    this.initialized = true;
    console.log('[VectorRAG] Service initialisé');
  }

  private async createEmbeddingsTable(): Promise<void> {
    try {
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS book_embeddings (
          id SERIAL PRIMARY KEY,
          book_title TEXT NOT NULL,
          chapter_number TEXT,
          section_number TEXT,
          content TEXT NOT NULL,
          hebrew_content TEXT,
          embedding vector(768),
          metadata JSONB DEFAULT '{}',
          created_at TIMESTAMP DEFAULT NOW()
        )
      `);

      // Index pour recherche lexicale (toujours disponible)
      await db.execute(sql`
        CREATE INDEX IF NOT EXISTS book_embeddings_content_idx 
        ON book_embeddings USING gin (to_tsvector('french', content))
      `);

      // Index vectoriel si pgvector disponible
      try {
        await db.execute(sql`
          CREATE INDEX IF NOT EXISTS book_embeddings_vector_idx 
          ON book_embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100)
        `);
      } catch (error) {
        console.log('[VectorRAG] Index vectoriel non créé (pgvector indisponible)');
      }

    } catch (error) {
      console.error('[VectorRAG] Erreur création table:', error);
    }
  }

  private async getEmbeddingsCount(): Promise<number> {
    try {
      const result = await db.execute(sql`SELECT COUNT(*) as count FROM book_embeddings`);
      return parseInt(String(result.rows[0]?.count || '0'));
    } catch (error) {
      console.error('[VectorRAG] Erreur comptage:', error);
      return 0;
    }
  }

  async search(query: string, minScore = 0.3): Promise<SearchResult[]> {
    await this.initializeEmbeddings();
    
    console.log(`[VectorRAG] Recherche: "${query}" (score min: ${minScore})`);
    
    try {
      // Recherche multilingue améliorée pour hébreu/français/anglais
      const searchPattern = `%${query}%`;
      const results = await db.execute(sql`
        SELECT 
          book_title,
          chapter_number,
          section_number,
          content,
          hebrew_content,
          metadata,
          CASE 
            WHEN content ILIKE ${searchPattern} THEN 1.0
            WHEN book_title ILIKE ${searchPattern} THEN 0.8
            WHEN hebrew_content ILIKE ${searchPattern} THEN 0.6
            ELSE 0.1
          END as similarity_score
        FROM book_embeddings 
        WHERE 
          content ILIKE ${searchPattern}
          OR book_title ILIKE ${searchPattern}
          OR hebrew_content ILIKE ${searchPattern}
          OR LENGTH(content) > 100
        ORDER BY similarity_score DESC, LENGTH(content) DESC
        LIMIT 10
      `);

      const searchResults = results.rows.map((row: any) => ({
        content: String(row.content || ''),
        hebrewContent: row.hebrew_content ? String(row.hebrew_content) : undefined,
        source: {
          book: String(row.book_title || ''),
          chapter: String(row.chapter_number || '1'),
          section: String(row.section_number || '1'),
          reference: `${row.book_title} ${row.chapter_number || '1'}:${row.section_number || '1'}`
        },
        score: parseFloat(String(row.lexical_score)) || 0.5,
        metadata: row.metadata
      }));

      console.log(`[VectorRAG] ${searchResults.length} résultats trouvés`);
      return searchResults.filter(r => r.score >= minScore);
      
    } catch (error) {
      console.error('[VectorRAG] Erreur recherche:', error);
      return [];
    }
  }

  private async ingestAllBooks(): Promise<void> {
    console.log('[VectorRAG] Début ingestion des livres...');
    
    try {
      await localBooksProcessor.initialize();
      const books = localBooksProcessor.getAvailableBooks();
      
      console.log(`[VectorRAG] ${books.length} livres à ingérer`);
      
      for (const bookTitle of books) {
        await this.ingestBook(bookTitle);
      }
      
      console.log('[VectorRAG] Ingestion terminée');
    } catch (error) {
      console.error('[VectorRAG] Erreur ingestion:', error);
    }
  }

  async ingestBook(bookTitle: string): Promise<void> {
    console.log(`[VectorRAG] Ingestion: ${bookTitle}`);
    
    try {
      const bookContent = await localBooksProcessor.getBookContent(bookTitle);
      if (!bookContent) {
        console.warn(`[VectorRAG] Contenu non trouvé pour: ${bookTitle}`);
        return;
      }

      // Chunking intelligent par paragraphes
      const chunks = this.intelligentChunking(bookContent, bookTitle);
      
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        
        await db.execute(sql`
          INSERT INTO book_embeddings (
            book_title, 
            chapter_number, 
            section_number, 
            content, 
            hebrew_content,
            metadata
          ) VALUES (
            ${bookTitle},
            ${Math.floor(i / 10) + 1},
            ${(i % 10) + 1},
            ${chunk.content},
            ${chunk.hebrewContent || null},
            ${JSON.stringify({ 
              chunkIndex: i, 
              totalChunks: chunks.length,
              extractedAt: new Date().toISOString() 
            })}
          )
          ON CONFLICT DO NOTHING
        `);
      }
      
      console.log(`[VectorRAG] ${chunks.length} chunks ingérés pour ${bookTitle}`);
      
    } catch (error) {
      console.error(`[VectorRAG] Erreur ingestion ${bookTitle}:`, error);
    }
  }

  private intelligentChunking(content: string, bookTitle: string): Array<{
    content: string;
    hebrewContent?: string;
  }> {
    // Séparation par paragraphes significatifs
    const paragraphs = content
      .split(/\n\s*\n/)
      .filter(p => p.trim().length > 50)
      .map(p => p.trim());

    const chunks: Array<{content: string; hebrewContent?: string}> = [];
    
    for (let i = 0; i < paragraphs.length; i++) {
      let chunk = paragraphs[i];
      
      // Grouper les petits paragraphes
      while (chunk.length < 300 && i + 1 < paragraphs.length) {
        i++;
        chunk += '\n\n' + paragraphs[i];
      }
      
      // Limite de taille raisonnable
      if (chunk.length > 1000) {
        const sentences = chunk.split(/[.!?]\s+/);
        let currentChunk = '';
        
        for (const sentence of sentences) {
          if (currentChunk.length + sentence.length > 800) {
            if (currentChunk) {
              chunks.push({ content: currentChunk.trim() });
            }
            currentChunk = sentence;
          } else {
            currentChunk += (currentChunk ? '. ' : '') + sentence;
          }
        }
        
        if (currentChunk) {
          chunks.push({ content: currentChunk.trim() });
        }
      } else {
        chunks.push({ content: chunk });
      }
    }
    
    return chunks;
  }

  async getBooksCount(): Promise<number> {
    try {
      const result = await db.execute(sql`SELECT COUNT(DISTINCT book_title) as count FROM book_embeddings`);
      return parseInt(String(result.rows[0]?.count || '0'));
    } catch (error) {
      return 0;
    }
  }

  getChunksCount(): Promise<number> {
    return this.getEmbeddingsCount();
  }
}