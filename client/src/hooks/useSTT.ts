
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
    interimResults = true,
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
      console.log('[STT] ✅ API Speech Recognition disponible');
      
      const recognition = new SpeechRecognition();
      recognition.continuous = continuous;
      recognition.interimResults = interimResults;
      recognition.lang = language;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        console.log('[STT] 🎤 Écoute démarrée');
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        console.log('[STT] 📝 Résultat reçu, nombre de résultats:', event.results.length);
        
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          console.log(`[STT] Résultat ${i}:`, transcript, 'Final:', event.results[i].isFinal);
          
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        const result = finalTranscript || interimTranscript;
        setTranscript(result);
        
        if (finalTranscript && onResult) {
          console.log('[STT] ✅ Résultat final envoyé:', finalTranscript);
          onResult(finalTranscript);
        }
      };

      recognition.onend = () => {
        console.log('[STT] 🛑 Écoute terminée');
        setIsListening(false);
      };

      recognition.onerror = (event: any) => {
        console.error('[STT] ❌ Erreur:', event.error);
        setIsListening(false);
        if (onError) onError(event.error);
      };

      recognitionRef.current = recognition;
    } else {
      console.warn('[STT] ❌ Speech Recognition API non disponible');
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
      console.warn('[STT] ❌ Impossible de démarrer: API non supportée');
      return false;
    }

    if (isListening) {
      console.warn('[STT] ⚠️ Déjà en écoute');
      return false;
    }

    try {
      setTranscript('');
      recognitionRef.current.start();
      console.log('[STT] 🚀 Demande de démarrage envoyée');
      return true;
    } catch (error) {
      console.error('[STT] ❌ Erreur lors du démarrage:', error);
      return false;
    }
  }, [isSupported, isListening]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      console.log('[STT] 🛑 Arrêt demandé');
    }
  }, [isListening]);

  return {
    isListening,
    isSupported,
    transcript,
    startListening,
    stopListening
  };
};
