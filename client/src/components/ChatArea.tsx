import { useEffect, useRef } from 'react';
import { Message, Language } from '../types';

interface ChatAreaProps {
  messages: Message[];
  isStreaming: boolean;
  language: Language;
  onSummarize: (messageId: string) => void;
  onSpeak: (text: string) => void;
  streamingText: string;
}

export const ChatArea = ({
  messages,
  isStreaming,
  language,
  onSummarize,
  onSpeak,
  streamingText
}: ChatAreaProps) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingText]);

  const formatMessage = (text: string) => {
    // Simple formatting for better readability
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br>');
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-4" id="messagesContainer">
      {/* Welcome Message */}
      {messages.length === 0 && (
        <div className="flex items-start space-x-3 animate-fade-in">
          <div className="w-8 h-8 bg-gradient-to-br from-sky-400 to-sky-600 rounded-full flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd"></path>
            </svg>
          </div>
          <div className="chat-bubble bg-slate-800 rounded-lg p-4 shadow-lg">
            <p className="text-slate-200">
              שלום וברכה ! Bienvenue dans votre espace d'étude spirituelle. 
              Sélectionnez un enseignement dans la bibliothèque ou posez-moi une question. 
              Je suis là pour vous accompagner dans votre cheminement spirituel.
            </p>
          </div>
        </div>
      )}

      {/* Messages */}
      {messages
            .filter(message => {
              // COUP DE MASSE: Filtrage ultra-agressif anti-contexte
              const blackList = [
                "CONTEXTE DE L'ENSEIGNEMENT",
                "CONTEXT OF THE TEACHING", 
                "GUIDANCE SPIRITUELLE BASÉE SUR",
                "CONTEXTE PRINCIPAL",
                "MAIN CONTEXT",
                "TEACHING CONTEXT",
                "POINTS CLÉS",
                "KEY POINTS",
                "ANALYSE SPIRITUELLE",
                "SPIRITUAL ANALYSIS"
              ];
              
              // Filtrage par début de message
              if (blackList.some(flag => 
                message.text?.toUpperCase().startsWith(flag.toUpperCase())
              )) {
                return false;
              }
              
              // Filtrage par contenu 
              return !blackList.some(flag => 
                message.text?.toUpperCase().includes(flag.toUpperCase())
              );
            })
            .map((message) => (
        <div
          key={message.id}
          className={`flex items-start space-x-3 animate-fade-in ${
            message.sender === 'user' ? 'justify-end' : ''
          }`}
        >
          {message.sender === 'ai' && (
            <div className="w-8 h-8 bg-gradient-to-br from-sky-400 to-sky-600 rounded-full flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd"></path>
              </svg>
            </div>
          )}

          <div className={`chat-bubble rounded-lg p-4 shadow-lg max-w-4xl overflow-hidden ${
            message.sender === 'user'
              ? 'bg-gradient-to-br from-amber-500 to-orange-500 text-white'
              : message.isSafetyMessage
              ? 'bg-red-900/50 border border-red-500/50'
              : 'bg-slate-800 text-slate-200'
          }`}>
            <div
              className="leading-relaxed max-h-96 overflow-y-auto prose prose-slate prose-invert"
              dangerouslySetInnerHTML={{ __html: formatMessage(message.text) }}
            />

            {/* Message Actions */}
            {message.sender === 'ai' && !message.isSafetyMessage && message.text.length > 200 && (
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-700">
                <button
                  className="text-xs text-sky-400 hover:text-sky-300 transition-colors"
                  onClick={() => onSummarize(message.id)}
                >
                  <svg className="w-3 h-3 mr-1 inline" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 8a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 12a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 16a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd"></path>
                  </svg>
                  Points clés
                </button>
                <button
                  className="text-xs text-slate-400 hover:text-slate-300 transition-colors"
                  onClick={() => onSpeak(message.text)}
                >
                  <svg className="w-3 h-3 mr-1 inline" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM15.657 6.343a1 1 0 011.414 0A9.972 9.972 0 0119 12a9.972 9.972 0 01-1.929 5.657 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 12a7.971 7.971 0 00-1.343-4.243 1 1 0 010-1.414z" clipRule="evenodd"></path>
                  </svg>
                  Écouter
                </button>
              </div>
            )}
          </div>

          {message.sender === 'user' && (
            <div className="w-8 h-8 bg-slate-700 rounded-full flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-slate-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd"></path>
              </svg>
            </div>
          )}
        </div>
      ))}

      {/* Streaming Response */}
      {isStreaming && (
        <div className="flex items-start space-x-3 animate-fade-in">
          <div className="w-8 h-8 bg-gradient-to-br from-sky-400 to-sky-600 rounded-full flex items-center justify-center flex-shrink-0">
            <i className="fas fa-heart text-white text-sm"></i>
          </div>
          <div className="chat-bubble bg-slate-800 rounded-lg p-4 shadow-lg">
            <div
              className="text-slate-200 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: formatMessage(streamingText) }}
            />
            {streamingText && (
              <div className="mt-2">
                <div className="w-2 h-4 bg-sky-400 animate-pulse inline-block"></div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Typing Indicator */}
      {isStreaming && !streamingText && (
        <div className="flex items-start space-x-3">
          <div className="w-8 h-8 bg-gradient-to-br from-sky-400 to-sky-600 rounded-full flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd"></path>
            </svg>
          </div>
          <div className="chat-bubble bg-slate-800 rounded-lg p-4 shadow-lg">
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-sky-400 rounded-full animate-pulse"></div>
              <div className="w-2 h-2 bg-sky-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
              <div className="w-2 h-2 bg-sky-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
            </div>
          </div>
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
};