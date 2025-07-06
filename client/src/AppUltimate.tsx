import { useState, useCallback, useEffect } from 'react';
import { ChayeiMoharanViewer } from './components/ChayeiMoharanViewer';
import { useVoice } from './hooks/useVoice';

interface Message {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
  hebrew?: string;
  french?: string;
}

function AppUltimate() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentInput, setCurrentInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedChapter, setSelectedChapter] = useState<string | null>(null);
  const [showLibrary, setShowLibrary] = useState(false);

  // TTS simple et direct
  const speak = useCallback((text: string) => {
    if (!text.trim()) return;
    console.log('[TTS] Speaking:', text.substring(0, 50));

    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'fr-FR';
    utterance.rate = 0.9;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    speechSynthesis.speak(utterance);
  }, []);

  // Système vocal unifié
  const { askVoice, isListening } = useVoice((question: string) => {
    setCurrentInput(question);
    handleQuestion(question);
  });

  // Fonction principale pour poser des questions
  const handleQuestion = useCallback(async (question: string) => {
    if (!question.trim()) return;

    console.log('[AppUltimate] Question:', question);

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: question,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      // Appel à l'API smart-query (concentrée sur Chayei Moharan)
      const response = await fetch('/api/smart-query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          question,
          book: 'Chayei_Moharan',
          translate: true,
          chapter: selectedChapter
        })
      });

      const data = await response.json();
      console.log('[AppUltimate] Réponse reçue:', data);

      // Message IA avec traduction
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: data.french || data.answer || 'Réponse non disponible',
        hebrew: data.hebrew,
        french: data.french || data.answer,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMessage]);

      // TTS automatique de la réponse en français
      if (data.french || data.answer) {
        setTimeout(() => {
          speak(data.french || data.answer);
        }, 500);
      }

    } catch (error) {
      console.error('[AppUltimate] Erreur:', error);

      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: "❌ Erreur lors de la recherche dans Chayei Moharan",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [selectedChapter, speak]);

  const handleSend = useCallback(() => {
    if (currentInput.trim()) {
      handleQuestion(currentInput);
      setCurrentInput('');
    }
  }, [currentInput, handleQuestion]);

  return (
    <div className="h-screen bg-slate-950 text-slate-300 flex flex-col">

      {/* Header simplifié */}
      <div className="bg-slate-900 border-b border-slate-700 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-sm">ח</span>
            </div>
            <div>
              <h1 className="text-lg font-semibold text-amber-400">Chayei Moharan</h1>
              <p className="text-xs text-slate-400">Mode Bêta - Application en développement</p>
            </div>
          </div>

          <button
            onClick={() => setShowLibrary(!showLibrary)}
            className="px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded transition-colors"
          >
            {showLibrary ? 'Fermer' : 'Chapitres'}
          </button>
        </div>
      </div>

      <div className="flex-1 flex">

        {/* Navigation des chapitres */}
        {showLibrary && (
          <div className="w-80 bg-slate-900 border-r border-slate-700 overflow-y-auto">
            <ChayeiMoharanViewer 
              onChapterSelect={(chapter) => {
                setSelectedChapter(chapter);
                setShowLibrary(false);
              }}
              onQuestionSelect={handleQuestion}
            />
          </div>
        )}

        {/* Zone principale */}
        <div className="flex-1 flex flex-col p-4 max-w-4xl mx-auto">

          {/* Info chapitre sélectionné */}
          {selectedChapter && (
            <div className="mb-4 p-3 bg-amber-900/30 border border-amber-600/50 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-amber-400 font-medium">
                  Chapitre sélectionné: {selectedChapter}
                </span>
                <button
                  onClick={() => setSelectedChapter(null)}
                  className="text-slate-400 hover:text-red-400"
                >
                  ✕
                </button>
              </div>
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto mb-4 space-y-4">
            {messages.length === 0 && (
              <div className="text-center text-slate-400 mt-8">
                <h2 className="text-xl mb-4">🕊️ חיי מוהר"ן</h2>
                <p>Bienvenue dans l'étude de Chayei Moharan</p>
                <p className="text-sm mt-2">
                  Sélectionnez un chapitre ou posez une question générale
                </p>
              </div>
            )}

            {messages.map((message) => (
              <div key={message.id} className={`p-4 rounded-lg ${
                message.type === 'user' 
                  ? 'bg-sky-900 ml-8' 
                  : 'bg-slate-800 mr-8'
              }`}>

                {message.type === 'ai' && message.hebrew && (
                  <div className="mb-3 p-3 bg-slate-700 rounded border-r-4 border-amber-500">
                    <h4 className="text-amber-400 text-sm font-medium mb-2">מקור בעברית:</h4>
                    <div className="text-right font-hebrew leading-relaxed text-slate-200">
                      {message.hebrew}
                    </div>
                  </div>
                )}

                <div className="leading-relaxed">
                  {message.content.split('\n').map((line, idx) => (
                    <p key={idx} className="mb-2 last:mb-0">{line}</p>
                  ))}
                </div>

                {message.type === 'ai' && (
                  <button
                    onClick={() => speak(message.content)}
                    className="mt-2 text-xs text-sky-400 hover:text-sky-300 flex items-center gap-1"
                  >
                    🔊 Écouter
                  </button>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="p-4 rounded-lg bg-slate-800 mr-8">
                <div className="animate-pulse">🔍 Recherche dans Chayei Moharan...</div>
              </div>
            )}
          </div>

          {/* Zone de saisie */}
          <div className="border-t border-slate-700 pt-4">
            <div className="flex gap-2">
              <textarea
                value={currentInput}
                onChange={(e) => setCurrentInput(e.target.value)}
                placeholder="Posez votre question sur Chayei Moharan..."
                className="flex-1 p-3 bg-slate-800 border border-slate-600 rounded-lg resize-none focus:outline-none focus:border-amber-500"
                rows={2}
                disabled={isLoading}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
              />

              <div className="flex flex-col gap-2">
                <button
                  onClick={() => askVoice()}
                  className={`p-3 rounded-lg transition-all ${
                    isListening 
                      ? 'bg-red-600 animate-pulse text-white' 
                      : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                  }`}
                  title="Question vocale"
                >
                  🎤
                </button>

                <button
                  onClick={handleSend}
                  disabled={isLoading || !currentInput.trim()}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 disabled:bg-slate-600 rounded-lg transition-colors text-black font-medium"
                >
                  {isLoading ? '...' : 'Envoyer'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AppUltimate;