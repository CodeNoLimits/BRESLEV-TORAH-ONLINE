import * as fs from 'fs';
import * as path from 'path';
import mammoth from 'mammoth';
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

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
    
    // Traiter le fichier Chayei Moharan
    const docxPath = path.join(process.cwd(), 'attached_assets', 'Chayei_Moharan_1751531406916.docx');
    
    if (fs.existsSync(docxPath)) {
      await this.processDocxFile(docxPath);
    } else {
      console.error('[ChayeiMoharan] Fichier Chayei Moharan non trouvé');
    }

    this.initialized = true;
    console.log(`[ChayeiMoharan] Initialisé avec ${this.chapters.size} chapitres`);
  }

  private async processDocxFile(filePath: string) {
    try {
      const result = await mammoth.extractRawText({ path: filePath });
      this.fullText = result.value;
      
      // Parser le texte en chapitres et sections
      await this.parseChapters(this.fullText);
      
    } catch (error) {
      console.error('[ChayeiMoharan] Erreur traitement DOCX:', error);
    }
  }

  private async parseChapters(text: string) {
    const lines = text.split('\n').filter(line => line.trim());
    let currentChapter: ChayeiChapter | null = null;
    let chapterNumber = 1;
    let sectionNumber = 1;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Détecter un nouveau chapitre (par exemple: ligne courte qui semble être un titre)
      if (this.isChapterStart(line, i, lines)) {
        if (currentChapter) {
          this.chapters.set(currentChapter.number, currentChapter);
        }
        
        currentChapter = {
          number: chapterNumber++,
          title: line,
          hebrewText: '',
          sections: []
        };
        sectionNumber = 1;
      } else if (currentChapter && line.length > 20) {
        // Ajouter le texte au chapitre actuel
        currentChapter.hebrewText += line + ' ';
        
        // Créer des sections tous les 500-800 caractères
        if (currentChapter.hebrewText.length > 500 * sectionNumber) {
          const sectionText = this.extractSection(currentChapter.hebrewText, sectionNumber);
          
          currentChapter.sections.push({
            number: sectionNumber,
            hebrewText: sectionText,
            reference: `Chayei Moharan ${currentChapter.number}:${sectionNumber}`
          });
          
          sectionNumber++;
        }
      }
    }
    
    // Ajouter le dernier chapitre
    if (currentChapter) {
      this.chapters.set(currentChapter.number, currentChapter);
    }
  }

  private isChapterStart(line: string, index: number, lines: string[]): boolean {
    // Logique pour détecter le début d'un chapitre
    if (line.length < 10 && /^[א-ת\u0590-\u05FF\s]+$/.test(line)) return true;
    if (line.match(/^[א-ת]\s*$/)) return true;
    if (line.match(/^\([א-ת]\)/) || line.match(/^[0-9]+\./)) return true;
    return false;
  }

  private extractSection(text: string, sectionNum: number): string {
    const startPos = (sectionNum - 1) * 500;
    const endPos = Math.min(startPos + 800, text.length);
    return text.substring(startPos, endPos).trim();
  }

  // RECHERCHE INTELLIGENTE avec Gemini
  async searchWithGemini(query: string): Promise<{
    answer: string;
    sources: string[];
    relevantSections: ChayeiSection[];
  }> {
    await this.initialize();

    console.log(`[ChayeiMoharan] Recherche Gemini: "${query}"`);

    // 1. Recherche textuelle dans les chapitres
    const relevantSections = this.findRelevantSections(query);
    
    // 2. Construire le contexte pour Gemini
    const context = relevantSections.map(section => 
      `${section.reference}: ${section.hebrewText.substring(0, 400)}`
    ).join('\n\n');

    // 3. Requête Gemini avec contexte
    const prompt = `Tu es un expert en enseignements de Rabbi Nahman de Breslov. 
Réponds à cette question en français en utilisant UNIQUEMENT le texte hébreu de Chayei Moharan fourni ci-dessous.

Question: ${query}

Contexte de Chayei Moharan:
${context}

Instructions:
1. Réponds en français avec des citations précises
2. Inclus les références exactes (ex: Chayei Moharan 5:2)
3. Traduis les passages hébreux pertinents
4. Donne une réponse détaillée et spirituellement enrichissante
5. Cite le texte hébreu original avec la traduction française

Format de réponse:
**Réponse:** [Ta réponse détaillée]

**Citations:**
- Chayei Moharan X:Y - [Texte hébreu] → [Traduction française]

**Sources:** [Liste des références]`;

    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
      });

      const answer = response.text || "Aucune réponse générée";
      const sources = relevantSections.map(s => s.reference);

      return {
        answer,
        sources,
        relevantSections
      };

    } catch (error) {
      console.error('[ChayeiMoharan] Erreur Gemini:', error);
      return {
        answer: `Erreur lors de la recherche: ${error}`,
        sources: [],
        relevantSections: []
      };
    }
  }

  private findRelevantSections(query: string): ChayeiSection[] {
    const queryWords = query.toLowerCase().split(' ').filter(w => w.length > 2);
    const results: { section: ChayeiSection; score: number }[] = [];

    const chaptersArray: ChayeiChapter[] = [];
    this.chapters.forEach(chapter => chaptersArray.push(chapter));
    for (const chapter of chaptersArray) {
      for (const section of chapter.sections) {
        let score = 0;
        const sectionText = section.hebrewText.toLowerCase();
        
        queryWords.forEach(word => {
          if (sectionText.includes(word)) score += 2;
          // Ajouter des synonymes spirituels
          const spiritualMatches = this.getSpiritualSynonyms(word);
          spiritualMatches.forEach(synonym => {
            if (sectionText.includes(synonym)) score += 1;
          });
        });

        if (score > 0) {
          results.push({ section, score });
        }
      }
    }

    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map(r => r.section);
  }

  private getSpiritualSynonyms(word: string): string[] {
    const synonyms: { [key: string]: string[] } = {
      'joie': ['שמחה', 'simcha', 'heureux', 'bonheur'],
      'prière': ['תפילה', 'tefila', 'davening'],
      'maître': ['רבי', 'rabbi', 'rebbe'],
      'vie': ['חיים', 'chaim'],
      'âme': ['נשמה', 'neshama'],
      'dieu': ['השם', 'hashem', 'אלהים'],
      'torah': ['תורה', 'enseignement'],
      'teshuvah': ['תשובה', 'repentir']
    };
    
    return synonyms[word] || [];
  }

  // TRADUCTION LAZY avec Gemini
  async translateChapter(chapterNumber: number, startChar = 0, length = 1000): Promise<{
    hebrewText: string;
    frenchTranslation: string;
    hasMore: boolean;
    nextStart: number;
  }> {
    await this.initialize();
    
    const chapter = this.chapters.get(chapterNumber);
    if (!chapter) {
      throw new Error(`Chapitre ${chapterNumber} non trouvé`);
    }

    const hebrewChunk = chapter.hebrewText.substring(startChar, startChar + length);
    const hasMore = startChar + length < chapter.hebrewText.length;

    // Traduire avec Gemini
    const prompt = `Traduis ce passage de Chayei Moharan en français de manière fluide et spirituellement appropriée:

Texte hébreu:
${hebrewChunk}

Instructions:
- Traduction française claire et élégante
- Respecter le style spirituel de Rabbi Nahman
- Garder les termes hébreux importants avec traduction entre parenthèses
- Format: traduction directe sans commentaires`;

    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
      });

      return {
        hebrewText: hebrewChunk,
        frenchTranslation: response.text || "Traduction non disponible",
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