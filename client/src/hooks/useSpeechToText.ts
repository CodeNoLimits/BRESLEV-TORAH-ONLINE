
import { useState, useRef, useCallback } from 'react';

interface SpeechToTextHook {
  isListening: boolean;
  transcript: string;
  startListening: () => void;
  stopListening: () => void;
  resetTranscript: () => void;
  isSupported: boolean;
}

export const useSpeechToText = (
  onTranscriptComplete?: (transcript: string) => void
): SpeechToTextHook => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const isSupported = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;

  const startListening = useCallback(() => {
    if (!isSupported) {
      console.warn('[STT] Speech recognition not supported');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'fr-FR';

    recognition.onstart = () => {
      console.log('[STT] Started listening');
      setIsListening(true);
    };

    recognition.onresult = (event) => {
      const result = Array.from(event.results)
        .map(result => result[0].transcript)
        .join(' ');
      
      console.log('[STT] Transcript:', result);
      setTranscript(result);
      
      // Auto-send transcript
      if (onTranscriptComplete && result.trim()) {
        onTranscriptComplete(result);
      }
    };

    recognition.onerror = (event) => {
      console.error('[STT] Error:', event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      console.log('[STT] Stopped listening');
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [isSupported, onTranscriptComplete]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  }, []);

  const resetTranscript = useCallback(() => {
    setTranscript('');
  }, []);

  return {
    isListening,
    transcript,
    startListening,
    stopListening,
    resetTranscript,
    isSupported
  };
};
