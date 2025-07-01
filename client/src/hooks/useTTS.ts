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
    console.log('[TTS] 🔊 DEMANDE DE LECTURE:', { text: text.substring(0, 50) + '...', lang, isSupported });
    
    if (!text || !isSupported) {
      console.log('[TTS] ❌ Texto vide ou TTS non supporté');
      return;
    }

    if (!window.speechSynthesis) {
      console.error('[TTS] ❌ speechSynthesis not available');
      return;
    }

    try {
      // Simple et direct: arrêter et parler immédiatement
      window.speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      utterance.rate = 0.8;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      
      // Forcer une voix si disponible
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        const voice = voices.find(v => v.lang.startsWith(lang.split('-')[0])) || voices[0];
        utterance.voice = voice;
        console.log('[TTS] 🎯 Using voice:', voice.name, voice.lang);
      }
      
      utterance.onstart = () => {
        setIsSpeaking(true);
        console.log('[TTS] 🔊 SON DÉMARRÉ - VOUS DEVRIEZ ENTENDRE LE SON MAINTENANT!');
      };
      
      utterance.onend = () => {
        setIsSpeaking(false);
        console.log('[TTS] 🔊 SON TERMINÉ');
      };
      
      utterance.onerror = (event) => {
        setIsSpeaking(false);
        console.error('[TTS] ❌ ERREUR AUDIO:', event.error, event);
      };

      console.log('[TTS] 🚀 LANCEMENT IMMÉDIAT DU SON...');
      window.speechSynthesis.speak(utterance);
      
    } catch (error) {
      console.error('[TTS] ❌ Erreur lors de la création de la lecture:', error);
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