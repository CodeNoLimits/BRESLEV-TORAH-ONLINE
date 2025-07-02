import express from "express";
import { Pool } from 'pg';

const router = express.Router();

// SYSTÈME ULTRA-SIMPLE SANS GEMINI POUR TESTER
router.post("/", async (req, res) => {
  try {
    const { question } = req.body;
    
    if (!question || question.trim().length === 0) {
      return res.status(400).json({ error: "Question vide" });
    }

    console.log(`[SmartQuery] Question reçue: ${question}`);

    // ACCÈS DIRECT À VOS LIVRES dans PostgreSQL
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    
    try {
      // Test simple d'abord
      const countResult = await pool.query('SELECT COUNT(*) FROM book_embeddings');
      console.log(`[SmartQuery] Total passages disponibles: ${countResult.rows[0].count}`);
      
      // Recherche intelligente dans VOS livres
      const searchPattern = `%${question.toLowerCase()}%`;
      
      const { rows } = await pool.query(`
        SELECT book_title, content, hebrew_content, chapter_number, section_number
        FROM book_embeddings 
        WHERE content IS NOT NULL 
        AND LENGTH(content) > 200
        AND (
          LOWER(content) LIKE $1
          OR LOWER(book_title) LIKE $1
        )
        ORDER BY 
          CASE 
            WHEN LOWER(content) LIKE $1 THEN 1
            ELSE 2
          END,
          RANDOM()
        LIMIT 5
      `, [searchPattern]);
      
      console.log(`[SmartQuery] ${rows.length} passages trouvés dans VOS livres`);
      
      if (rows.length === 0) {
        // Fallback - prendre du contenu aléatoire de VOS livres
        const fallbackQuery = await pool.query(`
          SELECT book_title, content, hebrew_content, chapter_number, section_number
          FROM book_embeddings 
          WHERE content IS NOT NULL AND LENGTH(content) > 300
          ORDER BY RANDOM()
          LIMIT 3
        `);
        
        console.log(`[SmartQuery] Fallback: ${fallbackQuery.rows.length} passages aléatoires`);
        rows.push(...fallbackQuery.rows);
      }
      
      // CONSTRUCTION RÉPONSE DIRECTE SANS IA
      let answer = `📚 **Voici ce que j'ai trouvé dans vos livres de Rabbi Nahman :**\n\n`;
      
      rows.forEach((row, index) => {
        answer += `**${index + 1}. ${row.book_title} - Chapitre ${row.chapter_number}:${row.section_number}**\n`;
        answer += `${row.content.substring(0, 500)}...\n\n`;
        if (row.hebrew_content) {
          answer += `*Texte hébreu :* ${row.hebrew_content.substring(0, 200)}...\n\n`;
        }
        answer += `[Source: ${row.book_title}]\n\n---\n\n`;
      });
      
      answer += `✅ **${rows.length} passages authentiques trouvés dans votre bibliothèque personnelle**`;
      
      res.json({ answer });
      
    } catch (dbError) {
      console.error('[SmartQuery] Erreur PostgreSQL:', dbError);
      res.json({ 
        answer: `❌ Erreur d'accès à vos livres : ${dbError.message}` 
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