import React from 'react';
import { useLazyTranslate } from '../hooks/useLazyTranslate';

interface ReaderTextProps {
  text: string[];
  title: string;
  language: 'en' | 'fr' | 'he';
  onTextSelect?: (selectedText: string) => void;
}

export const ReaderText: React.FC<ReaderTextProps> = ({ 
  text, 
  title, 
  language,
  onTextSelect 
}) => {
  const fullText = text.join('\n\n');
  const { shown, hasMore, more, reset, progress } = useLazyTranslate(fullText, 500);
  
  const handleMouseUp = () => {
    const selection = window.getSelection();
    const selectedContent = selection?.toString().trim() || '';
    if (selectedContent && onTextSelect) {
      onTextSelect(selectedContent);
    }
  };

  const getLanguageLabel = () => {
    switch (language) {
      case 'he': return 'עברית';
      case 'fr': return 'Français (traduit de l\'anglais)';
      default: return 'English';
    }
  };

  const getTextDirection = () => language === 'he' ? 'rtl' : 'ltr';

  return (
    <div className="bg-slate-800 rounded-2xl shadow-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-slate-400">
          {title} • {getLanguageLabel()}
        </h3>
        
        {fullText.length > 500 && (
          <div className="text-xs text-slate-500">
            {progress}% affiché ({shown.length}/{fullText.length} caractères)
          </div>
        )}
      </div>

      {/* Scrollable text container with max-height 60vh */}
      <div 
        className="max-h-[60vh] overflow-y-auto p-4 rounded-2xl shadow-xl bg-slate-900 relative"
        onMouseUp={handleMouseUp}
        dir={getTextDirection()}
      >
        <div className="text-slate-200 leading-relaxed whitespace-pre-wrap select-text cursor-text">
          {language === 'fr' ? shown : fullText}
        </div>

        {/* Fade bottom indicator for scrollable content */}
        <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-slate-900 to-transparent pointer-events-none" />
      </div>

      {/* Controls for French lazy loading */}
      {language === 'fr' && (
        <div className="flex items-center justify-between mt-4">
          {hasMore && (
            <button
              onClick={more}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-black rounded-lg font-medium transition-colors"
            >
              Suite (+500 caractères)
            </button>
          )}
          
          {shown.length > 500 && (
            <button
              onClick={reset}
              className="px-3 py-1 text-xs text-sky-400 hover:text-sky-300 transition-colors"
            >
              Réinitialiser
            </button>
          )}
          
          {!hasMore && fullText.length > 500 && (
            <div className="text-sm text-green-400">
              ✓ Texte complet affiché
            </div>
          )}
        </div>
      )}
    </div>
  );
};