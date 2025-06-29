import React, { useState, useEffect } from 'react';
import { X, Book, ChevronRight, Search, Download } from 'lucide-react';
import { breslovComplete, type CompleteBreslovText, BRESLOV_STATS } from '../services/breslovComplete';

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

  useEffect(() => {
    if (isOpen) {
      loadAllTexts();
    }
  }, [isOpen]);

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

    setFilteredTexts(filtered.slice(0, 100)); // Limit to 100 for performance
  };

  const handleTextClick = async (text: CompleteBreslovText) => {
    console.log(`[BreslovCompleteLibrary] Selecting text: ${text.title}`);
    
    try {
      // Utiliser la référence correcte pour Sefaria
      const correctedRef = text.ref.replace(/\./g, ' ');
      console.log(`[BreslovCompleteLibrary] Using corrected ref: ${correctedRef}`);
      
      const content = await breslovComplete.getAuthenticText(correctedRef);
      if (content) {
        onTextSelect(correctedRef, text.title);
        onClose();
        console.log(`[BreslovCompleteLibrary] ✅ Successfully selected: ${text.title}`);
      } else {
        console.warn(`[BreslovCompleteLibrary] No content available for ${text.title}`);
        // Essayer avec la référence originale en fallback
        const fallbackContent = await breslovComplete.getAuthenticText(text.ref);
        if (fallbackContent) {
          onTextSelect(text.ref, text.title);
          onClose();
          console.log(`[BreslovCompleteLibrary] ✅ Fallback success: ${text.title}`);
        }
      }
    } catch (error) {
      console.error(`[BreslovCompleteLibrary] Error selecting text ${text.title}:`, error);
    }
  };

  const handleButtonClick = (text: CompleteBreslovText) => {
    console.log(`[BreslovCompleteLibrary] Button clicked: ${text.title}`);
    handleTextClick(text);
  };

  const handleTouchStart = (text: CompleteBreslovText, event: React.TouchEvent) => {
    console.log(`[BreslovCompleteLibrary] Touch started: ${text.title}`);
    event.preventDefault();
    event.stopPropagation();
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
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-slate-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search and Filters */}
        <div className="p-4 border-b border-slate-600 space-y-4">
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
                  onClick={() => handleButtonClick(text)}
                  onTouchStart={(e) => handleTouchStart(text, e)}
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

              {filteredTexts.length === 100 && texts.length > 100 && (
                <div className="text-center py-4 text-gray-400">
                  <p className="text-sm">Affichage limité à 100 résultats. Affinez votre recherche pour voir plus.</p>
                </div>
              )}
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
    </div>
  );
};