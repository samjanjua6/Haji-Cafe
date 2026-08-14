'use client';

import { Modal } from 'antd';
import { ExclamationCircleFilled } from '@ant-design/icons';
import React from 'react';

const { confirm } = Modal;

interface ConfirmOptions {
  title: string;
  content: string;
  onOk: () => void | Promise<void>;
  danger?: boolean;
}

export const confirmAction = ({ title, content, onOk, danger }: ConfirmOptions) => {
  confirm({
    title,
    icon: <ExclamationCircleFilled />,
    content,
    okType: danger ? 'danger' : 'primary',
    onOk,
    onCancel() {},
  });
};

interface ConfirmModalProps {
  open: boolean;
  title: string;
  content: string;
  onOk: () => void | Promise<void>;
  onCancel: () => void;
  danger?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({ open, title, content, onOk, onCancel, danger }) => {
  return (
    <Modal
      open={open}
      title={title}
      onOk={onOk}
      onCancel={onCancel}
      okButtonProps={{ danger }}
    >
      <p>{content}</p>
    </Modal>
  );
};
