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
    r.onresult = (e: any) => {
      const t = Array.from(e.results).map((r: any) => r[0].transcript).join(' ');
      const area = document.getElementById('questionBox') as HTMLTextAreaElement | null;
      if (area) area.value = t;
      setTimeout(() => askAI(t), 200);
    };
    r.onend = () => setIsListening(false);
    recRef.current = r;
    return r;
  }

  function startListening() {
    const r = ensureRec();
    if (!r) return;
    setIsListening(true);
    r.start();
  }

  function stopListening() {
    recRef.current?.stop();
    setIsListening(false);
  }

  async function askAI(q: string) {
    try {
      const payload = activeRef ? { text: q, ref: activeRef } : { text: q };
      const r = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const j = await r.json();
      if (j.error) return toast({ title: 'Erreur AI' });
      addMessage({ role: 'ai', text: j.answer });
      speak(j.answer, 'fr-FR');
    } catch (e) {
      toast({ title: 'Erreur AI' });
    }
  }

  return { startListening, stopListening, isListening };
}
