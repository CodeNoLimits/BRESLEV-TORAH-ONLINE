import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  Send, 
  Book, 
  Search,
  ChevronRight,
  Loader2,
  Languages
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Message {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
  sources?: Array<{
    bookId: string;
    bookTitle: string;
    chunkId: string;
    content: string;
    isHebrew: boolean;
    translation?: string;
  }>;
}

interface AvailableBook {
  id: string;
  title: string;
  titleFrench: string;
  titleHebrew?: string;
  language: 'french' | 'hebrew' | 'mixed';
  stats: {
    lines: number;
    chunks: number;
    characters: number;
  };
}

export default function AppMultiBook() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isTTSEnabled, setIsTTSEnabled] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [availableBooks, setAvailableBooks] = useState<AvailableBook[]>([]);
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
  const recognitionRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Charger les livres disponibles
  useEffect(() => {
    loadAvailableBooks();
  }, []);

  const loadAvailableBooks = async () => {
    try {
      const response = await fetch('/api/multi-book/books');
      const data = await response.json();
      setAvailableBooks(data.books || []);
      
      // Sélectionner le premier livre par défaut
      if (data.books && data.books.length > 0 && !selectedBookId) {
        setSelectedBookId(data.books[0].id);
      }
    } catch (error) {
      console.error('Erreur chargement livres:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les livres",
        variant: "destructive"
      });
    }
  };

  // Initialiser la reconnaissance vocale
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'fr-FR';
      recognition.maxAlternatives = 1;
      
      recognition.onresult = (event: any) => {
        const last = event.results.length - 1;
        const transcript = event.results[last][0].transcript;
        
        if (event.results[last].isFinal) {
          setInput(transcript);
          setIsListening(false);
        }
      };
      
      recognition.onerror = (event: any) => {
        console.error('Erreur STT:', event.error);
        setIsListening(false);
      };
      
      recognition.onend = () => {
        setIsListening(false);
      };
      
      recognitionRef.current = recognition;
    }
  }, []);

  // Auto-scroll vers le bas
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Basculer la reconnaissance vocale
  const toggleListening = useCallback(() => {
    if (!recognitionRef.current) return;
    
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      // Arrêter le TTS si actif
      if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
      }
      
      recognitionRef.current.start();
      setIsListening(true);
    }
  }, [isListening]);

  // Lire un texte avec TTS
  const speak = useCallback((text: string) => {
    if (!isTTSEnabled || !text) return;
    
    // Nettoyer le texte pour le TTS
    const cleanText = text
      .replace(/[\u0590-\u05FF]/g, '') // Retirer l'hébreu
      .replace(/[*_]/g, '') // Retirer le markdown
      .trim();
    
    if (!cleanText) return;
    
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'fr-FR';
    utterance.rate = 0.9;
    
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }, [isTTSEnabled]);

  // Traduire un chunk hébreu
  const translateChunk = async (chunkId: string) => {
    try {
      const response = await fetch('/api/multi-book/translate-chunk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chunkId })
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Mettre à jour le message avec la traduction
        setMessages(prev => prev.map(msg => ({
          ...msg,
          sources: msg.sources?.map(source => 
            source.chunkId === chunkId 
              ? { ...source, translation: data.translation }
              : source
          )
        })));
        
        // Lire la traduction si TTS activé
        speak(data.translation);
      }
    } catch (error) {
      console.error('Erreur traduction:', error);
      toast({
        title: "Erreur",
        description: "Impossible de traduire ce passage",
        variant: "destructive"
      });
    }
  };

  // Envoyer un message
  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;
    
    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: input,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    
    try {
      const endpoint = selectedBookId 
        ? `/api/multi-book/search/${selectedBookId}`
        : '/api/multi-book/search';
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: userMessage.content })
      });
      
      const data = await response.json();
      
      // Extraire les sources des résultats
      const sources: Message['sources'] = [];
      
      if (selectedBookId && data.relevantChunks) {
        // Recherche dans un livre spécifique
        const book = availableBooks.find(b => b.id === selectedBookId);
        data.relevantChunks.forEach((chunk: any) => {
          sources.push({
            bookId: selectedBookId,
            bookTitle: book?.titleFrench || '',
            chunkId: chunk.id,
            content: chunk.content,
            isHebrew: chunk.isRTL || false
          });
        });
      } else if (data.bookResults) {
        // Recherche dans tous les livres
        data.bookResults.forEach((bookResult: any) => {
          if (bookResult.foundInBook) {
            bookResult.relevantChunks.forEach((chunk: any) => {
              sources.push({
                bookId: bookResult.bookId,
                bookTitle: bookResult.bookTitle,
                chunkId: chunk.id,
                content: chunk.content,
                isHebrew: chunk.isRTL || false
              });
            });
          }
        });
      }
      
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: data.answer,
        timestamp: new Date(),
        sources: sources.length > 0 ? sources : undefined
      };
      
      setMessages(prev => [...prev, aiMessage]);
      speak(aiMessage.content);
    } catch (error) {
      console.error('Erreur envoi message:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'envoyer le message",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const selectedBook = availableBooks.find(b => b.id === selectedBookId);

  return (
    <div className="flex h-screen bg-slate-950">
      {/* Sidebar avec liste des livres */}
      <div className={`${sidebarOpen ? 'w-80' : 'w-0'} transition-all duration-300 overflow-hidden`}>
        <Card className="h-full rounded-none border-r border-slate-800 bg-slate-900">
          <CardContent className="p-0 h-full flex flex-col">
            <div className="p-4 border-b border-slate-800">
              <h2 className="text-lg font-semibold text-amber-400 flex items-center gap-2">
                <Book size={20} />
                Bibliothèque Breslov
              </h2>
            </div>
            
            <ScrollArea className="flex-1">
              <div className="p-4 space-y-2">
                <Button
                  variant={!selectedBookId ? 'default' : 'ghost'}
                  className="w-full justify-start"
                  onClick={() => setSelectedBookId(null)}
                >
                  <Search size={16} className="mr-2" />
                  Rechercher dans tous les livres
                </Button>
                
                <div className="text-xs text-slate-500 mt-4 mb-2">Livres disponibles</div>
                
                {availableBooks.map(book => (
                  <Button
                    key={book.id}
                    variant={selectedBookId === book.id ? 'default' : 'ghost'}
                    className="w-full justify-start text-left"
                    onClick={() => setSelectedBookId(book.id)}
                  >
                    <div className="flex-1">
                      <div className="font-medium">{book.titleFrench}</div>
                      {book.titleHebrew && (
                        <div className="text-xs text-slate-400 mt-1" dir="rtl">
                          {book.titleHebrew}
                        </div>
                      )}
                      <div className="text-xs text-slate-500 mt-1">
                        {book.language === 'hebrew' ? '🇮🇱' : '🇫🇷'} {book.stats.chunks} sections
                      </div>
                    </div>
                  </Button>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Zone principale */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-slate-900 border-b border-slate-800 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarOpen(!sidebarOpen)}
              >
                <ChevronRight className={`transform transition-transform ${sidebarOpen ? 'rotate-180' : ''}`} />
              </Button>
              
              <div>
                <h1 className="text-xl font-bold text-amber-400">
                  {selectedBook ? selectedBook.titleFrench : 'Tous les livres'}
                </h1>
                {selectedBook?.titleHebrew && (
                  <div className="text-sm text-slate-400" dir="rtl">
                    {selectedBook.titleHebrew}
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsTTSEnabled(!isTTSEnabled)}
                title={isTTSEnabled ? "Désactiver TTS" : "Activer TTS"}
              >
                {isTTSEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
              </Button>
            </div>
          </div>
        </div>

        {/* Zone de chat */}
        <ScrollArea className="flex-1 p-4">
          <div className="max-w-4xl mx-auto space-y-4">
            {messages.map(message => (
              <div
                key={message.id}
                className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <Card className={`max-w-[80%] ${
                  message.type === 'user' 
                    ? 'bg-amber-900/20 border-amber-800' 
                    : 'bg-slate-800 border-slate-700'
                }`}>
                  <CardContent className="p-4">
                    <div className="prose prose-invert max-w-none">
                      <div dangerouslySetInnerHTML={{ 
                        __html: message.content.replace(/\n/g, '<br>') 
                      }} />
                    </div>
                    
                    {/* Afficher les sources */}
                    {message.sources && message.sources.length > 0 && (
                      <div className="mt-4 space-y-2">
                        <div className="text-xs text-slate-400 font-semibold">Sources trouvées:</div>
                        {message.sources.map((source, idx) => (
                          <div key={idx} className="bg-slate-900 rounded p-3">
                            <div className="flex justify-between items-start mb-2">
                              <div className="text-xs text-amber-400 font-medium">
                                📖 {source.bookTitle}
                              </div>
                              {source.isHebrew && !source.translation && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => translateChunk(source.chunkId)}
                                  className="text-xs"
                                >
                                  <Languages size={14} className="mr-1" />
                                  Traduire
                                </Button>
                              )}
                            </div>
                            
                            <div className={`text-sm ${source.isHebrew ? 'text-right' : ''}`} 
                                 dir={source.isHebrew ? 'rtl' : 'ltr'}>
                              {source.content.substring(0, 200)}...
                            </div>
                            
                            {source.translation && (
                              <div className="mt-2 pt-2 border-t border-slate-700 text-sm text-slate-300">
                                <div className="text-xs text-slate-500 mb-1">Traduction:</div>
                                {source.translation}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex justify-start">
                <Card className="bg-slate-800 border-slate-700">
                  <CardContent className="p-4">
                    <Loader2 className="animate-spin" size={20} />
                  </CardContent>
                </Card>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Zone de saisie */}
        <div className="border-t border-slate-800 bg-slate-900 p-4">
          <div className="max-w-4xl mx-auto flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Posez votre question..."
              className="flex-1"
              disabled={isLoading}
            />
            
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleListening}
              className={isListening ? 'text-red-400' : ''}
            >
              {isListening ? <MicOff size={20} /> : <Mic size={20} />}
            </Button>
            
            <Button
              onClick={sendMessage}
              disabled={isLoading || !input.trim()}
            >
              {isLoading ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}