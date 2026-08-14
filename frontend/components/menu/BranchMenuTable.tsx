'use client';

import React, { useState } from 'react';
import { Table, Button, InputNumber, Switch, Space, message, Modal, Select } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useBranchMenu, usePatchBranchItem, useAddBranchItem, useMasterMenu } from '@/lib/hooks/useMenu';

export const BranchMenuTable: React.FC<{ branchId: number; cafeId?: number }> = ({ branchId, cafeId }) => {
  const { data: branchMenu, isLoading } = useBranchMenu(branchId);
  const patchItem = usePatchBranchItem(branchId);
  const addItem = useAddBranchItem(branchId);
  const { data: masterMenu } = useMasterMenu(cafeId || 0);
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedMasterItemId, setSelectedMasterItemId] = useState<number | null>(null);

  const handlePatch = async (itemId: number, field: string, value: any) => {
    try {
      await patchItem.mutateAsync({ itemId, [field]: value });
      message.success('Updated successfully');
    } catch {
      message.error('Failed to update');
    }
  };

  const handleAddItem = async () => {
    if (!selectedMasterItemId) return;
    try {
      await addItem.mutateAsync({ master_item_id: selectedMasterItemId });
      message.success('Item added to branch');
      setIsAddModalOpen(false);
      setSelectedMasterItemId(null);
    } catch {
      message.error('Failed to add item');
    }
  };

  const availableMasterItems = masterMenu?.filter((masterItem: any) => 
    !branchMenu?.some((branchItem: any) => branchItem.masterItemId === masterItem.id) && !masterItem.isDeleted
  );

  const columns = [
    { title: 'Item Name', dataIndex: ['masterItem', 'name'], key: 'name' },
    { title: 'Base Price', dataIndex: ['masterItem', 'basePrice'], key: 'basePrice', render: (val: number) => `$${val}` },
    { 
      title: 'Override Price', 
      key: 'price_override',
      render: (_: any, record: any) => (
        <InputNumber 
          defaultValue={record.priceOverride} 
          onBlur={(e) => {
            const val = e.target.value ? parseFloat(e.target.value) : null;
            if (val !== record.priceOverride) handlePatch(record.id, 'price_override', val);
          }} 
          prefix="$"
        />
      )
    },
    { 
      title: 'Quantity', 
      key: 'available_quantity',
      render: (_: any, record: any) => (
        <InputNumber 
          defaultValue={record.availableQuantity} 
          onBlur={(e) => {
            const val = e.target.value ? parseInt(e.target.value) : null;
            if (val !== record.availableQuantity) handlePatch(record.id, 'available_quantity', val);
          }} 
        />
      )
    },
    { 
      title: 'In Stock', 
      key: 'is_in_stock',
      render: (_: any, record: any) => (
        <Switch 
          checked={record.isInStock} 
          onChange={(checked) => handlePatch(record.id, 'is_in_stock', checked)} 
        />
      )
    },
    {
      title: 'Active',
      key: 'is_active',
      render: (_: any, record: any) => (
        <Switch 
          checked={record.isActive} 
          onChange={(checked) => handlePatch(record.id, 'is_active', checked)} 
        />
      )
    }
  ];

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'flex-end' }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsAddModalOpen(true)} disabled={!cafeId}>
          Add from Master Menu
        </Button>
      </div>

      <Table dataSource={branchMenu} columns={columns} rowKey="id" loading={isLoading} />

      <Modal
        title="Add Item from Master Menu"
        open={isAddModalOpen}
        onCancel={() => setIsAddModalOpen(false)}
        onOk={handleAddItem}
        confirmLoading={addItem.isPending}
      >
        <Select
          style={{ width: '100%' }}
          placeholder="Select a master item"
          options={availableMasterItems?.map((i: any) => ({ label: i.name, value: i.id }))}
          onChange={setSelectedMasterItemId}
          value={selectedMasterItemId}
        />
      </Modal>
    </div>
  );
};
