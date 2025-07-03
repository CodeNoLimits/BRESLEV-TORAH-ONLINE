import { Express, Request, Response } from 'express';
import { multiBookProcessor } from '../services/multiBookProcessor.js';

export function registerMultiBookRoutes(app: Express) {
  console.log('[Route] Configuration routes Multi-Livres...');

  // Route pour obtenir la liste des livres disponibles
  app.get('/api/multi-book/books', async (req: Request, res: Response) => {
    try {
      await multiBookProcessor.initialize();
      const books = multiBookProcessor.getAvailableBooks();
      
      res.json({
        books,
        totalBooks: books.length
      });
    } catch (error) {
      console.error('[MultiBook] Erreur récupération livres:', error);
      res.status(500).json({ 
        error: 'Erreur lors de la récupération des livres',
        details: String(error)
      });
    }
  });

  // Route pour rechercher dans tous les livres
  app.post('/api/multi-book/search', async (req: Request, res: Response) => {
    try {
      const { question, bookIds } = req.body;
      
      if (!question) {
        return res.status(400).json({ error: 'Question manquante' });
      }

      console.log(`[MultiBook] Recherche globale: "${question}"`);
      
      const result = await multiBookProcessor.searchAcrossBooks(question, bookIds);
      
      console.log(`[MultiBook] Résultat:`, {
        answer: result.answer.substring(0, 100) + '...',
        booksSearched: result.bookResults.length,
        overallFound: result.overallFound
      });
      
      res.json(result);
    } catch (error) {
      console.error('[MultiBook] Erreur recherche:', error);
      res.status(500).json({ 
        error: 'Erreur lors de la recherche',
        details: String(error)
      });
    }
  });

  // Route pour rechercher dans un livre spécifique
  app.post('/api/multi-book/search/:bookId', async (req: Request, res: Response) => {
    try {
      const { bookId } = req.params;
      const { question } = req.body;
      
      if (!question) {
        return res.status(400).json({ error: 'Question manquante' });
      }

      console.log(`[MultiBook] Recherche dans ${bookId}: "${question}"`);
      
      const result = await multiBookProcessor.searchInSpecificBook(bookId, question);
      
      res.json(result);
    } catch (error) {
      console.error('[MultiBook] Erreur recherche livre spécifique:', error);
      res.status(500).json({ 
        error: 'Erreur lors de la recherche',
        details: String(error)
      });
    }
  });

  // Route pour ajouter un nouveau livre
  app.post('/api/multi-book/add-book', async (req: Request, res: Response) => {
    try {
      const { id, title, titleFrench, titleHebrew, filename, language } = req.body;
      
      if (!id || !title || !titleFrench || !filename || !language) {
        return res.status(400).json({ error: 'Paramètres manquants pour ajouter un livre' });
      }

      console.log(`[MultiBook] Ajout du livre: ${title}`);
      
      const success = await multiBookProcessor.addNewBook({
        id,
        title,
        titleFrench,
        titleHebrew,
        filename,
        language
      });
      
      if (success) {
        const books = multiBookProcessor.getAvailableBooks();
        res.json({
          success: true,
          message: `Livre "${titleFrench}" ajouté avec succès`,
          books
        });
      } else {
        res.status(500).json({ 
          success: false,
          error: 'Erreur lors de l\'ajout du livre' 
        });
      }
    } catch (error) {
      console.error('[MultiBook] Erreur ajout livre:', error);
      res.status(500).json({ 
        error: 'Erreur lors de l\'ajout du livre',
        details: String(error)
      });
    }
  });

  // Route pour traduire un chunk hébreu à la demande
  app.post('/api/multi-book/translate-chunk', async (req: Request, res: Response) => {
    try {
      const { chunkId } = req.body;
      
      if (!chunkId) {
        return res.status(400).json({ error: 'ID du chunk manquant' });
      }
      
      const translation = await multiBookProcessor.translateChunk(chunkId);
      
      res.json({ 
        success: true, 
        translation,
        chunkId
      });
    } catch (error) {
      console.error('[MultiBook] Erreur traduction chunk:', error);
      res.status(500).json({ error: 'Erreur lors de la traduction' });
    }
  });

  console.log('[Route] Routes Multi-Livres configurées ✓');
}