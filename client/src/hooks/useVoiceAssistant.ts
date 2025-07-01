import { useState, useCallback, useRef, useEffect } from 'react';

// Types pour Web Speech API
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

interface VoiceAssistantOptions {
  onQuickResponse: (response: string) => void;
  onError?: (error: string) => void;
}

export function useVoiceAssistant({ onQuickResponse, onError }: VoiceAssistantOptions) {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesisUtterance | null>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  // Initialiser la reconnaissance vocale
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      
      const recognition = recognitionRef.current;
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'fr-FR';
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresults = (event: any) => {
        const transcript = event.results[0][0].transcript;
        handleVoiceInput(transcript);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.onerror = (event: any) => {
        setIsListening(false);
        onError?.(`Erreur d'écoute: ${event.error}`);
      };
    }
  }, []);

  // Traiter l'entrée vocale et obtenir une réponse Gemini
  const handleVoiceInput = useCallback(async (transcript: string) => {
    setIsProcessing(true);
    
    try {
      // Construire un prompt optimisé pour des réponses courtes
      const quickPrompt = `
Réponds en français de manière très courte et directive (maximum 20 mots).

Question: "${transcript}"

Réponds comme un guide spirituel breslov qui donne des directives rapides et pratiques.
Utilise un style oral, direct, encourageant.
Évite les longues explications.

Exemples de réponses:
- "Récite le Tikkun HaKlali maintenant"
- "Médite 5 minutes sur la gratitude"
- "Cherche Likutei Moharan 1 pour cette question"
- "Prends une respiration profonde et fais techouva"
`;

      const response = await fetch('/api/gemini/quick', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prompt: quickPrompt,
          maxTokens: 50 // Limiter pour des réponses courtes
        })
      });

      if (!response.ok) {
        throw new Error('Erreur Gemini');
      }

      const data = await response.json();
      const quickResponse = data.response || "Pose ta question autrement";
      
      // Prononcer la réponse immédiatement
      speakResponse(quickResponse);
      onQuickResponse(quickResponse);
      
    } catch (error) {
      const fallbackResponse = "Je t'écoute, reformule ta question";
      speakResponse(fallbackResponse);
      onQuickResponse(fallbackResponse);
    } finally {
      setIsProcessing(false);
    }
  }, [onQuickResponse]);

  // Prononcer une réponse avec voix française
  const speakResponse = useCallback((text: string) => {
    // Interrompre toute synthèse en cours
    stopSpeaking();
    
    setIsSpeaking(true);
    
    // Essayer d'abord la synthèse vocale native
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'fr-FR';
      utterance.rate = 1.1; // Légèrement plus rapide
      utterance.pitch = 1.0;
      utterance.volume = 0.9;
      
      // Choisir une voix française si disponible
      const voices = speechSynthesis.getVoices();
      const frenchVoice = voices.find(voice => 
        voice.lang.startsWith('fr') && voice.name.includes('Female')
      ) || voices.find(voice => voice.lang.startsWith('fr'));
      
      if (frenchVoice) {
        utterance.voice = frenchVoice;
      }
      
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      
      synthRef.current = utterance;
      speechSynthesis.speak(utterance);
    } else {
      // Fallback sans synthèse vocale
      setIsSpeaking(false);
    }
  }, []);

  // Commencer l'écoute
  const startListening = useCallback(() => {
    if (!recognitionRef.current) {
      onError?.('Reconnaissance vocale non supportée');
      return;
    }

    // Arrêter toute synthèse en cours
    stopSpeaking();
    
    try {
      recognitionRef.current.start();
    } catch (error) {
      onError?.('Impossible de démarrer l\'écoute');
    }
  }, [onError]);

  // Arrêter l'écoute
  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
  }, [isListening]);

  // Arrêter la synthèse vocale
  const stopSpeaking = useCallback(() => {
    if (synthRef.current) {
      speechSynthesis.cancel();
      synthRef.current = null;
    }
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
    setIsSpeaking(false);
  }, []);

  // Interruption complète
  const stopAll = useCallback(() => {
    stopListening();
    stopSpeaking();
    setIsProcessing(false);
  }, [stopListening, stopSpeaking]);

  return {
    isListening,
    isSpeaking,
    isProcessing,
    startListening,
    stopListening,
    stopSpeaking,
    stopAll,
    isSupported: 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window
  };
}