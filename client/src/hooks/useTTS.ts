import { useState, useCallback, useEffect } from 'react';

export const useTTS = () => {
  const [isEnabled, setIsEnabled] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  // Load voices
  useEffect(() => {
    const loadVoices = () => {
      const availableVoices = speechSynthesis.getVoices();
      setVoices(availableVoices);
      console.log('[TTS] Available voices:', availableVoices.length);
    };

    loadVoices();
    speechSynthesis.addEventListener('voiceschanged', loadVoices);

    return () => {
      speechSynthesis.removeEventListener('voiceschanged', loadVoices);
    };
  }, []);

  // Monitor speech state
  useEffect(() => {
    const checkSpeaking = () => {
      setIsSpeaking(speechSynthesis.speaking);
    };

    const interval = setInterval(checkSpeaking, 100);
    return () => clearInterval(interval);
  }, []);

  // Stop speech when video plays
  useEffect(() => {
    const handleVideoPlaying = () => {
      console.log('[TTS] Video playing - stopping speech');
      speechSynthesis.cancel();
      setIsSpeaking(false);
    };

    window.addEventListener('videoPlaying', handleVideoPlaying);
    return () => window.removeEventListener('videoPlaying', handleVideoPlaying);
  }, []);

  const speak = useCallback((text: string, lang: string = 'fr-FR') => {
    if (!isEnabled || !text?.trim()) {
      console.log('[TTS] Skipping - disabled or empty text');
      return;
    }

    // Cancel any ongoing speech
    speechSynthesis.cancel();

    // Find appropriate voice
    let voice = voices.find(v => v.lang === lang);
    if (!voice && lang === 'fr-FR') {
      voice = voices.find(v => v.lang.startsWith('fr'));
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    if (voice) utterance.voice = voice;
    utterance.rate = 0.9;
    utterance.pitch = 1.0;

    utterance.onstart = () => {
      console.log('[TTS] Speech started');
      setIsSpeaking(true);
    };

    utterance.onend = () => {
      console.log('[TTS] Speech ended');
      setIsSpeaking(false);
    };

    utterance.onerror = (error) => {
      console.error('[TTS] Speech error:', error);
      setIsSpeaking(false);
    };

    console.log(`[TTS] Speaking: "${text.substring(0, 50)}..." in ${lang}`);
    speechSynthesis.speak(utterance);
  }, [isEnabled, voices]);

  const stop = useCallback(() => {
    speechSynthesis.cancel();
    setIsSpeaking(false);
    console.log('[TTS] Speech stopped');
  }, []);

  const toggle = useCallback(() => {
    setIsEnabled(prev => !prev);
    if (isEnabled) {
      stop();
    }
  }, [isEnabled, stop]);

  return {
    speak,
    stop,
    toggle,
    isEnabled,
    isSpeaking,
    setIsEnabled
  };
};