import { useState, useRef, useEffect } from 'react';

interface SearchResult {
  answer: string;
  sources: string[];
  relevantChunks?: Array<{
    id: string;
    content: string;
    startLine: number;
    endLine: number;
    keywords: string[];
  }>;
  foundInDocument?: boolean;
  // Anciens champs pour la compatibilité
  relevantSections?: Array<{
    id: string;
    title: string;
    content: string;
    sectionType: string;
  }>;
  directCitations?: Array<{
    text: string;
    source: string;
    context: string;
  }>;
}

export default function AppFrench() {
  const [question, setQuestion] = useState('');
  const [result, setResult] = useState<SearchResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const recognition = useRef<any>(null);

  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognition.current = new SpeechRecognition();
      recognition.current.continuous = false;
      recognition.current.interimResults = false;
      recognition.current.lang = 'fr-FR';

      recognition.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setQuestion(transcript);
        console.log('[STT] ✅ Transcription:', transcript);
        setIsListening(false);
        handleSearch(transcript);
      };

      recognition.current.onerror = (event: any) => {
        console.error('[STT] ❌ Erreur:', event.error);
        setIsListening(false);
      };

      recognition.current.onend = () => {
        setIsListening(false);
        console.log('[STT] ✅ Écoute terminée');
      };
    }
  }, []);

  const startListening = () => {
    if (recognition.current) {
      setIsListening(true);
      setError(null);
      recognition.current.start();
      console.log('[STT] ✅ Écoute démarrée');
    }
  };

  const speak = (text: string) => {
    if ('speechSynthesis' in window) {
      setIsSpeaking(true);
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'fr-FR';
      utterance.rate = 0.9;
      
      // Nettoyer le texte pour la lecture
      const cleanText = text
        .replace(/\*\*/g, '')
        .replace(/\*/g, '')
        .replace(/\n+/g, '. ')
        .replace(/\s+/g, ' ')
        .trim();

      utterance.text = cleanText;
      
      utterance.onend = () => {
        setIsSpeaking(false);
        console.log('[TTS] ✅ Lecture terminée');
      };

      utterance.onerror = (event) => {
        console.error('[TTS] ❌ Erreur:', event.error);
        setIsSpeaking(false);
      };

      speechSynthesis.speak(utterance);
      console.log('[TTS] ✅ Démarrage lecture');
    }
  };

  const stopSpeaking = () => {
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel();
      setIsSpeaking(false);
      console.log('[TTS] ✅ Lecture arrêtée');
    }
  };

  const handleSearch = async (searchQuestion?: string) => {
    const queryText = searchQuestion || question;
    if (!queryText.trim()) return;

    setIsLoading(true);
    setError(null);
    console.log(`[ChayeiMoharan-FR] Recherche: "${queryText}"`);

    try {
      const response = await fetch('/api/chayei-moharan-french/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ question: queryText }),
      });

      if (!response.ok) {
        throw new Error(`Erreur ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setResult(data);
      console.log('[ChayeiMoharan-FR] Résultat reçu:', data);

      // Lecture automatique de la réponse
      if (data.answer) {
        speak(data.answer);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue';
      setError(errorMessage);
      console.error('[ChayeiMoharan-FR] Erreur:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearch();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 text-white">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-amber-300 to-blue-300 bg-clip-text text-transparent">
            Chayei Moharan
          </h1>
          <p className="text-slate-300 text-lg">
            Document français authentique - Questions et réponses spirituelles
          </p>
        </div>

        {/* Interface de recherche */}
        <div className="max-w-4xl mx-auto">
          <form onSubmit={handleSubmit} className="mb-6">
            <div className="flex gap-2">
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Posez votre question sur Chayei Moharan..."
                className="flex-1 px-4 py-3 bg-slate-800/50 border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-slate-400"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={isLoading || !question.trim()}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded-lg font-medium transition-colors"
              >
                {isLoading ? 'Recherche...' : 'Chercher'}
              </button>
              <button
                type="button"
                onClick={startListening}
                disabled={isListening || isLoading}
                className={`px-4 py-3 rounded-lg font-medium transition-colors ${
                  isListening 
                    ? 'bg-red-600 text-white' 
                    : 'bg-green-600 hover:bg-green-700 text-white'
                }`}
              >
                {isListening ? '🎤 Écoute...' : '🎤'}
              </button>
            </div>
          </form>

          {/* Contrôles TTS */}
          {result && (
            <div className="mb-4 text-center">
              <button
                onClick={() => speak(result.answer)}
                disabled={isSpeaking}
                className="mr-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 rounded-lg font-medium transition-colors"
              >
                {isSpeaking ? '🔊 En cours...' : '🔊 Écouter'}
              </button>
              {isSpeaking && (
                <button
                  onClick={stopSpeaking}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg font-medium transition-colors"
                >
                  ⏹️ Arrêter
                </button>
              )}
            </div>
          )}

          {/* Erreur */}
          {error && (
            <div className="mb-6 p-4 bg-red-900/50 border border-red-700 rounded-lg">
              <p className="text-red-200">❌ {error}</p>
            </div>
          )}

          {/* Résultats */}
          {result && (
            <div className="space-y-6">
              {/* Indicateur de statut */}
              <div className="flex items-center gap-3 bg-slate-800/50 border border-slate-600 rounded-lg p-4">
                <div className={`w-4 h-4 rounded-full ${result.foundInDocument ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                <span className="font-medium text-slate-200">
                  {result.foundInDocument ? 
                    '✓ Information trouvée dans le document' : 
                    '⚠ Information non trouvée directement dans le document'}
                </span>
              </div>

              {/* Réponse principale */}
              <div className="bg-slate-800/50 border border-slate-600 rounded-lg p-6">
                <h2 className="text-xl font-semibold mb-4 text-amber-300">Réponse</h2>
                <div className="prose prose-invert max-w-none">
                  <div className="whitespace-pre-wrap text-slate-100 leading-relaxed">
                    {result.answer}
                  </div>
                </div>
              </div>

              {/* Citations directes */}
              {result.directCitations && result.directCitations.length > 0 && (
                <div className="bg-slate-800/50 border border-slate-600 rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-4 text-blue-300">Citations directes du document</h3>
                  <div className="space-y-3">
                    {result.directCitations.slice(0, 5).map((citation, index) => (
                      <div key={index} className="border-l-4 border-amber-500 pl-4 py-2">
                        <p className="text-slate-200 italic">"{citation.text}"</p>
                        <p className="text-sm text-slate-400 mt-1">— {citation.source}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Chunks pertinents (nouveau format) */}
              {result.relevantChunks && result.relevantChunks.length > 0 && (
                <div className="bg-slate-800/50 border border-slate-600 rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-4 text-green-300">
                    Passages pertinents trouvés ({result.relevantChunks.length})
                  </h3>
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {result.relevantChunks.slice(0, 5).map((chunk, index) => (
                      <div key={index} className="border border-slate-700 rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-sm text-slate-400">
                            📍 Lignes {chunk.startLine}-{chunk.endLine}
                          </span>
                          {chunk.keywords.length > 0 && (
                            <div className="flex gap-1">
                              {chunk.keywords.slice(0, 3).map((keyword, kIndex) => (
                                <span key={kIndex} className="text-xs bg-blue-900/50 px-2 py-1 rounded">
                                  {keyword}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="text-slate-300 text-sm">
                          {chunk.content.substring(0, 300)}...
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Sections pertinentes (ancien format) */}
              {result.relevantSections && result.relevantSections.length > 0 && (
                <div className="bg-slate-800/50 border border-slate-600 rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-4 text-green-300">Sections pertinentes</h3>
                  <div className="space-y-4">
                    {result.relevantSections.slice(0, 3).map((section, index) => (
                      <div key={index} className="border border-slate-700 rounded-lg p-4">
                        <h4 className="font-medium text-slate-200 mb-2">{section.title}</h4>
                        <p className="text-sm text-slate-400 mb-2">Type: {section.sectionType}</p>
                        <div className="text-slate-300 text-sm">
                          {section.content.substring(0, 300)}...
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Sources */}
              {result.sources && result.sources.length > 0 && (
                <div className="bg-slate-800/50 border border-slate-600 rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-4 text-purple-300">Sources consultées</h3>
                  <div className="flex flex-wrap gap-2">
                    {result.sources.map((source, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-purple-900/50 border border-purple-700 rounded-full text-sm text-purple-200"
                      >
                        {source}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}