import { useState } from 'react';
import { InteractionMode } from '../types';

interface InputAreaProps {
  onSendMessage: (message: string, mode: InteractionMode) => void;
  onAnalyzeText: (text: string) => void;
  onSeekGuidance: (situation: string) => void;
  isLoading: boolean;
  onStartVoiceInput: () => void;
}

export const InputArea = ({
  onSendMessage,
  onAnalyzeText,
  onSeekGuidance,
  isLoading,
  onStartVoiceInput
}: InputAreaProps) => {
  const [activeTab, setActiveTab] = useState<InteractionMode>('chat');
  const [chatMessage, setChatMessage] = useState('');
  const [analysisText, setAnalysisText] = useState('');
  const [guidanceText, setGuidanceText] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    switch (activeTab) {
      case 'chat':
        if (chatMessage.trim()) {
          onSendMessage(chatMessage, 'chat');
          setChatMessage('');
        }
        break;
      case 'analysis':
        if (analysisText.trim()) {
          onAnalyzeText(analysisText);
          setAnalysisText('');
        }
        break;
      case 'guidance':
        if (guidanceText.trim()) {
          onSeekGuidance(guidanceText);
          setGuidanceText('');
        }
        break;
    }
  };

  const tabs = [
    { id: 'chat' as InteractionMode, label: 'Conversation', icon: 'chat' },
    { id: 'analysis' as InteractionMode, label: 'Analyser un extrait', icon: 'search' },
    { id: 'guidance' as InteractionMode, label: 'Conseil personnalisé', icon: 'heart' }
  ];

  return (
    <div className="border-t border-slate-700 bg-slate-900">
      {/* Tabs */}
      <div className="px-6 pt-4">
        <div className="flex space-x-4 border-b border-slate-700 -mb-px">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'text-sky-400 border-sky-400'
                  : 'text-slate-400 hover:text-white border-transparent'
              }`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.icon === 'chat' && (
                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd"></path>
                </svg>
              )}
              {tab.icon === 'search' && (
                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd"></path>
                </svg>
              )}
              {tab.icon === 'heart' && (
                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd"></path>
                </svg>
              )}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {/* Chat Tab */}
        {activeTab === 'chat' && (
          <form onSubmit={handleSubmit} className="flex items-end space-x-4">
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="Posez votre question spirituelle..."
                className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg focus:outline-none focus:border-sky-400 transition-colors"
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                disabled={isLoading}
              />
              <button
                type="button"
                className="absolute right-3 top-3 text-slate-400 hover:text-sky-400 transition-colors"
                onClick={onStartVoiceInput}
                title="Entrée vocale"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd"></path>
                </svg>
              </button>
            </div>
            <button
              type="submit"
              disabled={isLoading || !chatMessage.trim()}
              className="px-6 py-3 bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-600 hover:to-sky-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-all transform hover:scale-105 flex items-center space-x-2"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z"></path>
              </svg>
              <span>Envoyer</span>
            </button>
          </form>
        )}

        {/* Analysis Tab */}
        {activeTab === 'analysis' && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                <svg className="w-4 h-4 mr-2 text-amber-400 inline" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z"></path>
                  <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z"></path>
                </svg>
                Collez votre extrait à analyser
              </label>
              <textarea
                rows={4}
                placeholder="Collez ici le texte que vous souhaitez analyser en profondeur..."
                className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg focus:outline-none focus:border-sky-400 transition-colors resize-none"
                value={analysisText}
                onChange={(e) => setAnalysisText(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <button
              type="submit"
              disabled={isLoading || !analysisText.trim()}
              className="w-full px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-all"
            >
              <svg className="w-4 h-4 mr-2 inline" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              Analyser ce texte
            </button>
          </form>
        )}

        {/* Guidance Tab */}
        {activeTab === 'guidance' && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                <svg className="w-4 h-4 mr-2 text-amber-400 inline" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd"></path>
                </svg>
                Décrivez votre situation personnelle
              </label>
              <textarea
                rows={4}
                placeholder="Partagez votre situation ou votre questionnement personnel. Je chercherai dans les enseignements un conseil adapté..."
                className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg focus:outline-none focus:border-sky-400 transition-colors resize-none"
                value={guidanceText}
                onChange={(e) => setGuidanceText(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <button
              type="submit"
              disabled={isLoading || !guidanceText.trim()}
              className="w-full px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-all"
            >
              <svg className="w-4 h-4 mr-2 inline" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.293l-3-3a1 1 0 00-1.414-1.414L9 5.586 7.707 4.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4a1 1 0 00-1.414-1.414L9 5.586z" clipRule="evenodd"></path>
              </svg>
              Chercher un conseil
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
