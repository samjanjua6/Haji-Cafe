import { create } from "zustand";
import { persist } from "zustand/middleware";
import { User } from "@/types/auth";

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  setAuth: (user: User, accessToken: string, refreshToken: string) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  logout: () => void;
  isLoggedIn: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      setAuth: (user, accessToken, refreshToken) => 
        set({ user, accessToken, refreshToken }),
      setTokens: (accessToken, refreshToken) => 
        set({ accessToken, refreshToken }),
      logout: () => 
        set({ user: null, accessToken: null, refreshToken: null }),
      isLoggedIn: () => 
        !!get().accessToken,
    }),
    {
      name: "auth-storage", // keys will be saved in localStorage under this name
    }
  )
);
