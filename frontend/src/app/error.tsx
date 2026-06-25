'use client';
import { useEffect } from 'react';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';
import Link from 'next/link';

export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-6">
      <div className="mb-6 p-4 rounded-full bg-danger/10 text-danger">
        <AlertTriangle size={32} aria-hidden />
      </div>
      <p className="text-xs uppercase tracking-[0.3em] text-accent mb-3">Cut!</p>
      <h2 className="font-display text-4xl sm:text-5xl tracking-wider mb-3">Something broke the scene.</h2>
      <p className="text-text-secondary text-sm max-w-md mb-6">
        {error.message || 'An unexpected error interrupted this view. Refresh or head home.'}
      </p>
      <div className="flex gap-3">
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-accent hover:bg-accent-hover text-white text-sm transition-colors"
        >
          <RotateCcw size={14} /> Try again
        </button>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-border-strong hover:border-accent text-text-primary text-sm transition-colors"
        >
          <Home size={14} /> Back to home
        </Link>
      </div>
    </div>
  );
}
