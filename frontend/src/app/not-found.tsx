import Link from 'next/link';
import { Home, LayoutGrid } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-6">
      <p className="text-xs uppercase tracking-[0.3em] text-accent mb-3">Lost frame</p>
      <h2 className="font-display text-7xl sm:text-9xl tracking-wider mb-3 leading-none">404</h2>
      <p className="text-text-secondary text-sm max-w-md mb-6">
        This frame doesn&apos;t exist in your cineverse. It was either edited out — or never shot.
      </p>
      <div className="flex gap-3">
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-accent hover:bg-accent-hover text-white text-sm transition-colors"
        >
          <Home size={14} /> Home
        </Link>
        <Link
          href="/library"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-border-strong hover:border-accent text-text-primary text-sm transition-colors"
        >
          <LayoutGrid size={14} /> Browse library
        </Link>
      </div>
    </div>
  );
}
