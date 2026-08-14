'use client';

import React from 'react';
import { Tag } from 'antd';
import { ClockCircleOutlined, SyncOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { OrderStatus } from '@/types/order';

interface StatusBadgeProps {
  status: OrderStatus;
}

const statusConfig: Record<OrderStatus, { color: string; icon: React.ReactNode; label: string }> = {
  PENDING: { color: 'gold', icon: <ClockCircleOutlined />, label: 'Pending' },
  IN_PREPARATION: { color: 'blue', icon: <SyncOutlined spin />, label: 'In Preparation' },
  COMPLETED: { color: 'green', icon: <CheckCircleOutlined />, label: 'Completed' },
  CANCELLED: { color: 'red', icon: <CloseCircleOutlined />, label: 'Cancelled' },
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const config = statusConfig[status];
  if (!config) return <Tag>{status}</Tag>;

  return (
    <Tag color={config.color} icon={config.icon}>
      {config.label}
    </Tag>
  );
};
