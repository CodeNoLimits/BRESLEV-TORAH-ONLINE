import React, { useState, useEffect, useCallback, useRef } from 'react';
import './index.css';
import { ChayeiMoharanViewer } from './components/ChayeiMoharanViewer';

interface Message {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
}

export default function AppFixed() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [selectedText, setSelectedText] = useState<string>('');
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentView, setCurrentView] = useState<'chat' | 'chayei'>('chayei'); // Démarrer en mode Chayei Moharan
  
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

  // STT SIMPLIFIÉ
  const startListening = useCallback(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Reconnaissance vocale non supportée dans ce navigateur.');
      return;
    }

    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.lang = 'fr-FR';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInputValue(transcript);
    };
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);

    recognition.start();
    recognitionRef.current = recognition;
  }, []);

  // GESTION DES MESSAGES
  const handleSend = useCallback(async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputValue.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    console.log('[AppFixed] Envoi question:', inputValue.trim());
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/smart-query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: inputValue.trim() })
      });

      const data = await response.json();
      console.log('[AppFixed] Réponse reçue:', data);

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: data.answer || 'Désolé, je n\'ai pas pu traiter votre demande.',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMessage]);
      
      // TTS automatique si activé
      if (data.answer) {
        speak(data.answer);
      }

    } catch (error) {
      console.error('[AppFixed] Erreur:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: 'Erreur de connexion. Veuillez réessayer.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    }

    setIsLoading(false);
  }, [inputValue, isLoading, speak]);

  // MENU HANDLERS
  const handleMenuToggle = useCallback(() => {
    setIsMenuOpen(prev => !prev);
  }, []);

  const handleMenuItemClick = useCallback((content: string) => {
    setSelectedText(content);
    // Menu reste ouvert pour navigation continue
  }, []);

  // VOS LIVRES (avec focus sur Chayei Moharan)
  const sampleTexts = [
    { 
      title: "חיי מוהרן - Chayei Moharan", 
      content: "Livre principal avec 823 chapitres - Recherche Gemini activée",
      chapters: "823 chapitres • IA Gemini • TTS/STT",
      isMain: true
    },
    { 
      title: "Hishtapchut HaNefesh", 
      content: "השתפכות הנפש - Épanchement de l'âme",
      chapters: "102 passages"
    },
    { 
      title: "Likutei Moharan Kama", 
      content: "ליקוטי מוהרן קמא - Enseignements principaux",
      chapters: "252 sections"
    }
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
          {currentView === 'chayei' ? '📖 חיי מוהרן - Chayei Moharan' : 'נח נחמן מאומן - Le Compagnon du Cœur'}
        </h1>
        
        <div className="flex gap-2">
          {currentView === 'chayei' && (
            <div className="text-xs bg-amber-600 px-2 py-1 rounded text-white">
              MODE BÊTA
            </div>
          )}
          
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
        
        {/* MENU LATERAL */}
        <div className={`bg-slate-800 transition-all duration-300 overflow-y-auto border-r border-slate-700 ${
          isMenuOpen ? 'w-80' : 'w-0'
        }`}>
          {isMenuOpen && (
            <div className="p-4">
              <div className="mb-4 p-3 bg-amber-900 border border-amber-600 rounded-lg">
                <div className="text-amber-300 font-bold text-sm">🚧 MODE BÊTA</div>
                <div className="text-amber-200 text-xs mt-1">
                  Application en développement - Focus sur Chayei Moharan
                </div>
              </div>
              
              <h2 className="text-lg font-bold mb-4 text-sky-400">📖 Livres Breslov</h2>
              
              <div className="space-y-3">
                <div
                  className="p-4 bg-amber-700 hover:bg-amber-600 rounded-lg transition-colors cursor-pointer border-2 border-amber-500"
                  onClick={() => setCurrentView('chayei')}
                >
                  <div className="font-bold text-white text-lg mb-2 leading-tight">
                    חיי מוהרן - Chayei Moharan
                  </div>
                  <div className="text-sm text-amber-100 mb-2 leading-relaxed">
                    Livre principal avec 823 chapitres - Recherche Gemini activée
                  </div>
                  <div className="text-xs text-green-300 font-medium">
                    📖 823 chapitres • 🤖 IA Gemini • 🔊 TTS/STT
                  </div>
                </div>
                
                <div
                  className="p-3 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors cursor-pointer"
                  onClick={() => setCurrentView('chat')}
                >
                  <div className="font-medium text-sky-400">💬 Chat Général</div>
                  <div className="text-sm text-slate-300">
                    Recherche dans tous vos livres (13 livres)
                  </div>
                </div>
                
                {sampleTexts.slice(1).map((text, index) => (
                  <div
                    key={index}
                    className="p-4 bg-slate-600 opacity-50 rounded-lg"
                  >
                    <div className="font-bold text-slate-400 text-lg mb-2 leading-tight">
                      {text.title}
                    </div>
                    <div className="text-sm text-slate-400 mb-2 leading-relaxed">
                      Bientôt disponible...
                    </div>
                    <div className="text-xs text-slate-500 font-medium">
                      🔒 En développement
                    </div>
                  </div>
                ))}
              </div>
              
              {/* STATUT SYSTÈME */}
              <div className="mt-6 p-3 bg-slate-700 rounded-lg">
                <h3 className="font-bold text-sky-400 mb-2">📊 Statut Système</h3>
                <div className="text-xs space-y-1 text-slate-300">
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
          
          {/* AFFICHAGE CONDITIONNEL */}
          {currentView === 'chayei' ? (
            <div className="flex-1 overflow-hidden">
              <ChayeiMoharanViewer />
            </div>
          ) : (
            <>
              {/* ZONE MESSAGES */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                
                {/* MESSAGE D'ACCUEIL */}
                {messages.length === 0 && (
                  <div className="bg-slate-800 p-6 rounded-lg text-center">
                    <h2 className="text-2xl font-bold text-sky-400 mb-4">🕊️ Bienvenue</h2>
                    <p className="text-slate-300 mb-4">
                      Posez vos questions sur les enseignements de Rabbi Nahman. 
                      L'IA scanne vos 13 livres hébreux pour des réponses authentiques.
                    </p>
                    <div className="text-xs text-slate-400">
                      📚 6909 passages • 🤖 IA Gemini • 🔊 TTS/STT activés
                    </div>
                  </div>
                )}

                {/* MESSAGES */}
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`p-4 rounded-lg ${
                      message.type === 'user' 
                        ? 'bg-sky-600 ml-8' 
                        : 'bg-slate-700 mr-8'
                    }`}
                  >
                    <div className="whitespace-pre-wrap leading-relaxed">
                      {message.content}
                    </div>
                    <div className="text-xs text-slate-300 mt-2">
                      {message.timestamp.toLocaleTimeString()}
                    </div>
                  </div>
                ))}

                {/* INDICATEUR DE CHARGEMENT */}
                {isLoading && (
                  <div className="bg-slate-700 p-4 rounded-lg mr-8">
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}