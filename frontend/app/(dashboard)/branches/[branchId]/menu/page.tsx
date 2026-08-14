'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { Typography } from 'antd';
import { BranchMenuTable } from '@/components/menu/BranchMenuTable';

const { Title } = Typography;

export default function BranchMenuPage() {
  const params = useParams();
  const branchId = Number(params.branchId);

  return (
    <div style={{ padding: '24px' }}>
      <Title level={2} style={{ color: '#e8e8ed', marginBottom: '24px' }}>Branch Menu</Title>
      <BranchMenuTable branchId={branchId} />
    </div>
  );
}
