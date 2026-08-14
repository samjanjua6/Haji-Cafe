'use client'

import React from 'react'
import { Layout } from 'antd'
import AuthGuard from '@/lib/providers/AuthGuard'
import AppSidebar from '@/components/layout/AppSidebar'
import AppHeader from '@/components/layout/AppHeader'
import PageTransition from '@/components/layout/PageTransition'
import { useUiStore } from '@/lib/stores/uiStore'
import { useUser } from '@/lib/hooks/useUser'

const { Content } = Layout

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const sidebarCollapsed = useUiStore((s) => s.sidebarCollapsed)
  const toggleSidebar = useUiStore((s) => s.toggleSidebar)
  const { user, isLoading } = useUser()

  return (
    <AuthGuard>
      <Layout style={{ minHeight: '100vh', backgroundColor: '#0a0a0f' }}>
        <AppSidebar 
          user={user} 
          collapsed={sidebarCollapsed} 
          onCollapse={() => toggleSidebar()} 
        />
        <Layout style={{ backgroundColor: '#0a0a0f' }}>
          <AppHeader user={user} />
          <Content 
            style={{ 
              backgroundColor: '#0a0a0f', 
              padding: '24px',
              overflowY: 'auto'
            }}
          >
            <PageTransition>
              {children}
            </PageTransition>
          </Content>
        </Layout>
      </Layout>
    </AuthGuard>
  )
}
