import React, { useState, useEffect } from 'react';
import { X, Book, ChevronRight, Search, Download, Database } from 'lucide-react';
import { breslovComplete, type CompleteBreslovText, BRESLOV_STATS } from '../services/breslovComplete';
import { CompleteBreslovLoader } from './CompleteBreslovLoader';
import { CompleteBreslovLibrary } from '../services/breslovBulkLoader';
import { throttle } from '../utils/throttle';

interface BreslovCompleteLibraryProps {
  isOpen: boolean;
  onClose: () => void;
  onTextSelect: (ref: string, title: string) => void;
}

export const BreslovCompleteLibrary: React.FC<BreslovCompleteLibraryProps> = ({
  isOpen,
  onClose,
  onTextSelect
}) => {
  const [texts, setTexts] = useState<CompleteBreslovText[]>([]);
  const [filteredTexts, setFilteredTexts] = useState<CompleteBreslovText[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [showBulkLoader, setShowBulkLoader] = useState(false);
  const [completeLibrary, setCompleteLibrary] = useState<CompleteBreslovLibrary | null>(null);

  useEffect(() => {
    if (isOpen && texts.length === 0) {
      // Lazy load only when opening and no texts loaded yet
      loadAllTexts();
    }
  }, [isOpen, texts.length]);

  useEffect(() => {
    filterTexts();
  }, [texts, selectedCategory, searchQuery]);

  const loadAllTexts = async () => {
    setLoading(true);
    try {
      const allTexts = await breslovComplete.getAllTexts();
      setTexts(allTexts);
      console.log(`[BreslovCompleteLibrary] Loaded ${allTexts.length} complete texts`);
    } catch (error) {
      console.error('[BreslovCompleteLibrary] Error loading texts:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterTexts = () => {
    let filtered = texts;

    if (selectedCategory !== 'all') {
      filtered = breslovComplete.getTextsByCategory(selectedCategory);
    }

    if (searchQuery) {
      filtered = breslovComplete.searchTexts(searchQuery);
    }

    setFilteredTexts(filtered); // Show all results for complete exploration
  };

  const handleTextClick = async (text: CompleteBreslovText) => {
    console.log(`[BreslovCompleteLibrary] ⚡ CLICK DETECTED: ${text.title}`);

    // Vérifier la validité AVANT toute action
    if (!text.verified || text.ref.includes('unavailable_')) {
      console.warn(`[BreslovCompleteLibrary] ❌ INVALID: ${text.title} - verified: ${text.verified}`);
      // Montrer un message d'info au lieu de fermer
      alert(`"${text.title}" n'est pas disponible sur Sefaria. Essayez Likutei Moharan, Sichot HaRan, ou Sippurei Maasiyot.`);
      return;
    }

    try {
      // Valider l'existence du contenu AVANT fermeture
      console.log(`[BreslovCompleteLibrary] Validating ref: ${text.ref}`);
      const content = await breslovComplete.getAuthenticText(text.ref);

      if (!content || (content.error && !content.text)) {
        console.warn(`[BreslovCompleteLibrary] ❌ NO CONTENT: ${text.title}`);
        alert(`Le texte "${text.title}" n'est pas accessible. Essayez les textes principaux disponibles.`);
        return;
      }

      // Fermer SEULEMENT après validation réussie
      onClose();
      onTextSelect(text.ref, text.title);
      console.log(`[BreslovCompleteLibrary] ✅ Successfully selected: ${text.title}`);

    } catch (error) {
      console.error(`[BreslovCompleteLibrary] Error validating ${text.title}:`, error);
      alert(`Erreur lors du chargement de "${text.title}". Essayez un autre texte.`);
    }
  };

  const handleButtonInteraction = (text: CompleteBreslovText, eventType: string) => {
    console.log(`[BreslovCompleteLibrary] ${eventType} interaction: ${text.title}`);
    handleTextClick(text);
  };

  const categories = breslovComplete.getCategories();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex">
      <div className="bg-slate-800 w-full max-w-2xl h-full overflow-y-auto">
        <div className="p-4 border-b border-slate-600 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Book className="w-5 h-5" />
              Collection Breslov Complète
            </h2>
            <p className="text-sm text-gray-400 mt-1">
              {BRESLOV_STATS.totalTexts} textes • {BRESLOV_STATS.estimatedWords.toLocaleString()} mots estimés
              {completeLibrary && (
                <span className="text-green-400 ml-2">
                  • {completeLibrary.metadata.totalSegments.toLocaleString()} segments chargés
                </span>
              )}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-slate-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Bulk Loader and Search */}
        <div className="p-4 border-b border-slate-600 space-y-4">
          <div className="flex gap-3">
            {!completeLibrary && (
              <button
                onClick={() => setShowBulkLoader(true)}
                className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg 
                           flex items-center gap-2 transition-colors font-medium"
              >
                <Database className="w-4 h-4" />
                Charger TOUS les Segments
              </button>
            )}

            {completeLibrary && (
              <div className="flex items-center gap-2 text-sm">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <span className="text-green-400 font-medium">
                  {completeLibrary.metadata.totalSegments.toLocaleString()} segments disponibles
                </span>
              </div>
            )}
          </div>

          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher dans tous les textes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-amber-400"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                selectedCategory === 'all'
                  ? 'bg-amber-400 text-black'
                  : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
              }`}
            >
              Tous ({BRESLOV_STATS.totalTexts})
            </button>
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                  selectedCategory === category
                    ? 'bg-amber-400 text-black'
                    : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                }`}
              >
                {category} ({BRESLOV_STATS.categories[category as keyof typeof BRESLOV_STATS.categories]})
              </button>
            ))}
          </div>
        </div>

        <div className="p-4">
          {loading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-amber-400"></div>
              <p className="mt-2 text-gray-400">Chargement de la collection complète...</p>
              {loadingProgress > 0 && (
                <p className="text-sm text-gray-500 mt-1">
                  {loadingProgress}% complété
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-gray-400 mb-4">
                {filteredTexts.length} textes affichés • Contenus intégraux authentiques de Sefaria
              </p>

              {filteredTexts.map((text, index) => (
                <button
                  key={text.ref}
                  onClick={() => handleButtonInteraction(text, "CLICK")}
                  onTouchEnd={() => handleButtonInteraction(text, "TOUCH")}
                  className="w-full text-left p-3 rounded-lg bg-slate-700 hover:bg-slate-600 
                           transition-colors group border border-slate-600 hover:border-amber-400
                           touch-target mobile-touch-optimize"
                  style={{ 
                    minHeight: '60px',
                    WebkitTapHighlightColor: 'rgba(251, 191, 36, 0.3)',
                    cursor: 'pointer'
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium text-white group-hover:text-amber-400 transition-colors">
                        {text.title}
                      </h3>
                      <p className="text-sm text-gray-400 mt-1 font-hebrew">
                        {text.hebrewTitle}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs bg-slate-600 text-gray-300 px-2 py-1 rounded">
                          {text.category}
                        </span>
                        {text.verified && (
                          <span className="text-xs bg-green-600 text-white px-2 py-1 rounded">
                            Vérifié
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-amber-400 transition-colors flex-shrink-0" />
                  </div>
                </button>
              ))}

              {filteredTexts.length === 0 && !loading && (
                <div className="text-center py-8 text-gray-400">
                  <Book className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Aucun texte trouvé pour cette recherche</p>
                </div>
              )}

              {/* Removed 100 results limit message to allow full exploration */}
            </div>
          )}
        </div>

        {/* Statistics Footer */}
        <div className="border-t border-slate-600 p-4 bg-slate-900">
          <h4 className="text-sm font-medium text-white mb-2">Statistiques de la collection</h4>
          <div className="grid grid-cols-2 gap-4 text-xs text-gray-400">
            <div>
              <p>Likutei Moharan: {BRESLOV_STATS.categories["Likutei Moharan"]} textes</p>
              <p>Sichot HaRan: {BRESLOV_STATS.categories["Sichot HaRan"]} textes</p>
              <p>Sippurei Maasiyot: {BRESLOV_STATS.categories["Sippurei Maasiyot"]} textes</p>
            </div>
            <div>
              <p>Likutei Tefilot: {BRESLOV_STATS.categories["Likutei Tefilot"]} textes</p>
              <p>Sefer HaMiddot: {BRESLOV_STATS.categories["Sefer HaMiddot"]} textes</p>
              <p>Total: {BRESLOV_STATS.totalTexts} textes</p>
            </div>
          </div>
        </div>
      </div>

      {/* Complete Library Bulk Loader */}
      <CompleteBreslovLoader
        isOpen={showBulkLoader}
        onClose={() => setShowBulkLoader(false)}
        onLibraryLoaded={(library) => {
          setCompleteLibrary(library);
          console.log(`[BreslovCompleteLibrary] Complete library loaded: ${library.metadata.totalSegments} segments`);
        }}
      />
    </div>
  );
};