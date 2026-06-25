import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // All app colors now reference CSS variables → theme-aware automatically.
        bg: {
          base:     'var(--bg-base)',
          surface:  'var(--bg-surface)',
          elevated: 'var(--bg-elevated)',
        },
        border: {
          subtle: 'var(--border-subtle)',
          strong: 'var(--border-strong)',
        },
        text: {
          primary:   'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          muted:     'var(--text-muted)',
        },
        accent: {
          DEFAULT: 'var(--accent)',
          hover:   'var(--accent-hover)',
          muted:   'var(--accent-muted)',
        },
        success: '#2ecc71',
        warning: '#f39c12',
        danger:  '#e74c3c',
      },
      fontFamily: {
        display: ['"Bebas Neue"', 'Impact', 'sans-serif'],
        sans:    ['Inter', 'system-ui', 'sans-serif'],
        mono:    ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      transitionTimingFunction: {
        ui:        'cubic-bezier(0.2, 0.8, 0.2, 1)',
        scroll:    'cubic-bezier(0.16, 1, 0.3, 1)',
        cinematic: 'cubic-bezier(0.65, 0, 0.35, 1)',
      },
      boxShadow: {
        card:     '0 4px 24px rgba(0,0,0,0.18)',
        elevated: '0 12px 48px rgba(0,0,0,0.28)',
        glow:     '0 0 24px rgba(229,9,20,0.35)',
      },
      keyframes: {
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
      animation: {
        fadeIn: 'fadeIn 0.6s ease-out',
      },
    },
  },
  plugins: [],
};
export default config;
