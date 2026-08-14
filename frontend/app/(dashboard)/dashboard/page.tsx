'use client'

import { useEffect, useState } from 'react';
import { Button, Card, Skeleton } from 'antd';
import { motion } from 'framer-motion';
import { GoogleOutlined } from '@ant-design/icons';
import { useUser } from '@/lib/hooks/useUser';
import api from '@/lib/api';
import QuickActions from '@/components/dashboard/QuickActions';
import RecentActivity from '@/components/dashboard/RecentActivity';

export default function DashboardPage() {
  const { user, isLoading } = useUser();
  const [connectingGoogle, setConnectingGoogle] = useState(false);

  const handleConnectGoogle = async () => {
    try {
      setConnectingGoogle(true);
      const { data } = await api.get('/auth/google/connect');
      if (data.connect_url) {
        window.location.href = data.connect_url;
      }
    } catch (error) {
      console.error('Failed to connect Google Calendar', error);
      setConnectingGoogle(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-8">
        <Skeleton active paragraph={{ rows: 2 }} className="mb-8" />
        <Skeleton active paragraph={{ rows: 4 }} className="mb-8" />
        <Skeleton active paragraph={{ rows: 6 }} />
      </div>
    );
  }

  if (!user) return null;

  const roleName = user.role?.name;
  const userScope = user.userScopes?.[0];
  const cafeId = userScope?.cafeId;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="p-6 md:p-8 max-w-7xl mx-auto"
    >
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-[#e8e8ed] mb-2">Dashboard</h1>
        <p className="text-[#8b8b9e]">Welcome back, {user.email}</p>
      </header>

      {/* CAFE_OWNER Google Calendar Connection Card */}
      {roleName === 'CAFE_OWNER' && !user.googleConnected && (
        <Card 
          className="mb-8 bg-[rgba(18,18,26,0.8)] backdrop-blur-md border-[#f59e0b] border-opacity-30 shadow-[0_0_15px_rgba(245,158,11,0.05)]"
          bodyStyle={{ padding: '24px' }}
        >
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-medium text-[#e8e8ed] mb-1">Connect Google Calendar</h3>
              <p className="text-[#8b8b9e] text-sm">Sync your cafe reservations directly with your Google Calendar.</p>
            </div>
            <Button 
              type="primary" 
              icon={<GoogleOutlined />} 
              loading={connectingGoogle}
              onClick={handleConnectGoogle}
              className="bg-[#f59e0b] hover:bg-[#d97706] text-[#0a0a0f] border-none font-medium h-10 px-6 shrink-0"
            >
              Connect Calendar
            </Button>
          </div>
        </Card>
      )}

      <QuickActions user={user} />

      {/* Recent Activity for Owners and Admins */}
      {(roleName === 'SUPER_ADMIN' || roleName === 'CAFE_OWNER') && cafeId && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <RecentActivity cafeId={cafeId} />
          </div>
          {/* Right column can be used for other widgets like recent orders */}
        </div>
      )}
    </motion.div>
  );
}
