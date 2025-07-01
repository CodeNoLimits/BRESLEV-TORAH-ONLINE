import React, { useState, useCallback } from 'react';
import { Mic, MicOff, Square, Volume2 } from 'lucide-react';
import { useVoiceAssistant } from '../hooks/useVoiceAssistant';

interface VoiceAssistantProps {
  className?: string;
}

export const VoiceAssistant: React.FC<VoiceAssistantProps> = ({ className = '' }) => {
  const [lastResponse, setLastResponse] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const handleQuickResponse = useCallback((response: string) => {
    setLastResponse(response);
    setErrorMessage('');
    console.log('[VoiceAssistant] Response:', response);
  }, []);

  const handleError = useCallback((error: string) => {
    setErrorMessage(error);
    console.error('[VoiceAssistant] Error:', error);
  }, []);

  const {
    isListening,
    isSpeaking,
    isProcessing,
    startListening,
    stopAll,
    isSupported
  } = useVoiceAssistant({ 
    onQuickResponse: handleQuickResponse, 
    onError: handleError 
  });

  const handleMicClick = useCallback(() => {
    if (isListening || isSpeaking || isProcessing) {
      stopAll();
    } else {
      startListening();
    }
  }, [isListening, isSpeaking, isProcessing, stopAll, startListening]);

  if (!isSupported) {
    return (
      <div className={`bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 ${className}`}>
        <p className="text-red-600 dark:text-red-400 text-sm">
          Assistant vocal non supporté par ce navigateur
        </p>
      </div>
    );
  }

  const getButtonState = () => {
    if (isListening) return { icon: Mic, color: 'bg-red-500 hover:bg-red-600', text: 'J\'écoute...', pulse: true };
    if (isProcessing) return { icon: Volume2, color: 'bg-yellow-500 hover:bg-yellow-600', text: 'Je réfléchis...', pulse: true };
    if (isSpeaking) return { icon: Volume2, color: 'bg-blue-500 hover:bg-blue-600', text: 'Je réponds...', pulse: true };
    return { icon: Mic, color: 'bg-green-500 hover:bg-green-600', text: 'Cliquez pour parler', pulse: false };
  };

  const { icon: Icon, color, text, pulse } = getButtonState();

  return (
    <div className={`flex flex-col items-center space-y-4 ${className}`}>
      {/* Bouton microphone central */}
      <div className="relative">
        <button
          onClick={handleMicClick}
          className={`
            ${color} text-white rounded-full p-6 shadow-lg transition-all duration-200
            ${pulse ? 'animate-pulse' : 'hover:scale-105'}
            active:scale-95 focus:outline-none focus:ring-4 focus:ring-opacity-50
          `}
          disabled={false}
          title={text}
        >
          <Icon size={32} />
        </button>
        
        {/* Indicateur visuel d'état */}
        {(isListening || isProcessing || isSpeaking) && (
          <div className="absolute -top-1 -right-1">
            <div className="w-4 h-4 bg-red-500 rounded-full animate-ping"></div>
            <div className="absolute top-0 right-0 w-4 h-4 bg-red-600 rounded-full"></div>
          </div>
        )}
      </div>

      {/* Texte d'état */}
      <div className="text-center">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {text}
        </p>
        
        {/* Bouton d'interruption visible pendant l'activité */}
        {(isListening || isProcessing || isSpeaking) && (
          <button
            onClick={stopAll}
            className="mt-2 flex items-center justify-center space-x-1 text-xs text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200 transition-colors"
          >
            <Square size={12} />
            <span>Arrêter</span>
          </button>
        )}
      </div>

      {/* Dernière réponse */}
      {lastResponse && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 max-w-xs text-center">
          <p className="text-sm text-blue-800 dark:text-blue-200 font-medium">
            "{lastResponse}"
          </p>
        </div>
      )}

      {/* Message d'erreur */}
      {errorMessage && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 max-w-xs text-center">
          <p className="text-sm text-red-600 dark:text-red-400">
            {errorMessage}
          </p>
        </div>
      )}

      {/* Instructions rapides */}
      <div className="text-center max-w-sm">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Dites "méditation", "prière", "étude" ou "conseil" pour une réponse rapide
        </p>
      </div>
    </div>
  );
};