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
      console.log('[TTS] Voices loaded:', availableVoices.length);
    };

    if ('speechSynthesis' in window && 'SpeechSynthesisUtterance' in window) {
      setIsSupported(true);
      console.log('[TTS] Web Speech API détecté et activé');

      // Force initial voice loading
      const loadVoices = () => {
        const voices = window.speechSynthesis.getVoices();
        if (voices.length > 0) {
          setVoices(voices);
          console.log('[TTS] Initial voices loaded:', voices.length);
        } else {
          // Retry after a delay if voices aren't loaded yet
          setTimeout(loadVoices, 100);
        }
      };

      loadVoices();
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

    // Force stop any ongoing speech with multiple cancels
    window.speechSynthesis.cancel();
    window.speechSynthesis.cancel();

    // Longer delay to ensure complete cancellation
    setTimeout(() => {
      const utterance = new SpeechSynthesisUtterance(cleanedText);
      // Sélection intelligente des voix
      const voices = window.speechSynthesis.getVoices();
      let selectedVoice = null;

      if (lang === 'he') {
        selectedVoice = voices.find(voice => 
          voice.lang.includes('he') || 
          voice.name.toLowerCase().includes('hebrew') ||
          voice.name.toLowerCase().includes('carmit')
        );
        utterance.lang = 'he-IL';
      } else {
        selectedVoice = voices.find(voice => 
          voice.lang.includes('fr') || 
          voice.name.toLowerCase().includes('french') ||
          voice.name.toLowerCase().includes('marie')
        );
        utterance.lang = 'fr-FR';
      }

      if (selectedVoice) {
        utterance.voice = selectedVoice;
        console.log(`🎤 Voix sélectionnée: ${selectedVoice.name} (${selectedVoice.lang})`);
      }

      utterance.rate = 0.85;
      utterance.pitch = 1.1;
      utterance.volume = 1;

      utterance.onstart = () => {
        console.log('[TTS] ✅ Speech started');
        setIsSpeaking(true);
        // Force speaking state for 500ms minimum
        setTimeout(() => {
          if (window.speechSynthesis.speaking) {
            console.log('[TTS] ✅ Confirmed speaking');
          }
        }, 500);
      };

      utterance.onend = () => {
        console.log('[TTS] ✅ Speech ended');
        setIsSpeaking(false);
      };

      utterance.onerror = (event) => {
        setIsSpeaking(false);
        console.error('[TTS] ❌ ERREUR AUDIO:', event.error, event);

        // Retry with fallback if voice error
        if (event.error === 'voice-unavailable' && voices.length > 0) {
          console.log('[TTS] Retrying with default voice');
          const fallbackUtterance = new SpeechSynthesisUtterance(cleanedText);
          fallbackUtterance.lang = lang;
          fallbackUtterance.rate = 0.8;
          window.speechSynthesis.speak(fallbackUtterance);
        }
      };

      try {
        window.speechSynthesis.speak(utterance);
      } catch (error) {
        console.error('[TTS] ❌ Failed to speak:', error);
        setIsSpeaking(false);
      }
    }, 200);

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