
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
  systemInstruction: {
    role: "system", 
    parts: [{
      text: `Tu es Le Compagnon du Cœur, guide spirituel expert en enseignements de Rabbi Nahman de Breslov.

RÈGLES ABSOLUES :
- Réponds TOUJOURS en français
- UTILISE EXCLUSIVEMENT les textes fournis dans le contexte
- CITE TOUJOURS la source exacte [Nom du livre - Section X] 
- Si contexte fourni, base-toi UNIQUEMENT sur ces textes
- Ton ton est chaleureux, sage et bienveillant
- Explique les concepts spirituels simplement
- Donne des conseils pratiques basés sur les enseignements

FORMAT DE RÉPONSE OBLIGATOIRE :
1. Réponse directe à la question (2-3 paragraphes)
2. Citation précise avec [Source exacte]
3. Enseignement spirituel principal
4. Application pratique dans la vie quotidienne
5. Invitation à approfondir

Ne réponds JAMAIS avec tes connaissances générales si un contexte spécifique est fourni.`
    }]
  }
});

router.post("/chat", async (req, res) => {
  try {
    const { text, ref } = req.body;

    if (!text || text.trim().length === 0) {
      return res.status(400).json({ error: "Question vide" });
    }

    console.log(`[Chat] 📝 Question reçue: "${text.substring(0, 100)}..."`);

    let prompt = text;
    let contextFound = false;

    // PRIORITÉ 1: Recherche dans les livres locaux
    try {
      console.log('[Chat] 🔍 Recherche dans les livres locaux...');
      await localBooksProcessor.initialize();
      
      const relevantContent = await localBooksProcessor.searchRelevantContent(text, 5);
      
      if (relevantContent.length > 0) {
        console.log(`[Chat] ✅ ${relevantContent.length} passages trouvés dans les livres locaux`);
        
        const contextFromLocalBooks = relevantContent
          .map((content, index) => `PASSAGE ${index + 1}:\n${content}`)
          .join('\n\n---\n\n');
        
        prompt = `CONTEXTE DES ENSEIGNEMENTS DE RABBI NAHMAN:
${contextFromLocalBooks}

QUESTION: ${text}

Réponds en te basant UNIQUEMENT sur ces textes authentiques. Cite précisément les sources.`;
        contextFound = true;
      } else {
        console.log('[Chat] ⚠️ Aucun passage trouvé dans les livres locaux');
      }
    } catch (localError) {
      console.error('[Chat] ❌ Erreur recherche livres locaux:', localError);
    }

    // PRIORITÉ 2: Fallback Sefaria si référence fournie
    if (!contextFound && ref) {
      try {
        console.log(`[Chat] 🔍 Fallback Sefaria pour: ${ref}`);
        const textResponse = await fetch(`${process.env.BASE_URL || 'http://localhost:5000'}/api/sefaria/texts/${encodeURIComponent(ref)}`);
        
        if (textResponse.ok) {
          const textData = await textResponse.json();
          const contextText = textData.text?.join(' ') || textData.he?.join(' ') || '';
          
          if (contextText) {
            prompt = `CONTEXTE DU TEXTE "${ref}":
${contextText.slice(0, 2000)}...

QUESTION: ${text}

Réponds en te basant sur ce texte spécifique.`;
            contextFound = true;
            console.log('[Chat] ✅ Contexte Sefaria trouvé');
          }
        }
      } catch (contextError) {
        console.warn('[Chat] ⚠️ Échec récupération Sefaria:', contextError);
      }
    }

    // PRIORITÉ 3: Mode général avec guidance
    if (!contextFound) {
      console.log('[Chat] 📚 Mode général avec guidance spirituelle');
      prompt = `Tu es Le Compagnon du Cœur. La question posée est: "${text}"

Réponds avec sagesse spirituelle basée sur les enseignements de Rabbi Nahman de Breslov. 
Même sans texte spécifique, donne des conseils empreints de cette tradition spirituelle.
Sois chaleureux et encourageant.`;
    }

    console.log(`[Chat] 🤖 Envoi à Gemini (contexte: ${contextFound ? 'Oui' : 'Non'})`);

    const chat = model.startChat();
    const result = await chat.sendMessage(prompt);
    const response = result.response.text();

    if (!response || response.trim().length === 0) {
      throw new Error("Réponse vide de l'IA");
    }

    console.log(`[Chat] ✅ Réponse générée (${response.length} caractères)`);

    res.json({ 
      answer: response.trim()
    });

  } catch (error) {
    console.error("[Chat] ❌ Erreur:", error);

    const errorMessage = error instanceof Error ? error.message : "Erreur inconnue";

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

// Enhanced ask endpoint with guaranteed book access
router.post('/ask', async (req, res) => {
  try {
    const { question } = req.body;
    console.log(`[Ask] 📝 Question: "${question?.substring(0, 100)}..."`);

    if (!question || question.trim().length === 0) {
      return res.status(400).json({ error: "Question vide" });
    }

    // Force l'accès aux livres locaux
    console.log('[Ask] 🔍 Recherche garantie dans les livres...');
    await localBooksProcessor.initialize();
    
    const books = localBooksProcessor.getAvailableBooks();
    console.log(`[Ask] 📚 ${books.length} livres disponibles:`, books.slice(0, 3));

    const relevantContent = await localBooksProcessor.searchRelevantContent(question, 8);
    console.log(`[Ask] ✅ ${relevantContent.length} passages trouvés`);

    let enhancedPrompt = question;
    
    if (relevantContent.length > 0) {
      const contextualContent = relevantContent
        .map((content, index) => `ENSEIGNEMENT ${index + 1}:\n${content.substring(0, 800)}...`)
        .join('\n\n---\n\n');
      
      enhancedPrompt = `CONTEXTE AUTHENTIQUE DES ENSEIGNEMENTS DE RABBI NAHMAN:

${contextualContent}

QUESTION: ${question}

Réponds en te basant UNIQUEMENT sur ces enseignements authentiques. Structure ta réponse ainsi:
1. Réponse spirituelle détaillée (300-400 mots)
2. Références exactes des enseignements utilisés
3. Enseignement spirituel principal à retenir
4. Conseils pratiques pour la vie quotidienne
5. Encouragement personnel

Utilise un ton chaleureux et sage.`;
    } else {
      enhancedPrompt = `QUESTION SPIRITUELLE: ${question}

En tant que Compagnon du Cœur versé dans les enseignements de Rabbi Nahman de Breslov, réponds avec sagesse et bienveillance. Même sans texte spécifique, puise dans la tradition spirituelle breslov pour offrir guidance et encouragement.`;
    }

    const askModel = ai.getGenerativeModel({ 
      model: "gemini-1.5-pro-latest",
      generationConfig: {
        maxOutputTokens: 2048,
        temperature: 0.3,
        topP: 0.95,
      }
    });

    console.log('[Ask] 🤖 Génération de la réponse...');
    const result = await askModel.generateContent(enhancedPrompt);
    const answer = result.response.text().trim();

    console.log(`[Ask] ✅ Réponse générée (${answer.length} caractères, ${relevantContent.length} sources)`);

    res.json({ answer });
    
  } catch (error) {
    console.error('[Ask] ❌ Erreur:', error);
    res.status(500).json({ 
      error: "Erreur lors de la génération de la réponse. Veuillez réessayer."
    });
  }
});

export default router;
