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

  } catch (error) {
    console.error('[ChayeiMoharan] Erreur recherche:', error);
    res.status(500).json({ 
      error: "Erreur lors de la recherche dans Chayei Moharan",
      details: error.message 
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

  } catch (error) {
    console.error('[ChayeiMoharan] Erreur traduction:', error);
    res.status(500).json({ 
      error: "Erreur lors de la traduction",
      details: error.message 
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

export default router;