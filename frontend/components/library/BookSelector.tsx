'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Book, Search, Star, Download, Eye, ChevronDown } from 'lucide-react'
import GlassPanel, { GlassCard } from '@/components/ui/GlassPanel'
import { cn } from '@/lib/utils'

interface Book {
  id: string
  title: string
  titleHebrew: string
  description: string
  sections: number
  downloaded: boolean
  starred: boolean
  lastRead?: string
  category: 'primary' | 'teachings' | 'stories' | 'prayers'
}

interface BookSelectorProps {
  onBookSelect: (bookId: string) => void
  currentBook?: string
}

const breslovBooks: Book[] = [
  {
    id: 'likutei_moharan',
    title: 'Likutei Moharan',
    titleHebrew: 'ליקוטי מוהר"ן',
    description: 'The primary work of Rabbi Nachman containing his main teachings',
    sections: 411,
    downloaded: true,
    starred: true,
    lastRead: '1:15',
    category: 'primary'
  },
  {
    id: 'sippurei_maasiyot',
    title: 'Sippurei Maasiyot',
    titleHebrew: 'סיפורי מעשיות',
    description: 'The mystical stories of Rabbi Nachman',
    sections: 13,
    downloaded: true,
    starred: true,
    lastRead: 'Story 1',
    category: 'stories'
  },
  {
    id: 'likutei_tefilot',
    title: 'Likutei Tefilot',
    titleHebrew: 'ליקוטי תפילות',
    description: 'Prayers based on the teachings of Likutei Moharan',
    sections: 210,
    downloaded: false,
    starred: false,
    category: 'prayers'
  },
  {
    id: 'chayei_moharan',
    title: 'Chayei Moharan',
    titleHebrew: 'חיי מוהר"ן',
    description: 'Biography and stories about Rabbi Nachman',
    sections: 2,
    downloaded: true,
    starred: false,
    lastRead: 'Part 1',
    category: 'teachings'
  },
  {
    id: 'sefer_hamidot',
    title: 'Sefer HaMidot',
    titleHebrew: 'ספר המדות',
    description: 'The Book of Traits - practical guidance for living',
    sections: 50,
    downloaded: false,
    starred: true,
    category: 'teachings'
  },
  {
    id: 'likutei_etzot',
    title: 'Likutei Etzot',
    titleHebrew: 'ליקוטי עצות',
    description: 'Practical advice organized by topic',
    sections: 95,
    downloaded: true,
    starred: false,
    category: 'teachings'
  }
]

const categories = {
  primary: { title: 'Primary Works', icon: Star, color: 'from-yellow-500/20 to-orange-500/20' },
  teachings: { title: 'Teachings', icon: Book, color: 'from-blue-500/20 to-purple-500/20' },
  stories: { title: 'Stories', icon: Eye, color: 'from-green-500/20 to-emerald-500/20' },
  prayers: { title: 'Prayers', icon: Search, color: 'from-pink-500/20 to-rose-500/20' }
}

export default function BookSelector({ onBookSelect, currentBook }: BookSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'title' | 'recent' | 'sections'>('title')

  const filteredBooks = breslovBooks
    .filter(book => {
      const matchesSearch = 
        book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        book.titleHebrew.includes(searchQuery) ||
        book.description.toLowerCase().includes(searchQuery.toLowerCase())
      
      const matchesCategory = selectedCategory === 'all' || book.category === selectedCategory
      
      return matchesSearch && matchesCategory
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'recent':
          return (b.lastRead ? 1 : 0) - (a.lastRead ? 1 : 0)
        case 'sections':
          return b.sections - a.sections
        default:
          return a.title.localeCompare(b.title)
      }
    })

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white mb-2">Breslov Library</h2>
        <p className="text-white/60">Select a text to study</p>
      </div>

      {/* Search & Filters */}
      <GlassCard className="space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/40" />
          <input
            type="text"
            placeholder="Search books..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-white/40"
          />
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedCategory('all')}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
              selectedCategory === 'all'
                ? "bg-white/20 text-white"
                : "bg-white/5 text-white/60 hover:bg-white/10"
            )}
          >
            All
          </button>
          {Object.entries(categories).map(([key, category]) => {
            const IconComponent = category.icon
            return (
              <button
                key={key}
                onClick={() => setSelectedCategory(key)}
                className={cn(
                  "flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                  selectedCategory === key
                    ? "bg-white/20 text-white"
                    : "bg-white/5 text-white/60 hover:bg-white/10"
                )}
              >
                <IconComponent className="w-3 h-3" />
                <span>{category.title}</span>
              </button>
            )
          })}
        </div>

        {/* Sort */}
        <div className="relative">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          >
            <option value="title">Sort by Title</option>
            <option value="recent">Recently Read</option>
            <option value="sections">Number of Sections</option>
          </select>
          <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none" />
        </div>
      </GlassCard>

      {/* Books Grid */}
      <div className="space-y-3">
        <AnimatePresence>
          {filteredBooks.map((book, index) => {
            const category = categories[book.category]
            const IconComponent = category.icon
            
            return (
              <motion.div
                key={book.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
              >
                <GlassCard
                  className={cn(
                    "cursor-pointer transition-all duration-300 hover:scale-[1.02]",
                    currentBook === book.id && "ring-2 ring-blue-500/50"
                  )}
                  onClick={() => onBookSelect(book.id)}
                >
                  <div className="flex items-start space-x-4">
                    {/* Book Icon */}
                    <div className={cn(
                      "flex-shrink-0 w-12 h-12 rounded-lg bg-gradient-to-br flex items-center justify-center",
                      category.color
                    )}>
                      <IconComponent className="w-6 h-6 text-white" />
                    </div>

                    {/* Book Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-white font-semibold text-sm">{book.title}</h3>
                          <p className="text-white/70 text-xs font-hebrew">{book.titleHebrew}</p>
                        </div>
                        
                        <div className="flex items-center space-x-1">
                          {book.starred && (
                            <Star className="w-4 h-4 text-yellow-400 fill-current" />
                          )}
                          {book.downloaded ? (
                            <Download className="w-4 h-4 text-green-400" />
                          ) : (
                            <Download className="w-4 h-4 text-white/40" />
                          )}
                        </div>
                      </div>
                      
                      <p className="text-white/60 text-xs mt-1 line-clamp-2">
                        {book.description}
                      </p>
                      
                      <div className="flex items-center justify-between mt-3">
                        <div className="flex items-center space-x-3 text-xs text-white/50">
                          <span>{book.sections} sections</span>
                          {book.lastRead && (
                            <span>Last: {book.lastRead}</span>
                          )}
                        </div>
                        
                        <div className={cn(
                          "px-2 py-1 rounded text-xs",
                          book.downloaded 
                            ? "bg-green-500/20 text-green-300"
                            : "bg-white/10 text-white/60"
                        )}>
                          {book.downloaded ? 'Downloaded' : 'Download'}
                        </div>
                      </div>
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>

      {filteredBooks.length === 0 && (
        <div className="text-center py-8">
          <Book className="w-12 h-12 text-white/30 mx-auto mb-4" />
          <p className="text-white/60">No books found matching your search</p>
        </div>
      )}
    </div>
  )
}