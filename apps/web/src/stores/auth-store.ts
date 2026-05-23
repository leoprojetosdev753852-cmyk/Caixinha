import { create } from 'zustand';
import { setAccessToken } from '@/lib/api-client';

interface User {
  id: string;
  cpf: string;
  role: 'ADMIN' | 'USER';
  nomeCompleto?: string;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  setSession: (accessToken: string, user?: User) => void;
  clearSession: () => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  setSession: (accessToken, user) => {
    setAccessToken(accessToken);
    if (user) set({ user });
  },
  clearSession: () => {
    setAccessToken(null);
    set({ user: null });
  },
  setLoading: (isLoading) => set({ isLoading }),
}));
