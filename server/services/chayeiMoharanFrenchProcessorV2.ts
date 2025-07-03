import { GoogleGenerativeAI } from '@google/generative-ai';
import mammoth from 'mammoth';
import fs from 'fs';
import path from 'path';

const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

interface DocumentChunk {
  id: string;
  content: string;
  startLine: number;
  endLine: number;
  keywords: string[];
}

export class ChayeiMoharanFrenchProcessorV2 {
  private chunks: DocumentChunk[] = [];
  private fullText: string = '';
  private lines: string[] = [];
  private initialized = false;

  async initialize() {
    if (this.initialized) return;

    console.log('[ChayeiMoharan-FR-V2] Initialisation améliorée du processeur français...');
    
    const filePath = path.join(process.cwd(), 'attached_assets', 'CHAYE MOHARAN FR_1751542665093.docx');
    if (fs.existsSync(filePath)) {
      await this.processDocxFile(filePath);
    }

    this.initialized = true;
    console.log(`[ChayeiMoharan-FR-V2] Initialisé avec ${this.chunks.length} chunks et ${this.lines.length} lignes`);
  }

  private async processDocxFile(filePath: string) {
    try {
      const result = await mammoth.extractRawText({ path: filePath });
      this.fullText = result.value;
      this.lines = this.fullText.split('\n');
      
      // Créer des chunks de 30 lignes avec chevauchement
      const chunkSize = 30;
      const overlap = 5;
      
      for (let i = 0; i < this.lines.length; i += (chunkSize - overlap)) {
        const endIndex = Math.min(i + chunkSize, this.lines.length);
        const chunkLines = this.lines.slice(i, endIndex);
        const chunkContent = chunkLines.join('\n');
        
        if (chunkContent.trim().length > 50) {
          const chunk: DocumentChunk = {
            id: `chunk_${i}`,
            content: chunkContent,
            startLine: i,
            endLine: endIndex,
            keywords: this.extractKeywords(chunkContent)
          };
          
          this.chunks.push(chunk);
        }
      }
      
      console.log(`[ChayeiMoharan-FR-V2] Document traité: ${this.lines.length} lignes, ${this.chunks.length} chunks`);
    } catch (error) {
      console.error('[ChayeiMoharan-FR-V2] Erreur lecture DOCX:', error);
    }
  }

  private extractKeywords(text: string): string[] {
    const keywords: string[] = [];
    const importantWords = text.match(/[A-Z][a-zàâäéèêëïîôùûüÿçœæ]+/g) || [];
    
    // Ajouter les mots importants (noms propres, etc.)
    importantWords.forEach(word => {
      if (word.length > 3 && !keywords.includes(word)) {
        keywords.push(word.toLowerCase());
      }
    });
    
    // Chercher des mots-clés spécifiques
    const specialTerms = ['rabbi', 'torah', 'lemberg', 'voyage', 'enseignement', 'maître', 'moharan', 'breslov'];
    specialTerms.forEach(term => {
      if (text.toLowerCase().includes(term)) {
        keywords.push(term);
      }
    });
    
    return keywords;
  }

