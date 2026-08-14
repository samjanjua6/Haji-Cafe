'use client'

import { Inter } from 'next/font/google'
import '@/styles/globals.css'
import '@/styles/animations.css'
import QueryProvider from '@/lib/providers/QueryProvider'
import ThemeProvider from '@/lib/providers/ThemeProvider'

const inter = Inter({ subsets: ['latin'] })

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <title>Haji Cafe</title>
        <meta name="description" content="Haji Cafe Management System" />
      </head>
      <body className={inter.className}>
        <QueryProvider>
          <ThemeProvider>
            {children}
            {/* <ChatbotWidget /> */}
          </ThemeProvider>
        </QueryProvider>
      </body>
    </html>
  )
}
