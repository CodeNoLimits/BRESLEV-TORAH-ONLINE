'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/auth-store'
import { useChats, useChatMutations, useChatMessages } from '@/lib/api/hooks'
import { FloatingBackground } from '@/components/ui/FloatingBackground'
import { GlassPanel } from '@/components/ui/GlassPanel'
import { GeminiChat } from '@/components/chat/GeminiChat'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { MessageCircle, Book, User, ArrowLeft, Sparkles, Brain, Heart, Send, Plus, Loader2, AlertCircle } from 'lucide-react'

export default function ChatPage() {
  const { user, isAuthenticated, logout, accessToken } = useAuthStore()
  const router = useRouter()
  
  // State
  const [currentChatId, setCurrentChatId] = useState<number | null>(null)
  const [message, setMessage] = useState('')
  const [isConnected, setIsConnected] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [wsConnection, setWsConnection] = useState<WebSocket | null>(null)
  
  // API hooks
  const { data: chats = [], isLoading: chatsLoading } = useChats()
  const { data: messages = [], isLoading: messagesLoading } = useChatMessages(currentChatId || 0)
  const { createChatMutation, sendMessageMutation } = useChatMutations()

  // WebSocket connection
  useEffect(() => {
    if (!isAuthenticated || !accessToken) return

    const connectWebSocket = () => {
      const wsUrl = `${process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000'}/ws/chat`
      const ws = new WebSocket(`${wsUrl}?token=${accessToken}`)
      
      ws.onopen = () => {
        console.log('WebSocket connected')
        setIsConnected(true)
      }
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          
          switch (data.type) {
            case 'message':
              // Handle incoming message
              // The useChatMessages hook will refetch automatically
              break
            case 'typing':
              setIsTyping(data.isTyping)
              break
            case 'error':
              console.error('WebSocket error:', data.message)
              break
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error)
        }
      }
      
      ws.onclose = () => {
        console.log('WebSocket disconnected')
        setIsConnected(false)
        // Attempt to reconnect after 3 seconds
        setTimeout(connectWebSocket, 3000)
      }
      
      ws.onerror = (error) => {
        console.error('WebSocket error:', error)
        setIsConnected(false)
      }
      
      setWsConnection(ws)
    }

    connectWebSocket()

    return () => {
      if (wsConnection) {
        wsConnection.close()
      }
    }
  }, [isAuthenticated, accessToken])

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login')
    }
  }, [isAuthenticated, router])

  // Auto-select first chat or create new one
  useEffect(() => {
    if (chats.length > 0 && !currentChatId) {
      setCurrentChatId(chats[0].id)
    }
  }, [chats, currentChatId])

  const handleLogout = async () => {
    if (wsConnection) {
      wsConnection.close()
    }
    await logout()
    router.push('/')
  }

  const createNewChat = useCallback(async () => {
    try {
      const newChat = await createChatMutation.mutateAsync({
        title: 'New Conversation',
        language: user?.preferred_language || 'he'
      })
      setCurrentChatId(newChat.id)
    } catch (error) {
      console.error('Error creating chat:', error)
    }
  }, [createChatMutation, user?.preferred_language])

  const sendMessage = useCallback(async () => {
    if (!message.trim() || !currentChatId) return

    const messageText = message.trim()
    setMessage('')

    try {
      // Send via WebSocket for real-time experience
      if (wsConnection && wsConnection.readyState === WebSocket.OPEN) {
        wsConnection.send(JSON.stringify({
          type: 'message',
          chat_id: currentChatId,
          content: messageText
        }))
      } else {
        // Fallback to HTTP API
        await sendMessageMutation.mutateAsync({
          chat_id: currentChatId,
          content: messageText
        })
      }
    } catch (error) {
      console.error('Error sending message:', error)
      // Restore message on error
      setMessage(messageText)
    }
  }, [message, currentChatId, wsConnection, sendMessageMutation])

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }, [sendMessage])

  const suggestedTopics = [
    { icon: Brain, text: "What is Hitbodedut and how do I practice it?" },
    { icon: Heart, text: "How can I find joy in Torah study?" },
    { icon: MessageCircle, text: "Teach me about the power of prayer" },
    { icon: Sparkles, text: "What are the 10 Psalms of Tikkun HaKlali?" },
  ]

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
              <Button
                variant="ghost"
                onClick={() => router.push('/library')}
                className="flex items-center space-x-2"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Library</span>
              </Button>
              
              <div className="flex items-center space-x-3">
                <MessageCircle className="h-8 w-8 text-primary" />
                <div>
                  <h1 className="text-2xl font-bold">Torah AI Assistant</h1>
                  <p className="text-sm text-muted-foreground">
                    Ask questions about Breslov teachings
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                onClick={() => router.push('/library')}
                className="flex items-center space-x-2"
              >
                <Book className="h-4 w-4" />
                <span>Library</span>
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
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-12rem)]">
          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-4">
            {/* Connection Status */}
            <Card className="bg-white/10 backdrop-blur-sm border-white/20">
              <CardContent className="p-3">
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                  <span className="text-xs">
                    {isConnected ? 'Connected' : 'Connecting...'}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Chat List */}
            <Card className="bg-white/10 backdrop-blur-sm border-white/20">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium">Conversations</CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={createNewChat}
                    disabled={createChatMutation.isPending}
                    className="h-6 w-6 p-0"
                  >
                    {createChatMutation.isPending ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Plus className="h-3 w-3" />
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {chatsLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                ) : chats.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    No conversations yet. Create one to get started!
                  </p>
                ) : (
                  chats.map((chat) => (
                    <Button
                      key={chat.id}
                      variant={currentChatId === chat.id ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setCurrentChatId(chat.id)}
                      className="w-full justify-start text-xs h-auto p-2"
                    >
                      <div className="text-left">
                        <p className="font-medium truncate">{chat.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(chat.updated_at).toLocaleDateString()}
                        </p>
                      </div>
                    </Button>
                  ))
                )}
              </CardContent>
            </Card>
            
            {/* Suggested Topics */}
            <Card className="bg-white/10 backdrop-blur-sm border-white/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center">
                  <Sparkles className="h-4 w-4 mr-2" />
                  Suggested Topics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {suggestedTopics.map((topic, index) => (
                  <Button 
                    key={index}
                    variant="outline" 
                    size="sm" 
                    className="w-full justify-start text-xs h-auto p-2"
                    onClick={() => {
                      setMessage(topic.text)
                    }}
                  >
                    <topic.icon className="h-3 w-3 mr-2 flex-shrink-0" />
                    <span className="text-left">{topic.text}</span>
                  </Button>
                ))}
              </CardContent>
            </Card>
          </div>
          
          {/* Main Chat Area */}
          <div className="lg:col-span-3 flex flex-col">
            <GlassPanel className="flex-1 flex flex-col">
              {currentChatId ? (
                <>
                  {/* Messages Area */}
                  <div className="flex-1 p-4 overflow-y-auto space-y-4">
                    {messagesLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin" />
                      </div>
                    ) : messages.length === 0 ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="text-center space-y-4">
                          <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto" />
                          <div>
                            <h3 className="text-lg font-medium">Start a conversation</h3>
                            <p className="text-sm text-muted-foreground">
                              Ask me anything about Breslov teachings, Rabbi Nachman's stories, or spiritual guidance.
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      messages.map((msg) => (
                        <div
                          key={msg.id}
                          className={`flex ${msg.message_type === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[80%] rounded-lg p-3 ${
                              msg.message_type === 'user'
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-white/10 backdrop-blur-sm border border-white/20'
                            }`}
                          >
                            <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                            <p className="text-xs mt-1 opacity-70">
                              {new Date(msg.created_at).toLocaleTimeString()}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                    
                    {/* Typing Indicator */}
                    {isTyping && (
                      <div className="flex justify-start">
                        <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg p-3">
                          <div className="flex space-x-1">
                            <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"></div>
                            <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce delay-75"></div>
                            <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce delay-150"></div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Input Area */}
                  <div className="p-4 border-t border-white/20">
                    <div className="flex space-x-2">
                      <Input
                        placeholder="Ask about Breslov teachings..."
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        onKeyPress={handleKeyPress}
                        className="flex-1"
                        disabled={!isConnected}
                      />
                      <Button
                        onClick={sendMessage}
                        disabled={!message.trim() || !isConnected || sendMessageMutation.isPending}
                        className="px-3"
                      >
                        {sendMessageMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    
                    {!isConnected && (
                      <Alert variant="destructive" className="mt-2">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          Connection lost. Trying to reconnect...
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center p-8">
                  <div className="text-center space-y-4">
                    <MessageCircle className="h-16 w-16 text-muted-foreground mx-auto" />
                    <div>
                      <h3 className="text-xl font-medium">Select a conversation</h3>
                      <p className="text-muted-foreground">
                        Choose a conversation from the sidebar or create a new one to get started.
                      </p>
                    </div>
                    <Button onClick={createNewChat} disabled={createChatMutation.isPending}>
                      {createChatMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        <>
                          <Plus className="h-4 w-4 mr-2" />
                          New Conversation
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </GlassPanel>
          </div>
        </div>
      </div>
    </div>
  )
}