'use client';

import React from 'react';
import { Empty, Button } from 'antd';
import { motion } from 'framer-motion';

interface EmptyStateProps {
  description: string;
  actionText?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ description, actionText, onAction }) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      style={{ padding: '48px 0' }}
    >
      <Empty
        description={<span style={{ color: 'var(--ant-colorTextSecondary)' }}>{description}</span>}
      >
        {actionText && onAction && (
          <Button type="primary" onClick={onAction} style={{ marginTop: 16 }}>
            {actionText}
          </Button>
        )}
      </Empty>
    </motion.div>
  );
};
