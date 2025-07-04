import { useState, useCallback, useEffect } from 'react';
import { Language } from '../types';

interface TTSOptions {
  language: Language;
  enabled: boolean;
}

export const useTTSFixed = ({ language, enabled }: TTSOptions) => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [voicesLoaded, setVoicesLoaded] = useState(false);
  const [isCloudAvailable, setIsCloudAvailable] = useState(false);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Enhanced mobile compatibility check
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const hasWebSpeech = 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
    
    console.log(`[TTS-Fixed] Mobile detected: ${isMobile}, WebSpeech available: ${hasWebSpeech}`);
    
    // Sur mobile, activer le TTS même si Web Speech API n'est pas parfaitement supporté
    // On utilisera le fallback Cloud TTS ou audio HTML5
    setIsSupported(true);
    
    // Check Google Cloud TTS availability
    const checkCloudTTS = async () => {
      try {
        const response = await fetch('/api/tts/ping');
        const data = await response.json();
        setIsCloudAvailable(data.available);
        console.log(`[TTS-Premium] Cloud TTS available: ${data.available}`);
      } catch (error) {
        setIsCloudAvailable(false);
      }
    };

    checkCloudTTS();
    
    // Écouter l'événement stopTTS global
    const handleStopTTS = () => {
      console.log('[TTS-Fixed] Received global stop TTS event');
      // Stop Google Cloud TTS audio
      if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
        setCurrentAudio(null);
      }
      
      // Stop Web Speech API
      if (hasWebSpeech) {
        window.speechSynthesis.cancel();
      }
      
      setIsSpeaking(false);
    };
    
    window.addEventListener('stopTTS', handleStopTTS);
    
    // Force load voices avec plusieurs tentatives sur mobile
    if (isMobile) {
      const loadMobileVoices = () => {
        const voices = window.speechSynthesis?.getVoices() || [];
        if (voices.length > 0) {
          setVoicesLoaded(true);
          console.log(`[TTS-Fixed] Mobile voices loaded: ${voices.length}`);
        } else {
          // Réessayer après 2 secondes
          setTimeout(loadMobileVoices, 2000);
        }
      };
      
      // Tentatives multiples pour charger les voix
      setTimeout(loadMobileVoices, 500);
      setTimeout(loadMobileVoices, 1500);
      setTimeout(loadMobileVoices, 3000);
    }
    
    return () => {
      window.removeEventListener('stopTTS', handleStopTTS);
    };
  }, [currentAudio]);

  const loadVoices = useCallback((): Promise<SpeechSynthesisVoice[]> => {
    return new Promise((resolve) => {
      if (voicesLoaded) {
        resolve(window.speechSynthesis.getVoices());
        return;
      }

      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        setVoicesLoaded(true);
        resolve(voices);
        return;
      }

      const handleVoicesChanged = () => {
        const newVoices = window.speechSynthesis.getVoices();
        if (newVoices.length > 0) {
          setVoicesLoaded(true);
          window.speechSynthesis.removeEventListener('voiceschanged', handleVoicesChanged);
          resolve(newVoices);
        }
      };

      window.speechSynthesis.addEventListener('voiceschanged', handleVoicesChanged);
      
      // Fallback timeout
      setTimeout(() => {
        const fallbackVoices = window.speechSynthesis.getVoices();
        if (fallbackVoices.length > 0) {
          setVoicesLoaded(true);
          window.speechSynthesis.removeEventListener('voiceschanged', handleVoicesChanged);
          resolve(fallbackVoices);
        }
      }, 1000);
    });
  }, [voicesLoaded]);

  const speak = useCallback(async (text: string) => {
    if (!enabled || !text.trim()) {
      console.log(`[TTS-Fixed] Not speaking - enabled: ${enabled}, text: ${!!text.trim()}`);
      return;
    }

    console.log(`[TTS-Fixed] ATTEMPTING TO SPEAK: ${text.substring(0, 100)}...`);
    
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const hasWebSpeech = 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;

    // Sur mobile, essayer Cloud TTS en premier ou créer un audio synthétique
    if (isMobile || isCloudAvailable) {
      console.log(`[TTS-Fixed] Using mobile-optimized TTS`);
      try {
        setIsSpeaking(true);
        
        // Essayer Cloud TTS d'abord
        if (isCloudAvailable) {
          const response = await fetch('/api/tts/speak', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              text: text.replace(/<[^>]*>/g, '').trim(),
              language: language === 'he' ? 'he-IL' : language === 'en' ? 'en-US' : 'fr-FR'
            }),
          });
          
          if (response.ok) {
            const audioBlob = await response.blob();
            const audioUrl = URL.createObjectURL(audioBlob);
            const audio = new Audio(audioUrl);
            setCurrentAudio(audio);
            
            audio.onended = () => {
              setIsSpeaking(false);
              setCurrentAudio(null);
              URL.revokeObjectURL(audioUrl);
            };
            
            audio.onerror = () => {
              console.error(`[TTS-Fixed] Audio playback error`);
              setIsSpeaking(false);
              setCurrentAudio(null);
              URL.revokeObjectURL(audioUrl);
            };
            
            await audio.play();
            console.log(`[TTS-Fixed] Cloud TTS audio started successfully`);
            return;
          }
        }
        
        // Fallback : créer un audio synthétique simple pour mobile
        console.log(`[TTS-Fixed] Using mobile fallback TTS`);
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        // Créer un pattern sonore simple pour indiquer que le TTS essaie de fonctionner
        oscillator.frequency.setValueAtTime(400, audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(600, audioContext.currentTime + 0.3);
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
        
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.3);
        
        setTimeout(() => setIsSpeaking(false), 300);
        console.log(`[TTS-Fixed] Mobile audio indication played`);
        
      } catch (error) {
        console.error(`[TTS-Fixed] Mobile TTS error:`, error);
        setIsSpeaking(false);
      }
    }

    // Fallback vers Web Speech API pour desktop
    if (!hasWebSpeech) {
      console.log(`[TTS-Fixed] WebSpeech not available, using visual feedback only`);
      setIsSpeaking(true);
      setTimeout(() => setIsSpeaking(false), 1000);
      return;
    }

    try {
      // Stop any ongoing speech
      window.speechSynthesis.cancel();
      
      // Unlock audio context (Chrome requirement)
      window.speechSynthesis.resume();

      // Load voices
      const voices = await loadVoices();
      console.log(`[TTS-Fixed] Loaded ${voices.length} voices`);

      // Clean text
      const cleanText = text
        .replace(/<[^>]*>/g, '')
        .replace(/&[^;]+;/g, ' ')
        .replace(/\s+/g, ' ')
        .replace(/[*#_`]/g, '')
        .trim();

      if (!cleanText) return;

      console.log(`[TTS-Fixed] Speaking: "${cleanText.substring(0, 50)}..."`);

      // Create utterance
      const utterance = new SpeechSynthesisUtterance(cleanText);
      
      // Mobile-specific settings
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      
      // Set language
      const langCode = language === 'he' ? 'he' : language === 'en' ? 'en' : 'fr';
      
      // Mobile optimization
      if (isMobile) {
        utterance.rate = 0.8;  // Slower rate for mobile
        utterance.pitch = 1.0;
        utterance.volume = 1.0;
      }
      utterance.lang = language === 'he' ? 'he-IL' : language === 'en' ? 'en-US' : 'fr-FR';
      
      // Find appropriate voice
      const voice = voices.find(v => v.lang.startsWith(langCode)) || 
                   voices.find(v => v.default) || 
                   voices[0];
      
      if (voice) {
        utterance.voice = voice;
        console.log(`[TTS-Fixed] Using voice: ${voice.name} (${voice.lang})`);
      }

      // Set parameters
      utterance.rate = 0.9;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      // Event handlers
      utterance.onstart = () => {
        setIsSpeaking(true);
        console.log(`[TTS-Fixed] Started speaking`);
      };
      
      utterance.onend = () => {
        setIsSpeaking(false);
        console.log(`[TTS-Fixed] Finished speaking`);
      };
      
      utterance.onerror = (event) => {
        setIsSpeaking(false);
        console.error(`[TTS-Fixed] Error:`, event.error);
      };

      // Speak
      window.speechSynthesis.speak(utterance);
      
    } catch (error) {
      console.error(`[TTS-Fixed] Failed:`, error);
      setIsSpeaking(false);
    }
  }, [enabled, isSupported, language, loadVoices]);

  // Cloud TTS fallback function
  const speakWithCloudTTS = useCallback(async (text: string) => {
    try {
      setIsSpeaking(true);
      console.log(`[TTS-Fixed] Using Cloud TTS for: "${text.substring(0, 50)}..."`);
      
      const response = await fetch('/api/tts/speak', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: text.replace(/<[^>]*>/g, '').trim(),
          language: language === 'he' ? 'he-IL' : language === 'en' ? 'en-US' : 'fr-FR'
        }),
      });

      if (response.ok) {
        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        
        setCurrentAudio(audio);
        
        audio.onended = () => {
          setIsSpeaking(false);
          setCurrentAudio(null);
          URL.revokeObjectURL(audioUrl);
        };
        
        audio.onerror = () => {
          setIsSpeaking(false);
          setCurrentAudio(null);
          URL.revokeObjectURL(audioUrl);
        };
        
        await audio.play();
        console.log(`[TTS-Fixed] Cloud TTS playback started`);
      } else {
        throw new Error('Cloud TTS request failed');
      }
    } catch (error) {
      console.error(`[TTS-Fixed] Cloud TTS error:`, error);
      setIsSpeaking(false);
      setCurrentAudio(null);
    }
  }, [language]);

  const speakGreeting = useCallback(async () => {
    if (!enabled || !isSupported) return;
    
    const greetingMessages = {
      fr: "Sélectionnez la partie du texte que vous voulez que je lise, puis utilisez les boutons d'analyse.",
      en: "Select the part of the text you want me to read, then use the analysis buttons.",
      he: "בחרו את הקטע שתרצו שאקרא, ואחר-כך השתמשו בכפתורי הניתוח."
    };
    
    const message = greetingMessages[language] || greetingMessages.fr;
    await speak(message);
  }, [enabled, isSupported, language, speak]);

  const stopTTS = useCallback(() => {
    // Stop Google Cloud TTS audio
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      setCurrentAudio(null);
    }
    
    // Stop Web Speech API
    if (isSupported) {
      window.speechSynthesis.cancel();
    }
    
    setIsSpeaking(false);
    console.log('[TTS-Fixed] All audio stopped');
  }, [currentAudio, isSupported]);

  return {
    speak,
    speakGreeting,
    stopTTS,
    isSupported,
    isSpeaking
  };
};