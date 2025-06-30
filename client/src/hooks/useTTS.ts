import { useCallback, useEffect, useState } from "react";
import { Language } from "../types";

interface TTSOptions {
  language: Language;
  enabled: boolean;
}

export const useTTS = ({ language, enabled }: TTSOptions) => {
  const [isSupported, setIsSupported] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    setIsSupported("speechSynthesis" in window);

    if ("speechSynthesis" in window) {
      const updateVoices = () => {
        setVoices(window.speechSynthesis.getVoices());
      };

      updateVoices();
      window.speechSynthesis.onvoiceschanged = updateVoices;
    }
  }, []);

  const getVoiceForLanguage = useCallback(
    (lang: Language): SpeechSynthesisVoice | null => {
      const langMap = {
        fr: ["fr-FR", "fr"],
        en: ["en-US", "en"],
        he: ["he-IL", "he"],
      };

      const targetLangs = langMap[lang];

      for (const targetLang of targetLangs) {
        const voice = voices.find((v) => v.lang.startsWith(targetLang));
        if (voice) return voice;
      }

      return voices.find((v) => v.default) || voices[0] || null;
    },
    [voices],
  );

  const speak = useCallback(
    (text: string) => {
      if (!enabled || !isSupported || !text.trim()) {
        console.log(
          `[TTS] Not speaking - enabled: ${enabled}, supported: ${isSupported}, text: ${!!text.trim()}`,
        );
        return;
      }

      // Stop any ongoing speech first
      if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
      }

      // Clean text for better TTS
      const cleanText = text
        .replace(/<[^>]*>/g, "") // Remove HTML tags
        .replace(/&[^;]+;/g, " ") // Remove HTML entities
        .replace(/\s+/g, " ") // Normalize whitespace
        .replace(/[*#_`]/g, "") // Remove markdown characters
        .trim();

      if (!cleanText) {
        console.log(`[TTS] No clean text to speak`);
        return;
      }

      console.log(
        `[TTS] Preparing to speak: "${cleanText.substring(0, 50)}..."`,
      );

      const utterance = new SpeechSynthesisUtterance(cleanText);
      const voice = getVoiceForLanguage(language);

      if (voice) {
        utterance.voice = voice;
        console.log(
          `[TTS] Using voice: ${voice.name} (${voice.lang}) for language: ${language}`,
        );
      } else {
        console.log(
          `[TTS] No specific voice found for ${language}, using default`,
        );
      }

      // Set appropriate language and speech parameters
      utterance.lang =
        language === "he" ? "he-IL" : language === "en" ? "en-US" : "fr-FR";
      utterance.rate = language === "he" ? 0.7 : 0.85;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      utterance.onstart = () => {
        setIsSpeaking(true);
        console.log(`[TTS] Successfully started speaking ${language} text`);
      };

      utterance.onend = () => {
        setIsSpeaking(false);
        console.log(`[TTS] Finished speaking successfully`);
      };

      utterance.onerror = (event) => {
        setIsSpeaking(false);
        console.error(`[TTS] Speech error:`, event.error, event);
      };

      try {
        window.speechSynthesis.speak(utterance);
        console.log(`[TTS] Speech synthesis initiated`);
      } catch (error) {
        console.error(`[TTS] Failed to initiate speech:`, error);
        setIsSpeaking(false);
      }
    },
    [enabled, isSupported, language, getVoiceForLanguage],
  );

  const stop = useCallback(() => {
    if (isSupported) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, [isSupported]);

  const speakGreeting = useCallback(() => {
    if (!enabled || !isSupported) return;

    const greetingMessages = {
      fr: "Sélectionnez la partie du texte que vous voulez que je lise, puis activez le bouton TTS.",
      en: "Select the part of the text you want me to read, then switch on the TTS button.",
      he: "בחרו את הקטע שתרצו שאקרא, ואחר-כך הפעילו את כפתור ה-TTS.",
    };

    const message = greetingMessages[language] || greetingMessages.fr;
    speak(message);
  }, [enabled, isSupported, language, speak]);

  return {
    speak,
    speakGreeting,
    stop,
    isSupported,
    isSpeaking,
    voices,
  };
};
