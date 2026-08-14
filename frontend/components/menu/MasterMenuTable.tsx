'use client';

import React, { useState } from 'react';
import { Table, Button, Input, Space, Select, message } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useMasterMenu, useDeleteMasterItem, useCategories } from '@/lib/hooks/useMenu';
import { confirmAction } from '@/components/shared/ConfirmModal';
import { MenuItemForm } from './MenuItemForm';

export const MasterMenuTable: React.FC<{ cafeId: number }> = ({ cafeId }) => {
  const { data: menu, isLoading } = useMasterMenu(cafeId);
  const { data: categories } = useCategories(cafeId);
  const deleteItem = useDeleteMasterItem(cafeId);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<any | null>(null);

  const handleDelete = (id: number) => {
    confirmAction({
      title: 'Delete Item',
      content: 'Are you sure you want to delete this menu item?',
      danger: true,
      onOk: async () => {
        try {
          await deleteItem.mutateAsync(id);
          message.success('Item deleted');
        } catch {
          message.error('Failed to delete item');
        }
      },
    });
  };

  const filteredMenu = menu?.filter((item: any) => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory ? item.category?.id === selectedCategory : true;
    return matchesSearch && matchesCategory && !item.isDeleted;
  });

  const columns = [
    { title: 'Name', dataIndex: 'name', key: 'name' },
    { title: 'Category', dataIndex: ['category', 'name'], key: 'category' },
    { title: 'Base Price', dataIndex: 'basePrice', key: 'basePrice', render: (val: number) => `$${val}` },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: any) => (
        <Space>
          <Button icon={<EditOutlined />} onClick={() => { setEditItem(record); setIsModalOpen(true); }} type="text" style={{ color: '#f59e0b' }} />
          <Button icon={<DeleteOutlined />} onClick={() => handleDelete(record.id)} type="text" danger />
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <Space>
          <Input.Search placeholder="Search items..." allowClear onChange={(e) => setSearchTerm(e.target.value)} style={{ width: 250 }} />
          <Select 
            placeholder="Filter Category" 
            allowClear 
            style={{ width: 200 }}
            options={categories?.map((c: any) => ({ label: c.name, value: c.id }))}
            onChange={setSelectedCategory}
          />
        </Space>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditItem(null); setIsModalOpen(true); }}>
          Add Item
        </Button>
      </div>

      <Table dataSource={filteredMenu} columns={columns} rowKey="id" loading={isLoading} />

      <MenuItemForm 
        cafeId={cafeId} 
        open={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        editItem={editItem} 
      />
    </div>
  );
};
