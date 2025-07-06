class GlobalTTSManager {
  private static instance: GlobalTTSManager;
  private utterance: SpeechSynthesisUtterance | null = null;
  private isCurrentlySpeaking = false;
  private queue: string[] = [];
  private listeners = new Set<(isSpeaking: boolean) => void>();
  private retryCount = 0;
  private maxRetries = 3;

  static getInstance(): GlobalTTSManager {
    if (!GlobalTTSManager.instance) {
      GlobalTTSManager.instance = new GlobalTTSManager();
    }
    return GlobalTTSManager.instance;
  }

  private constructor() {
    // Initialisation du système TTS
    this.initializeTTS();
  }

  private initializeTTS(): void {
    // Reset complet du système TTS
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel();
      console.log('[GlobalTTS] Système TTS initialisé');
    }
  }

  speak(text: string, immediate = true): Promise<void> {
    return new Promise((resolve, reject) => {
      console.log('[GlobalTTS] Début lecture:', text.substring(0, 50));
      
      // Arrêt immédiat de tout TTS en cours
      this.stop();
      
      // Nettoyage et préparation du texte
      const cleanText = this.cleanTextForTTS(text);
      if (!cleanText.trim()) {
        console.warn('[GlobalTTS] Texte vide après nettoyage');
        resolve();
        return;
      }

      // Configuration utterance optimisée
      this.utterance = new SpeechSynthesisUtterance(cleanText);
      this.utterance.lang = 'fr-FR';
      this.utterance.rate = 0.9;
      this.utterance.pitch = 1;
      this.utterance.volume = 1;

      // Gestion événements avec cleanup automatique
      this.utterance.onstart = () => {
        console.log('[GlobalTTS] Lecture démarrée');
        this.isCurrentlySpeaking = true;
        this.retryCount = 0;
        this.notifyListeners(true);
      };

      this.utterance.onend = () => {
        console.log('[GlobalTTS] Lecture terminée');
        this.isCurrentlySpeaking = false;
        this.notifyListeners(false);
        this.utterance = null;
        resolve();
      };

      this.utterance.onerror = (event) => {
        console.error('[GlobalTTS] Erreur TTS:', event.error);
        this.isCurrentlySpeaking = false;
        this.notifyListeners(false);
        
        // Retry automatique pour erreurs communes
        if ((event.error === 'interrupted' || event.error === 'network') && this.retryCount < this.maxRetries) {
          this.retryCount++;
          console.log(`[GlobalTTS] Retry ${this.retryCount}/${this.maxRetries}`);
          setTimeout(() => {
            if (this.utterance) {
              this.startSpeech();
            }
          }, 500 * this.retryCount);
        } else {
          this.utterance = null;
          reject(new Error(`TTS Error: ${event.error}`));
        }
      };

      // Démarrage avec retry logic
      this.startSpeech();
    });
  }

  private startSpeech(): void {
    if (!this.utterance) return;

    try {
      // Clear complet avant de commencer
      speechSynthesis.cancel();
      
      // Petit délai pour éviter les conflicts
      setTimeout(() => {
        if (this.utterance && !this.isCurrentlySpeaking) {
          console.log('[GlobalTTS] Démarrage speech synthesis');
          speechSynthesis.speak(this.utterance);
        }
      }, 100);
      
    } catch (error) {
      console.error('[GlobalTTS] Erreur démarrage:', error);
      if (this.retryCount < this.maxRetries) {
        this.retryCount++;
        setTimeout(() => this.startSpeech(), 200 * this.retryCount);
      }
    }
  }

  private cleanTextForTTS(text: string): string {
    return text
      // Suppression des markdown
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/`(.*?)`/g, '$1')
      // Suppression des références entre crochets (mais garde le contenu)
      .replace(/\[([^\]]+)\]/g, 'source $1')
      // Suppression des caractères de formatage
      .replace(/[#*_`]/g, '')
      // Nettoyage des espaces multiples
      .replace(/\s+/g, ' ')
      // Suppression des lignes vides
      .replace(/\n\s*\n/g, '\n')
      .trim();
  }

  stop(): void {
    console.log('[GlobalTTS] Arrêt TTS');
    if (this.utterance) {
      speechSynthesis.cancel();
      this.isCurrentlySpeaking = false;
      this.notifyListeners(false);
      this.utterance = null;
      this.retryCount = 0;
    }
  }

  subscribe(callback: (isSpeaking: boolean) => void): () => void {
    this.listeners.add(callback);
    // Envoie l'état actuel immédiatement
    callback(this.isCurrentlySpeaking);
    return () => this.listeners.delete(callback);
  }

  private notifyListeners(isSpeaking: boolean): void {
    this.listeners.forEach(callback => {
      try {
        callback(isSpeaking);
      } catch (error) {
        console.error('[GlobalTTS] Erreur listener:', error);
      }
    });
  }

  // Getter pour l'état actuel
  get speaking(): boolean {
    return this.isCurrentlySpeaking;
  }

  // Méthode pour vérifier si TTS est disponible
  isAvailable(): boolean {
    return 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
  }
}

// Export de l'instance singleton
export const globalTTSManager = GlobalTTSManager.getInstance();

// Hook React pour utiliser le TTS global
import { useState, useEffect } from 'react';

export const useGlobalTTS = () => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const manager = globalTTSManager;

  useEffect(() => {
    const unsubscribe = manager.subscribe(setIsSpeaking);
    return unsubscribe;
  }, [manager]);

  const speak = async (text: string): Promise<void> => {
    try {
      await manager.speak(text);
    } catch (error) {
      console.error('[useGlobalTTS] Erreur:', error);
    }
  };

  const stop = (): void => {
    manager.stop();
  };

  return {
    speak,
    stop,
    isSpeaking,
    isAvailable: manager.isAvailable()
  };
};