import { useState, useCallback, useEffect } from 'react';

interface LazyTranslateResult {
  frenchText: string;
  isTranslating: boolean;
  hasMore: boolean;
  loadNext: () => Promise<void>;
  translateChunk: () => Promise<void>;
  reset: () => void;
  currentLength: number;
  progress: number;
}

export function useLazyTranslate(englishText: string, chunkSize: number = 1000): LazyTranslateResult {
  const [currentLength, setCurrentLength] = useState(chunkSize);
  const [frenchText, setFrenchText] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [translatedLength, setTranslatedLength] = useState(0);

  const hasMore = currentLength < englishText.length;

  const translateChunk = useCallback(async (textToTranslate: string) => {
    try {
      console.log(`[LazyTranslate] Translating ${textToTranslate.length} characters...`);

      const response = await fetch('/api/gemini/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          text: textToTranslate,
          targetLang: 'french'
        }),
      });

      if (!response.ok) {
        throw new Error(`Translation failed: ${response.status}`);
      }

      const data = await response.json();
      return data.translation || textToTranslate;

    } catch (error) {
      console.error('[LazyTranslate] Translation error:', error);
      return `[Traduction indisponible: ${textToTranslate}]`;
    }
  }, []);

  const loadNext = useCallback(async () => {
    if (isTranslating || !hasMore) return;

    setIsTranslating(true);

    try {
      const nextChunk = englishText.slice(translatedLength, currentLength + chunkSize);
      const translated = await translateChunk(nextChunk);

      setFrenchText(prev => prev + (prev ? ' ' : '') + translated);
      setTranslatedLength(currentLength + chunkSize);
      setCurrentLength(prev => prev + chunkSize);

      console.log(`[LazyTranslate] ✅ Loaded chunk, total length: ${currentLength + chunkSize}`);

    } catch (error) {
      console.error('[LazyTranslate] Load next error:', error);
    } finally {
      setIsTranslating(false);
    }
  }, [englishText, currentLength, chunkSize, translatedLength, hasMore, isTranslating, translateChunk]);

  const reset = useCallback(() => {
    setCurrentLength(chunkSize);
    setFrenchText('');
    setTranslatedLength(0);
    setIsTranslating(false);
  }, [chunkSize]);

  // Reset et auto-traduction quand hebrewRef change
  useEffect(() => {
    console.log(`[LazyTranslate] TEXT CHANGE DETECTED - Full reset`);
    setCurrentLength(chunkSize);
    setFrenchText('');
    setTranslatedLength(0);
    setIsTranslating(false);
  }, [englishText]); // Reset à chaque nouveau texte

  // Auto-traduction du premier chunk
  useEffect(() => {
    if (!englishText || frenchText || isTranslating) return;

    const initialChunk = englishText.slice(0, Math.min(chunkSize, englishText.length));

    if (initialChunk) {
      setIsTranslating(true);
      translateChunk(initialChunk).then(translated => {
        setFrenchText(translated);
        setTranslatedLength(chunkSize);
        setIsTranslating(false);
        console.log(`[LazyTranslate] ✅ Auto-loaded first ${chunkSize} characters`);
      });
    }
  }, [englishText, frenchText, isTranslating, chunkSize, translateChunk]);

  const progress = englishText.length > 0 ? Math.round((translatedLength / englishText.length) * 100) : 0;

  return {
    frenchText,
    isTranslating,
    hasMore,
    loadNext,
    translateChunk: loadNext, // Alias pour compatibilité
    reset,
    currentLength: Math.min(currentLength, englishText.length),
    progress
  };
}