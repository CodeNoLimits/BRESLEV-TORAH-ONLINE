import axios from 'axios'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export interface Book {
  id: string
  slug: string
  title: string
  title_en: string
  heTitle?: string
  author: string
  category: string
  description?: string
  parts: number
  order_index: number
  is_active: boolean
  created_at: string
  updated_at: string
  text_depth?: number
  total_chapters?: number
  total_verses?: number
}

export interface Text {
  id: string
  ref: string
  book_slug: string
  chapter?: number
  verse?: number
  section?: string
  hebrew?: string
  english?: string
  french?: string
  language: string
  version?: string
  is_active: boolean
  created_at: string
  updated_at: string
  full_text?: string
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  session_id: string
  user_id: string
  created_at: string
  metadata?: Record<string, any>
  context_used: boolean
  citations?: Array<{
    index: number
    ref: string
    text: string
    book?: string
    chapter?: number
    verse?: number
    score?: number
  }>
  model_used?: string
  tokens_used?: number
  response_time_ms?: number
  user_rating?: number
}

export interface ChatRequest {
  message: string
  session_id: string
  book_filter?: string
  language?: string
  stream?: boolean
}

export interface ChatResponse {
  response: string
  session_id: string
  message_id: string
  citations: Array<{
    index: number
    ref: string
    text: string
    book?: string
    chapter?: number
    verse?: number
    score?: number
  }>
  context_used: boolean
  model_used: string
  tokens_used?: number
  response_time_ms: number
}

export const booksApi = {
  getAll: () => api.get<Book[]>('/books'),
  getBySlug: (slug: string) => api.get<Book>(`/books/${slug}`),
}

export const textsApi = {
  search: (query: string, bookSlug?: string, language = 'he') => 
    api.get<Text[]>('/texts/search', { 
      params: { query, book_slug: bookSlug, language } 
    }),
  getByRef: (ref: string) => api.get<Text>(`/texts/${ref}`),
  getRange: (bookSlug: string, startChapter: number, endChapter: number, language = 'he') =>
    api.get<Text[]>('/texts/range', {
      params: { book_slug: bookSlug, start_chapter: startChapter, end_chapter: endChapter, language }
    }),
}

export const chatApi = {
  sendMessage: (request: ChatRequest) => 
    api.post<ChatResponse>('/chat', request),
  getHistory: (sessionId: string) => 
    api.get<ChatMessage[]>(`/chat/history/${sessionId}`),
  getSessions: () => 
    api.get<Array<{
      id: string
      title?: string
      created_at: string
      updated_at: string
      total_messages: number
      last_activity: string
    }>>('/chat/sessions'),
}

export const ttsApi = {
  synthesize: (text: string, language = 'he', voice?: string) =>
    api.post<Blob>('/tts/synthesize', 
      { text, language, voice }, 
      { responseType: 'blob' }
    ),
}