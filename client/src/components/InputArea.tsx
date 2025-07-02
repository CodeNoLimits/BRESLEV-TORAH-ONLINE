
import React, { useState, useRef, useEffect } from 'react';
import { useSTT } from '../hooks/useSTT';
import { useTTS } from '../hooks/useTTS';

interface InputAreaProps {
  onSendMessage: (text: string, mode?: string) => void;
  isLoading: boolean;
  placeholder?: string;
}

export const InputArea: React.FC<InputAreaProps> = ({
  onSendMessage,
  isLoading,
  placeholder = "Posez votre question spirituelle..."
}) => {
  const [inputValue, setInputValue] = useState('');
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const { speak, stop, isSpeaking } = useTTS();
  
  const { 
    isListening, 
    isSupported: sttSupported, 
    startListening, 
    stopListening 
  } = useSTT({
    language: 'fr-FR',
    continuous: false,
    interimResults: true,
    onResult: (transcript) => {
      console.log('[InputArea] Transcription reçue:', transcript);
      setInputValue(transcript);
      // Auto-focus sur le textarea après transcription
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 100);
    },
    onError: (error) => {
      console.error('[InputArea] Erreur STT:', error);
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim() && !isLoading) {
      console.log('[InputArea] Envoi message:', inputValue);
      onSendMessage(inputValue.trim());
      setInputValue('');
    }
  };

  const handleMicClick = () => {
    if (!sttSupported) {
      console.warn('[InputArea] STT non supporté');
      return;
    }

    if (isListening) {
      console.log('[InputArea] Arrêt écoute');
      stopListening();
    } else {
      console.log('[InputArea] Démarrage écoute');
      const success = startListening();
      if (!success) {
        console.error('[InputArea] Échec démarrage STT');
      }
    }
  };

  const handleTTSToggle = () => {
    const newState = !ttsEnabled;
    setTtsEnabled(newState);
    console.log('[InputArea] TTS', newState ? 'activé' : 'désactivé');
    
    if (newState) {
      speak("Mode lecture vocale activé", 'fr-FR');
    } else {
      stop();
    }
  };

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [inputValue]);

  return (
    <div className="border-t border-slate-700 bg-slate-900 p-4">
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="flex space-x-2">
          {/* Bouton TTS */}
          <button
            type="button"
            onClick={handleTTSToggle}
            className={`p-3 rounded-lg transition-all duration-200 ${
              ttsEnabled
                ? 'bg-sky-600 text-white shadow-lg'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
            title={ttsEnabled ? 'Désactiver lecture vocale' : 'Activer lecture vocale'}
          >
            {isSpeaking ? (
              <svg className="w-5 h-5 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM15.657 6.343a1 1 0 011.414 0A9.972 9.972 0 0119 12a9.972 9.972 0 01-1.929 5.657 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 12a7.971 7.971 0 00-1.343-4.243 1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217z" clipRule="evenodd" />
              </svg>
            )}
          </button>

          {/* Zone de texte */}
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={placeholder}
              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-slate-400 resize-none focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent min-h-[3rem] max-h-32"
              rows={1}
              disabled={isLoading}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
            />
            
            {/* Indicateur STT */}
            {isListening && (
              <div className="absolute top-2 right-2 flex items-center space-x-1">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                <span className="text-xs text-red-400">Écoute...</span>
              </div>
            )}
          </div>

          {/* Bouton Micro */}
          <button
            type="button"
            onClick={handleMicClick}
            disabled={!sttSupported}
            className={`p-3 rounded-lg transition-all duration-200 ${
              !sttSupported
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                : isListening
                ? 'bg-red-600 text-white shadow-lg animate-pulse'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
            title={
              !sttSupported 
                ? 'Microphone non disponible' 
                : isListening 
                ? 'Arrêter écoute' 
                : 'Commencer écoute vocale'
            }
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
            </svg>
          </button>

          {/* Bouton Envoi */}
          <button
            type="submit"
            disabled={isLoading || !inputValue.trim()}
            className="px-6 py-3 bg-sky-600 text-white rounded-lg hover:bg-sky-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {isLoading ? (
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            )}
          </button>
        </div>

        {/* Info sur les raccourcis */}
        <div className="text-xs text-slate-500 text-center">
          Entrée pour envoyer • Shift+Entrée pour nouvelle ligne • 
          {sttSupported ? 'Micro activé' : 'Micro indisponible'}
        </div>
      </form>
    </div>
  );
};
