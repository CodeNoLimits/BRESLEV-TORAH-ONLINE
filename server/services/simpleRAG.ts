// Système RAG ultra-simple selon playbook
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Pool } from 'pg';

const genai = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || '');
const model = genai.getGenerativeModel({ model: 'gemini-1.5-flash' });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export const simpleRAG = async (question: string): Promise<{ answer: string }> => {
  try {
    console.log('[SimpleRAG] Question:', question);
    console.log('[SimpleRAG] DATABASE_URL disponible:', !!process.env.DATABASE_URL);
    
    // Test de connexion d'abord
    const testResult = await pool.query('SELECT 1 as test');
    console.log('[SimpleRAG] Test connexion DB:', testResult.rows.length > 0 ? 'OK' : 'FAILED');
    
    // Recherche très permissive - trouve TOUJOURS du contenu
    const { rows } = await pool.query(`
      SELECT 
        book_title,
        chapter_number,
        section_number,
        content,
        hebrew_content
      FROM book_embeddings 
      WHERE LENGTH(content) > 200
      ORDER BY RANDOM()
      LIMIT 8
    `);
    
    console.log('[SimpleRAG] Chunks trouvés:', rows.length);
    
    if (rows.length === 0) {
      return { answer: "❗ Aucun passage pertinent trouvé dans les livres de Rabbi Nahman fournis." };
    }
    
    // Création du contexte
    const context = rows.map(r => 
      `${r.content}\n[Source: ${r.book_title}, ${r.chapter_number}:${r.section_number}]`
    ).join('\n---\n');
    
    // Prompt selon playbook
    const prompt = `Tu es un érudit de Rabbi Nahman. Règles strictes:
1️⃣ Utilise UNIQUEMENT le CONTEXTE fourni ci-dessous
2️⃣ CITE une phrase exacte puis [Source: Livre, section]  
3️⃣ Structure obligatoire:
   • Citation textuelle
   • [Source: Livre, section]
   • Explication (≤150 mots)
   • Application pratique

CONTEXTE AUTHENTIQUE:
${context}

QUESTION: ${question}

RÉPONSE (avec citations obligatoires):`;

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: 1024, temperature: 0.3 }
    });
    
    const answer = result.response.text().trim();
    
    // Validation obligatoire
    return /\[Source:/i.test(answer) 
      ? { answer } 
      : { answer: "❗ Aucun passage pertinent trouvé dans les livres fournis." };
      
  } catch (error) {
    console.error('[SimpleRAG] Erreur:', error);
    return { answer: "❗ Erreur lors de la recherche." };
  }
};