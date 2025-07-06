import { 
  ApiResponse, 
  Book, 
  Chapter, 
  Conversation, 
  TranslationRequest, 
  TranslationResponse,
  ChatRequest, 
  ChatResponse,
  TTSRequest, 
  TTSResponse,
  SefariaText,
  SearchFilters 
} from '../types';

// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

class ApiError extends Error {
  constructor(public statusCode: number, message: string, public details?: any) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * HTTP Client with error handling
 */
class HttpClient {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  private async request<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new ApiError(
          response.status, 
          data.message || 'Request failed',
          data.details
        );
      }

      return data;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      
      // Network or other errors
      throw new ApiError(
        0, 
        'Connexion impossible. Vérifiez votre connexion internet.',
        error
      );
    }
  }

  async get<T>(endpoint: string, params?: Record<string, any>): Promise<ApiResponse<T>> {
    const searchParams = params ? new URLSearchParams(params).toString() : '';
    const url = searchParams ? `${endpoint}?${searchParams}` : endpoint;
    return this.request<T>(url);
  }

  async post<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'DELETE',
    });
  }
}

// Create HTTP client instance
const client = new HttpClient(API_BASE_URL);

/**
 * Books API Service
 */
export const booksApi = {
  /**
   * Get all books with optional search
   */
  async getBooks(filters?: SearchFilters): Promise<Book[]> {
    const response = await client.get<Book[]>('/books', filters);
    return response.data || [];
  },

  /**
   * Get specific book with chapters
   */
  async getBook(id: number): Promise<Book> {
    const response = await client.get<Book>(`/books/${id}`);
    if (!response.data) {
      throw new ApiError(404, 'Livre non trouvé');
    }
    return response.data;
  },

  /**
   * Get chapters for a book
   */
  async getChapters(bookId: number): Promise<Chapter[]> {
    const response = await client.get<Chapter[]>(`/books/${bookId}/chapters`);
    return response.data || [];
  },

  /**
   * Get specific chapter
   */
  async getChapter(bookId: number, chapterNumber: number): Promise<Chapter> {
    const response = await client.get<Chapter>(`/books/${bookId}/chapters/${chapterNumber}`);
    if (!response.data) {
      throw new ApiError(404, 'Chapitre non trouvé');
    }
    return response.data;
  },

  /**
   * Get library statistics
   */
  async getStats(): Promise<any> {
    const response = await client.get<any>('/books/stats');
    return response.data;
  }
};

/**
 * Sefaria API Service
 */
export const sefariaApi = {
  /**
   * Get available Breslev books
   */
  async getBreslevBooks(): Promise<any[]> {
    const response = await client.get<any[]>('/sefaria/books');
    return response.data || [];
  },

  /**
   * Get text by reference
   */
  async getText(ref: string): Promise<SefariaText> {
    const response = await client.get<SefariaText>(`/sefaria/text/${encodeURIComponent(ref)}`);
    if (!response.data) {
      throw new ApiError(404, 'Texte non trouvé');
    }
    return response.data;
  },

  /**
   * Search texts
   */
  async searchTexts(query: string, filters?: SearchFilters): Promise<any> {
    const response = await client.post<any>('/sefaria/search', { 
      q: query, 
      ...filters 
    });
    return response.data;
  },

  /**
   * Get book contents/structure
   */
  async getBookContents(bookTitle: string): Promise<any> {
    const response = await client.get<any>(`/sefaria/contents/${encodeURIComponent(bookTitle)}`);
    return response.data;
  }
};

/**
 * Gemini AI Service
 */
export const geminiApi = {
  /**
   * Translate text
   */
  async translateText(request: TranslationRequest): Promise<TranslationResponse> {
    const response = await client.post<TranslationResponse>('/gemini/translate', request);
    if (!response.data) {
      throw new ApiError(500, 'Erreur de traduction');
    }
    return response.data;
  },

  /**
   * Chat with AI
   */
  async chat(request: ChatRequest): Promise<ChatResponse> {
    const response = await client.post<ChatResponse>('/gemini/chat', request);
    if (!response.data) {
      throw new ApiError(500, 'Erreur de conversation');
    }
    return response.data;
  },

  /**
   * Get conversations
   */
  async getConversations(): Promise<Conversation[]> {
    const response = await client.get<Conversation[]>('/gemini/conversations');
    return response.data || [];
  },

  /**
   * Get conversation with messages
   */
  async getConversation(id: number): Promise<Conversation> {
    const response = await client.get<Conversation>(`/gemini/conversations/${id}`);
    if (!response.data) {
      throw new ApiError(404, 'Conversation non trouvée');
    }
    return response.data;
  },

  /**
   * Delete conversation
   */
  async deleteConversation(id: number): Promise<void> {
    await client.delete(`/gemini/conversations/${id}`);
  }
};

/**
 * TTS Service
 */
export const ttsApi = {
  /**
   * Synthesize speech
   */
  async synthesizeSpeech(request: TTSRequest): Promise<TTSResponse> {
    const response = await client.post<TTSResponse>('/tts/synthesize', request);
    if (!response.data) {
      throw new ApiError(500, 'Erreur de synthèse vocale');
    }
    return response.data;
  },

  /**
   * Get available voices
   */
  async getVoices(languageCode?: string): Promise<any[]> {
    const response = await client.get<any[]>('/tts/voices', 
      languageCode ? { languageCode } : undefined
    );
    return response.data || [];
  },

  /**
   * Clean up old audio files
   */
  async cleanupAudio(daysOld: number = 30): Promise<any> {
    const response = await client.post<any>('/tts/cleanup', { daysOld });
    return response.data;
  }
};

// Export API error class
export { ApiError };