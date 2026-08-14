'use client';

import React from 'react';
import { Drawer, Descriptions, Table, Typography, Space, Spin } from 'antd';
import { useOrder } from '@/lib/hooks/useOrders';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { StatusTransition } from './StatusTransition';
import { OrderLine } from '@/types/order';

interface OrderDetailDrawerProps {
  branchId: number;
  orderId: number | null;
  open: boolean;
  onClose: () => void;
}

export const OrderDetailDrawer: React.FC<OrderDetailDrawerProps> = ({ branchId, orderId, open, onClose }) => {
  const { data: order, isLoading } = useOrder(branchId, orderId);

  const columns = [
    {
      title: 'Item',
      dataIndex: ['branchMenuItem', 'masterItem', 'name'],
      key: 'name',
    },
    {
      title: 'Quantity',
      dataIndex: 'quantity',
      key: 'quantity',
    },
    {
      title: 'Unit Price',
      dataIndex: 'unitPrice',
      key: 'unitPrice',
      render: (val: number) => `$${Number(val).toFixed(2)}`,
    },
    {
      title: 'Total',
      dataIndex: 'lineTotal',
      key: 'lineTotal',
      render: (val: number) => `$${Number(val).toFixed(2)}`,
    },
  ];

  return (
    <Drawer
      title={`Order #${orderId || ''}`}
      placement="right"
      width={500}
      onClose={onClose}
      open={open}
      styles={{ body: { paddingBottom: 80 } }}
    >
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '50px 0' }}><Spin size="large" /></div>
      ) : order ? (
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <Descriptions bordered column={1}>
            <Descriptions.Item label="Status">
              <StatusBadge status={order.status} />
            </Descriptions.Item>
            <Descriptions.Item label="Date">
              {new Date(order.createdAt).toLocaleString()}
            </Descriptions.Item>
            <Descriptions.Item label="Placed By">
              {order.placedBy?.email || 'Guest'}
            </Descriptions.Item>
            <Descriptions.Item label="Total Amount">
              <Typography.Text strong>${Number(order.totalAmount).toFixed(2)}</Typography.Text>
            </Descriptions.Item>
          </Descriptions>

          <Typography.Title level={5}>Order Items</Typography.Title>
          <Table
            dataSource={order.orderLines}
            columns={columns}
            rowKey="id"
            pagination={false}
            size="small"
          />

          <div style={{ marginTop: 24 }}>
            <StatusTransition
              branchId={branchId}
              orderId={order.id}
              currentStatus={order.status}
              onStatusChange={() => {}}
            />
          </div>
        </Space>
      ) : (
        <div>Order not found</div>
      )}
    </Drawer>
  );
};
