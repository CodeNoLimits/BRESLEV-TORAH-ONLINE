
// Service Gemini utilisant le proxy serveur
import { GoogleGenerativeAI } from '@google/generative-ai';

class GeminiService {
  private directModel: ReturnType<GoogleGenerativeAI['getGenerativeModel']> | null = null;

  private ensureModel() {
    if (!this.directModel) {
      const apiKey = (import.meta as any).env.VITE_GEMINI_API_KEY;
      if (!apiKey) throw new Error('GEMINI_API_KEY missing');
      const ai = new GoogleGenerativeAI(apiKey);
      this.directModel = ai.getGenerativeModel({ model: 'gemini-1.5-flash-latest' });
    }
  }

  private splitIntoBlocks(text: string, maxLen = 1600) {
    const sentences = text.match(/[^.!?]+[.!?]+[\])'"`’”]*|.+/g) || [text];
    const blocks: string[] = [];
    let current = '';
    for (const sentence of sentences) {
      if ((current + sentence).length > maxLen) {
        if (current.trim()) blocks.push(current.trim());
        current = sentence;
      } else {
        current += sentence;
      }
    }
    if (current.trim()) blocks.push(current.trim());
    return blocks;
  }

  private levenshtein(a: string, b: string) {
    const matrix: number[][] = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
    for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
    for (let j = 0; j <= b.length; j++) matrix[0][j] = j;
    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + cost
        );
      }
    }
    return matrix[a.length][b.length];
  }

  private similarity(a: string, b: string) {
    const dist = this.levenshtein(a, b);
    const max = Math.max(a.length, b.length) || 1;
    return 1 - dist / max;
  }
  async generateContentStream({
    prompt,
    onChunk,
    signal
  }: {
    prompt: string;
    onChunk: (chunk: string) => void;
    signal?: AbortSignal;
  }): Promise<void> {
    try {
      // Check if request was aborted before starting
      if (signal?.aborted) {
        throw new Error('Request aborted');
      }

      const response = await fetch('/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
        signal
      });

      if (!response.ok || !response.body) {
        throw new Error('Failed to stream response from Gemini proxy');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        // Check for abort signal
        if (signal?.aborted) {
          reader.cancel();
          throw new Error('Request aborted');
        }

        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        if (chunk) {
          onChunk(chunk);
        }
      }
    } catch (error: any) {
      // Handle abort gracefully
      if (signal?.aborted || error.message === 'Request aborted') {
        throw new Error('Request aborted');
      }
      
      // Handle API errors
      if (error.message?.includes('API_KEY')) {
        throw new Error('Clé API Gemini invalide. Veuillez vérifier votre configuration.');
      }
      
      if (error.message?.includes('quota')) {
        throw new Error('Quota API Gemini dépassé. Veuillez réessayer plus tard.');
      }
      
      if (error.message?.includes('safety')) {
        throw new Error('La réponse a été bloquée par les filtres de sécurité. Reformulez votre question.');
      }
      
      // Generic error
      console.error('Gemini API Error:', error);
      throw new Error('Erreur de communication avec l\'IA. Veuillez réessayer.');
    }
  }

  async generateContent(prompt: string): Promise<string> {
    try {
      const response = await fetch('/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      });

      if (!response.ok || !response.body) {
        throw new Error('Failed to get response from Gemini proxy');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullResponse = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        fullResponse += decoder.decode(value, { stream: true });
      }

      return fullResponse || 'Aucune réponse générée.';
    } catch (error: any) {
      // Handle API errors
      if (error.message?.includes('API_KEY')) {
        throw new Error('Clé API Gemini invalide. Veuillez vérifier votre configuration.');
      }
      
      if (error.message?.includes('quota')) {
        throw new Error('Quota API Gemini dépassé. Veuillez réessayer plus tard.');
      }
      
      if (error.message?.includes('safety')) {
        throw new Error('La réponse a été bloquée par les filtres de sécurité. Reformulez votre question.');
      }
      
      // Generic error
      console.error('Gemini API Error:', error);
      throw new Error('Erreur de communication avec l\'IA. Veuillez réessayer.');
    }
  }

  // Utility method to validate API connection
  async validateConnection(): Promise<boolean> {
    try {
      await this.generateContent('Test de connexion');
      return true;
    } catch (error) {
      return false;
    }
  }

  // Method to get model information
  getModelInfo() {
    return {
      model: 'gemini-1.5-flash-latest',
      provider: 'Google AI',
      capabilities: ['text-generation', 'streaming', 'multilingual']
    };
  }

  async sendInBlocks(text: string): Promise<string[]> {
    this.ensureModel();
    const blocks = this.splitIntoBlocks(text, 1600);
    const chat = this.directModel!.startChat();
    const replies: string[] = [];
    const history: string[] = [];

    for (const block of blocks) {
      const isDup = history.some((prev) => this.similarity(prev, block) > 0.8);
      if (isDup) continue;
      history.push(block);
      const result = await chat.sendMessage(block);
      replies.push(result.response.text());
    }

    return replies;
  }
}

// Export singleton instance
export const geminiService = new GeminiService();
