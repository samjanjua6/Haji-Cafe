import { create } from 'zustand';
import { getAccessToken, getRefreshToken, setTokens, clearTokens } from '@/lib/auth';

interface AuthState {
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  login: (accessToken: string, refreshToken: string) => void;
  logout: () => void;
  hydrate: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  refreshToken: null,
  isAuthenticated: false,
  login: (accessToken, refreshToken) => {
    setTokens(accessToken, refreshToken);
    set({ token: accessToken, refreshToken, isAuthenticated: true });
  },
  logout: () => {
    clearTokens();
    set({ token: null, refreshToken: null, isAuthenticated: false });
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  },
  hydrate: () => {
    const token = getAccessToken();
    const refreshToken = getRefreshToken();
    set({ token, refreshToken, isAuthenticated: !!token });
  },
}));
