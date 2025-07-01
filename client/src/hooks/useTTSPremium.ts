import { useState, useCallback } from 'react';
import { useToast } from './use-toast';

export interface TTSOptions {
  lang?: 'he-IL' | 'en-US' | 'fr-FR';
  fallbackToWebSpeech?: boolean;
}

export function useTTSPremium() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(true); // Enable TTS by default
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
  const { toast } = useToast();

  const speak = useCallback(async (text: string, options: TTSOptions = {}) => {
    const { lang = 'he-IL', fallbackToWebSpeech = true } = options;
    
    // Stop any current speech
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      setCurrentAudio(null);
    }

    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }

    setIsSpeaking(true);

    try {
      console.log(`[TTS Premium] Requesting Google Cloud TTS for: ${text.substring(0, 50)}... (lang: ${lang})`);
      
      // Try Google Cloud TTS first
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text, lang }),
      });

      if (response.ok) {
        const contentType = response.headers.get('content-type');
        
        if (contentType && contentType.includes('audio/mpeg')) {
          // We got actual audio from Google Cloud TTS
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
            console.error('[TTS Premium] Audio playback error, falling back to Web Speech API');
            setIsSpeaking(false);
            setCurrentAudio(null);
            URL.revokeObjectURL(audioUrl);
            fallbackToWebSpeechAPI(text, lang);
          };

          await audio.play();
          console.log('[TTS Premium] ✅ Playing Google Cloud TTS audio');
          return;
        } else {
          // Server returned fallback instruction, use Web Speech API
          const data = await response.json();
          if (data.fallback) {
            console.log('[TTS Premium] Server fallback requested, using Web Speech API');
            fallbackToWebSpeechAPI(text, lang);
            return;
          }
        }
      }

      throw new Error(`TTS API returned ${response.status}`);

    } catch (error) {
      console.error('[TTS Premium] Google Cloud TTS failed, using Web Speech API fallback:', error);
      fallbackToWebSpeechAPI(text, lang);
    }
  }, [currentAudio, toast]);

  const fallbackToWebSpeechAPI = useCallback(async (text: string, lang: string) => {
    if (!window.speechSynthesis) {
      setIsSpeaking(false);
      toast({
        title: "TTS non supporté",
        description: "Votre navigateur ne supporte pas la synthèse vocale",
        variant: "destructive",
      });
      return;
    }

    console.log('[TTS Premium] Using Web Speech API with voice selection');
    
    // Wait for voices to load
    let voices = window.speechSynthesis.getVoices();
    if (voices.length === 0) {
      await new Promise<void>((resolve) => {
        const handleVoicesChanged = () => {
          voices = window.speechSynthesis.getVoices();
          if (voices.length > 0) {
            window.speechSynthesis.removeEventListener('voiceschanged', handleVoicesChanged);
            resolve();
          }
        };
        
        window.speechSynthesis.addEventListener('voiceschanged', handleVoicesChanged);
        
        // Timeout after 2 seconds
        setTimeout(() => {
          window.speechSynthesis.removeEventListener('voiceschanged', handleVoicesChanged);
          resolve();
        }, 2000);
      });
    }

    const utterance = new SpeechSynthesisUtterance(text);
    
    // Map language codes and find appropriate voice
    const langMap: { [key: string]: string[] } = {
      'he-IL': ['he-IL', 'he'],
      'en-US': ['en-US', 'en-GB', 'en'],
      'fr-FR': ['fr-FR', 'fr-CA', 'fr']
    };
    
    const targetLangs = langMap[lang] || ['en'];
    let selectedVoice = null;
    
    for (const targetLang of targetLangs) {
      selectedVoice = voices.find(voice => voice.lang.toLowerCase().startsWith(targetLang.toLowerCase()));
      if (selectedVoice) break;
    }
    
    if (selectedVoice) {
      utterance.voice = selectedVoice;
      console.log(`[TTS Premium] Selected voice: ${selectedVoice.name} (${selectedVoice.lang})`);
    } else {
      console.log(`[TTS Premium] No specific voice found for ${lang}, using default`);
    }
    
    utterance.lang = lang;
    utterance.rate = 0.9;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    utterance.onstart = () => {
      console.log('[TTS Premium] Speech started');
      setIsSpeaking(true);
    };

    utterance.onend = () => {
      console.log('[TTS Premium] Speech ended');
      setIsSpeaking(false);
    };

    utterance.onerror = (event) => {
      console.error('[TTS Premium] Speech error:', event.error);
      setIsSpeaking(false);
      toast({
        title: "Erreur TTS",
        description: `Erreur lors de la lecture vocale: ${event.error}`,
        variant: "destructive",
      });
    };

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();
    
    // Start speech
    window.speechSynthesis.speak(utterance);
  }, [toast]);

  const stop = useCallback(() => {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      setCurrentAudio(null);
    }

    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }

    setIsSpeaking(false);
    console.log('[TTS Premium] Speech stopped');
  }, [currentAudio]);

  return {
    speak,
    stop,
    isSpeaking,
    ttsEnabled,
    setTtsEnabled
  };
}