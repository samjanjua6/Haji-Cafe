'use client';

import React, { useState } from 'react';
import { Typography, Tabs, Button, Table, Skeleton, Breadcrumb, Space } from 'antd';
import { CalendarOutlined, AppstoreOutlined } from '@ant-design/icons';
import { useParams, useRouter } from 'next/navigation';
import { useCafe, useStaff } from '@/lib/hooks/useCafes';
import { BranchList } from '@/components/cafes/BranchList';
import { MeetingScheduler } from '@/components/cafes/MeetingScheduler';

const { Title } = Typography;

export default function CafeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const cafeId = Number(params.cafeId);
  const { data: cafe, isLoading: cafeLoading } = useCafe(cafeId);
  const { data: staff, isLoading: staffLoading } = useStaff(cafeId);
  const [meetingModalOpen, setMeetingModalOpen] = useState(false);

  if (cafeLoading) return <Skeleton active style={{ padding: '24px' }} />;

  const staffColumns = [
    { title: 'Email', dataIndex: 'email', key: 'email' },
    { title: 'Role', dataIndex: ['role', 'name'], key: 'role' },
    { 
      title: 'Assigned Branches', 
      key: 'branches',
      render: (_: any, record: any) => record.scopes?.map((s: any) => s.branchName).join(', ') || 'All',
    }
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Breadcrumb style={{ marginBottom: '16px' }} items={[
        { title: 'Cafes', onClick: () => router.push('/cafes') },
        { title: cafe?.name || 'Cafe Details' },
      ]} />
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <Title level={2} style={{ color: '#e8e8ed', margin: 0 }}>{cafe?.name}</Title>
        <Space>
          <Button icon={<AppstoreOutlined />} onClick={() => router.push(`/cafes/${cafeId}/menu`)}>
            Manage Menu
          </Button>
          <Button type="primary" icon={<CalendarOutlined />} onClick={() => setMeetingModalOpen(true)}>
            Schedule Meeting
          </Button>
        </Space>
      </div>

      <Tabs
        defaultActiveKey="branches"
        items={[
          {
            key: 'branches',
            label: 'Branches',
            children: <BranchList cafeId={cafeId} />,
          },
          {
            key: 'staff',
            label: 'Staff',
            children: <Table dataSource={staff} columns={staffColumns} rowKey="id" loading={staffLoading} />,
          },
          {
            key: 'orders',
            label: 'Orders',
            children: <div>Orders coming soon...</div>,
          },
        ]}
      />

      <MeetingScheduler 
        cafeId={cafeId} 
        open={meetingModalOpen} 
        onClose={() => setMeetingModalOpen(false)} 
      />
    </div>
  );
}
