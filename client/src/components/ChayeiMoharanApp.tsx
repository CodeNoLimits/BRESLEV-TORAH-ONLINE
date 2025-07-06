import React, { useState, useEffect } from 'react';
import { useVoiceConversation } from '../hooks/useVoiceConversation';

interface Book {
  id: string;
  name: string;
  language: 'fr' | 'he';
  status: 'available' | 'loading' | 'error';
}

const AVAILABLE_BOOKS: Book[] = [
  { id: 'chayei-moharan', name: 'Chayei Moharan', language: 'fr', status: 'available' },
  { id: 'likutei-moharan', name: 'Likutei Moharan', language: 'he', status: 'loading' },
  { id: 'sippurei-maasiyot', name: 'Sippurei Maasiyot', language: 'he', status: 'loading' },
];

export const ChayeiMoharanApp: React.FC = () => {
  const [selectedBook, setSelectedBook] = useState('chayei-moharan');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  const {
    messages,
    isListening,
    isSpeaking,
    isThinking,
    startListening,
    handleUserInput,
    stopAll,
    clearMessages
  } = useVoiceConversation();

  // Format des messages pour l'affichage
  const formatTimestamp = (date: Date) => {
    return date.toLocaleTimeString('fr-FR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white flex">
      {/* Sidebar - Sélecteur de livres */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-800 transform ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0`}>
        
        <div className="flex items-center justify-between h-16 px-6 bg-slate-700">
          <h1 className="text-xl font-bold text-amber-400">
            📚 Livres Breslev
          </h1>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-gray-400 hover:text-white"
          >
            ✕
          </button>
        </div>

        <nav className="mt-8 px-4">
          {AVAILABLE_BOOKS.map((book) => (
            <button
              key={book.id}
              onClick={() => setSelectedBook(book.id)}
              disabled={book.status !== 'available'}
              className={`w-full text-left p-3 rounded-lg mb-2 transition-colors ${
                selectedBook === book.id
                  ? 'bg-amber-600 text-white'
                  : book.status === 'available'
                  ? 'bg-slate-700 hover:bg-slate-600 text-gray-300'
                  : 'bg-slate-700 text-gray-500 cursor-not-allowed'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">{book.name}</span>
                <div className="flex items-center gap-2">
                  {book.language === 'fr' ? '🇫🇷' : '🇮🇱'}
                  {book.status === 'loading' && (
                    <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                  )}
                  {book.status === 'available' && selectedBook === book.id && (
                    <span className="text-amber-300">●</span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </nav>

        <div className="absolute bottom-4 left-4 right-4">
          <button
            onClick={clearMessages}
            className="w-full p-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm"
          >
            🗑️ Effacer la conversation
          </button>
        </div>
      </div>

      {/* Zone principale */}
      <div className="flex-1 flex flex-col lg:ml-0">
        
        {/* Header */}
        <header className="bg-slate-800 h-16 flex items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-gray-400 hover:text-white"
            >
              ☰
            </button>
            <h2 className="text-lg font-semibold text-amber-400">
              {AVAILABLE_BOOKS.find(b => b.id === selectedBook)?.name || 'Chayei Moharan'}
            </h2>
          </div>

          {/* Indicateurs d'état */}
          <div className="flex items-center gap-4">
            {isThinking && (
              <div className="flex items-center gap-2 text-blue-400">
                <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-sm">Réflexion...</span>
              </div>
            )}
            
            {isSpeaking && (
              <div className="flex items-center gap-2 text-green-400">
                <span className="w-4 h-4 rounded-full bg-green-400 animate-pulse"></span>
                <span className="text-sm">Lecture en cours</span>
              </div>
            )}
            
            {isListening && (
              <div className="flex items-center gap-2 text-red-400">
                <span className="w-4 h-4 rounded-full bg-red-400 animate-pulse"></span>
                <span className="text-sm">Écoute active</span>
              </div>
            )}
          </div>
        </header>

        {/* Zone de conversation */}
        <main className="flex-1 flex flex-col p-6 overflow-hidden">
          
          {/* Messages */}
          <div className="flex-1 overflow-y-auto mb-6 space-y-4">
            {messages.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🕊️</div>
                <h3 className="text-xl text-amber-400 mb-2">
                  Bienvenue dans Chayei Moharan
                </h3>
                <p className="text-gray-400 mb-6">
                  Posez vos questions spirituelles et recevez des réponses basées sur les enseignements authentiques.
                </p>
                <button
                  onClick={startListening}
                  disabled={isListening || isSpeaking}
                  className="px-6 py-3 bg-amber-600 hover:bg-amber-700 disabled:bg-gray-600 text-white rounded-lg transition-colors"
                >
                  🎤 Commencer une conversation
                </button>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-2xl p-4 rounded-lg ${
                      message.type === 'user'
                        ? 'bg-amber-600 text-white'
                        : 'bg-slate-700 text-gray-100'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">
                        {message.type === 'user' ? '👤' : '🕊️'}
                      </span>
                      <div className="flex-1">
                        <p className="whitespace-pre-wrap">{message.content}</p>
                        <p className="text-xs opacity-60 mt-2">
                          {formatTimestamp(message.timestamp)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
            
            {isThinking && (
              <div className="flex justify-start">
                <div className="max-w-2xl p-4 rounded-lg bg-slate-700">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🕊️</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-amber-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-amber-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                        <div className="w-2 h-2 bg-amber-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                        <span className="ml-2 text-gray-400">Je réfléchis à votre question...</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Zone de saisie */}
          <div className="border-t border-slate-700 pt-4">
            <div className="flex items-center gap-4">
              
              {/* Bouton micro principal */}
              <button
                onClick={isListening ? stopAll : startListening}
                disabled={isSpeaking || isThinking}
                className={`p-4 rounded-full transition-all duration-200 ${
                  isListening
                    ? 'bg-red-600 hover:bg-red-700 animate-pulse'
                    : isSpeaking || isThinking
                    ? 'bg-gray-600 cursor-not-allowed'
                    : 'bg-amber-600 hover:bg-amber-700 hover:scale-105'
                }`}
              >
                <span className="text-2xl">
                  {isListening ? '🔴' : '🎤'}
                </span>
              </button>

              {/* Input texte de secours */}
              <input
                type="text"
                placeholder="Ou tapez votre question ici..."
                className="flex-1 p-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-amber-500"
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                    handleUserInput(e.currentTarget.value.trim());
                    e.currentTarget.value = '';
                  }
                }}
                disabled={isThinking || isSpeaking}
              />

              {/* Bouton stop */}
              {(isSpeaking || isListening) && (
                <button
                  onClick={stopAll}
                  className="p-3 bg-red-600 hover:bg-red-700 text-white rounded-lg"
                >
                  ⏹️
                </button>
              )}
            </div>

            {/* Instructions */}
            <p className="text-xs text-gray-500 mt-2 text-center">
              {isListening 
                ? "🎤 Parlez maintenant... (max 10 secondes)"
                : isSpeaking 
                ? "🔊 Lecture en cours... Vous pouvez interrompre avec le bouton stop"
                : isThinking
                ? "⏳ Traitement de votre question en cours..."
                : "🎤 Cliquez sur le micro pour parler ou tapez votre question"
              }
            </p>
          </div>
        </main>
      </div>
    </div>
  );
};

export default ChayeiMoharanApp;