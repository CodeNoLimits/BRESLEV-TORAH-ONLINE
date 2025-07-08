// Client API pour connexion FastAPI Backend
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface ApiResponse<T> {
  data?: T
  error?: string
  status: number
}

// Types pour l'API
export interface Book {
  id: string
  title: string
  titleHebrew: string
  description: string
  sections: number
  downloaded: boolean
  starred: boolean
  lastRead?: string
  category: string
}

export interface Text {
  ref: string
  hebrew: string
  english: string
  french?: string
  title: string
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

export interface ChatResponse {
  answer: string
  book?: string
  sources_used?: number
  strategy?: string
  mode?: string
  citations?: string[]
  error?: boolean
}

// Utilitaire de requête
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const url = `${API_BASE}${endpoint}`
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    })

    const data = await response.json()

    return {
      data,
      status: response.status,
      error: response.ok ? undefined : data.detail || 'Unknown error'
    }
  } catch (error) {
    return {
      status: 0,
      error: error instanceof Error ? error.message : 'Network error'
    }
  }
}

// API Books
export const booksApi = {
  // Récupérer tous les livres
  async getAll(): Promise<ApiResponse<Book[]>> {
    return apiRequest<Book[]>('/api/v1/books/all')
  },

  // Récupérer un livre spécifique
  async getById(bookId: string): Promise<ApiResponse<Book>> {
    return apiRequest<Book>(`/api/v1/books/${bookId}`)
  },

  // Télécharger un livre
  async download(bookId: string): Promise<ApiResponse<{ message: string }>> {
    return apiRequest(`/api/v1/books/${bookId}/download`, {
      method: 'POST'
    })
  },

  // Rechercher dans les livres
  async search(query: string, books?: string[]): Promise<ApiResponse<any[]>> {
    const params = new URLSearchParams({ q: query })
    if (books?.length) {
      params.append('books', books.join(','))
    }
    return apiRequest<any[]>(`/api/v1/books/search?${params}`)
  }
}

// API Texts
export const textsApi = {
  // Récupérer un texte par référence
  async getByRef(ref: string): Promise<ApiResponse<Text>> {
    const encodedRef = encodeURIComponent(ref)
    return apiRequest<Text>(`/api/v1/texts/${encodedRef}`)
  },

  // Récupérer une section de livre
  async getSection(bookId: string, section: string): Promise<ApiResponse<Text>> {
    return apiRequest<Text>(`/api/v1/texts/${bookId}/${section}`)
  }
}

// API Gemini (IA Chat)
export const geminiApi = {
  // Chat avec l'IA
  async chat(
    question: string,
    bookContext?: string,
    mode: string = 'study'
  ): Promise<ApiResponse<ChatResponse>> {
    return apiRequest<ChatResponse>('/api/v1/gemini/chat', {
      method: 'POST',
      body: JSON.stringify({
        question,
        book_context: bookContext,
        mode
      })
    })
  },

  // Initialiser les livres pour l'IA
  async initialize(books?: string[]): Promise<ApiResponse<{ message: string; books: string[] }>> {
    return apiRequest('/api/v1/gemini/initialize', {
      method: 'POST',
      body: JSON.stringify({ books })
    })
  },

  // Récupérer le statut d'initialisation
  async getStatus(): Promise<ApiResponse<{
    initialized_books: string[]
    available_books: string[]
    total_summaries: number
    status: string
  }>> {
    return apiRequest('/api/v1/gemini/status')
  },

  // Traduire un texte
  async translate(
    text: string,
    targetLang: string = 'fr'
  ): Promise<ApiResponse<{
    original: string
    translated: string
    target_language: string
    method: string
  }>> {
    return apiRequest('/api/v1/gemini/translate', {
      method: 'POST',
      body: JSON.stringify({
        text,
        target_lang: targetLang
      })
    })
  }
}

// API TTS (Text-to-Speech)
export const ttsApi = {
  // Synthèse vocale
  async synthesize(
    text: string,
    language: string = 'he',
    voice?: string
  ): Promise<ApiResponse<{
    message: string
    language: string
    voice?: string
    audio_url: string
  }>> {
    return apiRequest('/api/v1/tts/', {
      method: 'POST',
      body: JSON.stringify({
        text,
        language,
        voice
      })
    })
  }
}

// API Health Check
export const healthApi = {
  async check(): Promise<ApiResponse<{ status: string; api: string }>> {
    return apiRequest('/health')
  },

  async backend(): Promise<ApiResponse<{ status: string; api: string }>> {
    return apiRequest('/api/v1/health')
  }
}

// Hooks React pour utiliser l'API
export const useApi = () => {
  return {
    books: booksApi,
    texts: textsApi,
    gemini: geminiApi,
    tts: ttsApi,
    health: healthApi
  }
}

export default {
  books: booksApi,
  texts: textsApi,
  gemini: geminiApi,
  tts: ttsApi,
  health: healthApi
}