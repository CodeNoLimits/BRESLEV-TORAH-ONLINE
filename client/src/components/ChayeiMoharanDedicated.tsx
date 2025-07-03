import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Volume2, VolumeX, Search, Book, ArrowRight } from 'lucide-react';

interface ChayeiChapter {
  number: number;
  title: string;
}

interface SearchResult {
  answer: string;
  sources: string[];
  relevantSections: any[];
}

interface TranslationChunk {
  hebrewText: string;
  frenchTranslation: string;
  hasMore: boolean;
  nextStart: number;
}

export function ChayeiMoharanDedicated() {
  const [chapters, setChapters] = useState<ChayeiChapter[]>([]);
  const [selectedChapter, setSelectedChapter] = useState<number | null>(null);
  const [currentTranslation, setCurrentTranslation] = useState<TranslationChunk | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isTTSActive, setIsTTSActive] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [view, setView] = useState<'search' | 'chapters' | 'reader'>('search');

  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // TTS OPTIMISÉ
  const speak = (text: string) => {
    if ('speechSynthesis' in window) {
      // Arrêter toute parole en cours
      window.speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'fr-FR';
      utterance.rate = 0.8;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      
      utterance.onstart = () => {
        setIsTTSActive(true);
        console.log('[TTS] Démarrage lecture');
      };
      
      utterance.onend = () => {
        setIsTTSActive(false);
        console.log('[TTS] Fin lecture');
      };
      
      utterance.onerror = (event) => {
        setIsTTSActive(false);
        console.error('[TTS] Erreur:', event);
      };

      utteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    }
  };

  const stopSpeaking = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsTTSActive(false);
      utteranceRef.current = null;
    }
  };

  // STT OPTIMISÉ
  const startListening = () => {
    // Arrêter TTS avant de commencer l'écoute
    stopSpeaking();
    
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.lang = 'fr-FR';
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => {
        setIsListening(true);
        console.log('[STT] Écoute démarrée');
      };
      
      recognition.onend = () => {
        setIsListening(false);
        console.log('[STT] Écoute terminée');
      };
      
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        console.log('[STT] Transcription:', transcript);
        setSearchQuery(transcript);
        handleSearch(transcript);
      };

      recognition.onerror = (event: any) => {
        setIsListening(false);
        console.error('[STT] Erreur:', event.error);
      };

      recognition.start();
    } else {
      alert('Reconnaissance vocale non supportée');
    }
  };

  // Charger les chapitres au démarrage
  useEffect(() => {
    loadChapters();
  }, []);

  const loadChapters = async () => {
    try {
      const response = await fetch('/api/chayei-moharan/chapters');
      const data = await response.json();
      setChapters(data.chapters || []);
      console.log(`[ChayeiMoharan] ${data.chapters?.length || 0} chapitres chargés`);
    } catch (error) {
      console.error('Erreur chargement chapitres:', error);
    }
  };

  // RECHERCHE avec Gemini dans Chayei Moharan UNIQUEMENT
  const handleSearch = async (query: string = searchQuery) => {
    if (!query.trim()) return;

    setIsLoading(true);
    setSearchResult(null);
    
    try {
      console.log(`[ChayeiMoharan] Recherche Gemini: "${query}"`);
      
      const response = await fetch('/api/chayei-moharan/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: query })
      });

      const result = await response.json();
      console.log(`[ChayeiMoharan] Résultat:`, result);
      
      setSearchResult(result);
      setView('search');
      
      // TTS automatique de la réponse
      if (result.answer) {
        setTimeout(() => {
          speak(result.answer);
        }, 500);
      }

    } catch (error) {
      console.error('Erreur recherche:', error);
      setSearchResult({
        answer: 'Erreur de connexion lors de la recherche dans Chayei Moharan.',
        sources: [],
        relevantSections: []
      });
    }
    setIsLoading(false);
  };

  // TRADUCTION LAZY d'un chapitre
  const loadTranslation = async (chapterNum: number, startChar = 0) => {
    setIsLoading(true);
    
    try {
      console.log(`[ChayeiMoharan] Traduction chapitre ${chapterNum}, début: ${startChar}`);
      
      const response = await fetch('/api/chayei-moharan/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          chapterNumber: chapterNum, 
          startChar, 
          length: 1000 
        })
      });

      const data = await response.json();
      console.log(`[ChayeiMoharan] Traduction reçue:`, data);
      
      setCurrentTranslation(data);
      setSelectedChapter(chapterNum);
      setView('reader');

    } catch (error) {
      console.error('Erreur traduction:', error);
    }
    setIsLoading(false);
  };

  const loadMoreTranslation = () => {
    if (currentTranslation && currentTranslation.hasMore && selectedChapter) {
      loadTranslation(selectedChapter, currentTranslation.nextStart);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Header fixe */}
      <div className="sticky top-0 z-10 bg-slate-800 border-b border-slate-700 p-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-amber-400">
            📖 חיי מוהרן - Chayei Moharan
          </h1>
          
          <div className="flex gap-2">
            <button
              onClick={isListening ? () => setIsListening(false) : startListening}
              disabled={isLoading}
              className={`p-3 rounded-full ${
                isListening ? 'bg-red-600 animate-pulse' : 'bg-blue-600 hover:bg-blue-700'
              } disabled:opacity-50`}
              title="Reconnaissance vocale"
            >
              {isListening ? <MicOff size={20} /> : <Mic size={20} />}
            </button>
            
            <button
              onClick={isTTSActive ? stopSpeaking : () => {}}
              className={`p-3 rounded-full ${
                isTTSActive ? 'bg-red-600 animate-pulse' : 'bg-green-600 hover:bg-green-700'
              }`}
              title={isTTSActive ? 'Arrêter la lecture' : 'Lecture vocale active'}
            >
              {isTTSActive ? <VolumeX size={20} /> : <Volume2 size={20} />}
            </button>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setView('search')}
            className={`px-4 py-2 rounded ${
              view === 'search' ? 'bg-sky-600' : 'bg-slate-700 hover:bg-slate-600'
            }`}
          >
            🔍 Recherche
          </button>
          
          <button
            onClick={() => setView('chapters')}
            className={`px-4 py-2 rounded ${
              view === 'chapters' ? 'bg-sky-600' : 'bg-slate-700 hover:bg-slate-600'
            }`}
          >
            📚 Chapitres ({chapters.length})
          </button>
          
          {selectedChapter && (
            <button
              onClick={() => setView('reader')}
              className={`px-4 py-2 rounded ${
                view === 'reader' ? 'bg-sky-600' : 'bg-slate-700 hover:bg-slate-600'
              }`}
            >
              📖 Chapitre {selectedChapter}
            </button>
          )}
        </div>

        {/* Barre de recherche */}
        <div className="flex gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Recherchez dans Chayei Moharan (hébreu + traduction française)..."
            className="flex-1 p-3 bg-slate-700 border border-slate-600 rounded text-white placeholder-slate-400"
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          />
          <button
            onClick={() => handleSearch()}
            disabled={isLoading || !searchQuery.trim()}
            className="px-6 py-3 bg-sky-600 hover:bg-sky-700 rounded font-medium disabled:opacity-50"
          >
            <Search size={20} />
          </button>
        </div>
      </div>

      {/* Contenu principal */}
      <div className="p-4">
        {/* Vue Recherche */}
        {view === 'search' && (
          <div className="max-w-4xl mx-auto">
            {isLoading && (
              <div className="text-center py-8">
                <div className="animate-spin w-8 h-8 border-4 border-sky-400 border-t-transparent rounded-full mx-auto mb-2"></div>
                <div className="text-slate-400">Recherche avec Gemini dans Chayei Moharan...</div>
              </div>
            )}

            {searchResult && !isLoading && (
              <div className="space-y-6">
                <div className="bg-slate-800 p-6 rounded-lg">
                  <h3 className="text-lg font-bold mb-4 text-green-400">
                    🎯 Réponse de Gemini (Chayei Moharan)
                  </h3>
                  
                  <div className="prose prose-slate prose-invert max-w-none">
                    <div className="whitespace-pre-wrap leading-relaxed text-slate-100">
                      {searchResult.answer}
                    </div>
                  </div>

                  <div className="flex gap-3 mt-4">
                    <button
                      onClick={() => speak(searchResult.answer)}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded text-sm font-medium"
                    >
                      🔊 Écouter la réponse
                    </button>
                    
                    {searchResult.sources.length > 0 && (
                      <button
                        onClick={() => speak(`Sources: ${searchResult.sources.join(', ')}`)}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm font-medium"
                      >
                        📚 Écouter les sources
                      </button>
                    )}
                  </div>

                  {searchResult.sources.length > 0 && (
                    <div className="mt-4 p-3 bg-slate-700 rounded">
                      <div className="text-sm text-slate-300 mb-2">Sources dans Chayei Moharan:</div>
                      {searchResult.sources.map((source, i) => (
                        <div key={i} className="text-xs text-amber-400 mb-1">• {source}</div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {!searchResult && !isLoading && (
              <div className="text-center py-12">
                <Book size={48} className="mx-auto mb-4 text-slate-600" />
                <h3 className="text-xl font-bold text-slate-400 mb-2">
                  Recherche dans Chayei Moharan
                </h3>
                <p className="text-slate-500">
                  Posez vos questions sur la vie de Rabbi Nahman.
                  <br />
                  L'IA Gemini recherche dans les 823 chapitres avec traduction française.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Vue Chapitres */}
        {view === 'chapters' && (
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold mb-6 text-sky-400">
              📚 Tous les chapitres de Chayei Moharan ({chapters.length})
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {chapters.map((chapter) => (
                <button
                  key={chapter.number}
                  onClick={() => loadTranslation(chapter.number)}
                  className={`p-4 rounded-lg text-left transition-colors ${
                    selectedChapter === chapter.number
                      ? 'bg-amber-600 hover:bg-amber-700'
                      : 'bg-slate-800 hover:bg-slate-700'
                  }`}
                >
                  <div className="font-bold text-lg mb-2">
                    Chapitre {chapter.number}
                  </div>
                  <div className="text-sm text-slate-300 truncate">
                    {chapter.title}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Vue Lecteur */}
        {view === 'reader' && currentTranslation && (
          <div className="max-w-4xl mx-auto space-y-6">
            <h2 className="text-2xl font-bold text-amber-400">
              📖 Chapitre {selectedChapter}
            </h2>

            {/* Texte hébreu */}
            <div className="bg-slate-800 p-6 rounded-lg">
              <h3 className="text-lg font-bold mb-4 text-sky-400">עברית - Texte original</h3>
              <div className="text-right leading-relaxed font-serif text-lg" dir="rtl">
                {currentTranslation.hebrewText}
              </div>
            </div>

            {/* Traduction française */}
            <div className="bg-slate-800 p-6 rounded-lg">
              <h3 className="text-lg font-bold mb-4 text-green-400">Français - Traduction</h3>
              <div className="leading-relaxed">
                {currentTranslation.frenchTranslation}
              </div>
            </div>

            {/* Contrôles */}
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => speak(currentTranslation.frenchTranslation)}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded font-medium"
              >
                🔊 Écouter en français
              </button>

              {currentTranslation.hasMore && (
                <button
                  onClick={loadMoreTranslation}
                  disabled={isLoading}
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-700 rounded font-medium disabled:opacity-50"
                >
                  <ArrowRight size={16} className="inline mr-2" />
                  Suite du chapitre
                </button>
              )}
              
              <button
                onClick={() => setView('chapters')}
                className="px-4 py-2 bg-slate-600 hover:bg-slate-700 rounded font-medium"
              >
                📚 Retour aux chapitres
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}