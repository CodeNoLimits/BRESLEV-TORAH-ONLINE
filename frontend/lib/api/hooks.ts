import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/lib/auth-store'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

// Types
interface Book {
  id: number
  title: string
  author: string
  description: string
  language: string
  category: string
  difficulty_level: string
  total_chapters: number
  total_texts: number
  image_url?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

interface Text {
  id: number
  book_id: number
  chapter: number
  verse?: number
  section?: string
  content_hebrew?: string
  content_english?: string
  content_french?: string
  transliteration?: string
  commentary?: string
  audio_url_hebrew?: string
  audio_url_english?: string
  audio_url_french?: string
  created_at: string
  updated_at: string
}

interface ChatMessage {
  id: number
  chat_id: number
  content: string
  message_type: 'user' | 'assistant' | 'system'
  metadata: Record<string, any>
  created_at: string
}

interface Chat {
  id: number
  user_id: number
  title: string
  context?: string
  language: string
  is_active: boolean
  created_at: string
  updated_at: string
  messages?: ChatMessage[]
}

interface CreateChatRequest {
  title: string
  context?: string
  language?: string
}

interface SendMessageRequest {
  chat_id: number
  content: string
  context?: Record<string, any>
}

// API Helper function
const apiRequest = async (
  endpoint: string, 
  options: RequestInit = {}
): Promise<Response> => {
  const { accessToken, refreshAccessToken } = useAuthStore.getState()
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  }

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`
  }

  let response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  })

  // Handle token refresh
  if (response.status === 401 && accessToken) {
    try {
      const newToken = await refreshAccessToken()
      headers.Authorization = `Bearer ${newToken}`
      
      response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
      })
    } catch (error) {
      // Refresh failed, redirect to login
      useAuthStore.getState().clearAuth()
      window.location.href = '/login'
      throw error
    }
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: 'Network error' }))
    throw new Error(errorData.detail || `HTTP error! status: ${response.status}`)
  }

  return response
}

// Auth Hooks
export const useAuthMutation = () => {
  const queryClient = useQueryClient()
  const { login, register, logout } = useAuthStore()

  return {
    loginMutation: useMutation({
      mutationFn: async ({ email, password, remember }: { 
        email: string
        password: string
        remember?: boolean 
      }) => {
        return login(email, password, remember)
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['user'] })
      },
    }),

    registerMutation: useMutation({
      mutationFn: async ({ 
        email, 
        password, 
        name, 
        passwordConfirm 
      }: { 
        email: string
        password: string
        name: string
        passwordConfirm: string
      }) => {
        return register(email, password, name, passwordConfirm)
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['user'] })
      },
    }),

    logoutMutation: useMutation({
      mutationFn: logout,
      onSuccess: () => {
        queryClient.clear()
      },
    }),
  }
}

// Books Hooks
export const useBooks = (filters?: {
  language?: string
  category?: string
  search?: string
}) => {
  return useQuery({
    queryKey: ['books', filters],
    queryFn: async (): Promise<any> => {
      const response = await apiRequest('/api/v1/books/all')
      return response
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

export const useBook = (bookId: number) => {
  return useQuery({
    queryKey: ['book', bookId],
    queryFn: async (): Promise<Book> => {
      const response = await apiRequest(`/api/v1/books/${bookId}`)
      return response.json()
    },
    enabled: !!bookId,
    staleTime: 5 * 60 * 1000,
  })
}

// Texts Hooks
export const useTexts = (bookId: number, chapter?: number) => {
  return useQuery({
    queryKey: ['texts', bookId, chapter],
    queryFn: async (): Promise<Text[]> => {
      const params = new URLSearchParams()
      params.append('book_id', bookId.toString())
      if (chapter) params.append('chapter', chapter.toString())
      
      const response = await apiRequest(`/api/v1/texts?${params}`)
      return response.json()
    },
    enabled: !!bookId,
    staleTime: 10 * 60 * 1000, // 10 minutes
  })
}

export const useText = (textId: number) => {
  return useQuery({
    queryKey: ['text', textId],
    queryFn: async (): Promise<Text> => {
      const response = await apiRequest(`/api/v1/texts/${textId}`)
      return response.json()
    },
    enabled: !!textId,
    staleTime: 10 * 60 * 1000,
  })
}

export const useSearchTexts = (query: string, filters?: {
  book_id?: number
  language?: string
  chapter?: number
}) => {
  return useQuery({
    queryKey: ['search-texts', query, filters],
    queryFn: async (): Promise<Text[]> => {
      const params = new URLSearchParams()
      params.append('q', query)
      if (filters?.book_id) params.append('book_id', filters.book_id.toString())
      if (filters?.language) params.append('language', filters.language)
      if (filters?.chapter) params.append('chapter', filters.chapter.toString())
      
      const response = await apiRequest(`/api/v1/texts/search?${params}`)
      return response.json()
    },
    enabled: !!query && query.length >= 2,
    staleTime: 2 * 60 * 1000, // 2 minutes
  })
}

// Chat Hooks
export const useChats = () => {
  return useQuery({
    queryKey: ['chats'],
    queryFn: async (): Promise<Chat[]> => {
      const response = await apiRequest('/api/v1/chats')
      return response.json()
    },
    staleTime: 1 * 60 * 1000, // 1 minute
  })
}

export const useChat = (chatId: number) => {
  return useQuery({
    queryKey: ['chat', chatId],
    queryFn: async (): Promise<Chat> => {
      const response = await apiRequest(`/api/v1/chats/${chatId}`)
      return response.json()
    },
    enabled: !!chatId,
    staleTime: 30 * 1000, // 30 seconds
  })
}

export const useChatMessages = (chatId: number) => {
  return useQuery({
    queryKey: ['chat-messages', chatId],
    queryFn: async (): Promise<ChatMessage[]> => {
      const response = await apiRequest(`/api/v1/chats/${chatId}/messages`)
      return response.json()
    },
    enabled: !!chatId,
    refetchInterval: 5000, // Refetch every 5 seconds for real-time updates
  })
}

export const useChatMutations = () => {
  const queryClient = useQueryClient()

  return {
    createChatMutation: useMutation({
      mutationFn: async (data: CreateChatRequest): Promise<Chat> => {
        const response = await apiRequest('/api/v1/chats', {
          method: 'POST',
          body: JSON.stringify(data),
        })
        return response.json()
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['chats'] })
      },
    }),

    sendMessageMutation: useMutation({
      mutationFn: async (data: SendMessageRequest): Promise<ChatMessage> => {
        const response = await apiRequest(`/api/v1/chats/${data.chat_id}/messages`, {
          method: 'POST',
          body: JSON.stringify({
            content: data.content,
            context: data.context,
          }),
        })
        return response.json()
      },
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries({ queryKey: ['chat-messages', variables.chat_id] })
        queryClient.invalidateQueries({ queryKey: ['chat', variables.chat_id] })
      },
    }),

    deleteChatMutation: useMutation({
      mutationFn: async (chatId: number): Promise<void> => {
        await apiRequest(`/api/v1/chats/${chatId}`, {
          method: 'DELETE',
        })
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['chats'] })
      },
    }),
  }
}

// TTS Hooks
export const useTTS = () => {
  return {
    generateAudioMutation: useMutation({
      mutationFn: async ({ 
        text, 
        language, 
        voice 
      }: {
        text: string
        language: 'he' | 'en' | 'fr'
        voice?: string
      }): Promise<{ audio_url: string }> => {
        const response = await apiRequest('/api/v1/tts/generate', {
          method: 'POST',
          body: JSON.stringify({ text, language, voice }),
        })
        return response.json()
      },
    }),
  }
}

// User Profile Hooks
export const useUserProfile = () => {
  const { user } = useAuthStore()
  
  return useQuery({
    queryKey: ['user-profile', user?.id],
    queryFn: async () => {
      const response = await apiRequest('/api/v1/auth/me')
      return response.json()
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  })
}

export const useUserMutations = () => {
  const queryClient = useQueryClient()

  return {
    updateProfileMutation: useMutation({
      mutationFn: async (data: {
        name?: string
        bio?: string
        preferred_language?: string
        study_level?: string
      }) => {
        const response = await apiRequest('/api/v1/users/profile', {
          method: 'PATCH',
          body: JSON.stringify(data),
        })
        return response.json()
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['user-profile'] })
      },
    }),

    changePasswordMutation: useMutation({
      mutationFn: async (data: {
        current_password: string
        new_password: string
        confirm_password: string
      }) => {
        const response = await apiRequest('/api/v1/auth/change-password', {
          method: 'POST',
          body: JSON.stringify(data),
        })
        return response.json()
      },
    }),
  }
}

// Bookmarks Hooks
export const useBookmarks = () => {
  return useQuery({
    queryKey: ['bookmarks'],
    queryFn: async () => {
      const response = await apiRequest('/api/v1/bookmarks')
      return response.json()
    },
    staleTime: 2 * 60 * 1000,
  })
}

export const useBookmarkMutations = () => {
  const queryClient = useQueryClient()

  return {
    createBookmarkMutation: useMutation({
      mutationFn: async (data: {
        text_id: number
        note?: string
        tags?: string[]
        is_favorite?: boolean
      }) => {
        const response = await apiRequest('/api/v1/bookmarks', {
          method: 'POST',
          body: JSON.stringify(data),
        })
        return response.json()
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['bookmarks'] })
      },
    }),

    updateBookmarkMutation: useMutation({
      mutationFn: async ({ 
        id, 
        ...data 
      }: {
        id: number
        note?: string
        tags?: string[]
        is_favorite?: boolean
      }) => {
        const response = await apiRequest(`/api/v1/bookmarks/${id}`, {
          method: 'PATCH',
          body: JSON.stringify(data),
        })
        return response.json()
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['bookmarks'] })
      },
    }),

    deleteBookmarkMutation: useMutation({
      mutationFn: async (id: number) => {
        await apiRequest(`/api/v1/bookmarks/${id}`, {
          method: 'DELETE',
        })
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['bookmarks'] })
      },
    }),
  }
}