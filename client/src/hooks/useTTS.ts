import { useState, useCallback, useEffect, useRef } from 'react';
import { Language, TTSState, UseTTSReturn } from '../types';
import { ttsApi } from '../services/api';

const FALLBACK_VOICES = {
  he: 'he-IL',
  en: 'en-US',
  fr: 'fr-FR'
};

/**
 * Enhanced TTS hook with both Web Speech API and Google Cloud TTS
 * Automatically falls back to Web Speech API if Cloud TTS fails
 */
export function useTTS(): UseTTSReturn {
  const [state, setState] = useState<TTSState>({
    isPlaying: false,
    isPaused: false,
    currentText: null,
    currentLanguage: 'fr',
    volume: 1,
    rate: 0.9,
    voice: null,
    isSupported: 'speechSynthesis' in window
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    if ('speechSynthesis' in window) {
      synthRef.current = window.speechSynthesis;
    }

    return () => {
      // Cleanup on unmount
      stop();
    };
  }, []);

  /**
   * Clean text for TTS processing
   */
  const cleanTextForTTS = useCallback((text: string): string => {
    let cleaned = text;
    
    // Remove HTML tags
    cleaned = cleaned.replace(/<[^>]*>/g, '');
    
    // Remove markdown formatting
    cleaned = cleaned.replace(/[\*`_~#]/g, '');
    
    // Remove multiple spaces
    cleaned = cleaned.replace(/\s+/g, ' ');
    
    // Remove URLs
    cleaned = cleaned.replace(/https?:\/\/[^\s]+/g, '');
    
    // Trim and limit length
    cleaned = cleaned.trim();
    if (cleaned.length > 5000) {
      cleaned = cleaned.substring(0, 4997) + '...';
    }
    
    return cleaned;
  }, []);

  /**
   * Try Google Cloud TTS first, fallback to Web Speech API
   */
  const speak = useCallback(async (text: string, language: Language = 'fr') => {
    if (!text.trim()) return;

    const cleanedText = cleanTextForTTS(text);
    
    setState(prev => ({
      ...prev,
      isPlaying: true,
      isPaused: false,
      currentText: cleanedText,
      currentLanguage: language
    }));

    try {
      // Try Google Cloud TTS first
      const response = await ttsApi.synthesizeSpeech({
        text: cleanedText,
        language
      });

      // Create audio element
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }

      audioRef.current = new Audio(response.audioUrl);
      
      audioRef.current.onended = () => {
        setState(prev => ({
          ...prev,
          isPlaying: false,
          isPaused: false,
          currentText: null
        }));
      };

      audioRef.current.onerror = () => {
        console.warn('Cloud TTS failed, falling back to Web Speech API');
        fallbackToWebSpeech(cleanedText, language);
      };

      await audioRef.current.play();

    } catch (error) {
      console.warn('Cloud TTS failed, falling back to Web Speech API:', error);
      fallbackToWebSpeech(cleanedText, language);
    }
  }, [cleanTextForTTS]);

  /**
   * Fallback to Web Speech API
   */
  const fallbackToWebSpeech = useCallback((text: string, language: Language) => {
    if (!synthRef.current || !state.isSupported) {
      setState(prev => ({ ...prev, isPlaying: false }));
      return;
    }

    // Stop any current speech
    synthRef.current.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utteranceRef.current = utterance;

    // Configure utterance
    utterance.lang = FALLBACK_VOICES[language] || 'fr-FR';
    utterance.volume = state.volume;
    utterance.rate = state.rate;
    utterance.pitch = 1;

    // Find best voice
    const voices = synthRef.current.getVoices();
    const voice = voices.find(v => 
      v.lang.startsWith(language === 'he' ? 'he' : language === 'en' ? 'en' : 'fr')
    );
    if (voice) {
      utterance.voice = voice;
    }

    // Event handlers
    utterance.onend = () => {
      setState(prev => ({
        ...prev,
        isPlaying: false,
        isPaused: false,
        currentText: null
      }));
    };

    utterance.onerror = (error) => {
      console.error('Speech synthesis error:', error);
      setState(prev => ({
        ...prev,
        isPlaying: false,
        isPaused: false,
        currentText: null
      }));
    };

    // Speak
    synthRef.current.speak(utterance);
  }, [state.volume, state.rate, state.isSupported]);

  /**
   * Stop current speech
   */
  const stop = useCallback(() => {
    // Stop audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }

    // Stop speech synthesis
    if (synthRef.current) {
      synthRef.current.cancel();
    }

    setState(prev => ({
      ...prev,
      isPlaying: false,
      isPaused: false,
      currentText: null
    }));
  }, []);

  /**
   * Pause current speech
   */
  const pause = useCallback(() => {
    if (audioRef.current && !audioRef.current.paused) {
      audioRef.current.pause();
      setState(prev => ({ ...prev, isPaused: true, isPlaying: false }));
    } else if (synthRef.current && synthRef.current.speaking) {
      synthRef.current.pause();
      setState(prev => ({ ...prev, isPaused: true, isPlaying: false }));
    }
  }, []);

  /**
   * Resume paused speech
   */
  const resume = useCallback(() => {
    if (audioRef.current && audioRef.current.paused) {
      audioRef.current.play();
      setState(prev => ({ ...prev, isPaused: false, isPlaying: true }));
    } else if (synthRef.current && synthRef.current.paused) {
      synthRef.current.resume();
      setState(prev => ({ ...prev, isPaused: false, isPlaying: true }));
    }
  }, []);

  return {
    speak,
    stop,
    pause,
    resume,
    state,
    isSupported: state.isSupported
  };
}