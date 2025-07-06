import React, { useState, useEffect } from 'react';
import { Mic, MicOff, Volume2, VolumeX, Book, ArrowRight, ArrowLeft, Search } from 'lucide-react';

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

export function ChayeiMoharanViewer() {
  const [chapters, setChapters] = useState<ChayeiChapter[]>([]);
  const [selectedChapter, setSelectedChapter] = useState<number | null>(null);
  const [currentTranslation, setCurrentTranslation] = useState<TranslationChunk | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isTTSActive, setIsTTSActive] = useState(false);
  const [isListening, setIsListening] = useState(false);

  // TTS Système
  const speak = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'fr-FR';
      utterance.rate = 0.9;
      utterance.onstart = () => setIsTTSActive(true);
      utterance.onend = () => setIsTTSActive(false);
      window.speechSynthesis.speak(utterance);
    }
  };

  const stopSpeaking = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsTTSActive(false);
    }
  };

  // STT Système
  const startListening = () => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.lang = 'fr-FR';
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setSearchQuery(transcript);
        handleSearch(transcript);
      };

      recognition.onerror = () => setIsListening(false);
      recognition.start();
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
    } catch (error) {
      console.error('Erreur chargement chapitres:', error);
    }
  };

  // RECHERCHE avec Gemini
  const handleSearch = async (query: string = searchQuery) => {
    if (!query.trim()) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/chayei-moharan/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: query })
      });

      const result = await response.json();
      setSearchResult(result);
      
      // TTS automatique de la réponse
      if (result.answer && isTTSActive) {
        speak(result.answer);
      }

    } catch (error) {
      console.error('Erreur recherche:', error);
    }
    setIsLoading(false);
  };

  // TRADUCTION LAZY
  const loadTranslation = async (chapterNum: number, startChar = 0) => {
    setIsLoading(true);
    try {
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
      setCurrentTranslation(data);
      setSelectedChapter(chapterNum);

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
    <div className="max-w-6xl mx-auto p-4 bg-slate-900 text-white min-h-screen">
      {/* Header avec TTS/STT */}
      <div className="flex items-center justify-between mb-6 p-4 bg-slate-800 rounded-lg">
        <h1 className="text-2xl font-bold text-amber-400">
          📖 חיי מוהרן - Chayei Moharan
        </h1>
        
        <div className="flex gap-2">
          <button
            onClick={isListening ? () => setIsListening(false) : startListening}
            className={`p-3 rounded-full ${isListening ? 'bg-red-600' : 'bg-blue-600'} hover:opacity-80`}
            title="Reconnaissance vocale"
          >
            {isListening ? <MicOff size={20} /> : <Mic size={20} />}
          </button>
          
          <button
            onClick={isTTSActive ? stopSpeaking : () => setIsTTSActive(!isTTSActive)}
            className={`p-3 rounded-full ${isTTSActive ? 'bg-red-600' : 'bg-green-600'} hover:opacity-80`}
            title="Lecture vocale"
          >
            {isTTSActive ? <VolumeX size={20} /> : <Volume2 size={20} />}
          </button>
        </div>
      </div>

      {/* Recherche */}
      <div className="mb-6 p-4 bg-slate-800 rounded-lg">
        <div className="flex gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Posez votre question sur Chayei Moharan..."
            className="flex-1 p-3 bg-slate-700 border border-slate-600 rounded text-white"
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          />
          <button
            onClick={() => handleSearch()}
            disabled={isLoading}
            className="px-6 py-3 bg-sky-600 hover:bg-sky-700 rounded font-medium disabled:opacity-50"
          >
            <Search size={20} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Liste des chapitres */}
        <div className="bg-slate-800 rounded-lg p-4">
          <h2 className="text-xl font-bold mb-4 text-sky-400">📚 Chapitres</h2>
          
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {chapters.map((chapter) => (
              <button
                key={chapter.number}
                onClick={() => loadTranslation(chapter.number)}
                className={`w-full text-left p-3 rounded transition-colors ${
                  selectedChapter === chapter.number 
                    ? 'bg-amber-600 text-white' 
                    : 'bg-slate-700 hover:bg-slate-600'
                }`}
              >
                <div className="font-medium">Chapitre {chapter.number}</div>
                <div className="text-sm text-slate-300 truncate">{chapter.title}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Zone de contenu */}
        <div className="bg-slate-800 rounded-lg p-4">
          {/* Résultat de recherche */}
          {searchResult && (
            <div className="mb-6">
              <h3 className="text-lg font-bold mb-3 text-green-400">🔍 Résultat de recherche</h3>
              
              <div className="bg-slate-700 p-4 rounded mb-4">
                <div className="text-sm text-slate-300 mb-2">Réponse Gemini:</div>
                <div className="whitespace-pre-wrap leading-relaxed">
                  {searchResult.answer}
                </div>
              </div>

              {searchResult.sources.length > 0 && (
                <div className="bg-slate-700 p-3 rounded">
                  <div className="text-sm text-slate-300 mb-2">Sources:</div>
                  {searchResult.sources.map((source, i) => (
                    <div key={i} className="text-xs text-amber-400">• {source}</div>
                  ))}
                </div>
              )}

              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => speak(searchResult.answer)}
                  className="px-3 py-1 bg-green-600 hover:bg-green-700 rounded text-sm"
                >
                  🔊 Écouter
                </button>
              </div>
            </div>
          )}

          {/* Traduction du chapitre */}
          {currentTranslation && (
            <div>
              <h3 className="text-lg font-bold mb-3 text-amber-400">
                📜 Chapitre {selectedChapter} - Traduction
              </h3>

              {/* Texte hébreu */}
              <div className="bg-slate-700 p-4 rounded mb-4">
                <div className="text-sm text-slate-300 mb-2">Texte hébreu original:</div>
                <div className="text-right leading-relaxed font-serif text-lg">
                  {currentTranslation.hebrewText}
                </div>
              </div>

              {/* Traduction française */}
              <div className="bg-slate-700 p-4 rounded mb-4">
                <div className="text-sm text-slate-300 mb-2">Traduction française:</div>
                <div className="leading-relaxed">
                  {currentTranslation.frenchTranslation}
                </div>
              </div>

              {/* Contrôles */}
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => speak(currentTranslation.frenchTranslation)}
                  className="px-3 py-2 bg-green-600 hover:bg-green-700 rounded text-sm"
                >
                  🔊 Écouter français
                </button>

                {currentTranslation.hasMore && (
                  <button
                    onClick={loadMoreTranslation}
                    disabled={isLoading}
                    className="px-3 py-2 bg-sky-600 hover:bg-sky-700 rounded text-sm disabled:opacity-50"
                  >
                    <ArrowRight size={16} className="inline mr-1" />
                    1000 caractères suivants
                  </button>
                )}
              </div>
            </div>
          )}

          {isLoading && (
            <div className="text-center py-8">
              <div className="animate-spin w-8 h-8 border-4 border-sky-400 border-t-transparent rounded-full mx-auto mb-2"></div>
              <div className="text-slate-400">Traitement en cours...</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}