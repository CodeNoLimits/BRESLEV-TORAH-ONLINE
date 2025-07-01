import React, { useState, useEffect } from 'react';
import { X, Book, ChevronRight } from 'lucide-react';
import { breslovDirect, type BreslovText } from '../services/breslovDirect';

interface BreslovLibraryDirectProps {
  isOpen: boolean;
  onClose: () => void;
  onTextSelect: (ref: string, title: string) => void;
}

export const BreslovLibraryDirect: React.FC<BreslovLibraryDirectProps> = ({
  isOpen,
  onClose,
  onTextSelect
}) => {
  const [texts, setTexts] = useState<BreslovText[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadTexts();
    }
  }, [isOpen]);

  const loadTexts = async () => {
    setLoading(true);
    try {
      const availableTexts = breslovDirect.getAvailableTexts();
      setTexts(availableTexts);
      console.log(`[BreslovLibraryDirect] Loaded ${availableTexts.length} texts`);
    } catch (error) {
      console.error('[BreslovLibraryDirect] Error loading texts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTextClick = async (text: BreslovText) => {
    try {
      const content = await breslovDirect.getAuthenticText(text.ref);
      if (content) {
        onTextSelect(text.ref, text.title);
        onClose();
      } else {
        console.warn(`[BreslovLibraryDirect] No content available for ${text.title}`);
      }
    } catch (error) {
      console.error(`[BreslovLibraryDirect] Error selecting text ${text.title}:`, error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex">
      <div className="bg-slate-800 w-full max-w-md h-full overflow-y-auto">
        <div className="p-4 border-b border-slate-600 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Book className="w-5 h-5" />
            Bibliothèque authentique Breslov
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-slate-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4">
          {loading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-amber-400"></div>
              <p className="mt-2 text-gray-400">Chargement des textes authentiques...</p>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-gray-400 mb-4">
                {texts.length} textes Breslov vérifiés • Contenus intégraux de Sefaria
              </p>
              
              {texts.map((text, index) => (
                <button
                  key={text.ref}
                  onClick={() => handleTextClick(text)}
                  className="w-full text-left p-3 rounded-lg bg-slate-700 hover:bg-slate-600 
                           transition-colors group border border-slate-600 hover:border-amber-400"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-white group-hover:text-amber-400 transition-colors">
                        {text.title}
                      </h3>
                      <p className="text-sm text-gray-400 mt-1 font-hebrew">
                        {text.hebrewTitle}
                      </p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-amber-400 transition-colors" />
                  </div>
                </button>
              ))}
              
              {texts.length === 0 && !loading && (
                <div className="text-center py-8 text-gray-400">
                  <Book className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Aucun texte disponible</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};