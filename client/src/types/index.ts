// Shared types for the application

export interface Book {
  id: number;
  sefariaRef: string;
  titleHe: string;
  titleEn: string;
  titleFr?: string;
  author: string;
  category: string;
  content: any;
  metadata?: any;
  createdAt: string;
  updatedAt: string;
  chapters?: Chapter[];
}

export interface Chapter {
  id: number;
  bookId: number;
  chapterNumber: number;
  sefariaRef: string;
  titleHe?: string;
  titleEn?: string;
  titleFr?: string;
  contentHe: string;
  contentEn: string;
  contentFr?: string;
  metadata?: any;
  createdAt: string;
  updatedAt: string;
  book?: Book;
}

export interface Translation {
  id: number;
  sourceText: string;
  sourceLanguage: string;
  targetLanguage: string;
  translatedText: string;
  chunkIndex: number;
  totalChunks: number;
  reference?: string;
  createdAt: string;
}

export interface Conversation {
  id: number;
  title: string;
  mode: ChatMode;
  contextReference?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  messages?: Message[];
}

export interface Message {
  id: number;
  conversationId: number;
  role: 'user' | 'assistant';
  content: string;
  references?: Reference[];
  metadata?: any;
  createdAt: string;
}

export interface Reference {
  text: string;
  type: 'direct' | 'contextual';
  sefariaRef?: string;
}

export interface AudioCache {
  id: number;
  textHash: string;
  text: string;
  language: string;
  voiceId: string;
  audioUrl: string;
  duration?: number;
  metadata?: any;
  createdAt: string;
  lastAccessedAt: string;
}

// Enums and Union Types
export type ChatMode = 'chapter' | 'book' | 'global';
export type Language = 'he' | 'en' | 'fr';

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  count?: number;
}

export interface TranslationRequest {
  text: string;
  sourceLanguage: string;
  targetLanguage: string;
  reference?: string;
}

export interface TranslationResponse {
  translatedText: string;
  fromCache: boolean;
  chunks?: number;
}

export interface ChatRequest {
  message: string;
  mode: ChatMode;
  context?: string;
  conversationId?: number;
}

export interface ChatResponse {
  response: string;
  conversationId: number;
  mode: ChatMode;
  context?: string;
}

export interface TTSRequest {
  text: string;
  language: Language;
  voiceId?: string;
}

export interface TTSResponse {
  audioUrl: string;
  fromCache: boolean;
  duration?: number;
}

// Sefaria API Types
export interface SefariaText {
  ref: string;
  heRef: string;
  text: string | string[];
  he: string | string[];
  versions: any[];
  book: string;
  sections: number[];
  next?: string;
  prev?: string;
}

export interface SefariaIndex {
  title: string;
  heTitle: string;
  categories: string[];
  authors?: string[];
}

// UI State Types
export interface AppState {
  selectedBook: Book | null;
  selectedChapter: Chapter | null;
  chatMode: ChatMode;
  isLoading: boolean;
  error: string | null;
}

export interface TTSState {
  isPlaying: boolean;
  isPaused: boolean;
  currentText: string | null;
  currentLanguage: Language;
  volume: number;
  rate: number;
  voice: string | null;
  isSupported: boolean;
}

// Error Types
export interface AppError {
  message: string;
  code?: string;
  statusCode?: number;
  details?: any;
}

// Form Types
export interface SearchFilters {
  q?: string;
  query?: string;
  book?: string;
  category?: string;
  exact?: boolean;
  limit?: number;
}

// Hook Return Types
export interface UseAppReturn {
  selectedBook: Book | null;
  selectedChapter: Chapter | null;
  chatMode: ChatMode;
  isLoading: boolean;
  error: string | null;
  setSelectedBook: (book: Book | null) => void;
  setSelectedChapter: (chapter: Chapter | null) => void;
  setChatMode: (mode: ChatMode) => void;
  clearError: () => void;
}

export interface UseTTSReturn {
  speak: (text: string, language?: Language) => Promise<void>;
  stop: () => void;
  pause: () => void;
  resume: () => void;
  state: TTSState;
  isSupported: boolean;
}

export interface UseSefariaReturn {
  books: Book[];
  getBook: (id: number) => Promise<Book>;
  getText: (ref: string) => Promise<SefariaText>;
  searchTexts: (query: string, filters?: SearchFilters) => Promise<any>;
  isLoading: boolean;
  error: string | null;
}