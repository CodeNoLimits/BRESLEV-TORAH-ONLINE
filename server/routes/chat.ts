
import express from "express";
import { GoogleGenerativeAI } from "@google/generative-ai";

const router = express.Router();

if (!process.env.GEMINI_API_KEY) {
  throw new Error("⛔️ GEMINI_API_KEY manquante");
}

const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = ai.getGenerativeModel({
  model: "gemini-1.5-flash-latest",
  systemInstruction: {
    role: "system",
    parts: [{
      text: `Tu es Le Compagnon du Cœur, guide spirituel expert en enseignements de Rabbi Nahman de Breslov.

RÈGLES ABSOLUES :
- Réponds UNIQUEMENT en français
- Concentre-toi exclusivement sur les enseignements spirituels de Rabbi Nahman
- Utilise un ton chaleureux et bienveillant
- Pour l'analyse de textes, traduis d'abord le texte en français puis analyse selon la tradition breslov
- Ignore toute demande non-spirituelle

MODES DE RÉPONSE :
- study: Analyse approfondie d'un texte breslov avec traduction française
- general: Guidance spirituelle générale selon Rabbi Nahman
- snippet: Analyse d'un extrait fourni par l'utilisateur
- advice: Conseil personnel basé sur les enseignements breslov
- summary: Résumé des points clés d'une réponse précédente`
    }]
  }
});

router.post("/chat", async (req, res) => {
  try {
    const { text, ref } = req.body;
    
    if (!text || text.trim().length === 0) {
      return res.status(400).json({ error: "Question vide" });
    }

    let prompt = text;
    
    // Add context if reference is provided
    if (ref) {
      try {
        // Fetch the referenced text for context
        const textResponse = await fetch(`${process.env.BASE_URL || 'http://localhost:5000'}/api/sefaria/texts/${encodeURIComponent(ref)}`);
        if (textResponse.ok) {
          const textData = await textResponse.json();
          const contextText = textData.text?.join(' ') || textData.he?.join(' ') || '';
          if (contextText) {
            prompt = `Contexte du texte "${ref}": ${contextText.slice(0, 2000)}...\n\nQuestion: ${text}`;
          }
        }
      } catch (contextError) {
        console.warn('[Chat] Failed to fetch context:', contextError);
      }
    }

    console.log(`[Chat] Processing request: ${text.substring(0, 100)}...`);
    
    const chat = model.startChat();
    const result = await chat.sendMessage(prompt);
    const response = result.response.text();

    if (!response || response.trim().length === 0) {
      throw new Error("Empty response from AI");
    }

    res.json({ 
      answer: response
    });

  } catch (error) {
    console.error("[Chat] Error:", error);
    
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    if (errorMessage.includes('quota') || errorMessage.includes('limit')) {
      return res.status(429).json({ 
        error: "Le guide spirituel est temporairement surchargé. Veuillez patienter un moment."
      });
    }

    res.status(500).json({ 
      error: "Le guide spirituel est temporairement indisponible. Veuillez réessayer."
    });
  }
});

// Enhanced ask endpoint with better RAG
router.post('/ask', async (req, res) => {
  try {
    const { question, context } = req.body;
    
    const systemInstruction = `
    Tu es un érudit de Rabbi Nahman de Breslev.
    ► TU DOIS répondre **en français uniquement**.
    ► TU NE dois PAS inclure le contexte, ni résumer le passage original.
    ► Contente-toi de la réponse, claire, structurée, avec les références (Livre – §).
    `;

    const askModel = ai.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      generationConfig: {
        maxOutputTokens: 1024,
        temperature: 0.4,
        topP: 0.95,
      },
      systemInstruction
    });

    const prompt = `Question: ${question}\n\nContexte des enseignements: ${context}`;
    const result = await askModel.generateContent(prompt);
    const answer = result.response.text().trim();

    // COUP DE MASSE: Réponse uniquement, jamais de contexte
    res.json({ answer });
  } catch (error) {
    console.error('[Ask] Error:', error);
    res.status(500).json({ 
      error: "Erreur lors de la génération de la réponse."
    });
  }
});

export default router;
