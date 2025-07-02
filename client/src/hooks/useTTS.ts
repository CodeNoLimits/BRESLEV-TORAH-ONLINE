import { useCallback, useEffect, useState, useRef } from 'react';

// Fonction pour nettoyer le texte HTML et Markdown
const cleanText = (text: string): string => {
  // Supprimer les balises HTML
  let cleanedText = text.replace(/<[^>]*>/g, '');
  // Supprimer les caractères Markdown (simpliste)
  cleanedText = cleanedText.replace(/[\*`_~]/g, '');
  return cleanedText;
};

export const useTTS = () => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const queueRef = useRef<string[]>([]);

  useEffect(() => {
    const checkSupport = () => {
      const supported = 'speechSynthesis' in window;
      setIsSupported(supported);
      console.log('[TTS] Web Speech API', supported ? 'détecté et activé' : 'non disponible');
      
      // Force reset du système TTS
      if (supported && window.speechSynthesis) {
        window.speechSynthesis.cancel();
        console.log('[TTS] Système réinitialisé');
      }
    };

    checkSupport();

    // Monitor speech synthesis state avec reset automatique
    const checkSpeaking = () => {
      if (window.speechSynthesis) {
        const actuallySpaeking = window.speechSynthesis.speaking;
        if (isSpeaking && !actuallySpaeking) {
          console.log('[TTS] Lecture terminée automatiquement');
          setIsSpeaking(false);
        }
      }
    };

    const interval = setInterval(checkSpeaking, 250);
    return () => clearInterval(interval);
  }, [isSpeaking]);

  const speak = useCallback((text: string, language: string = 'fr-FR') => {
    if (!isSupported || !text.trim()) {
      console.warn('[TTS] Conditions non remplies pour la lecture');
      return;
    }

    try {
      // Force cancel any ongoing speech
      window.speechSynthesis.cancel();

      // Wait a bit for cancel to complete
      setTimeout(() => {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = language;
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;

        utterance.onstart = () => {
          console.log('[TTS] Lecture démarrée');
          setIsSpeaking(true);
        };

        utterance.onend = () => {
          console.log('[TTS] Lecture terminée');
          setIsSpeaking(false);
          currentUtteranceRef.current = null;

          // Process queue if any
          if (queueRef.current.length > 0) {
            const nextText = queueRef.current.shift();
            if (nextText) speak(nextText, language);
          }
        };

        utterance.onerror = (event) => {
          console.error('[TTS] Erreur:', event.error);
          setIsSpeaking(false);
          currentUtteranceRef.current = null;

          // Retry mechanism for network errors
          if (event.error === 'network' && queueRef.current.length === 0) {
            console.log('[TTS] Tentative de relance après erreur réseau');
            setTimeout(() => speak(text, language), 1000);
          }
        };

        currentUtteranceRef.current = utterance;
        window.speechSynthesis.speak(utterance);
      }, 100);

    } catch (error) {
      console.error('[TTS] Erreur lors de la lecture:', error);
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

  const speakGreeting = useCallback(() => {
    speak("Bienvenue sur Le Compagnon du Cœur. Que puis-je pour vous aujourd'hui ?");
  }, [speak]);

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

  return { speak, stop, isSpeaking, isSupported, voices: [], speakGreeting };
}