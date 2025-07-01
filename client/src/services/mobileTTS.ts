// Service TTS optimisé pour mobile avec fallback automatique

export interface TTSOptions {
  voice?: 'male' | 'female';
  language?: string;
  rate?: number;
  pitch?: number;
}

export class MobileTTS {
  private synthesis: SpeechSynthesis;
  private currentUtterance: SpeechSynthesisUtterance | null = null;

  constructor() {
    this.synthesis = window.speechSynthesis;
  }

  async speak(text: string, options: TTSOptions = {}): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Arrêter toute lecture en cours
        this.stop();

        const utterance = new SpeechSynthesisUtterance(text);
        
        // Configuration optimisée pour mobile
        utterance.rate = options.rate || 0.9;
        utterance.pitch = options.pitch || 1.0;
        utterance.volume = 1.0;
        utterance.lang = options.language || 'fr-FR';

        // Sélection de voix masculine si disponible
        const voices = this.synthesis.getVoices();
        if (voices.length > 0) {
          const maleVoice = voices.find(voice => 
            voice.lang.startsWith('fr') && 
            (voice.name.toLowerCase().includes('male') || 
             voice.name.toLowerCase().includes('homme') ||
             voice.name.toLowerCase().includes('thomas'))
          );
          
          if (maleVoice) {
            utterance.voice = maleVoice;
          } else {
            // Fallback vers la première voix française disponible
            const frenchVoice = voices.find(voice => voice.lang.startsWith('fr'));
            if (frenchVoice) {
              utterance.voice = frenchVoice;
            }
          }
        }

        utterance.onend = () => {
          this.currentUtterance = null;
          resolve();
        };

        utterance.onerror = (error) => {
          this.currentUtterance = null;
          reject(error);
        };

        this.currentUtterance = utterance;
        this.synthesis.speak(utterance);

      } catch (error) {
        reject(error);
      }
    });
  }

  stop(): void {
    if (this.synthesis.speaking) {
      this.synthesis.cancel();
    }
    this.currentUtterance = null;
  }

  isSpeaking(): boolean {
    return this.synthesis.speaking;
  }

  // Méthode spéciale pour mobile avec gestion des événements tactiles
  async speakOnTouch(text: string, options: TTSOptions = {}): Promise<void> {
    // Sur mobile, la synthèse vocale doit souvent être déclenchée par un événement utilisateur
    return this.speak(text, options);
  }
}

// Fonction utilitaire pour détecter mobile
export function isMobile(): boolean {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}