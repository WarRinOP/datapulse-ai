import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import { ToastProvider } from '@/components/ui/Toast'
import { NavBar } from '@/components/NavBar'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'DataPulse — AI Data Analysis Dashboard',
  description:
    'Upload CSV or Excel files and get instant AI-powered analysis, charts, and actionable insights. Built by Abrar Tajwar Khan.',
  keywords: ['data analysis', 'AI analytics', 'CSV analyzer', 'Excel insights', 'Claude AI'],
  authors: [{ name: 'Abrar Tajwar Khan' }],
  openGraph: {
    title: 'DataPulse — AI Data Analysis Dashboard',
    description: 'Instant AI-powered analysis for your CSV and Excel data.',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>
        <ToastProvider>
          <NavBar />
          <main style={{ minHeight: 'calc(100vh - 64px)' }}>
            {children}
          </main>
        </ToastProvider>
      </body>
    </html>
  )
}
