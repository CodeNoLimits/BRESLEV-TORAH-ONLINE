import { GoogleGenerativeAI } from '@google/generative-ai';
import mammoth from 'mammoth';
import fs from 'fs';
import path from 'path';

const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

interface ChayeiSection {
  id: string;
  title: string;
  content: string;
  pageNumber?: number;
  sectionType: 'introduction' | 'torah' | 'conversation' | 'story' | 'travel';
}

export class ChayeiMoharanFrenchProcessor {
  private sections: ChayeiSection[] = [];
  private fullText: string = '';
  private initialized = false;

  async initialize() {
    if (this.initialized) return;

    console.log('[ChayeiMoharan-FR] Initialisation du processeur français...');
    
    // Traiter le document fourni par l'utilisateur
    const filePath = path.join(process.cwd(), 'attached_assets', 'CHAYE MOHARAN FR_1751542665093.docx');
    if (fs.existsSync(filePath)) {
      await this.processDocxFile(filePath);
    }

    this.initialized = true;
    console.log(`[ChayeiMoharan-FR] Initialisé avec ${this.sections.length} sections`);
  }

  private async processDocxFile(filePath: string) {
    try {
      const result = await mammoth.extractRawText({ path: filePath });
      const text = result.value;
      this.fullText = text;
      await this.parseSections(text);
    } catch (error) {
      console.error('[ChayeiMoharan-FR] Erreur lecture DOCX:', error);
    }
  }

  private async parseSections(text: string) {
    const lines = text.split('\n').filter(line => line.trim());
    let currentSection: ChayeiSection | null = null;
    let sectionId = 1;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (this.isSectionStart(line, i, lines)) {
        if (currentSection) {
          this.sections.push(currentSection);
        }
        
        currentSection = {
          id: `section_${sectionId}`,
          title: this.extractTitle(line),
          content: '',
          sectionType: this.determineSectionType(line),
        };
        sectionId++;
      } 
      
      if (currentSection && line.length > 10) {
        currentSection.content += line + '\n';
      }
    }

