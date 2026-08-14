'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import { Button } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { PageHeader } from '@/components/shared/PageHeader';
import { OrderTable } from '@/components/orders/OrderTable';
import { OrderDetailDrawer } from '@/components/orders/OrderDetailDrawer';
import { NewOrderModal } from '@/components/orders/NewOrderModal';

export default function BranchOrdersPage() {
  const params = useParams();
  const branchId = Number(params.branchId);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);

  const handleViewOrder = (orderId: number) => {
    setSelectedOrderId(orderId);
    setDrawerOpen(true);
  };

  return (
    <div style={{ padding: '24px' }}>
      <PageHeader 
        title="Orders" 
        subtitle="Manage branch orders"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
            New Order
          </Button>
        }
      />
      
      <OrderTable branchId={branchId} onViewOrder={handleViewOrder} />

      <OrderDetailDrawer 
        branchId={branchId}
        orderId={selectedOrderId}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />

      <NewOrderModal 
        branchId={branchId}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </div>
  );
}
