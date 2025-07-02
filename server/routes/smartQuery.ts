
import express from "express";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { localBooksProcessor } from "../services/localBooksProcessor";

const router = express.Router();

if (!process.env.GEMINI_API_KEY) {
  throw new Error("⛔️ GEMINI_API_KEY manquante");
}

const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = ai.getGenerativeModel({
  model: "gemini-1.5-flash-latest",
  generationConfig: {
    maxOutputTokens: 1024,
    temperature: 0.3,
  }
});

router.post("/", async (req, res) => {
  try {
    const { question } = req.body;
    
    if (!question || question.trim().length === 0) {
      return res.status(400).json({ error: "Question vide" });
    }

    console.log(`[SmartQuery] Question reçue: ${question}`);

    // Initialiser le processeur de livres
    await localBooksProcessor.initialize();
    
    // Rechercher dans les livres locaux
    const relevantContent = await localBooksProcessor.searchRelevantContent(question, 8);
    
    if (relevantContent.length === 0) {
      return res.json({ 
        answer: "Aucun passage pertinent trouvé dans les enseignements de Rabbi Nahman pour cette question." 
      });
    }

    console.log(`[SmartQuery] ${relevantContent.length} passages trouvés`);

    // Construire le contexte
    const context = relevantContent
      .map((content, index) => `${content.substring(0, 800)}...\n[Source: Enseignement ${index + 1}]`)
      .join('\n---\n');

    // Prompt optimisé selon vos spécifications
    const prompt = `Tu es un érudit de Rabbi Na'hman. Règles STRICTES:
1️⃣ Utilise UNIQUEMENT le CONTEXTE fourni ci-dessous.
2️⃣ CITE une phrase exacte puis [Source: Enseignement X].
3️⃣ Structure obligatoire:
   • Citation textuelle
   • Source précise
   • Explication (≤150 mots)
   • Application pratique

CONTEXTE:
"""${context}"""

QUESTION: ${question}

Réponds en français uniquement avec les sources fournies.`;

    const result = await model.generateContent(prompt);
    const answer = result.response.text().trim();

    // Vérifier que la réponse contient bien des sources
    if (!/\[Source:/i.test(answer)) {
      return res.json({ 
        answer: "Aucun passage pertinent trouvé dans les enseignements disponibles." 
      });
    }

    console.log(`[SmartQuery] Réponse générée avec sources`);

    res.json({ answer });
    
  } catch (error) {
    console.error('[SmartQuery] Erreur:', error);
    res.status(500).json({ 
      error: "Erreur lors de la génération de la réponse. Veuillez réessayer."
    });
  }
});

export default router;
