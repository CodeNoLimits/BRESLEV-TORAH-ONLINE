import { useState, useEffect } from 'react';
import { SefariaText, Language } from '../types';

interface TextViewerProps {
  selectedText: SefariaText | null;
  onClose: () => void;
  language: Language;
}

export const TextViewer = ({ selectedText, onClose, language }: TextViewerProps) => {
  const [displayLanguage, setDisplayLanguage] = useState<'en' | 'he' | 'fr'>('en');
  const [showFullText, setShowFullText] = useState(false);

  // Automatically set display language based on user's interface language
  useEffect(() => {
    if (language === 'fr') {
      setDisplayLanguage('fr');
    } else if (language === 'he') {
      setDisplayLanguage('he');
    } else {
      setDisplayLanguage('en');
    }
  }, [language]);

  if (!selectedText) return null;

  const getDisplayText = () => {
    if (displayLanguage === 'he') {
      if (selectedText.he.length === 0) {
        return "Texte hébreu non disponible pour cette section";
      }
      return selectedText.he.join('\n\n');
    }
    
    if (displayLanguage === 'fr') {
      // Show the actual English text that will be translated by AI
      if (selectedText.text.length === 0) {
        return "Texte non disponible pour cette section";
      }
      return selectedText.text.join('\n\n');
    }
    
    // English
    if (selectedText.text.length === 0) {
      return "Text not available for this section";
    }
    return selectedText.text.join('\n\n');
  };

  const languageLabels = {
    en: 'English',
    he: 'עברית',
    fr: 'Français'
  };

  return (
    <div className="bg-slate-850 border-b border-slate-700 p-6 animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-crimson font-semibold text-amber-400">
          {selectedText.title}
        </h3>
        <div className="flex items-center space-x-2">
          <button
            className="px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded text-sm transition-colors"
            onClick={() => {
              if (displayLanguage === 'fr') {
                setDisplayLanguage('he');
              } else if (displayLanguage === 'he') {
                setDisplayLanguage('en');
              } else {
                setDisplayLanguage('fr');
              }
            }}
          >
            {languageLabels[displayLanguage]}
          </button>
          <button
            className="text-slate-400 hover:text-red-400 transition-colors"
            onClick={onClose}
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"></path>
            </svg>
          </button>
        </div>
      </div>
      
      <div className="mb-4 flex justify-between items-center">
        <div className="text-sm text-amber-400">
          {selectedText.text.length} segments de texte authentique • {displayLanguage === 'he' ? 'עברית' : displayLanguage === 'fr' ? 'Français (traduit de l\'anglais)' : 'English'}
        </div>
        <button
          onClick={() => setShowFullText(!showFullText)}
          className="px-3 py-1 bg-amber-600 hover:bg-amber-500 text-black rounded text-sm font-medium transition-colors"
        >
          {showFullText ? 'Réduire' : 'Texte complet'}
        </button>
      </div>

      <div className={`bg-slate-800 rounded-lg p-4 overflow-y-auto ${showFullText ? 'max-h-screen' : 'max-h-96'}`}>
        <div 
          className={`leading-relaxed text-slate-300 ${
            displayLanguage === 'he' ? 'text-right font-crimson text-lg' : 'font-crimson'
          }`}
          dir={displayLanguage === 'he' ? 'rtl' : 'ltr'}
        >
          {displayLanguage === 'he' ? (
            selectedText.he.slice(0, showFullText ? selectedText.he.length : 3).map((segment, idx) => (
              <p key={idx} className="mb-6 last:mb-0 border-b border-slate-700 pb-4 last:border-b-0">
                {segment}
              </p>
            ))
          ) : (
            selectedText.text.slice(0, showFullText ? selectedText.text.length : 3).map((segment, idx) => (
              <p key={idx} className="mb-6 last:mb-0 border-b border-slate-700 pb-4 last:border-b-0">
                {segment}
              </p>
            ))
          )}
          
          {!showFullText && (selectedText.text.length > 3 || selectedText.he.length > 3) && (
            <div className="text-center py-4 text-slate-400 italic">
              ... {(displayLanguage === 'he' ? selectedText.he.length : selectedText.text.length) - 3} segments supplémentaires disponibles
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
