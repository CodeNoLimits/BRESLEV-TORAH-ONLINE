import { useState, useCallback } from 'react';

interface AskResponse {
  answer: string;
  sources: Array<{
    book: string;
    chapter: string;
    section: string;
    reference: string;
  }>;
  method: string;
  duration?: number;
}

export const useAsk = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const ask = useCallback(async (question: string): Promise<AskResponse> => {
    if (!question?.trim()) {
      throw new Error('Question vide');
    }

    setIsLoading(true);
    setError(null);
    
    try {
      console.log('[useAsk] Envoi question:', question);
      
      const response = await fetch('/api/smart-query', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ question: question.trim() })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Erreur HTTP ${response.status}`);
      }
      
      const result: AskResponse = await response.json();
      
      console.log('[useAsk] Réponse reçue:', {
        method: result.method,
        duration: result.duration,
        sourcesCount: result.sources?.length || 0
      });
      
      return result;
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue';
      console.error('[useAsk] Erreur:', errorMessage);
      setError(errorMessage);
      
      // Retour d'erreur structuré
      return {
        answer: `❗ Une erreur est survenue: ${errorMessage}`,
        sources: [],
        method: 'error'
      };
      
    } finally {
      setIsLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setError(null);
    setIsLoading(false);
  }, []);

  return { 
    ask, 
    isLoading, 
    error,
    reset
  };
};