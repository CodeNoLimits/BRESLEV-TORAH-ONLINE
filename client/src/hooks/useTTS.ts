import { useCallback, useEffect, useState } from 'react';
import { toast } from "@/hooks/use-toast";
import { Language } from '../types';

interface TTSOptions {
  language: Language;
  enabled: boolean;
}

export const useTTS = ({ language, enabled }: TTSOptions) => {
  const [isSupported, setIsSupported] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [ttsEnabled, setTtsEnabled] = useState(enabled);

  useEffect(() => {
    setTtsEnabled(true);
    console.log('[TTS] Force enabled - TTS is now active');
  }, [enabled]);

  // Force TTS to work on user interaction
  useEffect(() => {
    const enableTTSOnClick = () => {
      if (!ttsEnabled) {
        setTtsEnabled(true);
        console.log('[TTS] Enabled via user interaction');
      }
    };
    document.addEventListener('click', enableTTSOnClick, { once: true });
    return () => document.removeEventListener('click', enableTTSOnClick);
  }, [ttsEnabled]);

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

  const speak = useCallback(async (text: string) => {
    if (!text.trim() || text.trim().length === 0) {
      console.log(`[TTS] Not speaking - text length: ${text.trim().length}`);
      return;
    }

    console.log(`[TTS] Speaking enabled: ${ttsEnabled}, text length: ${text.trim().length}`);

    // Clean text for better TTS
    const cleanText = text
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/&[^;]+;/g, ' ') // Remove HTML entities
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/[*#_`]/g, '') // Remove markdown characters
      .trim();

    if (!cleanText) {
      console.log(`[TTS] No clean text to speak`);
      return;
    }

    console.log(`[TTS] Preparing to speak: "${cleanText.substring(0, 50)}..."`);

    // Stop any ongoing speech first
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
    }

    // Check if speechSynthesis has voices available
    const hasVoices = isSupported && voices.length > 0;

    if (hasVoices) {
      // Try Web Speech API first
      console.log(`[TTS] Using Web Speech API with ${voices.length} voices available`);

      const utterance = new SpeechSynthesisUtterance(cleanText.substring(0, 1000));
      const voice = getVoiceForLanguage(language);

      if (voice) {
        utterance.voice = voice;
        console.log(`[TTS] Using voice: ${voice.name} (${voice.lang}) for language: ${language}`);
      }

      // Set appropriate language and speech parameters
      utterance.lang = language === 'he' ? 'he-IL' : language === 'en' ? 'en-US' : 'fr-FR';
      utterance.rate = language === 'he' ? 0.7 : 0.85;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      utterance.onstart = () => {
        setIsSpeaking(true);
        console.log(`[TTS] Successfully started speaking ${language} text with Web Speech API`);
      };

      utterance.onend = () => {
        setIsSpeaking(false);
        console.log(`[TTS] Finished speaking successfully`);
        if (cleanText.length > 1000) {
          const restOfText = cleanText.substring(1000);
          tryCloudTTSFallback(restOfText, language);
        }
      };

      utterance.onerror = (event) => {
        setIsSpeaking(false);
        console.error(`[TTS] Speech error:`, event.error, event);
        // Fallback to Google Cloud TTS on error
        tryCloudTTSFallback(cleanText, language);
      };

      try {
        window.speechSynthesis.speak(utterance);
        console.log(`[TTS] Web Speech API synthesis initiated`);
      } catch (error) {
        console.error(`[TTS] Failed to initiate Web Speech API:`, error);
        setIsSpeaking(false);
        // Fallback to Google Cloud TTS
        await tryCloudTTSFallback(cleanText, language);
      }
    } else {
      // No voices available, fallback to Google Cloud TTS
      console.log(`[TTS] No voices available for Web Speech API, trying Google Cloud TTS fallback`);
      await tryCloudTTSFallback(cleanText, language);
    }
  }, [ttsEnabled, isSupported, language, getVoiceForLanguage, voices]);

  const tryCloudTTSFallback = useCallback(async (text: string, lang: Language) => {
    try {
      console.log(`[TTS] Attempting Google Cloud TTS fallback for ${lang}`);
      setIsSpeaking(true);

      const response = await fetch('/api/tts/speak', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: text,
          language: lang
        })
      });

      if (response.ok) {
        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);

        audio.onplay = () => {
          console.log(`[TTS] Google Cloud TTS started playing`);
        };

        audio.onended = () => {
          setIsSpeaking(false);
          URL.revokeObjectURL(audioUrl);
          console.log(`[TTS] Google Cloud TTS finished playing`);
        };

        audio.onerror = () => {
          setIsSpeaking(false);
          URL.revokeObjectURL(audioUrl);
          console.error(`[TTS] Google Cloud TTS audio playback error`);
          // Show user notification that TTS is not available
          if ('toast' in window) {
            (window as any).toast?.({
              title: "TTS non disponible",
              description: "Le système de lecture vocale n'est pas disponible actuellement.",
              variant: "default"
            });
          }
        };

        await audio.play();
      } else {
        // Both fallbacks failed
        setIsSpeaking(false);
        console.log(`[TTS] Google Cloud TTS not available (${response.status})`);
        // Show user notification
        if ('toast' in window) {
          (window as any).toast?.({
            title: "TTS non disponible",
            description: "Le système de lecture vocale n'est pas disponible actuellement.",
            variant: "default"
          });
        }
      }
    } catch (error) {
      setIsSpeaking(false);
      console.error(`[TTS] Google Cloud TTS fallback failed:`, error);
      // Show user notification
      if ('toast' in window) {
        (window as any).toast?.({
          title: "TTS non disponible", 
          description: "Le système de lecture vocale n'est pas disponible actuellement.",
          variant: "default"
        });
      }
    }
  }, []);

  const stop = useCallback(() => {
    if (isSupported) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, [isSupported]);

  const speakGreeting = useCallback(() => {
    if (!ttsEnabled || !isSupported) return;

    const greetingMessages = {
      fr: "Sélectionnez la partie du texte que vous voulez que je lise, puis activez le bouton TTS.",
      en: "Select the part of the text you want me to read, then switch on the TTS button.",
      he: "בחרו את הקטע שתרצו שאקרא, ואחר-כך הפעילו את כפתור ה-TTS."
    };

    const message = greetingMessages[language] || greetingMessages.fr;
    speak(message);
  }, [ttsEnabled, isSupported, language, speak]);

  return {
    speak,
    speakGreeting,
    stop,
    isSupported,
    isSpeaking,
    voices
  };
};