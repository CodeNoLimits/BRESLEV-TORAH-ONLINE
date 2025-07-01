import { useState, useCallback } from 'react';
import { useToast } from './use-toast';

interface TTSOptions {
  lang?: 'he-IL' | 'en-US' | 'fr-FR';
}

export function useTTSSimple() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const { toast } = useToast();

  const speak = useCallback(async (text: string, options: TTSOptions = {}) => {
    if (!text.trim() || !ttsEnabled) {
      console.log('[TTS Simple] Empty text or TTS disabled');
      return;
    }

    const { lang = 'fr-FR' } = options;
    
    console.log(`[TTS Simple] Speaking: "${text.substring(0, 50)}..." in ${lang}`);

    if (!window.speechSynthesis) {
      toast({
        title: "TTS non supporté",
        description: "Votre navigateur ne supporte pas la synthèse vocale",
        variant: "destructive",
      });
      return;
    }

    // Stop any current speech
    window.speechSynthesis.cancel();
    setIsSpeaking(true);

    try {
      // Wait for voices to load
      let voices = window.speechSynthesis.getVoices();
      if (voices.length === 0) {
        // Trigger voices loading
        const utteranceTest = new SpeechSynthesisUtterance('');
        window.speechSynthesis.speak(utteranceTest);
        window.speechSynthesis.cancel();
        
        voices = window.speechSynthesis.getVoices();
      }

      const utterance = new SpeechSynthesisUtterance(text);
      
      // Find appropriate voice
      let selectedVoice = null;
      
      if (lang === 'he-IL') {
        selectedVoice = voices.find(voice => 
          voice.lang.includes('he') || voice.name.toLowerCase().includes('hebrew')
        );
      } else if (lang === 'en-US') {
        selectedVoice = voices.find(voice => 
          voice.lang.includes('en') && (voice.lang.includes('US') || voice.lang.includes('GB'))
        );
      } else if (lang === 'fr-FR') {
        selectedVoice = voices.find(voice => 
          voice.lang.includes('fr') || voice.name.toLowerCase().includes('french')
        );
      }
      
      if (selectedVoice) {
        utterance.voice = selectedVoice;
        console.log(`[TTS Simple] Using voice: ${selectedVoice.name} (${selectedVoice.lang})`);
      } else {
        console.log(`[TTS Simple] No specific voice found for ${lang}, using default`);
      }
      
      utterance.lang = lang;
      utterance.rate = 0.9;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      utterance.onstart = () => {
        console.log('[TTS Simple] ✅ Speech started');
        setIsSpeaking(true);
      };

      utterance.onend = () => {
        console.log('[TTS Simple] ✅ Speech ended');
        setIsSpeaking(false);
      };

      utterance.onerror = (event) => {
        console.error('[TTS Simple] Speech error:', event.error);
        setIsSpeaking(false);
        toast({
          title: "Erreur TTS",
          description: "Impossible de lire le texte",
          variant: "destructive",
        });
      };

      // Start speech
      window.speechSynthesis.speak(utterance);
      console.log('[TTS Simple] Speech started');

    } catch (error) {
      console.error('[TTS Simple] Error:', error);
      setIsSpeaking(false);
      toast({
        title: "Erreur TTS",
        description: "Impossible de lire le texte",
        variant: "destructive",
      });
    }
  }, [ttsEnabled, toast]);

  const stop = useCallback(() => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
    console.log('[TTS Simple] Speech stopped');
  }, []);

  return {
    speak,
    stop,
    isSpeaking,
    ttsEnabled,
    setTtsEnabled
  };
}