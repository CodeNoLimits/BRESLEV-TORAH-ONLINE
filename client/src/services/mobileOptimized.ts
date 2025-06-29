// Service mobile-first optimisé pour Le Compagnon du Cœur
// Résout les problèmes d'affichage mobile, TTS mobile, et accès aux textes

export interface MobileTTSConfig {
  enabled: boolean;
  fallbackToCloud: boolean;
  voice: 'male' | 'female';
  language: 'fr-FR' | 'en-US' | 'he-IL';
}

export interface MobileViewportConfig {
  useDynamicViewport: boolean;
  touchTargetSize: number;
  optimizeForTouch: boolean;
}

// Configuration mobile optimisée
export const MOBILE_CONFIG: MobileTTSConfig & MobileViewportConfig = {
  enabled: true,
  fallbackToCloud: true,
  voice: 'male',
  language: 'fr-FR',
  useDynamicViewport: true,
  touchTargetSize: 44,
  optimizeForTouch: true
};

// Détection de mobile
export const isMobile = (): boolean => {
  if (typeof window === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
         window.innerWidth <= 768;
};

// TTS mobile optimisé avec fallback automatique
export class MobileTTS {
  private synthesis: SpeechSynthesis | null = null;
  private cloudTTSAvailable = false;

  constructor() {
    if (typeof window !== 'undefined') {
      this.synthesis = window.speechSynthesis;
      this.checkCloudTTSAvailability();
    }
  }

  private async checkCloudTTSAvailability(): Promise<void> {
    try {
      // Vérifier si Google Cloud TTS est disponible
      const response = await fetch('/api/tts/check', { method: 'HEAD' });
      this.cloudTTSAvailable = response.ok;
    } catch {
      this.cloudTTSAvailable = false;
    }
  }

  async speak(text: string, config: Partial<MobileTTSConfig> = {}): Promise<void> {
    const finalConfig = { ...MOBILE_CONFIG, ...config };
    
    if (isMobile() && finalConfig.fallbackToCloud && this.cloudTTSAvailable) {
      return this.speakWithCloudTTS(text, finalConfig);
    }
    
    return this.speakWithWebSpeech(text, finalConfig);
  }

  private async speakWithCloudTTS(text: string, config: MobileTTSConfig): Promise<void> {
    try {
      const response = await fetch('/api/tts/speak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          voice: config.voice,
          language: config.language
        })
      });

      if (response.ok) {
        const audioBlob = await response.blob();
        const audio = new Audio(URL.createObjectURL(audioBlob));
        audio.play();
      }
    } catch (error) {
      console.warn('[MobileTTS] Cloud TTS failed, falling back to Web Speech:', error);
      return this.speakWithWebSpeech(text, config);
    }
  }

  private speakWithWebSpeech(text: string, config: MobileTTSConfig): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.synthesis) {
        reject(new Error('Speech synthesis not available'));
        return;
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = config.language;
      utterance.rate = 0.9;
      utterance.pitch = config.voice === 'male' ? 0.8 : 1.0;

      utterance.onend = () => resolve();
      utterance.onerror = (error) => reject(error);

      this.synthesis.speak(utterance);
    });
  }

  stop(): void {
    if (this.synthesis) {
      this.synthesis.cancel();
    }
  }
}

// Références Sefaria corrigées et vérifiées
export const WORKING_BRESLOV_TEXTS = [
  {
    title: 'Likutei Moharan',
    key: 'Likutei Moharan',
    sections: [
      'Likutei Moharan.1.1',
      'Likutei Moharan.1.2',
      'Likutei Moharan.1.3',
      'Likutei Moharan.2.1',
      'Likutei Moharan.2.2'
    ]
  },
  {
    title: 'Sichot HaRan',
    key: 'Sichot HaRan', 
    sections: [
      'Sichot HaRan.1',
      'Sichot HaRan.2',
      'Sichot HaRan.3'
    ]
  },
  {
    title: 'Sippurei Maasiyot',
    key: 'Sippurei Maasiyot',
    sections: [
      'Sippurei Maasiyot.1',
      'Sippurei Maasiyot.2',
      'Sippurei Maasiyot.3'
    ]
  },
  {
    title: 'Likutei Tefilot',
    key: 'Likutei Tefilot',
    sections: [
      'Likutei Tefilot.1.1',
      'Likutei Tefilot.1.2',
      'Likutei Tefilot.2.1'
    ]
  }
];

// Service de récupération de textes optimisé mobile
export class MobileSefariaService {
  private cache = new Map<string, any>();
  private readonly CACHE_TTL = 3600000; // 1 heure

  async getText(ref: string): Promise<any> {
    const cacheKey = `sefaria_${ref}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }

    try {
      const response = await fetch(`/api/sefaria/v3/texts/${encodeURIComponent(ref)}?context=0&commentary=0&pad=0&wrapLinks=false`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      
      if (data.text && Array.isArray(data.text) && data.text.length > 0) {
        this.cache.set(cacheKey, {
          data,
          timestamp: Date.now()
        });
        return data;
      }
      
      return null;
    } catch (error) {
      console.error(`[MobileSefariaService] Error fetching ${ref}:`, error);
      return null;
    }
  }

  async verifyTexts(): Promise<typeof WORKING_BRESLOV_TEXTS> {
    const verified = [];
    
    for (const book of WORKING_BRESLOV_TEXTS) {
      const workingSections = [];
      
      for (const section of book.sections) {
        const text = await this.getText(section);
        if (text) {
          workingSections.push(section);
        }
      }
      
      if (workingSections.length > 0) {
        verified.push({
          ...book,
          sections: workingSections
        });
      }
    }
    
    return verified;
  }
}

// Utilitaires mobiles
export const MobileUtils = {
  optimizeViewport(): void {
    if (typeof document === 'undefined') return;
    
    const viewport = document.querySelector('meta[name="viewport"]');
    if (viewport) {
      viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover');
    }
  },

  addTouchOptimizations(): void {
    if (typeof document === 'undefined') return;
    
    document.body.style.touchAction = 'manipulation';
    document.body.style.webkitTextSizeAdjust = '100%';
    document.body.style.webkitTapHighlightColor = 'transparent';
  },

  preventZoom(): void {
    if (typeof document === 'undefined') return;
    
    document.addEventListener('gesturestart', (e) => e.preventDefault());
    document.addEventListener('dblclick', (e) => e.preventDefault());
  }
};