import type { Express, Request, Response } from "express";
import { BRESLOV_BOOKS } from '@shared/data/BRESLOV_BOOKS';

export function registerMetaRoutes(app: Express) {
  // GET /api/books/meta - Returns maxSections for all books
  app.get('/api/books/meta', async (req: Request, res: Response) => {
    try {
      const metaData = Object.values(BRESLOV_BOOKS).reduce((acc: Record<string, any>, book) => {
        acc[book.baseRef] = {
          maxSections: book.maxSections,
          verified: book.verified,
          baseRef: book.baseRef,
          hebrewTitle: book.hebrewTitle,
          category: book.category
        };
        return acc;
      }, {} as Record<string, any>);

      res.header('Access-Control-Allow-Origin', '*');
      res.json({
        books: metaData,
        totalBooks: Object.keys(BRESLOV_BOOKS).length,
        lastUpdated: new Date().toISOString(),
        cacheValidityMinutes: 5
      });

      console.log(`[Meta] Served metadata for ${Object.keys(BRESLOV_BOOKS).length} books`);
    } catch (error) {
      console.error('[Meta] Error serving book metadata:', error);
      res.status(500).json({ error: 'Failed to get book metadata' });
    }
  });
}