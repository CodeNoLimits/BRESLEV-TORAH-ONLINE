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
      
      // Attendre un peu pour que la cancellation prenne effet
      setTimeout(() => {
        console.log('[TTS] Creating utterance...');
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = lang;
        utterance.rate = 0.9;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;
        
        console.log('[TTS] Utterance created with lang:', utterance.lang);
        console.log('[TTS] Available voices:', window.speechSynthesis.getVoices().length);
        
        utterance.onstart = () => {
          setIsSpeaking(true);
          console.log('[TTS] ✅ AUDIO STARTED - You should hear sound now!');
        };
        
        utterance.onend = () => {
          setIsSpeaking(false);
          console.log('[TTS] ✅ AUDIO ENDED - Sound finished');
        };
        
        utterance.onerror = (event) => {
          setIsSpeaking(false);
          console.error('[TTS] ❌ AUDIO ERROR:', event.error, event);
        };

        // Force trigger voice loading
        if (window.speechSynthesis.getVoices().length === 0) {
          console.log('[TTS] Loading voices...');
          window.speechSynthesis.addEventListener('voiceschanged', () => {
            console.log('[TTS] Voices loaded, retrying...');
            window.speechSynthesis.speak(utterance);
          }, { once: true });
        } else {
          console.log('[TTS] Speaking with', window.speechSynthesis.getVoices().length, 'voices available');
          window.speechSynthesis.speak(utterance);
        }
      }, 100);
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