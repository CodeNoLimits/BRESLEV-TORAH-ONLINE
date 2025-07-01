import React, { useState, useCallback, useEffect } from 'react';
import { Volume2, Loader2, ChevronRight } from 'lucide-react';
import { useFrenchTranslation } from '../hooks/useFrenchTranslation';

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
  
  // Préparer le texte complet pour la traduction française
  const fullEnglishText = selectedText.text.join('\n\n');
  const fullHebrewText = selectedText.he.join('\n\n');
  
  // Hook de vraie traduction française avec chunks de 1000 caractères
  const { 
    frenchText: frenchShown, 
    isTranslating: isTranslatingFrench, 
    progress: frenchProgress, 
    translateChunk: loadMoreFrench, 
    hasMore: frenchHasMore 
  } = useFrenchTranslation(fullEnglishText, 1000);

  // Animation de chargement pour les nouveaux chunks
  const handleLoadMore = useCallback(async () => {
    await loadMoreFrench();
  }, [loadMoreFrench]);

  // Fonction TTS qui fonctionne avec le texte affiché
  const handleTTSClick = useCallback(() => {
    const textToSpeak = (() => {
      switch (language) {
        case 'he':
          return fullHebrewText;
        case 'fr':
          return frenchShown || fullEnglishText;
        case 'en':
        default:
          return fullEnglishText;
      }
    })();
    
    console.log(`[OptimizedTextDisplay] TTS - Speaking ${language} text (${textToSpeak.length} chars)`);
    onTTSSpeak(textToSpeak);
  }, [language, fullHebrewText, frenchShown, fullEnglishText, onTTSSpeak]);

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
                const selectedContent = selection?.toString().trim() || '';
                if (selectedContent && onTextSelection) {
                  console.log('[OptimizedTextDisplay] Hebrew text selected:', selectedContent.substring(0, 100));
                  onTextSelection(selectedContent);
                }
              }}
            >
              <div className="font-hebrew text-right leading-relaxed text-slate-200">
                {selectedText.he.map((segment, idx) => (
                  <p key={idx} className="mb-3 last:mb-0">
                    {segment}
                  </p>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Colonne Anglais courte (traduction side-by-side) */}
        <div>
          <h4 className="text-sm font-medium text-slate-400 mb-2">Traduction (Anglais)</h4>
          <div 
            className="bg-slate-800 p-4 rounded-lg max-h-[60vh] overflow-y-auto cursor-text select-text"
            onMouseUp={() => {
              const selection = window.getSelection();
              const selectedContent = selection?.toString().trim() || '';
              if (selectedContent && onTextSelection) {
                console.log('[OptimizedTextDisplay] English text selected:', selectedContent.substring(0, 100));
                onTextSelection(selectedContent);
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

      {/* Rectangle contextuel FR avec lazy-loading */}
      <div className="border-t border-slate-700 pt-4">
        <h4 className="text-sm font-medium text-slate-400 mb-2 flex items-center gap-2">
          Traduction française
          {frenchProgress > 0 && (
            <span className="text-xs bg-slate-700 px-2 py-1 rounded">
              {Math.round(frenchProgress * 100)}%
            </span>
          )}
        </h4>
        
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl shadow-xl max-h-[60vh] overflow-y-auto">
          <div className="p-4 font-crimson leading-relaxed text-slate-200">
            {frenchShown ? (
              <>
                {frenchShown.split('\n\n').map((paragraph: string, idx: number) => (
                  <p key={idx} className="mb-3 last:mb-0">
                    {paragraph}
                  </p>
                ))}
                
                {/* Bouton "Suite" avec animation discrète */}
                {frenchHasMore && (
                  <div className="mt-4 flex justify-center">
                    <button
                      onClick={handleLoadMore}
                      disabled={isTranslatingFrench}
                      className={`
                        flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 
                        text-white rounded-lg transition-all duration-200
                        disabled:opacity-50 disabled:cursor-not-allowed
                        ${isTranslatingFrench ? 'animate-pulse' : 'hover:scale-105'}
                      `}
                    >
                      {isTranslatingFrench ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          <span>Traduction...</span>
                        </>
                      ) : (
                        <>
                          <ChevronRight size={16} />
                          <span>▶ Suite des 1 000 suivants</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center">
                <p className="text-slate-400 italic mb-2">
                  Cliquez ci-dessous pour commencer la traduction française
                </p>
                <button
                  onClick={handleLoadMore}
                  disabled={isTranslatingFrench}
                  className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg transition-colors"
                >
                  {isTranslatingFrench ? 'Traduction...' : 'Traduire les 1000 premiers caractères'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Information discrète sur l'état */}
      <div className="mt-2 text-xs text-slate-500 text-center">
        {selectedText.he.length > 0 && `${selectedText.he.length} segments hébreux`}
        {selectedText.he.length > 0 && selectedText.text.length > 0 && ' • '}
        {selectedText.text.length > 0 && `${selectedText.text.length} segments anglais`}
        {frenchShown && ` • ${frenchShown.length} caractères français affichés`}
      </div>
    </div>
  );
};