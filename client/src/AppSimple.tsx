import { useState, useCallback, useEffect } from 'react';
import { Header } from './components/Header';
import { BreslovCompleteLibrary } from './components/BreslovCompleteLibrary';
import { FloatingTTSControl } from './components/FloatingTTSControl';
import { DownloadToast } from './components/DownloadToast';
import { VoiceAssistant } from './components/VoiceAssistant';
import { OptimizedTextDisplay } from './components/OptimizedTextDisplay';
import { WelcomeVideos } from './components/WelcomeVideos';
import { useTTSPremium } from './hooks/useTTSPremium';
import { useLazyTranslate } from './hooks/useLazyTranslate';
import { MobileTTS, isMobile, MobileUtils } from './services/mobileOptimized';
import { useVoiceInput } from './hooks/useVoiceInput';
import { TextSegmenter } from './services/textSegmenter';
import { sefariaClient, SefariaText } from './services/sefariaDirectClient';
import { streamGemini } from './services/geminiSimple';
import { breslovCrawler } from './services/breslovCrawler';
import { getCurrentSelection, clearSelection } from './services/textSelection';
import { breslovComplete } from './services/breslovComplete';
import { backgroundLibraryLoader } from './services/backgroundLibraryLoader';
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

  const [showDownloadToast, setShowDownloadToast] = useState(false);
  const [bulkLoadStarted, setBulkLoadStarted] = useState(false);

  // Premium TTS avec voix Studio Gemini
  const { speak, stop: stopTTS, isSpeaking } = useTTSPremium();

  // Fonction speakGreeting pour compatibilité avec Header
  const speakGreeting = useCallback(async () => {
    if (!ttsEnabled) return;
    
    const greetingMessages = {
      fr: "Sélectionnez un texte puis cliquez sur les boutons d'analyse pour entendre la lecture.",
      en: "Select a text then click the analysis buttons to hear the reading.",
      he: "בחרו טקסט ואז לחצו על כפתורי הניתוח כדי לשמוע את הקריאה."
    };
    
    const message = greetingMessages[language] || greetingMessages.fr;
    
    const langCode = language === 'he' ? 'he-IL' : 
                     language === 'en' ? 'en-US' : 'fr-FR';
    
    await speak(message, { lang: langCode });
  }, [ttsEnabled, language, speak]);

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

  // Initialize lightweight cache only - no heavy preloading
  useEffect(() => {
    console.log('[AppSimple] Initializing lazy-load system');
    breslovCrawler.loadCache();
    
    // Initialize with empty messages - no auto-welcome to avoid TTS loop  
    setMessages([]);
    
    // Log ready state
    console.log('[AppSimple] Ready for lazy loading - no heavy pre-cache');
  }, [language]);

  // Start background downloading after user interaction
  const startBackgroundDownload = useCallback(() => {
    if (bulkLoadStarted) return;
    
    setBulkLoadStarted(true);
    setShowDownloadToast(true);
    console.log('[AppSimple] Starting background library download');
  }, [bulkLoadStarted]);

  // Build AI prompt based on mode
  const buildPrompt = useCallback((mode: string, text: string) => {
    // CORRECTION CRITIQUE: Toujours inclure le contexte du texte sélectionné
    const selectedContext = selectedText ? 
      `[CONTEXTE PRINCIPAL - TEXTE SÉLECTIONNÉ]
TITRE: ${selectedText.title}
RÉFÉRENCE: ${selectedText.ref}

CONTENU HÉBREU ORIGINAL:
${selectedText.he?.join('\n\n') || 'Non disponible'}

TRADUCTION ANGLAISE:
${selectedText.text?.join('\n\n') || 'Non disponible'}

[FIN DU CONTEXTE PRINCIPAL]

` : '';

    const prompts = {
      study: `${selectedContext}INSTRUCTION STRICTE: Analyse uniquement le texte dans le CONTEXTE PRINCIPAL ci-dessus.
Traduis d'abord ce texte en français complet, puis fournis une analyse spirituelle détaillée selon Rabbi Nahman de Breslov.

DEMANDE UTILISATEUR: ${text}

NE PAS analyser d'autres textes que celui du CONTEXTE PRINCIPAL.`,
      
      general: `${selectedContext}Tu es le Compagnon du Cœur, guide spirituel basé sur les enseignements de Rabbi Nahman de Breslov.

${selectedContext ? 'ATTENTION: Utilise le CONTEXTE PRINCIPAL ci-dessus pour répondre à cette question.' : ''}

${text.includes('CONTEXTE:') ? text : `QUESTION:\n${text}`}

Réponds en français avec sagesse et compassion selon les enseignements breslov.`,
      
      snippet: `${selectedContext}INSTRUCTION STRICTE: Analyse uniquement l'extrait du CONTEXTE PRINCIPAL.

DEMANDE UTILISATEUR: ${text}

Concentre-toi uniquement sur le texte sélectionné dans le CONTEXTE PRINCIPAL.`,
      
      advice: `${selectedContext}Conseil personnel basé sur les enseignements breslov.
${selectedContext ? 'Utilise le texte dans le CONTEXTE PRINCIPAL pour donner des conseils pertinents.' : ''}

SITUATION: ${text}`,
      
      summary: `${selectedContext}INSTRUCTION STRICTE: Résume uniquement le texte du CONTEXTE PRINCIPAL.

DEMANDE: ${text}

Résume les points clés du texte sélectionné selon Rabbi Nahman.`
    };
    return prompts[mode as keyof typeof prompts] || prompts.general;
  }, [selectedText]);

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

      // Add user message (sauf pour les modes automatiques comme 'study')
      if (mode !== 'study' && !text.includes('TEXTE COMPLET DE')) {
        const userMessage: Message = {
          id: generateId(),
          type: 'user',
          content: text,
          timestamp: new Date(),
          mode
        };
        setMessages(prev => [...prev, userMessage]);
      }

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

      // Retirer l'auto-lecture pour éviter les problèmes mobiles
      // L'utilisateur doit cliquer explicitement sur le bouton TTS
      console.log(`[AppSimple] Response complete - TTS available via button click`);

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
      
      // Réinitialiser l'état d'affichage lors de la sélection d'un nouveau texte
      setUserSelectedText('');
      
      // Use crawler to get complete authentic content
      const completeText = await breslovCrawler.getTextByRef(ref);
      
      // Vérifier si BreslovCrawler a réussi (format principal)
      if (completeText && completeText.text && completeText.text.length > 0) {
        console.log(`[AppSimple] ✅ BreslovCrawler success: ${completeText.text.length} English, ${completeText.he?.length || 0} Hebrew segments`);
        
        const sefariaText: SefariaText = {
          ref: ref,
          title: title,
          text: Array.isArray(completeText.text) ? completeText.text : [completeText.text],
          he: Array.isArray(completeText.he) ? completeText.he : (completeText.he ? [completeText.he] : [])
        };
        
        setSelectedText(sefariaText);
        setSidebarOpen(false);

        const completeTextContent = sefariaText.text.join('\n\n');
        console.log(`[AppSimple] Sending complete text to AI (${completeTextContent.length} characters)`);
        await handleAIRequest(`TEXTE COMPLET DE ${title}:\n\n${completeTextContent}`, 'study');
        return;
      }
      
      // Vérifier le format versions de BreslovCrawler
      if (completeText && completeText.versions && completeText.versions.length > 0) {
        console.log(`[AppSimple] ✅ BreslovCrawler versions format success`);
        const version = completeText.versions[0];
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
          text: english,
          he: hebrew
        };
        
        console.log(`[AppSimple] Complete text loaded: ${sefariaText.text.length} segments (English), ${sefariaText.he.length} segments (Hebrew)`);
        setSelectedText(sefariaText);
        setSidebarOpen(false);

        if (sefariaText.text && sefariaText.text.length > 0) {
          const completeTextContent = sefariaText.text.join('\n\n');
          console.log(`[AppSimple] Sending complete text to AI (${completeTextContent.length} characters)`);
          await handleAIRequest(`TEXTE COMPLET DE ${title}:\n\n${completeTextContent}`, 'study');
        }
        return;
      }

      // Deuxième tentative: BreslovCompleteLoader
      console.log(`[AppSimple] Trying BreslovCompleteLoader for: ${ref}`);
      const completeLoaderText = await breslovComplete.getAuthenticText(ref);
      
      if (completeLoaderText && completeLoaderText.english && completeLoaderText.english.length > 0) {
        console.log(`[AppSimple] ✅ CompleteLoader success: ${completeLoaderText.english.length} English, ${completeLoaderText.hebrew?.length || 0} Hebrew segments`);
        
        const sefariaText: SefariaText = {
          ref: ref,
          title: title,
          text: completeLoaderText.english,
          he: completeLoaderText.hebrew || []
        };
        
        setSelectedText(sefariaText);
        setSidebarOpen(false);

        const completeTextContent = sefariaText.text.join('\n\n');
        console.log(`[AppSimple] Sending complete text to AI (${completeTextContent.length} characters)`);
        await handleAIRequest(`TEXTE COMPLET DE ${title}:\n\n${completeTextContent}`, 'study');
        return;
      }

      // Troisième tentative: SefariaClient direct
      console.log(`[AppSimple] Trying SefariaClient for: ${ref}`);
      const directText = await sefariaClient.fetchSection(ref);
      
      if (directText && directText.text && directText.text.length > 0) {
        console.log(`[AppSimple] ✅ SefariaClient success: ${directText.text.length} segments`);
        setSelectedText(directText);
        setSidebarOpen(false);

        const textContent = directText.text.join('\n\n');
        await handleAIRequest(`${title}\n\n${textContent}`, 'study');
        return;
      }

      // Si aucune méthode n'a fonctionné
      throw new Error(`Impossible de charger le texte ${title} avec la référence ${ref}`);

    } catch (error) {
      console.error('[AppSimple] Complete text loading error:', error);
      
      // UNIQUEMENT si le selectedText n'a pas été défini, afficher une erreur
      if (!selectedText || selectedText.text.length === 0) {
        console.log('[AppSimple] No text loaded, showing error message');
        
        // Suggestions spécifiques basées sur le texte demandé
        const getSuggestions = (failedTitle: string) => {
          if (failedTitle.includes('Likutei Tefilot') || failedTitle.includes('Likutei_Tefilot')) {
            return {
              message: `Le texte "${title}" n'est pas disponible actuellement. Essayez plutôt : Likutei Moharan 1, Sichot HaRan 1, ou Sippurei Maasiyot 1.`,
              alternatives: ['Likutei Moharan.1.1', 'Sichot HaRan.1.1', 'Sippurei Maasiyot.1.1']
            };
          }
          return {
            message: `Le texte "${title}" n'est pas disponible. Essayez les textes principaux : Likutei Moharan, Sichot HaRan, ou Sippurei Maasiyot.`,
            alternatives: ['Likutei Moharan.1.1', 'Sichot HaRan.1.1', 'Sippurei Maasiyot.1.1']
          };
        };

        const suggestions = getSuggestions(title);
        
        await handleAIRequest(`${suggestions.message} Je peux aussi répondre à des questions générales sur les enseignements de Rabbi Nahman.`, 'general');
        
        // Afficher un message d'erreur informatif avec boutons d'alternatives
        const errorText: SefariaText = {
          ref: ref,
          title: `${title} - Non disponible`,
          text: [suggestions.message, '', 'Vous pouvez aussi poser des questions générales sur les enseignements de Rabbi Nahman.'],
          he: ['הטקסט אינו זמין כרגע', '', 'ניתן לשאול שאלות כלליות על תורת רבי נחמן']
        };
        setSelectedText(errorText);
      } else {
        console.log('[AppSimple] Text was successfully loaded despite error, keeping it');
      }
    }
  }, [handleAIRequest, breslovCrawler, breslovComplete, sefariaClient]);

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
        <BreslovCompleteLibrary
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          onTextSelect={handleTextSelect}
        />

        {/* Chat Area */}
        <div className="flex-1 flex flex-col p-4 max-w-4xl mx-auto">
          
          {/* Selected Text Display - Optimisé */}
          {selectedText && (
            <div className="mb-4">
              <div className="flex justify-between items-center mb-4">
                <button
                  onClick={() => setSelectedText(null)}
                  className="text-slate-400 hover:text-red-400 transition-colors ml-auto"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"></path>
                  </svg>
                </button>
              </div>
              
              <OptimizedTextDisplay
                selectedText={selectedText}
                onTTSSpeak={(text) => {
                  const langCode = language === 'he' ? 'he-IL' : 
                                   language === 'en' ? 'en-US' : 'fr-FR';
                  speak(text, { lang: langCode });
                }}
                isTTSSpeaking={isSpeaking}
                language={language}
                onTextSelection={setUserSelectedText}
              />
              
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

              {/* Boutons d'action avec TTS mobile-friendly */}
              <div className="flex gap-2 mt-4 flex-wrap">
                {/* Bouton TTS explicite pour mobile */}
                <button
                  onClick={() => {
                    const textToSpeak = userSelectedText || 
                      (selectedText.text.length > 0 ? selectedText.text[0] : selectedText.title);
                    console.log('[AppSimple] Manual TTS trigger:', textToSpeak.substring(0, 50));
                    
                    const langCode = language === 'he' ? 'he-IL' : 
                                     language === 'en' ? 'en-US' : 'fr-FR';
                    
                    speak(textToSpeak, { lang: langCode });
                  }}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    isSpeaking 
                      ? 'bg-red-500 text-white animate-pulse' 
                      : 'bg-sky-600 hover:bg-sky-700 text-white'
                  }`}
                  title="Écouter ce texte"
                >
                  🔊 {isSpeaking ? 'En cours...' : 'Écouter'}
                </button>

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
                
                {/* Assistant vocal intégré */}
                <div className="mt-8">
                  <VoiceAssistant className="inline-block" />
                </div>
                
                {/* Vidéos de bienvenue */}
                <WelcomeVideos />
              </div>
            )}
            
            {messages.map((message) => (
              <div key={message.id} className={`p-4 rounded-lg ${
                message.type === 'user' 
                  ? 'bg-sky-900 ml-8' 
                  : 'bg-slate-800 mr-8'
              }`}>
                {message.type === 'user' && (
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-medium text-sky-300">
                      Vous
                    </span>
                    {message.mode && (
                      <span className="text-xs text-slate-500 bg-slate-700 px-2 py-1 rounded">
                        {message.mode}
                      </span>
                    )}
                  </div>
                )}
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

      {/* Background Download Toast */}
      <DownloadToast 
        isVisible={showDownloadToast}
        onDismiss={() => setShowDownloadToast(false)}
      />

    </div>
  );
}

export default AppSimple;