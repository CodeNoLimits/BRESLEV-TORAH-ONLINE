import { GoogleGenAI } from '@google/genai';

// Use the provided API key
const API_KEY = 'AIzaSyAlIBrQ16b_xVo-gY5JyBTCEEnfyUdjT7I';

class GeminiService {
  private ai: GoogleGenAI;
  
  constructor() {
    if (!API_KEY) {
      throw new Error('Clé API Gemini non configurée');
    }
    
    this.ai = new GoogleGenAI({ apiKey: API_KEY });
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

      const response = await this.ai.models.generateContentStream({
        model: 'gemini-2.5-flash',
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: {
          temperature: 0.7,
          maxOutputTokens: 4096,
          topP: 0.9,
          topK: 40
        }
      });

      // Process streaming response
      for await (const chunk of response) {
        // Check for abort signal
        if (signal?.aborted) {
          throw new Error('Request aborted');
        }

        if (chunk.text) {
          onChunk(chunk.text);
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
      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: {
          temperature: 0.7,
          maxOutputTokens: 4096,
          topP: 0.9,
          topK: 40
        }
      });

      return response.text || 'Aucune réponse générée.';
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
      model: 'gemini-2.5-flash',
      provider: 'Google AI',
      capabilities: ['text-generation', 'streaming', 'multilingual']
    };
  }
}

// Export singleton instance
export const geminiService = new GeminiService();
