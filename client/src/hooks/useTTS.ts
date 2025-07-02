import { useCallback, useEffect, useState } from 'react';

// Fonction pour nettoyer le texte HTML et Markdown
const cleanText = (text: string): string => {
  // Supprimer les balises HTML
  let cleanedText = text.replace(/<[^>]*>/g, '');
  // Supprimer les caractères Markdown (simpliste)
  cleanedText = cleanedText.replace(/[\*`_~]/g, '');
  return cleanedText;
};

export function useTTS() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    const handleVoicesChanged = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      setVoices(availableVoices);
    };

    if ('speechSynthesis' in window && 'SpeechSynthesisUtterance' in window) {
      setIsSupported(true);
      console.log('[TTS] Web Speech API détecté et activé');
      // Charger les voix immédiatement et écouter les changements
      handleVoicesChanged();
      window.speechSynthesis.onvoiceschanged = handleVoicesChanged;
    } else {
      console.warn('[TTS] Web Speech API non supporté sur cet appareil');
    }

    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, []);

  const speak = useCallback((text: string, lang = 'fr-FR') => {
    const cleanedText = cleanText(text);
    console.log('[TTS] 🔊 DEMANDE DE LECTURE:', { text: cleanedText.substring(0, 50) + '...', lang, isSupported });
    
    if (!cleanedText || !isSupported) {
      console.log('[TTS] ❌ Texto vide ou TTS non supporté');
      return;
    }

    if (!window.speechSynthesis) {
      console.error('[TTS] ❌ speechSynthesis not available');
      return;
    }

    window.speechSynthesis.cancel();
      
    const utterance = new SpeechSynthesisUtterance(cleanedText);
    utterance.lang = lang;
    utterance.rate = 0.8;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
      
    if (voices.length > 0) {
      const voice = voices.find(v => v.lang.startsWith(lang.split('-')[0])) || voices[0];
      utterance.voice = voice;
      console.log('[TTS] 🎯 Using voice:', voice.name, voice.lang);
    } else {
      console.log('[TTS] ⚠️ No voices found, using default');
    }
      
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = (event) => {
      setIsSpeaking(false);
      console.error('[TTS] ❌ ERREUR AUDIO COMPLÈTE:', event.error, event);
    };

    window.speechSynthesis.speak(utterance);

  }, [isSupported, voices]);

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

  return { speak, stop, isSpeaking, isSupported, voices, speakGreeting };
}