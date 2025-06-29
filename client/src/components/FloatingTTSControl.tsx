import { useState, useEffect } from 'react';

interface FloatingTTSControlProps {
  isSpeaking: boolean;
  onStop: () => void;
}

export const FloatingTTSControl = ({ isSpeaking, onStop }: FloatingTTSControlProps) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(isSpeaking);
  }, [isSpeaking]);

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-fade-in">
      <button
        onClick={onStop}
        className="flex items-center gap-2 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-full shadow-lg transition-all duration-200 hover:scale-105"
        title="Arrêter la lecture"
      >
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd"></path>
        </svg>
        <span className="text-sm font-medium">Arrêter</span>
        
        {/* Audio wave animation */}
        <div className="flex items-center gap-1">
          <div className="w-1 h-3 bg-white rounded animate-pulse"></div>
          <div className="w-1 h-4 bg-white rounded animate-pulse" style={{ animationDelay: '0.1s' }}></div>
          <div className="w-1 h-2 bg-white rounded animate-pulse" style={{ animationDelay: '0.2s' }}></div>
        </div>
      </button>
    </div>
  );
};