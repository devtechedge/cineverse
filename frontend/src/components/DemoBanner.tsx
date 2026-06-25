'use client';
import { useState } from 'react';
import { Info, X, Github } from 'lucide-react';
import { MOCK_MODE } from '@/lib/mock-data';

export function DemoBanner() {
  const [dismissed, setDismissed] = useState(false);
  if (!MOCK_MODE || dismissed) return null;

  return (
    <div className="bg-accent/10 border-b border-accent/30 text-text-primary text-sm">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-2 flex items-center gap-3">
        <Info size={16} className="text-accent shrink-0" />
        <p className="flex-1">
          <span className="font-medium">Demo mode</span> — running on Vercel with seeded data.
          The production architecture (FastAPI + Postgres + Redis + ffmpeg + nginx + Prometheus)
          ships in this repo&apos;s <code className="text-accent">/backend</code> directory.
        </p>
        <a
          href="https://github.com"
          target="_blank"
          rel="noreferrer"
          className="hidden sm:inline-flex items-center gap-1 text-xs text-accent hover:underline"
        >
          <Github size={14} /> View source
        </a>
        <button
          onClick={() => setDismissed(true)}
          aria-label="Dismiss"
          className="text-text-secondary hover:text-text-primary"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
