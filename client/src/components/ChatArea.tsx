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
            <i className="fas fa-heart text-white text-sm"></i>
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
      {messages.map((message) => (
        <div
          key={message.id}
          className={`flex items-start space-x-3 animate-fade-in ${
            message.sender === 'user' ? 'justify-end' : ''
          }`}
        >
          {message.sender === 'ai' && (
            <div className="w-8 h-8 bg-gradient-to-br from-sky-400 to-sky-600 rounded-full flex items-center justify-center flex-shrink-0">
              <i className="fas fa-heart text-white text-sm"></i>
            </div>
          )}
          
          <div className={`chat-bubble rounded-lg p-4 shadow-lg ${
            message.sender === 'user'
              ? 'bg-gradient-to-br from-amber-500 to-orange-500 text-white'
              : message.isSafetyMessage
              ? 'bg-red-900/50 border border-red-500/50'
              : 'bg-slate-800 text-slate-200'
          }`}>
            <div
              className="leading-relaxed"
              dangerouslySetInnerHTML={{ __html: formatMessage(message.text) }}
            />
            
            {/* Message Actions */}
            {message.sender === 'ai' && !message.isSafetyMessage && message.text.length > 200 && (
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-700">
                <button
                  className="text-xs text-sky-400 hover:text-sky-300 transition-colors"
                  onClick={() => onSummarize(message.id)}
                >
                  <i className="fas fa-list mr-1"></i>Points clés
                </button>
                <button
                  className="text-xs text-slate-400 hover:text-slate-300 transition-colors"
                  onClick={() => onSpeak(message.text)}
                >
                  <i className="fas fa-volume-up mr-1"></i>Écouter
                </button>
              </div>
            )}
          </div>
          
          {message.sender === 'user' && (
            <div className="w-8 h-8 bg-slate-700 rounded-full flex items-center justify-center flex-shrink-0">
              <i className="fas fa-user text-slate-400 text-sm"></i>
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
            <i className="fas fa-heart text-white text-sm"></i>
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
