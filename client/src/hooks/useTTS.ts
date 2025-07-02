import { useCallback, useEffect, useState, useRef } from 'react';

export const useTTS = () => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    const checkSupport = () => {
      const supported = 'speechSynthesis' in window;
      setIsSupported(supported);
      console.log('[TTS] Support détecté:', supported);

      if (supported) {
        // Force l'arrêt complet au démarrage
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
      }
    };

    checkSupport();

    // Surveillance continue de l'état TTS
    const monitorTTS = () => {
      if (window.speechSynthesis) {
        const actualSpeaking = window.speechSynthesis.speaking;
        if (isSpeaking !== actualSpeaking) {
          console.log('[TTS] État synchronisé:', actualSpeaking);
          setIsSpeaking(actualSpeaking);
        }
      }
    };

    const interval = setInterval(monitorTTS, 100);
    return () => clearInterval(interval);
  }, [isSpeaking]);

  const speak = useCallback((text: string, language: string = 'fr-FR') => {
    if (!isSupported || !text?.trim()) {
      console.warn('[TTS] Conditions invalides pour lecture');
      return Promise.reject('TTS non supporté ou texte vide');
    }

    return new Promise<void>((resolve, reject) => {
      try {
        // Arrêt forcé de tout
        window.speechSynthesis.cancel();

        setTimeout(() => {
          const utterance = new SpeechSynthesisUtterance(text.trim());
          utterance.lang = language;
          utterance.rate = 0.9;
          utterance.pitch = 1.0;
          utterance.volume = 1.0;

          utterance.onstart = () => {
            console.log('[TTS] ✅ Lecture démarrée:', text.substring(0, 50));
            setIsSpeaking(true);
          };

          utterance.onend = () => {
            console.log('[TTS] ✅ Lecture terminée');
            setIsSpeaking(false);
            currentUtteranceRef.current = null;
            resolve();
          };

          utterance.onerror = (event) => {
            console.error('[TTS] ❌ Erreur:', event.error);
            setIsSpeaking(false);
            currentUtteranceRef.current = null;
            reject(event.error);
          };

          currentUtteranceRef.current = utterance;
          window.speechSynthesis.speak(utterance);

        }, 150); // Délai pour éviter les conflits

      } catch (error) {
        console.error('[TTS] ❌ Erreur critique:', error);
        setIsSpeaking(false);
        reject(error);
      }
    });
  }, [isSupported]);

  const stop = useCallback(() => {
    if (isSupported && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      currentUtteranceRef.current = null;
      console.log('[TTS] 🛑 Arrêt manuel');
    }
  }, [isSupported]);

  return { 
    speak, 
    stop, 
    isSpeaking, 
    isSupported
  };
};