import { useCallback, useEffect, useState } from 'react';
import { Language } from '../types';

interface TTSOptions {
  language: Language;
  enabled: boolean;
}

export const useTTS = ({ language, enabled }: TTSOptions) => {
  const [isSupported, setIsSupported] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    setIsSupported('speechSynthesis' in window);
    
    if ('speechSynthesis' in window) {
      const updateVoices = () => {
        setVoices(window.speechSynthesis.getVoices());
      };
      
      updateVoices();
      window.speechSynthesis.onvoiceschanged = updateVoices;
    }
  }, []);

  const getVoiceForLanguage = useCallback((lang: Language): SpeechSynthesisVoice | null => {
    const langMap = {
      fr: ['fr-FR', 'fr'],
      en: ['en-US', 'en'],
      he: ['he-IL', 'he']
    };

    const targetLangs = langMap[lang];
    
    for (const targetLang of targetLangs) {
      const voice = voices.find(v => v.lang.startsWith(targetLang));
      if (voice) return voice;
    }
    
    return voices.find(v => v.default) || voices[0] || null;
  }, [voices]);

  const speak = useCallback((text: string) => {
    if (!enabled || !isSupported || !text.trim()) return;

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    // Clean text for better TTS - remove HTML tags and normalize text
    const cleanText = text
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/&[^;]+;/g, ' ') // Remove HTML entities
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();

    if (!cleanText) return;

    const utterance = new SpeechSynthesisUtterance(cleanText);
    const voice = getVoiceForLanguage(language);
    
    if (voice) {
      utterance.voice = voice;
      console.log(`[TTS] Using voice: ${voice.name} (${voice.lang}) for language: ${language}`);
    }
    
    // Set appropriate language and speech parameters
    utterance.lang = language === 'he' ? 'he-IL' : language === 'en' ? 'en-US' : 'fr-FR';
    utterance.rate = language === 'he' ? 0.8 : 0.9; // Slower for Hebrew
    utterance.pitch = 1.0;
    utterance.volume = 0.9;

    utterance.onstart = () => {
      setIsSpeaking(true);
      console.log(`[TTS] Started speaking ${language} text`);
    };
    utterance.onend = () => {
      setIsSpeaking(false);
      console.log(`[TTS] Finished speaking`);
    };
    utterance.onerror = (event) => {
      setIsSpeaking(false);
      console.error(`[TTS] Error:`, event.error);
    };

    window.speechSynthesis.speak(utterance);
  }, [enabled, isSupported, language, getVoiceForLanguage]);

  const stop = useCallback(() => {
    if (isSupported) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, [isSupported]);

  return {
    speak,
    stop,
    isSupported,
    isSpeaking,
    voices
  };
};
