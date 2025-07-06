import { useState } from 'react';
import { useTTS } from '../hooks/useTTS';

export function TTSControls() {
  const { state, stop, pause, resume } = useTTS();
  const [isVisible, setIsVisible] = useState(false);

  // Show controls only when TTS is active
  if (!state.isPlaying && !state.isPaused) {
    return null;
  }

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <div className="bg-slate-900 border border-slate-700 rounded-lg shadow-xl p-4 min-w-64">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${
              state.isPlaying ? 'bg-green-500 animate-pulse' : 
              state.isPaused ? 'bg-yellow-500' : 'bg-gray-500'
            }`}></div>
            <span className="text-sm font-medium text-slate-300">
              Synthèse vocale
            </span>
          </div>
          
          <button
            onClick={() => setIsVisible(!isVisible)}
            className="p-1 hover:bg-slate-800 rounded transition-colors"
          >
            <svg 
              className={`w-4 h-4 text-slate-400 transition-transform ${
                isVisible ? 'rotate-180' : ''
              }`}
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>

        {/* Current Text Preview */}
        <div className="mb-3">
          <div className="text-xs text-slate-400 mb-1">
            Langue: {state.currentLanguage === 'fr' ? 'Français' : 
                     state.currentLanguage === 'en' ? 'English' : 'עברית'}
          </div>
          <div className="text-sm text-slate-300 bg-slate-800 rounded p-2 max-h-16 overflow-y-auto">
            {state.currentText?.substring(0, 100)}
            {state.currentText && state.currentText.length > 100 && '...'}
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center space-x-3">
          {/* Play/Pause Button */}
          {state.isPlaying ? (
            <button
              onClick={pause}
              className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
              title="Pause"
            >
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
              </svg>
            </button>
          ) : state.isPaused ? (
            <button
              onClick={resume}
              className="p-2 bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
              title="Reprendre"
            >
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z"/>
              </svg>
            </button>
          ) : null}

          {/* Stop Button */}
          <button
            onClick={stop}
            className="p-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
            title="Arrêter"
          >
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 6h12v12H6z"/>
            </svg>
          </button>
        </div>

        {/* Extended Controls */}
        {isVisible && (
          <div className="mt-4 pt-3 border-t border-slate-700">
            <div className="space-y-3">
              {/* Volume Control */}
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Volume: {Math.round(state.volume * 100)}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={state.volume}
                  className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer slider"
                  style={{
                    background: `linear-gradient(to right, #0ea5e9 0%, #0ea5e9 ${state.volume * 100}%, #475569 ${state.volume * 100}%, #475569 100%)`
                  }}
                />
              </div>

              {/* Rate Control */}
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Vitesse: {state.rate}x
                </label>
                <input
                  type="range"
                  min="0.5"
                  max="2"
                  step="0.1"
                  value={state.rate}
                  className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer slider"
                  style={{
                    background: `linear-gradient(to right, #0ea5e9 0%, #0ea5e9 ${((state.rate - 0.5) / 1.5) * 100}%, #475569 ${((state.rate - 0.5) / 1.5) * 100}%, #475569 100%)`
                  }}
                />
              </div>

              {/* Status */}
              <div className="text-xs text-slate-400 text-center">
                {state.isPlaying ? '🔊 En cours de lecture' :
                 state.isPaused ? '⏸️ En pause' : '⏹️ Arrêté'}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Add CSS for slider styling
const sliderStyle = `
  .slider::-webkit-slider-thumb {
    appearance: none;
    height: 16px;
    width: 16px;
    border-radius: 50%;
    background: #0ea5e9;
    cursor: pointer;
    border: 2px solid #1e293b;
  }

  .slider::-moz-range-thumb {
    height: 16px;
    width: 16px;
    border-radius: 50%;
    background: #0ea5e9;
    cursor: pointer;
    border: 2px solid #1e293b;
  }
`;

// Inject CSS
if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style');
  styleElement.textContent = sliderStyle;
  document.head.appendChild(styleElement);
}