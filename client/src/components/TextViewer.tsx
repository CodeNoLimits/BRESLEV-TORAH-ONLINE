import { useState, useEffect } from 'react';
import { SefariaText, Language } from '../types';

interface TextViewerProps {
  selectedText: SefariaText | null;
  onClose: () => void;
  language: Language;
}

export const TextViewer = ({ selectedText, onClose, language }: TextViewerProps) => {
  const [displayLanguage, setDisplayLanguage] = useState<'en' | 'he' | 'fr'>('en');

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
      // For French mode, show a simplified note - the AI will handle translation
      if (selectedText.text.length === 0) {
        return "Texte non disponible pour cette section";
      }
      return `📖 ${selectedText.text.length} segments de texte chargés\n\n✨ L'IA traduira automatiquement ce texte en français lors de l'analyse spirituelle.\n\nCliquez sur "Analyser ce texte" pour obtenir la traduction complète et l'analyse selon les enseignements de Rabbi Nahman.`;
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
      
      <div className="bg-slate-800 rounded-lg p-4 max-h-60 overflow-y-auto">
        <div 
          className={`leading-relaxed text-slate-300 ${
            displayLanguage === 'he' ? 'text-right font-crimson' : 'font-crimson'
          }`}
          dir={displayLanguage === 'he' ? 'rtl' : 'ltr'}
        >
          {getDisplayText().split('\n').map((paragraph, idx) => (
            <p key={idx} className="mb-4 last:mb-0">
              {paragraph}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
};
