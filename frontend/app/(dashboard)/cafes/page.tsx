'use client';

import React, { useState } from 'react';
import { Typography, Button, Modal, Form, Input, Row, Col, Skeleton, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { motion } from 'framer-motion';
import { CafeCard } from '@/components/cafes/CafeCard';
import { useCafes, useCreateCafe } from '@/lib/hooks/useCafes';

const { Title } = Typography;

export default function CafesPage() {
  const { data: cafes, isLoading } = useCafes();
  const createCafe = useCreateCafe();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form] = Form.useForm();

  const handleCreate = async (values: { name: string }) => {
    try {
      await createCafe.mutateAsync(values);
      message.success('Cafe created successfully');
      setIsModalOpen(false);
      form.resetFields();
    } catch (error) {
      message.error('Failed to create cafe');
    }
  };

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <Title level={2} style={{ color: '#e8e8ed', margin: 0 }}>Cafes</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsModalOpen(true)}>
          Create Cafe
        </Button>
      </div>

      {isLoading ? (
        <Skeleton active />
      ) : !cafes || cafes.length === 0 ? (
        <div style={{ textAlign: 'center', color: '#8b8b9e', marginTop: '48px' }}>
          No cafes found. Create one to get started!
        </div>
      ) : (
        <Row gutter={[24, 24]}>
          {cafes.map((cafe: any, index: number) => (
            <Col xs={24} sm={12} md={8} lg={6} key={cafe.id}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <CafeCard cafe={cafe} />
              </motion.div>
            </Col>
          ))}
        </Row>
      )}

      <Modal
        title="Create Cafe"
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        onOk={() => form.submit()}
        confirmLoading={createCafe.isPending}
      >
        <Form form={form} layout="vertical" onFinish={handleCreate}>
          <Form.Item name="name" label="Cafe Name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
