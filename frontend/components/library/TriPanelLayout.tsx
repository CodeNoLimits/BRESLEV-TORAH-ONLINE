'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Languages, Volume2, VolumeX, Settings, BookOpen, MessageCircle } from 'lucide-react'
import GlassPanel, { GlassCard, GlassHeader } from '@/components/ui/GlassPanel'
import { cn } from '@/lib/utils'

interface TriPanelLayoutProps {
  currentBook?: string
  currentSection?: string
  hebrewText?: string
  englishText?: string
  frenchText?: string
  onLanguageChange?: (lang: 'he' | 'en' | 'fr') => void
  onTTSToggle?: (enabled: boolean) => void
  onChatToggle?: () => void
}

export function TriPanelLayout({
  currentBook = "Likutei Moharan",
  currentSection = "1:1",
  hebrewText = "וַיְהִי דְבַר יי אֶל יוֹנָה בֶּן אֲמִתַּי לֵאמֹר...",
  englishText = "The word of the Lord came to Jonah the son of Amittai, saying...",
  frenchText = "La parole de l'Éternel fut adressée à Jonas, fils d'Amittaï, en ces termes...",
  onLanguageChange,
  onTTSToggle,
  onChatToggle
}: TriPanelLayoutProps) {
  const [activePanel, setActivePanel] = useState<'he' | 'en' | 'fr'>('he')
  const [ttsEnabled, setTtsEnabled] = useState(false)
  const [fontSize, setFontSize] = useState<'sm' | 'md' | 'lg' | 'xl'>('md')
  
  const panels = [
    {
      id: 'he' as const,
      title: 'עברית',
      subtitle: 'Hebrew',
      text: hebrewText,
      direction: 'rtl' as const,
      font: 'font-hebrew',
      accent: 'from-blue-500/20 to-cyan-500/20'
    },
    {
      id: 'en' as const, 
      title: 'English',
      subtitle: 'Translation',
      text: englishText,
      direction: 'ltr' as const,
      font: 'font-english',
      accent: 'from-purple-500/20 to-pink-500/20'
    },
    {
      id: 'fr' as const,
      title: 'Français', 
      subtitle: 'Traduction',
      text: frenchText,
      direction: 'ltr' as const,
      font: 'font-french',
      accent: 'from-emerald-500/20 to-teal-500/20'
    }
  ]

  const handleTTSToggle = () => {
    const newState = !ttsEnabled
    setTtsEnabled(newState)
    onTTSToggle?.(newState)
  }

  const fontSizeClasses = {
    sm: 'text-sm leading-relaxed',
    md: 'text-base leading-relaxed', 
    lg: 'text-lg leading-relaxed',
    xl: 'text-xl leading-relaxed'
  }

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Header avec contrôles */}
      <GlassHeader className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <BookOpen className="w-5 h-5 text-blue-400" />
          <div>
            <h1 className="text-lg font-semibold text-white">{currentBook}</h1>
            <p className="text-sm text-white/60">Section {currentSection}</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {/* Font size control */}
          <div className="flex items-center space-x-1 mr-4">
            <button
              onClick={() => setFontSize(prev => 
                prev === 'xl' ? 'xl' : 
                prev === 'lg' ? 'xl' :
                prev === 'md' ? 'lg' : 'md'
              )}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
              title="Increase font size"
            >
              <span className="text-sm text-white">A+</span>
            </button>
            <button
              onClick={() => setFontSize(prev => 
                prev === 'sm' ? 'sm' :
                prev === 'md' ? 'sm' :
                prev === 'lg' ? 'md' : 'lg'
              )}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
              title="Decrease font size"
            >
              <span className="text-sm text-white">A-</span>
            </button>
          </div>

          {/* TTS Control */}
          <button
            onClick={handleTTSToggle}
            className={cn(
              "p-2 rounded-lg transition-colors",
              ttsEnabled 
                ? "bg-blue-500/30 text-blue-300" 
                : "bg-white/10 hover:bg-white/20 text-white/60"
            )}
            title="Toggle Text-to-Speech"
          >
            {ttsEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Chat Toggle */}
          <button
            onClick={onChatToggle}
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-white/60 hover:text-white"
            title="Open AI Chat"
          >
            <MessageCircle className="w-4 h-4" />
          </button>

          {/* Settings */}
          <button className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-white/60 hover:text-white">
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </GlassHeader>

      {/* Language tabs */}
      <div className="flex space-x-2">
        {panels.map((panel) => (
          <button
            key={panel.id}
            onClick={() => {
              setActivePanel(panel.id)
              onLanguageChange?.(panel.id)
            }}
            className={cn(
              "flex-1 p-3 rounded-xl transition-all duration-300",
              "border border-white/20 backdrop-blur-md",
              activePanel === panel.id
                ? `bg-gradient-to-r ${panel.accent} border-white/40 shadow-lg`
                : "bg-white/5 hover:bg-white/10"
            )}
          >
            <div className="text-center">
              <div className={cn(
                "font-semibold transition-colors",
                activePanel === panel.id ? "text-white" : "text-white/70"
              )}>
                {panel.title}
              </div>
              <div className={cn(
                "text-xs transition-colors",
                activePanel === panel.id ? "text-white/80" : "text-white/50"
              )}>
                {panel.subtitle}
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Main content area */}
      <div className="flex-1 relative">
        <AnimatePresence mode="wait">
          {panels.map((panel) => 
            activePanel === panel.id && (
              <motion.div
                key={panel.id}
                initial={{ opacity: 0, x: panel.direction === 'rtl' ? 50 : -50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: panel.direction === 'rtl' ? -50 : 50 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
                className="absolute inset-0"
              >
                <GlassCard className="h-full">
                  <div 
                    dir={panel.direction}
                    className={cn(
                      "h-full overflow-y-auto p-6",
                      panel.font,
                      fontSizeClasses[fontSize],
                      panel.direction === 'rtl' ? 'text-right' : 'text-left'
                    )}
                  >
                    <div className="text-white/90 whitespace-pre-wrap leading-loose">
                      {panel.text}
                    </div>
                    
                    {/* Scroll indicator */}
                    <div className="absolute bottom-4 right-4 flex space-x-1">
                      <div className="w-1 h-8 bg-white/20 rounded-full">
                        <div className="w-full h-4 bg-white/40 rounded-full"></div>
                      </div>
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
            )
          )}
        </AnimatePresence>
      </div>

      {/* Footer with navigation */}
      <div className="flex justify-between items-center">
        <GlassPanel className="px-4 py-2">
          <button className="text-white/60 hover:text-white transition-colors text-sm">
            ← Previous Section
          </button>
        </GlassPanel>
        
        <GlassPanel className="px-4 py-2">
          <span className="text-white/60 text-sm">Section {currentSection}</span>
        </GlassPanel>
        
        <GlassPanel className="px-4 py-2">
          <button className="text-white/60 hover:text-white transition-colors text-sm">
            Next Section →
          </button>
        </GlassPanel>
      </div>
    </div>
  )
}

export default TriPanelLayout