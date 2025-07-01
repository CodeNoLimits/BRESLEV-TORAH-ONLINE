import { useCallback, useEffect, useState } from 'react';

export function useTTS() {
  const [isSpeaking, setIsSpeaking] = useState(false);

  const speak = useCallback((text: string, lang = 'fr-FR') => {
    if (!text) return;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang;
    u.onend = () => setIsSpeaking(false);
    speechSynthesis.cancel();
    setIsSpeaking(true);
    speechSynthesis.speak(u);
  }, []);

  const stop = useCallback(() => {
    speechSynthesis.cancel();
    setIsSpeaking(false);
  }, []);

  useEffect(() => {
    const stopOnVideo = () => speechSynthesis.cancel();
    window.addEventListener('videoPlaying', stopOnVideo);
    return () => window.removeEventListener('videoPlaying', stopOnVideo);
  }, []);

  return { speak, stop, isSpeaking };
}
