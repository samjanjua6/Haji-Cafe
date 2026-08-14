'use client';

import React from 'react';
import { Typography, Space } from 'antd';
import { motion } from 'framer-motion';

const { Title, Text } = Typography;

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  extra?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle, extra }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
        paddingBottom: 16,
        borderBottom: '1px solid var(--ant-colorBorderSecondary)',
      }}
    >
      <Space direction="vertical" size={0}>
        <Title level={2} style={{ margin: 0, color: 'var(--ant-colorPrimary)' }}>
          {title}
        </Title>
        {subtitle && <Text type="secondary">{subtitle}</Text>}
      </Space>
      {extra && <div>{extra}</div>}
    </motion.div>
  );
};
