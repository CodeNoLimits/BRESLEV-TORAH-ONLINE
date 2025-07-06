import React, { useState, useRef } from 'react';
import { Mic, MicOff, Volume2, VolumeX, Search } from 'lucide-react';

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

export function ChayeiMoharanSimple() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isTTSActive, setIsTTSActive] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // TTS ULTRA-ROBUSTE - SOLUTION COMPLEXE SIMPLIFIÉE
  const speak = (text: string) => {
    if (!text || !text.trim()) {
      console.warn('[TTS] Texte vide, pas de lecture');
      return;
    }

    // Nettoyer le texte (supprimer markdown, étoiles, etc.)
    const cleanText = text
      .replace(/\*\*([^*]+)\*\*/g, '$1') // **bold** -> bold
      .replace(/\*([^*]+)\*/g, '$1')     // *italic* -> italic
      .replace(/#+\s/g, '')              // ## titre -> titre
      .replace(/\n{2,}/g, '. ')          // doubles sauts -> point
      .replace(/\n/g, ' ')               // sauts simples -> espace
      .trim();

    if ('speechSynthesis' in window) {
      // ARRÊT FORCÉ
      window.speechSynthesis.cancel();
      
      // Attendre que les voix soient chargées
      const speakWithVoices = () => {
        const voices = window.speechSynthesis.getVoices();
        console.log('[TTS] Voix disponibles:', voices.length);
        
        if (voices.length === 0) {
          console.warn('[TTS] Aucune voix trouvée, retry dans 500ms...');
          setTimeout(speakWithVoices, 500);
          return;
        }

        // Chercher voix française
        let selectedVoice = voices.find(voice => 
          voice.lang.startsWith('fr') && voice.localService
        ) || voices.find(voice => 
          voice.lang.startsWith('fr')
        ) || voices[0];

        console.log('[TTS] Voix sélectionnée:', selectedVoice?.name, selectedVoice?.lang);

        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.voice = selectedVoice;
        utterance.lang = 'fr-FR';
        utterance.rate = 0.8;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;
        
        utterance.onstart = () => {
          setIsTTSActive(true);
          console.log('[TTS] ✅ DÉMARRAGE CONFIRMÉ:', cleanText.substring(0, 50));
        };
        
        utterance.onend = () => {
          setIsTTSActive(false);
          console.log('[TTS] ✅ FIN CONFIRMÉE');
        };
        
        utterance.onerror = (event) => {
          setIsTTSActive(false);
          console.error('[TTS] ❌ ERREUR TTS:', event.error);
          
          // Fallback avec voix par défaut
          if (selectedVoice && selectedVoice !== voices[0]) {
            console.log('[TTS] Tentative avec voix par défaut...');
            utterance.voice = voices[0];
            setTimeout(() => window.speechSynthesis.speak(utterance), 100);
          }
        };

        utteranceRef.current = utterance;
        
        // PARLER MAINTENANT
        window.speechSynthesis.speak(utterance);
        
        // Vérification robuste
        let checkCount = 0;
        const checkSpeaking = () => {
          checkCount++;
          if (!window.speechSynthesis.speaking && checkCount < 5) {
            console.warn(`[TTS] ⚠️ Retry ${checkCount}/5...`);
            window.speechSynthesis.speak(utterance);
            setTimeout(checkSpeaking, 200);
          } else if (checkCount >= 5) {
            console.error('[TTS] ❌ ÉCHEC APRÈS 5 TENTATIVES');
            setIsTTSActive(false);
            
            // Dernier recours : TTS Cloud fallback
            fallbackCloudTTS(cleanText);
          }
        };
        
        setTimeout(checkSpeaking, 300);
      };

      // Démarrer avec chargement voix
      if (window.speechSynthesis.getVoices().length > 0) {
        speakWithVoices();
      } else {
        window.speechSynthesis.onvoiceschanged = speakWithVoices;
        setTimeout(speakWithVoices, 1000); // Timeout sécurité
      }
      
    } else {
      console.error('[TTS] ❌ Speech Synthesis non supporté');
      fallbackCloudTTS(cleanText);
    }
  };

  // FALLBACK CLOUD TTS
  const fallbackCloudTTS = async (text: string) => {
    try {
      console.log('[TTS] Tentative Cloud TTS fallback...');
      setIsTTSActive(true);
      
      const response = await fetch('/api/tts/speak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          text: text.substring(0, 500), // Limiter pour Cloud TTS
          lang: 'fr-FR' 
        })
      });

      if (response.ok) {
        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        
        audio.onplay = () => console.log('[TTS] ✅ Cloud TTS démarré');
        audio.onended = () => {
          setIsTTSActive(false);
          URL.revokeObjectURL(audioUrl);
          console.log('[TTS] ✅ Cloud TTS terminé');
        };
        audio.onerror = () => {
          setIsTTSActive(false);
          console.error('[TTS] ❌ Erreur Cloud TTS');
        };
        
        await audio.play();
      } else {
        throw new Error('Cloud TTS non disponible');
      }
    } catch (error) {
      console.error('[TTS] ❌ Fallback échoué:', error);
      setIsTTSActive(false);
      alert('Impossible de lire le texte. Vérifiez vos paramètres audio.');
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

        {/* Barre de recherche */}
        <div className="flex gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Posez votre question spirituelle sur Chayei Moharan..."
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
        
        {/* Vue Recherche Principale */}
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
                  🎯 Réponse spirituelle (Chayei Moharan)
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

                {/* Citations traduites */}
                {searchResult.translatedCitations && searchResult.translatedCitations.length > 0 && (
                  <div className="mt-6 space-y-4">
                    <h4 className="text-md font-bold text-amber-400">📖 Citations avec traductions:</h4>
                    
                    {searchResult.translatedCitations.map((citation, index) => (
                      <div key={index} className="bg-slate-700 p-4 rounded border-l-4 border-amber-500">
                        <div className="text-xs text-amber-300 mb-2">
                          {citation.reference} - Chapitre {citation.chapterNumber}
                        </div>
                        
                        <div className="text-right mb-2 font-mono text-amber-100 leading-relaxed">
                          {citation.hebrewText}
                        </div>
                        
                        <div className="text-slate-200 italic leading-relaxed">
                          {citation.frenchTranslation}
                        </div>

                        <div className="flex gap-2 mt-3">
                          <button
                            onClick={() => speak(citation.frenchTranslation)}
                            className="px-3 py-1 bg-amber-600 hover:bg-amber-700 rounded text-xs"
                          >
                            🔊 Lire en français
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Interface d'accueil si pas de recherche */}
          {!searchResult && !isLoading && (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📖</div>
              <h2 className="text-2xl font-bold text-amber-400 mb-4">
                Compagnon Spirituel - Chayei Moharan
              </h2>
              <p className="text-slate-300 mb-6 max-w-2xl mx-auto">
                Posez vos questions spirituelles et recevez des réponses authentiques 
                basées sur les enseignements de Rabbi Nahman dans Chayei Moharan, 
                avec citations en hébreu et traductions françaises.
              </p>
              <div className="flex gap-4 justify-center">
                <button
                  onClick={startListening}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium"
                >
                  🎤 Parler
                </button>
                <button
                  onClick={() => setSearchQuery("Parle-moi de la joie selon Rabbi Nahman")}
                  className="px-6 py-3 bg-amber-600 hover:bg-amber-700 rounded-lg font-medium"
                >
                  💫 Question d'exemple
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}