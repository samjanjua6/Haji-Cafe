'use client';

import React, { useState } from 'react';
import { Table, Button, Tabs, Space } from 'antd';
import { EyeOutlined } from '@ant-design/icons';
import { motion } from 'framer-motion';
import { useOrders } from '@/lib/hooks/useOrders';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { OrderStatus, Order } from '@/types/order';

interface OrderTableProps {
  branchId: number;
  onViewOrder: (orderId: number) => void;
}

export const OrderTable: React.FC<OrderTableProps> = ({ branchId, onViewOrder }) => {
  const [statusFilter, setStatusFilter] = useState<OrderStatus | undefined>(undefined);
  const { data: orders, isLoading } = useOrders(branchId, statusFilter);

  const columns = [
    {
      title: 'Order ID',
      dataIndex: 'id',
      key: 'id',
      render: (id: number) => <strong>#{id}</strong>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: OrderStatus) => <StatusBadge status={status} />,
    },
    {
      title: 'Total Amount',
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      render: (amount: number) => `$${Number(amount).toFixed(2)}`,
    },
    {
      title: 'Date',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => new Date(date).toLocaleString(),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: Order) => (
        <Button
          type="text"
          icon={<EyeOutlined />}
          onClick={() => onViewOrder(record.id)}
        >
          View
        </Button>
      ),
    },
  ];

  const tabItems = [
    { key: 'all', label: 'All Orders' },
    { key: 'PENDING', label: 'Pending' },
    { key: 'IN_PREPARATION', label: 'In Preparation' },
    { key: 'COMPLETED', label: 'Completed' },
    { key: 'CANCELLED', label: 'Cancelled' },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <Tabs
        activeKey={statusFilter || 'all'}
        onChange={(key) => setStatusFilter(key === 'all' ? undefined : (key as OrderStatus))}
        items={tabItems}
      />
      <Table
        dataSource={orders}
        columns={columns}
        rowKey="id"
        loading={isLoading}
        pagination={{ pageSize: 10 }}
        onRow={(record) => ({
          onClick: () => onViewOrder(record.id),
          style: { cursor: 'pointer' },
        })}
      />
    </motion.div>
  );
};
