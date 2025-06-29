import { useState, useEffect } from 'react';
import { BookContents } from './BookContents';
import { MobileSefariaService, WORKING_BRESLOV_TEXTS } from '../services/mobileOptimized';

interface BreslovLibraryProps {
  isOpen: boolean;
  onClose: () => void;
  onTextSelect: (ref: string, title: string) => void;
}

export const BreslovLibrary = ({ isOpen, onClose, onTextSelect }: BreslovLibraryProps) => {
  const [selectedBook, setSelectedBook] = useState<{title: string, key: string} | null>(null);
  const [availableBooks, setAvailableBooks] = useState(WORKING_BRESLOV_TEXTS);
  const [loadingBooks, setLoadingBooks] = useState(false);
  const sefariaService = new MobileSefariaService();

  // Vérifier les livres disponibles au chargement
  useEffect(() => {
    if (isOpen && !loadingBooks) {
      setLoadingBooks(true);
      sefariaService.verifyTexts().then(books => {
        setAvailableBooks(books);
        setLoadingBooks(false);
        console.log(`[BreslovLibrary] Loaded ${books.length} working books`);
      }).catch(error => {
        console.error('[BreslovLibrary] Error loading books:', error);
        setAvailableBooks(WORKING_BRESLOV_TEXTS); // Fallback to static list
        setLoadingBooks(false);
      });
    }
  }, [isOpen, loadingBooks]);

  // Livres disponibles avec icônes et couleurs
  const breslovBooks = availableBooks.map(book => ({
    title: book.title,
    key: book.key,
    description: `${book.sections.length} sections disponibles`,
    icon: book.title.includes('Likutei Moharan') ? '📜' : 
          book.title.includes('Sippurei') ? '📖' :
          book.title.includes('Sichot') ? '💬' :
          book.title.includes('Tefilot') ? '🙏' : '📚',
    color: book.title.includes('Likutei Moharan') ? 'from-amber-500 to-orange-600' :
           book.title.includes('Sippurei') ? 'from-blue-500 to-indigo-600' :
           book.title.includes('Sichot') ? 'from-green-500 to-emerald-600' :
           book.title.includes('Tefilot') ? 'from-purple-500 to-violet-600' : 'from-gray-500 to-slate-600'
  }));

  const handleBookSelect = (title: string, key: string) => {
    console.log('[BreslovLibrary] Opening complete book contents:', title, key);
    setSelectedBook({ title, key });
  };

  const handleSectionSelect = (ref: string, title: string) => {
    console.log('[BreslovLibrary] Section selected:', ref, title);
    onTextSelect(ref, title);
    setSelectedBook(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-slate-800 rounded-xl w-full max-w-4xl h-[90vh] flex flex-col overflow-hidden">
        {selectedBook ? (
          <BookContents
            bookTitle={selectedBook.title}
            bookKey={selectedBook.key}
            onTextSelect={handleSectionSelect}
            onClose={() => setSelectedBook(null)}
          />
        ) : (
          <>
            <div className="flex items-center justify-between p-6 border-b border-slate-700">
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">
                  נ נח נחמ נחמן מאומן
                </h2>
                <p className="text-amber-400 font-semibold">
                  Bibliothèque complète Breslov
                </p>
                <p className="text-slate-300 text-sm">
                  {breslovBooks.length} livres authentiques • Contenus intégraux de Sefaria
                </p>
              </div>
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-white p-2"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {loadingBooks ? (
                <div className="flex items-center justify-center h-64">
                  <div className="text-center">
                    <div className="animate-spin w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                    <p className="text-slate-300">Vérification des textes authentiques...</p>
                  </div>
                </div>
              ) : breslovBooks.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">📚</div>
                  <h3 className="text-xl font-semibold text-white mb-2">
                    Aucun texte disponible
                  </h3>
                  <p className="text-slate-400">
                    Les textes Breslov ne sont pas accessibles actuellement.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {breslovBooks.map((book, index) => (
                    <div
                      key={book.key}
                      className="group relative overflow-hidden rounded-xl cursor-pointer transform transition-all duration-300 hover:scale-105"
                      onClick={() => handleBookSelect(book.title, book.key)}
                    >
                      <div className={`absolute inset-0 bg-gradient-to-br ${book.color} opacity-90 group-hover:opacity-100 transition-opacity`}></div>
                      
                      <div className="relative p-6 h-48 flex flex-col justify-between">
                        <div className="text-center">
                          <div className="text-4xl mb-3">{book.icon}</div>
                          <h3 className="text-xl font-bold text-white mb-2 leading-tight">
                            {book.title}
                          </h3>
                          <p className="text-white/80 text-sm">
                            {book.description}
                          </p>
                        </div>
                        
                        <div className="mt-4">
                          <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2 text-center">
                            <span className="text-white font-medium text-sm">
                              Accéder aux contenus →
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-8 text-center text-slate-400 text-sm">
                <p>Cliquez sur un livre pour accéder à tous ses enseignements, puis sélectionnez un texte pour l'analyse spirituelle complète</p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};