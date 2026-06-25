'use client';
import { create } from 'zustand';

export type Theme = 'light' | 'dark';

interface ThemeState {
  theme: Theme;
  hydrated: boolean;
  setTheme: (t: Theme) => void;
  toggle: () => void;
  hydrate: () => void;
}

const STORAGE_KEY = 'cv_theme';

function applyToDom(theme: Theme) {
  if (typeof document === 'undefined') return;
  const html = document.documentElement;
  if (theme === 'dark') html.classList.add('dark');
  else html.classList.remove('dark');
  html.style.colorScheme = theme;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: 'light',
  hydrated: false,

  setTheme(t) {
    set({ theme: t });
    try { window.localStorage.setItem(STORAGE_KEY, t); } catch { /* quota */ }
    applyToDom(t);
  },

  toggle() {
    const next: Theme = get().theme === 'light' ? 'dark' : 'light';
    get().setTheme(next);
  },

  hydrate() {
    if (typeof window === 'undefined') return;
    let stored: Theme | null = null;
    try { stored = window.localStorage.getItem(STORAGE_KEY) as Theme | null; } catch { /* ignore */ }
    const initial: Theme = stored === 'dark' || stored === 'light' ? stored : 'light';
    set({ theme: initial, hydrated: true });
    applyToDom(initial);
  },
}));
