import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Book, Chapter, Language } from '../types';
import { geminiApi } from '../services/api';
import { useTTS } from '../hooks/useTTS';

interface TextViewerProps {
  book: Book | null;
  chapter: Chapter | null;
  isLoading?: boolean;
}

interface TextDisplayProps {
  hebrew: string;
  english: string;
  french?: string;
  onTranslate: () => void;
  isTranslating: boolean;
}

function TextDisplay({ 
  hebrew, 
  english, 
  french, 
  onTranslate, 
  isTranslating 
}: TextDisplayProps) {
  const [selectedLanguage, setSelectedLanguage] = useState<Language>('fr');
  const { speak, state: ttsState } = useTTS();

  const getText = () => {
    switch (selectedLanguage) {
      case 'he': return hebrew;
      case 'en': return english;
      case 'fr': return french || english;
      default: return english;
    }
  };

  const handleSpeak = () => {
    const text = getText();
    if (text) {
      speak(text, selectedLanguage);
    }
  };

  return (
    <div className="space-y-4">
      {/* Language Selector */}
      <div className="flex items-center justify-between">
        <div className="flex space-x-2">
          {['he', 'en', 'fr'].map((lang) => (
            <button
              key={lang}
              onClick={() => setSelectedLanguage(lang as Language)}
              className={`px-3 py-1 rounded text-sm transition-colors ${
                selectedLanguage === lang
                  ? 'bg-sky-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              {lang === 'he' ? 'עברית' : lang === 'en' ? 'English' : 'Français'}
            </button>
          ))}
        </div>

        <div className="flex items-center space-x-2">
          {/* Translate Button */}
          {selectedLanguage === 'fr' && !french && (
            <button
              onClick={onTranslate}
              disabled={isTranslating}
              className="px-3 py-1 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 
                       text-white rounded text-sm transition-colors"
            >
              {isTranslating ? 'Traduction...' : 'Traduire'}
            </button>
          )}

          {/* TTS Button */}
          <button
            onClick={handleSpeak}
            disabled={ttsState.isPlaying}
            className="px-3 py-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 
                     text-white rounded text-sm transition-colors flex items-center space-x-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 14.142M8 21l4-4V7l-4-4v18z" />
            </svg>
            <span>{ttsState.isPlaying ? 'En cours...' : 'Écouter'}</span>
          </button>
        </div>
      </div>

      {/* Text Content */}
      <div className={`prose prose-slate prose-invert max-w-none ${
        selectedLanguage === 'he' ? 'text-right' : 'text-left'
      }`}>
        <div className="text-base leading-relaxed whitespace-pre-wrap">
          {getText()}
        </div>
      </div>
    </div>
  );
}

export function TextViewer({ book, chapter, isLoading: globalLoading }: TextViewerProps) {

  // Translation query for French
  const { 
    data: translation, 
    isLoading: translationLoading,
    refetch: retranslate 
  } = useQuery({
    queryKey: ['translation', chapter?.id, 'fr'],
    queryFn: async () => {
      if (!chapter?.contentEn) return null;
      
      const response = await geminiApi.translateText({
        text: chapter.contentEn,
        sourceLanguage: 'en',
        targetLanguage: 'fr',
        reference: chapter.sefariaRef
      });
      
      return response.translatedText;
    },
    enabled: !!chapter && !chapter.contentFr,
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
    retry: 1
  });

  const isLoading = globalLoading || translationLoading;

  // Get French text (cached or translated)
  const frenchText = chapter?.contentFr || translation;

  if (!book && !chapter) {
    return (
      <div className="h-full flex items-center justify-center text-slate-400">
        <div className="text-center max-w-md">
          <svg className="w-16 h-16 mx-auto mb-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          <h3 className="text-lg font-medium mb-2">Sélectionnez un livre</h3>
          <p className="text-sm">
            Choisissez un livre dans la bibliothèque pour commencer votre étude
          </p>
        </div>
      </div>
    );
  }

  if (book && !chapter) {
    return (
      <div className="h-full flex items-center justify-center text-slate-400">
        <div className="text-center max-w-md">
          <svg className="w-16 h-16 mx-auto mb-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="text-lg font-medium mb-2">
            {book.titleFr || book.titleEn}
          </h3>
          <p className="text-sm mb-4">
            Sélectionnez un chapitre pour commencer la lecture
          </p>
          <div className="text-xs text-slate-500">
            Livre de {book.author}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b border-slate-800 p-4 bg-slate-900/30">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-sky-400">
              {book?.titleFr || book?.titleEn}
            </h1>
            <h2 className="text-lg text-slate-300">
              Chapitre {chapter?.chapterNumber}
              {chapter?.titleFr && ` - ${chapter.titleFr}`}
            </h2>
            <p className="text-sm text-slate-400">
              {chapter?.sefariaRef}
            </p>
          </div>

          {/* Navigation */}
          <div className="flex items-center space-x-2">
            <button className="p-2 rounded-lg hover:bg-slate-800 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button className="p-2 rounded-lg hover:bg-slate-800 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {isLoading ? (
          <div className="space-y-4 animate-pulse">
            <div className="h-4 bg-slate-700 rounded w-3/4"></div>
            <div className="h-4 bg-slate-700 rounded w-full"></div>
            <div className="h-4 bg-slate-700 rounded w-2/3"></div>
            <div className="h-4 bg-slate-700 rounded w-full"></div>
            <div className="h-4 bg-slate-700 rounded w-1/2"></div>
          </div>
        ) : chapter ? (
          <TextDisplay
            hebrew={chapter.contentHe}
            english={chapter.contentEn}
            french={frenchText || undefined}
            onTranslate={() => retranslate()}
            isTranslating={translationLoading}
          />
        ) : (
          <div className="text-center text-slate-400">
            <p>Impossible de charger le contenu du chapitre</p>
          </div>
        )}
      </div>
    </div>
  );
}