import { useState, useEffect } from 'react';
import { SefariaIndexNode, Language } from '../types';
import { sefariaService } from '../services/sefaria';
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
      const texts = await sefariaService.getIndex();
      setBreslovTexts(texts);
    } catch (err) {
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
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <div className={`
        fixed md:relative top-0 left-0 h-full w-80 bg-slate-900 border-r border-slate-700 
        flex flex-col z-50 transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        {/* Sidebar Header */}
        <div className="p-6 border-b border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center">
                <i className="fas fa-heart text-white text-lg"></i>
              </div>
              <div>
                <h1 className="text-xl font-crimson font-semibold text-amber-400">
                  Le Compagnon du Cœur
                </h1>
                <p className="text-sm text-slate-400">Guide Spirituel Interactif</p>
              </div>
            </div>
            <button 
              className="md:hidden text-slate-400 hover:text-white"
              onClick={onClose}
            >
              <i className="fas fa-times"></i>
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
            <i className="fas fa-search absolute right-3 top-3 text-slate-400 text-sm"></i>
          </div>
        </div>
        
        {/* Library Navigation */}
        <div className="flex-1 overflow-y-auto sidebar-scroll p-4">
          <h2 className="text-lg font-semibold text-sky-400 mb-4 flex items-center">
            <i className="fas fa-book-open mr-2"></i>
            Bibliothèque Breslev
          </h2>
          
          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center animate-pulse">
                <i className="fas fa-heart text-white"></i>
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
            <Accordion type="multiple" className="space-y-2">
              {filteredTexts.map(category => renderTextNode(category))}
            </Accordion>
          )}
        </div>
      </div>
    </>
  );
};
