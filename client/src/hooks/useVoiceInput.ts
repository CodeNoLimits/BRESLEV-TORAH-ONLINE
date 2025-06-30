import { useState, useCallback, useRef } from 'react';
import { Language } from '../types';

interface VoiceInputOptions {
  language: Language;
  onResult: (transcript: string) => void;
  onError?: (error: string) => void;
}

export const useVoiceInput = ({ language, onResult, onError }: VoiceInputOptions) => {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const recognitionRef = useRef<any>(null);

  const initializeRecognition = useCallback(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setIsSupported(false);
      return false;
    }

    setIsSupported(true);
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    // Language mapping
    const langMap = {
      fr: 'fr-FR',
      en: 'en-US', 
      he: 'he-IL'
    };
    
    recognition.lang = langMap[language] || 'fr-FR';
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      console.log('[VoiceInput] Started listening');
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      console.log('[VoiceInput] Transcript:', transcript);
      onResult(transcript);
      setIsListening(false);
    };

    recognition.onerror = (event: any) => {
      console.error('[VoiceInput] Error:', event.error);
      setIsListening(false);
      if (onError) {
        onError(event.error);
      }
    };

    recognition.onend = () => {
      setIsListening(false);
      console.log('[VoiceInput] Stopped listening');
    };

    recognitionRef.current = recognition;
    return true;
  }, [language, onResult, onError]);

  const startListening = useCallback(() => {
    if (!recognitionRef.current && !initializeRecognition()) {
      console.warn('[VoiceInput] Speech recognition not supported');
      return;
    }

    if (isListening) {
      stopListening();
      return;
    }

    try {
      recognitionRef.current?.start();
    } catch (error) {
      console.error('[VoiceInput] Failed to start:', error);
      setIsListening(false);
    }
  }, [isListening, initializeRecognition]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  }, []);

  return {
    isListening,
    isSupported,
    startListening,
    stopListening
  };
};