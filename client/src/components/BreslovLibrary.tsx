import { useState, useEffect } from 'react';
import { BookContents } from './BookContents';
import { BRESLOV_BOOKS_WORKING, getWorkingBooks, SefariaBook } from '../services/sefariaFix';

interface BreslovLibraryProps {
  isOpen: boolean;
  onClose: () => void;
  onTextSelect: (ref: string, title: string) => void;
}

export const BreslovLibrary = ({ isOpen, onClose, onTextSelect }: BreslovLibraryProps) => {
  const [selectedBook, setSelectedBook] = useState<{title: string, key: string} | null>(null);
  const [availableBooks, setAvailableBooks] = useState<SefariaBook[]>(BRESLOV_BOOKS_WORKING);
  const [loadingBooks, setLoadingBooks] = useState(false);

  // Vérifier les livres disponibles au chargement
  useEffect(() => {
    if (isOpen && !loadingBooks) {
      setLoadingBooks(true);
      getWorkingBooks().then(books => {
        setAvailableBooks(books);
        setLoadingBooks(false);
        console.log(`[BreslovLibrary] Loaded ${books.length} working books`);
      }).catch(error => {
        console.error('[BreslovLibrary] Error loading books:', error);
        setAvailableBooks(BRESLOV_BOOKS_WORKING); // Fallback to static list
        setLoadingBooks(false);
      });
    }
  }, [isOpen, loadingBooks]);

  // Utiliser les références corrigées
  const breslovBooks = [
    { 
      title: 'Likoutei Moharan', 
      key: 'Likutei_Moharan', 
      description: 'Torah 1-286 (Part I) + Torah 1-125 (Part II)',
      icon: '📜',
      color: 'from-amber-500 to-orange-600'
    },
    { 
      title: 'Sippurei Maasiyot', 
      key: 'Sippurei_Maasiyot', 
      description: '13 contes principaux + contes additionnels',
      icon: '📖',
      color: 'from-blue-500 to-indigo-600'
    },
    { 
      title: 'Sichot HaRan', 
      key: 'Sichot_HaRan', 
      description: '332 sections de conversations',
      icon: '💬',
      color: 'from-green-500 to-emerald-600'
    },
    { 
      title: 'Likoutei Tefilot', 
      key: 'Likutei_Tefilot', 
      description: '210 prières spirituelles',
      icon: '🙏',
      color: 'from-purple-500 to-violet-600'
    },
    { 
      title: 'Sefer HaMiddot', 
      key: 'Sefer_HaMiddot', 
      description: 'Traits de caractère et conseils moraux',
      icon: '⚖️',
      color: 'from-red-500 to-rose-600'
    },
    { 
      title: 'Likoutei Halakhot', 
      key: 'Likutei_Halakhot', 
      description: 'Lois spirituelles et halakha',
      icon: '📋',
      color: 'from-teal-500 to-cyan-600'
    },
    { 
      title: 'Likkutei Etzot', 
      key: 'Likkutei_Etzot', 
      description: 'Conseils spirituels par sujets',
      icon: '💡',
      color: 'from-yellow-500 to-amber-600'
    },
    { 
      title: 'Chayei Moharan', 
      key: 'Chayei_Moharan', 
      description: 'Biographie de Rabbi Nahman',
      icon: '👤',
      color: 'from-slate-500 to-gray-600'
    },
    { 
      title: 'Shivchei HaRan', 
      key: 'Shivchei_HaRan', 
      description: 'Éloges et récits du Rabbi',
      icon: '⭐',
      color: 'from-pink-500 to-rose-600'
    }
  ];

  const handleBookSelect = (title: string, key: string) => {
    console.log('[BreslovLibrary] Opening complete book contents:', title, key);
    setSelectedBook({ title, key });
  };

  if (!isOpen) return null;

  return (
    <>
      {/* BookContents Modal */}
      {selectedBook && (
        <BookContents 
          bookTitle={selectedBook.title}
          bookKey={selectedBook.key}
          onTextSelect={onTextSelect}
          onClose={() => setSelectedBook(null)}
        />
      )}

      {/* Main Library Modal */}
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40">
        <div className="bg-slate-800 rounded-lg w-full max-w-6xl h-5/6 flex flex-col">
          {/* Header */}
          <div className="flex justify-between items-center p-6 border-b border-slate-600">
            <div>
              <h2 className="text-3xl font-crimson font-bold text-amber-400 mb-2">
                נ נח נחמ נחמן מאומן
              </h2>
              <h3 className="text-xl font-semibold text-slate-200">Bibliothèque complète Breslov</h3>
              <p className="text-slate-400 text-sm">9 livres authentiques • Contenus intégraux de Sefaria</p>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-red-400 transition-colors"
            >
              <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"></path>
              </svg>
            </button>
          </div>

          {/* Books Grid */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {breslovBooks.map((book, index) => (
                <div 
                  key={index} 
                  className="bg-slate-700 rounded-lg p-6 border border-slate-600 hover:border-amber-500 transition-all duration-300 hover:scale-105 cursor-pointer group"
                  onClick={() => handleBookSelect(book.title, book.key)}
                >
                  <div className="text-center mb-4">
                    <div className={`w-16 h-16 mx-auto rounded-full bg-gradient-to-br ${book.color} flex items-center justify-center text-2xl mb-3 group-hover:scale-110 transition-transform`}>
                      {book.icon}
                    </div>
                    <h4 className="font-crimson font-bold text-lg text-amber-400 mb-2 group-hover:text-amber-300">
                      {book.title}
                    </h4>
                    <p className="text-sm text-slate-400 leading-relaxed">
                      {book.description}
                    </p>
                  </div>
                  
                  <div className="text-center">
                    <button className="w-full px-4 py-3 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-black rounded-lg font-semibold transition-all duration-300 group-hover:shadow-lg">
                      Accéder aux contenus →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-slate-600 text-center">
            <p className="text-sm text-slate-400">
              Cliquez sur un livre pour accéder à tous ses enseignements, puis sélectionnez un texte pour l'analyse spirituelle complète
            </p>
          </div>
        </div>
      </div>
    </>
  );
};