import { Language } from '../types';

interface HeaderProps {
  language: Language;
  onLanguageChange: (language: Language) => void;
  ttsEnabled: boolean;
  onTTSToggle: (enabled: boolean) => void;
  onToggleSidebar: () => void;
  isSpeaking: boolean;
  onStartVoiceInput: () => void;
}

export const Header = ({
  language,
  onLanguageChange,
  ttsEnabled,
  onTTSToggle,
  onToggleSidebar,
  isSpeaking,
  onStartVoiceInput
}: HeaderProps) => {
  const languageLabels = {
    fr: 'FR',
    en: 'EN',
    he: 'עב'
  };

  return (
    <header className="bg-slate-900 border-b border-slate-700 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button 
            className="text-slate-400 hover:text-white transition-colors"
            onClick={onToggleSidebar}
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd"></path>
            </svg>
          </button>
          <div className="text-glow">
            <span className="text-lg font-crimson font-semibold text-sky-400">
              נא נח נחמא נחמן מאומן
            </span>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Language Selector */}
          <div className="flex bg-slate-800 rounded-lg p-1">
            {Object.entries(languageLabels).map(([lang, label]) => (
              <button
                key={lang}
                className={`px-3 py-1 rounded text-sm font-medium transition-all ${
                  language === lang
                    ? 'bg-sky-500 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
                onClick={() => onLanguageChange(lang as Language)}
              >
                {label}
              </button>
            ))}
          </div>
          
          {/* TTS Toggle */}
          <div className="flex items-center space-x-2">
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only"
                checked={ttsEnabled}
                onChange={(e) => onTTSToggle(e.target.checked)}
              />
              <div className="relative">
                <div className={`w-10 h-6 rounded-full transition-colors ${
                  ttsEnabled ? 'bg-sky-500' : 'bg-slate-700'
                }`}></div>
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                  ttsEnabled ? 'left-5' : 'left-1'
                }`}></div>
              </div>
              <span className="ml-2 text-sm text-slate-400">Auto-Lecture</span>
            </label>
            {isSpeaking && (
              <div className="voice-wave">
                <svg className="w-4 h-4 text-sky-400 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM15.657 6.343a1 1 0 011.414 0A9.972 9.972 0 0119 12a9.972 9.972 0 01-1.929 5.657 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 12a7.971 7.971 0 00-1.343-4.243 1 1 0 010-1.414z" clipRule="evenodd"></path>
                  <path fillRule="evenodd" d="M13.828 7.172a1 1 0 011.414 0A5.983 5.983 0 0117 12a5.983 5.983 0 01-1.758 4.828 1 1 0 01-1.414-1.414A3.987 3.987 0 0015 12a3.987 3.987 0 00-1.172-2.828 1 1 0 010-1.414z" clipRule="evenodd"></path>
                </svg>
              </div>
            )}
          </div>
          
          {/* Voice Input */}
          <button
            className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
            onClick={onStartVoiceInput}
            title="Entrée vocale"
          >
            <svg className="w-4 h-4 text-slate-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd"></path>
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
};
