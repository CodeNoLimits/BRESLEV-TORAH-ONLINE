import { useState, useEffect, useCallback } from 'react';
import { Language } from '../types';

interface TTSCloudOptions {
  language: Language;
  enabled: boolean;
}

export const useTTSCloud = ({ language, enabled }: TTSCloudOptions) => {
  const [isCloudAvailable, setIsCloudAvailable] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);

  // Check if cloud TTS is available
  useEffect(() => {
    const checkCloudTTS = async () => {
      try {
        const response = await fetch('/api/tts/ping');
        const data = await response.json();
        setIsCloudAvailable(data.available);
        console.log(`[TTS-Cloud] Service status:`, data);
      } catch (error) {
        console.warn('[TTS-Cloud] Health check failed, using fallback:', error);
        setIsCloudAvailable(false);
      }
    };

    checkCloudTTS();
  }, []);

  // Fallback to Web Speech API
  const speakWithWebAPI = useCallback((text: string) => {
    if (!window.speechSynthesis) return;

    const utterance = new SpeechSynthesisUtterance(text);
    
    // Language mapping
    const langMap = {
      fr: 'fr-FR',
      en: 'en-US', 
      he: 'he-IL'
    };
    
    utterance.lang = langMap[language] || 'fr-FR';
    utterance.rate = 0.9;
    utterance.pitch = 0.8; // Lower pitch for masculine tone
    utterance.volume = 1.0;

    // Try to find a male voice
    const voices = speechSynthesis.getVoices();
    const maleVoice = voices.find(voice => 
      voice.lang.startsWith(langMap[language].split('-')[0]) && 
      (voice.name.toLowerCase().includes('male') || 
       voice.name.toLowerCase().includes('david') ||
       voice.name.toLowerCase().includes('alex') ||
       voice.name.toLowerCase().includes('daniel'))
    );
    
    if (maleVoice) {
      utterance.voice = maleVoice;
      console.log(`[TTS-Fallback] Using voice: ${maleVoice.name}`);
    }

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    speechSynthesis.speak(utterance);
  }, [language]);

  // Premium cloud TTS
  const speakWithCloud = useCallback(async (text: string) => {
    try {
      console.log(`[TTS-Cloud] Requesting synthesis for: ${text.substring(0, 50)}...`);
      
      const response = await fetch('/api/tts/speak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, lang: language })
      });

      if (!response.ok) {
        throw new Error(`TTS API error: ${response.status}`);
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new HTMLAudioElement();
      
      audio.src = audioUrl;
      audio.onplay = () => setIsSpeaking(true);
      audio.onended = () => {
        setIsSpeaking(false);
        URL.revokeObjectURL(audioUrl);
        setCurrentAudio(null);
      };
      audio.onerror = () => {
        setIsSpeaking(false);
        URL.revokeObjectURL(audioUrl);
        setCurrentAudio(null);
        console.error('[TTS-Cloud] Audio playback failed');
      };

      setCurrentAudio(audio);
      await audio.play();
      
      console.log(`[TTS-Cloud] Playing high-quality masculine voice`);

    } catch (error) {
      console.error('[TTS-Cloud] Synthesis failed, falling back to Web API:', error);
      speakWithWebAPI(text);
    }
  }, [language, speakWithWebAPI]);

  // Main speak function with automatic fallback
  const speak = useCallback((text: string) => {
    if (!enabled || !text.trim()) return;

    // Stop any current speech
    stop();

    if (isCloudAvailable) {
      speakWithCloud(text);
    } else {
      speakWithWebAPI(text);
    }
  }, [enabled, isCloudAvailable, speakWithCloud, speakWithWebAPI]);

  // Stop all speech
  const stop = useCallback(() => {
    // Stop cloud audio
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      setCurrentAudio(null);
    }
    
    // Stop web speech
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    
    setIsSpeaking(false);
  }, [currentAudio]);

  // Welcome greeting
  const speakGreeting = useCallback(() => {
    const greetings = {
      fr: "Shalom et bienvenue dans Le Compagnon du Cœur. Je suis votre guide spirituel avec une voix masculine naturelle.",
      en: "Shalom and welcome to The Heart's Companion. I am your spiritual guide with a natural masculine voice.",
      he: "שלום וברוכים הבאים לחבר הלב. אני המדריך הרוחני שלכם עם קול גברי טבעי."
    };
    
    speak(greetings[language]);
  }, [language, speak]);

  return {
    speak,
    stop,
    speakGreeting,
    isSpeaking,
    isCloudAvailable
  };
};