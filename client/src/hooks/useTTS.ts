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

  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSupported, setIsSupported] = useState('speechSynthesis' in window);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    const handleVoicesChanged = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      setVoices(availableVoices);
      console.log('[TTS] Voices loaded:', availableVoices.length);
    };

    if ('speechSynthesis' in window && 'SpeechSynthesisUtterance' in window) {
      synthRef.current = window.speechSynthesis;
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
    console.log('[TTS] 🔊 DEMANDE DE LECTURE:', { text: cleanedText.substring(0, 50) + '...', language, isSupported });
    
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
        setIsSpeaking(false);
      };

      audioRef.current.onerror = () => {
        console.warn('Cloud TTS failed, falling back to Web Speech API');
        fallbackToWebSpeech(cleanedText, language);
      };

      await audioRef.current.play();
      setIsSpeaking(true);

    } catch (error) {
      console.warn('Cloud TTS failed, falling back to Web Speech API:', error);
      fallbackToWebSpeech(cleanedText, language);
    }
  }, [cleanTextForTTS]);

  /**
   * Fallback to Web Speech API with enhanced voice selection
   */
  const fallbackToWebSpeech = useCallback((text: string, language: Language) => {
    if (!synthRef.current || !isSupported) {
      setState(prev => ({ ...prev, isPlaying: false }));
      setIsSpeaking(false);
      return;
    }

    // Force stop any ongoing speech with multiple cancels
    window.speechSynthesis.cancel();
    window.speechSynthesis.cancel();

    // Longer delay to ensure complete cancellation
    setTimeout(() => {
      const utterance = new SpeechSynthesisUtterance(text);
      utteranceRef.current = utterance;

      // Enhanced voice selection
      const voices = window.speechSynthesis.getVoices();
      let selectedVoice = null;

      if (language === 'he') {
        selectedVoice = voices.find(voice => 
          voice.lang.includes('he') || 
          voice.name.toLowerCase().includes('hebrew') ||
          voice.name.toLowerCase().includes('carmit')
        );
        utterance.lang = 'he-IL';
      } else if (language === 'en') {
        selectedVoice = voices.find(voice => 
          voice.lang.includes('en') && 
          voice.lang.includes('US')
        );
        utterance.lang = 'en-US';
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
        setState(prev => ({ ...prev, isPlaying: true }));
      };

      utterance.onend = () => {
        console.log('[TTS] ✅ Speech ended');
        setIsSpeaking(false);
        setState(prev => ({
          ...prev,
          isPlaying: false,
          isPaused: false,
          currentText: null
        }));
      };

      utterance.onerror = (event) => {
        setIsSpeaking(false);
        console.error('[TTS] ❌ ERREUR AUDIO:', event.error, event);
        setState(prev => ({
          ...prev,
          isPlaying: false,
          isPaused: false,
          currentText: null
        }));

        // Retry with fallback if voice error
        if (event.error === 'voice-unavailable' && voices.length > 0) {
          console.log('[TTS] Retrying with default voice');
          const fallbackUtterance = new SpeechSynthesisUtterance(text);
          fallbackUtterance.lang = FALLBACK_VOICES[language] || 'fr-FR';
          fallbackUtterance.rate = 0.8;
          window.speechSynthesis.speak(fallbackUtterance);
        }
      };

      try {
        window.speechSynthesis.speak(utterance);
      } catch (error) {
        console.error('[TTS] ❌ Failed to speak:', error);
        setIsSpeaking(false);
        setState(prev => ({ ...prev, isPlaying: false }));
      }
    }, 200);
  }, [isSupported, voices]);

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

    setIsSpeaking(false);
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

  /**
   * Speak a greeting message
   */
  const speakGreeting = useCallback(async () => {
    const greeting = "Bienvenue sur Le Compagnon du Cœur. Que puis-je pour vous aujourd'hui ?";
    await speak(greeting, 'fr');
  }, [speak]);

  return {
    speak,
    stop,
    pause,
    resume,
    speakGreeting,
    voices,
    state: {
      ...state,
      isPlaying: state.isPlaying || isSpeaking
    },
    isSupported: state.isSupported
  };
}