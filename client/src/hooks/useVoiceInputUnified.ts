import { useState, useRef, useEffect, useCallback } from 'react';

interface VoiceInputOptions {
  onTranscript: (text: string) => void;
  language?: string;
  continuous?: boolean;
}

export const useVoiceInputUnified = ({
  onTranscript,
  language = 'fr-FR',
  continuous = false
}: VoiceInputOptions) => {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Vérification support navigateur
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      console.warn('[VoiceInput] Web Speech API non supporté');
      setIsSupported(false);
      return;
    }

    setIsSupported(true);
    
    // Initialisation reconnaissance vocale
    const recognition = new SpeechRecognition();
    recognition.lang = language;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.continuous = continuous;

    recognition.onstart = () => {
      console.log('[VoiceInput] Écoute démarrée');
      setIsListening(true);
      
      // Timeout de sécurité (15 secondes max)
      timeoutRef.current = setTimeout(() => {
        if (recognitionRef.current) {
          recognitionRef.current.stop();
        }
      }, 15000);
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      const transcript = event.results[0][0].transcript.trim();
      console.log('[VoiceInput] Transcription:', transcript);
      
      if (transcript) {
        onTranscript(transcript);
      }
    };

    recognition.onend = () => {
      console.log('[VoiceInput] Écoute terminée');
      setIsListening(false);
      
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('[VoiceInput] Erreur reconnaissance:', event.error);
      setIsListening(false);
      
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      // Retry automatique pour certaines erreurs
      if (event.error === 'network' || event.error === 'audio-capture') {
        console.log('[VoiceInput] Retry automatique dans 2s...');
        setTimeout(() => {
          if (!isListening) {
            startListening();
          }
        }, 2000);
      }
    };

    recognitionRef.current = recognition;

    // Cleanup
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [language, continuous, onTranscript, isListening]);

  const startListening = useCallback(() => {
    if (!isSupported) {
      console.warn('[VoiceInput] Reconnaissance vocale non supportée');
      return;
    }

    if (recognitionRef.current && !isListening) {
      try {
        console.log('[VoiceInput] Démarrage reconnaissance...');
        recognitionRef.current.start();
      } catch (error) {
        console.error('[VoiceInput] Erreur démarrage:', error);
      }
    }
  }, [isSupported, isListening]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      console.log('[VoiceInput] Arrêt reconnaissance...');
      recognitionRef.current.stop();
    }
  }, [isListening]);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  return { 
    startListening, 
    stopListening, 
    toggleListening,
    isListening, 
    isSupported 
  };
};