import { useState, useCallback, useEffect } from 'react';
import { Header } from './components/Header';
import { BreslovLibrary } from './components/BreslovLibrary';
import { useTTSFixed } from './hooks/useTTSFixed';
import { TextSegmenter } from './services/textSegmenter';
import { sefariaClient, SefariaText } from './services/sefariaDirectClient';
import { streamGemini } from './services/geminiSimple';
import { breslovCrawler } from './services/breslovCrawler';
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
  const [userSelectedText, setUserSelectedText] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [streamingText, setStreamingText] = useState('');
  const [isAILoading, setIsAILoading] = useState(false);
  const [currentInput, setCurrentInput] = useState('');

  // TTS
  const { speak, speakGreeting, stop: stopTTS, isSpeaking } = useTTSFixed({ language, enabled: ttsEnabled });

  // Initialize crawler cache on app start
  useEffect(() => {
    console.log('[AppSimple] Initializing Breslov crawler cache');
    breslovCrawler.loadCache();
    
    // Pre-warm essential texts in background
    const preloadEssentialTexts = async () => {
      const essentialRefs = [
        'Likutei_Moharan.1',
        'Likutei_Moharan.2', 
        'Sichot_HaRan.1',
        'Sippurei_Maasiyot.1'
      ];
      
      for (const ref of essentialRefs) {
        try {
          await breslovCrawler.getTextByRef(ref);
        } catch (error) {
          console.warn(`[AppSimple] Preload failed for ${ref}:`, error);
        }
      }
      
      breslovCrawler.saveCache();
      console.log('[AppSimple] Essential texts preloaded and cached');
    };
    
    preloadEssentialTexts();
  }, []);

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

      // Speak complete response after streaming is done
      if (ttsEnabled && fullResponse.trim()) {
        console.log(`[AppSimple] TTS - Speaking complete response (${fullResponse.length} chars)`);
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

  // Handle text selection from Sidebar with complete content crawler
  const handleTextSelect = useCallback(async (ref: string, title: string) => {
    try {
      console.log(`[AppSimple] Loading complete text: ${title} (${ref})`);
      
      // Use crawler to get complete authentic content
      const completeText = await breslovCrawler.getTextByRef(ref);
      
      if (completeText && completeText.versions && completeText.versions.length > 0) {
        const version = completeText.versions[0];
        const sefariaText: SefariaText = {
          ref: ref,
          title: title,
          text: Array.isArray(version.text) ? version.text : [version.text || ""],
          he: Array.isArray(version.he) ? version.he : [version.he || ""]
        };
        
        console.log(`[AppSimple] Complete text loaded: ${sefariaText.text.length} segments (English), ${sefariaText.he.length} segments (Hebrew)`);
        setSelectedText(sefariaText);
        setSidebarOpen(false);

        // Auto-trigger study analysis with COMPLETE text content
        if (sefariaText.text && sefariaText.text.length > 0) {
          const completeTextContent = sefariaText.text.join('\n\n');
          console.log(`[AppSimple] Sending complete text to AI (${completeTextContent.length} characters)`);
          await handleAIRequest(`TEXTE COMPLET DE ${title}:\n\n${completeTextContent}`, 'study');
        }
      } else {
        // Fallback to direct client
        console.log(`[AppSimple] Fallback to direct client for: ${ref}`);
        const text = await sefariaClient.fetchSection(ref);
        setSelectedText(text);
        setSidebarOpen(false);

        if (text.text && text.text.length > 0) {
          const textContent = text.text.join('\n\n');
          await handleAIRequest(`${title}\n\n${textContent}`, 'study');
        }
      }
    } catch (error) {
      console.error('[AppSimple] Complete text loading error:', error);
      // Final fallback
      try {
        const text = await sefariaClient.fetchSection(ref);
        setSelectedText(text);
        setSidebarOpen(false);
        
        if (text.text && text.text.length > 0) {
          const textContent = text.text.join('\n\n');
          await handleAIRequest(`${title}\n\n${textContent}`, 'study');
        }
      } catch (fallbackError) {
        console.error('[AppSimple] All loading methods failed:', fallbackError);
        await handleAIRequest('Erreur lors du chargement du texte sélectionné.', 'general');
      }
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

  // Handle text analysis events from TextViewer
  useEffect(() => {
    const handleAnalyzeText = (event: CustomEvent) => {
      const { text, mode } = event.detail;
      console.log(`[AppSimple] Received analysis request: ${mode}, text length: ${text.length}`);
      handleAIRequest(text, mode);
    };
    
    window.addEventListener('analyzeText', handleAnalyzeText as EventListener);
    
    return () => {
      window.removeEventListener('analyzeText', handleAnalyzeText as EventListener);
    };
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
        onSpeakGreeting={speakGreeting}
      />

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Breslov Library */}
        <BreslovLibrary
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          onTextSelect={handleTextSelect}
        />

        {/* Chat Area */}
        <div className="flex-1 flex flex-col p-4 max-w-4xl mx-auto">
          
          {/* Selected Text Display */}
          {selectedText && (
            <div className="bg-slate-800 border border-slate-600 rounded-lg p-6 mb-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-crimson font-semibold text-amber-400">{selectedText.title}</h2>
                <button
                  onClick={() => setSelectedText(null)}
                  className="text-slate-400 hover:text-red-400 transition-colors"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"></path>
                  </svg>
                </button>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Hebrew Text */}
                {selectedText.he && selectedText.he.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-slate-400 mb-2">Texte original (Hébreu)</h3>
                    <div 
                      className="bg-slate-900 rounded p-4 max-h-64 overflow-y-auto cursor-text select-text" 
                      dir="rtl"
                      onMouseUp={() => {
                        const selection = window.getSelection();
                        const selectedContent = selection?.toString().trim() || '';
                        if (selectedContent) {
                          console.log('[AppSimple] Hebrew text selected:', selectedContent.substring(0, 100));
                          setUserSelectedText(selectedContent);
                        }
                      }}
                    >
                      {selectedText.he.slice(0, 5).map((segment, idx) => (
                        <p key={idx} className="mb-3 text-slate-200 font-crimson text-lg leading-relaxed">
                          {segment}
                        </p>
                      ))}
                      {selectedText.he.length > 5 && (
                        <p className="text-slate-500 italic text-center">
                          ... {selectedText.he.length - 5} segments supplémentaires
                        </p>
                      )}
                    </div>
                  </div>
                )}
                
                {/* English Text */}
                {selectedText.text && selectedText.text.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-slate-400 mb-2">Traduction (Anglais)</h3>
                    <div 
                      className="bg-slate-900 rounded p-4 max-h-64 overflow-y-auto cursor-text select-text"
                      onMouseUp={() => {
                        const selection = window.getSelection();
                        const selectedContent = selection?.toString().trim() || '';
                        if (selectedContent) {
                          console.log('[AppSimple] English text selected:', selectedContent.substring(0, 100));
                          setUserSelectedText(selectedContent);
                        }
                      }}
                    >
                      {selectedText.text.slice(0, 5).map((segment, idx) => (
                        <p key={idx} className="mb-3 text-slate-200 font-crimson leading-relaxed">
                          {segment}
                        </p>
                      ))}
                      {selectedText.text.length > 5 && (
                        <p className="text-slate-500 italic text-center">
                          ... {selectedText.text.length - 5} segments supplémentaires
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
              
              {/* Selection Indicator */}
              {userSelectedText && (
                <div className="mb-4 p-3 bg-amber-900/30 border border-amber-600/50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-amber-400 text-sm font-medium">Texte sélectionné:</span>
                      <p className="text-slate-300 text-sm mt-1 truncate max-w-lg">
                        {userSelectedText.substring(0, 100)}...
                      </p>
                    </div>
                    <button
                      onClick={() => setUserSelectedText('')}
                      className="text-slate-400 hover:text-red-400 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"></path>
                      </svg>
                    </button>
                  </div>
                </div>
              )}

              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => {
                    const content = userSelectedText || selectedText.text.join('\n\n');
                    const prefix = userSelectedText ? 'ANALYSE DU TEXTE SÉLECTIONNÉ' : `ANALYSE SPIRITUELLE COMPLÈTE DE ${selectedText.title}`;
                    
                    // Use intelligent segmentation for long texts
                    if (!userSelectedText && content.length > 8000) {
                      const segmentResult = TextSegmenter.segmentText(content, selectedText.title);
                      const optimizedContent = TextSegmenter.formatForAI(segmentResult, selectedText.title);
                      console.log(`[AppSimple] Analysis - using segmented text (${optimizedContent.length} chars from ${content.length} original)`);
                      handleAIRequest(`${prefix}:\n\n${optimizedContent}`, 'study');
                    } else {
                      console.log(`[AppSimple] Analysis - using ${userSelectedText ? 'selected' : 'full'} text (${content.length} chars)`);
                      handleAIRequest(`${prefix}:\n\n${content}`, 'study');
                    }
                    
                    if (userSelectedText) setUserSelectedText('');
                  }}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-black rounded font-medium transition-colors"
                  disabled={isAILoading}
                >
                  {userSelectedText ? 'Analyser la sélection' : 'Analyser ce texte'}
                </button>
                <button
                  onClick={() => {
                    const content = userSelectedText || selectedText.text.join('\n\n');
                    const prefix = userSelectedText ? 'POINTS CLÉS DU TEXTE SÉLECTIONNÉ' : `POINTS CLÉS DU TEXTE COMPLET ${selectedText.title}`;
                    
                    // Use intelligent segmentation for long texts
                    if (!userSelectedText && content.length > 8000) {
                      const segmentResult = TextSegmenter.segmentText(content, selectedText.title);
                      const optimizedContent = TextSegmenter.formatForAI(segmentResult, selectedText.title);
                      console.log(`[AppSimple] Summary - using segmented text (${optimizedContent.length} chars from ${content.length} original)`);
                      handleAIRequest(`${prefix}:\n\n${optimizedContent}`, 'summary');
                    } else {
                      console.log(`[AppSimple] Summary - using ${userSelectedText ? 'selected' : 'full'} text (${content.length} chars)`);
                      handleAIRequest(`${prefix}:\n\n${content}`, 'summary');
                    }
                    
                    if (userSelectedText) setUserSelectedText('');
                  }}
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded transition-colors"
                  disabled={isAILoading}
                >
                  {userSelectedText ? 'Points clés sélection' : 'Points clés'}
                </button>
                <button
                  onClick={() => {
                    const content = userSelectedText || selectedText.text.join('\n\n');
                    const prefix = userSelectedText ? 'GUIDANCE SPIRITUELLE BASÉE SUR LE TEXTE SÉLECTIONNÉ' : `GUIDANCE SPIRITUELLE BASÉE SUR ${selectedText.title}`;
                    
                    // Use intelligent segmentation for long texts
                    if (!userSelectedText && content.length > 8000) {
                      const segmentResult = TextSegmenter.segmentText(content, selectedText.title);
                      const optimizedContent = TextSegmenter.formatForAI(segmentResult, selectedText.title);
                      console.log(`[AppSimple] Guidance - using segmented text (${optimizedContent.length} chars from ${content.length} original)`);
                      handleAIRequest(`${prefix}:\n\n${optimizedContent}\n\nComment ce texte peut-il m'aider dans ma vie quotidienne?`, 'counsel');
                    } else {
                      console.log(`[AppSimple] Guidance - using ${userSelectedText ? 'selected' : 'full'} text (${content.length} chars)`);
                      handleAIRequest(`${prefix}:\n\n${content}\n\nComment ce texte peut-il m'aider dans ma vie quotidienne?`, 'counsel');
                    }
                    
                    if (userSelectedText) setUserSelectedText('');
                  }}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded transition-colors"
                  disabled={isAILoading}
                >
                  {userSelectedText ? 'Guidance sélection' : 'Guidance personnelle'}
                </button>
              </div>
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto mb-4 space-y-4">
            {messages.length === 0 && !selectedText && (
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


    </div>
  );
}

export default AppSimple;