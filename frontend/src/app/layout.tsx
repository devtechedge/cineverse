import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Providers } from './providers';
import { Navbar } from '@/components/Navbar';
import { DemoBanner } from '@/components/DemoBanner';
import { Toaster } from 'sonner';

export const metadata: Metadata = {
  title: 'Cineverse — Your moments, framed.',
  description: 'Personal 4K video archive, journal & streaming platform.',
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#fafaf8' },
    { media: '(prefers-color-scheme: dark)',  color: '#0a0a0a' },
  ],
  width: 'device-width',
  initialScale: 1,
};

// Tiny inline script that runs BEFORE React hydration to apply the saved
// theme (default = light). Prevents a "flash of dark mode" on first paint.
const themeBootstrap = `
(function(){
  try {
    var t = localStorage.getItem('cv_theme');
    if (t !== 'dark' && t !== 'light') t = 'light';
    if (t === 'dark') document.documentElement.classList.add('dark');
    document.documentElement.style.colorScheme = t;
  } catch(e) { /* default light */ }
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrap }} />
      </head>
      <body>
        {/* Animated ambient gradient — uniform across all pages, adapts to theme */}
        <div className="cv-ambient" aria-hidden="true" />
        <Providers>
          <DemoBanner />
          <Navbar />
          <main className="min-h-screen">{children}</main>
          <Toaster theme="system" position="bottom-right" richColors />
        </Providers>
      </body>
    </html>
  );
}
