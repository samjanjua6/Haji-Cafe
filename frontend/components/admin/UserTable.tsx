'use client';

import React, { useState } from 'react';
import { Table, Select, Button, Space, Popconfirm, message } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { useAdminUsers, useUpdateRole, useRemoveScope } from '@/lib/hooks/useAdmin';
import { ScopeManager } from './ScopeManager';
import { User, UserRole, UserScope } from '@/types/admin';

export const UserTable: React.FC = () => {
  const { data: users, isLoading } = useAdminUsers();
  const updateRoleMutation = useUpdateRole();
  const removeScopeMutation = useRemoveScope();

  const [scopeModalOpen, setScopeModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const handleRoleChange = async (userId: number, role: UserRole) => {
    try {
      await updateRoleMutation.mutateAsync({ userId, role });
      message.success('Role updated');
    } catch (e) {
      message.error('Failed to update role');
    }
  };

  const handleRemoveScope = async (userId: number, scopeId: number) => {
    try {
      await removeScopeMutation.mutateAsync({ userId, scopeId });
      message.success('Scope removed');
    } catch (e) {
      message.error('Failed to remove scope');
    }
  };

  const columns = [
    { title: 'Email', dataIndex: 'email', key: 'email' },
    { title: 'Provider', dataIndex: 'provider', key: 'provider' },
    {
      title: 'Role',
      dataIndex: ['role', 'name'],
      key: 'role',
      render: (roleName: UserRole, record: User) => (
        <Select
          value={roleName}
          onChange={(val) => handleRoleChange(record.id, val)}
          style={{ width: 150 }}
          options={[
            { label: 'Super Admin', value: 'SUPER_ADMIN' },
            { label: 'Cafe Owner', value: 'CAFE_OWNER' },
            { label: 'Branch Manager', value: 'BRANCH_MANAGER' },
            { label: 'Staff', value: 'STAFF' },
          ]}
        />
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: User) => (
        <Button 
          type="dashed" 
          icon={<PlusOutlined />} 
          onClick={() => {
            setSelectedUser(record);
            setScopeModalOpen(true);
          }}
        >
          Assign Scope
        </Button>
      ),
    },
  ];

  const expandedRowRender = (record: User) => {
    if (!record.userScopes || record.userScopes.length === 0) return <p style={{ margin: 0 }}>No scopes assigned.</p>;
    
    return (
      <Table
        dataSource={record.userScopes}
        pagination={false}
        rowKey="id"
        size="small"
        columns={[
          { title: 'Cafe ID', dataIndex: 'cafeId', key: 'cafeId', render: (val) => val || '-' },
          { title: 'Branch ID', dataIndex: 'branchId', key: 'branchId', render: (val) => val || '-' },
          {
            title: 'Action',
            key: 'action',
            render: (_: any, scope: UserScope) => (
              <Popconfirm title="Remove this scope?" onConfirm={() => handleRemoveScope(record.id, scope.id)}>
                <Button danger icon={<DeleteOutlined />} size="small" />
              </Popconfirm>
            ),
          },
        ]}
      />
    );
  };

  return (
    <>
      <Table
        dataSource={users}
        columns={columns}
        rowKey="id"
        loading={isLoading}
        expandable={{ expandedRowRender }}
      />
      {selectedUser && (
        <ScopeManager
          userId={selectedUser.id}
          currentScopes={selectedUser.userScopes || []}
          open={scopeModalOpen}
          onClose={() => setScopeModalOpen(false)}
        />
      )}
    </>
  );
};
