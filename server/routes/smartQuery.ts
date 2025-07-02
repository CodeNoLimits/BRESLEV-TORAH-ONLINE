import { Router } from 'express';
import { QueryRouter } from '../services/queryRouter';
import { ResponseFilter } from '../services/responseFilter';

const router = Router();
const queryRouter = new QueryRouter();

router.post('/', async (req, res) => {
  try {
    const { question } = req.body;
    
    if (!question?.trim()) {
      return res.status(400).json({ 
        error: 'Question requise',
        answer: "❗ Veuillez poser une question."
      });
    }

    console.log(`[SmartQuery] Question reçue: ${question}`);
    const startTime = Date.now();
    
    const result = await queryRouter.routeToOptimalEndpoint(question);
    
    // Filtrage et validation de la réponse
    const filteredAnswer = ResponseFilter.filterBlueSections(result.answer);
    const validatedAnswer = ResponseFilter.ensureCitationFormat(filteredAnswer, result.sources);
    
    const duration = Date.now() - startTime;
    console.log(`[SmartQuery] Réponse générée en ${duration}ms via ${result.method}`);
    
    res.json({
      answer: validatedAnswer,
      sources: result.sources,
      method: result.method,
      duration: duration
    });
    
  } catch (error) {
    console.error('[SmartQuery] Erreur:', error);
    res.status(500).json({ 
      error: 'Erreur interne',
      answer: "❗ Une erreur est survenue lors du traitement de votre question.",
      sources: [],
      method: 'error'
    });
  }
});

// Endpoint de diagnostic
router.get('/status', async (req, res) => {
  try {
    const vectorRAG = queryRouter['vectorRAG']; // Access private property for diagnostics
    const booksCount = await vectorRAG?.getBooksCount() || 0;
    const chunksCount = await vectorRAG?.getChunksCount() || 0;
    
    res.json({
      status: 'operational',
      books: booksCount,
      chunks: chunksCount,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: String(error)
    });
  }
});

export default router;