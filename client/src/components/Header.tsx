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
            className="md:hidden text-slate-400 hover:text-white transition-colors"
            onClick={onToggleSidebar}
          >
            <i className="fas fa-bars text-lg"></i>
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
                <i className="fas fa-volume-up text-sky-400 animate-pulse"></i>
              </div>
            )}
          </div>
          
          {/* Voice Input */}
          <button
            className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
            onClick={onStartVoiceInput}
            title="Entrée vocale"
          >
            <i className="fas fa-microphone text-slate-400"></i>
          </button>
        </div>
      </div>
    </header>
  );
};
