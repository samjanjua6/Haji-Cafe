'use client';

import React from 'react';
import { Modal, Form, Input, DatePicker, Select, message } from 'antd';
import { useStaff, useScheduleMeeting } from '@/lib/hooks/useCafes';

const { RangePicker } = DatePicker;
const { TextArea } = Input;

interface MeetingSchedulerProps {
  cafeId: number;
  open: boolean;
  onClose: () => void;
}

export const MeetingScheduler: React.FC<MeetingSchedulerProps> = ({ cafeId, open, onClose }) => {
  const [form] = Form.useForm();
  const { data: staff } = useStaff(cafeId);
  const scheduleMeeting = useScheduleMeeting(cafeId);

  const staffOptions = staff?.map((s: any) => ({
    label: s.email,
    value: s.email,
  })) || [];

  const handleSubmit = async (values: any) => {
    try {
      const payload = {
        title: values.title,
        start_time: values.dateRange[0].toISOString(),
        end_time: values.dateRange[1].toISOString(),
        attendee_emails: values.attendee_emails,
        description: values.description,
      };
      const res = await scheduleMeeting.mutateAsync(payload);
      message.success(`Meeting scheduled successfully! Link: ${res.link || 'check calendar'}`);
      form.resetFields();
      onClose();
    } catch (error) {
      message.error('Failed to schedule meeting');
    }
  };

  return (
    <Modal
      title="Schedule Meeting"
      open={open}
      onCancel={onClose}
      onOk={() => form.submit()}
      confirmLoading={scheduleMeeting.isPending}
    >
      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        <Form.Item name="title" label="Title" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item name="dateRange" label="Date & Time" rules={[{ required: true }]}>
          <RangePicker showTime />
        </Form.Item>
        <Form.Item name="attendee_emails" label="Attendees" rules={[{ required: true }]}>
          <Select mode="tags" options={staffOptions} placeholder="Add attendee emails" />
        </Form.Item>
        <Form.Item name="description" label="Description">
          <TextArea rows={4} />
        </Form.Item>
      </Form>
    </Modal>
  );
};
