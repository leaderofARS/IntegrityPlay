import type { Metadata } from 'next'
import './globals.css'
import { Providers } from './providers'
import { TopNav } from '@/components/TopNav'

export const metadata: Metadata = {
  title: 'IntegrityPlay - AI-Powered Market Surveillance',
  description: 'Enterprise-grade real-time market surveillance with explainable AI',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gradient-dark">
        <Providers>
          <TopNav />
          <main className="pt-16">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  )
}
