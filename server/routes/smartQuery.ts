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

    // RECHERCHE INTELLIGENTE dans VOS livres hébreux exclusivement
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    
    let context = "";
    
    try {
      // Recherche par mots-clés dans VOS livres en priorité
      const searchPattern = `%${question.toLowerCase()}%`;
      
      const { rows } = await pool.query(`
        SELECT book_title, content, hebrew_content, chapter_number, section_number,
               CASE 
                 WHEN LOWER(content) LIKE $1 THEN 3.0
                 WHEN LOWER(book_title) LIKE $1 THEN 2.0
                 WHEN LOWER(hebrew_content) LIKE $1 THEN 1.5
                 ELSE 1.0
               END as relevance_score
        FROM book_embeddings 
        WHERE content IS NOT NULL AND LENGTH(content) > 200
        ORDER BY relevance_score DESC, RANDOM()
        LIMIT 8
      `, [searchPattern]);
      
      console.log(`[SmartQuery] ${rows.length} passages trouvés dans VOS livres avec score de pertinence`);
      
      if (rows.length === 0) {
        // Fallback - prendre du contenu authentique de VOS livres
        const fallbackQuery = await pool.query(`
          SELECT book_title, content, hebrew_content, chapter_number, section_number
          FROM book_embeddings 
          WHERE content IS NOT NULL AND LENGTH(content) > 500
          ORDER BY RANDOM()
          LIMIT 8
        `);
        
        console.log(`[SmartQuery] Fallback: ${fallbackQuery.rows.length} passages de VOS livres`);
        
        if (fallbackQuery.rows.length === 0) {
          return res.json({ 
            answer: "❌ Aucun contenu trouvé dans vos livres. Vérifiez que la base de données contient vos 13 livres hébreux." 
          });
        }
        
        rows.push(...fallbackQuery.rows);
      }
      
      const relevantContent = rows.map((row: any) => 
        `[${row.book_title} - Chapitre ${row.chapter_number}:${row.section_number}]\n${row.content.substring(0, 1000)}\n\nTexte hébreu: ${row.hebrew_content ? row.hebrew_content.substring(0, 300) : 'Non disponible'}`
      );
      
      console.log(`[SmartQuery] ${relevantContent.length} extraits préparés de VOS livres`);

      // Construire le contexte avec sources authentiques
      context = relevantContent
        .map((content: string, index: number) => `${content}\n[Source: Livre ${index + 1}]`)
        .join('\n\n---\n\n');
        
    } catch (dbError) {
      console.error('[SmartQuery] Erreur PostgreSQL:', dbError);
      return res.json({ 
        answer: "❌ Erreur d'accès à la base de données contenant vos livres hébreux." 
      });
    }

    // Vérifier que le contexte existe
    if (!context || context.length === 0) {
      return res.json({ 
        answer: "Aucun contexte disponible pour cette question." 
      });
    }

    // Prompt ULTRA-STRICT pour utiliser VOS livres EXCLUSIVEMENT
    const prompt = `Tu es un érudit spécialisé dans les enseignements de Rabbi Na'hman de Breslov. 

RÈGLES ABSOLUES ET NON-NÉGOCIABLES:
🚫 Tu ne peux utiliser AUCUNE connaissance générale sur Rabbi Nahman
🚫 Tu ne peux utiliser AUCUNE source externe 
✅ Tu dois utiliser UNIQUEMENT le contexte ci-dessous extrait des livres personnels de l'utilisateur
✅ Chaque réponse DOIT contenir des citations exactes avec [Source: Livre X]
✅ Si le contexte ne permet pas de répondre, dis clairement "Le contexte fourni ne contient pas d'information sur cette question"

FORMAT OBLIGATOIRE:
1. Citation textuelle exacte du contexte
2. [Source: Livre X] - obligatoire  
3. Explication basée uniquement sur la citation (max 150 mots)
4. Application pratique tirée du texte cité

CONTEXTE AUTHENTIQUE DES LIVRES DE L'UTILISATEUR:
"""${context}"""

QUESTION: ${question}

IMPORTANT: Si tu n'arrives pas à répondre avec le contexte fourni, ne invente rien. Dis simplement que l'information n'est pas dans les extraits fournis.`;

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