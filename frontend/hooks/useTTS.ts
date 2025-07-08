"use client"

import { useState, useCallback, useRef, useEffect } from 'react'
import { useMutation } from '@tanstack/react-query'
import { ttsApi } from '@/lib/api'

interface TTSState {
  isPlaying: boolean
  isPaused: boolean
  isLoading: boolean
  currentText?: string
  duration: number
  currentTime: number
}

export function useTTS() {
  const [state, setState] = useState<TTSState>({
    isPlaying: false,
    isPaused: false,
    isLoading: false,
    duration: 0,
    currentTime: 0,
  })

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const audioUrlRef = useRef<string | null>(null)

  const synthesizeMutation = useMutation({
    mutationFn: ({ text, language, voice }: { text: string; language?: string; voice?: string }) =>
      ttsApi.synthesize(text, language, voice),
  })

  const speak = useCallback(async (text: string, language = 'he', voice?: string) => {
    if (!text.trim()) return

    setState(prev => ({ ...prev, isLoading: true, currentText: text }))

    try {
      const response = await synthesizeMutation.mutateAsync({ text, language, voice })
      
      // Clean up previous audio
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current)
      }
      
      // Create new audio URL
      const audioBlob = new Blob([response.data], { type: 'audio/mpeg' })
      const audioUrl = URL.createObjectURL(audioBlob)
      audioUrlRef.current = audioUrl

      // Create and setup audio element
      const audio = new Audio(audioUrl)
      audioRef.current = audio

      audio.addEventListener('loadedmetadata', () => {
        setState(prev => ({
          ...prev,
          duration: audio.duration,
          isLoading: false,
        }))
      })

      audio.addEventListener('timeupdate', () => {
        setState(prev => ({
          ...prev,
          currentTime: audio.currentTime,
        }))
      })

      audio.addEventListener('ended', () => {
        setState(prev => ({
          ...prev,
          isPlaying: false,
          isPaused: false,
          currentTime: 0,
        }))
      })

      audio.addEventListener('error', (e) => {
        console.error('Audio playback error:', e)
        setState(prev => ({
          ...prev,
          isPlaying: false,
          isPaused: false,
          isLoading: false,
        }))
      })

      // Start playing
      await audio.play()
      setState(prev => ({
        ...prev,
        isPlaying: true,
        isPaused: false,
      }))

    } catch (error) {
      console.error('TTS error:', error)
      setState(prev => ({
        ...prev,
        isLoading: false,
      }))
    }
  }, [synthesizeMutation])

  const pause = useCallback(() => {
    if (audioRef.current && state.isPlaying) {
      audioRef.current.pause()
      setState(prev => ({
        ...prev,
        isPlaying: false,
        isPaused: true,
      }))
    }
  }, [state.isPlaying])

  const resume = useCallback(() => {
    if (audioRef.current && state.isPaused) {
      audioRef.current.play()
      setState(prev => ({
        ...prev,
        isPlaying: true,
        isPaused: false,
      }))
    }
  }, [state.isPaused])

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
      setState(prev => ({
        ...prev,
        isPlaying: false,
        isPaused: false,
        currentTime: 0,
      }))
    }
  }, [])

  const seekTo = useCallback((time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.max(0, Math.min(time, state.duration))
    }
  }, [state.duration])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
      }
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current)
      }
    }
  }, [])

  return {
    ...state,
    speak,
    pause,
    resume,
    stop,
    seekTo,
    error: synthesizeMutation.error,
  }
}