import express from "express";
import { chayeiMoharanProcessor } from '../services/chayeiMoharanProcessor.js';

const router = express.Router();

// RECHERCHE INTELLIGENTE dans Chayei Moharan avec Gemini
router.post("/search", async (req, res) => {
  try {
    const { question } = req.body;
    
    if (!question || question.trim().length === 0) {
      return res.status(400).json({ error: "Question vide" });
    }

    console.log(`[ChayeiMoharan] Recherche: "${question}"`);

    const result = await chayeiMoharanProcessor.searchWithGemini(question);
    
    res.json(result);

  } catch (error: unknown) {
    console.error('[ChayeiMoharan] Erreur recherche:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
    res.status(500).json({ 
      error: "Erreur lors de la recherche dans Chayei Moharan",
      details: errorMessage 
    });
  }
});

// TRADUCTION LAZY d'un chapitre
router.post("/translate", async (req, res) => {
  try {
    const { chapterNumber, startChar = 0, length = 1000 } = req.body;
    
    console.log(`[ChayeiMoharan] Traduction chapitre ${chapterNumber}, début: ${startChar}`);

    const result = await chayeiMoharanProcessor.translateChapter(
      parseInt(chapterNumber), 
      parseInt(startChar), 
      parseInt(length)
    );
    
    res.json(result);

  } catch (error: unknown) {
    console.error('[ChayeiMoharan] Erreur traduction:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
    res.status(500).json({ 
      error: "Erreur lors de la traduction",
      details: errorMessage 
    });
  }
});

// LISTE DES CHAPITRES
router.get("/chapters", async (req, res) => {
  try {
    await chayeiMoharanProcessor.initialize();
    
    const chapters = chayeiMoharanProcessor.getChaptersList();
    const totalChapters = chayeiMoharanProcessor.getTotalChapters();
    
    res.json({
      chapters,
      totalChapters,
      bookTitle: "חיי מוהרן - Chayei Moharan"
    });

  } catch (error) {
    console.error('[ChayeiMoharan] Erreur liste chapitres:', error);
    res.status(500).json({ 
      error: "Erreur lors du chargement des chapitres",
      details: error.message 
    });
  }
});

// STATUT DU PROCESSEUR
router.get("/status", async (req, res) => {
  try {
    await chayeiMoharanProcessor.initialize();
    
    res.json({
      status: "ready",
      bookTitle: "חיי מוהרן - Chayei Moharan",
      totalChapters: chayeiMoharanProcessor.getTotalChapters(),
      message: "Chayei Moharan prêt avec Gemini AI"
    });

  } catch (error) {
    console.error('[ChayeiMoharan] Erreur statut:', error);
    res.status(500).json({ 
      error: "Erreur d'initialisation",
      details: error.message 
    });
  }
});

// DEBUG - RECHERCHE GLOBALE LEMBERG
router.get("/debug-search-lemberg", async (req, res) => {
  try {
    await chayeiMoharanProcessor.initialize();
    
    const fullText = chayeiMoharanProcessor.getFullBookText();
    const lemberVariants = [
      'lemberg', 'למברג', 'לעמבערג', 'lviv', 'lwów', 'ליוב', 'לבוב',
      'לעמברג', 'לעמבורג', 'לבמברג', 'לימברג', 'לימבערג', 'ליבוב'
    ];
    
    const results = [];
    
    // Recherche chaque variante
    for (const variant of lemberVariants) {
      const indices = [];
      let index = fullText.indexOf(variant);
      while (index !== -1) {
        indices.push(index);
        index = fullText.indexOf(variant, index + 1);
      }
      
      if (indices.length > 0) {
        results.push({
          variant,
          occurrences: indices.length,
          positions: indices.slice(0, 5), // Limite à 5 positions pour debug
          contexts: indices.slice(0, 3).map(pos => ({
            position: pos,
            context: fullText.substring(Math.max(0, pos - 200), pos + 300)
          }))
        });
      }
    }
    
    // Recherche aussi des mots connexes
    const travelTerms = ['נסיעה', 'דרך', 'מסע', 'הלך', 'journey', 'voyage'];
    const travelResults = [];
    
    for (const term of travelTerms) {
      const count = (fullText.match(new RegExp(term, 'g')) || []).length;
      if (count > 0) {
        travelResults.push({ term, count });
      }
    }
    
    res.json({
      totalChapters: chayeiMoharanProcessor.getTotalChapters(),
      textLength: fullText.length,
      lemberResults: results,
      travelTermsCounts: travelResults,
      summary: results.length > 0 ? 
        `Trouvé ${results.reduce((sum, r) => sum + r.occurrences, 0)} occurrences de Lemberg` :
        "Aucune occurrence de Lemberg trouvée"
    });

  } catch (error) {
    console.error('[ChayeiMoharan] Erreur recherche Lemberg:', error);
    res.status(500).json({ 
      error: "Erreur recherche Lemberg",
      details: error.message 
    });
  }
});

export default router;