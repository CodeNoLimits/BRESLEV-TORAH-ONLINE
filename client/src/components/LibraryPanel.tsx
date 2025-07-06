import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Book, Chapter } from '../types';
import { booksApi } from '../services/api';

interface LibraryPanelProps {
  selectedBook: Book | null;
  selectedChapter: Chapter | null;
  onBookSelect: (book: Book) => void;
  onChapterSelect: (chapter: Chapter) => void;
  isLoading?: boolean;
}

export function LibraryPanel({
  selectedBook,
  selectedChapter,
  onBookSelect,
  onChapterSelect,
  isLoading: globalLoading
}: LibraryPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedBooks, setExpandedBooks] = useState<Set<number>>(new Set());

  // Fetch books
  const { 
    data: books = [], 
    isLoading: booksLoading, 
    error: booksError 
  } = useQuery({
    queryKey: ['books', searchQuery],
    queryFn: () => booksApi.getBooks(searchQuery ? { q: searchQuery } : undefined),
    staleTime: 5 * 60 * 1000 // 5 minutes
  });

  // Fetch chapters for selected book
  const { 
    data: chapters = [], 
    isLoading: chaptersLoading 
  } = useQuery({
    queryKey: ['chapters', selectedBook?.id],
    queryFn: () => selectedBook ? booksApi.getChapters(selectedBook.id) : Promise.resolve([]),
    enabled: !!selectedBook
  });

  const isLoading = globalLoading || booksLoading || chaptersLoading;

  const toggleBookExpansion = (bookId: number) => {
    const newExpanded = new Set(expandedBooks);
    if (newExpanded.has(bookId)) {
      newExpanded.delete(bookId);
    } else {
      newExpanded.add(bookId);
    }
    setExpandedBooks(newExpanded);
  };

  const handleBookClick = (book: Book) => {
    onBookSelect(book);
    // Auto-expand when selected
    if (!expandedBooks.has(book.id)) {
      toggleBookExpansion(book.id);
    }
  };

  if (booksError) {
    return (
      <div className="p-4">
        <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-4">
          <p className="text-red-400 text-sm">
            Erreur lors du chargement de la bibliothèque
          </p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-2 text-sky-400 hover:text-sky-300 text-sm"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-slate-900/30">
      {/* Header */}
      <div className="p-4 border-b border-slate-800">
        <h2 className="text-lg font-semibold text-sky-400 mb-3">
          Bibliothèque Breslev
        </h2>
        
        {/* Search */}
        <div className="relative">
          <input
            type="text"
            placeholder="Rechercher un livre..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm 
                     placeholder-slate-400 focus:border-sky-500 focus:outline-none"
          />
          <svg 
            className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400"
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="p-4">
          <div className="animate-pulse space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-8 bg-slate-800 rounded"></div>
            ))}
          </div>
        </div>
      )}

      {/* Books List */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-2">
          {books.map((book) => (
            <div key={book.id} className="mb-2">
              {/* Book Item */}
              <div
                className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                  selectedBook?.id === book.id
                    ? 'bg-sky-600/20 border border-sky-500/50'
                    : 'hover:bg-slate-800/50'
                }`}
                onClick={() => handleBookClick(book)}
              >
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-slate-200 truncate">
                    {book.titleFr || book.titleEn}
                  </h3>
                  <p className="text-xs text-slate-400 truncate">
                    {book.titleHe}
                  </p>
                </div>
                
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleBookExpansion(book.id);
                  }}
                  className="ml-2 p-1 hover:bg-slate-700 rounded"
                >
                  <svg 
                    className={`w-4 h-4 text-slate-400 transition-transform ${
                      expandedBooks.has(book.id) ? 'rotate-90' : ''
                    }`}
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                          d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>

              {/* Chapters List */}
              {expandedBooks.has(book.id) && selectedBook?.id === book.id && (
                <div className="ml-4 mt-1 space-y-1">
                  {chaptersLoading ? (
                    <div className="p-2 text-slate-400 text-sm">
                      Chargement des chapitres...
                    </div>
                  ) : chapters.length > 0 ? (
                    chapters.map((chapter) => (
                      <button
                        key={chapter.id}
                        onClick={() => onChapterSelect(chapter)}
                        className={`w-full text-left p-2 rounded text-sm transition-colors ${
                          selectedChapter?.id === chapter.id
                            ? 'bg-amber-600/20 text-amber-300'
                            : 'text-slate-300 hover:bg-slate-800/30'
                        }`}
                      >
                        Chapitre {chapter.chapterNumber}
                        {chapter.titleFr && (
                          <span className="block text-xs text-slate-400 truncate">
                            {chapter.titleFr}
                          </span>
                        )}
                      </button>
                    ))
                  ) : (
                    <div className="p-2 text-slate-400 text-sm">
                      Aucun chapitre disponible
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          {/* No Results */}
          {!isLoading && books.length === 0 && (
            <div className="p-4 text-center text-slate-400">
              {searchQuery ? (
                <>
                  <p>Aucun résultat pour "{searchQuery}"</p>
                  <button
                    onClick={() => setSearchQuery('')}
                    className="mt-2 text-sky-400 hover:text-sky-300 text-sm"
                  >
                    Effacer la recherche
                  </button>
                </>
              ) : (
                <p>Aucun livre disponible</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Stats Footer */}
      <div className="p-4 border-t border-slate-800 text-xs text-slate-400">
        {books.length} livre{books.length !== 1 ? 's' : ''} disponible{books.length !== 1 ? 's' : ''}
      </div>
    </div>
  );
}