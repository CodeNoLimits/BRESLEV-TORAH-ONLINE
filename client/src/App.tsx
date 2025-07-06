import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LibraryPanel } from './components/LibraryPanel';
import { TextViewer } from './components/TextViewer';
import { ChatInterface } from './components/ChatInterface';
import { TTSControls } from './components/TTSControls';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Toaster } from './components/ui/toaster';
import { useApp } from './hooks/useApp';
import './App.css';

// Create QueryClient instance
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
    },
  },
});

function AppContent() {
  const {
    selectedBook,
    selectedChapter,
    chatMode,
    isLoading,
    error,
    setSelectedBook,
    setSelectedChapter,
    setChatMode,
    clearError
  } = useApp();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [chatOpen, setChatOpen] = useState(false);

  // Current context for chat
  const currentContext = selectedChapter 
    ? `${selectedBook?.titleEn} - Chapitre ${selectedChapter.chapterNumber}`
    : selectedBook?.titleEn;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur">
        <div className="flex h-16 items-center justify-between px-4">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-lg hover:bg-slate-800 transition-colors"
              aria-label="Toggle sidebar"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <h1 className="text-xl font-bold text-sky-400">
              Torah de Breslev
            </h1>
          </div>

          <div className="flex items-center space-x-4">
            {/* Chat Mode Selector */}
            <select
              value={chatMode}
              onChange={(e) => setChatMode(e.target.value as 'chapter' | 'book' | 'global')}
              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1 text-sm"
            >
              <option value="chapter">Mode Chapitre</option>
              <option value="book">Mode Livre</option>
              <option value="global">Mode Global</option>
            </select>

            <button
              onClick={() => setChatOpen(!chatOpen)}
              className="p-2 rounded-lg bg-sky-600 hover:bg-sky-700 transition-colors"
              aria-label="Toggle chat"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-3.582 8-8 8a8.001 8.001 0 01-7.996-7.808c0-4.418 3.582-8 8-8s8 3.582 8 8z" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Error Display */}
      {error && (
        <div className="bg-red-900/20 border border-red-500/50 text-red-400 px-4 py-3 mx-4 mt-4 rounded-lg flex items-center justify-between">
          <span className="text-sm">{error}</span>
          <button
            onClick={clearError}
            className="text-red-400 hover:text-red-300 ml-4"
            aria-label="Dismiss error"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Main Content */}
      <div className="flex h-[calc(100vh-4rem)]">
        {/* Sidebar */}
        <div className={`transition-all duration-300 ${
          sidebarOpen ? 'w-80' : 'w-0'
        } overflow-hidden border-r border-slate-800`}>
          <LibraryPanel
            selectedBook={selectedBook}
            selectedChapter={selectedChapter}
            onBookSelect={setSelectedBook}
            onChapterSelect={setSelectedChapter}
            isLoading={isLoading}
          />
        </div>

        {/* Main Text Area */}
        <div className={`flex-1 flex ${chatOpen ? 'mr-96' : ''} transition-all duration-300`}>
          <div className="flex-1 overflow-hidden">
            <TextViewer
              book={selectedBook}
              chapter={selectedChapter}
              isLoading={isLoading}
            />
          </div>
        </div>

        {/* Chat Panel */}
        <div className={`transition-all duration-300 ${
          chatOpen ? 'w-96' : 'w-0'
        } overflow-hidden border-l border-slate-800`}>
          <ChatInterface
            mode={chatMode}
            context={currentContext}
            isOpen={chatOpen}
            onClose={() => setChatOpen(false)}
          />
        </div>
      </div>

      {/* TTS Controls - Floating */}
      <TTSControls />

      {/* Toast Notifications */}
      <Toaster />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AppContent />
      </QueryClientProvider>
    </ErrorBoundary>
  );
}