import React, { useEffect, useRef } from 'react';
import { Message } from './ChayeiMoharanApp';
import { User, Bot, BookOpen, Clock } from 'lucide-react';

interface ConversationAreaProps {
  messages: Message[];
  isThinking: boolean;
  isProcessing: boolean;
}

export const ConversationArea: React.FC<ConversationAreaProps> = ({
  messages,
  isThinking,
  isProcessing,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

  const formatTime = (timestamp: Date) => {
    return new Intl.DateTimeFormat('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(timestamp);
  };

  const renderMessage = (message: Message, index: number) => {
    const isUser = message.type === 'user';
    const isLast = index === messages.length - 1;

    return (
      <div
        key={message.id}
        className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}
      >
        <div
          className={`
            max-w-[70%] rounded-lg p-4 shadow-sm
            ${isUser 
              ? 'bg-blue-500 text-white' 
              : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100'
            }
          `}
        >
          {/* Header */}
          <div className="flex items-center space-x-2 mb-2">
            {isUser ? (
              <User size={18} />
            ) : (
              <Bot size={18} className="text-blue-500" />
            )}
            <span className="font-medium text-sm">
              {isUser ? 'Vous' : 'Le Compagnon du Cœur'}
            </span>
            <span className={`text-xs opacity-70`}>
              {formatTime(message.timestamp)}
            </span>
          </div>

          {/* Message Content */}
          <div className="text-sm leading-relaxed">
            {message.content}
          </div>

          {/* Sources (for AI messages) */}
          {!isUser && message.sources && message.sources.length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
              <div className="flex items-center space-x-2 text-xs text-gray-600 dark:text-gray-400">
                <BookOpen size={14} />
                <span>Sources:</span>
              </div>
              <div className="mt-1 space-y-1">
                {message.sources.map((source, idx) => (
                  <div key={idx} className="text-xs text-gray-500 dark:text-gray-400">
                    • {source}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {/* Welcome Message */}
      {messages.length === 0 && (
        <div className="flex justify-center items-center h-full">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
              <Bot size={32} className="text-blue-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Bienvenue dans Le Compagnon du Cœur
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Votre guide spirituel pour explorer les enseignements de Rabbi Nahman de Breslev
            </p>
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <p className="text-sm text-blue-700 dark:text-blue-300">
                Cliquez sur le micro ci-dessous pour commencer une conversation vocale
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Messages */}
      {messages.map((message, index) => renderMessage(message, index))}

      {/* Thinking Indicator */}
      {isThinking && (
        <div className="flex justify-start mb-4">
          <div className="max-w-[70%] rounded-lg p-4 shadow-sm bg-white dark:bg-gray-700">
            <div className="flex items-center space-x-2 mb-2">
              <Bot size={18} className="text-blue-500" />
              <span className="font-medium text-sm text-gray-900 dark:text-gray-100">
                Le Compagnon du Cœur
              </span>
              <Clock size={14} className="text-gray-500 animate-pulse" />
            </div>
            <div className="flex items-center space-x-1">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Je réfléchis à votre question
              </span>
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Processing Indicator */}
      {isProcessing && (
        <div className="flex justify-center">
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
            <div className="flex items-center space-x-2 text-yellow-800 dark:text-yellow-200">
              <div className="w-4 h-4 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-sm font-medium">Traitement en cours...</span>
            </div>
          </div>
        </div>
      )}

      {/* Scroll anchor */}
      <div ref={messagesEndRef} />
    </div>
  );
};

export default ConversationArea;