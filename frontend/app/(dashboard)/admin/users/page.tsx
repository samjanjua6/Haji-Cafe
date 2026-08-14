'use client';

import React from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { UserTable } from '@/components/admin/UserTable';

export default function AdminUsersPage() {
  return (
    <div style={{ padding: '24px' }}>
      <PageHeader 
        title="User Management" 
        subtitle="Manage roles and scopes for all users"
      />
      <UserTable />
    </div>
  );
}
