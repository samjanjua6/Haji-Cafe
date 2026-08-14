'use client';

import { ConfigProvider, App } from 'antd';
import { ReactNode } from 'react';
import { cafeTheme } from '@/styles/theme';

export default function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <ConfigProvider theme={cafeTheme}>
      <App>{children}</App>
    </ConfigProvider>
  );
}
