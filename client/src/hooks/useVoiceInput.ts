
import { useState, useCallback, useRef, useEffect } from 'react';
import { toast } from './use-toast';

interface VoiceInputOptions {
  lang?: string;
  continuous?: boolean;
  onResult?: (text: string) => void;
  onError?: (error: string) => void;
}

export const useVoiceInput = (options: VoiceInputOptions = {}) => {
  const [isListening, setIsListening] = useState(false);
  const [inputText, setInputText] = useState('');
  const [isSupported, setIsSupported] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const { lang = 'fr-FR', continuous = false, onResult, onError } = options;

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    setIsSupported(!!SpeechRecognition);

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.lang = lang;
      recognition.continuous = continuous;
      recognition.interimResults = true;

      recognition.onresult = (event) => {
        const transcript = [...event.results].map(result => result[0].transcript).join(" ");
        setInputText(transcript);
        
        if (event.results[event.results.length - 1].isFinal) {
          onResult?.(transcript);
          setTimeout(() => askAI(transcript), 200);
        }
      };

      recognition.onstart = () => {
        console.log('[VoiceInput] Recognition started');
        setIsListening(true);
      };

      recognition.onend = () => {
        console.log('[VoiceInput] Recognition ended');
        setIsListening(false);
      };

      recognition.onerror = (event) => {
        console.error('[VoiceInput] Recognition error:', event.error);
        setIsListening(false);
        onError?.(event.error);
      };

      recognitionRef.current = recognition;
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, [lang, continuous, onResult, onError]);

  const askAI = useCallback(async (question: string) => {
    try {
      const activeRef = (window as any).currentTextRef || null;
      const payload = activeRef ? { text: question, ref: activeRef } : { text: question };
      
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }

      // Add message to chat and speak response
      if (window.addAIMessage) {
        window.addAIMessage(data.answer);
      }
      
      if (window.speak) {
        window.speak(data.answer, 'fr-FR');
      }

    } catch (error) {
      console.error('[VoiceInput] AI request failed:', error);
      toast({
        title: "Erreur de communication avec l'IA spirituelle",
        description: "Veuillez réessayer votre question",
        variant: "destructive"
      });
    }
  }, []);

  const startListening = useCallback(() => {
    if (recognitionRef.current && !isListening) {
      setInputText('');
      recognitionRef.current.start();
    }
  }, [isListening]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
  }, [isListening]);

  const toggle = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  return {
    isListening,
    inputText,
    isSupported,
    startListening,
    stopListening,
    toggle,
    setInputText
  };
};
