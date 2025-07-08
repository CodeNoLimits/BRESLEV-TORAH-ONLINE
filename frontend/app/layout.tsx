import type { Metadata } from 'next'
import { Inter, Heebo } from 'next/font/google'
import './globals.css'

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter',
})

const heebo = Heebo({ 
  subsets: ['latin', 'hebrew'],
  variable: '--font-heebo',
})

export const metadata: Metadata = {
  title: 'Breslev Torah Online - ספריית רבי נחמן מברסלב',
  description: 'Application spirituelle interactive pour l\'étude des enseignements de Rabbi Nachman de Breslev avec IA contextuelle',
  keywords: ['Breslev', 'Rabbi Nachman', 'Torah', 'Spiritualité', 'Judaism', 'Hassidisme'],
  authors: [{ name: 'Breslev Torah Online' }],
  viewport: 'width=device-width, initial-scale=1',
  robots: 'index, follow',
  openGraph: {
    title: 'Breslev Torah Online',
    description: 'Explorez la sagesse de Rabbi Nachman avec l\'IA moderne',
    type: 'website',
    locale: 'fr_FR',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr" dir="ltr" className={`${inter.variable} ${heebo.variable}`}>
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=David+Libre:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">
        {children}
      </body>
    </html>
  )
}