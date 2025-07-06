import express from 'express';
import { processBookQuery, testGeminiConnection } from '../services/geminiProcessor.js';

const router = express.Router();

// Route principale pour le chat avec debug amélioré
router.post('/chat', async (req, res) => {
  try {
    const { query, selectedBook = 'chayei-moharan' } = req.body;

    // Log détaillé pour debug Replit
    console.log(`📝 [Chat API] Requête reçue:`, {
      query: query?.substring(0, 100),
      selectedBook,
      body: Object.keys(req.body),
      headers: req.headers['content-type']
    });

    // Validation détaillée
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      console.log('❌ [Chat API] Validation échouée:', { query, type: typeof query });
      return res.status(400).json({
        error: 'Question requise',
        details: 'Le champ "query" est obligatoire et ne peut pas être vide'
      });
    }

    // Vérifier si Gemini est disponible AVANT le traitement
    console.log('🔍 [Chat API] Vérification status Gemini...');
    const geminiStatus = await testGeminiConnection();
    
    if (!geminiStatus) {
      console.error('❌ [Chat API] Gemini non disponible');
      return res.status(503).json({
        error: 'Service temporairement indisponible',
        response: 'Le service IA est en cours de configuration. Veuillez réessayer dans quelques instants.',
        details: 'Gemini API non accessible'
      });
    }

    console.log('✅ [Chat API] Gemini disponible, traitement de la requête...');

    // Traitement de la requête avec Gemini
    const result = await processBookQuery(query.trim(), selectedBook);
    
    console.log('✅ [Chat API] Réponse générée avec succès');

    res.json({
      response: result.response,
      sources: result.sources,
      metadata: {
        book: selectedBook,
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV
      }
    });

  } catch (error) {
    console.error('❌ [Chat API] Erreur critique:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    
    // Réponse de fallback détaillée
    res.status(500).json({
      error: 'Erreur de traitement',
      response: 'Désolé, une erreur est survenue lors du traitement de votre question. Veuillez réessayer.',
      details: process.env.NODE_ENV === 'development' ? {
        message: error.message,
        type: error.name
      } : 'Erreur interne'
    });
  }
});

// Route de santé optimisée pour Replit
router.get('/health', async (req, res) => {
  try {
    console.log('🏥 [Health] Check demandé');
    const geminiStatus = await testGeminiConnection();
    
    const healthData = {
      status: 'ok',
      geminiConfigured: !!process.env.GEMINI_API_KEY,
      geminiConnected: geminiStatus,
      environment: process.env.NODE_ENV,
      timestamp: new Date().toISOString(),
      server: 'Breslev Torah Online',
      version: '1.0.0',
      endpoints: {
        chat: '/api/chat',
        health: '/api/health', 
        test: '/api/test',
        books: '/api/books'
      },
      replit: {
        slug: process.env.REPL_SLUG || 'unknown',
        owner: process.env.REPL_OWNER || 'unknown'
      }
    };

    console.log('✅ [Health] Status OK:', { 
      geminiConfigured: healthData.geminiConfigured,
      geminiConnected: healthData.geminiConnected 
    });
    
    res.json(healthData);
  } catch (error) {
    console.error('❌ [Health] Erreur:', error);
    res.status(503).json({
      status: 'error',
      message: 'Service indisponible',
      geminiConfigured: !!process.env.GEMINI_API_KEY,
      timestamp: new Date().toISOString(),
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

// Route de test simple pour debug Replit
router.get('/test', (req, res) => {
  console.log('🧪 [Test API] Route de test appelée');
  res.json({
    status: 'ok',
    message: 'API fonctionnelle',
    geminiConfigured: !!process.env.GEMINI_API_KEY,
    geminiKey: process.env.GEMINI_API_KEY ? 'Configurée' : 'Non configurée',
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
    server: 'Express + Gemini',
    endpoints: [
      'GET /api/test',
      'POST /api/chat',
      'GET /api/health',
      'GET /api/books'
    ]
  });
});

export default router;