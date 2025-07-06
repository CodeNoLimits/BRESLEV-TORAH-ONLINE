import { useState, useCallback, useRef } from 'react';

interface Message {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
}

export const useVoiceConversation = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Fonction TTS robuste avec retry
  const speak = useCallback(async (text: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      // Nettoyer le texte pour TTS
      const cleanText = text
        .replace(/[#*_`]/g, '') // Supprimer markdown
        .replace(/[\u{1F600}-\u{1F64F}]/gu, '') // Supprimer emojis
        .replace(/\s+/g, ' ') // Normaliser espaces
        .trim();

      if (!cleanText) {
        resolve();
        return;
      }

      // Arrêter toute lecture en cours
      speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = 'fr-FR';
      utterance.rate = 0.9;
      utterance.pitch = 1;
      utterance.volume = 1;

      // Sélectionner la meilleure voix française
      const voices = speechSynthesis.getVoices();
      const frenchVoice = voices.find(v => 
        v.lang.startsWith('fr') && !v.name.includes('Compact')
      );
      if (frenchVoice) {
        utterance.voice = frenchVoice;
      }

      let hasStarted = false;
      let retryCount = 0;
      const maxRetries = 3;

      const attemptSpeak = () => {
        utterance.onstart = () => {
          hasStarted = true;
          setIsSpeaking(true);
        };

        utterance.onend = () => {
          setIsSpeaking(false);
          resolve();
        };

        utterance.onerror = (error) => {
          console.error('TTS Error:', error);
          setIsSpeaking(false);
          
          if (!hasStarted && retryCount < maxRetries) {
            retryCount++;
            console.log(`Retry TTS attempt ${retryCount}`);
            setTimeout(attemptSpeak, 500);
          } else {
            reject(new Error(`TTS failed after ${maxRetries} attempts`));
          }
        };

        speechSynthesis.speak(utterance);
        
        // Fallback timeout
        setTimeout(() => {
          if (!hasStarted) {
            speechSynthesis.cancel();
            if (retryCount < maxRetries) {
              retryCount++;
              attemptSpeak();
            } else {
              setIsSpeaking(false);
              reject(new Error('TTS timeout'));
            }
          }
        }, 1000);
      };

      utteranceRef.current = utterance;
      attemptSpeak();
    });
  }, []);

  // Fonction STT avec délai approprié
  const startListening = useCallback(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      console.error('Speech recognition not supported');
      return;
    }

    // Arrêter toute reconnaissance en cours
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.lang = 'fr-FR';
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      console.log('STT: Écoute démarrée');
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript.trim();
      console.log('STT: Transcript reçu:', transcript);
      
      if (transcript) {
        setIsListening(false);
        handleUserInput(transcript);
      }
    };

    recognition.onerror = (event) => {
      console.error('STT Error:', event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
      console.log('STT: Écoute terminée');
    };

    recognitionRef.current = recognition;
    recognition.start();

    // Timeout automatique après 10 secondes
    setTimeout(() => {
      if (recognitionRef.current && isListening) {
        recognition.stop();
      }
    }, 10000);
  }, [isListening]);

  // Fonction pour envoyer une question à Gemini avec debug amélioré
  const queryGemini = useCallback(async (question: string): Promise<string> => {
    try {
      console.log('🔍 [Client] Envoi question à Gemini:', question);
      
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: question,
          selectedBook: 'chayei-moharan'
        }),
      });

      console.log('📡 [Client] Réponse status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ [Client] Erreur API:', { 
          status: response.status, 
          statusText: response.statusText,
          error: errorData 
        });
        
        // Messages d'erreur plus spécifiques
        if (response.status === 503) {
          return errorData.response || 'Le service IA est temporairement indisponible. Veuillez réessayer dans quelques instants.';
        } else if (response.status === 400) {
          return 'Veuillez reformuler votre question plus clairement.';
        } else {
          return `Erreur de connexion (${response.status}). Veuillez réessayer.`;
        }
      }

      const data = await response.json();
      console.log('✅ [Client] Réponse reçue:', { 
        hasResponse: !!data.response, 
        length: data.response?.length || 0,
        metadata: data.metadata 
      });
      
      return data.response || 'Désolé, je n\'ai pas pu traiter votre question.';
    } catch (error) {
      console.error('❌ [Client] Erreur Gemini:', {
        message: error.message,
        name: error.name,
        stack: error.stack
      });
      return 'Désolé, une erreur de connexion est survenue. Vérifiez votre connexion internet et réessayez.';
    }
  }, []);

  // Gestionnaire principal pour les inputs utilisateur
  const handleUserInput = useCallback(async (input: string) => {
    // Ajouter le message utilisateur
    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: input,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);

    // Traiter avec Gemini
    setIsThinking(true);
    try {
      const aiResponse = await queryGemini(input);
      
      // Ajouter la réponse IA
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: aiResponse,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, aiMessage]);
      
      setIsThinking(false);

      // Lire la réponse avec TTS
      await speak(aiResponse);
      
      // Réactiver automatiquement l'écoute après la lecture
      setTimeout(() => {
        startListening();
      }, 500);
      
    } catch (error) {
      console.error('Erreur conversation:', error);
      setIsThinking(false);
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: 'Désolé, une erreur est survenue.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    }
  }, [queryGemini, speak, startListening]);

  // Fonction pour arrêter toute activité vocale
  const stopAll = useCallback(() => {
    // Arrêter TTS
    speechSynthesis.cancel();
    setIsSpeaking(false);
    
    // Arrêter STT
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  }, []);

  return {
    messages,
    isListening,
    isSpeaking,
    isThinking,
    startListening,
    speak,
    handleUserInput,
    stopAll,
    clearMessages: () => setMessages([])
  };
};