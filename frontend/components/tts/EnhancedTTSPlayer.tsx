"use client"

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Play, Pause, Square, Volume2, Settings } from 'lucide-react'
import { useApi } from '@/lib/api'

interface TTSSegment {
  index: number
  text: string
  language: string
  audio_data: string
  duration_estimate: number
}

interface TTSChunk {
  index: number
  text: string
  audio_data: string
  start_time: number
  duration: number
  word_count: number
}

interface EnhancedTTSPlayerProps {
  text: string
  language?: string
  onWordHighlight?: (wordIndex: number) => void
  onPlaybackProgress?: (progress: number) => void
  className?: string
}

export function EnhancedTTSPlayer({
  text,
  language,
  onWordHighlight,
  onPlaybackProgress,
  className = ""
}: EnhancedTTSPlayerProps) {
  // État du player
  const [isPlaying, setIsPlaying] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [currentChunkIndex, setCurrentChunkIndex] = useState(0)
  const [currentWordIndex, setCurrentWordIndex] = useState(0)
  const [progress, setProgress] = useState(0)
  const [volume, setVolume] = useState(0.8)
  const [playbackRate, setPlaybackRate] = useState(1.0)
  const [showSettings, setShowSettings] = useState(false)
  
  // Données audio
  const [audioChunks, setAudioChunks] = useState<TTSChunk[]>([])
  const [totalDuration, setTotalDuration] = useState(0)
  const [detectedLanguage, setDetectedLanguage] = useState<string>('')
  
  // Refs
  const audioRef = useRef<HTMLAudioElement>(null)
  const currentAudioRef = useRef<HTMLAudioElement | null>(null)
  const progressTimerRef = useRef<NodeJS.Timeout | null>(null)
  const highlightTimerRef = useRef<NodeJS.Timeout | null>(null)
  
  // API
  const api = useApi()
  
  // Initialise l'audio
  useEffect(() => {
    if (text && text.trim()) {
      initializeAudio()
    }
    
    return () => {
      stopPlayback()
      if (progressTimerRef.current) {
        clearInterval(progressTimerRef.current)
      }
      if (highlightTimerRef.current) {
        clearTimeout(highlightTimerRef.current)
      }
    }
  }, [text, language])
  
  // Met à jour le volume
  useEffect(() => {
    if (currentAudioRef.current) {
      currentAudioRef.current.volume = volume
    }
  }, [volume])
  
  // Met à jour la vitesse de lecture
  useEffect(() => {
    if (currentAudioRef.current) {
      currentAudioRef.current.playbackRate = playbackRate
    }
  }, [playbackRate])
  
  /**
   * Initialise l'audio en récupérant les chunks TTS
   */
  const initializeAudio = async () => {
    if (!text || !text.trim()) return
    
    try {
      setIsLoading(true)
      
      // Récupère les chunks audio avec highlighting
      const response = await api.tts.synthesizeWithHighlighting({
        text,
        language,
        chunk_size: 200
      })
      
      if (response.data && response.data.success) {
        setAudioChunks(response.data.chunks)
        setTotalDuration(response.data.total_duration)
        setDetectedLanguage(response.data.language)
      } else {
        console.error('Erreur lors de la synthèse TTS:', response.data?.error)
      }
    } catch (error) {
      console.error('Erreur lors de l\'initialisation audio:', error)
    } finally {
      setIsLoading(false)
    }
  }
  
  /**
   * Convertit les données base64 en blob audio
   */
  const base64ToBlob = (base64Data: string): Blob => {
    const binaryString = atob(base64Data)
    const bytes = new Uint8Array(binaryString.length)
    
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }
    
    return new Blob([bytes], { type: 'audio/mpeg' })
  }
  
  /**
   * Crée un élément audio pour un chunk
   */
  const createAudioElement = (chunk: TTSChunk): HTMLAudioElement => {
    const audioBlob = base64ToBlob(chunk.audio_data)
    const audioUrl = URL.createObjectURL(audioBlob)
    
    const audio = new Audio(audioUrl)
    audio.volume = volume
    audio.playbackRate = playbackRate
    
    return audio
  }
  
  /**
   * Démarre la lecture
   */
  const startPlayback = async () => {
    if (!audioChunks.length) return
    
    try {
      setIsPlaying(true)
      setIsPaused(false)
      
      await playChunk(currentChunkIndex)
      
      // Démarre le timer de progression
      startProgressTimer()
    } catch (error) {
      console.error('Erreur lors du démarrage:', error)
      setIsPlaying(false)
    }
  }
  
  /**
   * Joue un chunk spécifique
   */
  const playChunk = async (chunkIndex: number) => {
    if (chunkIndex >= audioChunks.length) {
      // Fin de la lecture
      setIsPlaying(false)
      setCurrentChunkIndex(0)
      setCurrentWordIndex(0)
      setProgress(0)
      return
    }
    
    const chunk = audioChunks[chunkIndex]
    
    try {
      // Crée l'élément audio
      const audio = createAudioElement(chunk)
      currentAudioRef.current = audio
      
      // Démarre le highlighting des mots
      startWordHighlighting(chunk)
      
      // Événement de fin de chunk
      audio.addEventListener('ended', () => {
        setCurrentChunkIndex(chunkIndex + 1)
        
        // Joue le chunk suivant
        if (chunkIndex + 1 < audioChunks.length) {
          playChunk(chunkIndex + 1)
        } else {
          setIsPlaying(false)
          setCurrentChunkIndex(0)
          setCurrentWordIndex(0)
          setProgress(0)
        }
      })
      
      // Démarre la lecture
      await audio.play()
      setCurrentChunkIndex(chunkIndex)
      
    } catch (error) {
      console.error('Erreur lors de la lecture du chunk:', error)
      // Passe au chunk suivant
      if (chunkIndex + 1 < audioChunks.length) {
        playChunk(chunkIndex + 1)
      }
    }
  }
  
  /**
   * Démarre le highlighting des mots
   */
  const startWordHighlighting = (chunk: TTSChunk) => {
    if (!onWordHighlight) return
    
    const words = chunk.text.split(' ')
    const wordDuration = chunk.duration / words.length
    
    words.forEach((word, index) => {
      const timeout = setTimeout(() => {
        if (isPlaying && currentChunkIndex === chunk.index) {
          const globalWordIndex = getGlobalWordIndex(chunk.index, index)
          setCurrentWordIndex(globalWordIndex)
          onWordHighlight(globalWordIndex)
        }
      }, wordDuration * index * 1000)
      
      // Nettoie le timeout si nécessaire
      if (highlightTimerRef.current) {
        clearTimeout(highlightTimerRef.current)
      }
      highlightTimerRef.current = timeout
    })
  }
  
  /**
   * Calcule l'index global d'un mot
   */
  const getGlobalWordIndex = (chunkIndex: number, wordIndex: number): number => {
    let globalIndex = 0
    
    for (let i = 0; i < chunkIndex; i++) {
      globalIndex += audioChunks[i].word_count
    }
    
    return globalIndex + wordIndex
  }
  
  /**
   * Démarre le timer de progression
   */
  const startProgressTimer = () => {
    if (progressTimerRef.current) {
      clearInterval(progressTimerRef.current)
    }
    
    progressTimerRef.current = setInterval(() => {
      if (currentAudioRef.current && isPlaying) {
        const currentTime = getCurrentTime()
        const progressPercent = (currentTime / totalDuration) * 100
        
        setProgress(progressPercent)
        
        if (onPlaybackProgress) {
          onPlaybackProgress(progressPercent)
        }
      }
    }, 100)
  }
  
  /**
   * Calcule le temps actuel de lecture
   */
  const getCurrentTime = (): number => {
    let currentTime = 0
    
    // Ajoute le temps des chunks précédents
    for (let i = 0; i < currentChunkIndex; i++) {
      currentTime += audioChunks[i].duration
    }
    
    // Ajoute le temps actuel du chunk en cours
    if (currentAudioRef.current) {
      currentTime += currentAudioRef.current.currentTime
    }
    
    return currentTime
  }
  
  /**
   * Met en pause la lecture
   */
  const pausePlayback = () => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause()
    }
    
    setIsPaused(true)
    setIsPlaying(false)
    
    if (progressTimerRef.current) {
      clearInterval(progressTimerRef.current)
    }
  }
  
  /**
   * Reprend la lecture
   */
  const resumePlayback = () => {
    if (currentAudioRef.current) {
      currentAudioRef.current.play()
    }
    
    setIsPaused(false)
    setIsPlaying(true)
    
    startProgressTimer()
  }
  
  /**
   * Arrête la lecture
   */
  const stopPlayback = () => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause()
      currentAudioRef.current = null
    }
    
    setIsPlaying(false)
    setIsPaused(false)
    setCurrentChunkIndex(0)
    setCurrentWordIndex(0)
    setProgress(0)
    
    if (progressTimerRef.current) {
      clearInterval(progressTimerRef.current)
    }
    
    if (highlightTimerRef.current) {
      clearTimeout(highlightTimerRef.current)
    }
  }
  
  /**
   * Gère le clic sur play/pause
   */
  const handlePlayPause = () => {
    if (isLoading) return
    
    if (isPlaying) {
      pausePlayback()
    } else if (isPaused) {
      resumePlayback()
    } else {
      startPlayback()
    }
  }
  
  /**
   * Formate la durée en mm:ss
   */
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }
  
  return (
    <div className={`bg-white rounded-lg shadow-lg p-4 ${className}`}>
      {/* Informations */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>Langue détectée: {detectedLanguage}</span>
          <span>Chunks: {audioChunks.length}</span>
        </div>
        <div className="text-xs text-gray-500">
          Durée totale: {formatTime(totalDuration)}
        </div>
      </div>
      
      {/* Barre de progression */}
      <div className="mb-4">
        <Slider
          value={[progress]}
          onValueChange={(value) => setProgress(value[0])}
          max={100}
          step={0.1}
          className="w-full"
        />
      </div>
      
      {/* Contrôles principaux */}
      <div className="flex items-center justify-center space-x-4 mb-4">
        <Button
          variant="outline"
          size="sm"
          onClick={handlePlayPause}
          disabled={isLoading || !audioChunks.length}
          className="flex items-center space-x-2"
        >
          {isLoading ? (
            <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full" />
          ) : isPlaying ? (
            <Pause className="h-4 w-4" />
          ) : (
            <Play className="h-4 w-4" />
          )}
          <span>
            {isLoading ? 'Préparation...' : isPlaying ? 'Pause' : 'Lecture'}
          </span>
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={stopPlayback}
          disabled={!isPlaying && !isPaused}
        >
          <Square className="h-4 w-4" />
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowSettings(!showSettings)}
        >
          <Settings className="h-4 w-4" />
        </Button>
      </div>
      
      {/* Panneau de paramètres */}
      {showSettings && (
        <div className="border-t pt-4 space-y-4">
          {/* Volume */}
          <div>
            <label className="flex items-center space-x-2 text-sm font-medium">
              <Volume2 className="h-4 w-4" />
              <span>Volume: {Math.round(volume * 100)}%</span>
            </label>
            <Slider
              value={[volume]}
              onValueChange={(value) => setVolume(value[0])}
              max={1}
              min={0}
              step={0.1}
              className="mt-2"
            />
          </div>
          
          {/* Vitesse */}
          <div>
            <label className="text-sm font-medium">
              Vitesse: {playbackRate}x
            </label>
            <Slider
              value={[playbackRate]}
              onValueChange={(value) => setPlaybackRate(value[0])}
              max={2}
              min={0.5}
              step={0.1}
              className="mt-2"
            />
          </div>
        </div>
      )}
      
      {/* Informations de debug */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-4 text-xs text-gray-400 space-y-1">
          <div>Chunk actuel: {currentChunkIndex}/{audioChunks.length}</div>
          <div>Mot actuel: {currentWordIndex}</div>
          <div>Progression: {progress.toFixed(1)}%</div>
        </div>
      )}
    </div>
  )
}