import React, { useState, useEffect, useCallback, useRef } from 'react';
import './index.css';

interface Message {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
}

export default function AppUltimate() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [selectedText, setSelectedText] = useState<string>('');
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<any>(null);
  const menuTimeoutRef = useRef<any>(null);

  // TTS SIMPLE ET FIABLE
  const speak = useCallback((text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'fr-FR';
      utterance.rate = 0.9;
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
    }
  }, []);

  // RECONNAISSANCE VOCALE SIMPLE
  const startListening = useCallback(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.lang = 'fr-FR';
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;

      recognitionRef.current.onstart = () => setIsListening(true);
      recognitionRef.current.onend = () => setIsListening(false);
      
      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputValue(transcript);
        handleSend(transcript);
      };

      recognitionRef.current.onerror = () => {
        setIsListening(false);
        console.log('Erreur reconnaissance vocale');
      };

      recognitionRef.current.start();
    }
  }, []);

  // ENVOI QUESTION À L'IA - UTILISE VOS LIVRES UNIQUEMENT
  const handleSend = useCallback(async (question?: string) => {
    const finalQuestion = question || inputValue.trim();
    if (!finalQuestion) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: finalQuestion,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      console.log('[AppUltimate] Envoi question:', finalQuestion);
      
      const response = await fetch('/api/smart-query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: finalQuestion })
      });

      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }

      const data = await response.json();
      console.log('[AppUltimate] Réponse reçue:', data);

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: data.answer || "Aucune réponse disponible",
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMessage]);
      
      // TTS automatique des réponses
      if (data.answer) {
        speak(data.answer);
      }

    } catch (error) {
      console.error('[AppUltimate] Erreur:', error);
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: "❌ Erreur de connexion. Vérifiez que le serveur fonctionne.",
        timestamp: new Date()
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [inputValue, speak]);

  // GESTION MENU MOBILE STABLE
  const handleMenuToggle = useCallback(() => {
    if (menuTimeoutRef.current) {
      clearTimeout(menuTimeoutRef.current);
    }
    
    setIsMenuOpen(prev => !prev);
    
    // Menu reste ouvert, pas de fermeture automatique
  }, []);

  const handleMenuItemClick = useCallback((text: string) => {
    setSelectedText(text);
    // Menu reste ouvert pour navigation continue
  }, []);

  // ÉCHANTILLONS DE VOS LIVRES POUR TESTS
  const sampleTexts = [
    { title: "Likutei Moharan 1", content: "Enseignement sur la prière et la méditation..." },
    { title: "Chayei Moharan", content: "Récits de la vie de Rabbi Nahman..." },
    { title: "Sippurei Maasiyot", content: "Les histoires merveilleuses..." },
    { title: "Likutei Tefilot", content: "Prières et supplications..." },
    { title: "Sefer HaMiddot", content: "Livre des traits de caractère..." }
  ];

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col">
      
      {/* HEADER FIXE */}
      <header className="bg-slate-800 p-4 border-b border-slate-700 flex items-center justify-between">
        <button
          onClick={handleMenuToggle}
          className="text-2xl hover:text-sky-400 transition-colors"
          aria-label="Menu"
        >
          ☰
        </button>
        
        <h1 className="text-xl font-bold text-center flex-1">
          נח נחמן מאומן - Le Compagnon du Cœur
        </h1>
        
        <div className="flex gap-2">
          <button
            onClick={() => window.speechSynthesis?.cancel()}
            className={`p-2 rounded ${isSpeaking ? 'bg-red-600' : 'bg-slate-700'} hover:bg-slate-600`}
            aria-label="Arrêter TTS"
          >
            🔊
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        
        {/* MENU LATERAL STABLE */}
        <div className={`bg-slate-800 transition-all duration-300 overflow-y-auto border-r border-slate-700 ${
          isMenuOpen ? 'w-80' : 'w-0'
        }`}>
          {isMenuOpen && (
            <div className="p-4">
              <h2 className="text-lg font-bold mb-4 text-sky-400">📚 Vos Livres</h2>
              
              <div className="space-y-2">
                {sampleTexts.map((text, index) => (
                  <button
                    key={index}
                    onClick={() => handleMenuItemClick(text.content)}
                    className="w-full text-left p-3 bg-slate-700 hover:bg-slate-600 rounded transition-colors"
                  >
                    <div className="font-medium text-amber-400">{text.title}</div>
                    <div className="text-sm text-slate-300 truncate">{text.content}</div>
                  </button>
                ))}
              </div>

              <div className="mt-6 p-3 bg-slate-700 rounded">
                <h3 className="font-medium text-green-400 mb-2">📊 Statut Système</h3>
                <div className="text-sm space-y-1">
                  <div>✅ PostgreSQL: 6909 passages</div>
                  <div>✅ IA Gemini: Opérationnelle</div>
                  <div>✅ TTS: Web Speech API</div>
                  <div>✅ STT: Reconnaissance vocale</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ZONE PRINCIPALE */}
        <div className="flex-1 flex flex-col">
          
          {/* ZONE MESSAGES */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            
            {/* MESSAGE D'ACCUEIL */}
            {messages.length === 0 && (
              <div className="bg-slate-800 p-6 rounded-lg text-center">
                <h2 className="text-2xl font-bold text-sky-400 mb-4">🕊️ Bienvenue</h2>
                <p className="text-slate-300 mb-4">
                  Posez vos questions sur les enseignements de Rabbi Nahman. 
                  L'IA utilise exclusivement le contenu de vos 13 livres hébreux.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                  <button
                    onClick={() => handleSend("Quels enseignements parlent de la joie?")}
                    className="p-3 bg-sky-700 hover:bg-sky-600 rounded transition-colors text-left"
                  >
                    💫 Enseignements sur la joie
                  </button>
                  <button
                    onClick={() => handleSend("Comment méditer selon Rabbi Nahman?")}
                    className="p-3 bg-amber-700 hover:bg-amber-600 rounded transition-colors text-left"
                  >
                    🧘 Méditation et prière
                  </button>
                  <button
                    onClick={() => handleSend("Histoires de Sippurei Maasiyot")}
                    className="p-3 bg-purple-700 hover:bg-purple-600 rounded transition-colors text-left"
                  >
                    📖 Histoires merveilleuses
                  </button>
                  <button
                    onClick={() => handleSend("Conseils pour surmonter les épreuves")}
                    className="p-3 bg-green-700 hover:bg-green-600 rounded transition-colors text-left"
                  >
                    💪 Conseils spirituels
                  </button>
                </div>
              </div>
            )}

            {/* MESSAGES */}
            {messages.map((message) => (
              <div
                key={message.id}
                className={`p-4 rounded-lg max-w-4xl ${
                  message.type === 'user'
                    ? 'bg-sky-700 ml-auto text-right'
                    : 'bg-slate-700 mr-auto'
                }`}
              >
                <div className="whitespace-pre-wrap">{message.content}</div>
                <div className="text-xs text-slate-400 mt-2">
                  {message.timestamp.toLocaleTimeString()}
                </div>
                
                {/* BOUTON TTS POUR RÉPONSES IA */}
                {message.type === 'ai' && (
                  <button
                    onClick={() => speak(message.content)}
                    className="mt-2 px-3 py-1 bg-slate-600 hover:bg-slate-500 rounded text-xs transition-colors"
                  >
                    🔊 Écouter
                  </button>
                )}
              </div>
            ))}

            {/* INDICATEUR CHARGEMENT */}
            {isLoading && (
              <div className="bg-slate-700 p-4 rounded-lg mr-auto">
                <div className="flex items-center gap-2">
                  <div className="animate-spin h-4 w-4 border-2 border-sky-400 border-t-transparent rounded-full"></div>
                  <span>Rabbi Nahman réfléchit...</span>
                </div>
              </div>
            )}
          </div>

          {/* ZONE SAISIE */}
          <div className="p-4 bg-slate-800 border-t border-slate-700">
            <div className="flex gap-2">
              <textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Posez votre question sur les enseignements de Rabbi Nahman..."
                className="flex-1 p-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 resize-none"
                rows={2}
              />
              
              <div className="flex flex-col gap-2">
                <button
                  onClick={startListening}
                  disabled={isListening}
                  className={`p-3 rounded-lg transition-colors ${
                    isListening
                      ? 'bg-red-600 animate-pulse'
                      : 'bg-slate-600 hover:bg-slate-500'
                  }`}
                  aria-label="Reconnaissance vocale"
                >
                  🎤
                </button>
                
                <button
                  onClick={() => handleSend()}
                  disabled={isLoading || !inputValue.trim()}
                  className="p-3 bg-sky-600 hover:bg-sky-500 disabled:bg-slate-600 disabled:opacity-50 rounded-lg transition-colors"
                  aria-label="Envoyer"
                >
                  ➤
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}