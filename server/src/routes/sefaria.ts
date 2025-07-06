import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../middleware/errorHandler.js';
import { SefariaService } from '../services/SefariaService.js';

const router = Router();
const sefariaService = SefariaService.getInstance();

// Validation schemas
const getTextSchema = z.object({
  ref: z.string().min(1, 'Reference is required')
});

const searchSchema = z.object({
  q: z.string().min(1, 'Search query is required'),
  book: z.string().optional(),
  exact: z.boolean().optional()
});

/**
 * GET /api/sefaria/books
 * Get all available Breslev books
 */
router.get('/books', asyncHandler(async (req, res) => {
  const books = await sefariaService.getBreslevBooks();
  
  res.json({
    success: true,
    data: books,
    count: books.length
  });
}));

/**
 * GET /api/sefaria/text/:ref
 * Get text by Sefaria reference
 */
router.get('/text/:ref', asyncHandler(async (req, res) => {
  const { ref } = getTextSchema.parse({ ref: req.params.ref });
  
  const text = await sefariaService.getText(ref);
  
  res.json({
    success: true,
    data: text
  });
}));

/**
 * POST /api/sefaria/search
 * Search texts
 */
router.post('/search', asyncHandler(async (req, res) => {
  const { q, book, exact } = searchSchema.parse(req.body);
  
  const results = await sefariaService.searchTexts(q, { book, exact });
  
  res.json({
    success: true,
    data: results
  });
}));

/**
 * GET /api/sefaria/contents/:book
 * Get table of contents for a book
 */
router.get('/contents/:book', asyncHandler(async (req, res) => {
  const book = req.params.book;
  
  const contents = await sefariaService.getBookContents(book);
  
  res.json({
    success: true,
    data: contents
  });
}));

export default router;