import { useState, useCallback } from 'react';
import { useToast } from './use-toast';

export function useTTS() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const { toast } = useToast();

  const speak = useCallback(async (txt: string) => {
    const lang = "fr-FR"; // TTS en français UNIQUEMENT 
    const fr = txt || ""; // Force le texte français uniquement
    if (!fr.trim()) return;

    console.log(`[TTS] Speaking: "${txt.substring(0, 50)}..." in ${lang}`);
    setIsSpeaking(true);

    try {
      // Ensure voices are loaded
      if ('speechSynthesis' in window) {
        const loadVoices = () => {
          return new Promise<SpeechSynthesisVoice[]>((resolve) => {
            const voices = window.speechSynthesis.getVoices();
            if (voices.length > 0) {
              resolve(voices);
            } else {
              const onVoicesChanged = () => {
                const newVoices = window.speechSynthesis.getVoices();
                if (newVoices.length > 0) {
                  window.speechSynthesis.removeEventListener('voiceschanged', onVoicesChanged);
                  resolve(newVoices);
                }
              };
              window.speechSynthesis.addEventListener('voiceschanged', onVoicesChanged);
              
              // Fallback timeout
              setTimeout(() => {
                window.speechSynthesis.removeEventListener('voiceschanged', onVoicesChanged);
                resolve(window.speechSynthesis.getVoices());
              }, 2000);
            }
          });
        };

        const voices = await loadVoices();
        if (voices.length > 0) {
          const utterance = new SpeechSynthesisUtterance(txt);
          const preferredVoice = voices.find(v => v.lang.startsWith(lang.split('-')[0])) || voices[0];
          utterance.voice = preferredVoice;
          utterance.rate = 0.9;
          utterance.pitch = 1.0;
          utterance.volume = 0.8;

          utterance.onstart = () => console.log('[TTS] Speech started');
          utterance.onend = () => setIsSpeaking(false);
          utterance.onerror = (e) => {
            console.error('[TTS] Speech error:', e);
            setIsSpeaking(false);
          };

          window.speechSynthesis.speak(utterance);
          return;
        }
      }

      // Fallback to Premium TTS
      const response = await fetch("/api/tts", {
        method: "POST",
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: txt, lang })
      });

      if (response.ok && response.headers.get('content-type')?.includes('audio/')) {
        const blob = await response.blob();
        const audio = new Audio(URL.createObjectURL(blob));
        audio.onended = () => setIsSpeaking(false);
        audio.onerror = () => setIsSpeaking(false);
        await audio.play();
      } else {
        // Server fallback - use Web Speech API
        const utterance = new SpeechSynthesisUtterance(txt);
        utterance.lang = lang;
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);
        window.speechSynthesis.speak(utterance);
      }

    } catch (error) {
      console.error('[TTS] Error:', error);
      setIsSpeaking(false);
      toast({
        title: "Erreur TTS",
        description: "Impossible de lire le texte",
        variant: "destructive",
      });
    }
  }, [toast]);

  const stop = useCallback(() => {
    window.speechSynthesis?.cancel();
    setIsSpeaking(false);
  }, []);

  return { speak, stop, isSpeaking };
}