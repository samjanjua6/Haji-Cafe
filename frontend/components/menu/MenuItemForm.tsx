'use client';

import React, { useEffect, useState } from 'react';
import { Modal, Form, Input, InputNumber, Select, Divider, Space, Button, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useCategories, useCreateCategory, useCreateMasterItem, useUpdateMasterItem } from '@/lib/hooks/useMenu';

interface MenuItemFormProps {
  cafeId: number;
  open: boolean;
  onClose: () => void;
  editItem?: any | null;
}

export const MenuItemForm: React.FC<MenuItemFormProps> = ({ cafeId, open, onClose, editItem }) => {
  const [form] = Form.useForm();
  const { data: categories } = useCategories(cafeId);
  const createCategory = useCreateCategory(cafeId);
  const createItem = useCreateMasterItem(cafeId);
  const updateItem = useUpdateMasterItem(cafeId);
  const [newCatName, setNewCatName] = useState('');

  useEffect(() => {
    if (open) {
      if (editItem) {
        form.setFieldsValue({
          name: editItem.name,
          description: editItem.description,
          base_price: editItem.basePrice,
          category_id: editItem.category?.id,
        });
      } else {
        form.resetFields();
      }
    }
  }, [open, editItem, form]);

  const handleAddCategory = async (e: React.MouseEvent<HTMLButtonElement | HTMLAnchorElement>) => {
    e.preventDefault();
    if (!newCatName) return;
    try {
      await createCategory.mutateAsync({ name: newCatName });
      setNewCatName('');
      message.success('Category added');
    } catch {
      message.error('Failed to add category');
    }
  };

  const handleSubmit = async (values: any) => {
    try {
      if (editItem) {
        await updateItem.mutateAsync({ itemId: editItem.id, ...values });
        message.success('Item updated');
      } else {
        await createItem.mutateAsync(values);
        message.success('Item created');
      }
      onClose();
    } catch {
      message.error('Failed to save item');
    }
  };

  return (
    <Modal
      title={editItem ? "Edit Menu Item" : "Add Menu Item"}
      open={open}
      onCancel={onClose}
      onOk={() => form.submit()}
      confirmLoading={createItem.isPending || updateItem.isPending}
    >
      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        <Form.Item name="name" label="Name" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item name="category_id" label="Category">
          <Select
            placeholder="Select a category"
            dropdownRender={(menu) => (
              <>
                {menu}
                <Divider style={{ margin: '8px 0' }} />
                <Space style={{ padding: '0 8px 4px' }}>
                  <Input
                    placeholder="Please enter item"
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    onKeyDown={(e) => e.stopPropagation()}
                  />
                  <Button type="text" icon={<PlusOutlined />} onClick={handleAddCategory}>
                    Add item
                  </Button>
                </Space>
              </>
            )}
            options={categories?.map((c: any) => ({ label: c.name, value: c.id }))}
          />
        </Form.Item>
        <Form.Item name="base_price" label="Base Price" rules={[{ required: true }]}>
          <InputNumber style={{ width: '100%' }} prefix="$" />
        </Form.Item>
        <Form.Item name="description" label="Description">
          <Input.TextArea rows={3} />
        </Form.Item>
      </Form>
    </Modal>
  );
};
