'use client';
import { create } from 'zustand';
import { api, tokenStore, unwrap } from '@/lib/api';
import { MOCK_MODE, MOCK_USER } from '@/lib/mock-data';
import type { Tokens, User } from '@/types';

interface AuthState {
  user: User | null;
  tokens: Pick<Tokens, 'access_token' | 'refresh_token'> | null;
  isLoading: boolean;
  error: string | null;
  hydrate: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName?: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  tokens: null,
  isLoading: false,
  error: null,

  async hydrate() {
    // Demo mode: skip the network and pretend the user is logged in.
    if (MOCK_MODE) {
      set({
        user: MOCK_USER,
        tokens: { access_token: 'mock', refresh_token: 'mock' },
        isLoading: false,
      });
      return;
    }
    const access = tokenStore.access;
    const refresh = tokenStore.refresh;
    if (!access || !refresh) return;
    set({ tokens: { access_token: access, refresh_token: refresh }, isLoading: true });
    try {
      const user = await unwrap<User>(api.get('/auth/me'));
      set({ user, isLoading: false });
    } catch {
      tokenStore.clear();
      set({ user: null, tokens: null, isLoading: false });
    }
  },

  async login(email, password) {
    set({ isLoading: true, error: null });
    try {
      const tokens = await unwrap<Tokens>(api.post('/auth/login', { email, password }));
      tokenStore.set(tokens);
      set({ tokens: { access_token: tokens.access_token, refresh_token: tokens.refresh_token } });
      const user = await unwrap<User>(api.get('/auth/me'));
      set({ user, isLoading: false });
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Login failed';
      set({ isLoading: false, error: message });
      throw e;
    }
  },

  async register(email, password, fullName) {
    set({ isLoading: true, error: null });
    try {
      const tokens = await unwrap<Tokens>(
        api.post('/auth/register', { email, password, full_name: fullName }),
      );
      tokenStore.set(tokens);
      set({ tokens: { access_token: tokens.access_token, refresh_token: tokens.refresh_token } });
      const user = await unwrap<User>(api.get('/auth/me'));
      set({ user, isLoading: false });
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Registration failed';
      set({ isLoading: false, error: message });
      throw e;
    }
  },

  async logout() {
    const refresh = get().tokens?.refresh_token;
    try {
      if (refresh) await api.post('/auth/logout', { refresh_token: refresh });
    } catch { /* ignore */ }
    tokenStore.clear();
    set({ user: null, tokens: null });
  },
}));
