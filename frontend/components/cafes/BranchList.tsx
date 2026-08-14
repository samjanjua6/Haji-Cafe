'use client';

import React, { useState } from 'react';
import { Table, Button, Modal, Form, Input, message, Space } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useBranches, useCreateBranch, useUpdateBranch, useDeleteBranch } from '@/lib/hooks/useCafes';
import { confirmAction } from '@/components/shared/ConfirmModal';

interface BranchListProps {
  cafeId: number;
}

export const BranchList: React.FC<BranchListProps> = ({ cafeId }) => {
  const { data: branches, isLoading } = useBranches(cafeId);
  const createBranch = useCreateBranch(cafeId);
  const updateBranch = useUpdateBranch(cafeId);
  const deleteBranch = useDeleteBranch(cafeId);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form] = Form.useForm();

  const handleOpenModal = (record?: any) => {
    if (record) {
      setEditingId(record.id);
      form.setFieldsValue(record);
    } else {
      setEditingId(null);
      form.resetFields();
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    form.resetFields();
    setEditingId(null);
  };

  const handleSubmit = async (values: any) => {
    try {
      if (editingId) {
        await updateBranch.mutateAsync({ branchId: editingId, ...values });
        message.success('Branch updated successfully');
      } else {
        await createBranch.mutateAsync(values);
        message.success('Branch created successfully');
      }
      handleCloseModal();
    } catch (error) {
      message.error('Failed to save branch');
    }
  };

  const handleDelete = (id: number) => {
    confirmAction({
      title: 'Delete Branch',
      content: 'Are you sure you want to delete this branch? This action cannot be undone.',
      danger: true,
      onOk: async () => {
        try {
          await deleteBranch.mutateAsync(id);
          message.success('Branch deleted successfully');
        } catch (error) {
          message.error('Failed to delete branch');
        }
      },
    });
  };

  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Address',
      dataIndex: 'address',
      key: 'address',
    },
    {
      title: 'City',
      dataIndex: 'city',
      key: 'city',
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: any) => (
        <Space>
          <Button icon={<EditOutlined />} onClick={() => handleOpenModal(record)} type="text" style={{ color: '#f59e0b' }} />
          <Button icon={<DeleteOutlined />} onClick={() => handleDelete(record.id)} type="text" danger />
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'flex-end' }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => handleOpenModal()}>
          Add Branch
        </Button>
      </div>
      <Table
        dataSource={branches}
        columns={columns}
        rowKey="id"
        loading={isLoading}
      />
      <Modal
        title={editingId ? 'Edit Branch' : 'Add Branch'}
        open={isModalOpen}
        onCancel={handleCloseModal}
        onOk={() => form.submit()}
        confirmLoading={createBranch.isPending || updateBranch.isPending}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="name" label="Branch Name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="address" label="Address">
            <Input />
          </Form.Item>
          <Form.Item name="city" label="City">
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};
