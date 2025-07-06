import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChatMode, Message } from '../types';
import { geminiApi } from '../services/api';

interface ChatInterfaceProps {
  mode: ChatMode;
  context?: string;
  isOpen: boolean;
  onClose: () => void;
}

interface MessageBubbleProps {
  message: Message;
  isLast: boolean;
}

function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`max-w-[80%] rounded-lg p-3 ${
        isUser 
          ? 'bg-sky-600 text-white' 
          : 'bg-slate-800 text-slate-100'
      }`}>
        <div className="text-sm whitespace-pre-wrap">
          {message.content}
        </div>
        
        {/* References */}
        {message.references && message.references.length > 0 && (
          <div className="mt-2 pt-2 border-t border-slate-600">
            <div className="text-xs text-slate-300 mb-1">Références:</div>
            {message.references.map((ref, index) => (
              <div key={index} className="text-xs text-sky-300">
                • {ref.text}
              </div>
            ))}
          </div>
        )}
        
        <div className="text-xs text-slate-400 mt-1">
          {new Date(message.createdAt).toLocaleTimeString('fr-FR', {
            hour: '2-digit',
            minute: '2-digit'
          })}
        </div>
      </div>
    </div>
  );
}

export function ChatInterface({ mode, context, isOpen, onClose }: ChatInterfaceProps) {
  const [currentConversationId, setCurrentConversationId] = useState<number | null>(null);
  const [inputMessage, setInputMessage] = useState('');
  const [isListening, setIsListening] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);
  const queryClient = useQueryClient();

  // Speech recognition setup
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      
      if (recognitionRef.current) {
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = false;
        recognitionRef.current.lang = 'fr-FR';

        recognitionRef.current.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          setInputMessage(prev => prev + (prev ? ' ' : '') + transcript);
          setIsListening(false);
        };

        recognitionRef.current.onerror = () => {
          setIsListening(false);
        };

        recognitionRef.current.onend = () => {
          setIsListening(false);
        };
      }
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  // Fetch current conversation
  const { data: conversation } = useQuery({
    queryKey: ['conversation', currentConversationId],
    queryFn: () => currentConversationId ? geminiApi.getConversation(currentConversationId) : null,
    enabled: !!currentConversationId
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: (message: string) => geminiApi.chat({
      message,
      mode,
      context,
      conversationId: currentConversationId || undefined
    }),
    onSuccess: (response) => {
      setCurrentConversationId(response.conversationId);
      setInputMessage('');
      
      // Invalidate and refetch conversation
      queryClient.invalidateQueries({
        queryKey: ['conversation', response.conversationId]
      });
    }
  });

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation?.messages]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSendMessage = () => {
    const message = inputMessage.trim();
    if (message && !sendMessageMutation.isPending) {
      sendMessageMutation.mutate(message);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      setIsListening(true);
      recognitionRef.current.start();
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
  };

  const clearConversation = () => {
    setCurrentConversationId(null);
    setInputMessage('');
    queryClient.removeQueries({ queryKey: ['conversation'] });
  };

  if (!isOpen) return null;

  return (
    <div className="h-full flex flex-col bg-slate-900/50">
      {/* Header */}
      <div className="border-b border-slate-800 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-sky-400">
              Chat Rabbi Nahman
            </h3>
            <p className="text-xs text-slate-400">
              Mode: {mode === 'chapter' ? 'Chapitre' : mode === 'book' ? 'Livre' : 'Global'}
              {context && ` • ${context}`}
            </p>
          </div>
          
          <div className="flex items-center space-x-2">
            {/* Clear conversation */}
            {conversation && (
              <button
                onClick={clearConversation}
                className="p-1 hover:bg-slate-800 rounded text-slate-400"
                title="Nouvelle conversation"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                        d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </button>
            )}
            
            {/* Close button */}
            <button
              onClick={onClose}
              className="p-1 hover:bg-slate-800 rounded text-slate-400"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {!conversation || !conversation.messages?.length ? (
          <div className="text-center text-slate-400 mt-8">
            <svg className="w-12 h-12 mx-auto mb-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-3.582 8-8 8a8.001 8.001 0 01-7.996-7.808c0-4.418 3.582-8 8-8s8 3.582 8 8z" />
            </svg>
            <p className="text-sm">
              Posez vos questions sur les enseignements de Rabbi Nahman
            </p>
            <p className="text-xs text-slate-500 mt-2">
              Les réponses sont basées sur les textes authentiques
            </p>
          </div>
        ) : (
          <>
            {conversation.messages.map((message, index) => (
              <MessageBubble
                key={message.id}
                message={message}
                isLast={index === conversation.messages!.length - 1}
              />
            ))}
            
            {/* Loading indicator */}
            {sendMessageMutation.isPending && (
              <div className="flex justify-start">
                <div className="bg-slate-800 rounded-lg p-3 max-w-[80%]">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-slate-800 p-4">
        <div className="flex space-x-2">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Posez votre question..."
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm 
                       placeholder-slate-400 focus:border-sky-500 focus:outline-none resize-none"
              rows={2}
              disabled={sendMessageMutation.isPending}
            />
            
            {/* Voice input button */}
            {recognitionRef.current && (
              <button
                onClick={isListening ? stopListening : startListening}
                className={`absolute right-2 bottom-2 p-1 rounded transition-colors ${
                  isListening 
                    ? 'bg-red-600 hover:bg-red-700 text-white' 
                    : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                }`}
                title={isListening ? 'Arrêter l\'écoute' : 'Écoute vocale'}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                        d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              </button>
            )}
          </div>
          
          <button
            onClick={handleSendMessage}
            disabled={!inputMessage.trim() || sendMessageMutation.isPending}
            className="px-4 py-2 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 disabled:cursor-not-allowed
                     text-white rounded-lg transition-colors flex items-center space-x-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
            <span className="hidden sm:inline">Envoyer</span>
          </button>
        </div>
        
        {/* Error display */}
        {sendMessageMutation.isError && (
          <div className="mt-2 text-red-400 text-xs">
            Erreur: {sendMessageMutation.error?.message || 'Impossible d\'envoyer le message'}
          </div>
        )}
      </div>
    </div>
  );
}