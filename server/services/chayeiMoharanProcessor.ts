import { GoogleGenerativeAI } from '@google/generative-ai';
import mammoth from 'mammoth';
import fs from 'fs';
import path from 'path';

const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

interface ChayeiChapter {
  number: number;
  title: string;
  hebrewText: string;
  frenchTranslation?: string;
  sections: ChayeiSection[];
}

interface ChayeiSection {
  number: number;
  hebrewText: string;
  frenchTranslation?: string;
  reference: string;
}

export class ChayeiMoharanProcessor {
  private chapters: Map<number, ChayeiChapter> = new Map();
  private fullText: string = '';
  private initialized = false;

  async initialize() {
    if (this.initialized) return;

    console.log('[ChayeiMoharan] Initialisation du processeur...');
    
    const filePath = path.join(process.cwd(), 'attached_assets', 'Chayei_Moharan_1751531406916.docx');
    if (fs.existsSync(filePath)) {
      await this.processDocxFile(filePath);
    }

    this.initialized = true;
    console.log(`[ChayeiMoharan] Initialisé avec ${this.chapters.size} chapitres`);
  }

  private async processDocxFile(filePath: string) {
    try {
      const result = await mammoth.extractRawText({ path: filePath });
      const text = result.value;
      this.fullText = text;
      await this.parseChapters(text);
    } catch (error) {
      console.error('[ChayeiMoharan] Erreur lecture DOCX:', error);
    }
  }

  private async parseChapters(text: string) {
    const lines = text.split('\n').filter(line => line.trim());
    let currentChapter: ChayeiChapter | null = null;
    let sectionCounter = 1;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (this.isChapterStart(line, i, lines)) {
        if (currentChapter) {
          this.chapters.set(currentChapter.number, currentChapter);
        }
        
        const chapterNumber = this.chapters.size + 1;
        currentChapter = {
          number: chapterNumber,
          title: line.substring(0, 50),
          hebrewText: '',
          sections: []
        };
        sectionCounter = 1;
      } else if (currentChapter && line.length > 10) {
        currentChapter.hebrewText += line + ' ';
        
        const section: ChayeiSection = {
          number: sectionCounter,
          hebrewText: line,
          reference: `Chayei Moharan ${currentChapter.number}:${sectionCounter}`,
        };
        
        currentChapter.sections.push(section);
        sectionCounter++;
      }
    }

    if (currentChapter) {
      this.chapters.set(currentChapter.number, currentChapter);
    }
  }

  private isChapterStart(line: string, index: number, lines: string[]): boolean {
    return line.length > 5 && line.includes('ה') && index % 50 === 0;
  }

  // RECHERCHE AVEC GEMINI UTILISANT SES CONNAISSANCES
  async searchWithGemini(query: string): Promise<{
    answer: string;
    sources: string[];
    relevantSections: ChayeiSection[];
    translatedCitations: Array<{
      reference: string;
      hebrewText: string;
      frenchTranslation: string;
      chapterNumber: number;
    }>;
  }> {
    await this.initialize();

    console.log(`[ChayeiMoharan] SOLUTION D'URGENCE - Recherche Gemini libre sur la question`);
    
    const knowledgePrompt = `Tu es un expert en "Chayei Moharan" de Rabbi Nahman de Breslov. 

QUESTION: ${query}

INSTRUCTIONS SPÉCIALES:
1. Utilise tes connaissances sur le livre "Chayei Moharan" pour répondre à cette question
2. Si tu connais des passages ou références pertinents, cite-les
3. Si tu ne trouves pas d'information spécifique dans Chayei Moharan, dis-le clairement
4. Reste fidèle aux enseignements authentiques de Rabbi Nahman

Format demandé:
**Réponse spirituelle:** [Ta réponse basée sur Chayei Moharan]

**Citations et références:** [Si tu connais des passages pertinents]

NOTE: Si tu ne connais pas d'information spécifique sur ce sujet dans Chayei Moharan, indique-le clairement.`;
    
    try {
      const response = await ai.getGenerativeModel({ model: "gemini-1.5-flash" }).generateContent(knowledgePrompt);
      const answer = response.response.text() || "Aucune réponse générée";
      
      return {
        answer,
        sources: [],
        relevantSections: [],
        translatedCitations: []
      };
    } catch (error) {
      console.error('[ChayeiMoharan] Erreur Gemini connaissance:', error);
      
      return {
        answer: `Impossible d'accéder aux informations sur "${query}" dans Chayei Moharan pour le moment. Veuillez réessayer.`,
        sources: [],
        relevantSections: [],
        translatedCitations: []
      };
    }
  }

  async translateChapter(chapterNumber: number, startChar = 0, length = 1000): Promise<{
    hebrewText: string;
    frenchTranslation: string;
    hasMore: boolean;
    nextStart: number;
  }> {
    await this.initialize();
    
    const chapter = this.chapters.get(chapterNumber);
    if (!chapter) {
      return {
        hebrewText: `Chapitre ${chapterNumber} non trouvé`,
        frenchTranslation: `Chapitre ${chapterNumber} non trouvé`,
        hasMore: false,
        nextStart: 0
      };
    }

    const hebrewChunk = chapter.hebrewText.substring(startChar, startChar + length);
    const hasMore = startChar + length < chapter.hebrewText.length;

    try {
      const prompt = `Traduis ce passage de Chayei Moharan en français:

${hebrewChunk}

Instructions:
- Traduction française claire et élégante
- Respecter le style spirituel de Rabbi Nahman
- Garder les termes hébreux importants avec traduction entre parenthèses
- Format: traduction directe sans commentaires`;

      const response = await ai.getGenerativeModel({ model: "gemini-1.5-flash" }).generateContent(prompt);

      return {
        hebrewText: hebrewChunk,
        frenchTranslation: response.response.text() || "Traduction non disponible",
        hasMore,
        nextStart: startChar + length
      };

    } catch (error) {
      console.error('[ChayeiMoharan] Erreur traduction:', error);
      return {
        hebrewText: hebrewChunk,
        frenchTranslation: `Erreur de traduction: ${error}`,
        hasMore,
        nextStart: startChar + length
      };
    }
  }

  getChaptersList(): { number: number; title: string }[] {
    const chapters: { number: number; title: string }[] = [];
    this.chapters.forEach(chapter => {
      chapters.push({
        number: chapter.number,
        title: chapter.title
      });
    });
    return chapters;
  }

  getTotalChapters(): number {
    return this.chapters.size;
  }
}

export const chayeiMoharanProcessor = new ChayeiMoharanProcessor();