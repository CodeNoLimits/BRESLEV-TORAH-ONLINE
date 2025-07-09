'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/auth-store'
import { FloatingBackground } from '@/components/ui/FloatingBackground'
import { GlassPanel } from '@/components/ui/GlassPanel'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Book, 
  ArrowLeft, 
  User, 
  Heart, 
  Bookmark, 
  Share2,
  Volume2,
  VolumeX,
  ChevronLeft,
  ChevronRight,
  List,
  Search
} from 'lucide-react'

interface BookPageClientProps {
  params: {
    slug: string
  }
}

export function BookPageClient({ params }: BookPageClientProps) {
  const { user, isAuthenticated, logout } = useAuthStore()
  const router = useRouter()
  const [currentChapter, setCurrentChapter] = useState(1)
  const [isPlaying, setIsPlaying] = useState(false)
  const [bookData, setBookData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login')
      return
    }

    // Load book data based on slug
    const loadBook = async () => {
      try {
        // This would fetch from API
        const mockBookData = {
          title: params.slug.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase()),
          author: 'Rabbi Nachman of Breslov',
          description: 'A collection of spiritual teachings and insights from Rabbi Nachman of Breslov.',
          totalChapters: 24,
          currentChapter: 1,
          language: 'Hebrew',
          category: 'Chassidut',
          difficulty: 'Intermediate'
        }
        setBookData(mockBookData)
      } catch (error) {
        console.error('Error loading book:', error)
      } finally {
        setLoading(false)
      }
    }

    loadBook()
  }, [isAuthenticated, router, params.slug])

  const handleLogout = async () => {
    await logout()
    router.push('/')
  }

  if (!isAuthenticated || !user) {
    return null
  }

  if (loading) {
    return (
      <div className="min-h-screen relative overflow-hidden flex items-center justify-center">
        <FloatingBackground />
        <div className="relative z-10 text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-lg">Loading book...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      <FloatingBackground />
      
      {/* Header */}
      <div className="relative z-10 border-b border-white/20 bg-white/5 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                onClick={() => router.push('/library')}
                className="flex items-center space-x-2"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Library</span>
              </Button>
              
              <div className="flex items-center space-x-3">
                <Book className="h-8 w-8 text-primary" />
                <div>
                  <h1 className="text-2xl font-bold">{bookData?.title}</h1>
                  <p className="text-sm text-muted-foreground">
                    Chapter {currentChapter} of {bookData?.totalChapters}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                onClick={handleLogout}
                className="flex items-center space-x-2"
              >
                <User className="h-4 w-4" />
                <span>Logout</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="relative z-10 container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-4">
            {/* Book Info */}
            <Card className="bg-white/10 backdrop-blur-sm border-white/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Book Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground">Author</p>
                  <p className="text-sm font-medium">{bookData?.author}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Category</p>
                  <Badge variant="secondary" className="text-xs">
                    {bookData?.category}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Difficulty</p>
                  <Badge variant="outline" className="text-xs">
                    {bookData?.difficulty}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Language</p>
                  <p className="text-sm">{bookData?.language}</p>
                </div>
              </CardContent>
            </Card>
            
            {/* Chapter Navigation */}
            <Card className="bg-white/10 backdrop-blur-sm border-white/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center">
                  <List className="h-4 w-4 mr-2" />
                  Chapters
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-6 gap-1">
                  {Array.from({ length: bookData?.totalChapters || 0 }, (_, i) => (
                    <Button
                      key={i + 1}
                      variant={currentChapter === i + 1 ? "default" : "outline"}
                      size="sm"
                      className="w-full p-1 text-xs"
                      onClick={() => setCurrentChapter(i + 1)}
                    >
                      {i + 1}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Main Reading Area */}
          <div className="lg:col-span-3">
            <GlassPanel className="h-full">
              <div className="p-6">
                {/* Reading Controls */}
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/20">
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentChapter(Math.max(1, currentChapter - 1))}
                      disabled={currentChapter === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm font-medium">
                      Chapter {currentChapter}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentChapter(Math.min(bookData?.totalChapters || 1, currentChapter + 1))}
                      disabled={currentChapter === bookData?.totalChapters}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsPlaying(!isPlaying)}
                    >
                      {isPlaying ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                    </Button>
                    <Button variant="outline" size="sm">
                      <Bookmark className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm">
                      <Share2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                {/* Text Content */}
                <div className="space-y-6">
                  <div className="text-center">
                    <h2 className="text-xl font-bold mb-2">
                      Chapter {currentChapter}: Beginning of Wisdom
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {bookData?.title}
                    </p>
                  </div>
                  
                  {/* Hebrew Text */}
                  <div className="bg-white/5 rounded-lg p-6 border border-white/10">
                    <h3 className="text-lg font-semibold mb-4 text-right" dir="rtl">
                      עברית
                    </h3>
                    <div className="text-right leading-relaxed text-lg" dir="rtl">
                      <p className="mb-4">
                        דע לך שהאדם צריך לעבור על גשר צר מאוד מאוד, והכלל והעיקר - שלא יפחד כלל.
                      </p>
                      <p className="mb-4">
                        כי כל העולם כולו גשר צר מאוד, והעיקר - שלא לפחד כלל. ואם אתה מאמין באמת בבורא העולם, אז אין לך מה לפחד.
                      </p>
                      <p>
                        רק חזק ואמץ, ותמיד תהיה בשמחה. כי השמחה היא הכוח הגדול ביותר לעבור על כל המכשולים.
                      </p>
                    </div>
                  </div>
                  
                  {/* English Translation */}
                  <div className="bg-white/5 rounded-lg p-6 border border-white/10">
                    <h3 className="text-lg font-semibold mb-4">English</h3>
                    <div className="leading-relaxed">
                      <p className="mb-4">
                        Know that a person must cross a very, very narrow bridge, and the main thing - is not to be afraid at all.
                      </p>
                      <p className="mb-4">
                        For the entire world is a very narrow bridge, and the main thing - is not to be afraid at all. If you truly believe in the Creator of the world, then you have nothing to fear.
                      </p>
                      <p>
                        Just be strong and courageous, and always be in joy. For joy is the greatest power to overcome all obstacles.
                      </p>
                    </div>
                  </div>
                  
                  {/* Commentary */}
                  <div className="bg-white/5 rounded-lg p-6 border border-white/10">
                    <h3 className="text-lg font-semibold mb-4">Commentary</h3>
                    <div className="leading-relaxed text-sm text-muted-foreground">
                      <p>
                        This famous teaching emphasizes the importance of maintaining faith and courage in the face of life's challenges. The metaphor of a narrow bridge represents the difficulties we encounter in our spiritual journey, while the emphasis on joy highlights Rabbi Nachman's unique approach to overcoming obstacles through positive emotion and trust in the Divine.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </GlassPanel>
          </div>
        </div>
      </div>
    </div>
  )
}