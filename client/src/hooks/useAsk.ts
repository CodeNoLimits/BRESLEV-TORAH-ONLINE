import { useState } from 'react';

export const useAsk = () => {
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState<string>('');
  const [error, setError] = useState<string>('');

  const ask = async (question: string) => {
    if (!question.trim()) {
      setError('Question vide');
      return;
    }

    setLoading(true);
    setError('');
    setAnswer('');

    try {
      console.log('[useAsk] Envoi question:', question);

      const response = await fetch('/api/smart-query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question })
      });

      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }

      const data = await response.json();

      if (data.error) {
        setError(data.error);
        return;
      }

      console.log('[useAsk] Réponse reçue:', data.answer?.substring(0, 100));
      setAnswer(data.answer || 'Aucune réponse reçue');

    } catch (err) {
      console.error('[useAsk] Erreur:', err);
      setError('Erreur lors de la communication avec le serveur');
    } finally {
      setLoading(false);
    }
  };

  return { ask, loading, answer, error };
};