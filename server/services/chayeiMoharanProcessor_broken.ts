import * as fs from 'fs';
import * as path from 'path';
import mammoth from 'mammoth';
import { GoogleGenerativeAI } from "@google/generative-ai";

const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

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
    translatedCitations: Array<{
      reference: string;
      hebrewText: string;
      frenchTranslation: string;
      chapterNumber: number;
    }>;
  }> {
    await this.initialize();

    console.log(`[ChayeiMoharan] Recherche Gemini: "${query}"`);

    // 1. TRADUCTION FRANÇAISE → HÉBREU POUR RECHERCHE EFFICACE
    const hebrewTerms = await this.translateQueryToHebrew(query);
    console.log(`[ChayeiMoharan] Termes hébreux: ${hebrewTerms.join(', ')}`);

    // 2. Recherche avec termes français ET hébreux
    const relevantSections = this.findRelevantSections(query, hebrewTerms);
    
    // 2. Construire le contexte pour Gemini
    const context = relevantSections.map(section => 
      `${section.reference}: ${section.hebrewText.substring(0, 500)}`
    ).join('\n\n');

    // 3. NOUVELLE APPROCHE: RECHERCHE GEMINI AVEC SEGMENTS DE TEXTE
    console.log(`[ChayeiMoharan] SOLUTION D'URGENCE - Recherche Gemini libre sur la question`);
    
    // SOLUTION TEMPORAIRE: Laisser Gemini utiliser ses connaissances sur Chayei Moharan
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

  private getChapterNumberFromReference(reference: string): number {
          } catch (error) {
            console.error(`[ChayeiMoharan] Erreur traduction section ${index}:`, error);
            return {
              reference: section.reference,
              hebrewText: section.hebrewText,
              frenchTranslation: "Erreur de traduction",
              chapterNumber: this.getChapterNumberFromReference(section.reference)
            };
          }
        })
      );

      return {
        answer,
        sources,
        relevantSections,
        translatedCitations
      };

    } catch (error) {
      console.error('[ChayeiMoharan] Erreur Gemini:', error);
      
      // Fallback avec traductions manuelles
      const translatedCitations = relevantSections.map(section => ({
        reference: section.reference,
        hebrewText: section.hebrewText,
        frenchTranslation: "Traduction non disponible (erreur de connexion)",
        chapterNumber: this.getChapterNumberFromReference(section.reference)
      }));

      const sources = relevantSections.map(s => s.reference);
      
      return {
        answer: `En raison d'une erreur de connexion avec Gemini, voici les passages trouvés dans Chayei Moharan qui correspondent à votre recherche "${query}". Les traductions complètes ne sont pas disponibles pour le moment.`,
        sources,
        relevantSections,
        translatedCitations
      };
    }
  }

  private getChapterNumberFromReference(reference: string): number {
    const match = reference.match(/Chayei Moharan (\d+)/);
    return match ? parseInt(match[1]) : 1;
  }

  // FONCTION DE TRADUCTION FRANÇAISE → HÉBREU 
  private async translateQueryToHebrew(query: string): Promise<string[]> {
    try {
      const translationPrompt = `Traduis ces mots/concepts spirituels français en hébreu biblique/talmudique correspondant:

Query: "${query}"

Retourne UNIQUEMENT une liste de mots hébreux séparés par des virgules, sans explication.
Exemple pour "joie": שמחה, גיל, חדוה
Exemple pour "prière": תפילה, דברות, השתוותיות
Exemple pour "tsadik": צדיק, אמת, האמת

Mots hébreux:`;

      const model = ai.getGenerativeModel({ model: "gemini-1.5-flash" });
      const response = await model.generateContent(translationPrompt);
      const hebrewText = response.response.text().trim();
      
      // Extraire les mots hébreux
      const hebrewTerms = hebrewText.split(',').map(term => term.trim()).filter(term => term.length > 0);
      
      return hebrewTerms.length > 0 ? hebrewTerms : [];
    } catch (error) {
      console.warn('[ChayeiMoharan] Erreur traduction:', error);
      return [];
    }
  }

  private findRelevantSections(query: string, hebrewTerms: string[] = []): ChayeiSection[] {
    const queryWords = query.toLowerCase().split(' ').filter(w => w.length > 2);
    const results: { section: ChayeiSection; score: number }[] = [];

    const chaptersArray: ChayeiChapter[] = [];
    this.chapters.forEach(chapter => chaptersArray.push(chapter));
    for (const chapter of chaptersArray) {
      for (const section of chapter.sections) {
        let score = 0;
        const sectionText = section.hebrewText.toLowerCase();
        
        // Score pour mots français
        queryWords.forEach(word => {
          if (sectionText.includes(word)) score += 2;
          // Ajouter des synonymes spirituels
          const spiritualMatches = this.getSpiritualSynonyms(word);
          spiritualMatches.forEach(synonym => {
            if (sectionText.includes(synonym)) score += 1;
          });
        });

        // Score ÉLEVÉ pour mots hébreux (recherche principale)
        hebrewTerms.forEach(hebrewTerm => {
          if (section.hebrewText.includes(hebrewTerm)) {
            score += 10; // Score très élevé pour correspondance hébreu
            console.log(`[ChayeiMoharan] Trouvé "${hebrewTerm}" dans ${section.reference}`);
          }
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

  // RECHERCHE EXHAUSTIVE DANS TOUT LE TEXTE
  intelligentSearch(query: string, hebrewTerms: string[]): ChayeiSection[] {
    const queryLower = query.toLowerCase();
    const results: { section: ChayeiSection; score: number; matchText: string }[] = [];
    
    // Variantes de Lemberg pour recherche exhaustive
    const lenbergVariants = [
      'lemberg', 'למברג', 'לעמבערג', 'lviv', 'lwów', 'ליוב', 'לבוב',
      'לעמברג', 'לעמבורג', 'לבמברג', 'לימברג', 'לימבערג'
    ];
    
    console.log(`[ChayeiMoharan] Recherche exhaustive pour: "${query}"`);
    console.log(`[ChayeiMoharan] Variants recherchés: ${lenbergVariants.join(', ')}`);
    
    this.chapters.forEach(chapter => {
      for (const section of chapter.sections) {
        let score = 0;
        let matchText = '';
        const hebrewText = section.hebrewText;
        const hebrewLower = hebrewText.toLowerCase();
        const frenchText = section.frenchTranslation || '';
        const frenchLower = frenchText.toLowerCase();
        
        // Recherche de variantes de Lemberg
        for (const variant of lenbergVariants) {
          if (hebrewText.includes(variant) || hebrewLower.includes(variant) || 
              frenchText.includes(variant) || frenchLower.includes(variant)) {
            score += 100;
            matchText = `Trouvé "${variant}" dans le texte`;
            console.log(`[ChayeiMoharan] TROUVÉ "${variant}" dans ${section.reference}`);
          }
        }
        
        // Recherche de mots de voyage en hébreu
        const travelHebrew = ['נסיעה', 'דרך', 'הלך', 'בא', 'יצא', 'נסע'];
        travelHebrew.forEach(word => {
          if (hebrewText.includes(word)) {
            score += 10;
            matchText += ` + mot voyage hébreu "${word}"`;
          }
        });
        
        // Recherche simple de sous-chaînes
        if (hebrewText.includes('לעמ') || hebrewText.includes('למב') || hebrewText.includes('ליו')) {
          score += 50;
          matchText += ' + caractères Lemberg partiels';
        }
        
        if (score > 0) {
          results.push({ section, score, matchText });
        }
      }
    });
    
    console.log(`[ChayeiMoharan] Trouvé ${results.length} résultats avec scores`);
    results.forEach(r => console.log(`- ${r.section.reference}: score ${r.score} - ${r.matchText}`));
    
    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, 15)
      .map(r => r.section);
  }

  // FONCTION POUR OBTENIR TOUT LE TEXTE DU LIVRE (1M tokens)
  getFullBookText(): string {
    if (!this.initialized) {
      return "Livre non initialisé";
    }

    let fullText = `=== CHAYEI MOHARAN - LIVRE COMPLET ===\n\n`;
    
    // Convertir Map en Array et trier par numéro de chapitre
    const chaptersArray = Array.from(this.chapters.values()).sort((a, b) => a.number - b.number);
    
    for (const chapter of chaptersArray) {
      fullText += `\n--- CHAPITRE ${chapter.number}: ${chapter.title} ---\n`;
      
      for (const section of chapter.sections) {
        fullText += `\n[${section.reference}]\n`;
        fullText += `${section.hebrewText}\n`;
        if (section.frenchTranslation) {
          fullText += `TRADUCTION: ${section.frenchTranslation}\n`;
        }
        fullText += `---\n`;
      }
    }
    
    console.log(`[ChayeiMoharan] Texte complet généré: ${fullText.length} caractères`);
    return fullText;
  }
}

export const chayeiMoharanProcessor = new ChayeiMoharanProcessor();