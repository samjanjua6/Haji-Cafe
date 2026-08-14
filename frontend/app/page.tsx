'use client'

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Form, Input, Button, Segmented, message } from 'antd';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/lib/stores/authStore';
import api from '@/lib/api';
import { GoogleOutlined } from '@ant-design/icons';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

function AuthPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const loginStore = useAuthStore((state) => state.login);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  
  const [mode, setMode] = useState<'Login' | 'Register'>('Login');
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/dashboard');
      return;
    }

    const accessToken = searchParams.get('access_token');
    const refreshToken = searchParams.get('refresh_token');

    if (accessToken && refreshToken) {
      loginStore(accessToken, refreshToken);
      router.replace('/dashboard');
    }
  }, [isAuthenticated, router, searchParams, loginStore]);

  const onFinish = async (values: any) => {
    setLoading(true);
    try {
      if (mode === 'Login') {
        const { data } = await api.post('/auth/login', {
          email: values.email,
          password: values.password,
        });
        loginStore(data.access_token, data.refresh_token);
        router.push('/dashboard');
      } else {
        const { data } = await api.post('/auth/register', {
          email: values.email,
          password: values.password,
        });
        loginStore(data.access_token, data.refresh_token);
        router.push('/dashboard');
      }
    } catch (error: any) {
      message.error(error.response?.data?.message || `Failed to ${mode.toLowerCase()}`);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = `${API_URL}/auth/google`;
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.5 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: { delay: i * 0.1, duration: 0.3 }
    }),
    exit: { opacity: 0, y: -20, transition: { duration: 0.2 } }
  };

  if (isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#0a0a0f] relative overflow-hidden">
      {/* Background gradients */}
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-[radial-gradient(ellipse_at_center,_rgba(245,158,11,0.15)_0%,_rgba(0,0,0,0)_70%)] animate-pulse" style={{ animationDuration: '4s' }} />
      <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-[radial-gradient(ellipse_at_center,_rgba(128,90,213,0.1)_0%,_rgba(0,0,0,0)_70%)] animate-pulse" style={{ animationDuration: '6s' }} />

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="w-full max-w-[420px] p-8 rounded-2xl bg-[rgba(18,18,26,0.8)] backdrop-blur-md border border-[#2a2a3e] shadow-[0_0_20px_rgba(245,158,11,0.1)] relative z-10"
      >
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-[#f59e0b] drop-shadow-[0_2px_4px_rgba(245,158,11,0.2)] mb-2">Haji Cafe</h1>
          <p className="text-[#8b8b9e]">Cafe Management Platform</p>
        </div>

        <div className="mb-6 flex justify-center">
          <Segmented
            options={['Login', 'Register']}
            value={mode}
            onChange={(value) => {
              setMode(value as 'Login' | 'Register');
              form.resetFields();
            }}
            className="bg-[#1a1a2e] text-[#8b8b9e] p-1"
          />
        </div>

        <Form
          form={form}
          name="auth_form"
          layout="vertical"
          onFinish={onFinish}
          requiredMark={false}
          className="space-y-4"
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={mode}
              initial="hidden"
              animate="visible"
              exit="exit"
              variants={itemVariants}
              custom={0}
              className="space-y-4"
            >
              <motion.div custom={1} variants={itemVariants}>
                <Form.Item
                  name="email"
                  rules={[{ required: true, message: 'Please enter your email!' }, { type: 'email', message: 'Invalid email!' }]}
                >
                  <Input 
                    placeholder="Email Address" 
                    size="large" 
                    className="bg-[#1a1a2e] border-[#2a2a3e] text-[#e8e8ed] hover:border-[#f59e0b] focus:border-[#f59e0b] h-12" 
                  />
                </Form.Item>
              </motion.div>

              <motion.div custom={2} variants={itemVariants}>
                <Form.Item
                  name="password"
                  rules={[{ required: true, message: 'Please enter your password!' }]}
                >
                  <Input.Password 
                    placeholder="Password" 
                    size="large" 
                    className="bg-[#1a1a2e] border-[#2a2a3e] text-[#e8e8ed] hover:border-[#f59e0b] focus:border-[#f59e0b] h-12" 
                  />
                </Form.Item>
              </motion.div>

              {mode === 'Register' && (
                <motion.div custom={3} variants={itemVariants}>
                  <Form.Item
                    name="confirm"
                    dependencies={['password']}
                    rules={[
                      { required: true, message: 'Please confirm your password!' },
                      ({ getFieldValue }) => ({
                        validator(_, value) {
                          if (!value || getFieldValue('password') === value) {
                            return Promise.resolve();
                          }
                          return Promise.reject(new Error('Passwords do not match!'));
                        },
                      }),
                    ]}
                  >
                    <Input.Password 
                      placeholder="Confirm Password" 
                      size="large" 
                      className="bg-[#1a1a2e] border-[#2a2a3e] text-[#e8e8ed] hover:border-[#f59e0b] focus:border-[#f59e0b] h-12" 
                    />
                  </Form.Item>
                </motion.div>
              )}

              <motion.div custom={mode === 'Register' ? 4 : 3} variants={itemVariants}>
                <Button
                  type="primary"
                  htmlType="submit"
                  block
                  size="large"
                  loading={loading}
                  className="bg-[#f59e0b] hover:bg-[#d97706] text-[#0a0a0f] font-semibold border-none h-12 mt-2"
                >
                  {mode === 'Login' ? 'Sign In' : 'Create Account'}
                </Button>
              </motion.div>
            </motion.div>
          </AnimatePresence>
        </Form>

        {mode === 'Login' && (
          <motion.div custom={4} variants={itemVariants} initial="hidden" animate="visible" className="mt-6">
            <div className="relative flex items-center mb-6">
              <div className="flex-grow border-t border-[#2a2a3e]"></div>
              <span className="flex-shrink-0 mx-4 text-[#8b8b9e] text-sm">or</span>
              <div className="flex-grow border-t border-[#2a2a3e]"></div>
            </div>
            
            <Button
              block
              size="large"
              icon={<GoogleOutlined />}
              onClick={handleGoogleLogin}
              className="bg-[#1a1a2e] border-[#2a2a3e] text-[#e8e8ed] hover:border-[#f59e0b] hover:text-[#f59e0b] h-12"
            >
              Continue with Google
            </Button>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0a0a0f' }}>
        <div style={{ color: '#f59e0b', fontSize: '18px' }}>Loading...</div>
      </div>
    }>
      <AuthPageInner />
    </Suspense>
  );
}
