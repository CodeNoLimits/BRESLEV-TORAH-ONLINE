import { useState, useEffect } from 'react';
import { Language } from '../types';
import { sefariaClient, SefariaIndexNode } from '../services/sefariaDirectClient';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onTextSelect: (ref: string, title: string) => void;
  language: Language;
}

export const Sidebar = ({ isOpen, onClose, onTextSelect, language }: SidebarProps) => {
  const [breslovTexts, setBreslovTexts] = useState<SefariaIndexNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadBreslovTexts();
  }, []);

  const loadBreslovTexts = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('[Sidebar] Loading Breslov library directly from Sefaria');
      const breslovBooks = await sefariaClient.getBreslovLibrary();
      console.log('[Sidebar] Breslov library loaded:', breslovBooks.length, 'texts with refs');
      setBreslovTexts(breslovBooks);
    } catch (err) {
      console.error('[Sidebar] Failed to load Breslov library:', err);
      setError(err instanceof Error ? err.message : 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  const renderTextNode = (node: SefariaIndexNode, level: number = 0): JSX.Element => {
    const hasChildren = node.contents && node.contents.length > 0;
    
    if (hasChildren) {
      return (
        <AccordionItem key={node.title} value={node.title} className="border-slate-700">
          <AccordionTrigger className="accordion-item rounded-lg hover:bg-slate-800 transition-colors px-3 py-2">
            <span className="font-medium text-slate-200">{node.title}</span>
          </AccordionTrigger>
          <AccordionContent className="pl-6 pb-2 space-y-1">
            {node.contents!.map(child => renderTextNode(child, level + 1))}
          </AccordionContent>
        </AccordionItem>
      );
    }

    // Leaf node - actual text
    return (
      <button
        key={node.ref || node.title}
        className="w-full text-left p-2 text-sm text-slate-400 hover:text-sky-400 transition-colors rounded block"
        onClick={() => {
          if (node.ref) {
            console.log('[Sidebar] Text selected:', node.title, node.ref);
            onTextSelect(node.ref, node.title);
          }
        }}
      >
        {node.title}
      </button>
    );
  };

  const filteredTexts = breslovTexts.filter(text =>
    text.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <div className={`
        fixed top-0 left-0 h-full w-80 bg-slate-900 border-r border-slate-700 
        flex flex-col z-50 transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Sidebar Header */}
        <div className="p-6 border-b border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd"></path>
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-crimson font-semibold text-amber-400">
                  Le Compagnon du Cœur
                </h1>
                <p className="text-sm text-slate-400">Guide Spirituel Interactif</p>
              </div>
            </div>
            <button 
              className="text-slate-400 hover:text-white"
              onClick={onClose}
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"></path>
              </svg>
            </button>
          </div>
          
          {/* Search Bar */}
          <div className="relative">
            <input
              type="text"
              placeholder="Rechercher dans la bibliothèque..."
              className="w-full px-4 py-2 bg-slate-800 border border-slate-600 rounded-lg text-sm focus:outline-none focus:border-sky-400 transition-colors"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <svg className="w-4 h-4 absolute right-3 top-3 text-slate-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd"></path>
            </svg>
          </div>
        </div>
        
        {/* Library Navigation */}
        <div className="flex-1 overflow-y-auto sidebar-scroll p-4">
          <h2 className="text-lg font-semibold text-sky-400 mb-4 flex items-center">
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z"></path>
            </svg>
            Bibliothèque Breslev
          </h2>
          
          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center animate-pulse">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd"></path>
                </svg>
              </div>
            </div>
          )}
          
          {error && (
            <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-4 mb-4">
              <p className="text-red-400 text-sm">{error}</p>
              <button
                onClick={loadBreslovTexts}
                className="mt-2 text-sky-400 hover:text-sky-300 text-sm"
              >
                Réessayer
              </button>
            </div>
          )}
          
          {!loading && !error && (
            <div className="space-y-2">
              {filteredTexts.map((book, idx) => (
                <div key={idx} className="bg-slate-800 rounded-lg border border-slate-700 hover:border-sky-500 transition-colors">
                  <button
                    className="w-full text-left p-4 text-slate-200 hover:text-sky-400 font-medium transition-colors"
                    onClick={() => {
                      console.log('[Sidebar] Book selected:', book.title, book.ref);
                      if (book.ref) {
                        onTextSelect(book.ref, book.title);
                      }
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-crimson">{book.title}</span>
                      <svg className="w-4 h-4 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd"></path>
                      </svg>
                    </div>
                    {book.ref && (
                      <div className="text-xs text-slate-500 mt-1">
                        Référence: {book.ref}
                      </div>
                    )}
                  </button>
                </div>
              ))}
              
              {filteredTexts.length === 0 && (
                <div className="text-center py-8 text-slate-400">
                  Aucun livre trouvé. Vérifiez votre recherche.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
};
