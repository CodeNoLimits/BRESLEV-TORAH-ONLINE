import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../middleware/errorHandler.js';
import { db, books, chapters } from '../db/index.js';
import { eq, and, or, ilike, count } from 'drizzle-orm';

const router = Router();

// Validation schemas
const getBookSchema = z.object({
  id: z.string().regex(/^\d+$/, 'Invalid book ID').transform(Number)
});

const searchBooksSchema = z.object({
  q: z.string().optional(),
  category: z.string().optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).optional()
});

/**
 * GET /api/books
 * Get all books with optional search
 */
router.get('/', asyncHandler(async (req, res) => {
  const { q, category, limit } = searchBooksSchema.parse(req.query);
  
  let query = db.query.books.findMany({
    with: {
      chapters: {
        limit: 1 // Just get first chapter for preview
      }
    },
    orderBy: (books, { asc }) => [asc(books.titleEn)],
    ...(limit && { limit })
  });

  // Apply filters
  if (q || category) {
    const conditions = [];
    
    if (q) {
      conditions.push(
        or(
          ilike(books.titleEn, `%${q}%`),
          ilike(books.titleFr, `%${q}%`),
          ilike(books.titleHe, `%${q}%`)
        )
      );
    }
    
    if (category) {
      conditions.push(eq(books.category, category));
    }
    
    if (conditions.length > 0) {
      query = db.query.books.findMany({
        where: and(...conditions),
        with: {
          chapters: {
            limit: 1
          }
        },
        orderBy: (books, { asc }) => [asc(books.titleEn)],
        ...(limit && { limit })
      });
    }
  }
  
  const allBooks = await query;
  
  res.json({
    success: true,
    data: allBooks,
    count: allBooks.length
  });
}));

/**
 * GET /api/books/:id
 * Get book with all chapters
 */
router.get('/:id', asyncHandler(async (req, res) => {
  const { id } = getBookSchema.parse(req.params);
  
  const book = await db.query.books.findFirst({
    where: eq(books.id, id),
    with: {
      chapters: {
        orderBy: (chapters, { asc }) => [asc(chapters.chapterNumber)]
      }
    }
  });
  
  if (!book) {
    return res.status(404).json({
      success: false,
      message: 'Book not found'
    });
  }
  
  res.json({
    success: true,
    data: book
  });
}));

/**
 * GET /api/books/:id/chapters
 * Get all chapters for a book
 */
router.get('/:id/chapters', asyncHandler(async (req, res) => {
  const { id } = getBookSchema.parse(req.params);
  
  const bookChapters = await db.query.chapters.findMany({
    where: eq(chapters.bookId, id),
    orderBy: (chapters, { asc }) => [asc(chapters.chapterNumber)]
  });
  
  res.json({
    success: true,
    data: bookChapters,
    count: bookChapters.length
  });
}));

/**
 * GET /api/books/:id/chapters/:chapterNumber
 * Get specific chapter
 */
router.get('/:id/chapters/:chapterNumber', asyncHandler(async (req, res) => {
  const { id } = getBookSchema.parse(req.params);
  const chapterNumber = parseInt(req.params.chapterNumber);
  
  if (isNaN(chapterNumber)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid chapter number'
    });
  }
  
  const chapter = await db.query.chapters.findFirst({
    where: and(
      eq(chapters.bookId, id),
      eq(chapters.chapterNumber, chapterNumber)
    ),
    with: {
      book: true
    }
  });
  
  if (!chapter) {
    return res.status(404).json({
      success: false,
      message: 'Chapter not found'
    });
  }
  
  res.json({
    success: true,
    data: chapter
  });
}));

/**
 * GET /api/books/stats
 * Get library statistics
 */
router.get('/stats', asyncHandler(async (req, res) => {
  const [bookCount] = await db.select({ count: count() }).from(books);
  const [chapterCount] = await db.select({ count: count() }).from(chapters);
  
  // Get books by category
  const booksByCategory = await db.select({
    category: books.category,
    count: count()
  })
  .from(books)
  .groupBy(books.category);
  
  res.json({
    success: true,
    data: {
      totalBooks: bookCount.count,
      totalChapters: chapterCount.count,
      booksByCategory: booksByCategory.reduce((acc, item) => {
        acc[item.category || 'Unknown'] = item.count;
        return acc;
      }, {} as Record<string, number>)
    }
  });
}));

export default router;