'use client';

import React, { useState } from 'react';
import { Modal, Tabs, InputNumber, Button, Form, message } from 'antd';
import { useAddScope } from '@/lib/hooks/useAdmin';
import { UserScope } from '@/types/admin';

interface ScopeManagerProps {
  userId: number;
  currentScopes: UserScope[];
  open: boolean;
  onClose: () => void;
}

export const ScopeManager: React.FC<ScopeManagerProps> = ({ userId, currentScopes, open, onClose }) => {
  const addScopeMutation = useAddScope();
  const [formCafe] = Form.useForm();
  const [formBranch] = Form.useForm();

  const handleAddCafe = async (values: { cafe_id: number }) => {
    try {
      await addScopeMutation.mutateAsync({ userId, scope: { cafe_id: values.cafe_id } });
      message.success('Cafe scope added');
      formCafe.resetFields();
      onClose();
    } catch (e) {
      message.error('Failed to add scope');
    }
  };

  const handleAddBranch = async (values: { branch_id: number }) => {
    try {
      await addScopeMutation.mutateAsync({ userId, scope: { branch_id: values.branch_id } });
      message.success('Branch scope added');
      formBranch.resetFields();
      onClose();
    } catch (e) {
      message.error('Failed to add scope');
    }
  };

  const items = [
    {
      key: '1',
      label: 'Assign Cafe',
      children: (
        <Form form={formCafe} onFinish={handleAddCafe} layout="vertical">
          <Form.Item label="Cafe ID" name="cafe_id" rules={[{ required: true, message: 'Required' }]}>
            <InputNumber style={{ width: '100%' }} />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={addScopeMutation.isPending}>Add Scope</Button>
        </Form>
      ),
    },
    {
      key: '2',
      label: 'Assign Branch',
      children: (
        <Form form={formBranch} onFinish={handleAddBranch} layout="vertical">
          <Form.Item label="Branch ID" name="branch_id" rules={[{ required: true, message: 'Required' }]}>
            <InputNumber style={{ width: '100%' }} />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={addScopeMutation.isPending}>Add Scope</Button>
        </Form>
      ),
    },
  ];

  return (
    <Modal title="Manage User Scopes" open={open} onCancel={onClose} footer={null}>
      <Tabs items={items} />
    </Modal>
  );
};
