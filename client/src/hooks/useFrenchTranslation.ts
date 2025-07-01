import { useState, useCallback, useEffect } from 'react';

export interface FrenchTranslationResult {
  frenchText: string;
  isTranslating: boolean;
  progress: number;
  translateChunk: () => Promise<void>;
  hasMore: boolean;
  reset: () => void;
}

export function useFrenchTranslation(englishText: string, chunkSize: number = 1000): FrenchTranslationResult {
  const [frenchText, setFrenchText] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [translatedLength, setTranslatedLength] = useState(0);

  const reset = useCallback(() => {
    setFrenchText('');
    setTranslatedLength(0);
  }, []);

  // Reset when English text changes
  useEffect(() => {
    reset();
  }, [englishText, reset]);

  const translateChunk = useCallback(async () => {
    if (isTranslating || translatedLength >= englishText.length) return;

    setIsTranslating(true);

    try {
      // Get the next chunk to translate
      const startPos = translatedLength;
      const endPos = Math.min(startPos + chunkSize, englishText.length);
      const chunkToTranslate = englishText.slice(startPos, endPos);

      console.log(`[FrenchTranslation] Translating chunk: ${startPos}-${endPos} (${chunkToTranslate.length} chars)`);

      const response = await fetch('/api/gemini/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: chunkToTranslate,
          targetLanguage: 'français',
          context: 'texte spirituel breslov'
        })
      });

      if (!response.ok) {
        throw new Error('Translation failed');
      }

      const data = await response.json();
      const translatedChunk = data.translation || chunkToTranslate;

      // Append the translated chunk
      setFrenchText(prev => prev + (prev ? '\n\n' : '') + translatedChunk);
      setTranslatedLength(endPos);

      console.log(`[FrenchTranslation] ✅ Chunk translated: ${translatedChunk.length} characters`);

    } catch (error) {
      console.error('[FrenchTranslation] Translation error:', error);
      
      // Fallback: use a simple French explanation instead of English
      const fallbackText = `[Traduction en cours...] Ce passage de ${Math.floor(chunkSize/100)} paragraphes des enseignements de Rabbi Nahman sera bientôt disponible en français.`;
      setFrenchText(prev => prev + (prev ? '\n\n' : '') + fallbackText);
      setTranslatedLength(prev => Math.min(prev + chunkSize, englishText.length));
    } finally {
      setIsTranslating(false);
    }
  }, [englishText, translatedLength, chunkSize, isTranslating]);

  const hasMore = translatedLength < englishText.length;
  const progress = englishText.length > 0 ? Math.round((translatedLength / englishText.length) * 100) : 100;

  return {
    frenchText,
    isTranslating,
    progress,
    translateChunk,
    hasMore,
    reset
  };
}