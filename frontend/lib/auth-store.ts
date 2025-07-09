import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface User {
  id: number
  email: string
  name: string
  role: 'admin' | 'scholar' | 'student' | 'guest'
  is_active: boolean
  is_verified: boolean
  preferred_language: 'he' | 'en' | 'fr'
  avatar_url?: string
  created_at: string
  updated_at: string
}

interface AuthState {
  user: User | null
  accessToken: string | null
  refreshToken: string | null
  isLoading: boolean
  error: string | null
  isAuthenticated: boolean
  
  // Actions
  setUser: (user: User) => void
  setTokens: (accessToken: string, refreshToken: string) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  login: (email: string, password: string, remember?: boolean) => Promise<void>
  register: (email: string, password: string, name: string, passwordConfirm: string) => Promise<void>
  logout: () => void
  refreshAccessToken: () => Promise<void>
  clearAuth: () => void
  forgotPassword: (email: string) => Promise<void>
  resetPassword: (token: string, newPassword: string, confirmPassword: string) => Promise<void>
  changePassword: (currentPassword: string, newPassword: string, confirmPassword: string) => Promise<void>
  resendVerification: (email: string) => Promise<void>
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isLoading: false,
      error: null,
      isAuthenticated: false,

      setUser: (user) => set({ user, isAuthenticated: true }),
      
      setTokens: (accessToken, refreshToken) => set({ 
        accessToken, 
        refreshToken,
        isAuthenticated: true 
      }),
      
      setLoading: (loading) => set({ isLoading: loading }),
      
      setError: (error) => set({ error }),
      
      login: async (email, password, remember = false) => {
        set({ isLoading: true, error: null })
        
        try {
          const formData = new FormData()
          formData.append('username', email)
          formData.append('password', password)
          if (remember) {
            formData.append('client_id', 'remember')
          }
          
          const response = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
            method: 'POST',
            body: formData,
          })
          
          if (!response.ok) {
            const errorData = await response.json()
            throw new Error(errorData.detail || 'Login failed')
          }
          
          const data = await response.json()
          
          set({
            user: data.user,
            accessToken: data.access_token,
            refreshToken: data.refresh_token,
            isAuthenticated: true,
            isLoading: false,
            error: null
          })
        } catch (error) {
          set({ 
            isLoading: false, 
            error: error instanceof Error ? error.message : 'Login failed' 
          })
          throw error
        }
      },
      
      register: async (email, password, name, passwordConfirm) => {
        set({ isLoading: true, error: null })
        
        try {
          const response = await fetch(`${API_BASE_URL}/api/v1/auth/register`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email,
              password,
              password_confirm: passwordConfirm,
              name,
              preferred_language: 'he'
            }),
          })
          
          if (!response.ok) {
            const errorData = await response.json()
            throw new Error(errorData.detail || 'Registration failed')
          }
          
          const data = await response.json()
          
          set({
            user: data.user,
            accessToken: data.access_token,
            refreshToken: data.refresh_token,
            isAuthenticated: true,
            isLoading: false,
            error: null
          })
        } catch (error) {
          set({ 
            isLoading: false, 
            error: error instanceof Error ? error.message : 'Registration failed' 
          })
          throw error
        }
      },
      
      logout: async () => {
        const { accessToken } = get()
        
        if (accessToken) {
          try {
            await fetch(`${API_BASE_URL}/api/v1/auth/logout`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${accessToken}`,
              },
            })
          } catch (error) {
            console.error('Logout request failed:', error)
          }
        }
        
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          error: null
        })
      },
      
      refreshAccessToken: async () => {
        const { refreshToken } = get()
        
        if (!refreshToken) {
          throw new Error('No refresh token available')
        }
        
        try {
          const response = await fetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ refresh_token: refreshToken }),
          })
          
          if (!response.ok) {
            throw new Error('Token refresh failed')
          }
          
          const data = await response.json()
          
          set({
            accessToken: data.access_token,
            refreshToken: data.refresh_token,
          })
          
          return data.access_token
        } catch (error) {
          // Clear auth on refresh failure
          set({
            user: null,
            accessToken: null,
            refreshToken: null,
            isAuthenticated: false,
          })
          throw error
        }
      },
      
      clearAuth: () => set({
        user: null,
        accessToken: null,
        refreshToken: null,
        isAuthenticated: false,
        error: null
      }),
      
      forgotPassword: async (email) => {
        set({ isLoading: true, error: null })
        
        try {
          const response = await fetch(`${API_BASE_URL}/api/v1/auth/forgot-password`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email }),
          })
          
          if (!response.ok) {
            const errorData = await response.json()
            throw new Error(errorData.detail || 'Password reset request failed')
          }
          
          set({ isLoading: false, error: null })
        } catch (error) {
          set({ 
            isLoading: false, 
            error: error instanceof Error ? error.message : 'Password reset request failed' 
          })
          throw error
        }
      },
      
      resetPassword: async (token, newPassword, confirmPassword) => {
        set({ isLoading: true, error: null })
        
        try {
          const response = await fetch(`${API_BASE_URL}/api/v1/auth/reset-password`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              token,
              new_password: newPassword,
              confirm_password: confirmPassword
            }),
          })
          
          if (!response.ok) {
            const errorData = await response.json()
            throw new Error(errorData.detail || 'Password reset failed')
          }
          
          set({ isLoading: false, error: null })
        } catch (error) {
          set({ 
            isLoading: false, 
            error: error instanceof Error ? error.message : 'Password reset failed' 
          })
          throw error
        }
      },
      
      changePassword: async (currentPassword, newPassword, confirmPassword) => {
        const { accessToken } = get()
        set({ isLoading: true, error: null })
        
        try {
          const response = await fetch(`${API_BASE_URL}/api/v1/auth/change-password`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${accessToken}`,
            },
            body: JSON.stringify({
              current_password: currentPassword,
              new_password: newPassword,
              confirm_password: confirmPassword
            }),
          })
          
          if (!response.ok) {
            const errorData = await response.json()
            throw new Error(errorData.detail || 'Password change failed')
          }
          
          set({ isLoading: false, error: null })
        } catch (error) {
          set({ 
            isLoading: false, 
            error: error instanceof Error ? error.message : 'Password change failed' 
          })
          throw error
        }
      },
      
      resendVerification: async (email) => {
        set({ isLoading: true, error: null })
        
        try {
          const response = await fetch(`${API_BASE_URL}/api/v1/auth/resend-verification`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email }),
          })
          
          if (!response.ok) {
            const errorData = await response.json()
            throw new Error(errorData.detail || 'Verification resend failed')
          }
          
          set({ isLoading: false, error: null })
        } catch (error) {
          set({ 
            isLoading: false, 
            error: error instanceof Error ? error.message : 'Verification resend failed' 
          })
          throw error
        }
      }
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)