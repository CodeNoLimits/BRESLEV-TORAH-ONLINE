// Système TTS ultra-simple et fiable
class SimpleTTS {
  private static instance: SimpleTTS;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private isPlaying = false;

  static getInstance(): SimpleTTS {
    if (!SimpleTTS.instance) {
      SimpleTTS.instance = new SimpleTTS();
    }
    return SimpleTTS.instance;
  }

  speak(text: string): void {
    console.log('[SimpleTTS] Début lecture:', text.substring(0, 50));
    
    // Arrêt brutal de tout TTS
    speechSynthesis.cancel();
    this.stop();
    
    if (!text || text.trim().length === 0) return;
    
    // Nettoyage du texte
    const cleanText = text
      .replace(/\[([^\]]+)\]/g, ' ') // Supprime les crochets [Source: ...]
      .replace(/\*\*(.*?)\*\*/g, '$1') // Supprime **bold**
      .replace(/❗/g, 'Attention')
      .replace(/✅/g, '')
      .trim();
    
    // Création utterance simple
    this.currentUtterance = new SpeechSynthesisUtterance(cleanText);
    this.currentUtterance.lang = 'fr-FR';
    this.currentUtterance.rate = 0.9;
    this.currentUtterance.volume = 1.0;
    
    this.currentUtterance.onstart = () => {
      console.log('[SimpleTTS] ▶️ LECTURE DÉMARRÉE');
      this.isPlaying = true;
    };
    
    this.currentUtterance.onend = () => {
      console.log('[SimpleTTS] ⏹️ LECTURE TERMINÉE');
      this.isPlaying = false;
      this.currentUtterance = null;
    };
    
    this.currentUtterance.onerror = (e) => {
      console.error('[SimpleTTS] ❌ ERREUR:', e.error);
      this.isPlaying = false;
      this.currentUtterance = null;
    };
    
    // Lancement immédiat
    speechSynthesis.speak(this.currentUtterance);
    console.log('[SimpleTTS] 🎵 Commande speak() envoyée');
  }

  stop(): void {
    if (this.isPlaying) {
      console.log('[SimpleTTS] ⏸️ ARRÊT');
      speechSynthesis.cancel();
      this.isPlaying = false;
      this.currentUtterance = null;
    }
  }

  isCurrentlySpeaking(): boolean {
    return this.isPlaying && speechSynthesis.speaking;
  }
}

export const simpleTTS = SimpleTTS.getInstance();