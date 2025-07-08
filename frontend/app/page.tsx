'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Book, MessageCircle, X, Menu } from 'lucide-react'
import FloatingBackground from '@/components/ui/FloatingBackground'
import TriPanelLayout from '@/components/library/TriPanelLayout'
import BookSelector from '@/components/library/BookSelector'
import GeminiChat from '@/components/chat/GeminiChat'
import { GlassCard } from '@/components/ui/GlassPanel'

export default function HomePage() {
  const [currentView, setCurrentView] = useState<'library' | 'reader'>('library')
  const [currentBook, setCurrentBook] = useState<string>('')
  const [currentSection, setCurrentSection] = useState<string>('1:1')
  const [showSidebar, setShowSidebar] = useState(false)
  const [showChat, setShowChat] = useState(false)

  // Mock data - dans une vraie app, ceci viendrait de l'API
  const mockTexts = {
    likutei_moharan: {
      he: "אָמַר רַבִּי נַחְמָן: כִּי עִקַּר הַתִּקּוּן הוּא עַל יְדֵי הַנִּגּוּן, שֶׁהַנִּגּוּן הוּא מִבְחִינַת הַמָּקוֹם שֶׁאֵין שָׁם שׁוּם דִּבּוּר כְּלָל, רַק צְרִיחָה בְּעַלְמָא. וְעַל יְדֵי זֶה נִפְתָּחִים כָּל הַשְּׁעָרִים, וְכָל הַקְּלִפּוֹת נִשְׁבָּרִים...",
      en: "Rabbi Nachman said: The main rectification comes through melody, for melody comes from a place where there is no speech at all, only pure outcry. Through this, all gates are opened and all shells are broken...",
      fr: "Rabbi Nachman a dit: La rectification principale vient par la mélodie, car la mélodie vient d'un lieu où il n'y a aucune parole du tout, seulement un cri pur. Par cela, toutes les portes s'ouvrent et toutes les écorces sont brisées..."
    }
  }

  const handleBookSelect = (bookId: string) => {
    setCurrentBook(bookId)
    setCurrentView('reader')
  }

  const handleBackToLibrary = () => {
    setCurrentView('library')
    setShowSidebar(false)
  }

  const currentTexts = currentBook ? mockTexts[currentBook as keyof typeof mockTexts] : undefined

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Animated background */}
      <FloatingBackground />
      
      {/* Main content */}
      <div className="relative z-10 min-h-screen flex">
        {/* Sidebar - Book selector when in reader mode */}
        <AnimatePresence>
          {(currentView === 'library' || showSidebar) && (
            <motion.div
              initial={{ x: -400, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -400, opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="w-80 h-screen p-4 overflow-y-auto flex-shrink-0"
            >
              <div className="space-y-4">
                {currentView === 'reader' && (
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-white font-semibold">Library</h3>
                    <button
                      onClick={() => setShowSidebar(false)}
                      className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                    >
                      <X className="w-4 h-4 text-white" />
                    </button>
                  </div>
                )}
                
                <BookSelector 
                  onBookSelect={handleBookSelect}
                  currentBook={currentBook}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main content area */}
        <div className="flex-1 flex flex-col">
          <AnimatePresence mode="wait">
            {currentView === 'library' ? (
              // Library view - full screen book selector
              <motion.div
                key="library"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.05 }}
                transition={{ duration: 0.4, ease: 'easeInOut' }}
                className="flex-1 flex items-center justify-center p-8"
              >
                <div className="max-w-4xl w-full">
                  <div className="text-center mb-8">
                    <motion.h1 
                      className="text-4xl md:text-6xl font-bold text-white mb-4"
                      initial={{ y: -50, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.2, duration: 0.6 }}
                    >
                      ברסלב תורה
                    </motion.h1>
                    <motion.p 
                      className="text-xl text-white/70 mb-2"
                      initial={{ y: -30, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.4, duration: 0.6 }}
                    >
                      Breslev Torah Online
                    </motion.p>
                    <motion.p 
                      className="text-white/50"
                      initial={{ y: -20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.6, duration: 0.6 }}
                    >
                      Study the teachings of Rabbi Nachman with AI guidance
                    </motion.p>
                  </div>

                  <motion.div
                    initial={{ y: 50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.8, duration: 0.6 }}
                  >
                    <BookSelector 
                      onBookSelect={handleBookSelect}
                      currentBook={currentBook}
                    />
                  </motion.div>
                </div>
              </motion.div>
            ) : (
              // Reader view 
              <motion.div
                key="reader"
                initial={{ opacity: 0, x: 100 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -100 }}
                transition={{ duration: 0.4, ease: 'easeInOut' }}
                className="flex-1 flex flex-col h-screen"
              >
                {/* Top navigation */}
                <div className="flex items-center justify-between p-4 border-b border-white/10">
                  <div className="flex items-center space-x-4">
                    {!showSidebar && (
                      <button
                        onClick={() => setShowSidebar(true)}
                        className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                      >
                        <Menu className="w-5 h-5 text-white" />
                      </button>
                    )}
                    
                    <button
                      onClick={handleBackToLibrary}
                      className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-white/70 hover:text-white"
                    >
                      <Book className="w-4 h-4" />
                      <span className="text-sm">Library</span>
                    </button>
                  </div>

                  <div className="text-center">
                    <h1 className="text-white font-semibold">Breslev Torah</h1>
                    <p className="text-white/60 text-sm">Study & AI Guidance</p>
                  </div>

                  <div className="w-24"></div> {/* Spacer for balance */}
                </div>

                {/* Main reader */}
                <div className="flex-1 p-4">
                  <TriPanelLayout
                    currentBook={currentBook}
                    currentSection={currentSection}
                    hebrewText={currentTexts?.he}
                    englishText={currentTexts?.en}
                    frenchText={currentTexts?.fr}
                    onChatToggle={() => setShowChat(!showChat)}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Chat sidebar */}
        <AnimatePresence>
          {showChat && (
            <motion.div
              initial={{ x: 400, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 400, opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="w-80 h-screen p-4 border-l border-white/10"
            >
              <GlassCard className="h-full p-0">
                <div className="flex items-center justify-between p-4 border-b border-white/10">
                  <h3 className="text-white font-semibold flex items-center space-x-2">
                    <MessageCircle className="w-4 h-4" />
                    <span>AI Guidance</span>
                  </h3>
                  <button
                    onClick={() => setShowChat(false)}
                    className="p-1 rounded hover:bg-white/10 transition-colors"
                  >
                    <X className="w-4 h-4 text-white/60" />
                  </button>
                </div>
                
                <div className="flex-1">
                  <GeminiChat 
                    currentBook={currentBook}
                    currentSection={currentSection}
                    className="h-full"
                  />
                </div>
              </GlassCard>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}