import { VectorRAGService } from './vectorRAG';
import { PromptTemplates } from './promptTemplates';

interface SearchResult {
  content: string;
  hebrewContent?: string;
  source: {
    book: string;
    chapter: string;
    section: string;
    reference: string;
  };
  score: number;
  metadata?: any;
}

export class QueryRouter {
  private vectorRAG: VectorRAGService;
  private livreHints = [
    'likutei moharan', 'likouté moharan', 'sefer hamiddot', 'sippurei maasiyot', 
    'chayei moharan', 'likutei etzot', 'likouté etzot', 'shivchei haran',
    'rabbi nahman', 'rabbénou', 'rebbe', 'tsaddik', 'breslov', 'breslev'
  ];

  constructor() {
    this.vectorRAG = new VectorRAGService();
  }

  analyzeQuery(question: string): 'force_rag' | 'try_rag_first' | 'general' {
    const questionLower = question.toLowerCase();
    
    // Force RAG si mention explicite d'un livre
    if (this.livreHints.some(hint => questionLower.includes(hint))) {
      console.log('[QueryRouter] Force RAG détecté pour:', question);
      return 'force_rag';
    }
    
    // Mots-clés spirituels → FORCE RAG (pas "try first")
    const spiritualKeywords = ['rabbi', 'rebbe', 'nahman', 'tsaddik', 'torah', 'mitzvah', 'tikkun', 'joie', 'musique', 'prière', 'yetzer', 'enseignement', 'dit', 'explique', 'résume', 'points'];
    if (spiritualKeywords.some(keyword => questionLower.includes(keyword))) {
      console.log('[QueryRouter] Force RAG détecté pour:', question);
      return 'force_rag';
    }
    
    console.log('[QueryRouter] Requête générale:', question);
    return 'general';
  }

  async routeToOptimalEndpoint(question: string): Promise<{
    answer: string;
    sources: Array<{book: string, chapter: string, section: string, reference: string}>;
    method: string;
  }> {
    const strategy = this.analyzeQuery(question);
    
    try {
      switch (strategy) {
        case 'force_rag':
          return await this.forceRAGSearch(question);
        
        case 'try_rag_first':
          const ragResult = await this.tryRAGSearch(question);
          if (ragResult.score > 0.3) {
            return ragResult;
          }
          return await this.fallbackToGeneral(question, ragResult.partialContext);
        
        case 'general':
          return await this.generalWithContext(question);
        
        default:
          return await this.forceRAGSearch(question);
      }
    } catch (error) {
      console.error('[QueryRouter] Erreur de routage:', error);
      return {
        answer: "❗ Une erreur est survenue lors du traitement de votre question.",
        sources: [],
        method: 'error'
      };
    }
  }

  private async forceRAGSearch(question: string): Promise<{
    answer: string;
    sources: Array<{book: string, chapter: string, section: string, reference: string}>;
    method: string;
  }> {
    console.log('[QueryRouter] Recherche RAG forcée...');
    
    const results = await this.vectorRAG.search(question, 0.1); // Seuil bas pour forcer les résultats
    
    if (results.length === 0) {
      return {
        answer: "❗ Je n'ai pas trouvé de passage pertinent dans les textes fournis.",
        sources: [],
        method: 'force_rag_empty'
      };
    }

    const prompt = PromptTemplates.createRAGPrompt(question, results);
    const answer = await this.callGemini(prompt);
    
    return {
      answer,
      sources: results.map(r => ({
        book: r.source.book,
        chapter: r.source.chapter,
        section: r.source.section,
        reference: r.source.reference
      })),
      method: 'force_rag'
    };
  }

  private async tryRAGSearch(question: string): Promise<{
    answer: string;
    sources: Array<{book: string, chapter: string, section: string, reference: string}>;
    method: string;
    score: number;
    partialContext?: string;
  }> {
    console.log('[QueryRouter] Tentative RAG...');
    
    const results = await this.vectorRAG.search(question, 0.3);
    
    if (results.length === 0 || results[0].score < 0.3) {
      return {
        answer: "",
        sources: [],
        method: 'rag_insufficient',
        score: results[0]?.score || 0,
        partialContext: results[0]?.content || ""
      };
    }

    const prompt = PromptTemplates.createRAGPrompt(question, results);
    const answer = await this.callGemini(prompt);
    
    return {
      answer,
      sources: results.map(r => ({
        book: r.source.book,
        chapter: r.source.chapter,
        section: r.source.section,
        reference: r.source.reference
      })),
      method: 'try_rag_success',
      score: results[0].score
    };
  }

  private async fallbackToGeneral(question: string, partialContext?: string): Promise<{
    answer: string;
    sources: Array<{book: string, chapter: string, section: string, reference: string}>;
    method: string;
  }> {
    console.log('[QueryRouter] Fallback général avec contexte partiel...');
    
    const prompt = PromptTemplates.createFallbackPrompt(question, partialContext);
    const answer = await this.callGemini(prompt);
    
    return {
      answer,
      sources: [],
      method: 'fallback_general'
    };
  }

  private async generalWithContext(question: string): Promise<{
    answer: string;
    sources: Array<{book: string, chapter: string, section: string, reference: string}>;
    method: string;
  }> {
    console.log('[QueryRouter] Requête générale avec contexte léger...');
    
    // Essaie quand même de trouver un peu de contexte
    const results = await this.vectorRAG.search(question, 0.1);
    
    let prompt: string;
    if (results.length > 0) {
      prompt = PromptTemplates.createRAGPrompt(question, results.slice(0, 2));
    } else {
      prompt = PromptTemplates.createFallbackPrompt(question);
    }
    
    const answer = await this.callGemini(prompt);
    
    return {
      answer,
      sources: results.slice(0, 2).map(r => ({
        book: r.source.book,
        chapter: r.source.chapter,
        section: r.source.section,
        reference: r.source.reference
      })),
      method: 'general_with_context'
    };
  }

  private async callGemini(prompt: string): Promise<string> {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY non configuré');
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  }
}