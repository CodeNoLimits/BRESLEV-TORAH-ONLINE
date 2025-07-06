import { Express, Request, Response } from 'express';
import { chayeiMoharanFrenchProcessorV2 } from '../services/chayeiMoharanFrenchProcessorV2.js';

export function registerChayeiMoharanFrenchRoutes(app: Express) {
  console.log('[Route] Configuration routes Chayei Moharan French...');

  // Route de recherche principale dans le document français
  app.post('/api/chayei-moharan-french/search', async (req: Request, res: Response) => {
    try {
      const { question } = req.body;
      
      if (!question) {
        return res.status(400).json({ error: 'Question manquante' });
      }

      console.log(`[ChayeiMoharan-FR] Recherche: "${question}"`);
      
      const result = await chayeiMoharanFrenchProcessorV2.searchWithFullContext(question);
      
      console.log(`[ChayeiMoharan-FR] Résultat:`, {
        answer: result.answer.substring(0, 100) + '...',
        chunksFound: result.relevantChunks.length,
        foundInDocument: result.foundInDocument
      });
      
      res.json(result);
    } catch (error) {
      console.error('[ChayeiMoharan-FR] Erreur recherche:', error);
      res.status(500).json({ 
        error: 'Erreur lors de la recherche',
        details: String(error)
      });
    }
  });

  // Route pour obtenir la liste des sections
  app.get('/api/chayei-moharan-french/sections', async (req: Request, res: Response) => {
    try {
      await chayeiMoharanFrenchProcessorV2.initialize();
      const stats = chayeiMoharanFrenchProcessorV2.getDocumentStats();
      
      res.json({
        stats,
        message: 'Document complet chargé'
      });
    } catch (error) {
      console.error('[ChayeiMoharan-FR] Erreur sections:', error);
      res.status(500).json({ 
        error: 'Erreur lors de la récupération des sections',
        details: String(error)
      });
    }
  });

  // Route pour obtenir le texte complet
  app.get('/api/chayei-moharan-french/full-text', async (req: Request, res: Response) => {
    try {
      await chayeiMoharanFrenchProcessorV2.initialize();
      const fullText = chayeiMoharanFrenchProcessorV2.getFullText();
      
      res.json({
        fullText,
        length: fullText.length,
        preview: fullText.substring(0, 500) + '...'
      });
    } catch (error) {
      console.error('[ChayeiMoharan-FR] Erreur texte complet:', error);
      res.status(500).json({ 
        error: 'Erreur lors de la récupération du texte',
        details: String(error)
      });
    }
  });

  // Route de statut
  app.get('/api/chayei-moharan-french/status', async (req: Request, res: Response) => {
    try {
      await chayeiMoharanFrenchProcessorV2.initialize();
      
      const stats = chayeiMoharanFrenchProcessorV2.getDocumentStats();
      
      res.json({
        status: 'ready',
        totalLines: stats.totalLines,
        totalChunks: stats.totalChunks,
        message: 'Processeur français V2 initialisé et prêt'
      });
    } catch (error) {
      console.error('[ChayeiMoharan-FR] Erreur statut:', error);
      res.status(500).json({ 
        error: 'Erreur d\'initialisation',
        details: String(error)
      });
    }
  });

  // Route pour rechercher un terme exact
  app.post('/api/chayei-moharan-french/find-term', async (req: Request, res: Response) => {
    try {
      const { term } = req.body;
      
      if (!term) {
        return res.status(400).json({ error: 'Terme manquant' });
      }

      console.log(`[ChayeiMoharan-FR] Recherche exacte du terme: "${term}"`);
      
      const result = await chayeiMoharanFrenchProcessorV2.findExactTerm(term);
      
      console.log(`[ChayeiMoharan-FR] Résultat recherche exacte:`, {
        found: result.found,
        occurrences: result.occurrences.length
      });
      
      res.json(result);
    } catch (error) {
      console.error('[ChayeiMoharan-FR] Erreur recherche terme:', error);
      res.status(500).json({ 
        error: 'Erreur lors de la recherche',
        details: String(error)
      });
    }
  });

  console.log('[Route] Routes Chayei Moharan French configurées ✓');
}