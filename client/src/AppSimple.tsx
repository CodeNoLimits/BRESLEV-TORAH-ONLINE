import { useState, useCallback, useEffect } from 'react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { useTTS } from './hooks/useTTS';
import { sefariaClient, SefariaText } from './services/sefariaDirectClient';
import { streamGemini } from './services/geminiSimple';
import { Language, InteractionMode } from './types';

interface Message {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
  mode?: string;
}

const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2);

function AppSimple() {
  // Core state
  const [language, setLanguage] = useState<Language>('fr');
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedText, setSelectedText] = useState<SefariaText | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [streamingText, setStreamingText] = useState('');
  const [isAILoading, setIsAILoading] = useState(false);
  const [currentInput, setCurrentInput] = useState('');

  // TTS
  const { speak, stop: stopTTS, isSpeaking } = useTTS({ language, enabled: ttsEnabled });

  // Build AI prompt based on mode
  const buildPrompt = useCallback((mode: string, text: string) => {
    const prompts = {
      study: `Analyse spirituelle approfondie selon Rabbi Nahman de Breslov.
Traduis d'abord ce texte en français, puis fournis une analyse détaillée selon les enseignements breslov.

TEXTE À ANALYSER:
${text}`,
      general: `Guidance spirituelle selon Rabbi Nahman de Breslov.

QUESTION:
${text}`,
      snippet: `Analyse cet extrait selon les enseignements de Rabbi Nahman.

EXTRAIT:
${text}`,
      advice: `Conseil personnel basé sur les enseignements breslov.

SITUATION:
${text}`,
      summary: `Résumé des points clés selon Rabbi Nahman.

TEXTE:
${text}`
    };
    return prompts[mode as keyof typeof prompts] || prompts.general;
  }, []);

  // Handle AI streaming
  const handleAIRequest = useCallback(async (text: string, mode: string = 'general') => {
    setIsAILoading(true);
    setStreamingText('');

    try {
      const prompt = buildPrompt(mode, text);
      console.log(`[AppSimple] AI request - Mode: ${mode}`);

      // Add user message
      const userMessage: Message = {
        id: generateId(),
        type: 'user',
        content: text,
        timestamp: new Date(),
        mode
      };
      setMessages(prev => [...prev, userMessage]);

      let fullResponse = '';
      await streamGemini(prompt, (chunk: string) => {
        fullResponse += chunk;
        setStreamingText(fullResponse);
      });

      // Add AI response
      const aiMessage: Message = {
        id: generateId(),
        type: 'ai',
        content: fullResponse,
        timestamp: new Date(),
        mode
      };
      setMessages(prev => [...prev, aiMessage]);
      setStreamingText('');

      if (ttsEnabled && fullResponse) {
        speak(fullResponse);
      }

    } catch (error) {
      console.error('[AppSimple] AI error:', error);
      const errorMessage: Message = {
        id: generateId(),
        type: 'ai',
        content: 'Erreur de communication avec l\'IA spirituelle.',
        timestamp: new Date(),
        mode: 'error'
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsAILoading(false);
      setStreamingText('');
    }
  }, [buildPrompt, ttsEnabled, speak]);

  // Handle text selection from Sidebar
  const handleTextSelect = useCallback(async (ref: string, title: string) => {
    try {
      console.log(`[AppSimple] Loading text: ${title} (${ref})`);
      const text = await sefariaClient.fetchSection(ref);
      setSelectedText(text);
      setSidebarOpen(false);

      // Auto-trigger study analysis
      if (text.text && text.text.length > 0) {
        const textContent = text.text.join('\n\n');
        await handleAIRequest(`${title}\n\n${textContent}`, 'study');
      }
    } catch (error) {
      console.error('[AppSimple] Text loading error:', error);
      await handleAIRequest('Erreur lors du chargement du texte sélectionné.', 'general');
    }
  }, [handleAIRequest]);

  // Handle input submission
  const handleSendMessage = useCallback(async (message: string, mode: InteractionMode) => {
    if (!message.trim()) return;
    
    const aiMode = mode === 'analysis' ? 'snippet' : 
                   mode === 'guidance' ? 'advice' : 'general';
    
    await handleAIRequest(message, aiMode);
    setCurrentInput('');
  }, [handleAIRequest]);

  return (
    <div className="h-screen bg-slate-950 text-slate-300 flex flex-col">
      {/* Header */}
      <Header
        language={language}
        onLanguageChange={setLanguage}
        ttsEnabled={ttsEnabled}
        onTTSToggle={setTtsEnabled}
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        isSpeaking={isSpeaking}
        onStartVoiceInput={() => {}}
      />

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Sidebar */}
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          onTextSelect={handleTextSelect}
          language={language}
        />

        {/* Chat Area */}
        <div className="flex-1 flex flex-col p-4 max-w-4xl mx-auto">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto mb-4 space-y-4">
            {messages.length === 0 && (
              <div className="text-center text-slate-500 mt-8">
                <h2 className="text-xl font-crimson mb-4">נ נח נחמ נחמן מאומן</h2>
                <p>Bienvenue dans votre espace d'étude spirituelle.</p>
                <p>Sélectionnez un enseignement dans la bibliothèque ou posez une question.</p>
              </div>
            )}
            
            {messages.map((message) => (
              <div key={message.id} className={`p-4 rounded-lg ${
                message.type === 'user' 
                  ? 'bg-sky-900 ml-8' 
                  : 'bg-slate-800 mr-8'
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-sm font-medium ${
                    message.type === 'user' ? 'text-sky-300' : 'text-amber-400'
                  }`}>
                    {message.type === 'user' ? 'Vous' : 'Compagnon du Cœur'}
                  </span>
                  {message.mode && (
                    <span className="text-xs text-slate-500 bg-slate-700 px-2 py-1 rounded">
                      {message.mode}
                    </span>
                  )}
                </div>
                <div className="font-crimson leading-relaxed">
                  {message.content.split('\n').map((line, idx) => (
                    <p key={idx} className="mb-2 last:mb-0">{line}</p>
                  ))}
                </div>
              </div>
            ))}

            {/* Streaming response */}
            {streamingText && (
              <div className="p-4 rounded-lg bg-slate-800 mr-8">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-amber-400 font-medium">Compagnon du Cœur</span>
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-amber-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-amber-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                    <div className="w-2 h-2 bg-amber-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                  </div>
                </div>
                <div className="font-crimson leading-relaxed">
                  {streamingText.split('\n').map((line, idx) => (
                    <p key={idx} className="mb-2 last:mb-0">{line}</p>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="border-t border-slate-700 pt-4">
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => handleSendMessage(currentInput, 'chat')}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-500 rounded transition-colors"
                disabled={isAILoading || !currentInput.trim()}
              >
                Guidance
              </button>
              <button
                onClick={() => handleSendMessage(currentInput, 'analysis')}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 rounded transition-colors"
                disabled={isAILoading || !currentInput.trim()}
              >
                Analyser
              </button>
            </div>
            
            <div className="flex gap-2">
              <textarea
                value={currentInput}
                onChange={(e) => setCurrentInput(e.target.value)}
                placeholder="Posez votre question spirituelle..."
                className="flex-1 p-3 bg-slate-800 border border-slate-600 rounded-lg resize-none focus:outline-none focus:border-sky-500"
                rows={3}
                disabled={isAILoading}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage(currentInput, 'chat');
                  }
                }}
              />
              <button
                onClick={() => handleSendMessage(currentInput, 'chat')}
                disabled={isAILoading || !currentInput.trim()}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-500 disabled:bg-slate-600 rounded-lg transition-colors"
              >
                {isAILoading ? '...' : 'Envoyer'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Selected Text Viewer */}
      {selectedText && (
        <div className="fixed bottom-4 right-4 w-96 max-h-64 bg-slate-800 border border-slate-600 rounded-lg p-4 overflow-y-auto">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-medium text-amber-400">{selectedText.title}</h3>
            <button
              onClick={() => setSelectedText(null)}
              className="text-slate-400 hover:text-red-400"
            >
              ✕
            </button>
          </div>
          <div className="text-sm font-crimson">
            {selectedText.text.slice(0, 3).map((segment, idx) => (
              <p key={idx} className="mb-2">{segment}</p>
            ))}
            {selectedText.text.length > 3 && (
              <p className="text-slate-500 italic">...et {selectedText.text.length - 3} segments supplémentaires</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default AppSimple;