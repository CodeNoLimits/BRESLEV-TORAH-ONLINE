import { Express, Request, Response } from 'express';
import { chayeiMoharanFrenchProcessor } from '../services/chayeiMoharanFrenchProcessor.js';

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
      
      const result = await chayeiMoharanFrenchProcessor.searchInFrenchDocument(question);
      
      console.log(`[ChayeiMoharan-FR] Résultat:`, {
        answer: result.answer.substring(0, 100) + '...',
        sectionsFound: result.relevantSections.length,
        citationsFound: result.directCitations.length
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
      await chayeiMoharanFrenchProcessor.initialize();
      const sections = chayeiMoharanFrenchProcessor.getSectionsList();
      
      res.json({
        sections,
        totalSections: chayeiMoharanFrenchProcessor.getTotalSections()
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
      await chayeiMoharanFrenchProcessor.initialize();
      const fullText = chayeiMoharanFrenchProcessor.getFullText();
      
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
      await chayeiMoharanFrenchProcessor.initialize();
      
      res.json({
        status: 'ready',
        sections: chayeiMoharanFrenchProcessor.getTotalSections(),
        message: 'Processeur français initialisé et prêt'
      });
    } catch (error) {
      console.error('[ChayeiMoharan-FR] Erreur statut:', error);
      res.status(500).json({ 
        error: 'Erreur d\'initialisation',
        details: String(error)
      });
    }
  });

  console.log('[Route] Routes Chayei Moharan French configurées ✓');
}