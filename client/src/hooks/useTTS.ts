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

    // Force user interaction by creating a simple click trigger
    const userInteractionNeeded = () => {
      console.log('[TTS] 📢 ACTIVATION MANUELLE REQUISE - Interaction utilisateur détectée');
      
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
      } else {
        console.log('[TTS] ⚠️ No voices found, using default');
      }
      
      utterance.onstart = () => {
        setIsSpeaking(true);
        console.log('[TTS] 🔊 SON RÉELLEMENT DÉMARRÉ - AUDIO ACTIF!');
      };
      
      utterance.onend = () => {
        setIsSpeaking(false);
        console.log('[TTS] 🔊 SON RÉELLEMENT TERMINÉ');
      };
      
      utterance.onerror = (event) => {
        setIsSpeaking(false);
        console.error('[TTS] ❌ ERREUR AUDIO COMPLÈTE:', event.error, event);
      };

      console.log('[TTS] 🚀 FORCE SPEECH NOW...');
      window.speechSynthesis.speak(utterance);
      
      // Backup attempt if first fails
      setTimeout(() => {
        if (!window.speechSynthesis.speaking) {
          console.log('[TTS] 🔄 Retry speaking...');
          window.speechSynthesis.speak(utterance);
        }
      }, 500);
    };

    // Execute immediately since we're in a user interaction context
    userInteractionNeeded();
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