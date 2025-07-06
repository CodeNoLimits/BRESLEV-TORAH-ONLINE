import { GoogleGenerativeAI } from '@google/generative-ai';
import { db } from '../db';
import { sql } from 'drizzle-orm';

const genai = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || '');
const model = genai.getGenerativeModel({ model: 'gemini-1.5-flash' });

interface ContextChunk {
  book: string;
  section: string;
  chunk: string;
  score: number;
}

class QueryRouter {
  async handle(question: string): Promise<{ answer: string }> {
    console.log('[QueryRouter] Question reçue:', question);
    
    const ctx = await this.retrieve(question);
    console.log('[QueryRouter] Contexte trouvé:', ctx.length, 'chunks');
    
    const answer = await this.generateAnswer(question, ctx);
    return { answer };
  }

  async retrieve(q: string): Promise<ContextChunk[]> {
    try {
      console.log('[QueryRouter] Recherche pour:', q);
      // Recherche simple par similarité textuelle dans vos livres
      const searchPattern = `%${q}%`;
      console.log('[QueryRouter] Pattern de recherche:', searchPattern);
      
      const results = await db.execute(sql`
        SELECT 
          book_title as book,
          CONCAT(chapter_number, ':', section_number) as section,
          content as chunk,
          CASE 
            WHEN content ILIKE ${searchPattern} THEN 1.0
            WHEN book_title ILIKE ${searchPattern} THEN 0.8
            WHEN hebrew_content ILIKE ${searchPattern} THEN 0.6
            ELSE 0.3
          END as score
        FROM book_embeddings 
        WHERE 
          content ILIKE ${searchPattern}
          OR book_title ILIKE ${searchPattern}
          OR hebrew_content ILIKE ${searchPattern}
        ORDER BY score DESC, LENGTH(content) DESC
        LIMIT 12
      `);
      
      // Les résultats Drizzle sont dans .rows
      const rows = results.rows || [];
      const filtered = rows.filter((r: any) => r && r.chunk && r.chunk.length > 50);
      
      console.log('[QueryRouter] Résultats trouvés:', filtered.length);
      return filtered;
      
    } catch (error) {
      console.error('[QueryRouter] Erreur recherche:', error);
      return [];
    }
  }

  async generateAnswer(q: string, ctx: ContextChunk[]): Promise<string> {
    if (ctx.length === 0) {
      return "❗ Aucun passage pertinent trouvé dans les livres de Rabbi Nahman fournis.";
    }

    const context = ctx.map(c => `${c.chunk}\n[Source: ${c.book}, ${c.section}]`).join('\n---\n');
    
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

QUESTION: ${q}

RÉPONSE (avec citations obligatoires):`;

    try {
      const result = await model.generateContent({
        contents: [{
          role: 'user',
          parts: [{ text: prompt }]
        }],
        generationConfig: {
          maxOutputTokens: 1024,
          temperature: 0.3
        }
      });
      
      const answer = result.response.text().trim();
      
      // Validation obligatoire : doit contenir [Source:
      return /\[Source:/i.test(answer) 
        ? answer 
        : "❗ Aucun passage pertinent trouvé dans les livres fournis.";
        
    } catch (error) {
      console.error('[QueryRouter] Erreur génération:', error);
      return "❗ Erreur lors de la génération de la réponse.";
    }
  }
}

export const queryRouterSimple = new QueryRouter();