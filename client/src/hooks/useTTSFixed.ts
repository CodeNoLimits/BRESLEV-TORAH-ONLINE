import { useState, useCallback, useEffect } from 'react';
import { Language } from '../types';

interface TTSOptions {
  language: Language;
  enabled: boolean;
}

export const useTTSFixed = ({ language, enabled }: TTSOptions) => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [voicesLoaded, setVoicesLoaded] = useState(false);

  useEffect(() => {
    setIsSupported('speechSynthesis' in window);
  }, []);

  const loadVoices = useCallback((): Promise<SpeechSynthesisVoice[]> => {
    return new Promise((resolve) => {
      if (voicesLoaded) {
        resolve(window.speechSynthesis.getVoices());
        return;
      }

      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        setVoicesLoaded(true);
        resolve(voices);
        return;
      }

      const handleVoicesChanged = () => {
        const newVoices = window.speechSynthesis.getVoices();
        if (newVoices.length > 0) {
          setVoicesLoaded(true);
          window.speechSynthesis.removeEventListener('voiceschanged', handleVoicesChanged);
          resolve(newVoices);
        }
      };

      window.speechSynthesis.addEventListener('voiceschanged', handleVoicesChanged);
      
      // Fallback timeout
      setTimeout(() => {
        const fallbackVoices = window.speechSynthesis.getVoices();
        if (fallbackVoices.length > 0) {
          setVoicesLoaded(true);
          window.speechSynthesis.removeEventListener('voiceschanged', handleVoicesChanged);
          resolve(fallbackVoices);
        }
      }, 1000);
    });
  }, [voicesLoaded]);

  const speak = useCallback(async (text: string) => {
    if (!enabled || !isSupported || !text.trim()) {
      console.log(`[TTS-Fixed] Not speaking - enabled: ${enabled}, supported: ${isSupported}, text: ${!!text.trim()}`);
      return;
    }

    try {
      // Stop any ongoing speech
      window.speechSynthesis.cancel();
      
      // Unlock audio context (Chrome requirement)
      window.speechSynthesis.resume();

      // Load voices
      const voices = await loadVoices();
      console.log(`[TTS-Fixed] Loaded ${voices.length} voices`);

      // Clean text
      const cleanText = text
        .replace(/<[^>]*>/g, '')
        .replace(/&[^;]+;/g, ' ')
        .replace(/\s+/g, ' ')
        .replace(/[*#_`]/g, '')
        .trim();

      if (!cleanText) return;

      console.log(`[TTS-Fixed] Speaking: "${cleanText.substring(0, 50)}..."`);

      // Create utterance
      const utterance = new SpeechSynthesisUtterance(cleanText);
      
      // Set language
      const langCode = language === 'he' ? 'he' : language === 'en' ? 'en' : 'fr';
      utterance.lang = language === 'he' ? 'he-IL' : language === 'en' ? 'en-US' : 'fr-FR';
      
      // Find appropriate voice
      const voice = voices.find(v => v.lang.startsWith(langCode)) || 
                   voices.find(v => v.default) || 
                   voices[0];
      
      if (voice) {
        utterance.voice = voice;
        console.log(`[TTS-Fixed] Using voice: ${voice.name} (${voice.lang})`);
      }

      // Set parameters
      utterance.rate = 0.9;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      // Event handlers
      utterance.onstart = () => {
        setIsSpeaking(true);
        console.log(`[TTS-Fixed] Started speaking`);
      };
      
      utterance.onend = () => {
        setIsSpeaking(false);
        console.log(`[TTS-Fixed] Finished speaking`);
      };
      
      utterance.onerror = (event) => {
        setIsSpeaking(false);
        console.error(`[TTS-Fixed] Error:`, event.error);
      };

      // Speak
      window.speechSynthesis.speak(utterance);
      
    } catch (error) {
      console.error(`[TTS-Fixed] Failed:`, error);
      setIsSpeaking(false);
    }
  }, [enabled, isSupported, language, loadVoices]);

  const speakGreeting = useCallback(async () => {
    if (!enabled || !isSupported) return;
    
    const greetingMessages = {
      fr: "Sélectionnez la partie du texte que vous voulez que je lise, puis utilisez les boutons d'analyse.",
      en: "Select the part of the text you want me to read, then use the analysis buttons.",
      he: "בחרו את הקטע שתרצו שאקרא, ואחר-כך השתמשו בכפתורי הניתוח."
    };
    
    const message = greetingMessages[language] || greetingMessages.fr;
    await speak(message);
  }, [enabled, isSupported, language, speak]);

  const stop = useCallback(() => {
    if (isSupported) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, [isSupported]);

  return {
    speak,
    speakGreeting,
    stop,
    isSupported,
    isSpeaking
  };
};