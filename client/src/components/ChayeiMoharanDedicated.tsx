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
  translatedCitations?: Array<{
    reference: string;
    hebrewText: string;
    frenchTranslation: string;
    chapterNumber: number;
  }>;
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
  const [openTabs, setOpenTabs] = useState<Array<{id: number, chapter: number, title: string, translation: TranslationChunk | null}>>([]);
  const [activeTab, setActiveTab] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isTTSActive, setIsTTSActive] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [view, setView] = useState<'search' | 'chapters' | 'reader'>('search');
  const [error, setError] = useState<string | null>(null);

  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // TTS OPTIMISÉ ET CORRIGÉ
  const speak = (text: string) => {
    if (!text || !text.trim()) {
      console.warn('[TTS] Texte vide, pas de lecture');
      return;
    }

    if ('speechSynthesis' in window) {
      // Arrêter toute parole en cours
      window.speechSynthesis.cancel();
      
      // Délai pour éviter les conflits
      setTimeout(() => {
        const utterance = new SpeechSynthesisUtterance(text.trim());
        utterance.lang = 'fr-FR';
        utterance.rate = 0.85;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;
        
        utterance.onstart = () => {
          setIsTTSActive(true);
          console.log('[TTS] ✅ Démarrage lecture:', text.substring(0, 50));
        };
        
        utterance.onend = () => {
          setIsTTSActive(false);
          console.log('[TTS] ✅ Fin lecture');
        };
        
        utterance.onerror = (event) => {
          setIsTTSActive(false);
          console.error('[TTS] ❌ Erreur:', event.error);
        };

        utteranceRef.current = utterance;
        window.speechSynthesis.speak(utterance);
        
        // Vérification que ça démarre vraiment
        setTimeout(() => {
          if (!window.speechSynthesis.speaking) {
            console.warn('[TTS] ⚠️ TTS ne démarre pas, retry...');
            window.speechSynthesis.speak(utterance);
          }
        }, 100);
        
      }, 200);
    } else {
      console.error('[TTS] ❌ Speech Synthesis non supporté');
      alert('La synthèse vocale n\'est pas supportée sur votre navigateur');
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
      recognition.maxAlternatives = 1;

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
        
        // Délai pour éviter conflits audio
        setTimeout(() => {
          handleSearch(transcript);
        }, 300);
      };

      recognition.onerror = (event: any) => {
        setIsListening(false);
        console.error('[STT] ❌ Erreur:', event.error);
        
        if (event.error === 'not-allowed') {
          alert('Veuillez autoriser l\'accès au microphone');
        } else if (event.error === 'no-speech') {
          alert('Aucune parole détectée. Réessayez.');
        }
      };

      recognition.start();
    } else {
      alert('Reconnaissance vocale non supportée sur votre navigateur');
    }
  };

  // Charger les chapitres au démarrage
  useEffect(() => {
    loadChapters();
  }, []);

  // Protection contre les erreurs de longueur
  const safeChapters = chapters || [];
  const safeOpenTabs = openTabs || [];

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
    setError(null);
    
    try {
      console.log(`[ChayeiMoharan] Recherche Gemini: "${query}"`);
      
      const response = await fetch('/api/chayei-moharan/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: query })
      });

      const result = await response.json();
      console.log(`[ChayeiMoharan] Résultat:`, result);
      
      if (result.error) {
        setError(result.error);
        setSearchResult({
          answer: `Erreur lors de la recherche: ${result.error}`,
          sources: [],
          relevantSections: []
        });
      } else {
        setSearchResult(result);
        setView('search');
        
        // TTS automatique de la réponse
        if (result.answer) {
          setTimeout(() => {
            speak(result.answer);
          }, 500);
        }
      }

    } catch (error) {
      console.error('Erreur recherche:', error);
      setError('Erreur de connexion');
      setSearchResult({
        answer: 'Erreur de connexion lors de la recherche dans Chayei Moharan.',
        sources: [],
        relevantSections: []
      });
    }
    setIsLoading(false);
  };

  // GESTION DES ONGLETS
  const openChapterTab = (chapterNum: number) => {
    const chapter = safeChapters.find(c => c.number === chapterNum);
    if (!chapter) return;
    
    const existingTab = safeOpenTabs.find(tab => tab.chapter === chapterNum);
    if (existingTab) {
      setActiveTab(existingTab.id);
      return;
    }
    
    const newTab = {
      id: Date.now(),
      chapter: chapterNum,
      title: `Ch. ${chapterNum}`,
      translation: null
    };
    
    setOpenTabs(prev => [...prev.slice(-4), newTab]); // Max 5 onglets
    setActiveTab(newTab.id);
    loadTranslation(chapterNum, 0, newTab.id);
  };

  const closeTab = (tabId: number) => {
    setOpenTabs(prev => {
      const newTabs = prev.filter(tab => tab.id !== tabId);
      if (activeTab === tabId) {
        setActiveTab(newTabs.length > 0 ? newTabs[0].id : null);
      }
      return newTabs;
    });
  };

  // TRADUCTION LAZY d'un chapitre
  const loadTranslation = async (chapterNum: number, startChar = 0, tabId?: number) => {
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
      
      if (tabId) {
        setOpenTabs(prev => prev.map(tab => 
          tab.id === tabId ? { ...tab, translation: data } : tab
        ));
      } else {
        setCurrentTranslation(data);
        setSelectedChapter(chapterNum);
        setView('reader');
      }

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
            📚 Chapitres ({safeChapters.length})
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
          
          {safeOpenTabs.map(tab => (
            <div key={tab.id} className="flex items-center bg-slate-700 rounded">
              <button
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-2 rounded-l ${
                  activeTab === tab.id ? 'bg-amber-600' : 'hover:bg-slate-600'
                }`}
              >
                📖 {tab.title}
              </button>
              <button
                onClick={() => closeTab(tab.id)}
                className="px-2 py-2 hover:bg-red-600 rounded-r text-xs"
              >
                ✕
              </button>
            </div>
          ))}
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
        {/* Affichage d'erreur */}
        {error && (
          <div className="max-w-4xl mx-auto mb-4">
            <div className="bg-red-900 border border-red-700 text-red-100 px-4 py-3 rounded">
              <div className="font-bold">Erreur</div>
              <div className="text-sm">{error}</div>
              <button 
                onClick={() => setError(null)}
                className="mt-2 px-3 py-1 bg-red-700 hover:bg-red-600 rounded text-xs"
              >
                Fermer
              </button>
            </div>
          </div>
        )}
        
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

                  <div className="flex flex-wrap gap-3 mt-4">
                    <button
                      onClick={() => speak(searchResult.answer)}
                      disabled={isTTSActive}
                      className={`px-4 py-2 rounded text-sm font-medium ${
                        isTTSActive 
                          ? 'bg-red-600 hover:bg-red-700 animate-pulse' 
                          : 'bg-green-600 hover:bg-green-700'
                      }`}
                    >
                      {isTTSActive ? '🔊 Lecture en cours...' : '🔊 Écouter la réponse'}
                    </button>
                    
                    {isTTSActive && (
                      <button
                        onClick={stopSpeaking}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded text-sm font-medium"
                      >
                        ⏹️ Arrêter
                      </button>
                    )}
                  </div>

                  {/* Citations traduites avec boutons pour chapitres */}
                  {searchResult.translatedCitations && searchResult.translatedCitations.length > 0 && (
                    <div className="mt-6 space-y-4">
                      <h4 className="text-md font-bold text-amber-400">📖 Citations avec traductions:</h4>
                      
                      {searchResult.translatedCitations.map((citation, i) => (
                        <div key={i} className="bg-slate-700 p-4 rounded-lg border-l-4 border-amber-500">
                          <div className="flex justify-between items-start mb-3">
                            <div className="font-semibold text-amber-300">{citation.reference}</div>
                            <button
                              onClick={() => loadTranslation(citation.chapterNumber)}
                              className="px-3 py-1 bg-sky-600 hover:bg-sky-700 rounded text-xs font-medium"
                            >
                              📖 Voir chapitre complet
                            </button>
                          </div>
                          
                          <div className="space-y-3">
                            <div>
                              <div className="text-xs text-slate-400 mb-1">עברית (Hébreu):</div>
                              <div className="text-right font-serif text-sm text-slate-200" dir="rtl">
                                {citation.hebrewText}
                              </div>
                            </div>
                            
                            <div>
                              <div className="text-xs text-slate-400 mb-1">Français:</div>
                              <div className="text-sm text-slate-100 leading-relaxed">
                                {citation.frenchTranslation}
                              </div>
                            </div>
                          </div>
                          
                          <button
                            onClick={() => speak(citation.frenchTranslation)}
                            className="mt-2 px-3 py-1 bg-green-600 hover:bg-green-700 rounded text-xs font-medium"
                          >
                            🔊 Écouter traduction
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {searchResult.sources.length > 0 && (
                    <div className="mt-4 p-3 bg-slate-700 rounded">
                      <div className="text-sm text-slate-300 mb-2">Références dans Chayei Moharan:</div>
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
              📚 Tous les chapitres de Chayei Moharan ({safeChapters.length})
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {safeChapters.map((chapter) => (
                <button
                  key={chapter.number}
                  onClick={() => openChapterTab(chapter.number)}
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