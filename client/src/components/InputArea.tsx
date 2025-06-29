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
    { id: 'chat' as InteractionMode, label: 'Conversation', icon: 'fas fa-comments' },
    { id: 'analysis' as InteractionMode, label: 'Analyser un extrait', icon: 'fas fa-search' },
    { id: 'guidance' as InteractionMode, label: 'Conseil personnalisé', icon: 'fas fa-heart' }
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
              <i className={`${tab.icon} mr-2`}></i>
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
                <i className="fas fa-microphone"></i>
              </button>
            </div>
            <button
              type="submit"
              disabled={isLoading || !chatMessage.trim()}
              className="px-6 py-3 bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-600 hover:to-sky-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-all transform hover:scale-105 flex items-center space-x-2"
            >
              <i className="fas fa-paper-plane"></i>
              <span>Envoyer</span>
            </button>
          </form>
        )}

        {/* Analysis Tab */}
        {activeTab === 'analysis' && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                <i className="fas fa-paste mr-2 text-amber-400"></i>
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
              <i className="fas fa-microscope mr-2"></i>
              Analyser ce texte
            </button>
          </form>
        )}

        {/* Guidance Tab */}
        {activeTab === 'guidance' && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                <i className="fas fa-heart mr-2 text-amber-400"></i>
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
              <i className="fas fa-compass mr-2"></i>
              Chercher un conseil
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
