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

    // 3. Requête Gemini avec traduction obligatoire
    const prompt = `Tu es un expert en enseignements de Rabbi Nahman de Breslov. Tu DOIS répondre en français et traduire INTÉGRALEMENT tous les passages hébreux cités.

Question: ${query}

Contexte de Chayei Moharan:
${context}

INSTRUCTIONS STRICTES:
1. Réponds UNIQUEMENT en français
2. Pour CHAQUE citation hébraïque, donne la traduction française complète
3. Utilise ce format EXACT pour les citations:

**Citation Chayei Moharan X:Y**
Hébreu: [texte hébreu complet]
Français: [traduction française complète et fluide]

4. Donne une explication spirituelle détaillée
5. Termine par les références utilisées

Format obligatoire:
**Réponse spirituelle:** [Explication détaillée en français]

**Citations traduites:**
[Tes citations avec traductions]

**Références:** [Liste des chapitres cités]`;

    try {
      const response = await ai.getGenerativeModel({ model: "gemini-1.5-flash" }).generateContent(prompt);

      const answer = response.response.text() || "Aucune réponse générée";
      const sources = relevantSections.map(s => s.reference);

      // Traduire individuellement chaque section pour les boutons
      const translatedCitations = await Promise.all(
        relevantSections.map(async (section, index) => {
          const translatePrompt = `Traduis ce passage de Chayei Moharan en français de manière spirituellement appropriée:

Hébreu: ${section.hebrewText}

Réponds UNIQUEMENT avec la traduction française, sans commentaires.`;

          try {
            const translateResponse = await ai.getGenerativeModel({ model: "gemini-1.5-flash" }).generateContent(translatePrompt);

            return {
              reference: section.reference,
              hebrewText: section.hebrewText,
              frenchTranslation: translateResponse.response.text() || "Traduction non disponible",
              chapterNumber: this.getChapterNumberFromReference(section.reference)
            };
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
}

export const chayeiMoharanProcessor = new ChayeiMoharanProcessor();