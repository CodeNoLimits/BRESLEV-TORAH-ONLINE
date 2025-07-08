"use client"

import { useState, useCallback } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { chatApi, type ChatMessage, type ChatRequest, type ChatResponse } from '@/lib/api'

export function useChat(sessionId: string) {
  const [isStreaming, setIsStreaming] = useState(false)
  const queryClient = useQueryClient()

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['chat', 'history', sessionId],
    queryFn: () => chatApi.getHistory(sessionId).then(res => res.data),
    enabled: !!sessionId,
  })

  const sendMessageMutation = useMutation({
    mutationFn: (request: ChatRequest) => chatApi.sendMessage(request),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['chat', 'history', sessionId] })
      queryClient.invalidateQueries({ queryKey: ['chat', 'sessions'] })
    },
  })

  const sendMessage = useCallback(async (
    message: string, 
    options?: {
      bookFilter?: string
      language?: string
      stream?: boolean
    }
  ) => {
    if (!sessionId || !message.trim()) return

    const request: ChatRequest = {
      message: message.trim(),
      session_id: sessionId,
      book_filter: options?.bookFilter,
      language: options?.language || 'he',
      stream: options?.stream || false,
    }

    if (options?.stream) {
      setIsStreaming(true)
    }

    try {
      const result = await sendMessageMutation.mutateAsync(request)
      return result.data
    } finally {
      setIsStreaming(false)
    }
  }, [sessionId, sendMessageMutation])

  return {
    messages,
    isLoading,
    isStreaming,
    isSending: sendMessageMutation.isPending,
    sendMessage,
    error: sendMessageMutation.error,
  }
}

export function useChatSessions() {
  return useQuery({
    queryKey: ['chat', 'sessions'],
    queryFn: () => chatApi.getSessions().then(res => res.data),
  })
}