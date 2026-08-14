'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Typography, Breadcrumb } from 'antd';
import { useCafe } from '@/lib/hooks/useCafes';
import { MasterMenuTable } from '@/components/menu/MasterMenuTable';

const { Title } = Typography;

export default function CafeMenuPage() {
  const params = useParams();
  const router = useRouter();
  const cafeId = Number(params.cafeId);
  const { data: cafe } = useCafe(cafeId);

  return (
    <div style={{ padding: '24px' }}>
      <Breadcrumb style={{ marginBottom: '16px' }} items={[
        { title: 'Cafes', onClick: () => router.push('/cafes') },
        { title: cafe?.name || 'Cafe', onClick: () => router.push(`/cafes/${cafeId}`) },
        { title: 'Menu' },
      ]} />
      
      <Title level={2} style={{ color: '#e8e8ed', marginBottom: '24px' }}>Master Menu</Title>
      
      <MasterMenuTable cafeId={cafeId} />
    </div>
  );
}
