import React from 'react';
import { Volume2, ChevronRight, Loader2 } from 'lucide-react';
import { useLazyTranslate } from '../hooks/useLazyTranslate';

interface OptimizedTextDisplayProps {
  selectedText: {
    ref: string;
    title: string;
    text: string[]; // Anglais
    he: string[];   // Hébreu
  };
  onTTSSpeak: (text: string) => void;
  isTTSSpeaking: boolean;
  language: 'en' | 'fr' | 'he';
  onTextSelection?: (selectedText: string) => void;
}

export const OptimizedTextDisplay: React.FC<OptimizedTextDisplayProps> = ({ 
  selectedText, 
  onTTSSpeak, 
  isTTSSpeaking, 
  language, 
  onTextSelection 
}) => {
  // Traduction paresseuse en français avec clé unique pour forcer reset
  const englishText = selectedText.text.join('\n\n');
  const textKey = `${selectedText.ref}-${englishText.length}`; // Clé unique pour chaque texte
  
  console.log(`[OptimizedTextDisplay] NEW TEXT: ${selectedText.ref} (${englishText.length} chars)`);
  
  const {
    frenchText,
    isTranslating: isTranslatingFrench,
    translateChunk,
    hasMore,
    progress,
    reset
  } = useLazyTranslate(englishText, 1000);

  // Force reset quand le texte change
  React.useEffect(() => {
    console.log(`[OptimizedTextDisplay] Text changed, forcing translation reset`);
    reset();
  }, [textKey, reset]);

  const handleTextSelection = () => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim()) {
      const selectedString = selection.toString().trim();
      console.log('[OptimizedTextDisplay] Text selected:', selectedString.substring(0, 50) + '...');
      if (onTextSelection) {
        onTextSelection(selectedString);
      }
    }
  };

  if (!selectedText || !selectedText.text) {
    return (
      <div className="p-6 text-center text-slate-400">
        <p>Sélectionnez un texte dans la bibliothèque pour commencer</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="border-b border-slate-700 pb-4">
        <h2 className="text-xl font-bold text-amber-400 mb-2">
          {selectedText.title}
        </h2>
        <p className="text-sm text-slate-400">
          Référence: {selectedText.ref}
        </p>
      </div>

      {/* Affichage multilingue avec onglets */}
      <div className="space-y-4">
        {/* Texte hébreu */}
        {selectedText.he && selectedText.he.length > 0 && (
          <div className="bg-slate-800/50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-blue-400 mb-3 flex items-center justify-between">
              <span className="flex items-center">
                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 715 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd"></path>
                </svg>
                טקסט מקורי (עברית)
              </span>
              <button
                onClick={() => onTTSSpeak(selectedText.he.join(' '), 'he-IL')}
                className="text-blue-500 hover:text-blue-400 transition-colors flex items-center gap-1"
                title="Lire en hébreu"
              >
                <Volume2 className="w-4 h-4" />
                <span className="text-xs">HE</span>
              </button>
            </h4>
            <div 
              className="max-h-[60vh] overflow-y-auto cursor-text"
              onMouseUp={handleTextSelection}
            >
              <div className="font-hebrew leading-relaxed text-slate-200 whitespace-pre-wrap text-right text-lg" dir="rtl">
                {selectedText.he.join('\n\n')}
              </div>
            </div>
          </div>
        )}

        {/* Texte anglais */}
        {selectedText.text && selectedText.text.length > 0 && (
          <div className="bg-slate-800/50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-green-400 mb-3 flex items-center justify-between">
              <span className="flex items-center">
                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd"></path>
                </svg>
                English Translation
              </span>
              <button
                onClick={() => onTTSSpeak(selectedText.text.join(' '), 'en-US')}
                className="text-green-500 hover:text-green-400 transition-colors flex items-center gap-1"
                title="Lire en anglais"
              >
                <Volume2 className="w-4 h-4" />
                <span className="text-xs">EN</span>
              </button>
            </h4>
            <div 
              className="max-h-[60vh] overflow-y-auto cursor-text"
              onMouseUp={handleTextSelection}
            >
              <div className="leading-relaxed text-slate-200 whitespace-pre-wrap">
                {selectedText.text.join('\n\n')}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Texte original (English) */}
      {language === 'en' && (
        <div>
          <h4 className="text-sm font-medium text-blue-400 mb-2 flex items-center">
            <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd"></path>
            </svg>
            Original Text (English)
            <button
              onClick={() => onTTSSpeak(frenchText || "Traduction française en cours...")}
              className="ml-2 text-blue-500 hover:text-blue-400 transition-colors"
            >
              <Volume2 className="w-4 h-4" />
            </button>
          </h4>
          <div 
            className="max-h-[60vh] overflow-y-auto cursor-text"
            onMouseUp={handleTextSelection}
          >
            <div className="font-serif leading-relaxed text-slate-200 whitespace-pre-wrap">
              {englishText}
            </div>
          </div>
        </div>
      )}

      {/* Texte hébreu */}
      {language === 'he' && selectedText.he && selectedText.he.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-blue-400 mb-2 flex items-center">
            <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd"></path>
            </svg>
            טקסט מקורי (עברית)
            <button
              onClick={() => onTTSSpeak(frenchText || "Traduction française en cours...")}
              className="ml-2 text-blue-500 hover:text-blue-400 transition-colors"
            >
              <Volume2 className="w-4 h-4" />
            </button>
          </h4>
          <div 
            className="max-h-[60vh] overflow-y-auto cursor-text"
            onMouseUp={handleTextSelection}
          >
            <div className="font-hebrew leading-relaxed text-slate-200 whitespace-pre-wrap text-right" dir="rtl">
              {selectedText.he.join('\n\n')}
            </div>
          </div>
        </div>
      )}

      {/* Traduction française avec chargement progressif */}
      {(language === 'fr' || language === 'en') && (
        <div className="mt-6">
          <h4 className="text-sm font-medium text-amber-400 mb-2 flex items-center">
            <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M7 4a3 3 0 6 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd"></path>
            </svg>
            Traduction française
            {onTTSSpeak && frenchText && (
              <button
                onClick={() => onTTSSpeak(frenchText)}
                className="ml-2 text-amber-500 hover:text-amber-400 transition-colors"
              >
                <Volume2 className="w-4 h-4" />
              </button>
            )}
          </h4>

          <div className="max-h-[60vh] overflow-y-auto">
            <div className="font-crimson leading-relaxed text-slate-200 whitespace-pre-wrap">
              {frenchText}
            </div>
          </div>

          {hasMore && (
            <div className="mt-3 flex justify-center">
              <button
                onClick={translateChunk}
                disabled={isTranslatingFrench}
                className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-all
                  ${isTranslatingFrench 
                    ? 'bg-slate-700 text-slate-400 cursor-not-allowed' 
                    : 'bg-amber-600 hover:bg-amber-500 text-white hover:scale-105'
                  }`}
              >
                {isTranslatingFrench ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Traduction...</span>
                  </>
                ) : (
                  <>
                    <ChevronRight size={16} />
                    <span>Suite des 1 000 suivants</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};