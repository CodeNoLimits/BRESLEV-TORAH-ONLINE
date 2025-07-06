import { useState, useRef } from 'react';
import { useToast } from './use-toast';

export function useVoiceInput(activeRef: string | null, addMessage: (m: any) => void, speak: (t: string, l?: string) => void) {
  const { toast } = useToast();
  const [isListening, setIsListening] = useState(false);
  const recRef = useRef<any>(null);

  function ensureRec() {
    if (recRef.current) return recRef.current;
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) return null;
    const R: any = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const r = new R();
    r.lang = 'fr-FR';
    r.continuous = false;
    r.interimResults = false;
    
    // Délai de silence augmenté à 2 secondes
    let speechTimeout: NodeJS.Timeout;
    
    r.onresult = (e: any) => {
      const t = Array.from(e.results).map((r: any) => r[0].transcript).join(' ').trim();
      if (t) {
        const area = document.getElementById('questionBox') as HTMLTextAreaElement | null;
        if (area) area.value = t;
        
        // Délai de 2 secondes avant envoi automatique
        clearTimeout(speechTimeout);
        speechTimeout = setTimeout(() => {
          askAI(t);
        }, 2000);
      }
    };
    
    r.onend = () => {
      setIsListening(false);
      clearTimeout(speechTimeout);
    };
    
    r.onerror = (e: any) => {
      console.error('[STT] Erreur:', e.error);
      setIsListening(false);
      clearTimeout(speechTimeout);
    };
    recRef.current = r;
    return r;
  }

  function startListening() {
    const r = ensureRec();
    if (!r) {
      toast({ title: 'STT non supporté', description: 'Reconnaissance vocale indisponible' });
      return;
    }
    
    try {
      setIsListening(true);
      r.start();
      console.log('[STT] Écoute démarrée - 2 secondes max');
    } catch (error) {
      console.error('[STT] Erreur démarrage:', error);
      setIsListening(false);
      toast({ title: 'Erreur STT', description: 'Impossible de démarrer l\'écoute' });
    }
  }

  function stopListening() {
    recRef.current?.stop();
    setIsListening(false);
  }

  async function askAI(q: string) {
    try {
      const payload = activeRef ? { query: q, ref: activeRef } : { query: q };
      const r = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (!r.ok) {
        throw new Error(`HTTP ${r.status}: ${r.statusText}`);
      }
      
      const j = await r.json();
      if (j.error) {
        toast({ title: 'Erreur AI', description: j.error });
        return;
      }
      
      const responseText = j.response || j.answer || 'Réponse vide';
      addMessage({ role: 'ai', text: responseText });
      
      // TTS automatique avec gestion d'erreur
      try {
        speak(responseText, 'fr-FR');
      } catch (ttsError) {
        console.error('[TTS] Erreur lecture:', ttsError);
      }
      
    } catch (e) {
      console.error('[AI] Erreur:', e);
      toast({ title: 'Erreur AI', description: 'Connexion échouée' });
    }
  }

  return { startListening, stopListening, isListening };
}