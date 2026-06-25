import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: {
          base: '#0a0a0a',
          surface: '#1a1a1a',
          elevated: '#242424',
        },
        border: {
          subtle: '#2a2a2a',
          strong: '#3a3a3a',
        },
        text: {
          primary: '#f5f5f5',
          secondary: '#a3a3a3',
          muted: '#6b6b6b',
        },
        accent: {
          DEFAULT: '#e50914',
          hover: '#ff1a25',
          muted: '#7a0a10',
        },
        success: '#2ecc71',
        warning: '#f39c12',
        danger: '#e74c3c',
      },
      fontFamily: {
        display: ['"Bebas Neue"', 'Impact', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      transitionTimingFunction: {
        ui: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
        scroll: 'cubic-bezier(0.16, 1, 0.3, 1)',
        cinematic: 'cubic-bezier(0.65, 0, 0.35, 1)',
      },
      boxShadow: {
        card: '0 4px 24px rgba(0,0,0,0.4)',
        elevated: '0 12px 48px rgba(0,0,0,0.6)',
        glow: '0 0 24px rgba(229,9,20,0.35)',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-1000px 0' },
          '100%': { backgroundPosition: '1000px 0' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
      animation: {
        shimmer: 'shimmer 2s linear infinite',
        fadeIn: 'fadeIn 0.6s ease-out',
      },
    },
  },
  plugins: [],
};
export default config;
