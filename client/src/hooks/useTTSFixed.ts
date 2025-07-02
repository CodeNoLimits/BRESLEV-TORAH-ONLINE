import { useCallback, useEffect, useState } from 'react';

const cleanText = (text: string): string => {
  let cleaned = text.replace(/<[^>]*>/g, '');
  cleaned = cleaned.replace(/[\*`_~#]/g, '');
  return cleaned.trim();
};

export const useTTSFixed = () => {
  const [isSpeaking, setIsSpeaking] = useState(false);

  // FONCTION DRASTIQUE - Force le TTS à marcher
  const speak = useCallback((text: string, language: string = 'fr-FR') => {
    console.log('[TTS-FIXED] 🚀 FORCING TTS:', text.substring(0, 50));
    
    if (!text?.trim()) {
      console.warn('[TTS-FIXED] Texte vide');
      return;
    }

    if (!window.speechSynthesis) {
      console.error('[TTS-FIXED] speechSynthesis non disponible');
      return;
    }

    // RESET BRUTAL
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    
    // Attendre puis FORCER
    setTimeout(() => {
      const cleanedText = cleanText(text);
      console.log('[TTS-FIXED] Texte nettoyé pour TTS:', cleanedText.substring(0, 100));
      
      const utterance = new SpeechSynthesisUtterance(cleanedText);
      utterance.lang = language;
      utterance.rate = 0.85;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      utterance.onstart = () => {
        console.log('[TTS-FIXED] ✅ SUCCÈS - Lecture démarrée');
        setIsSpeaking(true);
      };

      utterance.onend = () => {
        console.log('[TTS-FIXED] ✅ Lecture terminée');
        setIsSpeaking(false);
      };

      utterance.onerror = (event) => {
        console.error('[TTS-FIXED] ❌ Erreur TTS:', event.error);
        setIsSpeaking(false);
      };

      // TRIPLE TENTATIVE FORCÉE
      window.speechSynthesis.speak(utterance);
      
      // Vérification et retry si nécessaire
      setTimeout(() => {
        if (!window.speechSynthesis.speaking) {
          console.log('[TTS-FIXED] 🔄 Retry 1');
          window.speechSynthesis.speak(utterance);
          
          setTimeout(() => {
            if (!window.speechSynthesis.speaking) {
              console.log('[TTS-FIXED] 🔄 Retry 2 - FINAL');
              window.speechSynthesis.speak(utterance);
            }
          }, 300);
        }
      }, 200);
      
    }, 250);
  }, []);

  const stop = useCallback(() => {
    console.log('[TTS-FIXED] 🛑 Arrêt forcé');
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, []);

  return {
    speak,
    stop,
    isSpeaking,
    isSupported: true // On assume que c'est supporté
  };
};