    if (currentSection) {
      this.sections.push(currentSection);
    }
  }

  private isSectionStart(line: string, index: number, lines: string[]): boolean {
    // Détecter les débuts de section
    return (
      line.startsWith('Introduction') ||
      line.startsWith('Entretiens relatifs') ||
      /^\d+$/.test(line.trim()) ||
      line.includes('Torah') ||
      line.includes('voyage') ||
      line.includes('Lemberg') ||
      (line.length < 100 && index > 0 && lines[index-1].trim() === '')
    );
  }

  private extractTitle(line: string): string {
    return line.substring(0, Math.min(100, line.length));
  }

  private determineSectionType(line: string): ChayeiSection['sectionType'] {
    if (line.includes('Introduction')) return 'introduction';
    if (line.includes('Torah') || line.includes('enseignement')) return 'torah';
    if (line.includes('entretien')) return 'conversation';
    if (line.includes('voyage') || line.includes('Lemberg')) return 'travel';
    return 'story';
  }

  // RECHERCHE DIRECTE DANS LE DOCUMENT FRANÇAIS
  async searchInFrenchDocument(query: string): Promise<{
    answer: string;
    sources: string[];
    relevantSections: ChayeiSection[];
    directCitations: Array<{
      text: string;
      source: string;
      context: string;
    }>;
  }> {
    await this.initialize();

    console.log(`[ChayeiMoharan-FR] Recherche dans le document français: "${query}"`);
    
    // 1. Recherche directe dans le texte
    const relevantSections = this.findRelevantSections(query);
    const directCitations = this.findDirectCitations(query);

    // 2. Génération d'une réponse contextuelle avec Gemini
    const contextPrompt = `Tu es un expert du livre "Chayei Moharan" en français. Voici des passages pertinents du document authentique :

QUESTION: ${query}

PASSAGES PERTINENTS DU DOCUMENT:
${relevantSections.map(section => `
SECTION: ${section.title}
CONTENU: ${section.content.substring(0, 1000)}...
`).join('\n')}

CITATIONS DIRECTES TROUVÉES:
${directCitations.map(citation => `
"${citation.text}"
Source: ${citation.source}
`).join('\n')}

INSTRUCTIONS:
1. Réponds à la question en te basant UNIQUEMENT sur ces passages authentiques
2. Cite directement les passages pertinents
3. Si l'information n'est pas dans ces passages, dis-le clairement
4. Utilise un style respectueux et spirituel approprié à l'ouvrage
5. Indique précisément où l'information se trouve dans le document

Format de réponse:
**Réponse basée sur le document:** [Ta réponse avec citations]
**Références précises:** [Localisation dans le document]`;

    try {
      const response = await ai.getGenerativeModel({ model: "gemini-1.5-flash" }).generateContent(contextPrompt);
      const answer = response.response.text() || "Aucune réponse générée";
      
      return {
        answer,
        sources: relevantSections.map(s => s.title),
        relevantSections,
        directCitations
      };
    } catch (error) {
      console.error('[ChayeiMoharan-FR] Erreur Gemini:', error);
      
      // Fallback avec réponse basée sur les sections trouvées
      const fallbackAnswer = this.generateFallbackAnswer(query, relevantSections, directCitations);
      
      return {
        answer: fallbackAnswer,
        sources: relevantSections.map(s => s.title),
        relevantSections,
        directCitations
      };
    }
  }

  private findRelevantSections(query: string): ChayeiSection[] {
    const queryWords = query.toLowerCase().split(' ').filter(w => w.length > 2);
    const results: { section: ChayeiSection; score: number }[] = [];

    for (const section of this.sections) {
      let score = 0;
      const sectionText = section.content.toLowerCase();
      
      // Recherche de mots-clés
      for (const word of queryWords) {
        const matches = (sectionText.match(new RegExp(word, 'g')) || []).length;
        score += matches * 10;
      }

      // Bonus pour certains types de sections
      if (query.includes('voyage') && section.sectionType === 'travel') score += 50;
      if (query.includes('Lemberg') && section.content.includes('Lemberg')) score += 100;
      if (query.includes('Torah') && section.sectionType === 'torah') score += 30;

      if (score > 10) {
        results.push({ section, score });
      }
    }

    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map(r => r.section);
  }

  private findDirectCitations(query: string): Array<{
    text: string;
    source: string;
    context: string;
  }> {
    const citations: Array<{
      text: string;
      source: string;
      context: string;
    }> = [];

    const queryWords = query.toLowerCase().split(' ').filter(w => w.length > 2);
    
    for (const section of this.sections) {
      const sentences = section.content.split('.').filter(s => s.trim().length > 20);
      
      for (const sentence of sentences) {
        const sentenceLower = sentence.toLowerCase();
        let relevanceScore = 0;
        
        for (const word of queryWords) {
          if (sentenceLower.includes(word)) {
            relevanceScore++;
          }
        }
        
        if (relevanceScore >= 2 || 
            (query.includes('Lemberg') && sentenceLower.includes('lemberg')) ||
            (query.includes('voyage') && sentenceLower.includes('voyage'))) {
          citations.push({
            text: sentence.trim(),
            source: section.title,
            context: section.id
          });
        }
      }
    }

    return citations.slice(0, 10);
  }

  private generateFallbackAnswer(
    query: string, 
    sections: ChayeiSection[], 
    citations: Array<{text: string; source: string; context: string}>
  ): string {
    if (sections.length === 0 && citations.length === 0) {
      return `Je n'ai pas trouvé d'information spécifique sur "${query}" dans le document Chayei Moharan français fourni. Le document contient ${this.sections.length} sections mais aucune ne semble correspondre à votre recherche.`;
    }

    let answer = `**Informations trouvées dans le document Chayei Moharan:**\n\n`;
    
    if (citations.length > 0) {
      answer += `**Citations directes pertinentes:**\n`;
      citations.slice(0, 3).forEach(citation => {
        answer += `- "${citation.text}" (${citation.source})\n`;
      });
      answer += '\n';
    }

    if (sections.length > 0) {
      answer += `**Sections pertinentes trouvées:**\n`;
      sections.slice(0, 3).forEach(section => {
        const excerpt = section.content.substring(0, 200);
        answer += `- ${section.title}: ${excerpt}...\n`;
      });
    }

    return answer;
  }

  getSectionsList(): { id: string; title: string; type: string }[] {
    return this.sections.map(section => ({
      id: section.id,
      title: section.title,
      type: section.sectionType
    }));
  }

  getTotalSections(): number {
    return this.sections.length;
  }

  getFullText(): string {
    return this.fullText;
  }
}

export const chayeiMoharanFrenchProcessor = new ChayeiMoharanFrenchProcessor();