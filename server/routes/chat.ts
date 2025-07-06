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

    console.log(`📝 Nouvelle question: "${query}" (livre: ${selectedBook})`);

    // Traitement avec Gemini
    const startTime = Date.now();
    const result = await processBookQuery(query.trim(), selectedBook);
    const processingTime = Date.now() - startTime;

    console.log(`⚡ Réponse générée en ${processingTime}ms`);

    // Réponse succès
    res.json({
      response: result.response,
      sources: result.sources,
      metadata: {
        book: selectedBook,
        processingTime,
        timestamp: new Date().toISOString(),
        sourceCount: result.sources.length
      }
    });

  } catch (error) {
    console.error('❌ Erreur route /chat:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Erreur interne du serveur';
    
    res.status(500).json({
      error: 'Erreur de traitement',
      details: errorMessage,
      timestamp: new Date().toISOString()
    });
  }
});

// Route de test pour vérifier la connexion Gemini
router.get('/health', async (req, res) => {
  try {
    const geminiStatus = await testGeminiConnection();
    
    res.json({
      status: 'ok',
      services: {
        gemini: geminiStatus ? 'connected' : 'disconnected',
        server: 'running'
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Erreur health check:', error);
    res.status(500).json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
});

// Route pour lister les livres disponibles
router.get('/books', (req, res) => {
  const availableBooks = [
    {
      id: 'chayei-moharan',
      name: 'Chayei Moharan',
      language: 'fr',
      status: 'available',
      description: 'Vie et enseignements de Rabbi Nahman de Breslev'
    },
    {
      id: 'likutei-moharan',
      name: 'Likutei Moharan',
      language: 'he',
      status: 'loading',
      description: 'Recueil principal des enseignements de Rabbi Nahman'
    },
    {
      id: 'sippurei-maasiyot',
      name: 'Sippurei Maasiyot',
      language: 'he',
      status: 'loading',
      description: 'Contes et histoires de Rabbi Nahman'
    }
  ];

  res.json({
    books: availableBooks,
    total: availableBooks.length,
    available: availableBooks.filter(b => b.status === 'available').length
  });
});

export default router;