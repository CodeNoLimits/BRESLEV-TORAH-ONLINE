import React, { useCallback, useMemo } from 'react';
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
  // Concaténer le texte anglais pour la traduction française
  const fullEnglishText = useMemo(() => {
    return selectedText.text.join('\n\n');
  }, [selectedText.text]);

  const fullHebrewText = useMemo(() => {
    return selectedText.he.join('\n\n');
  }, [selectedText.he]);

  // Hook de traduction lazy (1000 caractères + bouton "Suite")
  const {
    frenchText,
    isTranslating: isTranslatingFrench,
    progress,
    translateChunk,
    hasMore,
    reset
  } = useLazyTranslate(fullEnglishText, 1000);

  // Fonction TTS intelligente selon la langue
  const handleTTSClick = useCallback(() => {
    let textToSpeak = '';

    if (language === 'he' && fullHebrewText) {
      textToSpeak = fullHebrewText;
    } else if (language === 'fr' && frenchText) {
      textToSpeak = frenchText;
    } else {
      textToSpeak = fullEnglishText;
    }

    if (textToSpeak) {
      onTTSSpeak(textToSpeak);
    }
  }, [language, fullHebrewText, frenchText, fullEnglishText, onTTSSpeak]);

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-lg p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-amber-400">{selectedText.title}</h3>

        {/* Bouton TTS toujours visible */}
        <button
          onClick={handleTTSClick}
          className={`p-2 rounded-lg transition-all duration-200 ${
            isTTSSpeaking 
              ? 'bg-blue-600 text-white animate-pulse' 
              : 'bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white'
          }`}
          title="Écouter le texte"
        >
          <Volume2 size={18} />
        </button>
      </div>

      {/* Section Hébreu + Anglais side-by-side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Colonne Hébreu (texte original) */}
        {selectedText.he.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-slate-400 mb-2">Texte original (Hébreu)</h4>
            <div 
              className="bg-slate-800 p-4 rounded-lg max-h-[60vh] overflow-y-auto cursor-text select-text" 
              dir="rtl"
              onMouseUp={() => {
                const selection = window.getSelection();
                if (selection && onTextSelection) {
                  const selectedContent = selection.toString().trim();
                  if (selectedContent) {
                    onTextSelection(selectedContent);
                  }
                }
              }}
            >
              <div className="font-crimson leading-relaxed text-slate-200">
                {selectedText.he.map((segment, idx) => (
                  <p key={idx} className="mb-3 last:mb-0">
                    {segment}
                  </p>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Colonne Anglais */}
        <div>
          <h4 className="text-sm font-medium text-slate-400 mb-2">English Translation</h4>
          <div 
            className="bg-slate-800 p-4 rounded-lg max-h-[60vh] overflow-y-auto cursor-text select-text"
            onMouseUp={() => {
              const selection = window.getSelection();
              if (selection && onTextSelection) {
                const selectedContent = selection.toString().trim();
                if (selectedContent) {
                  onTextSelection(selectedContent);
                }
              }
            }}
          >
            <div className="font-crimson leading-relaxed text-slate-200">
              {selectedText.text.map((segment, idx) => (
                <p key={idx} className="mb-3 last:mb-0">
                  {segment}
                </p>
              ))}
            </div>
          </div>
        </div>
      </div>

      
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