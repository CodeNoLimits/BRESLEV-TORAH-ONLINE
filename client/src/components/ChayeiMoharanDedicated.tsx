import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Volume2, VolumeX, Search, Book, ArrowRight, Menu, X } from 'lucide-react';

interface SearchResult {
  response: string;
  sources: string[];
  error?: string;
}

export function ChayeiMoharanDedicated() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isTTSActive, setIsTTSActive] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<'search' | 'help'>('search');

  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // TTS OPTIMISÉ
  const speak = (text: string) => {
    if (!text || !text.trim()) {
      console.warn('[TTS] Texte vide');
      return;
    }

    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();

      setTimeout(() => {
        const utterance = new SpeechSynthesisUtterance(text.trim());
        utterance.lang = 'fr-FR';
        utterance.rate = 0.85;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;

        utterance.onstart = () => {
          setIsTTSActive(true);
          console.log('[TTS] ✅ Lecture démarrée');
        };

        utterance.onend = () => {
          setIsTTSActive(false);
          console.log('[TTS] ✅ Lecture terminée');
        };

        utterance.onerror = (event) => {
          setIsTTSActive(false);
          console.error('[TTS] ❌ Erreur:', event.error);
        };

        utteranceRef.current = utterance;
        window.speechSynthesis.speak(utterance);
      }, 100);
    } else {
      alert('La synthèse vocale n\'est pas supportée sur votre navigateur');
    }
  };

  const stopSpeaking = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsTTSActive(false);
    }
  };

  // STT OPTIMISÉ
  const startListening = () => {
    stopSpeaking();

    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      const recognition = new SpeechRecognition();

      recognition.lang = 'fr-FR';
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => {
        setIsListening(true);
        console.log('[STT] ✅ Écoute démarrée');
      };

      recognition.onend = () => {
        setIsListening(false);
        console.log('[STT] ✅ Écoute terminée');
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        console.log('[STT] ✅ Transcription:', transcript);
        setSearchQuery(transcript);

        setTimeout(() => {
          handleSearch(transcript);
        }, 500);
      };

      recognition.onerror = (event: any) => {
        setIsListening(false);
        console.error('[STT] ❌ Erreur:', event.error);

        if (event.error === 'not-allowed') {
          alert('Veuillez autoriser l\'accès au microphone');
        }
      };

      recognition.start();
    } else {
      alert('Reconnaissance vocale non supportée sur votre navigateur');
    }
  };

  // RECHERCHE GEMINI
  const handleSearch = async (query: string = searchQuery) => {
    if (!query.trim()) return;

    setIsLoading(true);
    setSearchResult(null);
    setError(null);

    try {
      console.log(`[Search] Recherche: "${query}"`);

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: query })
      });

      if (!response.ok) {
        throw new Error(`Erreur ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log(`[Search] Résultat:`, result);

      if (result.error) {
        setError(result.error);
        setSearchResult({
          response: result.response || 'Erreur lors de la recherche',
          sources: [],
          error: result.error
        });
      } else {
        setSearchResult(result);

        // TTS automatique
        if (result.response) {
          setTimeout(() => {
            speak(result.response);
          }, 500);
        }
      }

    } catch (error) {
      console.error('❌ Erreur recherche:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      setError(errorMessage);
      setSearchResult({
        response: 'Erreur de connexion. Vérifiez votre connexion internet.',
        sources: [],
        error: errorMessage
      });
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-slate-900/90 backdrop-blur-md border-b border-slate-700">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center">
                <Book size={16} className="text-white" />
              </div>
              <h1 className="text-xl font-bold text-amber-400">
                חיי מוהרן - Chayei Moharan
              </h1>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => setView(view === 'search' ? 'help' : 'search')}
                className="p-2 rounded-full bg-slate-700 hover:bg-slate-600 transition-colors"
                title="Aide"
              >
                {view === 'search' ? <Menu size={16} /> : <X size={16} />}
              </button>

              <button
                onClick={isListening ? () => setIsListening(false) : startListening}
                disabled={isLoading}
                className={`p-2 rounded-full transition-colors ${
                  isListening ? 'bg-red-600 animate-pulse' : 'bg-blue-600 hover:bg-blue-700'
                } disabled:opacity-50`}
                title="Reconnaissance vocale"
              >
                {isListening ? <MicOff size={16} /> : <Mic size={16} />}
              </button>

              <button
                onClick={isTTSActive ? stopSpeaking : () => {}}
                className={`p-2 rounded-full transition-colors ${
                  isTTSActive ? 'bg-red-600 animate-pulse' : 'bg-green-600 hover:bg-green-700'
                }`}
                title={isTTSActive ? 'Arrêter la lecture' : 'Synthèse vocale'}
              >
                {isTTSActive ? <VolumeX size={16} /> : <Volume2 size={16} />}
              </button>
            </div>
          </div>

          {/* Barre de recherche */}
          <div className="flex space-x-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Posez votre question sur Rabbi Nahman..."
              className="flex-1 px-4 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            />
            <button
              onClick={() => handleSearch()}
              disabled={isLoading || !searchQuery.trim()}
              className="px-6 py-2 bg-amber-600 hover:bg-amber-700 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Search size={16} />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Contenu principal */}
      <div className="container mx-auto px-4 py-6">
        {view === 'help' && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-6 border border-slate-700">
              <h2 className="text-2xl font-bold mb-4 text-amber-400">
                🕊️ Bienvenue sur Chayei Moharan
              </h2>
              <div className="space-y-4 text-slate-300">
                <p>
                  Cette application vous permet de dialoguer avec l'IA Gemini sur les enseignements de Rabbi Nahman de Breslev.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-slate-900/50 p-4 rounded-lg">
                    <h3 className="font-semibold text-blue-400 mb-2">🎤 Vocal</h3>
                    <p className="text-sm">Cliquez sur le micro pour poser vos questions à voix haute.</p>
                  </div>
                  <div className="bg-slate-900/50 p-4 rounded-lg">
                    <h3 className="font-semibold text-green-400 mb-2">🔊 Écoute</h3>
                    <p className="text-sm">Les réponses sont lues automatiquement par la synthèse vocale.</p>
                  </div>
                </div>
                <div className="mt-6 p-4 bg-amber-900/20 rounded-lg border border-amber-700">
                  <p className="text-amber-200">
                    <strong>Astuce:</strong> Posez des questions comme "Que dit Rabbi Nahman sur la prière?" ou "Comment surmonter la tristesse selon Breslev?"
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {view === 'search' && (
          <div className="max-w-4xl mx-auto">
            {/* Affichage d'erreur */}
            {error && (
              <div className="mb-6 p-4 bg-red-900/50 border border-red-700 rounded-lg">
                <h3 className="font-bold text-red-400 mb-2">❌ Erreur</h3>
                <p className="text-red-200">{error}</p>
                <button 
                  onClick={() => setError(null)}
                  className="mt-2 px-3 py-1 bg-red-700 hover:bg-red-600 rounded text-xs"
                >
                  Fermer
                </button>
              </div>
            )}

            {/* Chargement */}
            {isLoading && (
              <div className="text-center py-12">
                <div className="w-12 h-12 border-4 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-slate-400">Consultation de l'IA Gemini...</p>
              </div>
            )}

            {/* Résultat de recherche */}
            {searchResult && !isLoading && (
              <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-6 border border-slate-700">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-green-400">
                    🎯 Réponse de l'IA
                  </h3>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => speak(searchResult.response)}
                      disabled={isTTSActive}
                      className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                        isTTSActive 
                          ? 'bg-red-600 hover:bg-red-700 animate-pulse' 
                          : 'bg-green-600 hover:bg-green-700'
                      }`}
                    >
                      {isTTSActive ? '⏸️ Pause' : '🔊 Écouter'}
                    </button>

                    {isTTSActive && (
                      <button
                        onClick={stopSpeaking}
                        className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-sm font-medium"
                      >
                        ⏹️ Arrêter
                      </button>
                    )}
                  </div>
                </div>

                <div className="prose prose-slate prose-invert max-w-none">
                  <div className="whitespace-pre-wrap leading-relaxed text-slate-100">
                    {searchResult.response}
                  </div>
                </div>

                {searchResult.sources.length > 0 && (
                  <div className="mt-4 p-3 bg-slate-900/50 rounded border border-slate-600">
                    <div className="text-sm text-slate-400 mb-1">Sources:</div>
                    {searchResult.sources.map((source, i) => (
                      <div key={i} className="text-xs text-amber-400">• {source}</div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* État initial */}
            {!searchResult && !isLoading && !error && (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Book size={32} className="text-amber-400" />
                </div>
                <h3 className="text-xl font-bold text-slate-300 mb-2">
                  Posez votre question spirituelle
                </h3>
                <p className="text-slate-500 max-w-md mx-auto">
                  Explorez les enseignements de Rabbi Nahman de Breslev avec l'aide de l'IA Gemini.
                  Utilisez le micro ou tapez votre question.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}