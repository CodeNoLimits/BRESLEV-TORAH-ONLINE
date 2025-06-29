import { useState, useCallback, useEffect } from 'react';

// Generate unique IDs
const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2);
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { ChatArea } from './components/ChatArea';
import { InputArea } from './components/InputArea';
import { TextViewer } from './components/TextViewer';
import { BookNavigator } from './components/BookNavigator';
import { LoadingModal } from './components/LoadingModal';
import { useTTS } from './hooks/useTTS';
import { useGemini } from './hooks/useGemini';
import { sefariaService } from './services/sefaria';
import { Message, Language, SefariaText, InteractionMode, AIMode } from './types';

function App() {
  // State management
  const [language, setLanguage] = useState<Language>('fr');
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedText, setSelectedText] = useState<SefariaText | null>(null);
  const [selectedBook, setSelectedBook] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [streamingText, setStreamingText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Custom hooks
  const { speak, stop: stopTTS, isSpeaking } = useTTS({ language, enabled: ttsEnabled });
  const { sendMessage, isLoading, isStreaming } = useGemini({
    language,
    onResponse: (text) => setStreamingText(text),
    onError: (error) => setError(error)
  });

  // Voice recognition setup
  const [recognition, setRecognition] = useState<any>(null);

  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
      const recognitionInstance = new SpeechRecognition();
      
      recognitionInstance.continuous = false;
      recognitionInstance.interimResults = false;
      recognitionInstance.lang = language === 'he' ? 'he-IL' : language === 'en' ? 'en-US' : 'fr-FR';
      
      recognitionInstance.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        handleSendMessage(transcript, 'chat');
        setIsListening(false);
      };
      
      recognitionInstance.onend = () => setIsListening(false);
      recognitionInstance.onerror = () => setIsListening(false);
      
      setRecognition(recognitionInstance);
    }
  }, [language]);

  // Event handlers
  const handleTextSelect = useCallback(async (ref: string, title: string) => {
    try {
      // Check if this is a book-level selection (no specific verse numbers)
      const isBookLevel = !ref.includes('.') || ref.split('.').length <= 1;
      
      if (isBookLevel) {
        // Show book navigator for complete book access
        setSelectedBook(title);
        setSelectedText(null);
        console.log(`[App] Opening book navigator for: ${title}`);
      } else {
        // Load specific section/verse
        const text = await sefariaService.getText(ref);
        setSelectedText(text);
        setSelectedBook(null);
        console.log(`[App] Loaded specific text: ${ref}`);
        
        // Auto-trigger deep study analysis
        const textContent = sefariaService.getTextInLanguage(text, 'en');
        await handleSendAIMessage(textContent, 'study', `Texte sélectionné: ${title}`);
      }
      
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Erreur lors du chargement du texte');
    }
  }, []);

  const handleSectionSelect = useCallback(async (ref: string) => {
    try {
      const text = await sefariaService.getText(ref);
      setSelectedText(text);
      setSelectedBook(null);
      console.log(`[App] Loaded book section: ${ref}`);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Erreur lors du chargement de la section');
    }
  }, []);

  const handleSendMessage = useCallback(async (message: string, mode: InteractionMode) => {
    const aiMode: AIMode = mode === 'analysis' ? 'analyze' : mode === 'guidance' ? 'counsel' : 'explore';
    await handleSendAIMessage(message, aiMode);
  }, []);

  const handleSendAIMessage = useCallback(async (message: string, mode: AIMode, context?: string) => {
    // Add user message
    const userMessage: Message = {
      id: generateId(),
      text: message,
      sender: 'user',
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);
    
    // Clear streaming text
    setStreamingText('');
    
    try {
      // Send to AI
      const response = await sendMessage(message, mode, context);
      
      // Add AI response
      const aiMessage: Message = {
        id: generateId(),
        text: response,
        sender: 'ai',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, aiMessage]);
      
      // Auto-speak if TTS enabled
      if (ttsEnabled && response) {
        speak(response);
      }
      
    } catch (error) {
      const errorMessage: Message = {
        id: generateId(),
        text: 'Une erreur est survenue lors de la communication avec l\'IA. Veuillez réessayer.',
        sender: 'ai',
        timestamp: new Date(),
        isSafetyMessage: true
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setStreamingText('');
    }
  }, [sendMessage, ttsEnabled, speak]);

  const handleAnalyzeText = useCallback(async (text: string) => {
    await handleSendAIMessage(text, 'analyze');
  }, [handleSendAIMessage]);

  const handleSeekGuidance = useCallback(async (situation: string) => {
    await handleSendAIMessage(situation, 'counsel');
  }, [handleSendAIMessage]);

  const handleSummarize = useCallback(async (messageId: string) => {
    const message = messages.find(m => m.id === messageId);
    if (message) {
      await handleSendAIMessage(message.text, 'summarize');
    }
  }, [messages, handleSendAIMessage]);

  const handleStartVoiceInput = useCallback(() => {
    if (recognition && !isListening) {
      setIsListening(true);
      recognition.start();
    }
  }, [recognition, isListening]);

  const handleTTSToggle = useCallback((enabled: boolean) => {
    setTtsEnabled(enabled);
    if (!enabled) {
      stopTTS();
    }
  }, [stopTTS]);

  // Auto-stop TTS when streaming starts
  useEffect(() => {
    if (isStreaming && isSpeaking) {
      stopTTS();
    }
  }, [isStreaming, isSpeaking, stopTTS]);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-950">
      {/* Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onTextSelect={handleTextSelect}
        language={language}
      />
      
      {/* Main Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <Header
          language={language}
          onLanguageChange={setLanguage}
          ttsEnabled={ttsEnabled}
          onTTSToggle={handleTTSToggle}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          isSpeaking={isSpeaking || isListening}
          onStartVoiceInput={handleStartVoiceInput}
        />
        
        {/* Book Navigator */}
        {selectedBook && (
          <BookNavigator
            bookTitle={selectedBook}
            onSectionSelect={handleSectionSelect}
            onClose={() => setSelectedBook(null)}
            language={language}
          />
        )}
        
        {/* Text Viewer */}
        <TextViewer
          selectedText={selectedText}
          onClose={() => setSelectedText(null)}
          language={language}
        />
        
        {/* Chat Area */}
        <ChatArea
          messages={messages}
          isStreaming={isStreaming}
          language={language}
          onSummarize={handleSummarize}
          onSpeak={speak}
          streamingText={streamingText}
        />
        
        {/* Input Area */}
        <InputArea
          onSendMessage={handleSendMessage}
          onAnalyzeText={handleAnalyzeText}
          onSeekGuidance={handleSeekGuidance}
          isLoading={isLoading}
          onStartVoiceInput={handleStartVoiceInput}
        />
      </div>
      
      {/* Loading Modal */}
      <LoadingModal isVisible={isLoading && !isStreaming} />
      
      {/* Error Handling */}
      {error && (
        <div className="fixed bottom-4 right-4 bg-red-900/90 border border-red-500 rounded-lg p-4 max-w-md animate-slide-up">
          <div className="flex items-start space-x-3">
            <svg className="w-5 h-5 text-red-400 mt-1 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"></path>
            </svg>
            <div>
              <h4 className="font-semibold text-white mb-1">Erreur</h4>
              <p className="text-red-200 text-sm">{error}</p>
              <button
                className="mt-2 text-sky-400 hover:text-sky-300 text-sm"
                onClick={() => setError(null)}
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
