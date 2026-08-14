'use client';

import React from 'react';
import { Input, Button, Space } from 'antd';
import { SendOutlined, AudioOutlined, AudioMutedOutlined } from '@ant-design/icons';
import { useVoiceRecorder } from './VoiceRecorder';
import api from '@/lib/api';

interface ChatInputProps {
  onSend: (text: string) => void;
  disabled?: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({ onSend, disabled }) => {
  const [text, setText] = React.useState('');
  const { isRecording, startRecording, stopRecording } = useVoiceRecorder();

  const handleSend = () => {
    if (text.trim()) {
      onSend(text);
      setText('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleVoiceToggle = async () => {
    if (isRecording) {
      const blob = await stopRecording();
      const formData = new FormData();
      formData.append('audio', blob, 'audio.webm');
      try {
        const { data } = await api.post('/chatbot/stt', formData);
        if (data.transcript) {
          onSend(data.transcript);
        }
      } catch (err) {
        console.error('STT failed', err);
      }
    } else {
      startRecording();
    }
  };

  return (
    <div style={{ padding: '16px', borderTop: '1px solid var(--ant-colorBorderSecondary)', display: 'flex', gap: '8px' }}>
      <Input.TextArea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Type your message..."
        autoSize={{ minRows: 1, maxRows: 4 }}
        disabled={disabled || isRecording}
        style={{ flex: 1, resize: 'none' }}
      />
      <Space direction="vertical">
        <Button 
          type="primary" 
          icon={<SendOutlined />} 
          onClick={handleSend} 
          disabled={disabled || !text.trim() || isRecording} 
        />
        <Button
          type={isRecording ? 'primary' : 'default'}
          danger={isRecording}
          icon={isRecording ? <AudioMutedOutlined /> : <AudioOutlined />}
          onClick={handleVoiceToggle}
          disabled={disabled}
        />
      </Space>
    </div>
  );
};
