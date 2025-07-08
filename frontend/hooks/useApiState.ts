import { useState, useEffect } from 'react'
import { useApi } from '@/lib/api'

// Hook pour gérer l'état des livres
export function useBooks() {
  const [books, setBooks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const api = useApi()

  const fetchBooks = async () => {
    setLoading(true)
    setError(null)
    
    const response = await api.books.getAll()
    
    if (response.error) {
      setError(response.error)
    } else {
      setBooks(response.data || [])
    }
    
    setLoading(false)
  }

  useEffect(() => {
    fetchBooks()
  }, [])

  return {
    books,
    loading,
    error,
    refetch: fetchBooks
  }
}

// Hook pour gérer l'état du chat Gemini
export function useGeminiChat() {
  const [messages, setMessages] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<any>(null)
  const api = useApi()

  const sendMessage = async (
    question: string,
    bookContext?: string,
    mode: string = 'study'
  ) => {
    setLoading(true)
    
    // Ajouter message utilisateur
    const userMessage = {
      role: 'user' as const,
      content: question,
      timestamp: new Date()
    }
    setMessages(prev => [...prev, userMessage])

    const response = await api.gemini.chat(question, bookContext, mode)
    
    if (response.error) {
      const errorMessage = {
        role: 'assistant' as const,
        content: `Erreur: ${response.error}`,
        timestamp: new Date(),
        error: true
      }
      setMessages(prev => [...prev, errorMessage])
    } else {
      const assistantMessage = {
        role: 'assistant' as const,
        content: response.data?.answer || 'Pas de réponse',
        timestamp: new Date(),
        ...response.data
      }
      setMessages(prev => [...prev, assistantMessage])
    }
    
    setLoading(false)
  }

  const getStatus = async () => {
    const response = await api.gemini.getStatus()
    if (!response.error) {
      setStatus(response.data)
    }
  }

  const initialize = async (books?: string[]) => {
    setLoading(true)
    const response = await api.gemini.initialize(books)
    setLoading(false)
    
    if (!response.error) {
      await getStatus() // Refresh status after initialization
    }
    
    return response
  }

  useEffect(() => {
    getStatus()
  }, [])

  return {
    messages,
    loading,
    status,
    sendMessage,
    initialize,
    getStatus,
    clearMessages: () => setMessages([])
  }
}

// Hook pour gérer l'état TTS
export function useTTS() {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null)
  const [loading, setLoading] = useState(false)
  const api = useApi()

  const speak = async (
    text: string,
    language: string = 'he',
    voice?: string
  ) => {
    setLoading(true)
    
    try {
      // Arrêter audio en cours
      if (currentAudio) {
        currentAudio.pause()
        setCurrentAudio(null)
        setIsPlaying(false)
      }

      const response = await api.tts.synthesize(text, language, voice)
      
      if (response.error) {
        console.error('TTS Error:', response.error)
        return
      }

      // Pour l'instant, juste simuler la lecture
      console.log('TTS would play:', response.data)
      setIsPlaying(true)
      
      // Simuler durée de lecture
      setTimeout(() => {
        setIsPlaying(false)
      }, Math.min(text.length * 100, 5000))
      
    } catch (error) {
      console.error('TTS Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const stop = () => {
    if (currentAudio) {
      currentAudio.pause()
      setCurrentAudio(null)
    }
    setIsPlaying(false)
  }

  return {
    isPlaying,
    loading,
    speak,
    stop
  }
}

// Hook pour gérer l'état des textes
export function useText(ref?: string) {
  const [text, setText] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const api = useApi()

  const fetchText = async (textRef: string) => {
    setLoading(true)
    setError(null)
    
    const response = await api.texts.getByRef(textRef)
    
    if (response.error) {
      setError(response.error)
    } else {
      setText(response.data)
    }
    
    setLoading(false)
  }

  useEffect(() => {
    if (ref) {
      fetchText(ref)
    }
  }, [ref])

  return {
    text,
    loading,
    error,
    fetchText
  }
}

// Hook pour vérifier la santé de l'API
export function useApiHealth() {
  const [backendStatus, setBackendStatus] = useState<'healthy' | 'error' | 'loading'>('loading')
  const [lastCheck, setLastCheck] = useState<Date | null>(null)
  const api = useApi()

  const checkHealth = async () => {
    setBackendStatus('loading')
    
    const response = await api.health.check()
    
    if (response.error || response.status !== 200) {
      setBackendStatus('error')
    } else {
      setBackendStatus('healthy')
    }
    
    setLastCheck(new Date())
  }

  useEffect(() => {
    checkHealth()
    
    // Vérifier toutes les 30 secondes
    const interval = setInterval(checkHealth, 30000)
    
    return () => clearInterval(interval)
  }, [])

  return {
    backendStatus,
    lastCheck,
    checkHealth
  }
}