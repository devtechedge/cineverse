import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Providers } from './providers';
import { Navbar } from '@/components/Navbar';
import { DemoBanner } from '@/components/DemoBanner';
import { Footer } from '@/components/Footer';
import { SkipLink } from '@/components/SkipLink';
import { ScrollToTop } from '@/components/ScrollToTop';
import { KeyboardHints } from '@/components/KeyboardHints';
import { PageTransition } from '@/components/PageTransition';
import { Toaster } from 'sonner';

const SITE_URL = 'https://cineverse-fawn-two.vercel.app';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Cineverse — Your moments, framed.',
    template: '%s · Cineverse',
  },
  description:
    'A personal 4K video archive, journal & streaming platform. Built with Next.js 14, FastAPI, PostgreSQL, Redis, ffmpeg, and Docker.',
  keywords: ['video', 'streaming', 'portfolio', 'nextjs', 'fastapi', 'hls', '4k'],
  authors: [{ name: 'devtechedge' }],
  openGraph: {
    type: 'website',
    url: SITE_URL,
    title: 'Cineverse — Your moments, framed.',
    description: 'Personal 4K video archive, journal & streaming platform. Full-stack portfolio project.',
    siteName: 'Cineverse',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Cineverse — Your moments, framed.',
    description: 'Personal 4K video archive, journal & streaming platform.',
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#fafaf8' },
    { media: '(prefers-color-scheme: dark)',  color: '#0a0a0a' },
  ],
  width: 'device-width',
  initialScale: 1,
};

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
        <div className="cv-ambient" aria-hidden="true" />
        <Providers>
          <SkipLink />
          <DemoBanner />
          <Navbar />
          <main id="main" className="min-h-screen focus:outline-none" tabIndex={-1}>
            <PageTransition>{children}</PageTransition>
          </main>
          <Footer />
          <ScrollToTop />
          <KeyboardHints />
          <Toaster theme="system" position="bottom-right" richColors closeButton />
        </Providers>
      </body>
    </html>
  );
}
