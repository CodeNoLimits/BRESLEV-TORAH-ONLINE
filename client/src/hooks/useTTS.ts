import { useState, useCallback } from 'react';
import { useToast } from './use-toast';

export function useTTS() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const { toast } = useToast();

  const speak = useCallback(async (txt: string, lang = "fr-FR") => {
    if (!txt.trim()) return;

    console.log(`[TTS] Speaking: "${txt.substring(0, 50)}..." in ${lang}`);
    setIsSpeaking(true);

    try {
      // Try Web Speech API first (faster)
      const localVoices = window.speechSynthesis?.getVoices?.() || [];
      if (localVoices.length) {
        const utterance = new SpeechSynthesisUtterance(txt);
        utterance.voice = localVoices.find(v => v.lang.startsWith(lang)) || localVoices[0];
        utterance.rate = 0.9;
        utterance.pitch = 1.0;

        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);

        window.speechSynthesis.speak(utterance);
        return;
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