import type { Metadata } from 'next'
import { Inter, Noto_Sans_Hebrew } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'
import { FloatingBackground } from '@/components/ui/FloatingBackground'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
})

const hebrew = Noto_Sans_Hebrew({
  subsets: ['hebrew'],
  variable: '--font-hebrew',
})

export const metadata: Metadata = {
  title: 'Breslev Torah Online - ברסלב תורה אונליין',
  description: 'Study the teachings of Rabbi Nachman of Breslov with AI assistance',
  keywords: 'Breslov, Torah, Rabbi Nachman, Chassidut, Jewish studies',
  openGraph: {
    title: 'Breslev Torah Online',
    description: 'Study the teachings of Rabbi Nachman of Breslov with AI assistance',
    type: 'website',
    locale: 'he_IL',
    alternateLocale: ['en_US', 'fr_FR'],
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="he" dir="rtl" className={`${inter.variable} ${hebrew.variable}`}>
      <body className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 font-hebrew">
        <FloatingBackground />
        <Providers>
          <div className="relative z-10">
            {children}
          </div>
        </Providers>
      </body>
    </html>
  )
}