'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useTTS } from '@/lib/api/hooks'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { 
  Play, 
  Pause, 
  Square, 
  SkipBack, 
  SkipForward,
  Volume2,
  VolumeX,
  RotateCcw,
  Settings,
  List,
  Download,
  Loader2,
  AlertCircle
} from 'lucide-react'

interface AudioItem {
  id: string
  text: string
  title: string
  language: 'he' | 'en' | 'fr'
  audioUrl?: string
  isGenerating?: boolean
  error?: string
}

interface TTSPlayerProps {
  items?: AudioItem[]
  autoPlay?: boolean
  showQueue?: boolean
  className?: string
}

const VOICE_OPTIONS = {
  he: [
    { value: 'he-IL-Wavenet-A', label: 'Hebrew Male' },
    { value: 'he-IL-Wavenet-B', label: 'Hebrew Female' },
  ],
  en: [
    { value: 'en-US-Wavenet-D', label: 'English Male' },
    { value: 'en-US-Wavenet-F', label: 'English Female' },
  ],
  fr: [
    { value: 'fr-FR-Wavenet-A', label: 'French Male' },
    { value: 'fr-FR-Wavenet-C', label: 'French Female' },
  ],
}

export default function TTSPlayer({ 
  items = [], 
  autoPlay = false, 
  showQueue = true,
  className = '' 
}: TTSPlayerProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState([0.8])
  const [playbackRate, setPlaybackRate] = useState([1])
  const [isMuted, setIsMuted] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [selectedVoices, setSelectedVoices] = useState({
    he: 'he-IL-Wavenet-A',
    en: 'en-US-Wavenet-D',
    fr: 'fr-FR-Wavenet-A',
  })
  
  const audioRef = useRef<HTMLAudioElement>(null)
  const { generateAudioMutation } = useTTS()
  
  const currentItem = items[currentIndex]

  // Update audio element properties
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume[0]
      audioRef.current.playbackRate = playbackRate[0]
    }
  }, [volume, playbackRate, isMuted])

  // Auto-play next item when current ends
  useEffect(() => {
    if (audioRef.current) {
      const audio = audioRef.current
      
      const handleEnded = () => {
        if (currentIndex < items.length - 1) {
          playNext()
        } else {
          setIsPlaying(false)
        }
      }
      
      const handleTimeUpdate = () => {
        setCurrentTime(audio.currentTime)
      }
      
      const handleDurationChange = () => {
        setDuration(audio.duration)
      }
      
      audio.addEventListener('ended', handleEnded)
      audio.addEventListener('timeupdate', handleTimeUpdate)
      audio.addEventListener('durationchange', handleDurationChange)
      
      return () => {
        audio.removeEventListener('ended', handleEnded)
        audio.removeEventListener('timeupdate', handleTimeUpdate)
        audio.removeEventListener('durationchange', handleDurationChange)
      }
    }
  }, [currentIndex, items.length])

  const generateAudio = useCallback(async (item: AudioItem) => {
    try {
      const voice = selectedVoices[item.language]
      const result = await generateAudioMutation.mutateAsync({
        text: item.text,
        language: item.language,
        voice,
      })
      
      return result.audio_url
    } catch (error) {
      console.error('Error generating audio:', error)
      throw error
    }
  }, [generateAudioMutation, selectedVoices])

  const play = useCallback(async () => {
    if (!currentItem) return

    try {
      // Generate audio if not already available
      if (!currentItem.audioUrl && !currentItem.isGenerating) {
        const audioUrl = await generateAudio(currentItem)
        currentItem.audioUrl = audioUrl
      }

      if (currentItem.audioUrl && audioRef.current) {
        audioRef.current.src = currentItem.audioUrl
        await audioRef.current.play()
        setIsPlaying(true)
      }
    } catch (error) {
      console.error('Error playing audio:', error)
    }
  }, [currentItem, generateAudio])

  const pause = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      setIsPlaying(false)
    }
  }, [])

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
      setIsPlaying(false)
      setCurrentTime(0)
    }
  }, [])

  const playNext = useCallback(() => {
    if (currentIndex < items.length - 1) {
      setCurrentIndex(prev => prev + 1)
      setCurrentTime(0)
      if (autoPlay) {
        setTimeout(() => play(), 100)
      }
    }
  }, [currentIndex, items.length, autoPlay, play])

  const playPrevious = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1)
      setCurrentTime(0)
      if (autoPlay) {
        setTimeout(() => play(), 100)
      }
    }
  }, [currentIndex, autoPlay, play])

  const seekTo = useCallback((time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time
      setCurrentTime(time)
    }
  }, [])

  const formatTime = useCallback((time: number) => {
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }, [])

  const downloadAudio = useCallback(async () => {
    if (!currentItem?.audioUrl) return
    
    try {
      const response = await fetch(currentItem.audioUrl)
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      
      const a = document.createElement('a')
      a.href = url
      a.download = `${currentItem.title || 'audio'}.mp3`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error downloading audio:', error)
    }
  }, [currentItem])

  if (items.length === 0) {
    return (
      <Card className={`bg-white/10 backdrop-blur-sm border-white/20 ${className}`}>
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center space-y-2">
            <Volume2 className="h-12 w-12 text-muted-foreground mx-auto" />
            <p className="text-muted-foreground">No audio items in queue</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <audio ref={audioRef} />
      
      {/* Main Player */}
      <Card className="bg-white/10 backdrop-blur-sm border-white/20">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">Audio Player</CardTitle>
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSettings(!showSettings)}
                className="h-8 w-8 p-0"
              >
                <Settings className="h-4 w-4" />
              </Button>
              {showQueue && (
                <Badge variant="outline" className="text-xs">
                  {currentIndex + 1} / {items.length}
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Current Item Info */}
          {currentItem && (
            <div className="space-y-2">
              <h3 className="font-medium text-sm">{currentItem.title}</h3>
              <div className="flex items-center space-x-2">
                <Badge variant="secondary" className="text-xs">
                  {currentItem.language === 'he' ? 'עברית' : 
                   currentItem.language === 'en' ? 'English' : 'Français'}
                </Badge>
                {currentItem.isGenerating && (
                  <Badge variant="outline" className="text-xs flex items-center space-x-1">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <span>Generating...</span>
                  </Badge>
                )}
                {currentItem.error && (
                  <Badge variant="destructive" className="text-xs flex items-center space-x-1">
                    <AlertCircle className="h-3 w-3" />
                    <span>Error</span>
                  </Badge>
                )}
              </div>
            </div>
          )}

          {/* Progress Bar */}
          <div className="space-y-2">
            <Slider
              value={[currentTime]}
              max={duration || 100}
              step={1}
              onValueChange={([value]) => seekTo(value)}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={playPrevious}
              disabled={currentIndex === 0}
              className="h-8 w-8 p-0"
            >
              <SkipBack className="h-4 w-4" />
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={isPlaying ? pause : play}
              disabled={currentItem?.isGenerating}
              className="h-10 w-10 p-0"
            >
              {currentItem?.isGenerating ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : isPlaying ? (
                <Pause className="h-5 w-5" />
              ) : (
                <Play className="h-5 w-5" />
              )}
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={stop}
              className="h-8 w-8 p-0"
            >
              <Square className="h-4 w-4" />
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={playNext}
              disabled={currentIndex === items.length - 1}
              className="h-8 w-8 p-0"
            >
              <SkipForward className="h-4 w-4" />
            </Button>
          </div>

          {/* Volume & Speed Controls */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsMuted(!isMuted)}
                  className="h-6 w-6 p-0"
                >
                  {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                </Button>
                <Slider
                  value={volume}
                  max={1}
                  step={0.1}
                  onValueChange={setVolume}
                  className="flex-1"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <RotateCcw className="h-4 w-4 text-muted-foreground" />
                <Slider
                  value={playbackRate}
                  min={0.5}
                  max={2}
                  step={0.1}
                  onValueChange={setPlaybackRate}
                  className="flex-1"
                />
                <span className="text-xs text-muted-foreground w-10">
                  {playbackRate[0].toFixed(1)}x
                </span>
              </div>
            </div>
          </div>

          {/* Additional Controls */}
          <div className="flex justify-end space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={downloadAudio}
              disabled={!currentItem?.audioUrl}
              className="h-8 px-3 text-xs"
            >
              <Download className="h-4 w-4 mr-1" />
              Download
            </Button>
          </div>

          {/* Settings Panel */}
          {showSettings && (
            <div className="p-4 bg-white/5 rounded-lg border border-white/10 space-y-4">
              <h4 className="text-sm font-medium">Voice Settings</h4>
              {Object.entries(VOICE_OPTIONS).map(([lang, voices]) => (
                <div key={lang} className="space-y-2">
                  <label className="text-xs text-muted-foreground">
                    {lang === 'he' ? 'Hebrew Voice' : lang === 'en' ? 'English Voice' : 'French Voice'}
                  </label>
                  <Select
                    value={selectedVoices[lang as keyof typeof selectedVoices]}
                    onValueChange={(value) => setSelectedVoices(prev => ({ ...prev, [lang]: value }))}
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {voices.map((voice) => (
                        <SelectItem key={voice.value} value={voice.value}>
                          {voice.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          )}

          {/* Error Display */}
          {currentItem?.error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Failed to generate audio: {currentItem.error}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Queue */}
      {showQueue && items.length > 1 && (
        <Card className="bg-white/10 backdrop-blur-sm border-white/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center">
              <List className="h-4 w-4 mr-2" />
              Queue ({items.length} items)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {items.map((item, index) => (
                <div
                  key={item.id}
                  onClick={() => setCurrentIndex(index)}
                  className={`p-2 rounded cursor-pointer transition-colors ${
                    index === currentIndex 
                      ? 'bg-primary/20 border border-primary/30' 
                      : 'hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.title}</p>
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {item.language === 'he' ? 'עברית' : 
                           item.language === 'en' ? 'English' : 'Français'}
                        </Badge>
                        {item.audioUrl && (
                          <Badge variant="secondary" className="text-xs">Ready</Badge>
                        )}
                        {item.isGenerating && (
                          <Badge variant="outline" className="text-xs">Generating...</Badge>
                        )}
                      </div>
                    </div>
                    {index === currentIndex && isPlaying && (
                      <div className="flex space-x-1">
                        <div className="w-1 h-3 bg-primary rounded animate-pulse"></div>
                        <div className="w-1 h-3 bg-primary rounded animate-pulse delay-75"></div>
                        <div className="w-1 h-3 bg-primary rounded animate-pulse delay-150"></div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}