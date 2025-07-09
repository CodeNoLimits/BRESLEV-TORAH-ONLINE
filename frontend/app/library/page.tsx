'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/auth-store'
import { FloatingBackground } from '@/components/ui/FloatingBackground'
import { GlassPanel } from '@/components/ui/GlassPanel'
import { BookSelector } from '@/components/library/BookSelector'
import { TriPanelLayout } from '@/components/library/TriPanelLayout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Book, Search, MessageCircle, Star, Clock, User, Settings } from 'lucide-react'

export default function LibraryPage() {
  const { user, isAuthenticated, logout } = useAuthStore()
  const router = useRouter()

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login')
    }
  }, [isAuthenticated, router])

  const handleLogout = async () => {
    await logout()
    router.push('/')
  }

  if (!isAuthenticated || !user) {
    return null
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      <FloatingBackground />
      
      {/* Header */}
      <div className="relative z-10 border-b border-white/20 bg-white/5 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Book className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-2xl font-bold">Breslev Torah Library</h1>
                <p className="text-sm text-muted-foreground">
                  Welcome back, {user.name}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                onClick={() => router.push('/chat')}
                className="flex items-center space-x-2"
              >
                <MessageCircle className="h-4 w-4" />
                <span>Ask AI</span>
              </Button>
              
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Quick Stats */}
          <Card className="bg-white/10 backdrop-blur-sm border-white/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center">
                <Book className="h-4 w-4 mr-2" />
                Books Available
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">12</div>
              <p className="text-xs text-muted-foreground">
                Breslov Torah collection
              </p>
            </CardContent>
          </Card>
          
          <Card className="bg-white/10 backdrop-blur-sm border-white/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center">
                <Star className="h-4 w-4 mr-2" />
                Bookmarks
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground">
                Saved passages
              </p>
            </CardContent>
          </Card>
          
          <Card className="bg-white/10 backdrop-blur-sm border-white/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center">
                <Clock className="h-4 w-4 mr-2" />
                Study Time
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0h</div>
              <p className="text-xs text-muted-foreground">
                This week
              </p>
            </CardContent>
          </Card>
        </div>
        
        {/* Book Selection */}
        <div className="mb-8">
          <GlassPanel className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Select a Book</h2>
              <Button variant="outline" size="sm">
                <Search className="h-4 w-4 mr-2" />
                Search
              </Button>
            </div>
            <BookSelector onBookSelect={(bookId) => console.log('Selected book:', bookId)} />
          </GlassPanel>
        </div>
        
        {/* Study Interface */}
        <GlassPanel className="p-0">
          <TriPanelLayout />
        </GlassPanel>
      </div>
    </div>
  )
}