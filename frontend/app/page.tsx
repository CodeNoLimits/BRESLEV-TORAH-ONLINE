"use client"

import { GlassPanel } from '@/components/ui/GlassPanel'
import { useTheme } from '@/providers/theme-provider'
import { useAuth } from '@/providers/auth-provider'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default function HomePage() {
  const { t } = useTheme()
  const { user } = useAuth()

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-4xl w-full space-y-8">
        
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-4">
            <span className="text-gradient">
              {t('app.title')}
            </span>
          </h1>
          
          <p className="text-xl text-white/80 max-w-2xl mx-auto leading-relaxed">
            ללמוד את תורתו של רבי נחמן מברסלב עם סיוע בינה מלאכותית
          </p>
        </div>

        {/* Main Content */}
        <GlassPanel className="text-center space-y-6">
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold text-white">
              ברוכים הבאים לעולם התורה הברסלבית
            </h2>
            
            <p className="text-white/70 leading-relaxed">
              גלו את עומק תורתו של רבי נחמן מברסלב דרך פלטפורמה דיגיטלית מתקדמת
              המשלבת טכנולוגיית בינה מלאכותית עם לימוד תורה מסורתי
            </p>
          </div>

          {user ? (
            <div className="space-y-4">
              <p className="text-white/80">
                שלום {user.name}! מוכן להמשיך ללמוד?
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/library">
                  <Button size="lg" className="w-full sm:w-auto">
                    {t('nav.library')} - הספרייה
                  </Button>
                </Link>
                
                <Link href="/chat">
                  <Button variant="outline" size="lg" className="w-full sm:w-auto">
                    {t('nav.chat')} - שאל את הבינה המלאכותית
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-white/70">
                התחבר כדי להתחיל ללמוד ולחקור את האוצרות הרוחניים
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/login">
                  <Button size="lg" className="w-full sm:w-auto">
                    {t('auth.login')} - התחברות
                  </Button>
                </Link>
                
                <Link href="/register">
                  <Button variant="outline" size="lg" className="w-full sm:w-auto">
                    {t('auth.register')} - הרשמה
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </GlassPanel>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-6">
          <GlassPanel variant="subtle" className="space-y-3">
            <h3 className="text-lg font-semibold text-white">
              ספרייה מקיפה
            </h3>
            <p className="text-white/70 text-sm">
              גישה לכל ספרי רבי נחמן מברסלב בעברית, אנגלית וצרפתית
            </p>
          </GlassPanel>

          <GlassPanel variant="subtle" className="space-y-3">
            <h3 className="text-lg font-semibold text-white">
              בינה מלאכותית מתקדמת
            </h3>
            <p className="text-white/70 text-sm">
              שאל שאלות וקבל תשובות מבוססות על הטקסטים המקוריים
            </p>
          </GlassPanel>

          <GlassPanel variant="subtle" className="space-y-3">
            <h3 className="text-lg font-semibold text-white">
              הקראה קולית
            </h3>
            <p className="text-white/70 text-sm">
              האזן לטקסטים עם טכנולוגיית הקראה קולית איכותית
            </p>
          </GlassPanel>
        </div>
      </div>
    </div>
  )
}