'use client';

import React from 'react';
import { Button, Space, Popconfirm, Typography } from 'antd';
import { motion } from 'framer-motion';
import { useUpdateOrderStatus } from '@/lib/hooks/useOrders';
import { OrderStatus } from '@/types/order';

interface StatusTransitionProps {
  branchId: number;
  orderId: number;
  currentStatus: OrderStatus;
  onStatusChange?: () => void;
}

export const StatusTransition: React.FC<StatusTransitionProps> = ({ branchId, orderId, currentStatus, onStatusChange }) => {
  const updateStatusMutation = useUpdateOrderStatus(branchId);

  const handleUpdate = async (status: OrderStatus) => {
    await updateStatusMutation.mutateAsync({ orderId, status });
    onStatusChange?.();
  };

  if (currentStatus === 'COMPLETED') {
    return <Typography.Text type="success">Order completed</Typography.Text>;
  }
  
  if (currentStatus === 'CANCELLED') {
    return <Typography.Text type="danger">Order cancelled</Typography.Text>;
  }

  return (
    <Space>
      {currentStatus === 'PENDING' && (
        <Popconfirm
          title="Start preparation?"
          onConfirm={() => handleUpdate('IN_PREPARATION')}
        >
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button type="primary" loading={updateStatusMutation.isPending}>
              Start Preparation
            </Button>
          </motion.div>
        </Popconfirm>
      )}

      {currentStatus === 'IN_PREPARATION' && (
        <Popconfirm
          title="Mark order as complete?"
          onConfirm={() => handleUpdate('COMPLETED')}
        >
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button type="primary" style={{ backgroundColor: 'var(--ant-colorSuccess)' }} loading={updateStatusMutation.isPending}>
              Mark Complete
            </Button>
          </motion.div>
        </Popconfirm>
      )}

      {(currentStatus === 'PENDING' || currentStatus === 'IN_PREPARATION') && (
        <Popconfirm
          title="Are you sure you want to cancel this order?"
          onConfirm={() => handleUpdate('CANCELLED')}
        >
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button danger loading={updateStatusMutation.isPending}>
              Cancel
            </Button>
          </motion.div>
        </Popconfirm>
      )}
    </Space>
  );
};
