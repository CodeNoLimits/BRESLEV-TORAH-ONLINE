import express from 'express';
import { processBookQuery, testGeminiConnection } from '../services/geminiProcessor.js';

const router = express.Router();

// Route principale pour le chat
router.post('/chat', async (req, res) => {
  try {
    const { query, selectedBook = 'chayei-moharan' } = req.body;

    // Validation
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return res.status(400).json({
        error: 'Question requise',
        details: 'Le champ "query" est obligatoire et ne peut pas être vide'
      });
    }

    console.log(`[Chat API] Query: "${query}" pour le livre: ${selectedBook}`);

    // Traitement de la requête avec Gemini
    const response = await processBookQuery(query, selectedBook);

    res.json({
      response,
      book: selectedBook,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[Chat API] Erreur:', error);
    
    // Réponse de fallback en cas d'erreur
    res.status(500).json({
      error: 'Erreur du guide spirituel',
      response: 'Le guide spirituel rencontre des difficultés temporaires. Veuillez reformuler votre question ou réessayer dans un moment.',
      details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
});

// Route de santé pour vérifier l'état des services
router.get('/health', async (req, res) => {
  try {
    const geminiStatus = await testGeminiConnection();
    
    res.json({
      status: 'healthy',
      services: {
        gemini: geminiStatus ? 'connected' : 'error',
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: 'Services non disponibles',
      details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
});

// Route pour lister les livres disponibles
router.get('/books', (req, res) => {
  res.json({
    available_books: [
      {
        id: 'chayei-moharan',
        name: 'Chayei Moharan',
        description: 'Biographie de Rabbi Nahman racontée par Rabbi Nathan'
      }
    ],
    default_book: 'chayei-moharan'
  });
});

export default router;