'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Bot, User, Loader2, AlertCircle, CheckCircle, XCircle } from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassPanel'
import { useGeminiChat } from '@/hooks/useApiState'
import { cn } from '@/lib/utils'

interface GeminiChatProps {
  currentBook?: string
  currentSection?: string
  className?: string
}

export function GeminiChat({ 
  currentBook, 
  currentSection, 
  className 
}: GeminiChatProps) {
  const [input, setInput] = useState('')
  const [mode, setMode] = useState<'study' | 'exploration' | 'analysis' | 'counsel'>('study')
  
  const { 
    messages, 
    loading, 
    status, 
    sendMessage, 
    initialize, 
    getStatus, 
    clearMessages 
  } = useGeminiChat()

  const handleSend = async () => {
    if (!input.trim() || loading) return
    
    const question = input.trim()
    setInput('')
    
    await sendMessage(question, currentBook, mode)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const modeOptions = [
    { value: 'study', label: 'Study', icon: '📚', description: 'Academic analysis' },
    { value: 'exploration', label: 'Explore', icon: '🔍', description: 'Open conversation' },
    { value: 'analysis', label: 'Analysis', icon: '⚗️', description: 'Critical examination' },
    { value: 'counsel', label: 'Counsel', icon: '🙏', description: 'Spiritual guidance' }
  ]

  const getStatusColor = () => {
    if (!status) return 'text-gray-400'
    if (status.status === 'ready') return 'text-green-400'
    if (status.status === 'not_initialized') return 'text-orange-400'
    return 'text-red-400'
  }

  const getStatusIcon = () => {
    if (!status) return <Loader2 className="w-3 h-3 animate-spin" />
    if (status.status === 'ready') return <CheckCircle className="w-3 h-3" />
    if (status.status === 'not_initialized') return <AlertCircle className="w-3 h-3" />
    return <XCircle className="w-3 h-3" />
  }

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Header avec statut */}
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-white font-semibold flex items-center gap-2">
            <Bot className="w-5 h-5 text-blue-400" />
            AI Torah Guide
          </h3>
          
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <span className={cn("text-xs", getStatusColor())}>
              {status?.status || 'connecting...'}
            </span>
          </div>
        </div>

        {/* Mode selector */}
        <div className="flex gap-1">
          {modeOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => setMode(option.value as any)}
              className={cn(
                "px-2 py-1 rounded text-xs transition-colors",
                mode === option.value
                  ? "bg-blue-500/30 text-blue-300"
                  : "bg-white/5 text-white/60 hover:bg-white/10"
              )}
              title={option.description}
            >
              {option.icon} {option.label}
            </button>
          ))}
        </div>

        {/* Status info */}
        {status && (
          <div className="mt-2 text-xs text-white/50">
            Books: {status.initialized_books?.length || 0} initialized, 
            {status.available_books?.length || 0} available
            {status.status === 'not_initialized' && (
              <button
                onClick={() => initialize()}
                className="ml-2 text-blue-400 hover:underline"
              >
                Initialize
              </button>
            )}
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <AnimatePresence>
          {messages.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-8"
            >
              <Bot className="w-12 h-12 text-blue-400/50 mx-auto mb-4" />
              <p className="text-white/60 mb-2">Welcome to AI Torah Study</p>
              <p className="text-white/40 text-sm">
                Ask questions about {currentBook || 'the teachings'} and receive contextual guidance
              </p>
            </motion.div>
          )}

          {messages.map((message, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={cn(
                "flex gap-3",
                message.role === 'user' ? 'justify-end' : 'justify-start'
              )}
            >
              {message.role === 'assistant' && (
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-blue-400" />
                </div>
              )}
              
              <div className={cn(
                "max-w-[80%] p-3 rounded-lg",
                message.role === 'user'
                  ? "bg-blue-500/20 text-blue-100"
                  : message.error
                  ? "bg-red-500/20 text-red-100 border border-red-500/30"
                  : "bg-white/10 text-white"
              )}>
                <div className="whitespace-pre-wrap text-sm leading-relaxed">
                  {message.content}
                </div>
                
                {message.role === 'assistant' && !message.error && (
                  <div className="mt-2 text-xs text-white/50">
                    {message.book && <span>Book: {message.book} • </span>}
                    {message.sources_used && <span>Sources: {message.sources_used} • </span>}
                    Mode: {message.mode || 'study'}
                  </div>
                )}
              </div>

              {message.role === 'user' && (
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center">
                  <User className="w-4 h-4 text-purple-400" />
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-3"
          >
            <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
              <Bot className="w-4 h-4 text-blue-400" />
            </div>
            <div className="bg-white/10 p-3 rounded-lg">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                <span className="text-white/60 text-sm">AI is thinking...</span>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Input */}
      <div className="p-4 border-t border-white/10">
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={`Ask about ${currentBook || 'the teachings'} in ${mode} mode...`}
            className="flex-1 min-h-[40px] max-h-32 p-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            disabled={loading}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || loading}
            className={cn(
              "p-3 rounded-lg transition-colors",
              input.trim() && !loading
                ? "bg-blue-500/30 text-blue-300 hover:bg-blue-500/40"
                : "bg-white/5 text-white/30 cursor-not-allowed"
            )}
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        
        {messages.length > 0 && (
          <button
            onClick={clearMessages}
            className="mt-2 text-xs text-white/40 hover:text-white/60 transition-colors"
          >
            Clear conversation
          </button>
        )}
      </div>
    </div>
  )
}

export default GeminiChat