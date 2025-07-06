import React, { useCallback } from 'react';
import { Mic, MicOff, Square, Volume2, VolumeX } from 'lucide-react';
import { Button } from './ui/button';

interface VoiceInterfaceProps {
  isListening: boolean;
  isSpeaking: boolean;
  isProcessing: boolean;
  isSupported: boolean;
  onStartListening: () => void;
  onStopAll: () => void;
}

export const VoiceInterface: React.FC<VoiceInterfaceProps> = ({
  isListening,
  isSpeaking,
  isProcessing,
  isSupported,
  onStartListening,
  onStopAll,
}) => {
  const handleMicClick = useCallback(() => {
    if (isListening || isSpeaking || isProcessing) {
      onStopAll();
    } else {
      onStartListening();
    }
  }, [isListening, isSpeaking, isProcessing, onStopAll, onStartListening]);

  const getButtonState = () => {
    if (!isSupported) {
      return { 
        icon: MicOff, 
        color: 'bg-gray-400 cursor-not-allowed', 
        text: 'Micro non supporté', 
        pulse: false 
      };
    }
    
    if (isListening) {
      return { 
        icon: Mic, 
        color: 'bg-red-500 hover:bg-red-600', 
        text: 'J\'écoute... Parlez maintenant', 
        pulse: true 
      };
    }
    
    if (isProcessing) {
      return { 
        icon: Volume2, 
        color: 'bg-yellow-500 hover:bg-yellow-600', 
        text: 'Je réfléchis à votre question...', 
        pulse: true 
      };
    }
    
    if (isSpeaking) {
      return { 
        icon: Volume2, 
        color: 'bg-blue-500 hover:bg-blue-600', 
        text: 'Je vous réponds...', 
        pulse: true 
      };
    }
    
    return { 
      icon: Mic, 
      color: 'bg-green-500 hover:bg-green-600', 
      text: 'Cliquez pour parler', 
      pulse: false 
    };
  };

  const { icon: Icon, color, text, pulse } = getButtonState();

  if (!isSupported) {
    return (
      <div className="flex flex-col items-center space-y-4">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 max-w-md">
          <div className="flex items-center space-x-3">
            <MicOff className="w-6 h-6 text-red-500" />
            <div>
              <p className="font-medium text-red-800 dark:text-red-200">
                Fonctionnalité vocale non supportée
              </p>
              <p className="text-sm text-red-600 dark:text-red-400">
                Votre navigateur ne supporte pas la reconnaissance vocale. 
                Essayez Chrome ou Firefox.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center space-y-6">
      {/* Main Voice Control Button */}
      <div className="relative">
        <Button
          onClick={handleMicClick}
          disabled={!isSupported}
          className={`
            ${color} text-white rounded-full w-20 h-20 shadow-lg transition-all duration-200
            ${pulse ? 'animate-pulse' : 'hover:scale-105'}
            active:scale-95 focus:outline-none focus:ring-4 focus:ring-opacity-50
            disabled:opacity-50 disabled:cursor-not-allowed
          `}
          title={text}
        >
          <Icon size={32} />
        </Button>
        
        {/* Activity Indicator */}
        {(isListening || isProcessing || isSpeaking) && (
          <div className="absolute -top-2 -right-2">
            <div className="w-6 h-6 bg-red-500 rounded-full animate-ping"></div>
            <div className="absolute top-0 right-0 w-6 h-6 bg-red-600 rounded-full"></div>
          </div>
        )}
      </div>

      {/* Status Text */}
      <div className="text-center max-w-md">
        <p className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">
          {text}
        </p>
        
        {/* Stop Button (visible during activity) */}
        {(isListening || isProcessing || isSpeaking) && (
          <Button
            onClick={onStopAll}
            variant="outline"
            size="sm"
            className="flex items-center space-x-2 text-red-600 border-red-300 hover:bg-red-50 dark:text-red-400 dark:border-red-700 dark:hover:bg-red-900/20"
          >
            <Square size={16} />
            <span>Arrêter</span>
          </Button>
        )}
      </div>

      {/* Instructions */}
      <div className="text-center max-w-lg">
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <h3 className="font-medium text-blue-800 dark:text-blue-200 mb-2">
            Comment utiliser la voix
          </h3>
          <div className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
            <p>• Cliquez sur le micro pour commencer</p>
            <p>• Parlez clairement pendant 2-3 secondes</p>
            <p>• Votre question sera envoyée automatiquement</p>
            <p>• Écoutez la réponse, puis continuez la conversation</p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2 justify-center max-w-md">
        {[
          "Parle-moi de Lemberg",
          "Conseille-moi sur la prière",
          "Explique-moi la joie",
          "Aide-moi à méditer"
        ].map((suggestion) => (
          <Button
            key={suggestion}
            variant="outline"
            size="sm"
            onClick={() => {
              // Simulate voice input for quick actions
              const synth = window.speechSynthesis;
              const utterance = new SpeechSynthesisUtterance(suggestion);
              utterance.volume = 0; // Silent
              synth.speak(utterance);
              
              // Trigger the suggestion as if it was spoken
              setTimeout(() => {
                const event = new CustomEvent('voiceInput', { detail: suggestion });
                window.dispatchEvent(event);
              }, 100);
            }}
            className="text-xs"
            disabled={isListening || isProcessing || isSpeaking}
          >
            {suggestion}
          </Button>
        ))}
      </div>
    </div>
  );
};

export default VoiceInterface;