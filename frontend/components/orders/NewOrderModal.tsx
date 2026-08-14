'use client';

import React, { useState } from 'react';
import { Modal, Table, InputNumber, Button, Typography, Space, message } from 'antd';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { useCreateOrder } from '@/lib/hooks/useOrders';

interface NewOrderModalProps {
  branchId: number;
  open: boolean;
  onClose: () => void;
}

interface MenuItem {
  id: number;
  effectivePrice: string;
  isInStock: boolean;
  masterItem: { name: string };
}

export const NewOrderModal: React.FC<NewOrderModalProps> = ({ branchId, open, onClose }) => {
  const [quantities, setQuantities] = useState<Record<number, number>>({});
  
  const { data: menu, isLoading } = useQuery({
    queryKey: ['menu', branchId],
    queryFn: async () => {
      const { data } = await api.get<MenuItem[]>(`/branches/${branchId}/menu`);
      return data;
    },
    enabled: open && !!branchId,
  });

  const createOrderMutation = useCreateOrder(branchId);

  const handleQuantityChange = (id: number, value: number | null) => {
    setQuantities(prev => {
      const newQuants = { ...prev };
      if (value === 0 || value === null) {
        delete newQuants[id];
      } else {
        newQuants[id] = value;
      }
      return newQuants;
    });
  };

  const totalAmount = menu?.reduce((sum, item) => {
    const qty = quantities[item.id] || 0;
    return sum + (Number(item.effectivePrice) * qty);
  }, 0) || 0;

  const handleSubmit = async () => {
    const lines = Object.entries(quantities).map(([id, qty]) => ({
      branch_menu_item_id: Number(id),
      quantity: qty,
    }));
    
    if (lines.length === 0) {
      message.error('Please add at least one item');
      return;
    }

    try {
      await createOrderMutation.mutateAsync({ lines });
      message.success('Order placed successfully');
      setQuantities({});
      onClose();
    } catch (error) {
      message.error('Failed to place order');
    }
  };

  const inStockMenu = menu?.filter(item => item.isInStock) || [];

  const columns = [
    {
      title: 'Item',
      dataIndex: ['masterItem', 'name'],
      key: 'name',
    },
    {
      title: 'Price',
      dataIndex: 'effectivePrice',
      key: 'price',
      render: (val: string) => `$${Number(val).toFixed(2)}`,
    },
    {
      title: 'Quantity',
      key: 'action',
      render: (_: any, record: MenuItem) => (
        <InputNumber
          min={0}
          value={quantities[record.id] || 0}
          onChange={(val) => handleQuantityChange(record.id, val)}
        />
      ),
    },
  ];

  return (
    <Modal
      title="New Order"
      open={open}
      onCancel={onClose}
      onOk={handleSubmit}
      confirmLoading={createOrderMutation.isPending}
      width={700}
    >
      <Table
        dataSource={inStockMenu}
        columns={columns}
        rowKey="id"
        loading={isLoading}
        pagination={{ pageSize: 5 }}
      />
      <div style={{ marginTop: 16, textAlign: 'right' }}>
        <Typography.Title level={4}>Total: ${totalAmount.toFixed(2)}</Typography.Title>
      </div>
    </Modal>
  );
};
