import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      role="status"
      className={cn(
        'flex flex-col items-center justify-center text-center px-6 py-16',
        'border border-dashed border-border-strong rounded-lg bg-bg-surface/40',
        className,
      )}
    >
      {icon && <div className="text-accent mb-3" aria-hidden>{icon}</div>}
      <h3 className="font-display text-2xl tracking-wider text-text-primary mb-2">{title}</h3>
      {description && (
        <p className="text-text-secondary text-sm max-w-md mb-4">{description}</p>
      )}
      {action}
    </div>
  );
}
