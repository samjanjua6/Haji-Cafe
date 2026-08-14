'use client'

import React from 'react'
import { Layout, Menu, Avatar, Typography, Button } from 'antd'
import { 
  DashboardOutlined, 
  ShopOutlined, 
  TeamOutlined, 
  MenuOutlined, 
  ShoppingCartOutlined,
  LogoutOutlined
} from '@ant-design/icons'
import { usePathname, useRouter } from 'next/navigation'
import { User } from '@/types/auth'
import { useAuthStore } from '@/lib/stores/authStore'

const { Sider } = Layout
const { Text } = Typography

interface AppSidebarProps {
  user: User | undefined
  collapsed: boolean
  onCollapse: (collapsed: boolean) => void
}

export default function AppSidebar({ user, collapsed, onCollapse }: AppSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const logout = useAuthStore((state: any) => state.logout)

  const getMenuItems = () => {
    if (!user) return []

    const roleName = user.role.name
    const firstScope = user.userScopes?.[0]

    const items = []

    if (roleName === 'SUPER_ADMIN') {
      items.push(
        { key: '/dashboard', icon: <DashboardOutlined />, label: 'Dashboard' },
        { key: '/cafes', icon: <ShopOutlined />, label: 'Cafes' },
        { key: '/admin/users', icon: <TeamOutlined />, label: 'Users' }
      )
    } else if (roleName === 'CAFE_OWNER') {
      items.push(
        { key: '/dashboard', icon: <DashboardOutlined />, label: 'Dashboard' }
      )
      if (firstScope?.cafeId) {
        items.push(
          { key: `/cafes/${firstScope.cafeId}`, icon: <ShopOutlined />, label: 'My Cafe' },
          { key: `/cafes/${firstScope.cafeId}/menu`, icon: <MenuOutlined />, label: 'Master Menu' }
        )
      }
    } else if (roleName === 'BRANCH_MANAGER') {
      items.push(
        { key: '/dashboard', icon: <DashboardOutlined />, label: 'Dashboard' }
      )
      if (firstScope?.branchId) {
        items.push(
          { key: `/branches/${firstScope.branchId}/orders`, icon: <ShoppingCartOutlined />, label: 'Orders' },
          { key: `/branches/${firstScope.branchId}/menu`, icon: <MenuOutlined />, label: 'Branch Menu' }
        )
      }
    } else if (roleName === 'STAFF') {
      items.push(
        { key: '/dashboard', icon: <DashboardOutlined />, label: 'Dashboard' }
      )
      if (firstScope?.branchId) {
        items.push(
          { key: `/branches/${firstScope.branchId}/orders`, icon: <ShoppingCartOutlined />, label: 'Orders' }
        )
      }
    }

    return items
  }

  const handleMenuClick = ({ key }: { key: string }) => {
    router.push(key)
  }

  return (
    <Sider
      collapsible
      collapsed={collapsed}
      onCollapse={onCollapse}
      theme="dark"
      width={250}
      style={{
        backgroundColor: '#0d0d14',
        borderRight: '1px solid #2a2a3e',
        boxShadow: '4px 0 20px rgba(0, 0, 0, 0.2)'
      }}
    >
      <div 
        style={{ 
          height: 64, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          borderBottom: '1px solid #2a2a3e'
        }}
      >
        <Typography.Title 
          level={4} 
          style={{ 
            color: '#f59e0b', 
            margin: 0, 
            display: collapsed ? 'none' : 'block' 
          }}
        >
          Haji Cafe
        </Typography.Title>
        {collapsed && (
          <Typography.Title level={4} style={{ color: '#f59e0b', margin: 0 }}>
            HC
          </Typography.Title>
        )}
      </div>

      <Menu
        theme="dark"
        mode="inline"
        selectedKeys={[pathname]}
        onClick={handleMenuClick}
        items={getMenuItems()}
        style={{ 
          backgroundColor: 'transparent', 
          borderRight: 0,
          marginTop: '16px'
        }}
      />

      <div 
        style={{ 
          position: 'absolute', 
          bottom: 0, 
          width: '100%', 
          padding: '16px',
          borderTop: '1px solid #2a2a3e',
          backgroundColor: '#0d0d14',
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'space-between'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Avatar 
            style={{ backgroundColor: '#f59e0b', color: '#000' }}
          >
            {user?.email?.charAt(0).toUpperCase() || 'U'}
          </Avatar>
          {!collapsed && (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <Text style={{ color: '#e8e8ed', fontSize: '14px', maxWidth: '120px' }} ellipsis>
                {user?.email}
              </Text>
              <Text style={{ color: '#8b8b9e', fontSize: '12px' }}>
                {user?.role?.name?.replace('_', ' ')}
              </Text>
            </div>
          )}
        </div>
        {!collapsed && (
          <Button 
            type="text" 
            icon={<LogoutOutlined style={{ color: '#ef4444' }} />} 
            onClick={() => logout()}
          />
        )}
      </div>
    </Sider>
  )
}
