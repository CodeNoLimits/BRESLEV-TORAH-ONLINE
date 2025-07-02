import express from "express";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { Pool } from 'pg';

const router = express.Router();

if (!process.env.GOOGLE_AI_API_KEY) {
  throw new Error("⛔️ GOOGLE_AI_API_KEY manquante");
}

const ai = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);
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

    // Solution ultra-simple selon playbook : utiliser PostgreSQL directement
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    
    let context = "";
    
    try {
      const { rows } = await pool.query(`
        SELECT book_title, content, hebrew_content, chapter_number, section_number
        FROM book_embeddings 
        WHERE content IS NOT NULL AND LENGTH(content) > 200
        ORDER BY RANDOM()
        LIMIT 8
      `);
      
      console.log(`[SmartQuery] ${rows.length} passages trouvés dans PostgreSQL`);
      
      if (rows.length === 0) {
        return res.json({ 
          answer: "Aucun passage trouvé dans la base de données." 
        });
      }
      
      const relevantContent = rows.map((row: any) => 
        `[${row.book_title} - ${row.chapter_number}:${row.section_number}]\n${row.content.substring(0, 800)}...`
      );
      
      console.log(`[SmartQuery] ${relevantContent.length} passages trouvés`);

      // Construire le contexte
      context = relevantContent
        .map((content: string, index: number) => `${content.substring(0, 800)}...\n[Source: Enseignement ${index + 1}]`)
        .join('\n---\n');
        
    } catch (dbError) {
      console.error('[SmartQuery] Erreur PostgreSQL:', dbError);
      return res.json({ 
        answer: "Erreur d'accès à la base de données." 
      });
    }

    // Vérifier que le contexte existe
    if (!context || context.length === 0) {
      return res.json({ 
        answer: "Aucun contexte disponible pour cette question." 
      });
    }

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
    
    console.log(`[SmartQuery] Réponse brute de l'IA:`, answer.substring(0, 200) + "...");

    // Vérifier que la réponse contient bien des sources
    if (!/\[Source:/i.test(answer)) {
      console.log(`[SmartQuery] Réponse rejetée - pas de [Source: trouvé`);
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