'use client';

import React from 'react';
import { Card, Badge, Typography } from 'antd';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';

const { Title, Text } = Typography;

interface Cafe {
  id: number;
  name: string;
  createdAt?: string;
}

interface CafeCardProps {
  cafe: Cafe;
  branchCount?: number;
}

export const CafeCard: React.FC<CafeCardProps> = ({ cafe, branchCount = 0 }) => {
  const router = useRouter();

  return (
    <motion.div
      whileHover={{ scale: 1.02, boxShadow: '0 0 15px rgba(245, 158, 11, 0.3)' }}
      transition={{ duration: 0.2 }}
      onClick={() => router.push(`/cafes/${cafe.id}`)}
      style={{ cursor: 'pointer' }}
    >
      <Badge count={branchCount} style={{ backgroundColor: '#f59e0b' }}>
        <Card
          style={{
            backgroundColor: '#12121a',
            borderColor: '#2a2a3e',
            borderRadius: '12px',
          }}
          bodyStyle={{ padding: '24px' }}
        >
          <Title level={4} style={{ color: '#e8e8ed', margin: 0 }}>
            {cafe.name}
          </Title>
          <Text style={{ color: '#8b8b9e' }}>
            ID: {cafe.id}
          </Text>
        </Card>
      </Badge>
    </motion.div>
  );
};
