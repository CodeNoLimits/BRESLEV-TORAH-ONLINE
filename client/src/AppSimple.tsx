import { useState, useCallback, useEffect } from 'react';
import { Header } from './components/Header';
import { BreslovLibrary } from './components/BreslovLibrarySimple';
import { FloatingTTSControl } from './components/FloatingTTSControl';
import { useTTSFixed } from './hooks/useTTSFixed';
import { MobileTTS, isMobile, MobileUtils } from './services/mobileOptimized';
import { useVoiceInput } from './hooks/useVoiceInput';
import { TextSegmenter } from './services/textSegmenter';
import { sefariaClient, SefariaText } from './services/sefariaDirectClient';
import { streamGemini } from './services/geminiSimple';
import { breslovCrawler } from './services/breslovCrawler';
import { getCurrentSelection, clearSelection } from './services/textSelection';
import { breslovSearch } from './services/breslovSearch';
import { BreslovDiagnostic } from './utils/breslovDiagnostic';
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
  const [ttsEnabled, setTtsEnabled] = useState(true); // TTS activé par défaut
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedText, setSelectedText] = useState<SefariaText | null>(null);
  const [userSelectedText, setUserSelectedText] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [streamingText, setStreamingText] = useState('');
  const [isAILoading, setIsAILoading] = useState(false);
  const [currentInput, setCurrentInput] = useState('');

  // Premium TTS with mobile optimization
  const { speak: originalSpeak, speakGreeting, stopTTS, isSpeaking } = useTTSFixed({ language, enabled: ttsEnabled });
  const [mobileTTS] = useState(() => new MobileTTS());

  // TTS optimisé avec fallback mobile automatique
  const speak = useCallback(async (text: string) => {
    if (isMobile()) {
      try {
        await mobileTTS.speak(text, { voice: 'male', language: 'fr-FR' });
      } catch (error) {
        console.warn('[Mobile TTS] Fallback to original TTS:', error);
        originalSpeak(text);
      }
    } else {
      originalSpeak(text);
    }
  }, [mobileTTS, originalSpeak]);

  // Voice input for questions
  const { isListening, startListening, stopListening } = useVoiceInput({
    language,
    onResult: (transcript) => {
      console.log('[AppSimple] Voice input result:', transcript);
      
      // If we have a selected text, include it as context for the AI
      if (selectedText) {
        const contextText = selectedText.text.join('\n\n');
        const contextualQuestion = `CONTEXTE:\n${selectedText.title}\n\n${contextText}\n\nQUESTION:\n${transcript}`;
        
        console.log('[AppSimple] Voice question with context:', transcript);
        handleAIRequest(contextualQuestion, 'general');
      } else {
        setCurrentInput(transcript);
        handleSendMessage(transcript, 'chat');
      }
    },
    onError: (error) => {
      console.error('[AppSimple] Voice input error:', error);
    }
  });

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
      
      // Initialize search engine for intelligent queries
      breslovSearch.initialize().then(() => {
        console.log('[AppSimple] Breslov search engine initialized');
      }).catch(error => {
        console.warn('[AppSimple] Failed to initialize search engine:', error);
      });

      // Run complete diagnostic of Breslov library
      BreslovDiagnostic.runCompleteCheck().then(results => {
        console.log('[AppSimple] Breslov library diagnostic completed');
      }).catch(error => {
        console.warn('[AppSimple] Diagnostic failed:', error);
      });
    };
    
    preloadEssentialTexts();
    
    // Initialize with empty messages - no auto-welcome to avoid TTS loop
    setMessages([]);
  }, [language, ttsEnabled, speak]);

  // Build AI prompt based on mode
  const buildPrompt = useCallback((mode: string, text: string) => {
    const prompts = {
      study: `Analyse spirituelle approfondie selon Rabbi Nahman de Breslov.
Traduis d'abord ce texte en français, puis fournis une analyse détaillée selon les enseignements breslov.

TEXTE À ANALYSER:
${text}`,
      general: `Tu es le Compagnon du Cœur, guide spirituel basé sur les enseignements de Rabbi Nahman de Breslov.

${text.includes('CONTEXTE:') ? text : `QUESTION:\n${text}`}

Réponds en français avec sagesse et compassion selon les enseignements breslov.`,
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

  // Intelligent search across loaded texts
  const searchLoadedTexts = useCallback(async (query: string) => {
    const queryLower = query.toLowerCase();
    const queryWords = queryLower.split(/\s+/).filter(word => word.length > 2);
    const results: Array<{book: string, content: string, score: number}> = [];
    
    const cache = breslovCrawler.getCache();
    for (const [ref, data] of Object.entries(cache)) {
      if (data?.text && Array.isArray(data.text)) {
        data.text.forEach((segment: string, index: number) => {
          const segmentLower = segment.toLowerCase();
          let score = 0;
          
          queryWords.forEach(word => {
            const matches = (segmentLower.match(new RegExp(word, 'g')) || []).length;
            score += matches;
          });
          
          if (segmentLower.includes(queryLower)) score += 10;
          
          if (score > 0) {
            results.push({
              book: ref.replace(/_/g, ' '),
              content: segment.substring(0, 300) + (segment.length > 300 ? '...' : ''),
              score
            });
          }
        });
      }
    }
    
    return results.sort((a, b) => b.score - a.score).slice(0, 3);
  }, []);

  // Enhanced AI handler with intelligent search integration
  const handleAIRequest = useCallback(async (text: string, mode: string = 'general') => {
    setIsAILoading(true);
    setStreamingText('');

    try {
      // First check for specific Sefaria requests
      const sefariaRequest = detectSefariaRequest(text);
      let enhancedText = text;
      
      if (sefariaRequest) {
        console.log(`[AppSimple] Detected Sefaria request: ${sefariaRequest.ref}`);
        try {
          const sefariaContent = await breslovCrawler.getTextByRef(sefariaRequest.ref);
          if (sefariaContent && sefariaContent.versions && sefariaContent.versions[0]) {
            const textContent = sefariaContent.versions[0].text.join('\n\n');
            enhancedText = `CONTENU AUTHENTIQUE SEFARIA - ${sefariaRequest.ref}:\n\n${textContent}\n\nQUESTION UTILISATEUR: ${text}`;
            mode = 'study';
          }
        } catch (error) {
          console.error('[AppSimple] Error fetching Sefaria content:', error);
        }
      } else if (mode === 'general') {
        // For general questions, search across all loaded texts
        const searchResults = await searchLoadedTexts(text);
        if (searchResults.length > 0) {
          console.log(`[AppSimple] Found ${searchResults.length} relevant texts for question`);
          let contextualText = `QUESTION: ${text}\n\nCONTEXTE - Textes pertinents de Rabbi Nahman:\n\n`;
          
          searchResults.forEach((result, index) => {
            contextualText += `${index + 1}. ${result.book}:\n"${result.content}"\n\n`;
          });
          
          contextualText += `Réponds à la question en te basant sur ces textes authentiques de Rabbi Nahman de Breslov.`;
          enhancedText = contextualText;
        }
      }

      const prompt = buildPrompt(mode, enhancedText);
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

  // Detect if user is asking for specific Sefaria content
  const detectSefariaRequest = (text: string) => {
    const patterns = [
      /sichot haran (?:chapitre|chapter|section)?\s*(\d+)/i,
      /likutei moharan (?:torah|chapitre|chapter)?\s*(\d+)/i,
      /sippurei maasiyot (?:conte|story|tale)?\s*(\d+)/i,
      /sefer hamiddot/i,
      /likutei tefilot (?:prière|prayer)?\s*(\d+)/i
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        const number = match[1] || '1';
        if (text.includes('sichot haran')) {
          return { ref: `Sichot_HaRan.${number}`, title: `Sichot HaRan ${number}` };
        } else if (text.includes('likutei moharan')) {
          return { ref: `Likutei_Moharan.${number}`, title: `Likutei Moharan ${number}` };
        } else if (text.includes('sippurei maasiyot')) {
          return { ref: `Sippurei_Maasiyot.${number}`, title: `Sippurei Maasiyot ${number}` };
        } else if (text.includes('likutei tefilot')) {
          return { ref: `Likutei_Tefilot.${number}`, title: `Likutei Tefilot ${number}` };
        }
      }
    }
    return null;
  };

  // Handle text selection from Sidebar with complete content crawler
  const handleTextSelect = useCallback(async (ref: string, title: string) => {
    try {
      console.log(`[AppSimple] Loading complete text: ${title} (${ref})`);
      
      // Use crawler to get complete authentic content
      const completeText = await breslovCrawler.getTextByRef(ref);
      
      if (completeText && completeText.versions && completeText.versions.length > 0) {
        const version = completeText.versions[0];
        // Smart language detection and organization
        const rawText = Array.isArray(version.text) ? version.text : [version.text || ""];
        const hebrew: string[] = [];
        const english: string[] = [];
        
        rawText.forEach((segment: string) => {
          const hebrewRegex = /[\u0590-\u05FF]/;
          if (hebrewRegex.test(segment)) {
            hebrew.push(segment);
          } else {
            english.push(segment);
          }
        });
        
        const sefariaText: SefariaText = {
          ref: ref,
          title: title,
          text: english,  // English text in correct field
          he: hebrew      // Hebrew text in correct field
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
                {/* Hebrew Text - Always show in left column as original */}
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
                    {(selectedText.he && selectedText.he.length > 0 ? selectedText.he : ['טקסט עברי לא זמין']).slice(0, 5).map((segment, idx) => (
                      <p key={idx} className="mb-3 text-slate-200 font-crimson text-lg leading-relaxed">
                        {segment}
                      </p>
                    ))}
                    {selectedText.he && selectedText.he.length > 5 && (
                      <p className="text-slate-500 italic text-center">
                        ... {selectedText.he.length - 5} segments supplémentaires
                      </p>
                    )}
                  </div>
                </div>
                
                {/* English Text - Always show in right column as translation */}
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
                    {(selectedText.text && selectedText.text.length > 0 ? selectedText.text : ['English text not available']).slice(0, 5).map((segment, idx) => (
                      <p key={idx} className="mb-3 text-slate-200 font-crimson leading-relaxed">
                        {segment}
                      </p>
                    ))}
                    {selectedText.text && selectedText.text.length > 5 && (
                      <p className="text-slate-500 italic text-center">
                        ... {selectedText.text.length - 5} segments supplémentaires
                      </p>
                    )}
                  </div>
                </div>
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
                onClick={() => {
                  const selectedText = getCurrentSelection();
                  const content = selectedText || currentInput.trim();
                  
                  if (!content) {
                    console.warn('[AppSimple] No text for guidance - need selection or input');
                    return;
                  }
                  
                  console.log(`[AppSimple] Guidance request - ${selectedText ? 'selection' : 'input'} (${content.length} chars)`);
                  
                  // Use intelligent segmentation for long texts
                  if (content.length > 8000) {
                    const segmentResult = TextSegmenter.segmentText(content, 'Demande de guidance');
                    const optimizedContent = TextSegmenter.formatForAI(segmentResult, 'Guidance spirituelle');
                    console.log(`[AppSimple] Guidance - using segmented text (${optimizedContent.length} chars from ${content.length} original)`);
                    handleAIRequest(`GUIDANCE SPIRITUELLE:\n\n${optimizedContent}\n\nComment puis-je appliquer ces enseignements dans ma vie quotidienne?`, 'counsel');
                  } else {
                    handleAIRequest(`GUIDANCE SPIRITUELLE:\n\n${content}\n\nComment puis-je appliquer ces enseignements dans ma vie quotidienne?`, 'counsel');
                  }
                  
                  if (selectedText) {
                    clearSelection();
                  } else {
                    setCurrentInput('');
                  }
                }}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-500 rounded transition-colors"
                disabled={isAILoading}
              >
                Guidance ✨
              </button>
              <button
                onClick={() => {
                  const selectedText = getCurrentSelection();
                  const content = selectedText || currentInput.trim();
                  
                  if (!content) {
                    console.warn('[AppSimple] No text for analysis - need selection or input');
                    return;
                  }
                  
                  console.log(`[AppSimple] Analysis request - ${selectedText ? 'selection' : 'input'} (${content.length} chars)`);
                  
                  // Use intelligent segmentation for long texts
                  if (content.length > 8000) {
                    const segmentResult = TextSegmenter.segmentText(content, 'Extrait à analyser');
                    const optimizedContent = TextSegmenter.formatForAI(segmentResult, 'Analyse spirituelle');
                    console.log(`[AppSimple] Analysis - using segmented text (${optimizedContent.length} chars from ${content.length} original)`);
                    handleAIRequest(`ANALYSE SPIRITUELLE APPROFONDIE:\n\n${optimizedContent}`, 'analyze');
                  } else {
                    handleAIRequest(`ANALYSE SPIRITUELLE APPROFONDIE:\n\n${content}`, 'analyze');
                  }
                  
                  if (selectedText) {
                    clearSelection();
                  } else {
                    setCurrentInput('');
                  }
                }}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 rounded transition-colors"
                disabled={isAILoading}
              >
                Analyser 🔍
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
              <div className="flex flex-col gap-2">
                <button
                  onClick={isListening ? stopListening : startListening}
                  className={`p-3 rounded-lg transition-all duration-200 ${
                    isListening 
                      ? 'bg-red-600 hover:bg-red-500 text-white animate-pulse' 
                      : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                  }`}
                  title={isListening ? 'Arrêter l\'écoute' : 'Poser une question vocalement'}
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd"></path>
                  </svg>
                </button>
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

      {/* Floating TTS Control */}
      <FloatingTTSControl 
        isSpeaking={isSpeaking}
        onStop={() => {
          window.speechSynthesis.cancel();
          stopTTS();
        }}
      />

    </div>
  );
}

export default AppSimple;