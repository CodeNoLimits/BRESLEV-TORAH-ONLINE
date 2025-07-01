import { useCallback, useEffect, useState } from 'react';

export function useTTS() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    // Vérifier le support TTS au chargement
    if ('speechSynthesis' in window && 'SpeechSynthesisUtterance' in window) {
      setIsSupported(true);
      console.log('[TTS] Web Speech API détecté et activé');
    } else {
      console.warn('[TTS] Web Speech API non supporté sur cet appareil');
    }
  }, []);

  const speak = useCallback((text: string, lang = 'fr-FR') => {
    console.log('[TTS] speak() called with:', { text: text.substring(0, 50) + '...', lang, isSupported });
    
    if (!text || !isSupported) {
      console.log('[TTS] Texto vide ou TTS non supporté');
      return;
    }

    if (!window.speechSynthesis) {
      console.error('[TTS] speechSynthesis not available');
      return;
    }

    try {
      // Arrêter toute lecture en cours
      window.speechSynthesis.cancel();
      
      console.log('[TTS] Creating utterance...');
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      utterance.rate = 0.9;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      
      console.log('[TTS] Utterance created with lang:', utterance.lang);
      
      utterance.onstart = () => {
        setIsSpeaking(true);
        console.log('[TTS] Lecture démarrée:', text.substring(0, 50) + '...');
      };
      
      utterance.onend = () => {
        setIsSpeaking(false);
        console.log('[TTS] Lecture terminée');
      };
      
      utterance.onerror = (event) => {
        setIsSpeaking(false);
        console.error('[TTS] Erreur de lecture:', event.error);
      };

      console.log('[TTS] Calling speechSynthesis.speak()...');
      window.speechSynthesis.speak(utterance);
      console.log('[TTS] speechSynthesis.speak() called successfully');
    } catch (error) {
      console.error('[TTS] Erreur lors de la création de la lecture:', error);
      setIsSpeaking(false);
    }
  }, [isSupported]);

  const stop = useCallback(() => {
    if (isSupported) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      console.log('[TTS] Lecture arrêtée');
    }
  }, [isSupported]);

  useEffect(() => {
    const stopOnVideo = () => {
      if (isSupported) {
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
      }
    };
    window.addEventListener('videoPlaying', stopOnVideo);
    return () => window.removeEventListener('videoPlaying', stopOnVideo);
  }, [isSupported]);

  return { speak, stop, isSpeaking, isSupported };
}