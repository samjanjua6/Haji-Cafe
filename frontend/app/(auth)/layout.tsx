'use client'

import React from 'react'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen flex items-center justify-center">
      <div 
        className="fixed inset-0 z-[-1]"
        style={{
          backgroundColor: '#0a0a0f',
          backgroundImage: `
            radial-gradient(circle at 15% 50%, rgba(245, 158, 11, 0.1), transparent 25%),
            radial-gradient(circle at 85% 30%, rgba(128, 90, 213, 0.1), transparent 25%)
          `
        }}
      />
      {children}
    </div>
  )
}
