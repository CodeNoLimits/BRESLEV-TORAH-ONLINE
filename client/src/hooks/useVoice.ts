
import { useCallback, useState } from 'react';

export const useVoice = (onFinal: (question: string) => void) => {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);

  const initRecognition = useCallback(() => {
    const SpeechRecognition = 
      (window as any).webkitSpeechRecognition || 
      (window as any).SpeechRecognition;
    
    if (!SpeechRecognition) {
      console.warn('[Voice] Speech Recognition non supporté');
      return null;
    }

    setIsSupported(true);
    const recognition = new SpeechRecognition();
    recognition.lang = 'fr-FR';
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      console.log('[Voice] Écoute démarrée');
      setIsListening(true);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      console.log('[Voice] Transcription:', transcript);
      onFinal(transcript);
    };

    recognition.onend = () => {
      console.log('[Voice] Écoute terminée');
      setIsListening(false);
    };

    recognition.onerror = (event: any) => {
      console.error('[Voice] Erreur:', event.error);
      setIsListening(false);
    };

    return recognition;
  }, [onFinal]);

  const askVoice = useCallback(() => {
    const recognition = initRecognition();
    if (recognition && !isListening) {
      try {
        recognition.start();
      } catch (error) {
        console.error('[Voice] Erreur démarrage:', error);
      }
    }
  }, [initRecognition, isListening]);

  const speak = useCallback((text: string) => {
    if (!text.trim()) return;
    
    console.log('[Voice] Lecture TTS:', text.substring(0, 50));
    speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'fr-FR';
    utterance.rate = 0.9;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    
    speechSynthesis.speak(utterance);
  }, []);

  return { askVoice, speak, isListening, isSupported };
};
