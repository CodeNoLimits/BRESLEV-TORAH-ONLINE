"use client"

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'

interface User {
  id: number
  email: string
  name: string
  role: string
  is_verified: boolean
  preferred_language: string
  avatar_url?: string
}

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>
  logout: () => Promise<void>
  register: (data: RegisterData) => Promise<void>
  refreshToken: () => Promise<boolean>
}

interface RegisterData {
  email: string
  password: string
  password_confirm: string
  name: string
  preferred_language?: string
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  // Initialize auth state
  useEffect(() => {
    const initAuth = async () => {
      if (typeof window !== 'undefined') {
        const token = localStorage.getItem('token')
        if (token) {
          try {
            const response = await api.get('/auth/me')
            setUser(response.data)
          } catch (error) {
            // Token is invalid, remove it
            if (typeof window !== 'undefined') {
        localStorage.removeItem('token')
      }
          }
        }
      }
      setLoading(false)
    }

    initAuth()
  }, [])

  // Setup axios interceptor for token refresh
  useEffect(() => {
    const interceptor = api.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401 && user) {
          // Try to refresh token
          const refreshed = await refreshToken()
          if (refreshed) {
            // Retry the original request
            return api(error.config)
          } else {
            // Refresh failed, logout user
            await logout()
          }
        }
        return Promise.reject(error)
      }
    )

    return () => {
      api.interceptors.response.eject(interceptor)
    }
  }, [user])

  const login = async (email: string, password: string, rememberMe = false) => {
    try {
      const formData = new FormData()
      formData.append('username', email) // OAuth2 uses 'username' field
      formData.append('password', password)
      if (rememberMe) {
        formData.append('client_id', 'remember')
      }

      const response = await api.post('/auth/login', formData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      })

      const { access_token } = response.data
      if (typeof window !== 'undefined') {
        localStorage.setItem('token', access_token)
      }

      // Get user info
      const userResponse = await api.get('/auth/me')
      setUser(userResponse.data)

      router.push('/')
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || 'Login failed')
    }
  }

  const logout = async () => {
    try {
      await api.post('/auth/logout')
    } catch (error) {
      // Even if logout fails on server, clear local state
      console.error('Logout error:', error)
    } finally {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token')
      }
      setUser(null)
      router.push('/login')
    }
  }

  const register = async (data: RegisterData) => {
    try {
      await api.post('/auth/register', data)
      // After successful registration, redirect to login
      router.push('/login?message=Registration successful. Please check your email to verify your account.')
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || 'Registration failed')
    }
  }

  const refreshToken = async (): Promise<boolean> => {
    try {
      const response = await api.post('/auth/refresh')
      const { access_token } = response.data
      if (typeof window !== 'undefined') {
        localStorage.setItem('token', access_token)
      }
      return true
    } catch (error) {
      return false
    }
  }

  const value = {
    user,
    loading,
    login,
    logout,
    register,
    refreshToken,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}