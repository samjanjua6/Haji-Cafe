'use client';

import React from 'react';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Typography } from 'antd';

interface Message {
  role: 'user' | 'model';
  content: string;
}

interface ChatMessageProps {
  message: Message;
  isTyping?: boolean;
  progress?: string;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message, isTyping, progress }) => {
  const isUser = message.role === 'user';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: isUser ? 'flex-end' : 'flex-start',
        marginBottom: '16px',
      }}
    >
      <div
        style={{
          maxWidth: '85%',
          padding: '12px 16px',
          borderRadius: '12px',
          backgroundColor: isUser ? 'var(--ant-colorPrimary)' : '#16161f',
          color: isUser ? '#000' : 'var(--ant-colorText)',
          borderBottomRightRadius: isUser ? 0 : '12px',
          borderBottomLeftRadius: isUser ? '12px' : 0,
        }}
      >
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {message.content}
        </ReactMarkdown>
        {isTyping && (
          <div style={{ display: 'flex', gap: '4px', marginTop: '8px' }}>
            <motion.div animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6 }} style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: 'var(--ant-colorTextSecondary)' }} />
            <motion.div animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }} style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: 'var(--ant-colorTextSecondary)' }} />
            <motion.div animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }} style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: 'var(--ant-colorTextSecondary)' }} />
          </div>
        )}
      </div>
      {progress && (
        <Typography.Text type="secondary" italic style={{ fontSize: '12px', marginTop: '4px' }}>
          {progress}
        </Typography.Text>
      )}
    </motion.div>
  );
};
