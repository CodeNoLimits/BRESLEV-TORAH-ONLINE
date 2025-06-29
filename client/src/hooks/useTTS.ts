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

    const utterance = new SpeechSynthesisUtterance(text);
    const voice = getVoiceForLanguage(language);
    
    if (voice) {
      utterance.voice = voice;
    }
    
    utterance.lang = language === 'he' ? 'he-IL' : language === 'en' ? 'en-US' : 'fr-FR';
    utterance.rate = 0.9;
    utterance.pitch = 1.0;
    utterance.volume = 0.8;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

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
