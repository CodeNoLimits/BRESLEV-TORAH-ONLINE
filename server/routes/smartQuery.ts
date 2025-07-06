import express from "express";
import { GoogleGenerativeAI } from "@google/generative-ai";

const router = express.Router();

// Configuration Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

router.post("/", async (req, res) => {
  try {
    const { question, book = 'Chayei_Moharan', translate = true, chapter } = req.body;
    
    if (!question || question.trim().length === 0) {
      return res.status(400).json({ error: "Question vide" });
    }

    console.log(`[SmartQuery] Question: ${question} | Livre: ${book} | Chapitre: ${chapter || 'tous'}`);

    // RECHERCHE EXCLUSIVE dans Chayei Moharan
    try {
      const { localBooksProcessor } = await import('../services/localBooksProcessor.js');
      
      // Filtrer uniquement Chayei Moharan
      const chayeiContent = await localBooksProcessor.searchInSpecificBook('Chayei_Moharan', question, 8);
      
      if (chayeiContent.length === 0) {
        return res.json({ 
          answer: "Aucun contenu trouvé dans Chayei Moharan pour cette question.",
          hebrew: "לא נמצא תוכן רלוונטי בחיי מוהר\"ן לשאלה זו.",
          french: "Aucun contenu trouvé dans Chayei Moharan pour cette question."
        });
      }

      // Construire le contexte pour Gemini
      let hebrewContext = '';
      let contextSources: string[] = [];
      
      chayeiContent.forEach((chunk, index) => {
        const parts = chunk.split(': ');
        const source = parts[0] || 'Chayei Moharan';
        const content = parts.slice(1).join(': ') || chunk;
        
        hebrewContext += `\n### ${source}\n${content}\n`;
        contextSources.push(source);
      });

      // Prompt pour Gemini avec traduction intelligente
      const geminiPrompt = `
Tu es un expert en littérature hassidique spécialisé dans les œuvres de Rabbi Nahman de Breslov.

CONTEXTE HÉBREU AUTHENTIQUE DE CHAYEI MOHARAN:
${hebrewContext}

QUESTION DE L'UTILISATEUR: ${question}

INSTRUCTIONS STRICTES:
1. Réponds UNIQUEMENT en te basant sur le contexte hébreu fourni
2. Cite les sources exactes de Chayei Moharan
3. Fournis la réponse en français clair et spirituel
4. Inclus les passages hébreux pertinents avec leurs références
5. Si possible, explique la signification spirituelle

Format de réponse:
- Réponse principale en français
- Citations hébraïques avec références
- Explication du contexte spirituel

Réponds maintenant:`;

      console.log(`[SmartQuery] Envoi à Gemini - ${hebrewContext.length} caractères de contexte`);
      
      const result = await model.generateContent(geminiPrompt);
      const response = result.response;
      const geminiAnswer = response.text();

      // Extraire les parties hébraïques et françaises
      const hebrewMatches = geminiAnswer.match(/[\u0590-\u05FF][^]*?(?=\n|$)/g) || [];
      const frenchAnswer = geminiAnswer.replace(/[\u0590-\u05FF][^]*?(?=\n|$)/g, '').trim();

      const finalResponse = {
        answer: frenchAnswer,
        french: frenchAnswer,
        hebrew: hebrewMatches.join('\n\n'),
        sources: contextSources,
        book: 'Chayei Moharan'
      };

      console.log(`[SmartQuery] Réponse Gemini générée - ${frenchAnswer.length} chars français, ${hebrewMatches.length} extraits hébreux`);
      
      res.json(finalResponse);
      
    } catch (error: unknown) {
      console.error('[SmartQuery] Erreur Gemini:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      res.json({ 
        answer: `❌ Erreur lors de l'analyse avec Gemini: ${errorMessage}`,
        french: `❌ Erreur lors de l'analyse avec Gemini: ${errorMessage}`
      });
    }
    
  } catch (error) {
    console.error('[SmartQuery] Erreur générale:', error);
    res.status(500).json({ 
      error: "Erreur lors de la recherche dans vos livres."
    });
  }
});

export default router;