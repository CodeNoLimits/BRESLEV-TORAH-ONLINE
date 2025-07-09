'use client'

import { useState, useCallback, useMemo } from 'react'
import { useDebounce } from '@/hooks/useDebounce'
import { useSearchTexts, useBooks } from '@/lib/api/hooks'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { 
  Search, 
  Filter, 
  X, 
  Book, 
  FileText, 
  Volume2,
  Bookmark,
  ExternalLink,
  Loader2
} from 'lucide-react'

interface SearchFilters {
  book_id?: number
  language?: string
  chapter?: number
}

interface SearchResult {
  id: number
  book_id: number
  book_title: string
  chapter: number
  verse?: number
  section?: string
  content_hebrew?: string
  content_english?: string
  content_french?: string
  audio_url_hebrew?: string
  audio_url_english?: string
  audio_url_french?: string
  relevance_score?: number
}

export default function AdvancedSearch() {
  const [query, setQuery] = useState('')
  const [filters, setFilters] = useState<SearchFilters>({})
  const [showFilters, setShowFilters] = useState(false)
  const [selectedLanguage, setSelectedLanguage] = useState<'he' | 'en' | 'fr'>('he')
  
  // Debounce search query to avoid too many API calls
  const debouncedQuery = useDebounce(query, 300)
  
  // Fetch books for filter dropdown
  const { data: books = [], isLoading: booksLoading } = useBooks()
  
  // Search texts
  const { 
    data: searchResults = [], 
    isLoading: searchLoading, 
    error: searchError 
  } = useSearchTexts(debouncedQuery, filters)

  const handleFilterChange = useCallback((key: keyof SearchFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value || undefined
    }))
  }, [])

  const clearFilters = useCallback(() => {
    setFilters({})
  }, [])

  const clearSearch = useCallback(() => {
    setQuery('')
    setFilters({})
  }, [])

  // Highlight search terms in text
  const highlightText = useCallback((text: string, searchTerm: string) => {
    if (!searchTerm || !text) return text
    
    const regex = new RegExp(`(${searchTerm})`, 'gi')
    const parts = text.split(regex)
    
    return parts.map((part, index) => {
      if (regex.test(part)) {
        return (
          <mark key={index} className="bg-yellow-200 dark:bg-yellow-800 px-1 rounded">
            {part}
          </mark>
        )
      }
      return part
    })
  }, [])

  const getDisplayText = useCallback((result: SearchResult) => {
    switch (selectedLanguage) {
      case 'en':
        return result.content_english || result.content_hebrew || ''
      case 'fr':
        return result.content_french || result.content_english || result.content_hebrew || ''
      default:
        return result.content_hebrew || result.content_english || ''
    }
  }, [selectedLanguage])

  const hasActiveFilters = useMemo(() => {
    return Object.values(filters).some(value => value !== undefined && value !== '')
  }, [filters])

  return (
    <div className="space-y-6">
      {/* Search Header */}
      <Card className="bg-white/10 backdrop-blur-sm border-white/20">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Search className="h-5 w-5" />
              <span>Advanced Search</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center space-x-2"
            >
              <Filter className="h-4 w-4" />
              <span>Filters</span>
              {hasActiveFilters && (
                <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                  {Object.values(filters).filter(v => v !== undefined).length}
                </Badge>
              )}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Main Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search in Breslov texts..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-10 pr-20"
            />
            {query && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearSearch}
                className="absolute right-2 top-1 h-7 w-7 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Language Selector */}
          <div className="flex items-center space-x-4">
            <Label className="text-sm font-medium">Display Language:</Label>
            <div className="flex space-x-2">
              {(['he', 'en', 'fr'] as const).map((lang) => (
                <Button
                  key={lang}
                  variant={selectedLanguage === lang ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedLanguage(lang)}
                  className="text-xs"
                >
                  {lang === 'he' ? 'עברית' : lang === 'en' ? 'English' : 'Français'}
                </Button>
              ))}
            </div>
          </div>

          {/* Advanced Filters */}
          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-white/5 rounded-lg border border-white/10">
              <div className="space-y-2">
                <Label htmlFor="book-filter">Book</Label>
                <Select
                  value={filters.book_id?.toString() || ''}
                  onValueChange={(value) => handleFilterChange('book_id', value ? parseInt(value) : undefined)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All books" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All books</SelectItem>
                    {books.map((book) => (
                      <SelectItem key={book.id} value={book.id.toString()}>
                        {book.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="chapter-filter">Chapter</Label>
                <Input
                  id="chapter-filter"
                  type="number"
                  placeholder="Chapter number"
                  value={filters.chapter || ''}
                  onChange={(e) => handleFilterChange('chapter', e.target.value ? parseInt(e.target.value) : undefined)}
                  min="1"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="language-filter">Content Language</Label>
                <Select
                  value={filters.language || ''}
                  onValueChange={(value) => handleFilterChange('language', value || undefined)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All languages" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All languages</SelectItem>
                    <SelectItem value="he">Hebrew</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="fr">French</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {hasActiveFilters && (
                <div className="md:col-span-3 flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearFilters}
                    className="flex items-center space-x-2"
                  >
                    <X className="h-4 w-4" />
                    <span>Clear Filters</span>
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Search Results */}
      <div className="space-y-4">
        {searchError && (
          <Alert variant="destructive">
            <AlertDescription>
              Error searching texts: {searchError.message}
            </AlertDescription>
          </Alert>
        )}

        {searchLoading && (
          <Card className="bg-white/10 backdrop-blur-sm border-white/20">
            <CardContent className="flex items-center justify-center py-8">
              <div className="flex items-center space-x-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Searching...</span>
              </div>
            </CardContent>
          </Card>
        )}

        {!searchLoading && debouncedQuery && searchResults.length === 0 && (
          <Card className="bg-white/10 backdrop-blur-sm border-white/20">
            <CardContent className="text-center py-8">
              <div className="space-y-2">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto" />
                <h3 className="text-lg font-medium">No results found</h3>
                <p className="text-muted-foreground">
                  Try adjusting your search terms or filters
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {!searchLoading && searchResults.length > 0 && (
          <>
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Found {searchResults.length} result{searchResults.length !== 1 ? 's' : ''}
                {debouncedQuery && ` for "${debouncedQuery}"`}
              </p>
            </div>

            <div className="space-y-3">
              {searchResults.map((result) => (
                <Card 
                  key={result.id} 
                  className="bg-white/10 backdrop-blur-sm border-white/20 hover:bg-white/15 transition-colors cursor-pointer"
                >
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      {/* Result Header */}
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <Book className="h-4 w-4 text-primary" />
                            <span className="font-medium text-sm">{result.book_title}</span>
                            <Badge variant="outline" className="text-xs">
                              Chapter {result.chapter}
                              {result.verse && ` | Verse ${result.verse}`}
                            </Badge>
                          </div>
                          {result.section && (
                            <p className="text-xs text-muted-foreground">{result.section}</p>
                          )}
                        </div>

                        <div className="flex items-center space-x-1">
                          {/* Audio Button */}
                          {(selectedLanguage === 'he' && result.audio_url_hebrew) ||
                           (selectedLanguage === 'en' && result.audio_url_english) ||
                           (selectedLanguage === 'fr' && result.audio_url_french) ? (
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <Volume2 className="h-4 w-4" />
                            </Button>
                          ) : null}

                          {/* Bookmark Button */}
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <Bookmark className="h-4 w-4" />
                          </Button>

                          {/* View Full Text Button */}
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Result Content */}
                      <div className={`text-sm leading-relaxed ${selectedLanguage === 'he' ? 'text-right' : 'text-left'}`}>
                        <div 
                          className="line-clamp-3"
                          dir={selectedLanguage === 'he' ? 'rtl' : 'ltr'}
                        >
                          {highlightText(getDisplayText(result), debouncedQuery)}
                        </div>
                      </div>

                      {/* Relevance Score (for debugging) */}
                      {result.relevance_score && process.env.NODE_ENV === 'development' && (
                        <div className="text-xs text-muted-foreground">
                          Relevance: {(result.relevance_score * 100).toFixed(1)}%
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}

        {/* Empty State */}
        {!debouncedQuery && !searchLoading && (
          <Card className="bg-white/10 backdrop-blur-sm border-white/20">
            <CardContent className="text-center py-12">
              <div className="space-y-4">
                <Search className="h-16 w-16 text-muted-foreground mx-auto" />
                <div className="space-y-2">
                  <h3 className="text-xl font-medium">Search Breslov Texts</h3>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    Search through our comprehensive collection of Rabbi Nachman's teachings, 
                    stories, and commentaries in Hebrew, English, and French.
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto mt-6">
                  <div className="text-center space-y-2">
                    <Book className="h-8 w-8 text-primary mx-auto" />
                    <p className="text-sm font-medium">12 Books</p>
                    <p className="text-xs text-muted-foreground">Complete collection</p>
                  </div>
                  <div className="text-center space-y-2">
                    <FileText className="h-8 w-8 text-primary mx-auto" />
                    <p className="text-sm font-medium">1000+ Texts</p>
                    <p className="text-xs text-muted-foreground">Searchable content</p>
                  </div>
                  <div className="text-center space-y-2">
                    <Volume2 className="h-8 w-8 text-primary mx-auto" />
                    <p className="text-sm font-medium">Audio Support</p>
                    <p className="text-xs text-muted-foreground">Listen while reading</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}