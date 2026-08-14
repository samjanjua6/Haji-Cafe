'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Button, Typography, Space } from 'antd';
import { MessageOutlined, CloseOutlined, SoundOutlined } from '@ant-design/icons';
import { motion, AnimatePresence } from 'framer-motion';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { getWsUrl } from '@/lib/api';
import api from '@/lib/api';
import { getAccessToken } from '@/lib/auth';

interface Message {
  role: 'user' | 'model';
  content: string;
}

export const ChatbotWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [progress, setProgress] = useState<string | undefined>();
  const [autoTTS, setAutoTTS] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  useEffect(() => {
    if (isOpen) {
      const token = getAccessToken();
      const ws = new WebSocket(`${getWsUrl()}/chatbot/ws?token=${token}`);
      wsRef.current = ws;

      ws.onmessage = async (event) => {
        const data = JSON.parse(event.data);
        if (data.progress) {
          setProgress(data.progress);
        } else if (data.chunk !== undefined) {
          setIsTyping(false);
          setProgress(undefined);
          setMessages(prev => {
            const last = prev[prev.length - 1];
            if (last && last.role === 'model') {
              return [...prev.slice(0, -1), { ...last, content: last.content + data.chunk }];
            }
            return [...prev, { role: 'model', content: data.chunk }];
          });
        } else if (data.done) {
          setIsTyping(false);
          setProgress(undefined);
          if (autoTTS) {
            setMessages(prev => {
              const last = prev[prev.length - 1];
              if (last && last.role === 'model') {
                playTTS(last.content);
              }
              return prev;
            });
          }
        }
      };

      return () => {
        ws.close();
      };
    }
  }, [isOpen, autoTTS]);

  const playTTS = async (text: string) => {
    try {
      const { data } = await api.post('/chatbot/tts', { text }, { responseType: 'blob' });
      const audio = new Audio(URL.createObjectURL(data));
      audio.play();
    } catch (err) {
      console.error('TTS failed', err);
    }
  };

  const handleSend = (content: string) => {
    const newMessages = [...messages, { role: 'user' as const, content }];
    setMessages(newMessages);
    setIsTyping(true);
    setProgress(undefined);

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        messages: newMessages,
        client_time: new Date().toISOString(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      }));
    }
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            style={{
              position: 'fixed',
              bottom: 80,
              right: 24,
              width: 400,
              height: 600,
              maxWidth: 'calc(100vw - 48px)',
              maxHeight: 'calc(100vh - 120px)',
              backgroundColor: 'rgba(12, 12, 18, 0.95)',
              backdropFilter: 'blur(20px)',
              borderRadius: 16,
              border: '1px solid var(--ant-colorPrimary)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
              display: 'flex',
              flexDirection: 'column',
              zIndex: 1000,
            }}
          >
            <div style={{ padding: '16px', borderBottom: '1px solid var(--ant-colorBorderSecondary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography.Title level={5} style={{ margin: 0, color: 'var(--ant-colorPrimary)' }}>Haji Cafe AI</Typography.Title>
              <Space>
                <Button type="text" icon={<SoundOutlined />} onClick={() => setAutoTTS(!autoTTS)} style={{ color: autoTTS ? 'var(--ant-colorPrimary)' : 'var(--ant-colorTextSecondary)' }} />
                <Button type="text" icon={<CloseOutlined />} onClick={() => setIsOpen(false)} />
              </Space>
            </div>
            
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
              {messages.map((msg, idx) => (
                <ChatMessage key={idx} message={msg} />
              ))}
              {isTyping && <ChatMessage message={{ role: 'model', content: '' }} isTyping progress={progress} />}
              <div ref={messagesEndRef} />
            </div>

            <ChatInput onSend={handleSend} disabled={isTyping} />
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 1000 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
      >
        <Button
          type="primary"
          shape="circle"
          size="large"
          icon={isOpen ? <CloseOutlined /> : <MessageOutlined />}
          onClick={() => setIsOpen(!isOpen)}
          style={{ width: 56, height: 56, boxShadow: '0 4px 12px rgba(245, 158, 11, 0.4)' }}
        />
      </motion.div>
    </>
  );
};
