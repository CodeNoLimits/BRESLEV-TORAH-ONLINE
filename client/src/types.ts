export type Language = 'fr' | 'en' | 'he';

export interface TTSState {
  isPlaying: boolean;
  isPaused: boolean;
  currentText: string | null;
  currentLanguage: Language;
  volume: number;
  rate: number;
  voice: SpeechSynthesisVoice | null;
  isSupported: boolean;
}

export interface UseTTSReturn {
  speak: (text: string, language?: Language) => Promise<void>;
  stop: () => void;
  pause: () => void;
  resume: () => void;
  speakGreeting: () => Promise<void>;
  voices: SpeechSynthesisVoice[];
  state: TTSState;
  isSupported: boolean;
}