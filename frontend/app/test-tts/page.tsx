"use client"

import { useState, useRef } from 'react'
import { EnhancedTTSPlayer } from '@/components/tts/EnhancedTTSPlayer'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

export default function TestTTSPage() {
  const [text, setText] = useState("Rabbi Nachman ז\"ל a dit: שלום עולם. This is a test of the enhanced TTS system.")
  const [highlightedWord, setHighlightedWord] = useState(-1)
  const [progress, setProgress] = useState(0)
  const textRef = useRef<HTMLDivElement>(null)
  
  const handleWordHighlight = (wordIndex: number) => {
    setHighlightedWord(wordIndex)
    
    // Scroll vers le mot si nécessaire
    if (textRef.current) {
      const words = textRef.current.querySelectorAll('.word')
      const word = words[wordIndex]
      if (word) {
        word.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }
  }
  
  const handleProgressUpdate = (progressPercent: number) => {
    setProgress(progressPercent)
  }
  
  const renderTextWithHighlighting = () => {
    return text.split(' ').map((word, index) => (
      <span
        key={index}
        className={`word inline-block mr-1 transition-all duration-200 ${
          index === highlightedWord
            ? 'bg-yellow-300 scale-105 font-semibold shadow-sm'
            : 'hover:bg-gray-100'
        }`}
      >
        {word}
      </span>
    ))
  }
  
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-center">
          Test TTS Ultra Fonctionnel
        </h1>
        
        {/* Zone de texte */}
        <div className="mb-8">
          <label className="block text-sm font-medium mb-2">
            Texte à synthétiser:
          </label>
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Entrez le texte à synthétiser..."
            className="min-h-[100px]"
          />
        </div>
        
        {/* Player TTS */}
        <div className="mb-8">
          <EnhancedTTSPlayer
            text={text}
            onWordHighlight={handleWordHighlight}
            onPlaybackProgress={handleProgressUpdate}
            className="w-full"
          />
        </div>
        
        {/* Texte avec highlighting */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">
            Texte avec highlighting en temps réel:
          </h2>
          <div
            ref={textRef}
            className="bg-white p-6 rounded-lg shadow-md border leading-relaxed text-lg"
          >
            {renderTextWithHighlighting()}
          </div>
        </div>
        
        {/* Informations de debug */}
        <div className="bg-gray-100 p-4 rounded-lg">
          <h3 className="font-semibold mb-2">Informations:</h3>
          <div className="text-sm space-y-1">
            <div>Mot surligné: {highlightedWord}</div>
            <div>Progression: {progress.toFixed(1)}%</div>
            <div>Nombre de mots: {text.split(' ').length}</div>
          </div>
        </div>
        
        {/* Boutons de test */}
        <div className="mt-8 flex flex-wrap gap-4">
          <Button
            onClick={() => setText("Bonjour le monde! Ceci est un test en français.")}
            variant="outline"
          >
            Texte français
          </Button>
          
          <Button
            onClick={() => setText("Hello world! This is an English test.")}
            variant="outline"
          >
            Texte anglais
          </Button>
          
          <Button
            onClick={() => setText("שלום עולם! זה טקסט בעברית.")}
            variant="outline"
          >
            Texte hébreu
          </Button>
          
          <Button
            onClick={() => setText("Rabbi Nachman ז\"ל a dit: שלום עולם. This is a mixed language test with français et עברית.")}
            variant="outline"
          >
            Texte mixte
          </Button>
        </div>
      </div>
    </div>
  )
}