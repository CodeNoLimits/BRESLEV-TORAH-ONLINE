import { GoogleGenerativeAI } from '@google/generative-ai';
import { AppError } from '../middleware/errorHandler.js';
import { db, translations, conversations, messages } from '../db/index.js';
import { eq, and } from 'drizzle-orm';
import crypto from 'crypto';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const CHUNK_SIZE = 1000; // Maximum characters per translation chunk

if (!GEMINI_API_KEY) {
  throw new Error('GEMINI_API_KEY is not defined in environment variables');
}

interface TranslationRequest {
  text: string;
  sourceLanguage: string;
  targetLanguage: string;
  reference?: string;
}

interface ChatRequest {
  message: string;
  mode: 'chapter' | 'book' | 'global';
  context?: string;
  conversationId?: number;
}

export class GeminiService {
  private static instance: GeminiService;
  private genAI: GoogleGenerativeAI;
  private model: any;
  
  private constructor() {
    this.genAI = new GoogleGenerativeAI(GEMINI_API_KEY!);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-pro' });
  }
  
  static getInstance(): GeminiService {
    if (!GeminiService.instance) {
      GeminiService.instance = new GeminiService();
    }
    return GeminiService.instance;
  }

  /**
   * Translate text with chunking support
   */
  async translateText({ text, sourceLanguage, targetLanguage, reference }: TranslationRequest) {
    try {
      // Check cache first
      const cached = await db.query.translations.findFirst({
        where: and(
          eq(translations.sourceText, text),
          eq(translations.sourceLanguage, sourceLanguage),
          eq(translations.targetLanguage, targetLanguage)
        )
      });

      if (cached) {
        return {
          translatedText: cached.translatedText,
          fromCache: true
        };
      }

      // Split text into chunks if necessary
      const chunks = this.splitIntoChunks(text, CHUNK_SIZE);
      const translatedChunks = [];

      for (let i = 0; i < chunks.length; i++) {
        const prompt = `Traduisez le texte suivant du ${sourceLanguage} vers le ${targetLanguage}. 
        Gardez le style et le ton du texte original. 
        Ne traduisez que le texte fourni, sans ajouter d'explications.
        
        Texte à traduire:
        ${chunks[i]}`;

        const result = await this.model.generateContent(prompt);
        const translatedChunk = result.response.text();
        translatedChunks.push(translatedChunk);

        // Cache each chunk
        await db.insert(translations).values({
          sourceText: chunks[i],
          sourceLanguage,
          targetLanguage,
          translatedText: translatedChunk,
          chunkIndex: i,
          totalChunks: chunks.length,
          reference
        });

        // Add delay to avoid rate limiting
        if (i < chunks.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      const fullTranslation = translatedChunks.join(' ');

      return {
        translatedText: fullTranslation,
        fromCache: false,
        chunks: chunks.length
      };
    } catch (error) {
      console.error('Translation error:', error);
      throw new AppError('Erreur de traduction. Veuillez réessayer.', 500);
    }
  }

  /**
   * Handle AI chat with context
   */
  async chat({ message, mode, context, conversationId }: ChatRequest) {
    try {
      // Get or create conversation
      let conversation;
      if (conversationId) {
        conversation = await db.query.conversations.findFirst({
          where: eq(conversations.id, conversationId)
        });
      }

      if (!conversation) {
        const [newConv] = await db.insert(conversations).values({
          title: message.substring(0, 50) + '...',
          mode,
          contextReference: context
        }).returning();
        conversation = newConv;
      }

      // Get conversation history
      const history = await db.query.messages.findMany({
        where: eq(messages.conversationId, conversation.id),
        orderBy: (messages, { asc }) => [asc(messages.createdAt)],
        limit: 10
      });

      // Build system prompt based on mode
      const systemPrompt = this.buildSystemPrompt(mode, context);

      // Build conversation for Gemini
      const chatHistory = history.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }]
      }));

      // Add system context as first message if no history
      if (chatHistory.length === 0) {
        chatHistory.push({
          role: 'user',
          parts: [{ text: systemPrompt }]
        }, {
          role: 'model',
          parts: [{ text: "Je comprends. Je baserai toutes mes réponses sur les textes de Rabbi Nahman et citerai les références exactes." }]
        });
      }

      // Start chat with history
      const chat = this.model.startChat({
        history: chatHistory,
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 2048,
        },
      });

      // Send user message
      const result = await chat.sendMessage(message);
      const response = result.response.text();

      // Save messages to database
      await db.insert(messages).values([
        {
          conversationId: conversation.id,
          role: 'user',
          content: message,
          metadata: { mode, context }
        },
        {
          conversationId: conversation.id,
          role: 'assistant',
          content: response,
          references: this.extractReferences(response)
        }
      ]);

      return {
        response,
        conversationId: conversation.id,
        mode,
        context
      };
    } catch (error) {
      console.error('Chat error:', error);
      throw new AppError('Erreur de conversation. Veuillez réessayer.', 500);
    }
  }

  /**
   * Build system prompt based on chat mode
   */
  private buildSystemPrompt(mode: string, context?: string): string {
    const basePrompt = `Tu es un expert des enseignements de Rabbi Nahman de Breslev.
    RÈGLES CRITIQUES :
    1. Base TOUTES tes réponses sur les textes fournis
    2. Cite TOUJOURS les références exactes (Livre, Chapitre, Verset)
    3. Ne JAMAIS inventer ou généraliser
    4. Si tu ne trouves pas dans les textes, dis-le clairement
    5. Analyse en profondeur le contexte spirituel des enseignements
    6. Utilise un langage respectueux et précis`;

    switch (mode) {
      case 'chapter':
        return `${basePrompt}\n\nContexte actuel : Chapitre ${context || 'non spécifié'}. 
        Concentre-toi uniquement sur ce chapitre pour répondre.`;
      
      case 'book':
        return `${basePrompt}\n\nContexte actuel : Livre ${context || 'non spécifié'}. 
        Tu peux utiliser tous les chapitres de ce livre pour répondre.`;
      
      case 'global':
        return `${basePrompt}\n\nMode global : Tu peux chercher dans tous les livres de Rabbi Nahman. 
        Précise toujours de quel livre provient chaque citation.`;
      
      default:
        return basePrompt;
    }
  }

  /**
   * Extract references from AI response
   */
  private extractReferences(text: string): any {
    const references = [];
    
    // Pattern for references like "Likutei Moharan I:5" or "Chayei Moharan 234"
    const refPattern = /(?:Likutei Moharan|Chayei Moharan|Sichot HaRan|Sefer HaMiddot)\s*(?:I{1,2})?\s*:?\s*\d+/gi;
    const matches = text.match(refPattern);
    
    if (matches) {
      references.push(...matches.map(ref => ({
        text: ref,
        type: 'direct'
      })));
    }

    return references;
  }

  /**
   * Split text into chunks
   */
  private splitIntoChunks(text: string, maxSize: number): string[] {
    if (text.length <= maxSize) {
      return [text];
    }

    const chunks = [];
    const sentences = text.split(/[.!?]+/);
    let currentChunk = '';

    for (const sentence of sentences) {
      if ((currentChunk + sentence).length > maxSize && currentChunk.length > 0) {
        chunks.push(currentChunk.trim());
        currentChunk = sentence;
      } else {
        currentChunk += (currentChunk ? '. ' : '') + sentence;
      }
    }

    if (currentChunk) {
      chunks.push(currentChunk.trim());
    }

    return chunks;
  }

  /**
   * Hash text for caching
   */
  private hashText(text: string): string {
    return crypto.createHash('sha256').update(text).digest('hex');
  }
}