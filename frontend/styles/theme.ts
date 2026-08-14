import type { ThemeConfig } from 'antd';
import { theme } from 'antd';

export const cafeTheme: ThemeConfig = {
  algorithm: theme.darkAlgorithm,
  token: {
    colorPrimary: '#f59e0b',
    colorBgBase: '#0a0a0f',
    colorBgContainer: '#111118',
    colorBgElevated: '#1a1a2e',
    colorBgLayout: '#0a0a0f',
    colorBorder: '#2a2a3e',
    colorBorderSecondary: '#1e1e30',
    colorText: '#e8e8ed',
    colorTextSecondary: '#8b8b9e',
    colorTextTertiary: '#5a5a6e',
    borderRadius: 10,
    fontFamily: 'Inter, -apple-system, sans-serif',
    fontSize: 14,
    colorSuccess: '#10b981',
    colorError: '#ef4444',
    colorWarning: '#f59e0b',
    colorInfo: '#3b82f6',
  },
  components: {
    Card: {
      colorBgContainer: '#12121a',
    },
    Table: {
      colorBgContainer: '#12121a',
      headerBg: '#16161f',
    },
    Modal: {
      contentBg: '#16161f',
      headerBg: '#16161f',
    },
    Menu: {
      darkItemBg: 'transparent',
      darkItemSelectedBg: 'rgba(245,158,11,0.12)',
    },
    Input: {
      colorBgContainer: '#16161f',
    },
    Select: {
      colorBgContainer: '#16161f',
    },
    Button: {
      primaryShadow: '0 2px 8px rgba(245,158,11,0.25)',
    },
  },
};
