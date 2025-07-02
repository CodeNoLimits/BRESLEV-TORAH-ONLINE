
import { useState, useCallback, useRef, useEffect } from 'react';

interface UseSTTOptions {
  language?: string;
  continuous?: boolean;
  interimResults?: boolean;
  onResult?: (transcript: string) => void;
  onError?: (error: any) => void;
}

export const useSTT = (options: UseSTTOptions = {}) => {
  const {
    language = 'fr-FR',
    continuous = false,
    interimResults = false,
    onResult,
    onError
  } = options;

  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition = 
      (window as any).webkitSpeechRecognition || 
      (window as any).SpeechRecognition;

    if (SpeechRecognition) {
      setIsSupported(true);
      console.log('[STT] Speech Recognition API disponible');
      
      const recognition = new SpeechRecognition();
      recognition.continuous = continuous;
      recognition.interimResults = interimResults;
      recognition.lang = language;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        console.log('[STT] Écoute démarrée');
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        const result = finalTranscript || interimTranscript;
        setTranscript(result);
        
        if (finalTranscript && onResult) {
          console.log('[STT] Résultat final:', finalTranscript);
          onResult(finalTranscript);
        }
      };

      recognition.onend = () => {
        console.log('[STT] Écoute terminée');
        setIsListening(false);
      };

      recognition.onerror = (event: any) => {
        console.error('[STT] Erreur:', event.error);
        setIsListening(false);
        if (onError) onError(event.error);
      };

      recognitionRef.current = recognition;
    } else {
      console.warn('[STT] Speech Recognition API non disponible');
      setIsSupported(false);
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, [language, continuous, interimResults, onResult, onError]);

  const startListening = useCallback(() => {
    if (!isSupported || !recognitionRef.current) {
      console.warn('[STT] Impossible de démarrer: API non supportée');
      return;
    }

    try {
      setTranscript('');
      recognitionRef.current.start();
    } catch (error) {
      console.error('[STT] Erreur lors du démarrage:', error);
    }
  }, [isSupported]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
  }, [isListening]);

  const abortListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.abort();
      setIsListening(false);
    }
  }, []);

  return {
    isListening,
    isSupported,
    transcript,
    startListening,
    stopListening,
    abortListening
  };
};
