'use client'

import React from 'react'
import { Layout, Tag, Dropdown, Avatar, Space, Typography } from 'antd'
import { UserOutlined, LogoutOutlined } from '@ant-design/icons'
import { User } from '@/types/auth'
import { useAuthStore } from '@/lib/stores/authStore'

const { Header } = Layout
const { Text } = Typography

interface AppHeaderProps {
  user: User | undefined
}

export default function AppHeader({ user }: AppHeaderProps) {
  const logout = useAuthStore((state: any) => state.logout)

  const getRoleColor = (roleName?: string) => {
    switch (roleName) {
      case 'SUPER_ADMIN': return 'gold'
      case 'CAFE_OWNER': return 'blue'
      case 'BRANCH_MANAGER': return 'green'
      case 'STAFF': return 'default'
      default: return 'default'
    }
  }

  const items = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: 'Profile',
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Logout',
      onClick: () => logout()
    },
  ]

  return (
    <Header 
      style={{ 
        height: 64, 
        padding: '0 24px', 
        backgroundColor: '#111118', 
        borderBottom: '1px solid #2a2a3e',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}
    >
      <div className="flex items-center">
        {/* Breadcrumb or title placeholder */}
        <Text style={{ color: '#e8e8ed', fontSize: '16px', fontWeight: 500 }}>
          Haji Cafe Portal
        </Text>
      </div>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {user?.role && (
          <Tag color={getRoleColor(user.role.name)} style={{ margin: 0 }}>
            {user.role.name?.replace('_', ' ')}
          </Tag>
        )}
        
        <Dropdown menu={{ items }} placement="bottomRight">
          <Space style={{ cursor: 'pointer' }}>
            <Text style={{ color: '#e8e8ed' }}>{user?.email}</Text>
            <Avatar style={{ backgroundColor: '#f59e0b', color: '#000' }}>
              {user?.email?.charAt(0).toUpperCase() || 'U'}
            </Avatar>
          </Space>
        </Dropdown>
      </div>
    </Header>
  )
}
