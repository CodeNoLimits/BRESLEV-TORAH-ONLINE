import { useState, useCallback } from "react";
import { Language } from '../types';

interface TTSMobileOptions {
  language: Language;
  enabled: boolean;
}

export function useTTSMobile({ language, enabled }: TTSMobileOptions) {
  const [supported, setSupported] = useState<boolean>(true); // Force supported to true
  const [isSpeaking, setIsSpeaking] = useState(false);

  const speak = useCallback(async (text: string) => {
    if (!supported || !enabled) {
      console.log(`[TTS-Mobile] Not supported or disabled: supported=${supported}, enabled=${enabled}`);
      return;
    }

    console.log(`[TTS-Mobile] SPEAKING: ${text.substring(0, 100)}...`);

    try {
      setIsSpeaking(true);

      // ➜ 1. attendre l'événement voiceschanged si nécessaire
      const voicesReady = new Promise<SpeechSynthesisVoice[]>((res) => {
        const v = window.speechSynthesis.getVoices();
        if (v.length) return res(v);
        
        const handleVoicesChanged = () => {
          const voices = window.speechSynthesis.getVoices();
          if (voices.length > 0) {
            window.speechSynthesis.removeEventListener('voiceschanged', handleVoicesChanged);
            res(voices);
          }
        };
        
        window.speechSynthesis.addEventListener('voiceschanged', handleVoicesChanged);
        
        // Fallback timeout après 3 secondes
        setTimeout(() => {
          window.speechSynthesis.removeEventListener('voiceschanged', handleVoicesChanged);
          res(window.speechSynthesis.getVoices());
        }, 3000);
      });

      const voices = await voicesReady;
      console.log(`[TTS-Mobile] Loaded ${voices.length} voices`);

      // Déterminer la langue appropriée
      const langCode = language === 'he' ? 'he-IL' : 
                       language === 'en' ? 'en-US' : 'fr-FR';
      
      const voice = voices.find(v => v.lang.startsWith(langCode)) ?? 
                   voices.find(v => v.lang.startsWith(language)) ?? 
                   voices[0];

      if (!voice) {
        console.warn('[TTS-Mobile] No voice found');
        setIsSpeaking(false);
        return;
      }

      // ➜ 2. Chrome/Android exige un geste : appelle speak() UNIQUEMENT après un clic
      const cleanText = text
        .replace(/<[^>]*>/g, '')
        .replace(/&[^;]+;/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      const utt = new SpeechSynthesisUtterance(cleanText);
      utt.voice = voice;
      utt.rate = 0.9;
      utt.pitch = 1.0;
      utt.volume = 1.0;
      utt.lang = langCode;

      utt.onstart = () => {
        console.log('[TTS-Mobile] Speech started');
        setIsSpeaking(true);
      };

      utt.onend = () => {
        console.log('[TTS-Mobile] Speech ended');
        setIsSpeaking(false);
      };

      utt.onerror = (event) => {
        console.error('[TTS-Mobile] Speech error:', event.error);
        setIsSpeaking(false);
      };

      // Stop any ongoing speech first
      window.speechSynthesis.cancel();
      
      // Start new speech
      window.speechSynthesis.speak(utt);

    } catch (error) {
      console.error('[TTS-Mobile] Error:', error);
      setIsSpeaking(false);
    }
  }, [supported, enabled, language]);

  const stopTTS = useCallback(() => {
    if (supported) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      console.log('[TTS-Mobile] Speech stopped');
    }
  }, [supported]);

  return { 
    supported, 
    speak, 
    stopTTS,
    isSpeaking 
  };
}