'use client';
import { Check, X, Loader2, AlertTriangle } from 'lucide-react';
import { useUploadStore, UploadStatus } from '@/stores/upload';
import { formatBytes } from '@/lib/utils';

const statusLabel: Record<UploadStatus, string> = {
  queued: 'Queued',
  uploading: 'Uploading',
  assembling: 'Assembling',
  processing: 'Processing',
  ready: 'Ready',
  failed: 'Failed',
};

export function UploadQueue() {
  const items = useUploadStore((s) => Object.values(s.items));
  const remove = useUploadStore((s) => s.remove);

  if (items.length === 0) return null;

  return (
    <ul className="space-y-3">
      {items.map((it) => (
        <li key={it.id} className="bg-bg-surface border border-border-subtle rounded-md p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm text-text-primary truncate">{it.title || it.file.name}</p>
              <p className="text-xs text-text-secondary">
                {formatBytes(it.file.size)} · {statusLabel[it.status]}
                {it.message ? ` · ${it.message}` : ''}
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-text-secondary">
              {it.status === 'ready' && <Check className="text-success" size={16} />}
              {it.status === 'failed' && <AlertTriangle className="text-danger" size={16} />}
              {['uploading', 'assembling', 'processing'].includes(it.status) && (
                <Loader2 className="animate-spin text-accent" size={16} />
              )}
              <button onClick={() => remove(it.id)} aria-label="Remove" className="hover:text-danger">
                <X size={16} />
              </button>
            </div>
          </div>
          <div className="mt-2 h-1.5 bg-bg-elevated rounded overflow-hidden">
            <div
              className="h-full bg-accent transition-[width] duration-300"
              style={{ width: `${Math.min(100, Math.max(0, it.progress)).toFixed(2)}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
