
// Service Gemini utilisant le proxy serveur
class GeminiService {
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
}

// Export singleton instance
export const geminiService = new GeminiService();
