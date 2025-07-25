"use client"

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'

type Theme = 'dark' | 'light' | 'system'
type Language = 'he' | 'en' | 'fr'

interface ThemeContextType {
  theme: Theme
  language: Language
  setTheme: (theme: Theme) => void
  setLanguage: (language: Language) => void
  t: (key: string) => string
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}

// Simple translations for the app
const translations = {
  he: {
    'app.title': 'ברסלב תורה אונליין',
    'nav.home': 'בית',
    'nav.library': 'ספרייה',
    'nav.chat': 'צ\'אט',
    'nav.settings': 'הגדרות',
    'auth.login': 'התחברות',
    'auth.logout': 'התנתקות',
    'auth.register': 'הרשמה',
    'auth.email': 'אימייל',
    'auth.password': 'סיסמה',
    'auth.name': 'שם',
    'auth.rememberMe': 'זכור אותי',
    'common.loading': 'טוען...',
    'common.error': 'שגיאה',
    'common.save': 'שמור',
    'common.cancel': 'בטל',
    'common.search': 'חיפוש',
  },
  en: {
    'app.title': 'Breslev Torah Online',
    'nav.home': 'Home',
    'nav.library': 'Library',
    'nav.chat': 'Chat',
    'nav.settings': 'Settings',
    'auth.login': 'Login',
    'auth.logout': 'Logout',
    'auth.register': 'Register',
    'auth.email': 'Email',
    'auth.password': 'Password',
    'auth.name': 'Name',
    'auth.rememberMe': 'Remember me',
    'common.loading': 'Loading...',
    'common.error': 'Error',
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.search': 'Search',
  },
  fr: {
    'app.title': 'Breslev Torah En Ligne',
    'nav.home': 'Accueil',
    'nav.library': 'Bibliothèque',
    'nav.chat': 'Chat',
    'nav.settings': 'Paramètres',
    'auth.login': 'Connexion',
    'auth.logout': 'Déconnexion',
    'auth.register': 'Inscription',
    'auth.email': 'Email',
    'auth.password': 'Mot de passe',
    'auth.name': 'Nom',
    'auth.rememberMe': 'Se souvenir de moi',
    'common.loading': 'Chargement...',
    'common.error': 'Erreur',
    'common.save': 'Enregistrer',
    'common.cancel': 'Annuler',
    'common.search': 'Rechercher',
  },
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>('system')
  const [language, setLanguage] = useState<Language>('he')

  useEffect(() => {
    // Load saved preferences
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('theme') as Theme
      const savedLanguage = localStorage.getItem('language') as Language

      if (savedTheme) {
        setTheme(savedTheme)
      }

      if (savedLanguage) {
        setLanguage(savedLanguage)
      }
    }
  }, [])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const root = window.document.documentElement

      // Apply theme
      if (theme === 'system') {
        const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light'
        root.classList.remove('light', 'dark')
        root.classList.add(systemTheme)
      } else {
        root.classList.remove('light', 'dark')
        root.classList.add(theme)
      }

      // Apply language and direction
      root.lang = language
      root.dir = language === 'he' ? 'rtl' : 'ltr'

      // Save preferences
      localStorage.setItem('theme', theme)
      localStorage.setItem('language', language)
    }
  }, [theme, language])

  const t = (key: string): string => {
    return translations[language]?.[key] || key
  }

  const value = {
    theme,
    language,
    setTheme,
    setLanguage,
    t,
  }

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  )
}