  async searchWithFullContext(query: string): Promise<{
    answer: string;
    sources: string[];
    relevantChunks: DocumentChunk[];
    foundInDocument: boolean;
  }> {
    await this.initialize();

    console.log(`[ChayeiMoharan-FR-V2] Recherche approfondie: "${query}"`);
    
    // 1. Recherche exhaustive dans tous les chunks
    const queryLower = query.toLowerCase();
    const queryWords = queryLower.split(' ').filter(w => w.length > 2);
    
    const scoredChunks = this.chunks.map(chunk => {
      let score = 0;
      const contentLower = chunk.content.toLowerCase();
      
      // Score exact pour chaque mot de la requête
      queryWords.forEach(word => {
        if (contentLower.includes(word)) {
          score += 10;
          // Bonus si le mot apparaît plusieurs fois
          const matches = (contentLower.match(new RegExp(word, 'g')) || []).length;
          score += matches * 5;
        }
      });
      
      // Bonus pour les mots-clés
      chunk.keywords.forEach(keyword => {
        if (queryLower.includes(keyword)) {
          score += 15;
        }
      });
      
      return { chunk, score };
    });
    
    // Prendre les meilleurs chunks
    const relevantChunks = scoredChunks
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
      .map(item => item.chunk);
    
    console.log(`[ChayeiMoharan-FR-V2] Trouvé ${relevantChunks.length} chunks pertinents`);
    
    // 2. Construire un contexte complet pour Gemini
    const contextForGemini = `Tu es un expert du livre "Chayei Moharan" en français. 
    
VOICI LE DOCUMENT COMPLET À ANALYSER (${this.lines.length} lignes):

${relevantChunks.length > 0 ? 
  `PASSAGES LES PLUS PERTINENTS POUR LA QUESTION:
${relevantChunks.map((chunk, index) => `
--- PASSAGE ${index + 1} (lignes ${chunk.startLine}-${chunk.endLine}) ---
${chunk.content}
--- FIN DU PASSAGE ${index + 1} ---
`).join('\n')}` : 
  `PREMIERS PASSAGES DU DOCUMENT:
${this.chunks.slice(0, 5).map((chunk, index) => `
--- PASSAGE ${index + 1} (lignes ${chunk.startLine}-${chunk.endLine}) ---
${chunk.content}
--- FIN DU PASSAGE ${index + 1} ---
`).join('\n')}`
}

QUESTION DE L'UTILISATEUR: ${query}

INSTRUCTIONS IMPORTANTES:
1. Base ta réponse UNIQUEMENT sur le contenu du document fourni
2. Si l'information est dans le document, cite le passage exact et indique les numéros de lignes
3. Si l'information n'est PAS dans les passages fournis, indique clairement que tu n'as pas trouvé cette information dans les extraits analysés
4. Sois précis et cite directement le texte quand c'est pertinent
5. N'invente JAMAIS d'information qui n'est pas dans le document

Format de réponse:
**Réponse:** [Ta réponse détaillée]
**Citations du document:** [Les passages exacts avec numéros de lignes]
**Trouvé dans le document:** [OUI ou NON]`;

    try {
      const response = await ai.getGenerativeModel({ model: "gemini-1.5-flash" }).generateContent(contextForGemini);
      const answer = response.response.text() || "Aucune réponse générée";
      
      // Déterminer si l'information a été trouvée
      const foundInDocument = answer.toLowerCase().includes('oui') || 
                             relevantChunks.length > 0 ||
                             !answer.toLowerCase().includes('pas trouvé');
      
      return {
        answer,
        sources: relevantChunks.map(chunk => `Lignes ${chunk.startLine}-${chunk.endLine}`),
        relevantChunks,
        foundInDocument
      };
    } catch (error) {
      console.error('[ChayeiMoharan-FR-V2] Erreur Gemini:', error);
      
      // Réponse de secours avec les chunks trouvés
      if (relevantChunks.length > 0) {
        const fallbackAnswer = `J'ai trouvé ${relevantChunks.length} passages potentiellement pertinents dans le document:\n\n`;
        const citations = relevantChunks.slice(0, 3).map((chunk, i) => 
          `Passage ${i+1} (lignes ${chunk.startLine}-${chunk.endLine}):\n"${chunk.content.substring(0, 300)}..."`
        ).join('\n\n');
        
        return {
          answer: fallbackAnswer + citations,
          sources: relevantChunks.map(chunk => `Lignes ${chunk.startLine}-${chunk.endLine}`),
          relevantChunks,
          foundInDocument: true
        };
      }
      
      return {
        answer: `Erreur lors de l'analyse. J'ai ${this.chunks.length} chunks du document en mémoire mais je n'ai pas pu traiter votre question.`,
        sources: [],
        relevantChunks: [],
        foundInDocument: false
      };
    }
  }

  // Recherche spécifique d'un terme
  async findExactTerm(term: string): Promise<{
    found: boolean;
    occurrences: Array<{
      lineNumber: number;
      lineContent: string;
      context: string;
    }>;
  }> {
    await this.initialize();
    
    const termLower = term.toLowerCase();
    const occurrences: Array<{
      lineNumber: number;
      lineContent: string;
      context: string;
    }> = [];
    
    this.lines.forEach((line, index) => {
      if (line.toLowerCase().includes(termLower)) {
        const contextStart = Math.max(0, index - 2);
        const contextEnd = Math.min(this.lines.length - 1, index + 2);
        const context = this.lines.slice(contextStart, contextEnd + 1).join('\n');
        
        occurrences.push({
          lineNumber: index + 1,
          lineContent: line,
          context
        });
      }
    });
    
    return {
      found: occurrences.length > 0,
      occurrences
    };
  }

  getDocumentStats(): {
    totalLines: number;
    totalChunks: number;
    totalCharacters: number;
  } {
    return {
      totalLines: this.lines.length,
      totalChunks: this.chunks.length,
      totalCharacters: this.fullText.length
    };
  }

  getFullText(): string {
    return this.fullText;
  }
}

export const chayeiMoharanFrenchProcessorV2 = new ChayeiMoharanFrenchProcessorV2();