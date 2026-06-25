'use client';
import { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';

export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-6">
      <AlertTriangle className="text-danger mb-3" size={36} />
      <h2 className="font-display text-3xl tracking-wider mb-2">Something went wrong.</h2>
      <p className="text-text-secondary text-sm max-w-md mb-4">
        {error.message || 'An unexpected error occurred while loading this view.'}
      </p>
      <button onClick={reset} className="px-4 py-2 rounded-md bg-accent hover:bg-accent-hover text-white">
        Try again
      </button>
    </div>
  );
}
