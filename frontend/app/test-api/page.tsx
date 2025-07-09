'use client'

import { useEffect, useState } from 'react'
import { useBooks } from '@/lib/api/hooks'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Loader2, CheckCircle, XCircle } from 'lucide-react'

export default function TestAPIPage() {
  const [connectionStatus, setConnectionStatus] = useState<'testing' | 'success' | 'error'>('testing')
  const [errorMessage, setErrorMessage] = useState<string>('')
  
  const { data: books, isLoading, error } = useBooks()

  useEffect(() => {
    const testConnection = async () => {
      try {
        const response = await fetch('http://localhost:8000/health')
        if (response.ok) {
          setConnectionStatus('success')
        } else {
          setConnectionStatus('error')
          setErrorMessage('Backend health check failed')
        }
      } catch (error) {
        setConnectionStatus('error')
        setErrorMessage(error instanceof Error ? error.message : 'Connection failed')
      }
    }

    testConnection()
  }, [])

  const testRegistration = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/v1/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'TestPassword123@',
          password_confirm: 'TestPassword123@',
          name: 'Test User',
        }),
      })

      const data = await response.json()
      console.log('Registration response:', data)
    } catch (error) {
      console.error('Registration error:', error)
    }
  }

  return (
    <div className="min-h-screen p-8 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card className="bg-white/10 backdrop-blur-sm border-white/20">
          <CardHeader>
            <CardTitle className="text-white">API Connection Test</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Connection Status */}
            <div className="flex items-center space-x-2">
              {connectionStatus === 'testing' && <Loader2 className="h-5 w-5 animate-spin text-blue-500" />}
              {connectionStatus === 'success' && <CheckCircle className="h-5 w-5 text-green-500" />}
              {connectionStatus === 'error' && <XCircle className="h-5 w-5 text-red-500" />}
              <span className="text-white">
                Backend Connection: {connectionStatus}
              </span>
            </div>

            {errorMessage && (
              <Alert variant="destructive">
                <AlertDescription>{errorMessage}</AlertDescription>
              </Alert>
            )}

            {/* Books API Test */}
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-white">Books API Test</h3>
              {isLoading && (
                <div className="flex items-center space-x-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-white">Loading books...</span>
                </div>
              )}
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>
                    Books API Error: {error.message}
                  </AlertDescription>
                </Alert>
              )}
              {books && (
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-white">Books loaded successfully!</span>
                  </div>
                  <div className="text-sm text-gray-300">
                    Total books: {books.total} | Available: {books.available}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-4">
                    {books.books?.slice(0, 6).map((book: any) => (
                      <div key={book.id} className="bg-white/5 p-2 rounded border border-white/10">
                        <div className="font-medium text-white">{book.title_en}</div>
                        <div className="text-sm text-gray-300" dir="rtl">{book.title_he}</div>
                        <div className="text-xs text-gray-400">
                          {book.sections} sections • {book.available ? 'Available' : 'Not available'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Test Registration */}
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-white">Test Authentication</h3>
              <Button onClick={testRegistration} className="bg-blue-600 hover:bg-blue-700">
                Test Registration
              </Button>
              <div className="text-sm text-gray-300">
                Check browser console for registration results
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Environment Info */}
        <Card className="bg-white/10 backdrop-blur-sm border-white/20">
          <CardHeader>
            <CardTitle className="text-white">Environment Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-300">API URL:</span>
                <span className="text-white ml-2">
                  {process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}
                </span>
              </div>
              <div>
                <span className="text-gray-300">WebSocket URL:</span>
                <span className="text-white ml-2">
                  {process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000'}
                </span>
              </div>
              <div>
                <span className="text-gray-300">Frontend URL:</span>
                <span className="text-white ml-2">http://localhost:3002</span>
              </div>
              <div>
                <span className="text-gray-300">Node ENV:</span>
                <span className="text-white ml-2">{process.env.NODE_ENV}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}